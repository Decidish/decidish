package decidish.com.core.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.ProductDto;
import decidish.com.core.model.rewe.ProductSearchResponse;
import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.repository.MarketRepository;
import jakarta.transaction.Transactional;

import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
// @AllArgsConstructor
public class MarketService {

    private static final Logger log = LoggerFactory.getLogger(MarketService.class);
    private final int TTL_WEEKS_MARKET = 1;
    private final int TTL_WEEKS_PRODUCTS = 4;
    private final int DEFAULT_OBJECTS_PER_PAGE = 250; // Default number of objects per page from REWE API

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private ReweApiClient apiClient;
    
    // TODO: Implement method to get markets
    @Transactional
    public List<Market> getMarkets(String plz) {
        // 1. Check DB (Cache) first
        List<Market> dbMarkets = marketRepository.getMarketsByAddress(plz).orElse(List.of());
        
        if (!dbMarkets.isEmpty() && isMarketFresh(dbMarkets.get(0))) {
            log.info("DB Hit for PLZ: {}", plz);
            return dbMarkets;
        }

        // 2. Fetch from API
        log.info("DB Miss/Stale. Fetching API...");
        MarketSearchResponse apiResponse = apiClient.searchMarkets(plz);
        
        if (apiResponse == null || apiResponse.markets() == null) return List.of();

        // --- OPTIMIZED MERGE LOGIC ---

        // A. Collect IDs from API response
        List<Long> apiIds = new ArrayList<>();
        for (MarketDto dto : apiResponse.markets()) {
            apiIds.add(dto.id()); // Assuming DTO ID is Long
        }

        // B. Fetch ALL relevant markets from DB (One Query)
        // This finds them even if they didn't match the Address query earlier
        List<Market> knownMarkets = marketRepository.findAllByIds(apiIds);

        // C. Convert to Map for instant lookup
        // Key: ID, Value: The Hibernate-Attached Entity
        Map<Long, Market> marketMap = new HashMap<>();
        for (Market m : knownMarkets) {
            marketMap.put(m.getId(), m);
        }

        List<Market> finalBatch = new ArrayList<>();

        // D. Iterate & Merge
        for (MarketDto dto : apiResponse.markets()) {
            Long id = dto.id();

            if (marketMap.containsKey(id)) {
                // --- UPDATE EXISTING ---
                // We reuse the OBJECT from the map. This is the "Associated" object.
                // Modifying it updates the DB automatically at end of transaction.
                Market existing = marketMap.get(id);
                existing.updateFromDto(dto); 
                // existing.setLastUpdated(LocalDateTime.now());
                
                finalBatch.add(existing);
            } else {
                // --- INSERT NEW ---
                // This ID is definitely not in the Session, so it's safe to create new.
                Market newMarket = Market.fromDto(dto);
                // newMarket.setId(id); // Set Manual ID
                // newMarket.setLastUpdated(LocalDateTime.now());
                
                finalBatch.add(newMarket);
            }
        }

        // E. Save All (Batched)
        // saveAll() is smart: it merges existing ones and persists new ones.
        // Only save if we actually have something to save
        if (!finalBatch.isEmpty()) {
            return marketRepository.saveAll(finalBatch);
        }

        return List.of();
    }

    /**
     * @brief Get products from database only. No API call.
     */
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
        return getProductsAPI(marketId, query, 1);  
    }

    /**
     * @brief Get all products from a given market. Should be called sparely (40 API calls).
     */
    @Transactional
    public Market getAllProductsAPI(Long reweId) {
        return getProductsAPI(reweId, "", Integer.MAX_VALUE);  
    }

    /**
     * @brief Get all products from a given market. First try to fetch from DB only. If no products or data not fresh, call API.
     */
    public Market getAllProducts(Long reweId) {
        Market market = marketRepository.findByReweId(reweId)
                .orElseThrow(() -> new RuntimeException("Market not found"));

        // Check if products are fresh
        if (!market.getProducts().isEmpty() && isProductFresh(market.getProducts().get(0))) {
            log.info("DB Hit for Products of Market ID: {}", reweId);
            return market;
        }

        return getAllProductsAPI(reweId);
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
    private Market getProductsAPI(Long reweId, String query, int numPages) {
        Market market = marketRepository.findByReweId(reweId)
                .orElseThrow(() -> new RuntimeException("Market not found"));

        // 1. Fetch from API (first page to get pagination info)
        ProductSearchResponse response = apiClient.searchProducts(query, 1, DEFAULT_OBJECTS_PER_PAGE, reweId);
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
                log.info("Fetching from external API for ", reweId);
                response = apiClient.searchProducts("", i, DEFAULT_OBJECTS_PER_PAGE, reweId);
                // System.out.println("API Response: " + response);        
            }
        }while(i<numberPages); //? Maybe refactor this with just a for, numberPages = 1 ini and then update

        // 4. Save
        // save() is smart enough to handle both INSERTS and UPDATES in one go.
        Market savedMarket = marketRepository.save(market);
        // Does not work: Force Hibernate to fetch the products BEFORE the transaction closes
        Hibernate.initialize(savedMarket.getProducts());
        return savedMarket;
    }

    //TODO This is maybe more efficient
    // @Transactional
    // public Market getAllProductsEfficient(Long reweId) {

    //     Market market = marketRepository.findByReweId(reweId)
    //             .orElseThrow(() -> new RuntimeException("Market not found"));

    //     // 1. Fetch from API
    //     URI uri = UriComponentsBuilder.fromHttpUrl("...").build().toUri();
    //     ProductSearchResponse response = apiClient.searchProducts(uri, reweId, "*", 1);

    //     if (response == null || response.products() == null) return market;

    //     // 2. Load Existing Products into a Map for fast lookup
    //     // Key: Product ReweID, Value: Product Entity
    //     Map<String, Product> existingMap = market.getProducts().stream()
    //             .collect(Collectors.toMap(Product::getReweId, Function.identity()));

    //     // 3. Process API items
    //     for (MobileProduct apiProd : response.products()) {
            
    //         // This handles the update logic
    //         if (existingMap.containsKey(apiProd.id())) {
    //             // --- UPDATE ---
    //             Product p = existingMap.get(apiProd.id());
    //             p.setName(apiProd.name());
    //             p.setPrice(apiProd.currentPrice());
    //             p.setLastUpdated(LocalDateTime.now());
    //         } else {
    //             // --- INSERT ---
    //             // Only create if we haven't processed this ID yet in this loop
    //             // (The Map check implicitly protects us if the API sends the same ID twice,
    //             // BUT to be extra safe against "Double Insert" in one batch:)
                
    //             Product newProduct = Product.builder()
    //                     .reweId(apiProd.id())
    //                     .name(apiProd.name())
    //                     .price(apiProd.currentPrice())
    //                     .market(market)
    //                     .build();
                
    //             market.addProduct(newProduct);
    //             // Add to map so if it appears again in this loop, we update instead of insert!
    //             existingMap.put(apiProd.id(), newProduct); 
    //         }
    //     }

    //     return marketRepository.save(market);
    // }
}