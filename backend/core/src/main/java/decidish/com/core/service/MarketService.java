package decidish.com.core.service;

import java.util.List;

import org.springframework.stereotype.Service;

import decidish.com.core.model.rewe.Market;
import decidish.com.core.repository.MarketRepository;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class MarketService {

    private MarketRepository marketRepository;
    
    // TODO: Implement method to get markets
    public List<Market> getMarkets(String plz) {
        return marketRepository.getMarketsByAddress(plz);
    }

    // TODO: We need to implement more efficient market retrieval methods use caching and also call the externals APIs if needed.
}