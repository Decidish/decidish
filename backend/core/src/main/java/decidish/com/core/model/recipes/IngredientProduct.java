package decidish.com.core.model.recipes;
import decidish.com.core.model.rewe.Product;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ingredient_product")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class IngredientProduct {

    @EmbeddedId
    private IngredientProductId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("ingredientId")
    private Ingredient ingredient;

    private float confidence;
}
