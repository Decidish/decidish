package decidish.com.core;

import decidish.com.core.model.rewe.*;
import decidish.com.core.service.MarketService;
import jakarta.transaction.Transactional;
import decidish.com.core.repository.MarketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles; // If you use application-test.properties

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test") // Use manual settings
// Use Real Containers (Postgres + Redis)
// @Import(TestcontainersConfiguration.class)
// @AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Tag("integration") // Useful to skip this test in CI builds
@Transactional
class MarketServiceIntegrationTest {
    @Autowired
    private MarketService marketService;

    @Autowired
    private MarketRepository marketRepository;

    // A real, valid REWE Market ID (e.g., REWE City Munich)
    // You can find this ID in the URL on the rewe website
    private final Long VALID_MARKET_ID = 431022L; 
    private final String PLZ = "80809";

    @BeforeEach
    void setup() {
        // Clear DB to ensure we are actually persisting fresh data
        marketRepository.deleteAll();
        marketService.setSelf(marketService); 
    }

    @Test
    @DisplayName("LIVE API: Fetch Markets -> Persist to Postgres -> Verify Update")
    //! If this fails is probably because you forgot to change the @Cacheable in MarketRepository (use the non-testing ones)
    void testSearchMarkets_Live() {
        // --- STEP 1: EXECUTE LIVE FETCH ---
        System.out.println("Calling Real REWE API (This may take a few seconds)...");
        List<Market> markets = marketService.getMarkets(PLZ);

        // --- STEP 2: VERIFY PERSISTENCE ---
        assertNotNull(markets);
        System.out.println("Found " + markets.size() + " products.");
        
        // Basic Sanity Checks
        assertFalse(markets.isEmpty(), "Real API should return products (unless searching for '*') returns nothing on Web API");
        
        Market firstMarket = markets.get(0);
        System.out.println("   Sample: " + firstMarket.getName() + " - " + firstMarket.getAddress().getZipCode() + "cents");
        
        // assertEquals(firstMarket.getAddress().getZipCode(), PLZ);
        assertNotNull(firstMarket.getId(), "Product must have an external ID");
        assertNotNull(firstMarket.getName(), "Product must have a name");

        // --- STEP 4: VERIFY IDEMPOTENCY (Update Logic) ---
        System.out.println("Running 2nd Fetch (Should update, not duplicate)...");
        
        // Call it again
        List<Market> reUpdatedMarket = marketService.getMarkets(PLZ);
        
        // Assertions
        assertEquals(markets.size(), reUpdatedMarket.size(), 
            "Market count should remain stable (no duplicates created)");
            
        // Verify DB Row Count
        long dbMarketCount = marketRepository.findAll().size();
        assertEquals(markets.size(), dbMarketCount, "Database rows match in-memory list");
    }

