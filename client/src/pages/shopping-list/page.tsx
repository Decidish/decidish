import { useState, useEffect } from 'react';

interface ShoppingItem {
    name: string;
    image: string;
    price: number;
    category: string;
    checked: boolean;
    quantity: number;
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

interface RecipeGroup {
    recipeName: string;
    items: ShoppingItem[];
    isExpanded: boolean;
}

export default function ShoppingListPage() {
    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
    const [showAlternativesModal, setShowAlternativesModal] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState<ShoppingItem | null>(null);
    const [recipeGroups, setRecipeGroups] = useState<RecipeGroup[]>([]);

    // Load shopping cart from localStorage
    useEffect(() => {
        const savedCart = localStorage.getItem('shoppingCart');
        // if (savedCart) {
        //     try {
        //         const cartItems = JSON.parse(savedCart);
        //
        //         // Group items by recipe
        //         const groupedByRecipe: Record<string, ShoppingItem[]> = {};
        //
        //         cartItems.forEach((cartItem: any) => {
        //             const recipeName = cartItem.recipeName || 'Other Items';
        //             const shoppingItem: ShoppingItem = {
        //                 id: `${cartItem.product.id}-${Date.now()}-${Math.random()}`,
        //                 name: cartItem.product.name,
        //                 brand: cartItem.product.brand,
        //                 image: cartItem.product.image,
        //                 price: cartItem.product.price,
        //                 weight: cartItem.product.weight,
        //                 unit: cartItem.product.unit,
        //                 category: 'Groceries',
        //                 checked: false,
        //                 alreadyHave: false,
        //                 ingredientName: cartItem.ingredientName,
        //                 recipeName: recipeName,
        //                 quantity: cartItem.quantity || 1,
        //                 alternatives: []
        //             };
        //
        //             if (!groupedByRecipe[recipeName]) {
        //                 groupedByRecipe[recipeName] = [];
        //             }
        //             groupedByRecipe[recipeName].push(shoppingItem);
        //         });
        //
        //         // Convert to RecipeGroup array
        //         const groups: RecipeGroup[] = Object.keys(groupedByRecipe).map(recipeName => ({
        //             recipeName,
        //             items: groupedByRecipe[recipeName],
        //             isExpanded: true // Start with all expanded
        //         }));
        //
        //         setRecipeGroups(groups);
        //     } catch (e) {
        //         console.error('Failed to load cart:', e);
        //     }
        // }
    }, []);

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

    const toggleRecipeExpansion = (recipeName: string) => {
        setRecipeGroups(prev =>
            prev.map(group =>
                group.recipeName === recipeName
                    ? { ...group, isExpanded: !group.isExpanded }
                    : group
            )
        );
    };

    const handleToggleCheck = (recipeIndex: number, itemId: string) => {
        setRecipeGroups(prev =>
            prev.map((group, idx) =>
                idx === recipeIndex
                    ? {
                        ...group,
                        items: group.items.map(item =>
                            item.id === itemId ? { ...item, checked: !item.checked } : item
                        )
                    }
                    : group
            )
        );
    };

    const handleRemoveItem = (recipeIndex: number, itemId: string) => {
        setRecipeGroups(prev => {
            const updated = prev.map((group, idx) =>
                idx === recipeIndex
                    ? {
                        ...group,
                        items: group.items.filter(item => item.id !== itemId)
                    }
                    : group
            );

            // Remove empty recipe groups
            const filtered = updated.filter(group => group.items.length > 0);

            // Update localStorage
            const allItems = filtered.flatMap(group =>
                group.items.map(item => ({
                    product: {
                        id: item.id,
                        name: item.name,
                        brand: item.brand,
                        image: item.image,
                        price: item.price,
                        weight: item.weight,
                        unit: item.unit
                    },
                    quantity: item.quantity || 1,
                    ingredientName: item.ingredientName || '',
                    recipeName: item.recipeName || 'Other Items'
                }))
            );
            localStorage.setItem('shoppingCart', JSON.stringify(allItems));

            return filtered;
        });
    };

    const handleEditItem = (item: ShoppingItem) => {
        setSelectedItemForEdit(item);
        setShowAlternativesModal(true);
    };

    const handleSelectAlternative = (alternative: Product) => {
        if (selectedItemForEdit) {
            setRecipeGroups(prev =>
                prev.map(group => ({
                    ...group,
                    items: group.items.map(item =>
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
                }))
            );
            setShowAlternativesModal(false);
            setSelectedItemForEdit(null);
        }
    };

    const getAllItems = () => {
        return recipeGroups.flatMap(group => group.items);
    };

    const totalPrice = getAllItems()
        .filter(item => !item.alreadyHave)
        .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    const checkedCount = getAllItems().filter(item => item.checked).length;
    const totalCount = getAllItems().length;
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

                    {/* Recipe Groups */}
                    {recipeGroups.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                            <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4 bg-gray-100 rounded-full">
                                <i className="ri-shopping-cart-line text-5xl text-gray-400"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Start swiping recipes to add ingredients to your shopping list!
                            </p>
                            <button
                                onClick={() => window.REACT_APP_NAVIGATE('/recipe-swiper')}
                                className="px-6 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap"
                            >
                                Browse Recipes
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recipeGroups.map((group, groupIndex) => {
                                const groupCheckedCount = group.items.filter(item => item.checked).length;
                                const groupTotalCount = group.items.length;
                                const groupProgress = groupTotalCount > 0 ? (groupCheckedCount / groupTotalCount) * 100 : 0;
                                const groupTotal = group.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

                                return (
                                    <div key={groupIndex} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                        {/* Recipe Header */}
                                        <button
                                            onClick={() => toggleRecipeExpansion(group.recipeName)}
                                            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${
                                                    group.isExpanded ? 'bg-[#2F855A]' : 'bg-gray-200'
                                                }`}>
                                                    <i className={`ri-restaurant-line text-2xl ${
                                                        group.isExpanded ? 'text-white' : 'text-gray-600'
                                                    }`}></i>
                                                </div>
                                                <div className="text-left flex-1">
                                                    <h3 className="text-lg font-bold text-gray-900">{group.recipeName}</h3>
                                                    <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600">
                              {groupCheckedCount}/{groupTotalCount} items
                            </span>
                                                        <span className="text-sm font-semibold text-[#2F855A]">
                              ${groupTotal.toFixed(2)}
                            </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {/* Progress Circle */}
                                                <div className="relative w-12 h-12">
                                                    <svg className="w-12 h-12 transform -rotate-90">
                                                        <circle
                                                            cx="24"
                                                            cy="24"
                                                            r="20"
                                                            stroke="#E5E7EB"
                                                            strokeWidth="4"
                                                            fill="none"
                                                        />
                                                        <circle
                                                            cx="24"
                                                            cy="24"
                                                            r="20"
                                                            stroke="#2F855A"
                                                            strokeWidth="4"
                                                            fill="none"
                                                            strokeDasharray={`${2 * Math.PI * 20}`}
                                                            strokeDashoffset={`${2 * Math.PI * 20 * (1 - groupProgress / 100)}`}
                                                            className="transition-all duration-500"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-700">
                              {Math.round(groupProgress)}%
                            </span>
                                                    </div>
                                                </div>
                                                <i className={`ri-arrow-${group.isExpanded ? 'up' : 'down'}-s-line text-2xl text-gray-400`}></i>
                                            </div>
                                        </button>

                                        {/* Recipe Items */}
                                        {group.isExpanded && (
                                            <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
                                                {group.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`bg-white rounded-xl shadow-sm p-4 transition-all ${
                                                            item.checked ? 'opacity-60' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            {/* Checkbox */}
                                                            <button
                                                                onClick={() => handleToggleCheck(groupIndex, item.id)}
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
                                                                {item.ingredientName && (
                                                                    <div className="text-xs font-semibold text-[#2F855A] mb-1">
                                                                        {item.ingredientName}
                                                                    </div>
                                                                )}
                                                                <h3 className={`font-semibold text-gray-900 mb-1 text-sm ${item.checked ? 'line-through' : ''}`}>
                                                                    {item.name}
                                                                </h3>
                                                                <p className="text-xs text-gray-600 mb-2">{item.brand}</p>
                                                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                    {item.weight}{item.unit}
                                  </span>
                                                                    {item.quantity && item.quantity > 1 && (
                                                                        <span className="text-xs font-medium text-[#2F855A] bg-emerald-50 px-2 py-1 rounded">
                                      Qty: {item.quantity}
                                    </span>
                                                                    )}
                                                                    <span className="text-base font-bold text-[#2F855A]">
                                    ${((item.price * (item.quantity || 1))).toFixed(2)}
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
                                                                    onClick={() => handleRemoveItem(groupIndex, item.id)}
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
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Complete Shopping Button */}
                    {recipeGroups.length > 0 && (
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
                    )}
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