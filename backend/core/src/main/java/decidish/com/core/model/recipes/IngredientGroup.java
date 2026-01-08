package decidish.com.core.model.recipes;
import java.util.List;

/**
 * Represents one Ingredient required by the recipes (e.g., "Flour - 500g")
 */
public record IngredientGroup(
    Long ingredientId,
    String ingredientName,
    Double totalAmountNeeded, // The sum of all recipes (e.g. 500.0)
    // String unit,              // e.g. "g"
    List<ShoppingOption> options // The list of products that fulfill this need
) {}

