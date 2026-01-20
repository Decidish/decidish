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
@CrossOrigin(origins = {"http://localhost:3000", "https://qa.decidish.win"}, allowCredentials = "true")
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

    /**
     * Triggers the global fuzzy matching pre-processing.
     * Use this to refresh the Ingredient -> ReweID mappings.
     * * Endpoint: POST /shopping-list/match
     */
    @PostMapping("/match")
    public ResponseEntity<String> runFuzzyMatching() {
        log.info("Starting global fuzzy matching pre-processing...");
        
        try {
            var mappings = recipeService.fuzzyMatchingPreProcessing();
            log.info("Fuzzy matching completed. Created {} global mappings.", mappings.size());
            
            return ResponseEntity.ok("Successfully generated " + mappings.size() + " mappings.");
        } catch (Exception e) {
            log.error("Fuzzy matching failed: ", e);
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
}