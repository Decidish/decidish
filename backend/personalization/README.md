# Personalization Service

## Overview

The **Personalization Service** is a Go-based microservice within the Decidish platform that handles personalized recipe recommendations, user preferences, shopping lists, and user interaction tracking. It provides a RESTful API for managing user-specific data and integrates with a machine learning pipeline for generating personalized recipe embeddings.

This service acts as the bridge between user preferences and the recommendation engine, leveraging vector embeddings stored in PostgreSQL to deliver tailored recipe suggestions based on user behavior and dietary requirements.

---

## Architecture

### Technology Stack

- **Language**: Go 1.25
- **Framework**: Gin (Web Framework)
- **Database**: PostgreSQL with pgvector extension
- **Authentication**: JWT-based authentication
- **Metrics**: Prometheus for observability
- **HTTP Client**: Resty with fallback to net/http
- **Containerization**: Docker

### Key Dependencies

```go
- github.com/gin-gonic/gin v1.11.0          // Web framework
- github.com/lib/pq v1.10.9                 // PostgreSQL driver
- github.com/golang-jwt/jwt/v5 v5.3.0       // JWT authentication
- github.com/go-resty/resty/v2 v2.17.1      // HTTP client
- github.com/zsais/go-gin-prometheus v1.0.2 // Prometheus metrics
- github.com/gin-contrib/cors v1.7.6        // CORS middleware
```

---

## Project Structure

```
backend/personalization/
├── cmd/
│   └── personalization/
│       ├── main.go           # Application entry point
│       └── setup.go          # Dependency injection and routing setup
├── internal/
│   ├── client/
│   │   └── generic.go        # HTTP client wrapper (Resty + net/http)
│   ├── config/
│   │   └── app_config.go     # Application configuration from env vars
│   ├── controller/
│   │   ├── job_controller.go           # Job status and import history
│   │   ├── recipe_controller.go        # Recipe CRUD and search
│   │   ├── recommender_controller.go   # Personalized recommendations
│   │   └── user_controller.go          # User preferences and actions
│   ├── driver/
│   │   └── postgres_driver.go  # Database connection pool management
│   ├── middleware/
│   │   └── auth_middleware.go  # JWT authentication middleware
│   ├── repository/
│   │   ├── job_repository.go              # Job tracking queries
│   │   ├── recipe_repository.go           # Recipe search and filtering
│   │   ├── recommender_repository.go      # Vector-based recommendations
│   │   ├── saved_recipes_repository.go    # User saved recipes
│   │   ├── shopping_list_repository.go    # Shopping cart management
│   │   ├── user_history_repository.go     # User action tracking
│   │   └── user_preference_repository.go  # User preferences and embeddings
│   └── service/
│       ├── cleanup_service.go        # Data retention and cleanup
│       ├── pipeline_service.go       # ML pipeline integration
│       ├── recipe_service.go         # Recipe business logic
│       ├── recommender_service.go    # Recommendation logic
│       ├── saved_recipes_service.go  # Saved recipes management
│       ├── shopping_list_service.go  # Shopping list operations
│       └── user_service.go           # User preference management
├── tests/                    # Test files
├── .env                      # Environment variables
├── Dockerfile                # Multi-stage Docker build
├── go.mod                    # Go module dependencies
└── go.sum                    # Dependency checksums
```

---

## Core Features

### 1. **Recipe Management**

#### Recipe Search
- **Advanced Filtering**: Search recipes by query text, categories, keywords, max cooking time, and max calories
- **Multi-category Support**: Filter by multiple categories simultaneously (AND logic)
- **Keyword Filtering**: Filter by multiple keywords (AND logic)
- **Pagination**: Efficient pagination with configurable page size
- **Allergen Information**: Displays allergen information for each recipe

**Endpoint**: `GET /recipes/search`

**Query Parameters**:
- `q`: Search query (title/description)
- `categories`: Comma-separated or array of category names
- `keywords`: Comma-separated or array of keywords
- `maxTime`: Maximum cooking time in minutes
- `maxCalories`: Maximum calories
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 12)

