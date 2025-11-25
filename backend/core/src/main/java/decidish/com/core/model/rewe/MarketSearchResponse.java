package decidish.com.core.model.rewe;

import java.util.List;

public record MarketSearchResponse(
        List<Market> items,
        int totalCount
) {}