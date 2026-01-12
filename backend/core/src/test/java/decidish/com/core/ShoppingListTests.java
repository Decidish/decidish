package decidish.com.core;

import decidish.com.core.model.rewe.Address;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;
import decidish.com.core.model.recipes.ShoppingListResponse;
import decidish.com.core.model.recipes.ShoppingOption;
import decidish.com.core.model.recipes.Recipe;
import decidish.com.core.model.recipes.Ingredient;
import decidish.com.core.model.recipes.IngredientGroup;
import decidish.com.core.model.recipes.RecipeIngredient;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate; 


import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;



@SpringBootTest
@ActiveProfiles("test")
@Tag("integration")
@Transactional
class ShoppingListTests {

    @Autowired private RecipeService recipeService;
    @Autowired private MarketRepository marketRepository;
    @Autowired private MarketService marketService;
    @Autowired private IngredientProductRepository ingredientProductRepository;
    @Autowired private RecipeIngredientRepository recipeIngredientRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private EntityManager entityManager;
    // @Autowired private TransactionTemplate transactionTemplate;

    private final Long MARKET_ID = 431022L;
    private List<Integer> recipeIds;

    @BeforeEach
    void setUp() {

        Executor syncExecutor = new org.springframework.core.task.support.ExecutorServiceAdapter(
            new org.springframework.core.task.SyncTaskExecutor()
        );
        recipeService.setApiExecutor(syncExecutor); //! Make API calls synchronous in recipeService for testing, 10 sec sequential, 6 sec parallel
        // We use transactionTemplate to ensure the setup is visible to background threads
        // recipeIds = transactionTemplate.execute(status -> {
            // 1. Setup Market with products
            if(!marketRepository.existsById(MARKET_ID)) {
                Market market = new Market(MARKET_ID, "Test Market", new Address());
                marketRepository.save(market);
                marketService.getAllProducts(MARKET_ID);
            }

            // 3. Load Recipes & Ingredients
            if(recipeIngredientRepository.count() == 0) {
                recipeIds = loadRecipeIngredients();
            } else {
                recipeIds = recipeIngredientRepository.findAll()
                        .stream()
                        .map(ri -> ri.getRecipe().getId())
                        .distinct()
                        .toList();
            }
            
            // 4. Run Fuzzy Matching Pre-processing
            if(ingredientProductRepository.count() == 0) {
                recipeService.fuzzyMatchingPreProcessing();
            }
            
            entityManager.flush();
            entityManager.clear();

            // return recipeIds;
        // });
    }

    @Test
    @DisplayName("INTEGRATION: Generate shopping list with descending confidence")
    void testGenerateShoppingList_Clean() {
        // Execute the multi-threaded generation
        long startTime = System.currentTimeMillis();
        
        ShoppingListResponse shoppingList = recipeService.generateShoppingList(
            MARKET_ID,
            recipeIds
        );

        long duration = System.currentTimeMillis() - startTime;

        // -- ASSERTIONS --
        assertNotNull(shoppingList);
        assertFalse(shoppingList.items().isEmpty(), "Shopping list should not be empty");
        
        System.out.println("Generation took: " + duration + "ms");

        // Verify descending confidence logic for a known ingredient (e.g., Salz)
        shoppingList.items().stream()
            .filter(group -> group.ingredientName().equalsIgnoreCase("Salz"))
            .findFirst()
            .ifPresent(group -> {
                assertTrue(group.options().size() > 1);
                float firstConf = group.options().get(0).confidence();
                float secondConf = group.options().get(1).confidence();
                assertTrue(firstConf > secondConf, "First option should have higher confidence than second");
            });

        System.out.println("Generated shopping list with " + shoppingList.items().size() + " ingredient groups.");

        // Print entire shopping list for manual verification
        for (IngredientGroup group : shoppingList.items()) {
            System.out.println("Ingredient: " + group.ingredientName() + " (Needed: " + group.totalAmountNeeded() + ")");
            if(group.options().isEmpty()) {
                System.out.println("  No options found for this ingredient.");
            } else {
                for (ShoppingOption option : group.options()) {
                    System.out.println("  - Product: " + option.product().getName() + ", Price: " + option.product().getPrice() + ", Needed: " + option.quantityToBuy() + ", Confidence: " + option.confidence() + ", URL: " + option.product().getImageUrl());
                }
            }
        }
    }

