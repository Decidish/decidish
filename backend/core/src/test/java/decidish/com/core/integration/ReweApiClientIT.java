package decidish.com.core.integration;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketDetailsResponse;
import decidish.com.core.model.rewe.MarketPickupResponse;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.ProductSearchResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("integration")
@Tag("integration")
class ReweApiClientIT {

    @Autowired
    private ReweApiClient reweApiClient;

    // Use known valid data from other integration tests
    private final String VALID_ZIP_CODE = "80809";
    private final Long VALID_MARKET_ID = 431022L; // REWE City Munich
    private final String PRODUCT_QUERY = "Milch";

    @Test
    @DisplayName("searchMarkets: Should return markets for valid zip code (LIVE)")
    void testSearchMarkets() {
        // MarketSearchResponse response = reweApiClient.searchMarkets(VALID_ZIP_CODE);

        MarketPickupResponse response = reweApiClient.searchMarkets(VALID_ZIP_CODE);

        assertNotNull(response, "Response should not be null");
        // Depending on the API response structure, we might check for logic errors or
        // empty lists
        // Assuming error is null or non-http-200 throws exception (handled by
        // client/proxy)
        // Checks that we got some objects back.
        // Note: Response structure depends on the DTO.
    }

    @Test
    @DisplayName("getMarketDetails: Should return details for valid market ID (LIVE)")
    void testGetMarketDetails() {
        MarketDetailsResponse response = reweApiClient.getMarketDetails(VALID_MARKET_ID);

        assertNotNull(response, "Response should not be null");
        // Verify some content if possible, e.g. ID match
        // assertNotNull(response.id()); // if exposed
    }

    @Test
    @DisplayName("searchProducts: Should return products for valid query and market (LIVE)")
    void testSearchProducts() {
        // page=1, objectsPerPage=10
        int page = 1;
        int objectsPerPage = 10;

        ProductSearchResponse response = reweApiClient.searchProducts(PRODUCT_QUERY, page, objectsPerPage,
                VALID_MARKET_ID);

        assertNotNull(response, "Response should not be null");
        // Verify we got products
        // assertNotNull(response.products());
    }
}
