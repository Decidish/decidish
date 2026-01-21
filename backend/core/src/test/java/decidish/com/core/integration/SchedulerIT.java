package decidish.com.core.integration;

import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Duration;

import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;

import decidish.com.core.scheduler.Scheduler;

@SpringBootTest
// Overwrite the cron to run every 1 second for this test
@TestPropertySource(properties = "cron.weekly-sync=*/1 * * * * *") 
class SchedulerIT {

    @Autowired
    private Scheduler scheduler;

    @MockitoBean
    private MarketService marketService;

    @MockitoBean
    private RecipeService recipeService;

    @Test
    @DisplayName("Cron Job: Should trigger automatically by Spring")
    void testCronTrigger() {
        // Wait up to 2 seconds to see if the scheduler fires
        // This confirms "cron.weekly-sync" property is wired correctly
        await()
            .atMost(Duration.ofSeconds(2))
            .untilAsserted(() -> {
                // Verify the scheduler actually called the service methods (should do because test DB is empty)
                verify(marketService, atLeastOnce()).updateProductsForEveryMarket();
                verify(recipeService, atLeastOnce()).fuzzyMatchingPreProcessing();
            });
    }
}