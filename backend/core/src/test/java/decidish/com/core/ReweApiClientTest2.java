package decidish.com.core;

import decidish.com.core.configuration.ApiClientConfig;
import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.MarketSearchResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.ssl.SslBundles;
import org.springframework.boot.ssl.SslBundle;
import javax.net.ssl.SSLContext;
import java.security.NoSuchAlgorithmException;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

// 1. Load ONLY the Client Config
@SpringBootTest(classes = ApiClientConfig.class)
// 2. Explicitly Kill Database Auto-Config so it doesn't look for Docker/Postgres
@EnableAutoConfiguration(exclude = {
    DataSourceAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class,
    FlywayAutoConfiguration.class
})
class ReweApiClientTest2 {

    @Autowired
    private ReweApiClient client;

    // 3. Mock the SSL requirements
    @MockBean
    private SslBundles sslBundles;
    @MockBean
    private SslBundle sslBundle;

    @BeforeEach
    void setupSsl() throws NoSuchAlgorithmException {
        // Prevent NullPointerException when RestClient builds
        when(sslBundles.getBundle(any())).thenReturn(sslBundle);
        when(sslBundle.createSslContext()).thenReturn(SSLContext.getDefault());
    }

    @Test
    @DisplayName("Manual Test: Hit real REWE API")
    void testRealApiCall() {
        String zipCode = "80331"; // Munich
        MarketSearchResponse response = client.searchMarkets(zipCode);
        
        assertNotNull(response);
        System.out.println("Success! Found " + response.totalCount() + " markets.");
    }
}
