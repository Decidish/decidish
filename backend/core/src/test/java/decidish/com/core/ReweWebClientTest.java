package decidish.com.core;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class ReweWebClientTest {

    interface ReweWebClient {
        // CHANGED: Return String instead of MarketSearchResponse
        // This prevents the "UnknownContentTypeException" crash
        @GetExchange("/shop/api/marketselection/zipcodes/{zip}/services/pickup")
        String searchMarkets(@PathVariable("zip") String zipCode);
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
        String response = client.searchMarkets("80331");

        System.out.println("✅ Raw Response Received:");
        System.out.println("--------------------------------------------------");
        System.out.println(response); // Print the HTML to see what REWE is saying
        System.out.println("--------------------------------------------------");

        // If this prints HTML with "Access Denied" or "Cloudflare", 
        // you know you are being blocked.
    }
}