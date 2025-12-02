package decidish.com.core.model.rewe;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;


@JsonIgnoreProperties(ignoreUnknown = true)
public record OpeningTime(
    String days, // e.g.: Mo - Sa
    String hours // e.g.: 07:00 - 20:00 Uhr
) {}