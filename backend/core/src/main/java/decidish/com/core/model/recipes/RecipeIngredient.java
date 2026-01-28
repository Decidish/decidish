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

    private BigDecimal quantity;
    private String unit;

    @Column(columnDefinition = "TEXT")
    private String original;

    @Column(columnDefinition = "TEXT")
    private String info;

    // Constructor
    public RecipeIngredient(Recipe recipe, Ingredient ingredient, BigDecimal quantity, String unit) {
        this.recipe = recipe;
        this.ingredient = ingredient;
        this.quantity = quantity;
        this.unit = unit;
        this.original = this.ingredient.getName();
        this.info = "";
    }
}