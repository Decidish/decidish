package decidish.com.core.model.rewe;

import java.io.Serializable;
import java.time.LocalDateTime;

import org.yaml.snakeyaml.error.Mark;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "markets")
@Data
@Getter @Setter
// Serializable: helps convert object to bytes, useful for redis cache
public class Market implements Serializable{
    // INTERNAL DB ID
    @Id
    //@SequenceGenerator(sequenceName = "market_sequence", name = "market_sequence", allocationSize = 1)
    //@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "market_sequence")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // EXTERNAL REWE ID
    @Column(name = "rewe_id", unique = true, nullable = false)
    private String reweId;

    private String name;

    // @OneToOne(cascade = CascadeType.ALL) // So it also saves the new created address
    // @JoinColumn(name = "address_id")
    private Address address;
    
    // TimeStamp
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    // boolean isOpen;
    
    // Empty Constructor
    public Market() {}
    
    // Standard Constructor
    public Market(String reweId, String name
        , Address address
        // , boolean isOpen
    ){
        this.reweId = reweId;
        this.name = name;
        this.address = address;
        // this.isOpen = isOpen;
    }
    
    // public Market(MarketDto dto){
    //     fromDto(dto);
    // }
    
    // Convert DTO to Entity
    public static Market fromDto(MarketDto dto){
        // Long marketId = dto.id() != null ? Long.parseLong(dto.id()) : null;
        String marketId = dto.id();
        String name = dto.name();
        Address address = new Address();
        address.setStreet(dto.addressLine1());
        address.setZipCode(dto.rawValues().postalCode());
        address.setCity(dto.rawValues().city());

        return new Market(marketId, name
            , address
        // ,dto.isOpen()
        );
    }
}
