
import { useCallback, useEffect, useMemo, useState } from 'react';
import { userHistoryApi, UserHistoryRecord } from '@/api/user-history/userHistoryApi';
import { authApi, AuthProfile } from '@/api/auth/authApi';
import { userApi, UserPreferencesWithMarket } from '@/api/questionnaire/userApi';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';import MarketSelection from '@/pages/market-selection/page';import ShoppingFlowModal from '@/components/recipe/ShoppingFlowModal';
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
  const [activeTab, setActiveTab] = useState<'liked' | 'saved'>('liked');
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [history, setHistory] = useState<UserHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferencesWithMarket | null>(null);
  const [shoppingFlowRecipe, setShoppingFlowRecipe] = useState<UIRecipe | null>(null);
  const [shoppingFlowOpen, setShoppingFlowOpen] = useState(false);
  const [recipeCache, setRecipeCache] = useState<Record<number, UIRecipe>>({});
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [detailRecipe, setDetailRecipe] = useState<UIRecipe | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRecipeIsLiked, setDetailRecipeIsLiked] = useState(false);

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
    setSuccessMessage('Market updated successfully! 🏪');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    // Reload page to refresh preferences after a short delay
    setTimeout(() => window.location.reload(), 500);
  };

  const handleHistoryLike = async (entry: UserHistoryRecord) => {
    try {
      await userHistoryApi.recordAction('like', entry.recipe.id);
      setHistory((prev) => prev.map((h) => (h.id === entry.id ? { ...h, action: true } : h)));
      setSuccessMessage(`${entry.recipe?.title || 'Recipe'} marked as liked! ❤️`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err) {
      console.error('[Profile] Failed to like recipe from history', err);
      setSuccessMessage('Unable to update like right now.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  const handleHistoryDislike = async (entry: UserHistoryRecord) => {
    try {
      await userHistoryApi.recordAction('dislike', entry.recipe.id);
      setHistory((prev) => prev.map((h) => (h.id === entry.id ? { ...h, action: false } : h)));
      setSuccessMessage(`${entry.recipe?.title || 'Recipe'} marked as disliked.`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err) {
      console.error('[Profile] Failed to dislike recipe from history', err);
      setSuccessMessage('Unable to update dislike right now.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
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
      setSuccessMessage('Unable to open shopping flow right now.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
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
    setSuccessMessage(`${recipe.title} added to your shopping list! 🎉`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
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
                className="px-4 py-2 bg-white text-[#2F855A] rounded-lg font-medium hover:bg-gray-50 transition-all border-2 border-[#2F855A]/20 cursor-pointer whitespace-nowrap flex items-center gap-2 text-sm self-start"
              >
                <i className="ri-store-2-line"></i>
                Change Market
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
                  <div className="flex flex-wrap gap-2">
                    {allergyBadges.map((allergy, idx) => {
                      const colors = [
                        'bg-rose-100 text-rose-700',
                        'bg-amber-100 text-amber-700',
                        'bg-emerald-100 text-emerald-700',
                        'bg-sky-100 text-sky-700',
                        'bg-indigo-100 text-indigo-700',
                        'bg-purple-100 text-purple-700',
                      ];
                      const emojiMap: Record<string, string> = {
                        peanuts: '🥜',
                        'tree nuts': '🥜',
                        soy: '🌱',
                        sesame: '🌿',
                        fish: '🐟',
                        shellfish: '🦞',
                        milk: '🥛',
                        eggs: '🥚',
                        wheat: '🌾',
                      };
                      const normalized = allergy.toLowerCase();
                      const emoji = emojiMap[normalized] || '⚠️';
                      const color = colors[idx % colors.length];
                      return (
                        <span key={allergy + idx} className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-2 ${color}`}>
                          <span>{emoji}</span>
                          {allergy}
                        </span>
                      );
                    })}
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
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 px-6 py-4 font-medium transition-colors cursor-pointer ${
                  activeTab === 'saved'
                    ? 'text-[#2F855A] border-b-2 border-[#2F855A] bg-[#2F855A]/5'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="ri-bookmark-fill mr-2"></i>
                Saved (0)
                {/* TODO: Implement saved recipes in backend */}
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

            {/* Liked Recipes */}
            {activeTab === 'liked' && !loading && likedHistory.length > 0 && (
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
                          onClick={() => handleHistoryDislike(entry)}
                          className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                        >
                          <i className="ri-thumb-down-line text-lg"></i>
                          <span>Dislike</span>
                        </button>
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

            {/* Empty State for Liked Recipes */}
            {activeTab === 'liked' && !loading && likedHistory.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-heart-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Liked Recipes Yet</h3>
                <p className="text-gray-600">Head to Recipe Swiper to find and like your favorite recipes!</p>
              </div>
            )}

            {/* Saved Recipes */}
            {activeTab === 'saved' && !loading && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-bookmark-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Recipes Yet</h3>
                {/* TODO: Implement saved recipes in backend */} // TODO
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

    {showMarketModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowMarketModal(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors cursor-pointer shadow-md"
            >
              <i className="ri-close-line text-xl text-gray-600"></i>
            </button>
            <div className="p-8">
              <MarketSelection
                onComplete={handleMarketUpdate}
              />
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Success Toast Notification */}
    {showSuccessToast && (
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
        <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 border-2 border-[#2F855A] min-w-[320px]">
          <div className="w-12 h-12 flex items-center justify-center bg-[#2F855A] rounded-full flex-shrink-0">
            <i className="ri-check-line text-2xl text-white"></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{successMessage}</p>
            <p className="text-xs text-gray-600 mt-0.5">View your shopping list or profile</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
