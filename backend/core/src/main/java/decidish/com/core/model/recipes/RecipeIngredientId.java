package decidish.com.core.model.recipes;
import lombok.*;
import java.io.Serializable;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class RecipeIngredientId implements Serializable {

    private Long recipe;
    private Long ingredient;
}