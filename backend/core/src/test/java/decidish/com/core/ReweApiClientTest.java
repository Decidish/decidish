package decidish.com.core;

import decidish.com.core.configuration.ApiClientConfig;
import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.api.rewe.client.ReweApiClient;
// import decidish.com.core.service.MarketService;
// import com.fasterxml.jackson.databind.ObjectMapper;
// import okhttp3.mockwebserver.MockResponse;
// import okhttp3.mockwebserver.MockWebServer;
// import okhttp3.mockwebserver.RecordedRequest;
// import org.junit.jupiter.api.AfterEach;
// import org.junit.jupiter.api.BeforeEach;
// import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.client.RestClientTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
// import org.springframework.test.context.DynamicPropertyRegistry;
// import org.springframework.test.context.DynamicPropertySource;
// import org.springframework.web.client.RestClient;
// import org.springframework.web.client.support.RestClientAdapter;
// import org.springframework.web.service.invoker.HttpServiceProxyFactory;

// import java.io.IOException;
// import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
// @RestClientTest
// We import the config to ensure the client beans are created
@Import(ApiClientConfig.class) 
class ReweApiClientTest {

    // 1. The Real Service (We are testing this)
    // @Autowired
    // private MarketService marketService;

    // 2. The Mock Server (Simulates REWE)
    // private MockWebServer mockWebServer;
    
    // 3. We need to manually override the Client to point to localhost for the Mock test
    // private ReweApiClient mockApiClient;

    // @BeforeEach
    // void setup() throws IOException {
    //     mockWebServer = new MockWebServer();
    //     mockWebServer.start();
        
    //     // Manual Setup: Recreate the Client to point to "http://localhost:PORT"
    //     // instead of "https://mobile-api.rewe.de"
    //     RestClient restClient = RestClient.builder()
    //             .baseUrl(mockWebServer.url("/").toString()) // Point to Mock Server
    //             .build();
                
    //     RestClientAdapter adapter = RestClientAdapter.create(restClient);
    //     mockApiClient = HttpServiceProxyFactory.builderFor(adapter)
    //             .build()
    //             .createClient(ReweApiClient.class);
    // }

    // @AfterEach
    // void tearDown() throws IOException {
    //     mockWebServer.shutdown();
    // }

    // @Test
    // @DisplayName("Mock Server: Verify Service calls correct URL and parses JSON")
    // void testMarketSearch_WithMockServer() throws Exception {
    //     // ARRANGE: Prepare the Fake JSON Response
    //     String jsonResponse = """
    //         {
    //             "totalCount": 1,
    //             "items": [
    //                 {
    //                     "id": "999",
    //                     "name": "Mock Market",
    //                     "address": {
    //                         "street": "Test Way",
    //                         "houseNumber": "1",
    //                         "postalCode": "12345",
    //                         "city": "Test City"
    //                     },
    //                     "position": { "lat": 1.0, "lon": 2.0 },
    //                     "type": "REWE"
    //                 }
    //             ]
    //         }
    //     """;
        
    //     // Enqueue the response so when the client hits the server, it gets this JSON
    //     mockWebServer.enqueue(new MockResponse()
    //             .setBody(jsonResponse)
    //             .addHeader("Content-Type", "application/json"));

    //     // ACT: Call the Client Method directly
    //     // (Or call marketService if you have a setter/constructor to inject the mockApiClient)
    //     MarketSearchResponse response = mockApiClient.searchMarkets("12345");

    //     // ASSERT 1: Check Data Parsing
    //     assertNotNull(response);
    //     assertEquals(1, response.items().size());
    //     assertEquals("Mock Market", response.items().get(0).name());

    //     // ASSERT 2: Check HTTP Request Structure
    //     RecordedRequest recordedRequest = mockWebServer.takeRequest();
        
    //     // Verify method is GET
    //     assertEquals("GET", recordedRequest.getMethod());
        
    //     // Verify URL path matches the REWE API structure
    //     // Expected: /mobile/markets/market-search?query=12345
    //     String path = recordedRequest.getPath();
    //     assertTrue(path.contains("/mobile/markets/market-search"));
    //     assertTrue(path.contains("query=12345"));
    // }

    @Test
    @DisplayName("REAL API: Connect to REWE (Manual Check)")
    // @Disabled("Only run this manually to verify internet connectivity and URL correctness")
    void testMarketSearch_RealApi(@Autowired ReweApiClient realClient) {
        // This uses the 'realClient' injected by Spring, which points to https://mobile-api.rewe.de
        
        String zipCode = "80331"; // Munich
        MarketSearchResponse response = realClient.searchMarkets(zipCode);

        assertNotNull(response);
        assertNotNull(response.items());
        assertFalse(response.items().isEmpty(), "Should find markets in Munich");

        MarketDto firstMarket = response.items().get(0);
        System.out.println("------------------------------------------------");
        System.out.println("Real API Result:");
        System.out.println("Name: " + firstMarket.name());
        System.out.println("ID:   " + firstMarket.id());
        System.out.println("City: " + firstMarket.city());
        System.out.println("------------------------------------------------");

        assertEquals("80331", firstMarket.zipCode());
    }
}