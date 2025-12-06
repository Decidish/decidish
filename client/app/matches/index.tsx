import React, { useState, useEffect } from 'react';
import { UIManager, Platform, LayoutAnimation, View, SafeAreaView, TouchableOpacity, Image, Text, FlatList, ScrollView, useWindowDimensions } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShoppingCart, X, Bookmark, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react-native';
import { Recipe } from '@/api/models/recipe';
import CardItem from '@/components/carditem'; 
import { start } from 'repl';
import { relative } from 'path';


export default function MatchesPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const [deletedRecipes, setDeletedRecipes] = useState<Recipe[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const [showDeleted, setShowDeleted] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = width > 768

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

  const handleDeleteRecipe = (recipe: Recipe) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    setSelectedRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    setDeletedRecipes((prev) => [recipe, ...prev]);
  };

  const handleRestore = (recipe: Recipe) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setDeletedRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    setSelectedRecipes((prev) => [...prev, recipe]);
  };

  // Bookmark recipe (save to AsyncStorage + backend)
  const handleBookmarkRecipe = async (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // recipeClient.deleteBookmark(id);
      } else {
        next.add(id);
        // recipeClient.bookmarkRecipe(id).catch(err => console.error(err))
      }
      return next;
    });
  };

  const handleGoToShoppingList = () => {
    if (selectedRecipes.length === 0) return;
    // Navigate to Shopping List with the current list of recipes
    router.push({
      pathname: '/shoppinglist',
      params: { 
        recipes: JSON.stringify(selectedRecipes),
      }
    });
  };

  // Parse recipes from route params
  useEffect(() => {
    if (params.selectedRecipes) {
      try {
        const recipes = JSON.parse(params.selectedRecipes as string);
        setSelectedRecipes(recipes);
      } catch (error) {
        console.error('Failed to parse recipes:', error);
      }
    }
  }, [params.selectedRecipes]);

  return (
    <SafeAreaView className='flex-1 bg-slate-50'>
      <Stack.Screen options={{ headerShown: false }} />

     {/* === TOP BAR === */}
      <View className='w-full bg-white items-center border-b border-gray-200 px-5 py-3'>
        <View className='w-full max-w-4xl justify-center'>
        {/* Back button + Selected count */}
          <View className='flex-row w-full justify-between items-center mb-3'>
            <View className='flex-row justify-center items-center'>
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color="#333" />
              </TouchableOpacity>
              <Text className='pl-2 text-lg md:text-2xl font-bold text-slate-800'>
                Selected Meals
              </Text>
            </View>
            
            <View className='flex-row justify-center items-center'>
              <Text className='pr-2 w-full text-lg md:text-2xl font-bold text-slate-800'>
                {selectedRecipes.length} Items
              </Text>
            </View>  
          </View>

        </View>
      </View>
      
      {/* === RECIPES GRID === */}
      <ScrollView 
        className='flex-1'
        contentContainerStyle={{paddingBottom: (deletedRecipes.length == 0 ?  80 : 0) }}
      >
        <View className='w-full px-5 py-4 max-w-2xl self-center flex-row flex-wrap justify-between'
        >
          {selectedRecipes.map((recipe, index) => (
            <View
              key={recipe.id || index}
              style={{
                width: isDesktop ? '49%' : '98%',
                height: 460,
                paddingVertical: 5,
                position: 'relative',
                
              }}
            >
              {/* DELETE BUTTON (Top Left) */}
              <TouchableOpacity
                onPress={() => handleDeleteRecipe(recipe)}
                activeOpacity={0.8}
                style={{ zIndex: 50 }} // Force on top
                className='absolute top-3 left-3 bg-white/90 p-2 rounded-full shadow-sm border border-gray-100'
              >
                <X size={20} color="#ef4444" strokeWidth={2.5} />
              </TouchableOpacity>

              {/* BOOKMARK BUTTON (Top Right) */}
              <TouchableOpacity
                onPress={() => handleBookmarkRecipe(recipe.id)}
                activeOpacity={0.8}
                style={{ zIndex: 50 }} // Force on top
                className={`absolute top-3 right-3 p-2 rounded-full shadow-sm border border-gray-100 ${
                    bookmarkedIds.has(recipe.id) ? 'bg-teal-50' : 'bg-white/90'
                }`}
              >
                <Bookmark 
                  size={20} 
                  color={bookmarkedIds.has(recipe.id) ? '#0d9488' : '#64748b'} 
                  fill={bookmarkedIds.has(recipe.id) ? '#0d9488' : 'none'}
                />
              </TouchableOpacity>

              <CardItem recipe={recipe} />
            </View>
          ))}
        </View>

        {/* Empty State */}
        {selectedRecipes.length === 0 && (
          <View className='flex-1 justify-center items-center py-20'>
            <Text className='text-xl font-bold text-slate-800 mb-2'>No meals selected yet</Text>
            <Text className='text-sm text-slate-500'>Go back and select some recipes</Text>
          </View>
        )}

        {/* --- DELETED ITEMS BAR (Only show if items exist) --- */}
        {deletedRecipes.length > 0 && (
            <View className="w-full max-w-2xl self-center px-4 mt-8"
            style={{paddingBottom: 90}}>
                {/* Expand/Collapse Header */}
                <TouchableOpacity
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setShowDeleted(!showDeleted);
                    }}
                    className="flex-row items-center justify-between bg-gray-200 px-4 py-3 rounded-xl mb-4"
                >
                    <View className="flex-row items-center gap-2">
                        <Trash2 size={18} color="#4b5563" />
                        <Text className="font-bold text-gray-700">
                            Recently Deleted ({deletedRecipes.length})
                        </Text>
                    </View>
                    {showDeleted ? (
                        <ChevronUp size={20} color="#4b5563" />
                    ) : (
                        <ChevronDown size={20} color="#4b5563" />
                    )}
                </TouchableOpacity>

                {/* Deleted Grid (Conditional Render) */}
                {showDeleted && (
                    <View className='w-full h-full px-5 py-4 max-w-2xl self-center flex-row flex-wrap justify-between'>
                        {deletedRecipes.map((recipe) => (
                            <View
                                key={recipe.id}
                                style={{
                                    width: isDesktop ? '48%' : '98%',
                                    height: 460,
                                    paddingVertical: 5,
                                    position: 'relative',
                                }}
                            >
                                {/* Grayscale wrapper or just regular card */}
                                <CardItem recipe={recipe} />

                                <View 
                                    className="absolute top-0 left-0 w-full h-full bg-slate-200/60 rounded-3xl z-10"
                                    style={{ mixBlendMode: 'saturation' }}
                                />

                                {/* RESTORE BUTTON (Top Left - Replaces Delete) */}
                                <TouchableOpacity
                                    onPress={() => handleRestore(recipe)}
                                    activeOpacity={0.8}
                                    style={{ zIndex: 50 }}
                                    className='absolute top-3 left-3 bg-blue-500 p-2 rounded-full shadow-sm border border-blue-600'
                                >
                                    {/* Plus Icon to Restore */}
                                    <Plus size={20} color="white" strokeWidth={3} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
            )}
          </View>
        )}
      </ScrollView>

    
      {/* === BOTTOM BUTTON === */}
      {selectedRecipes.length > 0 && (
        <View className='absolute items-center justify-center bottom-0 w-full px-2 py-4'
        >
          <TouchableOpacity
            onPress={handleGoToShoppingList}
            className='w-full max-w-lg bg-teal-500 rounded-2xl py-4 flex-row items-center justify-center gap-2'
          >
            <ShoppingCart size={24} color="white" />
            <Text className='text-white font-bold text-lg'>
              Create Shopping List
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
