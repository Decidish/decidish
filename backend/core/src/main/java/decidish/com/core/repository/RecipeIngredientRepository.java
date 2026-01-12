package decidish.com.core.repository;
import decidish.com.core.model.recipes.IngredientProduct;
import decidish.com.core.model.recipes.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import decidish.com.core.model.recipes.RecipeIngredientId;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;


public interface RecipeIngredientRepository
        extends JpaRepository<RecipeIngredient, RecipeIngredientId> {

    @Query("""
        SELECT new decidish.com.core.model.recipes.RecipeIngredient(
            ri.recipe,
            ri.ingredient,
            SUM(ri.quantity),
            ri.unit
        )
        FROM RecipeIngredient ri
        WHERE ri.recipe.id IN :recipeIds
        GROUP BY
            ri.recipe,
            ri.ingredient,
            ri.unit
    """)
    List<RecipeIngredient> findForShoppingList(
            @Param("recipeIds") List<Integer> recipeIds
    );
    

    @Query("SELECT ip FROM IngredientProduct ip, Product p " +
       "WHERE ip.id.productId = p.reweId " +
       "AND ip.id.ingredientId IN :ingredientIds " +
       "AND p.market.id = :marketId")
    List<IngredientProduct> findProductsForIngredientsInMarket(
        @Param("ingredientIds") List<Integer> ingredientIds,
        @Param("marketId") Long marketId
    );
}

