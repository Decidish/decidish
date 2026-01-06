package decidish.com.core.model.recipes;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "recipes")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String title;

    // @Column(columnDefinition = "TEXT")
    // private String description;

    // @Column(columnDefinition = "TEXT")
    // private String instructions;

    private Integer cookTime;
    private Integer prepTime;
    private Integer totalTime;

    private String image;
    private Float rating;
    private String servingSize;
    private String calories;

    @OneToMany(
        mappedBy = "recipe",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<RecipeIngredient> ingredients = new ArrayList<>();
}

