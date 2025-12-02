package decidish.com.core.model.rewe;

public record ProductPrice (
    Long currectRetailPrice,
    Long totalRefundPrice,
    String grammage,
    Discount discount,
    String loyaltyBonus 
){}