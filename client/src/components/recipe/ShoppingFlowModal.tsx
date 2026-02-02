import { useEffect, useMemo, useState } from 'react';
import { productsApi, IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';
import { productApi, Product as SearchProduct } from '@/api/search-product/productApi';
import { SelectedProducts, UIRecipe } from '@/types/recipe';

interface ShoppingFlowModalProps {
  recipe: UIRecipe | null;
  open: boolean;
  marketId?: number;
  onClose: () => void;
  onComplete: (recipe: UIRecipe, selected: SelectedProducts, quantities: Record<number, number>) => void;
  onRecipeUpdate?: (recipe: UIRecipe) => void;
}

const DEFAULT_MARKET_ID = 441070;
const INITIAL_PRODUCTS_SHOWN = 3;

export default function ShoppingFlowModal({
  recipe,
  open,
  marketId = DEFAULT_MARKET_ID,
  onClose,
  onComplete,
  onRecipeUpdate,
}: ShoppingFlowModalProps) {
  const [workingRecipe, setWorkingRecipe] = useState<UIRecipe | null>(null);
  const [currentIngredientIndex, setCurrentIngredientIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>({});
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
  
  // Ingredient product sort state
  const [ingredientPriceSort, setIngredientPriceSort] = useState<'none' | 'low-high' | 'high-low'>('none');
  
  // Product search popup state
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCurrentPage, setSearchCurrentPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchSelectedProduct, setSearchSelectedProduct] = useState<Product | null>(null);
  const [searchProductQuantity, setSearchProductQuantity] = useState(0);
  const [filterType, setFilterType] = useState('all');
  const [priceSort, setPriceSort] = useState('none');
  
  const filterOptions = [
    { value: 'all', label: 'All Products' },
    { value: 'is_organic', label: 'Organic (Bio)' },
    { value: 'is_vegan', label: 'Vegan' },
    { value: 'is_gluten_free', label: 'Gluten Free' },
    { value: 'is_regional', label: 'Regional' },
    { value: 'is_lowest_price', label: 'Sale Items' },
  ];

  useEffect(() => {
    const reset = () => {
      setWorkingRecipe(null);
      setSelectedProducts({});
      setProductQuantities({});
      setCurrentIngredientIndex(0);
      setShowIngredientModal(false);
      setShowReviewModal(false);
      setShowAllProducts(false);
      setIsEditing(false);
      setLoadingProducts(false);
      setHasLoadedProducts(false);
      setIngredientPriceSort('none');
      setShowSearchPopup(false);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setSearchCurrentPage(1);
      setSearchTotalPages(0);
      setSearchSelectedProduct(null);
      setSearchProductQuantity(0);
      setFilterType('all');
      setPriceSort('none');
    };

    if (!open || !recipe) {
      reset();
      return;
    }

    setWorkingRecipe(recipe);
    setSelectedProducts({});
    setProductQuantities({});
    setCurrentIngredientIndex(0);
    setShowIngredientModal(true);
    setShowReviewModal(false);
    setShowAllProducts(false);
    setIsEditing(false);

    const ensureIngredients = async (target: UIRecipe) => {
      // Prevent multiple concurrent calls
      if (target.richIngredients || loadingProducts || hasLoadedProducts) return;

      setLoadingProducts(true);
      setHasLoadedProducts(true);
      try {
        const listResponse = await productsApi.generateShoppingList(marketId, [target.id]);
        const updated: UIRecipe = { ...target, richIngredients: listResponse.items };
        setWorkingRecipe(updated);
        onRecipeUpdate?.(updated);
      } catch (err) {
        console.error('Error loading products', err);
        setHasLoadedProducts(false); // Reset on error to allow retry
      } finally {
        setLoadingProducts(false);
      }
    };

    void ensureIngredients({ ...recipe });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe?.id, marketId]);

  const currentIngredientGroup: IngredientGroup | undefined = useMemo(() => {
    if (!workingRecipe?.richIngredients) return undefined;
    const group = workingRecipe.richIngredients[currentIngredientIndex];
    console.log('[ShoppingFlowModal] Current ingredient group changed:', {
      ingredientId: group?.ingredientId,
      ingredientName: group?.ingredientName,
      optionCount: group?.options.length,
      productIds: group?.options.map(opt => opt.product.id),
    });
    return group;
  }, [currentIngredientIndex, workingRecipe]);

  // Reset showAllProducts, product quantities, and sort when ingredient changes
  useEffect(() => {
    setShowAllProducts(false);
    setIngredientPriceSort('none');
    // Clear quantities for the current ingredient's products to prevent "sticky" quantities
    if (currentIngredientGroup) {
      setProductQuantities((prev) => {
        const newQuantities = { ...prev };
        const productIdsToDelete: number[] = [];
        currentIngredientGroup.options.forEach((opt) => {
          productIdsToDelete.push(opt.product.id);
          delete newQuantities[opt.product.id];
        });
        console.log('[ShoppingFlowModal] Cleared quantities for ingredient:', {
          ingredientId: currentIngredientGroup.ingredientId,
          ingredientName: currentIngredientGroup.ingredientName,
          clearedProductIds: productIdsToDelete,
          remainingQuantities: newQuantities,
        });
        return newQuantities;
      });
    }
  }, [currentIngredientIndex, currentIngredientGroup]);

  const displayedOptions = currentIngredientGroup?.options || [];
  
  // Helper function to find the original ingredient string (with quantity/unit) from recipe.ingredients
  const getFullIngredientText = (ingredientGroup: IngredientGroup): string => {
    if (!workingRecipe?.ingredients) {
      return ingredientGroup.originalIngredientName || ingredientGroup.ingredientName;
    }
    // Try to find a matching ingredient string that contains the ingredient name
    const ingredientName = ingredientGroup.ingredientName.toLowerCase();
    const originalName = ingredientGroup.originalIngredientName?.toLowerCase() || '';
    
    const match = workingRecipe.ingredients.find((ing) => {
      const ingLower = ing.toLowerCase();
      return ingLower.includes(ingredientName) || ingLower.includes(originalName);
    });
    
    return match || ingredientGroup.originalIngredientName || ingredientGroup.ingredientName;
  };
  
  // Sort products based on ingredientPriceSort
  const sortedProducts = useMemo(() => {
    const products = displayedOptions.map((opt) => opt.product);
    if (ingredientPriceSort === 'low-high') {
      return [...products].sort((a, b) => a.price - b.price);
    } else if (ingredientPriceSort === 'high-low') {
      return [...products].sort((a, b) => b.price - a.price);
    }
    return products;
  }, [displayedOptions, ingredientPriceSort]);
  
  const displayedProducts = showAllProducts
    ? sortedProducts
    : sortedProducts.slice(0, INITIAL_PRODUCTS_SHOWN);
  const hasMoreProducts = (currentIngredientGroup?.options?.length || 0) > INITIAL_PRODUCTS_SHOWN;
  const hasNoProducts = displayedOptions.length === 0;

  // Product search handlers
  const handleOpenSearch = () => {
    setSearchQuery(currentIngredientGroup?.ingredientName || '');
    setSearchResults([]);
    setSearchCurrentPage(1);
    setSearchTotalPages(0);
    setSearchSelectedProduct(null);
    setSearchProductQuantity(0);
    setFilterType('all');
    setPriceSort('none');
    setShowSearchPopup(true);
    // Trigger initial search
    setTimeout(() => handleSearchProducts(1), 100);
  };

  const handleSearchProducts = async (page: number = 1) => {
    setIsSearching(true);
    setSearchCurrentPage(page);
    try {
      const data = await productApi.searchProducts({
        query: searchQuery,
        filter: filterType,
        sort: priceSort,
        page,
        marketId,
      });
      setSearchResults(data.content);
      setSearchTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to search products:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-search when typing or changing filters in search popup (debounced)
  useEffect(() => {
    if (!showSearchPopup) return;
    const handle = setTimeout(() => {
      void handleSearchProducts(1);
    }, 250);
    return () => clearTimeout(handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterType, priceSort, showSearchPopup]);

  const handleSelectSearchProduct = (searchProduct: SearchProduct) => {
    // Convert SearchProduct to Product format
    const product: Product = {
      id: searchProduct.id,
      reweId: searchProduct.id, // Using id as reweId since it's from search
      name: searchProduct.name,
      price: searchProduct.price,
      imageUrl: searchProduct.imageUrl,
      grammage: searchProduct.grammage,
      normalizedAmount: 1,
      attributes: {
        isOrganic: searchProduct.attributes?.isOrganic ?? false,
        isVegan: searchProduct.attributes?.isVegan ?? false,
        isVegetarian: false, // Not available in search results
        isGlutenFree: searchProduct.attributes?.isGlutenFree ?? false,
        isLowestPrice: searchProduct.attributes?.isLowestPrice ?? false,
      },
    };
    
    // Set as selected product with initial quantity of 1
    setSearchSelectedProduct(product);
    setSearchProductQuantity(1);
  };

  const handleSearchQuantityChange = (change: number) => {
    setSearchProductQuantity((prev) => Math.max(0, prev + change));
  };

  const handleConfirmSearchSelection = () => {
    if (!searchSelectedProduct || searchProductQuantity === 0 || !currentIngredientGroup) return;
    
    // Set quantity for the selected product
    setProductQuantities((prev) => ({
      ...prev,
      [searchSelectedProduct.id]: searchProductQuantity,
    }));
    
    setShowSearchPopup(false);
    handleSelectProduct(currentIngredientGroup.ingredientId, searchSelectedProduct);
  };

  const handleClearSearchSelection = () => {
    setSearchSelectedProduct(null);
    setSearchProductQuantity(0);
  };

  const handleSelectProduct = (ingredientId: number, product: Product | 'already-have') => {
    setSelectedProducts((prev) => ({
      ...prev,
      [ingredientId]: product,
    }));

    if (!isEditing && workingRecipe?.richIngredients && currentIngredientIndex < workingRecipe.richIngredients.length - 1) {
      setCurrentIngredientIndex((prev) => prev + 1);
      setShowAllProducts(false);
    } else {
      setShowIngredientModal(false);
      setShowReviewModal(true);
      setShowAllProducts(false);
    }
  };

  const handleQuantityChange = (productId: number, change: number) => {
    setProductQuantities((prev) => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + change);
      return {
        ...prev,
        [productId]: newQty,
      };
    });
  };

  const handleEditProduct = (ingredientId: number) => {
    if (!workingRecipe?.richIngredients) return;
    const ingredientIndex = workingRecipe.richIngredients.findIndex((ing) => ing.ingredientId === ingredientId);
    if (ingredientIndex === -1) return;
    setIsEditing(true);
    setCurrentIngredientIndex(ingredientIndex);
    setShowReviewModal(false);
    setShowIngredientModal(true);
  };

  const handleCancel = () => {
    setShowIngredientModal(false);
    setShowReviewModal(false);
    setWorkingRecipe(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!workingRecipe) return;
    onComplete(workingRecipe, selectedProducts, productQuantities);
    setShowIngredientModal(false);
    setShowReviewModal(false);
    setWorkingRecipe(null);
    onClose();
  };

  const calculateReviewTotal = () => {
    if (!workingRecipe?.richIngredients) return 0;
    return workingRecipe.richIngredients.reduce((total, ingredient) => {
      const selected = selectedProducts[ingredient.ingredientId];
      if (selected && selected !== 'already-have') {
        return total + selected.price * (productQuantities[selected.id] || 1);
      }
      return total;
    }, 0);
  };

  if (!open || !workingRecipe || !workingRecipe.richIngredients || !currentIngredientGroup) return null;

  return (
    <>
      {/* Ingredient Selection Modal */}
      {showIngredientModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50"
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {!isEditing && currentIngredientIndex > 0 && (
                    <button
                      onClick={() => {
                        setCurrentIngredientIndex((prev) => Math.max(0, prev - 1));
                        setShowAllProducts(false);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Go back to previous ingredient"
                    >
                      <i className="ri-arrow-left-line text-xl text-gray-700"></i>
                    </button>
                  )}
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Select Product</h3>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {!isEditing && (
                    <span className="text-xs sm:text-sm text-gray-600">
                      {currentIngredientIndex + 1}/{workingRecipe.richIngredients.length}
                    </span>
                  )}
                  <button
                    onClick={handleCancel}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <i className="ri-close-line text-xl text-gray-600"></i>
                  </button>
                </div>
              </div>
              {!isEditing && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div
                    className="bg-gradient-to-r from-[#2F855A] to-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${((currentIngredientIndex + 1) / workingRecipe.richIngredients.length) * 100}%` }}
                  ></div>
                </div>
              )}
              <div className="bg-emerald-50 rounded-lg p-2 sm:p-3 border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <i className="ri-restaurant-line text-[#2F855A]"></i>
                  <span className="text-xs sm:text-sm font-medium text-gray-500">Recipe calls for:</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2">
                  {getFullIngredientText(currentIngredientGroup)}
                </h4>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {loadingProducts && (
                <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
                  <i className="ri-loader-4-line animate-spin" aria-hidden="true"></i>
                  <span>Loading product options...</span>
                </div>
              )}

              <button
                onClick={() => handleSelectProduct(currentIngredientGroup.ingredientId, 'already-have')}
                className="w-full mb-3 sm:mb-4 p-3 sm:p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <i className="ri-checkbox-circle-line text-xl sm:text-2xl"></i>
                <span className="font-semibold text-sm sm:text-base">Already Have This</span>
              </button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or choose a product</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Available products:</h5>
                  {hasMoreProducts && (
                    <span className="text-xs text-gray-500 hidden sm:inline">({currentIngredientGroup.options.length} options)</span>
                  )}
                </div>
                <select
                  value={ingredientPriceSort}
                  onChange={(e) => setIngredientPriceSort(e.target.value as 'none' | 'low-high' | 'high-low')}
                  className="px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-xs sm:text-sm cursor-pointer bg-white"
                >
                  <option value="none">Featured</option>
                  <option value="low-high">Price: Low → High</option>
                  <option value="high-low">Price: High → Low</option>
                </select>
              </div>

              <div className="space-y-3">
                {displayedProducts?.map((product) => {
                  const quantity = productQuantities[product.id] || 0;
                  return (
                  <div
                    key={product.id}
                    className="w-full p-3 sm:p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-[#2F855A] transition-all"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-3">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{product.grammage}</div>
                        <div className="text-xs text-gray-500 mb-1 line-clamp-1">{product.name}</div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className="text-base sm:text-lg font-bold text-[#2F855A]">{(product.price / 100).toFixed(2)}€</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2 sm:p-3 mb-3">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Qty:</span>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => handleQuantityChange(product.id, -1)}
                          disabled={quantity === 0}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <i className="ri-subtract-line text-lg sm:text-xl text-gray-700"></i>
                        </button>
                        <span className="text-lg sm:text-xl font-bold text-gray-900 min-w-[2rem] sm:min-w-[3rem] text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer"
                        >
                          <i className="ri-add-line text-lg sm:text-xl text-gray-700"></i>
                        </button>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => handleSelectProduct(currentIngredientGroup.ingredientId, product)}
                      disabled={quantity === 0}
                      className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-lg font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 text-sm sm:text-base"
                    >
                      <i className="ri-shopping-cart-line text-lg sm:text-xl"></i>
                      <span>{quantity === 0 ? 'Select Qty' : `Add ${quantity}`}</span>
                    </button>
                  </div>
                  );
                })}
              </div>

              {/* No products found - show search button */}
              {hasNoProducts && !loadingProducts && (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <i className="ri-search-line text-2xl sm:text-3xl text-gray-400"></i>
                  </div>
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No matching products found</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    We couldn't find products for this ingredient. Try searching manually.
                  </p>
                  <button
                    onClick={handleOpenSearch}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 mx-auto"
                  >
                    <i className="ri-search-line text-lg"></i>
                    <span>Search Products</span>
                  </button>
                </div>
              )}

              {hasMoreProducts && !showAllProducts && (
                <button
                  onClick={() => setShowAllProducts(true)}
                  className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-arrow-down-s-line text-xl"></i>
                  <span>Show {currentIngredientGroup.options.length - INITIAL_PRODUCTS_SHOWN} More Products</span>
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
      {showReviewModal && workingRecipe && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50"
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Review Selections</h3>
                <button
                  onClick={handleCancel}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Review and edit your product selections</p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-emerald-200">
                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1 line-clamp-2">{workingRecipe.title}</h4>
                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap">
                  <span className="flex items-center gap-1">
                    <i className="ri-restaurant-line"></i>
                    {workingRecipe.yields}
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="ri-time-line"></i>
                    {workingRecipe.total_time}m
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="ri-fire-line"></i>
                    {workingRecipe.nutrients.calories}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-4 sm:mb-6">
                {workingRecipe.richIngredients?.map((ingredient) => {
                  const selected = selectedProducts[ingredient.ingredientId];
                  const isAlreadyHave = selected === 'already-have';
                  const product = !isAlreadyHave && selected ? selected : null;

                  return (
                    <div
                      key={ingredient.ingredientId}
                      className="bg-white border-2 border-gray-200 rounded-xl p-3 sm:p-4 hover:border-emerald-200 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base line-clamp-2">
                            {getFullIngredientText(ingredient)}
                          </h5>
                          <p className="text-xs text-gray-500 mb-0.5">Ingredient: {ingredient.ingredientName}</p>
                          {!isAlreadyHave && product && (
                            <p className="text-xs sm:text-sm text-gray-600">Qty: {productQuantities[product.id] || 1}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditProduct(ingredient.ingredientId)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                        >
                          <i className="ri-edit-line"></i>
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      </div>

                      {isAlreadyHave ? (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <i className="ri-checkbox-circle-fill text-xl text-amber-600"></i>
                          <span className="text-sm font-medium text-amber-900">Already have this ingredient</span>
                        </div>
                      ) : product ? (
                        <div className="flex items-center gap-2 sm:gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-2 sm:p-3">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-white rounded-lg overflow-hidden">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-xs sm:text-sm mb-0.5 line-clamp-2">{product.name}</div>
                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                              <span className="text-xs text-gray-600">{product.grammage}</span>
                              <span className="text-sm sm:text-base font-bold text-[#2F855A]">
                                {((product.price * (productQuantities[product.id] || 1)) / 100).toFixed(2)}€
                              </span>
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

              <div className="bg-gradient-to-r from-[#2F855A] to-emerald-600 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-xs sm:text-sm opacity-90 mb-0.5 sm:mb-1">Total Cost</p>
                    <p className="text-2xl sm:text-3xl font-bold">{(calculateReviewTotal() / 100).toFixed(2)}€</p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-white/20 rounded-full">
                    <i className="ri-shopping-cart-line text-2xl sm:text-3xl"></i>
                  </div>
                </div>
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/20">
                  <p className="text-[10px] sm:text-xs text-white/80">
                    {workingRecipe.richIngredients?.filter((ing) => selectedProducts[ing.ingredientId] === 'already-have').length} items you already have
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 sm:py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <i className="ri-check-line text-lg sm:text-xl"></i>
                  <span>Add to List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Search Popup */}
      {showSearchPopup && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-[60]"
          onClick={() => setShowSearchPopup(false)}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-3xl max-h-[90vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Search Products</h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    For: <span className="font-medium text-[#2F855A]">{currentIngredientGroup?.ingredientName}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowSearchPopup(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              
              {/* Search Input */}
              <div className="relative mb-3">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:border-[#2F855A] focus:outline-none text-sm transition-colors"
                />
                {isSearching && (
                  <i className="ri-loader-4-line absolute right-3 top-1/2 -translate-y-1/2 text-lg text-[#2F855A] animate-spin"></i>
                )}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-xs sm:text-sm cursor-pointer"
                >
                  {filterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-xs sm:text-sm cursor-pointer"
                >
                  <option value="none">Featured</option>
                  <option value="low-high">Price: Low to High</option>
                  <option value="high-low">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Selected Product Panel */}
            {searchSelectedProduct && (
              <div className="bg-emerald-50 border-b border-emerald-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-emerald-200">
                    <img src={searchSelectedProduct.imageUrl} alt={searchSelectedProduct.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-semibold text-gray-900 text-sm line-clamp-2">{searchSelectedProduct.grammage}</div>
                      <button
                        onClick={handleClearSearchSelection}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
                        title="Remove selection"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-1 mb-2">{searchSelectedProduct.name}</div>
                    
                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSearchQuantityChange(-1)}
                          disabled={searchProductQuantity <= 1}
                          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <i className="ri-subtract-line text-gray-700"></i>
                        </button>
                        <span className="text-lg font-bold text-gray-900 min-w-[2rem] text-center">
                          {searchProductQuantity}
                        </span>
                        <button
                          onClick={() => handleSearchQuantityChange(1)}
                          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer"
                        >
                          <i className="ri-add-line text-gray-700"></i>
                        </button>
                      </div>
                      <div className="text-lg font-bold text-[#2F855A]">
                        {((searchSelectedProduct.price * searchProductQuantity) / 100).toFixed(2)}€
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Confirm Button */}
                <button
                  onClick={handleConfirmSearchSelection}
                  disabled={searchProductQuantity === 0}
                  className="w-full mt-3 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <i className="ri-check-line text-xl"></i>
                  <span>Confirm Selection</span>
                </button>
              </div>
            )}

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-gray-500">
                  <i className="ri-search-line text-4xl mb-2 block"></i>
                  <p className="text-sm">No products found. Try a different search term.</p>
                </div>
              )}

              {isSearching && (
                <div className="text-center py-8">
                  <i className="ri-loader-4-line text-3xl text-[#2F855A] animate-spin"></i>
                  <p className="text-sm text-gray-600 mt-2">Searching...</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {searchResults.map((product) => {
                  const isSelected = searchSelectedProduct?.id === product.id;
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectSearchProduct(product)}
                      className={`bg-white border-2 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-[#2F855A] ring-2 ring-emerald-100' 
                          : 'border-gray-200 hover:border-[#2F855A]'
                      }`}
                    >
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2 relative">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <i className="ri-image-line text-2xl"></i>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-[#2F855A] rounded-full flex items-center justify-center">
                            <i className="ri-check-line text-white text-sm"></i>
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2 mb-1">{product.grammage}</div>
                      <div className="text-xs text-gray-500 line-clamp-1 mb-1">{product.name}</div>
                      <div className="text-sm sm:text-base font-bold text-[#2F855A]">{(product.price / 100).toFixed(2)}€</div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {searchTotalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleSearchProducts(searchCurrentPage - 1)}
                    disabled={searchCurrentPage === 1 || isSearching}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                  >
                    <i className="ri-arrow-left-s-line"></i>
                  </button>
                  <span className="flex items-center px-3 text-sm text-gray-600">
                    {searchCurrentPage} / {searchTotalPages}
                  </span>
                  <button
                    onClick={() => handleSearchProducts(searchCurrentPage + 1)}
                    disabled={searchCurrentPage === searchTotalPages || isSearching}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                  >
                    <i className="ri-arrow-right-s-line"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
