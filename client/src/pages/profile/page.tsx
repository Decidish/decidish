import { useState } from 'react';

interface Recipe {
  id: number;
  name: string;
  image: string;
  cuisine: string;
  cookTime: string;
  calories: number;
  liked: boolean;
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'liked' | 'disliked' | 'stats'>('liked');

  // Mock user data
  const userData = {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    avatar: 'https://readdy.ai/api/search-image?query=professional%20portrait%20photo%20of%20a%20smiling%20woman%20with%20brown%20hair%20in%20casual%20attire%20against%20a%20soft%20neutral%20background%20warm%20natural%20lighting%20friendly%20approachable%20expression%20high%20quality%20headshot%20photography&width=200&height=200&seq=user-avatar-001&orientation=squarish',
    preferences: {
      diet: 'Vegetarian',
      servings: 2,
      budget: 'medium',
      allergies: ['Nuts', 'Shellfish'],
      cookingTime: '30-45 min',
      skillLevel: 'Intermediate'
    },
    selectedMarket: 'Whole Foods Market'
  };

  // Mock recipe data
  const likedRecipes: Recipe[] = [
    {
      id: 1,
      name: 'Mediterranean Quinoa Bowl',
      image: 'https://readdy.ai/api/search-image?query=colorful%20mediterranean%20quinoa%20bowl%20with%20fresh%20vegetables%20chickpeas%20feta%20cheese%20and%20herbs%20on%20a%20white%20ceramic%20bowl%20clean%20simple%20background%20top%20view%20food%20photography%20vibrant%20healthy%20meal&width=400&height=300&seq=recipe-liked-001&orientation=landscape',
      cuisine: 'Mediterranean',
      cookTime: '25 min',
      calories: 420,
      liked: true
    },
    {
      id: 2,
      name: 'Thai Green Curry',
      image: 'https://readdy.ai/api/search-image?query=aromatic%20thai%20green%20curry%20with%20vegetables%20and%20tofu%20in%20a%20white%20bowl%20garnished%20with%20fresh%20basil%20leaves%20simple%20clean%20background%20top%20view%20authentic%20asian%20cuisine%20food%20photography&width=400&height=300&seq=recipe-liked-002&orientation=landscape',
      cuisine: 'Thai',
      cookTime: '35 min',
      calories: 380,
      liked: true
    },
    {
      id: 3,
      name: 'Caprese Pasta Salad',
      image: 'https://readdy.ai/api/search-image?query=fresh%20caprese%20pasta%20salad%20with%20cherry%20tomatoes%20mozzarella%20and%20basil%20in%20a%20white%20bowl%20drizzled%20with%20balsamic%20glaze%20clean%20simple%20background%20top%20view%20italian%20food%20photography&width=400&height=300&seq=recipe-liked-003&orientation=landscape',
      cuisine: 'Italian',
      cookTime: '20 min',
      calories: 450,
      liked: true
    },
    {
      id: 4,
      name: 'Vegetable Stir Fry',
      image: 'https://readdy.ai/api/search-image?query=colorful%20vegetable%20stir%20fry%20with%20broccoli%20bell%20peppers%20and%20snap%20peas%20in%20a%20white%20bowl%20with%20sesame%20seeds%20clean%20simple%20background%20top%20view%20asian%20cuisine%20food%20photography&width=400&height=300&seq=recipe-liked-004&orientation=landscape',
      cuisine: 'Asian',
      cookTime: '18 min',
      calories: 320,
      liked: true
    },
    {
      id: 5,
      name: 'Mushroom Risotto',
      image: 'https://readdy.ai/api/search-image?query=creamy%20mushroom%20risotto%20in%20a%20white%20bowl%20garnished%20with%20fresh%20parsley%20and%20parmesan%20shavings%20clean%20simple%20background%20top%20view%20italian%20comfort%20food%20photography&width=400&height=300&seq=recipe-liked-005&orientation=landscape',
      cuisine: 'Italian',
      cookTime: '40 min',
      calories: 480,
      liked: true
    },
    {
      id: 6,
      name: 'Greek Salad Bowl',
      image: 'https://readdy.ai/api/search-image?query=fresh%20greek%20salad%20bowl%20with%20cucumbers%20tomatoes%20olives%20and%20feta%20cheese%20in%20a%20white%20bowl%20clean%20simple%20background%20top%20view%20mediterranean%20healthy%20food%20photography&width=400&height=300&seq=recipe-liked-006&orientation=landscape',
      cuisine: 'Greek',
      cookTime: '15 min',
      calories: 280,
      liked: true
    }
  ];

