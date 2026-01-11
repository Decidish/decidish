package decidish.com.core.model.rewe;

public record Pagination(
    int objectsPerPage,
    int currentPage,
    int pageCount,
    int objectCount
) {}
