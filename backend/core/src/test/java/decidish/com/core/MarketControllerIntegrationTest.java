package decidish.com.core;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.MarketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc // Initializes MockMvc with the full context
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Use Docker
@Transactional // Rollback DB after every test
class MarketControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MarketRepository marketRepository;

    @MockitoBean
    private ReweApiClient apiClient;

    private final String PLZ = "80331";
    private final Long MARKET_ID1 = 540945L;
    private final Long MARKET_ID2 = 540946L;

    @BeforeEach
    void setup() {
        // DB is cleared automatically by @Transactional rollback, 
        // but explicit delete is safe if Transactional is disabled.
        marketRepository.deleteAll();
        marketRepository.flush(); // Force the delete SQL to execute NOW
    }

    @Test
    @DisplayName("GET /markets?plz=... -> Fetches from API, Saves to DB, Returns JSON")
    void testSearchMarkets_EndToEnd() throws Exception {
        // --- 1. ARRANGE: Mock External API ---
        MarketDto dto = new MarketDto(
            MARKET_ID1, "REWE Integration Market", "MARKET", 
            "Test St.", "1", new Location(48.1, 11.5), new RawValues(PLZ, "Munich")
        );
        MarketSearchResponse response = new MarketSearchResponse(List.of(dto));

        // When the Service calls the Client, return this mock
        when(apiClient.searchMarkets(eq(PLZ))).thenReturn(response);

        // --- 2. ACT: Perform HTTP Request ---
        mockMvc.perform(get("/markets")
                        .param("plz", PLZ)
                        .contentType(MediaType.APPLICATION_JSON))
                
                // --- 3. ASSERT: Response Verification ---
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].reweId").value(MARKET_ID1))
                .andExpect(jsonPath("$[0].name").value("REWE Integration Market"));

        // --- 4. ASSERT: Database Verification ---
        // Verify the controller call actually persisted data
        assertEquals(1, marketRepository.count());
        Market saved = marketRepository.findByReweId(MARKET_ID1).orElseThrow();
        assertEquals("REWE Integration Market", saved.getName());
    }

    @Test
    @DisplayName("GET /markets/{id}/products -> Fetches Products, Updates DB, Returns JSON")
    void testGetAllProducts_EndToEnd() throws Exception {
        // --- 1. ARRANGE: Pre-seed Database ---
        // The service requires the market to exist before fetching products
        Market dbMarket = new Market();
        dbMarket.setReweId(MARKET_ID2);
        dbMarket.setName("Market Before Products");
        marketRepository.save(dbMarket);

        // --- 2. ARRANGE: Mock Product API ---
        ProductDto prodDto = new ProductDto(
            123L, "Integration Milk", "img_url", null, 10, List.of(), "articleId1", 
            new ProductPrice(159, 100, "100g",null,null)
        );
        // Wrapper structure based on your previous code
        ProductSearchResponse productResponse = new ProductSearchResponse(
            new ProductsData(new ProductsSearchInfo(new Pagination(1,1,1,1), List.of(prodDto)))
        );

        // Use any() for URI because it's dynamic
        when(apiClient.searchProducts(any(), anyInt(), anyInt(),eq(MARKET_ID2)))
                .thenReturn(productResponse);

        // --- 3. ACT ---
        mockMvc.perform(get("/markets/{id}/products", MARKET_ID2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reweId").value(MARKET_ID2))
                // Verify products are in the JSON response
                .andExpect(jsonPath("$.products", hasSize(1)))
                .andExpect(jsonPath("$.products[0].name").value("Integration Milk"))
                .andExpect(jsonPath("$.products[0].price").value(159));

        // --- 4. ASSERT: Database Verification ---
        Market updatedMarket = marketRepository.findByReweId(MARKET_ID2).get();
        assertEquals(1, updatedMarket.getProducts().size());
        assertEquals("Integration Milk", updatedMarket.getProducts().get(0).getName());
    }

    @Test
    @DisplayName("GET /markets/{id}/query?query=... -> Fetches Products with Query, Updates DB, Returns JSON")
    void testGetAllProductsWithQuery_EndToEnd() throws Exception {
        // --- 1. ARRANGE: Pre-seed Database ---
        Market dbMarket = new Market();
        dbMarket.setReweId(MARKET_ID1);
        dbMarket.setName("Market Before Query Products");
        marketRepository.save(dbMarket);

        // --- 2. ARRANGE: Mock Product API ---
        String query = "bread";
        ProductDto prodDto = new ProductDto(
            456L, "Integration Bread", "img_url", null, 10, List.of(), "articleId2", 
            new ProductPrice(299, 100, "100g",null,null)
        );
        ProductSearchResponse productResponse = new ProductSearchResponse(
            new ProductsData(new ProductsSearchInfo(new Pagination(1,1,1,1), List.of(prodDto)))
        );  

        when(apiClient.searchProducts(eq(query), anyInt(), anyInt(), eq(MARKET_ID1)))
                .thenReturn(productResponse);
        
        // --- 3. ACT ---
        mockMvc.perform(get("/markets/{id}/query", MARKET_ID1)
                        .param("query", query))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reweId").value(MARKET_ID1))
                // Verify products are in the JSON response
                .andExpect(jsonPath("$.products", hasSize(1)))
                .andExpect(jsonPath("$.products[0].name").value("Integration Bread"))
                .andExpect(jsonPath("$.products[0].price").value(299));
        
        // --- 4. ASSERT: Database Verification ---
        Market updatedMarket = marketRepository.findByReweId(MARKET_ID1).get();
        assertEquals(1, updatedMarket.getProducts().size());
        assertEquals("Integration Bread", updatedMarket.getProducts().get(0).getName());
        assertEquals(299, updatedMarket.getProducts().get(0).getPrice());   
    }
}
