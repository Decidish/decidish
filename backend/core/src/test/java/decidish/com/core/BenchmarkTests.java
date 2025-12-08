package decidish.com.core;

import decidish.com.core.model.rewe.Address;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.api.rewe.client.ReweApiClient;
import jakarta.persistence.EntityManagerFactory;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.text.DecimalFormat;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Tag("benchmark")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@EnableCaching
class BenchmarkTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private CacheManager cacheManager;
    
    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private StringRedisTemplate redisTemplate;

    private Statistics hibernateStats;

    // Test Data Constants
    private final String PLZ = "80331";
    private final Long MARKET_ID = 431022L; 
    private final String PRODUCT_QUERY = "milch";

    @BeforeEach
    void setup() {
        if (hibernateStats == null) {
            SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
            this.hibernateStats = sessionFactory.getStatistics();
            this.hibernateStats.setStatisticsEnabled(true);
        }
        // Always clear old stats before a new test starts
        this.hibernateStats.clear();

        // Clear All Caches
        cacheManager.getCacheNames().forEach(name -> 
            cacheManager.getCache(name).clear()
        );
        // WIPE REDIS CLEAN
        redisTemplate.getConnectionFactory()
                     .getConnection()
                     .serverCommands()
                     .flushAll();
    }
    
    @AfterEach
    void tearDown(){
        // 1. Delete Children (Products)
        jdbcTemplate.execute("DELETE FROM products");
        
        // 2. Delete Parents (Markets)
        jdbcTemplate.execute("DELETE FROM markets");
        // User jdbc for benchmarking (faster)
        // marketRepository.deleteAll();
    }
    

    // ==================================================================================
    // 1. ENDPOINT: GET /markets?plz=...
    // ==================================================================================

    @Test
    @Order(1)
    @DisplayName("SEARCH MARKETS - Cold (API -> DB Save)")
    void benchmarkSearchMarkets_Cold() throws Exception {
        // 1. Prepare: Delete data to force API call
        marketRepository.deleteAll();
        marketRepository.flush();
        hibernateStats.clear();

        System.out.println("\n[SEARCH COLD] Fetching from External API & Saving...");
        
        long startTime = System.nanoTime();
        mockMvc.perform(get("/markets").param("plz", PLZ))
               .andExpect(status().isOk());
        long endTime = System.nanoTime();

        printTime("Search Markets (Cold)", startTime, endTime);
        
        // Assertions: Should have high query count (Inserts)
        assertThat(hibernateStats.getQueryExecutionCount()).isGreaterThan(0);
        assertThat(marketRepository.count()).isGreaterThan(0); // Verify data was saved
    }

    @Test
    @Order(2)
    @DisplayName("SEARCH MARKETS - Warm (DB Fetch)")
    void benchmarkSearchMarkets_Warm() throws Exception {
        // 1. Prepare: Save data to DB so we don't hit API
        marketRepository.deleteAllInBatch();
        // Market m = new Market();
        // m.setReweId(999L);
        // m.setName("DB Market");
        // m.setLastUpdated(LocalDateTime.now());
        // Address address = new Address();
        // address.setZipCode(PLZ); // Must match the search param
        // m.setAddress(address);   // Link them
        
        // marketRepository.save(m); // DB is now full
        mockMvc.perform(get("/markets").param("plz", PLZ)).andExpect(status().isOk());
        hibernateStats.clear();

        // --- STEP 2: EMPTY THE CACHE ---
        // This ensures the next request DOES NOT find it in memory
        if (cacheManager.getCache("markets") != null) {
            cacheManager.getCache("markets").clear();
        }

        System.out.println("\n[SEARCH WARM] Fetching from DB (Cache Miss)...");

        long startTime = System.nanoTime();
        mockMvc.perform(get("/markets").param("plz", PLZ))
               .andExpect(status().isOk());
        long endTime = System.nanoTime();

        printTime("Search Markets (Warm)", startTime, endTime);

        // Assertions: Should be SELECT queries, but NO Inserts (if logic prevents it)
        assertThat(hibernateStats.getQueryExecutionCount()).isGreaterThan(0);
    }

    @Test
    @Order(3)
    @DisplayName("SEARCH MARKETS - Hot (Cache Hit)")
    void benchmarkSearchMarkets_Hot() throws Exception {
        marketRepository.deleteAllInBatch();
        // 1. Warm up the cache
        mockMvc.perform(get("/markets").param("plz", PLZ)).andExpect(status().isOk());
        // // 2. Did it save to DB?
        // long dbCount = marketRepository.count();
        // System.out.println("Items in DB: " + dbCount);

        // // 3. Did it save to Cache?
        // var cache = cacheManager.getCache("markets");
        // var cachedValue = cache.get(PLZ); // Look it up by the key
        // boolean isInCache = (cachedValue != null);
        // System.out.println("Is in Cache: " + isInCache);
        hibernateStats.clear();

        System.out.println("\n[SEARCH HOT] Fetching from Cache...");

        long startTime = System.nanoTime();
        mockMvc.perform(get("/markets").param("plz", PLZ))
               .andExpect(status().isOk());
        long endTime = System.nanoTime();

        printTime("Search Markets (Hot)", startTime, endTime);

        // Assertions: 0 DB Queries
        assertThat(hibernateStats.getQueryExecutionCount()).isEqualTo(0);
    }


    // ==================================================================================
    // 2. ENDPOINT: GET /markets/{id}/products
    // ==================================================================================

    @Test
    @Order(4)
    @DisplayName("GET ALL PRODUCTS - Cold (API -> Batch Save)")
    // @Transactional
    void benchmarkGetAllProducts_Cold() throws Exception {
        try{
        // 1. Setup Market, but NO products
        setupMarketWithoutProducts();
        hibernateStats.clear();

        System.out.println("\n[ALL PRODS COLD] Fetching API & Batch Saving...");

        long startTime = System.nanoTime();
        mockMvc.perform(get("/markets/{id}/products", MARKET_ID))
               .andExpect(status().isOk());
        long endTime = System.nanoTime();

        printTime("Get All Products (Cold)", startTime, endTime);
        
        // Check how many rows were inserted (Ignore how many SQL statements were sent)
        assertThat(hibernateStats.getEntityInsertCount()).isGreaterThan(0);
        } finally{
            marketRepository.deleteAll();
        }
    }

    @Test
    @Order(5)
    @DisplayName("GET ALL PRODUCTS - Warm (DB Fetch)")
    void benchmarkGetAllProducts_Warm() throws Exception {
        // 1. Setup Market AND Products in DB
        setupMarketWithProducts("Dummy Product", 10000); // Simulate 50 products
        hibernateStats.clear();

        System.out.println("\n[ALL PRODS WARM] Fetching from DB...");

        long startTime = System.nanoTime();
        mockMvc.perform(get("/markets/{id}/products", MARKET_ID))
               .andExpect(status().isOk());
        long endTime = System.nanoTime();

        printTime("Get All Products (Warm)", startTime, endTime);

        // Should hit DB
        assertThat(hibernateStats.getQueryExecutionCount()).isGreaterThan(0);
    }

    @Test
    @Order(6)
    @DisplayName("GET ALL PRODUCTS - Hot (Cache Hit)")
    void benchmarkGetAllProducts_Hot() throws Exception {
        setupMarketWithoutProducts(); // Minimal setup, the warm-up will fill it
        
        // 1. Warm up
        mockMvc.perform(get("/markets/{id}/products", MARKET_ID));
        hibernateStats.clear();

        System.out.println("\n[ALL PRODS HOT] Fetching from Cache...");

        long startTime = System.nanoTime();
        mockMvc.perform(get("/markets/{id}/products", MARKET_ID))
               .andExpect(status().isOk());
        long endTime = System.nanoTime();

        printTime("Get All Products (Hot)", startTime, endTime);
        assertThat(hibernateStats.getQueryExecutionCount()).isEqualTo(0);
    }


    // ==================================================================================
    // 3. ENDPOINT: GET /markets/{id}/query?query=...
    // ==================================================================================

    @Test
    @Order(7)
    @DisplayName("QUERY PRODUCTS - Cold (API Search -> Save)")
    void benchmarkProductQuery_Cold() throws Exception {
        setupMarketWithoutProducts();
        hibernateStats.clear();

        System.out.println("\n[QUERY COLD] Searching API & Saving...");

        long startTime = System.nanoTime();
        mockMvc.perform(get("/markets/{id}/query", MARKET_ID)
                        .param("query", PRODUCT_QUERY))
               .andExpect(status().isOk());
        long endTime = System.nanoTime();

        printTime("Query Products (Cold)", startTime, endTime);
        assertThat(hibernateStats.getQueryExecutionCount()).isGreaterThan(0);
    }

    // ==================================================================================
    // HELPERS
    // ==================================================================================

    private void setupMarketWithoutProducts() {
        marketRepository.deleteAll();
        Market m = new Market();
        m.setReweId(MARKET_ID);
        m.setName("Benchmark Market");
        marketRepository.save(m);
    }

    private void setupMarketWithProducts(String productNameBase, int count) {
        marketRepository.deleteAll();
        Market m = new Market();
        m.setReweId(MARKET_ID);
        m.setName("Benchmark Market");
        m = marketRepository.save(m);

        List<Product> products = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Product p = new Product(Long.valueOf(i),productNameBase + " " + i,100,"img","100g");
            p.setMarket(m);
            products.add(p);
        }
        // If bidirectional: 
        m.setProducts(products); marketRepository.save(m);
    }

    private void printTime(String label, long start, long end) {
        long durationNano = end - start;
        double durationMs = durationNano / 1_000_000.0;
        double durationSec = durationMs / 1000.0;
        DecimalFormat df = new DecimalFormat("#.##");

        System.out.println("--------------------------------------------------");
        System.out.println(label.toUpperCase());
        System.out.println("TIME: " + df.format(durationMs) + " ms (" + df.format(durationSec) + " s)");
        System.out.println("--------------------------------------------------");
    }
}
