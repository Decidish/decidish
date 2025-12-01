package decidish.com.core.model.rewe;

import java.io.Serializable;

// import org.yaml.snakeyaml.error.Mark;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "markets")
@Data
public class Market implements Serializable{
    @Id
    @SequenceGenerator(sequenceName = "market_sequence", name = "market_sequence", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "market_sequence")
    private Long id;

    private String name;

    @OneToOne
    @JoinColumn(name = "address_id")
    private Address address;

    // boolean isOpen;
    
    // Empty Constructor
    public Market() {}
    
    // Standard Constructor
    public Market(Long id, String name, Address address
        // , boolean isOpen
    ){
        this.id = id;
        this.name = name;
        this.address = address;
        // this.isOpen = isOpen;
    }
    
    // Convert DTO to Entity
    public static Market fromDto(MarketDto dto){
        Long marketId = dto.id() != null ? Long.parseLong(dto.id()) : null;
        String name = dto.name();
        Address address = new Address();
        address.setStreet(dto.street());
        address.setZipCode(dto.zipCode());
        address.setCity(dto.city());

        return new Market(marketId, name, address
        // ,dto.isOpen()
        );
    }
}
