package decidish.com.core.repository;

import java.util.List;
import java.util.Optional;

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
    @Query("SELECT m FROM Market m")
    List<Market> getMarketsByAddress(@Param("plz") String plz);

    // TODO: We need to have a certain market structure, schema display
    
    // Find by rewe id
    Optional<Market> findByReweId(String reweId);
}
