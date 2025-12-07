package decidish.com.core;

import decidish.com.core.TestcontainersConfiguration;
import decidish.com.core.model.rewe.*;
import decidish.com.core.service.MarketService;
import jakarta.transaction.Transactional;
import decidish.com.core.repository.MarketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles; // If you use application-test.properties

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test") // Use manual settings
// 1. Use Real Containers (Postgres + Redis)
// @Import(TestcontainersConfiguration.class)
// @AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Tag("integration") // Useful to skip this test in CI builds
@Transactional
class MarketServiceLiveTest {

    @Autowired
    private MarketService marketService;

    @Autowired
    private MarketRepository marketRepository;

    // A real, valid REWE Market ID (e.g., REWE City Munich)
    // You can find this ID in the URL on the rewe website
    private final Long VALID_MARKET_ID = 431022L; 

    @BeforeEach
    void setup() {
        // Clear DB to ensure we are actually persisting fresh data
        marketRepository.deleteAll();
    }

    @Test
    @DisplayName("LIVE API: Fetch Products -> Persist to Postgres -> Verify Update")
    void testGetAllProducts_Live() {
        // --- STEP 1: PRE-CONDITION ---
        // The Service requires the Market to exist in DB before adding products
        Market initialMarket = new Market(VALID_MARKET_ID,"REWE Test Market",new Address());
        // Market.builder()
        //         .id(VALID_MARKET_ID) // Manual ID
        //         .reweId(String.valueOf(VALID_MARKET_ID))
        //         .name("REWE Test Market")
        //         .build();
        
        marketRepository.save(initialMarket);
        System.out.println("Market " + VALID_MARKET_ID + " seeded in DB.");

        // --- STEP 2: EXECUTE LIVE FETCH ---
        System.out.println("Calling Real REWE API (This may take a few seconds)...");
        Market updatedMarket = marketService.getAllProducts(VALID_MARKET_ID);

        // --- STEP 3: VERIFY PERSISTENCE ---
        assertNotNull(updatedMarket);
        List<Product> products = updatedMarket.getProducts();
        
        System.out.println("Found " + products.size() + " products.");
        
        // Basic Sanity Checks
        assertFalse(products.isEmpty(), "Real API should return products (unless searching for '*') returns nothing on Web API");
        
        Product firstProduct = products.get(0);
        System.out.println("   Sample: " + firstProduct.getName() + " - " + firstProduct.getPrice() + "cents");
        
        assertNotNull(firstProduct.getId(), "Product must have an external ID");
        assertNotNull(firstProduct.getName(), "Product must have a name");

        // --- STEP 4: VERIFY IDEMPOTENCY (Update Logic) ---
        System.out.println("Running 2nd Fetch (Should update, not duplicate)...");
        
        // Call it again
        Market reUpdatedMarket = marketService.getAllProducts(VALID_MARKET_ID);
        
        // Assertions
        assertEquals(products.size(), reUpdatedMarket.getProducts().size(), 
            "Product count should remain stable (no duplicates created)");
            
        // Verify DB Row Count
        long dbProductCount = marketRepository.findById(VALID_MARKET_ID).get().getProducts().size();
        assertEquals(products.size(), dbProductCount, "Database rows match in-memory list");
    }
}
