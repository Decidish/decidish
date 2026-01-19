import { useState } from 'react';

interface ShoppingItem {
    id: string;
    name: string;
    brand: string;
    image: string;
    price: number;
    weight: string;
    unit: string;
    category: string;
    checked: boolean;
    alreadyHave: boolean;
    ingredientName?: string;
    alternatives?: Product[];
}

interface Product {
    id: string;
    name: string;
    brand: string;
    image: string;
    price: number;
    weight: string;
    unit: string;
}

interface ShoppingList {
    id: string;
    date: string;
    totalItems: number;
    totalPrice: number;
    recipes: string[];
    items: ShoppingItem[];
    completed: boolean;
}

export default function ShoppingListPage() {
    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
    const [showCategoryFilter, setShowCategoryFilter] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showAlternativesModal, setShowAlternativesModal] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState<ShoppingItem | null>(null);

    // Mock current shopping list with alternatives
    const [currentList, setCurrentList] = useState<ShoppingItem[]>([
        {
            id: '1',
            name: 'Fresh Chicken Breast Fillets',
            brand: 'Perdue',
            image: 'https://readdy.ai/api/search-image?query=packaged%20fresh%20chicken%20breast%20fillets%20in%20clear%20plastic%20tray%20with%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-chicken1&orientation=squarish',
            price: 12.99,
            weight: '900',
            unit: 'g',
            category: 'Meat & Poultry',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Chicken Breast',
            alternatives: [
                { id: 'p2', name: 'Organic Chicken Breast', brand: 'Bell & Evans', image: 'https://readdy.ai/api/search-image?query=organic%20chicken%20breast%20package%20in%20clear%20wrap%20with%20organic%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chicken2&orientation=squarish', price: 15.99, weight: '850', unit: 'g' },
                { id: 'p3', name: 'Free Range Chicken Breast', brand: 'Tyson', image: 'https://readdy.ai/api/search-image?query=free%20range%20chicken%20breast%20in%20plastic%20packaging%20with%20brand%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chicken3&orientation=squarish', price: 13.49, weight: '1000', unit: 'g' }
            ]
        },
        {
            id: '2',
            name: 'Extra Virgin Olive Oil',
            brand: 'Bertolli',
            image: 'https://readdy.ai/api/search-image?query=bertolli%20extra%20virgin%20olive%20oil%20glass%20bottle%20with%20yellow%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-oil1&orientation=squarish',
            price: 8.99,
            weight: '500',
            unit: 'ml',
            category: 'Oils & Condiments',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Olive Oil',
            alternatives: [
                { id: 'p5', name: 'Premium Olive Oil', brand: 'Filippo Berio', image: 'https://readdy.ai/api/search-image?query=premium%20olive%20oil%20in%20green%20glass%20bottle%20with%20elegant%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=oil2&orientation=squarish', price: 11.99, weight: '750', unit: 'ml' },
                { id: 'p6', name: 'Organic Extra Virgin Olive Oil', brand: 'Colavita', image: 'https://readdy.ai/api/search-image?query=organic%20extra%20virgin%20olive%20oil%20dark%20glass%20bottle%20with%20organic%20certification%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=oil3&orientation=squarish', price: 14.99, weight: '500', unit: 'ml' }
            ]
        },
        {
            id: '3',
            name: 'Fresh Lemons',
            brand: 'Sunkist',
            image: 'https://readdy.ai/api/search-image?query=fresh%20yellow%20lemons%20in%20mesh%20bag%20with%20sunkist%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-lemon1&orientation=squarish',
            price: 3.99,
            weight: '500',
            unit: 'g',
            category: 'Fruits & Vegetables',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Lemon',
            alternatives: [
                { id: 'p8', name: 'Organic Lemons', brand: 'Organic Valley', image: 'https://readdy.ai/api/search-image?query=organic%20lemons%20in%20clear%20package%20with%20organic%20certification%20sticker%20on%20white%20background%20product%20photography&width=300&height=300&seq=lemon2&orientation=squarish', price: 5.49, weight: '450', unit: 'g' },
                { id: 'p9', name: 'Meyer Lemons', brand: 'Melissa\'s', image: 'https://readdy.ai/api/search-image?query=meyer%20lemons%20in%20small%20basket%20with%20premium%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=lemon3&orientation=squarish', price: 6.99, weight: '400', unit: 'g' }
            ]
        },
        {
            id: '4',
            name: 'Italian Herb Mix',
            brand: 'Fresh Express',
            image: 'https://readdy.ai/api/search-image?query=fresh%20italian%20herbs%20basil%20rosemary%20thyme%20in%20clear%20plastic%20container%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-herbs1&orientation=squarish',
            price: 4.99,
            weight: '30',
            unit: 'g',
            category: 'Herbs & Spices',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Fresh Herbs Mix',
            alternatives: [
                { id: 'p11', name: 'Mediterranean Herb Bundle', brand: 'Organic Herbs', image: 'https://readdy.ai/api/search-image?query=fresh%20mediterranean%20herbs%20bundle%20tied%20with%20string%20on%20white%20background%20product%20photography&width=300&height=300&seq=herbs2&orientation=squarish', price: 5.99, weight: '40', unit: 'g' },
                { id: 'p12', name: 'Fresh Herb Trio Pack', brand: 'Garden Fresh', image: 'https://readdy.ai/api/search-image?query=three%20compartment%20pack%20with%20fresh%20basil%20parsley%20oregano%20on%20white%20background%20product%20photography&width=300&height=300&seq=herbs3&orientation=squarish', price: 6.49, weight: '45', unit: 'g' }
            ]
        },
        {
            id: '5',
            name: 'Penne Rigate',
            brand: 'Barilla',
            image: 'https://readdy.ai/api/search-image?query=barilla%20penne%20pasta%20blue%20box%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-pasta1&orientation=squarish',
            price: 2.99,
            weight: '500',
            unit: 'g',
            category: 'Pasta & Grains',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Pasta',
            alternatives: [
                { id: 'p14', name: 'Fettuccine', brand: 'De Cecco', image: 'https://readdy.ai/api/search-image?query=de%20cecco%20fettuccine%20pasta%20in%20blue%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=pasta2&orientation=squarish', price: 3.49, weight: '500', unit: 'g' },
                { id: 'p15', name: 'Organic Spaghetti', brand: 'Bionaturae', image: 'https://readdy.ai/api/search-image?query=organic%20spaghetti%20pasta%20in%20clear%20package%20with%20organic%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=pasta3&orientation=squarish', price: 4.99, weight: '500', unit: 'g' }
            ]
        },
        {
            id: '6',
            name: 'White Button Mushrooms',
            brand: 'Giorgio',
            image: 'https://readdy.ai/api/search-image?query=white%20button%20mushrooms%20in%20clear%20plastic%20container%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-mushroom1&orientation=squarish',
            price: 4.99,
            weight: '450',
            unit: 'g',
            category: 'Fruits & Vegetables',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Mushrooms',
            alternatives: [
                { id: 'p17', name: 'Baby Bella Mushrooms', brand: 'Monterey', image: 'https://readdy.ai/api/search-image?query=baby%20bella%20cremini%20mushrooms%20in%20plastic%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=mushroom2&orientation=squarish', price: 5.99, weight: '400', unit: 'g' },
                { id: 'p18', name: 'Organic Mixed Mushrooms', brand: 'Whole Foods', image: 'https://readdy.ai/api/search-image?query=organic%20mixed%20mushrooms%20variety%20pack%20in%20clear%20container%20on%20white%20background%20product%20photography&width=300&height=300&seq=mushroom3&orientation=squarish', price: 7.99, weight: '350', unit: 'g' }
            ]
        },
        {
            id: '7',
            name: 'Heavy Whipping Cream',
            brand: 'Land O Lakes',
            image: 'https://readdy.ai/api/search-image?query=heavy%20whipping%20cream%20carton%20with%20red%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-cream1&orientation=squarish',
            price: 4.49,
            weight: '473',
            unit: 'ml',
            category: 'Dairy & Eggs',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Heavy Cream',
            alternatives: [
                { id: 'p20', name: 'Organic Heavy Cream', brand: 'Horizon', image: 'https://readdy.ai/api/search-image?query=organic%20heavy%20cream%20carton%20with%20blue%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=cream2&orientation=squarish', price: 5.99, weight: '473', unit: 'ml' },
                { id: 'p21', name: 'Premium Cooking Cream', brand: 'Darigold', image: 'https://readdy.ai/api/search-image?query=premium%20cooking%20cream%20container%20with%20green%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=cream3&orientation=squarish', price: 4.99, weight: '500', unit: 'ml' }
            ]
        },
        {
            id: '8',
            name: 'Grated Parmesan',
            brand: 'Kraft',
            image: 'https://readdy.ai/api/search-image?query=kraft%20grated%20parmesan%20cheese%20green%20shaker%20bottle%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-parm1&orientation=squarish',
            price: 6.99,
            weight: '227',
            unit: 'g',
            category: 'Dairy & Eggs',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Parmesan Cheese',
            alternatives: [
                { id: 'p23', name: 'Parmigiano Reggiano Block', brand: 'BelGioioso', image: 'https://readdy.ai/api/search-image?query=parmigiano%20reggiano%20cheese%20wedge%20in%20clear%20wrap%20on%20white%20background%20product%20photography&width=300&height=300&seq=parm2&orientation=squarish', price: 12.99, weight: '200', unit: 'g' },
                { id: 'p24', name: 'Shredded Parmesan', brand: 'Sargento', image: 'https://readdy.ai/api/search-image?query=shredded%20parmesan%20cheese%20in%20resealable%20bag%20on%20white%20background%20product%20photography&width=300&height=300&seq=parm3&orientation=squarish', price: 5.49, weight: '150', unit: 'g' }
            ]
        },
        {
            id: '9',
            name: 'Atlantic Salmon Fillet',
            brand: 'Sea Best',
            image: 'https://readdy.ai/api/search-image?query=fresh%20atlantic%20salmon%20fillet%20in%20clear%20plastic%20wrap%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-salmon1&orientation=squarish',
            price: 14.99,
            weight: '340',
            unit: 'g',
            category: 'Meat & Poultry',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Salmon Fillet',
            alternatives: [
                { id: 'p26', name: 'Wild Caught Salmon', brand: 'Copper River', image: 'https://readdy.ai/api/search-image?query=wild%20caught%20salmon%20fillet%20in%20vacuum%20sealed%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=salmon2&orientation=squarish', price: 19.99, weight: '300', unit: 'g' },
                { id: 'p27', name: 'Organic Salmon Fillet', brand: 'Whole Foods', image: 'https://readdy.ai/api/search-image?query=organic%20salmon%20fillet%20in%20eco%20friendly%20packaging%20on%20white%20background%20product%20photography&width=300&height=300&seq=salmon3&orientation=squarish', price: 17.99, weight: '350', unit: 'g' }
            ]
        },
        {
            id: '10',
            name: 'Premium Sushi Rice',
            brand: 'Nishiki',
            image: 'https://readdy.ai/api/search-image?query=nishiki%20sushi%20rice%20bag%20with%20red%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-rice1&orientation=squarish',
            price: 8.99,
            weight: '1000',
            unit: 'g',
            category: 'Pasta & Grains',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Sushi Rice',
            alternatives: [
                { id: 'p29', name: 'Organic Sushi Rice', brand: 'Lundberg', image: 'https://readdy.ai/api/search-image?query=organic%20sushi%20rice%20package%20with%20green%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=rice2&orientation=squarish', price: 11.99, weight: '907', unit: 'g' },
                { id: 'p30', name: 'Japanese Short Grain Rice', brand: 'Kokuho Rose', image: 'https://readdy.ai/api/search-image?query=japanese%20short%20grain%20rice%20bag%20with%20floral%20design%20on%20white%20background%20product%20photography&width=300&height=300&seq=rice3&orientation=squarish', price: 9.99, weight: '1000', unit: 'g' }
            ]
        },
        {
            id: '11',
            name: 'Organic White Quinoa',
            brand: 'Ancient Harvest',
            image: 'https://readdy.ai/api/search-image?query=organic%20white%20quinoa%20in%20clear%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-quinoa1&orientation=squarish',
            price: 7.99,
            weight: '340',
            unit: 'g',
            category: 'Pasta & Grains',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Quinoa',
            alternatives: [
                { id: 'p38', name: 'Tri-Color Quinoa', brand: 'Bob\'s Red Mill', image: 'https://readdy.ai/api/search-image?query=tri%20color%20quinoa%20mix%20in%20clear%20bag%20with%20red%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=quinoa2&orientation=squarish', price: 8.99, weight: '369', unit: 'g' },
                { id: 'p39', name: 'Red Quinoa', brand: 'Lundberg', image: 'https://readdy.ai/api/search-image?query=red%20quinoa%20in%20package%20with%20green%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=quinoa3&orientation=squarish', price: 9.49, weight: '340', unit: 'g' }
            ]
        },
        {
            id: '12',
            name: 'Canned Chickpeas',
            brand: 'Goya',
            image: 'https://readdy.ai/api/search-image?query=goya%20chickpeas%20in%20metal%20can%20with%20blue%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=shop-chickpea1&orientation=squarish',
            price: 1.99,
            weight: '425',
            unit: 'g',
            category: 'Canned Goods',
            checked: false,
            alreadyHave: false,
            ingredientName: 'Chickpeas',
            alternatives: [
                { id: 'p41', name: 'Organic Chickpeas', brand: 'Eden Foods', image: 'https://readdy.ai/api/search-image?query=organic%20chickpeas%20in%20can%20with%20green%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chickpea2&orientation=squarish', price: 2.99, weight: '425', unit: 'g' },
                { id: 'p42', name: 'Low Sodium Chickpeas', brand: 'Bush\'s', image: 'https://readdy.ai/api/search-image?query=low%20sodium%20chickpeas%20in%20can%20with%20yellow%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chickpea3&orientation=squarish', price: 2.49, weight: '425', unit: 'g' }
            ]
        }
    ]);

    // Mock shopping history
    const shoppingHistory: ShoppingList[] = [
        {
            id: 'list-1',
            date: '2024-01-15',
            totalItems: 15,
            totalPrice: 87.45,
            recipes: ['Mediterranean Grilled Chicken', 'Creamy Mushroom Pasta', 'Asian Salmon Bowl'],
            items: [],
            completed: true
        },
        {
            id: 'list-2',
            date: '2024-01-08',
            totalItems: 12,
            totalPrice: 65.30,
            recipes: ['Vegetarian Buddha Bowl', 'Thai Green Curry', 'Caprese Salad'],
            items: [],
            completed: true
        },
        {
            id: 'list-3',
            date: '2024-01-01',
            totalItems: 18,
            totalPrice: 102.15,
            recipes: ['Beef Tacos', 'Caesar Salad', 'Chocolate Brownies', 'Tomato Soup'],
            items: [],
            completed: true
        },
        {
            id: 'list-4',
            date: '2023-12-25',
            totalItems: 22,
            totalPrice: 145.80,
            recipes: ['Roast Turkey', 'Mashed Potatoes', 'Green Bean Casserole', 'Pumpkin Pie'],
            items: [],
            completed: true
        }
    ];

    const categories = [
        'All Items',
        'Meat & Poultry',
        'Fruits & Vegetables',
        'Dairy & Eggs',
        'Pasta & Grains',
        'Oils & Condiments',
        'Herbs & Spices',
        'Canned Goods'
    ];

    const handleToggleCheck = (id: string) => {
        setCurrentList(prev =>
            prev.map(item =>
                item.id === id ? { ...item, checked: !item.checked } : item
            )
        );
    };

    const handleRemoveItem = (id: string) => {
        setCurrentList(prev => prev.filter(item => item.id !== id));
    };

    const handleEditItem = (item: ShoppingItem) => {
        setSelectedItemForEdit(item);
        setShowAlternativesModal(true);
    };

    const handleSelectAlternative = (alternative: Product) => {
        if (selectedItemForEdit) {
            setCurrentList(prev =>
                prev.map(item =>
                    item.id === selectedItemForEdit.id
                        ? {
                            ...item,
                            name: alternative.name,
                            brand: alternative.brand,
                            image: alternative.image,
                            price: alternative.price,
                            weight: alternative.weight,
                            unit: alternative.unit
                        }
                        : item
                )
            );
            setShowAlternativesModal(false);
            setSelectedItemForEdit(null);
        }
    };

    const filteredItems = selectedCategory === 'all'
        ? currentList
        : currentList.filter(item => item.category === selectedCategory);

    const totalPrice = currentList
        .filter(item => !item.alreadyHave)
        .reduce((sum, item) => sum + item.price, 0);

    const checkedCount = currentList.filter(item => item.checked).length;
    const totalCount = currentList.length;
    const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => window.REACT_APP_NAVIGATE('/recipe-swiper')}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            <i className="ri-arrow-left-line text-xl text-gray-700"></i>
                        </button>
                        <img
                            src="https://public.readdy.ai/ai/img_res/b0724f47-0896-45dd-92da-e15712b65265.png"
                            alt="Recipe Recommender Logo"
                            className="h-12 w-auto"
                        />
                        <button
                            onClick={() => window.REACT_APP_NAVIGATE('/profile')}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            <i className="ri-user-line text-xl text-gray-700"></i>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
                        <button
                            onClick={() => setActiveTab('current')}
                            className={`flex-1 py-2.5 px-4 rounded-full font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'current'
                                    ? 'bg-[#2F855A] text-white shadow-md'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Current List
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2.5 px-4 rounded-full font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === 'history'
                                    ? 'bg-[#2F855A] text-white shadow-md'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            History
                        </button>
                    </div>
                </div>
            </div>

            {/* Current List Tab */}
            {activeTab === 'current' && (
                <div className="max-w-4xl mx-auto px-4 py-6">
                    {/* Progress Card */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Shopping Progress</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {checkedCount} of {totalCount} items collected
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-[#2F855A]">${totalPrice.toFixed(2)}</div>
                                <p className="text-xs text-gray-600">Total Cost</p>
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-[#2F855A] to-emerald-600 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="mb-6">
                        <button
                            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 rounded-lg">
                                    <i className="ri-filter-3-line text-xl text-[#2F855A]"></i>
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold text-gray-900">Filter by Category</div>
                                    <div className="text-sm text-gray-600">
                                        {selectedCategory === 'all' ? 'All Items' : selectedCategory}
                                    </div>
                                </div>
                            </div>
                            <i className={`ri-arrow-${showCategoryFilter ? 'up' : 'down'}-s-line text-xl text-gray-400`}></i>
                        </button>

                        {showCategoryFilter && (
                            <div className="mt-3 bg-white rounded-xl shadow-sm p-3 grid grid-cols-2 gap-2">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => {
                                            setSelectedCategory(category === 'All Items' ? 'all' : category);
                                            setShowCategoryFilter(false);
                                        }}
                                        className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                                            (category === 'All Items' && selectedCategory === 'all') ||
                                            category === selectedCategory
                                                ? 'bg-[#2F855A] text-white'
                                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Shopping Items */}
                    <div className="space-y-3">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className={`bg-white rounded-xl shadow-sm p-4 transition-all ${
                                    item.checked ? 'opacity-60' : ''
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => handleToggleCheck(item.id)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-all cursor-pointer flex-shrink-0 ${
                                            item.checked
                                                ? 'bg-[#2F855A] border-[#2F855A]'
                                                : 'border-gray-300 hover:border-[#2F855A]'
                                        }`}
                                    >
                                        {item.checked && (
                                            <i className="ri-check-line text-white text-xl"></i>
                                        )}
                                    </button>

                                    {/* Product Image */}
                                    <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-semibold text-gray-900 mb-1 ${item.checked ? 'line-through' : ''}`}>
                                            {item.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-2">{item.brand}</p>
                                        <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {item.weight}{item.unit}
                      </span>
                                            <span className="text-lg font-bold text-[#2F855A]">
                        ${item.price.toFixed(2)}
                      </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 flex-shrink-0">
                                        {item.alternatives && item.alternatives.length > 0 && (
                                            <button
                                                onClick={() => handleEditItem(item)}
                                                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                                                title="View alternatives"
                                            >
                                                <i className="ri-refresh-line text-xl text-[#2F855A]"></i>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                            title="Remove item"
                                        >
                                            <i className="ri-delete-bin-line text-xl text-red-500"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Complete Shopping Button */}
                    <div className="sticky bottom-0 bg-gradient-to-t from-emerald-50 via-emerald-50 to-transparent pt-6 pb-6 mt-6">
                        <button
                            onClick={() => {
                                if (checkedCount === totalCount) {
                                    alert('Shopping completed! 🎉');
                                } else {
                                    alert(`You still have ${totalCount - checkedCount} items to collect.`);
                                }
                            }}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all cursor-pointer whitespace-nowrap ${
                                checkedCount === totalCount
                                    ? 'bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white hover:from-[#276749] hover:to-emerald-700'
                                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            }`}
                            disabled={checkedCount !== totalCount}
                        >
                            {checkedCount === totalCount ? 'Complete Shopping' : `${totalCount - checkedCount} Items Remaining`}
                        </button>
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Shopping History</h2>
                    <div className="space-y-4">
                        {shoppingHistory.map((list) => (
                            <div
                                key={list.id}
                                className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => {
                                    // Could navigate to detailed view
                                }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="ri-calendar-line text-[#2F855A]"></i>
                                            <span className="text-sm font-medium text-gray-600">
                        {new Date(list.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                      </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <i className="ri-shopping-basket-line"></i>
                          {list.totalItems} items
                      </span>
                                            <span className="text-lg font-bold text-[#2F855A]">
                        ${list.totalPrice.toFixed(2)}
                      </span>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50 text-[#2F855A] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                        <i className="ri-check-line"></i>
                                        Completed
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                        Recipes
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {list.recipes.map((recipe, index) => (
                                            <span
                                                key={index}
                                                className="bg-gray-50 text-gray-700 px-3 py-1 rounded-lg text-sm"
                                            >
                        {recipe}
                      </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Alternatives Modal */}
            {showAlternativesModal && selectedItemForEdit && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-gray-900">Choose Alternative</h3>
                                <button
                                    onClick={() => {
                                        setShowAlternativesModal(false);
                                        setSelectedItemForEdit(null);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                    <i className="ri-close-line text-xl text-gray-600"></i>
                                </button>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                <h4 className="text-sm font-semibold text-gray-600 mb-1">
                                    {selectedItemForEdit.ingredientName || 'Ingredient'}
                                </h4>
                                <p className="text-xs text-gray-600">Select a different product option</p>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Current Selection */}
                            <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                                    Current Selection:
                                </h5>
                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-[#2F855A] rounded-xl p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden">
                                            <img
                                                src={selectedItemForEdit.image}
                                                alt={selectedItemForEdit.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-gray-900 mb-1">{selectedItemForEdit.name}</div>
                                            <div className="text-sm text-gray-600 mb-2">{selectedItemForEdit.brand}</div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-gray-700">{selectedItemForEdit.weight}{selectedItemForEdit.unit}</span>
                                                <span className="text-lg font-bold text-[#2F855A]">${selectedItemForEdit.price.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="bg-[#2F855A] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                            <i className="ri-check-line"></i>
                                            Selected
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alternative Products */}
                            <div className="relative mb-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">or choose an alternative</span>
                                </div>
                            </div>

                            <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                                Available Alternatives:
                            </h5>

                            <div className="space-y-3">
                                {selectedItemForEdit.alternatives?.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleSelectAlternative(product)}
                                        className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl hover:bg-emerald-50 hover:border-[#2F855A] transition-all text-left cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-gray-900 mb-1">{product.name}</div>
                                                <div className="text-sm text-gray-600 mb-2">{product.brand}</div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-gray-700">{product.weight}{product.unit}</span>
                                                    <span className="text-lg font-bold text-[#2F855A]">${product.price.toFixed(2)}</span>
                                                </div>
                                                {/* Price Comparison */}
                                                {product.price !== selectedItemForEdit.price && (
                                                    <div className="mt-2">
                                                        {product.price < selectedItemForEdit.price ? (
                                                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                Save ${(selectedItemForEdit.price - product.price).toFixed(2)}
                              </span>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                +${(product.price - selectedItemForEdit.price).toFixed(2)}
                              </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <i className="ri-arrow-right-line text-2xl text-gray-400 group-hover:text-[#2F855A] transition-colors"></i>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}