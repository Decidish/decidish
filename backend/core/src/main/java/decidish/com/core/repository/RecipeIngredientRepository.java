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

    // @Query("""
    //     SELECT ri.recipe, ri.ingredient, SUM(ri.quantity) as totalQuantity, ri.unit
    //     FROM RecipeIngredient ri
    //     WHERE ri.recipe.id IN :recipeIds
    //     GROUP BY ri.recipe, ri.ingredient, ri.unit
    // """)

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
            @Param("recipeIds") List<Long> recipeIds
    );

    // TODO: change this when changing market-product relation to many-to-many
    @Query("""
        SELECT ip
        FROM IngredientProduct ip
        WHERE ip.ingredient.id = :ingredientId
          AND ip.product.market.id = :marketId
        ORDER BY ip.confidence DESC
    """)

    // @Query("""
    //     SELECT ip.product
    //     FROM IngredientProduct ip
    //     WHERE ip.ingredient.id = :ingredientId
    //       AND :marketId IN (
    //         SELECT m.id 
    //         FROM MarketProduct mp
    //         WHERE mp.product.id = ip.product.id
    //       )
    // """)
    
    List<IngredientProduct> findProductsForIngredientInMarket(
            @Param("ingredientId") Long ingredientId,
            @Param("marketId") Long marketId
    );


    // For multiple ingredients (more efficient than a for, requires mapping a posteriori)
    @Query("""
        SELECT ip
        FROM IngredientProduct ip
        WHERE ip.ingredient.id IN :ingredientIds
        AND ip.product.market.id = :marketId
        ORDER BY ip.ingredient.id, ip.confidence DESC
    """)

    // @Query("""
    //     SELECT ip.product
    //     FROM IngredientProduct ip
    //     WHERE ip.ingredient.id IN :ingredientIds
    //       AND :marketId IN (
    //         SELECT m.id 
    //         FROM MarketProduct mp
    //         WHERE mp.product.id = ip.product.id
    //       )
    //     ORDER BY ip.ingredient.id, ip.confidence DESC
    // """)

    List<IngredientProduct> findProductsForIngredientsInMarket(
            @Param("ingredientIds") List<Long> ingredientIds,
            @Param("marketId") Long marketId
    );
}

