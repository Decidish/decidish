package decidish.com.core.model.rewe;

import java.util.List;

public record MarketSearchResponse(
        List<MarketDto> items,
        int totalCount
) {}