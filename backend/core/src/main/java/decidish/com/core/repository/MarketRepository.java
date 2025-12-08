package decidish.com.core.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import decidish.com.core.model.rewe.Market;

@Repository
public interface MarketRepository extends JpaRepository<Market, Long> {

    /**
     * Get markets by address PLZ
     */
    @Query("SELECT m FROM Market m JOIN m.address a WHERE a.zipCode = :plz")
    Optional<List<Market>> getMarketsByAddress(@Param("plz") String plz);

    // // TODO: We need to have a certain market structure, schema display
    
    // Find by rewe id
    // @Cacheable(value = "markets_id", unless = "#a0==2L") // For testing
    @Cacheable(value = "markets_id")
    Optional<Market> findByReweId(Long reweId);

    @Query("SELECT m FROM Market m LEFT JOIN FETCH m.products WHERE m.id = :id")
    Optional<Market> findByIdWithProducts(@Param("id")Long id);
}
