package decidish.com.core.model.rewe;

public record Product(
        String id,
        String name,
        String brand,
        String grammage, // e.g 500g
        double currentPrice,
        String category,
        String imageUrl,
        boolean isAvailable
) {}