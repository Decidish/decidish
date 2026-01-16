package decidish.com.core.configuration;

import decidish.com.core.api.rewe.client.ReweApiClient;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.zip.GZIPInputStream;

@Configuration
public class ApiClientConfig {

    private static final Logger log = LoggerFactory.getLogger(ApiClientConfig.class);

    @Bean
    public ReweApiClient reweApiClient(RestClient.Builder builder, MinioClient minioClient, SslBundles sslBundles) {
        SslBundle reweBundle;

        try {
            String MINIO_DECIDISH_BUCKET = "decidish-storage";
            String MINIO_PEM = "private_test.pem";
            String MINIO_KEY = "private_test.key";

            log.info("Attempting to load SSL certificates from MinIO bucket: {}", MINIO_DECIDISH_BUCKET);
            
            String cert = new String(fetchFromMinio(minioClient, MINIO_DECIDISH_BUCKET, MINIO_PEM), StandardCharsets.UTF_8);
            String key = new String(fetchFromMinio(minioClient, MINIO_DECIDISH_BUCKET, MINIO_KEY), StandardCharsets.UTF_8);

            PemSslStoreDetails keyStoreDetails = PemSslStoreDetails.forCertificate(cert).withPrivateKey(key);
            PemSslStoreBundle pemBundle = new PemSslStoreBundle(keyStoreDetails, null);
            reweBundle = SslBundle.of(pemBundle);
            
        } catch (Exception e) {
            log.warn("Failed to connect to MinIO ({}). Falling back to local 'rewe-client' SSL bundle.", e.getMessage());
            try {
                reweBundle = sslBundles.getBundle("rewe-client");
            } catch (Exception ex) {
                throw new IllegalStateException("MinIO is down AND no local 'rewe-client' SSL bundle found. Cannot start.", ex);
            }
        }

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder()
                        .version(HttpClient.Version.HTTP_2)
                        .connectTimeout(Duration.ofSeconds(10))
                        .sslContext(reweBundle.createSslContext())
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
                // --- ADDED: Rate Limit Retry Interceptor ---
                .requestInterceptor(new RateLimitRetryInterceptor()) 
                .requestInterceptor((request, body, execution) -> {
                    request.getHeaders().add("rdfa", UUID.randomUUID().toString());
                    request.getHeaders().add("Correlation-Id", UUID.randomUUID().toString());
                    return execution.execute(request, body);
                })
                .requestInterceptor(new GzipInterceptor())
                .build();

        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();

        return factory.createClient(ReweApiClient.class);
    }
    
    // --- UPDATED: Robust Retry Strategy for 429s ---
    static class RateLimitRetryInterceptor implements ClientHttpRequestInterceptor {
        private static final int MAX_RETRIES = 5; // Increased from 3
        private static final long INITIAL_BACKOFF_MS = 3000; // Start with 3s wait

        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
            long backoff = INITIAL_BACKOFF_MS;
            
            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                ClientHttpResponse response = execution.execute(request, body);
                
                if (response.getStatusCode().value() == 429) {
                    if (attempt == MAX_RETRIES) {
                        log.error("Rate Limit (429) exhausted after {} attempts.", MAX_RETRIES);
                        return response; // Give up and let the error propagate
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

    private byte[] fetchFromMinio(MinioClient client, String bucket, String name) throws Exception {
        try (InputStream stream = client.getObject(
                GetObjectArgs.builder().bucket(bucket).object(name).build())) {
            return stream.readAllBytes();
        }
    }
}