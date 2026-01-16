package decidish.com.core.integration;

import decidish.com.core.model.rewe.Address;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("integration")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class ProductRepositoryIT {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private MarketRepository marketRepository;

    @Test
    @DisplayName("Should find product by Market ID and Rewe ID")
    void testFindByMarketIdAndReweId() {
        // Arrange
        Market market = new Market(300L, "Product Market", new Address());
        marketRepository.save(market);

        Product product = new Product();
        // product.setId(1L); // <--- REMOVED: Do not set ID manually for Identity columns
        product.setReweId(999L);
        product.setName("Milk");
        product.setMarket(market);
        
        productRepository.save(product);

        // Act
        Optional<Product> found = productRepository.findByMarketIdAndReweId(300L, 999L);

        // Assert
        assertTrue(found.isPresent());
        assertEquals("Milk", found.get().getName());
    }

    @Test
    @DisplayName("Should delete products by Market ID")
    void testDeleteByMarketId() {
        // Arrange
        Market market = new Market(400L, "Delete Market", new Address());
        marketRepository.save(market);

        Product product = new Product();
        // product.setId(2L); // <--- REMOVED
        product.setReweId(888L);
        product.setName("Bread");
        product.setMarket(market);
        
        productRepository.save(product);

        assertEquals(1, productRepository.count());

        // Act
        productRepository.deleteByMarketId(400L);

        // Assert
        assertEquals(0, productRepository.count());
    }
}