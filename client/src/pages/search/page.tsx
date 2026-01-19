import { useState } from 'react';

interface Recipe {
    id: number;
    name: string;
    image: string;
    cookTime: number;
    servings: number;
    difficulty: string;
    cuisine: string;
    tags: string[];
    rating: number;
    calories: number;
}

export default function Search() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCuisine, setSelectedCuisine] = useState('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [maxTime, setMaxTime] = useState('all');
    const [searchResults, setSearchResults] = useState<Recipe[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalResults, setTotalResults] = useState(0);

    const ITEMS_PER_PAGE = 12;

    const cuisines = ['All', 'Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian', 'Thai', 'French', 'Japanese'];
    const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
    const timeOptions = ['All', '15 min', '30 min', '45 min', '60 min', '60+ min'];

    // Mock data for demonstration - expanded to show pagination
    const mockRecipes: Recipe[] = [
        {
            id: 1,
            name: 'Classic Margherita Pizza',
            image: 'https://readdy.ai/api/search-image?query=delicious%20homemade%20margherita%20pizza%20with%20fresh%20mozzarella%20basil%20and%20tomato%20sauce%20on%20wooden%20board%20rustic%20kitchen%20background%20simple%20ingredients%20artisan%20style%20food%20photography&width=400&height=300&seq=pizza001&orientation=landscape',
            cookTime: 25,
            servings: 4,
            difficulty: 'Intermediate',
            cuisine: 'Italian',
            tags: ['Vegetarian', 'Quick'],
            rating: 4.8,
            calories: 280
        },
        {
            id: 2,
            name: 'Spicy Chicken Tacos',
            image: 'https://readdy.ai/api/search-image?query=spicy%20grilled%20chicken%20tacos%20with%20fresh%20cilantro%20lime%20avocado%20and%20colorful%20vegetables%20on%20white%20plate%20vibrant%20mexican%20street%20food%20style%20clean%20background%20appetizing%20presentation&width=400&height=300&seq=tacos001&orientation=landscape',
            cookTime: 20,
            servings: 3,
            difficulty: 'Beginner',
            cuisine: 'Mexican',
            tags: ['High Protein', 'Spicy'],
            rating: 4.6,
            calories: 350
        },
        {
            id: 3,
            name: 'Creamy Mushroom Risotto',
            image: 'https://readdy.ai/api/search-image?query=creamy%20mushroom%20risotto%20with%20parmesan%20cheese%20fresh%20herbs%20in%20white%20bowl%20elegant%20italian%20comfort%20food%20presentation%20minimalist%20background%20restaurant%20quality%20plating&width=400&height=300&seq=risotto001&orientation=landscape',
            cookTime: 45,
            servings: 4,
            difficulty: 'Advanced',
            cuisine: 'Italian',
            tags: ['Vegetarian', 'Creamy'],
            rating: 4.9,
            calories: 420
        },
        {
            id: 4,
            name: 'Teriyaki Salmon Bowl',
            image: 'https://readdy.ai/api/search-image?query=grilled%20teriyaki%20salmon%20bowl%20with%20steamed%20rice%20edamame%20carrots%20and%20sesame%20seeds%20healthy%20japanese%20cuisine%20bright%20colors%20clean%20presentation%20nutritious%20meal%20prep%20style&width=400&height=300&seq=salmon001&orientation=landscape',
            cookTime: 30,
            servings: 2,
            difficulty: 'Intermediate',
            cuisine: 'Japanese',
            tags: ['High Protein', 'Healthy', 'Gluten-Free'],
            rating: 4.7,
            calories: 520
        },
        {
            id: 5,
            name: 'Greek Salad with Feta',
            image: 'https://readdy.ai/api/search-image?query=fresh%20greek%20salad%20with%20feta%20cheese%20olives%20tomatoes%20cucumbers%20red%20onion%20olive%20oil%20mediterranean%20diet%20healthy%20colorful%20ingredients%20white%20bowl%20sunlight%20natural%20styling&width=400&height=300&seq=salad001&orientation=landscape',
            cookTime: 10,
            servings: 2,
            difficulty: 'Beginner',
            cuisine: 'Mediterranean',
            tags: ['Vegetarian', 'Low Carb', 'Quick'],
            rating: 4.5,
            calories: 220
        },
        {
            id: 6,
            name: 'Butter Chicken Curry',
            image: 'https://readdy.ai/api/search-image?query=butter%20chicken%20curry%20in%20rich%20tomato%20cream%20sauce%20with%20fresh%20cilantro%20naan%20bread%20authentic%20indian%20cuisine%20aromatic%20spices%20warm%20colors%20traditional%20presentation%20clay%20bowl&width=400&height=300&seq=curry001&orientation=landscape',
            cookTime: 50,
            servings: 6,
            difficulty: 'Advanced',
            cuisine: 'Indian',
            tags: ['High Protein', 'Spicy'],
            rating: 4.9,
            calories: 480
        },
        {
            id: 7,
            name: 'Pad Thai Noodles',
            image: 'https://readdy.ai/api/search-image?query=pad%20thai%20noodles%20with%20shrimp%20peanuts%20lime%20bean%20sprouts%20colorful%20thai%20street%20food%20authentic%20presentation%20wok%20tossed%20asian%20cuisine%20vibrant%20ingredients%20wooden%20background&width=400&height=300&seq=padthai001&orientation=landscape',
            cookTime: 25,
            servings: 3,
            difficulty: 'Intermediate',
            cuisine: 'Thai',
            tags: ['High Protein', 'Quick'],
            rating: 4.6,
            calories: 450
        },
        {
            id: 8,
            name: 'French Onion Soup',
            image: 'https://readdy.ai/api/search-image?query=french%20onion%20soup%20with%20melted%20gruyere%20cheese%20toasted%20bread%20crock%20traditional%20bistro%20style%20rich%20caramelized%20onions%20elegant%20presentation%20rustic%20french%20cuisine%20comfort%20food&width=400&height=300&seq=soup001&orientation=landscape',
            cookTime: 60,
            servings: 4,
            difficulty: 'Intermediate',
            cuisine: 'French',
            tags: ['Comfort Food'],
            rating: 4.7,
            calories: 320
        },
        // Additional recipes for pagination demo
        {
            id: 9,
            name: 'Beef Stir Fry',
            image: 'https://readdy.ai/api/search-image?query=beef%20stir%20fry%20with%20colorful%20vegetables%20soy%20sauce%20ginger%20garlic%20in%20wok%20asian%20cuisine%20vibrant%20colors%20steam%20rising%20professional%20food%20photography&width=400&height=300&seq=stirfry001&orientation=landscape',
            cookTime: 20,
            servings: 4,
            difficulty: 'Beginner',
            cuisine: 'Asian',
            tags: ['High Protein', 'Quick'],
            rating: 4.5,
            calories: 380
        },
        {
            id: 10,
            name: 'Caprese Salad',
            image: 'https://readdy.ai/api/search-image?query=caprese%20salad%20with%20fresh%20mozzarella%20tomatoes%20basil%20balsamic%20glaze%20olive%20oil%20italian%20appetizer%20simple%20elegant%20presentation%20white%20plate&width=400&height=300&seq=caprese001&orientation=landscape',
            cookTime: 10,
            servings: 2,
            difficulty: 'Beginner',
            cuisine: 'Italian',
            tags: ['Vegetarian', 'Quick', 'Low Carb'],
            rating: 4.6,
            calories: 180
        },
        {
            id: 11,
            name: 'Chicken Fajitas',
            image: 'https://readdy.ai/api/search-image?query=sizzling%20chicken%20fajitas%20with%20bell%20peppers%20onions%20tortillas%20mexican%20cuisine%20colorful%20presentation%20cast%20iron%20skillet%20lime%20wedges%20cilantro&width=400&height=300&seq=fajitas001&orientation=landscape',
            cookTime: 25,
            servings: 4,
            difficulty: 'Beginner',
            cuisine: 'Mexican',
            tags: ['High Protein', 'Quick'],
            rating: 4.7,
            calories: 420
        },
        {
            id: 12,
            name: 'Vegetable Curry',
            image: 'https://readdy.ai/api/search-image?query=vegetable%20curry%20with%20chickpeas%20potatoes%20cauliflower%20in%20rich%20coconut%20curry%20sauce%20indian%20spices%20colorful%20vegetables%20white%20bowl%20basmati%20rice&width=400&height=300&seq=vegcurry001&orientation=landscape',
            cookTime: 35,
            servings: 4,
            difficulty: 'Intermediate',
            cuisine: 'Indian',
            tags: ['Vegetarian', 'Spicy', 'Healthy'],
            rating: 4.8,
            calories: 320
        },
        {
            id: 13,
            name: 'Sushi Rolls',
            image: 'https://readdy.ai/api/search-image?query=beautiful%20sushi%20rolls%20with%20fresh%20salmon%20avocado%20cucumber%20on%20black%20plate%20with%20soy%20sauce%20wasabi%20ginger%20japanese%20cuisine%20elegant%20presentation&width=400&height=300&seq=sushi001&orientation=landscape',
            cookTime: 45,
            servings: 2,
            difficulty: 'Advanced',
            cuisine: 'Japanese',
            tags: ['Healthy', 'Low Carb'],
            rating: 4.9,
            calories: 280
        },
        {
            id: 14,
            name: 'BBQ Ribs',
            image: 'https://readdy.ai/api/search-image?query=smoky%20bbq%20ribs%20with%20caramelized%20sauce%20on%20wooden%20board%20american%20barbecue%20cuisine%20tender%20meat%20coleslaw%20side%20dish%20rustic%20presentation&width=400&height=300&seq=ribs001&orientation=landscape',
            cookTime: 180,
            servings: 6,
            difficulty: 'Advanced',
            cuisine: 'American',
            tags: ['High Protein', 'Comfort Food'],
            rating: 4.8,
            calories: 650
        },
        {
            id: 15,
            name: 'Ramen Bowl',
            image: 'https://readdy.ai/api/search-image?query=authentic%20ramen%20bowl%20with%20pork%20belly%20soft%20boiled%20egg%20noodles%20green%20onions%20in%20rich%20broth%20japanese%20cuisine%20steam%20rising%20beautiful%20presentation&width=400&height=300&seq=ramen001&orientation=landscape',
            cookTime: 40,
            servings: 2,
            difficulty: 'Intermediate',
            cuisine: 'Japanese',
            tags: ['Comfort Food', 'High Protein'],
            rating: 4.9,
            calories: 520
        },
        {
            id: 16,
            name: 'Caesar Salad',
            image: 'https://readdy.ai/api/search-image?query=classic%20caesar%20salad%20with%20romaine%20lettuce%20parmesan%20cheese%20croutons%20creamy%20dressing%20white%20bowl%20elegant%20presentation%20fresh%20ingredients&width=400&height=300&seq=caesar001&orientation=landscape',
            cookTime: 15,
            servings: 2,
            difficulty: 'Beginner',
            cuisine: 'American',
            tags: ['Quick', 'Vegetarian'],
            rating: 4.4,
            calories: 280
        },
        {
            id: 17,
            name: 'Paella',
            image: 'https://readdy.ai/api/search-image?query=spanish%20paella%20with%20seafood%20chicken%20saffron%20rice%20colorful%20vegetables%20in%20traditional%20pan%20mediterranean%20cuisine%20vibrant%20colors%20authentic%20presentation&width=400&height=300&seq=paella001&orientation=landscape',
            cookTime: 60,
            servings: 6,
            difficulty: 'Advanced',
            cuisine: 'Mediterranean',
            tags: ['High Protein', 'Seafood'],
            rating: 4.9,
            calories: 480
        },
        {
            id: 18,
            name: 'Chicken Tikka Masala',
            image: 'https://readdy.ai/api/search-image?query=chicken%20tikka%20masala%20in%20creamy%20tomato%20sauce%20with%20naan%20bread%20indian%20cuisine%20aromatic%20spices%20garnished%20with%20cilantro%20white%20bowl%20restaurant%20quality&width=400&height=300&seq=tikka001&orientation=landscape',
            cookTime: 45,
            servings: 4,
            difficulty: 'Intermediate',
            cuisine: 'Indian',
            tags: ['High Protein', 'Spicy'],
            rating: 4.8,
            calories: 450
        },
        {
            id: 19,
            name: 'Beef Tacos',
            image: 'https://readdy.ai/api/search-image?query=beef%20tacos%20with%20seasoned%20ground%20beef%20lettuce%20tomatoes%20cheese%20sour%20cream%20mexican%20street%20food%20colorful%20presentation%20lime%20wedges&width=400&height=300&seq=beeftacos001&orientation=landscape',
            cookTime: 20,
            servings: 4,
            difficulty: 'Beginner',
            cuisine: 'Mexican',
            tags: ['High Protein', 'Quick'],
            rating: 4.6,
            calories: 380
        },
        {
            id: 20,
            name: 'Tom Yum Soup',
            image: 'https://readdy.ai/api/search-image?query=tom%20yum%20soup%20with%20shrimp%20mushrooms%20lemongrass%20chili%20thai%20cuisine%20spicy%20sour%20broth%20vibrant%20red%20color%20traditional%20bowl%20aromatic%20herbs&width=400&height=300&seq=tomyum001&orientation=landscape',
            cookTime: 30,
            servings: 4,
            difficulty: 'Intermediate',
            cuisine: 'Thai',
            tags: ['Spicy', 'Healthy', 'Low Carb'],
            rating: 4.7,
            calories: 180
        }
    ];

    const handleSearch = (page: number = 1) => {
        setIsSearching(true);
        setHasSearched(true);
        setCurrentPage(page);

        // Calculate offset for backend
        const offset = (page - 1) * ITEMS_PER_PAGE;

        // Simulate API call with pagination parameters
        console.log('Mock API Request:', {
            query: searchQuery,
            cuisine: selectedCuisine,
            difficulty: selectedDifficulty,
            maxTime: maxTime,
            limit: ITEMS_PER_PAGE,
            offset: offset,
            page: page
        });

        setTimeout(() => {
            let filtered = mockRecipes;

            // Filter by search query
            if (searchQuery.trim()) {
                filtered = filtered.filter(recipe =>
                    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    recipe.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            // Filter by cuisine
            if (selectedCuisine !== 'all') {
                filtered = filtered.filter(recipe => recipe.cuisine === selectedCuisine);
            }

            // Filter by difficulty
            if (selectedDifficulty !== 'all') {
                filtered = filtered.filter(recipe => recipe.difficulty === selectedDifficulty);
            }

            // Filter by time
            if (maxTime !== 'all') {
                const timeValue = parseInt(maxTime);
                filtered = filtered.filter(recipe => recipe.cookTime <= timeValue);
            }

            // Calculate pagination
            const total = filtered.length;
            const pages = Math.ceil(total / ITEMS_PER_PAGE);
            const startIndex = offset;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            const paginatedResults = filtered.slice(startIndex, endIndex);

            setTotalResults(total);
            setTotalPages(pages);
            setSearchResults(paginatedResults);
            setIsSearching(false);

            // Scroll to top of results
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 500);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(1);
        }
    };

    const handleRecipeClick = (recipeId: number) => {
        // Navigate to recipe detail page (to be implemented)
        console.log('Navigate to recipe:', recipeId);
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            handleSearch(page);
        }
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
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent cursor-pointer"
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
                    className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all font-medium text-gray-700 cursor-pointer"
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
                            ? 'bg-[#2F855A] border-[#2F855A] text-white'
                            : 'border-gray-200 text-gray-700 hover:border-[#2F855A] hover:bg-emerald-50'
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
                    className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all font-medium text-gray-700 cursor-pointer"
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
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-[#2F855A] hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent cursor-pointer"
            >
                <i className="ri-arrow-right-s-line text-xl text-gray-700"></i>
            </button>
        );

        return buttons;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => window.REACT_APP_NAVIGATE('/landing')}
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <img
                                src="https://public.readdy.ai/ai/img_res/b0724f47-0896-45dd-92da-e15712b65265.png"
                                alt="Recipe Recommender Logo"
                                className="h-12 w-auto"
                            />
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => window.REACT_APP_NAVIGATE('/recipe-swiper')}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                                title="Recipe Swiper"
                            >
                                <i className="ri-heart-line text-xl text-gray-700"></i>
                            </button>
                            <button
                                onClick={() => window.REACT_APP_NAVIGATE('/profile')}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#2F855A] hover:bg-[#276749] transition-colors cursor-pointer"
                            >
                                <i className="ri-user-line text-xl text-white"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Search Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        Search Recipes
                    </h1>
                    <p className="text-lg text-gray-600">
                        Find the perfect recipe for your next meal
                    </p>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="flex gap-3 mb-6">
                        <div className="flex-1 relative">
                            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i>
                            <input
                                type="text"
                                placeholder="Search by recipe name, ingredient, or cuisine..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#2F855A] focus:outline-none text-base transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => handleSearch(1)}
                            disabled={isSearching}
                            className="px-8 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                        >
                            {isSearching ? (
                                <i className="ri-loader-4-line text-xl animate-spin"></i>
                            ) : (
                                'Search'
                            )}
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cuisine
                            </label>
                            <select
                                value={selectedCuisine}
                                onChange={(e) => setSelectedCuisine(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
                            >
                                {cuisines.map((cuisine) => (
                                    <option key={cuisine} value={cuisine.toLowerCase()}>
                                        {cuisine}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Difficulty
                            </label>
                            <select
                                value={selectedDifficulty}
                                onChange={(e) => setSelectedDifficulty(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
                            >
                                {difficulties.map((difficulty) => (
                                    <option key={difficulty} value={difficulty.toLowerCase()}>
                                        {difficulty}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Cooking Time
                            </label>
                            <select
                                value={maxTime}
                                onChange={(e) => setMaxTime(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#2F855A] focus:outline-none text-sm cursor-pointer"
                            >
                                {timeOptions.map((time) => (
                                    <option key={time} value={time === 'All' ? 'all' : parseInt(time)}>
                                        {time}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results */}
                {hasSearched && (
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {totalResults} {totalResults === 1 ? 'Recipe' : 'Recipes'} Found
                        </h2>
                        {totalPages > 0 && (
                            <p className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages}
                            </p>
                        )}
                    </div>
                )}

                {/* Recipe Grid */}
                {hasSearched && searchResults.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                            {searchResults.map((recipe) => (
                                <div
                                    key={recipe.id}
                                    onClick={() => handleRecipeClick(recipe.id)}
                                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
                                >
                                    <div className="relative w-full h-48 overflow-hidden">
                                        <img
                                            src={recipe.image}
                                            alt={recipe.name}
                                            className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
                                        />
                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                                            <i className="ri-star-fill text-amber-500 text-sm"></i>
                                            <span className="text-sm font-semibold text-gray-900">{recipe.rating}</span>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 mb-2 text-base line-clamp-2">
                                            {recipe.name}
                                        </h3>

                                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                                            <div className="flex items-center gap-1">
                                                <i className="ri-time-line text-sm"></i>
                                                <span>{recipe.cookTime} min</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <i className="ri-user-line text-sm"></i>
                                                <span>{recipe.servings} servings</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <i className="ri-fire-line text-sm"></i>
                                                <span>{recipe.calories} cal</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-1 bg-[#2F855A]/10 text-[#2F855A] rounded-lg font-medium">
                        {recipe.cuisine}
                      </span>
                                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
                        {recipe.difficulty}
                      </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {recipe.tags.slice(0, 2).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md"
                                                >
                          {tag}
                        </span>
                                            ))}
                                            {recipe.tags.length > 2 && (
                                                <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md">
                          +{recipe.tags.length - 2}
                        </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                {renderPaginationButtons()}
                            </div>
                        )}
                    </>
                )}

                {/* Empty State */}
                {hasSearched && searchResults.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="ri-search-line text-5xl text-gray-400"></i>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No Recipes Found
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Try adjusting your filters or search terms
                        </p>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCuisine('all');
                                setSelectedDifficulty('all');
                                setMaxTime('all');
                                setHasSearched(false);
                                setSearchResults([]);
                                setCurrentPage(1);
                                setTotalPages(0);
                                setTotalResults(0);
                            }}
                            className="px-6 py-2 bg-[#2F855A] text-white rounded-lg hover:bg-[#276749] transition-colors cursor-pointer whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Initial State */}
                {!hasSearched && (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gradient-to-br from-[#2F855A]/10 to-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="ri-restaurant-line text-5xl text-[#2F855A]"></i>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Start Your Recipe Search
                        </h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Enter a recipe name, ingredient, or cuisine to discover delicious recipes tailored to your preferences
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
