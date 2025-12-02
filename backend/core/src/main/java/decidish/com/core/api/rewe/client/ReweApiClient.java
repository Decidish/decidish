package decidish.com.core.api.rewe.client;

import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.MarketDetailsResponse;
import decidish.com.core.model.rewe.ProductSearchResponse;

import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

@HttpExchange
public interface ReweApiClient {

    public static final String REWE_API_BASE_URL = "https://mobile-api.rewe.de/api/v3";
    public static final String REWE_CLIENT_API_BASE_URL = "https://mobile-clients-api.rewe.de/api";

    public static final String MARKET_SEARCH_PATH = "/market/search";
    public static final String MARKET_DETAILS_PATH = "/market/details";
    public static final String PRODUCT_SEARCH_PATH = "/products";

    // e.g.,
    // https://mobile-api.rewe.de/api/v3/market/search?search=80995
    @GetExchange(REWE_API_BASE_URL + MARKET_SEARCH_PATH)
    MarketSearchResponse searchMarkets(
        @RequestParam("search") String zipCode
    );

    // e.g.,
    // https://mobile-api.rewe.de/api/v3/market/details?marketId=431022
    @GetExchange(REWE_API_BASE_URL + MARKET_DETAILS_PATH)   
    MarketDetailsResponse getMarketDetails(
        @RequestParam("marketId") String marketId
    );

    // e.g.,
    // https://mobile-clients-api.rewe.de/api/products?query=Kase&page=1&objectsPerPage=30
    @GetExchange(REWE_CLIENT_API_BASE_URL + PRODUCT_SEARCH_PATH)
    ProductSearchResponse searchProducts(
        @RequestParam("query") String product,
        @RequestParam(name = "page") String page, 
        @RequestParam(name = "objectsPerPage") String objectsPerPage,
        @RequestHeader("rd-market-id") String marketId
    );
}