package decidish.com.core;

import decidish.com.core.configuration.ApiClientConfig;
import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.api.rewe.client.ReweApiClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * A "Plain Java" Integration Test.
 * * We do NOT use @SpringBootTest. 
 * We verify the API connectivity directly.
 * This bypasses all Database, Docker, and SSL configuration issues.
 */
class ApiClientIntegrationTest {

    @Test
    @DisplayName("Manual Integration: Hit real REWE API")
    void testRealApiCall() {
        // 1. Manually build the RestClient (No Spring Magic)
        RestClient restClient = RestClient.builder()
                // .baseUrl("https://mobile-api.rewe.de")
                // .baseUrl("https://www.rewe.de")
                // // .defaultHeader("User-Agent", "REWE-Mobile-App/3.10.1 (Android 11)")
                // .defaultHeader("Accept", "application/json")
                // .build();
                .baseUrl("https://www.rewe.de")
                .defaultHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
                .defaultHeader("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                .defaultHeader("Accept-Language", "en-US,en;q=0.5")
                .defaultHeader("Accept-Encoding", "gzip, deflate, br")
                .defaultHeader("Connection", "keep-alive")
                .defaultHeader("Upgrade-Insecure-Requests", "1")
                .defaultHeader("Sec-Fetch-Dest", "document")
                .defaultHeader("Sec-Fetch-Mode", "navigate")
                .defaultHeader("Sec-Fetch-Site", "none")
                .defaultHeader("Sec-Fetch-User", "?1")
                .defaultHeader("Pragma", "no-cache")
                .defaultHeader("Cache-Control", "no-cache")
                .build();

        // 2. Manually create the Proxy (What Spring usually does for you)
        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();
        ReweApiClient client = factory.createClient(ReweApiClient.class);

        // 3. Run the Test
        String zipCode = "80331"; // Munich
        System.out.println("------------------------------------------------");
        System.out.println("Sending request to REWE for zip: " + zipCode);
        
        List<MarketDto> response = client.searchMarkets(zipCode);
        
        // 4. Validate
        assertNotNull(response, "Response should not be null");
        // assertNotNull(response.items(), "Items list should not be null");
        
        System.out.println("Success! Found " + response.size() + " markets.");
        if (!response.isEmpty()) {
            System.out.println("First Market: " + response.get(0).name());
        }
        System.out.println("------------------------------------------------");
        
        assertTrue(response.size() > 0, "Should find at least one market in Munich");
    }
}
