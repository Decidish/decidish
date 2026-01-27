package decidish.com.core.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import decidish.com.core.scheduler.Scheduler;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/jobs")
@CrossOrigin(origins = {"http://localhost:3000", "https://qa.decidish.win"}, allowCredentials = "true")
@AllArgsConstructor
public class JobController {

    private static final Logger logger = LoggerFactory.getLogger(JobController.class);
    
    private final Scheduler scheduler;

    /**
     * Manually trigger the weekly sync job.
     * This job updates products for all markets and performs fuzzy matching preprocessing.
     * Usage: POST /api/v1/jobs/weekly-sync
     */
    @PostMapping("/weekly-sync")
    public ResponseEntity<Map<String, String>> triggerWeeklySync() {
        logger.info("Manual trigger requested for weekly sync job");
        
        Map<String, String> response = new HashMap<>();
        
        try {
            // Execute the scheduler task asynchronously to avoid blocking the HTTP response
            new Thread(() -> {
                try {
                    scheduler.weeklySync();
                } catch (Exception e) {
                    logger.error("Error during manual weekly sync execution: {}", e.getMessage(), e);
                }
            }).start();
            
            response.put("status", "started");
            response.put("message", "Weekly sync job has been triggered successfully");
            logger.info("Weekly sync job triggered successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to trigger weekly sync job: {}", e.getMessage(), e);
            response.put("status", "failed");
            response.put("message", "Failed to trigger weekly sync job: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Get the status of running jobs.
     * Usage: GET /api/v1/jobs/status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, String>> getJobStatus() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "operational");
        response.put("message", "Job scheduler is running");
        
        return ResponseEntity.ok(response);
    }
}
