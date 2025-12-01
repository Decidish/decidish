package decidish.com.core.model.rewe;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketDto( 
    Long id,
    String name,
    Address address
    // boolean isOpen
) {} 