package decidish.com.core.api.rewe.client;

import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.MarketDetailsResponse;
import decidish.com.core.model.rewe.ProductSearchResponse;

import org.hibernate.validator.constraints.URL;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

// import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

import java.net.URI;

/**
 * Maps to the Rewe Mobile API v3
 */
// @HttpExchange("/api/v3")
@HttpExchange
public interface ReweApiClient {

    /**
     * url = "https://..." + "/api/v3/market/search?search=" + str(zip_code)
     */

    @GetExchange
    MarketSearchResponse searchMarkets(
        URI uri,
        @RequestParam("search") String zipCode
    );

    @GetExchange
    MarketDetailsResponse getMarketDetails(
        URI uri, 
        @RequestParam("marketId") String marketId
    );

    @GetExchange
    ProductSearchResponse searchProducts(
        URI uri, 
        @RequestParam("query") String product,
        @RequestParam("page") int page, 
        @RequestParam("objectsPerPage") int objectPerPage, 
        @RequestParam("marketId") Long marketId
    );
}