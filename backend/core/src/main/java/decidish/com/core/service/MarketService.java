package decidish.com.core.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.cache.Cache;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.ProductDto;
import decidish.com.core.model.rewe.ProductSearchResponse;
import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.repository.MarketRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
// @RequiredArgsConstructor
public class MarketService {

    private static final Logger log = LoggerFactory.getLogger(MarketService.class);
    private final int TTL_WEEKS_MARKET = 1;
    private final int TTL_WEEKS_PRODUCTS = 4;
    private final int DEFAULT_OBJECTS_PER_PAGE = 250; // Default number of objects per page from REWE API
                                                      
    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private ReweApiClient apiClient;

    // We inject the context to allow self-invocation (calling methods via proxy)
    // Alternatively, move saveAndRefresh to a separate component.
    @Autowired
    @Lazy
    private MarketService self; 
    
    // For Unit Testing support
    public void setSelf(MarketService self) {
        this.self = self;
    }
    
    // TODO: Implement method to get markets
    /**
     * READ PATH (Hot)
     * 1. Checks Cache ("markets::12345").
     * 2. If Hit: Returns instantly.
     * 3. If Miss: Runs the method body (DB Check -> API Fetch -> Save).
     */
    @Transactional
    @Cacheable(value = "markets", key = "#plz")
    public List<Market> getMarkets(String plz) {
        
        // --- A. DB CHECK (Warm Path) ---
        List<Market> dbMarkets = marketRepository.getMarketsByAddress(plz).orElse(List.of());

        // Check freshness (Only runs on Cache Miss)
        if (!dbMarkets.isEmpty() && isMarketFresh(dbMarkets.get(0))) {
            log.info("DB Hit (Fresh) for PLZ: {}", plz);
            // We return here, and Spring automatically puts this result into Redis
            return dbMarkets; 
        }

        log.info(dbMarkets.isEmpty() ? "Repo is empty" : "Data is not fresh");

        // --- B. API FETCH (Cold Path) ---
        log.info("Fetching API...");
        MarketSearchResponse apiResponse = apiClient.searchMarkets(plz);
        
        if (apiResponse == null || apiResponse.markets() == null) return List.of();

        // --- C. MERGE LOGIC ---
        // (Logic extracted to helper for readability)
        List<Market> marketsToSave = mergeApiWithDb(apiResponse.markets());

        if (marketsToSave.isEmpty()) return List.of();

        // --- D. SAVE & UPDATE CACHE ---
        // We call the method on 'self' (the Spring Proxy) so @CachePut works
        return self.saveAndRefresh(marketsToSave, plz);
    }

    /**
     * WRITE PATH
     * 1. Saves to Database.
     * 2. @CachePut: Takes the return value and FORCES it into the 'markets' cache.
     * This ensures the cache is now perfectly in sync with the DB.
     */
    @Transactional
    @CachePut(value = "markets", key = "#plz")
    public List<Market> saveAndRefresh(List<Market> markets, String plz) {
        List<Market> savedMarkets = marketRepository.saveAll(markets);

        // --- E. HANDLE INDIVIDUAL ID CACHES ---
        // Spring Annotations cannot easily split a List<Market> return 
        // into 20 different cache keys (markets_id::1, markets_id::2...).
        // We must handle this manually or using a loop of evictions.
        
        for (Market m : savedMarkets) {
            // Option 1: Manually PUT (Fastest for read-heavy)
            // cacheManager.getCache("markets_id").put(m.getReweId(), m);
            Cache cache = cacheManager.getCache("markets_id");
            if (cache != null) {
                cache.put(m.getReweId(), m);
            }
            
            // Option 2: Evict (Safer, ensures next fetch is fresh from DB)
            // self.evictSingleCache(m.getReweId());
        }

        return savedMarkets;
    }

    /**
     * Helper to evict individual ID caches.
     * Uses @CacheEvict to remove specific entries.
     */
    @CacheEvict(value = "markets_id", key = "#reweId")
    public void evictSingleCache(Long reweId) {
        // Method body is empty, the annotation does the work.
        log.debug("Evicting market_id cache for: {}", reweId);
    }
    
    private List<Market> mergeApiWithDb(List<MarketDto> apiDtos) {
         List<Long> apiIds = apiDtos.stream().map(MarketDto::id).toList();
         
         // Fetch fresh entities directly from DB for the update.
         // We ignore the cache here because we need the latest @Version for locking.
         List<Market> dbEntities = marketRepository.findAllById(apiIds);
         
         // Convert to Map for fast lookup
         Map<Long, Market> marketMap = dbEntities.stream()
            .collect(Collectors.toMap(Market::getId, Function.identity()));

         // ... rest of the logic is exactly the same ...
         List<Market> finalBatch = new ArrayList<>();

         for (MarketDto dto : apiDtos) {
            if (marketMap.containsKey(dto.id())) {
                Market existing = marketMap.get(dto.id());
                existing.updateFromDto(dto); // Updates the MANAGED entity
                // existing.setLastUpdated(LocalDateTime.now()); 
                finalBatch.add(existing);
            } else {
                Market newMarket = Market.fromDto(dto);
                // newMarket.setLastUpdated(LocalDateTime.now());
                finalBatch.add(newMarket);
            }
         }
         return finalBatch;
    }
    
