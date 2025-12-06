package decidish.com.core.model.rewe;

import java.io.Serializable;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "products")
@Data
@EqualsAndHashCode 
@Getter @Setter
// Serializable: helps convert object to bytes, useful for redis cache
public class Product implements Serializable{

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

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "attributes_id", referencedColumnName = "id")
    private ProductAttributes attributes;
    
    // TimeStamp
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    // Empty Constructor
    public Product() {}
    
    // Standard Constructor
    public Product(Long id, String name, int price, String imageUrl, String grammage) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.imageUrl = imageUrl;
        this.grammage = grammage;
        this.lastUpdated = LocalDateTime.now();
        // this.attributes = attributes;
    }
    
    // Convert DTO to Entity
    public static Product fromDto(ProductDto dto){
        Long productId = dto.productId();
        String name = dto.title();
        String imageUrl = dto.imageURL();
        int price = dto.listing().currentRetailPrice();
        String grammage = dto.listing().grammage();

        return new Product(productId, name, price, imageUrl, grammage);
    }
    
    
    public void updateFromDto(ProductDto dto) {
        this.name = dto.title();
        this.lastUpdated = LocalDateTime.now();
        this.imageUrl = dto.imageURL();
        this.price = dto.listing().currentRetailPrice();
        this.grammage = dto.listing().grammage();
    }
}

