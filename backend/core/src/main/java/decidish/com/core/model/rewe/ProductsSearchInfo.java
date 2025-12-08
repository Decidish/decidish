package decidish.com.core.model.rewe;

import java.util.List;

public record ProductsSearchInfo (
    Pagination pagination,
    List<ProductDto> products
){}
