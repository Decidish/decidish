package decidish.com.core.service;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
// import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Address;
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

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private ReweApiClient apiClient;
    // private final RedisTemplate<String, Object> redisTemplate;
    
    /**
     * This method handles the caching logic.
     * 1. Check Redis for "markets_id::{reweId}"
     * 2. If missing, call marketRepository.findByReweId()
     * 3. Save result to Redis (unless reweId is '2')
     */
    // @Cacheable(value = "markets_id", key = "#reweId", unless = "#reweId == '2'")
    // public Optional<Market> findByReweId(String reweId) {
    //     return marketRepository.findByReweId(reweId);
    // }
    
    // TODO: Implement method to get markets
    // @Transactional
    // public List<Market> getMarkets(String plz) {
    //     // 1. Check DB
    //     List<Market> dbMarkets = marketRepository.getMarketsByAddress(plz).orElse(List.of());
        
    //     if(!dbMarkets.isEmpty() 
    //         && isDataFresh(dbMarkets.get(0)) //? This could be better
    //     ){
    //         log.info("DB Hit", plz);
    //         // cacheResults(cacheKey,dbMarkets);
    //         return dbMarkets;
    //     }
        
    //     // 2. Fetch from API
    //     log.info("Fetching from external API for ", plz);
    //     MarketSearchResponse apiResponse = apiClient.searchMarkets(plz);
    //     System.out.println("API Response: " + apiResponse);        
        
    //     if(apiResponse == null || apiResponse.markets() == null){
    //         return List.of();
    //     }
            
    //     // 3. Store in DB
    //     List<Market> savedMarkets = new ArrayList<>();
    //     for(MarketDto dto : apiResponse.markets()){
    //         Market marketFromApi = Market.fromDto(dto);
        
    //         // 1. Find the existing Market by its unique ID (reweId)
    //         Market marketToSave = marketRepository.findByReweId(marketFromApi.getReweId())
    //             .map(existingMarket -> {
    //                 // --- CASE 1: MARKET EXISTS (UPDATE LOGIC) ---

    //                 System.out.println("Market exists in DB. Updating: " + existingMarket.getReweId() + "(" + existingMarket.getName() + ")");

    //                 existingMarket.updateFromDto(dto);
                        
    //                 // a. Transfer new data to the existing entity
    //                 // existingMarket.setName(marketFromApi.getName());
    //                 // existingMarket.setLastUpdated(LocalDateTime.now()); // Update timestamp 
                        
    //                 // // b. Transfer new address data to the EXISTING address entity
    //                 // //    (This assumes Market.fromDto() creates an address with updated fields)
    //                 // Address existingAddress = existingMarket.getAddress();
    //                 // Address apiAddress = marketFromApi.getAddress();
                        
    //                 // existingAddress.setStreet(apiAddress.getStreet());
    //                 // existingAddress.setZipCode(apiAddress.getZipCode());
    //                 // existingAddress.setCity(apiAddress.getCity());
                        
    //                 // Since the relationship is cascaded, saving 'existingMarket' will automatically 
    //                 // update 'existingAddress'.
                        
    //                 return existingMarket;
    //             })
    //             .orElseGet(() -> {
    //                 // --- CASE 2: MARKET DOES NOT EXIST (INSERT LOGIC) ---
    //                 // Return the new object created from the DTO
    //                 return marketFromApi;
    //             });
    //         savedMarkets.add(marketRepository.save(marketToSave));
    //     }
            
    //     return savedMarkets;
    // }
    
    @Transactional
    public List<Market> getMarkets(String plz) {
        // 1. Check DB (Cache) first
        List<Market> dbMarkets = marketRepository.getMarketsByAddress(plz).orElse(List.of());
        
        if (!dbMarkets.isEmpty() && isDataFresh(dbMarkets.get(0))) {
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
        return marketRepository.saveAll(finalBatch);
    }
    
    // @Transactional 
    // public List<Market> getMarkets(String plz) {
    //     // 1. Check DB
    //     List<Market> dbMarkets = marketRepository.getMarketsByAddress(plz).orElse(List.of());
    //     if (!dbMarkets.isEmpty() && isDataFresh(dbMarkets.get(0))) {
    //         return dbMarkets;
    //     }

    //     // 2. Fetch from API
    //     MarketSearchResponse apiResponse = apiClient.searchMarkets(plz);
    //     if (apiResponse == null || apiResponse.markets() == null) return List.of();

    //     // --- SEPARATION LOGIC ---

    //     // A. Get IDs to find existing entries
    //     List<String> apiIds = apiResponse.markets().stream()
    //             .map(dto -> String.valueOf(dto.id()))
    //             .toList();

    //     // B. Load existing markets (Managed Entities)
    //     List<Market> existingMarkets = marketRepository.findByReweIdIn(apiIds);
    //     Map<String, Market> existingMap = existingMarkets.stream()
    //             .collect(Collectors.toMap(Market::getReweId, Function.identity()));

    //     // C. Buckets for separation
    //     List<Market> marketsToReturn = new ArrayList<>();
    //     List<Market> marketsToInsert = new ArrayList<>();

    //     for (MarketDto dto : apiResponse.markets()) {
    //         String reweId = String.valueOf(dto.id());

    //         if (existingMap.containsKey(reweId)) {
    //             // --- UPDATE PATH ---
    //             Market existing = existingMap.get(reweId);
                
    //             // 1. Modify the object
    //             // Since this object is "Managed" by Hibernate (fetched in this transaction),
    //             // Hibernate detects these changes and auto-generates an UPDATE SQL at the end.
    //             existing.setName(dto.getName());
    //             existing.setLastUpdated(LocalDateTime.now());
    //             // existing.getAddress().setStreet(...) 
                
    //             // 2. Add to return list
    //             // WE DO NOT CALL repository.save(existing) HERE!
    //             marketsToReturn.add(existing);
                
    //         } else {
    //             // --- INSERT PATH ---
    //             Market newMarket = Market.fromDto(dto);
    //             newMarket.setId(dto.id()); // Manual ID
                
    //             // Add to the "Insert Queue"
    //             marketsToInsert.add(newMarket);
    //         }
    //     }

    //     // D. Batch Insert ONLY the new ones
    //     if (!marketsToInsert.isEmpty()) {
            
    //         // This generates INSERT statements
    //         List<Market> savedNewMarkets = marketRepository.saveAll(marketsToInsert);
            
    //         // Add them to the final list
    //         marketsToReturn.addAll(savedNewMarkets);
    //     }

    //     // E. Transaction Commit happens here
    //     // Hibernate sees the "marketsToReturn" that were modified in the loop 
    //     // and generates UPDATE statements for them automatically.
        
    //     return marketsToReturn;
    // }
    
    //TODO this is probably more efficient
    // @Transactional
    // public List<Market> getMarkets(String plz) {
    //     // 1. Check DB (Cache) first
    //     List<Market> dbMarkets = marketRepository.getMarketsByAddress(plz).orElse(List.of());
    //     if (!dbMarkets.isEmpty() && isDataFresh(dbMarkets.get(0))) {
    //         return dbMarkets;
    //     }

    //     // 2. Fetch from API
    //     MarketSearchResponse apiResponse = apiClient.searchMarkets(plz);
    //     if (apiResponse == null || apiResponse.markets() == null) return List.of();

    //     // --- EFFICIENT MERGE LOGIC START ---

    //     // A. Collect all IDs from the API response
    //     List<Long> apiIds = new ArrayList<>();
    //     for (MarketDto dto : apiResponse.markets()) {
    //         apiIds.add(dto.id());
    //     }

    //     // B. Fetch ALL existing markets from DB in ONE query
    //     // This tells us exactly which markets we already have (to update) vs new ones (to insert)
    //     List<Market> existingMarkets = marketRepository.findByReweIdIn(apiIds);

    //     List<Market> batchToSave = new ArrayList<>();

    //     // C. Loop through API data and decide: Update or Insert?
    //     for (MarketDto dto : apiResponse.markets()) {
    //         String currentId = String.valueOf(dto.id());

    //         // Try to find this ID in our existing list
    //         Market market = existingMarkets.stream()
    //                 .filter(m -> m.getReweId().equals(currentId))
    //                 .findFirst()
    //                 .orElse(null);

    //         if (market != null) {
    //             // CASE 1: UPDATE
    //             // We modify the EXISTING object. Hibernate sees the ID matches and updates the row.
    //             market.updateFromDto(dto);
    //         } else {
    //             // CASE 2: INSERT
    //             // We create a NEW object.
    //             market = Market.fromDto(dto);
    //             // market.setId(dto.id()); // CRITICAL: Set Manual ID for Persistable
    //         }

    //         batchToSave.add(market);
    //     }

    //     // D. Save everything in one go
    //     return marketRepository.saveAll(batchToSave);
    // }


    // TODO: We need to implement more efficient market retrieval methods use caching and also call the externals APIs if needed.
    
    private boolean isDataFresh(Market market) {
        //? Check in case they open a new market or move it / change timetable etc
        int ttl = 1; // Time to live
        return market.getLastUpdated() != null && 
               market.getLastUpdated().isAfter(LocalDateTime.now().minusWeeks(ttl));
    }
    
    /**
     * @brief Get all products from a given market. Should be called sparely
     */
    // public Market getAllProducts(Long reweId){
    //     // // 1. Check DB
    //     // Market dbProducts = marketRepository.findByIdWithProducts(reweId).orElse(null);

    //     // if(dbProducts == null
    //     //     // && isDataFresh(dbMarkets.get(0)) //? This could be better
    //     // ){
    //     //     log.info("DB Hit", reweId);
    //     //     return dbProducts;
    //     // }
        
    //     // 1. Fetch from API
    //     log.info("Fetching from external API for ", reweId);
    //     ProductSearchResponse apiResponse = apiClient.searchProducts("", 1, 250, reweId);
    //     System.out.println("API Response: " + apiResponse);        
        
    //     if(apiResponse == null || apiResponse.data() == null){
    //         return null;
    //     }
        
    //     int numberPages = apiResponse.data().products().pagination().pageCount();
            
    //     // 3. Store in DB
    //     Market savedProducts = marketRepository.findByReweId(reweId).orElse(null);
    //     savedProducts.setProducts(new ArrayList<>());
    //     int i = 0;
    //     do {
    //         for(ProductDto dto : apiResponse.data().products().products()){
    //             Product productFromApi = Product.fromDto(dto);
            
    //             // 1. Find the existing Product by its unique ID (productId)
    //             Product productToSave = marketRepository.findProductByMarketAndId(reweId, productFromApi.getId())
    //                 .map(existingProduct -> {
    //                     // --- CASE 1: PRODUCT EXISTS (UPDATE LOGIC) ---
    //                     System.out.println("Product exists in DB. Updating: " + existingProduct.getId() + "(" + existingProduct.getName() + ")");
    //                     existingProduct.updateFromDto(dto);
    //                     return existingProduct;
    //                 })
    //                 .orElseGet(() -> {
    //                     // --- CASE 2: MARKET DOES NOT EXIST (INSERT LOGIC) ---
    //                     // Return the new object created from the DTO
    //                     return productFromApi;
    //                 });
    //             savedProducts.addProduct(productToSave);
    //         }
    //         ++i;
    //         if(i < numberPages){ // Still pages left
    //             log.info("Fetching from external API for ", reweId);
    //             apiResponse = apiClient.searchProducts("", i, 250, reweId);
    //             System.out.println("API Response: " + apiResponse);        
    //         }
    //     }while(i<numberPages); //? Maybe refactor this with just a for, numberPages = 1 ini and then update
            
    //     marketRepository.save(savedProducts);
    //     return savedProducts;
    // }
    
    //TODO This is probably more efficient
    // @Transactional
    // public Market getAllProducts(Long reweIdLong) {
    //     String reweId = String.valueOf(reweIdLong);

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
    
    @Transactional
    //? Probably make void in the future
    public Market getAllProducts(Long reweId) {
        Market market = marketRepository.findByReweId(reweId)
                .orElseThrow(() -> new RuntimeException("Market not found"));

        // 1. Fetch from API
        ProductSearchResponse response = apiClient.searchProducts("", 1, 250, reweId);
        if (response == null || response.data() == null) return market;

        // 2. Create Lookup Map (Sanitized)
        // We use a Map to ensure we find existing products quickly
        Map<Long, Product> existingMap = new HashMap<>();
        for (Product p : market.getProducts()) {
            existingMap.put(p.getId(), p);
        }

        int numberPages = response.data().products().pagination().pageCount();
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
                response = apiClient.searchProducts("", i, 250, reweId);
                System.out.println("API Response: " + response);        
            }
        }while(i<numberPages); //? Maybe refactor this with just a for, numberPages = 1 ini and then update

        // 4. Save
        Market savedMarket = marketRepository.save(market);
        // Does not work: Force Hibernate to fetch the products BEFORE the transaction closes
        Hibernate.initialize(savedMarket.getProducts());
        return savedMarket;
    }
    
    /**
     * @brief Query a certain product for a given market
     */
    // public List<Product> getProduct(Long marketId, String product){
    //     // 1. Check DB
    //     Market dbProducts = marketRepository.getMarketsByAddress(plz).orElse(List.of());
    // }
}