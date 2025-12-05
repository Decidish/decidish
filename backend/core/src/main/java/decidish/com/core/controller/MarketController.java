package decidish.com.core.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
    @PostMapping("/search")
    public ResponseEntity<List<Market>> searchMarkets(@RequestBody String plz) {
        // Handle errors (i.e. wrong postal code)
        if(plz == null || plz.length() != 5){
            return ResponseEntity.badRequest().build();
        }
        
        // List<Market> markets = marketService.getMarkets(plz);
        List<Market> markets = List.of();
        return ResponseEntity.ok(markets);
    }
}
