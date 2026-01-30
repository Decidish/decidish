package decidish.com.core.scheduler;

import org.springframework.stereotype.Component;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;
import lombok.AllArgsConstructor;

@Component
@AllArgsConstructor
public class Scheduler {

    private static final Logger logger = LoggerFactory.getLogger(Scheduler.class);

    private MarketService marketService;

    private RecipeService recipeService;

    // Managed externally via JobController
    // @Scheduled(cron = "${cron.weekly-sync}") 
    public void weeklySync() {

        // sync products for all markets
        logger.info("Weekly sync tasks started.");

        refreshProductsForMarkets();
        cleanupDeprecatedData();
        refreshMatchingPairs();

        logger.info("Weekly sync tasks completed.");
    }

    public void cleanupDeprecatedDataOnly() {
        cleanupDeprecatedData();
    }

    private void refreshProductsForMarkets() {
        logger.info("Updating products for all markets...");
        try {
            long startTime = System.currentTimeMillis();
            marketService.updateProductsForEveryMarket();
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            // Show duration in minutes and seconds
            long minutes = duration / 60000;
            long seconds = (duration % 60000) / 1000;

            logger.info("Products successfully updated for all markets in {} minutes and {} seconds.", minutes, seconds);

        } catch (Exception e) {
            logger.error("Error occurred while updating products for all markets: {}", e.getMessage());
        }
    }

    private void cleanupDeprecatedData() {
        logger.info("Cleaning up deprecated data...");
        try {
            long cleanupStart = System.currentTimeMillis();
            marketService.cleanupDeprecatedData();
            long cleanupEnd = System.currentTimeMillis();
            long cleanupDuration = cleanupEnd - cleanupStart;
            long cleanupMinutes = cleanupDuration / 60000;
            long cleanupSeconds = (cleanupDuration % 60000) / 1000;
            logger.info("Deprecated data cleanup completed in {} minutes and {} seconds.",
                    cleanupMinutes, cleanupSeconds);
        } catch (Exception e) {
            logger.error("Error occurred while cleaning up deprecated data: {}", e.getMessage());
        }
    }

    private void refreshMatchingPairs() {
        // fuzzy matching preprocessing after product update
        logger.info("Updating matching pairs for ingredients and products...");
        try {
            long fmStartTime = System.currentTimeMillis();
            recipeService.fuzzyMatchingPreProcessing();
            long fmEndTime = System.currentTimeMillis();
            long fmDuration = fmEndTime - fmStartTime;

            // Show duration in minutes and seconds
            long fmMinutes = fmDuration / 60000;
            long fmSeconds = (fmDuration % 60000) / 1000;
            logger.info("Matching pairs successfully updated in {} minutes and {} seconds.", fmMinutes, fmSeconds);
        } catch (Exception e) {
            logger.error("Error occurred while updating matching pairs: {}", e.getMessage());
        }
    }
}