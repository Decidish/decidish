# Decidish Client

## Overview

The **Decidish Client** is a modern, responsive React web application built with TypeScript, Vite, and Tailwind CSS. It provides an intuitive user interface for discovering personalized recipes, managing shopping lists, and interacting with the Decidish platform's AI-powered recommendation system.

The application features a Tinder-style recipe swiper, personalized recipe recommendations, intelligent shopping list generation with real-time product matching, and multi-language support.

---

## Architecture

### Technology Stack

- **Framework**: React 19.1
- **Language**: TypeScript 5.8
- **Build Tool**: Vite 7.0
- **Styling**: Tailwind CSS 3.4
- **Routing**: React Router DOM 7.6
- **HTTP Client**: Axios 1.13
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Maps**: Leaflet + React-Leaflet
- **Charts**: Recharts 3.2
- **Icons**: Lucide React + Font Awesome + Remix Icon
- **Internationalization**: i18next + react-i18next
- **Build Optimization**: SWC (Speedy Web Compiler)

### Key Features

- **Auto-Import**: Unplugin Auto Import for React hooks and utilities
- **Code Splitting**: Lazy loading with React.lazy()
- **Type Safety**: Full TypeScript coverage
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Cookie-Based Auth**: Secure HTTP-only cookie authentication
- **Real-time Updates**: Dynamic data fetching and state management

---

## Project Structure

```
client/
├── public/                          # Static assets
├── src/
│   ├── main.tsx                     # Application entry point
│   ├── App.tsx                      # Root component with routing
│   ├── index.css                    # Global styles and Tailwind directives
│   ├── api/                         # API client and service layer
│   │   ├── client.ts                # Axios instance configuration
│   │   ├── auth/
│   │   │   └── authApi.ts           # Authentication endpoints
│   │   ├── recipe-swiper/
│   │   │   ├── recipesApi.ts        # Recipe recommendations
│   │   │   └── productsApi.ts       # Shopping list generation
│   │   ├── shopping-list/
│   │   │   └── shoppingCartApi.ts   # Cart management
│   │   ├── search/
│   │   │   └── searchApi.ts         # Recipe search
│   │   ├── market-selection/
│   │   │   └── marketApi.ts         # Market search and selection
│   │   ├── questionnaire/
│   │   │   └── userApi.ts           # User preferences
│   │   ├── saved-recipes/
│   │   │   └── savedRecipesApi.ts   # Saved recipes management
│   │   └── user-history/
│   │       └── userHistoryApi.ts    # User interaction tracking
│   ├── components/                  # Reusable UI components
│   │   ├── layout/
│   │   │   └── MainLayout.tsx       # Main app layout wrapper
│   │   ├── feature/
│   │   │   └── Navigation.tsx       # Navigation bar
│   │   └── recipe/
│   │       ├── RecipeDetailModal.tsx    # Recipe details modal
│   │       └── ShoppingFlowModal.tsx    # Shopping list modal
│   ├── pages/                       # Page components (route views)
│   │   ├── landing/                 # Landing page
│   │   ├── auth/                    # Login/Register
│   │   ├── questionnaire/           # User preferences setup
│   │   ├── recipe-swiper/           # Tinder-style recipe discovery
│   │   ├── search/                  # Recipe search
│   │   ├── my-recipes/              # Saved recipes
│   │   ├── shopping-list/           # Shopping cart and history
│   │   ├── market-selection/        # Market search by postal code
│   │   ├── search-products/         # Product search
│   │   ├── profile/                 # User profile
│   │   ├── admin/                   # Admin dashboard
│   │   └── NotFound.tsx             # 404 page
│   ├── router/                      # Routing configuration
│   │   ├── config.tsx               # Route definitions
│   │   └── index.ts                 # Router setup with lazy loading
│   ├── i18n/                        # Internationalization
│   │   ├── index.ts                 # i18next configuration
│   │   └── local/                   # Translation files (en, de, etc.)
│   └── types/                       # TypeScript type definitions
│       └── recipe.ts                # Recipe-related types
├── index.html                       # HTML entry point
├── vite.config.ts                   # Vite build configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
├── tsconfig.app.json                # App-specific TS config
├── tsconfig.node.json               # Node-specific TS config
├── package.json                     # Dependencies and scripts
├── Dockerfile                       # Multi-stage Docker build
└── README.md                        # This file
```

