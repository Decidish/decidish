// import { useState,useEffect } from 'react';
// import { recipeApi } from '../../api/search/recipeApi';

// interface Product {
//   id: string;
//   name: string;
//   brand: string;
//   image: string;
//   price: number;
//   weight: string;
//   unit: string;
// }

// interface Ingredient {
//   id: number;
//   name: string;
//   amount: string;
//   products: Product[];
// }

// interface Recipe {
//   id: number;
//   name: string;
//   image: string;
//   cookTime: number;
//   servings: number;
//   difficulty: string;
//   cuisine: string;
//   tags: string[];
//   rating: number;
//   calories: number;
//   description: string;
//   ingredients: Ingredient[];
// }

// export default function Search() {
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedCuisine, setSelectedCuisine] = useState('all');
//   const [selectedDifficulty, setSelectedDifficulty] = useState('all');
//   const [maxTime, setMaxTime] = useState('all');
//   const [searchResults, setSearchResults] = useState<Recipe[]>([]);
//   const [isSearching, setIsSearching] = useState(false);
//   const [hasSearched, setHasSearched] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(0);
//   const [totalResults, setTotalResults] = useState(0);
  
//   // Modal states
//   const [showIngredientModal, setShowIngredientModal] = useState(false);
//   const [showReviewModal, setShowReviewModal] = useState(false);
//   const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
//   const [currentIngredientIndex, setCurrentIngredientIndex] = useState(0);
//   const [selectedProducts, setSelectedProducts] = useState<Record<number, Product | 'already-have'>>({});
//   const [showAllProducts, setShowAllProducts] = useState(false);
//   const [showSuccessToast, setShowSuccessToast] = useState(false);
//   const [successMessage, setSuccessMessage] = useState('');
  
//   // Shopping cart
//   const [cartRecipes, setCartRecipes] = useState<Recipe[]>([]);
//   const [showCart, setShowCart] = useState(false);

//   const ITEMS_PER_PAGE = 12;

//   const cuisines = ['All', 'Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian', 'Thai', 'French', 'Japanese'];
//   const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
//   const timeOptions = ['All', '15 min', '30 min', '45 min', '60 min', '60+ min'];
  
//   const handleSearch = async (page: number = 1) => {
//     setIsSearching(true);
//     setHasSearched(true);
//     setCurrentPage(page);

//     try {
//       const response = await recipeApi.searchRecipes({
//         query: searchQuery,
//         cuisine: selectedCuisine,
//         difficulty: selectedDifficulty,
//         maxTime: maxTime,
//         page: page
//       });

//       // Map Backend Data (Snake_Case) to Frontend UI (CamelCase)
//       const mappedRecipes: Recipe[] = response.recipes.map((r: any) => ({
//         id: r.id,
//         name: r.title,
//         image: r.image || "https://placehold.co/600x400?text=No+Image", // Fallback image
//         cookTime: r.cook_time || r.total_time || 0,
//         servings: parseInt(r.yields)|| parseInt(r.nutrients?.servingSize) || 4, // Parse string yields
//         difficulty: r.difficulty || 'Medium',
//         cuisine: r.cuisine || 'International',
//         tags: r.keywords || [],
//         rating: r.ratings,
//         calories: r.nutrients?.calories ? parseInt(r.nutrients.calories) : 0,
//         description: r.description,
        
//         // Handle Ingredients Mismatch
//         // The backend currently sends strings ["Tomato", "Cheese"], 
//         // but UI expects objects with product links.
//         // We create a temporary mapping so the UI doesn't crash.
//         ingredients: r.ingredients ? r.ingredients.map((ingName: string, idx: number) => ({
//           id: idx,
//           name: ingName,
//           amount: "1 serving", // Default value
//           products: []         // Empty products list for now
//         })) : []
//       }));

//       setTotalResults(response.total_count);
//       setTotalPages(response.total_pages);
//       setSearchResults(mappedRecipes);
      
//       window.scrollTo({ top: 0, behavior: 'smooth' });

//     } catch (error) {
//       console.error("Failed to search recipes:", error);
//       // TODO Add error toast here
//     } finally {
//       setIsSearching(false);
//     }
//   };

//   // const handleSearch = (page: number = 1) => {
//   //   setIsSearching(true);
//   //   setHasSearched(true);
//   //   setCurrentPage(page);

//   //   // Calculate offset for backend
//   //   const offset = (page - 1) * ITEMS_PER_PAGE;

//   //   // Simulate API call with pagination parameters
//   //   console.log('Mock API Request:', {
//   //     query: searchQuery,
//   //     cuisine: selectedCuisine,
//   //     difficulty: selectedDifficulty,
//   //     maxTime: maxTime,
//   //     limit: ITEMS_PER_PAGE,
//   //     offset: offset,
//   //     page: page
//   //   });

//   //   setTimeout(() => {
//   //     let filtered = mockRecipes;

//   //     // Filter by search query
//   //     if (searchQuery.trim()) {
//   //       filtered = filtered.filter(recipe =>
//   //         recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//   //         recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
//   //         recipe.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
//   //       );
//   //     }

//   //     // Filter by cuisine
//   //     if (selectedCuisine !== 'all') {
//   //       filtered = filtered.filter(recipe => recipe.cuisine === selectedCuisine);
//   //     }

//   //     // Filter by difficulty
//   //     if (selectedDifficulty !== 'all') {
//   //       filtered = filtered.filter(recipe => recipe.difficulty === selectedDifficulty);
//   //     }

//   //     // Filter by time
//   //     if (maxTime !== 'all') {
//   //       const timeValue = parseInt(maxTime);
//   //       filtered = filtered.filter(recipe => recipe.cookTime <= timeValue);
//   //     }

//   //     // Calculate pagination
//   //     const total = filtered.length;
//   //     const pages = Math.ceil(total / ITEMS_PER_PAGE);
//   //     const startIndex = offset;
//   //     const endIndex = startIndex + ITEMS_PER_PAGE;
//   //     const paginatedResults = filtered.slice(startIndex, endIndex);

//   //     setTotalResults(total);
//   //     setTotalPages(pages);
//   //     setSearchResults(paginatedResults);
//   //     setIsSearching(false);

//   //     // Scroll to top of results
//   //     window.scrollTo({ top: 0, behavior: 'smooth' });
//   //   }, 500);
//   // };
  
//   useEffect(() => {
//     // Perform an initial search to populate the page
//     handleSearch(1);
//   }, []); // Empty dependency array = run once on mount

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter') {
//       handleSearch(1);
//     }
//   };

//   const handleRecipeClick = (recipe: Recipe) => {
//     setCurrentRecipe(recipe);
//     setShowIngredientModal(true);
//     setCurrentIngredientIndex(0);
//     setSelectedProducts({});
//   };

//   const handlePageChange = (page: number) => {
//     if (page >= 1 && page <= totalPages) {
//       handleSearch(page);
//     }
//   };

//   const showSuccessNotification = (recipeName: string) => {
//     setSuccessMessage(`${recipeName} added to your cart! 🎉`);
//     setShowSuccessToast(true);
//     setTimeout(() => {
//       setShowSuccessToast(false);
//     }, 3000);
//   };

//   const handleSelectProduct = (ingredientId: number, product: Product | 'already-have') => {
//     setSelectedProducts(prev => ({
//       ...prev,
//       [ingredientId]: product
//     }));

//     if (currentRecipe && currentIngredientIndex < currentRecipe.ingredients.length - 1) {
//       setCurrentIngredientIndex(currentIngredientIndex + 1);
//       setShowAllProducts(false);
//     } else {
//       // Show review modal instead of immediately adding to list
//       setShowIngredientModal(false);
//       setShowReviewModal(true);
//       setShowAllProducts(false);
//     }
//   };

//   const handleEditProduct = (ingredientId: number) => {
//     const ingredientIndex = currentRecipe?.ingredients.findIndex(ing => ing.id === ingredientId);
//     if (ingredientIndex !== undefined && ingredientIndex !== -1) {
//       setCurrentIngredientIndex(ingredientIndex);
//       setShowReviewModal(false);
//       setShowIngredientModal(true);
//     }
//   };

//   const handleConfirmRecipe = () => {
//     if (currentRecipe) {
//       setCartRecipes([...cartRecipes, currentRecipe]);

//       // Show success notification
//       showSuccessNotification(currentRecipe.name);

//       // Close modal
//       setShowReviewModal(false);
//       setCurrentRecipe(null);
//     }
//   };

//   const calculateReviewTotal = () => {
//     if (!currentRecipe) return 0;
//     return currentRecipe.ingredients.reduce((total, ingredient) => {
//       const selected = selectedProducts[ingredient.id];
//       if (selected && selected !== 'already-have') {
//         return total + selected.price;
//       }
//       return total;
//     }, 0);
//   };

//   const handleRemoveFromCart = (recipeId: number) => {
//     setCartRecipes(prev => prev.filter(r => r.id !== recipeId));
//   };

//   const handleGoToShoppingList = () => {
//     // Navigate to shopping list page
//     window.REACT_APP_NAVIGATE('/shopping-list');
//   };

//   const currentIngredient = currentRecipe?.ingredients[currentIngredientIndex];
//   const INITIAL_PRODUCTS_SHOWN = 3;
//   const displayedProducts = showAllProducts 
//     ? currentIngredient?.products 
//     : currentIngredient?.products.slice(0, INITIAL_PRODUCTS_SHOWN);
//   const hasMoreProducts = currentIngredient && currentIngredient.products.length > INITIAL_PRODUCTS_SHOWN;

//   const renderPaginationButtons = () => {
//     const buttons = [];
//     const maxVisibleButtons = 5;
//     let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
//     let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

