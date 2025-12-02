package decidish.com.core;

// import static org.mockito.ArgumentMatchers.refEq;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.kafka.KafkaContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    KafkaContainer kafkaContainer() {
        return new KafkaContainer(DockerImageName.parse("apache/kafka-native:latest"));
    }

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        // return new PostgreSQLContainer<>(DockerImageName.parse("postgres:latest"));
        return new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"));
    }
    
    @Bean
    @ServiceConnection(name = "redis") // Helps Springs find the port mapping
    GenericContainer<?> redisContainer(){
        // return new GenericContainer<>(DockerImageName.parse("redis:latest"));
        return new GenericContainer<>(DockerImageName.parse("redis:alpine"))
                .withExposedPorts(6379);
    }

}
