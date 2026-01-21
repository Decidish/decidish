package decidish.com.core.model.rewe;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketSearchResponse(
        MarketSearchData data
) {}