    /**
     * @brief Get products from database only. No API call.
     */
    //? Mark for removal
    @Transactional
    public Market getDBProducts(Long reweId) {
        Market market = marketRepository.findByReweId(reweId)
                .orElseThrow(() -> new RuntimeException("Market not found"));
        
        return market;
    }

    /**
     * @brief Query a certain product for a given market. Only first page. One API call.
     */
    @Transactional
    public Market getProductsQuery(Long marketId, String query) {
        Market market = marketRepository.findByReweId(marketId)
                .orElseThrow(() -> new RuntimeException("Market not found"));
        return getProductsAPI(market, query, 1);  
    }

    /**
     * @brief Get all products from a given market. Should be called sparely (40 API calls).
     */
    @Transactional
    @CachePut(value = "market_products", key = "#market.id")
    public Market getAllProductsAPI(Market market) {
        return getProductsAPI(market, "", Integer.MAX_VALUE);  
    }

    /**
     * @brief Get all products from a given market. First try to fetch from DB only. If no products or data not fresh, call API.
     */
    @Cacheable(value = "market_products", key = "#reweId")
    public Market getAllProducts(Long reweId) {
        Market market = marketRepository.findByReweId(reweId)
                .orElseThrow(() -> new RuntimeException("Market not found"));

        // Check if products are fresh
        if (!market.getProducts().isEmpty() && isProductFresh(market.getProducts().get(0))) {
            log.info("DB Hit for Products of Market ID: {}", reweId);
            return market;
        }

        return getAllProductsAPI(market);
    }

    // TODO: We need to implement more efficient market retrieval methods use caching and also call the externals APIs if needed.
    
    private boolean isMarketFresh(Market market) {
        //? Check in case they open a new market or move it / change timetable etc
        LocalDateTime lastUpdated = market.getLastUpdated();
        return lastUpdated != null && 
               lastUpdated.isAfter(LocalDateTime.now().minusWeeks(TTL_WEEKS_MARKET));
    }

    private boolean isProductFresh(Product product) {
        LocalDateTime lastUpdated = product.getLastUpdated();
        return lastUpdated != null && 
               lastUpdated.isAfter(LocalDateTime.now().minusWeeks(TTL_WEEKS_PRODUCTS));
    }

    /**
     * @brief Query a certain product for a given market. Set number of pages to fetch.
     */
    @Transactional
    //? Probably make void in the future
    private Market getProductsAPI(Market market, String query, int numPages) {
        // 1. Fetch from API (first page to get pagination info)
        log.info("Fetching API...");
        ProductSearchResponse response = apiClient.searchProducts(query, 1, DEFAULT_OBJECTS_PER_PAGE, market.getReweId());
        if (response == null || response.data() == null) return market;

        // 2. Create Lookup Map (Sanitized)
        // We use a Map to ensure we find existing products quickly
        Map<Long, Product> existingMap = new HashMap<>();
        for (Product p : market.getProducts()) {
            existingMap.put(p.getId(), p);
        }

        int queryPages = response.data().products().pagination().pageCount();

        int numberPages = Math.min(numPages, queryPages);
        // 3. Process API items
        int i = 0;
        do {
            for (ProductDto apiProd : response.data().products().products()) {
                Long apiId = apiProd.productId(); // Ensure this matches reweId format
                
                if (existingMap.containsKey(apiId)) {
                    // --- UPDATE ---
                    // We modify the EXISTING object instance.
                    // We do NOT create a new one. We do NOT add it to the list again.
                    Product p = existingMap.get(apiId);
                    p.updateFromDto(apiProd);
                } else {
                    // --- INSERT ---
                    // Only create if it truly doesn't exist
                    Product newProduct = Product.fromDto(apiProd);
                    market.addProduct(newProduct); // Add to list
                    existingMap.put(apiId, newProduct);   // Add to Map so we don't insert duplicate in same loop
                }
            }
            ++i;
            if(i < numberPages){ // Still pages left
                // log.info("Fetching from external API for ", reweId);
                response = apiClient.searchProducts("", i, DEFAULT_OBJECTS_PER_PAGE, market.getReweId());
                // System.out.println("API Response: " + response);        
            }
        }while(i<numberPages); //? Maybe refactor this with just a for, numberPages = 1 ini and then update

        // 4. Save
        // save() is smart enough to handle both INSERTS and UPDATES in one go.
        Market savedMarket = marketRepository.save(market);
        // Does not work: Force Hibernate to fetch the products BEFORE the transaction closes
        // Hibernate.initialize(savedMarket.getProducts());
        return savedMarket;
    }
}