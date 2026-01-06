package decidish.com.core.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;

import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.model.recipes.RecipeIngredient;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.recipes.IngredientProduct;

// Final purpose: generate shopping list from selected recipes
@Service
public class RecipeService {
    
    private static final Logger log = LoggerFactory.getLogger(RecipeService.class);
    
    @Autowired
    private MarketService marketService;

    @Autowired
    private RecipeIngredientRepository recipeIngredientRepository;
    
    // TODO: testing CRITICAL
    // TODO: add alternatives? ------> create ShoppingListItem with List<Product> alternatives?
    // TODO: quantities? ------------> create ShoppingListItem with quantity field? (also in alternatives?)
    public List<Product> generateShoppingList(Long marketId, List<Long> recipeIds) {

        // 1. Get aggregated ingredients for the selected recipes
        List<RecipeIngredient> recipe_ingredient = recipeIngredientRepository.findForShoppingList(recipeIds);

        // 2. Create list of ingredient ids
        List<Long> ingredients = recipe_ingredient.stream()
            .map(ri -> ri.getIngredient().getId())
            .distinct()
            .toList();

        // 3. For each ingredient, find matching products in the specified market

        // We assume that matchings are already done with a certain confidence
        List<IngredientProduct> allMappings = recipeIngredientRepository.findProductsForIngredientsInMarket(
            ingredients,
            marketId
        );

        // 4. Group by ingredient (to pick best match later, and have alternatives stored)
        Map<Long, List<IngredientProduct>> groupedByIngredient = allMappings.stream()
            .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

        // 5. For each ingredient in the shopping list, pick the best matching product
        List<Product> shoppingList = recipe_ingredient.stream()
            .map(ri -> {
                List<IngredientProduct> matches = groupedByIngredient.get(ri.getIngredient().getId());
                if (matches != null && !matches.isEmpty()) {
                    // Pick the product with highest confidence
                    return matches.get(0).getProduct();
                } else {
                    log.warn("No matching product found for ingredient ID: " + ri.getIngredient().getId());
                    return null;
                }
            })
            .filter(p -> p != null)
            .collect(Collectors.toList());

        return shoppingList;
    }
}
