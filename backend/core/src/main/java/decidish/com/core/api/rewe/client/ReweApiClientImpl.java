// package decidish.com.core.api.rewe.client;

// import decidish.com.core.model.rewe.MarketSearchResponse;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.stereotype.Service;
// import org.springframework.web.client.RestTemplate;

// @Service
// public class ReweApiClientImpl implements ReweApiClient {

//     private final RestTemplate restTemplate;
//     private final String apiUrl;

//     // We inject the RestTemplate and the base URL
//     public ReweApiClientImpl(RestTemplate restTemplate, @Value("${rewe.api.baseurl}") String apiUrl) {
//         this.restTemplate = restTemplate;
//         this.apiUrl = apiUrl;
//     }

//     @Override
//     public MarketSearchResponse searchMarkets(String postalCode) {
//         // Construct the full URL for the API call
//         String fullUrl = String.format("%s/marketselection/zipcodes/%s", apiUrl, postalCode);

//         // Make the GET request and map the JSON response directly to our Java object
//         // NOTE: This assumes successful connection. Error handling would be added in a complete implementation.
//         return restTemplate.getForObject(fullUrl, MarketSearchResponse.class);
//     }
// }

package decidish.com.core.api.rewe.client;

import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.model.rewe.MarketSearchResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Component
public class ReweApiClientImpl implements ReweApiClient {

    private static final Logger log = LoggerFactory.getLogger(ReweApiClient.class);
    private final RestTemplate restTemplate;

    // Base URL discovered from reverse-engineering snippets (Source 1.3)
    private static final String MARKET_SEARCH_BASE_URL = "https://shop.rewe.de/api/marketselection/zipcodes/{zipCode}/services/pickup";

    public ReweApiClientImpl(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public MarketSearchResponse searchMarkets(String postalCode) {
        List<MarketDto> markets = getMarketsByPostalCode(postalCode);
        System.out.println("Retrieved " + (markets == null ? 0 : markets.size()) + " markets from REWE API for postal code: " + postalCode);
        MarketSearchResponse response = new MarketSearchResponse(
            markets == null ? Collections.<MarketDto>emptyList() : markets,
            markets == null ? 0 : markets.size()
        );
        // response.setMarkets(markets == null ? Collections.emptyList() : markets);
        return response; 
    }

    // @Override
    // public List<MarketDto> searchMarkets(String postalCode) {
    //     List<MarketDto> markets = getMarketsByPostalCode(postalCode);
    //     return markets;
    // }

    /**
     * Calls the external REWE API to find markets near a given postal code.
     * @param postalCode The 5-digit postal code.
     * @return A list of MarketDto objects retrieved from the API.
     */
    @Override
    public List<MarketDto> getMarketsByPostalCode(String postalCode) {
        // Assuming MARKET_SEARCH_BASE_URL is defined as a constant ending in the path
        String url = MARKET_SEARCH_BASE_URL.replace("{zipCode}", postalCode); 
        
        // Example: MARKET_SEARCH_BASE_URL = "https://www.rewe.de/shop/api/marketselection/zipcodes/{zipCode}/services/pickup"
        
        log.info("Calling external REWE API for postal code: {}", postalCode);

        try {
            // The response is an array of market objects.
            MarketDto[] marketArray = restTemplate.getForObject(url, MarketDto[].class);

            if (marketArray != null) {
                log.info("Successfully retrieved {} markets from the external API.", marketArray.length);
                return Arrays.asList(marketArray);
            }
            return Collections.emptyList();
            
        } catch (Exception e) {
            // FIX: Log the full exception object (e), not just the message.
            // This will print the stack trace and the exact error (e.g., UnrecognizedPropertyException, HttpClientErrorException, etc.)
            log.error("Failed to call REWE Market API for {}. Returning empty list.", postalCode, e);
            
            return Collections.emptyList();
        }
    }
}