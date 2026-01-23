
import { useEffect, useMemo, useState } from 'react';
import { userHistoryApi, UserHistoryRecord } from '@/api/user-history/userHistoryApi';
import { recipesApi, RecipeRecommendation } from '@/api/recipe-swiper/recipesApi';
import { authApi, AuthProfile } from '@/api/auth/authApi';

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'liked' | 'disliked' | 'stats'>('liked');
  const [history, setHistory] = useState<UserHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    preferences: {
      diet: 'Not specified',
      servings: 1,
      budget: 'medium',
      allergies: [],
      cookingTime: 'Any',
      skillLevel: 'Beginner'
    },
    selectedMarket: 'Select a market'
  });

  // Pull history + recipe metadata so we can display real data instead of mocks
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [historyResponse, profileResponse] = await Promise.all([
          userHistoryApi.getUserHistory(),
          authApi.getProfile().catch(() => null),
        ]);
        setHistory(historyResponse);

        // Infer preferences from liked recipes (now embedded in history)
        const likedRecords = historyResponse.filter((h) => h.action);
        const likedServings = likedRecords
          .map((h) => parseInt(h.recipe?.yields) || 2)
          .filter((v): v is number => v > 0);
        const avgServings = likedServings.length > 0 
          ? Math.round(likedServings.reduce((a, b) => a + b, 0) / likedServings.length) 
          : 2;

        const categories: Record<string, number> = {};
        likedRecords.forEach((h) => {
          const cat = h.recipe?.category || 'Not specified';
          categories[cat] = (categories[cat] || 0) + 1;
        });
        const diet = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not specified';

        const cookTimes = likedRecords
          .map((h) => h.recipe?.total_time)
          .filter((v): v is number => v > 0);
        const avgTime = cookTimes.length > 0 ? cookTimes.reduce((a, b) => a + b, 0) / cookTimes.length : 30;
        const skillLevel = avgTime > 60 ? 'Advanced' : avgTime > 30 ? 'Intermediate' : 'Beginner';

        if (profileResponse) {
          setProfile(profileResponse);
          setUserData((prev) => ({
            ...prev,
            name: profileResponse.name || profileResponse.username,
            email: profileResponse.email || profileResponse.username,
            preferences: {
              diet: diet && diet !== '—' ? diet : 'Not specified',
              servings: avgServings,
              budget: 'medium',
              allergies: [],
              cookingTime: `${Math.round(avgTime)} min`,
              skillLevel
            }
          }));
        }
      } catch (err: any) {
        console.error('Failed to load user history', err);
        const message = err?.response?.data?.error || err?.message || 'Unable to load history right now.';
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

  const parseCalories = (calories: string | undefined) => {
    if (!calories) return null;
    const match = calories.match(/[\d.]+/);
    return match ? Number(match[0]) : null;
  };

  const avg = (nums: number[]) => {
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  };

  const avgCookTimeMinutes = useMemo(() => {
    const values = history
      .map((h) => h.recipe?.total_time)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const value = avg(values);
    return value ? `${Math.round(value)} min` : '—';
  }, [history]);

  const avgCalories = useMemo(() => {
    const values = history
      .map((h) => parseCalories(h.recipe?.nutrients.calories))
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const value = avg(values);
    return value ? Math.round(value) : '—';
  }, [history]);

  const stats = {
    totalRecipes: history.length,
    likedCount: likedHistory.length,
    dislikedCount: dislikedHistory.length,
    avgCookTime: avgCookTimeMinutes,
    avgCalories,
    favoriteCuisine: likedHistory[0]?.recipe?.category || '—',
    totalCookingTime: history
      .map((h) => h.recipe?.total_time)
      .filter((v): v is number => typeof v === 'number' && v > 0)
      .reduce((sum, curr) => sum + curr, 0)
      ? `${Math.round(
          history
            .map((h) => h.recipe?.total_time)
            .filter((v): v is number => typeof v === 'number' && v > 0)
            .reduce((sum, curr) => sum + curr, 0) / 60
        )} hours`
      : '—',
    recipesThisMonth: history.length,
  };

  const handleEditPreferences = () => {
    window.REACT_APP_NAVIGATE('/questionnaire');
  };

  const handleChangeMarket = () => {
    window.REACT_APP_NAVIGATE('/market-selection');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{userData.name}</h1>
              <p className="text-sm text-gray-600 mb-4">{userData.email}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="px-3 py-1 bg-[#2F855A]/10 text-[#2F855A] rounded-full text-sm font-medium">
                  {userData.preferences.diet}
                </span>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 rounded-full text-sm font-medium">
                  {userData.preferences.skillLevel}
                </span>
                <span className="px-3 py-1 bg-teal-500/10 text-teal-700 rounded-full text-sm font-medium">
                  {userData.selectedMarket}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleEditPreferences}
                className="px-6 py-2.5 bg-[#2F855A] text-white rounded-lg font-medium hover:bg-[#276749] transition-all shadow-md cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-settings-3-line"></i>
                Edit Preferences
              </button>
              <button
                onClick={handleChangeMarket}
                className="px-6 py-2.5 bg-white text-[#2F855A] rounded-lg font-medium hover:bg-gray-50 transition-all border-2 border-[#2F855A]/20 cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-store-2-line"></i>
                Change Market
              </button>
            </div>
          </div>
        </div>

        {/* Current Preferences */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Preferences</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Servings</div>
              <div className="text-lg font-semibold text-gray-900">{userData.preferences.servings} people</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Budget</div>
              <div className="text-lg font-semibold text-gray-900 capitalize">{userData.preferences.budget}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Cooking Time</div>
              <div className="text-lg font-semibold text-gray-900">{userData.preferences.cookingTime}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Allergies</div>
              <div className="text-lg font-semibold text-gray-900">{userData.preferences.allergies.join(', ')}</div>
            </div>
          </div>
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
                onClick={() => setActiveTab('disliked')}
                className={`flex-1 px-6 py-4 font-medium transition-colors cursor-pointer ${
                  activeTab === 'disliked'
                    ? 'text-[#2F855A] border-b-2 border-[#2F855A] bg-[#2F855A]/5'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="ri-close-circle-fill mr-2"></i>
                Disliked ({dislikedHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 px-6 py-4 font-medium transition-colors cursor-pointer ${
                  activeTab === 'stats'
                    ? 'text-[#2F855A] border-b-2 border-[#2F855A] bg-[#2F855A]/5'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="ri-bar-chart-fill mr-2"></i>
                Statistics
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
            {activeTab === 'liked' && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {likedHistory.map((entry) => {
                  const recipe = entry.recipe;
                  return (
                  <div key={entry.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="relative h-48 overflow-hidden">
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
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{recipe?.title || `Recipe #${entry.recipe_id}`}</h3>
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
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* Disliked Recipes */}
            {activeTab === 'disliked' && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dislikedHistory.map((entry) => {
                  const recipe = entry.recipe;
                  return (
                  <div key={entry.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="relative h-48 overflow-hidden">
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
                        <i className="ri-close-circle-fill text-xl text-gray-500"></i>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{recipe?.title || `Recipe #${entry.recipe_id}`}</h3>
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
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* Statistics */}
            {activeTab === 'stats' && (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-[#2F855A]/10 to-emerald-500/10 rounded-xl p-6 border border-[#2F855A]/20">
                    <div className="w-12 h-12 bg-[#2F855A] rounded-lg flex items-center justify-center mb-3">
                      <i className="ri-restaurant-line text-2xl text-white"></i>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalRecipes}</div>
                    <div className="text-sm text-gray-600">Total Recipes</div>
                  </div>

                  <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-xl p-6 border border-red-500/20">
                    <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-3">
                      <i className="ri-heart-fill text-2xl text-white"></i>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stats.likedCount}</div>
                    <div className="text-sm text-gray-600">Liked Recipes</div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-6 border border-emerald-500/20">
                    <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-3">
                      <i className="ri-time-line text-2xl text-white"></i>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stats.avgCookTime}</div>
                    <div className="text-sm text-gray-600">Avg Cook Time</div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-xl p-6 border border-orange-500/20">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-3">
                      <i className="ri-fire-line text-2xl text-white"></i>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stats.avgCalories}</div>
                    <div className="text-sm text-gray-600">Avg Calories</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Preferences</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Liked</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#2F855A] rounded-full"
                              style={{ width: `${(stats.likedCount / stats.totalRecipes) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                            {Math.round((stats.likedCount / stats.totalRecipes) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Disliked</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gray-400 rounded-full"
                              style={{ width: `${(stats.dislikedCount / stats.totalRecipes) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                            {Math.round((stats.dislikedCount / stats.totalRecipes) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Cooking Insights</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Favorite Cuisine</span>
                        <span className="text-sm font-semibold text-gray-900">{stats.favoriteCuisine}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Total Cooking Time</span>
                        <span className="text-sm font-semibold text-gray-900">{stats.totalCookingTime}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Recipes This Month</span>
                        <span className="text-sm font-semibold text-gray-900">{stats.recipesThisMonth}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
