package decidish.com.core.integration;

import decidish.com.core.model.recipes.*;
import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

// import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
// import org.springframework.context.annotation.Import;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
// import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
// import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration")
// 
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Tag("integration")
@Transactional
class RecipeServiceIT {

        @Autowired
        private RecipeService recipeService;

        @Autowired
        private RecipeIngredientRepository repository;

        @Autowired
        private IngredientProductRepository ingredientProductRepository;

        @Autowired
        private ProductRepository productRepository;

        @Autowired
        private TransactionTemplate transactionTemplate;

        @Autowired
        private MarketRepository marketRepository;

        @Autowired
        private EntityManager entityManager; // Used to persist setup data without creating 5 extra repositories

        @MockitoBean // Crucial: Replaces the real MarketService bean with a Mock
        private MarketService marketService;

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
                // TestTransaction.end(); // This actually closes the transaction and COMMITS

                // // Check your psql terminal now! The data is there.

                // // --- START NEW TRANSACTION IF NEEDED ---
                // TestTransaction.start();
                // // Continue with your service call...

                // 4. Create Recipe-Ingredient Links
                RecipeIngredient ri1 = new RecipeIngredient(r1, onion, BigDecimal.valueOf(2), "pcs");
                RecipeIngredient ri2 = new RecipeIngredient(r2, pasta, BigDecimal.valueOf(500.0), "g");
                repository.saveAll(List.of(ri1, ri2));

                ProductAttributesDto attrs = new ProductAttributesDto(false, false, false, false, false, false, false,
                                false,
                                false, false, false, false);

                // 5. Create Product Mappings (IngredientProduct)
                Product reweOnion = new Product(555L, "Ja! Zwiebeln", 120, "url", "1kg", attrs);
                reweOnion.setMarket(market);
                reweOnion = entityManager.merge(reweOnion);

                IngredientProduct mapping = new IngredientProduct();

                IngredientProductId mappingId = new IngredientProductId(onion.getId(), reweOnion.getReweId());
                mapping.setId(mappingId);
                mapping.setIngredient(onion);
                // mapping.setProduct(reweOnion);
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
                assertFalse(shoppingList.items().get(0).options().isEmpty());
                assertEquals("Ja! Zwiebeln", shoppingList.items().get(0).options().get(0).product().getName());

