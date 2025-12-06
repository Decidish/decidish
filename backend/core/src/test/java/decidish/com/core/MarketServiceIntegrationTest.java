// package decidish.com.core;

// import decidish.com.core.model.rewe.*;
// import decidish.com.core.repository.MarketRepository;
// import decidish.com.core.service.MarketService;
// import decidish.com.core.api.rewe.client.ReweApiClient;
// import org.junit.jupiter.api.BeforeEach;
// import org.junit.jupiter.api.DisplayName;
// import org.junit.jupiter.api.Test;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.boot.test.context.SpringBootTest;
// import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
// import org.springframework.boot.test.mock.mockito.MockBean;
// import org.springframework.cache.annotation.EnableCaching;

// import java.util.List;
// import java.util.Optional;

// import static org.junit.jupiter.api.Assertions.*;
// import static org.mockito.ArgumentMatchers.any;
// import static org.mockito.Mockito.*;

// // @SpringBootTest
// @SpringBootTest(classes = CoreApplication.class)
// @AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Use Testcontainers Postgres
// // @EnableCaching
// class MarketServiceIntegrationTest {

//     @Autowired
//     private MarketService marketService;

//     @Autowired
//     private MarketRepository marketRepository;

//     // @Autowired
//     // private RedisTemplate<String, Object> redisTemplate;

//     @MockBean
//     private ReweApiClient apiClient;

//     @BeforeEach
//     void setup() {
//         // Clear DB and Redis before every test to ensure a clean state
//         marketRepository.deleteAll();
//         // redisTemplate.getConnectionFactory().getConnection().serverCommands().flushAll();
//     }

//     @Test
//     @DisplayName("Full Flow: API Fetch -> Save DB -> Cache Redis -> Cache Hit -> DB Fallback")
//     void testMarketCachingFlow() {
//         String zipCode = "80331";
//         // String redisKey = "markets:zip:" + zipCode;

//         // =================================================================
//         // STEP 1: PREPARE MOCK DATA (What the API *would* return)
//         // =================================================================
//         MarketDto mockMarketDto = new MarketDto(
//             "540945", "REWE Mock City", "MARKET", 
//             "Theatinerstr.", "14", 
//             new Location(48.1, 11.5),
//             new RawValues("80331", "Munich")
//         );
//         MarketSearchResponse mockResponse = new MarketSearchResponse(List.of(mockMarketDto));

//         // When the service calls searchMarkets, return our mock data
//         when(apiClient.searchMarkets(zipCode)).thenReturn(mockResponse);

//         // =================================================================
//         // STEP 2: COLD START (Cache Empty, DB Empty)
//         // =================================================================
//         System.out.println("--- Step 2: Cold Start ---");
//         List<Market> result1 = marketService.getMarkets(zipCode);

//         // ASSERTIONS:
//         assertEquals(1, result1.size());
//         assertEquals("REWE Mock City", result1.get(0).getName());

//         // 1. Verify API was called and data is in Postgres (existing)
//         verify(apiClient, times(1)).searchMarkets(zipCode);
//         assertEquals(1, marketRepository.count(), "Should have 1 row in DB");

//         // 2. Verify Data is in Postgres
//         assertEquals(1, marketRepository.count(), "Should have 1 row in DB");

//         // 3. Verify Data is in Redis
//         // assertTrue(redisTemplate.hasKey(redisKey), "Data should be cached in Redis");

//         // 4. NEW: VERIFY MARKET DATA INTEGRITY
//         Market savedMarket = result1.get(0);
//         assertEquals("540945", savedMarket.getReweId(), "Rewe ID must be saved.");
//         // assertNotNull(savedMarket.getId(), "Market must have a generated ID.");
//         assertNotNull(savedMarket.getAddress(), "Address object must not be null.");


//         // 5. NEW: VERIFY ADDRESS DATA INTEGRITY (FOREIGN KEY CHECK)
//         Address savedAddress = savedMarket.getAddress();

//         // Check FK relationship IDs
//         assertNotNull(savedAddress.getId(), "Address must have a generated ID.");
//         assertNotNull(savedMarket.getAddress().getId(), "Market's address ID must be set.");
//         assertEquals(savedAddress.getId(), savedMarket.getAddress().getId(), "Market FK must match Address PK.");

