import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  weight: string;
  unit: string;
}

interface Ingredient {
  id: number;
  name: string;
  amount: string;
  products: Product[];
}

interface Recipe {
  id: number;
  name: string;
  image: string;
  calories: number;
  totalTime: number;
  difficulty: string;
  servings: number;
  description: string;
  ingredients: Ingredient[];
}

export default function RecipeSwiper() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [currentIngredientIndex, setCurrentIngredientIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, Product | 'already-have'>>({});
  const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);
  const [servingsNeeded, setServingsNeeded] = useState(12);
  const [servingsCollected, setServingsCollected] = useState(0);
  const [showAllProducts, setShowAllProducts] = useState(false);

  const recipes: Recipe[] = [
    {
      id: 1,
      name: 'Mediterranean Grilled Chicken',
      image: 'https://readdy.ai/api/search-image?query=beautifully%20plated%20mediterranean%20grilled%20chicken%20with%20herbs%20and%20lemon%20on%20white%20ceramic%20plate%20with%20colorful%20roasted%20vegetables%20and%20olive%20oil%20drizzle%20professional%20food%20photography%20bright%20natural%20lighting&width=600&height=800&seq=recipe1&orientation=portrait',
      calories: 420,
      totalTime: 35,
      difficulty: 'Easy',
      servings: 4,
      description: 'Juicy grilled chicken marinated in Mediterranean herbs, served with roasted vegetables and a light lemon dressing.',
      ingredients: [
        { 
          id: 1, 
          name: 'Chicken Breast', 
          amount: '4 pieces (800g)', 
          products: [
            { id: 'p1', name: 'Fresh Chicken Breast Fillets', brand: 'Perdue', image: 'https://readdy.ai/api/search-image?query=packaged%20fresh%20chicken%20breast%20fillets%20in%20clear%20plastic%20tray%20with%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chicken1&orientation=squarish', price: 12.99, weight: '900', unit: 'g' },
            { id: 'p2', name: 'Organic Chicken Breast', brand: 'Bell & Evans', image: 'https://readdy.ai/api/search-image?query=organic%20chicken%20breast%20package%20in%20clear%20wrap%20with%20organic%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chicken2&orientation=squarish', price: 15.99, weight: '850', unit: 'g' },
            { id: 'p3', name: 'Free Range Chicken Breast', brand: 'Tyson', image: 'https://readdy.ai/api/search-image?query=free%20range%20chicken%20breast%20in%20plastic%20packaging%20with%20brand%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chicken3&orientation=squarish', price: 13.49, weight: '1000', unit: 'g' }
          ]
        },
        { 
          id: 2, 
          name: 'Olive Oil', 
          amount: '3 tbsp (45ml)', 
          products: [
            { id: 'p4', name: 'Extra Virgin Olive Oil', brand: 'Bertolli', image: 'https://readdy.ai/api/search-image?query=bertolli%20extra%20virgin%20olive%20oil%20glass%20bottle%20with%20yellow%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=oil1&orientation=squarish', price: 8.99, weight: '500', unit: 'ml' },
            { id: 'p5', name: 'Premium Olive Oil', brand: 'Filippo Berio', image: 'https://readdy.ai/api/search-image?query=premium%20olive%20oil%20in%20green%20glass%20bottle%20with%20elegant%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=oil2&orientation=squarish', price: 11.99, weight: '750', unit: 'ml' },
            { id: 'p6', name: 'Organic Extra Virgin Olive Oil', brand: 'Colavita', image: 'https://readdy.ai/api/search-image?query=organic%20extra%20virgin%20olive%20oil%20dark%20glass%20bottle%20with%20organic%20certification%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=oil3&orientation=squarish', price: 14.99, weight: '500', unit: 'ml' }
          ]
        },
        { 
          id: 3, 
          name: 'Lemon', 
          amount: '2 pieces', 
          products: [
            { id: 'p7', name: 'Fresh Lemons', brand: 'Sunkist', image: 'https://readdy.ai/api/search-image?query=fresh%20yellow%20lemons%20in%20mesh%20bag%20with%20sunkist%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=lemon1&orientation=squarish', price: 3.99, weight: '500', unit: 'g' },
            { id: 'p8', name: 'Organic Lemons', brand: 'Organic Valley', image: 'https://readdy.ai/api/search-image?query=organic%20lemons%20in%20clear%20package%20with%20organic%20certification%20sticker%20on%20white%20background%20product%20photography&width=300&height=300&seq=lemon2&orientation=squarish', price: 5.49, weight: '450', unit: 'g' },
            { id: 'p9', name: 'Meyer Lemons', brand: 'Melissa\'s', image: 'https://readdy.ai/api/search-image?query=meyer%20lemons%20in%20small%20basket%20with%20premium%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=lemon3&orientation=squarish', price: 6.99, weight: '400', unit: 'g' }
          ]
        },
        { 
          id: 4, 
          name: 'Fresh Herbs Mix', 
          amount: '1 bunch (30g)', 
          products: [
            { id: 'p10', name: 'Italian Herb Mix', brand: 'Fresh Express', image: 'https://readdy.ai/api/search-image?query=fresh%20italian%20herbs%20basil%20rosemary%20thyme%20in%20clear%20plastic%20container%20on%20white%20background%20product%20photography&width=300&height=300&seq=herbs1&orientation=squarish', price: 4.99, weight: '30', unit: 'g' },
            { id: 'p11', name: 'Mediterranean Herb Bundle', brand: 'Organic Herbs', image: 'https://readdy.ai/api/search-image?query=fresh%20mediterranean%20herbs%20bundle%20tied%20with%20string%20on%20white%20background%20product%20photography&width=300&height=300&seq=herbs2&orientation=squarish', price: 5.99, weight: '40', unit: 'g' },
            { id: 'p12', name: 'Fresh Herb Trio Pack', brand: 'Garden Fresh', image: 'https://readdy.ai/api/search-image?query=three%20compartment%20pack%20with%20fresh%20basil%20parsley%20oregano%20on%20white%20background%20product%20photography&width=300&height=300&seq=herbs3&orientation=squarish', price: 6.49, weight: '45', unit: 'g' }
          ]
        }
      ]
    },
    {
      id: 2,
      name: 'Creamy Mushroom Pasta',
      image: 'https://readdy.ai/api/search-image?query=elegant%20creamy%20mushroom%20pasta%20in%20white%20bowl%20with%20fresh%20parmesan%20cheese%20and%20herbs%20garnish%20on%20marble%20surface%20professional%20food%20photography%20soft%20lighting&width=600&height=800&seq=recipe2&orientation=portrait',
      calories: 580,
      totalTime: 25,
      difficulty: 'Easy',
      servings: 3,
      description: 'Rich and creamy pasta with sautéed mushrooms, garlic, and parmesan cheese.',
      ingredients: [
        { 
          id: 5, 
          name: 'Pasta', 
          amount: '300g', 
          products: [
            { id: 'p13', name: 'Penne Rigate', brand: 'Barilla', image: 'https://readdy.ai/api/search-image?query=barilla%20penne%20pasta%20blue%20box%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=pasta1&orientation=squarish', price: 2.99, weight: '500', unit: 'g' },
            { id: 'p14', name: 'Fettuccine', brand: 'De Cecco', image: 'https://readdy.ai/api/search-image?query=de%20cecco%20fettuccine%20pasta%20in%20blue%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=pasta2&orientation=squarish', price: 3.49, weight: '500', unit: 'g' },
            { id: 'p15', name: 'Organic Spaghetti', brand: 'Bionaturae', image: 'https://readdy.ai/api/search-image?query=organic%20spaghetti%20pasta%20in%20clear%20package%20with%20organic%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=pasta3&orientation=squarish', price: 4.99, weight: '500', unit: 'g' }
          ]
        },
        { 
          id: 6, 
          name: 'Mushrooms', 
          amount: '400g', 
          products: [
            { id: 'p16', name: 'White Button Mushrooms', brand: 'Giorgio', image: 'https://readdy.ai/api/search-image?query=white%20button%20mushrooms%20in%20clear%20plastic%20container%20on%20white%20background%20product%20photography&width=300&height=300&seq=mushroom1&orientation=squarish', price: 4.99, weight: '450', unit: 'g' },
            { id: 'p17', name: 'Baby Bella Mushrooms', brand: 'Monterey', image: 'https://readdy.ai/api/search-image?query=baby%20bella%20cremini%20mushrooms%20in%20plastic%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=mushroom2&orientation=squarish', price: 5.99, weight: '400', unit: 'g' },
            { id: 'p18', name: 'Organic Mixed Mushrooms', brand: 'Whole Foods', image: 'https://readdy.ai/api/search-image?query=organic%20mixed%20mushrooms%20variety%20pack%20in%20clear%20container%20on%20white%20background%20product%20photography&width=300&height=300&seq=mushroom3&orientation=squarish', price: 7.99, weight: '350', unit: 'g' }
          ]
        },
        { 
          id: 7, 
          name: 'Heavy Cream', 
          amount: '200ml', 
          products: [
            { id: 'p19', name: 'Heavy Whipping Cream', brand: 'Land O Lakes', image: 'https://readdy.ai/api/search-image?query=heavy%20whipping%20cream%20carton%20with%20red%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=cream1&orientation=squarish', price: 4.49, weight: '473', unit: 'ml' },
            { id: 'p20', name: 'Organic Heavy Cream', brand: 'Horizon', image: 'https://readdy.ai/api/search-image?query=organic%20heavy%20cream%20carton%20with%20blue%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=cream2&orientation=squarish', price: 5.99, weight: '473', unit: 'ml' },
            { id: 'p21', name: 'Premium Cooking Cream', brand: 'Darigold', image: 'https://readdy.ai/api/search-image?query=premium%20cooking%20cream%20container%20with%20green%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=cream3&orientation=squarish', price: 4.99, weight: '500', unit: 'ml' }
          ]
        },
        { 
          id: 8, 
          name: 'Parmesan Cheese', 
          amount: '100g', 
          products: [
            { id: 'p22', name: 'Grated Parmesan', brand: 'Kraft', image: 'https://readdy.ai/api/search-image?query=kraft%20grated%20parmesan%20cheese%20green%20shaker%20bottle%20on%20white%20background%20product%20photography&width=300&height=300&seq=parm1&orientation=squarish', price: 6.99, weight: '227', unit: 'g' },
            { id: 'p23', name: 'Parmigiano Reggiano Block', brand: 'BelGioioso', image: 'https://readdy.ai/api/search-image?query=parmigiano%20reggiano%20cheese%20wedge%20in%20clear%20wrap%20on%20white%20background%20product%20photography&width=300&height=300&seq=parm2&orientation=squarish', price: 12.99, weight: '200', unit: 'g' },
            { id: 'p24', name: 'Shredded Parmesan', brand: 'Sargento', image: 'https://readdy.ai/api/search-image?query=shredded%20parmesan%20cheese%20in%20resealable%20bag%20on%20white%20background%20product%20photography&width=300&height=300&seq=parm3&orientation=squarish', price: 5.49, weight: '150', unit: 'g' }
          ]
        }
      ]
    },
    {
      id: 3,
      name: 'Asian Salmon Bowl',
      image: 'https://readdy.ai/api/search-image?query=colorful%20asian%20salmon%20poke%20bowl%20with%20fresh%20vegetables%20avocado%20edamame%20and%20sesame%20seeds%20in%20ceramic%20bowl%20on%20wooden%20table%20professional%20food%20photography%20top%20view%20bright%20lighting&width=600&height=800&seq=recipe3&orientation=portrait',
      calories: 520,
      totalTime: 30,
      difficulty: 'Medium',
      servings: 2,
      description: 'Fresh salmon with rice, avocado, edamame, and a tangy Asian-inspired dressing.',
      ingredients: [
        { 
          id: 9, 
          name: 'Salmon Fillet', 
          amount: '300g', 
          products: [
            { id: 'p25', name: 'Atlantic Salmon Fillet', brand: 'Sea Best', image: 'https://readdy.ai/api/search-image?query=fresh%20atlantic%20salmon%20fillet%20in%20clear%20plastic%20wrap%20on%20white%20background%20product%20photography&width=300&height=300&seq=salmon1&orientation=squarish', price: 14.99, weight: '340', unit: 'g' },
            { id: 'p26', name: 'Wild Caught Salmon', brand: 'Copper River', image: 'https://readdy.ai/api/search-image?query=wild%20caught%20salmon%20fillet%20in%20vacuum%20sealed%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=salmon2&orientation=squarish', price: 19.99, weight: '300', unit: 'g' },
            { id: 'p27', name: 'Organic Salmon Fillet', brand: 'Whole Foods', image: 'https://readdy.ai/api/search-image?query=organic%20salmon%20fillet%20in%20eco%20friendly%20packaging%20on%20white%20background%20product%20photography&width=300&height=300&seq=salmon3&orientation=squarish', price: 17.99, weight: '350', unit: 'g' }
          ]
        },
        { 
          id: 10, 
          name: 'Sushi Rice', 
          amount: '200g', 
          products: [
            { id: 'p28', name: 'Premium Sushi Rice', brand: 'Nishiki', image: 'https://readdy.ai/api/search-image?query=nishiki%20sushi%20rice%20bag%20with%20red%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=rice1&orientation=squarish', price: 8.99, weight: '1000', unit: 'g' },
            { id: 'p29', name: 'Organic Sushi Rice', brand: 'Lundberg', image: 'https://readdy.ai/api/search-image?query=organic%20sushi%20rice%20package%20with%20green%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=rice2&orientation=squarish', price: 11.99, weight: '907', unit: 'g' },
            { id: 'p30', name: 'Japanese Short Grain Rice', brand: 'Kokuho Rose', image: 'https://readdy.ai/api/search-image?query=japanese%20short%20grain%20rice%20bag%20with%20floral%20design%20on%20white%20background%20product%20photography&width=300&height=300&seq=rice3&orientation=squarish', price: 9.99, weight: '1000', unit: 'g' }
          ]
        },
        { 
          id: 11, 
          name: 'Avocado', 
          amount: '1 piece', 
          products: [
            { id: 'p31', name: 'Hass Avocados', brand: 'Fresh', image: 'https://readdy.ai/api/search-image?query=fresh%20hass%20avocados%20in%20mesh%20bag%20on%20white%20background%20product%20photography&width=300&height=300&seq=avocado1&orientation=squarish', price: 4.99, weight: '4 pack', unit: 'pcs' },
            { id: 'p32', name: 'Organic Avocados', brand: 'Organic', image: 'https://readdy.ai/api/search-image?query=organic%20avocados%20with%20sticker%20in%20clear%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=avocado2&orientation=squarish', price: 6.99, weight: '3 pack', unit: 'pcs' },
            { id: 'p33', name: 'Ready to Eat Avocados', brand: 'Eat Me', image: 'https://readdy.ai/api/search-image?query=ripe%20ready%20to%20eat%20avocados%20in%20cardboard%20tray%20on%20white%20background%20product%20photography&width=300&height=300&seq=avocado3&orientation=squarish', price: 5.49, weight: '2 pack', unit: 'pcs' }
          ]
        },
        { 
          id: 12, 
          name: 'Edamame', 
          amount: '150g', 
          products: [
            { id: 'p34', name: 'Frozen Edamame', brand: 'Seapoint Farms', image: 'https://readdy.ai/api/search-image?query=frozen%20edamame%20in%20green%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=edamame1&orientation=squarish', price: 3.99, weight: '340', unit: 'g' },
            { id: 'p35', name: 'Organic Edamame', brand: 'Cascadian Farm', image: 'https://readdy.ai/api/search-image?query=organic%20frozen%20edamame%20in%20blue%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=edamame2&orientation=squarish', price: 4.99, weight: '283', unit: 'g' },
            { id: 'p36', name: 'Shelled Edamame', brand: 'Birds Eye', image: 'https://readdy.ai/api/search-image?query=shelled%20edamame%20frozen%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=edamame3&orientation=squarish', price: 4.49, weight: '300', unit: 'g' }
          ]
        }
      ]
    },
    {
      id: 4,
      name: 'Vegetarian Buddha Bowl',
      image: 'https://readdy.ai/api/search-image?query=vibrant%20vegetarian%20buddha%20bowl%20with%20quinoa%20roasted%20chickpeas%20colorful%20vegetables%20tahini%20dressing%20in%20white%20bowl%20on%20light%20background%20professional%20food%20photography%20natural%20lighting&width=600&height=800&seq=recipe4&orientation=portrait',
      calories: 450,
      totalTime: 40,
      difficulty: 'Easy',
      servings: 3,
      description: 'Nutritious bowl packed with quinoa, roasted chickpeas, fresh vegetables, and tahini dressing.',
      ingredients: [
        { 
          id: 13, 
          name: 'Quinoa', 
          amount: '200g', 
          products: [
            { id: 'p37', name: 'Organic White Quinoa', brand: 'Ancient Harvest', image: 'https://readdy.ai/api/search-image?query=organic%20white%20quinoa%20in%20clear%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=quinoa1&orientation=squarish', price: 7.99, weight: '340', unit: 'g' },
            { id: 'p38', name: 'Tri-Color Quinoa', brand: 'Bob\'s Red Mill', image: 'https://readdy.ai/api/search-image?query=tri%20color%20quinoa%20mix%20in%20clear%20bag%20with%20red%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=quinoa2&orientation=squarish', price: 8.99, weight: '369', unit: 'g' },
            { id: 'p39', name: 'Red Quinoa', brand: 'Lundberg', image: 'https://readdy.ai/api/search-image?query=red%20quinoa%20in%20package%20with%20green%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=quinoa3&orientation=squarish', price: 9.49, weight: '340', unit: 'g' }
          ]
        },
        { 
          id: 14, 
          name: 'Chickpeas', 
          amount: '400g', 
          products: [
            { id: 'p40', name: 'Canned Chickpeas', brand: 'Goya', image: 'https://readdy.ai/api/search-image?query=goya%20chickpeas%20in%20metal%20can%20with%20blue%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chickpea1&orientation=squarish', price: 1.99, weight: '425', unit: 'g' },
            { id: 'p41', name: 'Organic Chickpeas', brand: 'Eden Foods', image: 'https://readdy.ai/api/search-image?query=organic%20chickpeas%20in%20can%20with%20green%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chickpea2&orientation=squarish', price: 2.99, weight: '425', unit: 'g' },
            { id: 'p42', name: 'Low Sodium Chickpeas', brand: 'Bush\'s', image: 'https://readdy.ai/api/search-image?query=low%20sodium%20chickpeas%20in%20can%20with%20yellow%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=chickpea3&orientation=squarish', price: 2.49, weight: '425', unit: 'g' }
          ]
        },
        { 
          id: 15, 
          name: 'Sweet Potato', 
          amount: '2 pieces (400g)', 
          products: [
            { id: 'p43', name: 'Organic Sweet Potatoes', brand: 'Fresh', image: 'https://readdy.ai/api/search-image?query=organic%20sweet%20potatoes%20in%20mesh%20bag%20on%20white%20background%20product%20photography&width=300&height=300&seq=sweetpotato1&orientation=squarish', price: 4.99, weight: '1000', unit: 'g' },
            { id: 'p44', name: 'Japanese Sweet Potatoes', brand: 'Melissa\'s', image: 'https://readdy.ai/api/search-image?query=japanese%20sweet%20potatoes%20with%20purple%20skin%20in%20clear%20bag%20on%20white%20background%20product%20photography&width=300&height=300&seq=sweetpotato2&orientation=squarish', price: 5.99, weight: '900', unit: 'g' },
            { id: 'p45', name: 'Garnet Sweet Potatoes', brand: 'Local Farm', image: 'https://readdy.ai/api/search-image?query=garnet%20sweet%20potatoes%20loose%20in%20cardboard%20box%20on%20white%20background%20product%20photography&width=300&height=300&seq=sweetpotato3&orientation=squarish', price: 3.99, weight: '1200', unit: 'g' }
          ]
        },
        { 
          id: 16, 
          name: 'Tahini', 
          amount: '3 tbsp (45g)', 
          products: [
            { id: 'p46', name: 'Organic Tahini', brand: 'Soom', image: 'https://readdy.ai/api/search-image?query=organic%20tahini%20in%20glass%20jar%20with%20white%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=tahini1&orientation=squarish', price: 9.99, weight: '340', unit: 'g' },
            { id: 'p47', name: 'Sesame Tahini', brand: 'Joyva', image: 'https://readdy.ai/api/search-image?query=sesame%20tahini%20in%20plastic%20container%20with%20red%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=tahini2&orientation=squarish', price: 7.99, weight: '454', unit: 'g' },
            { id: 'p48', name: 'Raw Tahini', brand: 'Once Again', image: 'https://readdy.ai/api/search-image?query=raw%20tahini%20in%20glass%20jar%20with%20green%20label%20on%20white%20background%20product%20photography&width=300&height=300&seq=tahini3&orientation=squarish', price: 11.99, weight: '454', unit: 'g' }
          ]
        }
      ]
    }
  ];

  const handleLike = () => {
    const recipe = recipes[currentIndex];
    setCurrentRecipe(recipe);
    setShowIngredientModal(true);
    setCurrentIngredientIndex(0);
    setSelectedProducts({});
  };

  const handleDislike = () => {
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      window.REACT_APP_NAVIGATE('/shopping-list');
    }
  };

  const handleSelectProduct = (ingredientId: number, product: Product | 'already-have') => {
    setSelectedProducts(prev => ({
      ...prev,
      [ingredientId]: product
    }));

    if (currentRecipe && currentIngredientIndex < currentRecipe.ingredients.length - 1) {
      setCurrentIngredientIndex(currentIngredientIndex + 1);
      setShowAllProducts(false);
    } else {
      if (currentRecipe) {
        setLikedRecipes([...likedRecipes, currentRecipe]);
        const newServingsCollected = servingsCollected + currentRecipe.servings;
        setServingsCollected(newServingsCollected);

        if (newServingsCollected >= servingsNeeded) {
          window.REACT_APP_NAVIGATE('/shopping-list');
        } else {
          setShowIngredientModal(false);
          setCurrentRecipe(null);
          setShowAllProducts(false);
          if (currentIndex < recipes.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            window.REACT_APP_NAVIGATE('/shopping-list');
          }
        }
      }
    }
  };

  const currentRecipeData = recipes[currentIndex];
  const currentIngredient = currentRecipe?.ingredients[currentIngredientIndex];
  const INITIAL_PRODUCTS_SHOWN = 3;
  const displayedProducts = showAllProducts 
    ? currentIngredient?.products 
    : currentIngredient?.products.slice(0, INITIAL_PRODUCTS_SHOWN);
  const hasMoreProducts = currentIngredient && currentIngredient.products.length > INITIAL_PRODUCTS_SHOWN;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <img 
            src="https://public.readdy.ai/ai/img_res/b0724f47-0896-45dd-92da-e15712b65265.png" 
            alt="Recipe Recommender Logo" 
            className="h-14 w-auto mx-auto mb-4"
          />
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Find Your Recipes</h2>
              <p className="text-sm text-gray-600">Swipe to discover meals you'll love</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#2F855A]">{servingsCollected}/{servingsNeeded}</div>
              <p className="text-xs text-gray-600">Servings</p>
            </div>
          </div>
        </div>

        {/* Recipe Card */}
        {currentRecipeData && (
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              {/* Recipe Image */}
              <div className="relative w-full h-96">
                <img
                  src={currentRecipeData.image}
                  alt={currentRecipeData.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="text-sm font-medium text-gray-900">{currentIndex + 1}/{recipes.length}</span>
                </div>
              </div>

              {/* Recipe Info */}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{currentRecipeData.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{currentRecipeData.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <i className="ri-fire-line text-xl text-[#2F855A] mb-1"></i>
                    <div className="text-sm font-semibold text-gray-900">{currentRecipeData.calories}</div>
                    <div className="text-xs text-gray-600">Calories</div>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-3 text-center">
                    <i className="ri-time-line text-xl text-teal-600 mb-1"></i>
                    <div className="text-sm font-semibold text-gray-900">{currentRecipeData.totalTime}m</div>
                    <div className="text-xs text-gray-600">Time</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <i className="ri-restaurant-line text-xl text-green-600 mb-1"></i>
                    <div className="text-sm font-semibold text-gray-900">{currentRecipeData.servings}</div>
                    <div className="text-xs text-gray-600">Servings</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <i className="ri-star-line text-xl text-amber-600 mb-1"></i>
                    <div className="text-sm font-semibold text-gray-900">{currentRecipeData.difficulty}</div>
                    <div className="text-xs text-gray-600">Level</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleDislike}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-close-line text-2xl"></i>
                    <span>Skip</span>
                  </button>
                  <button
                    onClick={handleLike}
                    className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-heart-line text-2xl"></i>
                    <span>Like</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ingredient Selection Modal */}
      {showIngredientModal && currentRecipe && currentIngredient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Select Product</h3>
                <span className="text-sm text-gray-600">
                  {currentIngredientIndex + 1} of {currentRecipe.ingredients.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-gradient-to-r from-[#2F855A] to-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${((currentIngredientIndex + 1) / currentRecipe.ingredients.length) * 100}%` }}
                ></div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <h4 className="text-lg font-bold text-gray-900 mb-1">{currentIngredient.name}</h4>
                <p className="text-sm text-gray-600">Amount needed: <span className="font-semibold text-[#2F855A]">{currentIngredient.amount}</span></p>
              </div>
            </div>

            <div className="p-6">
              {/* Already Have Button */}
              <button
                onClick={() => handleSelectProduct(currentIngredient.id, 'already-have')}
                className="w-full mb-4 p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <i className="ri-checkbox-circle-line text-2xl"></i>
                <span className="font-semibold">Already Have This Ingredient</span>
              </button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or choose a product</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Available products:</h5>
                {hasMoreProducts && (
                  <span className="text-xs text-gray-500">
                    {currentIngredient.products.length} options available
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                {displayedProducts?.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(currentIngredient.id, product)}
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
                      </div>
                      <i className="ri-arrow-right-line text-2xl text-gray-400 group-hover:text-[#2F855A] transition-colors"></i>
                    </div>
                  </button>
                ))}
              </div>

              {hasMoreProducts && !showAllProducts && (
                <button
                  onClick={() => setShowAllProducts(true)}
                  className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-arrow-down-s-line text-xl"></i>
                  <span>Show {currentIngredient.products.length - INITIAL_PRODUCTS_SHOWN} More Products</span>
                </button>
              )}

              {hasMoreProducts && showAllProducts && (
                <button
                  onClick={() => setShowAllProducts(false)}
                  className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-arrow-up-s-line text-xl"></i>
                  <span>Show Less</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
