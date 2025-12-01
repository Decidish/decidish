package decidish.com.core.api.rewe.client;

import decidish.com.core.model.rewe.MarketDto;

import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

// import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

/**
 * Maps to the Rewe Mobile API v3
 */
// @HttpExchange("/api/v3")
// @HttpExchange("mobile-api.rewe.de/v3")
// @HttpExchange("/v3")
@HttpExchange("/shop/api")
public interface ReweApiClient {

    /**
     * url = "https://..." + "/api/v3/market/search?search=" + str(zip_code)
     */
    // @GetExchange("v3/market/search")
    @GetExchange("/marketselection/zipcodes/{zip}/services/pickup")
    // MarketSearchResponse searchMarkets(@RequestParam("search") String zipCode);
    // MarketSearchResponse searchMarkets(@PathVariable("zip") String zipCode);
    List<MarketDto> searchMarkets(@PathVariable("zip") String zipCode);
    // List<MarketDto> searchMarkets(@RequestParam("search") String zipCode);

    // MarketSearchResponse searchMarkets(String postalCode);

    // List<MarketDto> getMarketsByPostalCode(String postalCode);
}