//     if (endPage - startPage < maxVisibleButtons - 1) {
//       startPage = Math.max(1, endPage - maxVisibleButtons + 1);
//     }

//     // Previous button
//     buttons.push(
//       <button
//         key="prev"
//         onClick={() => handlePageChange(currentPage - 1)}
//         disabled={currentPage === 1}
//         className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent cursor-pointer"
//       >
//         <i className="ri-arrow-left-s-line text-xl text-gray-700"></i>
//       </button>
//     );

//     // First page
//     if (startPage > 1) {
//       buttons.push(
//         <button
//           key={1}
//           onClick={() => handlePageChange(1)}
//           className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all font-medium text-gray-700 cursor-pointer"
//         >
//           1
//         </button>
//       );
//       if (startPage > 2) {
//         buttons.push(
//           <span key="dots1" className="w-10 h-10 flex items-center justify-center text-gray-400">
//             ...
//           </span>
//         );
//       }
//     }

//     // Page numbers
//     for (let i = startPage; i <= endPage; i++) {
//       buttons.push(
//         <button
//           key={i}
//           onClick={() => handlePageChange(i)}
//           className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 transition-all font-medium cursor-pointer ${
//             currentPage === i
//               ? 'bg-[#2F855A] border-[#2F855A] text-white'
//               : 'border-gray-200 text-gray-700 hover:border-[#2F855A] hover:bg-emerald-50'
//           }`}
//         >
//           {i}
//         </button>
//       );
//     }

//     // Last page
//     if (endPage < totalPages) {
//       if (endPage < totalPages - 1) {
//         buttons.push(
//           <span key="dots2" className="w-10 h-10 flex items-center justify-center text-gray-400">
//             ...
//           </span>
//         );
//       }
//       buttons.push(
//         <button
//           key={totalPages}
//           onClick={() => handlePageChange(totalPages)}
//           className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all font-medium text-gray-700 cursor-pointer"
//         >
//           {totalPages}
//         </button>
//       );
//     }

//     // Next button
//     buttons.push(
//       <button
//         key="next"
//         onClick={() => handlePageChange(currentPage + 1)}
//         disabled={currentPage === totalPages}
//         className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent cursor-pointer"
//       >
//         <i className="ri-arrow-right-s-line text-xl text-gray-700"></i>
//       </button>
//     );

//     return buttons;
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
//       {/* Main Content */}
//       <div className="max-w-7xl mx-auto px-4 py-8">
//         {/* Search Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-4xl font-bold text-gray-900 mb-3">
//             Search Recipes
//           </h1>
//           <p className="text-lg text-gray-600">
//             Find the perfect recipe for your next meal
//           </p>
//         </div>

//         {/* Search Bar */}
//         <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
//           <div className="flex gap-3 mb-6">
//             <div className="flex-1 relative">
//               <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i>
//               <input
//                 type="text"
//                 placeholder="Search by recipe name, ingredient, or cuisine..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 onKeyPress={handleKeyPress}
//                 className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#2F855A] focus:outline-none text-base transition-colors"
//               />
//             </div>
//             <button
//               onClick={() => handleSearch(1)}
//               disabled={isSearching}
//               className="px-8 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
//             >
//               {isSearching ? (
//                 <i className="ri-loader-4-line text-xl animate-spin"></i>
//               ) : (
//                 'Search'
//               )}
//             </button>
//           </div>

//           {/* Filters */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Cuisine
//               </label>
//               <select
//                 value={selectedCuisine}
//                 onChange={(e) => setSelectedCuisine(e.target.value)}
//                 className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
//               >
//                 {cuisines.map((cuisine) => (
//                   <option key={cuisine} value={cuisine.toLowerCase()}>
//                     {cuisine}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Difficulty
//               </label>
//               <select
//                 value={selectedDifficulty}
//                 onChange={(e) => setSelectedDifficulty(e.target.value)}
//                 className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
//               >
//                 {difficulties.map((difficulty) => (
//                   <option key={difficulty} value={difficulty.toLowerCase()}>
//                     {difficulty}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Max Cooking Time
//               </label>
//               <select
//                 value={maxTime}
//                 onChange={(e) => setMaxTime(e.target.value)}
//                 className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
//               >
//                 {timeOptions.map((time) => (
//                   <option key={time} value={time === 'All' ? 'all' : parseInt(time)}>
//                     {time}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Results */}
//         {hasSearched && (
//           <div className="mb-6 flex items-center justify-between">
//             <h2 className="text-xl font-semibold text-gray-900">
//               {totalResults} {totalResults === 1 ? 'Recipe' : 'Recipes'} Found
//             </h2>
//             {totalPages > 0 && (
//               <p className="text-sm text-gray-600">
//                 Page {currentPage} of {totalPages}
//               </p>
//             )}
//           </div>
//         )}

//         {/* Recipe Grid */}
//         {hasSearched && searchResults.length > 0 && (
//           <>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
//               {searchResults.map((recipe) => (
//                 <div
//                   key={recipe.id}
//                   onClick={() => handleRecipeClick(recipe)}
//                   className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
//                 >
//                   <div className="relative w-full h-48 overflow-hidden">
//                     <img
//                       src={recipe.image}
//                       alt={recipe.name}
//                       className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
//                     />
//                     <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
//                       <i className="ri-star-fill text-amber-500 text-sm"></i>
//                       <span className="text-sm font-semibold text-gray-900">{recipe.rating}</span>
//                     </div>
//                   </div>

//                   <div className="p-4">
//                     <h3 className="font-semibold text-gray-900 mb-2 text-base line-clamp-2">
//                       {recipe.name}
//                     </h3>

//                     <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
//                       <div className="flex items-center gap-1">
//                         <i className="ri-time-line text-sm"></i>
//                         <span>{recipe.cookTime} min</span>
//                       </div>
//                       <div className="flex items-center gap-1">
//                         <i className="ri-user-line text-sm"></i>
//                         <span>{recipe.servings} servings</span>
//                       </div>
//                       <div className="flex items-center gap-1">
//                         <i className="ri-fire-line text-sm"></i>
//                         <span>{recipe.calories} cal</span>
//                       </div>
//                     </div>

//                     <div className="flex items-center justify-between mb-3">
//                       <span className="text-xs px-2 py-1 bg-[#2F855A]/10 text-[#2F855A] rounded-lg font-medium">
//                         {recipe.cuisine}
//                       </span>
//                       <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
//                         {recipe.difficulty}
//                       </span>
//                     </div>

//                     <div className="flex flex-wrap gap-1">
//                       {recipe.tags.slice(0, 2).map((tag, index) => (
//                         <span
//                           key={index}
//                           className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md"
//                         >
//                           {tag}
//                         </span>
//                       ))}
//                       {recipe.tags.length > 2 && (
//                         <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md">
//                           +{recipe.tags.length - 2}
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* Pagination */}
//             {totalPages > 1 && (
//               <div className="flex items-center justify-center gap-2">
//                 {renderPaginationButtons()}
//               </div>
//             )}
//           </>
//         )}

//         {/* Empty State */}
//         {hasSearched && searchResults.length === 0 && (
//           <div className="text-center py-16">
//             <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <i className="ri-search-line text-5xl text-gray-400"></i>
//             </div>
//             <h3 className="text-xl font-semibold text-gray-900 mb-2">
//               No Recipes Found
//             </h3>
//             <p className="text-gray-600 mb-6">
//               Try adjusting your filters or search terms
//             </p>
//             <button
//               onClick={() => {
//                 setSearchQuery('');
//                 setSelectedCuisine('all');
//                 setSelectedDifficulty('all');
//                 setMaxTime('all');
//                 setHasSearched(false);
//                 setSearchResults([]);
//                 setCurrentPage(1);
//                 setTotalPages(0);
//                 setTotalResults(0);
//               }}
//               className="px-6 py-2 bg-[#2F855A] text-white rounded-lg hover:bg-[#276749] transition-colors cursor-pointer whitespace-nowrap"
//             >
//               Clear Filters
//             </button>
//           </div>
//         )}

//         {/* Initial State */}
//         {!hasSearched && (
//           <div className="text-center py-16">
//             <div className="w-24 h-24 bg-gradient-to-br from-[#2F855A]/10 to-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
//               <i className="ri-restaurant-line text-5xl text-[#2F855A]"></i>
//             </div>
//             <h3 className="text-xl font-semibold text-gray-900 mb-2">
//               Start Your Recipe Search
//             </h3>
//             <p className="text-gray-600 max-w-md mx-auto">
//               Enter a recipe name, ingredient, or cuisine to discover delicious recipes tailored to your preferences
//             </p>
//           </div>
//         )}
//       </div>

//       {/* Success Toast Notification */}
//       {showSuccessToast && (
//         <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
//           <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 border-2 border-[#2F855A] min-w-[320px]">
//             <div className="w-12 h-12 flex items-center justify-center bg-[#2F855A] rounded-full flex-shrink-0">
//               <i className="ri-check-line text-2xl text-white"></i>
//             </div>
//             <div className="flex-1">
//               <p className="text-sm font-semibold text-gray-900">{successMessage}</p>
//               <p className="text-xs text-gray-600 mt-0.5">View your cart to continue</p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Shopping Cart Modal */}
//       {showCart && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//             <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
//               <div className="flex items-center justify-between mb-2">
//                 <h3 className="text-xl font-bold text-gray-900">Shopping Cart</h3>
//                 <button
//                   onClick={() => setShowCart(false)}
//                   className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
//                 >
//                   <i className="ri-close-line text-xl text-gray-600"></i>
//                 </button>
//               </div>
//               <p className="text-sm text-gray-600">
//                 {cartRecipes.length} {cartRecipes.length === 1 ? 'recipe' : 'recipes'} in your cart
//               </p>
//             </div>

