package decidish.com.core.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.DoubleBinaryOperator;

import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.MarketService;
import jakarta.persistence.EntityManager;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.recipes.*;

// Final purpose: generate shopping list from selected recipes
@Service
public class RecipeService {
    
    private static final Logger log = LoggerFactory.getLogger(RecipeService.class);
    
    // Configuration constants

    // Too low => less accurate, faster -> 0.0 means (almost) everything matches so we don't call the rewe API
    // Too high => more accurate, slower -> 1.0 means nothing matches so we always call the rewe API
    // Between 0.0 and 1.0
    private static final Double FUZZY_MATCHING_THRESHOLD = 0.6;

    // Max number of fuzzy matches to retrieve from DB per ingredient
    // Keep it higher in case best matches are not available in market
    private static final Integer FUZZY_MATCHING_LIMIT = 10;

    // Confidence score settings for API-fetched products
    // API response are assigned confidence scores starting from API_CONFIDENCE and decreasing by DESC_INCREMENT until FLOOR_CONFIDENCE 
    // (e.g., 0.95, 0.94, 0.93, ... down to 0.80)
    private static final Float API_CONFIDENCE = 0.95f;
    private static final Float FLOOR_CONFIDENCE = 0.80f;
    private static final Float DESC_INCREMENT = 0.01f;

    // Max number of API matches to consider per ingredient
    private static final int API_MATCHING_LIMIT = 5;

    // Number of threads for parallel API calls
    private static final int API_THREADS = 20;

    private static final ExecutorService apiExecutor = Executors.newFixedThreadPool(API_THREADS);

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
    
