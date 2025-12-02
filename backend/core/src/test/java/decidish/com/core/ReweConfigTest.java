package decidish.com.core;

import decidish.com.core.configuration.ApiClientConfig;
import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.MarketSearchResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(classes = ApiClientConfig.class) // Only load your Config class
@EnableAutoConfiguration(exclude = {
    // Exclude DB stuff so the test doesn't crash if you don't have Postgres running
    DataSourceAutoConfiguration.class,
    FlywayAutoConfiguration.class
})

class ReweConfigTest {

    @Autowired
    private ReweApiClient client; // Spring injects the bean built by ApiClientConfig

    @Test
    @DisplayName("Verify ApiClientConfig loads Certs and connects")
    void testConfigurationAndConnection() {
        // 1. Verify Bean Injection
        assertNotNull(client, "ReweApiClient should be auto-wired by Spring");

        System.out.println("Configuration loaded successfully.");
        System.out.println("Testing connection to Mobile API...");

        // 2. Test Real Call (using the Zip from your curl command)
        String zipCode = "80809";
        MarketSearchResponse response = client.searchMarkets(zipCode);

        // 3. Verify Response
        assertNotNull(response);
        assertNotNull(response.markets(), "Markets list should not be null");
        assertFalse(response.markets().isEmpty(), "Should find markets in " + zipCode);

        System.out.println("Connection Successful!");
        System.out.println("Found " + response.markets().size() + " markets.");
        System.out.println("Name: " + response.markets().get(0).name());
        System.out.println("Name: " + response.markets().get(0).id());
        System.out.println("Name: " + response.markets().get(0).typeId());
        System.out.println("Name: " + response.markets().get(0).addressLine1());
        System.out.println("Name: " + response.markets().get(0).addressLine2());
        System.out.println("Name: " + response.markets().get(0).location().latitude());
        System.out.println("Name: " + response.markets().get(0).location().longitude());
        System.out.println("Name: " + response.markets().get(0).rawValues().postalCode());
        System.out.println("Name: " + response.markets().get(0).rawValues().city());
        
        
        // String response = client.searchMarkets(zipCode);

        // System.out.println("✅ Raw Response Received:");
        // System.out.println("--------------------------------------------------");
        // System.out.println(response); // Print the HTML to see what REWE is saying
        // System.out.println("--------------------------------------------------");
    }
}