---

## Core Features

### 1. **Landing Page**

Modern, animated landing page with falling food emojis and hero section.

**Features**:
- Gradient background with animated food items
- Responsive design (mobile-first)
- "Get Started" button with smart routing:
  - Checks if user is authenticated
  - Redirects to `/recipe-swiper` if logged in
  - Redirects to `/auth` if not logged in
- Feature highlights and value propositions

**Technologies**:
- CSS animations with Tailwind
- Dynamic emoji generation
- React hooks for state management

---

### 2. **Authentication System**

Secure login and registration with HTTP-only cookie-based authentication.

**Pages**:
- `/auth` - Combined login/register page

**Features**:
- **Login**: Email/username and password authentication
- **Register**: Create new account with name, email, password
- **Profile**: View user information (`/profile`)
- **Logout**: Clear authentication cookie

**API Endpoints** (via `/auth` prefix):
- `POST /auth/login` - Authenticate user
- `POST /auth/register` - Create new account
- `GET /auth/me` - Get current user profile
- `POST /auth/logout` - Clear session

**Security**:
- HTTP-only cookies (XSS protection)
- Secure flag (HTTPS only)
- CORS with credentials enabled
- Token validation on backend

**Flow**:
```
User → Login Form → POST /auth/login → Set Cookie → Redirect to /recipe-swiper
                                     ↓ (if error)
                                  Show Error Message
```

---

### 3. **User Preferences Questionnaire**

Interactive multi-step questionnaire to collect user dietary preferences and cooking habits.

**Page**: `/questionnaire`

**Preference Categories**:

1. **Dietary Preferences** (40 options):
   - Macros: Low sugar, low carb, high protein, low fat, high fiber
   - Allergens: Gluten-free, lactose-free, histamine-low
   - Diets: Vegan, vegetarian, paleo, keto, pregnancy-safe

2. **Fitness Goals**:
   - Weight loss, muscle gain, endurance training, marathon training

3. **Meal Context**:
   - Quick after work, office lunch, camping, party food, picnic
   - Seasonal preferences

4. **Cooking Methods**:
   - Air fryer, grill, frying, steaming, fermenting
   - Oven cooking, pressure cooker, Thermomix

**Preference Vector Generation**:
- User selects preferences on a scale (e.g., slider or buttons)
- Frontend generates a 40-dimensional preference vector
- Sent to backend for ML embedding generation

**API Call**:
```typescript
POST /api/v1/user/preferences
{
  "allergies": ["peanuts", "shellfish"],
  "min_cooking_time": 15,
  "max_cooking_time": 60,
  "budget": 50,
  "skill_level": "intermediate",
  "preference_vector": [0.1, 0.2, ..., 0.9]  // 40 dimensions
}
```

**Flow**:
1. User answers questions across multiple steps
2. Frontend calculates preference vector from answers
3. Submits to backend
4. Backend generates user embedding via ML service
5. Redirects to recipe swiper

---

### 4. **Recipe Swiper (Tinder-Style Discovery)**

AI-powered personalized recipe recommendations with swipe gestures.

**Page**: `/recipe-swiper`

**Features**:
- **Swipe Gestures**: 
  - Swipe right → Like recipe
  - Swipe left → Dislike recipe
  - Tap card → View recipe details
- **Like/Dislike Buttons**: Alternative to swiping
- **Recipe Cards**: Display recipe image, title, time, servings
- **Online Learning**: Each like/dislike updates ML model
- **Shopping Flow**: Generate shopping list from liked recipes
- **Recipe Details Modal**: Full recipe information with ingredients and instructions

