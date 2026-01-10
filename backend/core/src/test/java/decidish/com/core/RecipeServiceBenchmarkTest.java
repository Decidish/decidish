package decidish.com.core;

import decidish.com.core.model.recipes.*;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@Tag("benchmark")
class RecipeServiceBenchmarkTest {

    @Mock
    private RecipeIngredientRepository recipeIngredientRepository;

    @Mock
    private MarketService marketService;

    @Spy
    @InjectMocks
    private RecipeService recipeService;

    // --- Benchmark Config ---
    private final Long MARKET_ID = 123L;
    private final int TOTAL_INGREDIENTS = 50; // A realistic "big shop" size
    private final long MOCK_API_LATENCY_MS = 500; // Simulate 500ms network round-trip per request

    private List<RecipeIngredient> mockRawIngredients;

    @BeforeEach
    void setup() {
        // Generate 50 unique ingredients
        mockRawIngredients = IntStream.range(0, TOTAL_INGREDIENTS)
                .mapToObj(i -> {
                    Ingredient ing = new Ingredient();
                    ing.setId(i);
                    ing.setName("Ingredient " + i);

                    RecipeIngredient ri = new RecipeIngredient();
                    ri.setIngredient(ing);
                    ri.setQuantity(BigDecimal.valueOf(100)); // 100g each
                    return ri;
                }).collect(Collectors.toList());

        // Mock finding these ingredients for any recipe list
        when(recipeIngredientRepository.findForShoppingList(anyList()))
                .thenReturn(mockRawIngredients);
    }

    /**
     * Scenario 1: Best Case
     * All products are found in the local database.
     * No API calls needed.
     */
    @Test
    @DisplayName("BENCHMARK: 100% Local Cache Hit (0 API Calls)")
    void benchmark_AllLocal() {
        // 1. Mock Repository to return a product for EVERY ingredient
        List<IngredientProduct> allMatches = mockRawIngredients.stream()
                .map(ri -> createMockMapping(ri.getIngredient()))
                .collect(Collectors.toList());

        // when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(MARKET_ID)))
        //         .thenReturn(allMatches);

        when(recipeService.getMatches(anyList(), eq(MARKET_ID)))
                .thenReturn(allMatches);

        // 2. Measure
        long start = System.nanoTime();
        ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID, List.of(1, 2, 3));
        long end = System.nanoTime();

        // 3. Report
        printResult("All Local (0 Missing)", 0, start, end);
        assertNotNull(response);
    }

    /**
     * Scenario 2: Realistic Case
     * 10% of ingredients (5 items) are missing and need to be fetched from API.
     */
    @Test
    @DisplayName("BENCHMARK: 10% Missing (5 API Calls)")
    void benchmark_FewMissing() {
        int missingCount = 5;
        setupHybridScenario(missingCount);

        long start = System.nanoTime();
        ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID, List.of(1, 2, 3));
        long end = System.nanoTime();

        printResult("Few Missing (5 Missing)", missingCount, start, end);
        assertNotNull(response);
    }

    /**
     * Scenario 3: Worst Case / Stress Test
     * 90% of ingredients (45 items) are missing.
     * This tests if the Parallelism is actually working.
     *
     * Theoretical Sequential Time: 45 * 200ms = 9000ms (9 seconds)
     * Expected Parallel Time:      ~200ms - 400ms (depending on thread pool size)
     */
    @Test
    @DisplayName("BENCHMARK: 90% Missing (45 API Calls - Stress Test)")
    void benchmark_ManyMissing() {
        int missingCount = 45;
        setupHybridScenario(missingCount);

        long start = System.nanoTime();
        ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID, List.of(1, 2, 3));
        long end = System.nanoTime();

        printResult("Many Missing (45 Missing)", missingCount, start, end);
        
        // Assertion to ensure we actually got results back
        assertFalse(response.items().isEmpty());
    }

    // --- Helpers ---

    private void setupHybridScenario(int missingCount) {
        // 1. Calculate split
        int localCount = TOTAL_INGREDIENTS - missingCount;
        List<RecipeIngredient> localPart = mockRawIngredients.subList(0, localCount);
        // Ingredients from index 'localCount' to end will be "missing" from DB

        // 2. Mock DB returning matches only for the first 'localCount' items
        List<IngredientProduct> localMatches = localPart.stream()
                .map(ri -> createMockMapping(ri.getIngredient()))
                .collect(Collectors.toList());

        // Mock ONLY the internal getMatches call
        // This bypasses the repo query and the Object[] casting logic entirely
        doReturn(localMatches).when(recipeService).getMatches(anyList(), eq(MARKET_ID));

        // when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(MARKET_ID)))
        //         .thenReturn(localMatches);

        // when(recipeService.getMatches(anyList(), eq(MARKET_ID)))
        //         .thenReturn(localMatches);

        // 3. Mock API with Latency
        // For any call to getProductsQuery, sleep 200ms then return a product
        doAnswer(invocation -> {
            // SIMULATE NETWORK LATENCY
            try { TimeUnit.MILLISECONDS.sleep(MOCK_API_LATENCY_MS); } catch (InterruptedException ignored) {}

            String query = invocation.getArgument(1);
            return createMockMarketResponse(query);
        }).when(marketService).getProductsQuery(eq(MARKET_ID), anyString());
    }

    private IngredientProduct createMockMapping(Ingredient ing) {
        Product p = new Product();
        p.setId((long) ing.getId() + 1000);
        p.setName("Product for " + ing.getName());
        p.setNormalizedAmount(100.0);

        IngredientProduct ip = new IngredientProduct();
        ip.setIngredient(ing);
        ip.setProduct(p);
        ip.setConfidence(0.99f);
        return ip;
    }

    private Market createMockMarketResponse(String name) {
        Product p = new Product();
        p.setId(5000L);
        p.setName("API Product " + name);
        p.setNormalizedAmount(100.0);
        
        Market m = new Market();
        m.setProducts(List.of(p));
        return m;
    }

    private void printResult(String label, int apiCalls, long startNano, long endNano) {
        long durationMs = TimeUnit.NANOSECONDS.toMillis(endNano - startNano);
        System.out.println("----------------------------------------------------------------");
        System.out.printf("SCENARIO: %s%n", label);
        System.out.printf("Total Ingredients: %d%n", TOTAL_INGREDIENTS);
        System.out.printf("API Calls Made:    %d%n", apiCalls);
        System.out.printf("Simulated Latency: %d ms per call%n", MOCK_API_LATENCY_MS);
        System.out.println("----------------------------------------------------------------");
        System.out.printf("TOTAL EXECUTION TIME: %d ms%n", durationMs);
        
        if (apiCalls > 0) {
            long theoreticalSequential = apiCalls * MOCK_API_LATENCY_MS;
            System.out.printf("Theoretical Sequential Time: %d ms%n", theoreticalSequential);
            System.out.printf("Speedup Factor: %.2fx faster than sequential%n", (double) theoreticalSequential / durationMs);
        }
        System.out.println("----------------------------------------------------------------\n");
    }
}