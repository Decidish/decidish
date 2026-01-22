package decidish.com.core.model.rewe;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "search_term_market")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class SearchTermMarket {

    @EmbeddedId
    private SearchTermMarketId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("marketId") // Maps the 'marketId' field in SearchTermMarketId
    @JoinColumn(name = "market_id")
    private Market market;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
