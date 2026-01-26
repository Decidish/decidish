import { useState, useEffect } from 'react';
import { recipeApi, Recipe, RecipeSearchResult } from '../../api/search/recipeApi';
import { productsApi, ShoppingListResponse, IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';
import { CartItem, shoppingListApi } from "@/api/shopping-list/shoppingCartApi";
import { userApi } from '@/api/search-product/userApi';
import RecipeDetailModal from '@/components/recipe/RecipeDetailModal';
import ShoppingFlowModal from '@/components/recipe/ShoppingFlowModal';
import { UIRecipe, SelectedProducts } from '@/types/recipe';

export default function Search() {
  // --- Search & Filter State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [maxTime, setMaxTime] = useState('all');
  const [searchResults, setSearchResults] = useState<UIRecipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  // --- Modal & Selection State ---
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false);
  const [showShoppingFlowModal, setShowShoppingFlowModal] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<UIRecipe | null>(null);
  
  // --- Market & Loading State ---
  const [marketId, setMarketId] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const ITEMS_PER_PAGE = 12;

  const cuisines = ['All', 'Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian', 'Thai', 'French', 'Japanese'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const timeOptions = ['All', '15 min', '30 min', '45 min', '60 min', '60+ min'];

  // 1. Initial Load: Get User's Market
  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const id = await userApi.getUserMarketId();
        if (id) setMarketId(id);
      } catch (err) {
        console.error("Failed to fetch market preference");
      }
    };
    fetchMarket();
    // Optional: Load initial recipes
    handleSearch(1);
  }, []);

  // 2. Search Logic
  const handleSearch = async (page: number = 1) => {
    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(page);

    try {
      const response = await recipeApi.searchRecipes({
        query: searchQuery,
        cuisine: selectedCuisine,
        difficulty: selectedDifficulty,
        maxTime: maxTime,
        page: page
      });

      // Map backend response to UI
      const mappedRecipes: UIRecipe[] = response.recipes.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description || "",
        image: r.image || "https://placehold.co/600x400?text=No+Image",
        cook_time: r.cook_time || 0,
        prep_time: r.prep_time || 0,
        total_time: r.total_time || 0,
        yields: r.yields || "4",
        ratings: r.ratings || r.rating || 0,
        nutrients: {
          calories: r.calories || r.nutrients?.calories || "0",
          servingSize: r.yields || "4"
        },
        ingredients: r.ingredients || [],
        instructions: r.instructions || "",
        category: r.cuisine || "International",
        keywords: r.keywords || [],
        richIngredients: null // Will be loaded on click
      }));

      setTotalResults(response.total_count);
      setTotalPages(response.total_pages);
      setSearchResults(mappedRecipes);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("Failed to search recipes:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Handle Recipe Click -> Load Products -> Open Detail Modal
  const handleRecipeClick = async (recipe: UIRecipe) => {
    // Set basic recipe info first so modal can open
    setCurrentRecipe(recipe);
    setShowRecipeDetailModal(true);

    // If rich ingredients aren't loaded, fetch them
    if (!recipe.richIngredients) {
      setLoadingProducts(true);
      try {
        // Use hardcoded market ID fallback if user has none
        const targetMarketId = marketId || 1160; 
        const listResponse: ShoppingListResponse = await productsApi.generateShoppingList(targetMarketId, [recipe.id]);
        
        // Update local state and the list of recipes
        const updatedRecipe = { ...recipe, richIngredients: listResponse.items };
        setCurrentRecipe(updatedRecipe);
        
        setSearchResults(prev => prev.map(r => r.id === recipe.id ? updatedRecipe : r));
      } catch (err) {
        console.error("Error loading products", err);
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  // 4. Start Shopping Flow (from Detail Modal)
  const handleStartShopping = () => {
    setShowRecipeDetailModal(false);
    setShowShoppingFlowModal(true);
  };

  // 5. Handle Shopping Flow Completion
  const handleShoppingFlowComplete = async (
    recipe: UIRecipe,
    selectedProducts: SelectedProducts,
    productQuantities: Record<number, number>
  ) => {
    const itemsToAdd: CartItem[] = Object.entries(selectedProducts)
      .filter(([_, product]) => product !== 'already-have')
      .map(([ingredientId, product]) => {
        const prod = product as Product;
        // Backend bug: id is sometimes null, use reweId as fallback
        const productId = prod.id || prod.reweId;
        
        if (!productId) {
          console.error(
            `[BACKEND BUG] Product missing both id and reweId for ingredient ${ingredientId}:`,
            { product: prod, id: prod.id, reweId: prod.reweId }
          );
          return null;
        }
        
        return {
          product_id: productId,
          quantity: productQuantities[productId] || 1,
          recipe_id: recipe.id,
        };
      })
      .filter((item): item is CartItem => item !== null);

    try {
      await shoppingListApi.addItemsToShoppingList(itemsToAdd);
      
      setSuccessMessage(`${recipe.title} added to your list! 🎉`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      setShowShoppingFlowModal(false);
      setCurrentRecipe(null);
    } catch (err) {
      console.error("Failed to add items", err);
      alert("Failed to add items to shopping list");
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) handleSearch(page);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header & Search Bar */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
             <div className="relative flex-1">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl"></i>
              <input
                type="text"
                placeholder="Search for recipes (e.g., Pasta, Curry)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
                className="w-full pl-12 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-[#2F855A] focus:bg-white transition-all text-gray-900 placeholder-gray-500"
              />
            </div>
            <button
              onClick={() => handleSearch(1)}
              disabled={isSearching}
              className="px-8 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-[#276749] hover:to-emerald-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-70"
            >
              {isSearching ? <i className="ri-loader-4-line animate-spin text-xl"></i> : 'Search'}
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* Cuisine Filter */}
            <div className="relative group">
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
            </div>
            
            {/* Difficulty Filter */}
            <div className="relative group">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
            </div>

            {/* Time Filter */}
            <div className="relative group">
              <select
                value={maxTime}
                onChange={(e) => setMaxTime(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {timeOptions.map(t => <option key={t} value={t === 'All' ? 'all' : t.replace(' min', '')}>{t}</option>)}
              </select>
              <i className="ri-time-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-emerald-100 border-t-[#2F855A] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Finding delicious recipes...</p>
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Found {totalResults} recipes
              </h2>
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {searchResults.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => handleRecipeClick(recipe)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group border border-gray-100"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-gray-900 shadow-sm flex items-center gap-1">
                      <i className="ri-star-fill text-amber-400"></i>
                      {recipe.ratings ? recipe.ratings.toFixed(1) : 'New'}
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1 group-hover:text-[#2F855A] transition-colors">
                      {recipe.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <i className="ri-time-line"></i>
                        {recipe.total_time}m
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-fire-line"></i>
                        {recipe.nutrients.calories}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-restaurant-line"></i>
                        {recipe.nutrients.servingSize}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recipe.keywords?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2">
               <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-arrow-left-s-line text-xl"></i>
                </button>
                <span className="font-bold text-gray-700">Page {currentPage}</span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-arrow-right-s-line text-xl"></i>
                </button>
            </div>
          </>
        ) : hasSearched ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-search-line text-4xl text-gray-400"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No recipes found</h3>
            <p className="text-gray-500">Try adjusting your search terms or filters</p>
          </div>
        ) : (
          <div className="text-center py-20">
             <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-restaurant-line text-4xl text-[#2F855A]"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to cook?</h3>
            <p className="text-gray-500">Search for recipes to get started</p>
          </div>
        )}
      </div>

      {/* -------- 1. Recipe Detail Modal -------- */}
      <RecipeDetailModal
        recipe={currentRecipe}
        open={showRecipeDetailModal}
        onClose={() => setShowRecipeDetailModal(false)}
        onAddToShoppingList={handleStartShopping}
        showAddToShoppingButton={true}
      />

      {/* -------- 2. Shopping Flow Modal -------- */}
      <ShoppingFlowModal
        recipe={currentRecipe}
        open={showShoppingFlowModal}
        onClose={() => setShowShoppingFlowModal(false)}
        onComplete={handleShoppingFlowComplete}
      />

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-down bg-white shadow-xl rounded-2xl p-4 border-2 border-[#2F855A] flex items-center gap-3">
           <div className="w-10 h-10 bg-[#2F855A] rounded-full flex items-center justify-center text-white"><i className="ri-check-line text-xl"></i></div>
           <div>
              <p className="font-bold text-gray-900">{successMessage}</p>
              <p className="text-xs text-gray-500">View your list in the shopping tab</p>
           </div>
        </div>
      )}
    </div>
  );
}