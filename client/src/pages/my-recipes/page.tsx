import { useState } from 'react';

// Mock data for user's saved/liked recipes
export const savedRecipesMock = [
  {
    id: 1,
    name: "Mediterranean Quinoa Bowl",
    image: "https://readdy.ai/api/search-image?query=Photorealistic%20Mediterranean%20quinoa%20bowl%20with%20fresh%20vegetables%2C%20feta%20cheese%2C%20olives%2C%20and%20herbs%2C%20vibrant%20colors%2C%20appetizing%20presentation%2C%20professional%20food%20photography%2C%20soft%20natural%20lighting%2C%20white%20ceramic%20bowl%2C%20wooden%20table%20background%2C%20high%20detail%2C%20centered%20composition&width=800&height=600&seq=recipe1&orientation=landscape",
    calories: 420,
    totalTime: 25,
    difficulty: "Easy",
    servings: 2,
    description: "A nutritious and colorful bowl packed with protein-rich quinoa, fresh Mediterranean vegetables, creamy feta cheese, and a tangy lemon dressing.",
    prepTime: 10,
    cookTime: 15,
    tags: ["Vegetarian", "Healthy", "Mediterranean"],
    dateAdded: "2024-01-15",
    instructions: [
      "Rinse quinoa thoroughly under cold water and cook according to package instructions, about 15 minutes.",
      "While quinoa cooks, dice cucumber, tomatoes, and red onion into small pieces.",
      "Crumble feta cheese and slice Kalamata olives.",
      "In a small bowl, whisk together olive oil, lemon juice, minced garlic, salt, and pepper for the dressing.",
      "Once quinoa is cooked and slightly cooled, combine with vegetables in a large bowl.",
      "Drizzle with dressing and toss gently to combine.",
      "Top with feta cheese, olives, and fresh herbs before serving."
    ],
    nutritionFacts: {
      protein: "18g",
      carbs: "52g",
      fat: "16g",
      fiber: "8g",
      sugar: "12g",
      sodium: "580mg"
    },
    ingredients: [
      { name: "Quinoa", amount: "200g" },
      { name: "Cherry Tomatoes", amount: "150g" },
      { name: "Cucumber", amount: "1 piece" },
      { name: "Feta Cheese", amount: "100g" },
      { name: "Kalamata Olives", amount: "50g" },
      { name: "Red Onion", amount: "1/2 piece" },
      { name: "Olive Oil", amount: "3 tbsp" },
      { name: "Lemon Juice", amount: "2 tbsp" },
      { name: "Garlic", amount: "2 cloves" },
      { name: "Fresh Herbs", amount: "2 tbsp" }
    ]
  },
  {
    id: 2,
    name: "Creamy Chicken Alfredo Pasta",
    image: "https://readdy.ai/api/search-image?query=Photorealistic%20creamy%20chicken%20alfredo%20pasta%20with%20grilled%20chicken%20strips%2C%20parmesan%20cheese%2C%20fresh%20parsley%2C%20white%20creamy%20sauce%2C%20professional%20food%20photography%2C%20soft%20natural%20lighting%2C%20white%20plate%2C%20elegant%20presentation%2C%20high%20detail%2C%20centered%20composition&width=800&height=600&seq=recipe2&orientation=landscape",
    calories: 680,
    totalTime: 30,
    difficulty: "Medium",
    servings: 4,
    description: "Rich and creamy pasta dish with tender grilled chicken, parmesan cheese, and a velvety alfredo sauce that will satisfy your comfort food cravings.",
    prepTime: 15,
    cookTime: 15,
    tags: ["Italian", "Comfort Food", "Pasta"],
    dateAdded: "2024-01-12",
    instructions: [
      "Bring a large pot of salted water to boil and cook fettuccine according to package directions.",
      "Season chicken breasts with salt, pepper, and Italian herbs. Grill or pan-fry until fully cooked, about 6-7 minutes per side.",
      "In a large skillet, melt butter over medium heat. Add minced garlic and sauté for 1 minute.",
      "Pour in heavy cream and bring to a gentle simmer. Cook for 3-4 minutes, stirring occasionally.",
      "Reduce heat to low and gradually whisk in grated parmesan cheese until smooth and creamy.",
      "Slice the cooked chicken into strips.",
      "Drain pasta and add to the alfredo sauce. Toss to coat evenly.",
      "Top with sliced chicken, extra parmesan, and fresh parsley before serving."
    ],
    nutritionFacts: {
      protein: "42g",
      carbs: "58g",
      fat: "32g",
      fiber: "3g",
      sugar: "6g",
      sodium: "980mg"
    },
    ingredients: [
      { name: "Fettuccine Pasta", amount: "400g" },
      { name: "Chicken Breast", amount: "500g" },
      { name: "Heavy Cream", amount: "300ml" },
      { name: "Parmesan Cheese", amount: "100g" },
      { name: "Garlic", amount: "3 cloves" },
      { name: "Butter", amount: "2 tbsp" },
      { name: "Italian Herbs", amount: "1 tsp" },
      { name: "Salt", amount: "to taste" },
      { name: "Black Pepper", amount: "to taste" },
      { name: "Fresh Parsley", amount: "2 tbsp" }
    ]
  },
  {
    id: 3,
    name: "Spicy Thai Basil Stir-Fry",
    image: "https://readdy.ai/api/search-image?query=Photorealistic%20spicy%20Thai%20basil%20stir-fry%20with%20colorful%20vegetables%2C%20fresh%20basil%20leaves%2C%20chili%20peppers%2C%20Asian%20cuisine%2C%20wok%20cooking%2C%20vibrant%20colors%2C%20professional%20food%20photography%2C%20soft%20natural%20lighting%2C%20white%20plate%2C%20high%20detail%2C%20centered%20composition&width=800&height=600&seq=recipe3&orientation=landscape",
    calories: 380,
    totalTime: 20,
    difficulty: "Easy",
    servings: 3,
    description: "A quick and flavorful Thai-inspired stir-fry with aromatic basil, crisp vegetables, and a perfect balance of sweet, salty, and spicy flavors.",
    prepTime: 10,
    cookTime: 10,
    tags: ["Asian", "Spicy", "Quick Meal"],
    dateAdded: "2024-01-10",
    instructions: [
      "Prepare all vegetables by slicing bell peppers, onions, and cutting broccoli into florets.",
      "In a small bowl, mix soy sauce, oyster sauce, fish sauce, sugar, and a splash of water for the sauce.",
      "Heat oil in a large wok or skillet over high heat until smoking.",
      "Add minced garlic and sliced chili peppers, stir-fry for 30 seconds until fragrant.",
      "Add the protein of choice (chicken, tofu, or shrimp) and cook until nearly done.",
      "Toss in all vegetables and stir-fry for 3-4 minutes until crisp-tender.",
      "Pour in the prepared sauce and toss everything together for 1-2 minutes.",
      "Turn off heat, add fresh Thai basil leaves, and toss until wilted.",
      "Serve immediately over steamed jasmine rice."
    ],
    nutritionFacts: {
      protein: "22g",
      carbs: "28g",
      fat: "18g",
      fiber: "6g",
      sugar: "14g",
      sodium: "1200mg"
    },
    ingredients: [
      { name: "Bell Peppers", amount: "2 pieces" },
      { name: "Thai Basil", amount: "1 bunch" },
      { name: "Soy Sauce", amount: "3 tbsp" },
      { name: "Oyster Sauce", amount: "2 tbsp" },
      { name: "Chili Peppers", amount: "3 pieces" },
      { name: "Garlic", amount: "4 cloves" },
      { name: "Onion", amount: "1 piece" },
      { name: "Broccoli", amount: "200g" },
      { name: "Fish Sauce", amount: "1 tbsp" },
      { name: "Sugar", amount: "1 tsp" },
      { name: "Vegetable Oil", amount: "2 tbsp" }
    ]
  },
  {
    id: 4,
    name: "Classic Caesar Salad",
    image: "https://readdy.ai/api/search-image?query=Photorealistic%20classic%20Caesar%20salad%20with%20crisp%20romaine%20lettuce%2C%20golden%20croutons%2C%20parmesan%20cheese%20shavings%2C%20creamy%20dressing%2C%20elegant%20presentation%2C%20professional%20food%20photography%2C%20soft%20natural%20lighting%2C%20white%20plate%2C%20high%20detail%2C%20centered%20composition&width=800&height=600&seq=recipe4&orientation=landscape",
    calories: 320,
    totalTime: 15,
    difficulty: "Easy",
    servings: 4,
    description: "A timeless classic with crisp romaine lettuce, homemade croutons, fresh parmesan, and a rich, creamy Caesar dressing.",
    prepTime: 15,
    cookTime: 0,
    tags: ["Salad", "Classic", "Vegetarian"],
    dateAdded: "2024-01-08",
    instructions: [
      "Wash and dry romaine lettuce thoroughly, then chop into bite-sized pieces.",
      "For the dressing, mash anchovies and garlic into a paste in a large bowl.",
      "Whisk in lemon juice, Dijon mustard, and Worcestershire sauce.",
      "Slowly drizzle in olive oil while whisking to create an emulsion.",
      "Add grated parmesan cheese and black pepper to the dressing.",
      "Toss lettuce with the dressing until evenly coated.",
      "Top with homemade croutons and additional parmesan shavings.",
      "Serve immediately while lettuce is still crisp."
    ],
    nutritionFacts: {
      protein: "8g",
      carbs: "12g",
      fat: "28g",
      fiber: "4g",
      sugar: "6g",
      sodium: "620mg"
    },
    ingredients: [
      { name: "Romaine Lettuce", amount: "2 heads" },
      { name: "Parmesan Cheese", amount: "100g" },
      { name: "Anchovies", amount: "4 fillets" },
      { name: "Garlic", amount: "2 cloves" },
      { name: "Lemon Juice", amount: "3 tbsp" },
      { name: "Dijon Mustard", amount: "1 tsp" },
      { name: "Worcestershire Sauce", amount: "1 tsp" },
      { name: "Olive Oil", amount: "1/2 cup" },
      { name: "Bread Cubes", amount: "2 cups" },
      { name: "Black Pepper", amount: "to taste" }
    ]
  }
];

