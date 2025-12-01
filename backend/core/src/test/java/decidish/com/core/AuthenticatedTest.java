package decidish.com.core;

// import decidish.com.core.configuration.ApiClientConfig;
// import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.api.rewe.client.ReweApiClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.security.KeyStore;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthenticatedTest {

    @Test
    @DisplayName("Authenticated Integration: Hit REWE API with mTLS Certificate")
    void testRealApiCall() throws Exception {
        // ----------------------------------------------------------------
        // 1. LOAD THE CLIENT CERTIFICATE (.p12)
        // ----------------------------------------------------------------
        String p12Password = "changeit"; // The password you used in OpenSSL
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        
        // Load file from src/test/resources/rewe-client.p12
        try (InputStream in = new ClassPathResource("rewe-client.p12").getInputStream()) {
            keyStore.load(in, p12Password.toCharArray());
        } catch (Exception e) {
            System.err.println("⚠️ ERROR: Could not find 'rewe-client.p12' in src/test/resources/");
            System.err.println("You must extract the certs from the APK and create this file first.");
            throw e;
        }

        // ----------------------------------------------------------------
        // 2. CONFIGURE SSL CONTEXT
        // ----------------------------------------------------------------
        // KeyManager: Presents OUR certificate to the Server
        KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        kmf.init(keyStore, p12Password.toCharArray());

        // TrustManager: Verifies the SERVER'S certificate (Standard Java Trust)
        TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        tmf.init((KeyStore) null);

        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(kmf.getKeyManagers(), tmf.getTrustManagers(), null);

        // ----------------------------------------------------------------
        // 3. BUILD HTTP CLIENT WITH SSL
        // ----------------------------------------------------------------
        HttpClient jdkHttpClient = HttpClient.newBuilder()
                .sslContext(sslContext)
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        RestClient restClient = RestClient.builder()
                .baseUrl("https://mobile-api.rewe.de")
                .requestFactory(new JdkClientHttpRequestFactory(jdkHttpClient)) // Inject SSL Client
                .defaultHeader("User-Agent", "REWE-Mobile-Client/3.18.5.33032 Android/14 Phone/Google_Pixel_8_Pro")
                .defaultHeader("rd-service-types", "PICKUP")
                .defaultHeader("Accept","application/json")
                .defaultHeader("Connection","Keep-Alive")
                .build();

        // ----------------------------------------------------------------
        // 4. EXECUTE TEST
        // ----------------------------------------------------------------
        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();
        ReweApiClient client = factory.createClient(ReweApiClient.class);

        System.out.println("🚀 Sending Authenticated Request to REWE...");
        MarketSearchResponse response = client.searchMarkets("80995"); // Munich

        assertNotNull(response);
        System.out.println("✅ Success! Found " + response.markets().size() + " markets.");
        assertTrue(response.markets().size() > 0);
    }
}
