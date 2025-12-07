package decidish.com.core;

import decidish.com.core.model.rewe.Market;
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
    @DisplayName("GET /markets/{id}/products returns 200 and updated market")
    void testGetAllProducts() throws Exception {
        // Arrange
        Long marketId = 540945L;
        Market mockMarket = new Market();
        mockMarket.setReweId(marketId);
        mockMarket.setName("REWE with Products");

        when(marketService.getAllProductsAPI(marketId)).thenReturn(mockMarket);

        // Act & Assert
        mockMvc.perform(get("/markets/{id}/products", marketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("REWE with Products"));
        
        verify(marketService).getAllProductsAPI(marketId);
    }
}