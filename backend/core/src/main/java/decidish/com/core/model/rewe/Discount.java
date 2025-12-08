package decidish.com.core.model.rewe;

import java.io.Serializable;

public record Discount (
    String __typename, // e.g. RegularProductDiscount
    String validto // e.g. 07.12.
)implements Serializable{}