    // Auxiliary method to load recipe ingredients
    @Transactional
    public List<Integer> loadRecipeIngredients() {
        /*
            12 ingredients from Recipe 1

            "250.0 g Rucolasalat",
            "4.0 frische Feigen",
            "40.0 g Pekannüsse",
            "1.0 EL REWE Bio Ahornsirup",
            "50.0 ml REWE Feine Welt Lesvos g.g.A. mildes Olivenöl",
            "25.0 ml REWE Feine Welt Aceto Balsamico di Modena I.G.P.",
            "1.0 TL REWE Bio Vielblütenhonig",
            "REWE Feine Welt Rosa Kristallsalz",
            "REWE Bio Pfeffer a. d. Mühle",
            "100.0 g Bauchspeck in Scheiben",
            "2.0 Scheibe(n) Roggenbrot",
            "30.0 g ja! Butter"
        */

        // Create recipe 1

        // Recipe recipe1 = new Recipe("Rucolasalat mit Feigen und Pekannüssen");
        // recipe1 = entityManager.merge(recipe1);

        Recipe recipe1 = entityManager.merge(new Recipe("Rucolasalat mit Feigen und Pekannüssen"));

        // Create ingredients for recipe 1

        List<Ingredient> ingredients1 = List.of(
            new Ingredient("Rucolasalat"),
            new Ingredient("frische Feigen"),
            new Ingredient("Pekannüsse"),
            new Ingredient("REWE Bio Ahornsirup"),
            new Ingredient("REWE Feine Welt Lesvos g.g.A. mildes Olivenöl"),
            new Ingredient("REWE Feine Welt Aceto Balsamico di Modena I.G.P."),
            new Ingredient("REWE Bio Vielblütenhonig"),
            new Ingredient("REWE Feine Welt Rosa Kristallsalz"),
            new Ingredient("REWE Bio Pfeffer a. d. Mühle"),
            new Ingredient("Bauchspeck in Scheiben"),
            new Ingredient("Roggenbrot"),
            new Ingredient("ja! Butter")
        );

        ingredients1 = ingredients1.stream()
            .map(entityManager::merge)
            .toList();

        List<RecipeIngredient> ri1 = ingredients1.stream()
            .map(ing -> {
                switch (ing.getName()) {
                    case "Rucolasalat":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(250.0), "g");
                    case "frische Feigen":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(4.0), "pieces");
                    case "Pekannüsse":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(40.0), "g");
                    case "REWE Bio Ahornsirup":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(1.0), "EL");
                    case "REWE Feine Welt Lesvos g.g.A. mildes Olivenöl":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(50.0), "ml");
                    case "REWE Feine Welt Aceto Balsamico di Modena I.G.P.":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(25.0), "ml");
                    case "REWE Bio Vielblütenhonig":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(1.0), "TL");
                    case "REWE Feine Welt Rosa Kristallsalz":
                        return new RecipeIngredient(recipe1, ing, null, null);
                    case "REWE Bio Pfeffer a. d. Mühle":
                        return new RecipeIngredient(recipe1, ing, null, null);
                    case "Bauchspeck in Scheiben":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(100.0), "g");
                    case "Roggenbrot":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(2.0), "slices");
                    case "ja! Butter":
                        return new RecipeIngredient(recipe1, ing, BigDecimal.valueOf(30.0), "g");
                    default:
                        return null; // This should not happen
                }
            })
            .toList();

        /*
            12 ingredients from Recipe 2

            "800.0 g Kabeljaufilet",
            "1.0 Limette",
            "2.0 Schalotten",
            "10.0 g Ingwer",
            "2.0 EL Rapsöl",
            "1.0 TL Madras Currypulver",
            "2.0 TL Chiliflocken",
            "250.0 ml REWE Beste Wahl Kokosmilch (400 g)",
            "350.0 g stückige Tomaten (Dose)",
            "Salz",
            "3.5 Stiel(e) Koriander",
            "2.0 EL Kokosraspeln"
        
        */

        // Create recipe 2

        Recipe recipe2 = entityManager.merge(new Recipe("Kabeljau in Kokos-Curry-Sauce"));

        List<Ingredient> ingredients2 = List.of(
            new Ingredient("Kabeljaufilet"),
            new Ingredient("Limette"),
            new Ingredient("Schalotten"),
            new Ingredient("Ingwer"),
            new Ingredient("Rapsöl"),
            new Ingredient("Madras Currypulver"),
            new Ingredient("Chiliflocken"),
            new Ingredient("REWE Beste Wahl Kokosmilch (400 g)"),
            new Ingredient("stückige Tomaten (Dose)"),
            new Ingredient("Salz"),
            new Ingredient("Koriander"),
            new Ingredient("Kokosraspeln")
        );

        // Create ingredients for recipe 2

        ingredients2 = ingredients2.stream()
            .map(entityManager::merge)
            .toList();

        List<RecipeIngredient> ri2 = ingredients2.stream()
            .map(ing -> {
                switch (ing.getName()) {
                    case "Kabeljaufilet":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(800.0), "g");
                    case "Limette":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(1.0), "pieces");
                    case "Schalotten":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(2.0), "pieces");
                    case "Ingwer":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(10.0), "g");
                    case "Rapsöl":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(2.0), "EL");
                    case "Madras Currypulver":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(1.0), "TL");
                    case "Chiliflocken":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(2.0), "TL");
                    case "REWE Beste Wahl Kokosmilch (400 g)":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(250.0), "ml");
                    case "stückige Tomaten (Dose)":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(350.0), "g");
                    case "Salz":
                        return new RecipeIngredient(recipe2, ing, null, null);
                    case "Koriander":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(3.5), "stems");
                    case "Kokosraspeln":
                        return new RecipeIngredient(recipe2, ing, BigDecimal.valueOf(2.0), "EL");
                    default:
                        return null; // This should not happen
                }
            })
            .toList();

        /*
            11 ingredients from Recipe 3

            "450.0 ml Milch",
            "2.0 Lorbeerblätter",
            "2.0 Zehe(n) Knoblauch",
            "2.0 EL Butter",
            "2.0 EL Weizenmehl Type 405",
            "50.0 ml Sahne",
            "Pfeffer",
            // "Salz",
            "1.0 Prise(n) Muskat",
            "1.0 kg Kartoffeln",
            "200.0 g Gratinkäse"
        */

        // Create recipe 3

        Recipe recipe3 = entityManager.merge(new Recipe("Kartoffelgratin"));

        List<Ingredient> ingredients3 = List.of(
            new Ingredient("Milch"),
            new Ingredient("Lorbeerblätter"),
            new Ingredient("Knoblauch"),
            new Ingredient("Butter"),
            new Ingredient("Weizenmehl Type 405"),
            new Ingredient("Sahne"),
            new Ingredient("Pfeffer"),
            // new Ingredient("Salz"),
            new Ingredient("Muskat"),
            new Ingredient("Kartoffeln"),
            new Ingredient("Gratinkäse")
        );

        // Create ingredients for recipe 3

        ingredients3 = ingredients3.stream()
            .map(entityManager::merge)
            .toList();

        List<RecipeIngredient> ri3 = ingredients3.stream()
            .map(ing -> {
                switch (ing.getName()) {
                    case "Milch":
                        return new RecipeIngredient(recipe3, ing, BigDecimal.valueOf(450.0), "ml");
                    case "Lorbeerblätter":
                        return new RecipeIngredient(recipe3, ing, BigDecimal.valueOf(2.0), "pieces");
                    case "Knoblauch":
                        return new RecipeIngredient(recipe3, ing, BigDecimal.valueOf(2.0), "pieces");
                    case "Butter":
                        return new RecipeIngredient(recipe3, ing, BigDecimal.valueOf(2.0), "EL");
                    case "Weizenmehl Type 405":
                        return new RecipeIngredient(recipe3, ing, BigDecimal.valueOf(2.0), "EL");
                    case "Sahne":
                        return new RecipeIngredient(recipe3, ing, BigDecimal.valueOf(50.0), "ml");
                    case "Pfeffer":
                        return new RecipeIngredient(recipe3, ing, null, null);
                    // case "Salz":
                    //     return new RecipeIngredient(recipe3, ing, null, null);
                    case "Muskat":
                        return new RecipeIngredient(recipe3, ing, BigDecimal.valueOf(1.0), "pinch");
                    case "Kartoffeln":
                        return new RecipeIngredient(recipe3, ing, BigDecimal.valueOf(1000.0), "g");
                    case "Gratinkäse":
                        return new RecipeIngredient(recipe3, ing, BigDecimal.valueOf(200.0), "g");
                    default:
                        return null; // This should not happen
                }
            })
            .toList();

        // Save all recipe ingredients
        recipeIngredientRepository.saveAll(ri1);
        recipeIngredientRepository.saveAll(ri2);
        recipeIngredientRepository.saveAll(ri3);

        return List.of(recipe1.getId(), recipe2.getId(), recipe3.getId());
    }
}