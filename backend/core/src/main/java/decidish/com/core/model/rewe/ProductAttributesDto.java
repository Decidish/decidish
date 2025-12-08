package decidish.com.core.model.rewe;

import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public record ProductAttributesDto (
    boolean isBulkyGood,
    boolean isOrganic,
    boolean isVegan,
    boolean isVegetarian,
    boolean isDairyFree,
    boolean isGlutenFree,
    boolean isBiocide,
    boolean isAgeRestricted,
    boolean isRegional,
    boolean isNew,
    boolean isLowestPrice,
    boolean isTobacoo   
) implements Serializable {}
