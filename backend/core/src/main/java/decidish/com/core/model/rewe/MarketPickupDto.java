package decidish.com.core.model.rewe;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketPickupDto( 
    Long wwIdent,
    String displayName,
    String companyName,
    boolean isPickupStation,
    String signedMapsUrl,
    double latitude,
    double longitude,
    String zipCode,
    String streetWithHouseNumber,
    String city,
    String pickupType
) {}