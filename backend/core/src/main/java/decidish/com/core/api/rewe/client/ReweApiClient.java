package decidish.com.core.api.rewe.client;

import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.MarketDetailsResponse;
import decidish.com.core.model.rewe.MarketPickupResponse;
import decidish.com.core.model.rewe.ProductSearchResponse;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

@HttpExchange
public interface ReweApiClient {

    public static final String REWE_API_BASE_URL = "https://mobile-clients-api.rewe.de/api";

    public static final String MARKET_SEARCH_PATH = "/stationary-markets";
    public static final String MARKET_PICKUP_PATH = "/service-portfolio/";
    public static final String MARKET_DETAILS_PATH = "/stationary-markets/{marketId}";
    public static final String PRODUCT_SEARCH_PATH = "/products";

    // e.g.,
    // https://mobile-client-api.rewe.de/api/stationary-market?search=80995
    @GetExchange(REWE_API_BASE_URL + MARKET_SEARCH_PATH)
    MarketSearchResponse searchMarkets(
        @RequestParam("search") String zipCode
    );
    // String searchMarkets(
    //     @RequestParam("search") String zipCode
    // );

    @GetExchange(REWE_API_BASE_URL + MARKET_PICKUP_PATH)
    MarketPickupResponse searchMarketsPickup(
        @RequestParam("plz") String zipCode
    );

    //! NO LONG NECESSARY
    // e.g.,
    // https://mobile-client-api.rewe.de/api/stationary-markets/marketId=431022
    @GetExchange(REWE_API_BASE_URL + MARKET_DETAILS_PATH)   
    MarketDetailsResponse getMarketDetails(
        @PathVariable("marketId") Long marketId
    );

    // e.g.,
    // https://mobile-clients-api.rewe.de/api/products?query=Kase&page=1&objectsPerPage=30
    @GetExchange(REWE_API_BASE_URL + PRODUCT_SEARCH_PATH)
    ProductSearchResponse searchProducts(
        @RequestParam("query") String product,
        @RequestParam(name = "page") int page, 
        @RequestParam(name = "objectsPerPage") int objectsPerPage,
        @RequestHeader("rd-market-id") Long marketId
    );
}