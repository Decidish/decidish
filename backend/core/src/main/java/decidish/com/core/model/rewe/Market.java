package decidish.com.core.model.rewe;

import java.io.Serializable;
import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "markets")
@Data
// Serializable: helps convert object to bytes, useful for redis cache
public class Market implements Serializable{
    // INTERNAL DB ID
    @Id
    @SequenceGenerator(sequenceName = "market_sequence", name = "market_sequence", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "market_sequence")
    private Long id;
    
    // EXTERNAL REWE ID
    @Column(name = "rewe_id", unique = true, nullable = false)
    private String reweId;

    private String name;

    @OneToOne
    @JoinColumn(name = "address_id")
    private Address address;
    
    // TimeStamp
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

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
        // Long marketId = dto.id() != null ? Long.parseLong(dto.id()) : null;
        Long marketId = dto.id();
        String name = dto.name();
        Address address = new Address();
        // address.setStreet(dto.street());
        // address.setZipCode(dto.zipCode());
        // address.setCity(dto.city());

        return new Market(marketId, name, address
        // ,dto.isOpen()
        );
    }
}
