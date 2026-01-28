import { useState, useEffect } from 'react';
import { recipesApi, RecipeRecommendation } from '@/api/recipe-swiper/recipesApi';
import { productsApi, ShoppingListResponse, IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';
import {CartItem, shoppingListApi} from "@/api/shopping-list/shoppingCartApi";
import { userHistoryApi } from '@/api/user-history/userHistoryApi';
import { userApi } from '@/api/search-product/userApi';
import ShoppingFlowModal from '@/components/recipe/ShoppingFlowModal';
import RecipeDetailModal from '@/components/recipe/RecipeDetailModal';
import { UIRecipe, SelectedProducts } from '@/types/recipe';

export default function RecipeSwiper() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentRecipe, setCurrentRecipe] = useState<UIRecipe | null>(null);
  const [likedRecipes, setLikedRecipes] = useState<UIRecipe[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [recipes, setRecipes] = useState<UIRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false);
  const [marketId, setMarketId] = useState<number | null>(null);
  const [shoppingFlowOpen, setShoppingFlowOpen] = useState(false);
  const [shoppingFlowRecipe, setShoppingFlowRecipe] = useState<UIRecipe | null>(null);

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
        if (error?.response?.status == 401) {
          window.REACT_APP_NAVIGATE('/auth');
        }
        console.error("Failed to fetch recipes", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserMarket = async () => {
      try {
        const marketId = await userApi.getUserMarketId();
        setMarketId(marketId);
      } catch (error) {
        if (error?.response?.status == 404) {
          window.REACT_APP_NAVIGATE('/questionnaire');
        }
        console.error("Failed to fetch user market ID", error);
      }
    };

    fetchRecommendations();
    fetchUserMarket();
  }, []);

  const advanceToNextRecipe = () => {
    if (!recipes.length) return;
    const nextIndex = (currentIndex + 1) % recipes.length;
    setCurrentIndex(nextIndex);
    setCurrentRecipe(recipes[nextIndex]);
  };
  
  const handleLike = async() => {
    const recipe = recipes[currentIndex];
    
    // Record like action in user history
    try {
      await userHistoryApi.recordAction('like', recipe.id);
    } catch (err) {
      console.error("Failed to record like action", err);
    }

    setShoppingFlowRecipe(recipe);
    setShoppingFlowOpen(true);
  };

  const handleLikeOnly = async () => {
    const recipe = recipes[currentIndex];
    if (!recipe) return;

    try {
      await userHistoryApi.recordAction('like', recipe.id);
    } catch (err) {
      console.error("Failed to record like action", err);
    }

    advanceToNextRecipe();
  };

  const handleDislike = async () => {
    const recipe = recipes[currentIndex];
    if (!recipe) return;
    
    try {
      await userHistoryApi.recordAction('dislike', recipe.id);
    } catch (err) {
      console.error("Failed to record dislike action", err);
    }
    
    advanceToNextRecipe();
  };

  const showSuccessNotification = (recipeName: string) => {
    setSuccessMessage(`${recipeName} added to your shopping list! 🎉`);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  };

  const handleRecipeUpdate = (recipe: UIRecipe) => {
    setRecipes(prevRecipes => prevRecipes.map(r => r.id === recipe.id ? recipe : r));
  };

  const handleShoppingFlowComplete = async (recipe: UIRecipe, selectedProducts: SelectedProducts, productQuantities: Record<number, number>) => {
    setLikedRecipes([...likedRecipes, recipe]);

    const shoppingListElems = Object.entries(selectedProducts)
      .filter(selectedProduct => selectedProduct[1] !== 'already-have')
      .map((selectedProduct) => {
        const cartItem: CartItem = {
          product_id: (selectedProduct[1] as Product).id,
          quantity: productQuantities[(selectedProduct[1] as Product).id] || 1,
          recipe_id: recipe.id,
        };
        return cartItem;
      });

    await shoppingListApi.addItemsToShoppingList(shoppingListElems);
    showSuccessNotification(recipe.title);
    advanceToNextRecipe();
  };

  const handleRecipeImageClick = () => {
    setShowRecipeDetailModal(true);
  };

  const currentRecipeData = recipes[currentIndex];

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
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleDislike}
                        className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-close-line text-2xl"></i>
                        <span>Skip</span>
                      </button>
                      <button
                        onClick={handleLikeOnly}
                        className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-heart-line text-2xl"></i>
                        <span>Like</span>
                      </button>
                      <button
                        onClick={handleLike}
                        className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-shopping-cart-2-line text-2xl"></i>
                        <span>Add to Shopping List</span>
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

        <ShoppingFlowModal
          recipe={shoppingFlowRecipe}
          open={shoppingFlowOpen}
          marketId={marketId || undefined}
          onClose={() => setShoppingFlowOpen(false)}
          onComplete={handleShoppingFlowComplete}
          onRecipeUpdate={handleRecipeUpdate}
        />

        <RecipeDetailModal
          recipe={currentRecipeData}
          open={showRecipeDetailModal}
          onClose={() => setShowRecipeDetailModal(false)}
          onAddToShoppingList={async () => {
            setShowRecipeDetailModal(false);
            await handleLike();
          }}
        />
      </div>
  );
}