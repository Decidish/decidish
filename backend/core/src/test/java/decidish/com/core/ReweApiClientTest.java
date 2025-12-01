package decidish.com.core;

import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.api.rewe.client.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.http.MediaType;

import java.util.List;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test for the ReweApiClient. We use MockRestServiceServer to simulate 
 * the external REWE API without making a real HTTP call.
 */
class ReweApiClientTest {

    // 1. Setup the tools
    private RestTemplate restTemplate;
    private MockRestServiceServer mockServer;
    private ReweApiClient reweApiClient;

    // The base URL for the API (must match what the client uses)
    private static final String BASE_URL = "https://shop.rewe.de/api";

    // 2. Sample JSON data that the fake server will return
    private final String SAMPLE_API_RESPONSE_JSON = """
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
    
    // This runs before every test method
    @BeforeEach
    void setUp() {
        // Initialize the RestTemplate
        restTemplate = new RestTemplate(); 
        
        // Use the RestTemplate to create a mock server
        mockServer = MockRestServiceServer.createServer(restTemplate);
        
        // Initialize the client object with the mock-enabled RestTemplate and the base URL
        reweApiClient = new ReweApiClientImpl(restTemplate);
    }

    @Test
    @DisplayName("API Client successfully fetches and maps markets")
    void testSearchMarkets_success() throws Exception {
        String testPostalCode = "80809";
        // This URL returns a RAW JSON ARRAY [ {market}, {market}, ... ]
        String expectedUrl = String.format("%s/marketselection/zipcodes/%s/services/pickup", BASE_URL, testPostalCode);
        
        // The JSON array response (Note: this is an array, not an object with an "items" field)
        // private final String SAMPLE_API_ARRAY_RESPONSE = """
        //     [
        //         {
        //         "pickupStation":false,
        //         "wwIdent":"431022",
        //         "displayName":"REWE Markt",
        //         "distance":2666,
        //         "zipCode":"80995",
        //         "street":"Lerchenstr. 7",
        //         "city":"München",
        //         "houseNumber":null
        //         }
        //     ]
        // """;


        
        // 1. ARRANGE
        mockServer.expect(requestTo(expectedUrl))
                .andRespond(withSuccess(SAMPLE_API_RESPONSE_JSON, MediaType.APPLICATION_JSON));

        // 2. ACT: This must call the method that expects a raw array response (e.g., searchMarketsV1)
        // NOTE: If the method signature is List<MarketDto> searchMarketsV1(String postalCode)
        // MarketSearchResponse response = reweApiClient.searchMarkets(testPostalCode);
        List<MarketDto> markets = reweApiClient.getMarketsByPostalCode(testPostalCode);


        // 3. ASSERT
        mockServer.verify();
        assertFalse(markets.isEmpty(), "Market list should not be empty");

        
        // assertNotNull(response, "Response list should not be null");
        // assertFalse(response.items().isEmpty(), "Market list should not be empty");
        // assertEquals(1, response.totalCount(), "List size should match JSON array size");

        // // Check the data
        // assertEquals("431022", response.items().get(0).id(), "Market ID must be mapped correctly");
        // assertEquals("REWE Markt", response.items().get(0).name(), "Market Name must be mapped correctly");
    }
}