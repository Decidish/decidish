package decidish.com.core.model.rewe;

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
){}
