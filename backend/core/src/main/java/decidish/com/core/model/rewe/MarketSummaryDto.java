package decidish.com.core.model.rewe;

import java.io.Serializable;

// A lightweight record that carries only the info needed for the selection screen
public record MarketSummaryDto(
    Long id,
    String name,
    Address address,
    // Placeholders for frontend UI fields not yet in DB
    String distance,
    String hours,
    Double rating,
    String image
) implements Serializable {
    
    // Helper constructor to map from Entity
    public static MarketSummaryDto fromEntity(Market market) {
        return new MarketSummaryDto(
            market.getId(),
            market.getName(),
            market.getAddress(),
            "Unknown",        // Default distance
            "07:00 - 22:00",  // Default hours
            4.5,              // Default rating
            null              // Image URL
        );
    }
}