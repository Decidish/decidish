package decidish.com.core.model.rewe;

public record Market(
        String id,
        String name,
        Address address,
        boolean isOpen
) {}