#### Recipe Import
- **URL Import**: Import recipes from external URLs via ML pipeline
- **Rewe Integration**: Bulk import recipes from Rewe grocery store
- **Job Tracking**: Async job status tracking for imports
- **Import History**: View past import operations

**Endpoints**:
- `POST /recipes/add/` - Import recipe from URL
- `POST /recipes/add/rewe/` - Trigger Rewe bulk import
- `GET /jobs/:id` - Check job status
- `GET /recipes/history/rewe` - View Rewe import history
- `GET /recipes/history/url` - View URL import history

#### Admin Statistics
**Endpoint**: `GET /admin/stats`

Returns:
- Total recipes in database
- Recipes imported today
- Active users (last 30 days)

---

### 2. **Personalized Recommendations**

The recommendation system uses **vector embeddings** to match user preferences with recipes.

#### How It Works

1. **User Embedding Generation**:
   - User fills out preference questionnaire (allergies, cooking time, budget, skill level)
   - Frontend generates a preference vector
   - Backend sends vector to ML embedder service
   - Embedder returns user embedding, stored in `user_embeddings` table

2. **Recipe Matching**:
   - Uses PostgreSQL's `<=>` operator for cosine distance
   - Filters out:
     - Recipes viewed in last 7 days
     - Recipes exceeding user's max cooking time
     - Recipes containing user allergens
   - Returns top 100 candidates
   - Applies diversity sampling and final ranking

3. **Online Learning**:
   - Tracks user likes/dislikes via `user_history` table
   - Updates user embedding via ML pipeline's `/tune` endpoint
   - Uses weekly user adapter for personalization
   - Optional online BCE (Binary Cross-Entropy) for fine-tuning

**Endpoint**: `GET /api/v1/recipes/recommend` (Protected)

**Algorithm Flow**:
```sql
1. Fetch user embedding from user_embeddings
2. Calculate cosine distance to all recipe embeddings
3. Filter by:
   - Not viewed in last 7 days
   - total_time <= user's max_cooking_time
   - No allergen conflicts
4. Order by distance ASC, limit 100
5. Apply diversity sampling by cuisine
6. Return top recipes
```

---

### 3. **User Preferences Management**

#### Create/Update Preferences
**Endpoint**: `POST /api/v1/user/preferences` (Protected)

**Request Body**:
```json
{
  "allergies": ["peanuts", "shellfish"],
  "min_cooking_time": 15,
  "max_cooking_time": 60,
  "budget": 50,
  "skill_level": "intermediate",
  "preference_vector": [0.1, 0.2, ..., 0.9]
}
```

**Process**:
1. Validates JWT token, extracts `user_id`
2. Stores preferences in `user_preferences` table
3. Sends `preference_vector` to ML embedder service
4. Receives user embedding
5. Stores embedding in `user_embeddings` table

#### Get Preferences
**Endpoint**: `GET /api/v1/user/preferences` (Protected)

Returns user's current preferences and allergen list.

#### Check Embedding Status
**Endpoint**: `GET /api/v1/user/isembedded` (Protected)

Returns `{"ready": true/false}` indicating if user embedding exists.

---

### 4. **Shopping List Management**

#### Add Products to Shopping List
**Endpoint**: `POST /api/v1/user/add-to-list` (Protected)

**Request Body**:
```json
[
  {
    "product_id": 123,
    "quantity": 2,
    "recipe_id": 456
  },
  {
    "product_id": 789,
    "quantity": 1,
    "recipe_id": 456
  }
]
```

**Features**:
- **Batch Insert**: Optimized batch operation using PostgreSQL `UNNEST`
- **Deduplication**: Automatically merges duplicate items
- **Atomic Operations**: Uses `INSERT ON CONFLICT` for race-condition safety
- **Auto-save Recipes**: Automatically saves recipes to user's saved list when adding to cart
- **Conflict Handling**: Updates quantity if item already exists

#### Get Active Shopping List
**Endpoint**: `GET /api/v1/user/active/list` (Protected)

