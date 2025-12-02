package decidish.com.core.model.rewe;

import java.util.List;

public record Product(
        Long id,
        String name,
        String imageURL,
        ProductAttributes attributes,
        List<String> categories,
        String articleId,
        ProductPrice listing
) {}