package decidish.com.core.model.rewe;

import java.io.Serializable;

public record LoyaltyBonus (
    int bonusValue,
    String bonusType
)implements Serializable{}