Returns the user's current active (non-completed) shopping list with all items.

#### Update Shopping List Item
**Endpoint**: `PUT /api/v1/user/update/item` (Protected)

**Request Body**:
```json
{
  "item_id": "abc-123",
  "checked": true,
  "quantity": 3
}
```

#### Delete Shopping List Item
**Endpoint**: `DELETE /api/v1/user/delete/item/:item_id` (Protected)

#### Complete Shopping List
**Endpoint**: `PUT /api/v1/user/complete/list/:list_id` (Protected)

Marks shopping list as completed, triggering creation of a new active list for future additions.

#### Get Shopping History
**Endpoint**: `GET /api/v1/user/shopping/history` (Protected)

Returns all completed shopping lists with their items.

---

### 5. **Saved Recipes**

#### Save Recipe
**Endpoint**: `POST /api/v1/user/saved-recipes` (Protected)

**Request Body**:
```json
{
  "recipe_id": 123
}
```

#### Unsave Recipe
**Endpoint**: `DELETE /api/v1/user/saved-recipes/:recipe_id` (Protected)

#### Get Saved Recipes
**Endpoint**: `GET /api/v1/user/saved-recipes` (Protected)

Returns full recipe details for all saved recipes.

#### Get Saved Recipe IDs
**Endpoint**: `GET /api/v1/user/saved-recipes/ids` (Protected)

Returns array of recipe IDs for quick lookups.

#### Check If Recipe Is Saved
**Endpoint**: `GET /api/v1/user/saved-recipes/:recipe_id/check` (Protected)

Returns `{"saved": true/false}`.

---

### 6. **User History Tracking**

#### Record User Action
**Endpoint**: `POST /api/v1/user/record/:action/:recipeID` (Protected)

**Actions**: `like`, `dislike`, `view`

**Process**:
1. Records action in `user_history` table
2. Implements FIFO queue (max 99 likes, 99 dislikes per user)
3. For `like`/`dislike`, triggers embedding update via ML pipeline
4. Uses `/tune` endpoint for online learning

**Threshold Management**:
- Automatically removes oldest actions when limit reached
- Prevents database bloat
- Maintains recent behavior focus

#### Get User History
**Endpoint**: `GET /api/v1/user/history` (Protected)

Returns all user interactions with recipes, including full recipe details.

---

### 7. **Market Selection**

#### Set Selected Market
**Endpoint**: `POST /api/v1/user/market` (Protected)

**Request Body**:
```json
{
  "market_id": "rewe_123"
}
```

Associates user with a specific grocery market for product recommendations.

#### Get Selected Market
**Endpoint**: `GET /api/v1/user/market` (Protected)

Returns `{"marketId": "rewe_123"}`.

---

## Authentication & Security

### JWT Authentication

The service uses JWT (JSON Web Tokens) for authentication. Protected routes require a valid JWT token in the `auth_token` cookie.

**Token Structure**:
```go
type CustomClaims struct {
    UserID string `json:"user_id"`
    jwt.RegisteredClaims
}
```

**Middleware**: `AuthMiddleware` in `internal/middleware/auth_middleware.go`

**Process**:
1. Extracts `auth_token` cookie from request
2. Validates token signature using `JWT_SECRET`
3. Extracts `user_id` from claims
4. Injects `user_id` into Gin context for downstream handlers
5. Returns 401 Unauthorized if validation fails

### CORS Configuration

```go
AllowOrigins:     []string{"http://localhost:8081", "http://localhost:3000", "https://qa.decidish.win"}
AllowMethods:     []string{"PUT", "PATCH", "POST", "GET", "OPTIONS", "DELETE"}
AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"}
AllowCredentials: true
MaxAge:           12 * time.Hour
```

---

## Database Schema

### Key Tables

#### `recipes`
Stores recipe metadata (title, description, times, calories, etc.)

#### `recipe_embeddings`
Stores 128-dimensional embeddings for recipes using PostgreSQL vector type

#### `user_embeddings`
Stores user embeddings generated from preference vectors