//             <div className="p-6">
//               {cartRecipes.length === 0 ? (
//                 <div className="text-center py-12">
//                   <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                     <i className="ri-shopping-cart-line text-4xl text-gray-400"></i>
//                   </div>
//                   <h4 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h4>
//                   <p className="text-sm text-gray-600">Start adding recipes to build your shopping list</p>
//                 </div>
//               ) : (
//                 <>
//                   <div className="space-y-4 mb-6">
//                     {cartRecipes.map((recipe) => (
//                       <div
//                         key={recipe.id}
//                         className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-all"
//                       >
//                         <div className="flex items-start gap-4">
//                           <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
//                             <img
//                               src={recipe.image}
//                               alt={recipe.name}
//                               className="w-full h-full object-cover object-top"
//                             />
//                           </div>
//                           <div className="flex-1 min-w-0">
//                             <h4 className="font-semibold text-gray-900 mb-1">{recipe.name}</h4>
//                             <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
//                               <span className="flex items-center gap-1">
//                                 <i className="ri-time-line"></i>
//                                 {recipe.cookTime}m
//                               </span>
//                               <span className="flex items-center gap-1">
//                                 <i className="ri-restaurant-line"></i>
//                                 {recipe.servings} servings
//                               </span>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <span className="text-xs px-2 py-1 bg-[#2F855A]/10 text-[#2F855A] rounded-lg font-medium">
//                                 {recipe.cuisine}
//                               </span>
//                               <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
//                                 {recipe.ingredients.length} ingredients
//                               </span>
//                             </div>
//                           </div>
//                           <button
//                             onClick={() => handleRemoveFromCart(recipe.id)}
//                             className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
//                             title="Remove from cart"
//                           >
//                             <i className="ri-delete-bin-line text-lg text-red-500"></i>
//                           </button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>

//                   <button
//                     onClick={handleGoToShoppingList}
//                     className="w-full py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
//                   >
//                     <i className="ri-shopping-cart-line text-xl"></i>
//                     <span>Go to Shopping List</span>
//                   </button>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Ingredient Selection Modal */}
//       {showIngredientModal && currentRecipe && currentIngredient && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//             <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
//               <div className="flex items-center justify-between mb-2">
//                 <h3 className="text-xl font-bold text-gray-900">Select Product</h3>
//                 <span className="text-sm text-gray-600">
//                   {currentIngredientIndex + 1} of {currentRecipe.ingredients.length}
//                 </span>
//               </div>
//               <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
//                 <div 
//                   className="bg-gradient-to-r from-[#2F855A] to-emerald-600 h-2 rounded-full transition-all"
//                   style={{ width: `${((currentIngredientIndex + 1) / currentRecipe.ingredients.length) * 100}%` }}
//                 ></div>
//               </div>
//               <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
//                 <h4 className="text-lg font-bold text-gray-900 mb-1">{currentIngredient.name}</h4>
//                 <p className="text-sm text-gray-600">Amount needed: <span className="font-semibold text-[#2F855A]">{currentIngredient.amount}</span></p>
//               </div>
//             </div>

//             <div className="p-6">
//               {/* Already Have Button */}
//               <button
//                 onClick={() => handleSelectProduct(currentIngredient.id, 'already-have')}
//                 className="w-full mb-4 p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
//               >
//                 <i className="ri-checkbox-circle-line text-2xl"></i>
//                 <span className="font-semibold">Already Have This Ingredient</span>
//               </button>

//               <div className="relative mb-4">
//                 <div className="absolute inset-0 flex items-center">
//                   <div className="w-full border-t border-gray-300"></div>
//                 </div>
//                 <div className="relative flex justify-center text-sm">
//                   <span className="px-4 bg-white text-gray-500">or choose a product</span>
//                 </div>
//               </div>

//               <div className="flex items-center justify-between mb-4">
//                 <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Available products:</h5>
//                 {hasMoreProducts && (
//                   <span className="text-xs text-gray-500">
//                     {currentIngredient.products.length} options available
//                   </span>
//                 )}
//               </div>
              
//               <div className="space-y-3">
//                 {displayedProducts?.map((product) => (
//                   <button
//                     key={product.id}
//                     onClick={() => handleSelectProduct(currentIngredient.id, product)}
//                     className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl hover:bg-emerald-50 hover:border-[#2F855A] transition-all text-left cursor-pointer group"
//                   >
//                     <div className="flex items-center gap-4">
//                       <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
//                         <img
//                           src={product.image}
//                           alt={product.name}
//                           className="w-full h-full object-cover"
//                         />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <div className="font-semibold text-gray-900 mb-1">{product.name}</div>
//                         <div className="text-sm text-gray-600 mb-2">{product.brand}</div>
//                         <div className="flex items-center gap-3">
//                           <span className="text-sm font-medium text-gray-700">{product.weight}{product.unit}</span>
//                           <span className="text-lg font-bold text-[#2F855A]">${product.price.toFixed(2)}</span>
//                         </div>
//                       </div>
//                       <i className="ri-arrow-right-line text-2xl text-gray-400 group-hover:text-[#2F855A] transition-colors"></i>
//                     </div>
//                   </button>
//                 ))}
//               </div>

//               {hasMoreProducts && !showAllProducts && (
//                 <button
//                   onClick={() => setShowAllProducts(true)}
//                   className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
//                 >
//                   <i className="ri-arrow-down-s-line text-xl"></i>
//                   <span>Show {currentIngredient.products.length - INITIAL_PRODUCTS_SHOWN} More Products</span>
//                 </button>
//               )}

//               {hasMoreProducts && showAllProducts && (
//                 <button
//                   onClick={() => setShowAllProducts(false)}
//                   className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
//                 >
//                   <i className="ri-arrow-up-s-line text-xl"></i>
//                   <span>Show Less</span>
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Review Modal */}
//       {showReviewModal && currentRecipe && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//             <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
//               <div className="flex items-center justify-between mb-2">
//                 <h3 className="text-xl font-bold text-gray-900">Review Your Selections</h3>
//                 <button
//                   onClick={() => {
//                     setShowReviewModal(false);
//                     setCurrentRecipe(null);
//                   }}
//                   className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
//                 >
//                   <i className="ri-close-line text-xl text-gray-600"></i>
//                 </button>
//               </div>
//               <p className="text-sm text-gray-600">Review and edit your product selections before adding to cart</p>
//             </div>

//             <div className="p-6">
//               {/* Recipe Info */}
//               <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-6 border border-emerald-200">
//                 <h4 className="text-lg font-bold text-gray-900 mb-1">{currentRecipe.name}</h4>
//                 <div className="flex items-center gap-4 text-sm text-gray-600">
//                   <span className="flex items-center gap-1">
//                     <i className="ri-restaurant-line"></i>
//                     {currentRecipe.servings} servings
//                   </span>
//                   <span className="flex items-center gap-1">
//                     <i className="ri-time-line"></i>
//                     {currentRecipe.cookTime}m
//                   </span>
//                   <span className="flex items-center gap-1">
//                     <i className="ri-fire-line"></i>
//                     {currentRecipe.calories} cal
//                   </span>
//                 </div>
//               </div>

//               {/* Selected Products List */}
//               <div className="space-y-3 mb-6">
//                 {currentRecipe.ingredients.map((ingredient) => {
//                   const selected = selectedProducts[ingredient.id];
//                   const isAlreadyHave = selected === 'already-have';
//                   const product = !isAlreadyHave && selected ? selected : null;

//                   return (
//                     <div
//                       key={ingredient.id}
//                       className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-all"
//                     >
//                       <div className="flex items-start justify-between mb-3">
//                         <div className="flex-1">
//                           <h5 className="font-semibold text-gray-900 mb-1">{ingredient.name}</h5>
//                           <p className="text-sm text-gray-600">Amount needed: {ingredient.amount}</p>
//                         </div>
//                         <button
//                           onClick={() => handleEditProduct(ingredient.id)}
//                           className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
//                         >
//                           <i className="ri-edit-line"></i>
//                           Edit
//                         </button>
//                       </div>

//                       {isAlreadyHave ? (
//                         <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
//                           <i className="ri-checkbox-circle-fill text-xl text-amber-600"></i>
//                           <span className="text-sm font-medium text-amber-900">Already have this ingredient</span>
//                         </div>
//                       ) : product ? (
//                         <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
//                           <div className="w-16 h-16 flex-shrink-0 bg-white rounded-lg overflow-hidden">
//                             <img
//                               src={product.image}
//                               alt={product.name}
//                               className="w-full h-full object-cover"
//                             />
//                           </div>
//                           <div className="flex-1 min-w-0">
//                             <div className="font-semibold text-gray-900 text-sm mb-0.5">{product.name}</div>
//                             <div className="text-xs text-gray-600 mb-1">{product.brand}</div>
//                             <div className="flex items-center gap-2">
//                               <span className="text-xs font-medium text-gray-700">{product.weight}{product.unit}</span>
//                               <span className="text-sm font-bold text-[#2F855A]">${product.price.toFixed(2)}</span>
//                             </div>
//                           </div>
//                         </div>
//                       ) : (
//                         <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
//                           <i className="ri-alert-line text-xl text-gray-400"></i>
//                           <span className="text-sm text-gray-600">No product selected</span>
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>

