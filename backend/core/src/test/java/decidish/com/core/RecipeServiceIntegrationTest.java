package decidish.com.core;

import decidish.com.core.model.recipes.*;
import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.RecipeService;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.transaction.TestTransaction;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Tag("integration")
@Transactional 
class RecipeServiceIntegrationTest {

    @Autowired
    private RecipeService recipeService;

    @Autowired
    private RecipeIngredientRepository repository;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private EntityManager entityManager; // Used to persist setup data without creating 5 extra repositories

    private final Long MARKET_ID = 431022L;

    @Test
    @DisplayName("INTEGRATION: Generate shopping list from multi-recipe ingredient aggregation")
    void testGenerateShoppingList_Integration() {
        // --- STEP 1: SETUP TEST DATA (Directly in DB) ---
        
        // 1. Create Market
        Market market = new Market(MARKET_ID, "Test Market", new Address());
        marketRepository.save(market);

        // 2. Create Ingredients
        Ingredient onion = new Ingredient("Onion");
        Ingredient pasta = new Ingredient("Pasta");
        onion = entityManager.merge(onion);
        pasta = entityManager.merge(pasta);

        // 3. Create Recipes
        Recipe r1 = new Recipe("Onion Soup");
        Recipe r2 = new Recipe("Pasta Dish");
        r1 = entityManager.merge(r1);
        r2 = entityManager.merge(r2);

        Integer recipeId_1 = r1.getId();
        Integer recipeId_2 = r2.getId();

        // // --- FORCE COMMIT NOW ---
        // entityManager.flush(); 
        // TestTransaction.flagForCommit(); // Ensure the flag is set
        // TestTransaction.end();           // This actually closes the transaction and COMMITS
        
        // // Check your psql terminal now! The data is there.

        // // --- START NEW TRANSACTION IF NEEDED ---
        // TestTransaction.start(); 
        // // Continue with your service call...

        // 4. Create Recipe-Ingredient Links
        RecipeIngredient ri1 = new RecipeIngredient(r1, onion, BigDecimal.valueOf(2), "pcs");
        RecipeIngredient ri2 = new RecipeIngredient(r2, pasta, BigDecimal.valueOf(500.0), "g");
        repository.saveAll(List.of(ri1, ri2));

        ProductAttributesDto attrs = new ProductAttributesDto(false,false,false,false,false,false,false,false,false,false,false,false);

        // 5. Create Product Mappings (IngredientProduct)
        Product reweOnion = new Product(555L, "Ja! Zwiebeln", 120, "url", "1kg", attrs);
        reweOnion.setMarket(market);
        reweOnion = entityManager.merge(reweOnion);

        IngredientProduct mapping = new IngredientProduct();

        IngredientProductId mappingId = new IngredientProductId(onion.getId(), reweOnion.getId());
        mapping.setId(mappingId);
        mapping.setIngredient(onion);
        mapping.setProduct(reweOnion);
        mapping.setConfidence(0.95f);
        entityManager.merge(mapping);

        // Flush and clear to ensure we hit the DB for the test
        entityManager.flush();
        entityManager.clear();

        // --- STEP 2: EXECUTE SERVICE ---
        List<Integer> selectedRecipes = List.of(recipeId_1, recipeId_2);
        ShoppingListResponse shoppingList = recipeService.generateShoppingList(MARKET_ID, selectedRecipes);

        // --- STEP 3: ASSERT ---
        assertNotNull(shoppingList);
        assertEquals(2, shoppingList.items().size());
        assertEquals("Pasta", shoppingList.items().get(1).ingredientName());
        // assertEquals(0,shoppingList.items().get(1).options().size());
        assertEquals("Onion", shoppingList.items().get(0).ingredientName());
        assertEquals("Ja! Zwiebeln", shoppingList.items().get(0).options().get(0).product().getName());
        
        System.out.println("Shopping List Result:");
        shoppingList.items().forEach(p -> System.out.println("-> " + p.ingredientName()));
    }

    @Test
    @DisplayName("INTEGRATION: Fuzzy matching pre-processing for all ingredients")
    void testFuzzyMatchingPreProcessing_Integration() {
        // Set up some ingredients in the DB (about 3-5 should suffice for integration test)
        List<Ingredient> testIngredients = List.of(
            new Ingredient("Tomato"),
            new Ingredient("Cucumber"),
            new Ingredient("Lettuce")
        );
        testIngredients = testIngredients.stream()
            .map(entityManager::merge)
            .toList();

        entityManager.flush();
        entityManager.clear();

        // Set up a market (needed for products)
        Market market = new Market(MARKET_ID, "Test Market", new Address());
        marketRepository.save(market);

        // Set up some products in the DB (some of them should match the ingredients, others not)

        List<Product> testProducts = List.of(
            new Product(1000L, "Tomato Soup", 100, "url", "1L", new ProductAttributesDto(false,false,false,false,false,false,false,false,false,false,false,false)),
            new Product(1001L, "Fresh Tomato", 100, "url", "1kg", new ProductAttributesDto(false,false,false,false,false,false,false,false,false,false,false,false)),
            new Product(1002L, "Cucumber Slices", 150, "url", "500g", new ProductAttributesDto(false,false,false,false,false,false,false,false,false,false,false,false)),
            new Product(1003L, "Lettuce Head", 200, "url", "1pc", new ProductAttributesDto(false,false,false,false,false,false,false,false,false,false,false,false)),
            new Product(1004L, "Potato Chips", 250, "url", "200g", new ProductAttributesDto(false,false,false,false,false,false,false,false,false,false,false,false)),
            new Product(1005L, "Carrot Sticks", 180, "url", "300g", new ProductAttributesDto(false,false,false,false,false,false,false,false,false,false,false,false))
        );

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
        assertFalse(generatedMappings.isEmpty(), "Generated mappings should not be empty");
        System.out.println("Generated Ingredient-Product Mappings:");
        for (IngredientProduct ip : generatedMappings) {
            System.out.println("Ingredient: " + ip.getIngredient().getName() + 
                               " -> Product: " + marketRepository.findProductNameByReweId(ip.getId().getProductId()) +
                               " (Confidence: " + ip.getConfidence() + ")");
        }
    }
}
