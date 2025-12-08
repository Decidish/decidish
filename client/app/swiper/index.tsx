import React, { useRef, useState, useEffect } from 'react';
import { View, SafeAreaView, TouchableOpacity,Image, Text, Dimensions, StyleSheet } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Stack, useRouter } from 'expo-router';
// Icons
import { X, Heart, RotateCcw, Filter, Bookmark, ChefHat, CookingPot, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react-native';
// Components & Data
import CardItem from '@/components/carditem'; 
import { MOCK_RECIPES } from '@/assets/data/demo'; // data
import { Recipe } from '@/api/models/recipe'; // interface

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type HistoryItem = {
  action: 'like' | 'dislike';
  cardIndex: number;
  recipeId?: string; // Only needed if action is 'like'
};

export default function HomePage() {
  const swiperRef = useRef<Swiper<Recipe>>(null);

  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES.slice(0, 5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // const recipeClient = new RecipeClient();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);

  const router = useRouter();

  // State for meal planning
  const [daysSelected, setDaysSelected] = useState(1); // 1, 2, 3, 7
  const [expandedMealPlanner, setExpandedMealPlanner] = useState(false);

  // Calculate total meals needed and progress
  const mealsPerDay = 2;
  const totalMealsNeeded = daysSelected * mealsPerDay;
  const mealsSelected = likedRecipes.length;
  const progressPercent = (mealsSelected / totalMealsNeeded) * 100;


   // Load more recipes when user is close to the end
  useEffect(() => {
    // If user is within 3 cards of the end, load more
    if (currentIndex >= recipes.length - 3 && !isLoading && hasMore) {
      loadMoreRecipes();
    }
  }, [currentIndex]);

  const loadMoreRecipes = async () => {
    setIsLoading(true);
    try {
      // Fetch next batch (you can paginate or filter by offset)
      // const newRecipes = await recipeClient.searchRecipes('', 10);
      const newRecipes = MOCK_RECIPES;
      
      // if (newRecipes.recipes.length === 0) {
      if (newRecipes.length === 0) {
        setHasMore(false);
      } else {
        // Append new recipes to existing ones
        setRecipes(prev => [...prev, ...newRecipes]);
        // setRecipes(prev => [...prev, ...newRecipes.recipes]);
      }
    } catch (error) {
      console.error('Failed to load more recipes:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Button Handlers ---
  const triggerLike = () => {
    swiperRef.current?.swipeRight();
  };

  const triggerDislike = () => {
    swiperRef.current?.swipeLeft();
  };

  const handleSwipeRight = (idx: number) => {
    const recipe = recipes[idx];
    if (recipe) {
    setLikedRecipes(prev => [...prev, recipe]);
    setHistory(prev => [...prev, { action: 'like', cardIndex: idx, recipeId: recipe.id }]);
    }
    setCurrentIndex(idx + 1)
  };

  const handleSwipeLeft = (idx: number) => {
    setHistory(prev => [...prev, { action: 'dislike', cardIndex: idx }]);
    setCurrentIndex(idx + 1);
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];
    // Remove from history
    setHistory(prev => prev.slice(0, -1));
    // If it was a like, remove from liked recipes
    if (lastAction.action === 'like' && lastAction.recipeId) {
      setLikedRecipes(prev => prev.filter(r => r.id !== lastAction.recipeId));
    }
    // Jump back to previous card
    setCurrentIndex(lastAction.cardIndex);
    swiperRef.current?.swipeBack();
  };

  const handleContinue = () => {
      // Pass liked recipes to matches page
      router.push({
        pathname: '/matches',
        params: { selectedRecipes: JSON.stringify(likedRecipes) }
      });
  };

  const handleDaySelect = (days: number) => {
    setDaysSelected(days);
    // If user had selected meals beyond new limit, trim them
    // if (likedRecipes.length > days * mealsPerDay) {
    //   setLikedRecipes(likedRecipes.slice(0, days * mealsPerDay));
    // }
  };

  
  return (
    <SafeAreaView style={styles.container} className='flex-1 bg-slate-50'>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* === TOP BAR === */}
      <View className=' w-full bg-white items-center border-b border-gray-200 px-5 py-3'>
        <View className='w-full max-w-4xl justify-center'>
        {/* Back button + Selected count */}
          <View className='flex-row w-full justify-between items-center mb-3'>
            <View className='flex-row justify-center items-center'>
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color="#333" />
              </TouchableOpacity>
              <Text className='pl-2 text-lg md:text-2xl font-bold text-slate-800'>
                Select Your Meals
              </Text>
            </View>
            
            <View className='flex-row justify-center items-center'>
              <Text className='pr-2 w-full text-lg md:text-2xl font-bold text-slate-800'>
                {mealsSelected}/{totalMealsNeeded}
              </Text>
              <TouchableOpacity onPress={() => setExpandedMealPlanner(!expandedMealPlanner)}>
                {expandedMealPlanner ? (
                  <ChevronUp size={24} color="#333" />
                ) : (
                  <ChevronDown size={24} color="#333" />
                )}
              </TouchableOpacity>
            </View>  
          </View>

          {/* Progress bar */}
          <View className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
            <View 
              className='h-full bg-teal-500 rounded-full'
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </View>
        </View>
      </View>

      {/* === EXPANDABLE MEAL PLANNER (NORMAL FLOW) === */}
    {expandedMealPlanner && (
      <View className='w-full items-center bg-white border-b border-gray-200 px-5 py-4'>
        <View className='max-w-4xl w-full'>
        <Text className='text-sm font-bold text-slate-700 mb-3'>Plan meals for</Text>
        <View className='flex-row justify-between gap-2'>
          {[
            { days: 1, label: '1 day' },
            { days: 2, label: '2 days' },
            { days: 3, label: '3 days' },
            { days: 7, label: '1 week' },
            ].map(({ days, label }) => (
            <TouchableOpacity
              key={days}
              onPress={() => handleDaySelect(days)}
              className={`flex-1 py-2 px-3 rounded-lg border ${
                daysSelected === days
                  ? 'bg-teal-500 border-teal-500'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text 
                className={`text-xs font-bold text-center ${
                  daysSelected === days ? 'text-white' : 'text-slate-700'
                }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        </View>
      </View>
    )}

      {/* === MAIN CONTENT (Swiper or "No More") === */}
      <View className=' w-full h-[75%] md:max-w-3xl relative z-0'>
          <Swiper
            ref={swiperRef}
            cards={recipes}
            cardIndex={currentIndex}
            renderCard={(recipe: Recipe) => {
              return <View style={{padding:10}} className='w-full h-full  '>
                        <CardItem recipe={recipe} />
                      </View>
            }}
            onSwipedRight={handleSwipeRight}
            onSwipedLeft={handleSwipeLeft}
            onSwiped={(idx) => setCurrentIndex(idx + 1)}
            stackSize={3}
            backgroundColor={'transparent'}
            verticalSwipe={false}
            animateCardOpacity
            cardVerticalMargin={0}
            cardHorizontalMargin={0}
            containerStyle={{ backgroundColor: 'transparent',
              height: '100%',
              width: '100%',
            }}
            cardStyle={{
              width: '100%',
              height: '100%',
            }}

            // OPTIONAL: Overlay labels (Green LIKE / Red NOPE text on swipe)
            overlayLabels={{
              left: {
                title: 'NOPE',
                style: {
                  label: {
                    backgroundColor: 'red',
                    borderColor: 'red',
                    color: 'white',
                    borderWidth: 1,
                  },
                  wrapper: {
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-start',
                    marginTop: 30,
                    marginLeft: 30,
                  },
                },
              },
              right: {
                title: 'YUM!',
                style: {
                  label: {
                    backgroundColor: '#10b981', // Emerald/Teal
                    borderColor: '#10b981',
                    color: 'white',
                    borderWidth: 1,
                  },
                  wrapper: {
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    marginTop: 30,
                    marginLeft: -30,
                  },
                },
              },
            }}
          />
      </View>

      {/* === BOTTOM ACTION BUTTONS === */}
        <View  className='absolute bottom-0 w-full max-w-sm flex-row justify-evenly items-center py-5 px-10'>
          {/* Undo (Small) */}
          <TouchableOpacity 
            onPress={handleUndo} 
            style={[styles.smallButton, styles.buttonShadow]}
            className='w-12 h-12 bg-white rounded-full justify-center items-center border border-slate-100 mt-2.5
            shadow-md shadow-black/10'
          >
            <RotateCcw size={20} color="#f59e0b" />
          </TouchableOpacity>

          {/* Dislike */}
          <TouchableOpacity 
            onPress={triggerDislike} 
            style={[styles.actionButton, styles.buttonShadow]}
            className='w-16 h-16 bg-white rounded-full justify-center items-center border border-slate-100
            shadow-md shadow-black/10'
          >
            <X size={32} color="#ef4444" strokeWidth={3} />
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity 
            onPress={triggerLike} 
            style={[styles.actionButton, styles.buttonShadow]}
            className='w-16 h-16 bg-white rounded-full justify-center items-center border border-slate-100
            shadow-md shadow-black/10'
          >
            <Heart size={32} color="#10b981" fill="#10b981" />
          </TouchableOpacity>

          {/* Matches (Small) */}
          <TouchableOpacity
            onPress={handleContinue}  // adjust route to your matches screen
            style={[styles.smallButton, styles.buttonShadow]}
            className="w-12 h-12 bg-white rounded-full justify-center items-center border border-slate-100 mt-2.5 shadow-md shadow-black/10"
          >
            <ChefHat size={20} color="#0ea5e9" /> 
          </TouchableOpacity>

        </View>
    </SafeAreaView>
  );
}

// I used StyleSheet here for complex layout positioning which is sometimes
// clearer than tailwind for absolute positioning logic
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Slate-50 background
    alignItems: 'center'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  filterButton: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  swiperContainer: {
    flex: 1,
    marginTop: -20, // Pull swiper up slightly to overlap spacing
  },
  // Buttons fixed at bottom
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  actionButton: {
    width: 64,
    height: 64,
    backgroundColor: 'white',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  smallButton: {
    width: 48,
    height: 48,
    backgroundColor: 'white',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 10, // Slight offset to look aesthetic
  },
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  // Empty State Styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  refreshButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
  }
});