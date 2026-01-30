package decidish.com.core.api.rewe.client;

import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.MarketDetailsResponse;
import decidish.com.core.model.rewe.MarketPickupResponse;
import decidish.com.core.model.rewe.ProductSearchResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Wrapper for ReweApiClient that normalizes query strings before calling the external API.
 * Normalization removes special characters while keeping German characters (ä, ö, ü, ß) and whitespaces.
 */
public class NormalizedReweApiClient implements ReweApiClient {

    private static final Logger log = LoggerFactory.getLogger(NormalizedReweApiClient.class);
    private final ReweApiClient delegate;

    public NormalizedReweApiClient(ReweApiClient delegate) {
        this.delegate = delegate;
    }

    @Override
    public MarketPickupResponse searchMarkets(String zipCode) {
        return delegate.searchMarkets(zipCode);
    }

    @Override
    public MarketDetailsResponse getMarketDetails(Long marketId) {
        return delegate.getMarketDetails(marketId);
    }

    @Override
    public ProductSearchResponse searchProducts(String product, int page, int objectsPerPage, Long marketId) {
        String normalizedQuery = normalizeQuery(product);
        // log.info("REWE API Call - Original query: '{}' -> Normalized query: '{}' (marketId: {}, page: {}, objectsPerPage: {})", 
        //          product, normalizedQuery, marketId, page, objectsPerPage);
        return delegate.searchProducts(normalizedQuery, page, objectsPerPage, marketId);
    }

    /**
     * Normalizes a query string by removing special characters.
     * Keeps only: a-z, A-Z, German characters (ä, ö, ü, Ä, Ö, Ü, ß), and whitespaces.
     * 
     * @param query the original query string
     * @return the normalized query string
     */
    private String normalizeQuery(String query) {
        if (query == null) {
            return null;
        }
        
        // Remove all characters except: letters (including German), numbers, and whitespace
        // German characters: ä, ö, ü, Ä, Ö, Ü, ß
        return query.replaceAll("[^a-zA-ZäöüÄÖÜß\\s]", " ")
                    .trim()
                    .replaceAll("\\s+", " "); // Replace multiple spaces with single space
    }
}
