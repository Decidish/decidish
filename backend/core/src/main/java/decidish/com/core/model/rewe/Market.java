package decidish.com.core.model.rewe;

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
// @Data
// @EqualsAndHashCode
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Getter
@Setter
// Serializable: helps convert object to bytes, useful for redis cache
public class Market implements Persistable<Long> {

    // EXTERNAL REWE ID
    @Id
    @EqualsAndHashCode.Include
    private Long id;

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
    @ToString.Exclude
    private List<Product> products = new ArrayList<>();

    public void addProduct(Product product) {
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
        return id;
    }

    @PostLoad
    @PostPersist
    public void markNotNew() {
        this.isNew = false;
    }

    // Empty Constructor
    public Market() {
    }

    // Standard Constructor
    public Market(Long reweId, String name, Address address
    // , boolean isOpen
    ) {
        this.id = reweId;
        this.name = name;
        this.address = address;
        this.lastUpdated = LocalDateTime.now();
        // this.isOpen = isOpen;
    }

    public static Market fromPickupDto(MarketPickupDto dto) {
        Address address = new Address();
        setAddressFields(address, dto);

        return new Market(Long.valueOf(dto.wwIdent()), dto.companyName(), address);
    }

    public void updateFromPickupDto(MarketPickupDto dto) {
        this.name = dto.companyName();
        this.lastUpdated = LocalDateTime.now();
        // this.hasPickup = dto.isPickupStation(); // all are pickup now
        updateAddressFromPickupDto(dto);
    }

    private void updateAddressFromPickupDto(MarketPickupDto dto) {
        if (this.address == null) {
            this.address = new Address();
        }
        this.address.setLatitude(dto.latitude());
        this.address.setLongitude(dto.longitude());
        this.address.setStreet(dto.streetWithHouseNumber());
        this.address.setZipCode(dto.zipCode());
        this.address.setCity(dto.city());
    }

    private static void setAddressFields(Address address, MarketPickupDto dto) {
        address.setStreet(dto.streetWithHouseNumber());
        address.setZipCode(dto.zipCode());
        address.setCity(dto.city());
    }

}
