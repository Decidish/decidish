package decidish.com.core.model.rewe;

import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class SearchTermMarketId implements Serializable {
    private String searchTerm;
    private Long marketId;
}