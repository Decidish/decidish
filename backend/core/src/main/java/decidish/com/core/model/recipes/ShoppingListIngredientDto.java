package decidish.com.core.model.recipes;

public record ShoppingListIngredientDto (
    Long ingredientId,
    Double totalQuantity,
    String unit
) {}
