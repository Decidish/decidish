package decidish.com.core.model.rewe;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketDto( 
    Long id,
    String name,
    String typeId,       // 
    String addressLine1, // e.g. "Keferloherstr. 75"
    String addressLine2, // e.g. "80807 München"
    Location location,
    RawValues rawValues
) {} 