**Swipe Detection**:
```typescript
// Touch events for mobile
handleTouchStart()  → Record touch position
handleTouchMove()   → Calculate swipe distance
handleTouchEnd()    → Finalize swipe (like/dislike)

// Mouse events for desktop
handleMouseDown()   → Start drag
handleMouseMove()   → Update position
handleMouseUp()     → Finalize action
```

**API Endpoints**:
- `GET /api/v1/recipes/recommend` - Get personalized recommendations (10-20 recipes)
- `POST /api/v1/user/record/like/:recipeId` - Record like action
- `POST /api/v1/user/record/dislike/:recipeId` - Record dislike action
- `POST /shopping-list/generate?marketId={id}` - Generate shopping list from recipe IDs

**ML Integration**:
- Each like/dislike triggers embedding update
- Backend calls ML pipeline `/tune` endpoint
- User embedding updated in real-time
- Future recommendations reflect preferences

**Shopping List Generation**:
1. User likes multiple recipes
2. Clicks "Generate Shopping List" button
3. Modal opens showing ingredient selection
4. System matches ingredients to products at selected market
5. User can:
   - Select alternative products
   - Adjust quantities
   - Add to cart
   - View total price

---

### 5. **Recipe Search**

Advanced recipe search with filters and faceted search.

**Page**: `/search`

**Search Capabilities**:
- **Text Search**: Search by recipe name or description
- **Category Filters**: Filter by cuisine type (Italian, Asian, etc.)
- **Keyword Filters**: Filter by tags (vegetarian, quick, healthy, etc.)
- **Max Time**: Filter by maximum cooking time
- **Max Calories**: Filter by calorie limit
- **Pagination**: Navigate through results

**API Endpoint**:
```typescript
GET /recipes/search?q={query}&categories={cat1,cat2}&keywords={kw1,kw2}&maxTime={minutes}&maxCalories={cal}&page={n}&limit={size}
```

**Features**:
- Real-time search with debouncing
- Multi-select filters (categories and keywords)
- Results display with recipe cards
- Click recipe → View details modal
- Save recipes to favorites
- Generate shopping list from search results

---

### 6. **Saved Recipes (My Recipes)**

View and manage saved/favorited recipes.

**Page**: `/my-recipes`

**Features**:
- Grid view of saved recipes
- Recipe cards with images and metadata
- Unsave button to remove from favorites
- Click recipe → View details
- Generate shopping list from saved recipes
- Empty state when no recipes saved

**API Endpoints**:
- `GET /api/v1/user/saved-recipes` - Get all saved recipes
- `GET /api/v1/user/saved-recipes/ids` - Get saved recipe IDs (for quick checks)
- `POST /api/v1/user/saved-recipes` - Save a recipe
- `DELETE /api/v1/user/saved-recipes/:recipe_id` - Unsave a recipe
- `GET /api/v1/user/saved-recipes/:recipe_id/check` - Check if recipe is saved

---

### 7. **Shopping List & Cart Management**

Complete shopping list functionality with cart management and history.

**Page**: `/shopping-list`

**Features**:

#### Active Shopping List
- View current cart items
- Check/uncheck items as purchased
- Adjust quantities
- Remove items
- See total price
- Complete shopping trip

#### Shopping History
- View past shopping lists
- See completion dates
- Review previous purchases
- Re-order from history

**API Endpoints**:
- `GET /api/v1/user/active/list` - Get active shopping list
- `POST /api/v1/user/add-to-list` - Add products to cart
- `PUT /api/v1/user/update/item` - Update item (checked/quantity)
- `DELETE /api/v1/user/delete/item/:item_id` - Remove item
- `PUT /api/v1/user/complete/list/:list_id` - Mark list as completed
- `GET /api/v1/user/shopping/history` - Get shopping history

**Cart Item Structure**:
```typescript
interface CartItem {
  product_id: number;
  quantity: number;
  recipe_id: number;
}
```

