package decidish.com.core.model.rewe;

public record Product(
        String id,
        String name,
        double price,
        String category,
        String imageUrl
) {}