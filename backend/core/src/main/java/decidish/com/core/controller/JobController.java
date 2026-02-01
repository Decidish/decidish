package decidish.com.core.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import decidish.com.core.scheduler.Scheduler;
import decidish.com.core.scheduler.WeeklySyncMetrics;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@RestController
@RequestMapping("/api/v1/jobs")
@CrossOrigin(origins = {"http://localhost:3000", "https://qa.decidish.win"}, allowCredentials = "true")
@AllArgsConstructor
public class JobController {

    private static final Logger logger = LoggerFactory.getLogger(JobController.class);
    
    private final Scheduler scheduler;

    private final WeeklySyncMetrics weeklySyncMetrics;
    
    private static final AtomicBoolean isSyncRunning = new AtomicBoolean(false);

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
                    isSyncRunning.set(true);
                    scheduler.weeklySync();
                } catch (Exception e) {
                    logger.error("Error during manual weekly sync execution: {}", e.getMessage(), e);
                } finally {
                    isSyncRunning.set(false);
                }
            }).start();
            
            response.put("status", "started");
            response.put("message", "Weekly sync job has been triggered successfully");
            logger.info("Weekly sync job triggered successfully");
            
            return ResponseEntity.ok(Map.of(
                "status", "started",
                "message", "Weekly sync job has been triggered successfully"
            ));
        } catch (Exception e) {
            logger.error("Failed to trigger weekly sync job: {}", e.getMessage(), e);
            response.put("status", "failed");
            response.put("message", "Failed to trigger weekly sync job: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Manually trigger the cleanup job.
     * This job deletes deprecated products and closed markets.
     * Usage: POST /api/v1/jobs/cleanup
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getJobStatus() {
        Map<String, Object> response = new HashMap<>();
        boolean isRunning = isSyncRunning.get();
        response.put("status", isRunning ? "running" : "idle");
        response.put("message", "weekly sync job is currently " + (isRunning ? "running" : "not running"));
        response.put("metrics", weeklySyncMetrics.snapshot());
        return ResponseEntity.ok(response);
    }
    @PostMapping("/cleanup")
    public ResponseEntity<Map<String, String>> triggerCleanup() {
        logger.info("Manual trigger requested for cleanup job");

        Map<String, String> response = new HashMap<>();

        try {
            // Execute the scheduler task asynchronously to avoid blocking the HTTP response
            new Thread(() -> {
                try {
                    scheduler.cleanupDeprecatedDataOnly();
                } catch (Exception e) {
                    logger.error("Error during manual cleanup execution: {}", e.getMessage(), e);
                }
            }).start();

            response.put("status", "started");
            response.put("message", "Cleanup job has been triggered successfully");
            logger.info("Cleanup job triggered successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to trigger cleanup job: {}", e.getMessage(), e);
            response.put("status", "failed");
            response.put("message", "Failed to trigger cleanup job: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    /**
     * Get the current status of the weekly sync job.
     * Usage: GET /api/v1/jobs/status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getJobStatus() {
        Map<String, Object> response = new HashMap<>();
        boolean isRunning = isSyncRunning.get();
        response.put("status", isRunning ? "running" : "idle");
        response.put("message", "weekly sync job is currently " + (isRunning ? "running" : "not running"));
        response.put("metrics", weeklySyncMetrics.snapshot());
        return ResponseEntity.ok(response);
    }
}
