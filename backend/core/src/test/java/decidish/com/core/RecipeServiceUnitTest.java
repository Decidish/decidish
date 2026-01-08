package decidish.com.core;

import decidish.com.core.model.recipes.*;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.ProductAttributesDto;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.RecipeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipeServiceUnitTest {

    @Mock
    private RecipeIngredientRepository recipeIngredientRepository;

    @InjectMocks
    private RecipeService recipeService;

    private final Long MARKET_ID = 431022L;
    private final List<Long> RECIPE_IDS = List.of(101L, 102L);

    private RecipeIngredient riTomato;
    private IngredientProduct mappingTomato;

    @BeforeEach
    void setup() {
        // 1. Setup Mock Ingredient and 
        Ingredient tomato = new Ingredient("Tomato");
        tomato.setId(1L);

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
        verify(recipeIngredientRepository).findProductsForIngredientsInMarket(List.of(1L), MARKET_ID);
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
}