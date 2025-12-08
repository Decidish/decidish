//! Deprecated
package decidish.com.core;

import decidish.com.core.repository.MarketRepository;
import decidish.com.core.service.MarketService;
import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.*;

import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.Cache;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(SpringExtension.class)
@SpringBootTest // Loads the full context (needed for Cache proxies + DB)
@EnableCaching
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional // Rolls back data after each test
class MarketRepositoryCacheTest {

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private MarketService marketService;

    @MockitoBean
    private ReweApiClient apiClient;

    private Statistics hibernateStats;

    @BeforeEach
    void setup() {
        // Clear all caches before every test to ensure isolation
        cacheManager.getCacheNames().forEach(name -> 
            cacheManager.getCache(name).clear()
        );

        // Setup Hibernate Statistics
        Session session = entityManager.unwrap(Session.class);
        hibernateStats = session.getSessionFactory().getStatistics();
        hibernateStats.setStatisticsEnabled(true);
        hibernateStats.clear();

        // Data Setup
        marketRepository.deleteAll();
        
        Address address1 = new Address();
        address1.setZipCode("12345"); // Cached
        marketRepository.save(new Market(1L, "m1", address1));

        Address address2 = new Address();
        address2.setZipCode("54321"); // Not Cached (due to 'unless')
        marketRepository.save(new Market(2L, "m2", address2));

        // 3. Setup Market 3 (The one your test needs!)
        Address address3 = new Address();
        address3.setZipCode("67890");
        Market market3 = new Market(3L, "m3", address3);
        
        // You must actually save a Product for Market 3
        // assuming Product has a constructor like (name, market) or setters
        Product p1 = new Product(100L,"Oranges",100,"img","100g",new ProductAttributesDto(false, false, false, false, false, false, false, false, false, false, false, false));
        p1.setMarket(market3); // Link the relationship
        market3.setProducts(new ArrayList<>(List.of(p1))); // Ensure consistency if bidirectional

        marketRepository.save(market3);

        // Flush to ensure saves are written and don't interfere with read counts
        entityManager.flush(); 
        entityManager.clear(); 
        hibernateStats.clear(); // Reset counter to 0
    }

    @Test
    void testCache_findByReweId() {
        // 1. First Call - Should hit DB
        marketRepository.findByReweId(1L);
        assertThat(hibernateStats.getQueryExecutionCount()).isEqualTo(1);

        // 2. Second Call - Should hit Cache (DB count stays 1)
        Optional<Market> cachedResult = marketRepository.findByReweId(1L);
        assertThat(hibernateStats.getQueryExecutionCount()).isEqualTo(1);
        
        // 3. Verify Content
        assertThat(cachedResult).isPresent();
        assertThat(cachedResult.get().getName()).isEqualTo("m1");
        
        // 4. Verify explicit presence in CacheManager (Optional)
        var cache = cacheManager.getCache("markets_id");
        assertThat(cache.get(1L)).isNotNull();
    }

    @Test
    //! Uncomment the annotations in MarketRepository
    void testNoCache_whenConditionMet() {
        // Condition: unless = "#reweId == 2L"
        
        // 1. First Call - Hits DB
        marketRepository.findByReweId(2L);
        assertThat(hibernateStats.getQueryExecutionCount()).isEqualTo(1);

        // 2. Second Call - Should Hit DB AGAIN because it was excluded from cache
        marketRepository.findByReweId(2L);
        assertThat(hibernateStats.getQueryExecutionCount()).isEqualTo(2);

        // 3. Verify Cache is empty for this ID
        var cache = cacheManager.getCache("markets_id");
        assertThat(cache.get(2L)).isNull();
    }

    @Test
    void testCache_getMarketsByAddress() {
        // 1. First Call - DB Hit
        marketRepository.getMarketsByAddress("12345");
        assertThat(hibernateStats.getQueryExecutionCount()).isEqualTo(1);

        // 2. Second Call - Cache Hit
        marketRepository.getMarketsByAddress("12345");
        assertThat(hibernateStats.getQueryExecutionCount()).isEqualTo(1);
    }
}