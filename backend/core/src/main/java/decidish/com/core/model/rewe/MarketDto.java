package decidish.com.core.model.rewe;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketDto( 
    // Long id,
    // String name,
    // Address address
    // boolean isOpen

    @JsonProperty("wwIdent") 
    String id,
    
    // Maps JSON's public-facing name to 'name'
    @JsonProperty("displayName") 
    String name,
    
    // Maps basic address components (Note: JSON is flat, so these are not nested objects)
    @JsonProperty("zipCode") 
    String zipCode,
    
    @JsonProperty("street") 
    String street,
    
    @JsonProperty("city") 
    String city,
    
    // House number can be null in the JSON
    @JsonProperty("houseNumber") 
    String houseNumber,

    // Maps geographical data
    @JsonProperty("latitude") 
    String latitude,
    
    @JsonProperty("longitude") 
    String longitude,
    
    // Maps auxiliary details
    @JsonProperty("distance") 
    Integer distance,

    @JsonProperty("companyName") 
    String companyName,
    
    @JsonProperty("pickupStation") 
    Boolean pickupStation,

    @JsonProperty("isPickupStation") 
    Boolean isPickupStation
) {} 