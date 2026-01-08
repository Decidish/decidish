package decidish.com.core.model.recipes;

import decidish.com.core.model.rewe.Product;
/**
 * Represents a specific Product option to buy and how many.
 */
public record ShoppingOption(
    Product product,
    int quantityToBuy,      // Calculated: ceil(need / productSize)
    Double totalProductAmount, // productSize * quantity
    float confidence       // How well this matches the ingredient (0.0 - 1.0)
) {}
