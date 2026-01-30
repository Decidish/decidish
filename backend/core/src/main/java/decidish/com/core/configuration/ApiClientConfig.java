package decidish.com.core.configuration;

import decidish.com.core.api.rewe.client.NormalizedReweApiClient;
import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.scheduler.WeeklySyncMetrics;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ssl.SslBundle;
import org.springframework.boot.ssl.SslBundles;
import org.springframework.boot.ssl.pem.PemSslStoreBundle;
import org.springframework.boot.ssl.pem.PemSslStoreDetails;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.io.IOException;
import java.io.InputStream;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;
import java.util.UUID;
import java.util.zip.GZIPInputStream;

@Configuration
public class ApiClientConfig {

    private static final Logger log = LoggerFactory.getLogger(ApiClientConfig.class);

    @Value("${minio.bucket.name:decidish-storage}")
    private String bucketName;

    @Value("${minio.cert.pem:private_test.pem}")
    private String pemFileName;

    @Value("${minio.cert.key:private_test.key}")
    private String keyFileName;

    @Bean
    public ReweApiClient reweApiClient(RestClient.Builder builder, MinioClient minioClient, SslBundles sslBundles, WeeklySyncMetrics weeklySyncMetrics) {
        SslBundle reweBundle;

        try {
            log.info("Attempting to fetch SSL certificates from MinIO bucket: {}", bucketName);
            
            // 1. Fetch content from MinIO
            String cert = fetchStringFromMinio(minioClient, bucketName, pemFileName);
            String key = fetchStringFromMinio(minioClient, bucketName, keyFileName);

            // 2. Create in-memory SSL Bundle
            PemSslStoreDetails keyStoreDetails = PemSslStoreDetails.forCertificate(cert).withPrivateKey(key);
            PemSslStoreBundle pemBundle = new PemSslStoreBundle(keyStoreDetails, null);
            reweBundle = SslBundle.of(pemBundle);
            
            log.info("Successfully loaded SSL certificates from MinIO.");

        } catch (Exception e) {
            log.warn("Failed to connect to MinIO or fetch certs ({}). Falling back to local 'rewe-client' SSL bundle from YAML.", e.getMessage());
            try {
                // Fallback: Use the file-based bundle defined in application.yml
                reweBundle = sslBundles.getBundle("rewe-client");
            } catch (Exception ex) {
                throw new IllegalStateException("CRITICAL: MinIO is unreachable AND no local 'rewe-client' SSL bundle found. Application cannot start.", ex);
            }
        }

        CookieManager cookieManager = new CookieManager();
        cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
            HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(10))
                .sslContext(reweBundle.createSslContext())
                .cookieHandler(cookieManager)
                .build()
        );

        RestClient restClient = builder
                .requestFactory(requestFactory)
                .baseUrl("https://mobile-clients-api.rewe.de")
                .defaultHeader("user-agent", "REWE-Mobile-Client/3.18.5.33032 Android/14 Phone/Google_Pixel_8_Pro")
                .defaultHeader("rd-service-types", "PICKUP")
                .defaultHeader("Connection", "Keep-Alive")
                .defaultHeader("Accept-Encoding", "gzip")
                // .defaultHeader("Accept", "application/json")
                // --- ADDED: Cron-Only Delay ---
                .requestInterceptor(new CronDelayInterceptor(weeklySyncMetrics))
                // --- ADDED: Rate Limit Retry Interceptor ---
                .requestInterceptor(new RateLimitRetryInterceptor(weeklySyncMetrics)) 
                .requestInterceptor((request, body, execution) -> {
                    request.getHeaders().add("rdfa", UUID.randomUUID().toString());
                    request.getHeaders().add("Correlation-Id", UUID.randomUUID().toString());
                    return execution.execute(request, body);
                })
                .requestInterceptor(new GzipInterceptor())
                .build();

        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();

        ReweApiClient rawClient = factory.createClient(ReweApiClient.class);
        return new NormalizedReweApiClient(rawClient);
    }
    
    /**
     * Helper to fetch a file from MinIO and convert it to a String.
     */
    private String fetchStringFromMinio(MinioClient client, String bucket, String objectName) throws Exception {
        try (InputStream stream = client.getObject(
                GetObjectArgs.builder()
                        .bucket(bucket)
                        .object(objectName)
                        .build())) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
    
    // --- UPDATED: Robust Retry Strategy for 429s ---
    static class RateLimitRetryInterceptor implements ClientHttpRequestInterceptor {
        private static final int MAX_RETRIES = 5; // Increased from 3
        private static final long INITIAL_BACKOFF_MS = 3000; // Start with 3s wait
        private static final long CRON_RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
        private final WeeklySyncMetrics weeklySyncMetrics;

        RateLimitRetryInterceptor(WeeklySyncMetrics weeklySyncMetrics) {
            this.weeklySyncMetrics = weeklySyncMetrics;
        }

        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
            long backoff = INITIAL_BACKOFF_MS;
            
            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                ClientHttpResponse response = execution.execute(request, body);
                
                if (response.getStatusCode().value() == 429) {
                    if (weeklySyncMetrics != null && weeklySyncMetrics.isRunning()) {
                        weeklySyncMetrics.recordRateLimitHit();
                    }
                    if (attempt == MAX_RETRIES) {
                        log.error("Rate Limit (429) exhausted after {} attempts.", MAX_RETRIES);
                        return response; // Give up and let the error propagate
                    }

                    if (weeklySyncMetrics != null && weeklySyncMetrics.isRunning()) {
                        log.warn("Rate Limit (429) during weekly sync. Cooling down for {} ms before retry.", CRON_RATE_LIMIT_COOLDOWN_MS);
                        try {
                            Thread.sleep(CRON_RATE_LIMIT_COOLDOWN_MS);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            throw new IOException("Interrupted during rate limit cooldown", e);
                        }
                    }
                    
                    // Add Jitter: +/- 500ms to avoid static timing detection
                    long jitter = (long) (Math.random() * 1000 - 500); 
                    long waitTime = Math.max(1000, backoff + jitter); // Ensure at least 1s

                    log.warn("Rate Limit (429) hit. Retrying in {}ms (Attempt {}/{})", waitTime, attempt, MAX_RETRIES);
                    try {
                        Thread.sleep(waitTime);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Interrupted during rate limit backoff", e);
                    }
                    
                    // Close the 429 response to release resources before retrying
                    response.close();
                    
                    // Exponential backoff (capped at 20s)
                    backoff = Math.min(backoff * 2, 20000);
                } else {
                    return response; // Success or other error
                }
            }
            throw new IOException("Retry loop failed unexpectedly");
        }
    }

    static class CronDelayInterceptor implements ClientHttpRequestInterceptor {
        private static final int MIN_DELAY_MS = 2000;
        private static final int MAX_DELAY_MS = 5000;
        private final WeeklySyncMetrics weeklySyncMetrics;

        CronDelayInterceptor(WeeklySyncMetrics weeklySyncMetrics) {
            this.weeklySyncMetrics = weeklySyncMetrics;
        }

        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
            if (weeklySyncMetrics != null && weeklySyncMetrics.isRunning()) {
                int delay = ThreadLocalRandom.current().nextInt(MIN_DELAY_MS, MAX_DELAY_MS + 1);
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IOException("Interrupted during cron delay", e);
                }
            }
            return execution.execute(request, body);
        }
    }

    static class GzipInterceptor implements ClientHttpRequestInterceptor {
        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
            ClientHttpResponse response = execution.execute(request, body);
            String encoding = response.getHeaders().getFirst(HttpHeaders.CONTENT_ENCODING);
            if (encoding != null && encoding.toLowerCase().contains("gzip")) {
                return new GzipHttpResponse(response);
            }
            return response;
        }
    }

    static class GzipHttpResponse implements ClientHttpResponse {
        private final ClientHttpResponse response;
        public GzipHttpResponse(ClientHttpResponse response) { this.response = response; }
        @Override public InputStream getBody() throws IOException { return new GZIPInputStream(response.getBody()); }
        @Override public HttpHeaders getHeaders() { return response.getHeaders(); }
        @Override public org.springframework.http.HttpStatusCode getStatusCode() throws IOException { return response.getStatusCode(); }
        @Override public String getStatusText() throws IOException { return response.getStatusText(); }
        @Override public void close() { response.close(); }
    }

}