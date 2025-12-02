package decidish.com.core.model.rewe;

public record Discount (
    String type, // e.g. RegularProductDiscount
    String validto // e.g. 07.12.
){}
