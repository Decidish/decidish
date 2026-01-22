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
  cookTime: number;
  servings: number;
  difficulty: string;
  cuisine: string;
  tags: string[];
  rating: number;
  calories: number;
  description: string;
  ingredients: Ingredient[];
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
  
  // Modal states
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [currentIngredientIndex, setCurrentIngredientIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, Product | 'already-have'>>({});
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Shopping cart
  const [cartRecipes, setCartRecipes] = useState<Recipe[]>([]);
  const [showCart, setShowCart] = useState(false);

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
      calories: 280,
      description: 'Classic Italian pizza with fresh mozzarella, basil, and tomato sauce on a crispy crust.',
      ingredients: [
        { 
          id: 1, 
          name: 'Pizza Dough', 
          amount: '500g', 
          products: [
            { id: 'p1', name: 'Fresh Pizza Dough', brand: 'Trader Joe\'s', image: 'https://readdy.ai/api/search-image?query=fresh%20pizza%20dough%20in%20plastic%20bag%20on%20white%20background%20product%20photography&width=300&height=300&seq=dough1&orientation=squarish', price: 3.99, weight: '500', unit: 'g' },
            { id: 'p2', name: 'Organic Pizza Dough', brand: 'Whole Foods', image: 'https://readdy.ai/api/search-image?query=organic%20pizza%20dough%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=dough2&orientation=squarish', price: 4.99, weight: '500', unit: 'g' }
          ]
        },
        { 
          id: 2, 
          name: 'Mozzarella Cheese', 
          amount: '250g', 
          products: [
            { id: 'p3', name: 'Fresh Mozzarella', brand: 'BelGioioso', image: 'https://readdy.ai/api/search-image?query=fresh%20mozzarella%20cheese%20ball%20in%20water%20on%20white%20background%20product%20photography&width=300&height=300&seq=mozz1&orientation=squarish', price: 5.99, weight: '250', unit: 'g' },
            { id: 'p4', name: 'Shredded Mozzarella', brand: 'Kraft', image: 'https://readdy.ai/api/search-image?query=shredded%20mozzarella%20cheese%20bag%20on%20white%20background%20product%20photography&width=300&height=300&seq=mozz2&orientation=squarish', price: 4.49, weight: '300', unit: 'g' }
          ]
        }
      ]
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
      calories: 350,
      description: 'Flavorful chicken tacos with spicy seasoning, fresh toppings, and warm tortillas.',
      ingredients: [
        { 
          id: 3, 
          name: 'Chicken Breast', 
          amount: '500g', 
          products: [
            { id: 'p5', name: 'Fresh Chicken Breast', brand: 'Perdue', image: 'https://readdy.ai/api/search-image?query=fresh%20chicken%20breast%20in%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=chick1&orientation=squarish', price: 8.99, weight: '500', unit: 'g' }
          ]
        }
      ]
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
      calories: 420,
      description: 'Rich and creamy Italian risotto with sautéed mushrooms and parmesan.',
      ingredients: [
        { 
          id: 4, 
          name: 'Arborio Rice', 
          amount: '300g', 
          products: [
            { id: 'p6', name: 'Arborio Rice', brand: 'RiceSelect', image: 'https://readdy.ai/api/search-image?query=arborio%20rice%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=rice1&orientation=squarish', price: 6.99, weight: '500', unit: 'g' }
          ]
        }
      ]
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
      calories: 520,
      description: 'Healthy salmon bowl with teriyaki glaze, rice, and fresh vegetables.',
      ingredients: [
        { 
          id: 5, 
          name: 'Salmon Fillet', 
          amount: '300g', 
          products: [
            { id: 'p7', name: 'Atlantic Salmon', brand: 'Sea Best', image: 'https://readdy.ai/api/search-image?query=salmon%20fillet%20in%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=salm1&orientation=squarish', price: 14.99, weight: '300', unit: 'g' }
          ]
        }
      ]
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
      calories: 220,
      description: 'Fresh and healthy Greek salad with feta cheese and Mediterranean flavors.',
      ingredients: [
        { 
          id: 6, 
          name: 'Feta Cheese', 
          amount: '150g', 
          products: [
            { id: 'p8', name: 'Greek Feta', brand: 'Dodoni', image: 'https://readdy.ai/api/search-image?query=feta%20cheese%20block%20on%20white%20background%20product%20photography&width=300&height=300&seq=feta1&orientation=squarish', price: 7.99, weight: '200', unit: 'g' }
          ]
        }
      ]
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
      calories: 480,
      description: 'Rich and creamy Indian butter chicken with aromatic spices.',
      ingredients: [
        { 
          id: 7, 
          name: 'Chicken Thighs', 
          amount: '800g', 
          products: [
            { id: 'p9', name: 'Chicken Thighs', brand: 'Tyson', image: 'https://readdy.ai/api/search-image?query=chicken%20thighs%20in%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=thigh1&orientation=squarish', price: 9.99, weight: '900', unit: 'g' }
          ]
        }
      ]
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
      calories: 450,
      description: 'Authentic Thai pad thai with shrimp, peanuts, and tangy sauce.',
      ingredients: [
        { 
          id: 8, 
          name: 'Rice Noodles', 
          amount: '250g', 
          products: [
            { id: 'p10', name: 'Rice Noodles', brand: 'Thai Kitchen', image: 'https://readdy.ai/api/search-image?query=rice%20noodles%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=noodle1&orientation=squarish', price: 4.99, weight: '250', unit: 'g' }
          ]
        }
      ]
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
      calories: 320,
      description: 'Classic French onion soup with caramelized onions and melted cheese.',
      ingredients: [
        { 
          id: 9, 
          name: 'Yellow Onions', 
          amount: '1kg', 
          products: [
            { id: 'p11', name: 'Yellow Onions', brand: 'Fresh', image: 'https://readdy.ai/api/search-image?query=yellow%20onions%20in%20mesh%20bag%20on%20white%20background%20product%20photography&width=300&height=300&seq=onion1&orientation=squarish', price: 3.99, weight: '1000', unit: 'g' }
          ]
        }
      ]
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
      calories: 380,
      description: 'Quick and easy beef stir fry with fresh vegetables.',
      ingredients: [
        { 
          id: 10, 
          name: 'Beef Strips', 
          amount: '500g', 
          products: [
            { id: 'p12', name: 'Beef Strips', brand: 'Angus', image: 'https://readdy.ai/api/search-image?query=beef%20strips%20in%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=beef1&orientation=squarish', price: 12.99, weight: '500', unit: 'g' }
          ]
        }
      ]
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
      calories: 180,
      description: 'Simple and elegant Italian salad with fresh ingredients.',
      ingredients: [
        { 
          id: 11, 
          name: 'Cherry Tomatoes', 
          amount: '300g', 
          products: [
            { id: 'p13', name: 'Cherry Tomatoes', brand: 'Fresh', image: 'https://readdy.ai/api/search-image?query=cherry%20tomatoes%20in%20container%20on%20white%20background%20product%20photography&width=300&height=300&seq=tom1&orientation=squarish', price: 4.99, weight: '300', unit: 'g' }
          ]
        }
      ]
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
      calories: 420,
      description: 'Sizzling chicken fajitas with peppers and onions.',
      ingredients: [
        { 
          id: 12, 
          name: 'Bell Peppers', 
          amount: '3 pieces', 
          products: [
            { id: 'p14', name: 'Mixed Bell Peppers', brand: 'Fresh', image: 'https://readdy.ai/api/search-image?query=mixed%20bell%20peppers%20on%20white%20background%20product%20photography&width=300&height=300&seq=pepper1&orientation=squarish', price: 5.99, weight: '3 pack', unit: 'pcs' }
          ]
        }
      ]
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
      calories: 320,
      description: 'Hearty vegetable curry with aromatic Indian spices.',
      ingredients: [
        { 
          id: 13, 
          name: 'Curry Paste', 
          amount: '100g', 
          products: [
            { id: 'p15', name: 'Curry Paste', brand: 'Patak\'s', image: 'https://readdy.ai/api/search-image?query=curry%20paste%20jar%20on%20white%20background%20product%20photography&width=300&height=300&seq=curry1&orientation=squarish', price: 4.99, weight: '100', unit: 'g' }
          ]
        }
      ]
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
      calories: 280,
      description: 'Fresh and beautiful sushi rolls with premium ingredients.',
      ingredients: [
        { 
          id: 14, 
          name: 'Nori Sheets', 
          amount: '10 sheets', 
          products: [
            { id: 'p16', name: 'Nori Sheets', brand: 'Yamamotoyama', image: 'https://readdy.ai/api/search-image?query=nori%20seaweed%20sheets%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=nori1&orientation=squarish', price: 6.99, weight: '10 pack', unit: 'pcs' }
          ]
        }
      ]
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
      calories: 650,
      description: 'Tender BBQ ribs with smoky sauce and perfect char.',
      ingredients: [
        { 
          id: 15, 
          name: 'Pork Ribs', 
          amount: '2kg', 
          products: [
            { id: 'p17', name: 'Baby Back Ribs', brand: 'Smithfield', image: 'https://readdy.ai/api/search-image?query=pork%20ribs%20in%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=ribs1&orientation=squarish', price: 19.99, weight: '2000', unit: 'g' }
          ]
        }
      ]
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
      calories: 520,
      description: 'Authentic Japanese ramen with rich broth and toppings.',
      ingredients: [
        { 
          id: 16, 
          name: 'Ramen Noodles', 
          amount: '200g', 
          products: [
            { id: 'p18', name: 'Fresh Ramen Noodles', brand: 'Sun Noodle', image: 'https://readdy.ai/api/search-image?query=fresh%20ramen%20noodles%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=ramen1&orientation=squarish', price: 5.99, weight: '200', unit: 'g' }
          ]
        }
      ]
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
      calories: 280,
      description: 'Classic Caesar salad with homemade dressing.',
      ingredients: [
        { 
          id: 17, 
          name: 'Romaine Lettuce', 
          amount: '2 heads', 
          products: [
            { id: 'p19', name: 'Romaine Hearts', brand: 'Fresh', image: 'https://readdy.ai/api/search-image?query=romaine%20lettuce%20hearts%20in%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=lettuce1&orientation=squarish', price: 3.99, weight: '2 pack', unit: 'pcs' }
          ]
        }
      ]
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
      calories: 480,
      description: 'Traditional Spanish paella with seafood and saffron rice.',
      ingredients: [
        { 
          id: 18, 
          name: 'Paella Rice', 
          amount: '400g', 
          products: [
            { id: 'p20', name: 'Bomba Rice', brand: 'La Fallera', image: 'https://readdy.ai/api/search-image?query=bomba%20rice%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=bomba1&orientation=squarish', price: 8.99, weight: '500', unit: 'g' }
          ]
        }
      ]
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
      calories: 450,
      description: 'Popular Indian curry with tender chicken in creamy tomato sauce.',
      ingredients: [
        { 
          id: 19, 
          name: 'Tikka Masala Paste', 
          amount: '150g', 
          products: [
            { id: 'p21', name: 'Tikka Masala Paste', brand: 'Patak\'s', image: 'https://readdy.ai/api/search-image?query=tikka%20masala%20paste%20jar%20on%20white%20background%20product%20photography&width=300&height=300&seq=tikka1&orientation=squarish', price: 5.99, weight: '150', unit: 'g' }
          ]
        }
      ]
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
      calories: 380,
      description: 'Classic beef tacos with all the fixings.',
      ingredients: [
        { 
          id: 20, 
          name: 'Ground Beef', 
          amount: '500g', 
          products: [
            { id: 'p22', name: 'Ground Beef', brand: 'Angus', image: 'https://readdy.ai/api/search-image?query=ground%20beef%20in%20package%20on%20white%20background%20product%20photography&width=300&height=300&seq=ground1&orientation=squarish', price: 9.99, weight: '500', unit: 'g' }
          ]
        }
      ]
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
      calories: 180,
      description: 'Spicy and sour Thai soup with shrimp and aromatic herbs.',
      ingredients: [
        { 
          id: 21, 
          name: 'Tom Yum Paste', 
          amount: '100g', 
          products: [
            { id: 'p23', name: 'Tom Yum Paste', brand: 'Thai Kitchen', image: 'https://readdy.ai/api/search-image?query=tom%20yum%20paste%20jar%20on%20white%20background%20product%20photography&width=300&height=300&seq=tomyum1&orientation=squarish', price: 4.99, weight: '100', unit: 'g' }
          ]
        }
      ]
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

  const handleRecipeClick = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setShowIngredientModal(true);
    setCurrentIngredientIndex(0);
    setSelectedProducts({});
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      handleSearch(page);
    }
  };

  const showSuccessNotification = (recipeName: string) => {
    setSuccessMessage(`${recipeName} added to your cart! 🎉`);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
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
      // Show review modal instead of immediately adding to list
      setShowIngredientModal(false);
      setShowReviewModal(true);
      setShowAllProducts(false);
    }
  };

  const handleEditProduct = (ingredientId: number) => {
    const ingredientIndex = currentRecipe?.ingredients.findIndex(ing => ing.id === ingredientId);
    if (ingredientIndex !== undefined && ingredientIndex !== -1) {
      setCurrentIngredientIndex(ingredientIndex);
      setShowReviewModal(false);
      setShowIngredientModal(true);
    }
  };

  const handleConfirmRecipe = () => {
    if (currentRecipe) {
      setCartRecipes([...cartRecipes, currentRecipe]);

      // Show success notification
      showSuccessNotification(currentRecipe.name);

      // Close modal
      setShowReviewModal(false);
      setCurrentRecipe(null);
    }
  };

  const calculateReviewTotal = () => {
    if (!currentRecipe) return 0;
    return currentRecipe.ingredients.reduce((total, ingredient) => {
      const selected = selectedProducts[ingredient.id];
      if (selected && selected !== 'already-have') {
        return total + selected.price;
      }
      return total;
    }, 0);
  };

  const handleRemoveFromCart = (recipeId: number) => {
    setCartRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  const handleGoToShoppingList = () => {
    // Navigate to shopping list page
    window.REACT_APP_NAVIGATE('/shopping-list');
  };

  const currentIngredient = currentRecipe?.ingredients[currentIngredientIndex];
  const INITIAL_PRODUCTS_SHOWN = 3;
  const displayedProducts = showAllProducts 
    ? currentIngredient?.products 
    : currentIngredient?.products.slice(0, INITIAL_PRODUCTS_SHOWN);
  const hasMoreProducts = currentIngredient && currentIngredient.products.length > INITIAL_PRODUCTS_SHOWN;

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
                  onClick={() => handleRecipeClick(recipe)}
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

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 border-2 border-[#2F855A] min-w-[320px]">
            <div className="w-12 h-12 flex items-center justify-center bg-[#2F855A] rounded-full flex-shrink-0">
              <i className="ri-check-line text-2xl text-white"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{successMessage}</p>
              <p className="text-xs text-gray-600 mt-0.5">View your cart to continue</p>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Shopping Cart</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {cartRecipes.length} {cartRecipes.length === 1 ? 'recipe' : 'recipes'} in your cart
              </p>
            </div>

            <div className="p-6">
              {cartRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-shopping-cart-line text-4xl text-gray-400"></i>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h4>
                  <p className="text-sm text-gray-600">Start adding recipes to build your shopping list</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cartRecipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={recipe.image}
                              alt={recipe.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1">{recipe.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <i className="ri-time-line"></i>
                                {recipe.cookTime}m
                              </span>
                              <span className="flex items-center gap-1">
                                <i className="ri-restaurant-line"></i>
                                {recipe.servings} servings
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 bg-[#2F855A]/10 text-[#2F855A] rounded-lg font-medium">
                                {recipe.cuisine}
                              </span>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
                                {recipe.ingredients.length} ingredients
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(recipe.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                            title="Remove from cart"
                          >
                            <i className="ri-delete-bin-line text-lg text-red-500"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleGoToShoppingList}
                    className="w-full py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <i className="ri-shopping-cart-line text-xl"></i>
                    <span>Go to Shopping List</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Review Modal */}
      {showReviewModal && currentRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Review Your Selections</h3>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setCurrentRecipe(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl text-gray-600"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600">Review and edit your product selections before adding to cart</p>
            </div>

            <div className="p-6">
              {/* Recipe Info */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-6 border border-emerald-200">
                <h4 className="text-lg font-bold text-gray-900 mb-1">{currentRecipe.name}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <i className="ri-restaurant-line"></i>
                    {currentRecipe.servings} servings
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="ri-time-line"></i>
                    {currentRecipe.cookTime}m
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="ri-fire-line"></i>
                    {currentRecipe.calories} cal
                  </span>
                </div>
              </div>

              {/* Selected Products List */}
              <div className="space-y-3 mb-6">
                {currentRecipe.ingredients.map((ingredient) => {
                  const selected = selectedProducts[ingredient.id];
                  const isAlreadyHave = selected === 'already-have';
                  const product = !isAlreadyHave && selected ? selected : null;

                  return (
                    <div
                      key={ingredient.id}
                      className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 mb-1">{ingredient.name}</h5>
                          <p className="text-sm text-gray-600">Amount needed: {ingredient.amount}</p>
                        </div>
                        <button
                          onClick={() => handleEditProduct(ingredient.id)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                        >
                          <i className="ri-edit-line"></i>
                          Edit
                        </button>
                      </div>

                      {isAlreadyHave ? (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <i className="ri-checkbox-circle-fill text-xl text-amber-600"></i>
                          <span className="text-sm font-medium text-amber-900">Already have this ingredient</span>
                        </div>
                      ) : product ? (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div className="w-16 h-16 flex-shrink-0 bg-white rounded-lg overflow-hidden">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm mb-0.5">{product.name}</div>
                            <div className="text-xs text-gray-600 mb-1">{product.brand}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-700">{product.weight}{product.unit}</span>
                              <span className="text-sm font-bold text-[#2F855A]">${product.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <i className="ri-alert-line text-xl text-gray-400"></i>
                          <span className="text-sm text-gray-600">No product selected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Price */}
              <div className="bg-gradient-to-r from-[#2F855A] to-emerald-600 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm opacity-90 mb-1">Total Cost</p>
                    <p className="text-3xl font-bold">${calculateReviewTotal().toFixed(2)}</p>
                  </div>
                  <div className="w-16 h-16 flex items-center justify-center bg-white/20 rounded-full">
                    <i className="ri-shopping-cart-line text-3xl"></i>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs text-white/80">
                    {currentRecipe.ingredients.filter(ing => selectedProducts[ing.id] === 'already-have').length} items you already have
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setCurrentRecipe(null);
                  }}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRecipe}
                  className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <i className="ri-check-line text-xl"></i>
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
