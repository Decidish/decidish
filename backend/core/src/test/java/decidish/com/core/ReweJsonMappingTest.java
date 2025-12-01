package decidish.com.core;

import decidish.com.core.model.rewe.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure Java Unit Test.
 * Does not start Spring. Does not need Redis/Postgres.
 * Fast execution.
 */
class ReweJsonMappingTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // This is a sample JSON snippet copied exactly from what the REWE API might return
    private final String SAMPLE_JSON_RESPONSE = """
        {
            "totalCount": 1,
            "items": [
                {
                "pickupStation":false,
                "wwIdent":"431022",
                "displayName":"REWE Markt",
                "distance":2666,
                "latitude":"48.20215",
                "longitude":"11.54287",
                "companyName":"REWE Markt GmbH",
                "zipCode":"80995",
                "street":"Lerchenstr. 7",
                "city":"München",
                "houseNumber":null,
                "signedMapsUrl":"/api/markets/431022/map",
                "isPickupStation":false,
                "pickupVariant":"Abholservice"
                }
            ]
        }
    """;

    @Test
    @DisplayName("Step 1: Verify JSON -> Java Record (DTO) Mapping")
    void testJsonDeserialization() throws Exception {
        // 1. ACT: Manually try to turn the string into our Java Record
        MarketSearchResponse response = objectMapper.readValue(SAMPLE_JSON_RESPONSE, MarketSearchResponse.class);

        // 2. ASSERT: Check if data landed in the right fields
        assertNotNull(response);
        assertFalse(response.items().isEmpty());

        MarketDto firstMarket = response.items().get(0);
        
        // Basic fields
        // assertEquals("540945", firstMarket.id());
        assertEquals("431022", firstMarket.id());
        assertEquals("REWE Markt", firstMarket.name());
        
        // Nested Address check
        // assertNotNull(firstMarket.address());
        // assertEquals("Test Strasse", firstMarket.address().getStreet());
        // assertEquals("80995", firstMarket.address().getZipCode());

        assertEquals("80995", firstMarket.zipCode());
        assertEquals("Lerchenstr. 7", firstMarket.street());
        assertEquals("München", firstMarket.city());
    }

    @Test
    @DisplayName("Step 2: Verify Record (DTO) -> Database Entity Mapping")
    void testDtoToEntityConversion() throws Exception {
        // 1. ARRANGE: Create the DTO structure manually (or parse from JSON like above)
        MarketSearchResponse response = objectMapper.readValue(SAMPLE_JSON_RESPONSE, MarketSearchResponse.class);
        MarketDto dto = response.items().get(0);

        // 2. ACT: Run your conversion logic
        Market entity = Market.fromDto(dto);

        // 3. ASSERT: Check if the Entity is ready for the Database
        assertNotNull(entity);
        assertEquals(Long.valueOf(431022), entity.getId());
        // assertEquals("431022", entity.getId());
        assertEquals("REWE Markt", entity.getName());
        assertNotNull(entity.getAddress());
        assertEquals("Lerchenstr. 7", entity.getAddress().getStreet());
        assertEquals("München", entity.getAddress().getCity());
        
        // // Check the flattening logic (Street + Number combined)
        // assertEquals("Test Strasse 123", entity.getStreet()); 
        
        // Check simple fields
        assertEquals("80995", entity.getAddress().getZipCode());
        
        // Check that a timestamp was assigned
        // assertNotNull(entity.getLastUpdated());
    }

    // @Test
    // @DisplayName("Step 3: ReweApiClient searchMarkets() verification")
    // void testReweApiClientMapping() {
    //     // 1. ARRANGE: Create a mock or spy of the ReweApiClient
    //     ReweApiClient client = new ReweApiClient() {
    //         @Override
    //         public MarketSearchResponse searchMarkets(String zipCode) {
    //             // Mock response for testing
    //             try {
    //                 return objectMapper.readValue(SAMPLE_JSON_RESPONSE, MarketSearchResponse.class);
    //             } catch (Exception e) {
    //                 return null;
    //             }
    //         }
    //     };
        
    //     // 2. ACT: Call the method
    //     MarketSearchResponse response = client.searchMarkets("80809");

    //     // 3. ASSERT: Verify the response
    //     assertNotNull(response);
    //     assertFalse(response.items().isEmpty());
    //     assertEquals("431022", response.items().get(0).id());
    // }
}