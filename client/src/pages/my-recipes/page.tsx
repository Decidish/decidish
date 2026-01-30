import { useEffect, useState } from 'react';
import { ShoppingItem, ShoppingList, shoppingListApi } from '@/api/shopping-list/shoppingCartApi';
import { UIRecipe } from '@/types/recipe';
import RecipeDetailModal from '@/components/recipe/RecipeDetailModal';
import { productsApi, ShoppingListResponse } from '@/api/recipe-swiper/productsApi';
import { userApi } from '@/api/search-product/userApi';
import { userHistoryApi } from '@/api/user-history/userHistoryApi';
import { recipeApi } from '@/api/search/recipeApi';
import { recipesApi } from '@/api/recipe-swiper/recipesApi';

interface RecipeFromList {
  id: string;
  name: string;
  image: string | null;
  dateAdded: string;
  items: ShoppingItem[];
  totalItems: number;
  totalPrice: number; // cents
}

export default function MyRecipesPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<UIRecipe | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<UIRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [marketId, setMarketId] = useState<number | null>(null);
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchRecipesAndMarket = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch user's market
        try {
          const marketIdFromUser = await userApi.getUserMarketId();
          if (marketIdFromUser) setMarketId(marketIdFromUser);
        } catch (err) {
          console.warn('Failed to fetch market ID', err);
        }

        // Fetch active shopping list to get recipes
        const listData: ShoppingList = await shoppingListApi.getActiveShoppingList();
        console.log('Shopping list data:', listData);

        if (!listData?.groups || listData.groups.length === 0) {
          setRecipes([]);
          return;
        }

        // Fetch user history recipes to enrich missing fields (allergies/yields)
        let historyRecipeByTitle = new Map<string, UIRecipe>();
        try {
          const historyRecords = await userHistoryApi.getUserHistory();
          historyRecipeByTitle = new Map(
            historyRecords
              .map((record) => record.recipe)
              .filter((recipe) => recipe?.title)
              .map((recipe) => [recipe.title.toLowerCase(), recipe])
          );
        } catch (err) {
          console.warn('Failed to fetch user history for recipe enrichment', err);
        }

        const enrichRecipeFromHistory = (recipe: UIRecipe): UIRecipe => {
          const historyRecipe = historyRecipeByTitle.get(recipe.title.toLowerCase());
          if (!historyRecipe) return recipe;

          const hasAllergies = Array.isArray(recipe.allergies) && recipe.allergies.length > 0;
          const hasYields = typeof recipe.yields === 'string' && recipe.yields.trim().length > 0;

          return {
            ...recipe,
            allergies: hasAllergies ? recipe.allergies : (historyRecipe.allergies || []),
            yields: hasYields ? recipe.yields : historyRecipe.yields,
            nutrients: {
              calories: recipe.nutrients?.calories || historyRecipe.nutrients?.calories || '0',
              servingSize: recipe.nutrients?.servingSize || historyRecipe.nutrients?.servingSize || recipe.yields || historyRecipe.yields || '4',
            },
          };
        };

        // Fetch all recommended recipes to get full details
        let allRecipes: UIRecipe[] = [];
        try {
          const recommendations = await recipesApi.getRecommendations();
          console.log('Raw recommendations from API:', recommendations);
          allRecipes = recommendations.map((r) => ({
            ...r,
            richIngredients: null,
          })) as UIRecipe[];
          console.log('Mapped recipes with all fields:', allRecipes);
        } catch (err) {
          console.warn('Failed to fetch recommendations, will use search API:', err);
        }

        // Now match shopping list recipes with full recipe data
        const matchedRecipes: UIRecipe[] = listData.groups
          .map((group) => {
            // Try to find a matching recipe from recommendations by title similarity
            const matchedRecipe = allRecipes.find(
              (r) =>
                r.title.toLowerCase() === group.recipeName.toLowerCase() ||
                r.title.toLowerCase().includes(group.recipeName.toLowerCase()) ||
                group.recipeName.toLowerCase().includes(r.title.toLowerCase())
            );

            if (matchedRecipe) {
              return enrichRecipeFromHistory(matchedRecipe);
            }

            // Fallback: search for the recipe
            return null;
          })
          .filter((r) => r !== null) as UIRecipe[];

        // If we didn't find all recipes, try searching for the ones we missed
        const foundTitles = new Set(matchedRecipes.map((r) => r.title.toLowerCase()));
        const missedGroups = listData.groups.filter(
          (g) => !foundTitles.has(g.recipeName.toLowerCase())
        );

        for (const group of missedGroups) {
          try {
            const searchResult = await recipeApi.searchRecipes({
              query: group.recipeName,
              categories: [],
              keywords: [],
              maxTime: 'all',
              maxCalories: 'all',
              page: 1,
            });

            if (searchResult.recipes && searchResult.recipes.length > 0) {
              const recipe = searchResult.recipes[0];
              const uiRecipe: UIRecipe = {
                id: recipe.id,
                title: recipe.title,
                description: recipe.description,
                image: recipe.image,
                total_time: recipe.total_time,
                prep_time: recipe.prep_time,
                cook_time: recipe.cook_time,
                yields: recipe.nutrients?.servingSize || recipe.yields || '4',
                ratings: recipe.ratings,
                nutrients: {
                  calories: recipe.nutrients?.calories || recipe.calories || '0',
                  servingSize: recipe.nutrients?.servingSize || recipe.yields || '4',
                },
                ingredients: recipe.ingredients || [],
                allergies: recipe.allergies || [],
                instructions: recipe.instructions || '',
                category: recipe.cuisine || '',
                keywords: recipe.keywords || [],
                richIngredients: null,
              };
              matchedRecipes.push(enrichRecipeFromHistory(uiRecipe));
            }
          } catch (err) {
            console.error(`Failed to search for recipe "${group.recipeName}":`, err);
          }
        }

        console.log('Matched recipes:', matchedRecipes);
        setRecipes(matchedRecipes);
      } catch (err: any) {
        console.error('Failed to load shopping list recipes', err);
        if (err?.response?.status === 401) {
          window.REACT_APP_NAVIGATE('/auth');
        } else {
          setError('Unable to load recipes from your shopping list.');
        }
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipesAndMarket();
  }, []);

  // Filter recipes based on search query
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(normalizedQuery)
  );

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return 0; // Shopping list recipes don't have date info in new format
      case 'oldest':
        return 0;
      case 'name':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  // Pagination calculations
  const totalRecipes = sortedRecipes.length;
  const totalPages = Math.ceil(totalRecipes / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecipes = sortedRecipes.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleRecipeClick = async (recipe: UIRecipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeDetailModal(true);

    if (!recipe.richIngredients && marketId) {
      try {
        const listResponse: ShoppingListResponse = await productsApi.generateShoppingList(marketId, [recipe.id]);
        const updatedRecipe = { ...recipe, richIngredients: listResponse.items };
        setSelectedRecipe(updatedRecipe);
        setRecipes(prev => prev.map(r => (r.id === recipe.id ? updatedRecipe : r)));
      } catch (err) {
        console.error('Error loading products', err);
      }
    }
  };

  const showSuccessNotification = (recipeName: string) => {
    setSuccessMessage(`${recipeName} added to your shopping list! 🎉`);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  };  // Image expansion modal
  if (expandedImage) {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 cursor-pointer"
        onClick={() => setExpandedImage(null)}
      >
        <button
          onClick={() => setExpandedImage(null)}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer"
        >
          <i className="ri-close-line text-2xl text-white"></i>
        </button>
        <img
          src={expandedImage}
          alt="Expanded recipe"
          className="max-w-full max-h-[90vh] object-contain rounded-2xl"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Recipes
              </h1>
              <p className="text-gray-600">
                Recipes in your current shopping list
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-emerald-50 px-4 py-2 rounded-lg">
                <span className="text-emerald-700 font-medium">
                  {totalRecipes} Recipe{totalRecipes !== 1 ? 's' : ''} Total
                </span>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-search-line text-gray-400"></i>
            </div>
            <input
              type="text"
              placeholder="Search recipes or shopping list items..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
              >
                <i className="ri-close-line text-gray-400 hover:text-gray-600"></i>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Recipes Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <div className="text-center py-16 text-gray-500">Loading recipes...</div>
        )}
        {error && !loading && (
          <div className="text-center py-16 text-red-600">{error}</div>
        )}
        {!loading && !error && currentRecipes.length === 0 ? (
          <div className="text-center py-16">
            <i className="ri-search-line text-6xl text-gray-300 mb-4 block"></i>
            <h3 className="text-xl font-medium text-gray-500 mb-2">
              {searchQuery ? 'No recipes found' : 'No recipes in your shopping list yet'}
            </h3>
            <p className="text-gray-400">
              {searchQuery 
                ? `Try searching for something else or clear your search` 
                : 'Add recipes to your shopping list to see them here'
              }
            </p>
          </div>
        ) : !loading && !error ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {currentRecipes.map((recipe) => (
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
                        {recipe.yields}
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

            {/* Bottom Pagination */}
            {totalPages > 1 && (
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
            )}
          </>
        ) : null}
      </div>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        open={showRecipeDetailModal}
        onClose={() => {
          setShowRecipeDetailModal(false);
          setSelectedRecipe(null);
        }}
        showAddToShoppingButton={false}
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
