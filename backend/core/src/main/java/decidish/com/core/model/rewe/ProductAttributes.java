package decidish.com.core.model.rewe;

import java.io.Serializable;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "product_attributes")
@Data
@EqualsAndHashCode 
@Getter @Setter
public class ProductAttributes implements Serializable{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "is_bulky_good")
    private boolean isBulkyGood;
    @Column(name = "is_organic")
    private boolean isOrganic;
    @Column(name = "is_vegan")
    private boolean isVegan;
    @Column(name = "is_vegetarian")
    private boolean isVegetarian;
    @Column(name = "is_dairy_free")
    private boolean isDairyFree;
    @Column(name = "is_gluten_free")
    private boolean isGlutenFree;
    @Column(name = "is_biocide")
    private boolean isBiocide;
    @Column(name = "is_age_restricted")
    private boolean isAgeRestricted;
    @Column(name = "is_regional")
    private boolean isRegional;
    @Column(name = "is_new")
    private boolean isNew;
    @Column(name = "is_lowest_price")
    private boolean isLowestPrice;
    @Column(name = "is_tobacco")
    private boolean isTobacco;

    // Empty Constructor
    public ProductAttributes() {}

    // Standard Constructor
    public ProductAttributes(boolean isBulkyGood, boolean isOrganic, boolean isVegan, boolean isVegetarian,
            boolean isDairyFree, boolean isGlutenFree, boolean isBiocide, boolean isAgeRestricted, boolean isRegional,
            boolean isNew, boolean isLowestPrice, boolean isTobacco) {
        this.isBulkyGood = isBulkyGood;
        this.isOrganic = isOrganic;
        this.isVegan = isVegan;
        this.isVegetarian = isVegetarian;
        this.isDairyFree = isDairyFree;
        this.isGlutenFree = isGlutenFree;
        this.isBiocide = isBiocide;
        this.isAgeRestricted = isAgeRestricted;
        this.isRegional = isRegional;
        this.isNew = isNew;
        this.isLowestPrice = isLowestPrice;
        this.isTobacco = isTobacco;
    }

    public static ProductAttributes fromDto(ProductAttributesDto dto) {
        return new ProductAttributes(
            dto.isBulkyGood(),
            dto.isOrganic(),
            dto.isVegan(),
            dto.isVegetarian(),
            dto.isDairyFree(),
            dto.isGlutenFree(),
            dto.isBiocide(),
            dto.isAgeRestricted(),
            dto.isRegional(),
            dto.isNew(),
            dto.isLowestPrice(),
            dto.isTobacoo()
        );
    }
}
