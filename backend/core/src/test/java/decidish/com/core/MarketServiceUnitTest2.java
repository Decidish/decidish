package decidish.com.core;

import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.service.MarketService;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class) // Pure Unit Test (Fast, no Spring Context)
class MarketServiceUnitTest2 {

    @Mock
    private MarketRepository marketRepository;

    @Mock
    private ReweApiClient apiClient;

    @InjectMocks
    private MarketService marketService;

    @Test
    @DisplayName("getAllProducts: Should update existing products, add new ones, and save to DB")
    void testGetAllProducts_MergesAndSaves() {
        // --- 1. SETUP: Existing Database State ---
        Long marketDbId = 540945L;

        // Existing Product in DB (Price is 1.00)
        Product existingProduct = new Product(1L,"Old Milk Name",100,"img1","100g");

        Market dbMarket = new Market(marketDbId,"Rewe Market",new Address());
        
        // Link bidirectional
        existingProduct.setMarket(dbMarket);

        // Mock Repo to return this market
        when(marketRepository.findByReweId(marketDbId))
                .thenReturn(Optional.of(dbMarket));

        // --- 2. SETUP: API Response (Fresh Data) ---
        
        // Update for 1 (Price changed to 1.50)
        ProductDto apiUpdate = new ProductDto(
            1L,"New Milk Name","img1",
            new ProductAttributesDto(
                true,true,true,true,true,true,true,true,true,true,true,true
            ),10,List.of(),
            "uwu",new ProductPrice(150, 30, "100g", null, null)
        );

        // New Item 2
        ProductDto apiNew = new ProductDto(
            2L,"Butter","img2",
            new ProductAttributesDto(
                true,true,true,true,true,true,true,true,true,true,true,true
            ),10,List.of(),
            "uwu",new ProductPrice(299, 100, "250g", null, null)
        );

        // ProductSearchResponse apiResponse = new ProductSearchResponse(
        //     List.of(apiUpdate, apiNew), 2, 1, 1
        // );
        ProductSearchResponse apiResponse = new ProductSearchResponse( 
            new ProductsData( new ProductsSearchInfo(new Pagination(1,1,1,1), 
            List.of(apiUpdate,apiNew)))
        );

        // Mock API to return these products
        when(apiClient.searchProducts("", 1, 250, marketDbId))
            .thenReturn(apiResponse);
        // when(apiClient.searchProducts(any(URI.class), eq(marketReweId), any(), any()))
        //         .thenReturn(apiResponse);

        // Tell Mockito: "When save is called, return the market object I gave you"
        when(marketRepository.save(any(Market.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        // --- 3. EXECUTE ---
        marketService.getAllProducts(marketDbId);

        // --- 4. VERIFY (The Crucial Part) ---
        
        // Capture what was sent to the DB
        ArgumentCaptor<Market> marketCaptor = ArgumentCaptor.forClass(Market.class);
        
        // Verify save was called exactly once
        verify(marketRepository).save(marketCaptor.capture());

        Market savedMarket = marketCaptor.getValue();

        // Check 1: We should now have 2 products
        assertEquals(2, savedMarket.getProducts().size(), "Should have 2 products (1 updated + 1 new)");

        // Check 2: Verify Update Logic (PROD-1)
        Product p1 = savedMarket.getProducts().stream()
                .filter(p -> p.getId().equals(1L)).findFirst().get();
        assertEquals(150, p1.getPrice(), "Existing product price should be updated");
        assertEquals("New Milk Name", p1.getName(), "Existing product name should be updated");

        // Check 3: Verify Insert Logic (PROD-2)
        Product p2 = savedMarket.getProducts().stream()
                .filter(p -> p.getId().equals(2L)).findFirst().get();
        assertEquals("Butter", p2.getName());
        assertEquals(299, p2.getPrice());
        
        // Check 4: Relationship integrity
        assertEquals(savedMarket, p2.getMarket(), "New product should be linked to market");
    }
    
    @Test
    @DisplayName("getAllProducts: Should handle duplicate items in API response")
    void testGetAllProducts_RemovesApiDuplicates() {
        // ... setup market ...
        Long marketReweId = 540L;
        Market dbMarket = new Market(marketReweId,"M1",new Address());
        // Market.builder().reweId(marketReweId).build();
        when(marketRepository.findByReweId(marketReweId)).thenReturn(Optional.of(dbMarket));

        // --- SETUP DIRTY API DATA ---
        // The API sends "Cheese" TWICE with the same ID
        ProductDto cheese1 = new ProductDto(
            1L,"Cheese","img1",
            new ProductAttributesDto(
                true,true,true,true,true,true,true,true,true,true,true,true
            ),10,List.of(),
            "uwu",new ProductPrice(199, 30, "100g", null, null));
        ProductDto cheese2 = new ProductDto(
            1L,"Cheese","img1",
            new ProductAttributesDto(
                true,true,true,true,true,true,true,true,true,true,true,true
            ),10,List.of(),
            "uwu",new ProductPrice(199, 30, "100g", null, null));
        
        ProductSearchResponse apiResponse = new ProductSearchResponse( 
            new ProductsData( new ProductsSearchInfo(new Pagination(1,1,1,1), 
            List.of(cheese1,cheese2)))
        );

        when(apiClient.searchProducts("",1,250,marketReweId)).thenReturn(apiResponse);
        // Tell Mockito: "When save is called, return the market object I gave you"
        when(marketRepository.save(any(Market.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // --- EXECUTE ---
        marketService.getAllProducts(540L);

        // --- VERIFY ---
        ArgumentCaptor<Market> captor = ArgumentCaptor.forClass(Market.class);
        verify(marketRepository).save(captor.capture());

        // CRITICAL ASSERTION:
        // Input list size was 2.
        // Expected DB size is 1.
        assertEquals(1, captor.getValue().getProducts().size(), "Should verify duplicates were merged");
    }
}
