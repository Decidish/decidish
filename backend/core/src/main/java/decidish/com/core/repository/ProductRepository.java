package decidish.com.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import decidish.com.core.model.rewe.Product;
import org.springframework.data.repository.query.Param;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    List<Product> findAllByReweIdIn(@Param("reweIds") List<Long> reweIds);

    @Query("SELECT p FROM Product p WHERE p.market.id = :marketId AND p.reweId = :reweId")
    Optional<Product> findByMarketIdAndReweId(
        @Param("marketId") Long marketId, 
        @Param("reweId") Long reweId
    );

    @Query("SELECT p FROM Product p WHERE p.market.id = :marketId AND p.reweId IN :reweIds")
    List<Product> findByMarketIdAndReweIds(
        @Param("marketId") Long marketId, 
        @Param("reweIds") List<Long> reweIds
    );

    @Modifying
    @Transactional
    @Query("DELETE FROM Product p WHERE p.market.id = :marketId")
    void deleteByMarketId(@Param("marketId") Long marketId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Product p WHERE p.lastUpdated IS NULL OR p.lastUpdated < :cutoff")
    int deleteDeprecatedProducts(@Param("cutoff") LocalDateTime cutoff);
}
