package decidish.com.core.model.rewe;

import java.io.Serializable;

public record ProductPrice (
    int currentRetailPrice,
    int totalRefundPrice,
    String grammage,
    Discount discount,
    LoyaltyBonus loyaltyBonus 
)implements Serializable{}