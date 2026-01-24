package decidish.com.core.integration;

import decidish.com.core.model.recipes.IngredientGroup;
import decidish.com.core.model.recipes.ShoppingListResponse;
import decidish.com.core.service.RecipeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration")
@Tag("integration")
class RecipeControllerIT {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @MockitoBean
    private RecipeService recipeService;

    @Test
    @DisplayName("INTEGRATION: Endpoint reachable and returns JSON")
    void testEndpointConnectivity() {
        // GIVEN
        Long marketId = 999L;
        List<Integer> recipeIds = List.of(10, 20);
        String url = "http://localhost:" + port + "/shopping-list/generate?marketId=" + marketId;

        // Mock Service Logic (We mock the service layer to avoid DB setup complexity in Controller tests)
        ShoppingListResponse mockResponse = new ShoppingListResponse(
            List.of(new IngredientGroup(1, "Test Ingredient", 1.0, List.of()))
        );
        when(recipeService.generateShoppingList(eq(marketId), anyList())).thenReturn(mockResponse);

        // Prepare Request
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<List<Integer>> request = new HttpEntity<>(recipeIds, headers);

        // WHEN
        ResponseEntity<ShoppingListResponse> response = restTemplate.postForEntity(url, request, ShoppingListResponse.class);

        // THEN
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().items().size());
        assertEquals("Test Ingredient", response.getBody().items().get(0).ingredientName());
    }

    @Test
    @DisplayName("INTEGRATION: POST /shopping-list/match - Success")
    void testFuzzyMatchingEndpoint() {
        // GIVEN
        String url = "http://localhost:" + port + "/shopping-list/match";
        
        // Mocking service to return 3 dummy mappings
        when(recipeService.fuzzyMatchingPreProcessing())
            .thenReturn(java.util.Collections.nCopies(3, new decidish.com.core.model.recipes.IngredientProduct()));

        // WHEN
        ResponseEntity<String> response = restTemplate.postForEntity(url, null, String.class);

        // THEN
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Successfully generated 3 mappings.", response.getBody());
    }

    @Test
    @DisplayName("INTEGRATION: POST /shopping-list/match - Failure handling")
    void testFuzzyMatchingEndpoint_Failure() {
        // GIVEN
        String url = "http://localhost:" + port + "/shopping-list/match";
        
        when(recipeService.fuzzyMatchingPreProcessing())
            .thenThrow(new RuntimeException("SQL Execution Error"));

        // WHEN
        ResponseEntity<String> response = restTemplate.postForEntity(url, null, String.class);

        // THEN
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertTrue(response.getBody().contains("Error: SQL Execution Error"));
    }
}