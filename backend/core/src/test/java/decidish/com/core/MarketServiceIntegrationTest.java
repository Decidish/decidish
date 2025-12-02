package decidish.com.core;

import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.service.MarketService;
import decidish.com.core.api.rewe.client.ReweApiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.RedisTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
//@Import(TestcontainersConfiguration.class) // Uses your existing Docker setup
@AutoConfigureTestDatabase
class MarketServiceIntegrationTest {

    @Autowired
    private MarketService marketService;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @MockBean
    private ReweApiClient apiClient;

    @BeforeEach
    void setup() {
        // Clear DB and Redis before every test to ensure a clean state
        marketRepository.deleteAll();
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushAll();
    }

    @Test
    @DisplayName("Full Flow: API Fetch -> Save DB -> Cache Redis -> Cache Hit -> DB Fallback")
    void testMarketCachingFlow() {
        String zipCode = "80331";
        String redisKey = "markets:zip:" + zipCode;

        // =================================================================
        // STEP 1: PREPARE MOCK DATA (What the API *would* return)
        // =================================================================
        MarketDto mockMarketDto = new MarketDto(
            "540945", "REWE Mock City", "MARKET", 
            "Theatinerstr.", "14", 
            new Location(48.1, 11.5),
            new RawValues("80331", "Munich")
        );
        MarketSearchResponse mockResponse = new MarketSearchResponse(List.of(mockMarketDto));

        // When the service calls searchMarkets, return our mock data
        when(apiClient.searchMarkets(zipCode)).thenReturn(mockResponse);

        // =================================================================
        // STEP 2: COLD START (Cache Empty, DB Empty)
        // =================================================================
        System.out.println("--- Step 2: Cold Start ---");
        List<Market> result1 = marketService.getMarkets(zipCode);

        // ASSERTIONS:
        assertEquals(1, result1.size());
        assertEquals("REWE Mock City", result1.get(0).getName());
        
        // 1. Verify API was called
        verify(apiClient, times(1)).searchMarkets(zipCode);
        // 2. Verify Data is in Postgres
        assertEquals(1, marketRepository.count(), "Should have 1 row in DB");
        // 3. Verify Data is in Redis
        assertTrue(redisTemplate.hasKey(redisKey), "Data should be cached in Redis");

        // =================================================================
        // STEP 3: CACHE HIT (Redis has data)
        // =================================================================
        System.out.println("--- Step 3: Cache Hit ---");
        // Call service again
        List<Market> result2 = marketService.getMarkets(zipCode);

        // ASSERTIONS:
        assertEquals(1, result2.size());
        // CRITICAL: Verify API was NOT called again (times is still 1)
        verify(apiClient, times(1)).searchMarkets(any());

        // =================================================================
        // STEP 4: DB FALLBACK (Redis cleared, but DB has data)
        // =================================================================
        System.out.println("--- Step 4: DB Fallback ---");
        // Manually delete from Redis to simulate cache eviction
        redisTemplate.delete(redisKey);
        assertFalse(redisTemplate.hasKey(redisKey));

        // Call service again
        List<Market> result3 = marketService.getMarkets(zipCode);

        // ASSERTIONS:
        assertEquals("REWE Mock City", result3.get(0).getName());
        
        // CRITICAL: API was still NOT called (times is still 1) because DB had data
        verify(apiClient, times(1)).searchMarkets(any());
        
        // Verify Redis was repopulated from DB
        assertTrue(redisTemplate.hasKey(redisKey), "Redis should be repopulated from DB");
    }
}
