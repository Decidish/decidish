import { useState, useEffect, useRef } from 'react';
import { recipeApi } from '../../api/search/recipeApi';
import { categoriesApi } from '../../api/search/categoriesApi';
import { keywordsApi } from '../../api/search/keywordsApi';
import { productsApi, ShoppingListResponse, Product } from '@/api/recipe-swiper/productsApi';
import { CartItem, shoppingListApi } from '@/api/shopping-list/shoppingCartApi';
import { userApi } from '@/api/search-product/userApi';
import { userHistoryApi } from '@/api/user-history/userHistoryApi';
import RecipeDetailModal from '@/components/recipe/RecipeDetailModal';
import ShoppingFlowModal from '@/components/recipe/ShoppingFlowModal';
import { UIRecipe, SelectedProducts } from '@/types/recipe';

export default function Search() {
  // --- Search & Filter State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const [keywordQuery, setKeywordQuery] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [isKeywordOpen, setIsKeywordOpen] = useState(false);

  const [maxTime, setMaxTime] = useState('all');
  const [maxCalories, setMaxCalories] = useState('all');

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
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [historyRecipeByTitle, setHistoryRecipeByTitle] = useState<Map<string, UIRecipe>>(new Map());

  const timeOptions = ['All', '15 min', '30 min', '45 min', '60 min', '60+ min'];
  const calorieOptions = ['All', '100', '200', '300', '400', '500', '750', '1000', '1500'];

  const categoryRef = useRef<HTMLDivElement | null>(null);
  const keywordRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Load: Get User's Market and preload suggestions
  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const id = await userApi.getUserMarketId();
        if (id) setMarketId(id);
      } catch (err) {
        console.error('Failed to fetch market preference');
      }
    };
    fetchMarket();

    const fetchHistory = async () => {
      try {
        const historyRecords = await userHistoryApi.getUserHistory();
        const map = new Map(
          historyRecords
            .map((record) => record.recipe)
            .filter((recipe) => recipe?.title)
            .map((recipe) => [recipe.title.toLowerCase(), recipe])
        );
        setHistoryRecipeByTitle(map);
      } catch (err) {
        console.warn('Failed to fetch user history for recipe enrichment', err);
      }
    };
    fetchHistory();

    categoriesApi.listCategories(undefined, 30)
      .then(setSuggestedCategories)
      .catch(() => setSuggestedCategories([]));

    keywordsApi.listKeywords(undefined, 30)
      .then(setSuggestedKeywords)
      .catch(() => setSuggestedKeywords([]));

    void handleSearch(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch category suggestions when typing (debounced)
  useEffect(() => {
    const handle = setTimeout(() => {
      categoriesApi.listCategories(categoryQuery || undefined, 30)
        .then(setSuggestedCategories)
        .catch(() => setSuggestedCategories([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [categoryQuery]);

  // Fetch keyword suggestions when typing (debounced)
  useEffect(() => {
    const handle = setTimeout(() => {
      keywordsApi.listKeywords(keywordQuery || undefined, 30)
        .then(setSuggestedKeywords)
        .catch(() => setSuggestedKeywords([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [keywordQuery]);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    if (!isCategoryOpen && !isKeywordOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isCategoryOpen && categoryRef.current && !categoryRef.current.contains(target)) {
        setIsCategoryOpen(false);
      }
      if (isKeywordOpen && keywordRef.current && !keywordRef.current.contains(target)) {
        setIsKeywordOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isCategoryOpen) setIsCategoryOpen(false);
        if (isKeywordOpen) setIsKeywordOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryOpen, isKeywordOpen]);

  // Auto-search when typing or changing filters (debounced)
  useEffect(() => {
    if (!hasSearched && !searchQuery && selectedCategories.length === 0 && selectedKeywords.length === 0 && maxTime === 'all' && maxCalories === 'all') {
      return;
    }
    const handle = setTimeout(() => {
      void handleSearch(1);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, selectedCategories.join(','), selectedKeywords.join(','), maxTime, maxCalories]);

  // Separate effect for pagination changes
  useEffect(() => {
    if (hasSearched && currentPage > 1) {
      void handleSearch(currentPage);
    }
  }, [currentPage, hasSearched]);

  // 2. Search Logic
  const handleSearch = async (page: number = 1) => {
    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(page);

    try {
      const response = await recipeApi.searchRecipes({
        query: searchQuery,
        categories: selectedCategories,
        keywords: selectedKeywords,
        maxTime: maxTime,
        maxCalories: maxCalories,
        page: page,
      });

      const recipes = response.recipes || [];
      const mappedRecipes: UIRecipe[] = recipes.map((r: any) => {
        const rawAllergies = r?.allergies;
        const normalizedAllergies = Array.isArray(rawAllergies)
          ? rawAllergies
          : typeof rawAllergies === 'string'
            ? rawAllergies.split(/[,;]+/).map((a: string) => a.trim()).filter(Boolean)
            : [];

        const historyRecipe = historyRecipeByTitle.get((r.title || '').toLowerCase());
        const enrichedAllergies = normalizedAllergies.length > 0
          ? normalizedAllergies
          : (historyRecipe?.allergies || []);
        const enrichedYields = r.nutrients?.servingSize || r.yields || historyRecipe?.yields || '4';
        const enrichedServingSize = r.nutrients?.servingSize || historyRecipe?.nutrients?.servingSize || r.yields || historyRecipe?.yields || '4';
        const enrichedCalories = r.nutrients?.calories || r.calories || historyRecipe?.nutrients?.calories || '0';

        return {
        id: r.id,
        title: r.title,
        description: r.description || '',
        image: r.image || 'https://placehold.co/600x400?text=No+Image',
        cook_time: r.cook_time || 0,
        prep_time: r.prep_time || 0,
        total_time: r.total_time || 0,
          yields: enrichedYields,
          ratings: r.ratings || r.rating || 0,
          nutrients: {
            calories: enrichedCalories,
            servingSize: enrichedServingSize,
          },
          ingredients: r.ingredients || [],
          allergies: enrichedAllergies,
          instructions: r.instructions || '',
          category: r.cuisine || 'International',
          keywords: r.keywords || [],
          richIngredients: null,
        };
      });

      setTotalResults(response.total_count);
      setTotalPages(response.total_pages);
      setSearchResults(mappedRecipes);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Failed to search recipes:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Handle Recipe Click -> Load Products -> Open Detail Modal
  const handleRecipeClick = async (recipe: UIRecipe) => {
    setCurrentRecipe(recipe);
    setShowRecipeDetailModal(true);

    if (!recipe.richIngredients) {
      try {
        const targetMarketId = marketId || 1160;
        const listResponse: ShoppingListResponse = await productsApi.generateShoppingList(targetMarketId, [recipe.id]);
        const updatedRecipe = { ...recipe, richIngredients: listResponse.items };
        setCurrentRecipe(updatedRecipe);
        setSearchResults(prev => prev.map(r => (r.id === recipe.id ? updatedRecipe : r)));
      } catch (err) {
        console.error('Error loading products', err);
      }
    }
  };

  // 4. Start Shopping Flow (from Detail Modal)
  const handleStartShopping = () => {
    setShowRecipeDetailModal(false);
    setShowShoppingFlowModal(true);
  };

  const handleRecipeUpdate = (updated: UIRecipe) => {
    setCurrentRecipe(prev => (prev?.id === updated.id ? updated : prev));
    setSearchResults(prev => prev.map(r => (r.id === updated.id ? updated : r)));
  };

  // 5. Handle Shopping Flow Completion
  const handleShoppingFlowComplete = async (
    recipe: UIRecipe,
    selectedProducts: SelectedProducts,
    productQuantities: Record<number, number>
  ) => {
    const itemsToAdd: CartItem[] = Object.entries(selectedProducts)
      .filter(([_, product]) => product !== 'already-have')
      .map(([_, product]) => ({
        product_id: (product as Product).id,
        quantity: productQuantities[(product as Product).id] || 1,
        recipe_id: recipe.id,
      }));

    try {
      await shoppingListApi.addItemsToShoppingList(itemsToAdd);
      setSuccessMessage(`${recipe.title} added to your list! 🎉`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setShowShoppingFlowModal(false);
      setCurrentRecipe(null);
    } catch (err) {
      console.error('Failed to add items', err);
      alert('Failed to add items to shopping list');
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header & Search Bar */}
      <div className="bg-white shadow-sm sticky top-0 z-40 overflow-visible">
        <div className="max-w-7xl mx-auto px-4 py-4 overflow-visible">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg sm:text-xl"></i>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-[#2F855A] focus:bg-white transition-all text-sm sm:text-base text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-start gap-2 sm:gap-3 pb-2">
            {/* Categories Multi-Select */}
            <div className="relative w-full xs:w-auto xs:min-w-[160px] sm:min-w-[180px]" ref={categoryRef}>
              <button
                onClick={() => setIsCategoryOpen(prev => !prev)}
                className="relative appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors w-full flex items-center gap-2"
              >
                <i className="ri-price-tag-3-line text-gray-600"></i>
                <span className="flex-1 text-left">Categories</span>
                <i className={`ri-arrow-${isCategoryOpen ? 'up' : 'down'}-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none`}></i>
              </button>

              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategories(prev => prev.filter(c => c !== cat));
                      }}
                      className="px-3 py-1 bg-emerald-50 text-[#2F855A] border border-emerald-200 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                      title="Remove"
                    >
                      <span>{cat}</span>
                      <i className="ri-close-line"></i>
                    </button>
                  ))}
                </div>
              )}

              {isCategoryOpen && (
                <div className="fixed mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-[60] p-3 w-80"
                     style={{
                       top: categoryRef.current ? categoryRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
                       left: categoryRef.current ? categoryRef.current.getBoundingClientRect().left + window.scrollX : 0
                     }}>
                  <div className="relative mb-2">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      value={categoryQuery}
                      onChange={(e) => setCategoryQuery(e.target.value)}
                      placeholder="Search categories..."
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2F855A] text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <ul className="max-h-48 overflow-y-auto">
                    {suggestedCategories.map(c => (
                      <li key={c}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategories(prev => prev.includes(c) ? prev : [...prev, c]);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer rounded-lg"
                        >
                          {c}
                        </button>
                      </li>
                    ))}
                    {suggestedCategories.length === 0 && (
                      <li className="px-3 py-2 text-sm text-gray-500">No categories found</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Keywords Multi-Select */}
            <div className="relative w-full xs:w-auto xs:min-w-[160px] sm:min-w-[180px]" ref={keywordRef}>
              <button
                onClick={() => setIsKeywordOpen(prev => !prev)}
                className="relative appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors w-full flex items-center gap-2"
              >
                <i className="ri-hashtag text-gray-600"></i>
                <span className="flex-1 text-left">Keywords</span>
                <i className={`ri-arrow-${isKeywordOpen ? 'up' : 'down'}-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none`}></i>
              </button>

              {selectedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedKeywords.map((kw) => (
                    <button
                      key={kw}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedKeywords(prev => prev.filter(k => k !== kw));
                      }}
                      className="px-3 py-1 bg-emerald-50 text-[#2F855A] border border-emerald-200 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                      title="Remove"
                    >
                      <span>{kw}</span>
                      <i className="ri-close-line"></i>
                    </button>
                  ))}
                </div>
              )}

              {isKeywordOpen && (
                <div className="fixed mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-[60] p-3 w-80"
                     style={{
                       top: keywordRef.current ? keywordRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
                       left: keywordRef.current ? keywordRef.current.getBoundingClientRect().left + window.scrollX : 0
                     }}>
                  <div className="relative mb-2">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      value={keywordQuery}
                      onChange={(e) => setKeywordQuery(e.target.value)}
                      placeholder="Search keywords..."
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2F855A] text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <ul className="max-h-48 overflow-y-auto">
                    {suggestedKeywords.map(k => (
                      <li key={k}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKeywords(prev => prev.includes(k) ? prev : [...prev, k]);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer rounded-lg"
                        >
                          {k}
                        </button>
                      </li>
                    ))}
                    {suggestedKeywords.length === 0 && (
                      <li className="px-3 py-2 text-sm text-gray-500">No keywords found</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Time Filter */}
            <div className="relative group min-w-[160px]">
              <select
                value={maxTime}
                onChange={(e) => setMaxTime(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors w-full"
              >
                {timeOptions.map(t => <option key={t} value={t === 'All' ? 'all' : t.replace(' min', '')}>{t}</option>)}
              </select>
              <i className="ri-time-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
            </div>

            {/* Max Calories Filter */}
            <div className="relative group min-w-[180px]">
              <select
                value={maxCalories}
                onChange={(e) => setMaxCalories(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors w-full"
              >
                {calorieOptions.map(c => <option key={c} value={c === 'All' ? 'all' : c}>{c === 'All' ? 'All kcal' : `${c} kcal max`}</option>)}
              </select>
              <i className="ri-fire-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
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
        marketId={marketId || undefined}
        onClose={() => setShowShoppingFlowModal(false)}
        onComplete={handleShoppingFlowComplete}
        onRecipeUpdate={handleRecipeUpdate}
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
