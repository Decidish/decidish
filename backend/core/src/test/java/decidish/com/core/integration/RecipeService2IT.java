package decidish.com.core.integration;

import decidish.com.core.TestcontainersConfiguration; // Import Testcontainers config
import decidish.com.core.model.recipes.*;
import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
// FIX: Use 'e2e' profile because H2 cannot run SIMILARITY() or DISTINCT ON
@ActiveProfiles("e2e") 
// @Import(TestcontainersConfiguration.class) 
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Use Docker, don't replace with H2
@Tag("integration")
@Transactional
class RecipeService2IT {

    @Autowired
    private RecipeService recipeService;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private EntityManager entityManager;

    @MockitoBean
    private MarketService marketService;

    private final Long MARKET_ID = 431022L;

    @BeforeEach
    void setupDatabase() {
        // CRITICAL: The 'similarity()' function requires the pg_trgm extension.
        // Usually Flyway handles this, but we ensure it exists here just in case.
        // We execute this natively to avoid Hibernate checks.
        entityManager.createNativeQuery("CREATE EXTENSION IF NOT EXISTS pg_trgm").executeUpdate();
    }

    @Test
    @DisplayName("INTEGRATION: Fuzzy matching pre-processing for all ingredients")
    void testFuzzyMatchingPreProcessing_Integration() {
        // Set up some ingredients in the DB
        List<Ingredient> testIngredients = List.of(
                new Ingredient("Tomato"),
                new Ingredient("Cucumber"),
                new Ingredient("Lettuce"));
        testIngredients = testIngredients.stream()
                .map(entityManager::merge)
                .toList();

        entityManager.flush();
        entityManager.clear();

        // Set up a market
        Market market = new Market(MARKET_ID, "Test Market", new Address());
        marketRepository.save(market);

        // Set up products
        ProductAttributesDto attrs = new ProductAttributesDto(false, false, false, false, false, false, false, false, false, false, false, false);

        List<Product> testProducts = List.of(
                new Product(1000L, "Tomato Soup", 100, "url", "1L", attrs),
                new Product(1001L, "Fresh Tomato", 100, "url", "1kg", attrs),
                new Product(1002L, "Cucumber Slices", 150, "url", "500g", attrs),
                new Product(1003L, "Lettuce Head", 200, "url", "1pc", attrs),
                new Product(1004L, "Potato Chips", 250, "url", "200g", attrs),
                new Product(1005L, "Carrot Sticks", 180, "url", "300g", attrs));

        // Assign market to products and persist
        for (Product p : testProducts) {
            p.setMarket(market);
            entityManager.merge(p);
        }

        entityManager.flush();
        entityManager.clear();

        // --- STEP 2: EXECUTE SERVICE ---
        List<IngredientProduct> generatedMappings = recipeService.fuzzyMatchingPreProcessing();

        // --- STEP 3: ASSERT ---
        assertNotNull(generatedMappings);
        
        System.out.println("Generated " + generatedMappings.size() + " Ingredient-Product Mappings:");
        for (IngredientProduct ip : generatedMappings) {
            System.out.println("Ingredient: " + ip.getIngredient().getName() +
                    " -> Product: "
                    + marketRepository.findProductNameByReweId(ip.getId().getProductId()) +
                    " (Confidence: " + ip.getConfidence() + ")");
        }

        // Basic checks
        for (IngredientProduct ip : generatedMappings) {
            assertNotNull(ip.getIngredient(), "Ingredient should not be null");
            assertTrue(ip.getConfidence() > 0.0f, "Confidence should be greater than 0");
        }

        // Check Logic: Lettuce -> Lettuce Head (High Confidence)
        long highConfidenceCount = generatedMappings.stream()
                .filter(ip -> ip.getConfidence() >= 0.3f) // Adjusted threshold slightly for pg_trgm specifics
                .count();
                
        // Note: pg_trgm similarity scores can vary. Ensure assertions are robust.
        assertTrue(highConfidenceCount >= 1, "Expected at least 1 match with decent confidence");
        
        boolean foundLettuceMatch = generatedMappings.stream()
            .anyMatch(ip -> ip.getIngredient().getName().equals("Lettuce") 
                         && marketRepository.findProductNameByReweId(ip.getId().getProductId()).contains("Lettuce Head"));
                         
        assertTrue(foundLettuceMatch, "Should have mapped Lettuce to Lettuce Head");
    }
}