package decidish.com.core.unit;

import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;
import decidish.com.core.scheduler.WeeklySyncMetrics;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import decidish.com.core.scheduler.Scheduler;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SchedulerUT {

    @Mock
    private MarketService marketService;

    @Mock
    private RecipeService recipeService;

    @Mock
    private WeeklySyncMetrics weeklySyncMetrics;

    @InjectMocks
    private Scheduler scheduler;

    @Test
    @DisplayName("Sync Logic: Should update markets FIRST, then update recipes")
    void testWeeklySync_ExecutesTasksInOrder() {
        // --- Execute ---
        // We call the method manually to test the LOGIC inside it
        scheduler.weeklySync();

        // --- Verify ---
        // 1. Verify that both services were called
        // 2. Verify the ORDER (Crucial: Ingredients must be updated before fuzzy matching)
        InOrder inOrder = inOrder(marketService, recipeService);

        inOrder.verify(marketService).updateProductsForEveryMarket();
        inOrder.verify(marketService).cleanupDeprecatedData();
        inOrder.verify(recipeService).fuzzyMatchingPreProcessing();
        
        // Ensure no other unexpected interactions happened
        inOrder.verifyNoMoreInteractions();
    }
    
    @Test
    @DisplayName("Sync Logic: Should handle MarketService failure gracefully")
    void testWeeklySync_WhenMarketServiceFails() {
        // If you want your scheduler to continue even if the first step fails, 
        // you would write a test like this to enforce that behavior.
        
        // Given
        doThrow(new RuntimeException("API Down")).when(marketService).updateProductsForEveryMarket();

        // When
        // (Assuming you add try-catch blocks in your Scheduler later, this test ensures it doesn't crash the thread)
        // For now, based on your code, this would throw exception, which is fine to assert:
        try {
            scheduler.weeklySync();
        } catch (RuntimeException e) {
            // Expected
        }

        // Then: Ensure we attempted it
        verify(marketService).updateProductsForEveryMarket();
        verify(marketService).cleanupDeprecatedData();
        verify(recipeService).fuzzyMatchingPreProcessing();
    }
}