interface Recipe {
  id: number;
  name: string;
  image: string;
  calories: number;
  totalTime: number;
  difficulty: string;
  servings: number;
  description: string;
  prepTime: number;
  cookTime: number;
  tags: string[];
  dateAdded: string;
  instructions: string[];
  nutritionFacts: {
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
    sugar: string;
    sodium: string;
  };
  ingredients: Array<{
    name: string;
    amount: string;
  }>;
}

export default function MyRecipesPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Filter recipes based on search query
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRecipes = savedRecipesMock.filter(recipe =>
    recipe.name.toLowerCase().includes(normalizedQuery) ||
    recipe.description.toLowerCase().includes(normalizedQuery) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(normalizedQuery)) ||
    recipe.ingredients.some(ingredient =>
      ingredient.name.toLowerCase().includes(normalizedQuery)
    )
  );

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      case 'oldest':
        return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Pagination calculations
  const totalRecipes = sortedRecipes.length;
  const totalPages = Math.ceil(totalRecipes / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecipes = sortedRecipes.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisibleButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage < maxVisibleButtons - 1) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    // Previous button
    buttons.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent cursor-pointer"
      >
        <i className="ri-arrow-left-s-line text-xl text-gray-700"></i>
      </button>
    );

    // First page
    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all font-medium text-gray-700 cursor-pointer"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(
          <span key="dots1" className="w-10 h-10 flex items-center justify-center text-gray-400">
            ...
          </span>
        );
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 transition-all font-medium cursor-pointer ${
            currentPage === i
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-gray-200 text-gray-700 hover:border-emerald-500 hover:bg-emerald-50'
          }`}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="dots2" className="w-10 h-10 flex items-center justify-center text-gray-400">
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all font-medium text-gray-700 cursor-pointer"
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    buttons.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent cursor-pointer"
      >
        <i className="ri-arrow-right-s-line text-xl text-gray-700"></i>
      </button>
    );

    return buttons;
  };

  if (selectedRecipe) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Recipe Detail Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <button
              onClick={() => setSelectedRecipe(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4 cursor-pointer"
            >
              <i className="ri-arrow-left-line text-xl"></i>
              <span className="font-medium">Back to My Recipes</span>
            </button>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.name}
                  className="w-full h-80 object-cover rounded-lg"
                />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  {selectedRecipe.name}
                </h1>
                <p className="text-gray-600 mb-4">
                  {selectedRecipe.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedRecipe.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="ri-time-line text-emerald-600"></i>
                      <span className="font-medium text-gray-700">Total Time</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {selectedRecipe.totalTime} min
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="ri-group-line text-emerald-600"></i>
                      <span className="font-medium text-gray-700">Servings</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {selectedRecipe.servings}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="ri-fire-line text-emerald-600"></i>
                      <span className="font-medium text-gray-700">Calories</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {selectedRecipe.calories}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Ingredients */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="ri-shopping-basket-line text-emerald-600"></i>
                  Ingredients
                </h2>
                <ul className="space-y-3">
                  {selectedRecipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span className="text-gray-700">{ingredient.name}</span>
                      <span className="font-medium text-gray-900">
                        {ingredient.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Instructions & Nutrition */}
            <div className="md:col-span-2 space-y-8">
              {/* Instructions */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="ri-list-ordered text-emerald-600"></i>
                  Instructions
                </h2>
                <div className="space-y-4">
                  {selectedRecipe.instructions.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nutrition Facts */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="ri-heart-pulse-line text-emerald-600"></i>
                  Nutrition Facts
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.entries(selectedRecipe.nutritionFacts).map(([key, value]) => (
                    <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600 capitalize block mb-1">
                        {key}
                      </span>
                      <span className="font-bold text-gray-900">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cooking Times */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="ri-timer-line text-emerald-600"></i>
                  Cooking Times
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <i className="ri-knife-line text-2xl text-blue-600 mb-2 block"></i>
                    <span className="text-sm text-blue-600 block mb-1">Prep Time</span>
                    <span className="font-bold text-blue-800">
                      {selectedRecipe.prepTime} min
                    </span>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <i className="ri-fire-line text-2xl text-orange-600 mb-2 block"></i>
                    <span className="text-sm text-orange-600 block mb-1">Cook Time</span>
                    <span className="font-bold text-orange-800">
                      {selectedRecipe.cookTime} min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Recipes
              </h1>
              <p className="text-gray-600">
                Your collection of saved recipes
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-emerald-50 px-4 py-2 rounded-lg">
                <span className="text-emerald-700 font-medium">
                  {totalRecipes} Recipe{totalRecipes !== 1 ? 's' : ''} Total
                </span>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-search-line text-gray-400"></i>
            </div>
            <input
              type="text"
              placeholder="Search recipes, ingredients, or tags..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
              >
                <i className="ri-close-line text-gray-400 hover:text-gray-600"></i>
              </button>
            )}
          </div>

          {/* Pagination Controls */}
          {totalRecipes > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Showing {Math.min(startIndex + 1, totalRecipes)}-{Math.min(endIndex, totalRecipes)} of {totalRecipes} recipes
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm"
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {renderPaginationButtons()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {currentRecipes.length === 0 ? (
          <div className="text-center py-16">
            <i className="ri-search-line text-6xl text-gray-300 mb-4 block"></i>
            <h3 className="text-xl font-medium text-gray-500 mb-2">
              {searchQuery ? 'No recipes found' : 'No recipes saved yet'}
            </h3>
            <p className="text-gray-400">
              {searchQuery 
                ? `Try searching for something else or clear your search` 
                : 'Start liking recipes to build your collection'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {currentRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="relative">
                    <img
                      src={recipe.image}
                      alt={recipe.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                        {recipe.calories} cal
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {recipe.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {recipe.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <i className="ri-time-line"></i>
                          {recipe.totalTime}m
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-group-line"></i>
                          {recipe.servings}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-flashlight-line"></i>
                          {recipe.difficulty}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {recipe.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.tags.length > 2 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs">
                          +{recipe.tags.length - 2}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        Saved {formatDate(recipe.dateAdded)}
                      </span>
                      <button className="text-emerald-600 hover:text-emerald-700 transition-colors">
                        <i className="ri-arrow-right-line"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1">
                {renderPaginationButtons()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
