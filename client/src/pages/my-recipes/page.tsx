import { useEffect, useState } from 'react';
import { UIRecipe } from '@/types/recipe';
import RecipeDetailModal from '@/components/recipe/RecipeDetailModal';
import { productsApi, ShoppingListResponse } from '@/api/recipe-swiper/productsApi';
import { userApi } from '@/api/search-product/userApi';
import { savedRecipesApi, SavedRecipeRecord } from '@/api/saved-recipes/savedRecipesApi';

export default function MyRecipesPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<UIRecipe | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<UIRecipe[]>([]);
  const [recipeSavedDates, setRecipeSavedDates] = useState<Map<number, Date>>(new Map());
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
    const fetchSavedRecipes = async () => {
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

        // Fetch saved recipes
        const savedRecipes = await savedRecipesApi.getSavedRecipes();
        console.log('Saved recipes:', savedRecipes);

        if (!savedRecipes || savedRecipes.length === 0) {
          setRecipes([]);
          return;
        }

        // Map saved recipes to UIRecipe format and track saved dates
        const dateMap = new Map<number, Date>();
        const uiRecipes: UIRecipe[] = savedRecipes.map((record: SavedRecipeRecord) => {
          dateMap.set(record.recipe.id, new Date(record.saved_at));
          return {
            ...record.recipe,
            richIngredients: null,
          };
        });

        setRecipeSavedDates(dateMap);
        setRecipes(uiRecipes);
      } catch (err: any) {
        console.error('Failed to load saved recipes', err);
        if (err?.response?.status === 401) {
          window.REACT_APP_NAVIGATE('/auth');
        } else {
          setError('Unable to load your saved recipes.');
        }
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedRecipes();
  }, []);

  // Filter recipes based on search query
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(normalizedQuery)
  );

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    switch (sortBy) {
      case 'newest': {
        const dateA = recipeSavedDates.get(a.id) || new Date(0);
        const dateB = recipeSavedDates.get(b.id) || new Date(0);
        return dateB.getTime() - dateA.getTime();
      }
      case 'oldest': {
        const dateA = recipeSavedDates.get(a.id) || new Date(0);
        const dateB = recipeSavedDates.get(b.id) || new Date(0);
        return dateA.getTime() - dateB.getTime();
      }
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
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                My Saved Recipes
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Recipes you've added to your shopping list
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="bg-emerald-50 px-3 sm:px-4 py-2 rounded-lg">
                <span className="text-emerald-700 font-medium text-sm sm:text-base">
                  {totalRecipes} Recipe{totalRecipes !== 1 ? 's' : ''}
                </span>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
                className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm sm:text-base"
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
              placeholder="Search your saved recipes..."
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
            <i className="ri-bookmark-line text-6xl text-gray-300 mb-4 block"></i>
            <h3 className="text-xl font-medium text-gray-500 mb-2">
              {searchQuery ? 'No recipes found' : 'No saved recipes yet'}
            </h3>
            <p className="text-gray-400">
              {searchQuery 
                ? `Try searching for something else or clear your search` 
                : 'Recipes are automatically saved when you add them to your shopping list'
              }
            </p>
          </div>
        ) : !loading && !error ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
              {currentRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => handleRecipeClick(recipe)}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group border border-gray-100"
                >
                  <div className="relative h-32 sm:h-48 overflow-hidden">
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
                  
                  <div className="p-3 sm:p-5">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-lg mb-1 sm:mb-2 line-clamp-2 group-hover:text-[#2F855A] transition-colors">
                      {recipe.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-2 sm:mb-4">
                      <span className="flex items-center gap-1">
                        <i className="ri-time-line"></i>
                        {recipe.total_time}m
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-fire-line"></i>
                        {recipe.nutrients.calories}
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <i className="ri-restaurant-line"></i>
                        {recipe.yields}
                      </span>
                    </div>

                    <div className="hidden sm:flex flex-wrap gap-2">
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
