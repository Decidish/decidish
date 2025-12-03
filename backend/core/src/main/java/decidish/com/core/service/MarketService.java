package decidish.com.core.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
// import org.springframework.data.redis.core.RedisTemplate;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.MarketDto;
// import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.repository.MarketRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
// @AllArgsConstructor
public class MarketService {

    private static final Logger log = LoggerFactory.getLogger(MarketService.class);

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private ReweApiClient apiClient;
    // private final RedisTemplate<String, Object> redisTemplate;
    
    // TODO: Implement method to get markets
    @Transactional
    public List<Market> getMarkets(String plz) {
        // String cacheKey = "markets:zip:" + plz;
        // 1. Check Redis
        // try{
        //     List<Market> cachedMarkets = (List<Market>) redisTemplate.opsForValue().get(cacheKey);
        //     if(cachedMarkets != null && !cachedMarkets.isEmpty()){
        //         log.info("Cache Hit for ",plz);
        //         return cachedMarkets;
        //     }
        // } catch(Exception e){}
        
        // 2. Check DB
        List<Market> dbMarkets = marketRepository.getMarketsByAddress(plz);
        
        if(!dbMarkets.isEmpty() 
            //&& isDataFresh(dbMarkets.get(0))
        ){
            log.info("DB Hit", plz);
            // cacheResults(cacheKey,dbMarkets);
            return dbMarkets;
        }
        
        // 3. Fetch from API
        log.info("Fetching from external API for ", plz);
        MarketSearchResponse apiResponse = apiClient.searchMarkets(plz);
        
        if(apiResponse == null || apiResponse.markets() == null){
            return List.of();
        }
        
        // 4. Store in DB
        List<Market> savedMarkets = new ArrayList<>();
        for(MarketDto dto : apiResponse.markets()){
            Market market = Market.fromDto(dto);
            
        //     // Update if it exists
        //     marketRepository.findByReweId(market.getReweId()).ifPresent(existing -> {
        //         market.setId(existing.getId());
        //         market.getAddress().setId(existing.getAddress().getId());
        //     });
            savedMarkets.add(marketRepository.save(market));
        }
        
        // 5. Update Cache
        // cacheResults(cacheKey, savedMarkets);

        return savedMarkets;
    }

    // TODO: We need to implement more efficient market retrieval methods use caching and also call the externals APIs if needed.
    // private void cacheResults(String key, List<Market> markets) {
    //     try {
    //         redisTemplate.opsForValue().set(key, markets, 12, TimeUnit.HOURS);
    //     } catch (Exception e) {
    //         log.error("Failed to write to Redis", e);
    //     }
    // }
    
    // private boolean isDataFresh(Market market) {
    //     return market.getLastUpdated() != null && 
    //            market.getLastUpdated().isAfter(LocalDateTime.now().minusHours(24));
    // }
}