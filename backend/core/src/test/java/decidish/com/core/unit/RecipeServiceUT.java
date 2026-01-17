package decidish.com.core.unit;

import decidish.com.core.model.recipes.*;
import decidish.com.core.model.rewe.Market;
import decidish.com.core.model.rewe.Product;
import decidish.com.core.model.rewe.ProductAttributesDto;
import decidish.com.core.repository.IngredientProductRepository;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.ProductRepository;
import decidish.com.core.repository.RecipeIngredientRepository;
import decidish.com.core.service.MarketService;
import decidish.com.core.service.RecipeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionCallback;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.EntityManager;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@Tag("unit")
@ExtendWith(MockitoExtension.class)
class RecipeServiceUT {

        @Mock
        private RecipeIngredientRepository recipeIngredientRepository;

        @Mock
        private MarketService marketService;

        @Mock
        private ProductRepository productRepository;

        @Mock
        private IngredientProductRepository ingredientProductRepository;

        @Mock
        private MarketRepository marketRepository;

        @Mock
        private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

        @Mock
        private EntityManager entityManager;

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

                ProductAttributesDto attrs = new ProductAttributesDto(false, false, false, false, false, false, false,
                                false,
                                false, false, false, false);

                // 3. Setup Mock Product and its mapping
                Product reweTomato = new Product(555L, "Rewe Bio Tomato", 199, "url", "500g", attrs);
                mappingTomato = new IngredientProduct();
                IngredientProductId id = new IngredientProductId(tomato.getId(), reweTomato.getId());
                mappingTomato.setId(id);
                mappingTomato.setIngredient(tomato);
                // mappingTomato.setProduct(reweTomato);
                mappingTomato.setConfidence(0.99f); // Best match

