package decidish.com.core;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import org.junit.jupiter.api.Test; // JUnit 5 - ADD

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.mockito.stubbing.VoidAnswer1;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.support.TransactionTemplate;

import decidish.com.core.model.rewe.Market;
import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.RecipeService;
import decidish.com.core.model.rewe.Address;
import decidish.com.core.service.MarketService;
import decidish.com.core.model.recipes.Recipe;
import decidish.com.core.model.recipes.Ingredient;
import decidish.com.core.model.recipes.RecipeIngredient;
import decidish.com.core.model.recipes.ShoppingListResponse;
import decidish.com.core.model.recipes.IngredientProduct;
import decidish.com.core.model.recipes.IngredientGroup;
import decidish.com.core.model.recipes.ShoppingOption;


import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Tag("integration")
class ShoppingListTestsDirty {
    
    @Autowired
    private RecipeService recipeService;

    @Autowired
    private RecipeIngredientRepository repository;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private MarketService marketService;

    @Autowired
    private IngredientProductRepository ingredientProductRepository;

    @Autowired
    private EntityManager entityManager; // Used to persist setup data without creating 5 extra repositories

    @Autowired
    private TransactionTemplate transactionTemplate;

    private final Long MARKET_ID = 431022L;

    @Test
    @DisplayName("Set up market, products, ingredients, and fuzzy matches")
    @Rollback(false)
    void testSetupData() {
        transactionTemplate.execute(status -> {
            // 1. Create Market
            Market market = new Market(MARKET_ID, "Test Market", new Address());
            marketRepository.save(market);

            // 2. Get real products from REWE API for that market
            marketService.getAllProducts(MARKET_ID); // products added inside

            // 3. Load Ingredients and Recipes
            List<Integer> recipeIds = loadRecipeIngredients();
            entityManager.flush();
            entityManager.clear();

            // 4. Fuzzy matching preprocessing
            List<IngredientProduct> preMatches = recipeService.fuzzyMatchingPreProcessing();

            // -- VERIFICATION CHECK --
            long count = ingredientProductRepository.count();
            System.out.println("Final count in DB before commit: " + count);

            // Show matches (with names)
            for (IngredientProduct ip : preMatches) {
                System.out.println("Ingredient: " + ip.getIngredient().getName() +
                    " <-> Product: " + marketRepository.findProductNameByReweId(ip.getId().getProductId()) +
                    " | Confidence: " + ip.getConfidence());
            }

            entityManager.flush();
            entityManager.clear();

            // assertNotNull(market);
            // assertNotNull(recipeIds);
            // assertFalse(recipeIds.isEmpty());
            //assertNotNull(preMatches);

            return null;
        });
    }

