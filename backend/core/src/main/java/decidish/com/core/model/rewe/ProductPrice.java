package decidish.com.core.model.rewe;

public record ProductPrice (
    Long currentRetailPrice,
    Long totalRefundPrice,
    String grammage,
    Discount discount,
    String loyaltyBonus 
){}