**Flow**:
1. User generates shopping list from recipes
2. Products added to active cart
3. User shops → checks off items
4. Completes shopping trip
5. List moves to history
6. New empty cart created for next trip

---

### 8. **Market Selection**

Search and select grocery market by postal code.

**Page**: `/market-selection`

**Features**:
- **Postal Code Search**: Enter 5-digit postal code (Germany)
- **Map View**: Display markets on interactive map (Leaflet)
- **Market List**: Show available markets with details
- **Market Selection**: Choose preferred market for product prices
- **Market Details**: Name, address, distance

**API Endpoints**:
- `GET /api/v1/markets?plz={zipCode}` - Search markets by postal code
- `GET /api/v1/markets/{id}` - Get market details
- `POST /api/v1/user/market` - Set selected market

**Map Integration**:
- Uses Leaflet for map rendering
- Custom markers for market locations
- Click marker → Select market
- Automatic zoom to market cluster

---

### 9. **Product Search**

Search for specific products at selected market.

**Page**: `/search-products`

**Features**:
- **Search Bar**: Search by product name
- **Market Filter**: Filter by selected market
- **Category Filters**: Filter by product category
- **Sorting**: Sort by price, name, relevance
- **Pagination**: Browse large product catalogs
- **Product Cards**: Display product info, price, image
- **Add to Cart**: Directly add products to shopping list

**API Endpoints**:
- `GET /api/v1/markets/search/products?query={term}&marketId={id}&page={n}&size={sz}&sort={field}`
- `GET /api/v1/markets/{marketId}/query?query={term}` - Search at specific market

---

### 10. **User Profile**

View and manage user account information.

**Page**: `/profile`

**Features**:
- Display user information (name, email, join date)
- View user statistics (recipes liked, shopping trips)
- Edit preferences (redirect to questionnaire)
- Change market selection
- Logout button

---

### 11. **Admin Dashboard**

Administrative interface for system management.

**Page**: `/admin` (protected)

**Features**:
- **System Statistics**: Total recipes, users, imports
- **Job Management**: Trigger weekly sync, cleanup jobs
- **Import History**: View Rewe import logs
- **URL Import History**: View manual recipe imports
- **Monitoring**: Service health and metrics

**API Endpoints**:
- `GET /admin/stats` - Get system statistics
- `POST /api/v1/jobs/weekly-sync` - Trigger weekly sync
- `POST /api/v1/jobs/cleanup` - Trigger cleanup
- `GET /recipes/history/rewe` - Rewe import history
- `GET /recipes/history/url` - URL import history

---

## Routing System

### Route Configuration

Routes are defined in `src/router/config.tsx` with lazy loading:

```typescript
const routes: RouteObject[] = [
  { path: "/", element: <MainLayout><Landing /></MainLayout> },
  { path: "/auth", element: <MainLayout><Auth /></MainLayout> },
  { path: "/profile", element: <MainLayout><Profile /></MainLayout> },
  { path: "/questionnaire", element: <MainLayout><Questionnaire /></MainLayout> },
  { path: "/recipe-swiper", element: <MainLayout><RecipeSwiper /></MainLayout> },
  { path: "/my-recipes", element: <MainLayout><MyRecipesPage /></MainLayout> },
  { path: "/search", element: <MainLayout><Search /></MainLayout> },
  { path: "/shopping-list", element: <MainLayout><ShoppingList /></MainLayout> },
  { path: "/market-selection", element: <MainLayout><MarketSelection /></MainLayout> },
  { path: "/search-products", element: <MainLayout><SearchProducts /></MainLayout> },
  { path: "/admin", element: <MainLayout><Admin /></MainLayout> },
  { path: "*", element: <NotFound /> },
];
```

### Lazy Loading

All page components use `React.lazy()` for code splitting:

```typescript
const RecipeSwiper = lazy(() => import("@/pages/recipe-swiper/page"));
```

**Benefits**:
- Faster initial load time
- Smaller bundle sizes
- Better performance on slow connections

