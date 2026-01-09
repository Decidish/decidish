package decidish.com.core.controller;

import decidish.com.core.model.recipes.ShoppingListResponse;
import decidish.com.core.service.RecipeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/shopping-list")
@RequiredArgsConstructor
@Slf4j
public class RecipeController {

    private final RecipeService recipeService;

    /**
     * Generates a shopping list for the given recipes, optimizing for the specific market.
     * * Endpoint: POST /shopping-list/generate?marketId={id}
     * Body: [1, 5, 10] (List of Recipe IDs)
     * * @param marketId The ID of the market to fetch prices/products from (Query Param).
     * @param recipeIds The list of recipe IDs selected by the user (Request Body).
     * @return A structured shopping list with best-match products.
     */
    @PostMapping("/generate")
    public ResponseEntity<ShoppingListResponse> generateShoppingList(
            @RequestParam("marketId") Long marketId,
            @RequestBody List<Integer> recipeIds) {
        
        log.info("Generating shopping list for Market ID: {} with {} recipes", marketId, recipeIds.size());
        
        if (recipeIds == null || recipeIds.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        ShoppingListResponse response = recipeService.generateShoppingList(marketId, recipeIds);
        return ResponseEntity.ok(response);
    }
}