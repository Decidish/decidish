package decidish.com.core.model.rewe;

import java.io.Serializable;
import java.util.List;

public record ProductDto(
        Long productId,
        String title,
        String imageURL,
        ProductAttributesDto attributes,
        int orderLimit,
        List<String> categories,
        String articleId,
        ProductPrice listing
) implements Serializable {}