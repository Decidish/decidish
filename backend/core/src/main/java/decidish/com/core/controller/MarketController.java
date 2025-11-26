package decidish.com.core.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import decidish.com.core.service.MarketService;
import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/markets")
@AllArgsConstructor
public class MarketController {

    private final MarketService marketService;
    
    @PostMapping("/search")
    public String searchMarkets(@RequestBody String plz) {
        return marketService.getMarkets(plz).toString();
    }

    // TODO: Implement endpoints to get markets and make it more efficient etc.
}
