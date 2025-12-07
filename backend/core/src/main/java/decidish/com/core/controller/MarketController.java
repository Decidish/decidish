package decidish.com.core.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import decidish.com.core.service.MarketService;
import decidish.com.core.model.rewe.Market;
import lombok.AllArgsConstructor;
import java.util.List;

@RestController
@RequestMapping("/markets")
@AllArgsConstructor
public class MarketController {

    private final MarketService marketService;
    
    // @PostMapping("/search")
    // public List<String> searchMarkets(@RequestBody String plz) {
    //     return marketService.getMarkets(plz);
    // }

    // TODO: Implement endpoints to get markets and make it more efficient etc.
    // @PostMapping("/search")
    // public ResponseEntity<List<Market>> searchMarkets(@RequestBody String plz) {
    //     // Handle errors (i.e. wrong postal code)
    //     if(plz == null || plz.length() != 5){
    //         return ResponseEntity.badRequest().build();
    //     }
        
    //     // List<Market> markets = marketService.getMarkets(plz);
    //     List<Market> markets = List.of();
    //     return ResponseEntity.ok(markets);
    // }
    
    /**
     * Endpoint to search markets by Postal Code.
     * Usage: GET /api/markets?plz=80331
     */
    @GetMapping
    public ResponseEntity<List<Market>> searchMarkets(@RequestParam("plz") String zipCode) {
        if (zipCode == null || zipCode.length() < 3) {
            return ResponseEntity.badRequest().build();
        }
        
        List<Market> markets = marketService.getMarkets(zipCode);
        return ResponseEntity.ok(markets);
    }

    /**
     * Endpoint to fetch (and update) all products for a specific market.
     * Usage: GET /api/markets/540945/products
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
}
