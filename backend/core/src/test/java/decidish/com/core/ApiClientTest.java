// package decidish.com.core;


// import decidish.com.core.model.rewe.MarketSearchResponse;
// import decidish.com.core.api.rewe.client.ReweApiClient;
// import org.junit.jupiter.api.DisplayName;
// import org.junit.jupiter.api.Test;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.boot.test.context.SpringBootTest;
// import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
// import org.testcontainers.containers.PostgreSQLContainer;
// import org.testcontainers.junit.jupiter.Container;
// import org.testcontainers.junit.jupiter.Testcontainers;

// import static org.junit.jupiter.api.Assertions.assertNotNull;

// @SpringBootTest
// @Testcontainers // 1. Enable Container support
// class ApiClientTest {

//     // 2. Start a REAL Postgres inside Docker
//     @Container
//     @ServiceConnection // 3. Auto-configure Spring to use this DB
//     static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

//     @Autowired
//     private ReweApiClient client;

//     @Test
//     @DisplayName("Manual Test: Hit real REWE API")
//     void testRealApiCall() {
//         // Now the DB is running in Docker, so Spring won't crash!
//         String zipCode = "80331"; 
//         MarketSearchResponse response = client.searchMarkets(zipCode);
//         assertNotNull(response);
//     }
// }