import { useState,useEffect } from 'react';
import { recipeApi } from '../../api/search/recipeApi';

interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  weight: string;
  unit: string;
}

interface Ingredient {
  id: number;
  name: string;
  amount: string;
  products: Product[];
}

interface Recipe {
  id: number;
  name: string;
  image: string;
  cookTime: number;
  servings: number;
  difficulty: string;
  cuisine: string;
  tags: string[];
  rating: number;
  calories: number;
  description: string;
  ingredients: Ingredient[];
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [maxTime, setMaxTime] = useState('all');
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  
  // Modal states
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [currentIngredientIndex, setCurrentIngredientIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, Product | 'already-have'>>({});
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Shopping cart
  const [cartRecipes, setCartRecipes] = useState<Recipe[]>([]);
  const [showCart, setShowCart] = useState(false);

  const ITEMS_PER_PAGE = 12;

  const cuisines = ['All', 'Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian', 'Thai', 'French', 'Japanese'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const timeOptions = ['All', '15 min', '30 min', '45 min', '60 min', '60+ min'];
  
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

      // Map Backend Data (Snake_Case) to Frontend UI (CamelCase)
      const mappedRecipes: Recipe[] = response.recipes.map((r: any) => ({
        id: r.id,
        name: r.title,
        image: r.image || "https://placehold.co/600x400?text=No+Image", // Fallback image
        cookTime: r.cook_time || r.total_time || 0,
        servings: parseInt(r.yields)|| parseInt(r.nutrients?.servingSize) || 4, // Parse string yields
        difficulty: r.difficulty || 'Medium',
        cuisine: r.cuisine || 'International',
        tags: r.keywords || [],
        rating: r.ratings,
        calories: r.nutrients?.calories ? parseInt(r.nutrients.calories) : 0,
        description: r.description,
        
        // Handle Ingredients Mismatch
        // The backend currently sends strings ["Tomato", "Cheese"], 
        // but UI expects objects with product links.
        // We create a temporary mapping so the UI doesn't crash.
        ingredients: r.ingredients ? r.ingredients.map((ingName: string, idx: number) => ({
          id: idx,
          name: ingName,
          amount: "1 serving", // Default value
          products: []         // Empty products list for now
        })) : []
      }));

      setTotalResults(response.total_count);
      setTotalPages(response.total_pages);
      setSearchResults(mappedRecipes);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("Failed to search recipes:", error);
      // TODO Add error toast here
    } finally {
      setIsSearching(false);
    }
  };

  // const handleSearch = (page: number = 1) => {
  //   setIsSearching(true);
  //   setHasSearched(true);
  //   setCurrentPage(page);

  //   // Calculate offset for backend
  //   const offset = (page - 1) * ITEMS_PER_PAGE;

  //   // Simulate API call with pagination parameters
  //   console.log('Mock API Request:', {
  //     query: searchQuery,
  //     cuisine: selectedCuisine,
  //     difficulty: selectedDifficulty,
  //     maxTime: maxTime,
  //     limit: ITEMS_PER_PAGE,
  //     offset: offset,
  //     page: page
  //   });

  //   setTimeout(() => {
  //     let filtered = mockRecipes;

  //     // Filter by search query
  //     if (searchQuery.trim()) {
  //       filtered = filtered.filter(recipe =>
  //         recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //         recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
  //         recipe.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  //       );
  //     }

  //     // Filter by cuisine
  //     if (selectedCuisine !== 'all') {
  //       filtered = filtered.filter(recipe => recipe.cuisine === selectedCuisine);
  //     }

  //     // Filter by difficulty
  //     if (selectedDifficulty !== 'all') {
  //       filtered = filtered.filter(recipe => recipe.difficulty === selectedDifficulty);
  //     }

  //     // Filter by time
  //     if (maxTime !== 'all') {
  //       const timeValue = parseInt(maxTime);
  //       filtered = filtered.filter(recipe => recipe.cookTime <= timeValue);
  //     }

  //     // Calculate pagination
  //     const total = filtered.length;
  //     const pages = Math.ceil(total / ITEMS_PER_PAGE);
  //     const startIndex = offset;
  //     const endIndex = startIndex + ITEMS_PER_PAGE;
  //     const paginatedResults = filtered.slice(startIndex, endIndex);

  //     setTotalResults(total);
  //     setTotalPages(pages);
  //     setSearchResults(paginatedResults);
  //     setIsSearching(false);

