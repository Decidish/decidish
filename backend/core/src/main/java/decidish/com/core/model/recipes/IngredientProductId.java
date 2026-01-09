package decidish.com.core.model.recipes;
import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class IngredientProductId implements Serializable {
    private Integer ingredientId;
    private Long productId;
} 
