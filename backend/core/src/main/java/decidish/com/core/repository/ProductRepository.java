package decidish.com.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import decidish.com.core.model.rewe.Product;
import io.lettuce.core.dynamic.annotation.Param;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findAllByReweIdIn(@Param("reweIds") List<Long> reweIds);

    @Query("SELECT p FROM Product p WHERE p.market.id = :marketId AND p.reweId = :reweId")
    Optional<Product> findByMarketIdAndReweId(
        @Param("marketId") Long marketId, 
        @Param("reweId") Long reweId
    );

    @Modifying
    @Transactional
    @Query("DELETE FROM Product p WHERE p.market.id = :marketId")
    void deleteByMarketId(@Param("marketId") Long marketId);
}
