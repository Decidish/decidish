package decidish.com.core;

import decidish.com.core.model.rewe.Product;
import decidish.com.core.api.rewe.client.ReweApiClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.service.annotation.GetExchange;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ReweProductTest {

    interface ReweWebClient {
        // CHANGED: Return String instead of MarketSearchResponse
        // This prevents the "UnknownContentTypeException" crash
        @GetExchange("/products")
        String searchProducts(@RequestParam("search") String term,
        @RequestHeader("Cookie") String cookieHeader);
    }

    @Test
    @DisplayName("Debug: Read Raw HTML Response")
    void testShopApi() {
        // 1. We try to look EXACTLY like a real Chrome browser
        RestClient restClient = RestClient.builder()
                .baseUrl("https://www.rewe.de")
                .defaultHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
                .defaultHeader("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                .defaultHeader("Accept-Language", "en-US,en;q=0.5")
                .defaultHeader("Accept-Encoding", "gzip, deflate, br")
                .defaultHeader("Connection", "keep-alive")
                .defaultHeader("Upgrade-Insecure-Requests", "1")
                .defaultHeader("Sec-Fetch-Dest", "document")
                .defaultHeader("Sec-Fetch-Mode", "navigate")
                .defaultHeader("Sec-Fetch-Site", "none")
                .defaultHeader("Sec-Fetch-User", "?1")
                .defaultHeader("Pragma", "no-cache")
                .defaultHeader("Cache-Control", "no-cache")
                .build();

        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();
        ReweWebClient client = factory.createClient(ReweWebClient.class);

        System.out.println("🚀 Sending Request...");
        String response = client.searchProducts("Milch","rewe-market-id=540945");

        System.out.println("✅ Raw Response Received:");
        System.out.println("--------------------------------------------------");
        System.out.println(response); // Print the HTML to see what REWE is saying
        System.out.println("--------------------------------------------------");

        // If this prints HTML with "Access Denied" or "Cloudflare", 
        // you know you are being blocked.
    }
}