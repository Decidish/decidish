package decidish.com.core.integration;

import decidish.com.core.api.rewe.client.ReweApiClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("integration")
class ApiClientConfigIT {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private ReweApiClient reweApiClient;

    @Test
    @DisplayName("Verify ReweApiClient bean is created and available in context")
    void testReweApiClientBeanCreation() {
        assertNotNull(reweApiClient, "ReweApiClient bean should be present in the context");
        assertNotNull(context.getBean(ReweApiClient.class),
                "ReweApiClient bean should be retrievable from ApplicationContext");
    }
}
