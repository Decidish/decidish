package decidish.com.core.model.recipes;

import java.util.List;

/**
 * Represents the entire shopping list.
 * It is a list of "Needs", where each Need has multiple "Options" (Products).
 */
public record ShoppingListResponse(
    List<IngredientGroup> items
) {}