#### `user_preferences`
Stores user preferences (allergies, cooking time, budget, skill level, market selection)

#### `user_history`
Tracks user actions (likes, dislikes, views) with timestamps

#### `shopping_lists`
Stores shopping list metadata (user_id, completed status)

#### `shopping_list_items`
Stores individual items in shopping lists (product_id, quantity, checked status, recipe_id)

#### `saved_recipes`
Junction table for user saved recipes

#### `jobs`
Tracks async import jobs (status, progress, error messages)

---

## Machine Learning Integration

### Embedder Service

The service communicates with an external ML pipeline via HTTP.

**Base URL**: Configured via `EMBEDDER_SERVER_URL` environment variable

### Endpoints Used

#### 1. `/encode_users_batch`
**Purpose**: Convert preference vectors to user embeddings

**Request**:
```json
{
  "users": [
    {
      "user_id": "user123",
      "user_vector": [0.1, 0.2, ..., 0.9]
    }
  ]
}
```

**Response**:
```json
{
  "users": [
    {
      "user_id": "user123",
      "user_embedding": [0.05, 0.15, ..., 0.85]
    }
  ],
  "embedding_dim": 128
}
```

#### 2. `/tune`
**Purpose**: Update user embedding based on likes/dislikes (online learning)

**Request**:
```go
type TuneRequest struct {
    UserEmb              []float64 // Current user embedding
    RecipeEmb            []float64 // Recipe embedding
    Like                 int       // 1 for like, 0 for dislike
    UseWeeklyUserAdapter bool      // Use personalization adapter
    DoOnlineBCE          bool      // Apply BCE loss update
    BCESteps             int       // Gradient steps
    BCELR                float64   // Learning rate
    BCETemperature       float64   // Temperature for BCE
    BCEL2Anchor          float64   // L2 regularization
    BCEClipGradNorm      float64   // Gradient clipping
}
```

**Response**:
```json
{
  "updated_user_emb": [[0.06, 0.16, ..., 0.86]],
  "model_info": {
    "adapter": "weekly",
    "steps": 5
  }
}
```

**Default Configuration**:
- `UseWeeklyUserAdapter`: true
- `DoOnlineBCE`: false
- `BCESteps`: 5
- `BCELR`: 0.05
- `BCETemperature`: 0.07
- `BCEL2Anchor`: 0.01
- `BCEClipGradNorm`: 5.0

---

## Data Cleanup & Maintenance

### Cleanup Service

**Purpose**: Automatically remove deprecated data to maintain database health

**TTL Settings**:
- **Jobs**: 1 week
- **User History**: 8 weeks (2 months)

**Trigger**: `POST /jobs/cleanup`

**Process**:
1. Deletes jobs older than 1 week
2. Deletes user history entries older than 8 weeks
3. Runs asynchronously
4. Logs cleanup statistics

**Recommendation**: Schedule this endpoint via cron job for regular maintenance.

---

## Performance Optimizations

### 1. **Database Connection Pooling**

```go
db.SetMaxOpenConns(100)                // Max concurrent connections
db.SetMaxIdleConns(25)                 // Idle connections ready
db.SetConnMaxLifetime(5 * time.Minute) // Connection lifespan
db.SetConnMaxIdleTime(1 * time.Minute) // Idle connection timeout
```

Configured for handling 100+ concurrent users.

### 2. **Batch Operations**

#### Shopping List Batch Insert
Uses PostgreSQL `UNNEST` to insert multiple items in a single query:
```sql
INSERT INTO shopping_list_items (shopping_list_id, product_id, quantity, recipe_id)
SELECT $1, unnest($2::int[]), unnest($3::int[]), unnest($4::int[])
ON CONFLICT (shopping_list_id, product_id, recipe_id) 
DO UPDATE SET quantity = shopping_list_items.quantity + EXCLUDED.quantity
```

**Benefits**:
- ~10x faster than individual inserts
- Reduced network round trips
- Better transaction efficiency

### 3. **Vector Search Optimization**

