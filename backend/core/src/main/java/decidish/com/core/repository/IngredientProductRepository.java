package decidish.com.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import decidish.com.core.model.recipes.IngredientProduct;
import decidish.com.core.model.recipes.IngredientProductId;
import java.util.List;



public interface IngredientProductRepository extends JpaRepository<IngredientProduct, IngredientProductId> {
    
    @Query(
        value = """
            WITH ranked_matches AS (
                SELECT
                    i.id AS ingredient_id,
                    p.rewe_id AS rewe_id,
                    MAX(similarity(i.name, p.name)) AS confidence,
                    ROW_NUMBER() OVER (
                        PARTITION BY i.id
                        ORDER BY MAX(similarity(i.name, p.name)) DESC
                    ) AS rn
                FROM ingredients i
                JOIN ingredient_product ip
                    ON ip.ingredient_id = i.id
                JOIN products p
                    ON p.id = ip.product_id
                WHERE i.id IN (:ingredientIds)
                AND similarity(i.name, p.name) > :threshold
                GROUP BY i.id, p.rewe_id
            )
            SELECT
                ingredient_id,
                rewe_id,
                confidence
            FROM ranked_matches
            WHERE rn <= :limit
            ORDER BY ingredient_id, confidence DESC
            """,
        nativeQuery = true
    )
    List<IngredientProduct> findGenericMatches(List<Long> ingredientIds, Double threshold, Integer limit);

    @Query("SELECT i.id FROM Ingredient i")
    List<Long> findAllIngredientsIds();
}
