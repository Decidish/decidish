package decidish.com.core.model.rewe;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

import org.springframework.data.domain.Persistable;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
// @Table(name = "products")
@Table(name = "products", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"market_id", "id"}) // <--- CRITICAL
})
// @Data
// @EqualsAndHashCode 
@Getter @Setter
// Serializable: helps convert object to bytes, useful for redis cache
public class Product implements Serializable, Persistable<Long>{

    @Id
    private Long id;

    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonBackReference
    private Market market;

    private int price;

    @Column(name = "image_url")
    private String imageUrl;

    private String grammage;

    // @OneToOne(cascade = CascadeType.ALL)
    // @JoinColumn(name = "attributes_id", referencedColumnName = "id")
    // private ProductAttributes attributes;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "isBulkyGood", column = @Column(name = "is_bulky_good")),
        @AttributeOverride(name = "isOrganic", column = @Column(name = "is_organic")),
        @AttributeOverride(name = "isVegan", column = @Column(name = "is_vegan")),
        @AttributeOverride(name = "isVegetarian", column = @Column(name = "is_vegetarian")),
        @AttributeOverride(name = "isDairyFree", column = @Column(name = "is_dairy_free")),
        @AttributeOverride(name = "isGlutenFree", column = @Column(name = "is_gluten_free")),
        @AttributeOverride(name = "isBiocide", column = @Column(name = "is_biocide")),
        @AttributeOverride(name = "isAgeRestricted", column = @Column(name = "is_age_restricted")),
        @AttributeOverride(name = "isRegional", column = @Column(name = "is_regional")),
        @AttributeOverride(name = "isNew", column = @Column(name = "is_new")),
        @AttributeOverride(name = "isLowestPrice", column = @Column(name = "is_lowest_price")),
        @AttributeOverride(name = "isTobacoo", column = @Column(name = "is_tobacco"))
    })
    private ProductAttributesDto attributes;
    
    // TimeStamp
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    // Empty Constructor
    public Product() {}
    
    // Standard Constructor
    public Product(Long id, String name, int price, String imageUrl, String grammage, ProductAttributesDto attributes) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.imageUrl = imageUrl;
        this.grammage = grammage;
        this.lastUpdated = LocalDateTime.now();
        this.attributes = attributes;
    }
    
    // Convert DTO to Entity
    public static Product fromDto(ProductDto dto){
        Long productId = dto.productId();
        String name = dto.title();
        String imageUrl = dto.imageURL();
        int price = dto.listing().currentRetailPrice();
        String grammage = dto.listing().grammage();
        ProductAttributesDto attributes = dto.attributes();

        return new Product(productId, name, price, imageUrl, grammage, attributes);
    }
    
    
    public void updateFromDto(ProductDto dto) {
        this.name = dto.title();
        this.lastUpdated = LocalDateTime.now();
        this.imageUrl = dto.imageURL();
        this.price = dto.listing().currentRetailPrice();
        this.grammage = dto.listing().grammage();
        this.lastUpdated = LocalDateTime.now();
    }
    
    // Only compare based on the Database ID (or Business Key reweId)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Product product = (Product) o;
        // If IDs are present, use them. Otherwise match by REWE ID.
        if (id != null && product.id != null) return Objects.equals(id, product.id);
        return Objects.equals(id, product.id);
    }

    @Override
    public int hashCode() {
        // Return a constant to be safe with Hibernate proxies
        return getClass().hashCode();
    }
    
    // --- Persistable Implementation ---
    @Transient
    @JsonIgnore
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        this.isNew = false;
    }
}

