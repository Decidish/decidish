package decidish.com.core.model.rewe;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketDto( 
    String id,
    String name,
    String typeId,       // MARKET 
    String addressLine1, // e.g. "Keferloherstr. 75"
    String addressLine2, // e.g. "80807 München"
    Location location,
    RawValues rawValues
) {} 