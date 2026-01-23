import { useState, useEffect } from 'react';
import { recipesApi, RecipeRecommendation } from '@/api/recipe-swiper/recipesApi';
import { productsApi, ShoppingListResponse, IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';
import {CartItem, shoppingListApi} from "@/api/shopping-list/shoppingCartApi";


// We extend the API response to include UI-specific fields if needed
interface UIRecipe extends RecipeRecommendation {
  // We will swap the string[] from personalization with the rich IngredientGroup[] from Java
  // when the user clicks "Like"
  richIngredients: IngredientGroup[] | null; 
}

export default function RecipeSwiper() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<UIRecipe | null>(null);
  const [currentIngredientIndex, setCurrentIngredientIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, Product | 'already-have'>>({});
  const [likedRecipes, setLikedRecipes] = useState<UIRecipe[]>([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [recipes, setRecipes] = useState<UIRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false);
  // New states for quantity selection and shopping cart
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});

  // FETCH RECIPES FROM BACKEND
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const data = await recipesApi.getRecommendations();
        console.log("data: ",data);
        const uiRecipes = data.map(r => ({ ...r, richIngredients: null }));
        setRecipes(uiRecipes);
        if (uiRecipes.length > 0) setCurrentRecipe(uiRecipes[0]);
      } catch (error) {
        console.error("Failed to fetch recipes", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const handleQuantityChange = (productId: number, change: number) => {
    setProductQuantities(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + change);
      return {
        ...prev,
        [productId]: newQty,
      };
    });
  };
  
  const handleLike = async() => {
    const recipe = recipes[currentIndex];
    setCurrentRecipe(recipe);
    setShowIngredientModal(true);
    setCurrentIngredientIndex(0);
    setSelectedProducts({});
    setProductQuantities({});
    // If we haven't fetched products for this recipe yet, do it now (Lazy Load)
    if (!recipe.richIngredients) {
      setLoadingProducts(true);
      try {
        // Fetch products for just this one recipe
        const listResponse: ShoppingListResponse = await productsApi.generateShoppingList(440752, [recipe.id]); // Market ID hardcoded for now
        
        // Update the specific recipe in our state with the new data
        setRecipes(prevRecipes => prevRecipes.map(r => {
          if (r.id === recipe.id) {
             const updated = { ...r, richIngredients: listResponse.items };
             setCurrentRecipe(updated); // Update current view immediately
             return updated;
          }
          return r;
        }));
      } catch (err) {
        console.error("Error loading products", err);
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  const handleDislike = () => {
    const nextIndex = (currentIndex + 1) % recipes.length;
    setCurrentIndex(nextIndex);
    setCurrentRecipe(recipes[nextIndex]);
  };

  const showSuccessNotification = (recipeName: string) => {
    setSuccessMessage(`${recipeName} added to your shopping list! 🎉`);
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

    // if (currentRecipe && currentIngredientIndex < currentRecipe.ingredients.length - 1) {
    if(!isEditing && currentRecipe?.richIngredients && currentIngredientIndex < currentRecipe.richIngredients.length -1){
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
    const ingredientIndex = currentRecipe?.richIngredients.findIndex(ing => ing.ingredientId === ingredientId);
    if (ingredientIndex !== undefined && ingredientIndex !== -1) {
      setIsEditing(true);
      setCurrentIngredientIndex(ingredientIndex);
      setShowReviewModal(false);
      setShowIngredientModal(true);
    }
  };

  const handleConfirmRecipe = async () => {
    if (currentRecipe) {
      setLikedRecipes([...likedRecipes, currentRecipe]);

      const shoppingListElems = Object.entries(selectedProducts)
          .filter(selectedProduct => selectedProduct[1] !== 'already-have')
          .map((selectedProduct) => {
          const cartItems: CartItem = {
            product_id: (selectedProduct[1] as Product).id,
            quantity: productQuantities[(selectedProduct[1] as Product).id] || 1,
            recipe_id: currentRecipe.id,
        }
        return cartItems
      })

      await shoppingListApi.addItemsToShoppingList(shoppingListElems);

      // Show success notification
      showSuccessNotification(currentRecipe.title);

      // Close modal and continue
      setShowReviewModal(false);
      setCurrentRecipe(null);
      setIsEditing(false);

      // Move to next recipe
      let nextIndex = 0;
      if (currentIndex < recipes.length - 1) {
        nextIndex = currentIndex + 1;
      } else {
        nextIndex = 0; // Loop back to the start
      }
      
      setCurrentIndex(nextIndex);
      setCurrentRecipe(recipes[nextIndex]);
    }
  };

  const handleRecipeImageClick = () => {
    setShowRecipeDetailModal(true);
  };

  const calculateReviewTotal = () => {
    if (!currentRecipe || !currentRecipe.richIngredients) return 0;
    const totalInCents = currentRecipe.richIngredients.reduce((total, ingredient) => {
      // Use ingredientId to lookup selection
      const selected = selectedProducts[ingredient.ingredientId];
      
      if (selected && selected !== 'already-have') {
        return total + selected.price * productQuantities[selected.id]; // Adds cents (e.g., 299)
      }
      return total;
    }, 0);

    return totalInCents;
  };

  const currentRecipeData = recipes[currentIndex];
  const currentIngredientGroup = currentRecipe?.richIngredients?.[currentIngredientIndex];
  const INITIAL_PRODUCTS_SHOWN = 3;
  const allOptions = currentIngredientGroup?.options || [];
  const displayedOptions = showAllProducts
      ? allOptions
      : allOptions.slice(0, INITIAL_PRODUCTS_SHOWN);
  const displayedProducts = displayedOptions.map(opt => opt.product);
  const hasMoreProducts = allOptions.length > INITIAL_PRODUCTS_SHOWN;
  
  // Helper to get products for the current view
  // We default to an empty list if data is loading or missing
  const currentProducts = currentIngredientGroup?.options.map(opt => opt.product) || [];

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative w-48 h-48 mx-auto mb-8">
            {/* Rotating Food Icons */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-lg">
                <i className="ri-restaurant-line text-2xl text-[#2F855A]"></i>
              </div>
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3.5s', animationDirection: 'reverse' }}>
              <div className="absolute top-1/2 right-0 translate-y-[-50%] w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-lg">
                <i className="ri-cake-3-line text-2xl text-amber-600"></i>
              </div>
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-lg">
                <i className="ri-goblet-line text-2xl text-teal-600"></i>
              </div>
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3.5s', animationDirection: 'reverse' }}>
              <div className="absolute top-1/2 left-0 translate-y-[-50%] w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-lg">
                <i className="ri-cup-line text-2xl text-orange-600"></i>
              </div>
            </div>
            
            {/* Center Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-[#2F855A] to-emerald-600 rounded-full shadow-xl">
                <i className="ri-restaurant-2-line text-3xl text-white"></i>
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Loading Tasty Recipes...</h2>
          <p className="text-sm text-gray-600 mb-6">Preparing delicious meals just for you</p>
          
          {/* Progress Bar */}
          <div className="max-w-xs mx-auto">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#2F855A] to-emerald-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No Recipes State
  if (!currentRecipeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-32 h-32 flex items-center justify-center mx-auto mb-6 bg-white rounded-full shadow-xl">
            <i className="ri-emotion-sad-line text-6xl text-gray-400"></i>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-3">No Recipes Found!</h2>
          <p className="text-sm text-gray-600 mb-8">We couldn't find any recipes at the moment. This might be a temporary issue.</p>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <i className="ri-refresh-line text-xl"></i>
              <span>Try Again</span>
            </button>
            
            <button
              onClick={() => window.REACT_APP_NAVIGATE('/home')}
              className="w-full py-4 bg-white text-[#2F855A] rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-md cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 border-2 border-[#2F855A]"
            >
              <i className="ri-home-line text-xl"></i>
              <span>Back to Home</span>
            </button>
          </div>
          
          <div className="mt-8 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-amber-100 rounded-full flex-shrink-0">
                <i className="ri-lightbulb-line text-xl text-amber-600"></i>
              </div>
              <div className="text-left flex-1">
                <h4 className="font-semibold text-gray-900 mb-1 text-sm">Need Help?</h4>
                <p className="text-xs text-gray-600">Contact support if this problem persists or check your internet connection.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <img
                src="https://public.readdy.ai/ai/img_res/b0724f47-0896-45dd-92da-e15712b65265.png"
                alt="Recipe Recommender Logo"
                className="h-14 w-auto mx-auto mb-4"
            />
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Find Your Recipes</h2>
                <p className="text-sm text-gray-600">Swipe to discover meals you'll love</p>
              </div>
            </div>
          </div>

          {/* Recipe Card */}
          {currentRecipeData && (
              <div className="relative">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                  {/* Recipe Image */}
                  <div
                      className="relative w-full h-96 cursor-pointer group"
                      onClick={handleRecipeImageClick}
                  >
                    <img
                        src={currentRecipeData.image}
                        alt={currentRecipeData.title}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                        <i className="ri-information-line text-3xl text-[#2F855A]"></i>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="text-sm font-medium text-gray-900">
                    {currentIndex + 1}/{recipes.length}
                  </span>
                    </div>
                  </div>

                  {/* Recipe Info */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{currentRecipeData.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{currentRecipeData.description}</p>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <i className="ri-fire-line text-xl text-[#2F855A] mb-1"></i>
                        <div className="text-sm font-semibold text-gray-900">{currentRecipeData.nutrients.calories}</div>
                        <div className="text-xs text-gray-600">Calories</div>
                      </div>
                      <div className="bg-teal-50 rounded-lg p-3 text-center">
                        <i className="ri-time-line text-xl text-teal-600 mb-1"></i>
                        <div className="text-sm font-semibold text-gray-900">{currentRecipeData.total_time}m</div>
                        <div className="text-xs text-gray-600">Time</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <i className="ri-restaurant-line text-xl text-green-600 mb-1"></i>
                        <div className="text-sm font-semibold text-gray-900">{currentRecipeData.yields}</div>
                        <div className="text-xs text-gray-600">Servings</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <i className="ri-star-line text-xl text-amber-600 mb-1"></i>
                        {/* <div className="text-sm font-semibold text-gray-900">{currentRecipeData.difficulty}</div> */}
                        <div className="text-sm font-semibold text-gray-900">{"Medium"}</div>
                        <div className="text-xs text-gray-600">Level</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button
                          onClick={handleDislike}
                          className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-close-line text-2xl"></i>
                        <span>Skip</span>
                      </button>
                      <button
                          onClick={handleLike}
                          className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-heart-line text-2xl"></i>
                        <span>Like</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* View Shopping List Button */}
          {likedRecipes.length > 0 && (
              <div className="mt-6">
                <button
                    onClick={() => window.REACT_APP_NAVIGATE('/shopping-list')}
                    className="w-full py-4 bg-white text-[#2F855A] rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap border-2 border-[#2F855A]"
                >
                  <i className="ri-shopping-cart-line text-xl"></i>
                  <span>View Shopping List ({likedRecipes.length} {likedRecipes.length === 1 ? 'Recipe' : 'Recipes'})</span>
                </button>
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
                  <p className="text-xs text-gray-600 mt-0.5">Continue swiping or view your list</p>
                </div>
              </div>
            </div>
        )}

        {/* Ingredient Selection Modal */}
        {showIngredientModal && currentRecipe && currentIngredientGroup && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">Select Product</h3>
                    <span className="text-sm text-gray-600">
                  {currentIngredientIndex + 1} of {currentRecipe.richIngredients.length}
                </span>
                    <button
                        onClick={() => {
                          setShowIngredientModal(false);
                          setCurrentRecipe(null);
                          setSelectedProducts({});
                          setProductQuantities({});
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <i className="ri-close-line text-xl text-gray-600"></i>
                    </button>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                        className="bg-gradient-to-r from-[#2F855A] to-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${((currentIngredientIndex + 1) / currentRecipe.richIngredients.length) * 100}%` }}
                    ></div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                    <h4 className="text-lg font-bold text-gray-900 mb-1">{currentIngredientGroup.ingredientName}</h4>
                    <p className="text-sm text-gray-600">Amount needed: <span className="font-semibold text-[#2F855A]">{currentIngredientGroup.totalAmountNeeded}</span></p>
                  </div>
                </div>

                <div className="p-6">
                  {/* Already Have Button */}
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
                        <span className="text-xs text-gray-500">
                    {currentIngredientGroup.options.length} options available
                  </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {displayedProducts?.map(product => {
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
                                  {/* <span className="text-sm font-medium text-gray-700">{product.weight}{product.unit}</span> */}
                                  <span className="text-sm font-medium text-gray-700">{product.grammage}</span>
                                  {/* <span className="text-lg font-bold text-[#2F855A]">${product.price.toFixed(2)}</span> */}
                                  {/* <span className="text-lg font-bold text-[#2F855A]">{(calculateReviewTotal() / 100).toFixed(2)}€</span> */}
                                  <span className="text-lg font-bold text-[#2F855A]">{(product.price / 100).toFixed(2)}€</span>
                                </div>
                              </div>
                            </div>

                            {/* Quantity Selector */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
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
                                className="w-full mt-3 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-lg font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
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
                    <h4 className="text-lg font-bold text-gray-900 mb-1">{currentRecipe.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <i className="ri-restaurant-line"></i>
                    {currentRecipe.yields} servings
                  </span>
                      <span className="flex items-center gap-1">
                    <i className="ri-time-line"></i>
                        {currentRecipe.total_time}m
                  </span>
                      <span className="flex items-center gap-1">
                    <i className="ri-fire-line"></i>
                        {currentRecipe.nutrients.calories} cal
                  </span>
                    </div>
                  </div>

                  {/* Selected Products List */}
                  <div className="space-y-3 mb-6">
                    {currentRecipe.richIngredients.map((ingredient) => {
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
                                {!isAlreadyHave && <p className="text-sm text-gray-600">Amount added: {productQuantities[product.id]}</p>}
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
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 text-sm mb-0.5">{product.name}</div>
                                    {/* <div className="text-xs text-gray-600 mb-1">{product.brand}</div> */}
                                    <div className="text-xs text-gray-600 mb-1">REWE</div>
                                    <div className="flex items-center gap-2">
                                    {/* <span className="text-sm font-medium text-gray-700">{product.weight}{product.unit}</span> */}
                                    {/*<span className="text-sm font-medium text-gray-700">{product.grammage}</span>*/}
                                    {/* <span className="text-lg font-bold text-[#2F855A]">${product.price.toFixed(2)}</span> */}
                                    <span className="text-lg font-bold text-[#2F855A]">{((product.price * productQuantities[product.id]) / 100).toFixed(2)}€</span>
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
                        <p className="text-3xl font-bold">{(calculateReviewTotal()/100).toFixed(2)}€</p>
                      </div>
                      <div className="w-16 h-16 flex items-center justify-center bg-white/20 rounded-full">
                        <i className="ri-shopping-cart-line text-3xl"></i>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <p className="text-xs text-white/80">
                        {currentRecipe.richIngredients.filter(ing => selectedProducts[ing.ingredientId] === 'already-have').length} items you already have
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
                      <span>Add to Shopping List</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* -------- Recipe Detail Modal -------- */}
        {showRecipeDetailModal && currentRecipeData && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header with Image */}
                <div className="relative w-full h-64">
                  <img
                      src={currentRecipeData.image}
                      alt={currentRecipeData.title}
                      className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <button
                      onClick={() => setShowRecipeDetailModal(false)}
                      className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors cursor-pointer"
                  >
                    <i className="ri-close-line text-2xl text-gray-900"></i>
                  </button>
                  <div className="absolute bottom-4 left-6 right-6">
                    <h2 className="text-3xl font-bold text-white mb-3">{currentRecipeData.title}</h2>
                    <div className="flex flex-wrap gap-2">
                      {currentRecipeData.keywords?.map((tag, index) => (
                          <span
                              key={index}
                              className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full"
                          >
                      {tag}
                    </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-emerald-50 rounded-xl p-4 text-center">
                      <i className="ri-time-line text-2xl text-[#2F855A] mb-2"></i>
                      <div className="text-sm text-gray-600">Prep Time</div>
                      <div className="text-lg font-bold text-gray-900">
                        {currentRecipeData.prep_time || 10}m
                      </div>
                    </div>
                    <div className="bg-teal-50 rounded-xl p-4 text-center">
                      <i className="ri-fire-line text-2xl text-teal-600 mb-2"></i>
                      <div className="text-sm text-gray-600">Cook Time</div>
                      <div className="text-lg font-bold text-gray-900">
                        {currentRecipeData.cook_time ||
                            currentRecipeData.total_time - (currentRecipeData.prep_time || 10)}m
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <i className="ri-restaurant-line text-2xl text-green-600 mb-2"></i>
                      <div className="text-sm text-gray-600">Servings</div>
                      <div className="text-lg font-bold text-gray-900">{currentRecipeData.nutrients.servingSize}</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <i className="ri-flashlight-line text-2xl text-amber-600 mb-2"></i>
                      <div className="text-sm text-gray-600">Calories</div>
                      <div className="text-lg font-bold text-gray-900">{currentRecipeData.nutrients.servingSize}</div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">About This Recipe</h3>
                    <p className="text-base text-gray-700 leading-relaxed">{currentRecipeData.description}</p>
                  </div>

                  {/* Ingredients */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <i className="ri-shopping-basket-line text-[#2F855A]"></i>
                      Ingredients
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentRecipeData.ingredients.map(ingredient => (
                            <div
                                key={ingredient}
                                className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200"
                            >
                              <div className="w-2 h-2 bg-[#2F855A] rounded-full flex-shrink-0"></div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 text-sm">{ingredient}</div>
                                <div className="text-xs text-gray-600">{ingredient}</div>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <i className="ri-list-ordered text-[#2F855A]"></i>
                      Instructions
                    </h3>
                    <div className="space-y-4">
                      {currentRecipeData.instructions?.split("\n").map((instruction, index) => (
                          <div key={index} className="flex gap-4">
                            <div className="w-8 h-8 flex items-center justify-center bg-[#2F855A] text-white rounded-full font-bold text-sm flex-shrink-0">
                              {index + 1}
                            </div>
                            <p className="flex-1 text-base text-gray-700 leading-relaxed pt-1">{instruction}</p>
                          </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                        onClick={() => setShowRecipeDetailModal(false)}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap"
                    >
                      Close
                    </button>
                    <button
                        onClick={async () => {
                          setShowRecipeDetailModal(false);
                          await handleLike();
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      <i className="ri-heart-line text-xl"></i>
                      <span>Add to Shopping List</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
