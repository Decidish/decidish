package decidish.com.core.integration;

import decidish.com.core.CoreApplication;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = CoreApplication.class)
@ActiveProfiles("integration")
class CoreApplicationIT {

    @Test
    @DisplayName("Context Loads")
    void contextLoads() {
        // Simple sanity check that the application context starts up
    }
}
