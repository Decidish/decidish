package decidish.com.core.scheduler;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class WeeklySyncMetrics {

    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicLong runId = new AtomicLong(0);
    private final AtomicLong startTimeMs = new AtomicLong(0);
    private final AtomicLong endTimeMs = new AtomicLong(0);

    private final AtomicLong marketsTotal = new AtomicLong(0);
    private final AtomicLong marketsUpdated = new AtomicLong(0);
    private final AtomicLong marketsFailed = new AtomicLong(0);

    private final AtomicLong apiCalls = new AtomicLong(0);
    private final AtomicLong rateLimitHits = new AtomicLong(0);
    private final AtomicLong productPages = new AtomicLong(0);
    private final AtomicLong productsProcessed = new AtomicLong(0);
    private final AtomicLong fuzzyMappings = new AtomicLong(0);

    public void startRun() {
        runId.incrementAndGet();
        running.set(true);
        startTimeMs.set(System.currentTimeMillis());
        endTimeMs.set(0);
        marketsTotal.set(0);
        marketsUpdated.set(0);
        marketsFailed.set(0);
        apiCalls.set(0);
        rateLimitHits.set(0);
        productPages.set(0);
        productsProcessed.set(0);
        fuzzyMappings.set(0);
    }

    public void finishRun() {
        endTimeMs.set(System.currentTimeMillis());
        running.set(false);
    }

    public boolean isRunning() {
        return running.get();
    }

    public void setMarketsTotal(long total) {
        marketsTotal.set(total);
    }

    public void recordMarketSuccess() {
        marketsUpdated.incrementAndGet();
    }

    public void recordMarketFailure() {
        marketsFailed.incrementAndGet();
    }

    public void recordApiCall() {
        apiCalls.incrementAndGet();
    }

    public void recordRateLimitHit() {
        rateLimitHits.incrementAndGet();
    }

    public void recordProductPage(int productsOnPage) {
        productPages.incrementAndGet();
        productsProcessed.addAndGet(productsOnPage);
    }

    public void recordFuzzyMappings(long count) {
        fuzzyMappings.set(count);
    }

    public Map<String, Object> snapshot() {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("runId", runId.get());
        snapshot.put("running", running.get());
        snapshot.put("startTimeMs", startTimeMs.get());
        snapshot.put("endTimeMs", endTimeMs.get());

        long durationMs = 0;
        if (startTimeMs.get() > 0) {
            long end = endTimeMs.get() > 0 ? endTimeMs.get() : System.currentTimeMillis();
            durationMs = Math.max(0, end - startTimeMs.get());
        }
        snapshot.put("durationMs", durationMs);

        snapshot.put("marketsTotal", marketsTotal.get());
        snapshot.put("marketsUpdated", marketsUpdated.get());
        snapshot.put("marketsFailed", marketsFailed.get());
        snapshot.put("apiCalls", apiCalls.get());
        snapshot.put("rateLimitHits", rateLimitHits.get());
        snapshot.put("productPages", productPages.get());
        snapshot.put("productsProcessed", productsProcessed.get());
        snapshot.put("fuzzyMappings", fuzzyMappings.get());
        return snapshot;
    }
}
