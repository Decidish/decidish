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

        logger.info("Weekly sync tasks completed.");
    }
}