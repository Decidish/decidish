package decidish.com.core;

import decidish.com.core.model.rewe.Market;
import decidish.com.core.repository.MarketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;

import java.text.DecimalFormat;
import java.util.concurrent.TimeUnit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Tag("benchmark") // Allows you to filter this test out during normal builds
class MarketBenchmarkTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MarketRepository marketRepository;

    // Real IDs from Munich
    private final String PLZ = "80331";
    // We need a known valid ID for the product search
    private final Long MARKET_ID = 431022L; 

    @BeforeEach
    void setup() {
        // Clear DB to ensure we measure the "Cold" path (API Call)
        // If we didn't clear, we would measure the DB read speed (very fast)
        marketRepository.deleteAll();
        marketRepository.flush();
    }

    @Test
    @DisplayName("BENCHMARK: Search Markets (API Latency)")
    void benchmarkSearchMarkets() throws Exception {
        System.out.println("\n==================================================");
        System.out.println("BENCHMARKING: GET /markets?plz=" + PLZ);
        System.out.println("==================================================");

        long startTime = System.nanoTime();

        // Perform the request
        MvcResult result = mockMvc.perform(get("/markets")
                        .param("plz", PLZ)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        long endTime = System.nanoTime();
        printTime(startTime, endTime);

        // Print response size to ensure we got data
        // String content = result.getResponse().getContentAsString();
        // System.out.println("Response size: " + content.length() + " bytes");
    }

    @Test
    @DisplayName("BENCHMARK: Get All Products (API Latency + DB Batch Save)")
    void benchmarkGetAllProducts() throws Exception {
        // PRE-REQUISITE: The market must exist in DB for the service to link products
        // We do a quick save first (not timed)
        Market setupMarket = new Market();
        setupMarket.setReweId(MARKET_ID);
        setupMarket.setName("Benchmark Market");
        marketRepository.save(setupMarket);

        System.out.println("\n==================================================");
        System.out.println("BENCHMARKING: GET /markets/" + MARKET_ID + "/products");
        System.out.println("   (Includes: API Fetch + Parsing + DB Insert/Update)");
        System.out.println("==================================================");

        long startTime = System.nanoTime();

        MvcResult result = mockMvc.perform(get("/markets/{id}/products", MARKET_ID)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        long endTime = System.nanoTime();
        printTime(startTime, endTime);
        
        // long productCount = marketRepository.count(); // Assuming product table count
        // System.out.println("Products Persisted: ~" + (productCount) + " (Check logic)");
    }

    // Helper to print nice times
    private void printTime(long start, long end) {
        long durationNano = end - start;
        double durationMs = durationNano / 1_000_000.0;
        double durationSec = durationMs / 1000.0;

        DecimalFormat df = new DecimalFormat("#.##");

        System.out.println("--------------------------------------------------");
        System.out.println("EXECUTION TIME: " + df.format(durationMs) + " ms (" + df.format(durationSec) + " s)");
        System.out.println("--------------------------------------------------");
    }
}
