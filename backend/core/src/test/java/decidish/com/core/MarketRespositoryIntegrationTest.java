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
        marketRepository.save(new Market(1L,"m1",address1));
        marketRepository.save(new Market(2L,"m2",address2));

        Address address = new Address();
        address.setZipCode("11111");
        Market market = new Market(3L, "m3", address);
        Product product1 = new Product(100L, "Product1", 100, "url1", "500g");
        Product product2 = new Product(101L, "Product2", 200, "url2", "1kg");
        market.addProduct(product1);
        market.addProduct(product2);
        marketRepository.save(market);
    }
    
    private Optional<Market> getCachedMarket(Long reweId){
        return Optional.ofNullable(cacheManager.getCache("markets_id")).map(c -> c.get(reweId,Market.class));
    }

    private Optional<List<Market>> getCachedMarkets(String plz){
        return Optional.ofNullable(cacheManager.getCache("markets")).map(c -> c.get(plz,List.class));
    }

    @Test
    void givenMarketThatShouldBeCached_whenFindByReweId_thenResultShouldBePutInCache() {
        // Optional<Market> m1 = marketService.findByReweId("1");
        Optional<Market> m1 = marketRepository.findByReweId(1L);

        assertEquals(m1, getCachedMarket(1L));
    }

    @Test
    void givenMarketThatShouldNotBeCached_whenFindByReweId_thenResultShouldNotBePutInCache() {
        marketRepository.findByReweId(2L);

        assertEquals(Optional.empty(), getCachedMarket(2L));
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

    // NON-CACHED TESTS BELOW

    // Test query getMarketsByAddress
    @Test
    void whenGetMarketsByAddress_thenReturnCorrectMarkets() {
        Optional<List<Market>> marketsOpt = marketRepository.getMarketsByAddress("12345");
        assertEquals(true, marketsOpt.isPresent());
        List<Market> markets = marketsOpt.get();
        assertEquals(1, markets.size());
        assertEquals(1L, markets.get(0).getReweId());
    }

    // Test query findByReweId
    @Test
    void whenFindByReweId_thenReturnCorrectMarket() {
        Optional<Market> marketOpt = marketRepository.findByReweId(2L);
        assertEquals(true, marketOpt.isPresent());
        Market market = marketOpt.get();
        assertEquals("m2", market.getName());
    }

    // Test query findByIdWithProducts
    @Test
    void whenFindByIdWithProducts_thenReturnMarketWithProducts() {
        Optional<Market> marketOpt = marketRepository.findByIdWithProducts(3L);
        assertEquals(true, marketOpt.isPresent());
        Market fetchedMarket = marketOpt.get();
        assertEquals(2, fetchedMarket.getProducts().size());
    }
}
