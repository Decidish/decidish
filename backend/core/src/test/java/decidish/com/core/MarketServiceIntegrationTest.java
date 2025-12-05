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
// @EnableCaching
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
//         assertNotNull(savedMarket.getId(), "Market must have a generated ID.");
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
//         Optional<Market> foundMarket = marketRepository.findById(savedMarket.getId());
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

//     @Test
//     @DisplayName("DB Check No Duplicate on Multiple Fetches")
//     void testNoDuplicate() {
//         String zipCode = "80331";

//         MarketDto mockMarketDto = new MarketDto(
//             "540945", "REWE Mock City", "MARKET", 
//             "Theatinerstr.", "14", 
//             new Location(48.1, 11.5),
//             new RawValues("80331", "Munich")
//         );
//         MarketSearchResponse mockResponse = new MarketSearchResponse(List.of(mockMarketDto));
//         when(apiClient.searchMarkets(zipCode)).thenReturn(mockResponse);

//         // First Call
//         marketService.getMarkets(zipCode);
//         long countAfterFirst = marketRepository.count();

//         assertTrue(countAfterFirst > 0, "DB should have entries after first fetch.");

//         // Second Call
//         marketService.getMarkets(zipCode);
//         long countAfterSecond = marketRepository.count();

//         // ASSERTIONS:
//         assertEquals(countAfterFirst, countAfterSecond, "DB count should remain the same after multiple fetches.");
//     }

//     //! IMPORTANT: Don't forget to comment if(!db.empty()) in MarketService to test this properly!

//     @Test
//     @DisplayName("Upsert Test: New API Data Updates Existing DB Record and Address")
//     void testMarketUpdateLogic() {
//         String zipCode = "80331";
//         String reweId = "540945";

//         // 1. Initial Insert Data
//         MarketDto initialDto = new MarketDto(
//             reweId, "REWE Mock City", "MARKET", 
//             "Theatinerstr.", "14", 
//             new Location(48.1, 11.5),
//             new RawValues("80331", "Munich")
//         );

//         // 2. Updated Data
//         MarketDto updatedDto = new MarketDto(
//             reweId,
//             "REWE Markt UPDATED Branch",
//             "MARKET",
//             "New Address 100",
//             "99999 New City / New Area",
//             new Location(52.6, 13.5),
//             new RawValues("99999", "New City")
//         );

//         // --- PHASE 1: COLD START INSERT ---
//         // API returns initial data
//         when(apiClient.searchMarkets(zipCode)).thenReturn(new MarketSearchResponse(List.of(initialDto)));
//         marketService.getMarkets(zipCode);

//         // Verify initial state
//         assertEquals(1, marketRepository.count(), "DB must have exactly 1 market.");
//         Market firstSave = marketRepository.findByReweId(reweId).orElseThrow();
//         Long marketId = firstSave.getId();
//         Long addressId = firstSave.getAddress().getId();

//         // --- PHASE 2: UPDATE (call service again) ---
//         // API now returns updated data
//         when(apiClient.searchMarkets(zipCode)).thenReturn(new MarketSearchResponse(List.of(updatedDto)));
//         marketService.getMarkets(zipCode);
//         System.out.println("Number of markets in repo: " + marketRepository.count());

//         // --- ASSERTIONS AFTER UPDATE ---

//         // 1. CRITICAL: COUNT CHECK
//         assertEquals(1, marketRepository.count(), "Should still have exactly 1 market (no duplicate insert).");
        
//         // 2. CHECK UPDATED DATA
//         Market finalMarket = marketRepository.findByReweId(reweId).orElseThrow();

//         System.out.println("Final Market Name: " + finalMarket.getName());
//         System.out.println("Final Market Address City: " + finalMarket.getAddress().getCity());
//         System.out.println("Final Market Address Street: " + finalMarket.getAddress().getStreet());

//         // 3. CHECK IDS (Ensure the same row was updated)
//         assertEquals(marketId, finalMarket.getId(), "Market ID must not have changed.");
//         assertEquals(addressId, finalMarket.getAddress().getId(), "Address ID must not have changed (same row updated).");  

//         // 4. CHECK FIELD UPDATES

//         System.out.println("Number of markets in repo: " + marketRepository.count());
//         assertEquals("REWE Markt UPDATED Branch", finalMarket.getName(), "Market name must be updated.");
//         assertEquals("New City", finalMarket.getAddress().getCity(), "Address city must be updated.");
//         assertEquals("New Address 100", finalMarket.getAddress().getStreet(), "Address street must be updated.");

//         // CRITICAL: Ensure API was called twice total (one for each phase)
//         verify(apiClient, times(2)).searchMarkets(zipCode);
//     }
// }
