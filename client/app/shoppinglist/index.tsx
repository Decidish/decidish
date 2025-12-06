import React, { useState, useEffect, useMemo } from 'react';
import { View, SafeAreaView, TouchableOpacity, Text, ScrollView, TextInput, Image, LayoutAnimation, Platform, UIManager, Modal } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2, Trash2, Check, ChevronDown, ChevronUp, Plus, Home, RefreshCcw, TouchpadOff, 
    Apple, Egg, Milk, Wheat, Beef, Leaf, Fish, Wine, UtensilsCrossed, Package, 
} from 'lucide-react-native';
import { Recipe } from '@/api/models/recipe';
import { Ingredient } from '@/api/models/ingredient';

// Enable Layout Animation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper Type for Grouped Ingredients
type ShoppingItem = Ingredient & { 
  originalRecipeId: string; 
  originalRecipeName: string;
  id: string; // Unique ID for list management
};

type GroupedItems = Record<string, ShoppingItem[]>;

export default function ShoppingListPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // --- STATE ---
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deletedItems, setDeletedItems] = useState<ShoppingItem[]>([]);

  const [viewMode, setViewMode] = useState<'category' | 'all'>('category');

  // UI State
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showDeleted, setShowDeleted] = useState(false);
  
  // Custom Item Form
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customCategory, setCustomCategory] = useState('Produce');
  const [isCatOpen, setIsCatOpen] = useState(false);
  const categories = ['Produce', 'Meat', 'Dairy', 'Pantry', 'Spices', 'Bakery', 'Other'];
  

  // --- INITIALIZATION ---
  useEffect(() => {
    if (params.recipes) {
      try {
        const parsedRecipes: Recipe[] = JSON.parse(params.recipes as string);
        console.log("Parsed Recipes:", parsedRecipes);

        setRecipes(parsedRecipes);
        
        // Flatten ingredients from all recipes into one big list
        const allIngredients: ShoppingItem[] = parsedRecipes.flatMap(recipe => 
          recipe.ingredients.map((ing, index) => ({
            ...ing,
            originalRecipeId: recipe.id,
            originalRecipeName: recipe.title,
            id: `${recipe.id}-${index}-${Date.now()}` // Unique ID
          }))
        );
        setItems(allIngredients);
      } catch (e) {
        console.error("Failed to parse recipes", e);
      }
    }
  }, [params.recipes]);


  // --- DERIVED STATE (Grouping) ---
  const groupedItems: GroupedItems = useMemo(() => {
    const groups: GroupedItems = {};
    items.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  const totalItems = items.length;
  const completedItems = checkedIds.size;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // --- HANDLERS ---

  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleDelete = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const itemToDelete = items.find(i => i.id === id);
    if (itemToDelete) {
      setItems(prev => prev.filter(i => i.id !== id));
      setDeletedItems(prev => [itemToDelete, ...prev]);
      // Remove from checked if it was checked
      if (checkedIds.has(id)) {
        const nextChecked = new Set(checkedIds);
        nextChecked.delete(id);
        setCheckedIds(nextChecked);
      }
    }
  };

  const handleRestore = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const itemToRestore = deletedItems.find(i => i.id === id);
    if (itemToRestore) {
      setDeletedItems(prev => prev.filter(i => i.id !== id));
      setItems(prev => [...prev, itemToRestore]);
    }
  };

  const handleAddCustomItem = () => {
    if (!customName.trim()) return;
    const newItem: ShoppingItem = {
      name: customName,
      quantity: parseFloat(customAmount) || 1,
      unit: 'pcs', // Default
      category: customCategory as any,
      originalRecipeId: 'custom',
      originalRecipeName: 'Custom Item',
      id: `custom-${Date.now()}`
    };
    setItems(prev => [...prev, newItem]);
    setCustomName('');
    setCustomAmount('');
  };

  const ItemRow = ({ item }: { item: ShoppingItem }) => {
    const isChecked = checkedIds.has(item.id);
    return (
        <TouchableOpacity 
            key={item.id} 
            className={`flex-row items-center gap-3 p-3 rounded-xl border-2 transition-all mb-2 ${
                isChecked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
            }`}
            onPress={() => toggleCheck(item.id)}
        >
            {/* Checkbox */}
            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'
            }`}>
                {isChecked && <Check size={14} color="white" strokeWidth={3} />}
            </View>

            {/* Text Info */}
            <View className='flex-1'>
                <Text className={`font-medium ${isChecked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {item.quantity} {item.unit} {item.name}
                </Text>
                <Text className='text-xs text-gray-400'>
                    For: {item.originalRecipeName}
                </Text>
            </View>

            {/* Delete Action */}
            <TouchableOpacity onPress={() => handleDelete(item.id)} className='p-2'>
                <Trash2 size={18} color="#9ca3af" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className='flex-1 bg-slate-50'>
      <Stack.Screen options={{ headerShown: false }} />

      {/* === HEADER === */}
      <View className='w-full bg-white border-b border-gray-200 px-5 py-4 z-10'>
        <View className='w-full max-w-4xl self-center flex-row justify-between items-center'>
          <View className='flex-row items-center gap-3'>
            <TouchableOpacity onPress={() => router.back()} className='p-2 bg-gray-100 rounded-full'>
              <ArrowLeft size={20} color="#333" />
            </TouchableOpacity>
            <View>
              <Text className='text-xl font-bold text-gray-900'>Shopping List</Text>
              <Text className='text-sm text-gray-500'>{recipes.length} meals selected</Text>
            </View>
          </View>
          <TouchableOpacity className='bg-blue-600 px-4 py-2 rounded-full flex-row items-center gap-2'>
            <Share2 size={16} color="white" />
            <Text className='text-white font-medium'>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className='flex-1' contentContainerStyle={{ paddingBottom: 100 }}>
        <View className='max-w-4xl self-center w-full px-4 py-6'>
          
          {/* === PROGRESS CARD === */}
          <View className='bg-white rounded-2xl shadow-sm p-6 mb-6'>
            <View className='flex-row justify-between items-center mb-3'>
              <Text className='text-lg font-semibold text-gray-900'>Shopping Progress</Text>
              <Text className='text-2xl font-bold text-green-600'>
                {completedItems} / {totalItems}
              </Text>
            </View>
            <View className='w-full h-4 bg-gray-200 rounded-full overflow-hidden'>
              <View 
                className='h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full'
                style={{ width: `${progress}%`, backgroundColor: '#22c55e' }}
              />
            </View>
          </View>

          {/* === MAIN CONTENT GRID (Large Screens split here) === */}
          <View className='flex-col lg:flex-row gap-6'>
            
            {/* === LEFT COLUMN: ITEMS LIST === */}
            <View className='flex-1'>
              <View className='bg-white rounded-2xl shadow-sm p-6'>
                <View className='flex-row justify-between items-center mb-6'>
                  <Text className='text-xl font-bold text-gray-900'>Items ({totalItems})</Text>
                  {/* Category Toggle */}
                  <View className='flex-row bg-gray-100 rounded-full p-1'>
                    <TouchableOpacity 
                        onPress={() => setViewMode('category')}
                        className={`px-4 py-1.5 rounded-full ${viewMode === 'category' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <Text className={`text-sm font-medium ${viewMode === 'category' ? 'text-gray-900' : 'text-gray-600'}`}>
                        By Category
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => setViewMode('all')}
                        className={`px-4 py-1.5 rounded-full ${viewMode === 'all' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <Text className={`text-sm font-medium ${viewMode === 'all' ? 'text-gray-900' : 'text-gray-600'}`}>
                        All Items
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* === LIST RENDER LOGIC === */}
                {viewMode === 'category' ? (
                    /* OPTION A: GROUPED BY CATEGORY */
                    Object.entries(groupedItems).map(([category, catItems]) => {
                        const isCollapsed = collapsedCategories.has(category);
                        const checkedCount = catItems.filter(i => checkedIds.has(i.id)).length;
                        
                        return (
                            <View key={category} className='mb-6 border-2 border-gray-100 rounded-xl overflow-hidden'>
                                {/* Category Header */}
                                <TouchableOpacity 
                                    onPress={() => toggleCategory(category)}
                                    className='w-full flex-row items-center justify-between p-4 bg-gray-50 active:bg-gray-100'
                                >
                                    <View className='flex-row items-center gap-3'>
                                        <View className={`w-10 h-10 rounded-full items-center justify-center ${getCategoryColor(category)}`}>
                                            <Text className='font-bold text-lg'>{getCategoryIcon(category)}</Text>
                                        </View>
                                        <View>
                                            <Text className='font-semibold text-gray-900'>{category}</Text>
                                            <Text className='text-xs text-gray-500'>{checkedCount} / {catItems.length} items</Text>
                                        </View>
                                    </View>
                                    {isCollapsed ? <ChevronDown size={20} color="#9ca3af" /> : <ChevronUp size={20} color="#9ca3af" />}
                                </TouchableOpacity>

                                {/* Items (Using Helper) */}
                                {!isCollapsed && (
                                    <View className='p-4 bg-white'>
                                        {catItems.map(item => <ItemRow key={item.id} item={item} />)}
                                    </View>
                                )}
                            </View>
                        );
                    })
                ) : (
                    /* OPTION B: ALL ITEMS FLAT LIST */
                    <View className='gap-1'>
                        {items.length === 0 ? (
                            <Text className="text-center text-gray-400 py-10">No items found.</Text>
                        ) : (
                            items.map(item => <ItemRow key={item.id} item={item} />)
                        )}
                    </View>
                )}

                
              </View>

              {/* --- DELETED ITEMS SECTION --- */}
              {deletedItems.length > 0 && (
                <View className='mt-6 bg-gray-50 rounded-2xl p-4 border border-gray-200'>
                  <TouchableOpacity 
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setShowDeleted(!showDeleted);
                    }}
                    className='flex-row justify-between items-center'
                  >
                    <Text className='font-bold text-gray-600'>Deleted Items ({deletedItems.length})</Text>
                    {showDeleted ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                  </TouchableOpacity>
                  
                  {showDeleted && (
                    <View className='mt-4 gap-2'>
                        {deletedItems.map(item => (
                            <View key={item.id} className='flex-row justify-between items-center bg-white p-3 rounded-lg opacity-60'>
                                <Text className='text-grey-600'>{item.name}</Text>
                                <TouchableOpacity onPress={() => handleRestore(item.id)}>
                                    <RefreshCcw size={16} color="#3b82f6" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* === RIGHT COLUMN: SIDEBAR (Custom Item + Meals) === */}
            <View className='w-full lg:w-80 gap-6'>
                
                {/* Add Custom Item Box */}
                <View className='bg-white rounded-2xl shadow-sm p-6 z-50'>
                    <Text className='text-lg font-bold text-gray-900 mb-4'>Add Custom Item</Text>
                    <View className='gap-3 relative'>
                        <TextInput 
                            placeholder='Item name' 
                            value={customName}
                            onChangeText={setCustomName}
                            className='w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50' 
                        />
                        <TextInput 
                            placeholder='Amount (e.g. 2 lbs)' 
                            value={customAmount}
                            onChangeText={setCustomAmount}
                            className='w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50' 
                        />
                        {/* === DROPDOWN === */}
                        <View className="relative z-50">
                            <TouchableOpacity
                                onPress={() => setIsCatOpen(!isCatOpen)}
                                activeOpacity={0.8}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 flex-row justify-between items-center"
                            >
                                <Text className="text-gray-700">{customCategory}</Text>
                                {isCatOpen ? <ChevronUp size={20} color="#6b7280"/> : <ChevronDown size={20} color="#6b7280"/>}
                            </TouchableOpacity>

                            {/* The Dropdown List (Absolute Positioned) */}
                            {isCatOpen && (
                                <View className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48">
                                    <ScrollView nestedScrollEnabled>
                                        {categories.map((cat) => (
                                            <TouchableOpacity
                                                key={cat}
                                                className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                                                onPress={() => {
                                                    setCustomCategory(cat);
                                                    setIsCatOpen(false);
                                                }}
                                            >
                                                <Text className={`text-sm ${customCategory === cat ? 'font-bold text-teal-600' : 'text-gray-700'}`}>
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                        
                        <TouchableOpacity 
                            onPress={handleAddCustomItem}
                            className='w-full bg-blue-600 py-3 rounded-lg flex-row justify-center items-center gap-2 mt-2 shadow-sm'
                        >
                            <Plus size={18} color="white" />
                            <Text className='text-white font-bold'>Add Item</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Your Meals Mini List */}
                <View className='bg-white w-full rounded-2xl shadow-sm p-6'>
                    <Text className='text-lg font-bold text-gray-900 mb-4'>Your Meals</Text>
                    <View className='gap-3 w-full'>
                        {recipes.map(recipe => (
                            <View key={recipe.id} className='flex-row w-full items-center gap-3 p-2 bg-gray-50 rounded-lg'>
                                <Image 
                                    source={typeof recipe.imageUrl === 'string' ? { uri: recipe.imageUrl } : recipe.imageUrl} 
                                    className='rounded-lg bg-gray-200'
                                    style={{width:100, height:100}}
                                />
                                <View className='flex-1'>
                                    <Text className='text-sm font-semibold text-gray-900' numberOfLines={1}>
                                        {recipe.title}
                                    </Text>
                                    <Text className='text-xs text-gray-500'>
                                        {recipe.ingredients.length} ingredients
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Back to Home CTA */}
                <View className='bg-gradient-to-br from-orange-500 to-green-500 rounded-2xl shadow-lg p-6'>
                    <Text className='text-lg font-bold text-white mb-1'>Done With Shopping?</Text>
                    <Text className='text-sm text-white/90 mb-4'>Go to your selected recipes!</Text>
                    
                    <TouchableOpacity 
                        onPress={() => router.push('/profile')} // Link to profile as requested
                        className='w-full bg-white py-3 rounded-lg flex-row justify-center items-center gap-2'
                    >
                        <Home size={18} color="#333" />
                        <Text className='text-gray-900 font-bold'>Go to Profile</Text>
                    </TouchableOpacity>
                </View>

            </View>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper for category colors
// const getCategoryColor = (cat: string) => {
//     switch(cat.toLowerCase()) {
//         case 'meat': return 'bg-red-100 text-red-600';
//         case 'produce': return 'bg-green-100 text-green-600';
//         case 'dairy': return 'bg-blue-100 text-blue-600';
//         case 'pantry': return 'bg-yellow-100 text-yellow-600';
//         default: return 'bg-gray-100 text-gray-600';
//     }
// };

const getCategoryIcon = (category: string) => {
  const iconSize = 20;
  const iconColor = 'white';
  
  switch (category.toLowerCase()) {
    case 'produce':
      return <Apple size={iconSize} color={iconColor} />;
    case 'meat':
      return <Beef size={iconSize} color={iconColor} />;
    case 'dairy':
      return <Milk size={iconSize} color={iconColor} />;
    case 'eggs':
      return <Egg size={iconSize} color={iconColor} />;
    case 'grains':
    case 'bread':
      return <Wheat size={iconSize} color={iconColor} />;
    case 'pantry':
    case 'spices':
      return <UtensilsCrossed size={iconSize} color={iconColor} />;
    case 'seafood':
    case 'fish':
      return <Fish size={iconSize} color={iconColor} />;
    case 'beverages':
    case 'drinks':
      return <Wine size={iconSize} color={iconColor} />;
    case 'herbs':
    case 'fresh':
      return <Leaf size={iconSize} color={iconColor} />;
    default:
      return <Package size={iconSize} color={iconColor} />;
  }
};

const getCategoryColor = (cat: string) => {
  switch (cat.toLowerCase()) {
    case 'produce':
      return 'bg-green-600 text-green-600';
    case 'meat':
      return 'bg-red-600 text-red-600';
    case 'dairy':
      return 'bg-blue-600 text-blue-600';
    case 'eggs':
      return 'bg-yellow-600 text-yellow-600';
    case 'grains':
    case 'bread':
      return 'bg-amber-600 text-amber-600';
    case 'pantry':
    case 'spices':
      return 'bg-orange-600 text-orange-600';
    case 'seafood':
    case 'fish':
      return 'bg-cyan-600 text-cyan-600';
    case 'beverages':
    case 'drinks':
      return 'bg-purple-600 text-purple-600';
    case 'herbs':
    case 'fresh':
      return 'bg-emerald-600 text-emerald-600';
    default:
      return 'bg-gray-600 text-gray-600';
  }
};