  //     // Scroll to top of results
  //     window.scrollTo({ top: 0, behavior: 'smooth' });
  //   }, 500);
  // };
  
  useEffect(() => {
    // Perform an initial search to populate the page
    handleSearch(1);
  }, []); // Empty dependency array = run once on mount

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(1);
    }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setShowIngredientModal(true);
    setCurrentIngredientIndex(0);
    setSelectedProducts({});
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      handleSearch(page);
    }
  };

  const showSuccessNotification = (recipeName: string) => {
    setSuccessMessage(`${recipeName} added to your cart! 🎉`);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  };

  const handleSelectProduct = (ingredientId: number, product: Product | 'already-have') => {
    setSelectedProducts(prev => ({
      ...prev,
      [ingredientId]: product
    }));

    if (currentRecipe && currentIngredientIndex < currentRecipe.ingredients.length - 1) {
      setCurrentIngredientIndex(currentIngredientIndex + 1);
      setShowAllProducts(false);
    } else {
      // Show review modal instead of immediately adding to list
      setShowIngredientModal(false);
      setShowReviewModal(true);
      setShowAllProducts(false);
    }
  };

  const handleEditProduct = (ingredientId: number) => {
    const ingredientIndex = currentRecipe?.ingredients.findIndex(ing => ing.id === ingredientId);
    if (ingredientIndex !== undefined && ingredientIndex !== -1) {
      setCurrentIngredientIndex(ingredientIndex);
      setShowReviewModal(false);
      setShowIngredientModal(true);
    }
  };

  const handleConfirmRecipe = () => {
    if (currentRecipe) {
      setCartRecipes([...cartRecipes, currentRecipe]);

      // Show success notification
      showSuccessNotification(currentRecipe.name);

      // Close modal
      setShowReviewModal(false);
      setCurrentRecipe(null);
    }
  };

  const calculateReviewTotal = () => {
    if (!currentRecipe) return 0;
    return currentRecipe.ingredients.reduce((total, ingredient) => {
      const selected = selectedProducts[ingredient.id];
      if (selected && selected !== 'already-have') {
        return total + selected.price;
      }
      return total;
    }, 0);
  };

  const handleRemoveFromCart = (recipeId: number) => {
    setCartRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  const handleGoToShoppingList = () => {
    // Navigate to shopping list page
    window.REACT_APP_NAVIGATE('/shopping-list');
  };

  const currentIngredient = currentRecipe?.ingredients[currentIngredientIndex];
  const INITIAL_PRODUCTS_SHOWN = 3;
  const displayedProducts = showAllProducts 
    ? currentIngredient?.products 
    : currentIngredient?.products.slice(0, INITIAL_PRODUCTS_SHOWN);
  const hasMoreProducts = currentIngredient && currentIngredient.products.length > INITIAL_PRODUCTS_SHOWN;

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisibleButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage < maxVisibleButtons - 1) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    // Previous button
    buttons.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent cursor-pointer"
      >
        <i className="ri-arrow-left-s-line text-xl text-gray-700"></i>
      </button>
    );

    // First page
    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all font-medium text-gray-700 cursor-pointer"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(
          <span key="dots1" className="w-10 h-10 flex items-center justify-center text-gray-400">
            ...
          </span>
        );
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 transition-all font-medium cursor-pointer ${
            currentPage === i
              ? 'bg-[#2F855A] border-[#2F855A] text-white'
              : 'border-gray-200 text-gray-700 hover:border-[#2F855A] hover:bg-emerald-50'
          }`}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="dots2" className="w-10 h-10 flex items-center justify-center text-gray-400">
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all font-medium text-gray-700 cursor-pointer"
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    buttons.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent cursor-pointer"
      >
        <i className="ri-arrow-right-s-line text-xl text-gray-700"></i>
      </button>
    );

    return buttons;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Search Recipes
          </h1>
          <p className="text-lg text-gray-600">
            Find the perfect recipe for your next meal
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i>
              <input
                type="text"
                placeholder="Search by recipe name, ingredient, or cuisine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#2F855A] focus:outline-none text-base transition-colors"
              />
            </div>
            <button
              onClick={() => handleSearch(1)}
              disabled={isSearching}
              className="px-8 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {isSearching ? (
                <i className="ri-loader-4-line text-xl animate-spin"></i>
              ) : (
                'Search'
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuisine
              </label>
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
              >
                {cuisines.map((cuisine) => (
                  <option key={cuisine} value={cuisine.toLowerCase()}>
                    {cuisine}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
              >
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty.toLowerCase()}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Cooking Time
              </label>
              <select
                value={maxTime}
                onChange={(e) => setMaxTime(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time === 'All' ? 'all' : parseInt(time)}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {totalResults} {totalResults === 1 ? 'Recipe' : 'Recipes'} Found
            </h2>
            {totalPages > 0 && (
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
            )}
          </div>
        )}

        {/* Recipe Grid */}
        {hasSearched && searchResults.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {searchResults.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => handleRecipeClick(recipe)}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
                >
                  <div className="relative w-full h-48 overflow-hidden">
                    <img
                      src={recipe.image}
                      alt={recipe.name}
                      className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                      <i className="ri-star-fill text-amber-500 text-sm"></i>
                      <span className="text-sm font-semibold text-gray-900">{recipe.rating}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 text-base line-clamp-2">
                      {recipe.name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <i className="ri-time-line text-sm"></i>
                        <span>{recipe.cookTime} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <i className="ri-user-line text-sm"></i>
                        <span>{recipe.servings} servings</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <i className="ri-fire-line text-sm"></i>
                        <span>{recipe.calories} cal</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-1 bg-[#2F855A]/10 text-[#2F855A] rounded-lg font-medium">
                        {recipe.cuisine}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
                        {recipe.difficulty}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.tags.length > 2 && (
                        <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md">
                          +{recipe.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                {renderPaginationButtons()}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {hasSearched && searchResults.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-search-line text-5xl text-gray-400"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Recipes Found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or search terms
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCuisine('all');
                setSelectedDifficulty('all');
                setMaxTime('all');
                setHasSearched(false);
                setSearchResults([]);
                setCurrentPage(1);
                setTotalPages(0);
                setTotalResults(0);
              }}
              className="px-6 py-2 bg-[#2F855A] text-white rounded-lg hover:bg-[#276749] transition-colors cursor-pointer whitespace-nowrap"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-[#2F855A]/10 to-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-restaurant-line text-5xl text-[#2F855A]"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Start Your Recipe Search
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Enter a recipe name, ingredient, or cuisine to discover delicious recipes tailored to your preferences
            </p>
          </div>
        )}
      </div>

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 border-2 border-[#2F855A] min-w-[320px]">
            <div className="w-12 h-12 flex items-center justify-center bg-[#2F855A] rounded-full flex-shrink-0">
              <i className="ri-check-line text-2xl text-white"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{successMessage}</p>
              <p className="text-xs text-gray-600 mt-0.5">View your cart to continue</p>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Shopping Cart</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {cartRecipes.length} {cartRecipes.length === 1 ? 'recipe' : 'recipes'} in your cart
              </p>
            </div>

            <div className="p-6">
              {cartRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-shopping-cart-line text-4xl text-gray-400"></i>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h4>
                  <p className="text-sm text-gray-600">Start adding recipes to build your shopping list</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cartRecipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={recipe.image}
                              alt={recipe.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1">{recipe.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <i className="ri-time-line"></i>
                                {recipe.cookTime}m
                              </span>
                              <span className="flex items-center gap-1">
                                <i className="ri-restaurant-line"></i>
                                {recipe.servings} servings
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 bg-[#2F855A]/10 text-[#2F855A] rounded-lg font-medium">
                                {recipe.cuisine}
                              </span>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
                                {recipe.ingredients.length} ingredients
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(recipe.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                            title="Remove from cart"
                          >
                            <i className="ri-delete-bin-line text-lg text-red-500"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleGoToShoppingList}
                    className="w-full py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <i className="ri-shopping-cart-line text-xl"></i>
                    <span>Go to Shopping List</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Selection Modal */}
      {showIngredientModal && currentRecipe && currentIngredient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Select Product</h3>
                <span className="text-sm text-gray-600">
                  {currentIngredientIndex + 1} of {currentRecipe.ingredients.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-gradient-to-r from-[#2F855A] to-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${((currentIngredientIndex + 1) / currentRecipe.ingredients.length) * 100}%` }}
                ></div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <h4 className="text-lg font-bold text-gray-900 mb-1">{currentIngredient.name}</h4>
                <p className="text-sm text-gray-600">Amount needed: <span className="font-semibold text-[#2F855A]">{currentIngredient.amount}</span></p>
              </div>
            </div>

            <div className="p-6">
              {/* Already Have Button */}
              <button
                onClick={() => handleSelectProduct(currentIngredient.id, 'already-have')}
                className="w-full mb-4 p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <i className="ri-checkbox-circle-line text-2xl"></i>
                <span className="font-semibold">Already Have This Ingredient</span>
              </button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or choose a product</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Available products:</h5>
                {hasMoreProducts && (
                  <span className="text-xs text-gray-500">
                    {currentIngredient.products.length} options available
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                {displayedProducts?.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(currentIngredient.id, product)}
                    className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl hover:bg-emerald-50 hover:border-[#2F855A] transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 mb-1">{product.name}</div>
                        <div className="text-sm text-gray-600 mb-2">{product.brand}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">{product.weight}{product.unit}</span>
                          <span className="text-lg font-bold text-[#2F855A]">${product.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <i className="ri-arrow-right-line text-2xl text-gray-400 group-hover:text-[#2F855A] transition-colors"></i>
                    </div>
                  </button>
                ))}
              </div>

              {hasMoreProducts && !showAllProducts && (
                <button
                  onClick={() => setShowAllProducts(true)}
                  className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-arrow-down-s-line text-xl"></i>
                  <span>Show {currentIngredient.products.length - INITIAL_PRODUCTS_SHOWN} More Products</span>
                </button>
              )}

              {hasMoreProducts && showAllProducts && (
                <button
                  onClick={() => setShowAllProducts(false)}
                  className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-arrow-up-s-line text-xl"></i>
                  <span>Show Less</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && currentRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Review Your Selections</h3>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setCurrentRecipe(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600">Review and edit your product selections before adding to cart</p>
            </div>

            <div className="p-6">
              {/* Recipe Info */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-6 border border-emerald-200">
                <h4 className="text-lg font-bold text-gray-900 mb-1">{currentRecipe.name}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <i className="ri-restaurant-line"></i>
                    {currentRecipe.servings} servings
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="ri-time-line"></i>
                    {currentRecipe.cookTime}m
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="ri-fire-line"></i>
                    {currentRecipe.calories} cal
                  </span>
                </div>
              </div>

              {/* Selected Products List */}
              <div className="space-y-3 mb-6">
                {currentRecipe.ingredients.map((ingredient) => {
                  const selected = selectedProducts[ingredient.id];
                  const isAlreadyHave = selected === 'already-have';
                  const product = !isAlreadyHave && selected ? selected : null;

                  return (
                    <div
                      key={ingredient.id}
                      className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 mb-1">{ingredient.name}</h5>
                          <p className="text-sm text-gray-600">Amount needed: {ingredient.amount}</p>
                        </div>
                        <button
                          onClick={() => handleEditProduct(ingredient.id)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                        >
                          <i className="ri-edit-line"></i>
                          Edit
                        </button>
                      </div>

                      {isAlreadyHave ? (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <i className="ri-checkbox-circle-fill text-xl text-amber-600"></i>
                          <span className="text-sm font-medium text-amber-900">Already have this ingredient</span>
                        </div>
                      ) : product ? (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div className="w-16 h-16 flex-shrink-0 bg-white rounded-lg overflow-hidden">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm mb-0.5">{product.name}</div>
                            <div className="text-xs text-gray-600 mb-1">{product.brand}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-700">{product.weight}{product.unit}</span>
                              <span className="text-sm font-bold text-[#2F855A]">${product.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <i className="ri-alert-line text-xl text-gray-400"></i>
                          <span className="text-sm text-gray-600">No product selected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Price */}
              <div className="bg-gradient-to-r from-[#2F855A] to-emerald-600 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm opacity-90 mb-1">Total Cost</p>
                    <p className="text-3xl font-bold">${calculateReviewTotal().toFixed(2)}</p>
                  </div>
                  <div className="w-16 h-16 flex items-center justify-center bg-white/20 rounded-full">
                    <i className="ri-shopping-cart-line text-3xl"></i>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-white/80">
                    {currentRecipe.ingredients.filter(ing => selectedProducts[ing.id] === 'already-have').length} items you already have
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setCurrentRecipe(null);
                  }}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRecipe}
                  className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <i className="ri-check-line text-xl"></i>
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
