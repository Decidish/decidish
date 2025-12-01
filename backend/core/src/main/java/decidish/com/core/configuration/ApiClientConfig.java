package decidish.com.core.configuration;

import decidish.com.core.api.rewe.client.ReweApiClient;
import org.springframework.boot.ssl.SslBundle;
import org.springframework.boot.ssl.SslBundles;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.UUID;

@Configuration
public class ApiClientConfig {

    @Bean
    public ReweApiClient reweApiClient(RestClient.Builder builder, SslBundles sslBundles) {
        SslBundle reweBundle = sslBundles.getBundle("rewe-client");

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder()
                        .version(HttpClient.Version.HTTP_2)
                        .connectTimeout(Duration.ofSeconds(10))
                        .sslContext(reweBundle.createSslContext())
                        .build()
        );

        // Build the RestClient with Headers and SSL
        RestClient restClient = builder
                .requestFactory(requestFactory)
                .baseUrl("https://mobile-api.rewe.de")

                // --- Static Headers (from your python header dict) ---
                .defaultHeader("ruleVersion", "2")
                .defaultHeader("user-agent", "REWE-Mobile-Client/3.17.1.32270 Android/11 Phone/Google_sdk_gphone_x86_64")
                .defaultHeader("rd-service-types", "UNKNOWN")
                .defaultHeader("x-rd-service-types", "UNKNOWN")
                // .defaultHeader("x-rd-service-types", "PICKUP")
                // .defaultHeader("x-rd-customer-types", "GUEST")
                .defaultHeader("rd-is-lsfk", "false")
                .defaultHeader("a-b-test-groups", "productlist-citrusad")
                .defaultHeader("Connection", "Keep-Alive")
                .defaultHeader("Accept-Encoding", "gzip")

                // --- Dynamic Headers (UUIDs generated per request) ---
                .requestInterceptor((request, body, execution) -> {
                    request.getHeaders().add("rdfa", UUID.randomUUID().toString());
                    request.getHeaders().add("Correlation-Id", UUID.randomUUID().toString());
                    return execution.execute(request, body);
                })
                .build();

        // 3. Create the Proxy
        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();

        return factory.createClient(ReweApiClient.class);
    }
}
