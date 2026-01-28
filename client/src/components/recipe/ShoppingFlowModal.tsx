import { useEffect, useMemo, useState } from 'react';
import { productsApi, IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';
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

  // Reset showAllProducts and product quantities when ingredient changes
  useEffect(() => {
    setShowAllProducts(false);
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
  const displayedProducts = showAllProducts
    ? displayedOptions.map((opt) => opt.product)
    : displayedOptions.slice(0, INITIAL_PRODUCTS_SHOWN).map((opt) => opt.product);
  const hasMoreProducts = (currentIngredientGroup?.options?.length || 0) > INITIAL_PRODUCTS_SHOWN;

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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
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
                  <h3 className="text-xl font-bold text-gray-900">Select Product</h3>
                </div>
                <div className="flex items-center gap-3">
                  {!isEditing && (
                    <span className="text-sm text-gray-600">
                      {currentIngredientIndex + 1} of {workingRecipe.richIngredients.length}
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
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <h4 className="text-lg font-bold text-gray-900 mb-1">{currentIngredientGroup.ingredientName}</h4>
                <p className="text-sm text-gray-600">
                  Amount needed: <span className="font-semibold text-[#2F855A]">{currentIngredientGroup.totalAmountNeeded}</span>
                </p>
              </div>
            </div>

            <div className="p-6">
              {loadingProducts && (
                <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
                  <i className="ri-loader-4-line animate-spin" aria-hidden="true"></i>
                  <span>Loading product options...</span>
                </div>
              )}

              <button
                onClick={() => handleSelectProduct(currentIngredientGroup.ingredientId, 'already-have')}
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
                  <span className="text-xs text-gray-500">{currentIngredientGroup.options.length} options available</span>
                )}
              </div>

              <div className="space-y-3">
                {displayedProducts?.map((product) => {
                  const quantity = productQuantities[product.id] || 0;
                  return (
                  <div
                    key={product.id}
                    className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-[#2F855A] transition-all"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 mb-1">{product.name}</div>
                        <div className="text-sm text-gray-600 mb-2">REWE</div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">{product.grammage}</span>
                          <span className="text-lg font-bold text-[#2F855A]">{(product.price / 100).toFixed(2)}€</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-3">
                      <span className="text-sm font-medium text-gray-700">Quantity:</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleQuantityChange(product.id, -1)}
                          disabled={quantity === 0}
                          className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <i className="ri-subtract-line text-xl text-gray-700"></i>
                        </button>
                        <span className="text-xl font-bold text-gray-900 min-w-[3rem] text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-300 rounded-lg hover:border-[#2F855A] hover:bg-emerald-50 transition-all cursor-pointer"
                        >
                          <i className="ri-add-line text-xl text-gray-700"></i>
                        </button>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => handleSelectProduct(currentIngredientGroup.ingredientId, product)}
                      disabled={quantity === 0}
                      className="w-full py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-lg font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                    >
                      <i className="ri-shopping-cart-line text-xl"></i>
                      <span>{quantity === 0 ? 'Select Quantity' : `Add ${quantity} to Cart`}</span>
                    </button>
                  </div>
                  );
                })}
              </div>

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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleCancel}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Review Your Selections</h3>
                <button
                  onClick={handleCancel}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600">Review and edit your product selections before adding to cart</p>
            </div>

            <div className="p-6">
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

              <div className="space-y-3 mb-6">
                {workingRecipe.richIngredients?.map((ingredient) => {
                  const selected = selectedProducts[ingredient.ingredientId];
                  const isAlreadyHave = selected === 'already-have';
                  const product = !isAlreadyHave && selected ? selected : null;

                  return (
                    <div
                      key={ingredient.ingredientId}
                      className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 mb-1">{ingredient.ingredientName}</h5>
                          {!isAlreadyHave && product && (
                            <p className="text-sm text-gray-600">Amount added: {productQuantities[product.id] || 1}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditProduct(ingredient.ingredientId)}
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
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm mb-0.5">{product.name}</div>
                            <div className="text-xs text-gray-600 mb-1">REWE</div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">{product.grammage}</span>
                              <span className="text-lg font-bold text-[#2F855A]">
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

              <div className="bg-gradient-to-r from-[#2F855A] to-emerald-600 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm opacity-90 mb-1">Total Cost</p>
                    <p className="text-3xl font-bold">{(calculateReviewTotal() / 100).toFixed(2)}€</p>
                  </div>
                  <div className="w-16 h-16 flex items-center justify-center bg-white/20 rounded-full">
                    <i className="ri-shopping-cart-line text-3xl"></i>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-white/80">
                    {workingRecipe.richIngredients?.filter((ing) => selectedProducts[ing.ingredientId] === 'already-have').length} items you already have
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <i className="ri-check-line text-xl"></i>
                  <span>Add to Shopping List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
