package decidish.com.core.integration;

import decidish.com.core.model.recipes.Ingredient;
import decidish.com.core.model.recipes.IngredientProduct;
import decidish.com.core.model.rewe.Address;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.ProductAttributesDto;
import decidish.com.core.service.MarketService;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.service.RecipeService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean; // Spring Boot 3.4+
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test") 
@Transactional
public class RecipeService2IT {

    @Autowired
    private RecipeService recipeService;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private EntityManager entityManager;

    // Don't trigger real API calls during this test
    @MockitoBean 
    private MarketService marketService;

    private final Long MARKET_ID = 431022L;

    /**
     * This method acts as a FAKE replacement for the Postgres 'similarity()' function.
     * H2 will call this Java method whenever the SQL query invokes 'similarity(a, b)'.
     */
    public static double similarityStub(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        String lower1 = s1.toLowerCase();
        String lower2 = s2.toLowerCase();
        
        // Simple logic for testing: 
        // If one contains the other, return High Confidence (1.0).
        if (lower2.contains(lower1) || lower1.contains(lower2)) {
            return 1.0;
        }
        return 0.0;
    }

    @BeforeEach
    void setupDatabase() {
        // 3. IMPORTANT: Register the Java method above as a SQL function in H2.
        // This prevents the "Function 'similarity' not found" error.
        entityManager.createNativeQuery(
            "CREATE ALIAS IF NOT EXISTS similarity FOR \"decidish.com.core.integration.RecipeService2IT.similarityStub\""
        ).executeUpdate();

        // No need to install pg_trgm extension, as we just faked the function it provides.
    }

    @Test
    @DisplayName("Fuzzy matching pre-processing (Simulated)")
    void testFuzzyMatchingPreProcessing_H2() {
        // Step 1: Setup data
        
        // Create Ingredients
        List<Ingredient> testIngredients = List.of(
                new Ingredient("Tomato"),
                new Ingredient("Lettuce")); // We focus on Lettuce for the assertion
        
        testIngredients.forEach(entityManager::persist);
        
        // Create Market
        Market market = new Market(MARKET_ID, "Test Market", new Address());
        marketRepository.save(market);

        // Create Products
        ProductAttributesDto attrs = new ProductAttributesDto(false, false, false, false, false, false, false, false, false, false, false, false);

        List<Product> testProducts = List.of(
                new Product(1003L, "Lettuce Head", 200, "url", "1pc", attrs), // Should match Lettuce
                new Product(1004L, "Potato Chips", 250, "url", "200g", attrs) // Should NOT match
        );

        for (Product p : testProducts) {
            p.setMarket(market);
            entityManager.persist(p);
        }

        // Flush to ensure data is in H2 before the service queries it
        entityManager.flush(); 

        // Step 2: Execute the fuzzy matching pre-processing
        
        // This runs the logic that calls the repository native query
        List<IngredientProduct> generatedMappings = recipeService.fuzzyMatchingPreProcessing();

        // Step 3: Verify the results
        assertNotNull(generatedMappings);
        
        System.out.println(">>> Generated " + generatedMappings.size() + " mappings.");

        // We expect "Lettuce" to match "Lettuce Head" because our Stub returns 1.0 when string contains the other
        boolean foundLettuceMatch = generatedMappings.stream()
            .anyMatch(ip -> ip.getIngredient().getName().equals("Lettuce") 
                         && marketRepository.findProductNameByReweId(ip.getId().getProductId()).contains("Lettuce Head"));
                         
        assertTrue(foundLettuceMatch, "Should have mapped Lettuce to Lettuce Head using the H2 alias");
        
        // Verify confidence (our stub returns 1.0)
        if (!generatedMappings.isEmpty()) {
            assertTrue(generatedMappings.get(0).getConfidence() > 0.0f);
        }
    }
}