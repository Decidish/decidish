import { Recipe } from '@/api/models/recipe';

export const MOCK_RECIPES: Recipe[] = [
    {
        id: '1',
        title: 'Squirrel-shaped Fish',
        description: 'A dish made from fresh mandarin fish, expertly scored, deep-fried to a golden crisp.',
        imageUrl: require('../images/01.jpg'),
        prepTimeMinutes: 30,
        cookTimeMinutes: 20,
        servings: 2,
        tags: ['Chinese', 'Seafood', 'Fried'],
        nutrition: {
            calories: 450,
            protein: 35,
            carbs: 45,
            fat: 15
        },
        ingredients: [
            { name: 'Mandarin Fish', quantity: 1, unit: 'pcs', category: 'Meat' },
            { name: 'Egg', quantity: 1, unit: 'pcs', category: 'Dairy' },
            { name: 'Cornstarch', quantity: 3, unit: 'tbsp', category: 'Pantry' },
            { name: 'Sweet & Sour Sauce', quantity: 100, unit: 'ml', category: 'Pantry' }
        ],
        instructions: [
            'Clean and debone the mandarin fish.',
            'Score the flesh in a diamond pattern to resemble a squirrel.',
            'Coat with egg and cornstarch.',
            'Deep fry until golden brown.',
            'Pour hot sweet and sour sauce over the fish before serving.'
        ]
    },
    {
        id: '2',
        title: 'Crispy Pata',
        description: 'Deep-fried Filipino pork leg with a crispy golden skin and tender, juicy meat.',
        imageUrl: require('../images/02.jpg'),
        prepTimeMinutes: 15,
        cookTimeMinutes: 120,
        servings: 4,
        tags: ['Filipino', 'Fried', 'Dinner', 'High Protein'],
        nutrition: {
            calories: 1200,
            protein: 90,
            carbs: 10,
            fat: 85
        },
        ingredients: [
            { name: 'Pork Leg', quantity: 1, unit: 'pcs', category: 'Meat' },
            { name: 'Garlic', quantity: 1, unit: 'cup', category: 'Produce' },
            { name: 'Bay Leaves', quantity: 3, unit: 'pcs', category: 'Spices' },
            { name: 'Vinegar', quantity: 2, unit: 'tbsp', category: 'Pantry' },
            { name: 'Soy Sauce', quantity: 0.25, unit: 'cup', category: 'Pantry' }
        ],
        instructions: [
            'Boil pork leg with garlic, bay leaves, and spices until tender (approx 1 hour).',
            'Remove from pot and let it air dry completely.',
            'Deep fry the leg until the skin is blistered and crisp.',
            'Serve with soy-vinegar dipping sauce.'
        ]
    },
    {
        id: '3',
        title: 'Kung Pao Chicken',
        description: 'A stir-fry made with diced chicken, peanuts, and dried chili peppers.',
        imageUrl: require('../images/03.jpg'),
        prepTimeMinutes: 15,
        cookTimeMinutes: 10,
        servings: 2,
        tags: ['Chinese', 'Spicy', 'Quick & Easy'],
        nutrition: {
            calories: 320,
            protein: 28,
            carbs: 12,
            fat: 18
        },
        ingredients: [
            { name: 'Chicken Breast', quantity: 300, unit: 'g', category: 'Meat' },
            { name: 'Peanuts', quantity: 50, unit: 'g', category: 'Pantry' },
            { name: 'Dried Chili Peppers', quantity: 10, unit: 'pcs', category: 'Spices' },
            { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', category: 'Pantry' },
            { name: 'Ginger', quantity: 1, unit: 'tbsp', category: 'Produce' }
        ],
        instructions: [
            'Dice the chicken and marinate with soy sauce.',
            'Stir-fry ginger, garlic, and dried chilies until fragrant.',
            'Add chicken and stir-fry until cooked through.',
            'Add peanuts and toss with sauce before serving.'
        ]
    },
    {
        id: '4',
        title: 'Tomato Sausage Pizza',
        description: 'A flavorful pizza topped with tomato sauce, sliced sausage, and melted cheese.',
        imageUrl: require('../images/04.jpg'),
        prepTimeMinutes: 20,
        cookTimeMinutes: 15,
        servings: 3,
        tags: ['Italian', 'Dinner'], 
        nutrition: {
            calories: 280,
            protein: 12,
            carbs: 35,
            fat: 10
        },
        ingredients: [
            { name: 'Pizza Dough', quantity: 1, unit: 'pcs', category: 'Pantry' },
            { name: 'Tomato Sauce', quantity: 0.5, unit: 'cup', category: 'Pantry' },
            { name: 'Sausage', quantity: 100, unit: 'g', category: 'Meat' },
            { name: 'Mozzarella Cheese', quantity: 150, unit: 'g', category: 'Dairy' },
            { name: 'Basil', quantity: 5, unit: 'pcs', category: 'Produce' }
        ],
        instructions: [
            'Roll out the pizza dough.',
            'Spread tomato sauce evenly.',
            'Top with sliced sausage and mozzarella cheese.',
            'Bake at 220°C (430°F) for 15 minutes.'
        ]
    },
    {
        id: '5',
        title: 'Pan-Seared Fish Fillet',
        description: 'A delicate French-style fish fillet, pan-seared to a crisp golden exterior.',
        imageUrl: require('../images/05.jpg'),
        prepTimeMinutes: 5,
        cookTimeMinutes: 10,
        servings: 1,
        tags: ['French', 'Seafood', 'Keto', 'Healthy'],
        nutrition: {
            calories: 210,
            protein: 24,
            carbs: 0,
            fat: 12
        },
        ingredients: [
            { name: 'White Fish Fillet', quantity: 200, unit: 'g', category: 'Meat' },
            { name: 'Butter', quantity: 1, unit: 'tbsp', category: 'Dairy' },
            { name: 'Lemon', quantity: 0.5, unit: 'pcs', category: 'Produce' },
            { name: 'Thyme', quantity: 1, unit: 'tsp', category: 'Produce' }
        ],
        instructions: [
            'Pat the fish fillet dry and season with salt and pepper.',
            'Heat butter in a pan until foaming.',
            'Sear the fish skin-side down for 4 minutes.',
            'Flip and cook for another 2 minutes. Finish with lemon juice.'
        ]
    },
    {
        id: '6',
        title: 'Seared Tuna',
        description: 'Lightly seared tuna steak with a tender center and fragrant buttery herb finish.',
        imageUrl: require('../images/06.jpg'),
        prepTimeMinutes: 5,
        cookTimeMinutes: 5,
        servings: 1,
        tags: ['Seafood', 'High Protein'],
        nutrition: {
            calories: 180,
            protein: 30,
            carbs: 0,
            fat: 6
        },
        ingredients: [
            { name: 'Tuna Steak', quantity: 200, unit: 'g', category: 'Meat' },
            { name: 'Olive Oil', quantity: 1, unit: 'tbsp', category: 'Pantry' },
            { name: 'Black Pepper', quantity: 1, unit: 'tsp', category: 'Spices' },
            { name: 'Garlic', quantity: 1, unit: 'pcs', category: 'Produce' }
        ],
        instructions: [
            'Coat tuna steak generously with crushed black pepper.',
            'Sear in a very hot pan for 45 seconds per side.',
            'Slice thinly and serve immediately.'
        ]
    },
    {
        id: '7',
        title: 'Wine Steamed Lobster',
        description: 'Fresh lobster gently steamed in aromatic white wine.',
        imageUrl: require('../images/07.jpg'),
        prepTimeMinutes: 10,
        cookTimeMinutes: 15,
        servings: 2,
        tags: ['Seafood', 'Dinner'],
        nutrition: {
            calories: 150,
            protein: 20,
            carbs: 2,
            fat: 5
        },
        ingredients: [
            { name: 'Lobster', quantity: 2, unit: 'pcs', category: 'Meat' },
            { name: 'White Wine', quantity: 1, unit: 'cup', category: 'Other' },
            { name: 'Butter', quantity: 2, unit: 'tbsp', category: 'Dairy' },
            { name: 'Parsley', quantity: 1, unit: 'tbsp', category: 'Produce' }
        ],
        instructions: [
            'Bring white wine and butter to a simmer in a large pot.',
            'Add lobster and cover with lid.',
            'Steam for 10-12 minutes until shells are bright red.',
            'Serve with the steaming liquid as dipping sauce.'
        ]
    },
    {
        id: '8',
        title: 'Beef Bourguignon',
        description: 'Classic French stew with tender beef slow-cooked in red wine.',
        imageUrl: require('../images/08.jpg'),
        prepTimeMinutes: 30,
        cookTimeMinutes: 180,
        servings: 4,
        tags: ['French', 'Dinner', 'Beef'], // Added 'Beef' since it is in your Enum
        nutrition: {
            calories: 600,
            protein: 45,
            carbs: 20,
            fat: 30
        },
        ingredients: [
            { name: 'Beef Chuck', quantity: 1, unit: 'kg', category: 'Meat' },
            { name: 'Red Wine', quantity: 2, unit: 'cup', category: 'Other' },
            { name: 'Carrots', quantity: 3, unit: 'pcs', category: 'Produce' },
            { name: 'Mushrooms', quantity: 200, unit: 'g', category: 'Produce' },
            { name: 'Beef Broth', quantity: 2, unit: 'cup', category: 'Pantry' }
        ],
        instructions: [
            'Sear beef chunks in a dutch oven.',
            'Sauté onions, carrots, and mushrooms.',
            'Add red wine and broth, scraping up browned bits.',
            'Simmer on low heat for 3 hours until beef is fork-tender.'
        ]
    },
    {
        id: '9',
        title: 'Pasta with Diced Beef',
        description: 'Hearty pasta tossed with tender diced beef, garlic, and tomatoes.',
        imageUrl: require('../images/09.jpg'),
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        servings: 2,
        tags: ['Italian', 'Pasta', 'Beef'],
        nutrition: {
            calories: 550,
            protein: 30,
            carbs: 65,
            fat: 18
        },
        ingredients: [
            { name: 'Pasta', quantity: 200, unit: 'g', category: 'Pantry' },
            { name: 'Diced Beef', quantity: 150, unit: 'g', category: 'Meat' },
            { name: 'Tomato', quantity: 2, unit: 'pcs', category: 'Produce' },
            { name: 'Garlic', quantity: 2, unit: 'pcs', category: 'Produce' },
            { name: 'Parmesan', quantity: 2, unit: 'tbsp', category: 'Dairy' }
        ],
        instructions: [
            'Boil pasta in salted water.',
            'Sear diced beef in a separate pan with garlic.',
            'Add chopped tomatoes and cook down into a sauce.',
            'Toss pasta with the sauce and serve with cheese.'
        ]
    },
    {
        id: '10',
        title: 'Gambas al Ajillo',
        description: 'Spanish tapas dish made with shrimp sautéed in olive oil with garlic.',
        imageUrl: require('../images/10.jpg'),
        prepTimeMinutes: 5,
        cookTimeMinutes: 5,
        servings: 2,
        tags: ['Seafood', 'Spicy'],
        nutrition: {
            calories: 220,
            protein: 15,
            carbs: 3,
            fat: 18
        },
        ingredients: [
            { name: 'Shrimp', quantity: 200, unit: 'g', category: 'Meat' },
            { name: 'Olive Oil', quantity: 0.25, unit: 'cup', category: 'Pantry' },
            { name: 'Garlic', quantity: 4, unit: 'pcs', category: 'Produce' },
            { name: 'Dried Chili', quantity: 2, unit: 'pcs', category: 'Spices' },
            { name: 'Paprika', quantity: 1, unit: 'tsp', category: 'Spices' }
        ],
        instructions: [
            'Heat olive oil in a pan over medium heat.',
            'Add garlic and chilies, frying until golden.',
            'Add shrimp and paprika, cooking for 2-3 minutes.',
            'Serve immediately with crusty bread.'
        ]
    }
];