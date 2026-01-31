package decidish.com.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import decidish.com.core.model.recipes.IngredientMatchProjection;
import decidish.com.core.model.recipes.IngredientProduct;
import decidish.com.core.model.recipes.IngredientProductId;
import jakarta.transaction.Transactional;

import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IngredientProductRepository extends JpaRepository<IngredientProduct, IngredientProductId> {
    
    @Query("SELECT i.id FROM Ingredient i")
    List<Integer> findAllIngredientsIds();

    /**
     * Multi-tier matching strategy to MAXIMIZE matches:
     * 
     * Tier 1 (confidence 0.95-1.0): Exact substring match 
     *         - Ingredient name is contained in product name
     *         
     * Tier 2 (confidence 0.70-0.94): Word containment match
     *         - Most words of ingredient appear in product name
     *         
     * Tier 3 (confidence 0.50-0.69): Full-text search match
     *         - PostgreSQL tsvector/tsquery German dictionary match
     *         
     * Tier 4 (confidence 0.30-0.49): Trigram similarity fallback
     *         - pg_trgm similarity for fuzzy matching edge cases
     *         
     * Uses materialized view 'unique_products' for efficiency (20k vs 120k rows)
     * All tiers contribute matches - not mutually exclusive.
     */
    @Query(value = """
        WITH 
        -- Tier 1: Exact substring matches (highest confidence)
        substring_matches AS (
            SELECT 
                i.id AS ingredient_id,
                p.rewe_id,
                0.95 + (0.05 * (length(i.normalized_name)::float / GREATEST(length(p.normalized_name), 1)::float)) AS confidence
            FROM ingredients i
            JOIN unique_products p ON p.normalized_name LIKE '%' || i.normalized_name || '%'
            WHERE i.id IN (:ingredientIds)
              AND length(i.normalized_name) >= 3
        ),
        
        -- Tier 2: Word containment matches (for ALL ingredients, not just unmatched)
        word_matches AS (
            SELECT 
                i.id AS ingredient_id,
                p.rewe_id,
                0.70 + (0.24 * word_match_score(i.normalized_name, p.normalized_name)) AS confidence
            FROM ingredients i
            CROSS JOIN unique_products p
            WHERE i.id IN (:ingredientIds)
              AND word_match_score(i.normalized_name, p.normalized_name) >= 0.5
        ),
        
        -- Tier 3: Full-text search matches
        fts_matches AS (
            SELECT 
                i.id AS ingredient_id,
                p.rewe_id,
                0.50 + (0.19 * LEAST(ts_rank(p.name_tsv, plainto_tsquery('german', i.name)), 1.0)) AS confidence
            FROM ingredients i
            CROSS JOIN unique_products p
            WHERE i.id IN (:ingredientIds)
              AND p.name_tsv @@ plainto_tsquery('german', i.name)
        ),
        
        -- Tier 4: Trigram similarity fallback (catches remaining edge cases)
        trigram_matches AS (
            SELECT 
                i.id AS ingredient_id,
                p.rewe_id,
                0.30 + (0.19 * similarity(i.normalized_name, p.normalized_name)) AS confidence
            FROM ingredients i
            CROSS JOIN unique_products p
            WHERE i.id IN (:ingredientIds)
              AND similarity(i.normalized_name, p.normalized_name) > :threshold
        ),
        
        -- Combine all tiers and deduplicate (keep highest confidence per ingredient-product pair)
        all_matches AS (
            SELECT ingredient_id, rewe_id, MAX(confidence) as confidence
            FROM (
                SELECT ingredient_id, rewe_id, confidence FROM substring_matches
                UNION ALL
                SELECT ingredient_id, rewe_id, confidence FROM word_matches
                UNION ALL
                SELECT ingredient_id, rewe_id, confidence FROM fts_matches
                UNION ALL
                SELECT ingredient_id, rewe_id, confidence FROM trigram_matches
            ) combined
            GROUP BY ingredient_id, rewe_id
        ),
        
        -- Rank and limit matches per ingredient
        ranked_matches AS (
            SELECT 
                ingredient_id,
                rewe_id,
                confidence,
                ROW_NUMBER() OVER (
                    PARTITION BY ingredient_id 
                    ORDER BY confidence DESC
                ) AS rn
            FROM all_matches
        )
        
        SELECT 
            ingredient_id AS ingredientId, 
            rewe_id AS productId, 
            confidence::real AS confidence
        FROM ranked_matches
        WHERE rn <= :limit
        ORDER BY ingredient_id, confidence DESC
        """, nativeQuery = true)
    List<IngredientMatchProjection> findGenericMatches(
        @Param("ingredientIds") List<Integer> ingredientIds, 
        @Param("threshold") Double threshold, 
        @Param("limit") Integer limit
    );

    /**
     * Refresh the unique_products materialized view.
     * Should be called after product sync completes.
     */
    @Modifying
    @Transactional
    @Query(value = "REFRESH MATERIALIZED VIEW CONCURRENTLY unique_products", nativeQuery = true)
    void refreshUniqueProductsView();
}
