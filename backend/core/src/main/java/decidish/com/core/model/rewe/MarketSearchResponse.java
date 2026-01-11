package decidish.com.core.model.rewe;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketSearchResponse(
        List<MarketDto> markets
) {}