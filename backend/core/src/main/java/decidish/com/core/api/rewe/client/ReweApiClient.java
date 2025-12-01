package decidish.com.core.api.rewe.client;

import decidish.com.core.model.rewe.MarketSearchResponse;

// import java.util.List;

import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

/**
 * Maps to the Rewe Mobile API v3
 */
// @HttpExchange("/api/v3")
@HttpExchange("mobile-api.rewe.de/v3")
public interface ReweApiClient {

    /**
     * url = "https://..." + "/api/v3/market/search?search=" + str(zip_code)
     */
    @GetExchange("/market/search")
    MarketSearchResponse searchMarkets(@RequestParam("search") String zipCode);
    // List<MarketDto> searchMarkets(@RequestParam("search") String zipCode);

    // MarketSearchResponse searchMarkets(String postalCode);

    // List<MarketDto> getMarketsByPostalCode(String postalCode);
}