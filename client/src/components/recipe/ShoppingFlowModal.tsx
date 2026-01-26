import { useEffect, useState } from 'react';
import { productsApi, IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';
import { productApi, Product as SearchProduct } from '@/api/search-product/productApi';
import { UIRecipe, SelectedProducts } from '@/types/recipe';

interface ShoppingFlowModalProps {
  recipe: UIRecipe | null;
  open: boolean;
  marketId?: number;
  alreadyInList?: boolean;
  onClose: () => void;
  onComplete: (recipe: UIRecipe, selected: SelectedProducts, quantities: Record<number, number>) => void;
  onRecipeUpdate?: (recipe: UIRecipe) => void;
}

const DEFAULT_MARKET_ID = 441070;

export default function ShoppingFlowModal({
  recipe,
  open,
  marketId = DEFAULT_MARKET_ID,
  alreadyInList = false,
  onClose,
  onComplete,
  onRecipeUpdate,
}: ShoppingFlowModalProps) {
  const [workingRecipe, setWorkingRecipe] = useState<UIRecipe | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);
  
  // Step 1: Ingredient Selection
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [showIngredientSelection, setShowIngredientSelection] = useState(false);
  
  // Step 2: Product Selection & Preview
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
  const [selectedProducts, setSelectedProducts] = useState<Record<number, Product | 'already-have'>>({}); // ingredientId -> product
  const [showPreview, setShowPreview] = useState(false);
  const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
  const [moreOptionsIngredientId, setMoreOptionsIngredientId] = useState<number | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showProductError, setShowProductError] = useState(false);
  
  // Product Search
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCurrentPage, setSearchCurrentPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [hasPerformedSearch, setHasPerformedSearch] = useState(false);
  const [searchProductsMap, setSearchProductsMap] = useState<Record<number, Product>>({});
  const [ingredientIdToOriginal, setIngredientIdToOriginal] = useState<Record<number, string>>({});

  // Validate that products have valid database IDs (not reweIds)
  const normalizeProductIds = (product: Product, context: string): Product | null => {
    const resolvedId = Number(product.id);

    // Require a valid database ID - never fallback to reweId as it's not a valid product.id
    if (!Number.isFinite(resolvedId) || resolvedId <= 0) {
      console.error(`[BACKEND BUG] ${context} missing or invalid database id (got id=${product.id}, reweId=${product.reweId}):`, product);
      return null;
    }

    return product;
  };


  const resetState = () => {
    setWorkingRecipe(null);
    setSelectedIngredients(new Set());
    setProductQuantities({});
    setSelectedProducts({});
    setShowIngredientSelection(false);
    setShowPreview(false);
    setShowMoreOptionsModal(false);
    setMoreOptionsIngredientId(null);
    setLoadingProducts(false);
    setHasLoadedProducts(false);
    setShowAllProducts(false);
    setHasCompletedOnce(false);
    setShowProductError(false);
    setShowProductSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchCurrentPage(1);
    setSearchTotalPages(0);
    setHasPerformedSearch(false);
    setSearchProductsMap({});
    setIngredientIdToOriginal({});
  };

  // Initialize and load products; preserve selections when reopening the same recipe
  useEffect(() => {
    if (!recipe) {
      resetState();
      return;
    }

    if (!open) return; // keep state when closed

    const isSameRecipe = workingRecipe?.id === recipe.id;
    if (alreadyInList) {
      setHasCompletedOnce(true);
    }

    const ensureIngredients = async (target: UIRecipe) => {
      if (target.richIngredients || loadingProducts || (hasLoadedProducts && isSameRecipe)) return;

      setLoadingProducts(true);
      setHasLoadedProducts(true);
      try {
        const listResponse = await productsApi.generateShoppingList(marketId, [target.id]);
        const updated: UIRecipe = { ...target, richIngredients: listResponse.items };
        setWorkingRecipe(updated);
        onRecipeUpdate?.(updated);

        // Create mapping from ingredientId to original ingredient text, even when backend order differs
        if (listResponse.items) {
          const mapping: Record<number, string> = {};

          if (target.ingredients && target.ingredients.length > 0) {
            const normalize = (value: string) =>
              value
                .normalize('NFD')
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .toLowerCase()
                .trim();

            listResponse.items.forEach((ing) => {
              const normalizedName = normalize(ing.ingredientName);
              const matchedOriginal = target.ingredients.find((orig) => {
                const normalizedOrig = normalize(orig);
                return (
                  normalizedOrig.includes(normalizedName) ||
                  normalizedName.includes(normalizedOrig)
                );
              });

              mapping[ing.ingredientId] = matchedOriginal || ing.ingredientName;
            });
          } else {
            // Fallback to backend-provided names when we have no recipe ingredients
            listResponse.items.forEach((ing) => {
              mapping[ing.ingredientId] = ing.ingredientName;
            });
          }

          setIngredientIdToOriginal(mapping);
        }

        // Initialize all ingredients as selected with defaults if we have no prior selections
        if (listResponse.items && !isSameRecipe) {
          setSelectedIngredients(new Set(listResponse.items.map(ing => ing.ingredientId)));
          const defaultProducts: Record<number, Product | 'already-have'> = {};
          const defaultQuantities: Record<number, number> = {};
          listResponse.items.forEach(ing => {
            if (ing.options.length > 0) {
              const product = ing.options[0].product;
              const normalized = normalizeProductIds(product, 'Default product');
              if (normalized?.id) {
                defaultProducts[ing.ingredientId] = normalized;
                defaultQuantities[normalized.id] = 1;
              }
            }
          });
          setSelectedProducts(defaultProducts);
          setProductQuantities(defaultQuantities);
        }

        // Always start at ingredient selection (even when editing)
        setShowIngredientSelection(true);
        setShowPreview(false);
      } catch (err) {
        console.error('Error loading products', err);
        setHasLoadedProducts(false);
      } finally {
        setLoadingProducts(false);
      }
    };

    if (!isSameRecipe) {
      // Switching recipe: reset selection state
      setSelectedIngredients(new Set());
      setProductQuantities({});
      setSelectedProducts({});
      setHasCompletedOnce(false);
      setWorkingRecipe(recipe);
      setHasLoadedProducts(false);
    }

    void ensureIngredients(isSameRecipe ? { ...workingRecipe! } : { ...recipe });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe?.id, marketId, alreadyInList]);

  // When reopening with data already loaded, ensure defaults and show selection step
  useEffect(() => {
    if (!open || !workingRecipe?.richIngredients || !hasLoadedProducts) return;

    // Ensure selected ingredients are populated (only on first load)
    setSelectedIngredients(prev => {
      if (prev.size > 0) return prev;
      return new Set(workingRecipe.richIngredients!.map(ing => ing.ingredientId));
    });

    // Ensure default products for any ingredient missing a selection
    setSelectedProducts(prev => {
      const updated = { ...prev } as Record<number, Product | 'already-have'>;
      workingRecipe.richIngredients!.forEach((ing) => {
        if (updated[ing.ingredientId] === undefined && ing.options.length > 0) {
          const normalized = normalizeProductIds(ing.options[0].product, 'Default product');
          if (normalized?.id) {
            updated[ing.ingredientId] = normalized;
          }
        }
      });
      return updated;
    });

    // Always start at ingredient selection in this session
    setShowIngredientSelection(true);
    setShowPreview(false);
  }, [open, workingRecipe?.id, hasLoadedProducts, hasCompletedOnce]);


  const handleIngredientToggle = (ingredientId: number) => {
    setSelectedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const handleMoveToPreview = () => {
    // Ensure any newly re-selected ingredient has a default product
    setSelectedProducts(prev => {
      if (!workingRecipe?.richIngredients) return prev;
      const updated = { ...prev } as Record<number, Product | 'already-have'>;
      workingRecipe.richIngredients.forEach((ing) => {
        if (selectedIngredients.has(ing.ingredientId) && updated[ing.ingredientId] === undefined && ing.options.length > 0) {
          const normalized = normalizeProductIds(ing.options[0].product, 'Default product');
          if (normalized?.id) {
            updated[ing.ingredientId] = normalized;
          }
        }
      });
      return updated;
    });
    setShowIngredientSelection(false);
    setShowPreview(true);
  };

  const handleGoBackToSelection = () => {
    setShowPreview(false);
    setShowIngredientSelection(true);
    // Don't modify selectedIngredients or selectedProducts when going back
  };

  const handleDeleteIngredient = (ingredientId: number) => {
    setSelectedIngredients(prev => {
      const newSet = new Set(prev);
      newSet.delete(ingredientId);
      return newSet;
    });
    // Remove the product associated with this ingredient
    const product = selectedProducts[ingredientId];
    const productId = typeof product === 'object' ? product.id : undefined;
    setSearchProductsMap(prev => {
      if (productId && prev[productId]) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  };

  const handleQuantityChange = (productId: number, change: number) => {
    setProductQuantities(prev => {
      const currentQty = prev[productId] || 1;
      const newQty = Math.max(1, currentQty + change);
      return {
        ...prev,
        [productId]: newQty,
      };
    });
  };

  const handleSelectProduct = (ingredientId: number, productId: number) => {
    if (!workingRecipe?.richIngredients) return;
    const ingredient = workingRecipe.richIngredients.find(ing => ing.ingredientId === ingredientId);
    const optionProduct = ingredient?.options.find(opt => Number(opt.product.reweId) === Number(productId))?.product;
    const normalized = optionProduct ? normalizeProductIds(optionProduct, 'Default product') : null;
    if (!normalized?.id) return;

    setSelectedProducts(prev => ({
      ...prev,
      [ingredientId]: normalized,
    }));

    setProductQuantities(prev => {
      if (prev[normalized.id] !== undefined) return prev;
      return { ...prev, [normalized.id]: 1 };
    });
  };

  const handleRemoveProduct = (ingredientId: number, productId: number) => {
    setSelectedProducts(prev => {
      const { [ingredientId]: _, ...rest } = prev;
      return rest;
    });
    setProductQuantities(prev => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
    // If product is a search product, remove it from searchProductsMap
    setSearchProductsMap(prev => {
      if (prev[productId]) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  };

  const handleCloseMoreOptions = () => {
    // Keep selected search products in searchProductsMap for persistence
    // Only clear unselected search results
    if (moreOptionsIngredientId) {
      const selectedProduct = selectedProducts[moreOptionsIngredientId];
      const selectedId = typeof selectedProduct === 'object' ? selectedProduct.id : undefined;
      // Don't remove selected products from searchProductsMap - they need to persist
      // Only clear search results that weren't selected
      setSearchResults(prev => {
        return prev.filter(result => result.id === selectedId);
      });
    }
    
    setShowMoreOptionsModal(false);
    setMoreOptionsIngredientId(null);
    setShowProductSearch(false);
    setSearchQuery('');
    setSearchCurrentPage(1);
  };

  const handleOpenMoreOptions = (ingredientId: number) => {
    // Preserve search state when reopening for the same ingredient
    const isSameIngredient = moreOptionsIngredientId === ingredientId;
    
    if (!isSameIngredient) {
      // Clear search state only if switching to a different ingredient
      setShowProductSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      setSearchCurrentPage(1);
      setSearchTotalPages(0);
      setHasPerformedSearch(false);
      // Don't clear searchProductsMap - keep all selected search products
    }

    setMoreOptionsIngredientId(ingredientId);
    setShowMoreOptionsModal(true);
    setShowAllProducts(false);
    setShowProductError(false);
  };

  const handleSearchProducts = async (page: number = 1) => {
    if (!searchQuery.trim() || !moreOptionsIngredientId) return;
    
    setIsSearching(true);
    setSearchCurrentPage(page);
    setHasPerformedSearch(true);
    
    try {
      const data = await productApi.searchProducts({
        query: searchQuery,
        filter: 'all',
        sort: 'none',
        page: page,
        marketId: marketId
      });
      
      setSearchResults(data.content);
      setSearchTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to search products', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchProduct = (product: SearchProduct) => {
    if (!moreOptionsIngredientId) return;
    
    // Validate product ID
    const productId = Number(product.id);
    if (!productId || !Number.isFinite(productId) || productId <= 0) {
      console.error('Invalid product ID from search result:', product.id, product);
      return;
    }

    const rawReweId = (product as SearchProduct & { reweId?: number }).reweId;
    const resolvedReweId = Number(rawReweId ?? productId);

    const normalizedProduct = normalizeProductIds({
      id: productId,
      reweId: resolvedReweId,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      grammage: product.grammage,
      normalizedAmount: 0,
      attributes: {
        isOrganic: false,
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
        isLowestPrice: false,
      }
    }, 'Search product');

    if (!normalizedProduct?.id) return;

    setSelectedProducts(prev => {
      // Store in searchProductsMap using reweId as key
      setSearchProductsMap(prevMap => ({
        ...prevMap,
        [normalizedProduct.id]: normalizedProduct
      }));
      
      return {
        ...prev,
        [moreOptionsIngredientId]: normalizedProduct,
      };
    });

    setProductQuantities(prev => {
      if (prev[normalizedProduct.id] !== undefined) return prev;
      return { ...prev, [normalizedProduct.id]: 1 };
    });
  };

  const handleResetToDefaults = () => {
    if (!moreOptionsIngredientId || !workingRecipe) return;
    
    // Find the ingredient
    const ingredient = workingRecipe.richIngredients?.find(
      ing => ing.ingredientId === moreOptionsIngredientId
    );
    
    if (!ingredient) return;
    
    // Clear search UI
    setSearchQuery('');
    setSearchResults([]);
    setSearchCurrentPage(1);
    setHasPerformedSearch(false);
    
    // If no default options available, clear all selections for this ingredient
    if (ingredient.options.length === 0) {
      setSelectedProducts(prev => {
        const { [moreOptionsIngredientId]: _, ...rest } = prev;
        return rest;
      });
      
      // Remove quantities for all products of this ingredient
      setProductQuantities(prev => {
        const updated = { ...prev };
        const currentProduct = selectedProducts[moreOptionsIngredientId];
        const currentProductId = typeof currentProduct === 'object' ? currentProduct.id : undefined;
        if (currentProductId !== undefined) {
          delete updated[currentProductId];
        }
        return updated;
      });
      
      // Clear all search products for this ingredient
      setSearchProductsMap(prev => {
        const updated = { ...prev };
        const currentProduct = selectedProducts[moreOptionsIngredientId];
        const currentSelectedId = typeof currentProduct === 'object' ? currentProduct.id : undefined;
        if (currentSelectedId !== undefined && updated[currentSelectedId]) {
          delete updated[currentSelectedId];
        }
        return updated;
      });
      
      return;
    }
    
    // Select only the first available product for this ingredient
    const normalized = normalizeProductIds(ingredient.options[0].product, 'Default product');
    if (!normalized?.id) return;
    
    setSelectedProducts(prev => ({
      ...prev,
      [moreOptionsIngredientId]: normalized
    }));
    
    // Reset quantities for this ingredient only
    setProductQuantities(prev => {
      const updated = { ...prev };
      // Remove quantities for the old product (if any)
      const currentProduct = selectedProducts[moreOptionsIngredientId];
      const currentProductId = typeof currentProduct === 'object' ? currentProduct.id : undefined;
      if (currentProductId !== undefined && currentProductId !== normalized.id) {
        delete updated[currentProductId];
      }
      // Set quantity to 1 for the first product if not already set
      if (!updated[normalized.id]) {
        updated[normalized.id] = 1;
      }
      return updated;
    });
    
    // Clear search products for this ingredient from searchProductsMap
    setSearchProductsMap(prev => {
      const updated = { ...prev };
        const currentProduct = selectedProducts[moreOptionsIngredientId];
        const currentSelectedId = typeof currentProduct === 'object' ? currentProduct.id : undefined;
        // Remove if it's not in the default options
        if (currentSelectedId !== undefined && !ingredient.options.some(opt => opt.product.id === currentSelectedId)) {
          delete updated[currentSelectedId];
      }
      return updated;
    });
  };

  const handleResetAllToDefaults = () => {
    if (!workingRecipe?.richIngredients) return;
    
    const newSelectedProducts: Record<number, Product | 'already-have'> = {};
    const newProductQuantities: Record<number, number> = {};
    const validDefaultProductIds = new Set<number>();
    
    // Process all selected ingredients
    selectedIngredients.forEach(ingredientId => {
      const ingredient = workingRecipe.richIngredients?.find(
        ing => ing.ingredientId === ingredientId
      );
      
      if (!ingredient) return;
      
      // If ingredient has default options, select the first one
      if (ingredient.options.length > 0) {
        const normalized = normalizeProductIds(ingredient.options[0].product, 'Default product');
        if (normalized?.id) {
          newSelectedProducts[ingredientId] = normalized;
          newProductQuantities[normalized.id] = 1;
          validDefaultProductIds.add(normalized.id);
        }
      }
    });
    
    setSelectedProducts(newSelectedProducts);
    setProductQuantities(newProductQuantities);
    
    // Clear all search products except those that are default options
    setSearchProductsMap(prev => {
      const updated: Record<number, Product> = {};
      Object.keys(prev).forEach(idStr => {
        const id = parseInt(idStr);
        if (validDefaultProductIds.has(id)) {
          updated[id] = prev[id];
        }
      });
      return updated;
    });
  };

  const handleConfirm = () => {
    if (!workingRecipe) return;

    // Check if any products are selected
    const hasProducts = Array.from(selectedIngredients).some(ingId => selectedProducts[ingId] !== undefined);
    
    // Show error if no products selected
    if (!hasProducts) {
      setShowProductError(true);
      return;
    }

    // Convert to SelectedProducts format expected by onComplete
    const selected: SelectedProducts = {};
    const finalQuantities: Record<number, number> = {};
    
    selectedIngredients.forEach(ingredientId => {
      const ingredient = workingRecipe.richIngredients?.find(ing => ing.ingredientId === ingredientId);
      if (!ingredient) return;
      
      const selection = selectedProducts[ingredientId];
      if (selection === undefined) {
        console.warn(`No product selected for ingredient ${ingredientId}`);
        return;
      }

      if (selection === 'already-have') {
        selected[ingredientId] = 'already-have';
        return;
      }

      const normalized = normalizeProductIds(selection, 'Selected product');
      if (!normalized?.id) {
        console.warn(`[BACKEND BUG] Skipping ingredient ${ingredientId} - product has invalid id. Product:`, selection);
        return;
      }

      selected[ingredientId] = normalized;
      finalQuantities[normalized.id] = productQuantities[normalized.id] || 1;
    });

    onComplete(workingRecipe, selected, finalQuantities);
    setHasCompletedOnce(true);
    setShowIngredientSelection(false);
    setShowPreview(false);
    onClose();
  };

  const handleCancel = () => {
    setShowIngredientSelection(false);
    setShowPreview(false);
    setShowMoreOptionsModal(false);
    onClose();
  };

  // Get the ingredient being viewed in "More Options"
  const moreOptionsIngredient = workingRecipe?.richIngredients?.find(
    ing => ing.ingredientId === moreOptionsIngredientId
  );


  if (!open || !workingRecipe || !workingRecipe.richIngredients) return null;

  return (
    <>
      {/* Step 1: Ingredient Selection Modal */}
      {showIngredientSelection && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Select Ingredients</h3>
                <button
                  onClick={handleCancel}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600">Choose which ingredients you need for this recipe</p>
            </div>

            <div className="p-6">
              {loadingProducts && (
                <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
                  <i className="ri-loader-4-line animate-spin" aria-hidden="true"></i>
                  <span>Loading ingredients...</span>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {workingRecipe.richIngredients.map((ingredient) => {
                  const originalName = ingredientIdToOriginal[ingredient.ingredientId] || ingredient.ingredientName;
                  return (
                    <label
                      key={ingredient.ingredientId}
                      className="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-200 transition-all cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIngredients.has(ingredient.ingredientId)}
                        onChange={() => handleIngredientToggle(ingredient.ingredientId)}
                        className="w-5 h-5 text-[#2F855A] rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{originalName}</p>
                        <p className="text-xs text-gray-600">Amount needed: {ingredient.totalAmountNeeded}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveToPreview}
                  className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-arrow-right-line text-xl"></i>
                  <span>Next: Review Products</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Product Preview & Selection Modal */}
      {showPreview && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Review Products</h3>
                <button
                  onClick={handleCancel}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm text-gray-600">Review and adjust your product selections</p>
                <button
                  onClick={handleResetAllToDefaults}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <i className="ri-refresh-line text-base"></i>
                  <span>Reset All</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {hasCompletedOnce && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
                  <i className="ri-checkbox-circle-line text-lg"></i>
                  <span>This recipe is already in your shopping list. You can update selections and re-add.</span>
                </div>
              )}

              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-6 border border-emerald-200">
                <h4 className="text-lg font-bold text-gray-900 mb-1">{workingRecipe.title}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <i className="ri-restaurant-line"></i>
                    {workingRecipe.yields} servings
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

              <div className="space-y-4 mb-6">
                {workingRecipe.richIngredients
                  .filter(ing => selectedIngredients.has(ing.ingredientId))
                  .map((ingredient) => {
                    const originalName = ingredientIdToOriginal[ingredient.ingredientId] || ingredient.ingredientName;
                    const selectedProduct = selectedProducts[ingredient.ingredientId];
                    const hasOptions = ingredient.options.length > 0;
                    const quantity = typeof selectedProduct === 'object' && selectedProduct.id ? (productQuantities[selectedProduct.id] || 1) : 0;

                    return (
                      <div
                        key={ingredient.ingredientId}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="font-semibold text-gray-900">{originalName}</h5>
                          <button
                            onClick={() => handleDeleteIngredient(ingredient.ingredientId)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                          >
                            <i className="ri-delete-bin-line"></i>
                            Remove ingredient
                          </button>
                        </div>

                        {!hasOptions ? (
                          <div className="space-y-3">
                            {selectedProduct === undefined && (
                              <>
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <i className="ri-alert-line text-xl text-gray-400"></i>
                                  <span className="text-sm text-gray-600">No matching products found</span>
                                </div>
                                <button
                                  onClick={() => handleOpenMoreOptions(ingredient.ingredientId)}
                                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                  <i className="ri-arrow-down-s-line"></i>
                                  <span>More Options</span>
                                </button>
                              </>
                            )}

                            {selectedProduct && typeof selectedProduct === 'object' && (
                              <div className="space-y-3">
                                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                        <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-semibold text-gray-900 text-sm mb-0.5">{selectedProduct.name}</div>
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                          <span>{selectedProduct.grammage}</span>
                                          <span className="font-bold text-[#2F855A]">{(selectedProduct.price / 100).toFixed(2)}€</span>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveProduct(ingredient.ingredientId, selectedProduct.id)}
                                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      Remove
                                    </button>
                                  </div>

                                  <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                    <span className="text-sm font-medium text-gray-700">Quantity</span>
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => handleQuantityChange(selectedProduct.id, -1)}
                                        disabled={quantity <= 1}
                                        className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <i className="ri-subtract-line text-xl text-gray-700"></i>
                                      </button>
                                      <span className="text-xl font-bold text-gray-900 min-w-[3rem] text-center">{quantity}</span>
                                      <button
                                        onClick={() => handleQuantityChange(selectedProduct.id, 1)}
                                        className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer"
                                      >
                                        <i className="ri-add-line text-xl text-gray-700"></i>
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleOpenMoreOptions(ingredient.ingredientId)}
                                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                  <i className="ri-arrow-down-s-line"></i>
                                  <span>More Options</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="space-y-3">
                              {selectedProduct === undefined && (
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                                  <i className="ri-alert-line text-lg"></i>
                                  <span>No product selected for this ingredient.</span>
                                </div>
                              )}

                              {selectedProduct && typeof selectedProduct === 'object' && (
                                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                        <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-semibold text-gray-900 text-sm mb-0.5">{selectedProduct.name}</div>
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                          <span>{selectedProduct.grammage}</span>
                                          <span className="font-bold text-[#2F855A]">{(selectedProduct.price / 100).toFixed(2)}€</span>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveProduct(ingredient.ingredientId, selectedProduct.id)}
                                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      Remove
                                    </button>
                                  </div>

                                  <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                    <span className="text-sm font-medium text-gray-700">Quantity</span>
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => handleQuantityChange(selectedProduct.id, -1)}
                                        disabled={quantity <= 1}
                                        className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <i className="ri-subtract-line text-xl text-gray-700"></i>
                                      </button>
                                      <span className="text-xl font-bold text-gray-900 min-w-[3rem] text-center">{quantity}</span>
                                      <button
                                        onClick={() => handleQuantityChange(selectedProduct.id, 1)}
                                        className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer"
                                      >
                                        <i className="ri-add-line text-xl text-gray-700"></i>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {ingredient.options.length > 1 && (
                                <button
                                  onClick={() => handleOpenMoreOptions(ingredient.ingredientId)}
                                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                  <i className="ri-arrow-down-s-line"></i>
                                  <span>More Options ({ingredient.options.length})</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div className="bg-gradient-to-r from-[#2F855A] to-emerald-600 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm opacity-90 mb-1">Total Cost</p>
                    <p className="text-3xl font-bold">
                      {(
                        workingRecipe.richIngredients
                          .filter(ing => selectedIngredients.has(ing.ingredientId))
                          .reduce((total, ingredient) => {
                            const selectedProduct = selectedProducts[ingredient.ingredientId];
                            if (typeof selectedProduct !== 'object' || !selectedProduct.id) return total;
                            
                            const quantity = productQuantities[selectedProduct.id] || 1;
                            return total + selectedProduct.price * quantity;
                          }, 0) / 100
                      ).toFixed(2)}€
                    </p>
                  </div>
                  <div className="w-16 h-16 flex items-center justify-center bg-white/20 rounded-full">
                    <i className="ri-shopping-cart-line text-3xl"></i>
                  </div>
                </div>
              </div>

              {showProductError && (
                <div className="px-4 py-3 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2 text-red-700 mb-4">
                  <i className="ri-error-warning-line text-lg flex-shrink-0"></i>
                  <span className="font-medium">No products selected</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleGoBackToSelection}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <i className="ri-arrow-left-line text-xl"></i>
                  <span>Back to Ingredients</span>
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-shopping-cart-line text-xl"></i>
                  <span>Add to Shopping List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* More Options Modal */}
      {showMoreOptionsModal && moreOptionsIngredient && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleCloseMoreOptions}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Choose a Product</h3>
                <button
                  onClick={handleCloseMoreOptions}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <h4 className="text-lg font-bold text-gray-900 mb-1">
                  {ingredientIdToOriginal[moreOptionsIngredient.ingredientId] || moreOptionsIngredient.ingredientName}
                </h4>
                <p className="text-sm text-gray-600">
                  {moreOptionsIngredient.options.length} options available
                </p>
              </div>
            </div>

            <div className="p-6">
              {/* Tab Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setShowProductSearch(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    !showProductSearch
                      ? 'bg-[#2F855A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Available Options
                </button>
                <button
                  onClick={() => setShowProductSearch(true)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    showProductSearch
                      ? 'bg-[#2F855A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Search Products
                </button>
              </div>

              {/* Available Options Tab */}
              {!showProductSearch && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-3">
                    <i className="ri-information-line text-blue-600 text-lg flex-shrink-0 mt-0.5"></i>
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Need something else?</p>
                      <p>Use the <span className="font-semibold">Search Products</span> tab to find alternatives from our full catalog.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {moreOptionsIngredient.options.map((option) => {
                      const selected = selectedProducts[moreOptionsIngredient.ingredientId];
                      const isSelected = typeof selected === 'object' && selected.id === option.product.id;
                      return (
                        <button
                          key={option.product.id ?? option.product.reweId}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectProduct(moreOptionsIngredient.ingredientId, Number(option.product.reweId));
                          }}
                          className={`w-full p-4 rounded-xl transition-all text-left border-2 ${
                            isSelected
                              ? 'border-[#2F855A] bg-emerald-50'
                              : 'border-gray-200 bg-white hover:border-emerald-200'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                              <img src={option.product.imageUrl} alt={option.product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 mb-1">{option.product.name}</div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700">{option.product.grammage}</span>
                                <span className="text-lg font-bold text-[#2F855A]">{(option.product.price / 100).toFixed(2)}€</span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <i className="ri-check-circle-fill text-2xl text-[#2F855A]"></i>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleResetToDefaults}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <i className="ri-refresh-line"></i>
                      <span>Reset</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseMoreOptions}
                      className="flex-1 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}

              {/* Product Search Tab */}
              {showProductSearch && (
                <>
                  <div className="mb-4 flex gap-2">
                    <div className="flex-1 relative">
                      <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <input
                        type="text"
                        placeholder="Search products (e.g., tomato, pasta)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchProducts(1)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm"
                      />
                    </div>
                    <button
                      onClick={() => handleSearchProducts(1)}
                      disabled={!searchQuery.trim() || isSearching}
                      className="px-4 py-2 bg-[#2F855A] text-white rounded-lg font-medium hover:bg-[#276749] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isSearching ? <i className="ri-loader-4-line animate-spin"></i> : 'Search'}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                      {searchResults.map((product) => {
                        const selected = selectedProducts[moreOptionsIngredient.ingredientId];
                        const productSelectionKey = Number((product as SearchProduct & { reweId?: number }).reweId ?? product.id);
                        const isSelected = typeof selected === 'object' && selected.reweId === productSelectionKey;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSelectSearchProduct(product);
                            }}
                            className={`w-full p-4 rounded-xl transition-all text-left border-2 ${
                              isSelected
                                ? 'border-[#2F855A] bg-emerald-50'
                                : 'border-gray-200 bg-white hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 mb-1">{product.name}</div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-700">{product.grammage}</span>
                                  <span className="text-lg font-bold text-[#2F855A]">{(product.price / 100).toFixed(2)}€</span>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex-shrink-0">
                                  <i className="ri-check-circle-fill text-2xl text-[#2F855A]"></i>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {searchTotalPages > 1 && (
                    <div className="flex gap-1 justify-center items-center mb-4">
                      {(() => {
                        const maxVisible = 5;
                        const pages: (number | string)[] = [];
                        
                        if (searchTotalPages <= maxVisible) {
                          for (let i = 1; i <= searchTotalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (searchCurrentPage > 3) pages.push('...');
                          
                          const start = Math.max(2, searchCurrentPage - 1);
                          const end = Math.min(searchTotalPages - 1, searchCurrentPage + 1);
                          for (let i = start; i <= end; i++) {
                            if (!pages.includes(i)) pages.push(i);
                          }
                          
                          if (searchCurrentPage < searchTotalPages - 2) pages.push('...');
                          pages.push(searchTotalPages);
                        }
                        
                        return pages.map((page, idx) => (
                          page === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">•••</span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => handleSearchProducts(page as number)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                searchCurrentPage === page
                                  ? 'bg-[#2F855A] text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        ));
                      })()}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleResetToDefaults}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <i className="ri-refresh-line"></i>
                      <span>Reset</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseMoreOptions}
                      className="flex-1 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