- Uses PostgreSQL `<=>` operator for cosine similarity
- Leverages pgvector indexes for fast nearest-neighbor search
- Limits candidate set to 100 recipes before ranking
- Avoids full table scans

### 4. **HTTP Client Resilience**

- Dual client approach (Resty + net/http fallback)
- 10-second timeouts
- Automatic retries (2 attempts)
- 500ms retry wait time

---

## Environment Variables

### Required Variables

```bash
# Database Configuration
DATABASE_URL="user=user password=pass dbname=decidish host=localhost port=5433 sslmode=disable"

# JWT Secret (must match authorization service)
JWT_SECRET="your-secret-key-here"

# ML Pipeline
EMBEDDER_SERVER_URL="http://localhost:8000"
```

### Optional Variables

```bash
# PostgreSQL Credentials (for reference)
POSTGRES_USER="user"
POSTGRES_PASSWORD="1234"
POSTGRES_DB="decidish"

# Kafka (if using event streaming)
KAFKA_CONNECTION_URL="localhost:9092"

# MinIO (for recipe storage)
MINIO_ENDPOINT="s3-api.example.com"
MINIO_ACCESS_KEY="access-key"
MINIO_SECRET_KEY="secret-key"
MINIO_USE_SSL="true"
MINIO_RECIPES_BUCKET="decidish-storage"
MINIO_RECIPES_OBJECT="recipes.jsonl"
```

---

## Running the Service

### Local Development

#### Prerequisites
- Go 1.25+
- PostgreSQL with pgvector extension
- ML embedder service running

#### Steps

1. **Clone and navigate to directory**:
```bash
cd backend/personalization
```

2. **Install dependencies**:
```bash
go mod download
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run the service**:
```bash
go run cmd/personalization/main.go
```

Service starts on `http://localhost:8082`

### Docker

#### Build Image
```bash
docker build -t decidish-personalization:latest .
```

#### Run Container
```bash
docker run -d \
  --name personalization \
  -p 8082:8082 \
  --env-file .env \
  decidish-personalization:latest
```

### Docker Compose

Typically integrated into main `docker-compose.yml`:
```yaml
personalization:
  build:
    context: ./backend/personalization
    dockerfile: Dockerfile
  ports:
    - "8082:8082"
  environment:
    DATABASE_URL: "user=user password=pass dbname=decidish host=postgres port=5432 sslmode=disable"
    JWT_SECRET: "your-secret"
    EMBEDDER_SERVER_URL: "http://mlpipeline:8000"
  depends_on:
    - postgres
    - mlpipeline
```

---

## API Documentation

### Public Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/recipes/add/` | Import recipe from URL | No |
| POST | `/recipes/add/rewe/` | Bulk import Rewe recipes | No |
| GET | `/admin/stats` | Get admin statistics | No |
| GET | `/recipes/search` | Search recipes with filters | No |
| GET | `/categories` | List available categories | No |
| GET | `/keywords` | List available keywords | No |
| GET | `/jobs/:id` | Get job status | No |
| GET | `/recipes/history/rewe` | Rewe import history | No |
| GET | `/recipes/history/url` | URL import history | No |
| POST | `/jobs/cleanup` | Trigger data cleanup | No |

### Protected Endpoints (Require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/recipes/recommend` | Get personalized recommendations |
| POST | `/api/v1/user/preferences` | Create/update user preferences |
| GET | `/api/v1/user/preferences` | Get user preferences |
| POST | `/api/v1/user/market` | Set selected market |
| GET | `/api/v1/user/market` | Get selected market |
| GET | `/api/v1/user/isembedded` | Check if user embedding exists |
| POST | `/api/v1/user/add-to-list` | Add products to shopping list |
| GET | `/api/v1/user/active/list` | Get active shopping list |
| PUT | `/api/v1/user/update/item` | Update shopping list item |
| DELETE | `/api/v1/user/delete/item/:item_id` | Delete shopping list item |
| PUT | `/api/v1/user/complete/list/:list_id` | Mark shopping list complete |
| GET | `/api/v1/user/shopping/history` | Get shopping history |
| POST | `/api/v1/user/record/:action/:recipeID` | Record user action |
| GET | `/api/v1/user/history` | Get user action history |
| POST | `/api/v1/user/saved-recipes` | Save recipe |
| DELETE | `/api/v1/user/saved-recipes/:recipe_id` | Unsave recipe |
| GET | `/api/v1/user/saved-recipes` | Get all saved recipes |
| GET | `/api/v1/user/saved-recipes/ids` | Get saved recipe IDs |
| GET | `/api/v1/user/saved-recipes/:recipe_id/check` | Check if recipe is saved |

