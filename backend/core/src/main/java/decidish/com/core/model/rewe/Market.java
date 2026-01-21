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
    // @Column(name = "rewe_id", unique = true, nullable = false)
    @EqualsAndHashCode.Include
    private Long id;

    private String name;

    @OneToOne(cascade = CascadeType.ALL) // So it also saves the new created address
    @JoinColumn(name = "address_id")
    private Address address;
    
    @Column(name = "has_pickup")
    private boolean hasPickup = true;

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

    public void updateFromDto(MarketDto dto) {
        this.name = dto.name();
        this.lastUpdated = LocalDateTime.now();
        this.hasPickup = dto.serviceFlags().hasPickup();
        updateAddress(dto);
    }

    private void updateAddress(MarketDto dto) {
        if (this.address == null) {
            this.address = new Address();
        }
        setAddressFields(this.address, dto);
    }

    private static void setAddressFields(Address address, MarketDto dto) {
        address.setStreet(dto.street());
        address.setZipCode(dto.zipCode());
        address.setCity(dto.city());
    }

    // Convert DTO to Entity
    public static Market fromDto(MarketDto dto) {
        Address address = new Address();
        address.setLatitude(dto.location().latitude());
        address.setLongitude(dto.location().longitude());
        setAddressFields(address, dto);

        return new Market(dto.wwIdent(), dto.name(), address);
    }

    public static Market fromPickupDto(MarketPickupDto dto) {
        Address address = new Address();
        address.setLatitude(dto.latitude());
        address.setLongitude(dto.longitude());
        address.setStreet(dto.streetWithHouseNumber());
        address.setZipCode(dto.zipCode());
        address.setCity(dto.city());

        return new Market(Long.valueOf(dto.wwIdent()), dto.displayName(), address);
    }

    public void updateFromPickupDto(MarketPickupDto dto) {
        this.name = dto.displayName();
        this.lastUpdated = LocalDateTime.now();
        this.hasPickup = dto.isPickupStation();
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

}
