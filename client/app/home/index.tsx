import React, { useRef, useState, useEffect } from 'react';
import { View, SafeAreaView, TouchableOpacity,Image, Text, Dimensions, StyleSheet } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Stack } from 'expo-router';
// Icons
import { X, Heart, RotateCcw, Filter } from 'lucide-react-native';
// Components & Data
import CardItem from '@/components/carditem'; 
import { MOCK_RECIPES } from '@/assets/data/demo'; // data
import { Recipe } from '@/api/models/recipe'; // interface

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomePage() {
  const swiperRef = useRef<Swiper<Recipe>>(null);
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES.slice(0, 5));
  const [currentIndex, setCurrentIndex] = useState(0);
   const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // const recipeClient = new RecipeClient();

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
  const handleSwipeLeft = () => {
    swiperRef.current?.swipeLeft();
  };

  const handleSwipeRight = () => {
    swiperRef.current?.swipeRight();
  };

  const handleUndo = () => {
    swiperRef.current?.swipeBack();
  };

  return (
    <SafeAreaView style={styles.container} className='flex-1 bg-slate-50'>
      <Stack.Screen options={{ headerShown: false }} />

      {/* === HEADER === */}
      <View style={styles.header} className=' max-w-md md:max-w-6xl w-full px-5 pt-3 pb-6 flex-row justify-between items-center z-10'>
        <View >
          <Text style={styles.headerTitle} className='text-3xl font-bold text-slate-800'>Discover</Text>
          <Text style={styles.headerSubtitle} className='text-sm text-slate-500'>Find your next meal</Text>
        </View>
        <TouchableOpacity style={styles.filterButton} className='p-2 bg-white rounded-xl shadow-sm shadow-black/5'>
          <Filter size={24} color="#333" />
        </TouchableOpacity>
      </View>

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
            onSwiped={(index) => setCurrentIndex(index + 1)}
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
        <View  className=' w-full max-w-sm flex-row justify-evenly items-center py-5 px-10'>
          {/* Dislike */}
          <TouchableOpacity 
            onPress={handleSwipeLeft} 
            style={[styles.actionButton, styles.buttonShadow]}
            className='w-16 h-16 bg-white rounded-full justify-center items-center border border-slate-100
            shadow-md shadow-black/10'
          >
            <X size={32} color="#ef4444" strokeWidth={3} />
          </TouchableOpacity>

          {/* Undo (Small) */}
          <TouchableOpacity 
            onPress={handleUndo} 
            style={[styles.smallButton, styles.buttonShadow]}
            className='w-12 h-12 bg-white rounded-full justify-center items-center border border-slate-100 mt-2.5
            shadow-md shadow-black/10'
          >
            <RotateCcw size={20} color="#f59e0b" />
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity 
            onPress={handleSwipeRight} 
            style={[styles.actionButton, styles.buttonShadow]}
            className='w-16 h-16 bg-white rounded-full justify-center items-center border border-slate-100
            shadow-md shadow-black/10'
          >
            <Heart size={32} color="#10b981" fill="#10b981" />
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