---

## Monitoring & Observability

### Prometheus Metrics

The service exposes Prometheus metrics at `/metrics` endpoint via `go-gin-prometheus`.

**Available Metrics**:
- HTTP request duration histogram
- Request count by status code
- In-flight requests gauge
- Request size histogram
- Response size histogram

**Integration**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'personalization'
    static_configs:
      - targets: ['personalization:8082']
```

### Logging

Standard Go `log` package with structured output:
- Database connection events
- Transaction management
- Error conditions
- Cleanup operations
- ML pipeline interactions

---

## Testing

### Unit Tests

Located in `*_test.go` files:
- `controller/*_test.go`: Controller tests with mocked services
- `service/*_test.go`: Service tests with mocked repositories
- `repository/*_test.go`: Repository tests with sqlmock

### Running Tests

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package
go test ./internal/service/...

# Verbose output
go test -v ./...
```

---

## Common Operations

### Add New Recipe Source

1. Create importer in ML pipeline
2. Add endpoint in `recipe_controller.go`
3. Create service method in `recipe_service.go`
4. Call ML pipeline via `client.PostJSON()`
5. Track job in `jobs` table

### Modify Recommendation Algorithm

1. Update SQL query in `recommender_repository.go`
2. Adjust filtering logic (time, allergens, history)
3. Modify diversity sampling in service layer
4. Test with various user profiles

### Add New User Preference

1. Update `AdditionalInfo` struct in `user_preference_repository.go`
2. Modify database schema
3. Update frontend questionnaire
4. Adjust preference vector generation
5. Retrain ML embedder if needed

---

## Troubleshooting

### Common Issues

#### 1. **"No user embedding found" / Recommendations fail**
- **Cause**: User hasn't completed preference questionnaire
- **Solution**: Check `/api/v1/user/isembedded` endpoint, prompt user to set preferences

#### 2. **"Could not connect to embedder service"**
- **Cause**: ML pipeline not running or wrong URL
- **Solution**: Verify `EMBEDDER_SERVER_URL` and ML service status

#### 3. **"JWT token invalid"**
- **Cause**: Token expired or `JWT_SECRET` mismatch
- **Solution**: Ensure all services use same `JWT_SECRET`, refresh user token

#### 4. **Shopping list items duplicated**
- **Cause**: Race condition from concurrent requests
- **Solution**: Service uses `INSERT ON CONFLICT`, ensure database constraints are in place

#### 5. **Slow recipe search**
- **Cause**: Missing database indexes
- **Solution**: Ensure indexes on `recipes.total_time`, `recipe_embeddings.embedding`, `user_history(user_id, action_timestamp)`

---

## Appendix

### Database Migrations

Migrations are located in `/migrations` directory. Key migrations:
- `20251130150456_init_recipe_schema.sql`: Recipe tables
- `20251202104812_init_embeddings.sql`: Embedding tables
- `20251202130946_init_user_embeddings.sql`: User embeddings
- `20260122201824_add_shopping_cart.sql`: Shopping list tables
- `20260201140000_create_saved_recipes.sql`: Saved recipes table

Run migrations using the migration service in the project root.

### Service Dependencies

```
personalization
├── PostgreSQL (primary database)
├── mlpipeline (embedder service)
└── authorization (JWT token validation)
```

### Port Allocation
- **8082**: Personalization service HTTP API
- **5433**: PostgreSQL (local development)
- **8000**: ML embedder service

---

**Last Updated**: February 1, 2026
**Version**: 1.0.0
