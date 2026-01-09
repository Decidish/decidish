package decidish.com.core;

import com.fasterxml.jackson.databind.ObjectMapper;

import decidish.com.core.controller.RecipeController;
import decidish.com.core.model.recipes.IngredientGroup;
import decidish.com.core.model.recipes.ShoppingListResponse;
import decidish.com.core.service.RecipeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RecipeController.class)
class RecipeControllerUnitTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RecipeService recipeService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /generate - Success")
    void generateShoppingList_Success() throws Exception {
        // GIVEN
        Long marketId = 123L;
        List<Integer> recipeIds = List.of(1, 2, 3);
        
        // Mock Response
        IngredientGroup group = new IngredientGroup(10, "Onion", 2.0, List.of());
        ShoppingListResponse response = new ShoppingListResponse(List.of(group));

        when(recipeService.generateShoppingList(eq(marketId), anyList())).thenReturn(response);

        // WHEN & THEN
        mockMvc.perform(post("/shopping-list/generate")
                .param("marketId", String.valueOf(marketId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(recipeIds)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].ingredientName").value("Onion"));
    }

    @Test
    @DisplayName("POST /shopping-list - Bad Request (Empty Recipe List)")
    void generateShoppingList_EmptyList() throws Exception {
        // GIVEN
        List<Integer> emptyList = Collections.emptyList();

        // WHEN & THEN
        mockMvc.perform(post("/shopping-list/generate")
                .param("marketId", "123")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emptyList)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /shopping-list - Bad Request (Missing Market ID)")
    void generateShoppingList_MissingParam() throws Exception {
        // GIVEN
        List<Integer> recipeIds = List.of(1);

        // WHEN & THEN
        mockMvc.perform(post("/shopping-list/generate")
                // Missing .param("marketId")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(recipeIds)))
                .andExpect(status().isBadRequest());
    }
}