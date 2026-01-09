package decidish.com.core.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.function.DoubleBinaryOperator;

import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.MarketService;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.recipes.*;

// Final purpose: generate shopping list from selected recipes
@Service
public class RecipeService {
    
    private static final Logger log = LoggerFactory.getLogger(RecipeService.class);
    
    private static final Double FUZZY_MATCHING_THRESHOLD = 0.3;
    private static final Integer FUZZY_MATCHING_LIMIT = 5;

    // @Autowired
    // private MarketService marketService;

    @Autowired
    private RecipeIngredientRepository recipeIngredientRepository;

    @Autowired
    private IngredientProductRepository ingredientProductRepository;
    
    @Autowired
    private MarketService marketService;
    
    // /**
    //  * Generates a shopping list with alternatives and quantities.
    //  * Optimized: Fetches missing ingredients from API in parallel.
    //  */
    // public ShoppingListResponse generateShoppingList(Long marketId, List<Integer> recipeIds) {

    //     // 1. Fetch all raw ingredients for the selected recipes
    //     List<RecipeIngredient> rawIngredients = recipeIngredientRepository.findForShoppingList(recipeIds);

    //     // 2. Aggregation: Sum amounts for the same Ingredient ID
    //     Map<Integer, Double> totalNeeds = new HashMap<>();
    //     Map<Integer, RecipeIngredient> ingredientRef = new HashMap<>();

    //     for (RecipeIngredient ri : rawIngredients) {
    //         Integer ingId = ri.getIngredient().getId();
    //         BigDecimal amount = ri.getQuantity() != null ? ri.getQuantity() : BigDecimal.ZERO;
            
    //         totalNeeds.merge(ingId, amount.doubleValue(), Double::sum);
    //         ingredientRef.putIfAbsent(ingId, ri);
    //     }

    //     // 3. Batch fetch matching products for ALL ingredients in this market
    //     List<Integer> ingredientIds = new ArrayList<>(totalNeeds.keySet());
    //     List<IngredientProduct> allMappings = recipeIngredientRepository.findProductsForIngredientsInMarket(
    //         ingredientIds,
    //         marketId
    //     );

    //     // 4. Group mappings by Ingredient ID
    //     Map<Integer, List<IngredientProduct>> matchesByIngredient = allMappings.stream()
    //         .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

    //     // 5. Build the Response (Thread-safe list for async additions)
    //     List<IngredientGroup> groups = Collections.synchronizedList(new ArrayList<>());
    //     List<CompletableFuture<Void>> apiFutures = new ArrayList<>();

    //     for (Integer ingId : ingredientIds) {
    //         RecipeIngredient ref = ingredientRef.get(ingId);
    //         Double needed = totalNeeds.get(ingId);
    //         List<IngredientProduct> matches = matchesByIngredient.getOrDefault(ingId, List.of());

    //         // Convert local matches into ShoppingOptions
    //         List<ShoppingOption> localOptions = matches.stream()
    //             .map(match -> createShoppingOption(match, needed))
    //             .sorted(Comparator.comparing(ShoppingOption::confidence).reversed())
    //             .collect(Collectors.toList());

    //         if (!localOptions.isEmpty()) {
    //             // Case A: Found local matches, add immediately
    //             groups.add(new IngredientGroup(
    //                 ingId, ref.getIngredient().getName(), needed, localOptions
    //             ));
    //         } else {
    //             // Case B: No local matches, fetch from API in PARALLEL
    //             // This prevents 10 missing ingredients from taking 10x API latency
    //             CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
    //                 String ingName = ref.getIngredient().getName();
    //                 List<ShoppingOption> apiOptions = fetchOptionsFromApi(marketId, ingId, ingName, needed, ref.getIngredient());
                    
    //                 groups.add(new IngredientGroup(
    //                     ingId, ingName, needed, apiOptions
    //                 ));
    //             });
    //             apiFutures.add(future);
    //         }
    //     }

    //     // 6. Wait for all async API calls to complete
    //     if (!apiFutures.isEmpty()) {
    //         CompletableFuture.allOf(apiFutures.toArray(new CompletableFuture[0])).join();
    //     }

    //     // 7. Sort final list for deterministic output (e.g., alphabetically by ingredient)
    //     groups.sort(Comparator.comparing(IngredientGroup::ingredientName));

    //     return new ShoppingListResponse(groups);
    // }

    // /**
    //  * Helper to safely fetch from API without blocking the main logic flow.
    //  */
    // private List<ShoppingOption> fetchOptionsFromApi(Long marketId, Integer ingId, String ingName, Double needed, Ingredient ingredient) {
    //     List<ShoppingOption> options = new ArrayList<>();
    //     try {
    //         log.info("Fetching from API for missing ingredient: {}", ingName);
    //         Market marketResponse = marketService.getProductsQuery(marketId, ingName);
            
    //         if (marketResponse != null && marketResponse.getProducts() != null) {
    //             List<Product> apiProducts = marketResponse.getProducts();
                
    //             for(Product apiProduct : apiProducts){
    //                 // Create temporary mapping objects to reuse the calculation logic
    //                 IngredientProductId igId = new IngredientProductId(ingId, apiProduct.getId());
    //                 IngredientProduct ig = new IngredientProduct(igId, ingredient, apiProduct, 0.95f);
                    
    //                 options.add(createShoppingOption(ig, needed));
    //             }
    //             log.debug("Added {} products from API for ingredient: {}", apiProducts.size(), ingName);
    //         } else {
    //             log.warn("API returned no products for ingredient: {} (ID: {})", ingName, ingId);
    //         }
    //     } catch (Exception e) {
    //         log.error("Error fetching products from API for ingredient: {}", ingName, e);
    //     }
    //     return options;
    // }
    
