package decidish.com.core.model.recipes;
import java.util.List;

/**
 * Represents one Ingredient required by the recipes (e.g., "Flour - 500g")
 */
public record IngredientGroup(
    Integer ingredientId,
    String ingredientName,           // Normalized ingredient name (from ingredients table)
    String originalIngredientName,   // Original ingredient text from recipe (from recipe_ingredients.original)
    Double totalAmountNeeded,        // The sum of all recipes (e.g. 500.0)
    List<ShoppingOption> options     // The list of products that fulfill this need
) {}

