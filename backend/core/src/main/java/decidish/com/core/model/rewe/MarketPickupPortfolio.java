package decidish.com.core.model.rewe;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketPickupPortfolio(
    String customerZipCode,
    MarketPickupDto deliveryMarket,
    List<MarketPickupDto> pickupMarkets,
    List<MarketPickupDto> lsfkMarkets,
    List<MarketPickupDto> openLsfkMarkets
) {}
