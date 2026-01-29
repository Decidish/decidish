package decidish.com.core.repository;

import decidish.com.core.model.rewe.SearchTermMarket;
import decidish.com.core.model.rewe.SearchTermMarketId;
import jakarta.transaction.Transactional;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SearchTermMarketRepository extends JpaRepository<SearchTermMarket, SearchTermMarketId> {
    @Query("SELECT DISTINCT stm.id.searchTerm FROM SearchTermMarket stm")
    List<String> findAllSearchTerms();

    List<SearchTermMarket> findAllByIdSearchTerm(String searchTerm);

    @Modifying
    @Transactional
    @Query("DELETE FROM SearchTermMarket stm WHERE stm.id.searchTerm = :searchTerm")
    void deleteAllBySearchTerm(@Param("searchTerm") String searchTerm);
}