package decidish.com.core.model.rewe;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(schema = "addresses")
@Data
public class Address{
    @Id
    private Long id;

    String street;
    String zipCode;
    String city;
}
