package decidish.com.core.integration;

import decidish.com.core.configuration.ApiClientConfig;
import decidish.com.core.configuration.MinioConfig;
import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.session.SessionAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.List;

@SpringBootTest(classes = { ApiClientConfig.class, MinioConfig.class })
@EnableAutoConfiguration(exclude = {
        // Exclude DB stuff so the test doesn't crash if you don't have Postgres running
        DataSourceAutoConfiguration.class,
        FlywayAutoConfiguration.class,
        SessionAutoConfiguration.class
})
@ActiveProfiles("test") 

class ReweConfigIT {

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

        MarketPickupResponse response = client.searchMarkets(zipCode);

        // 3. Verify Response
        assertNotNull(response);
        // List<MarketDto> markets = response.data().marketSearch().markets();
        List<MarketPickupDto> markets = response.data().servicePortfolio().pickupMarkets();
        assertNotNull(markets, "Markets list should not be null");
        assertFalse(markets.isEmpty(), "Should find markets in " + zipCode);
    }

    @Test
    @DisplayName("Test Products API Call")
    void testProductsApiCall() {
        // Use a known market ID for testing
        Long marketId = 431022L;
        String product = "Kase";
        ProductSearchResponse response = client.searchProducts(
                product, 1, 30,
                marketId);

        // Verify Response
        assertNotNull(response);
        // System.out.println(response);
        ProductsData data = response.data();
        // System.out.println(data);
        assertNotNull(data, "Response 'data' should not be null");
        ProductsSearchInfo info = data.products();
        assertNotNull(info, "Response 'data.products' (SearchInfo) is null. The API might have returned an error or empty structure.");
        List<ProductDto> products = info.products();
        System.out.println("Product Details for market " + marketId + ":");
        System.out.println("Name: " + products.get(0).title());
        System.out.println("Id: " + products.get(0).productId());
        System.out.println("imageURL: " + products.get(0).imageURL());
        System.out.println("articleId: " + products.get(0).articleId());
        System.out.println("price: " + products.get(0).listing().currentRetailPrice());
        System.out.println("grammage: " + products.get(0).listing().grammage());
        if (products.get(0).listing().discount() != null) {
            System.out.println("discount: " + products.get(0).listing().discount().__typename());
        }
        Pagination pagination = info.pagination();
        System.out.println("objetctsPerPage: " + pagination.objectsPerPage());
        System.out.println("currentPage: " + pagination.currentPage());
        System.out.println("pageCount: " + pagination.pageCount());
        System.out.println("objectCount: " + pagination.objectCount());
    }
}