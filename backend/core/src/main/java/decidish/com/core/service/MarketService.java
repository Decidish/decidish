package decidish.com.core.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import org.springframework.stereotype.Service;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.MarketSummaryDto;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.ProductDto;
import decidish.com.core.model.rewe.ProductSearchResponse;
import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;

import org.springframework.transaction.annotation.Transactional;

import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class MarketService {

    private static final Logger log = LoggerFactory.getLogger(MarketService.class);
    private final int TTL_WEEKS_MARKET = 1;
    private final int TTL_WEEKS_PRODUCTS = 4;
    private final int DEFAULT_OBJECTS_PER_PAGE = 250; // Default number of objects per page from REWE API

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private ReweApiClient apiClient;
    
    @Autowired
    private ProductRepository productRepository;
    
    public MarketSummaryDto getMarketById(Long id) {
        Market market = marketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Market not found with id: " + id));
        
        return MarketSummaryDto.fromEntity(market);
    }

    /**
     * READ PATH (Hot)
     * 1. If Hit: Returns instantly.
     * 2. If Miss: Runs the method body (DB Check -> API Fetch -> Save).
     */

    @Transactional
    public List<Market> getMarkets(String plz) {

        // DB CHECK (Warm Path)
        List<Market> dbMarkets = marketRepository.getMarketsByAddress(plz).orElse(List.of());
        // Check freshness (Only runs on Cache Miss)
        if (!dbMarkets.isEmpty() && isMarketFresh(dbMarkets.get(0))) {
            log.info("DB Hit (Fresh) for PLZ: {}", plz);
            // We return here, and Spring automatically puts this result into Redis
            return dbMarkets;
        }

        log.info(dbMarkets.isEmpty() ? "Repo is empty" : "Data is not fresh");

        // API FETCH (Cold Path)
        log.info("Fetching API...");
        MarketSearchResponse apiResponse = apiClient.searchMarkets(plz);

        if (apiResponse == null){
            log.info("api returned null");            
            return List.of();
        }
        List<MarketDto> markets = apiResponse.data().marketSearch().markets();
        if (markets== null){
            log.info("api returned no markets");            
            return List.of();
        }

        // MERGE LOGIC
        // (Logic extracted to helper for readability)
        List<Market> marketsToSave = mergeApiWithDb(markets);

        if (marketsToSave.isEmpty()) {
            log.info("MARKETS TO SAVE IS EMPTY");
            return List.of();
        }

        return marketRepository.saveAll(marketsToSave);
    }


    @Transactional(readOnly = true)
    public Market getMarket(Long id) {
        // This ensures 'products' are inside the object BEFORE it goes to Redis
        return marketRepository.findByIdWithProducts(id)
                .orElseThrow(() -> new RuntimeException("Market not found"));
    }

    private List<Market> mergeApiWithDb(List<MarketDto> apiDtos) {
        List<Long> apiIds = apiDtos.stream().map(MarketDto::wwIdent).toList();

        // Fetch fresh entities directly from DB for the update.
        // We ignore the cache here because we need the latest version
        List<Market> dbEntities = marketRepository.findAllById(apiIds);

        // Convert to Map for fast lookup
        Map<Long, Market> marketMap = dbEntities.stream()
                .collect(Collectors.toMap(Market::getId, Function.identity()));
        List<Market> finalBatch = new ArrayList<>();

        for (MarketDto dto : apiDtos) {
            if(dto.serviceFlags().hasPickup() == true){
                if (marketMap.containsKey(dto.wwIdent())) {
                    Market existing = marketMap.get(dto.wwIdent());
                    existing.updateFromDto(dto);
                    finalBatch.add(existing);
                } else {
                    Market newMarket = Market.fromDto(dto);
                    finalBatch.add(newMarket);
                }
            }
        }
        return finalBatch;
    }
    
    public static Specification<Product> getProducts(String query, String filter, Long marketId) {
        Specification<Product> spec = (root, queryObj, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (marketId != null) {
            spec = spec.and((root, queryObj, cb) -> 
                cb.equal(root.get("market").get("id"), marketId)); 
        }

        // Handle Text Search
        if (StringUtils.hasText(query)) {
            String pattern = "%" + query.toLowerCase() + "%";
            spec = spec.and((root, queryObj, cb) -> 
                cb.like(cb.lower(root.get("name")), pattern));
        }

        // Handle Boolean Filters
        if (StringUtils.hasText(filter) && !filter.equals("all")) {

            // Map URL param (snake_case) to Java Field (camelCase)
            String fieldName = switch (filter) {
                case "is_bulky_good" -> "isBulkyGood";
                case "is_vegetatian" -> "isVegetatian";
                case "is_dairy_free" -> "isDairyFree";
                case "is_regional" -> "isRegional";
                case "is_organic" -> "isOrganic";
                case "is_vegan" -> "isVegan";
                case "is_gluten_free" -> "isGlutenFree";
                case "is_biocide" -> "isBiocide";
                case "is_age_restricted" -> "isAgeRestricted";
                case "is_lowest_price" -> "isLowestPrice";
                case "is_tobacco" -> "isTobacco";
                default -> null;
            };

            // Only apply the specification if we found a valid mapping
            if (fieldName != null) {
                spec = spec.and((root, queryObj, cb) -> 
                    cb.isTrue(root.get("attributes").get(fieldName)));
            }
        }
        return spec;
    }
    
    @Transactional
    public Page<Product> searchProductsWithFallback(String query, String filter, Long marketId, Pageable pageable) {
        // Build Specification
        Specification<Product> spec = getProducts(query, filter, marketId);

        // Try Local DB Search
        Page<Product> results = productRepository.findAll(spec, pageable);

        // Fallback: If page 0 is empty, fetch from External API
        if (results.isEmpty() && pageable.getPageNumber() == 0) {
            System.out.println("Local DB empty. Fetching from External API for query: " + query);
            String safeQuery = (query != null) ? query : "";
            
            // Logic to fetch from external API and save to DB
            getProductsQuerySave(marketId,safeQuery);

            // Search Local DB Again after update
            return productRepository.findAll(spec, pageable);
        }

        return results;
    }

    /**
     * @brief Query a certain product for a given market. Only first page. One API
     *        call.
     */

    @Transactional
    public Market getProductsQuerySave(Long marketId, String query) {
        Market market = getMarket(marketId);
        return getProductsAPISave(market, query, 1);
    }

    /**
     * @brief Get all products from a given market. Should be called sparely (40 API
     *        calls).
     */

    @Transactional
    public Market getAllProductsAPI(Market market) {
        return getProductsAPISave(market, "", Integer.MAX_VALUE);
    }

    /**
     * @brief Get all products from a given market. First try to fetch from DB only.
     *        If no products or data not fresh, call API.
     */

    public Market getAllProducts(Long id) {
        Market market = getMarket(id);

        // Check if products are fresh
        if (!market.getProducts().isEmpty() && isProductFresh(market.getProducts().get(0))) {
            log.info("DB Hit for Products of Market ID: {}", id);
            return market;
        }

        return getAllProductsAPI(market);
    }

    private boolean isMarketFresh(Market market) {
        // ? Check in case they open a new market or move it / change timetable etc
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
     * @brief Query a certain product for a given market. Set number of pages to
     *        fetch.
     */

    @Transactional
    // ? Probably make void in the future
    private Market getProductsAPISave(Market market, String query, int numPages) {
        // 1. Fetch from API (first page to get pagination info)
        log.info("Fetching API...");
        ProductSearchResponse response = apiClient.searchProducts(query, 1, DEFAULT_OBJECTS_PER_PAGE, market.getId());
        if (response == null || response.data() == null)
            return market; // ? Change to void

        // 2. Create Lookup Map
        // We use a Map to ensure we find existing products quickly
        Map<Long, Product> existingMap = new HashMap<>();
        for (Product p : market.getProducts()) {
            existingMap.put(p.getReweId(), p);
        }

        int queryPages = response.data().products().pagination().pageCount();

        int numberPages = Math.min(numPages, queryPages);
        // 3. Process API items
        int i = 0;
        do {
            for (ProductDto apiProd : response.data().products().products()) {
                Long apiId = apiProd.productId();

                if (existingMap.containsKey(apiId)) {
                    Product p = existingMap.get(apiId);
                    p.updateFromDto(apiProd);
                } else {
                    Product newProduct = Product.fromDto(apiProd);
                    market.addProduct(newProduct); // Add to list
                    existingMap.put(apiId, newProduct); // Add to Map so we don't insert duplicate in same loop
                }
            }
            ++i;
            if (i < numberPages) { // Still pages left
                // log.info("Fetching from external API for ", reweId);
                response = apiClient.searchProducts(query, i, DEFAULT_OBJECTS_PER_PAGE, market.getId());
                // System.out.println("API Response: " + response);
            }
        } while (i < numberPages); // ? Maybe refactor this with just a for, numberPages = 1 ini and then update

        // 4. Save
        // save() is smart enough to handle both INSERTS and UPDATES in one go.
        Market savedMarket = marketRepository.save(market);
        marketRepository.flush();
        // Does not work: Force Hibernate to fetch the products BEFORE the transaction
        // closes
        // Hibernate.initialize(savedMarket.getProducts());
        return savedMarket;
    }

    /**
     * Returns a list of Products for a specific search, detached from the Market
     * entity
     * to ensure thread-safety during concurrent processing.
     */
    public List<Product> getProductsQueryNoSave(Long marketId, String query) {
        // 1. Get market to get the REWE ID (Market is read-only here)
        Market market = getMarket(marketId);

        // 2. Fetch from API
        ProductSearchResponse response = apiClient.searchProducts(query, 1, DEFAULT_OBJECTS_PER_PAGE, market.getId());
        if (response == null || response.data() == null)
            return new ArrayList<>();

        List<Product> results = new ArrayList<>();

        // 3. Convert DTOs to Product Entities (unpersisted)
        for (ProductDto dto : response.data().products().products()) {
            Product p = Product.fromDto(dto);
            // We set the market reference so it's ready for saving later
            p.setMarket(market);
            results.add(p);
        }

        return results;
    }

    @Transactional
    public void updateProductsForEveryMarket() {
        List<Market> markets = marketRepository.findAll();
        if(markets.isEmpty()){
            log.info("No markets found in DB to update products for.");
            return;
        }

        
        for (Market market : markets) {
            log.info("Updating products for Market ID: {}", market.getId());

            try {
                // Time this operation in seconds
                long startTime = System.currentTimeMillis();
                getAllProductsAPI(market);
                long endTime = System.currentTimeMillis();
                long duration = (endTime - startTime) / 1000;
                log.info("Successfully updated Market ID: {} in {} seconds", market.getId(), duration);
            } catch (Exception e) {
                log.error("Error updating Market with id {}: {}", market.getId(), e.getMessage());
            }
        }
    } 

    // ! Don't delete yet, multi-threading can be useful in the future, but causes
    // issues now
    // // NOTE: NO @Transactional here! We want to keep DB connections free while
    // waiting for API.
    // public Market getProductsAPI(Market market, String query, int maxPages) {

    // Long marketId = market.getId();

    // // --- STEP 1: Fetch First Page (Synchronous) ---
    // log.info("Fetching API Page 1...");

    // ProductSearchResponse firstPage = apiClient.searchProducts(query, 1,
    // DEFAULT_OBJECTS_PER_PAGE, marketId);
    // if (firstPage == null || firstPage.data() == null) return null;

    // // Collect all found products into a single list
    // List<ProductDto> allFoundProducts = new
    // ArrayList<>(firstPage.data().products().products());

    // // --- STEP 2: Calculate Pages ---
    // int totalApiPages = firstPage.data().products().pagination().pageCount();
    // int pagesToFetch = Math.min(maxPages, totalApiPages);

    // // --- STEP 3: Parallel Fetch (Scatter) ---
    // if (pagesToFetch > 1) {
    // log.info("Starting parallel fetch for {} more pages...", pagesToFetch - 1);

    // List<CompletableFuture<List<ProductDto>>> futures = new ArrayList<>();

    // // Start loops from Page 2
    // for (int i = 2; i <= pagesToFetch; i++) {
    // final int pageNum = i; // Needed for lambda

    // // Create a task that runs in the background
    // CompletableFuture<List<ProductDto>> future = CompletableFuture.supplyAsync(()
    // -> {
    // try {
    // var response = apiClient.searchProducts(query, pageNum,
    // DEFAULT_OBJECTS_PER_PAGE, marketId);
    // if (response != null && response.data() != null) {
    // return response.data().products().products();
    // }
    // } catch (Exception e) {
    // log.error("Failed to fetch page " + pageNum, e);
    // }
    // return List.<ProductDto>of(); // Return empty list on failure
    // });

    // futures.add(future);
    // }

    // // --- STEP 4: Wait for All (Gather) ---
    // // This blocks the main thread until ALL requests are done
    // CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

    // // Extract data from futures
    // for (var future : futures) {
    // try {
    // allFoundProducts.addAll(future.get());
    // } catch (Exception e) {
    // // Should not happen since we used join(), but good practice
    // }
    // }
    // }

    // log.info("Finished fetching. Total items found: {}",
    // allFoundProducts.size());

    // // --- STEP 5: Save to DB (Transactional) ---
    // // Now we call a separate method that handles the DB Lock
    // return updateMarketData(marketId, allFoundProducts);
    // }

    // // Separate helper method just for the DB write
    // @Transactional
    // protected Market updateMarketData(Long marketId, List<ProductDto> dtos) {
    // Market market = marketRepository.findById(marketId).orElseThrow();

    // // Create Lookup Map for O(1) access
    // Map<Long, Product> existingMap = new HashMap<>();
    // for (Product p : market.getProducts()) {
    // existingMap.put(p.getId(), p);
    // }

    // // Update or Insert
    // for (ProductDto dto : dtos) {
    // if (existingMap.containsKey(dto.productId())) {
    // existingMap.get(dto.productId()).updateFromDto(dto);
    // } else {
    // Product newProduct = Product.fromDto(dto);
    // market.addProduct(newProduct);
    // // Update map to avoid duplicates if API returns same item twice
    // existingMap.put(dto.productId(), newProduct);
    // }
    // }

    // return marketRepository.save(market);
    // }
}