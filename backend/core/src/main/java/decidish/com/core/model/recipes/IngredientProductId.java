package decidish.com.core.model.recipes;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class IngredientProductId implements java.io.Serializable {
    private Long ingredientId;
    private Long productId;
} 
