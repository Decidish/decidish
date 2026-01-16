package decidish.com.core.unit;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.service.MarketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

// Pure Unit Test: No Spring, No Docker, No DB. Just Java logic.
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class MarketServiceUT {

        @Mock
        private MarketRepository marketRepository;

        @Mock
        private ReweApiClient apiClient;

        @InjectMocks
        private MarketService marketService;

        private final String PLZ = "80331";
        private final Long NEW_ID = 540945L;
        private final Long OLD_ID = 540946L;

        private MarketSearchResponse apiResponse;
        private Market staleMarket;

        @BeforeEach
        void setup() {
                // 1. Setup API Data
                RawValues raw = new RawValues(PLZ, "Munich");
                Location loc = new Location(10.0, 10.0);
                MarketDto newDto = new MarketDto(NEW_ID, "New Market", "MARKET", "St", "1", loc, raw);
                MarketDto oldDto = new MarketDto(OLD_ID, "Updated Market", "MARKET", "St", "1", loc, raw);
                apiResponse = new MarketSearchResponse(List.of(newDto, oldDto));

                // 2. Setup Stale DB Data
                staleMarket = new Market();
                staleMarket.setId(OLD_ID);
                staleMarket.setName("Old Name");
                staleMarket.setAddress(new Address());
                staleMarket.setLastUpdated(LocalDateTime.now().minusWeeks(10));

        }

        /**
         * Scenario 1: DB Hit (Data is fresh - Cache Hit)
         * Service should return data from the DB and avoid the API call.
         */
        @Test
        @DisplayName("DB HIT: Should return markets from DB if data is fresh")
        void testDbHit_DataIsFresh() {
                // Arrange
                Market freshMarket = staleMarket;
                // Override stale time to make the data fresh (1 day old)
                freshMarket.setLastUpdated(LocalDateTime.now().minusDays(1));

                // Mock repository to return the fresh market list
                when(marketRepository.getMarketsByAddress(PLZ))
                                .thenReturn(Optional.of(List.of(freshMarket)));

                // Act
                List<Market> result = marketService.getMarkets(PLZ);

                // Assert
                assertEquals(1, result.size());

                // Key Verifications:
                verify(apiClient, never()).searchMarkets(any()); // API should NOT be called

                // CRITICAL UPDATE: Verify saveAll was never called
                verify(marketRepository, never()).saveAll(any());
                // (Optional) Verify findByReweIdIn was also skipped
                // verify(marketRepository, never()).findAllByIds(any());
        }

        /**
         * Scenario 2: DB Miss/Stale (API Fetch & Insert/Update)
         * Service should call the API, find one existing market to update, and insert
         * one new market.
         */
        @Test
        @DisplayName("Logic Check: Batch Update and Insert")
        void testGetMarkets_BatchLogic() {
                // --- ARRANGE ---

                // 1. DB returns Stale List (triggering API call)
                when(marketRepository.getMarketsByAddress(PLZ))
                                .thenReturn(Optional.of(List.of(staleMarket)));

                // 2. API returns fresh data
                when(apiClient.searchMarkets(any())).thenReturn(apiResponse);

                // 3. Batch Lookup Mock (Return the stale market so we test the UPDATE logic)
                // This simulates finding ID 540946 in the DB
                when(marketRepository.findAllById(anyList()))
                                .thenReturn(List.of(staleMarket));

                // 4. Batch Save Mock (Crucial Fix)
                // We tell Mockito: "When saveAll is called, return the list that was passed
                // in."
                when(marketRepository.saveAll(anyList()))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // --- ACT ---
                System.out.println("Calling getMarkets...");
                List<Market> results = marketService.getMarkets(PLZ);

                // --- ASSERT ---
                System.out.println("Results: " + results.size());
                assertEquals(2, results.size()); // Should now pass!

                // Verify "Old Name" was updated in memory
                assertEquals("Updated Market", staleMarket.getName());

                // Verify New Market was created correctly
                Market newResult = results.stream().filter(m -> m.getId().equals(NEW_ID)).findFirst().get();
                assertEquals("New Market", newResult.getName());

                // Verify Interactions
                verify(marketRepository).saveAll(anyList()); // Verify batch save was called
                verify(apiClient, times(1)).searchMarkets(any());
        }

        /**
         * Scenario 3: API returns empty list (Handle null/empty API response)
         */
        @Test
        @DisplayName("Should handle null/empty API response gracefully")
        void testApiReturnsEmpty() {
                // Arrange
                // 1. DB Empty/Stale
                when(marketRepository.getMarketsByAddress(PLZ))
                                .thenReturn(Optional.of(Collections.emptyList()));

                // 2. API returns Empty Response
                when(apiClient.searchMarkets(any()))
                                .thenReturn(new MarketSearchResponse(Collections.emptyList()));

                // Act
                List<Market> result = marketService.getMarkets(PLZ);

                // Assert
                assertEquals(0, result.size());

                // Verify Flow
                verify(apiClient, times(1)).searchMarkets(any());

                // CRITICAL UPDATE: Verify saveAll was never called
                verify(marketRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("getMarket: Should return market if found")
        void testGetMarket_Success() {
                // Arrange
                Market m = new Market();
                m.setId(NEW_ID);
                when(marketRepository.findByIdWithProducts(NEW_ID)).thenReturn(Optional.of(m));

                // Act
                Market result = marketService.getMarket(NEW_ID);

                // Assert
                assertEquals(NEW_ID, result.getId());
        }

        @Test
        @DisplayName("getMarket: Should throw RuntimeException if not found")
        void testGetMarket_NotFound() {
                // Arrange
                when(marketRepository.findByIdWithProducts(anyLong())).thenReturn(Optional.empty());

                // Act & Assert
                assertThrows(RuntimeException.class, () -> marketService.getMarket(999L));
        }

        @Test
        @DisplayName("getAllProducts: Should return from DB if fresh")
        void testGetAllProducts_Fresh() {
                // Arrange
                Market m = new Market();
                m.setId(NEW_ID);
                Product p = new Product();
                p.setLastUpdated(LocalDateTime.now()); // Fresh
                m.setProducts(List.of(p));

                when(marketRepository.findByIdWithProducts(NEW_ID)).thenReturn(Optional.of(m));

                // Act
                Market result = marketService.getAllProducts(NEW_ID);

                // Assert
                assertEquals(1, result.getProducts().size());
                verify(apiClient, never()).searchProducts(anyString(), anyInt(), anyInt(), anyLong());
        }

        @Test
        @DisplayName("getProductsQuerySave: Should call API and Save")
        void testGetProductsQuerySave() {
                // Arrange
                Market m = new Market();
                m.setId(NEW_ID);
                m.setProducts(new java.util.ArrayList<>());

                when(marketRepository.findByIdWithProducts(NEW_ID)).thenReturn(Optional.of(m));

                // Mock API Response
                ProductPrice price = new ProductPrice(199, 0, "500g", null, null);
                ProductDto pDto = new ProductDto(100L, "Milk", "url", null, 1, null, "1", price);

                Pagination pagination = new Pagination(20, 1, 1, 1);
                ProductsSearchInfo info = new ProductsSearchInfo(pagination, List.of(pDto));
                ProductsData data = new ProductsData(info);
                ProductSearchResponse response = new ProductSearchResponse(data);

                when(apiClient.searchProducts(anyString(), anyInt(), anyInt(), anyLong()))
                                .thenReturn(response);

                // Mock Save
                when(marketRepository.save(any(Market.class))).thenAnswer(i -> i.getArgument(0));

                // Act
                Market result = marketService.getProductsQuerySave(NEW_ID, "Milk");

                // Assert
                assertEquals(1, result.getProducts().size());
                assertEquals("Milk", result.getProducts().get(0).getName());
                verify(marketRepository).save(any(Market.class));
        }

}