//         // Check Address data fields
//         assertEquals("80331", savedAddress.getZipCode(), "ZIP code must be correct.");
//         assertEquals("Munich", savedAddress.getCity(), "City must be correct.");
//         assertEquals("Theatinerstr.", savedAddress.getStreet(), "Street must be correct.");

//         // 6. NEW: VERIFY DB SEARCH (Make sure the market is searchable by its ID)
//         Optional<Market> foundMarket = marketRepository.findByReweId(savedMarket.getReweId());
//         assertTrue(foundMarket.isPresent(), "Market should be retrievable by its ID.");

//         // =================================================================
//         // STEP 3: CACHE HIT (Redis has data)
//         // =================================================================
//         // System.out.println("--- Step 3: Cache Hit ---");
//         // // Call service again
//         // List<Market> result2 = marketService.getMarkets(zipCode);

//         // // ASSERTIONS:
//         // assertEquals(1, result2.size());
//         // // CRITICAL: Verify API was NOT called again (times is still 1)
//         // verify(apiClient, times(1)).searchMarkets(any());

//         // =================================================================
//         // STEP 4: DB FALLBACK (Redis cleared, but DB has data)
//         // =================================================================
//         System.out.println("--- Step 4: DB Fallback ---");
//         // Manually delete from Redis to simulate cache eviction
//         // redisTemplate.delete(redisKey);
//         // assertFalse(redisTemplate.hasKey(redisKey));

//         // Call service again
//         List<Market> result3 = marketService.getMarkets(zipCode);

//         // ASSERTIONS:
//         assertEquals("REWE Mock City", result3.get(0).getName());
        
//         // CRITICAL: API was still NOT called (times is still 1) because DB had data
//         verify(apiClient, times(1)).searchMarkets(any());
        
//         // Verify Redis was repopulated from DB
//         // assertTrue(redisTemplate.hasKey(redisKey), "Redis should be repopulated from DB");
//     }
// }

package decidish.com.core;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.model.rewe.Location;
import decidish.com.core.model.rewe.RawValues;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.repository.MarketRepository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import decidish.com.core.service.MarketService;

// Ensure Spring Boot context is loaded for autowiring and transactional boundary
@SpringBootTest
// Use the 'test' profile to pick up your test configuration (e.g., specific DB URL, ddl-auto=create-drop)
@ActiveProfiles("test") 
// Use Replace.NONE if you are using Testcontainers to connect to a real instance
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) 
class MarketServiceIntegrationTest {

    private final String TEST_PLZ = "80331";
    private final String NEW_MARKET_ID = "540945";
    private final String OLD_MARKET_ID = "540946";

    // --- Components to be tested together ---
    @Autowired
    private MarketService marketService;

    // Use the real repository to interact with the test DB
    @Autowired
    private MarketRepository marketRepository;

    // Mock the external API
    @MockBean
    private ReweApiClient apiClient;

    // --- Mock Data Setup ---

    private MarketDto newMarketDto;
    private MarketDto oldMarketDtoUpdate;
    private MarketSearchResponse apiResponse;
    
    @BeforeEach
    void setup() {
        // Clear the database before each test to ensure isolation
        marketRepository.deleteAll();

        // 1. DTO for a brand new market
        newMarketDto = new MarketDto(
            NEW_MARKET_ID, "REWE New Market", "MARKET", 
            "Theatinerstr.", "14", 
            new Location(48.1, 11.5),
            new RawValues(TEST_PLZ, "Munich")
        );
        // 2. DTO for an existing market (with updated name/address)
        oldMarketDtoUpdate = new MarketDto(
            OLD_MARKET_ID, "REWE Old Market - UPDATED NAME", "MARKET", // New Name
            "Marienplatz", "1", // Slightly updated street
            new Location(48.1, 11.6),
            new RawValues(TEST_PLZ, "Munich")
        );
        apiResponse = new MarketSearchResponse(List.of(newMarketDto, oldMarketDtoUpdate));
    }
    
    @AfterEach
    void tearDown() {
        // Clean up after each test
        marketRepository.deleteAll();
    }

    // ----------------------------------------------------------------------
    //                           TEST CASES
    // ----------------------------------------------------------------------

