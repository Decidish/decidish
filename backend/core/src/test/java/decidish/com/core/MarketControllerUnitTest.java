package decidish.com.core;

import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.ProductAttributesDto;
import decidish.com.core.model.rewe.ProductDto;
import decidish.com.core.model.rewe.ProductPrice;
import decidish.com.core.service.MarketService;
import decidish.com.core.controller.MarketController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MarketController.class)
class MarketControllerUnitTest {

    @Autowired
    private MockMvc mockMvc; // Simulates HTTP requests

    @MockitoBean
    private MarketService marketService; // We mock the service logic

    @Test
    @DisplayName("GET /markets?plz=... returns 200 and list")
    void testSearchMarkets() throws Exception {
        // Arrange
        String plz = "80809";
        Market mockMarket = new Market();
        mockMarket.setReweId(1L);
        mockMarket.setName("REWE Test");
        
        when(marketService.getMarkets(plz)).thenReturn(List.of(mockMarket));

        // Act & Assert
        mockMvc.perform(get("/markets")
                        .param("plz", plz)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size()").value(1))
                .andExpect(jsonPath("$[0].name").value("REWE Test"));

        verify(marketService).getMarkets(plz);
    }

    @Test
    @DisplayName("GET /markets/{id}/products returns 200 and list of products")
    void testGetAllProducts() throws Exception {
        // Arrange
        Long marketId = 540945L;
        
        // Create dummy products for the mock
        ProductAttributesDto attributes = new ProductAttributesDto(false,false,false,false,false,false,false,false,false,false,false,false);
        ProductPrice price1 = new ProductPrice(199,0,"",null,null);
        ProductPrice price2 = new ProductPrice(99,0,"",null,null);
        ProductDto p1 = new ProductDto(1L, "Apples", "",attributes,0,null,"",price1);
        ProductDto p2 = new ProductDto(2L, "Bananas", "",attributes,0,null,"",price2);

        // Mock the service to return the LIST, not the Market
        when(marketService.getAllProducts(marketId)).thenReturn(List.of(p1, p2));

        // Act & Assert
        mockMvc.perform(get("/markets/{id}/products", marketId))
                .andExpect(status().isOk())
                // 1. Check that the root ($) is an Array
                .andExpect(jsonPath("$").isArray())
                // 2. Check the size of the array
                .andExpect(jsonPath("$.length()").value(2))
                // 3. Verify the first product's name
                .andExpect(jsonPath("$[0].title").value("Apples"))
                // 4. Verify the second product's price
                .andExpect(jsonPath("$[1].listing.currentRetailPrice").value(99));
        
        verify(marketService).getAllProducts(marketId);
    }

    @Test
    @DisplayName("GET /markets/{id}/query?query={query} returns 200 and list of matching products")
    void testGetAllProductsWithQuery() throws Exception {
        // Arrange
        Long marketId = 540945L;
        String query = "milk";

        // Create a dummy ProductDto (using nulls for fields we don't care about in this test)
        ProductDto milkProduct = new ProductDto(
            101L, 
            "Fresh Milk 3.5%",  // title
            null, // image
            null, // attributes
            10,   // limit
            List.of("Dairy"), 
            "123-MILK", 
            null  // price/listing
        );
        
        // Mock the service to return a LIST containing our product
        when(marketService.getProductsQuery(marketId, query)).thenReturn(List.of(milkProduct));

        // Act & Assert
        mockMvc.perform(get("/markets/{id}/query", marketId)
                        .param("query", query))
                .andExpect(status().isOk())
                // 1. Verify it is an Array
                .andExpect(jsonPath("$").isArray())
                // 2. Verify we got 1 result
                .andExpect(jsonPath("$.length()").value(1))
                // 3. Verify the PRODUCT TITLE (not Market name)
                .andExpect(jsonPath("$[0].title").value("Fresh Milk 3.5%"));

        verify(marketService).getProductsQuery(marketId, query);
    }
}