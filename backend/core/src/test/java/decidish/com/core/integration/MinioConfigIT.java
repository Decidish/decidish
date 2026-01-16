package decidish.com.core.integration;

import io.minio.MinioClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("integration")
class MinioConfigIT {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private MinioClient minioClient;

    @Test
    @DisplayName("Verify MinioClient bean is created")
    void testMinioClientBeanCreation() {
        assertNotNull(minioClient, "MinioClient bean should be present in the context");
        assertNotNull(context.getBean(MinioClient.class),
                "MinioClient bean should be retrievable from ApplicationContext");
    }
}
