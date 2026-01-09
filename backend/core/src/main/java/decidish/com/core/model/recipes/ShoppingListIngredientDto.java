package decidish.com.core.model.recipes;

public record ShoppingListIngredientDto (
    Integer ingredientId,
    Double totalQuantity,
    String unit
) {}
