package decidish.com.core.model.rewe;

import java.io.Serializable;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "addresses")
@Data
public class Address implements Serializable{
    @Id
    //@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "address_seq")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    //@SequenceGenerator(name = "address_seq", sequenceName = "address_seq", allocationSize = 50)
    private Long id;

    String street;
    String zipCode;
    String city;
}
