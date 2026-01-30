
import { useCallback, useEffect, useMemo, useState } from 'react';
import { userHistoryApi, UserHistoryRecord } from '@/api/user-history/userHistoryApi';
import { authApi, AuthProfile } from '@/api/auth/authApi';
import { userApi, UserPreferencesWithMarket } from '@/api/questionnaire/userApi';
import MarketSelection from '@/pages/market-selection/page';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ShoppingFlowModal from '@/components/recipe/ShoppingFlowModal';
import RecipeDetailModal from '@/components/recipe/RecipeDetailModal';
import { SelectedProducts, UIRecipe } from '@/types/recipe';
import { CartItem, shoppingListApi } from '@/api/shopping-list/shoppingCartApi';
import { Product } from '@/api/recipe-swiper/productsApi';


// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapViewController({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 13);
  return null;
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'liked'>('liked');
  const [history, setHistory] = useState<UserHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferencesWithMarket | null>(null);
  const [shoppingFlowRecipe, setShoppingFlowRecipe] = useState<UIRecipe | null>(null);
  const [shoppingFlowOpen, setShoppingFlowOpen] = useState(false);
  const [recipeCache, setRecipeCache] = useState<Record<number, UIRecipe>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [detailRecipe, setDetailRecipe] = useState<UIRecipe | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRecipeIsLiked, setDetailRecipeIsLiked] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);

  const [userData, setUserData] = useState({
    name: '',
    email: '',
  });

  // Pull history + recipe metadata so we can display real data instead of mocks
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [historyResponse, profileResponse, prefsResponse] = await Promise.all([
          userHistoryApi.getUserHistory(),
          authApi.getProfile().catch(() => null),
          userApi.getUserPreferences().catch(() => null),
        ]);
        
        console.log('[Profile] History response:', historyResponse);
        console.log('[Profile] Profile response:', profileResponse);
        console.log('[Profile] Preferences response:', prefsResponse);
        
        setHistory(historyResponse);
        const cachedRecipes = historyResponse.reduce<Record<number, UIRecipe>>((acc, entry) => {
          if (entry.recipe) {
            acc[entry.recipe.id] = entry.recipe;
          }
          return acc;
        }, {});
        setRecipeCache(cachedRecipes);
        setPreferences(prefsResponse);

        if (profileResponse) {
          setProfile(profileResponse);
          setUserData({
            name: profileResponse.name || profileResponse.username,
            email: profileResponse.email || profileResponse.username,
          });
        }
      } catch (err: any) {
        if (err?.response?.status == 401 || err?.response?.status == 404) {
          window.REACT_APP_NAVIGATE('/auth');
        }
        console.error('[Profile] Failed to load user data', err);
        console.error('[Profile] Error details:', {
          response: err?.response,
          status: err?.response?.status,
          data: err?.response?.data,
          message: err?.message
        });
        const message = err?.response?.data?.error || err?.message || 'Unable to load data right now.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // No need to enrich; recipes are already embedded in history
  const likedHistory = history.filter((h) => h.action);
  const dislikedHistory = history.filter((h) => !h.action);

  const defaultCenter: [number, number] = [48.1374, 11.5755]; // Munich fallback

  const mapCenter = useMemo<[number, number]>(() => {
    if (preferences?.market_latitude && preferences?.market_longitude) {
      return [preferences.market_latitude, preferences.market_longitude];
    }
    return defaultCenter;
  }, [preferences]);

  const allergyBadges = useMemo(() => {
    const source = preferences?.allergies || '';
    return source
      .split(/[,;]/)
      .map((a) => a.trim())
      .filter(Boolean);
  }, [preferences]);

  const parseCalories = (calories: string | undefined) => {
    if (!calories) return null;
    const match = calories.match(/[\d.]+/);
    return match ? Number(match[0]) : null;
  };

  const avg = (nums: number[]) => {
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  };

  // We only take liked recipes into account for averages
  const avgCookTimeMinutes = useMemo(() => {
    const values = likedHistory
      .map((h) => h.recipe?.total_time)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const value = avg(values);
    return value ? `${Math.round(value)} min` : '—';
  }, [likedHistory]);

  const avgCalories = useMemo(() => {
    const values = likedHistory
      .map((h) => parseCalories(h.recipe?.nutrients.calories))
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const value = avg(values);
    return value ? Math.round(value) : '—';
  }, [likedHistory]);

  // Helper to get skill level badge based on cooking times
  const getSkillLevelBadge = () => {
    if (!preferences) return { label: 'New', color: 'bg-gray-500/10 text-gray-700', icon: '🌱' };
    
    const avgTime = avgCookTimeMinutes === '—' ? 0 : parseInt(avgCookTimeMinutes);
    
    // Based on total recipes and average cooking time
    const totalRecipes = history.length;
    
    if (totalRecipes === 0) {
      return { label: 'New', color: 'bg-gray-500/10 text-gray-700', icon: '🌱' };
    } else if (totalRecipes < 5 || avgTime < 20) {
      return { label: 'Beginner', color: 'bg-blue-500/10 text-blue-700', icon: '👶' };
    } else if (totalRecipes < 15 || avgTime < 35) {
      return { label: 'Intermediate', color: 'bg-green-500/10 text-green-700', icon: '👨‍🍳' };
    } else if (totalRecipes < 30 || avgTime < 50) {
      return { label: 'Advanced', color: 'bg-orange-500/10 text-orange-700', icon: '🔥' };
    } else if (totalRecipes < 50 || avgTime < 70) {
      return { label: 'Expert', color: 'bg-purple-500/10 text-purple-700', icon: '⭐' };
    } else {
      return { label: 'Professional', color: 'bg-red-500/10 text-red-700', icon: '👑' };
    }
  };

  const skillBadge = getSkillLevelBadge();

  const stats = {
    totalRecipes: history.length,
    likedCount: likedHistory.length,
    dislikedCount: dislikedHistory.length,
    avgCookTime: avgCookTimeMinutes,
    avgCalories,
    likesRatio: history.length > 0 ? Math.round((likedHistory.length / history.length) * 100) : 0,
  };

  const handleEditPreferences = () => {
    window.REACT_APP_NAVIGATE('/questionnaire');
  };

  const handleChangeMarket = () => {
    setShowMarketModal(true);
  };

  const handleMarketUpdate = (newMarketId: number) => {
    setShowMarketModal(false);
    window.location.reload();
  };

  const handleHistoryLike = async (entry: UserHistoryRecord) => {
    try {
      await userHistoryApi.recordAction('like', entry.recipe.id);
      setHistory((prev) => prev.map((h) => (h.id === entry.id ? { ...h, action: true } : h)));
      setActionMessage(`${entry.recipe?.title || 'Recipe'} marked as liked.`);
    } catch (err) {
      console.error('[Profile] Failed to like recipe from history', err);
      setActionMessage('Unable to update like right now.');
    }
  };

  const handleHistoryDislike = async (entry: UserHistoryRecord) => {
    try {
      await userHistoryApi.recordAction('dislike', entry.recipe.id);
      setHistory((prev) => prev.map((h) => (h.id === entry.id ? { ...h, action: false } : h)));
      setActionMessage(`${entry.recipe?.title || 'Recipe'} marked as disliked.`);
    } catch (err) {
      console.error('[Profile] Failed to dislike recipe from history', err);
      setActionMessage('Unable to update dislike right now.');
    }
  };

  const handleOpenShoppingFlow = async (entry: UserHistoryRecord) => {
    try {
      if (!entry.action) {
        await userHistoryApi.recordAction('like', entry.recipe.id);
        setHistory((prev) => prev.map((h) => (h.id === entry.id ? { ...h, action: true } : h)));
      }

      const cached = recipeCache[entry.recipe.id] || { ...entry.recipe, richIngredients: entry.recipe.richIngredients ?? null };
      setRecipeCache((prev) => ({ ...prev, [entry.recipe.id]: cached }));
      setShoppingFlowRecipe(cached);
      setShoppingFlowOpen(true);
    } catch (err) {
      console.error('[Profile] Failed to open shopping flow from history', err);
      setActionMessage('Unable to open shopping flow right now.');
    }
  };

  const handleHistoryFlowComplete = async (recipe: UIRecipe, selectedProducts: SelectedProducts, productQuantities: Record<number, number>) => {
    // Add to shopping cart
    const shoppingListElems = Object.entries(selectedProducts)
      .filter(([_, product]) => product !== 'already-have')
      .map(([_, product]) => {
        const typedProduct = product as Product;
        return {
          product_id: typedProduct.id,
          quantity: productQuantities[typedProduct.id] || 1,
          recipe_id: recipe.id,
        };
      });

    try {
      await shoppingListApi.addItemsToShoppingList(shoppingListElems);
    } catch (err) {
      console.error('[Profile] Failed to add items to shopping list', err);
    }

    setRecipeCache((prev) => ({ ...prev, [recipe.id]: recipe }));
    setHistory((prev) => prev.map((h) => (h.recipe.id === recipe.id ? { ...h, recipe, action: true } : h)));
    setShoppingFlowOpen(false);
    setShoppingFlowRecipe(null);
    setActionMessage(`${recipe.title} added to your shopping list! 🎉`);
  };

  const handleHistoryRecipeUpdate = (updated: UIRecipe) => {
    setRecipeCache((prev) => ({ ...prev, [updated.id]: updated }));
    setHistory((prev) => prev.map((h) => (h.recipe.id === updated.id ? { ...h, recipe: updated } : h)));
  };

  const handleCloseShoppingFlow = () => {
    setShoppingFlowOpen(false);
    setShoppingFlowRecipe(null);
  };

  const handleOpenRecipeDetail = (entry: UserHistoryRecord) => {
    setDetailRecipe(entry.recipe);
    setDetailRecipeIsLiked(entry.action);
    setShowDetailModal(true);
  };

  const handleCloseRecipeDetail = () => {
    setShowDetailModal(false);
    setDetailRecipe(null);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Row 1: Compact user box (position 1) */}
          <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Profile</p>
              <h1 className="text-lg font-bold text-gray-900 leading-tight break-words">{userData.name}</h1>
              <p className="text-sm text-gray-600 break-words">{userData.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 ${skillBadge.color} rounded-full text-sm font-medium flex items-center gap-2`}>
                <span className="text-base">{skillBadge.icon}</span>
                {skillBadge.label}
              </span>
            </div>
          </div>

          {/* Market with real map (positions 2-3, spanning 2 columns and 2 rows) */}
          <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2 lg:row-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Selected Market</p>
                <h2 className="text-lg font-bold text-gray-900">{preferences?.market_name || 'No market selected'}</h2>
                {preferences?.market_id && (
                  <p className="text-sm text-gray-600 mt-1 flex flex-wrap gap-2 items-center">
                    <span className="flex items-center gap-1 text-[#2F855A]"><i className="ri-map-pin-line"></i>{preferences.market_street}</span>
                    <span className="text-gray-400">•</span>
                    <span>{preferences.market_zip_code || '—'} {preferences.market_city}</span>
                  </p>
                )}
              </div>
              <button
                onClick={handleChangeMarket}
                className="group flex items-center gap-3 bg-white/80 backdrop-blur-md border border-emerald-100 rounded-full pl-3 pr-4 py-2 shadow-sm hover:shadow-md hover:border-[#2F855A] transition-all cursor-pointer"
              >
                {/* Icon Box */}
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#2F855A] flex items-center justify-center group-hover:bg-[#2F855A] group-hover:text-white transition-colors">
                  <i className="ri-store-2-line"></i>
                </div>
                
                {/* Text Info */}
                <div className="text-left flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Change Market</span>
                  <span className="text-sm font-bold text-gray-800 leading-none group-hover:text-[#2F855A] transition-colors">
                    {preferences?.market_name || 'Select Market'}
                  </span>
                </div>

                {/* Change Arrow */}
                <i className="ri-arrow-right-s-line text-gray-400 group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>

            {preferences?.market_id ? (
              <div className="overflow-hidden rounded-xl border border-gray-100 relative z-0">
                <MapContainer center={mapCenter} zoom={13} style={{ height: 280, width: '100%' }} scrollWheelZoom={false}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapViewController center={mapCenter} />
                  <Marker position={mapCenter}>
                    <Popup>
                      <div className="text-sm font-semibold">{preferences.market_name}</div>
                      <div className="text-xs text-gray-600">{preferences.market_street}</div>
                      <div className="text-xs text-gray-600">{preferences.market_zip_code} {preferences.market_city}</div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            ) : (
              <div className="h-64 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-500">
                <i className="ri-map-pin-2-line text-3xl mb-2"></i>
                <p className="text-sm mb-2">No market selected yet.</p>
                <button onClick={handleChangeMarket} className="text-[#2F855A] hover:underline text-sm">Select a market →</button>
              </div>
            )}
          </div>

          {/* Row 2: Statistics card (position 4) */}
          <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Your Statistics</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <i className="ri-time-line text-emerald-500"></i>
                  <span>Avg Cook Time</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.avgCookTime}</div>
              </div>
              <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <i className="ri-fire-line text-orange-500"></i>
                  <span>Avg Calories</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.avgCalories}</div>
              </div>
              <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <i className="ri-thumb-up-line text-[#2F855A]"></i>
                  <span>Likes Ratio</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.likesRatio}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Preferences */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Current Preferences</h2>
            <button
              onClick={handleEditPreferences}
              className="px-4 py-2 bg-[#2F855A] text-white rounded-lg font-medium hover:bg-[#276749] transition-all shadow-md cursor-pointer whitespace-nowrap flex items-center gap-2 text-sm"
            >
              <i className="ri-settings-3-line"></i>
              Edit Preferences
            </button>
          </div>
          {preferences ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Typical Cooking Time</div>
                <div className="text-lg font-semibold text-gray-900">
                  {preferences.min_cooking_time && preferences.max_cooking_time
                    ? preferences.max_cooking_time > 300
                      ? `${preferences.min_cooking_time}+ min`
                      : `${preferences.min_cooking_time}-${preferences.max_cooking_time} min`
                    : '—'}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Max. Budget per Meal</div>
                <div className="text-lg font-semibold text-gray-900">€{preferences.budget}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Skill Level</div>
                <div className="text-lg font-semibold text-gray-900 capitalize">{preferences.skill_level}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg md:col-span-3">
                <div className="text-sm text-gray-600 mb-2">Allergies</div>
                {allergyBadges.length > 0 ? (
                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {allergyBadges.map((allergy, idx) => (
                        <span
                          key={allergy + idx}
                          className="px-3 py-1 bg-white/90 text-amber-700 rounded-full text-sm font-medium border border-amber-200"
                        >
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">None</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No preferences set yet.</p>
              <button
                onClick={handleEditPreferences}
                className="mt-4 text-[#2F855A] hover:underline"
              >
                Set your preferences →
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/my-recipes')}
            className="w-full px-6 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <i className="ri-book-open-line text-lg"></i>
              </span>
              <span className="text-left">
                <span className="block text-xs uppercase tracking-wider text-white/80">Your collection</span>
                <span className="block text-base">My Recipes</span>
              </span>
            </span>
            <i className="ri-arrow-right-line text-xl"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('liked')}
                className={`flex-1 px-6 py-4 font-medium transition-colors cursor-pointer ${
                  activeTab === 'liked'
                    ? 'text-[#2F855A] border-b-2 border-[#2F855A] bg-[#2F855A]/5'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="ri-heart-fill mr-2"></i>
                Liked ({likedHistory.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {loading && (
              <div className="text-center text-gray-600">Loading your history...</div>
            )}

            {actionMessage && !loading && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between">
                <span>{actionMessage}</span>
                <button
                  onClick={() => setActionMessage(null)}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
            )}

            {/* Liked Recipes */}
            {activeTab === 'liked' && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {likedHistory.map((entry) => {
                  const recipe = entry.recipe;
                  return (
                  <div key={entry.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                    <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => handleOpenRecipeDetail(entry)}>
                      {recipe?.image ? (
                        <img
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                          No image
                        </div>
                      )}
                      <div className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                        <i className="ri-heart-fill text-xl text-red-500"></i>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="font-semibold text-gray-900 mb-2 cursor-pointer hover:text-[#2F855A] transition-colors" onClick={() => handleOpenRecipeDetail(entry)}>{recipe?.title || `Recipe #${entry.recipe.id}`}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <i className="ri-time-line"></i>
                          {recipe?.total_time ? `${recipe.total_time} min` : '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-fire-line"></i>
                          {recipe?.nutrients?.calories || '—'}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-600">{recipe?.category || '—'}</span>
                      </div>
                      <div className="mt-auto pt-4 flex flex-col gap-2">
                        <button
                          onClick={() => handleOpenShoppingFlow(entry)}
                          className="w-full px-3 py-2 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-lg font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                        >
                          <i className="ri-shopping-cart-2-line text-lg"></i>
                          <span>Add to Shopping List</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
    <ShoppingFlowModal
      recipe={shoppingFlowRecipe}
      open={shoppingFlowOpen}
      marketId={preferences?.market_id || undefined}
      onClose={handleCloseShoppingFlow}
      onComplete={handleHistoryFlowComplete}
      onRecipeUpdate={handleHistoryRecipeUpdate}
    />

    <RecipeDetailModal
      recipe={detailRecipe}
      open={showDetailModal}
      onClose={handleCloseRecipeDetail}
      onAddToShoppingList={() => {
        if (detailRecipe) {
          handleCloseRecipeDetail();
          const entry = history.find(h => h.recipe.id === detailRecipe.id);
          if (entry) handleOpenShoppingFlow(entry);
        }
      }}
    />

    {/* Market Selection Modal */}
    {showMarketModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-hidden">
        <div className="relative w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col">
          <button
            onClick={() => setShowMarketModal(false)}
            className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
          <div className="flex-1 overflow-y-auto">
            <MarketSelection onComplete={handleMarketUpdate} />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
