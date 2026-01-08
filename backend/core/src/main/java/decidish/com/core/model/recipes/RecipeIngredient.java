package decidish.com.core.model.recipes;

import lombok.*;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "recipe_ingredients")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@IdClass(RecipeIngredientId.class)
public class RecipeIngredient {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;

    private String normalizedName;
    private Double quantity;
    private String unit;
}