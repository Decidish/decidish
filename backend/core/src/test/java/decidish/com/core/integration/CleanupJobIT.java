package decidish.com.core.integration;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Address;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketPickupData;
import decidish.com.core.model.rewe.MarketPickupDto;
import decidish.com.core.model.rewe.MarketPickupPortfolio;
import decidish.com.core.model.rewe.MarketPickupResponse;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.SearchTermMarket;
import decidish.com.core.model.rewe.SearchTermMarketId;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import decidish.com.core.repository.SearchTermMarketRepository;
import decidish.com.core.service.MarketService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import jakarta.transaction.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("integration")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class CleanupJobIT {

    @Autowired
    private MarketService marketService;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SearchTermMarketRepository searchTermMarketRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @MockitoBean
    private ReweApiClient apiClient;

    @Test
    @DisplayName("cleanupDeprecatedData: removes old products and closed markets, keeps active markets")
    void cleanupDeprecatedData_RemovesOldProductsAndClosedMarkets() {
        // Closed market + old product
        Address closedAddress = new Address();
        closedAddress.setZipCode("99999");
        Market closedMarket = new Market(900001L, "Closed Market", closedAddress);

        Product oldProduct = new Product();
        oldProduct.setReweId(111L);
        oldProduct.setName("Old Product");
        oldProduct.setPrice(199);
        oldProduct.setLastUpdated(LocalDateTime.now().minusWeeks(10));
        closedMarket.addProduct(oldProduct);

        marketRepository.save(closedMarket);

        SearchTermMarket closedLink = new SearchTermMarket(
                new SearchTermMarketId("99999", closedMarket.getId()),
                closedMarket,
                LocalDateTime.now());
        searchTermMarketRepository.save(closedLink);

        // Active market to keep
        Address activeAddress = new Address();
        activeAddress.setZipCode("88888");
        Market activeMarket = new Market(900002L, "Active Market", activeAddress);
        marketRepository.save(activeMarket);

        SearchTermMarket activeLink = new SearchTermMarket(
                new SearchTermMarketId("88888", activeMarket.getId()),
                activeMarket,
                LocalDateTime.now());
        searchTermMarketRepository.save(activeLink);

        MarketPickupResponse emptyResponse = new MarketPickupResponse(
                new MarketPickupData(new MarketPickupPortfolio(List.of())));
        when(apiClient.searchMarkets("99999")).thenReturn(emptyResponse);

        MarketPickupDto activeDto = new MarketPickupDto(activeMarket.getId(), "Active Market", "Active Market GmbH",
                false, "/map", 10.0, 10.0, "88888", "Street", "City", "PICKUP");
        MarketPickupResponse activeResponse = new MarketPickupResponse(
                new MarketPickupData(new MarketPickupPortfolio(List.of(activeDto))));
        when(apiClient.searchMarkets("88888")).thenReturn(activeResponse);

        System.out.println("Before cleanup:");
        System.out.println("  markets count = " + marketRepository.count());
        System.out.println("  search_term_market count = " + searchTermMarketRepository.count());
        System.out.println("  products count = " + productRepository.count());
        System.out.println("  closed associations = " + searchTermMarketRepository.findAllByIdSearchTerm("99999").size());
        System.out.println("  active associations = " + searchTermMarketRepository.findAllByIdSearchTerm("88888").size());

        // Act
        marketService.cleanupDeprecatedData();

        // Flush and clear persistence context to avoid returning cached entities
        entityManager.flush();
        entityManager.clear();

        System.out.println("After cleanup:");
        System.out.println("  markets count = " + marketRepository.count());
        System.out.println("  search_term_market count = " + searchTermMarketRepository.count());
        System.out.println("  products count = " + productRepository.count());
        System.out.println("  closed associations = " + searchTermMarketRepository.findAllByIdSearchTerm("99999").size());
        System.out.println("  active associations = " + searchTermMarketRepository.findAllByIdSearchTerm("88888").size());
        System.out.println("  closed market exists = " + marketRepository.findById(closedMarket.getId()).isPresent());

        // Assert: old product removed
        assertTrue(productRepository.findByMarketIdAndReweId(closedMarket.getId(), 111L).isEmpty());

        // Assert: closed market removed
        assertFalse(marketRepository.findById(closedMarket.getId()).isPresent());

        // Assert: active market remains
        assertTrue(marketRepository.findById(activeMarket.getId()).isPresent());
    }
}
