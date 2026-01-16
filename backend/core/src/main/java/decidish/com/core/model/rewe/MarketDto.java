package decidish.com.core.model.rewe;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketDto( 
    Long wwIdent,
    String name,
    String typeId,       // MARKET 
    String street, // e.g. "Keferloherstr. 75"
    String zipcode, // e.g. "80807"
    String city, // e.g "München"
    Location location, 
    ServiceFlags serviceFlags
) {} 