  const dislikedRecipes: Recipe[] = [
    {
      id: 7,
      name: 'Spicy Tofu Scramble',
      image: 'https://readdy.ai/api/search-image?query=spicy%20tofu%20scramble%20with%20vegetables%20in%20a%20white%20bowl%20garnished%20with%20herbs%20clean%20simple%20background%20top%20view%20vegan%20breakfast%20food%20photography&width=400&height=300&seq=recipe-disliked-001&orientation=landscape',
      cuisine: 'American',
      cookTime: '15 min',
      calories: 250,
      liked: false
    },
    {
      id: 8,
      name: 'Lentil Soup',
      image: 'https://readdy.ai/api/search-image?query=hearty%20lentil%20soup%20in%20a%20white%20bowl%20with%20vegetables%20and%20herbs%20clean%20simple%20background%20top%20view%20comfort%20food%20photography&width=400&height=300&seq=recipe-disliked-002&orientation=landscape',
      cuisine: 'Middle Eastern',
      cookTime: '45 min',
      calories: 320,
      liked: false
    },
    {
      id: 9,
      name: 'Cauliflower Rice Bowl',
      image: 'https://readdy.ai/api/search-image?query=cauliflower%20rice%20bowl%20with%20roasted%20vegetables%20in%20a%20white%20bowl%20clean%20simple%20background%20top%20view%20healthy%20low%20carb%20food%20photography&width=400&height=300&seq=recipe-disliked-003&orientation=landscape',
      cuisine: 'Asian Fusion',
      cookTime: '25 min',
      calories: 220,
      liked: false
    }
  ];

  const stats = {
    totalRecipes: likedRecipes.length + dislikedRecipes.length,
    likedCount: likedRecipes.length,
    dislikedCount: dislikedRecipes.length,
    avgCookTime: '28 min',
    avgCalories: 372,
    favoriteCuisine: 'Italian',
    totalCookingTime: '4.2 hours',
    recipesThisMonth: 9
  };

  const handleEditPreferences = () => {
    window.REACT_APP_NAVIGATE('/questionnaire');
  };

  const handleChangeMarket = () => {
    window.REACT_APP_NAVIGATE('/market-selection');
  };

  const handleBack = () => {
    window.REACT_APP_NAVIGATE('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line text-xl"></i>
              <span className="font-medium">Back</span>
            </button>
            <img 
              src="https://public.readdy.ai/ai/img_res/b0724f47-0896-45dd-92da-e15712b65265.png" 
              alt="Recipe Recommender Logo" 
              className="h-10 w-auto"
            />
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#2F855A]/20">
                <img 
                  src={userData.avatar} 
                  alt={userData.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#2F855A] rounded-full flex items-center justify-center text-white hover:bg-[#276749] transition-colors cursor-pointer">
                <i className="ri-pencil-line text-sm"></i>
              </button>
            </div>
            
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
                Liked ({likedRecipes.length})
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
                Disliked ({dislikedRecipes.length})
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
            {/* Liked Recipes */}
            {activeTab === 'liked' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {likedRecipes.map((recipe) => (
                  <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={recipe.image} 
                        alt={recipe.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                        <i className="ri-heart-fill text-xl text-red-500"></i>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{recipe.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <i className="ri-time-line"></i>
                          {recipe.cookTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-fire-line"></i>
                          {recipe.calories} cal
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-600">{recipe.cuisine}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Disliked Recipes */}
            {activeTab === 'disliked' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dislikedRecipes.map((recipe) => (
                  <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={recipe.image} 
                        alt={recipe.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                        <i className="ri-close-circle-fill text-xl text-gray-500"></i>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{recipe.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <i className="ri-time-line"></i>
                          {recipe.cookTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-fire-line"></i>
                          {recipe.calories} cal
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-600">{recipe.cuisine}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