### Navigation

Global navigation hook exported from `src/router/index.ts`:

```typescript
// Available globally
window.REACT_APP_NAVIGATE('/recipe-swiper');

// Or use React Router's useNavigate
const navigate = useNavigate();
navigate('/search');
```

---

## State Management

### Strategy

The application uses **React Hooks** for state management:

- **useState**: Local component state
- **useEffect**: Side effects and data fetching
- **useContext**: Global state (if needed)
- **useCallback**: Memoized callbacks
- **useMemo**: Memoized values
- **useRef**: Refs for DOM elements and values

### Example Pattern

```typescript
export default function RecipeSwiper() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      try {
        const data = await recipesApi.getRecommendations();
        setRecipes(data);
      } catch (error) {
        console.error('Failed to fetch recipes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  // Component logic...
}
```

---

## API Integration

### Axios Client Configuration

Base client in `src/api/client.ts`:

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL ?? 'http://localhost',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true,  // Important for cookie-based auth
});
```

### API Service Pattern

Each feature has its own API service file:

```typescript
// src/api/auth/authApi.ts
export const authApi = {
  login: async (username: string, password: string) => {
    await apiClient.post('/auth/login', { username, password });
  },
  
  getProfile: async () => {
    const response = await apiClient.get<AuthProfile>('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    await apiClient.post('/auth/logout');
  },
};
```

### Error Handling

Consistent error handling across all API calls:

```typescript
try {
  const data = await recipesApi.getRecommendations();
  setRecipes(data);
} catch (error) {
  console.error('Failed to fetch recipes:', error);
  // Show user-friendly error message
  setErrorMessage('Unable to load recipes. Please try again.');
}
```

---

## Styling System

### Tailwind CSS

Utility-first CSS framework for rapid UI development.

**Configuration** (`tailwind.config.ts`):
```typescript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom theme extensions
    },
  },
  plugins: [],
}
```

**Global Styles** (`src/index.css`):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom animations */
@keyframes food-fall {
  from { transform: translateY(-100vh) rotate(0deg); }
  to { transform: translateY(100vh) rotate(360deg); }
}

.animate-food-fall {
  animation: food-fall infinite linear;
}
```

### Design System

**Colors** (Decidish Brand):
- Primary: `#2F855A` (Green 700)
- Secondary: Emerald, Teal gradients
- Background: `from-emerald-50 via-green-50 to-teal-50`

**Typography**:
- Primary Font: System fonts (Inter, SF Pro, etc.)
- Display Font: Pacifico (for logo/branding)

**Responsive Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## Internationalization (i18n)

### Setup

**Configuration** (`src/i18n/index.ts`):
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    resources: messages,
    interpolation: {
      escapeValue: false,
    },
  });
```

### Translation Files

Structure: `src/i18n/local/{lang}/translation.json`

**Example** (`en/translation.json`):
```json
{
  "landing": {
    "title": "Your Personal Recipe Companion",
    "subtitle": "Discover personalized recipes tailored to your taste",
    "cta": "Get Started Free"
  },
  "auth": {
    "login": "Log In",
    "register": "Sign Up",
    "email": "Email",
    "password": "Password"
  }
}
```

### Usage in Components

```typescript
import { useTranslation } from 'react-i18next';

export default function Landing() {
  const { t } = useTranslation();
  
  return (
    <h1>{t('landing.title')}</h1>
  );
}
```

---

## Environment Configuration

### Environment Variables

**Required Variables** (create `.env` file):

```bash
# Backend API Base URL
VITE_BASE_URL=http://localhost

# Optional: Custom base path for deployment
BASE_PATH=/

