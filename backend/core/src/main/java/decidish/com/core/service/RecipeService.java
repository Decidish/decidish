package decidish.com.core.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import jakarta.persistence.EntityManager;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.recipes.*;

// Final purpose: generate shopping list from selected recipes
@Service
public class RecipeService {
    
    private static final Logger log = LoggerFactory.getLogger(RecipeService.class);
    
    // Configuration constants

    // Trigram similarity threshold for Tier 4 fallback matching
    // Lower threshold = more matches (goal: minimize API fallback)
    // This is only for the final trigram fallback tier
    private static final Double FUZZY_MATCHING_THRESHOLD = 0.3;

    // Max number of matches to store per ingredient
    // Higher = more product options, but more storage
    private static final Integer FUZZY_MATCHING_LIMIT = 15;

    // Minimum pre-match coverage required before allowing API fallback
    // If coverage is above this threshold, API fallback is disabled to prevent rate limiting
    // E.g., 0.80 means API fallback only happens if less than 80% of ingredients are pre-matched
    private static final Double API_FALLBACK_COVERAGE_THRESHOLD = 0.70;

    // Confidence score settings for API-fetched products
    // API response are assigned confidence scores starting from API_CONFIDENCE and decreasing by DESC_INCREMENT until FLOOR_CONFIDENCE 
    // (e.g., 0.95, 0.94, 0.93, ... down to 0.80)
    private static final Float API_CONFIDENCE = 0.95f;
    private static final Float FLOOR_CONFIDENCE = 0.80f;
    private static final Float DESC_INCREMENT = 0.01f;

    // Max number of API matches to consider per ingredient
    private static final int API_MATCHING_LIMIT = 8;

    // Number of threads for parallel API calls
    private static final int API_THREADS = 20;

    // private static final ExecutorService apiExecutor = Executors.newFixedThreadPool(API_THREADS);
    private Executor apiExecutor = Executors.newFixedThreadPool(API_THREADS);

    // Feature flag to disable API fallback for load testing
    @Value("${shopping.api-fallback-enabled:true}")
    private boolean apiFallbackEnabled;

    // @Autowired
    // private MarketService marketService;

    @Autowired
    private RecipeIngredientRepository recipeIngredientRepository;

    @Autowired
    private IngredientProductRepository ingredientProductRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private MarketRepository marketRepository;
    
    @Autowired
    private MarketService marketService;

    @Autowired 
    private ProductRepository productRepository;

    @Autowired
    private EntityManager entityManager;

    public void setApiExecutor(Executor apiExecutor) {
        this.apiExecutor = apiExecutor;
    }

    // For testing: allow setting apiFallbackEnabled
    public void setApiFallbackEnabled(boolean enabled) {
        this.apiFallbackEnabled = enabled;
    }

