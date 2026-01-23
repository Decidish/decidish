import { ShoppingList, shoppingListApi } from '@/api/shopping-list/shoppingCartApi';
import { useState, useEffect } from 'react';

export default function ShoppingListPage() {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [shoppingHistory, setShoppingHistory] = useState<ShoppingList[]>([]);

  const fetchList = async () => {
      try {
        const listData = await shoppingListApi.getActiveShoppingList();
        if (listData) setActiveList(listData);
        const historyData = await shoppingListApi.getShoppingHistory();
        if (historyData.length > 0) setShoppingHistory(historyData);
      } catch (error) {
        console.error("Failed to load shopping list", error);
      }
    };

  useEffect(() => {
    fetchList();
  }, []);

  const toggleRecipeExpansion = (recipeName: string) => {
    if (!activeList) return;
    setActiveList(prev => {
      if (!prev) return null;
      return {
        ...prev,
        groups: prev.groups.map(group =>
          group.recipeName === recipeName
            ? { ...group, isExpanded: !group.isExpanded }
            : group
        )
      };
    });
  };


  const handleToggleCheck = async (recipeName: string, itemId: string) => {
    if (!activeList) return;

    // Optimistic Update
    setActiveList(prev => {
        if (!prev) return null;
        return {
            ...prev,
            groups: prev.groups.map((group) =>
                // Match by NAME, not Index
                group.recipeName === recipeName
                  ? {
                      ...group,
                      items: group.items.map(item =>
                        item.id === itemId ? { ...item, checked: !item.checked } : item
                      )
                    }
                  : group
              )
        }
    });

    const group = activeList.groups.find(g => g.recipeName === recipeName);
    if (!group) return;

    const item = group.items.find(i => i.id === itemId);
    if (item) {
        // Note: item.checked is the OLD value here, so we send !item.checked
        await shoppingListApi.updateItemStatus(itemId, !item.checked).catch(err => {
            console.error("Failed to update item status", err);
        });
    }
  };

  const handleRemoveItem = async (recipeName: string, itemId: string) => {
    if (!activeList) return;

    setActiveList(prev => {
      if (!prev) return null;
      const updatedGroups = prev.groups.map((group) =>
        group.recipeName === recipeName
          ? {
              ...group,
              items: group.items.filter(item => item.id !== itemId)
            }
          : group
      );

      const filteredGroups = updatedGroups.filter(group => group.items.length > 0);

      return { ...prev, groups: filteredGroups };
    });

    await shoppingListApi.deleteItem(itemId).catch(err => {
        console.error("Failed to delete item", err);
    });
  };

  const handleCompleteShopping = async () => {
    if (!activeList) return;

    const checkedCount = getAllItems().filter(item => item.checked).length;
    const totalCount = getAllItems().length;

    if (checkedCount !== totalCount) {
        alert(`You still have ${totalCount - checkedCount} items to collect.`);
        return;
    }

    try {
        await shoppingListApi.completeShoppingList(activeList.id);
        alert('Shopping completed!');

        fetchList();
    } catch (error) {
        console.error("Failed to complete shopping list", error);
        alert("Failed to complete shopping list. Please try again.");
    }
  };

  const recipeGroups = activeList ? activeList.groups : [];

  const getAllItems = () => {
    if (!activeList || !activeList.groups) return [];
    return activeList.groups.flatMap(group => group.items);
  };
  
  const totalPrice = getAllItems().reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
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
              onClick={() => (window as any).REACT_APP_NAVIGATE('/recipe-swiper')}
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
              onClick={() => (window as any).REACT_APP_NAVIGATE('/profile')}
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
                <div className="text-3xl font-bold text-[#2F855A]">{(totalPrice / 100).toFixed(2)}€</div>
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
          {activeList && activeList.groups && activeList.groups.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4 bg-gray-100 rounded-full">
                <i className="ri-shopping-cart-line text-5xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-sm text-gray-600 mb-6">
                Start swiping recipes to add ingredients to your shopping list!
              </p>
              <button
                onClick={() => (window as any).REACT_APP_NAVIGATE('/recipe-swiper')}
                className="px-6 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap"
              >
                Browse Recipes
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeList && activeList.groups && activeList.groups.map((group, groupIndex) => {
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
                              {(groupTotal / 100).toFixed(2)}€
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
                                onClick={() => handleToggleCheck(group.recipeName, item.id)}
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
                                <h3 className={`font-semibold text-gray-900 mb-1 text-sm ${item.checked ? 'line-through' : ''}`}>
                                  {item.name}
                                </h3>
                                <div className="flex items-center gap-3">
                                  {item.quantity && item.quantity > 1 && (
                                    <span className="text-xs font-medium text-[#2F855A] bg-emerald-50 px-2 py-1 rounded">
                                      Qty: {item.quantity}
                                    </span>
                                  )}
                                  <span className="text-base font-bold text-[#2F855A]">
                                    {((item.price / 100) * (item.quantity || 1)).toFixed(2)}€
                                  </span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleRemoveItem(group.recipeName, item.id)}
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
          {activeList && activeList.groups && activeList.groups.length > 0 && (
            <div className="sticky bottom-0 bg-gradient-to-t from-emerald-50 via-emerald-50 to-transparent pt-6 pb-6 mt-6">
              <button
                onClick={handleCompleteShopping}
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
                        {(list.totalPrice / 100).toFixed(2)}€
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
                    {list.groups && list.groups.map((group, index) => (
                      <span
                        key={index}
                        className="bg-gray-50 text-gray-700 px-3 py-1 rounded-lg text-sm"
                      >
                        {group.recipeName}
                      </span>
                    ))}
                    {/* Fallback for old history data format if present */}
                    {(list as any).recipes && (list as any).recipes.map((recipe: string, index: number) => (
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
    </div>
  );
}