    // TODO: testing 
    // TODO: add alternatives? ------> create ShoppingListItem with List<Product> alternatives?
    // TODO: quantities? ------------> create ShoppingListItem with quantity field? (also in alternatives?)
    /**
     * Generates a shopping list with alternatives and quantities.
     */
    public ShoppingListResponse generateShoppingList(Long marketId, List<Integer> recipeIds) {

        // Fetch all raw ingredients for the selected recipes
        List<RecipeIngredient> rawIngredients = recipeIngredientRepository.findForShoppingList(recipeIds);

        // TODO: remove this
        // Aggregation: Sum amounts for the same Ingredient ID
        // (e.g., Recipe A needs 200g Flour, Recipe B needs 300g Flour -> Total 500g)
        Map<Integer, Double> totalNeeds = new HashMap<>();
        Map<Integer, RecipeIngredient> ingredientRef = new HashMap<>(); // Keep reference to get Name/Unit

        for (RecipeIngredient ri : rawIngredients) {
            Integer ingId = ri.getIngredient().getId();
            // The quantity of the ingredients is already normalize
            BigDecimal amount = ri.getQuantity() != null ? ri.getQuantity() : BigDecimal.ZERO;
            
            totalNeeds.merge(ingId, amount.doubleValue(), Double::sum);
            ingredientRef.putIfAbsent(ingId, ri);
        }

        // Batch fetch matching products for ALL ingredients in this market
        List<Integer> ingredientIds = new ArrayList<>(totalNeeds.keySet());
        List<IngredientProduct> allMappings = recipeIngredientRepository.findProductsForIngredientsInMarket(
            ingredientIds,
            marketId
        );

        // Group mappings by Ingredient ID
        Map<Integer, List<IngredientProduct>> matchesByIngredient = allMappings.stream()
            .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

        // Build the Response
        List<IngredientGroup> groups = new ArrayList<>();

        for (Integer ingId : ingredientIds) {
            RecipeIngredient ref = ingredientRef.get(ingId);
            Double needed = totalNeeds.get(ingId);
            List<IngredientProduct> matches = matchesByIngredient.getOrDefault(ingId, List.of());

            // Convert matches into ShoppingOptions with calculated quantities
            List<ShoppingOption> options = matches.stream()
                .map(match -> createShoppingOption(match, needed))
                .sorted(Comparator.comparing(ShoppingOption::confidence).reversed()) // Best match first
                .collect(Collectors.toList());

            if (options.isEmpty()) {
                log.warn("No products found for ingredient: {} (ID: {})", ref.getIngredient().getName(), ingId);
                String ingName = ref.getIngredient().getName();
                try {
                    // Call the MarketService API using the ingredient name as the query
                    Market marketResponse = marketService.getProductsQuery(marketId, ingName);
                    
                    // If the API returns a valid market with products, add them to the options list
                    if (marketResponse != null && marketResponse.getProducts() != null) {
                        List<Product> apiProducts = marketResponse.getProducts();
                        for(Product apiProduct : apiProducts){
                            IngredientProductId igId = new IngredientProductId(ref.getIngredient().getId(),apiProduct.getId());
                            IngredientProduct ig = new IngredientProduct(igId,ref.getIngredient(),apiProduct,0.95f);
                            ShoppingOption option = createShoppingOption(ig, needed);
                            options.add(option);
                        }
                        
                        log.debug("Added {} products from API for ingredient: {}", apiProducts.size(), ingName);
                    } else {
                        log.warn("API returned no products for ingredient: {} (ID: {})", ingName, ingId);
                    }
                } catch (Exception e) {
                    log.error("Error fetching products from API for ingredient: {}", ingName, e);
                }
            }

            groups.add(new IngredientGroup(
                ingId,
                ref.getIngredient().getName(),
                needed,
                // ref.getUnit(), // e.g. "g"
                options
            ));
        }

        return new ShoppingListResponse(groups);
    }

    /**
     * Helper to calculate quantity and build the DTO.
     */
    private ShoppingOption createShoppingOption(IngredientProduct mapping, Double neededAmount) {
        Product product = mapping.getProduct();
        
        // Get product size from ML Pipeline's normalized field
        // Fallback to 1.0 to avoid DivisionByZero if data is missing
        Double productSize = product.getNormalizedAmount() != null && product.getNormalizedAmount() > 0 
                             ? product.getNormalizedAmount() 
                             : 1.0; 

        // Calculate quantity: Ceil(Need / Size)
        // e.g. Need 500g, Pack is 250g -> Buy 2
        // e.g. Need 100g, Pack is 1000g -> Buy 1
        int quantity = (int) Math.ceil(neededAmount / productSize);

        return new ShoppingOption(
            product,
            quantity,
            productSize * quantity, // Total amount you end up buying
            mapping.getConfidence() // AI Confidence score
        );
    }

    /**
     * Pre-process fuzzy matching for all ingredients in the database.
     * @return List of all generated IngredientProduct mappings.
     */
    public List<IngredientProduct> fuzzyMatchingPreProcessing() {
        List<Integer> allIngredientIds = ingredientProductRepository.findAllIngredientsIds();
        log.info("Total ingredients to process for fuzzy matching: " + allIngredientIds.size());

        List<IngredientProduct> allMatches = ingredientProductRepository.findGenericMatches(
            allIngredientIds,
            FUZZY_MATCHING_THRESHOLD,
            FUZZY_MATCHING_LIMIT
        );

        log.info("Total fuzzy matches found: " + allMatches.size());

        // Refresh the ingredient-product mappings in the database
        // ? TODO: maybe optimize this to only update changed entries or bulky additions/deletions if bad performance
        ingredientProductRepository.deleteAllInBatch();
        ingredientProductRepository.saveAll(allMatches);

        return allMatches;
    }
}
