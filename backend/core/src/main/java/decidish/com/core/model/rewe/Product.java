package decidish.com.core.model.rewe;

import java.util.List;

public record Product(
        Long productId,
        String title,
        String imageURL,
        ProductAttributes attributes,
        List<String> categories,
        String articleId,
        ProductPrice listing
) {}