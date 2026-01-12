package decidish.com.core.model.recipes;

public interface IngredientMatchProjection {
    Integer getIngredientId();
    Long getProductId();
    Float getConfidence();
}