    @Test
    @DisplayName("LIVE API: Fetch Products -> Persist to Postgres -> Verify Update")
    void testGetAllProducts_Live() {
        // --- STEP 1: PRE-CONDITION ---
        if (marketRepository.existsById(VALID_MARKET_ID)) {
            marketRepository.deleteById(VALID_MARKET_ID);
            marketRepository.flush(); // Force the SQL DELETE to run now
        }
        // 1. Check if the Market entity exists by its primary key (VALID_MARKET_ID)
        marketRepository.findById(VALID_MARKET_ID).ifPresent(existingMarket -> {
            System.out.println("Cleaning up old products by fetching and clearing the collection...");
            
            // 2. FORCING the Cascade Delete: 
            // We get the *managed* entity, clear its product list, save, and then delete.
            // This ensures Hibernate detects the collection changes and triggers orphanRemoval.
            
            // a. Clear the collection to mark children for deletion
            existingMarket.getProducts().clear(); 
            
            // b. Save the market with the empty collection to trigger orphan removal first
            marketRepository.save(existingMarket); 
            
            // c. Delete the Market entity itself
            marketRepository.delete(existingMarket);
        });

        marketRepository.flush();
        // The Service requires the Market to exist in DB before adding products
        Market initialMarket = new Market(VALID_MARKET_ID,"REWE Test Market",new Address());
        
        marketRepository.save(initialMarket);
        System.out.println("Market " + VALID_MARKET_ID + " seeded in DB.");

        // --- STEP 2: EXECUTE LIVE FETCH ---
        System.out.println("Calling Real REWE API (This may take a few seconds)...");
        Market updatedMarket = marketRepository.findByReweId(VALID_MARKET_ID).orElse(null);
        
        assertNotNull(updatedMarket, "Market should exist in DB before fetching products");
        List<ProductDto> products = marketService.getAllProductsAPI(updatedMarket);

        // --- STEP 3: VERIFY PERSISTENCE ---
        assertNotNull(products);
        // List<Product> products = updatedMarket.getProducts();
        
        System.out.println("Found " + products.size() + " products.");
        
        // Basic Sanity Checks
        assertFalse(products.isEmpty(), "Real API should return products (unless searching for '*') returns nothing on Web API");
        
        ProductDto firstProduct = products.get(0);
        System.out.println("   Sample: " + firstProduct.title() + " - " + firstProduct.listing().currentRetailPrice() + "cents");
        
        assertNotNull(firstProduct.productId(), "Product must have an external ID");
        assertNotNull(firstProduct.title(), "Product must have a name");

        // --- STEP 4: VERIFY IDEMPOTENCY (Update Logic) ---
        System.out.println("Running 2nd Fetch (Should update, not duplicate)...");

        Market reUpdatedMarket = marketRepository.findByReweId(VALID_MARKET_ID).orElse(null);

        assertNotNull(reUpdatedMarket, "Market should exist in DB before re-fetching products");
        
        // Call it again
        List<ProductDto> reUpdateProducts = marketService.getAllProductsAPI(reUpdatedMarket);
        
        // Assertions
        assertEquals(products.size(), reUpdateProducts.size(), 
            "Product count should remain stable (no duplicates created)");
            
        // Verify DB Row Count
        long dbProductCount = marketRepository.findById(VALID_MARKET_ID).get().getProducts().size();
        assertEquals(products.size(), dbProductCount, "Database rows match in-memory list");
    }

    @Test
    @DisplayName("LIVE API: Fetch Products with Query -> Persist to Postgres -> Verify Update")
    void testGetProductsWithQuery_Live() {
        // --- STEP 1: PRE-CONDITION ---

        // The Service requires the Market to exist in DB before adding products
        Market initialMarket = new Market(VALID_MARKET_ID,"REWE Test Market",new Address());
        marketRepository.save(initialMarket);
        System.out.println("Market " + VALID_MARKET_ID + " seeded in DB.");
        String query = "Apfel";
        
        // --- STEP 2: EXECUTE LIVE FETCH ---
        System.out.println("Calling Real REWE API (This may take a few seconds)...");
        List<ProductDto> products = marketService.getProductsQuery(VALID_MARKET_ID, query);  

        // --- STEP 3: VERIFY PERSISTENCE ---
        assertNotNull(products);

        // Check number of products is less or equal to 250 (default page size)
        assertTrue(products.size() <= 250, "Product count should be less or equal to 250 for query '" + query + "'");
        System.out.println("Found " + products.size() + " products for query '" + query + "'.");

        // Basic Sanity Checks
        assertFalse(products.isEmpty(), "Real API should return products for query '" + query + "'");
        ProductDto firstProduct = products.get(0);
        System.out.println("   Sample: " + firstProduct.title() + " - " + firstProduct.listing().currentRetailPrice()+ " cents");
        assertNotNull(firstProduct.productId(), "Product must have an external ID");
        assertNotNull(firstProduct.title(), "Product must have a name");


        // --- STEP 4: VERIFY IDEMPOTENCY (Update Logic) ---
        System.out.println("Running 2nd Fetch (Should update, not duplicate)...");

        // Call it again
        List<ProductDto> reUpdatedProduct = marketService.getProductsQuery(VALID_MARKET_ID, query);

        // Assertions
        assertEquals(products.size(), reUpdatedProduct.size(), 
            "Product count should remain stable (no duplicates created)");

        // Verify DB Row Count
        long dbProductCount = marketRepository.findById(VALID_MARKET_ID).get().getProducts().size();
        assertEquals(products.size(), dbProductCount, "Database rows match in-memory list");
    }
}
