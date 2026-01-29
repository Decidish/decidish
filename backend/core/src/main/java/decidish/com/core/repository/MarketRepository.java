package decidish.com.core.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.transaction.Transactional;

import decidish.com.core.model.rewe.Market;

@Repository
public interface MarketRepository extends JpaRepository<Market, Long> {

    /**
     * Get markets by address PLZ
     */
    @Query("SELECT m FROM Market m JOIN m.address a WHERE a.zipCode = :plz")
    Optional<List<Market>> getMarketsByAddress(@Param("plz") String plz);

    
    // Find by id
    Optional<Market> findById(Long id);

    @Query("SELECT m FROM Market m LEFT JOIN FETCH m.products WHERE m.id = :id")
    Optional<Market> findByIdWithProducts(@Param("id")Long id);

    @Query(value = "SELECT DISTINCT name FROM products WHERE rewe_id = :reweId LIMIT 1", nativeQuery = true)
    String findProductNameByReweId(@Param("reweId") Long reweId);

    /**
     * Get markets associated with a specific search term.
     * This joins the Market entity with the SearchTermMarket association table.
     */
    @Query("SELECT m FROM Market m JOIN SearchTermMarket stm ON m.id = stm.market.id WHERE stm.id.searchTerm = :term")
    Optional<List<Market>> getMarketsBySearchTerm(@Param("term") String term);

    @Query("SELECT m FROM Market m WHERE NOT EXISTS (SELECT 1 FROM SearchTermMarket stm WHERE stm.market.id = m.id)")
    List<Market> findAllWithNoSearchTermAssociations();

    @Modifying
    @Transactional
    @Query("DELETE FROM Market m WHERE m.id IN :ids")
    int deleteAllByIds(@Param("ids") List<Long> ids);
}
