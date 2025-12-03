package decidish.com.core;

import decidish.com.core.configuration.ApiClientConfig;
import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.List;

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
        // String zipCode = "10115";
        MarketSearchResponse response = client.searchMarkets(zipCode);

        // 3. Verify Response
        assertNotNull(response);
        assertNotNull(response.markets(), "Markets list should not be null");
        assertFalse(response.markets().isEmpty(), "Should find markets in " + zipCode);

        System.out.println("Connection Successful!");
        System.out.println("Found " + response.markets().size() + " markets.");
        System.out.println("Name: " + response.markets().get(0).name());
        System.out.println("Id: " + response.markets().get(0).id());
        System.out.println("Type ID: " + response.markets().get(0).typeId());
        System.out.println("Address Line 1: " + response.markets().get(0).addressLine1());
        System.out.println("Address Line 2: " + response.markets().get(0).addressLine2());
        System.out.println("Latitude: " + response.markets().get(0).location().latitude());
        System.out.println("Longitude: " + response.markets().get(0).location().longitude());
        System.out.println("Postal Code: " + response.markets().get(0).rawValues().postalCode());
        System.out.println("City: " + response.markets().get(0).rawValues().city());
        
        
        // String response = client.searchMarkets(zipCode);

        // System.out.println("Raw Response Received:");
        // System.out.println("--------------------------------------------------");
        // System.out.println(response); // Print the HTML to see what REWE is saying
        // System.out.println("--------------------------------------------------");
    }

    @Test
    @DisplayName("Test Market Details API Call")
    void testMarketDetailsApiCall() {
        // Use a known market ID for testing
        String marketId = "431022";
        MarketDetailsResponse response = client.getMarketDetails(marketId);

        // Verify Response
        assertNotNull(response);
        assertNotNull(response.marketItem(), "Market item should not be null");
        assertNotNull(response.openingTimes(), "Opening hours should not be null");
        assertNotNull(response.specialOpeningTimes(), "Special opening hours should not be null");
        assertFalse(response.openingTimes().isEmpty(), "Opening hours should not be empty");
        System.out.println("Market Details for ID " + marketId + ":");
        System.out.println("Market Name: " + response.marketItem().name());
        System.out.println("Market Address: " + response.marketItem().addressLine1() + ", " + response.marketItem().rawValues().postalCode() + " " + response.marketItem().rawValues().city());
        System.out.println("Market Type ID: " + response.marketItem().typeId());
        System.out.println("Market Location: Lat " + response.marketItem().location().latitude() + ", Lon " + response.marketItem().location().longitude());
        System.out.println("Market ID: " + response.marketItem().id());
        System.out.println("Market Opening Times:");
        for (OpeningTime time : response.openingTimes()) {
            System.out.println(time.days() + ": " + time.hours());
        }
        for (OpeningTime time : response.specialOpeningTimes()) {
            System.out.println("Special - " + time.days() + ": " + time.hours());
        }

        // String response = client.searchMarkets(zipCode);

        // System.out.println("Raw Response Received:");
        // System.out.println("--------------------------------------------------");
        // System.out.println(response); // Print the HTML to see what REWE is saying
        // System.out.println("--------------------------------------------------");
    }

    @Test
    @DisplayName("Test Products API Call")
    void testProductsApiCall() {
        // Use a known market ID for testing
        String marketId = "431022";
        String product = "Kase";
        ProductSearchResponse response = client.searchProducts(
            product, "1", "30", 
            marketId);

        // Verify Response
        assertNotNull(response);
        ProductsData data = response.data();
        ProductsSearchInfo info = data.products();
        List<Product> products = info.products();
        System.out.println("Product Details for market " + marketId + ":");
        System.out.println("Name: " + products.get(0).title());
        System.out.println("Id: " + products.get(0).productId());
        System.out.println("imageURL: " + products.get(0).imageURL());
        System.out.println("articleId: " + products.get(0).articleId());
        System.out.println("price: " + products.get(0).listing().currentRetailPrice());
        System.out.println("grammage: " + products.get(0).listing().grammage());
        System.out.println("discount: " + products.get(0).listing().discount().__typename());
    }
}