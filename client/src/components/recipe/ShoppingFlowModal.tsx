import { useEffect, useState } from 'react';
import { productsApi, IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';
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
  const [selectedProducts, setSelectedProducts] = useState<Record<number, number[]>>({}); // ingredientId -> productIds
  const [showPreview, setShowPreview] = useState(false);
  const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
  const [moreOptionsIngredientId, setMoreOptionsIngredientId] = useState<number | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [allowMultipleOptions, setAllowMultipleOptions] = useState(false);
  const [showProductError, setShowProductError] = useState(false);


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
    setAllowMultipleOptions(false);
    setShowProductError(false);
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

        // Initialize all ingredients as selected with defaults if we have no prior selections
        if (listResponse.items && !isSameRecipe) {
          setSelectedIngredients(new Set(listResponse.items.map(ing => ing.ingredientId)));
          const defaultProducts: Record<number, number[]> = {};
          const defaultQuantities: Record<number, number> = {};
          listResponse.items.forEach(ing => {
            if (ing.options.length > 0) {
              defaultProducts[ing.ingredientId] = [ing.options[0].product.id];
              defaultQuantities[ing.options[0].product.id] = 1;
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
      const updated = { ...prev } as Record<number, number[]>;
      workingRecipe.richIngredients!.forEach((ing) => {
        if (updated[ing.ingredientId] === undefined && ing.options.length > 0) {
          updated[ing.ingredientId] = [ing.options[0].product.id];
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
      const updated = { ...prev } as Record<number, number[]>;
      workingRecipe.richIngredients.forEach((ing) => {
        if (selectedIngredients.has(ing.ingredientId) && updated[ing.ingredientId] === undefined && ing.options.length > 0) {
          updated[ing.ingredientId] = [ing.options[0].product.id];
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
    setSelectedProducts(prev => {
      const current = prev[ingredientId] || [];
      if (allowMultipleOptions) {
        const exists = current.includes(productId);
        const nextList = exists ? current.filter(id => id !== productId) : [...current, productId];
        return {
          ...prev,
          [ingredientId]: nextList,
        };
      }
      return {
        ...prev,
        [ingredientId]: [productId],
      };
    });

    setProductQuantities(prev => {
      if (prev[productId] !== undefined) return prev;
      return { ...prev, [productId]: 1 };
    });
  };

  const handleRemoveProduct = (ingredientId: number, productId: number) => {
    setSelectedProducts(prev => {
      const current = prev[ingredientId] || [];
      const nextList = current.filter(id => id !== productId);
      return { ...prev, [ingredientId]: nextList };
    });
    setProductQuantities(prev => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleCloseMoreOptions = () => {
    setShowMoreOptionsModal(false);
    setMoreOptionsIngredientId(null);
    setAllowMultipleOptions(false);
  };

  const handleOpenMoreOptions = (ingredientId: number) => {
    const preselected = selectedProducts[ingredientId] || [];
    setMoreOptionsIngredientId(ingredientId);
    setShowMoreOptionsModal(true);
    setShowAllProducts(false);
    setAllowMultipleOptions(preselected.length > 1);
    setShowProductError(false);
  };

  const handleConfirm = () => {
    if (!workingRecipe) return;

    // Check if any products are selected
    const hasProducts = Array.from(selectedIngredients).some(ingId => (selectedProducts[ingId]?.length || 0) > 0);
    
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
      
      const productIds = selectedProducts[ingredientId] || [];
      if (productIds.length === 0) return;

      const products = ingredient.options
        .filter(opt => productIds.includes(opt.product.id))
        .map(opt => opt.product);

      if (products.length === 1) {
        selected[ingredientId] = products[0];
        finalQuantities[products[0].id] = productQuantities[products[0].id] || 1;
      } else if (products.length > 1) {
        selected[ingredientId] = products;
        products.forEach(prod => {
          finalQuantities[prod.id] = productQuantities[prod.id] || 1;
        });
      }
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
                {workingRecipe.richIngredients.map((ingredient) => (
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
                      <p className="font-semibold text-gray-900">{ingredient.ingredientName}</p>
                      <p className="text-xs text-gray-600">Amount needed: {ingredient.totalAmountNeeded}</p>
                    </div>
                  </label>
                ))}
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
              <p className="text-sm text-gray-600">Review and adjust your product selections</p>
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
                    {workingRecipe.nutrients.calories} cal
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {workingRecipe.richIngredients
                  .filter(ing => selectedIngredients.has(ing.ingredientId))
                  .map((ingredient) => {
                    const selectedProductIds = selectedProducts[ingredient.ingredientId] || [];
                    const selectedProductsList = ingredient.options
                      .filter(opt => selectedProductIds.includes(opt.product.id))
                      .map(opt => opt.product);
                    const hasOptions = ingredient.options.length > 0;

                    return (
                      <div
                        key={ingredient.ingredientId}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="font-semibold text-gray-900">{ingredient.ingredientName}</h5>
                          <button
                            onClick={() => handleDeleteIngredient(ingredient.ingredientId)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                          >
                            <i className="ri-delete-bin-line"></i>
                            Remove ingredient
                          </button>
                        </div>

                        {!hasOptions ? (
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <i className="ri-alert-line text-xl text-gray-400"></i>
                            <span className="text-sm text-gray-600">No matching products found</span>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-3">
                              {selectedProductsList.length === 0 && (
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                                  <i className="ri-alert-line text-lg"></i>
                                  <span>No product selected for this ingredient.</span>
                                </div>
                              )}

                              {selectedProductsList.length > 0 && (
                                <div className="space-y-3">
                                  {selectedProductsList.map(prod => {
                                    const quantity = productQuantities[prod.id] || 1;
                                    return (
                                      <div key={prod.id} className="border border-emerald-200 bg-emerald-50 rounded-xl p-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-3">
                                            <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="font-semibold text-gray-900 text-sm mb-0.5">{prod.name}</div>
                                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <span>{prod.grammage}</span>
                                                <span className="font-bold text-[#2F855A]">{(prod.price / 100).toFixed(2)}€</span>
                                              </div>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleRemoveProduct(ingredient.ingredientId, prod.id)}
                                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                                          >
                                            Remove
                                          </button>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                          <span className="text-sm font-medium text-gray-700">Quantity</span>
                                          <div className="flex items-center gap-3">
                                            <button
                                              onClick={() => handleQuantityChange(prod.id, -1)}
                                              disabled={quantity <= 1}
                                              className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              <i className="ri-subtract-line text-xl text-gray-700"></i>
                                            </button>
                                            <span className="text-xl font-bold text-gray-900 min-w-[3rem] text-center">{quantity}</span>
                                            <button
                                              onClick={() => handleQuantityChange(prod.id, 1)}
                                              className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer"
                                            >
                                              <i className="ri-add-line text-xl text-gray-700"></i>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
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
                            const selectedIds = selectedProducts[ingredient.ingredientId] || [];
                            const products = ingredient.options
                              .filter(opt => selectedIds.includes(opt.product.id))
                              .map(opt => opt.product);
                            return total + products.reduce((sub, prod) => {
                              const quantity = productQuantities[prod.id] || 1;
                              return sub + prod.price * quantity;
                            }, 0);
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
                <div className="px-4 py-3 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2 text-red-700">
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
                <h4 className="text-lg font-bold text-gray-900 mb-1">{moreOptionsIngredient.ingredientName}</h4>
                <p className="text-sm text-gray-600">
                  {moreOptionsIngredient.options.length} options available
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 text-sm text-gray-700">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowMultipleOptions}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAllowMultipleOptions(checked);
                      if (!checked && moreOptionsIngredient) {
                        const current = selectedProducts[moreOptionsIngredient.ingredientId] || [];
                        if (current.length > 1) {
                          setSelectedProducts(prev => ({
                            ...prev,
                            [moreOptionsIngredient.ingredientId]: [current[0]],
                          }));
                        }
                      }
                    }}
                    className="w-4 h-4 accent-[#2F855A] cursor-pointer"
                  />
                  <span className="font-medium">Select multiple options</span>
                </label>
              </div>

              <div className="space-y-3">
                {moreOptionsIngredient.options.map((option) => {
                  const selectedIds = selectedProducts[moreOptionsIngredient.ingredientId] || [];
                  const isSelected = selectedIds.includes(option.product.id);
                  return (
                    <button
                      key={option.product.id}
                      onClick={() => handleSelectProduct(moreOptionsIngredient.ingredientId, option.product.id)}
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

              <button
                onClick={handleCloseMoreOptions}
                disabled={(selectedProducts[moreOptionsIngredient.ingredientId]?.length || 0) === 0}
                className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