    /**
     * Generate shopping list:
     * - Batch fetch existing IngredientProduct mappings for all ingredients in the list
     * - For ingredients without local matches, call REWE API in parallel
     * - Save new products and mappings with descending confidence scores
     */
    public ShoppingListResponse generateShoppingList(Long marketId, List<Integer> recipeIds) {
        // 1. Get raw ingredients and aggregate total needs
        List<RecipeIngredient> rawIngredients = recipeIngredientRepository.findForShoppingList(recipeIds);
        Map<Integer, Double> totalNeeds = new HashMap<>();
        Map<Integer, RecipeIngredient> ingredientRef = new HashMap<>();

        for (RecipeIngredient ri : rawIngredients) {
            Integer ingId = ri.getIngredient().getId();
            totalNeeds.merge(ingId, (ri.getQuantity() != null ? ri.getQuantity().doubleValue() : 0.0), Double::sum);
            ingredientRef.putIfAbsent(ingId, ri);
        }

        List<Integer> ingredientIds = new ArrayList<>(totalNeeds.keySet());

        // 2. Fetch all Global Mappings for these ingredients that exist in the DB
        List<IngredientProduct> allExistingMappings = recipeIngredientRepository.findProductsForIngredientsInMarket(
            ingredientIds,
            marketId
        );

        // 3. BATCH FETCH: Get all products for this market that match our mappings
        // This prevents the IllegalStateException by ensuring we have the "Inventory" ready.
        final Map<Long, Product> localProductMap = allExistingMappings.isEmpty() 
            ? Map.of() // Returns an empty, immutable map
            : productRepository.findByMarketIdAndReweIds(marketId, 
                allExistingMappings.stream()
                    .map(ip -> ip.getId().getProductId())
                    .distinct()
                    .toList())
            .stream()
            .collect(Collectors.toMap(Product::getReweId, p -> p, (a, b) -> a));
        
        // Group mappings by ingredient for processing
        Map<Integer, List<IngredientProduct>> localMatchesMap = allExistingMappings.stream()
                .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

        // Calculate pre-match coverage to determine if API fallback should be allowed
        // This prevents rate limiting when most ingredients are already matched
        int totalIngredients = ingredientIds.size();
        int matchedIngredients = (int) ingredientIds.stream()
                .filter(id -> localMatchesMap.containsKey(id) && !localMatchesMap.get(id).isEmpty())
                .count();
        double coverageRate = totalIngredients > 0 ? (double) matchedIngredients / totalIngredients : 0.0;
        
        // Only allow API fallback if coverage is below threshold
        final boolean allowApiFallback = apiFallbackEnabled && coverageRate < API_FALLBACK_COVERAGE_THRESHOLD;
        
        if (!allowApiFallback && apiFallbackEnabled) {
            log.info("API fallback suppressed: {}/{} ingredients pre-matched ({}% >= {}% threshold)", 
                matchedIngredients, totalIngredients, 
                String.format("%.1f", coverageRate * 100), 
                String.format("%.1f", API_FALLBACK_COVERAGE_THRESHOLD * 100));
        } else if (allowApiFallback) {
            log.info("API fallback allowed: {}/{} ingredients pre-matched ({}% < {}% threshold)", 
                matchedIngredients, totalIngredients, 
                String.format("%.1f", coverageRate * 100), 
                String.format("%.1f", API_FALLBACK_COVERAGE_THRESHOLD * 100));
        }

        // 4. Parallel Processing of Ingredients
        List<CompletableFuture<IngredientGroup>> futures = ingredientIds.stream()
            .map(ingId -> CompletableFuture.supplyAsync(() -> {
                Ingredient ingredient = ingredientRef.get(ingId).getIngredient();
                String ingName = ingredient.getName();
                String origName = ingredientRef.get(ingId).getOriginal();
                Double needed = totalNeeds.get(ingId);
                
                // 4a. Check Local DB first (using our pre-fetched map)
                if (localMatchesMap.containsKey(ingId) && !localMatchesMap.get(ingId).isEmpty()) {
                    final Map<Long, Product> finalLocalMap = localProductMap;
                    List<ShoppingOption> options = localMatchesMap.get(ingId).stream()
                        .map(m -> {
                            Product p = finalLocalMap.get(m.getId().getProductId());
                            return (p != null) ? createShoppingOption(m, p, needed) : null;
                        })
                        .filter(java.util.Objects::nonNull)
                        .sorted(Comparator.comparing(ShoppingOption::confidence).reversed())
                        .toList();

                    if (!options.isEmpty()) {
                        return new IngredientGroup(ingId, ingName, origName, needed, options);
                    }
                }

                // 4b. API Fallback (only if enabled AND coverage is below threshold)
                if (!allowApiFallback) {
                    log.debug("API fallback skipped for ingredient '{}': disabled or coverage above threshold", ingName);
                    return new IngredientGroup(ingId, ingName, origName, needed, List.of());
                }
                
                // Log that we're falling back to API (useful for monitoring)
                log.info("API fallback triggered for ingredient '{}' (id: {}) - no local product mapping found", ingName, ingId);
                
                try {
                    String query = ingName.isBlank() ? origName : ingName;

                    List<Product> apiProducts = marketService.getProductsQueryNoSave(marketId, query);
                    if (apiProducts.isEmpty()) {
                        return new IngredientGroup(ingId, ingName, origName, needed, List.of());
                    }

                    // Prepare Market reference for new products
                    Market managedMarket = marketRepository.getReferenceById(marketId);
                    List<IngredientProduct> newMappings = new ArrayList<>();
                    List<Product> productsToSave = new ArrayList<>();

                    int validProductCount = 0;
                    for (Product p : apiProducts) {
                        float confidence = Math.max(FLOOR_CONFIDENCE, API_CONFIDENCE - (validProductCount * DESC_INCREMENT));
                        
                        p.setMarket(managedMarket);
                        productsToSave.add(p);
                        newMappings.add(new IngredientProduct(
                            new IngredientProductId(ingId, p.getReweId()),
                            ingredient,
                            confidence));
                            
                        validProductCount++;
                        if (validProductCount >= API_MATCHING_LIMIT) break;
                    }

                    // 4c. Save and Return (Transactionally)
                    return transactionTemplate.execute(status -> {
                        saveProductsIndividually(marketId, productsToSave);
                        ingredientProductRepository.saveAll(newMappings);
                        
                        // Re-fetch saved products from DB to get their generated IDs
                        List<Long> reweIds = productsToSave.stream()
                            .map(Product::getReweId)
                            .toList();
                        Map<Long, Product> freshApiMap = productRepository
                            .findByMarketIdAndReweIds(marketId, reweIds)
                            .stream()
                            .collect(Collectors.toMap(Product::getReweId, p -> p, (a, b) -> a));

                        return new IngredientGroup(ingId, ingName, origName, needed, 
                            newMappings.stream()
                                .map(m -> createShoppingOption(m, freshApiMap.get(m.getId().getProductId()), needed))
                                .filter(java.util.Objects::nonNull)
                                .sorted(Comparator.comparing(ShoppingOption::confidence).reversed())
                                .toList());
                    });

                } catch (Exception e) {
                    log.error("Failed to fetch API for {}: {}", ingName, e.getMessage());
                    return new IngredientGroup(ingId, ingName, origName, needed, List.of());
                }
            }, apiExecutor))
            .toList();

        List<IngredientGroup> groups = futures.stream()
            .map(CompletableFuture::join)
            .sorted(Comparator.comparing(IngredientGroup::ingredientName))
            .collect(Collectors.toList());
        
        return new ShoppingListResponse(groups);
    }

