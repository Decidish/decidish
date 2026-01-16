package decidish.com.core.unit;

import decidish.com.core.api.rewe.client.ReweApiClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("unit")
class ReweApiClientUT {

    @Test
    @DisplayName("Constants: Verify API Base URLs and Paths")
    void testConstants() {
        assertEquals("https://mobile-api.rewe.de/api/v3", ReweApiClient.REWE_API_BASE_URL);
        assertEquals("https://mobile-clients-api.rewe.de/api", ReweApiClient.REWE_CLIENT_API_BASE_URL);
        assertEquals("/market/search", ReweApiClient.MARKET_SEARCH_PATH);
        assertEquals("/market/details", ReweApiClient.MARKET_DETAILS_PATH);
        assertEquals("/products", ReweApiClient.PRODUCT_SEARCH_PATH);
    }
}
