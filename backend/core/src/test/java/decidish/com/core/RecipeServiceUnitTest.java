package decidish.com.core;

import decidish.com.core.model.recipes.*;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.ProductAttributesDto;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipeServiceUnitTest {

    @Mock
    private RecipeIngredientRepository recipeIngredientRepository;
    
    @Mock
    private MarketService marketService;

    @InjectMocks
    private RecipeService recipeService;

    private final Long MARKET_ID = 431022L;
    private final List<Integer> RECIPE_IDS = List.of(101, 102);

    private RecipeIngredient riTomato;
    private IngredientProduct mappingTomato;

    @BeforeEach
    void setup() {
        // 1. Setup Mock Ingredient and 
        Ingredient tomato = new Ingredient("Tomato");
        tomato.setId(1);

        // 2. Setup Mock Recipe-Ingredient link
        riTomato = new RecipeIngredient();
        riTomato.setIngredient(tomato);

        ProductAttributesDto attrs = new ProductAttributesDto(false,false,false,false,false,false,false,false,false,false,false,false);

        // 3. Setup Mock Product and its mapping
        Product reweTomato = new Product(555L, "Rewe Bio Tomato", 199, "url", "500g", attrs);
        mappingTomato = new IngredientProduct();
        mappingTomato.setIngredient(tomato);
        mappingTomato.setProduct(reweTomato);
        mappingTomato.setConfidence(0.99f); // Best match
    }

    @Test
    @DisplayName("Shopping List Logic: Should aggregate ingredients and return products")
    void testGenerateShoppingList_Logic() {
        // --- ARRANGE ---
        
        // Mock Step 1: Return the ingredients for the recipes
        when(recipeIngredientRepository.findForShoppingList(RECIPE_IDS))
            .thenReturn(List.of(riTomato));

        // Mock Step 3: Return the product mappings for those ingredients
        when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(MARKET_ID)))
            .thenReturn(List.of(mappingTomato));

        // --- ACT ---
        ShoppingListResponse results = recipeService.generateShoppingList(MARKET_ID, RECIPE_IDS);

        // --- ASSERT ---
        assertNotNull(results);
        assertEquals(1, results.items().size());
        assertEquals("Tomato", results.items().get(0).ingredientName());

        // Verify that the repository was called with correct params
        verify(recipeIngredientRepository).findForShoppingList(RECIPE_IDS);
        verify(recipeIngredientRepository).findProductsForIngredientsInMarket(List.of(1), MARKET_ID);
    }

    @Test
    @DisplayName("Empty Results: Should return empty list if no matches found")
    void testGenerateShoppingList_NoMatches() {
        // Arrange
        when(recipeIngredientRepository.findForShoppingList(RECIPE_IDS))
            .thenReturn(List.of(riTomato));
        
        // Return no mappings
        when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(MARKET_ID)))
            .thenReturn(List.of());

        // Act
        ShoppingListResponse results = recipeService.generateShoppingList(MARKET_ID, RECIPE_IDS);

        // Assert
        assertTrue(results.items().get(0).options().isEmpty());
    }
    
        @Test
    void generateShoppingList_AllLocalMatches_ShouldNotCallApi() {
        // GIVEN
        Integer recipeId = 1;
        Long marketId = 100L;
        Ingredient ing = new Ingredient();
        ing.setId(10);
        ing.setName("Flour");

        RecipeIngredient ri = new RecipeIngredient();
        ri.setIngredient(ing);
        ri.setQuantity(BigDecimal.valueOf(500));

        Product product = new Product();
        product.setId(999L);
        product.setNormalizedAmount(1000.0); // 1kg pack

        IngredientProduct mapping = new IngredientProduct();
        mapping.setIngredient(ing);
        mapping.setProduct(product);
        mapping.setConfidence(0.9f);

        // MOCK
        when(recipeIngredientRepository.findForShoppingList(List.of(recipeId))).thenReturn(List.of(ri));
        when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(marketId)))
            .thenReturn(List.of(mapping));

        // WHEN
        ShoppingListResponse response = recipeService.generateShoppingList(marketId, List.of(recipeId));

        // THEN
        assertNotNull(response);
        assertEquals(1, response.items().size());
        assertEquals("Flour", response.items().get(0).ingredientName());
        assertEquals(1, response.items().get(0).options().size());
        
        // Verify API was NOT called because we found local matches
        verify(marketService, never()).getProductsQuery(anyLong(), anyString());
    }

    @Test
    void generateShoppingList_MissingLocalMatch_ShouldCallApi() {
        // GIVEN
        Integer recipeId = 1;
        Long marketId = 100L;
        Ingredient ing = new Ingredient();
        ing.setId(20);
        ing.setName("Exotic Spice");

        RecipeIngredient ri = new RecipeIngredient();
        ri.setIngredient(ing);
        ri.setQuantity(BigDecimal.valueOf(10));

        // MOCK: Return ingredient but NO local mappings
        when(recipeIngredientRepository.findForShoppingList(List.of(recipeId))).thenReturn(List.of(ri));
        when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(marketId)))
            .thenReturn(Collections.emptyList());

        // MOCK API Response
        Product apiProduct = new Product();
        apiProduct.setId(888L);
        apiProduct.setName("Imported Spice");
        apiProduct.setNormalizedAmount(50.0);
        
        Market marketResponse = new Market();
        marketResponse.setProducts(List.of(apiProduct));

        when(marketService.getProductsQuery(eq(marketId), eq("Exotic Spice"))).thenReturn(marketResponse);

        // WHEN
        ShoppingListResponse response = recipeService.generateShoppingList(marketId, List.of(recipeId));

        // THEN
        assertNotNull(response);
        assertEquals(1, response.items().size());
        IngredientGroup group = response.items().get(0);
        assertEquals("Exotic Spice", group.ingredientName());
        assertFalse(group.options().isEmpty(), "Should have options from API");
        assertEquals("Imported Spice", group.options().get(0).product().getName());

        // Verify API WAS called
        verify(marketService, times(1)).getProductsQuery(eq(marketId), eq("Exotic Spice"));
    }
}