# Optional: Preview mode flag
IS_PREVIEW=false
```

### Development vs Production

**Development** (`.env.development`):
```bash
VITE_BASE_URL=http://localhost
```

**Production** (`.env.production`):
```bash
VITE_BASE_URL=https://api.decidish.win
```

### Accessing in Code

```typescript
const baseURL = import.meta.env.VITE_BASE_URL;
const basePath = __BASE_PATH__;  // Defined in vite.config.ts
```

---

## Build Configuration

### Vite Configuration

**Key Features** (`vite.config.ts`):

1. **Auto-Import Plugin**: Automatically imports React hooks
2. **React SWC**: Fast refresh with Speedy Web Compiler
3. **Path Aliases**: `@/` resolves to `src/`
4. **Global Constants**: Define global variables

```typescript
export default defineConfig({
  define: {
    __BASE_PATH__: JSON.stringify(process.env.BASE_PATH || "/"),
    __IS_PREVIEW__: JSON.stringify(process.env.IS_PREVIEW || false),
  },
  plugins: [
    react(),
    AutoImport({
      imports: [
        {
          react: ["React", "useState", "useEffect", ...],
          "react-router-dom": ["useNavigate", "useParams", ...],
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

### TypeScript Configuration

**App Config** (`tsconfig.app.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Running the Application

### Prerequisites

- **Node.js**: 20+ (LTS recommended)
- **npm**: 9+ or **pnpm**: 8+
- **Backend Services**: Authorization, Personalization, Core services running

### Local Development

#### 1. Install Dependencies

```bash
cd client
npm install
```

#### 2. Configure Environment

```bash
# Create .env file
cat > .env << EOF
VITE_BASE_URL=http://localhost
EOF
```

#### 3. Start Development Server

```bash
npm run dev
```

Application starts on `http://localhost:5173`

**Features**:
- Hot Module Replacement (HMR)
- Fast Refresh
- TypeScript type checking
- Auto-import of React hooks

### Build for Production

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

**Output**: `dist/` directory with optimized static files

### Type Checking

```bash
# Run TypeScript compiler without emitting files
npm run type-check
```

### Linting

```bash
# Run ESLint on source files
npm run lint
```

---

## Docker Deployment

### Dockerfile

Multi-stage build for optimized production image:

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_BASE_URL
ENV VITE_BASE_URL=${VITE_BASE_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/out ./out

EXPOSE 3000

CMD ["serve", "-s", "out", "-l", "3000"]
```

### Build Image

```bash
docker build -t decidish-client:latest \
  --build-arg VITE_BASE_URL=https://api.decidish.win \
  .
```

### Run Container

```bash
docker run -d \
  --name decidish-client \
  -p 3000:3000 \
  decidish-client:latest
```

### Docker Compose

```yaml
client:
  build:
    context: ./client
    dockerfile: Dockerfile
    args:
      VITE_BASE_URL: http://localhost
  ports:
    - "3000:3000"
  depends_on:
    - authorization
    - personalization
    - core
```

---

## Testing

### Manual Testing Checklist

**Authentication Flow**:
- [ ] Register new user
- [ ] Login with credentials
- [ ] View profile
- [ ] Logout

**Recipe Discovery**:
- [ ] Complete questionnaire
- [ ] Swipe through recipes
- [ ] Like/dislike recipes
- [ ] View recipe details
- [ ] Save recipes to favorites

**Shopping List**:
- [ ] Select market
- [ ] Generate shopping list from recipes
- [ ] Choose product alternatives
- [ ] Add to cart
- [ ] View active cart
- [ ] Check off items
- [ ] Complete shopping trip
- [ ] View history

**Search & Browse**:
- [ ] Search recipes by text
- [ ] Apply category filters
- [ ] Apply keyword filters
- [ ] Filter by time and calories
- [ ] View search results
- [ ] Save from search results

### Testing with cURL

**Login**:
```bash
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"password"}' \
  -c cookies.txt
```

**Get Recommendations**:
```bash
curl -X GET http://localhost/api/v1/recipes/recommend \
  -b cookies.txt
```

---

## Performance Optimizations

### Implemented Optimizations

1. **Code Splitting**: Lazy loading with React.lazy()
2. **Bundle Optimization**: Vite's built-in optimization
3. **SWC Compiler**: Faster than Babel
4. **Auto-Import**: Reduces boilerplate
5. **Tree Shaking**: Removes unused code
6. **Compression**: Gzip/Brotli in production
7. **Image Optimization**: Lazy loading images
8. **Debouncing**: Search input debouncing

### Performance Tips

**Images**:
```tsx
<img 
  src={recipe.image} 
  loading="lazy"
  alt={recipe.title}
/>
```

**Memoization**:
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

**Callback Optimization**:
```typescript
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

---

## Accessibility (a11y)

### Best Practices

1. **Semantic HTML**: Use proper HTML elements
2. **Keyboard Navigation**: All interactive elements keyboard-accessible
3. **ARIA Labels**: Meaningful labels for screen readers
4. **Focus Management**: Proper focus states
5. **Color Contrast**: WCAG AA compliant
6. **Alt Text**: Images have descriptive alt text

### Example Implementation

```tsx
<button
  aria-label="Like recipe"
  onClick={handleLike}
  className="focus:ring-2 focus:ring-emerald-500"
>
  <Heart className="w-6 h-6" />
</button>
```

---

## Browser Support

### Target Browsers

- **Chrome/Edge**: Last 2 versions
- **Firefox**: Last 2 versions
- **Safari**: Last 2 versions
- **Mobile Safari**: iOS 13+
- **Chrome Android**: Last 2 versions

### Polyfills

Modern features are automatically polyfilled by Vite:
- ES2020 features
- Promise
- Async/Await
- Fetch API

---

## Troubleshooting

### Common Issues

#### 1. **"Cannot find module '@/...' " errors**
- **Cause**: Path alias not resolved
- **Solution**: Check `tsconfig.json` paths and `vite.config.ts` alias configuration

#### 2. **CORS errors when calling API**
- **Cause**: `withCredentials: true` not set or CORS not configured on backend
- **Solution**: 
  - Ensure `withCredentials: true` in axios config
  - Check backend CORS allows credentials
  - Verify backend allows origin

#### 3. **Cookies not being sent with requests**
- **Cause**: Different domains or `withCredentials` not enabled
- **Solution**:
  - Use same domain or proper CORS setup
  - Enable `withCredentials` in axios
  - Check cookie domain settings

#### 4. **Hot Module Replacement (HMR) not working**
- **Cause**: Vite dev server issues
- **Solution**:
  - Restart dev server
  - Clear `.vite` cache
  - Check for circular dependencies

#### 5. **Build fails with type errors**
- **Cause**: TypeScript errors
- **Solution**:
  - Run `npm run type-check` to see errors
  - Fix type errors in code
  - Update type definitions if needed

#### 6. **Images not loading in production**
- **Cause**: Incorrect asset paths
- **Solution**:
  - Use relative paths or import images
  - Check public folder structure
  - Verify base path configuration

---

## Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/recipe-filters

# Make changes and commit
git add .
git commit -m "feat: add category filters to search"

# Push and create PR
git push origin feature/recipe-filters
```

### Code Review Checklist

- [ ] TypeScript types are properly defined
- [ ] No console.errors in production code
- [ ] Responsive design tested on mobile
- [ ] Accessibility considerations addressed
- [ ] Error handling implemented
- [ ] Loading states shown to users
- [ ] API calls have proper error handling

---

## Appendix

### Useful Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint code
npm run lint

# Clean node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_BASE_URL` | Backend API base URL | `http://localhost` | Yes |
| `BASE_PATH` | Application base path | `/` | No |
| `IS_PREVIEW` | Preview mode flag | `false` | No |

### Component File Structure

```
ComponentName/
├── index.tsx              # Main component
├── ComponentName.tsx      # Component logic (if separated)
├── styles.module.css      # CSS modules (if needed)
└── types.ts              # Component-specific types
```

### API Response Types

All API responses are typed in `src/types/` directory for type safety.

---

**Last Updated**: February 1, 2026  
**Version**: 1.0.0
