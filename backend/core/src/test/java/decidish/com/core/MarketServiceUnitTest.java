package decidish.com.core;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Address;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.model.rewe.RawValues;
import decidish.com.core.model.rewe.Location;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.service.MarketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Use a test profile to ensure test configuration (like 'create-drop') is used
@SpringBootTest
@ActiveProfiles("test") 
class MarketServiceUnitTest {

    private final String TEST_PLZ = "80331";
    private final Long NEW_MARKET_ID = 540945L;
    private final Long OLD_MARKET_ID = 540946L;

    // Inject the service we are testing
    @Autowired
    private MarketService marketService;

    // Mock the dependencies: Repository and API Client
    @MockBean
    private MarketRepository marketRepository;

    @MockBean
    private ReweApiClient apiClient;

    // --- Mock Data Setup ---

    private Market existingStaleMarket;
    private MarketSearchResponse apiResponse;
    
    @BeforeEach
    void setup() {
        // --- 1. Define the API Response (2 DTOs) ---
        MarketDto newMarketDto = new MarketDto(
            NEW_MARKET_ID, "REWE New Market", "MARKET", 
            "Theatinerstr.", "14", 
            new Location(48.1, 11.5),
            new RawValues(TEST_PLZ, "Munich")
        );
        MarketDto oldMarketDtoUpdate = new MarketDto(
            OLD_MARKET_ID, "REWE Old Market - UPDATED NAME", "MARKET", // New Name
            "Marienplatz 1", "1", 
            new Location(48.1, 11.6),
            new RawValues(TEST_PLZ, "Munich")
        );
        apiResponse = new MarketSearchResponse(List.of(newMarketDto, oldMarketDtoUpdate));

        // --- 2. Define the Existing Market in the DB (STALE) ---
        Address existingAddress = new Address();
        existingAddress.setZipCode(TEST_PLZ);
        existingAddress.setCity("Munich");

        existingStaleMarket = new Market(
            OLD_MARKET_ID, "REWE Old Market - OLD NAME", 
            existingAddress
        );
        // Set last updated to be well in the past (10 weeks ago) to ensure freshness check fails
        existingStaleMarket.setLastUpdated(LocalDateTime.now().minusWeeks(10));
    }

    // ----------------------------------------------------------------------
    //                           TEST CASES
    // ----------------------------------------------------------------------

    /**
     * Scenario 1: DB Hit (Data is fresh - Cache Hit)
     * Service should return data from the DB and avoid the API call.
     */
    @Test
    @DisplayName("DB HIT: Should return markets from DB if data is fresh")
    void testDbHit_DataIsFresh() {
        // Arrange
        Market freshMarket = existingStaleMarket;
        // Override stale time to make the data fresh (1 day old)
        freshMarket.setLastUpdated(LocalDateTime.now().minusDays(1)); 

        // Mock repository to return the fresh market list
        when(marketRepository.getMarketsByAddress(TEST_PLZ))
            .thenReturn(Optional.of(List.of(freshMarket)));

        // Act
        List<Market> result = marketService.getMarkets(TEST_PLZ);

        // Assert
        assertEquals(1, result.size());
        
        // Key Verifications: 
        verify(apiClient, never()).searchMarkets(any()); // API should NOT be called
        verify(marketRepository, never()).save(any());  // DB Save should NOT occur
    }

    /**
     * Scenario 2: DB Miss/Stale (API Fetch & Insert/Update)
     * Service should call the API, find one existing market to update, and insert one new market.
     */
    @Test
    @DisplayName("DB MISS/STALE: Should fetch from API and perform mixed Insert/Update")
    void testApiFetchAndMixedInsertUpdate() {
        // Arrange
        
        // 1. Mock DB returning the stale market (DB Hit, but data fails freshness check)
        when(marketRepository.getMarketsByAddress(TEST_PLZ))
            .thenReturn(Optional.of(List.of(existingStaleMarket)));
        
        // 2. Mock findByReweId for the existing market (to trigger UPDATE path)
        when(marketRepository.findByReweId(OLD_MARKET_ID))
            .thenReturn(Optional.of(existingStaleMarket));
        // Mock findByReweId for the new market (to trigger INSERT path)
        when(marketRepository.findByReweId(NEW_MARKET_ID))
            .thenReturn(Optional.empty()); 
        
        // 3. Mock the API call
        when(apiClient.searchMarkets(TEST_PLZ)).thenReturn(apiResponse);
        
        // 4. Mock the save operation (Crucial: return the market object passed to save)
        when(marketRepository.save(any(Market.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        List<Market> result = marketService.getMarkets(TEST_PLZ);

        // Assert
        assertEquals(2, result.size());
        
        // Key Verifications: 
        verify(apiClient, times(1)).searchMarkets(TEST_PLZ); // API called once
        verify(marketRepository, times(2)).save(any(Market.class)); // 1 Insert + 1 Update = 2 Saves

        // Verify that the existing market received the update
        assertEquals("REWE Old Market - UPDATED NAME", existingStaleMarket.getName(), "Existing market name should be updated from API DTO");
    }
    
    /**
     * Scenario 3: API returns empty list (Handle null/empty API response)
     */
    @Test
    @DisplayName("Should handle null/empty API response gracefully")
    void testApiReturnsEmpty() {
        // Arrange
        when(marketRepository.getMarketsByAddress(TEST_PLZ))
            .thenReturn(Optional.of(Collections.emptyList()));
        when(apiClient.searchMarkets(TEST_PLZ))
            .thenReturn(new MarketSearchResponse(Collections.emptyList()));

        // Act
        List<Market> result = marketService.getMarkets(TEST_PLZ);

        // Assert
        assertEquals(0, result.size());
        verify(apiClient, times(1)).searchMarkets(TEST_PLZ);
        verify(marketRepository, never()).save(any());
    }
}
