package decidish.com.core.model.rewe;

public record ProductPrice (
    int currentRetailPrice,
    int totalRefundPrice,
    String grammage,
    Discount discount,
    LoyaltyBonus loyaltyBonus 
){}