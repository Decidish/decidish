package decidish.com.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import decidish.com.core.model.recipes.IngredientProduct;
import decidish.com.core.model.recipes.IngredientProductId;
import io.lettuce.core.dynamic.annotation.Param;

import java.util.List;



public interface IngredientProductRepository extends JpaRepository<IngredientProduct, IngredientProductId> {
    
    @Query(value = """
        WITH match_candidates AS (
            SELECT 
                i.id AS ingredient_id,
                p.rewe_id AS rewe_val, -- Use rewe_id as the logic identifier
                MAX(similarity(i.name, p.name)) AS confidence_val
            FROM ingredients i
            CROSS JOIN (
                -- Efficiently compare against unique product names only
                SELECT DISTINCT ON (rewe_id) rewe_id, name 
                FROM products
            ) p
            WHERE i.id IN (:ingredientIds)
            AND similarity(i.name, p.name) > :threshold
            GROUP BY i.id, p.rewe_id
        ),
        ranked_matches AS (
            SELECT 
                ingredient_id,
                rewe_val,
                confidence_val,
                ROW_NUMBER() OVER (
                    PARTITION BY ingredient_id 
                    ORDER BY confidence_val DESC
                ) as rn
            FROM match_candidates
        )
        SELECT 
            ingredient_id AS ingredient_id, -- Maps to ID part 1
            rewe_val AS product_id,         -- Maps to ID part 2 (Hibernate needs this name)
            confidence_val AS confidence    -- Maps to confidence field
        FROM ranked_matches
        WHERE rn <= :limit
        ORDER BY ingredient_id, confidence_val DESC
        """, nativeQuery = true)
    List<IngredientProduct> findGenericMatches(
        @Param("ingredientIds") List<Long> ingredientIds, 
        @Param("threshold") Double threshold, 
        @Param("limit") Integer limit
    );

    @Query("SELECT i.id FROM Ingredient i")
    List<Long> findAllIngredientsIds();
}