    /**
     * Updated Helper: Now accepts the Product directly to avoid N+1 queries.
     */
    private ShoppingOption createShoppingOption(IngredientProduct mapping, Product product, Double neededAmount) {
        if (product == null) return null;

        Double productSize = product.getNormalizedAmount() != null && product.getNormalizedAmount() > 0 
                            ? product.getNormalizedAmount() 
                            : 1.0; 

        int quantity = (int) Math.ceil(neededAmount / productSize);

        return new ShoppingOption(
            product,
            quantity,
            productSize * quantity,
            mapping.getConfidence()
        );
    }

    /**
     * Helper to save products for a market without loading the whole Market collection.
     */
    private void saveProductsIndividually(Long marketId, List<Product> products) {
        for (Product p : products) {
            // Check if product with this reweId exists for this market
            Optional<Product> existing = productRepository.findByMarketIdAndReweId(marketId, p.getReweId());
            if (existing.isPresent()) {
                Product dbProd = existing.get();
                dbProd.updateFromOther(p); // Update price/name
                productRepository.save(dbProd);
            } else {
                productRepository.save(p);
            }
        }
    }

    // Batch size for processing ingredients in fuzzy matching
    // Smaller batches prevent connection timeout/leak issues
    private static final int FUZZY_MATCHING_BATCH_SIZE = 200;

    /**
     * Pre-process fuzzy matching for all ingredients in the database.
     * Uses batched processing to avoid connection leak issues with long-running queries.
     * @return List of all generated IngredientProduct mappings.
     */
    public List<IngredientProduct> fuzzyMatchingPreProcessing() {
        // 0. Refresh the unique_products materialized view (must be done after product sync)
        log.info("Refreshing unique_products materialized view...");
        transactionTemplate.execute(status -> {
            ingredientProductRepository.refreshUniqueProductsView();
            return null;
        });
        log.info("Materialized view refreshed.");

        // 1. Get all ingredient IDs first (quick query)
        List<Integer> allIngredientIds = transactionTemplate.execute(status -> 
            ingredientProductRepository.findAllIngredientsIds()
        );
        
        if (allIngredientIds == null || allIngredientIds.isEmpty()) {
            log.warn("No ingredients found for fuzzy matching.");
            return List.of();
        }
        
        log.info("Found {} ingredients to process.", allIngredientIds.size());

        // 2. Process in batches to avoid connection timeout
        List<IngredientMatchProjection> allProjections = new ArrayList<>();
        int totalBatches = (int) Math.ceil((double) allIngredientIds.size() / FUZZY_MATCHING_BATCH_SIZE);
        
        for (int batchNum = 0; batchNum < totalBatches; batchNum++) {
            int fromIndex = batchNum * FUZZY_MATCHING_BATCH_SIZE;
            int toIndex = Math.min(fromIndex + FUZZY_MATCHING_BATCH_SIZE, allIngredientIds.size());
            List<Integer> batchIds = allIngredientIds.subList(fromIndex, toIndex);
            
            log.info("Processing batch {}/{} ({} ingredients)...", batchNum + 1, totalBatches, batchIds.size());
            
            // Each batch runs in its own transaction with its own connection
            List<IngredientMatchProjection> batchProjections = transactionTemplate.execute(status -> 
                ingredientProductRepository.findGenericMatches(
                    batchIds,
                    FUZZY_MATCHING_THRESHOLD,
                    FUZZY_MATCHING_LIMIT
                )
            );
            
            if (batchProjections != null) {
                allProjections.addAll(batchProjections);
            }
        }
        
        log.info("Found {} total ingredient-product matches.", allProjections.size());

        // 3. Clear table and save all mappings in a single transaction
        final List<IngredientMatchProjection> projections = allProjections;
        
        return transactionTemplate.execute(status -> {
            // Clear existing mappings
            ingredientProductRepository.deleteAllInBatch();
            ingredientProductRepository.flush();
            
            // Map Projections to Entities
            List<IngredientProduct> entities = projections.stream().map(p -> {
                IngredientProductId id = new IngredientProductId(p.getIngredientId(), p.getProductId());
                
                IngredientProduct ip = new IngredientProduct();
                ip.setId(id);
                ip.setConfidence(p.getConfidence());
                
                // Set the reference so Hibernate can validate the relationship
                ip.setIngredient(entityManager.getReference(Ingredient.class, p.getIngredientId()));
                
                return ip;
            }).toList();

            return ingredientProductRepository.saveAll(entities);
        });
    }
}
