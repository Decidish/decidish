package decidish.com.core.model.rewe;

public record Discount (
    String __typename, // e.g. RegularProductDiscount
    String validto // e.g. 07.12.
){}
