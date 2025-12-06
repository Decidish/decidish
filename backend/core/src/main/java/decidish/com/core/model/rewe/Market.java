package decidish.com.core.model.rewe;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;

import org.springframework.data.domain.Persistable;
import lombok.*;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "markets")
@Data
@EqualsAndHashCode 
@Getter @Setter
// Serializable: helps convert object to bytes, useful for redis cache
public class Market implements Serializable, Persistable<Long>{

    // EXTERNAL REWE ID
    @Id
    // @Column(name = "rewe_id", unique = true, nullable = false)
    private Long reweId;

    private String name;

    @OneToOne(cascade = CascadeType.ALL) // So it also saves the new created address
    @JoinColumn(name = "address_id")
    private Address address;
    
    // TimeStamp
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    // boolean isOpen;

    @OneToMany(mappedBy = "market", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    @ToString.Exclude
    private List<Product> products = new ArrayList<>();

    public void addProduct(Product product){
        products.add(product);
        product.setMarket(this);
    }
    
    @Transient
    @JsonIgnore
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

    @Override
    public Long getId() {
        return reweId;
    }

    @PostLoad
    @PostPersist
    public void markNotNew() {
        this.isNew = false;
    }

    // Empty Constructor
    public Market() {}
    
    // Standard Constructor
    public Market(Long reweId, String name
        , Address address
        // , boolean isOpen
    ){
        this.reweId = reweId;
        this.name = name;
        this.address = address;
        this.lastUpdated = LocalDateTime.now();
        // this.isOpen = isOpen;
    }

    public void updateFromDto(MarketDto dto) {
        this.name = dto.name();
        this.lastUpdated = LocalDateTime.now();

        this.address.setStreet(dto.addressLine1());
        this.address.setZipCode(dto.rawValues().postalCode());
        this.address.setCity(dto.rawValues().city());
    }
    
    // Convert DTO to Entity
    public static Market fromDto(MarketDto dto){
        Long marketId = dto.id();
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