//               {/* Total Price */}
//               <div className="bg-gradient-to-r from-[#2F855A] to-emerald-600 rounded-xl p-5 mb-6">
//                 <div className="flex items-center justify-between text-white">
//                   <div>
//                     <p className="text-sm opacity-90 mb-1">Total Cost</p>
//                     <p className="text-3xl font-bold">${calculateReviewTotal().toFixed(2)}</p>
//                   </div>
//                   <div className="w-16 h-16 flex items-center justify-center bg-white/20 rounded-full">
//                     <i className="ri-shopping-cart-line text-3xl"></i>
//                   </div>
//                 </div>
//                 <div className="mt-3 pt-3 border-t border-white/20">
//                   <p className="text-xs text-white/80">
//                     {currentRecipe.ingredients.filter(ing => selectedProducts[ing.id] === 'already-have').length} items you already have
//                   </p>
//                 </div>
//               </div>

//               {/* Action Buttons */}
//               <div className="flex gap-3">
//                 <button
//                   onClick={() => {
//                     setShowReviewModal(false);
//                     setCurrentRecipe(null);
//                   }}
//                   className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleConfirmRecipe}
//                   className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
//                 >
//                   <i className="ri-check-line text-xl"></i>
//                   <span>Add to Cart</span>
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
// -----------------------------------------------------------------------
// -----------------------------------------------------------------------
// -----------------------------------------------------------------------
// -----------------------------------------------------------------------
import { useState, useEffect } from 'react';
import { recipeApi, Recipe, RecipeSearchResult } from '../../api/search/recipeApi';
import { productsApi, ShoppingListResponse, IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';
import { CartItem, shoppingListApi } from "@/api/shopping-list/shoppingCartApi";
import { userApi } from '@/api/search-product/userApi';

// Extend Recipe to include the rich product data we fetch on click
interface UIRecipe extends Recipe {
  richIngredients: IngredientGroup[] | null;
}

export default function Search() {
  // --- Search & Filter State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [maxTime, setMaxTime] = useState('all');
  const [searchResults, setSearchResults] = useState<UIRecipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  // --- Modal & Selection State ---
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<UIRecipe | null>(null);
  const [currentIngredientIndex, setCurrentIngredientIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, Product | 'already-have'>>({});
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // --- Market & Loading State ---
  const [marketId, setMarketId] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const ITEMS_PER_PAGE = 12;

  const cuisines = ['All', 'Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian', 'Thai', 'French', 'Japanese'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const timeOptions = ['All', '15 min', '30 min', '45 min', '60 min', '60+ min'];

  // 1. Initial Load: Get User's Market
  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const id = await userApi.getUserMarketId();
        if (id) setMarketId(id);
      } catch (err) {
        console.error("Failed to fetch market preference");
      }
    };
    fetchMarket();
    // Optional: Load initial recipes
    handleSearch(1);
  }, []);

  // 2. Search Logic
  const handleSearch = async (page: number = 1) => {
    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(page);

    try {
      const response = await recipeApi.searchRecipes({
        query: searchQuery,
        cuisine: selectedCuisine,
        difficulty: selectedDifficulty,
        maxTime: maxTime,
        page: page
      });

      // Map backend response to UI
      const mappedRecipes: UIRecipe[] = response.recipes.map((r: any) => ({
        id: r.id,
        title: r.title, // Go backend uses title
        name: r.title,  // Frontend legacy support
        image: r.image || "https://placehold.co/600x400?text=No+Image",
        cook_time: r.cook_time || r.total_time || 0,
        prep_time: r.prep_time || 0,
        total_time: r.total_time || 0,
        yields: r.yields || r.nutrients?.servingSize || "4",
        difficulty: r.difficulty || 'Medium',
        cuisine: r.cuisine || 'International',
        keywords: r.keywords || [],
        rating: r.ratings || r.rating || 0,
        calories: r.nutrients?.calories || "0 kcal",
        nutrients: {
            calories: r.nutrients?.calories || "0",
            servingSize: r.yields || "4"
        },
        description: r.description,
        instructions: r.instructions || "",
        ingredients: r.ingredients || [],
        richIngredients: null // Will be loaded on click
      }));

      setTotalResults(response.total_count);
      setTotalPages(response.total_pages);
      setSearchResults(mappedRecipes);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("Failed to search recipes:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Handle Recipe Click -> Load Products -> Open Detail Modal
  const handleRecipeClick = async (recipe: UIRecipe) => {
    // Set basic recipe info first so modal can open
    setCurrentRecipe(recipe);
    setShowRecipeDetailModal(true);

    // If rich ingredients aren't loaded, fetch them
    if (!recipe.richIngredients) {
      setLoadingProducts(true);
      try {
        // Use hardcoded market ID fallback if user has none
        const targetMarketId = marketId || 1160; 
        const listResponse: ShoppingListResponse = await productsApi.generateShoppingList(targetMarketId, [recipe.id]);
        
        // Update local state and the list of recipes
        const updatedRecipe = { ...recipe, richIngredients: listResponse.items };
        setCurrentRecipe(updatedRecipe);
        
        setSearchResults(prev => prev.map(r => r.id === recipe.id ? updatedRecipe : r));
      } catch (err) {
        console.error("Error loading products", err);
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  // 4. Start Shopping Flow (from Detail Modal)
  const handleStartShopping = () => {
    setShowRecipeDetailModal(false);
    setShowIngredientModal(true);
    setCurrentIngredientIndex(0);
    setSelectedProducts({});
    setProductQuantities({});
  };

  // 5. Quantity & Selection Logic
  const handleQuantityChange = (productId: number, change: number) => {
    setProductQuantities(prev => {
      const currentQty = prev[productId] || 0;
      return { ...prev, [productId]: Math.max(0, currentQty + change) };
    });
  };

  const handleSelectProduct = (ingredientId: number, product: Product | 'already-have') => {
    setSelectedProducts(prev => ({ ...prev, [ingredientId]: product }));

    // Auto-advance logic
    if (!isEditing && currentRecipe?.richIngredients && currentIngredientIndex < currentRecipe.richIngredients.length - 1) {
      setCurrentIngredientIndex(currentIngredientIndex + 1);
      setShowAllProducts(false);
    } else {
      setShowIngredientModal(false);
      setShowReviewModal(true);
      setShowAllProducts(false);
    }
  };

  const handleEditProduct = (ingredientId: number) => {
    const index = currentRecipe?.richIngredients?.findIndex(ing => ing.ingredientId === ingredientId);
    if (index !== undefined && index !== -1) {
      setIsEditing(true);
      setCurrentIngredientIndex(index);
      setShowReviewModal(false);
      setShowIngredientModal(true);
    }
  };

  const calculateTotalCost = () => {
    if (!currentRecipe?.richIngredients) return 0;
    return currentRecipe.richIngredients.reduce((total, ing) => {
      const selected = selectedProducts[ing.ingredientId];
      if (selected && selected !== 'already-have') {
        return total + (selected.price * (productQuantities[selected.id] || 1));
      }
      return total;
    }, 0);
  };

  // 6. Final Submission
  const handleConfirmShoppingList = async () => {
    if (!currentRecipe) return;

    const itemsToAdd: CartItem[] = Object.entries(selectedProducts)
      .filter(([_, product]) => product !== 'already-have')
      .map(([_, product]) => ({
        product_id: (product as Product).id,
        quantity: productQuantities[(product as Product).id] || 1,
        recipe_id: currentRecipe.id,
      }));

    try {
      await shoppingListApi.addItemsToShoppingList(itemsToAdd);
      
      setSuccessMessage(`${currentRecipe.title} added to your list! 🎉`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      setShowReviewModal(false);
      setCurrentRecipe(null);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to add items", err);
      alert("Failed to add items to shopping list");
    }
  };

  // --- Render Helpers ---
  const currentIngredientGroup = currentRecipe?.richIngredients?.[currentIngredientIndex];
  const INITIAL_SHOWN = 3;
  const displayedOptions = showAllProducts 
    ? currentIngredientGroup?.options 
    : currentIngredientGroup?.options.slice(0, INITIAL_SHOWN);
  const hasMore = (currentIngredientGroup?.options.length || 0) > INITIAL_SHOWN;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) handleSearch(page);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Header & Search Bar */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
             <div className="relative flex-1">
              <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl"></i>
              <input
                type="text"
                placeholder="Search for recipes (e.g., Pasta, Curry)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
                className="w-full pl-12 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-[#2F855A] focus:bg-white transition-all text-gray-900 placeholder-gray-500"
              />
            </div>
            <button
              onClick={() => handleSearch(1)}
              disabled={isSearching}
              className="px-8 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-[#276749] hover:to-emerald-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-70"
            >
              {isSearching ? <i className="ri-loader-4-line animate-spin text-xl"></i> : 'Search'}
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* Cuisine Filter */}
            <div className="relative group">
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
            </div>
            
            {/* Difficulty Filter */}
            <div className="relative group">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
            </div>

            {/* Time Filter */}
            <div className="relative group">
              <select
                value={maxTime}
                onChange={(e) => setMaxTime(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700 border-none focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {timeOptions.map(t => <option key={t} value={t === 'All' ? 'all' : t.replace(' min', '')}>{t}</option>)}
              </select>
              <i className="ri-time-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-emerald-100 border-t-[#2F855A] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Finding delicious recipes...</p>
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Found {totalResults} recipes
              </h2>
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {searchResults.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => handleRecipeClick(recipe)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group border border-gray-100"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-gray-900 shadow-sm flex items-center gap-1">
                      <i className="ri-star-fill text-amber-400"></i>
                      {recipe.rating ? recipe.rating.toFixed(1) : 'New'}
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1 group-hover:text-[#2F855A] transition-colors">
                      {recipe.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <i className="ri-time-line"></i>
                        {recipe.total_time}m
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-fire-line"></i>
                        {recipe.calories}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-restaurant-line"></i>
                        {recipe.nutrients.servingSize}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recipe.keywords?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2">
               <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-arrow-left-s-line text-xl"></i>
                </button>
                <span className="font-bold text-gray-700">Page {currentPage}</span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-arrow-right-s-line text-xl"></i>
                </button>
            </div>
          </>
        ) : hasSearched ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-search-line text-4xl text-gray-400"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No recipes found</h3>
            <p className="text-gray-500">Try adjusting your search terms or filters</p>
          </div>
        ) : (
          <div className="text-center py-20">
             <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-restaurant-line text-4xl text-[#2F855A]"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to cook?</h3>
            <p className="text-gray-500">Search for recipes to get started</p>
          </div>
        )}
      </div>

      {/* -------- 1. Recipe Detail Modal -------- */}
      {showRecipeDetailModal && currentRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative w-full h-72">
              <img src={currentRecipe.image} className="w-full h-full object-cover" alt={currentRecipe.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <button 
                onClick={() => setShowRecipeDetailModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/40 transition-colors text-white"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h2 className="text-3xl font-bold mb-2">{currentRecipe.title}</h2>
                <div className="flex gap-2">
                    {currentRecipe.keywords?.slice(0,4).map((tag, i) => (
                         <span key={i} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">{tag}</span>
                    ))}
                </div>
              </div>
            </div>
            
            <div className="p-8">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-emerald-50 p-4 rounded-xl text-center">
                     <i className="ri-time-line text-[#2F855A] text-2xl mb-1"></i>
                     <div className="text-sm text-gray-500">Total Time</div>
                     <div className="font-bold">{currentRecipe.total_time} min</div>
                  </div>
                   <div className="bg-orange-50 p-4 rounded-xl text-center">
                     <i className="ri-fire-line text-orange-500 text-2xl mb-1"></i>
                     <div className="text-sm text-gray-500">Calories</div>
                     <div className="font-bold">{currentRecipe.nutrients?.calories}</div>
                  </div>
                   <div className="bg-blue-50 p-4 rounded-xl text-center">
                     <i className="ri-restaurant-line text-blue-500 text-2xl mb-1"></i>
                     <div className="text-sm text-gray-500">Servings</div>
                     <div className="font-bold">{currentRecipe.nutrients.servingSize}</div>
                  </div>
                   <div className="bg-purple-50 p-4 rounded-xl text-center">
                     <i className="ri-star-line text-purple-500 text-2xl mb-1"></i>
                     <div className="text-sm text-gray-500">Rating</div>
                     <div className="font-bold">{currentRecipe.rating.toFixed(1)}</div>
                  </div>
               </div>

               <div className="mb-8">
                 <h3 className="text-xl font-bold mb-3">Description</h3>
                 <p className="text-gray-600 leading-relaxed">{currentRecipe.description}</p>
               </div>

               {/* {currentRecipe.instructions && (
                   <div className="mb-8">
                     <h3 className="text-xl font-bold mb-3">Instructions</h3>
                     <div className="space-y-3">
                        {currentRecipe.instructions.split('\n').map((step, idx) => (
                            step.trim() && (
                                <div key={idx} className="flex gap-4">
                                    <span className="w-6 h-6 rounded-full bg-[#2F855A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</span>
                                    <p className="text-gray-700">{step}</p>
                                </div>
                            )
                        ))}
                     </div>
                   </div>
               )} */}

               <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    onClick={handleStartShopping}
                    disabled={loadingProducts || !currentRecipe.richIngredients}
                    className="px-8 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-[#276749] hover:to-emerald-700 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loadingProducts ? <i className="ri-loader-4-line animate-spin text-xl"></i> : <i className="ri-shopping-cart-line text-xl"></i>}
                    <span>{loadingProducts ? 'Loading Options...' : 'Select Products & Cook'}</span>
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* -------- 2. Ingredient Selection Modal -------- */}
      {showIngredientModal && currentRecipe && currentIngredientGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="text-xl font-bold">Choose Ingredient</h3>
                   <span className="text-sm text-gray-500">{currentIngredientIndex + 1} of {currentRecipe.richIngredients.length}</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 h-2 rounded-full mb-4">
                   <div 
                     className="bg-[#2F855A] h-2 rounded-full transition-all duration-300"
                     style={{ width: `${((currentIngredientIndex + 1) / currentRecipe.richIngredients.length) * 100}%` }}
                   ></div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                   <h4 className="font-bold text-gray-900 text-lg">{currentIngredientGroup.ingredientName}</h4>
                   <p className="text-sm text-gray-600">Needed: <span className="font-semibold text-[#2F855A]">{currentIngredientGroup.totalAmountNeeded}</span></p>
                </div>
             </div>

             <div className="p-6">
                <button
                  onClick={() => handleSelectProduct(currentIngredientGroup.ingredientId, 'already-have')}
                  className="w-full mb-6 py-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-semibold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                >
                  <i className="ri-checkbox-circle-line text-xl"></i>
                  I already have this
                </button>
                
                <div className="text-center text-sm text-gray-400 mb-6 font-medium">OR SELECT A PRODUCT</div>

                <div className="space-y-4">
                  {displayedOptions?.map(opt => {
                    const product = opt.product;
                    const qty = productQuantities[product.id] || 0;
                    return (
                       <div key={product.id} className="border-2 border-gray-100 rounded-xl p-4 hover:border-[#2F855A] transition-colors bg-white">
                          <div className="flex gap-4">
                             <img src={product.imageUrl} alt={product.name} className="w-20 h-20 object-cover rounded-lg bg-gray-100" />
                             <div className="flex-1">
                                <h5 className="font-bold text-gray-900">{product.name}</h5>
                                <p className="text-sm text-gray-500 mb-2">REWE</p>
                                <div className="flex items-center gap-2">
                                   <span className="text-lg font-bold text-[#2F855A]">{(product.price / 100).toFixed(2)}€</span>
                                   <span className="text-sm text-gray-400">/ {product.grammage}</span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                             <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleQuantityChange(product.id, -1)}
                                  className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:border-[#2F855A]"
                                >-</button>
                                <span className="font-bold w-6 text-center">{qty}</span>
                                <button 
                                  onClick={() => handleQuantityChange(product.id, 1)}
                                  className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:border-[#2F855A]"
                                >+</button>
                             </div>
                             <button
                               onClick={() => handleSelectProduct(currentIngredientGroup.ingredientId, product)}
                               disabled={qty === 0}
                               className="px-4 py-2 bg-[#2F855A] text-white rounded-lg text-sm font-bold hover:bg-[#276749] disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               {qty > 0 ? `Add ${qty}` : 'Select Qty'}
                             </button>
                          </div>
                       </div>
                    );
                  })}
                </div>
                
                {hasMore && (
                    <button 
                      onClick={() => setShowAllProducts(!showAllProducts)}
                      className="w-full mt-4 py-3 text-gray-500 font-medium hover:text-[#2F855A]"
                    >
                      {showAllProducts ? 'Show Less' : 'Show More Options'}
                    </button>
                )}
             </div>
          </div>
        </div>
      )}

      {/* -------- 3. Review Modal -------- */}
      {showReviewModal && currentRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold">Review Shopping List</h3>
                <button onClick={() => setShowReviewModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"><i className="ri-close-line"></i></button>
             </div>
             
             <div className="p-6">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl mb-6 border border-emerald-100">
                   <h4 className="font-bold text-lg mb-1">{currentRecipe.title}</h4>
                   <div className="flex gap-4 text-sm text-gray-600">
                      <span><i className="ri-time-line"></i> {currentRecipe.total_time}m</span>
                      <span><i className="ri-restaurant-line"></i> {currentRecipe.nutrients.servingSize} servings</span>
                   </div>
                </div>

                <div className="space-y-3 mb-8">
                   {currentRecipe.richIngredients?.map(ing => {
                      const selection = selectedProducts[ing.ingredientId];
                      const isHave = selection === 'already-have';
                      const product = !isHave ? selection as Product : null;
                      
                      return (
                        <div key={ing.ingredientId} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-emerald-200 transition-colors">
                           <div>
                              <p className="font-bold text-gray-800">{ing.ingredientName}</p>
                              {isHave ? (
                                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-medium">Have at home</span>
                              ) : product ? (
                                <div className="text-sm text-gray-500 mt-1">
                                   {productQuantities[product.id]}x {product.name}
                                </div>
                              ) : <span className="text-xs text-red-400">No selection</span>}
                           </div>
                           <button onClick={() => handleEditProduct(ing.ingredientId)} className="text-sm text-[#2F855A] font-medium underline">Edit</button>
                        </div>
                      );
                   })}
                </div>

                <div className="bg-[#2F855A] text-white p-5 rounded-2xl flex justify-between items-center shadow-lg mb-6">
                   <div>
                      <p className="text-emerald-100 text-sm">Estimated Total</p>
                      <p className="text-3xl font-bold">{(calculateTotalCost() / 100).toFixed(2)}€</p>
                   </div>
                   <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <i className="ri-shopping-cart-2-line text-2xl"></i>
                   </div>
                </div>

                <button 
                  onClick={handleConfirmShoppingList}
                  className="w-full py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-[#276749] hover:to-emerald-700 transition-all"
                >
                  Add Items to Shopping List
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-down bg-white shadow-xl rounded-2xl p-4 border-2 border-[#2F855A] flex items-center gap-3">
           <div className="w-10 h-10 bg-[#2F855A] rounded-full flex items-center justify-center text-white"><i className="ri-check-line text-xl"></i></div>
           <div>
              <p className="font-bold text-gray-900">{successMessage}</p>
              <p className="text-xs text-gray-500">View your list in the shopping tab</p>
           </div>
        </div>
      )}
    </div>
  );
}
// import { useState, useEffect } from 'react';
// import { recipeApi, Recipe } from '../../api/search/recipeApi';
// import { productsApi, ShoppingListResponse, IngredientGroup, Product } from '@/api/recipe-swiper/productsApi';
// import { CartItem, shoppingListApi } from "@/api/shopping-list/shoppingCartApi";
// import { userApi } from '@/api/search-product/userApi';

// // Extend Recipe to include the rich product data we fetch on click
// interface UIRecipe extends Recipe {
//   richIngredients: IngredientGroup[] | null;
// }

// export default function Search() {
//   // --- Search & Filter State ---
//   const [searchQuery, setSearchQuery] = useState('');
  
//   // New Filters
//   const [maxTime, setMaxTime] = useState('all');
//   const [minRating, setMinRating] = useState('0'); // 0 = Any
//   const [maxCalories, setMaxCalories] = useState('2000'); // 2000 = Any (high cap)

//   const [searchResults, setSearchResults] = useState<UIRecipe[]>([]);
//   const [isSearching, setIsSearching] = useState(false);
//   const [hasSearched, setHasSearched] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(0);
//   const [totalResults, setTotalResults] = useState(0);

//   // --- Modal & Selection State ---
//   const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false);
//   const [showIngredientModal, setShowIngredientModal] = useState(false);
//   const [showReviewModal, setShowReviewModal] = useState(false);
//   const [currentRecipe, setCurrentRecipe] = useState<UIRecipe | null>(null);
//   const [currentIngredientIndex, setCurrentIngredientIndex] = useState(0);
//   const [selectedProducts, setSelectedProducts] = useState<Record<number, Product | 'already-have'>>({});
//   const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
//   const [showAllProducts, setShowAllProducts] = useState(false);
//   const [isEditing, setIsEditing] = useState(false);
  
//   // --- Market & Loading State ---
//   const [marketId, setMarketId] = useState<number | null>(null);
//   const [loadingProducts, setLoadingProducts] = useState(false);
//   const [showSuccessToast, setShowSuccessToast] = useState(false);
//   const [successMessage, setSuccessMessage] = useState('');

//   const ITEMS_PER_PAGE = 12;

//   // Filter Options
//   const timeOptions = ['All', '15 min', '30 min', '45 min', '60 min'];
//   const ratingOptions = [
//     { label: 'Any Rating', value: '0' },
//     { label: '3+ Stars', value: '3' },
//     { label: '4+ Stars', value: '4' },
//     { label: '4.5+ Stars', value: '4.5' },
//   ];
//   const calorieOptions = [
//     { label: 'Any Calories', value: '2000' },
//     { label: '< 400 kcal', value: '400' },
//     { label: '< 600 kcal', value: '600' },
//     { label: '< 800 kcal', value: '800' },
//   ];

//   // 1. Initial Load
//   useEffect(() => {
//     const fetchMarket = async () => {
//       try {
//         const id = await userApi.getUserMarketId();
//         if (id) setMarketId(id);
//       } catch (err) {
//         console.error("Failed to fetch market preference");
//       }
//     };
//     fetchMarket();
//     handleSearch(1);
//   }, []);

//   // 2. Search Logic
//   const handleSearch = async (page: number = 1) => {
//     setIsSearching(true);
//     setHasSearched(true);
//     setCurrentPage(page);

//     try {
//       // Note: You might need to update your recipeApi.ts interface to accept rating/calories
//       // For now, we are passing them, assuming the backend or API client will handle/ignore them.
//       const response = await recipeApi.searchRecipes({
//         query: searchQuery,
//         cuisine: 'all', // Removed from UI, sending default
//         difficulty: 'all', // Removed from UI, sending default
//         maxTime: maxTime,
//         page: page,
//         // Passing new params (ensure your API client supports these if you updated it)
//         // @ts-ignore 
//         minRating: minRating,
//         // @ts-ignore
//         maxCalories: maxCalories
//       });

//       const mappedRecipes: UIRecipe[] = response.recipes.map((r: any) => ({
//         id: r.id,
//         title: r.title,
//         name: r.title,
//         image: r.image || "https://placehold.co/600x400?text=No+Image",
//         cook_time: r.cook_time || r.total_time || 0,
//         prep_time: r.prep_time || 0,
//         total_time: r.total_time || 0,
//         yields: r.yields || r.nutrients?.servingSize || "4",
//         difficulty: r.difficulty || 'Medium',
//         cuisine: r.cuisine || 'International',
//         keywords: r.keywords || [],
//         rating: r.ratings || r.rating || 0,
//         calories: r.nutrients?.calories || "0",
//         nutrients: {
//             calories: r.nutrients?.calories || "0",
//             servingSize: r.yields || "4"
//         },
//         description: r.description,
//         instructions: r.instructions || "",
//         ingredients: r.ingredients || [],
//         richIngredients: null 
//       }));

//       // Client-side filtering fallback (if backend doesn't support rating/calories yet)
//       let filtered = mappedRecipes;
      
//       if (minRating !== '0') {
//         filtered = filtered.filter(r => r.rating >= parseFloat(minRating));
//       }
//       if (maxCalories !== '2000') {
//         filtered = filtered.filter(r => {
//             const cal = parseInt(r.calories.replace(/[^0-9]/g, '')) || 0;
//             return cal <= parseInt(maxCalories);
//         });
//       }

//       setTotalResults(response.total_count); // Note: total count might be off if we client-filter
//       setTotalPages(response.total_pages);
//       setSearchResults(filtered);
//       window.scrollTo({ top: 0, behavior: 'smooth' });

//     } catch (error) {
//       console.error("Failed to search recipes:", error);
//     } finally {
//       setIsSearching(false);
//     }
//   };

//   // 3. Handle Recipe Click -> Load Products
//   const handleRecipeClick = async (recipe: UIRecipe) => {
//     setCurrentRecipe(recipe);
//     setShowRecipeDetailModal(true);

//     if (!recipe.richIngredients) {
//       setLoadingProducts(true);
//       try {
//         const targetMarketId = marketId || 1160; 
//         const listResponse: ShoppingListResponse = await productsApi.generateShoppingList(targetMarketId, [recipe.id]);
        
//         const updatedRecipe = { ...recipe, richIngredients: listResponse.items };
//         setCurrentRecipe(updatedRecipe);
//         setSearchResults(prev => prev.map(r => r.id === recipe.id ? updatedRecipe : r));
//       } catch (err) {
//         console.error("Error loading products", err);
//       } finally {
//         setLoadingProducts(false);
//       }
//     }
//   };

//   // 4. Start Shopping Flow
//   const handleStartShopping = () => {
//     setShowRecipeDetailModal(false);
//     setShowIngredientModal(true);
//     setCurrentIngredientIndex(0);
//     setSelectedProducts({});
//     setProductQuantities({});
//   };

//   // 5. Quantity & Selection Logic
//   const handleQuantityChange = (productId: number, change: number) => {
//     setProductQuantities(prev => {
//       const currentQty = prev[productId] || 0;
//       return { ...prev, [productId]: Math.max(0, currentQty + change) };
//     });
//   };

//   const handleSelectProduct = (ingredientId: number, product: Product | 'already-have') => {
//     setSelectedProducts(prev => ({ ...prev, [ingredientId]: product }));

//     if (!isEditing && currentRecipe?.richIngredients && currentIngredientIndex < currentRecipe.richIngredients.length - 1) {
//       setCurrentIngredientIndex(currentIngredientIndex + 1);
//       setShowAllProducts(false);
//     } else {
//       setShowIngredientModal(false);
//       setShowReviewModal(true);
//       setShowAllProducts(false);
//     }
//   };

//   const handleEditProduct = (ingredientId: number) => {
//     const index = currentRecipe?.richIngredients?.findIndex(ing => ing.ingredientId === ingredientId);
//     if (index !== undefined && index !== -1) {
//       setIsEditing(true);
//       setCurrentIngredientIndex(index);
//       setShowReviewModal(false);
//       setShowIngredientModal(true);
//     }
//   };

//   const calculateTotalCost = () => {
//     if (!currentRecipe?.richIngredients) return 0;
//     return currentRecipe.richIngredients.reduce((total, ing) => {
//       const selected = selectedProducts[ing.ingredientId];
//       if (selected && selected !== 'already-have') {
//         return total + (selected.price * (productQuantities[selected.id] || 1));
//       }
//       return total;
//     }, 0);
//   };

//   const handleConfirmShoppingList = async () => {
//     if (!currentRecipe) return;

//     const itemsToAdd: CartItem[] = Object.entries(selectedProducts)
//       .filter(([_, product]) => product !== 'already-have')
//       .map(([_, product]) => ({
//         product_id: (product as Product).id,
//         quantity: productQuantities[(product as Product).id] || 1,
//         recipe_id: currentRecipe.id,
//       }));

//     try {
//       await shoppingListApi.addItemsToShoppingList(itemsToAdd);
      
//       setSuccessMessage(`${currentRecipe.title} added to your list! 🎉`);
//       setShowSuccessToast(true);
//       setTimeout(() => setShowSuccessToast(false), 3000);
      
//       setShowReviewModal(false);
//       setCurrentRecipe(null);
//       setIsEditing(false);
//     } catch (err) {
//       console.error("Failed to add items", err);
//       alert("Failed to add items to shopping list");
//     }
//   };

//   const currentIngredientGroup = currentRecipe?.richIngredients?.[currentIngredientIndex];
//   const INITIAL_SHOWN = 3;
//   const displayedOptions = showAllProducts 
//     ? currentIngredientGroup?.options 
//     : currentIngredientGroup?.options.slice(0, INITIAL_SHOWN);
//   const hasMore = (currentIngredientGroup?.options.length || 0) > INITIAL_SHOWN;

//   const handlePageChange = (page: number) => {
//     if (page >= 1 && page <= totalPages) handleSearch(page);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      
//       {/* Header & Search Bar - Styled like your swiper page */}
//       <div className="bg-white shadow-sm sticky top-0 z-40">
//         <div className="max-w-7xl mx-auto px-4 py-6">
          
//           {/* 1. Search Bar */}
//           <div className="flex items-center gap-3 mb-4">
//              <div className="relative flex-1 group">
//               <i className="ri-search-2-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl group-focus-within:text-[#2F855A] transition-colors"></i>
//               <input
//                 type="text"
//                 placeholder="What do you want to cook today?"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
//                 className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#2F855A] focus:bg-white focus:border-transparent transition-all text-gray-900 placeholder-gray-400 font-medium shadow-sm"
//               />
//             </div>
//             <button
//               onClick={() => handleSearch(1)}
//               disabled={isSearching}
//               className="px-6 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:from-[#276749] hover:to-emerald-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-70 flex items-center gap-2"
//             >
//               {isSearching ? <i className="ri-loader-4-line animate-spin text-xl"></i> : <i className="ri-search-line text-xl"></i>}
//             </button>
//           </div>

//           {/* 2. Simplified Filters (Time, Rating, Calories) */}
//           <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            
//             {/* Time Filter */}
//             <div className="relative group">
//               <select
//                 value={maxTime}
//                 onChange={(e) => setMaxTime(e.target.value)}
//                 className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:border-[#2F855A] transition-all shadow-sm"
//               >
//                 {timeOptions.map(t => <option key={t} value={t === 'All' ? 'all' : t.replace(' min', '')}>{t}</option>)}
//               </select>
//               <i className="ri-time-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
//             </div>

//             {/* Rating Filter */}
//             <div className="relative group">
//               <select
//                 value={minRating}
//                 onChange={(e) => setMinRating(e.target.value)}
//                 className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:border-[#2F855A] transition-all shadow-sm"
//               >
//                 {ratingOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
//               </select>
//               <i className="ri-star-line absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none"></i>
//             </div>

//             {/* Calories Filter */}
//             <div className="relative group">
//               <select
//                 value={maxCalories}
//                 onChange={(e) => setMaxCalories(e.target.value)}
//                 className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#2F855A] cursor-pointer hover:border-[#2F855A] transition-all shadow-sm"
//               >
//                  {calorieOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
//               </select>
//               <i className="ri-fire-line absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none"></i>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="max-w-7xl mx-auto px-4 py-8">
//         {isSearching ? (
//           <div className="flex flex-col items-center justify-center py-20">
//             <div className="w-16 h-16 border-4 border-emerald-100 border-t-[#2F855A] rounded-full animate-spin mb-4"></div>
//             <p className="text-gray-500 font-medium">Finding delicious recipes...</p>
//           </div>
//         ) : searchResults.length > 0 ? (
//           <>
//             <div className="flex items-center justify-between mb-6">
//               <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
//                 <i className="ri-sparkling-fill text-amber-400"></i>
//                 Found {totalResults} recipes
//               </h2>
//               <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
//                   Page {currentPage} of {totalPages}
//               </span>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
//               {searchResults.map((recipe) => (
//                 <div
//                   key={recipe.id}
//                   onClick={() => handleRecipeClick(recipe)}
//                   className="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group border border-gray-100 flex flex-col h-full"
//                 >
//                   {/* Image Section */}
//                   <div className="relative h-52 overflow-hidden">
//                     <img
//                       src={recipe.image}
//                       alt={recipe.title}
//                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
//                     />
//                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                    
//                     {/* Floating Rating Badge */}
//                     <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-gray-900 shadow-sm flex items-center gap-1">
//                       <i className="ri-star-fill text-amber-400 text-sm"></i>
//                       {recipe.rating ? recipe.rating.toFixed(1) : 'New'}
//                     </div>

//                     {/* Time Badge (Bottom Left) */}
//                     <div className="absolute bottom-3 left-3 flex items-center gap-2">
//                         <span className="bg-black/40 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
//                             <i className="ri-time-line"></i> {recipe.total_time}m
//                         </span>
//                     </div>
//                   </div>
                  
//                   {/* Content Section */}
//                   <div className="p-5 flex-1 flex flex-col">
//                     <h3 className="font-bold text-gray-900 text-lg mb-2 leading-tight group-hover:text-[#2F855A] transition-colors">
//                       {recipe.title}
//                     </h3>
                    
//                     {/* Metadata Row */}
//                     <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 mt-auto">
//                       <span className="flex items-center gap-1.5 font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
//                         <i className="ri-fire-line"></i>
//                         {recipe.nutrients.calories}
//                       </span>
//                       <span className="flex items-center gap-1.5">
//                         <i className="ri-user-smile-line"></i>
//                         {recipe.nutrients.servingSize}
//                       </span>
//                     </div>

//                     {/* Keywords / Tags Row */}
//                     <div className="flex flex-wrap gap-1.5 border-t border-gray-50 pt-3">
//                       {recipe.keywords?.slice(0, 3).map((tag, i) => (
//                         <span key={i} className="px-2.5 py-1 bg-gray-50 text-gray-500 text-xs rounded-lg font-medium border border-gray-100">
//                           {tag}
//                         </span>
//                       ))}
//                       {recipe.keywords && recipe.keywords.length > 3 && (
//                           <span className="px-2 py-1 text-gray-400 text-xs font-medium">+{recipe.keywords.length - 3}</span>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* Pagination */}
//             <div className="flex justify-center items-center gap-4 pb-10">
//                <button
//                   onClick={() => handlePageChange(currentPage - 1)}
//                   disabled={currentPage === 1}
//                   className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-[#2F855A] hover:bg-emerald-50 hover:text-[#2F855A] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
//                 >
//                   <i className="ri-arrow-left-s-line text-2xl"></i>
//                 </button>
//                 <span className="font-bold text-gray-700 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
//                     Page {currentPage}
//                 </span>
//                 <button
//                   onClick={() => handlePageChange(currentPage + 1)}
//                   disabled={currentPage === totalPages}
//                   className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-[#2F855A] hover:bg-emerald-50 hover:text-[#2F855A] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
//                 >
//                   <i className="ri-arrow-right-s-line text-2xl"></i>
//                 </button>
//             </div>
//           </>
//         ) : hasSearched ? (
//           <div className="text-center py-20">
//             <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <i className="ri-search-line text-4xl text-gray-400"></i>
//             </div>
//             <h3 className="text-xl font-bold text-gray-900 mb-2">No recipes found</h3>
//             <p className="text-gray-500">Try adjusting your filters (rating, calories, etc.)</p>
//           </div>
//         ) : (
//           <div className="text-center py-20">
//              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
//               <i className="ri-restaurant-line text-4xl text-[#2F855A]"></i>
//             </div>
//             <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to cook?</h3>
//             <p className="text-gray-500">Search for recipes to get started</p>
//           </div>
//         )}
//       </div>

//       {/* -------- 1. Recipe Detail Modal (Same as before) -------- */}
//       {showRecipeDetailModal && currentRecipe && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
//             <div className="relative w-full h-72">
//               <img src={currentRecipe.image} className="w-full h-full object-cover" alt={currentRecipe.title} />
//               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
//               <button 
//                 onClick={() => setShowRecipeDetailModal(false)}
//                 className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/40 transition-colors text-white"
//               >
//                 <i className="ri-close-line text-2xl"></i>
//               </button>
//               <div className="absolute bottom-6 left-6 right-6 text-white">
//                 <h2 className="text-3xl font-bold mb-3 leading-tight">{currentRecipe.title}</h2>
//                 <div className="flex flex-wrap gap-2">
//                     {currentRecipe.keywords?.slice(0,5).map((tag, i) => (
//                          <span key={i} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium border border-white/10">{tag}</span>
//                     ))}
//                 </div>
//               </div>
//             </div>
            
//             <div className="p-8">
//                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
//                   <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100">
//                      <i className="ri-time-line text-[#2F855A] text-2xl mb-1"></i>
//                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Time</div>
//                      <div className="font-bold text-gray-900 text-lg">{currentRecipe.total_time} min</div>
//                   </div>
//                    <div className="bg-orange-50 p-4 rounded-2xl text-center border border-orange-100">
//                      <i className="ri-fire-line text-orange-500 text-2xl mb-1"></i>
//                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Calories</div>
//                      <div className="font-bold text-gray-900 text-lg">{currentRecipe.nutrients?.calories}</div>
//                   </div>
//                    <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
//                      <i className="ri-restaurant-line text-blue-500 text-2xl mb-1"></i>
//                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Servings</div>
//                      <div className="font-bold text-gray-900 text-lg">{currentRecipe.nutrients.servingSize}</div>
//                   </div>
//                    <div className="bg-purple-50 p-4 rounded-2xl text-center border border-purple-100">
//                      <i className="ri-star-line text-purple-500 text-2xl mb-1"></i>
//                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Rating</div>
//                      <div className="font-bold text-gray-900 text-lg">{currentRecipe.rating.toFixed(1)}</div>
//                   </div>
//                </div>

//                <div className="mb-8">
//                  <h3 className="text-xl font-bold mb-3 text-gray-900">Description</h3>
//                  <p className="text-gray-600 leading-relaxed text-lg">{currentRecipe.description}</p>
//                </div>

//                {/* {currentRecipe.instructions && (
//                    <div className="mb-8">
//                      <h3 className="text-xl font-bold mb-4 text-gray-900">Instructions</h3>
//                      <div className="space-y-4">
//                         {currentRecipe.instructions.split('\n').map((step, idx) => (
//                             step.trim() && (
//                                 <div key={idx} className="flex gap-4">
//                                     <span className="w-8 h-8 rounded-full bg-[#2F855A] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm mt-0.5">{idx + 1}</span>
//                                     <p className="text-gray-700 leading-relaxed text-lg">{step}</p>
//                                 </div>
//                             )
//                         ))}
//                      </div>
//                    </div>
//                )} */}

//                <div className="flex justify-end pt-6 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
//                   <button
//                     onClick={handleStartShopping}
//                     disabled={loadingProducts || !currentRecipe.richIngredients}
//                     className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:from-[#276749] hover:to-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02]"
//                   >
//                     {loadingProducts ? <i className="ri-loader-4-line animate-spin text-xl"></i> : <i className="ri-shopping-cart-line text-xl"></i>}
//                     <span>{loadingProducts ? 'Loading Options...' : 'Select Products & Cook'}</span>
//                   </button>
//                </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* -------- 2. Ingredient Selection Modal (Same logic, slightly better UI) -------- */}
//       {showIngredientModal && currentRecipe && currentIngredientGroup && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
//                 <div className="flex justify-between items-center mb-2">
//                    <h3 className="text-xl font-bold text-gray-900">Choose Ingredient</h3>
//                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Step {currentIngredientIndex + 1} of {currentRecipe.richIngredients.length}</span>
//                 </div>
//                 {/* Progress Bar */}
//                 <div className="w-full bg-gray-100 h-2.5 rounded-full mb-6 overflow-hidden">
//                    <div 
//                      className="bg-gradient-to-r from-[#2F855A] to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
//                      style={{ width: `${((currentIngredientIndex + 1) / currentRecipe.richIngredients.length) * 100}%` }}
//                    ></div>
//                 </div>
//                 <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-center gap-4">
//                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">🥗</div>
//                    <div>
//                        <h4 className="font-bold text-gray-900 text-xl">{currentIngredientGroup.ingredientName}</h4>
//                        <p className="text-sm text-gray-600 mt-0.5">Needed for recipe: <span className="font-bold text-[#2F855A]">{currentIngredientGroup.totalAmountNeeded}</span></p>
//                    </div>
//                 </div>
//              </div>

//              <div className="p-6">
//                 <button
//                   onClick={() => handleSelectProduct(currentIngredientGroup.ingredientId, 'already-have')}
//                   className="w-full mb-8 py-4 bg-amber-50 text-amber-800 border-2 border-amber-100 rounded-2xl font-bold hover:bg-amber-100 hover:border-amber-200 transition-all flex items-center justify-center gap-3 shadow-sm group"
//                 >
//                   <div className="w-6 h-6 rounded-full border-2 border-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
//                       <i className="ri-check-line"></i>
//                   </div>
//                   I already have this at home
//                 </button>
                
//                 <div className="flex items-center gap-4 mb-6">
//                     <div className="h-px bg-gray-200 flex-1"></div>
//                     <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Or Select Product</span>
//                     <div className="h-px bg-gray-200 flex-1"></div>
//                 </div>

//                 <div className="space-y-4">
//                   {displayedOptions?.map(opt => {
//                     const product = opt.product;
//                     const qty = productQuantities[product.id] || 0;
//                     return (
//                        <div key={product.id} className={`border-2 rounded-2xl p-4 transition-all bg-white ${qty > 0 ? 'border-[#2F855A] shadow-md bg-emerald-50/30' : 'border-gray-100 hover:border-emerald-200'}`}>
//                           <div className="flex gap-4">
//                              <div className="w-24 h-24 rounded-xl bg-white border border-gray-100 p-2 flex-shrink-0">
//                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
//                              </div>
//                              <div className="flex-1 min-w-0">
//                                 <h5 className="font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{product.name}</h5>
//                                 <p className="text-xs font-bold text-gray-400 uppercase mb-2">REWE</p>
//                                 <div className="flex items-baseline gap-2">
//                                    <span className="text-xl font-bold text-[#2F855A]">{(product.price / 100).toFixed(2)}€</span>
//                                    <span className="text-sm text-gray-500 font-medium">/ {product.grammage}</span>
//                                 </div>
//                              </div>
//                           </div>
                          
//                           <div className="mt-4 flex items-center justify-between bg-gray-50 p-2 rounded-xl">
//                              <div className="flex items-center gap-1">
//                                 <button 
//                                   onClick={() => handleQuantityChange(product.id, -1)}
//                                   className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors font-bold text-lg shadow-sm disabled:opacity-50"
//                                   disabled={qty === 0}
//                                 >-</button>
//                                 <span className="font-bold w-10 text-center text-lg">{qty}</span>
//                                 <button 
//                                   onClick={() => handleQuantityChange(product.id, 1)}
//                                   className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-[#2F855A] hover:text-[#2F855A] transition-colors font-bold text-lg shadow-sm"
//                                 >+</button>
//                              </div>
//                              <button
//                                onClick={() => handleSelectProduct(currentIngredientGroup.ingredientId, product)}
//                                disabled={qty === 0}
//                                className="px-6 py-2.5 bg-[#2F855A] text-white rounded-xl text-sm font-bold hover:bg-[#276749] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95"
//                              >
//                                {qty > 0 ? `Select (${qty})` : 'Select Qty'}
//                              </button>
//                           </div>
//                        </div>
//                     );
//                   })}
//                 </div>
                
//                 {hasMore && (
//                     <button 
//                       onClick={() => setShowAllProducts(!showAllProducts)}
//                       className="w-full mt-4 py-3 text-gray-500 font-bold hover:text-[#2F855A] transition-colors bg-gray-50 rounded-xl"
//                     >
//                       {showAllProducts ? 'Show Less' : `Show ${currentIngredientGroup.options.length - 3} More Options`}
//                     </button>
//                 )}
//              </div>
//           </div>
//         </div>
//       )}

//       {/* -------- 3. Review Modal -------- */}
//       {showReviewModal && currentRecipe && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
//                 <h3 className="text-2xl font-bold text-gray-900">Review List</h3>
//                 <button onClick={() => setShowReviewModal(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"><i className="ri-close-line text-xl"></i></button>
//              </div>
             
//              <div className="p-6">
//                 <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl mb-8 border border-emerald-100 flex gap-4 items-center">
//                    <img src={currentRecipe.image} alt="" className="w-20 h-20 rounded-xl object-cover shadow-sm" />
//                    <div>
//                        <h4 className="font-bold text-xl mb-1 text-gray-900">{currentRecipe.title}</h4>
//                        <div className="flex gap-4 text-sm font-medium text-gray-600">
//                           <span><i className="ri-time-line"></i> {currentRecipe.total_time}m</span>
//                           <span><i className="ri-restaurant-line"></i> {currentRecipe.nutrients.servingSize}</span>
//                        </div>
//                    </div>
//                 </div>

//                 <div className="space-y-3 mb-8">
//                    {currentRecipe.richIngredients?.map(ing => {
//                       const selection = selectedProducts[ing.ingredientId];
//                       const isHave = selection === 'already-have';
//                       const product = !isHave ? selection as Product : null;
                      
//                       return (
//                         <div key={ing.ingredientId} className={`flex items-center justify-between p-4 border rounded-2xl transition-colors ${isHave ? 'bg-amber-50/50 border-amber-100' : 'border-gray-100 hover:border-emerald-200 bg-white'}`}>
//                            <div className="flex items-center gap-3">
//                               <div className={`w-2 h-2 rounded-full ${isHave ? 'bg-amber-400' : product ? 'bg-[#2F855A]' : 'bg-red-400'}`}></div>
//                               <div>
//                                   <p className="font-bold text-gray-900">{ing.ingredientName}</p>
//                                   {isHave ? (
//                                     <span className="text-xs text-amber-700 font-bold uppercase tracking-wider">Have at home</span>
//                                   ) : product ? (
//                                     <div className="text-sm text-gray-500 font-medium">
//                                        {productQuantities[product.id]}x {product.name}
//                                     </div>
//                                   ) : <span className="text-xs text-red-500 font-bold uppercase">No selection</span>}
//                               </div>
//                            </div>
//                            <button onClick={() => handleEditProduct(ing.ingredientId)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-[#2F855A] hover:text-white transition-colors">
//                                <i className="ri-pencil-line"></i>
//                            </button>
//                         </div>
//                       );
//                    })}
//                 </div>

//                 <div className="bg-gray-900 text-white p-6 rounded-3xl flex justify-between items-center shadow-xl mb-6">
//                    <div>
//                       <p className="text-gray-400 text-sm font-medium mb-1">Estimated Total</p>
//                       <p className="text-4xl font-bold">{(calculateTotalCost() / 100).toFixed(2)}€</p>
//                    </div>
//                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
//                       <i className="ri-shopping-cart-2-line text-2xl"></i>
//                    </div>
//                 </div>

//                 <button 
//                   onClick={handleConfirmShoppingList}
//                   className="w-full py-5 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-[#276749] hover:to-emerald-700 transition-all transform hover:scale-[1.01]"
//                 >
//                   Add Items to Shopping List
//                 </button>
//              </div>
//           </div>
//         </div>
//       )}

//       {/* Success Toast */}
//       {showSuccessToast && (
//         <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-down bg-white shadow-2xl rounded-2xl p-4 border border-emerald-100 flex items-center gap-4 min-w-[320px]">
//            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-[#2F855A] shadow-inner"><i className="ri-check-line text-2xl"></i></div>
//            <div>
//               <p className="font-bold text-gray-900 text-lg">Success!</p>
//               <p className="text-sm text-gray-500">{successMessage}</p>
//            </div>
//         </div>
//       )}
//     </div>
//   );
// }