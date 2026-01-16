package decidish.com.core.integration;

import decidish.com.core.model.rewe.Address;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.repository.MarketRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("integration")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class MarketRepositoryIT {

    @Autowired
    private MarketRepository marketRepository;

    @Test
    @DisplayName("getMarketsByAddress: Should return markets for given PLZ")
    void testGetMarketsByAddress() {
        // Arrange
        String plz = "12345";
        Address address = new Address();
        address.setZipCode(plz);
        Market market = new Market(100L, "Test Market", address);
        marketRepository.save(market);

        // Act
        Optional<List<Market>> markets = marketRepository.getMarketsByAddress(plz);

        // Assert
        assertTrue(markets.isPresent());
        assertFalse(markets.get().isEmpty());
        assertEquals(plz, markets.get().get(0).getAddress().getZipCode());
    }

    @Test
    @DisplayName("findByIdWithProducts: Should fetch market with products eagerly")
    void testFindByIdWithProducts() {
        // Arrange
        Market market = new Market(200L, "Eager Market", new Address());
        marketRepository.save(market);

        // Act
        Optional<Market> found = marketRepository.findByIdWithProducts(200L);

        // Assert
        assertTrue(found.isPresent());
        assertEquals("Eager Market", found.get().getName());
        // Verify products collection is initialized (though empty here)
        assertNotNull(found.get().getProducts());
    }
}