    /**
     * Generates a shopping list with alternatives and quantities.
     * Optimized: Fetches missing ingredients from API in parallel.
     */
    public ShoppingListResponse generateShoppingList(Long marketId, List<Integer> recipeIds) {

        // Fetch all raw ingredients for the selected recipes
        List<RecipeIngredient> rawIngredients = recipeIngredientRepository.findForShoppingList(recipeIds);

        // TODO: remove this (done in the sql query)
        // Aggregation: Sum amounts for the same Ingredient ID
        Map<Integer, Double> totalNeeds = new HashMap<>();
        Map<Integer, RecipeIngredient> ingredientRef = new HashMap<>();

        for (RecipeIngredient ri : rawIngredients) {
            Integer ingId = ri.getIngredient().getId();
            BigDecimal amount = ri.getQuantity() != null ? ri.getQuantity() : BigDecimal.ZERO;
            
            totalNeeds.merge(ingId, amount.doubleValue(), Double::sum);
            ingredientRef.putIfAbsent(ingId, ri);
        }

        // Batch fetch matching products for ALL ingredients in this market
        List<Integer> ingredientIds = new ArrayList<>(totalNeeds.keySet());
        // List<IngredientProduct> allMappings = recipeIngredientRepository.findProductsForIngredientsInMarket(
        //     ingredientIds,
        //     marketId
        // );

        List<IngredientProduct> allMappings = getMatches(ingredientIds, marketId);

        // Group mappings by Ingredient ID
        Map<Integer, List<IngredientProduct>> matchesByIngredient = allMappings.stream()
            .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

        // Build the Response (Thread-safe list for async additions)
        List<IngredientGroup> groups = Collections.synchronizedList(new ArrayList<>());
        List<CompletableFuture<Void>> apiFutures = new ArrayList<>();

        for (Integer ingId : ingredientIds) {
            RecipeIngredient ref = ingredientRef.get(ingId);
            Double needed = totalNeeds.get(ingId);
            List<IngredientProduct> matches = matchesByIngredient.getOrDefault(ingId, List.of());

            // Convert local matches into ShoppingOptions
            List<ShoppingOption> localOptions = matches.stream()
                .map(match -> createShoppingOption(match, needed))
                .sorted(Comparator.comparing(ShoppingOption::confidence).reversed())
                .collect(Collectors.toList());

            if (!localOptions.isEmpty()) {
                groups.add(new IngredientGroup(
                    ingId, ref.getIngredient().getName(), needed, localOptions
                ));
            } else {
                // No local matches, fetch from API in PARALLEL
                // This prevents 10 missing ingredients from taking 10x API latency
                CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                    String ingName = ref.getIngredient().getName();
                    List<ShoppingOption> apiOptions = fetchOptionsFromApi(marketId, ingId, ingName, needed, ref.getIngredient());
                    
                    groups.add(new IngredientGroup(
                        ingId, ingName, needed, apiOptions
                    ));
                });
                apiFutures.add(future);
            }
        }

        // Wait for all async API calls to complete
        if (!apiFutures.isEmpty()) {
            CompletableFuture.allOf(apiFutures.toArray(new CompletableFuture[0])).join();
        }

        // Sort final list for deterministic output (e.g., alphabetically by ingredient)
        groups.sort(Comparator.comparing(IngredientGroup::ingredientName));

        return new ShoppingListResponse(groups);
    }

    /**
     * Helper to safely fetch from API without blocking the main logic flow.
     */
    private List<ShoppingOption> fetchOptionsFromApi(Long marketId, Integer ingId, String ingName, Double needed, Ingredient ingredient) {
        List<ShoppingOption> options = new ArrayList<>();
        try {
            log.info("Fetching from API for missing ingredient: {}", ingName);
            Market marketResponse = marketService.getProductsQuery(marketId, ingName);
            
            if (marketResponse != null && marketResponse.getProducts() != null) {
                List<Product> apiProducts = marketResponse.getProducts();
                
                for(Product apiProduct : apiProducts){
                    // Create temporary mapping objects to reuse the calculation logic
                    IngredientProductId igId = new IngredientProductId(ingId, apiProduct.getId());
                    IngredientProduct ig = new IngredientProduct(igId, ingredient, apiProduct, 0.95f);
                    
                    options.add(createShoppingOption(ig, needed));
                }
                log.debug("Added {} products from API for ingredient: {}", apiProducts.size(), ingName);
            } else {
                log.warn("API returned no products for ingredient: {} (ID: {})", ingName, ingId);
            }
        } catch (Exception e) {
            log.error("Error fetching products from API for ingredient: {}", ingName, e);
        }
        return options;
    }
    
    /**
     * Helper to calculate quantity and build the DTO.
     */
    private ShoppingOption createShoppingOption(IngredientProduct mapping, Double neededAmount) {
        Product product = mapping.getProduct();
        
        // Get product size from ML Pipeline's normalized field
        // Fallback to 1.0 to avoid DivisionByZero if data is missing
        Double productSize = product.getNormalizedAmount() != null && product.getNormalizedAmount() > 0 
                             ? product.getNormalizedAmount() 
                             : 1.0; 

        // Calculate quantity: Ceil(Need / Size)
        // e.g. Need 500g, Pack is 250g -> Buy 2
        // e.g. Need 100g, Pack is 1000g -> Buy 1
        int quantity = (int) Math.ceil(neededAmount / productSize);

        return new ShoppingOption(
            product,
            quantity,
            productSize * quantity, // Total amount you end up buying
            mapping.getConfidence() // AI Confidence score
        );
    }

    public ShoppingListResponse generateShoppingListV2(Long marketId, List<Integer> recipeIds) {

        // 1️⃣ Fetch all raw ingredients for the selected recipes
        List<RecipeIngredient> rawIngredients = recipeIngredientRepository.findForShoppingList(recipeIds);

        // 2️⃣ Aggregate needs for each ingredient
        Map<Integer, Double> totalNeeds = new HashMap<>();
        Map<Integer, RecipeIngredient> ingredientRef = new HashMap<>();
        for (RecipeIngredient ri : rawIngredients) {
            Integer ingId = ri.getIngredient().getId();
            BigDecimal amount = ri.getQuantity() != null ? ri.getQuantity() : BigDecimal.ZERO;
            totalNeeds.merge(ingId, amount.doubleValue(), Double::sum);
            ingredientRef.putIfAbsent(ingId, ri);
        }

        List<Integer> ingredientIds = new ArrayList<>(totalNeeds.keySet());

        // 3️⃣ Fetch local matches from DB
        // List<IngredientProduct> allMappings = recipeIngredientRepository.findProductsForIngredientsInMarket(
        //         ingredientIds, marketId
        // );

        List<IngredientProduct> allMappings = getMatches(ingredientIds, marketId);

        Map<Integer, List<IngredientProduct>> matchesByIngredient = allMappings.stream()
                .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

    //     // 4️⃣ Prepare thread-safe list for ingredient groups
    //     List<IngredientGroup> groups = Collections.synchronizedList(new ArrayList<>());
    //     List<CompletableFuture<Void>> apiFutures = new ArrayList<>();

    //     for (Integer ingId : ingredientIds) {
    //         RecipeIngredient ref = ingredientRef.get(ingId);
    //         Double needed = totalNeeds.get(ingId);
    //         List<IngredientProduct> matches = matchesByIngredient.getOrDefault(ingId, List.of());

    //         // 4a️⃣ Local matches available? Use them
    //         if (!matches.isEmpty()) {
    //             List<ShoppingOption> localOptions = matches.stream()
    //                     .map(match -> createShoppingOption(match, needed))
    //                     .sorted(Comparator.comparing(ShoppingOption::confidence).reversed())
    //                     .toList();

    //             groups.add(new IngredientGroup(ingId, ref.getIngredient().getName(), needed, localOptions));

    //         } else {
    //             // 4b️⃣ No local match → fetch from API asynchronously
    //             CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {

    //                 String ingName = ref.getIngredient().getName();

    //                 // Fetch market products for this ingredient (non-transactional)
    //                 Market marketWithProducts = marketService.getProductsQueryV2(marketId, ingName);

    //                 // Convert API products to ShoppingOptions
    //                 List<ShoppingOption> apiOptions = marketWithProducts.getProducts().stream()
    //                         .map(p -> createShoppingOption(
    //                                 new IngredientProduct(
    //                                         new IngredientProductId(ingId, p.getId()),
    //                                         ref.getIngredient(),
    //                                         p,
    //                                         0.95f
    //                                 ),
    //                                 needed
    //                         ))
    //                         .sorted(Comparator.comparing(ShoppingOption::confidence).reversed())
    //                         .limit(MATCHING_LIMIT)
    //                         .toList();

    //                 // Add to ingredient groups (thread-safe)
    //                 groups.add(new IngredientGroup(ingId, ingName, needed, apiOptions));

    //                 // Save fetched products into DB transactionally
    //                 saveFetchedMarketAsync(marketWithProducts);

    //                 // --- SAVE MAPPED PRODUCTS TO DB ---
    //                 List<IngredientProduct> toSave = apiOptions.stream()
    //                     .map(opt -> {
    //                         IngredientProductId id = new IngredientProductId(ingId, opt.product().getId());
    //                         return new IngredientProduct(id, ref.getIngredient(), opt.product(), API_CONFIDENCE);
    //                     })
    //                     .toList();

    //                 ingredientProductRepository.saveAll(toSave);

    //             });

    //             apiFutures.add(future);
    //         }
    //     }

    //     // 5️⃣ Wait for all async API calls to finish
    //     CompletableFuture.allOf(apiFutures.toArray(new CompletableFuture[0])).join();

    //     // 6️⃣ Sort for deterministic output
    //     groups.sort(Comparator.comparing(IngredientGroup::ingredientName));

    //     return new ShoppingListResponse(groups);
    // }

        List<CompletableFuture<IngredientGroup>> futures = ingredientIds.stream()
            .map(ingId -> CompletableFuture.supplyAsync(() -> {
                RecipeIngredient ref = ingredientRef.get(ingId);
                Double needed = totalNeeds.get(ingId);
                String ingName = ref.getIngredient().getName();

                // 1. Check DB first (Inside the thread to be safe)
                // List<IngredientProduct> matches = recipeIngredientRepository
                //     .findProductsForIngredientsInMarket(List.of(ingId), marketId);

                List<IngredientProduct> matches = getMatches(List.of(ingId), marketId);

                if (!matches.isEmpty()) {
                    return new IngredientGroup(ingId, ingName, needed, 
                        matches.stream().map(m -> createShoppingOption(m, needed)).toList());
                }

                // 2. Fetch from API
                Market marketWithProducts = marketService.getProductsQueryV2(marketId, ingName);
                
                // ⚠️ FIX: If API returned random/all products, filter them or return empty
                if (marketWithProducts.getProducts().isEmpty()) {
                    return new IngredientGroup(ingId, ingName, needed, List.of());
                }

                // 3. Persist products and mapping in ONE transaction to ensure FK integrity
                return transactionTemplate.execute(status -> {
                    // Save products first
                    saveFetchedMarketAsync(marketWithProducts); 
                    
                    // Now save the mapping
                    List<IngredientProduct> toSave = marketWithProducts.getProducts().stream()
                        .limit(5)
                        .map(p -> new IngredientProduct(new IngredientProductId(ingId, p.getId()), 
                                                    ref.getIngredient(), p, 0.95f))
                        .toList();
                    
                    ingredientProductRepository.saveAll(toSave);
                    
                    return new IngredientGroup(ingId, ingName, needed, 
                        toSave.stream().map(m -> createShoppingOption(m, needed)).toList());
                });
            }, apiExecutor)) // Use the custom executor!
            .toList();

        // Wait for all and collect results
        List<IngredientGroup> groups = futures.stream()
            .map(CompletableFuture::join)
            .collect(Collectors.toList());

        groups.sort(Comparator.comparing(IngredientGroup::ingredientName));
        return new ShoppingListResponse(groups);
    }

    /**
     * Save fetched market & products transactionally to avoid TransactionNeeded issues.
     */
    private void saveFetchedMarketAsync(Market market) {
        transactionTemplate.execute(status -> {

            Market existing = marketRepository.findById(market.getId()).orElse(null);

            if (existing != null) {
                Map<Long, Product> existingMap = existing.getProducts().stream()
                        .collect(Collectors.toMap(Product::getId, p -> p));

                for (Product p : market.getProducts()) {
                    if (existingMap.containsKey(p.getId())) {
                        Product existingProduct = existingMap.get(p.getId());
                        // Update fields individually
                        existingProduct.setName(p.getName());
                        existingProduct.setPrice(p.getPrice());
                        existingProduct.setNormalizedAmount(p.getNormalizedAmount());
                        existingProduct.setLastUpdated(p.getLastUpdated());
                        // Add other fields as needed
                    } else {
                        existing.addProduct(p);
                    }
                }
                marketRepository.save(existing);

            } else {
                marketRepository.save(market);
            }

            return null;
        });
    }

    public ShoppingListResponse generateShoppingListV3(Long marketId, List<Integer> recipeIds) {
        long startTime = System.currentTimeMillis();

        // 1️⃣ Fetch raw ingredients
        List<RecipeIngredient> rawIngredients = recipeIngredientRepository.findForShoppingList(recipeIds);

        // 2️⃣ Aggregate needs
        Map<Integer, Double> totalNeeds = new HashMap<>();
        Map<Integer, RecipeIngredient> ingredientRef = new HashMap<>();
        for (RecipeIngredient ri : rawIngredients) {
            Integer ingId = ri.getIngredient().getId();
            totalNeeds.merge(ingId, (ri.getQuantity() != null ? ri.getQuantity().doubleValue() : 0.0), Double::sum);
            ingredientRef.putIfAbsent(ingId, ri);
        }

        List<Integer> ingredientIds = new ArrayList<>(totalNeeds.keySet());

        // 3️⃣ FETCH ALL LOCAL MATCHES ONCE (Performance Optimization)
        // This prevents 34 separate DB calls inside the threads
        // List<IngredientProduct> allExistingMappings = recipeIngredientRepository
        //         .findProductsForIngredientsInMarket(ingredientIds, marketId);

        List<IngredientProduct> allExistingMappings = getMatches(ingredientIds, marketId);

        // --- DEBUG PRINT START ---
        System.out.println("--- DB PRE-MATCH CHECK ---");
        System.out.println("Market ID: " + marketId);
        System.out.println("Ingredients searched: " + ingredientIds.size());
        System.out.println("Matches found in DB: " + allExistingMappings.size());
        if (!allExistingMappings.isEmpty()) {
            allExistingMappings.forEach(m -> System.out.println(
                "DB Match: " + m.getIngredient().getName() + 
                " -> " + m.getProduct().getName() + 
                " (Confidence: " + m.getConfidence() + ")"
            ));
        } else {
            System.out.println("⚠️ No matches found in DB. API fallback will be triggered for all ingredients.");
        }
        System.out.println("--------------------------");
        // --- DEBUG PRINT END ---
        
        Map<Integer, List<IngredientProduct>> localMatchesMap = allExistingMappings.stream()
                .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

        // 4️⃣ Process Ingredients
        List<CompletableFuture<IngredientGroup>> futures = ingredientIds.stream()
            .map(ingId -> CompletableFuture.supplyAsync(() -> {
                String ingName = ingredientRef.get(ingId).getIngredient().getName();
                Double needed = totalNeeds.get(ingId);
                
                // 4a. Use Local Match if it exists
                if (localMatchesMap.containsKey(ingId) && !localMatchesMap.get(ingId).isEmpty()) {
                    List<ShoppingOption> options = localMatchesMap.get(ingId).stream()
                        .map(m -> createShoppingOption(m, needed))
                        .sorted(Comparator.comparing(ShoppingOption::confidence).reversed())
                        .toList();
                    return new IngredientGroup(ingId, ingName, needed, options);
                }

                // 4b. API Fallback (Isolated Logic)
                try {
                    // Ensure this method returns a NEW list of products, not a reference to a shared one
                    Market apiResult = marketService.getProductsQueryV2(marketId, ingName);
                    List<Product> products = new ArrayList<>(apiResult.getProducts());

                    // Sanity Filter: Check if the product name actually matches the ingredient
                    String matchTarget = ingName.toLowerCase().split(" ")[0]; 
                    List<Product> filtered = products.stream()
                        .filter(p -> p.getName().toLowerCase().contains(matchTarget))
                        .limit(5)
                        .toList();

                    if (filtered.isEmpty()) {
                        return new IngredientGroup(ingId, ingName, needed, List.of());
                    }

                    // 4c. Save New Matches (Using TransactionTemplate)
                    return transactionTemplate.execute(status -> {
                        // Update the market result with ONLY the filtered products for this thread
                        apiResult.setProducts(filtered);
                        saveFetchedMarketAsync(apiResult); 

                        List<IngredientProduct> newMappings = filtered.stream()
                            .map(p -> new IngredientProduct(
                                new IngredientProductId(ingId, p.getReweId()),
                                ingredientRef.get(ingId).getIngredient(),
                                p,
                                0.95f))
                            .toList();
                        
                        ingredientProductRepository.saveAll(newMappings);
                        
                        return new IngredientGroup(ingId, ingName, needed, 
                            newMappings.stream().map(m -> createShoppingOption(m, needed)).toList());
                    });
                } catch (Exception e) {
                    System.err.println("Failed to fetch API for " + ingName + ": " + e.getMessage());
                    return new IngredientGroup(ingId, ingName, needed, List.of());
                }
            }, apiExecutor))
            .toList();

        List<IngredientGroup> groups = futures.stream()
            .map(CompletableFuture::join)
            .collect(Collectors.toList());

        groups.sort(Comparator.comparing(IngredientGroup::ingredientName));
        
        System.out.println("Generation took: " + (System.currentTimeMillis() - startTime) + "ms");
        return new ShoppingListResponse(groups);
    }

    public ShoppingListResponse generateShoppingListV4(Long marketId, List<Integer> recipeIds) {
        long startTime = System.currentTimeMillis();

        List<RecipeIngredient> rawIngredients = recipeIngredientRepository.findForShoppingList(recipeIds);
        Map<Integer, Double> totalNeeds = new HashMap<>();
        Map<Integer, RecipeIngredient> ingredientRef = new HashMap<>();

        for (RecipeIngredient ri : rawIngredients) {
            Integer ingId = ri.getIngredient().getId();
            totalNeeds.merge(ingId, (ri.getQuantity() != null ? ri.getQuantity().doubleValue() : 0.0), Double::sum);
            ingredientRef.putIfAbsent(ingId, ri);
        }

        List<Integer> ingredientIds = new ArrayList<>(totalNeeds.keySet());
        List<IngredientProduct> allExistingMappings = getMatches(ingredientIds, marketId);
        
        Map<Integer, List<IngredientProduct>> localMatchesMap = allExistingMappings.stream()
                .collect(Collectors.groupingBy(ip -> ip.getIngredient().getId()));

        List<CompletableFuture<IngredientGroup>> futures = ingredientIds.stream()
            .map(ingId -> CompletableFuture.supplyAsync(() -> {
                Ingredient ingredient = ingredientRef.get(ingId).getIngredient();
                String ingName = ingredient.getName();
                Double needed = totalNeeds.get(ingId);
                
                // 4a. Check Local DB first
                if (localMatchesMap.containsKey(ingId) && !localMatchesMap.get(ingId).isEmpty()) {
                    List<ShoppingOption> options = localMatchesMap.get(ingId).stream()
                        .map(m -> createShoppingOption(m, needed))
                        .sorted(Comparator.comparing(ShoppingOption::confidence).reversed())
                        .toList();
                    return new IngredientGroup(ingId, ingName, needed, options);
                }

    //             // 4b. API Fallback (Isolated per thread)
    //             try {
    //                 List<Product> apiProducts = marketService.getProductsQueryV3(marketId, ingName);
                    
    //                 // preserve API rank by calculating confidence: 0.95, 0.94, 0.93...
    //                 List<IngredientProduct> newMappings = new ArrayList<>();
    //                 String matchKey = ingName.toLowerCase().split(" ")[0];

    //                 for (int i = 0; i < apiProducts.size(); i++) {
    //                     Product p = apiProducts.get(i);
    //                     // Filter out obvious mismatches
    //                     if (p.getName().toLowerCase().contains(matchKey)) {
    //                         float confidence = Math.max(0.70f, 0.95f - (i * 0.01f));
    //                         newMappings.add(new IngredientProduct(
    //                             new IngredientProductId(ingId, p.getReweId()),
    //                             ingredient,
    //                             p,
    //                             confidence
    //                         ));
    //                     }
    //                     if (newMappings.size() >= 5) break;
    //                 }

    //                 if (newMappings.isEmpty()) return new IngredientGroup(ingId, ingName, needed, List.of());

    //                 // 4c. Transactional Save (Persist Products AND Mappings)
    //                 return transactionTemplate.execute(status -> {
    //                     // 1. Ensure products exist in the DB (upsert logic)
    //                     List<Product> productsToSave = newMappings.stream().map(IngredientProduct::getProduct).toList();
    //                     saveProductsIndividually(marketId, productsToSave);

    //                     // 2. Save the fuzzy match mappings
    //                     ingredientProductRepository.saveAll(newMappings);
                        
    //                     return new IngredientGroup(ingId, ingName, needed, 
    //                         newMappings.stream().map(m -> createShoppingOption(m, needed)).toList());
    //                 });

    //             } catch (Exception e) {
    //                 log.error("Error processing ingredient {}: {}", ingName, e.getMessage());
    //                 return new IngredientGroup(ingId, ingName, needed, List.of());
    //             }
    //         }, apiExecutor))
    //         .toList();

    //     List<IngredientGroup> groups = futures.stream().map(CompletableFuture::join).collect(Collectors.toList());
    //     groups.sort(Comparator.comparing(IngredientGroup::ingredientName));
        
    //     return new ShoppingListResponse(groups);
    // }

        // 4b. API Fallback (Isolated Logic)
        try {
            // getProductsQueryV3 returns a fresh List<Product> detached from the market entity
            List<Product> apiProducts = marketService.getProductsQueryV3(marketId, ingName);

            List<IngredientProduct> newMappings = new ArrayList<>();

            // Use a counter to assign descending confidence
            int validProductCount = 0;
            for (int i = 0; i < apiProducts.size(); i++) {
                Product p = apiProducts.get(i);
                    
                // Assign descending confidence: 0.95, 0.94, 0.93...
                // We use i (the API rank) to determine the score
                float descendingConfidence = API_CONFIDENCE - (validProductCount * DESC_INCREMENT);
                
                // Cap at a reasonable floor (e.g., 0.80) so we don't drop too low
                descendingConfidence = Math.max(FLOOR_CONFIDENCE, descendingConfidence);

                newMappings.add(new IngredientProduct(
                    new IngredientProductId(ingId, p.getReweId()),
                    ingredientRef.get(ingId).getIngredient(),
                    p,
                    descendingConfidence));
                    
                validProductCount++;

                // Limit to top 5 to keep the list clean
                if (validProductCount >= API_MATCHING_LIMIT) break;
            }

            if (newMappings.isEmpty()) {
                List<ShoppingOption> options = new ArrayList<>();
                options.add(null);
                return new IngredientGroup(ingId, ingName, needed, options);
            }

            // 4c. Save New Matches (Transactionally)
            return transactionTemplate.execute(status -> {
                // Save/Update products first
                saveProductsIndividually(marketId, newMappings.stream().map(IngredientProduct::getProduct).toList());
                
                // Save the mappings with the descending confidence
                ingredientProductRepository.saveAll(newMappings);
                
                return new IngredientGroup(ingId, ingName, needed, 
                    newMappings.stream()
                        .map(m -> createShoppingOption(m, needed))
                        // Ensure the final UI group is sorted by our new confidence
                        .sorted(Comparator.comparing(ShoppingOption::confidence).reversed())
                        .toList());
            });

        } catch (Exception e) {
            log.error("Failed to fetch API for {}: {}", ingName, e.getMessage());
            return new IngredientGroup(ingId, ingName, needed, List.of());
        }
            }, apiExecutor))
            .toList();

        List<IngredientGroup> groups = futures.stream().map(CompletableFuture::join).collect(Collectors.toList());
        groups.sort(Comparator.comparing(IngredientGroup::ingredientName));
        
        return new ShoppingListResponse(groups);
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


    // /**
    //  * Pre-process fuzzy matching for all ingredients in the database.
    //  * @return List of all generated IngredientProduct mappings.
    //  */
    // public List<IngredientProduct> fuzzyMatchingPreProcessing() {
    //     List<Integer> allIngredientIds = ingredientProductRepository.findAllIngredientsIds();
    //     log.info("Total ingredients to process for fuzzy matching: " + allIngredientIds.size());

    //     // Print numvber of products in DB
    //     long productCount = productRepository.count();
    //     log.info("Total products in database: " + productCount);

    //     // List<IngredientProduct> allMatches = ingredientProductRepository.findGenericMatches(
    //     //     allIngredientIds,
    //     //     FUZZY_MATCHING_THRESHOLD,
    //     //     MATCHING_LIMIT
    //     // );

    //     // Repository returns List<Object[]>
    //     List<Object[]> rawResults = ingredientProductRepository.findGenericMatchesRaw(...);

    //     List<IngredientProduct> allMatches = rawResults.stream().map(row -> {
    //         // Extract columns by index (check your SELECT order!)
    //         Integer ingId = (Integer) row[0];
    //         Long prodId = ((Number) row[1]).longValue(); // Handles potential type casting issues
    //         Float conf = ((Number) row[2]).floatValue();

    //         IngredientProductId id = new IngredientProductId(ingId, prodId);
    //         IngredientProduct ip = new IngredientProduct();
    //         ip.setId(id);
    //         ip.setConfidence(conf);
            
    //         // Set references to avoid fetching full entities
    //         ip.setIngredient(entityManager.getReference(Ingredient.class, ingId));
    //         ip.setProduct(entityManager.getReference(Product.class, prodId));
            
    //         return ip;
    //     }).toList();

    //     log.info("Total fuzzy matches found: " + allMatches.size());

        

    //     // Refresh the ingredient-product mappings in the database
    //     // ? TODO: maybe optimize this to only update changed entries or bulky additions/deletions if bad performance
    //     ingredientProductRepository.deleteAllInBatch();
    //     ingredientProductRepository.flush(); // Execute the delete NOW
    //     // 3. Create CLEAN copies of the matches
    //     List<IngredientProduct> cleanMatches = allMatches.stream()
    //         .map(match -> {
    //             IngredientProduct clean = new IngredientProduct();
    //             clean.setIngredient(match.getIngredient());
    //             clean.setProduct(match.getProduct());
    //             clean.setConfidence(match.getConfidence());
    //             // Ensure ID is null so Hibernate treats it as a fresh INSERT
    //             // clean.setId(null); 
    //             return clean;
    //         })
    //         .toList();

    //     // 4. Save the clean copies
    //     List<IngredientProduct> saved = ingredientProductRepository.saveAll(cleanMatches);
    //     ingredientProductRepository.flush();

    //     return saved;
    // }


    // public List<IngredientProduct> fuzzyMatchingPreProcessing() {
    //     // 1. Get Projections
    //     List<IngredientMatchProjection> projections = ingredientProductRepository.findGenericMatches(   
    //         ingredientProductRepository.findAllIngredientsIds(),
    //         FUZZY_MATCHING_THRESHOLD,
    //         MATCHING_LIMIT
    //     );

    //     // 2. Clear table
    //     ingredientProductRepository.deleteAllInBatch();
    //     ingredientProductRepository.flush();

    //     // 3. Map Projections to Entities
    //     List<IngredientProduct> entities = projections.stream().map(p -> {
    //         // Create the ID object manually
    //         IngredientProductId id = new IngredientProductId(p.getIngredientId(), p.getProductId());
            
    //         IngredientProduct ip = new IngredientProduct();
    //         ip.setId(id);
    //         ip.setConfidence(p.getConfidence());
            
    //         // UsegetReference to avoid extra DB hits if you just need the foreign keys
    //         ip.setIngredient(entityManager.getReference(Ingredient.class, p.getIngredientId()));
    //         ip.setProduct(entityManager.getReference(Product.class, p.getProductId()));
            
    //         return ip;
    //     }).toList();

    //     // 4. Save and Flush
    //     ingredientProductRepository.saveAll(entities);
    //     ingredientProductRepository.flush();

    //     return entities;
    // }

    public List<IngredientProduct> getMatches(List<Integer> ids, Long marketId) {
        List<Object[]> results = recipeIngredientRepository.findProductsForIngredientsInMarket(ids, marketId);
        
        return results.stream().map(row -> {
            IngredientProduct ip = (IngredientProduct) row[0];
            Product p = (Product) row[1];
            ip.setProduct(p); // Put the filtered product into the transient field
            return ip;
        }).toList();
    }

    public List<IngredientProduct> fuzzyMatchingPreProcessing() {
        // 1. Get Projections
        List<IngredientMatchProjection> projections = ingredientProductRepository.findGenericMatches(   
            ingredientProductRepository.findAllIngredientsIds(),
            FUZZY_MATCHING_THRESHOLD,
            FUZZY_MATCHING_LIMIT
        );

        // 2. Clear table
        ingredientProductRepository.deleteAllInBatch();
        ingredientProductRepository.flush();

        // 3. Pre-fetch Products by REWE ID
        // We need the actual entities because we are joining on a non-PK column
        List<Long> reweIds = projections.stream().map(p -> p.getProductId()).distinct().toList();
        Map<Long, Product> productMap = productRepository.findAllByReweIdIn(reweIds).stream()
                .collect(Collectors.toMap(Product::getReweId, p -> p));

        // 4. Map Projections to Entities
        List<IngredientProduct> entities = projections.stream().map(p -> {
            // p.getProductId() should be the REWE ID (Long) from your Match Projection
            IngredientProductId id = new IngredientProductId(p.getIngredientId(), p.getProductId());
            
            IngredientProduct ip = new IngredientProduct();
            ip.setId(id);
            ip.setConfidence(p.getConfidence());
            
            // Crucial: Set the objects so Hibernate can validate the relationship
            ip.setIngredient(entityManager.getReference(Ingredient.class, p.getIngredientId()));
            ip.setProduct(entityManager.getReference(Product.class, p.getProductId()));
            
            return ip;
        }).toList();

        return ingredientProductRepository.saveAll(entities);
    }
}
