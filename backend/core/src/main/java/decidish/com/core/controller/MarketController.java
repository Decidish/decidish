package decidish.com.core.controller;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import decidish.com.core.service.MarketService;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketSummaryDto;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.repository.ProductRepository;
import lombok.AllArgsConstructor;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/markets")
@CrossOrigin(origins = {"http://localhost:3000", "https://qa.decidish.win"}, allowCredentials = "true")
@AllArgsConstructor
public class MarketController {

    private final MarketService marketService;
    
    @GetMapping("/{id}")
    public ResponseEntity<MarketSummaryDto> getMarketById(@PathVariable Long id) {
        return ResponseEntity.ok(marketService.getMarketById(id));
    }

    /**
     * Endpoint to search markets by Postal Code.
     * Usage: GET /markets?plz=80331
     */
    @GetMapping
    public ResponseEntity<List<MarketSummaryDto>> searchMarkets(@RequestParam("plz") String zipCode) {
        if (zipCode == null || zipCode.length() != 5) {
            return ResponseEntity.badRequest().build();
        }
        
        List<Market> markets = marketService.getMarkets(zipCode);

        // Convert Entity -> DTO
        List<MarketSummaryDto> dtos = markets.stream()
            .map(MarketSummaryDto::fromEntity)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }


    /**
     * Endpoint to fetch (and update) all products for a specific market.
     * Usage: GET /markets/540945/products
     */
    @GetMapping("/{marketId}/products")
    public ResponseEntity<Market> getAllProducts(@PathVariable("marketId") Long marketId) {
        try {
            // This service method returns the fully updated Market entity with its products
            Market updatedMarket = marketService.getAllProducts(marketId);
            return ResponseEntity.ok(updatedMarket);
        } catch (RuntimeException e) {
            // Handle case where market is not found (Service throws RuntimeException)
             System.err.println("Controller Error for ID " + marketId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Endpoint to fetch products for a specific market based on a search query.
     * Usage: GET /markets/{marketId}/query?query=milk
     */
    @GetMapping("/{marketId}/query")
    public ResponseEntity<Market> getProductsQuery(@RequestParam("query") String query, @PathVariable("marketId") Long marketId) {
        try {
            // This service method returns the fully updated Market entity with its products
            Market updatedMarket = marketService.getProductsQuerySave(marketId, query);
            return ResponseEntity.ok(updatedMarket);
        } catch (RuntimeException e) {
            // Handle case where market is not found (Service throws RuntimeException)
             System.err.println("Controller Error for ID " + marketId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/search/products")
    public Page<Product> searchProducts(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String filter,
            @RequestParam Long marketId, 
            @RequestParam(required = false, defaultValue = "none") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        Sort sortObj = Sort.unsorted();
        if ("low-high".equals(sort)) sortObj = Sort.by("price").ascending();
        else if ("high-low".equals(sort)) sortObj = Sort.by("price").descending();

        Pageable pageable = PageRequest.of(page, size, sortObj);

        // Delegate to Service for the Fallback logic
        return marketService.searchProductsWithFallback(query, filter, marketId, pageable);
    }
}