    @Test
    @DisplayName("INTEGRATION: Generate shopping list from multi-recipe ingredient aggregation")
    void testGenerateShoppingList_Live() {

        // -- SET UP DATA -- 

        // List<Integer> recipeIds = transactionTemplate.execute(status -> {
        //     // 1. Create Market
        //     Market market = new Market(MARKET_ID, "Test Market", new Address());
        //     marketRepository.save(market);

        //     // 2. Get real products from REWE API for that market
        //     market = marketService.getAllProducts(MARKET_ID);
        //     // productRepository.saveAll(market.getProducts());
            
        //     // 3. Load Ingredients and Recipes
        //     List<Integer> lrecipeIds = loadRecipeIngredients(); 

        //     // 4. Fuzzy matching preprocessing
        //     List<IngredientProduct> preMatches = recipeService.fuzzyMatchingPreProcessing();
        //     return lrecipeIds;
        // });
        // 1. Create Market

        // Market market = transactionTemplate.execute(status ->{ 
        //     return marketRepository.save(new Market(MARKET_ID, "Test Market", new Address()));
        // });
        

        // // 2. Get real products from REWE API for that market
        // market = transactionTemplate.execute(status ->{
        //     return marketService.getAllProducts(MARKET_ID);
        // });

        // // Print number of products fetched
        // System.out.println("Number of products fetched from REWE API: " + market.getProducts().size());

        // return;

        // Add products to local repository
        // productRepository.saveAll(market.getProducts());

        // 3. Create some ingredients that exist in REWE

        // List<Integer> recipeIds = transactionTemplate.execute(status -> {
        //     return loadRecipeIngredients();
        // });
        // // List<Integer> recipeIds = loadRecipeIngredients();

        // // -- FUZZY MATCHING PREPROCESSING --

        // List<IngredientProduct> preMatches = transactionTemplate.execute(status -> {
        //     return recipeService.fuzzyMatchingPreProcessing();
        // });

        // // // --- FORCE COMMIT NOW ---
        // // entityManager.flush(); 
        // // TestTransaction.flagForCommit(); // Ensure the flag is set
        // // TestTransaction.end();           // This actually closes the transaction and COMMITS
        
        // // // Check your psql terminal now! The data is there.

        // // // --- START NEW TRANSACTION IF NEEDED ---
        // // TestTransaction.start(); 
        // // // Continue with your service call...

        // // -- GENERATE SHOPPING LIST --

        // // We must show how many times rewe api was called

        // // recipeService.resetApiCounter();

        List<Integer> recipeIds = transactionTemplate.execute(status -> {
            // 1. Create Market
            Market market = new Market(MARKET_ID, "Test Market", new Address());
            marketRepository.save(market);

            // 2. Get real products from REWE API for that market
            marketService.getAllProducts(MARKET_ID); // products added inside

            // 3. Load Ingredients and Recipes
            List<Integer> lrecipeIds = loadRecipeIngredients();
            entityManager.flush();
            entityManager.clear();

            // 4. Fuzzy matching preprocessing
            List<IngredientProduct> preMatches = recipeService.fuzzyMatchingPreProcessing();

            // -- VERIFICATION CHECK --
            long count = ingredientProductRepository.count();
            System.out.println("Final count in DB before commit: " + count);

            // Show matches (with names)
            for (IngredientProduct ip : preMatches) {
                System.out.println("Ingredient: " + ip.getIngredient().getName() +
                    " <-> Product: " + marketRepository.findProductNameByReweId(ip.getId().getProductId()) +
                    " | Confidence: " + ip.getConfidence());
            }

            entityManager.flush();
            entityManager.clear();

            assertNotNull(market);
            assertNotNull(lrecipeIds);
            assertFalse(lrecipeIds.isEmpty());
            assertNotNull(preMatches);

            return lrecipeIds;
        });

        // List<Integer> recipeIds = List.of(1, 2, 3); // Assuming these IDs were created in setup

        long startTime = System.currentTimeMillis();

        ShoppingListResponse shoppingList = recipeService.generateShoppingListV4(
            MARKET_ID,
            recipeIds
        );

        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;

        System.out.println("Shopping list generation took " + duration + " milliseconds.");

        // Get number of API calls made
        // int totalApiCalls = recipeService.apiCallCounter.get();
        // System.out.println("Total API calls made: " + totalApiCalls);

        // -- ASSERTIONS --

        assertNotNull(shoppingList);
        // assertEquals(35, shoppingList.items().size());

        System.out.println("Generated shopping list with " + shoppingList.items().size() + " ingredient groups.");

        // Print entire shopping list for manual verification
        for (IngredientGroup group : shoppingList.items()) {
            System.out.println("Ingredient: " + group.ingredientName() + " (Needed: " + group.totalAmountNeeded() + ")");
            for (ShoppingOption option : group.options()) {
                if (option != null) {
                    System.out.println("  - Product: " + option.product().getName() + ", Price: " + option.product().getPrice() + ", Confidence: " + option.confidence());
                } else {
                    System.out.println("  - No products found for this ingredient.");  
                }
            }
        }
    }

