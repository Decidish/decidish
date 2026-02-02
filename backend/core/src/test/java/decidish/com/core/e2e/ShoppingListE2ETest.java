package decidish.com.core.e2e;

import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.*;
import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;
import decidish.com.core.model.recipes.*;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.ArrayList;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;

@SpringBootTest
@ActiveProfiles("test") 
@Tag("e2e")
@Transactional
public class ShoppingListE2ETest {

    @Autowired
    private RecipeService recipeService;
    @Autowired
    private MarketRepository marketRepository;
    @Autowired
    private RecipeIngredientRepository recipeIngredientRepository;
    @Autowired
    private EntityManager entityManager;

    // Mock MarketService to avoid real API calls during setup
    @MockitoBean
    private MarketService marketService;

    // Spy on IngredientProductRepository to stub PostgreSQL-specific methods
    @MockitoSpyBean
    private IngredientProductRepository ingredientProductRepository;

    private final Long MARKET_ID = 431022L;
    private List<Integer> recipeIds;

    /**
     * Fake Postgres 'similarity()' function
     */
    public static double similarityStub(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        String lower1 = s1.toLowerCase();
        String lower2 = s2.toLowerCase();
        // If one contains the other, return High Confidence
        if (lower2.contains(lower1) || lower1.contains(lower2)) {
            return 1.0;
        }
        return 0.0;
    }

    @BeforeEach
    void setUp() {
        // 1. Stub PostgreSQL-specific methods that H2 doesn't support
        doNothing().when(ingredientProductRepository).refreshUniqueProductsView();

        // 2. Inject Fake Similarity Function into H2
        entityManager.createNativeQuery(
            "CREATE ALIAS IF NOT EXISTS similarity FOR \"decidish.com.core.e2e.ShoppingListE2ETest.similarityStub\""
        ).executeUpdate();

        // 3. Setup Market
        Market market = new Market(MARKET_ID, "Test Market", new Address());
        marketRepository.save(market);

        // 4. Seed Fake Products (Since we are not calling real API)
        // We need products that match the ingredients in the recipes below
        seedFakeProducts(market);

        // 5. Load Recipes & Ingredients
        recipeIds = loadRecipeIngredients();

        // 6. Seed ingredient-product mappings manually (instead of calling fuzzyMatchingPreProcessing)
        // This bypasses the PostgreSQL-specific findGenericMatches query
        seedIngredientProductMappings();

        entityManager.flush();
        entityManager.clear();
    }

    /**
     * Manually seed IngredientProduct mappings since we can't run the PostgreSQL-specific
     * fuzzy matching query on H2
     */
    private void seedIngredientProductMappings() {
        // Get all ingredients we created
        List<Ingredient> allIngredients = entityManager
            .createQuery("SELECT i FROM Ingredient i", Ingredient.class)
            .getResultList();

        List<IngredientProduct> mappings = new ArrayList<>();
        
        for (Ingredient ing : allIngredients) {
            String name = ing.getName().toLowerCase();
            
            // Match ingredients to products based on name containment (simulating fuzzy match)
            if (name.contains("rucola")) {
                mappings.add(createMapping(ing, 100L, 0.95f)); // Frischer Rucolasalat
            }
            if (name.contains("salz")) {
                mappings.add(createMapping(ing, 200L, 0.95f)); // Jod Salz
                mappings.add(createMapping(ing, 201L, 0.90f)); // Salz aus den Alpen
            }
            if (name.contains("butter")) {
                mappings.add(createMapping(ing, 300L, 0.95f)); // Deutsche Marken Butter
            }
            if (name.contains("milch")) {
                mappings.add(createMapping(ing, 400L, 0.95f)); // Frische Milch
            }
            if (name.contains("kartoffel")) {
                mappings.add(createMapping(ing, 500L, 0.95f)); // Bio Kartoffeln
            }
        }

        ingredientProductRepository.saveAll(mappings);
    }

    private IngredientProduct createMapping(Ingredient ingredient, Long productReweId, float confidence) {
        IngredientProductId id = new IngredientProductId(ingredient.getId(), productReweId);
        IngredientProduct ip = new IngredientProduct();
        ip.setId(id);
        ip.setIngredient(ingredient);
        ip.setConfidence(confidence);
        return ip;
    }

