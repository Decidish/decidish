package decidish.com.core.model.rewe;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketDetailsResponse(
    MarketDto marketItem,
    List<OpeningTime> openingTimes,
    List<OpeningTime> specialOpeningTimes
) {}