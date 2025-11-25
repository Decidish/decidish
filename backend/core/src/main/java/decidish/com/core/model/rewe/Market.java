package decidish.com.core.model.rewe;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "markets")
@Data
public class Market {
    @Id
    @SequenceGenerator(sequenceName = "market_sequence", name = "market_sequence", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "market_sequence")
    private Long id;

    private String name;

    @OneToOne
    @JoinColumn(name = "address_id")
    private Address address;

    boolean isOpen;
}
