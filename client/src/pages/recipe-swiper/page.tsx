import { useState, useEffect, useRef } from 'react';
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
  const [shoppingListRecipes, setShoppingListRecipes] = useState<UIRecipe[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [recipes, setRecipes] = useState<UIRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false);
  const [marketId, setMarketId] = useState<number | null>(null);
  const [shoppingFlowOpen, setShoppingFlowOpen] = useState(false);
  const [shoppingFlowRecipe, setShoppingFlowRecipe] = useState<UIRecipe | null>(null);
  const [recipeStatus, setRecipeStatus] = useState<Record<string, 'liked' | 'disliked' | null>>({});
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [swipeX, setSwipeX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [recipesInShoppingList, setRecipesInShoppingList] = useState<Set<number>>(new Set());
  const [touchStart, setTouchStart] = useState(0);
  const [cardRef, setCardRef] = useState<HTMLDivElement | null>(null);
  const disableSwipeRef = useRef(false);
  const mouseDownRef = useRef(false);
  const swipingRef = useRef(false);

  // FETCH RECIPES FROM BACKEND
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Fetch recipes and user history in parallel
        const [recipesData, history] = await Promise.all([
          recipesApi.getRecommendations(),
          userHistoryApi.getUserHistory(),
        ]);

        console.log("data: ", recipesData);
        
        // Build status map from user history (use nested recipe.id from API)
        const statusMap: Record<string, 'liked' | 'disliked' | null> = {};
        history.forEach(record => {
          const rid = record?.recipe?.id ?? record?.recipe_id;
          if (rid !== undefined && rid !== null) {
            statusMap[rid] = record.action ? 'liked' : 'disliked';
          }
        });
        
        // Set recipes and status map
        const uiRecipes = recipesData.map(r => ({ ...r, richIngredients: null }));
        setRecipes(uiRecipes);
        setRecipeStatus(statusMap);
        
        if (uiRecipes.length > 0) setCurrentRecipe(uiRecipes[0]);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserMarket = async () => {
      try {
        const marketId = await userApi.getUserMarketId();
        setMarketId(marketId);
      } catch (error) {
        console.error("Failed to fetch user market ID", error);
      }
    };

    const fetchActiveShoppingList = async () => {
      try {
        const active = await shoppingListApi.getActiveShoppingList();
        if (active?.groups) {
          // Extract recipe IDs from all items in the shopping list
          const recipeIds = new Set<number>();
          active.groups.forEach(group => {
            group.items.forEach(item => {
              if (item.recipeId) {
                const id = parseInt(item.recipeId, 10);
                if (!isNaN(id)) {
                  recipeIds.add(id);
                }
              }
            });
          });
          setRecipesInShoppingList(recipeIds);
        }
      } catch (error) {
        console.error("Failed to fetch active shopping list", error);
      }
    };

    initializeData();
    fetchUserMarket();
    fetchActiveShoppingList();
  }, []);

  // Attach touch listeners with passive: false to allow preventDefault
  useEffect(() => {
    const cardElement = document.querySelector('[data-swipe-card]') as HTMLElement;
    if (!cardElement) return;

    const handleTouchMoveNonPassive = (e: TouchEvent) => {
      if (disableSwipeRef.current) return;
      // Only preventDefault if the event is cancelable
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
      const currentX = (e.touches[0] as Touch).clientX;
      const diff = currentX - touchStart;
      setSwipeX(diff);
    };

    const handleTouchEndNonPassive = async (e: TouchEvent) => {
      e.stopPropagation();
      
      if (disableSwipeRef.current) {
        disableSwipeRef.current = false;
        setSwipeX(0);
        return;
      }
      
      await finalizeSwipe();
    };

    cardElement.addEventListener('touchmove', handleTouchMoveNonPassive, { passive: false });
    cardElement.addEventListener('touchend', handleTouchEndNonPassive, { passive: false });

    return () => {
      cardElement.removeEventListener('touchmove', handleTouchMoveNonPassive);
      cardElement.removeEventListener('touchend', handleTouchEndNonPassive);
    };
  }, [swipeX, touchStart]);

  const advanceToNextRecipe = () => {
    if (!recipes.length) return;
    if (currentIndex === recipes.length - 1) {
      setShowEndScreen(true);
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setCurrentRecipe(recipes[nextIndex]);
  };

  const goToPreviousRecipe = () => {
    if (!recipes.length) return;
    if (showEndScreen) {
      setShowEndScreen(false);
      setCurrentIndex(recipes.length - 1);
      setCurrentRecipe(recipes[recipes.length - 1]);
      return;
    }
    const prevIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(prevIndex);
    setCurrentRecipe(recipes[prevIndex]);
  };

  const goToFirstRecipe = () => {
    setShowEndScreen(false);
    setCurrentIndex(0);
    setCurrentRecipe(recipes[0]);
  };
  
  const handleLike = async() => {
    const recipe = recipes[currentIndex];
    const currentStatus = recipeStatus[recipe.id];
    
    // If already liked, toggle to null (unlike)
    if (currentStatus === 'liked') {
      try {
        await userHistoryApi.removeAction(recipe.id);
      } catch (err) {
        console.error("Failed to remove like action", err);
      }
      setRecipeStatus(prev => ({ ...prev, [recipe.id]: null }));
      setLikedRecipes(likedRecipes.filter(r => r.id !== recipe.id));
      return;
    }
    
    // Record like action in user history
    try {
      await userHistoryApi.recordAction('like', recipe.id);
    } catch (err) {
      console.error("Failed to record like action", err);
    }

    setRecipeStatus(prev => ({ ...prev, [recipe.id]: 'liked' }));
    setLikedRecipes([...likedRecipes, recipe]);
  };

  const handleSwipeLike = async() => {
    const recipe = recipes[currentIndex];
    const currentStatus = recipeStatus[recipe.id];
    
    // If already liked, toggle to null (unlike) and stay on same recipe
    if (currentStatus === 'liked') {
      try {
        await userHistoryApi.removeAction(recipe.id);
      } catch (err) {
        console.error("Failed to remove like action", err);
      }
      setRecipeStatus(prev => ({ ...prev, [recipe.id]: null }));
      setLikedRecipes(likedRecipes.filter(r => r.id !== recipe.id));
      return;
    }
    
    // Record like action in user history
    try {
      await userHistoryApi.recordAction('like', recipe.id);
    } catch (err) {
      console.error("Failed to record like action", err);
    }

    setRecipeStatus(prev => ({ ...prev, [recipe.id]: 'liked' }));
    setLikedRecipes([...likedRecipes, recipe]);
    advanceToNextRecipe();
  };

  const handleLikeOnly = async () => {
    const recipe = recipes[currentIndex];
    if (!recipe) return;

    try {
      await userHistoryApi.recordAction('like', recipe.id);
    } catch (err) {
      console.error("Failed to record like action", err);
    }

    setRecipeStatus(prev => ({ ...prev, [recipe.id]: 'liked' }));
    setLikedRecipes([...likedRecipes, recipe]);
    advanceToNextRecipe();
  };

  const handleDislike = async () => {
    const recipe = recipes[currentIndex];
    if (!recipe) return;
    
    const currentStatus = recipeStatus[recipe.id];
    
    // If already disliked, toggle to null (remove dislike)
    if (currentStatus === 'disliked') {
      try {
        await userHistoryApi.removeAction(recipe.id);
      } catch (err) {
        console.error("Failed to remove dislike action", err);
      }
      setRecipeStatus(prev => ({ ...prev, [recipe.id]: null }));
      return;
    }
    
    try {
      await userHistoryApi.recordAction('dislike', recipe.id);
    } catch (err) {
      console.error("Failed to record dislike action", err);
    }

    setRecipeStatus(prev => ({ ...prev, [recipe.id]: 'disliked' }));
  };

  const handleSwipeDislike = async () => {
    const recipe = recipes[currentIndex];
    if (!recipe) return;
    
    const currentStatus = recipeStatus[recipe.id];
    
    // If already disliked, toggle to null (remove dislike) and stay on same recipe
    if (currentStatus === 'disliked') {
      try {
        await userHistoryApi.removeAction(recipe.id);
      } catch (err) {
        console.error("Failed to remove dislike action", err);
      }
      setRecipeStatus(prev => ({ ...prev, [recipe.id]: null }));
      return;
    }
    
    try {
      await userHistoryApi.recordAction('dislike', recipe.id);
    } catch (err) {
      console.error("Failed to record dislike action", err);
    }

    setRecipeStatus(prev => ({ ...prev, [recipe.id]: 'disliked' }));
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
    const isUpdate = recipesInShoppingList.has(recipe.id);

    const shoppingListElems: CartItem[] = [];
    
    // Iterate through richIngredients in order to maintain consistency
    if (recipe.richIngredients) {
      recipe.richIngredients.forEach((ingredient) => {
        const value = selectedProducts[ingredient.ingredientId];
        if (value && value !== 'already-have') {
          shoppingListElems.push({
            product_id: (value as Product).id,
            quantity: productQuantities[(value as Product).id] || 1,
            recipe_id: recipe.id,
          });
        }
      });
    }

    // If recipe is being updated (already in list), delete old items first
    if (isUpdate) {
      try {
        const activeList = await shoppingListApi.getActiveShoppingList();
        if (activeList?.groups) {
          // Find all items for this recipe and delete them
          const itemsToDelete: string[] = [];
          activeList.groups.forEach(group => {
            group.items.forEach(item => {
              if (item.recipeId && parseInt(item.recipeId, 10) === recipe.id) {
                itemsToDelete.push(item.id);
              }
            });
          });
          if (itemsToDelete.length > 0) {
            await Promise.all(
              itemsToDelete.map(id => shoppingListApi.deleteItem(id))
            );
          }
        }
      } catch (error) {
        console.error('Failed to delete old recipe items:', error);
      }
    }
    // Update local counters/state only for creation; handle removal on update
    if (isUpdate) {
      if (shoppingListElems.length === 0) {
        // Removal: recipe no longer in list
        setShoppingListRecipes(prev => prev.filter(r => r.id !== recipe.id));
        setRecipesInShoppingList(prev => {
          const next = new Set(prev);
          next.delete(recipe.id);
          return next;
        });
      }
      // For updates with items, do not increment counters (recipe already counted)
    } else {
      // Creation only when there are items to add
      if (shoppingListElems.length > 0) {
        setShoppingListRecipes([...shoppingListRecipes, recipe]);
        setRecipesInShoppingList(prev => {
          const next = new Set(prev);
          next.add(recipe.id);
          return next;
        });
      }
    }

    if (shoppingListElems.length > 0) {
      await shoppingListApi.addItemsToShoppingList(shoppingListElems);
    }
    showSuccessNotification(recipe.title);
    setShoppingFlowOpen(false);
    setShowRecipeDetailModal(true);
  };

  const openShoppingFlow = (recipe?: UIRecipe | null) => {
    const target = recipe || recipes[currentIndex];
    if (!target) return;
    setShoppingFlowRecipe(target);
    setShoppingFlowOpen(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    // Disable swipe if starting on button or other interactive elements
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button') || target.closest('[onClick]');
    disableSwipeRef.current = !!isInteractive;
    
    // If on an interactive element, don't set up swipe
    if (disableSwipeRef.current) return;
    
    setTouchStart(e.touches[0].clientX);
  };

  const finalizeSwipe = async () => {
    const threshold = 50;
    if (Math.abs(swipeX) < threshold) {
      setSwipeX(0);
      swipingRef.current = false;
      return;
    }

    setIsAnimating(true);

    if (swipeX > threshold) {
      await handleSwipeLike();
    } else if (swipeX < -threshold) {
      await handleSwipeDislike();
    }

    setTimeout(() => {
      setSwipeX(0);
      setIsAnimating(false);
      swipingRef.current = false;
    }, 300);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disableSwipeRef.current) return;
    e.stopPropagation();
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart;
    if (Math.abs(diff) > 10) swipingRef.current = true;
    setSwipeX(diff);
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    e.stopPropagation();
    
    if (disableSwipeRef.current) {
      disableSwipeRef.current = false;
      setSwipeX(0);
      return;
    }

    await finalizeSwipe();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button') || target.closest('[onClick]');
    disableSwipeRef.current = !!isInteractive;
    if (disableSwipeRef.current) return;
    mouseDownRef.current = true;
    setTouchStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseDownRef.current || disableSwipeRef.current) return;
    e.preventDefault();
    const diff = e.clientX - touchStart;
    if (Math.abs(diff) > 10) swipingRef.current = true;
    setSwipeX(diff);
  };

  const handleMouseUp = async () => {
    if (!mouseDownRef.current) return;
    mouseDownRef.current = false;

    if (disableSwipeRef.current) {
      disableSwipeRef.current = false;
      setSwipeX(0);
      swipingRef.current = false;
      return;
    }

    await finalizeSwipe();
  };

  const handleRecipeImageClick = () => {
    if (swipingRef.current) {
      swipingRef.current = false;
      return;
    }
    setShowRecipeDetailModal(true);
  };

  const currentRecipeData = recipes[currentIndex];
  const isAtStart = currentIndex === 0 && !showEndScreen;

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
  if (!recipes.length) {
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

          {/* Info Text */}
          {showInfoPanel && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start justify-between gap-2">
              <p className="text-sm text-blue-900 flex items-center gap-2 flex-1">
                <i className="ri-information-line text-lg flex-shrink-0"></i>
                Tip: Click on the image to see full details, swipe right to like, left to dislike!
              </p>
              <button
                onClick={() => setShowInfoPanel(false)}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center hover:bg-blue-200 rounded transition-colors cursor-pointer"
                aria-label="Close info panel"
              >
                <i className="ri-close-line text-lg text-blue-900"></i>
              </button>
            </div>
          )}

          {/* Recipe Card */}
          {!showEndScreen && currentRecipeData && (
              <div 
                data-swipe-card
                ref={setCardRef}
                className="relative transition-opacity select-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  transform: `translateX(${swipeX}px) rotate(${swipeX * 0.05}deg)`,
                  opacity: 1 - Math.abs(swipeX) / 500,
                  transition: isAnimating ? 'all 0.3s ease-out' : 'none',
                  touchAction: 'pan-y',
                }}
              >
                {/* Swipe Indicators */}
                {swipeX > 30 && (
                  <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white w-14 h-14 rounded-full shadow-xl animate-pulse flex items-center justify-center">
                      <i className="ri-heart-fill text-3xl"></i>
                    </div>
                  </div>
                )}
                {swipeX < -30 && (
                  <div className="absolute top-4 right-4 z-10 pointer-events-none">
                    <div className="bg-gradient-to-r from-gray-400 to-gray-600 text-white w-14 h-14 rounded-full shadow-xl animate-pulse flex items-center justify-center">
                      <i className="ri-thumb-down-fill text-3xl"></i>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                  {/* Recipe Image */}
                  <div
                      className="relative w-full h-96 cursor-pointer group"
                      onClick={(e) => { e.stopPropagation(); handleRecipeImageClick(); }}
                  >
                    <img
                        src={currentRecipeData.image}
                        alt={currentRecipeData.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300 select-none"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                        <i className="ri-information-line text-3xl text-[#2F855A]"></i>
                      </div>
                    </div>
                    
                    {/* Status Indicator Badge (hidden while swiping to avoid overlap) */}
                    {recipeStatus[currentRecipeData.id] === 'liked' && Math.abs(swipeX) <= 30 && (
                      <div className="absolute top-4 left-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                          <i className="ri-heart-fill text-lg text-white"></i>
                        </div>
                      </div>
                    )}
                    {recipeStatus[currentRecipeData.id] === 'disliked' && Math.abs(swipeX) <= 30 && (
                      <div className="absolute top-4 left-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
                          <i className="ri-thumb-down-fill text-lg text-white"></i>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recipe Info */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{currentRecipeData.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{currentRecipeData.description}</p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
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
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                      {/* Like/Dislike Row */}
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDislike(); }}
                          className={`w-14 h-14 rounded-full transition-all flex items-center justify-center cursor-pointer text-xl shadow-sm border-2 ${
                            recipeStatus[currentRecipeData.id] === 'disliked'
                              ? 'bg-gray-500 text-white border-gray-600'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                          title="Dislike"
                          aria-label="Dislike"
                        >
                          <i className="ri-thumb-down-fill text-2xl"></i>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLike(); }}
                          className={`w-14 h-14 rounded-full transition-all flex items-center justify-center cursor-pointer text-xl shadow-sm border-2 ${
                            recipeStatus[currentRecipeData.id] === 'liked'
                              ? 'bg-[#2F855A] text-white border-emerald-700'
                              : 'bg-emerald-50 text-[#2F855A] border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title="Like"
                          aria-label="Like"
                        >
                          <i className="ri-heart-fill text-2xl"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* End Screen */}
          {showEndScreen && (
            <div className="mt-6 bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-5 items-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <i className="ri-check-double-line text-2xl"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">You're all caught up!</h3>
                <p className="text-sm text-gray-600">Jump back to the start or search for more recipes.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={goToFirstRecipe}
                  className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-refresh-line text-xl"></i>
                  <span>Back to First Recipe</span>
                </button>
                <button
                  onClick={() => window.REACT_APP_NAVIGATE('/search')}
                  className="flex-1 py-4 bg-white text-[#2F855A] rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap border-2 border-[#2F855A]"
                >
                  <i className="ri-search-line text-xl"></i>
                  <span>Go to Search</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Buttons - Below Recipe Card */}
          <div className="flex justify-center items-center gap-3 mt-6 mb-6">
            <button
              onClick={goToPreviousRecipe}
              disabled={isAtStart}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-all"
              title="Previous"
            >
              <i className="ri-arrow-left-s-line text-xl"></i>
            </button>
            <div className="text-sm font-medium text-gray-700 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
              {currentIndex + 1}/{recipes.length}
            </div>
            <button
              onClick={advanceToNextRecipe}
              disabled={showEndScreen}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-all"
              title="Next"
            >
              <i className="ri-arrow-right-s-line text-xl"></i>
            </button>
          </div>

          {/* View Shopping List Button */}
          {shoppingListRecipes.length > 0 && (
              <div className="mt-6">
                <button
                    onClick={() => window.REACT_APP_NAVIGATE('/shopping-list')}
                    className="w-full py-4 bg-white text-[#2F855A] rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap border-2 border-[#2F855A]"
                >
                  <i className="ri-shopping-cart-line text-xl"></i>
                  <span>View Shopping List ({shoppingListRecipes.length} {shoppingListRecipes.length === 1 ? 'Recipe' : 'Recipes'})</span>
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
          alreadyInList={shoppingFlowRecipe ? recipesInShoppingList.has(shoppingFlowRecipe.id) : false}
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
            openShoppingFlow(currentRecipeData);
          }}
          onStatusChange={(id, newStatus) => {
            setRecipeStatus(prev => ({ ...prev, [id]: newStatus }));
            if (newStatus === 'liked') {
              const recipe = recipes.find(r => r.id === id);
              if (recipe && !likedRecipes.some(r => r.id === id)) {
                setLikedRecipes([...likedRecipes, recipe]);
              }
            } else {
              setLikedRecipes(likedRecipes.filter(r => r.id !== id));
            }
          }}
        />
      </div>
  );
}