    /**
     * Test Scenario 1: DB Miss (Initial Fetch)
     * Service should call API, insert two markets into the DB, and return the list.
     */
    @Test
    @DisplayName("Initial Fetch: Should fetch from API and insert new markets into DB")
    void testInitialFetch_DbMiss() {
        // Arrange
        // 1. Ensure DB starts empty for this PLZ (implicit via deleteAll)
        // 2. Mock API call to return two DTOs
        when(apiClient.searchMarkets(TEST_PLZ)).thenReturn(apiResponse);

        // Act
        List<Market> result = marketService.getMarkets(TEST_PLZ);

        // Assert
        assertEquals(2, result.size());
        
        // Check DB state: two markets should be saved
        List<Market> dbMarkets = marketRepository.findAll();
        assertEquals(2, dbMarkets.size());
        
        // Check that the API was called exactly once
        verify(apiClient, times(1)).searchMarkets(TEST_PLZ);
        
        // Assert the new market was saved correctly
        Optional<Market> market1 = marketRepository.findByReweId(NEW_MARKET_ID);
        assertTrue(market1.isPresent());
        assertEquals("REWE New Market", market1.get().getName());
    }

    /**
     * Test Scenario 2: DB Hit (Data is fresh - Cache Hit)
     * Service should read from the DB and never call the external API.
     */
    @Test
    @DisplayName("DB HIT: Should return markets from DB if data is fresh")
    void testDbHit_DataIsFresh() {
        // Arrange
        // 1. Manually insert a FRESH market into the DB
        Market freshMarket = new Market(OLD_MARKET_ID, "Fresh Name", new decidish.com.core.model.rewe.Address());
        freshMarket.getAddress().setZipCode(TEST_PLZ);
        freshMarket.setLastUpdated(LocalDateTime.now().minusDays(1)); // FRESH (less than 1 week)
        marketRepository.save(freshMarket);

        // Act
        List<Market> result = marketService.getMarkets(TEST_PLZ);

        // Assert
        assertEquals(1, result.size());
        assertEquals("Fresh Name", result.get(0).getName());
        
        // Key Verifications: 
        verify(apiClient, never()).searchMarkets(any()); // API should NOT be called
    }


    /**
     * Test Scenario 3: DB Hit (Data is stale - Update Path)
     * Service should call API, update the existing stale market, insert the new one, and update the DB.
     */
    @Test
    @DisplayName("DB STALE: Should fetch from API and perform mixed Insert/Update")
    void testDbStale_ApiFetchAndUpdate() {
        // Arrange
        // 1. Manually insert an existing STALE market into the DB
        Market staleMarket = new Market(OLD_MARKET_ID, "REWE Old Market - OLD NAME", new decidish.com.core.model.rewe.Address());
        staleMarket.getAddress().setZipCode(TEST_PLZ);
        staleMarket.getAddress().setStreet("Very Old Street");
        staleMarket.setLastUpdated(LocalDateTime.now().minusWeeks(10)); // STALE
        marketRepository.save(staleMarket);
        
        // 2. Mock API call to return the new DTO and the updated DTO
        when(apiClient.searchMarkets(TEST_PLZ)).thenReturn(apiResponse);

        // Act
        List<Market> result = marketService.getMarkets(TEST_PLZ);

        // Assert
        assertEquals(2, result.size()); // New market (540945) + Updated market (540946)
        
        // Key Verifications: 
        verify(apiClient, times(1)).searchMarkets(TEST_PLZ); // API called once
        
        // Check DB state: Verify the update happened on the existing market
        Optional<Market> updatedMarketOpt = marketRepository.findByReweId(OLD_MARKET_ID);
        assertTrue(updatedMarketOpt.isPresent());
        
        Market updatedMarket = updatedMarketOpt.get();
        
        // 1. Check Name Update
        assertEquals("REWE Old Market - UPDATED NAME", updatedMarket.getName(), "Name should be updated from API DTO");
        // 2. Check Address Update
        assertEquals("Marienplatz", updatedMarket.getAddress().getStreet(), "Address street should be updated");
        // 3. Check Timestamp Update
        assertTrue(updatedMarket.getLastUpdated().isAfter(LocalDateTime.now().minusMinutes(1)), "LastUpdated should be fresh");
        
        // Check that the new market was also inserted
        Optional<Market> newMarket = marketRepository.findByReweId(NEW_MARKET_ID);
        assertTrue(newMarket.isPresent());
    }
}