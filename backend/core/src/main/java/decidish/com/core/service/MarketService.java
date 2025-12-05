package decidish.com.core.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
// import org.springframework.data.redis.core.RedisTemplate;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.model.rewe.Address;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.MarketSearchResponse;
import decidish.com.core.model.rewe.MarketDto;
import decidish.com.core.repository.MarketRepository;
import jakarta.transaction.Transactional;
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
    
    /**
     * This method handles the caching logic.
     * 1. Check Redis for "markets_id::{reweId}"
     * 2. If missing, call marketRepository.findByReweId()
     * 3. Save result to Redis (unless reweId is '2')
     */
    // @Cacheable(value = "markets_id", key = "#reweId", unless = "#reweId == '2'")
    // public Optional<Market> findByReweId(String reweId) {
    //     return marketRepository.findByReweId(reweId);
    // }
    
    // TODO: Implement method to get markets
    // @Transactional
    public List<Market> getMarkets(String plz) {
        // 1. Check DB
        List<Market> dbMarkets = marketRepository.getMarketsByAddress(plz).orElse(List.of());
        
        //! Comment for testing updates
        if(!dbMarkets.isEmpty() 
            && isDataFresh(dbMarkets.get(0)) //? This could be better
        ){
            log.info("DB Hit", plz);
            // cacheResults(cacheKey,dbMarkets);
            return dbMarkets;
        }
        
        // 2. Fetch from API
        log.info("Fetching from external API for ", plz);
        MarketSearchResponse apiResponse = apiClient.searchMarkets(plz);
        System.out.println("API Response: " + apiResponse);        
        
        if(apiResponse == null || apiResponse.markets() == null){
            return List.of();
        }
            
        // 3. Store in DB
        List<Market> savedMarkets = new ArrayList<>();
        for(MarketDto dto : apiResponse.markets()){
            Market marketFromApi = Market.fromDto(dto);
        
            // 1. Find the existing Market by its unique ID (reweId)
            Market marketToSave = marketRepository.findByReweId(marketFromApi.getReweId())
                .map(existingMarket -> {
                    // --- CASE 1: MARKET EXISTS (UPDATE LOGIC) ---

                    System.out.println("Market exists in DB. Updating: " + existingMarket.getReweId() + "(" + existingMarket.getName() + ")");
                        
                    // a. Transfer new data to the existing entity
                    existingMarket.setName(marketFromApi.getName());
                    existingMarket.setLastUpdated(LocalDateTime.now()); // Update timestamp 
                        
                    // b. Transfer new address data to the EXISTING address entity
                    //    (This assumes Market.fromDto() creates an address with updated fields)
                    Address existingAddress = existingMarket.getAddress();
                    Address apiAddress = marketFromApi.getAddress();
                        
                    existingAddress.setStreet(apiAddress.getStreet());
                    existingAddress.setZipCode(apiAddress.getZipCode());
                    existingAddress.setCity(apiAddress.getCity());
                        
                    // Since the relationship is cascaded, saving 'existingMarket' will automatically 
                    // update 'existingAddress'.
                        
                    return existingMarket;
                })
                .orElseGet(() -> {
                    // --- CASE 2: MARKET DOES NOT EXIST (INSERT LOGIC) ---
                    // Return the new object created from the DTO
                    return marketFromApi;
                });
            savedMarkets.add(marketRepository.save(marketToSave));
        }
            
        return savedMarkets;
    }

    //! Expose repository for testing purposes
    public MarketRepository getRepo() {
        return marketRepository;
    }

    // TODO: We need to implement more efficient market retrieval methods use caching and also call the externals APIs if needed.
    
    private boolean isDataFresh(Market market) {
        //? Check in case they open a new market or move it / change timetable etc
        int ttl = 1; // Time to live
        return market.getLastUpdated() != null && 
               market.getLastUpdated().isAfter(LocalDateTime.now().minusWeeks(ttl));
    }
}