    // Auxiliary method to load recipe ingredients
    @Transactional
    private List<Integer> loadRecipeIngredients() {
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

        // List<RecipeIngredient> ri1 = List.of(
        //     new RecipeIngredient(recipe1, new Ingredient("Rucolasalat"), BigDecimal.valueOf(250.0), "g"),
        //     new RecipeIngredient(recipe1, new Ingredient("frische Feigen"), BigDecimal.valueOf(4.0), "pieces"),
        //     new RecipeIngredient(recipe1, new Ingredient("Pekannüsse"), BigDecimal.valueOf(40.0), "g"),
        //     new RecipeIngredient(recipe1, new Ingredient("REWE Bio Ahornsirup"), BigDecimal.valueOf(1.0), "EL"),
        //     new RecipeIngredient(recipe1, new Ingredient("REWE Feine Welt Lesvos g.g.A. mildes Olivenöl"), BigDecimal.valueOf(50.0), "ml"),
        //     new RecipeIngredient(recipe1, new Ingredient("REWE Feine Welt Aceto Balsamico di Modena I.G.P."), BigDecimal.valueOf(25.0), "ml"),
        //     new RecipeIngredient(recipe1, new Ingredient("REWE Bio Vielblütenhonig"), BigDecimal.valueOf(1.0), "TL"),
        //     new RecipeIngredient(recipe1, new Ingredient("REWE Feine Welt Rosa Kristallsalz"), null, null),
        //     new RecipeIngredient(recipe1, new Ingredient("REWE Bio Pfeffer a. d. Mühle"), null, null),
        //     new RecipeIngredient(recipe1, new Ingredient("Bauchspeck in Scheiben"), BigDecimal.valueOf(100.0), "g"),
        //     new RecipeIngredient(recipe1, new Ingredient("Roggenbrot"), BigDecimal.valueOf(2.0), "slices"),
        //     new RecipeIngredient(recipe1, new Ingredient("ja! Butter"), BigDecimal.valueOf(30.0), "g")
        // );

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
        // Recipe recipe2 = new Recipe("Kabeljau in Kokos-Curry-Sauce");
        // recipe2 = entityManager.merge(recipe2);

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
        // List<RecipeIngredient> ingredients2 = List.of(
        //     new RecipeIngredient(recipe2, new Ingredient("Kabeljaufilet"), BigDecimal.valueOf(800.0), "g"),
        //     new RecipeIngredient(recipe2, new Ingredient("Limette"), BigDecimal.valueOf(1.0), "pieces"),
        //     new RecipeIngredient(recipe2, new Ingredient("Schalotten"), BigDecimal.valueOf(2.0), "pieces"),
        //     new RecipeIngredient(recipe2, new Ingredient("Ingwer"), BigDecimal.valueOf(10.0), "g"),
        //     new RecipeIngredient(recipe2, new Ingredient("Rapsöl"), BigDecimal.valueOf(2.0), "EL"),
        //     new RecipeIngredient(recipe2, new Ingredient("Madras Currypulver"), BigDecimal.valueOf(1.0), "TL"),
        //     new RecipeIngredient(recipe2, new Ingredient("Chiliflocken"), BigDecimal.valueOf(2.0), "TL"),
        //     new RecipeIngredient(recipe2, new Ingredient("REWE Beste Wahl Kokosmilch (400 g)"), BigDecimal.valueOf(250.0), "ml"),
        //     new RecipeIngredient(recipe2, new Ingredient("stückige Tomaten (Dose)"), BigDecimal.valueOf(350.0), "g"),
        //     new RecipeIngredient(recipe2, new Ingredient("Salz"), null, null),
        //     new RecipeIngredient(recipe2, new Ingredient("Koriander"), BigDecimal.valueOf(3.5), "stems"),
        //     new RecipeIngredient(recipe2, new Ingredient("Kokosraspeln"), BigDecimal.valueOf(2.0), "EL")
        // );

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
        // Recipe recipe3 = new Recipe("Kartoffelgratin");
        // recipe3 = entityManager.merge(recipe3);

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
        // List<RecipeIngredient> ingredients3 = List.of(
        //     new RecipeIngredient(recipe3, new Ingredient("Milch"), BigDecimal.valueOf(450.0), "ml"),
        //     new RecipeIngredient(recipe3, new Ingredient("Lorbeerblätter"), BigDecimal.valueOf(2.0), "pieces"),
        //     new RecipeIngredient(recipe3, new Ingredient("Knoblauch"), BigDecimal.valueOf(2.0), "pieces"),
        //     new RecipeIngredient(recipe3, new Ingredient("Butter"), BigDecimal.valueOf(2.0), "EL"),
        //     new RecipeIngredient(recipe3, new Ingredient("Weizenmehl Type 405"), BigDecimal.valueOf(2.0), "EL"),
        //     new RecipeIngredient(recipe3, new Ingredient("Sahne"), BigDecimal.valueOf(50.0), "ml"),
        //     new RecipeIngredient(recipe3, new Ingredient("Pfeffer"), null, null),
        // //     new RecipeIngredient(recipe3, new Ingredient("Salz"), null, null),
        //     new RecipeIngredient(recipe3, new Ingredient("Muskat"), BigDecimal.valueOf(1.0), "pinch"),
        //     new RecipeIngredient(recipe3, new Ingredient("Kartoffeln"), BigDecimal.valueOf(1000.0), "g"),
        //     new RecipeIngredient(recipe3, new Ingredient("Gratinkäse"), BigDecimal.valueOf(200.0), "g")
        // );

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
        repository.saveAll(ri1);
        repository.saveAll(ri2);
        repository.saveAll(ri3);

        return List.of(recipe1.getId(), recipe2.getId(), recipe3.getId());
    }
}