                // when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
                // TransactionCallback<?> callback = invocation.getArgument(0);
                // return callback.doInTransaction(null);
                // });

        }

        @Test
        @DisplayName("Shopping List Logic: Should aggregate ingredients and return products")
        void testGenerateShoppingList_Logic() {
                // --- ARRANGE ---
                Long TOMATO_REWE_ID = 1L; // Must be consistent

                // 1. Create the Product and ensure reweId is set
                Product tomatoProduct = new Product();
                tomatoProduct.setReweId(TOMATO_REWE_ID);
                tomatoProduct.setName("Tomato");
                tomatoProduct.setNormalizedAmount(500.0);

                // 2. Create the ID and ensure the productId matches
                IngredientProductId tomatoId = new IngredientProductId(1, TOMATO_REWE_ID);
                mappingTomato.setId(tomatoId);
                // mappingTomato.setProduct(tomatoProduct);

                // 3. Mocks

                when(recipeIngredientRepository.findForShoppingList(RECIPE_IDS))
                                .thenReturn(List.of(riTomato));

                when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(MARKET_ID)))
                                .thenReturn(List.of(mappingTomato));

                // This mock must return a product where getReweId() matches
                // mappingTomato.getId().getProductId()
                when(productRepository.findByMarketIdAndReweIds(eq(MARKET_ID), anyList()))
                                .thenReturn(List.of(tomatoProduct));

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

                when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
                        TransactionCallback<?> callback = invocation.getArgument(0);
                        return callback.doInTransaction(null);
                });

                when(recipeIngredientRepository.findForShoppingList(RECIPE_IDS))
                                .thenReturn(List.of(riTomato));

                // Return no mappings
                when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(MARKET_ID)))
                                .thenReturn(List.of());

                Product mockApiProduct = new Product();
                mockApiProduct.setReweId(123L);
                mockApiProduct.setNormalizedAmount(500.0);

                when(marketService.getProductsQueryNoSave(eq(MARKET_ID), anyString()))
                                .thenReturn(List.of(mockApiProduct));

                // Act
                ShoppingListResponse results = recipeService.generateShoppingList(MARKET_ID, RECIPE_IDS);

                // Assert

                // Assert
                assertFalse(results.items().get(0).options().isEmpty(),
                                "Options should NOT be empty because the API fallback returned a product");

                assertEquals(123L, results.items().get(0).options().get(0).product().getReweId());
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
                product.setReweId(999L);
                product.setNormalizedAmount(1000.0); // 1kg pack

                IngredientProduct mapping = new IngredientProduct();
                IngredientProductId id = new IngredientProductId(ing.getId(), product.getReweId());
                mapping.setId(id);
                mapping.setIngredient(ing);
                // mapping.setProduct(product);
                mapping.setConfidence(0.9f);

                // MOCK
                when(recipeIngredientRepository.findForShoppingList(List.of(recipeId))).thenReturn(List.of(ri));
                when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(marketId)))
                                .thenReturn(List.of(mapping));

                // Mock productRepository to return the product for the mapping
                when(productRepository.findByMarketIdAndReweIds(eq(marketId), anyList()))
                                .thenReturn(List.of(product));

                // when(recipeService.getMatches(anyList(), eq(marketId)))
                // .thenReturn(List.of(mapping));

                // WHEN
                ShoppingListResponse response = recipeService.generateShoppingList(marketId, List.of(recipeId));

                // THEN
                assertNotNull(response);
                assertEquals(1, response.items().size());
                assertEquals("Flour", response.items().get(0).ingredientName());
                assertEquals(1, response.items().get(0).options().size());

                // Verify API was NOT called because we found local matches
                verify(marketService, never()).getProductsQueryNoSave(anyLong(), anyString());
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
                apiProduct.setReweId(888L);
                apiProduct.setName("Imported Spice");
                apiProduct.setNormalizedAmount(50.0);

                // Market marketResponse = new Market();
                // marketResponse.setProducts(List.of(apiProduct));

                when(marketService.getProductsQueryNoSave(eq(marketId), eq("Exotic Spice")))
                                .thenReturn(List.of(apiProduct));

                when(productRepository.findByMarketIdAndReweId(eq(marketId), anyLong()))
                                .thenReturn(Optional.empty());

                // Mock transaction template
                when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
                        TransactionCallback<?> callback = invocation.getArgument(0);
                        return callback.doInTransaction(null);
                });

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
                verify(marketService, times(1)).getProductsQueryNoSave(eq(marketId), eq("Exotic Spice"));
        }

        @Test
        @DisplayName("UNIT: Aggregates quantities from multiple recipes (200g + 300g = 500g)")
        void testGenerateShoppingList_Aggregation() {
                // --- GIVEN ---
                Ingredient flour = new Ingredient();
                flour.setId(1);
                flour.setName("Flour");

                // Recipe A needs 200g Flour
                RecipeIngredient ri1 = new RecipeIngredient();
                ri1.setIngredient(flour);
                ri1.setQuantity(BigDecimal.valueOf(200));

                // Recipe B needs 300g Flour
                RecipeIngredient ri2 = new RecipeIngredient();
                ri2.setIngredient(flour);
                ri2.setQuantity(BigDecimal.valueOf(300));

                // Mock Repo returning disjoint list
                when(recipeIngredientRepository.findForShoppingList(anyList()))
                                .thenReturn(List.of(ri1, ri2));

                // --- PRODUCT SETUP ---
                // Product is a 1kg bag (1000g)
                Product flourBag = new Product();
                flourBag.setReweId(99L);
                flourBag.setName("Gold Flour 1kg");
                flourBag.setNormalizedAmount(1000.0);

                IngredientProduct mapping = new IngredientProduct();
                IngredientProductId id = new IngredientProductId(flour.getId(), flourBag.getReweId());
                mapping.setId(id);
                mapping.setIngredient(flour);
                // mapping.setProduct(flourBag);
                mapping.setConfidence(1.0f);

                when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(MARKET_ID)))
                                .thenReturn(List.of(mapping));

                // Mock productRepository to return the product for the mapping
                when(productRepository.findByMarketIdAndReweIds(eq(MARKET_ID), anyList()))
                                .thenReturn(List.of(flourBag));

                // --- WHEN ---
                ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID, List.of(10, 11));

                // --- THEN ---
                assertNotNull(response);
                assertEquals(1, response.items().size(), "Should aggregate into exactly 1 item entry");

                IngredientGroup group = response.items().get(0);
                assertEquals("Flour", group.ingredientName());
                assertEquals(500.0, group.totalAmountNeeded(), 0.01, "Total needed should be 200 + 300 = 500");

                // Verify Shopping Option Calculation
                // Need 500g, Pack is 1000g -> Buy 1
                ShoppingOption option = group.options().get(0);
                assertEquals(1, option.quantityToBuy(), "500g needed / 1000g pack = 0.5 -> Ceil to 1");
                assertEquals(1000.0, option.totalProductAmount(), "Buying 1 pack of 1000g = 1000g total");
        }

        @Test
        @DisplayName("UNIT: Calculates correct pack count (Need 250g, Pack 100g -> Buy 3)")
        void testGenerateShoppingList_PackCalculation() {
                // --- GIVEN ---
                Ingredient sugar = new Ingredient();
                sugar.setId(2);
                sugar.setName("Sugar");

                // Recipe needs 250g
                RecipeIngredient ri = new RecipeIngredient();
                ri.setIngredient(sugar);
                ri.setQuantity(BigDecimal.valueOf(250));

                when(recipeIngredientRepository.findForShoppingList(anyList())).thenReturn(List.of(ri));

                // Product is a small 100g packet
                Product sugarPacket = new Product();
                sugarPacket.setReweId(88L);
                sugarPacket.setNormalizedAmount(100.0);

                IngredientProduct mapping = new IngredientProduct();
                IngredientProductId id = new IngredientProductId(sugar.getId(), sugarPacket.getReweId());
                mapping.setId(id);
                mapping.setIngredient(sugar);
                // mapping.setProduct(sugarPacket);
                mapping.setConfidence(1.0f);

                when(recipeIngredientRepository.findProductsForIngredientsInMarket(anyList(), eq(MARKET_ID)))
                                .thenReturn(List.of(mapping));

                // Mock productRepository to return the product for the mapping
                when(productRepository.findByMarketIdAndReweIds(eq(MARKET_ID), anyList()))
                                .thenReturn(List.of(sugarPacket));

                // --- WHEN ---
                ShoppingListResponse response = recipeService.generateShoppingList(MARKET_ID, List.of(1));

                // --- THEN ---
                ShoppingOption option = response.items().get(0).options().get(0);

                // Math: 250 / 100 = 2.5 -> Ceil to 3
                assertEquals(3, option.quantityToBuy());
                assertEquals(300.0, option.totalProductAmount(), "3 packs * 100g = 300g total");
        }

        @Test
        @DisplayName("fuzzyMatchingPreProcessing: Should process matches and save mappings")
        void testFuzzyMatchingPreProcessing() {
                // Arrange
                List<Integer> ingredientIds = List.of(1, 2);
                when(ingredientProductRepository.findAllIngredientsIds()).thenReturn(ingredientIds);

                // Mock Projections
                IngredientMatchProjection p1 = mock(IngredientMatchProjection.class);
                when(p1.getIngredientId()).thenReturn(1);
                when(p1.getProductId()).thenReturn(100L);
                when(p1.getConfidence()).thenReturn(0.85f);

                when(ingredientProductRepository.findGenericMatches(anyList(), anyDouble(), anyInt()))
                                .thenReturn(List.of(p1));

                // Mock Products
                Product product = new Product();
                product.setReweId(100L);
                when(productRepository.findAllByReweIdIn(anyList())).thenReturn(List.of(product));

                // Mock EntityManager
                when(entityManager.getReference(eq(Ingredient.class), anyInt()))
                                .thenReturn(new Ingredient("Ingredient Proxy"));

                when(ingredientProductRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

                // Act
                List<IngredientProduct> result = recipeService.fuzzyMatchingPreProcessing();

                // Assert
                assertNotNull(result);
                assertEquals(1, result.size());

                verify(ingredientProductRepository).deleteAllInBatch();
                verify(ingredientProductRepository).saveAll(anyList());
        }
}