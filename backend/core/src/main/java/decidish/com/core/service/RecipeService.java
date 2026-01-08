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
import java.util.function.DoubleBinaryOperator;

import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.model.recipes.RecipeIngredient;
import decidish.com.core.model.recipes.ShoppingListResponse;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.recipes.IngredientProduct;
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
    
    // TODO: testing 
    // TODO: add alternatives? ------> create ShoppingListItem with List<Product> alternatives?
    // TODO: quantities? ------------> create ShoppingListItem with quantity field? (also in alternatives?)
    // public List<Product> generateShoppingList(Long marketId, List<Long> recipeIds) {

    //     // 1. Get aggregated ingredients for the selected recipes
    //     List<RecipeIngredient> recipe_ingredient = recipeIngredientRepository.findForShoppingList(recipeIds);

    //     // 2. Create list of ingredient ids
    //     List<Long> ingredients = recipe_ingredient.stream()
    //         .map(ri -> ri.getIngredient().getId())
    //         .distinct()
    //         .toList();

    //     // 3. For each ingredient, find matching products in the specified market

    //     // We assume that matchings are already done with a certain confidence
    //     List<IngredientProduct> allMappings = recipeIngredientRepository.findProductsForIngredientsInMarket(
    //         ingredients,
    //         marketId
    //     );

    //     // 4. Group by ingredient (to pick best match later, and have alternatives stored)
    //     Map<Long, List<IngredientProduct>> groupedByIngredient = allMappings.stream()
    //         .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

    //     // 5. For each ingredient in the shopping list, pick the best matching product
    //     List<Product> shoppingList = recipe_ingredient.stream()
    //         .map(ri -> {
    //             List<IngredientProduct> matches = groupedByIngredient.get(ri.getIngredient().getId());
    //             if (matches != null && !matches.isEmpty()) {
    //                 // Pick the product with highest confidence
    //                 return matches.get(0).getProduct();
    //             } else {
    //                 log.warn("No matching product found for ingredient ID: " + ri.getIngredient().getId());
    //                 return null;
    //             }
    //         })
    //         .filter(p -> p != null)
    //         .collect(Collectors.toList());

    //     return shoppingList;
    // }
    /**
     * Generates a shopping list with alternatives and quantities.
     */
    public ShoppingListResponse generateShoppingList(Long marketId, List<Long> recipeIds) {

        // Fetch all raw ingredients for the selected recipes
        List<RecipeIngredient> rawIngredients = recipeIngredientRepository.findForShoppingList(recipeIds);

        // Aggregation: Sum amounts for the same Ingredient ID
        // (e.g., Recipe A needs 200g Flour, Recipe B needs 300g Flour -> Total 500g)
        Map<Long, Double> totalNeeds = new HashMap<>();
        Map<Long, RecipeIngredient> ingredientRef = new HashMap<>(); // Keep reference to get Name/Unit

        for (RecipeIngredient ri : rawIngredients) {
            Long ingId = ri.getIngredient().getId();
            // The quantity of the ingredients is already normalize
            Double amount = ri.getQuantity() != null ? ri.getQuantity() : 0.0;
            
            totalNeeds.merge(ingId, amount, Double::sum);
            ingredientRef.putIfAbsent(ingId, ri);
        }

        // Batch fetch matching products for ALL ingredients in this market
        List<Long> ingredientIds = new ArrayList<>(totalNeeds.keySet());
        List<IngredientProduct> allMappings = recipeIngredientRepository.findProductsForIngredientsInMarket(
            ingredientIds,
            marketId
        );

        // Group mappings by Ingredient ID
        Map<Long, List<IngredientProduct>> matchesByIngredient = allMappings.stream()
            .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

        // Build the Response
        List<IngredientGroup> groups = new ArrayList<>();

        for (Long ingId : ingredientIds) {
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
        List<Long> allIngredientIds = ingredientProductRepository.findAllIngredientsIds();
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