                System.out.println("Shopping List Result:");
                shoppingList.items().forEach(p -> System.out.println("-> " + p.ingredientName()));
        }

        @Test
        @DisplayName("INTEGRATION: DB Returns multiple rows for same ingredient, Service sums them up")
        void testAggregationEndToEnd() {
                // --- 1. SETUP DATA ---
                Market market = new Market(MARKET_ID, "Test Market", null);
                marketRepository.save(market);

                Ingredient milk = new Ingredient("Milk");
                milk = entityManager.merge(milk);

                // Recipe 1: Pancakes (Needs 200ml Milk)
                Recipe r1 = new Recipe("Pancakes");
                r1 = entityManager.merge(r1);
                RecipeIngredient ri1 = new RecipeIngredient(r1, milk, BigDecimal.valueOf(200), "ml");

                // Recipe 2: Cereal (Needs 150ml Milk)
                Recipe r2 = new Recipe("Cereal");
                r2 = entityManager.merge(r2);
                RecipeIngredient ri2 = new RecipeIngredient(r2, milk, BigDecimal.valueOf(150), "ml");

                repository.saveAll(List.of(ri1, ri2));

                // Product: 1 Liter Milk (1000ml)
                Product milkCarton = new Product();
                milkCarton.setName("Fresh Milk 1L");
                milkCarton.setMarket(market);
                milkCarton.setNormalizedAmount(1000.0);
                milkCarton.setReweId(123L);
                milkCarton = entityManager.merge(milkCarton);

                // Mapping
                IngredientProductId mapId = new IngredientProductId(milk.getId(), milkCarton.getReweId());
                IngredientProduct mapping = new IngredientProduct(mapId, milk, 0.99f);
                entityManager.merge(mapping);

                entityManager.flush();
                entityManager.clear();

                // --- 2. EXECUTE ---
                // Select BOTH recipes
                ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID,
                                List.of(r1.getId(), r2.getId()));

                // --- 3. ASSERT ---
                assertNotNull(response);
                assertEquals(1, response.items().size(), "Should merge both milk requirements into 1 entry");

                IngredientGroup milkGroup = response.items().get(0);
                assertEquals("Milk", milkGroup.ingredientName());

                // Check Sum: 200 + 150 = 350
                assertEquals(350.0, milkGroup.totalAmountNeeded(), 0.01);

                // Check Product Quantity
                // Need 350, Pack is 1000 -> Buy 1
                ShoppingOption option = milkGroup.options().get(0);
                assertEquals(1, option.quantityToBuy());
        }

        @Test
        @DisplayName("INTEGRATION: Generate shopping list (Hybrid: Local + API fallback)")
        void testGenerateShoppingList_Hybrid() {
                // --- DATA SETUP ---
                Market market = new Market(MARKET_ID, "Test Market", null);
                marketRepository.saveAndFlush(market);

                // Ingredient 1: Onion (Will have local mapping)
                Ingredient onion = new Ingredient("Onion");
                onion = entityManager.merge(onion);

                // Ingredient 2: Saffron (Will be missing locally -> API Fallback)
                Ingredient saffron = new Ingredient("Saffron");
                saffron = entityManager.merge(saffron);

                Recipe r1 = new Recipe("Fancy Paella");
                r1 = entityManager.merge(r1);

                // Link Ingredients to Recipe
                RecipeIngredient ri1 = new RecipeIngredient(r1, onion, BigDecimal.valueOf(2), "pcs");
                RecipeIngredient ri2 = new RecipeIngredient(r1, saffron, BigDecimal.valueOf(1), "g");
                repository.saveAll(List.of(ri1, ri2));

                // Create Local Product for Onion
                Product reweOnion = new Product(555L, "Ja! Zwiebeln", 100, "url", "1kg", null);
                reweOnion.setMarket(market);
                reweOnion.setNormalizedAmount(1.0);
                reweOnion = entityManager.merge(reweOnion);

                // Map Onion locally
                IngredientProduct mapping = new IngredientProduct();
                mapping.setId(new IngredientProductId(onion.getId(), reweOnion.getReweId()));
                mapping.setIngredient(onion);
                // mapping.setProduct(reweOnion);
                mapping.setConfidence(0.95f);
                entityManager.merge(mapping);

                entityManager.flush();
                entityManager.clear();

                // --- MOCK API BEHAVIOR ---
                Market managedMarket = marketRepository.findById(MARKET_ID).orElseThrow();
                // When service asks for Saffron, return a mock product
                Product apiSaffron = new Product(777L, "Premium Saffron", 999, "url", "1g", null);
                apiSaffron.setNormalizedAmount(1.0);
                apiSaffron.setMarket(managedMarket);
                // Market mockApiMarket = new Market();
                // mockApiMarket.setProducts(List.of(apiSaffron));

                when(marketService.getProductsQueryNoSave(eq(MARKET_ID), eq("Saffron")))
                                .thenReturn(List.of(apiSaffron));

                // Ensure the service uses direct executor to avoid async complications in test
                recipeService.setApiExecutor(Runnable::run);

                // --- EXECUTE ---
                ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID, List.of(r1.getId()));

                // --- ASSERT ---
                assertNotNull(response);
                assertEquals(2, response.items().size(), "Should contain both ingredients");

                // Verify Onion (Local)
                IngredientGroup onionGroup = response.items().stream()
                                .filter(g -> g.ingredientName().equals("Onion"))
                                .findFirst().orElseThrow();
                assertEquals("Ja! Zwiebeln", onionGroup.options().get(0).product().getName());

                // Verify Saffron (API)
                IngredientGroup saffronGroup = response.items().stream()
                                .filter(g -> g.ingredientName().equals("Saffron"))
                                .findFirst().orElseThrow();
                assertFalse(saffronGroup.options().isEmpty(), "Saffron should have options from API");
                assertEquals("Premium Saffron", saffronGroup.options().get(0).product().getName());
        }
}
