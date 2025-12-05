package decidish.com.core;

import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.api.rewe.client.ReweApiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;

import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = CoreApplication.class)
@EnableCaching
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Use Testcontainers Postgres
class MarketRespositoryIntegrationTest {

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private CacheManager cacheManager; // To clear @Cacheable caches

    // We mock the API Client to count the exact number of HTTP requests made
    @MockBean
    private ReweApiClient apiClient;

    @BeforeEach
    void setup() {
        marketRepository.deleteAll();
        Address address1 = new Address();
        address1.setZipCode("12345");
        Address address2 = new Address();
        address2.setZipCode("54321");
        marketRepository.save(new Market("1","m1",address1));
        marketRepository.save(new Market("2","m2",address2));
    }
    
    private Optional<Market> getCachedMarket(String reweId){
        return Optional.ofNullable(cacheManager.getCache("markets_id")).map(c -> c.get(reweId,Market.class));
    }

    private Optional<List<Market>> getCachedMarkets(String plz){
        return Optional.ofNullable(cacheManager.getCache("markets")).map(c -> c.get(plz,List.class));
    }

    @Test
    void givenMarketThatShouldBeCached_whenFindByReweId_thenResultShouldBePutInCache() {
        // Optional<Market> m1 = marketService.findByReweId("1");
        Optional<Market> m1 = marketRepository.findByReweId("1");

        assertEquals(m1, getCachedMarket("1"));
    }

    @Test
    void givenMarketThatShouldNotBeCached_whenFindByReweId_thenResultShouldNotBePutInCache() {
        marketRepository.findByReweId("2");

        assertEquals(Optional.empty(), getCachedMarket("2"));
    }
    
    @Test
    void givenMarketThatShouldBeCached_whenFindByPlz_thenResultShouldBePutInCache() {
        // Optional<Market> m1 = marketService.findByReweId("1");
        Optional<List<Market>> m1 = marketRepository.getMarketsByAddress("12345");

        assertEquals(m1, getCachedMarkets("12345"));
    }

    @Test
    void givenMarketThatShouldNotBeCached_whenFindByPlz_thenResultShouldNotBePutInCache() {
        marketRepository.getMarketsByAddress("54321");

        assertEquals(Optional.empty(), getCachedMarkets("54321"));
    }
}
