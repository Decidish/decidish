package decidish.com.core.integration;

import decidish.com.core.model.recipes.Ingredient;
import decidish.com.core.model.recipes.IngredientMatchProjection;
import decidish.com.core.model.recipes.IngredientProduct;
import decidish.com.core.model.rewe.Address;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.ProductAttributesDto;
import decidish.com.core.service.MarketService;
import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.service.RecipeService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;

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

    // Spy on IngredientProductRepository to stub Postgres-specific methods
    @MockitoSpyBean
    private IngredientProductRepository ingredientProductRepository;

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
        // Stub Postgres-specific method that H2 doesn't support
        doNothing().when(ingredientProductRepository).refreshUniqueProductsView();

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
        Ingredient tomato = new Ingredient("Tomato");
        Ingredient lettuce = new Ingredient("Lettuce");
        entityManager.persist(tomato);
        entityManager.persist(lettuce);
        
        // Create Market
        Market market = new Market(MARKET_ID, "Test Market", new Address());
        marketRepository.save(market);

        // Create Products
        ProductAttributesDto attrs = new ProductAttributesDto(false, false, false, false, false, false, false, false, false, false, false, false);

        Product lettuceProduct = new Product(1003L, "Lettuce Head", 200, "url", "1pc", attrs);
        Product potatoProduct = new Product(1004L, "Potato Chips", 250, "url", "200g", attrs);
        
        lettuceProduct.setMarket(market);
        potatoProduct.setMarket(market);
        entityManager.persist(lettuceProduct);
        entityManager.persist(potatoProduct);

        // Flush to ensure data is in H2 before the service queries it
        entityManager.flush(); 

        // Step 2: Mock the PostgreSQL-specific findGenericMatches method
        // This native query uses PostgreSQL features (ts_rank, plainto_tsquery, word_match_score, etc.)
        // that H2 doesn't support, so we simulate the expected result
        IngredientMatchProjection lettuceMatch = mock(IngredientMatchProjection.class);
        doReturn(lettuce.getId()).when(lettuceMatch).getIngredientId();
        doReturn(1003L).when(lettuceMatch).getProductId();
        doReturn(0.95f).when(lettuceMatch).getConfidence();

        doReturn(List.of(lettuceMatch)).when(ingredientProductRepository)
            .findGenericMatches(anyList(), anyDouble(), anyInt());

        // Step 3: Execute the fuzzy matching pre-processing
        List<IngredientProduct> generatedMappings = recipeService.fuzzyMatchingPreProcessing();

        // Step 4: Verify the results
        assertNotNull(generatedMappings);
        
        System.out.println(">>> Generated " + generatedMappings.size() + " mappings.");

        // We expect "Lettuce" to match "Lettuce Head" based on our mocked projection
        assertEquals(1, generatedMappings.size(), "Should have generated 1 mapping");
        
        IngredientProduct mapping = generatedMappings.get(0);
        assertEquals(lettuce.getId(), mapping.getIngredient().getId(), "Should have mapped to Lettuce ingredient");
        assertEquals(1003L, mapping.getId().getProductId(), "Should have mapped to Lettuce Head product");
        assertTrue(mapping.getConfidence() > 0.0f, "Confidence should be greater than 0");
    }
}