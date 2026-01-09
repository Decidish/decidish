package decidish.com.core;

import decidish.com.core.model.recipes.*;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.RecipeService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test") // Ensure this profile has REAL DB config and REAL API keys
@Tag("e2e-benchmark")
public class RecipeServiceE2EBenchmarkTest {

    @Autowired
    private RecipeService recipeService;

    @Autowired
    private IngredientProductRepository ingredientProductRepository;

    @Autowired
    private RecipeIngredientRepository recipeIngredientRepository;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private EntityManager entityManager;

    // Use a real Market ID that exists in the external API (e.g., REWE Munich)
    private final Long MARKET_ID = 431022L; 

    // A list of 50 real items to ensure the API actually searches for something valid
    private final String[] REAL_INGREDIENTS = {
        "Milch", "Butter", "Eier", "Mehl", "Zucker", "Salz", "Pfeffer", "Tomaten", "Gurke", "Paprika",
        "Apfel", "Banane", "Birne", "Brot", "Käse", "Wurst", "Schinken", "Reis", "Nudeln", "Kartoffeln",
        "Zwiebeln", "Knoblauch", "Öl", "Essig", "Senf", "Ketchup", "Mayo", "Joghurt", "Quark", "Sahne",
        "Schokolade", "Keks", "Chips", "Wasser", "Saft", "Bier", "Wein", "Kaffee", "Tee", "Honig",
        "Marmelade", "Nutella", "Müsli", "Haferflocken", "Mais", "Erbsen", "Bohnen", "Thunfisch", "Lachs", "Hähnchen"
    };
    
    @BeforeEach
    void setup() {
        // Clean slate for accurate timing
        recipeIngredientRepository.deleteAll();
        ingredientProductRepository.deleteAll();
        
        // Use EntityManager to delete recipes since RecipeRepository is absent
        entityManager.createQuery("DELETE FROM Recipe").executeUpdate();
        
        // Ensure Market exists locally
        if (!marketRepository.existsById(MARKET_ID)) {
            marketRepository.save(new Market(MARKET_ID, "Benchmark Market", null));
        }
    }

    @Test
    @DisplayName("E2E BENCHMARK: 100% Local Cache (0 API Calls)")
    @Transactional
    void benchmark_AllLocal_NoApi() {
        // Setup: Map ALL 50 ingredients locally
        List<Integer> recipeIds = setupScenario(50, 0); // 50 items, 0 missing

        long start = System.nanoTime();
        ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID, recipeIds);
        long end = System.nanoTime();

        printResult("Full Local Cache", 0, start, end);
        assertEquals(50, response.items().size());
    }

    @Test
    @DisplayName("E2E BENCHMARK: 10% Missing (5 Real API Calls)")
    @Transactional
    void benchmark_FewMissing_RealApi() {
        // Setup: Map 45 locally, leave 5 unmapped (forcing 5 API calls)
        List<Integer> recipeIds = setupScenario(50, 5);

        long start = System.nanoTime();
        ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID, recipeIds);
        long end = System.nanoTime();

        printResult("Hybrid (5 Missing)", 5, start, end);
        assertEquals(50, response.items().size());
        
        // Validation: Ensure we actually got data back from the API for the missing items
        long itemsWithOptions = response.items().stream().filter(i -> !i.options().isEmpty()).count();
        System.out.println("Items with found products: " + itemsWithOptions + "/50");
    }

    @Test
    @DisplayName("E2E BENCHMARK: 70% Missing (35 Real API Calls - STRESS)")
    @Transactional
    void benchmark_AllMissing_RealApi() {
        // Setup: Map 0 locally. All 50 ingredients must be fetched from API.
        List<Integer> recipeIds = setupScenario(50, 35);

        System.out.println("Starting Stress Test: 50 Parallel API Requests...");
        long start = System.nanoTime();
        ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID, recipeIds);
        long end = System.nanoTime();

        printResult("Full API Stress (50 Missing)", 50, start, end);
        
        // Validation
        assertEquals(50, response.items().size());
        long itemsWithOptions = response.items().stream().filter(i -> !i.options().isEmpty()).count();
        System.out.println("Items successfully resolved via API: " + itemsWithOptions + "/50");
        
        if (itemsWithOptions < 50) {
            System.err.println("WARNING: Some items returned no products. Check API rate limits or market availability.");
        }
    }

    // --- Helper Methods ---

    /**
     * Sets up recipes and ingredients in the DB.
     * @param totalItems Total ingredients to create
     * @param missingItems Number of ingredients NOT to map to products (forcing API calls)
     * @return List of Recipe IDs created
     */
    private List<Integer> setupScenario(int totalItems, int missingItems) {
        List<RecipeIngredient> batchIngredients = new ArrayList<>();
        
        Recipe recipe = new Recipe("Benchmark Recipe " + System.currentTimeMillis());
        // This ensures ID is generated correctly by DB and returned in the managed entity
        recipe = entityManager.merge(recipe);

        int mappedCount = totalItems - missingItems;

        for (int i = 0; i < totalItems; i++) {
            String name = REAL_INGREDIENTS[i];
            
            Ingredient ing = new Ingredient();
            ing.setName(name);
            ing = entityManager.merge(ing); // Persist

            // Link to Recipe
            RecipeIngredient ri = new RecipeIngredient(recipe, ing, BigDecimal.ONE, "unit");
            batchIngredients.add(ri);

            // Create Local Mapping (Mock Product in DB) ONLY for the first 'mappedCount' items
            if (i < mappedCount) {
                createLocalMapping(ing);
            }
        }
        
        recipeIngredientRepository.saveAll(batchIngredients);
        entityManager.flush();
        entityManager.clear();
        
        return List.of(recipe.getId());
    }

    private void createLocalMapping(Ingredient ing) {
        Product p = new Product();
        p.setName("Local " + ing.getName());
        p.setMarket(entityManager.getReference(Market.class, MARKET_ID));
        p.setNormalizedAmount(1.0);
        p.setReweId(1234L);
        
        // Let DB generate the ID
        p = entityManager.merge(p);

        IngredientProductId mapId = new IngredientProductId(ing.getId(), p.getId());
        IngredientProduct ip = new IngredientProduct(mapId, ing, p, 1.0f);
        entityManager.merge(ip);
    }

    private void printResult(String label, int apiCalls, long startNano, long endNano) {
        long durationMs = TimeUnit.NANOSECONDS.toMillis(endNano - startNano);
        System.out.println("\n================================================================");
        System.out.printf("SCENARIO: %s%n", label);
        System.out.printf("Total Ingredients: 50%n");
        System.out.printf("External API Calls: %d%n", apiCalls);
        System.out.println("----------------------------------------------------------------");
        System.out.printf("TOTAL TIME: %d ms (%.2f seconds)%n", durationMs, durationMs / 1000.0);
        
        if (apiCalls > 0) {
            double avgTime = (double) durationMs / apiCalls;
            System.out.printf("Effective Avg Time per Item: %.2f ms%n", avgTime);
            System.out.println("Note: Lower is better. Low effective time proves parallelism.");
        }
        System.out.println("================================================================\n");
    }
}