    @Test
    @DisplayName("Generate shopping list with descending confidence")
    void testGenerateShoppingList_Clean() {
        long startTime = System.currentTimeMillis();

        ShoppingListResponse shoppingList = recipeService.generateShoppingList(
                MARKET_ID,
                recipeIds);

        long duration = System.currentTimeMillis() - startTime;
        System.out.println("Generation took: " + duration + "ms");

        // -- ASSERTIONS --
        assertNotNull(shoppingList);
        assertFalse(shoppingList.items().isEmpty(), "Shopping list should not be empty");

        // Verify "Salz" logic (We seeded multiple Salz products below)
        shoppingList.items().stream()
                .filter(group -> group.ingredientName().equalsIgnoreCase("Salz"))
                .findFirst()
                .ifPresentOrElse(group -> {
                    // Check if we have options
                    assertFalse(group.options().isEmpty(), "Salz should have product options");
                    
                    if (group.options().size() > 1) {
                         float firstConf = group.options().get(0).confidence();
                         float secondConf = group.options().get(1).confidence();
                         // Note: In our simple stub, confidence might be equal (1.0) if both contain "Salz"
                         assertTrue(firstConf >= secondConf, "Options should be sorted by confidence");
                    }
                }, () -> fail("Ingredient 'Salz' was expected in the list but not found"));

        // Print for verification
        System.out.println("Generated " + shoppingList.items().size() + " ingredient groups.");
        
        // Simple check that at least one match occurred
        boolean matchFound = shoppingList.items().stream()
                .anyMatch(i -> !i.options().isEmpty());
        assertTrue(matchFound, "Should have found products for at least some ingredients");
    }

    private void seedFakeProducts(Market market) {
        ProductAttributesDto attrs = new ProductAttributesDto(false, false, false, false, false, false, false, false, false, false, false, false);

        List<Product> products = List.of(
            // Matches for Rucolasalat
            new Product(100L, "Frischer Rucolasalat", 199, "url", "100g", attrs),
            // Matches for Salz 
            new Product(200L, "Jod Salz", 99, "url", "500g", attrs),
            new Product(201L, "Salz aus den Alpen", 299, "url", "200g", attrs),
            // Matches for Butter
            new Product(300L, "Deutsche Marken Butter", 259, "url", "250g", attrs),
            // Matches for Milch
            new Product(400L, "Frische Milch 3.5%", 129, "url", "1L", attrs),
            // Matches for Kartoffeln
            new Product(500L, "Bio Kartoffeln festkochend", 399, "url", "1.5kg", attrs)
        );

        for (Product p : products) {
            p.setMarket(market);
            entityManager.persist(p);
        }
        entityManager.flush();
        entityManager.clear();
    }

    // Auxiliary method to load recipe ingredients
    @Transactional
    public List<Integer> loadRecipeIngredients() {
        Recipe recipe1 = entityManager.merge(new Recipe("Rucolasalat mit Feigen und Pekannüssen"));

        List<Ingredient> ingredients1 = List.of(
                new Ingredient("Rucolasalat"),
                new Ingredient("Salz"),
                new Ingredient("ja! Butter")); // Simplified for brevity, logic remains same

        ingredients1 = ingredients1.stream().map(entityManager::merge).toList();
        
        // Link to Recipe
        createRi(recipe1, ingredients1.get(0), 250.0, "g");
        createRi(recipe1, ingredients1.get(1), null, null); // Salz
        createRi(recipe1, ingredients1.get(2), 30.0, "g");  // Butter


        Recipe recipe3 = entityManager.merge(new Recipe("Kartoffelgratin"));
        List<Ingredient> ingredients3 = List.of(
                new Ingredient("Milch"),
                new Ingredient("Kartoffeln"));
        
        ingredients3 = ingredients3.stream().map(entityManager::merge).toList();
        
        createRi(recipe3, ingredients3.get(0), 450.0, "ml");
        createRi(recipe3, ingredients3.get(1), 1000.0, "g");

        return List.of(recipe1.getId(), recipe3.getId());
    }

    private void createRi(Recipe r, Ingredient i, Double amount, String unit) {
        RecipeIngredient ri = new RecipeIngredient(r, i, 
            amount != null ? BigDecimal.valueOf(amount) : null, 
            unit);
        recipeIngredientRepository.save(ri);
    }
}