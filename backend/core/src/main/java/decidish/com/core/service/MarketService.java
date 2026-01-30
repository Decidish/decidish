package decidish.com.core.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import org.springframework.stereotype.Service;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketSummaryDto;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.ProductDto;
import decidish.com.core.model.rewe.ProductSearchResponse;
import decidish.com.core.model.rewe.SearchTermMarket;
import decidish.com.core.model.rewe.SearchTermMarketId;
import decidish.com.core.model.rewe.MarketPickupDto;
import decidish.com.core.scheduler.WeeklySyncMetrics;
import decidish.com.core.model.rewe.MarketPickupResponse;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import decidish.com.core.repository.SearchTermMarketRepository;
import jakarta.persistence.EntityNotFoundException;

import org.springframework.transaction.annotation.Transactional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class MarketService {

    private static final Logger log = LoggerFactory.getLogger(MarketService.class);
    private final int TTL_WEEKS_MARKET = 1;
    private final int TTL_WEEKS_PRODUCTS = 4;
    private final int DEFAULT_OBJECTS_PER_PAGE = 250; // Default number of objects per page from REWE API

    @Autowired
    private SearchTermMarketRepository searchTermMarketRepository;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private ReweApiClient apiClient;
    
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private WeeklySyncMetrics weeklySyncMetrics;
    
    /**
     * Get market by ID.
     */
    public MarketSummaryDto getMarketById(Long id) {
        log.debug("Fetching market ID: {} from DB", id);
        Market market = marketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Market not found with id: " + id));
        
        return MarketSummaryDto.fromEntity(market);
    }
    
    /**
     * Get markets by postal code.
     * First checks DB, then external API as fallback.
     * No @Transactional here - we manage transactions in smaller scopes to avoid holding connections.
     */
    public List<MarketSummaryDto> getMarkets(String zipCode) {
        log.debug("Fetching markets for PLZ: {} from DB", zipCode);
        
        // --- STEP 1: Fast DB Read (Spring Data Repos are transactional by default, so this is safe) ---
        List<Market> dbMarkets = marketRepository.getMarketsBySearchTerm(zipCode).orElse(List.of());
        
        if (!dbMarkets.isEmpty() && isMarketFresh(dbMarkets.get(0))) {
            log.info("DB Hit (Fresh) for PLZ: {}", zipCode);
            return dbMarkets.stream().map(MarketSummaryDto::fromEntity).toList();
        }

        log.info(dbMarkets.isEmpty() ? "No association found in DB" : "Data is not fresh");

        // --- STEP 2: Slow Network Call (happens OUTSIDE of any transaction) ---
        // Now, if this hangs for 10 seconds, NO DB connection is held!
        log.info("Fetching API...");
        MarketPickupResponse apiResponse = apiClient.searchMarkets(zipCode);

        if (apiResponse == null || apiResponse.data() == null) {
            log.info("api returned null");
            return List.of(); // Or return stale dbMarkets if you prefer resilience
        }
        
        var servicePortfolio = apiResponse.data().servicePortfolio();
        if (servicePortfolio == null) return List.of();

        List<MarketPickupDto> apiMarkets = servicePortfolio.pickupMarkets();
        if (apiMarkets == null || apiMarkets.isEmpty()) {
            log.info("api returned no markets");
            return List.of();
        }

        // --- STEP 3: Fast DB Write (Wrap this part in a Transaction) ---
        List<Market> savedMarkets = saveMarketsAndAssociations(zipCode, apiMarkets);
        return savedMarkets.stream().map(MarketSummaryDto::fromEntity).toList();
    }

    /**
     * Helper method to handle the WRITE part. 
     * This keeps the transaction very short (milliseconds).
     */
    @Transactional
    public List<Market> saveMarketsAndAssociations(String zipCode, List<MarketPickupDto> apiMarkets) {
        
        // MERGE LOGIC
        List<Market> savedMarkets = mergeApiWithDb(apiMarkets); 

        if (savedMarkets.isEmpty()) {
            log.info("MARKETS TO SAVE IS EMPTY");
            return List.of();
        }

        // UPDATE ASSOCIATIONS
        saveSearchTermAssociations(zipCode, savedMarkets);
        
        return savedMarkets;
    }

    /**
     * Creates or updates the link between the search term and the markets.
     */
    private void saveSearchTermAssociations(String searchTerm, List<Market> markets) {

        // Delete all existing pairs for this search term (e.g. remove old links for "80000")
        searchTermMarketRepository.deleteAllBySearchTerm(searchTerm);

        List<SearchTermMarket> associations = markets.stream()
            .map(market -> {
                SearchTermMarketId id = new SearchTermMarketId(searchTerm, market.getId());
                // Updates timestamp if it already exists, inserts if new
                return new SearchTermMarket(id, market, LocalDateTime.now());
            })
            .toList();

        searchTermMarketRepository.saveAll(associations);
        log.info("Updated associations for term '{}' -> {} markets", searchTerm, associations.size());
    }

    @Transactional(readOnly = true)
    public Market getMarket(Long id) {
        // This ensures 'products' are inside the object BEFORE it goes to Redis
        return marketRepository.findByIdWithProducts(id)
                .orElseThrow(() -> new RuntimeException("Market not found"));
    }

    private List<Market> mergeApiWithDb(List<MarketPickupDto> apiDtos) {
        List<Long> apiIds = apiDtos.stream().map(MarketPickupDto::wwIdent).toList();

        // Fetch fresh entities directly from DB for the update.
        // We ignore the cache here because we need the latest version
        List<Market> dbEntities = marketRepository.findAllById(apiIds);

        // Convert to Map for fast lookup
        Map<Long, Market> marketMap = dbEntities.stream()
                .collect(Collectors.toMap(Market::getId, Function.identity()));
        List<Market> finalBatch = new ArrayList<>();

        for (MarketPickupDto dto : apiDtos) {

            if (marketMap.containsKey(dto.wwIdent())) {
                Market existing = marketMap.get(dto.wwIdent());
                existing.updateFromPickupDto(dto);
                finalBatch.add(existing);
            } else {
                Market newMarket = Market.fromPickupDto(dto);
                finalBatch.add(newMarket);
            }
        }

        return marketRepository.saveAll(finalBatch);
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
    
    /**
     * Search products with fallback to external API.
     * IMPORTANT: No @Transactional here to avoid holding DB connection during API calls.
     * Each DB operation is handled in its own short transaction.
     */
    public Page<Product> searchProductsWithFallback(String query, String filter, Long marketId, Pageable pageable) {
        // Build Specification
        Specification<Product> spec = getProducts(query, filter, marketId);

        // Try Local DB Search (this is auto-transactional via Spring Data)
        Page<Product> results = productRepository.findAll(spec, pageable);

        // Fallback: If page 0 is empty, fetch from External API
        if (results.isEmpty() && pageable.getPageNumber() == 0) {
            log.info("Cache/DB MISS for product search. Fetching from External API for query: {}", query);
            String safeQuery = (query != null) ? query : "";
            
            // Fetch from API (OUTSIDE transaction) and save (INSIDE short transaction)
            fetchAndSaveProducts(marketId, safeQuery);

            // Search Local DB Again after update
            return productRepository.findAll(spec, pageable);
        }

        return results;
    }

    /**
     * Fetch products from API (outside transaction) and save them (inside short transaction).
     * This prevents holding a DB connection during the slow API call.
     */
    public void fetchAndSaveProducts(Long marketId, String query) {
        // STEP 1: Get market info (short read transaction)
        Market market = getMarket(marketId);
        
        // STEP 2: Fetch from external API (NO DB connection held here!)
        log.info("Fetching products from API for market {} query '{}'...", marketId, query);
        recordApiCall();
        ProductSearchResponse response = apiClient.searchProducts(query, 1, DEFAULT_OBJECTS_PER_PAGE, market.getId());
        recordProductPage(response);
        
        if (response == null || response.data() == null || response.data().products() == null) {
            log.warn("API returned null/empty for market {} query '{}'", marketId, query);
            return;
        }
        
        List<ProductDto> apiProducts = response.data().products().products();
        if (apiProducts == null || apiProducts.isEmpty()) {
            return;
        }
        
        // STEP 3: Save products (short write transaction)
        saveProductsToMarket(marketId, apiProducts);
    }
    
    /**
     * Save products to market in a SHORT transaction to minimize connection holding time.
     */
    @Transactional
    protected void saveProductsToMarket(Long marketId, List<ProductDto> apiProducts) {
        Market market = marketRepository.findByIdWithProducts(marketId)
                .orElseThrow(() -> new RuntimeException("Market not found: " + marketId));
        
        // Create Lookup Map for existing products
        Map<Long, Product> existingMap = new HashMap<>();
        for (Product p : market.getProducts()) {
            existingMap.put(p.getReweId(), p);
        }
        
        // Process API products
        for (ProductDto apiProd : apiProducts) {
            Long apiId = apiProd.productId();
            if (existingMap.containsKey(apiId)) {
                existingMap.get(apiId).updateFromDto(apiProd);
            } else {
                Product newProduct = Product.fromDto(apiProd);
                market.addProduct(newProduct);
                existingMap.put(apiId, newProduct);
            }
        }
        
        marketRepository.save(market);
        log.debug("Saved {} products to market {}", apiProducts.size(), marketId);
    }

    /**
     * @brief Query a certain product for a given market. Only first page. One API
     *        call.
     * Uses the new non-blocking pattern.
     */
    public Market getProductsQuerySave(Long marketId, String query) {
        fetchAndSaveProducts(marketId, query);
        return getMarket(marketId);
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

    private boolean isWeeklySyncRunning() {
        return weeklySyncMetrics != null && weeklySyncMetrics.isRunning();
    }

    private void recordApiCall() {
        if (isWeeklySyncRunning()) {
            weeklySyncMetrics.recordApiCall();
        }
    }

    private void recordProductPage(ProductSearchResponse response) {
        if (!isWeeklySyncRunning() || response == null || response.data() == null || response.data().products() == null) {
            return;
        }
        List<ProductDto> products = response.data().products().products();
        weeklySyncMetrics.recordProductPage(products == null ? 0 : products.size());
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
        recordApiCall();
        ProductSearchResponse response = apiClient.searchProducts(query, 1, DEFAULT_OBJECTS_PER_PAGE, market.getId());
        recordProductPage(response);
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
            List<ProductDto> pageProducts = response.data().products().products();
            if (pageProducts == null) {
                break;
            }
            for (ProductDto apiProd : pageProducts) {
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
                recordApiCall();
                response = apiClient.searchProducts(query, i, DEFAULT_OBJECTS_PER_PAGE, market.getId());
                recordProductPage(response);
                if (response == null || response.data() == null || response.data().products() == null) {
                    break;
                }
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
        if (markets.isEmpty()) {
            log.info("No markets found in DB to update products for.");
            return;
        }

        if (isWeeklySyncRunning()) {
            weeklySyncMetrics.setMarketsTotal(markets.size());
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
                if (isWeeklySyncRunning()) {
                    weeklySyncMetrics.recordMarketSuccess();
                }
            } catch (Exception e) {
                log.error("Error updating Market with id {}: {}", market.getId(), e.getMessage());
                if (isWeeklySyncRunning()) {
                    weeklySyncMetrics.recordMarketFailure();
                }
            }
        }
    }

    @Transactional
    public void cleanupDeprecatedData() {
        LocalDateTime productCutoff = LocalDateTime.now().minusWeeks(TTL_WEEKS_PRODUCTS);
        int deletedProducts = productRepository.deleteDeprecatedProducts(productCutoff);
        log.info("Deleted {} deprecated products (lastUpdated before {}).", deletedProducts, productCutoff);

        int deletedMarkets = cleanupClosedMarkets();
        log.info("Deleted {} closed markets with no remaining search-term associations.", deletedMarkets);
    }

    @Transactional
    protected int cleanupClosedMarkets() {
        LocalDateTime associationCutoff = LocalDateTime.now().minusWeeks(TTL_WEEKS_MARKET);
        int deletedAssociations = searchTermMarketRepository.deleteDeprecatedAssociations(associationCutoff);
        if (deletedAssociations > 0) {
            searchTermMarketRepository.flush();
            log.info("Deleted {} stale search-term associations (updatedAt before {}).",
                    deletedAssociations, associationCutoff);
        }

        List<String> searchTerms = searchTermMarketRepository.findAllSearchTerms();
        if (searchTerms.isEmpty()) {
            log.info("No search terms found; skipping market cleanup.");
            return 0;
        }

        for (String searchTerm : searchTerms) {
            MarketPickupResponse apiResponse = apiClient.searchMarkets(searchTerm);
            if (apiResponse == null || apiResponse.data() == null || apiResponse.data().servicePortfolio() == null
                    || apiResponse.data().servicePortfolio().pickupMarkets() == null) {
                log.warn("Market cleanup: API returned no data for search term '{}'; skipping.", searchTerm);
                continue;
            }

            List<MarketPickupDto> apiMarkets = apiResponse.data().servicePortfolio().pickupMarkets();
            if (apiMarkets.isEmpty()) {
                searchTermMarketRepository.deleteAllBySearchTerm(searchTerm);
                searchTermMarketRepository.flush();
                log.info("Removed all associations for search term '{}' (no markets returned).", searchTerm);
                continue;
            }

            Set<Long> apiMarketIds = new HashSet<>();
            for (MarketPickupDto dto : apiMarkets) {
                apiMarketIds.add(dto.wwIdent());
            }

            List<SearchTermMarket> existingAssociations =
                    searchTermMarketRepository.findAllByIdSearchTerm(searchTerm);
            List<SearchTermMarket> staleAssociations = existingAssociations.stream()
                    .filter(stm -> stm.getMarket() == null || !apiMarketIds.contains(stm.getMarket().getId()))
                    .toList();

            if (!staleAssociations.isEmpty()) {
                searchTermMarketRepository.deleteAll(staleAssociations);
                searchTermMarketRepository.flush();
                log.info("Removed {} stale associations for search term '{}'.",
                        staleAssociations.size(), searchTerm);
            }
        }

        searchTermMarketRepository.flush();

        List<Market> marketsToDelete = marketRepository.findAllWithNoSearchTermAssociations();
        if (marketsToDelete.isEmpty()) {
            return 0;
        }

        List<Long> marketIdsToDelete = marketsToDelete.stream()
            .map(Market::getId)
            .toList();

        int deleted = marketRepository.deleteAllByIds(marketIdsToDelete);
        return deleted;
    }

    // ! Don't delete yet, multi-threading can be useful in the future, but causes issues now
    // // NOTE: NO @Transactional here! We want to keep DB connections free while
    // // waiting for API.
    // public Market getProductsAPI(Market market, String query, int maxPages) {

    //     Long marketId = market.getId();

    //     // --- STEP 1: Fetch First Page (Synchronous) ---
    //     log.info("Fetching API Page 1...");

    //     ProductSearchResponse firstPage = apiClient.searchProducts(query, 1, DEFAULT_OBJECTS_PER_PAGE, marketId);
    //     if (firstPage == null || firstPage.data() == null)
    //         return null;

    //     // Collect all found products into a single list
    //     List<ProductDto> allFoundProducts = new ArrayList<>(firstPage.data().products().products());

    //     // --- STEP 2: Calculate Pages ---
    //     int totalApiPages = firstPage.data().products().pagination().pageCount();
    //     int pagesToFetch = Math.min(maxPages, totalApiPages);

    //     // --- STEP 3: Parallel Fetch (Scatter) ---
    //     if (pagesToFetch > 1) {
    //         log.info("Starting parallel fetch for {} more pages...", pagesToFetch - 1);

    //         List<CompletableFuture<List<ProductDto>>> futures = new ArrayList<>();

    //         // Start loops from Page 2
    //         for (int i = 2; i <= pagesToFetch; i++) {
    //             final int pageNum = i; // Needed for lambda

    //             // Create a task that runs in the background
    //             CompletableFuture<List<ProductDto>> future = CompletableFuture.supplyAsync(() -> {
    //                 try {
    //                     var response = apiClient.searchProducts(query, pageNum,
    //                             DEFAULT_OBJECTS_PER_PAGE, marketId);
    //                     if (response != null && response.data() != null) {
    //                         return response.data().products().products();
    //                     }
    //                 } catch (Exception e) {
    //                     log.error("Failed to fetch page " + pageNum, e);
    //                 }
    //                 return List.<ProductDto>of(); // Return empty list on failure
    //             });

    //             futures.add(future);
    //         }

    //         // --- STEP 4: Wait for All (Gather) ---
    //         // This blocks the main thread until ALL requests are done
    //         CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

    //         // Extract data from futures
    //         for (var future : futures) {
    //             try {
    //                 allFoundProducts.addAll(future.get());
    //             } catch (Exception e) {
    //                 // Should not happen since we used join(), but good practice
    //             }
    //         }
    //     }

    //     log.info("Finished fetching. Total items found: {}",
    //             allFoundProducts.size());

    //     // --- STEP 5: Save to DB (Transactional) ---
    //     // Now we call a separate method that handles the DB Lock
    //     return updateMarketData(marketId, allFoundProducts);
    // }

    // // Separate helper method just for the DB write
    // @Transactional
    // protected Market updateMarketData(Long marketId, List<ProductDto> dtos) {
    //     Market market = marketRepository.findById(marketId).orElseThrow();

    //     // Create Lookup Map for O(1) access
    //     Map<Long, Product> existingMap = new HashMap<>();
    //     for (Product p : market.getProducts()) {
    //         existingMap.put(p.getId(), p);
    //     }

    //     // Update or Insert
    //     for (ProductDto dto : dtos) {
    //         if (existingMap.containsKey(dto.productId())) {
    //             existingMap.get(dto.productId()).updateFromDto(dto);
    //         } else {
    //             Product newProduct = Product.fromDto(dto);
    //             market.addProduct(newProduct);
    //             // Update map to avoid duplicates if API returns same item twice
    //             existingMap.put(dto.productId(), newProduct);
    //         }
    //     }

    //     return marketRepository.save(market);
    // }
}