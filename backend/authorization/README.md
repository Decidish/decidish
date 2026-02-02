# Authorization Service

## Overview

The **Authorization Service** is a lightweight Go-based microservice within the Decidish platform that handles user authentication and authorization. It provides JWT (JSON Web Token) based authentication, user registration, login/logout functionality, and secure session management using HTTP-only cookies.

This service acts as the authentication gateway for the entire platform, issuing and validating JWT tokens that other services use to authenticate user requests.

---

## Architecture

### Technology Stack

- **Language**: Go 1.25
- **Framework**: Gin (Web Framework)
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Database Migrations**: Goose
- **Metrics**: Prometheus for observability
- **Containerization**: Docker

### Key Dependencies

```go
- github.com/gin-gonic/gin v1.11.0          // Web framework
- github.com/golang-jwt/jwt/v5 v5.3.0       // JWT implementation
- github.com/lib/pq v1.10.9                 // PostgreSQL driver
- github.com/pressly/goose/v3 v3.26.0       // Database migrations
- golang.org/x/crypto/bcrypt                // Password hashing
- github.com/gin-contrib/cors v1.7.6        // CORS middleware
- github.com/zsais/go-gin-prometheus v1.0.2 // Prometheus metrics
```

---

## Project Structure

```
backend/authorization/
├── server.go                     # Application entry point
├── go.mod                        # Go module dependencies
├── go.sum                        # Dependency checksums
├── Dockerfile                    # Multi-stage Docker build
├── auth/
│   └── auth.go                   # JWT token generation logic
├── config/
│   └── config.go                 # Application configuration
├── controller/
│   └── authorization_controller.go  # HTTP handlers for auth endpoints
├── database/
│   └── database.go               # Database connection and migration runner
└── migrations/
    ├── 20251129110743_init_user_table.sql    # Create users table
    └── 20251207154903_init_dummy_user.sql    # Seed admin user
```

---

## Core Features

### 1. **User Registration**

Creates a new user account with secure password hashing.

#### Endpoint
`POST /register`

**Request Body**:
```json
{
  "username": "john@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response** (Success - 200 OK):
```json
{
  "message": "Successfully registered user"
}
```

**Response** (Error - 500 Internal Server Error):
```json
{
  "error": "Error registering user: john@example.com, duplicate key value violates unique constraint"
}
```

#### Process Flow

1. **Request Validation**: Validates that `username` and `password` are present
2. **Password Hashing**: Uses bcrypt with default cost (10) to hash the password
   ```go
   bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
   ```
3. **Database Insert**: Stores user with hashed password in `users` table
4. **Error Handling**: Returns appropriate error if username already exists

#### Security Features

- **Password Hashing**: Never stores plain-text passwords
- **Bcrypt Cost**: Default cost of 10 (2^10 = 1,024 iterations)
- **Unique Username**: Database constraint prevents duplicate usernames
- **Input Validation**: Required fields enforced via Gin binding

---

### 2. **User Login**

Authenticates user credentials and issues a JWT token via secure HTTP-only cookie.

#### Endpoint
`POST /login`

**Request Body**:
```json
{
  "username": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (Success - 200 OK):
```json
{
  "message": "Successfully logged in"
}
```

Sets HTTP-only cookie:
```
Set-Cookie: auth_token={JWT_TOKEN}; Path=/; Domain=.decidish.win; Secure; HttpOnly; SameSite=Lax; Max-Age=86400
```

**Response** (Error - 401 Unauthorized):
```json
{
  "error": "Invalid username or password"
}
```

#### Process Flow

1. **Credential Verification**:
   - Queries database for user by username
   - Compares provided password with stored hash using `bcrypt.CompareHashAndPassword()`
   
2. **JWT Token Generation**:
   - Creates custom claims with user ID
   - Sets expiration to 24 hours from current time
   - Signs token with `JWT_SECRET` using HMAC-SHA256
   
3. **Cookie Configuration**:
   - **Name**: `auth_token`
   - **HttpOnly**: Prevents JavaScript access (XSS protection)
   - **Secure**: Only transmitted over HTTPS
   - **SameSite**: Lax mode (strict for production, None for localhost)
   - **Domain**: `.decidish.win` for cross-subdomain support (empty for localhost)
   - **MaxAge**: 24 hours (86400 seconds)

#### JWT Token Structure

**Claims**:
```go
type CustomClaims struct {
    UserID string `json:"user_id"`
    jwt.RegisteredClaims
}
```

**Standard Claims**:
- `iat` (Issued At): Timestamp when token was created
- `exp` (Expiration Time): 24 hours from issue time

**Example Token Payload** (decoded):
```json
{
  "user_id": "123",
  "iat": 1738368000,
  "exp": 1738454400
}
```

---

### 3. **User Profile**

Retrieves authenticated user's profile information.

#### Endpoint
`GET /me`

**Authentication**: Requires valid JWT token in `auth_token` cookie

**Response** (Success - 200 OK):
```json
{
  "id": 123,
  "user_id": "123",
  "username": "john@example.com",
  "email": "john@example.com",
  "name": "John Doe",
  "created_at": "2025-11-29T14:30:00Z"
}
```

**Response** (Error - 401 Unauthorized):
```json
{
  "error": "missing auth token"
}
```

or

```json
{
  "error": "invalid auth token"
}
```

**Response** (Error - 404 Not Found):
```json
{
  "error": "user not found"
}
```

#### Process Flow

1. **Token Extraction**: Reads `auth_token` from cookies
2. **Token Validation**:
   - Parses JWT token
   - Verifies signature using `JWT_SECRET`
   - Checks expiration time
3. **User Lookup**: Queries database for user by ID from token claims
4. **Response**: Returns user profile data

---

### 4. **User Logout**

Invalidates the user session by clearing the authentication cookie.

#### Endpoint
`POST /logout`

**Authentication**: Not required (cookie is cleared regardless)

**Response** (200 OK):
```json
{
  "message": "Successfully logged out"
}
```

#### Process Flow

1. **Cookie Invalidation**: Sets `auth_token` cookie with:
   - `MaxAge: -1` (instructs browser to delete cookie immediately)
   - Empty value
   - Same domain/path/security settings as login
   
2. **Immediate Effect**: Browser removes cookie, subsequent requests are unauthenticated

**Note**: Logout is client-side only. JWT tokens remain valid until expiration (24 hours) if intercepted.

---

## Security Features

### Password Security

**Bcrypt Hashing**:
```go
bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
```

- **Algorithm**: bcrypt (adaptive hash function)
- **Cost Factor**: 10 (default) = 2^10 = 1,024 iterations
- **Salt**: Automatically generated and embedded in hash
- **Output Format**: `$2a$10$...` (60-character string)

**Why bcrypt?**:
- Designed to be slow (prevents brute-force attacks)
- Adaptive (cost can be increased as hardware improves)
- Built-in salt (prevents rainbow table attacks)
- Constant-time comparison (prevents timing attacks)

### JWT Token Security

**Signing Method**: HMAC-SHA256 (HS256)
- Symmetric key algorithm
- Shared secret (`JWT_SECRET`) between services
- Fast and secure for internal service communication

**Token Expiration**: 24 hours
- Balances security and user experience
- Expired tokens automatically rejected
- No token refresh mechanism (user must re-login)

**Storage**: HTTP-only cookies
- Not accessible via JavaScript (XSS protection)
- Automatically sent with requests (seamless authentication)
- Secure flag ensures HTTPS transmission

### Cookie Security Configuration

**Production Environment** (decidish.win):
```go
Domain:   ".decidish.win"        // Cross-subdomain support
SameSite: http.SameSiteLaxMode   // CSRF protection
Secure:   true                   // HTTPS only
HttpOnly: true                   // No JavaScript access
MaxAge:   86400                  // 24 hours
```

**Development Environment** (localhost):
```go
Domain:   ""                     // Host-only
SameSite: http.SameSiteNoneMode  // Required for Chrome on localhost
Secure:   true                   // Still enforced
HttpOnly: true                   // Still enforced
MaxAge:   86400                  // 24 hours
```

**Environment Detection**: Automatically adjusts based on request host

### CORS Configuration

```go
AllowOrigins:     []string{"http://localhost:8081", "http://localhost:3000", "https://qa.decidish.win"}
AllowMethods:     []string{"PUT", "PATCH", "POST", "GET", "OPTIONS"}
AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"}
AllowCredentials: true                 // Required for cookie-based auth
MaxAge:           12 * time.Hour      // Cache preflight responses
```

**Key Settings**:
- `AllowCredentials: true` enables cookie transmission in cross-origin requests
- Restricted origins prevent unauthorized domains from making requests
- Limited methods reduce attack surface

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Columns**:
- `id` (PK): Auto-incrementing user ID
- `username`: Unique identifier (typically email)
- `name`: User's display name
- `password_hash`: Bcrypt-hashed password (60 characters)
- `created_at`: Account creation timestamp

**Constraints**:
- `UNIQUE(username)`: Prevents duplicate accounts
- `NOT NULL` on critical fields ensures data integrity

**Indexes** (automatically created):
- Primary key index on `id`
- Unique index on `username` (for fast lookups)

---

## Database Migrations

The service uses **Goose** for version-controlled database migrations.

### Migration Files

#### 1. Initial User Table
**File**: `20251129110743_init_user_table.sql`

Creates the `users` table with all necessary columns and constraints.

#### 2. Dummy Admin User
**File**: `20251207154903_init_dummy_user.sql`

Seeds a default admin user for development/testing:
- **Username**: `decidish_admin`
- **Password**: `password` (hashed)

```sql
INSERT INTO users (username, password_hash)
VALUES ('decidish_admin', '$2a$10$vgJ.qogFVzt6U8.zo.50cuaXW01iBt9FOd1bENY7ocxaqwyTIHFjC')
ON CONFLICT DO NOTHING;
```

**Note**: The password hash corresponds to the plain text `password`. Change this in production!

### Migration Execution

Migrations run automatically on service startup via `goose.Up()`:

```go
func (d DBDriver) RunMigrations(db *sql.DB) {
    if err := goose.SetDialect(d.Name); err != nil {
        log.Fatalf("Goose failed to set dialect: %v", err)
    }
    if err := goose.Up(db, d.MigrationDir); err != nil {
        log.Fatalf("Goose failed to run migrations: %v", err)
    }
    log.Println("Database migrations completed successfully.")
}
```

**Features**:
- **Idempotent**: Safe to run multiple times
- **Version Tracking**: `goose_db_version` table tracks applied migrations
- **Rollback Support**: Down migrations can revert changes

### Manual Migration Commands

```bash
# Apply all pending migrations
goose -dir migrations postgres "user=user password=1234 dbname=decidish host=localhost port=5432 sslmode=disable" up

# Rollback last migration
goose -dir migrations postgres "user=user password=1234 dbname=decidish host=localhost port=5432 sslmode=disable" down

# Check migration status
goose -dir migrations postgres "user=user password=1234 dbname=decidish host=localhost port=5432 sslmode=disable" status
```

---

## Configuration

### Environment Variables

#### Required Variables

```bash
# JWT Secret Key (MUST be same across all services)
JWT_SECRET="l+HBYW06J5e6AfgWLwKCd3giXZylCLa2PFnqLDy02LA="

# PostgreSQL Connection String
DATABASE_URL="user=user password=1234 dbname=decidish host=localhost port=5432 sslmode=disable"
```

#### Environment File (.env)

Create a `.env` file in the service root:

```bash
JWT_SECRET=your-secure-secret-key-here
DATABASE_URL=user=user password=1234 dbname=decidish host=postgres port=5432 sslmode=disable
```

**Important**: 
- The `JWT_SECRET` MUST be the same across all services (authorization, personalization, etc.)
- Use a strong, randomly generated secret (minimum 32 characters)
- Never commit `.env` files to version control

### Generating a Secure JWT Secret

```bash
# Generate a 256-bit (32-byte) base64-encoded secret
openssl rand -base64 32
```

---

## Running the Service

### Local Development

#### Prerequisites
- Go 1.25+
- PostgreSQL 14+
- Make (optional)

#### Steps

1. **Navigate to directory**:
```bash
cd backend/authorization
```

2. **Install dependencies**:
```bash
go mod download
```

3. **Configure environment**:
```bash
# Create .env file
cat > .env << EOF
JWT_SECRET=l+HBYW06J5e6AfgWLwKCd3giXZylCLa2PFnqLDy02LA=
DATABASE_URL=user=user password=1234 dbname=decidish host=localhost port=5432 sslmode=disable
EOF
```

4. **Run the service**:
```bash
go run server.go
```

Service starts on `http://localhost:8083`

5. **Build executable**:
```bash
go build -o auth_service .
./auth_service
```

### Docker

#### Build Image
```bash
docker build -t decidish-authorization:latest .
```

#### Run Container
```bash
docker run -d \
  --name authorization \
  -p 8083:8083 \
  -e JWT_SECRET="your-secret-key" \
  -e DATABASE_URL="user=user password=1234 dbname=decidish host=postgres port=5432 sslmode=disable" \
  decidish-authorization:latest
```

### Docker Compose

Typically integrated into main `docker-compose.yml`:
```yaml
authorization:
  build:
    context: ./backend/authorization
    dockerfile: Dockerfile
  ports:
    - "8083:8083"
  environment:
    JWT_SECRET: "l+HBYW06J5e6AfgWLwKCd3giXZylCLa2PFnqLDy02LA="
    DATABASE_URL: "user=user password=1234 dbname=decidish host=postgres port=5432 sslmode=disable"
  depends_on:
    - postgres
```

---

## API Documentation

### Endpoints

| Method | Endpoint | Description | Auth Required | Request Body | Response |
|--------|----------|-------------|---------------|--------------|----------|
| POST | `/register` | Create new user account | No | `{username, password, name}` | `{message}` |
| POST | `/login` | Authenticate and get JWT cookie | No | `{username, password}` | `{message}` + Cookie |
| GET | `/me` | Get current user profile | Yes | - | `{id, user_id, username, email, name, created_at}` |
| POST | `/logout` | Clear authentication cookie | No | - | `{message}` |
| GET | `/metrics` | Prometheus metrics | No | - | Prometheus format |

### Authentication Flow

```
┌──────────┐                ┌──────────────────┐               ┌──────────┐
│  Client  │                │  Authorization   │               │ Database │
│ (Browser)│                │     Service      │               │          │
└────┬─────┘                └────────┬─────────┘               └────┬─────┘
     │                               │                              │
     │  POST /register               │                              │
     │  {username, password, name}   │                              │
     ├──────────────────────────────>│                              │
     │                               │  Hash password (bcrypt)      │
     │                               ├──────────┐                   │
     │                               │          │                   │
     │                               │<─────────┘                   │
     │                               │                              │
     │                               │  INSERT INTO users           │
     │                               ├─────────────────────────────>│
     │                               │                              │
     │                               │<─────────────────────────────┤
     │                               │                              │
     │  {message: "Success"}         │                              │
     │<──────────────────────────────┤                              │
     │                               │                              │
     │  POST /login                  │                              │
     │  {username, password}         │                              │
     ├──────────────────────────────>│                              │
     │                               │  SELECT id, password_hash    │
     │                               ├─────────────────────────────>│
     │                               │                              │
     │                               │<─────────────────────────────┤
     │                               │                              │
     │                               │  Compare passwords (bcrypt)  │
     │                               ├──────────┐                   │
     │                               │          │                   │
     │                               │<─────────┘                   │
     │                               │                              │
     │                               │  Generate JWT token          │
     │                               ├──────────┐                   │
     │                               │          │                   │
     │                               │<─────────┘                   │
     │                               │                              │
     │  Set-Cookie: auth_token={JWT} │                              │
     │  {message: "Success"}         │                              │
     │<──────────────────────────────┤                              │
     │                               │                              │
     │  GET /me                      │                              │
     │  Cookie: auth_token={JWT}     │                              │
     ├──────────────────────────────>│                              │
     │                               │  Validate JWT token          │
     │                               ├──────────┐                   │
     │                               │          │                   │
     │                               │<─────────┘                   │
     │                               │                              │
     │                               │  SELECT * FROM users         │
     │                               ├─────────────────────────────>│
     │                               │                              │
     │                               │<─────────────────────────────┤
     │                               │                              │
     │  {user profile data}          │                              │
     │<──────────────────────────────┤                              │
     │                               │                              │
     │  POST /logout                 │                              │
     ├──────────────────────────────>│                              │
     │                               │                              │
     │  Set-Cookie: auth_token=      │                              │
     │  (MaxAge=-1)                  │                              │
     │<──────────────────────────────┤                              │
     │                               │                              │
```

---

## Integration with Other Services

### Service-to-Service Authentication

Other services (personalization, core) validate JWT tokens using the same `JWT_SECRET`.

**Example Middleware** (from personalization service):
```go
func AuthMiddleware(config config.ApplicationConfig) gin.HandlerFunc {
    return func(c *gin.Context) {
        cookie, err := c.Cookie("auth_token")
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "message": "Cookie not found",
            })
            return
        }

        token, err := jwt.ParseWithClaims(cookie.Value, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
            return []byte(config.JWTSecret), nil
        })

        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "message": "Invalid token",
            })
            return
        }

        claims, ok := token.Claims.(*CustomClaims)
        if !ok || "" == claims.UserID {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "message": "No user id found",
            })
        }

        c.Set("user_id", claims.UserID)
        c.Next()
    }
}
```

**Key Points**:
1. All services must use the **same JWT_SECRET**
2. Tokens are validated without database queries (stateless)
3. User ID extracted from token and injected into request context
4. Expired or invalid tokens are rejected with 401 Unauthorized

---

## Monitoring & Observability

### Prometheus Metrics

Exposed at `/metrics` endpoint via `go-gin-prometheus`.

**Available Metrics**:
- `gin_requests_total`: Total HTTP requests by method, endpoint, and status
- `gin_request_duration_seconds`: Request duration histogram
- `gin_request_size_bytes`: Request size histogram
- `gin_response_size_bytes`: Response size histogram

**Integration**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'authorization'
    static_configs:
      - targets: ['authorization:8083']
```

### Logging

Standard Go `log` package with structured output:
- Database connection events
- Migration execution
- Configuration loading
- Request errors

**Example Logs**:
```
2026/02/01 10:15:30 Note: Could not find .env file, relying on shell environment.
2026/02/01 10:15:30 {JWTSecret:l+HBYW06J5e6AfgWLwKCd3giXZylCLa2PFnqLDy02LA= DBConnectionUrl:user=user password=1234 dbname=decidish host=localhost port=5432 sslmode=disable}
2026/02/01 10:15:30 Database migrations completed successfully.
2026/02/01 10:15:30 [GIN-debug] POST   /register                 --> main.main.func2 (4 handlers)
2026/02/01 10:15:30 [GIN-debug] POST   /login                    --> main.main.func1 (4 handlers)
2026/02/01 10:15:30 [GIN-debug] GET    /me                       --> main.main.func3 (4 handlers)
2026/02/01 10:15:30 [GIN-debug] POST   /logout                   --> main.main.func4 (4 handlers)
2026/02/01 10:15:30 [GIN-debug] Listening and serving HTTP on :8083
```

---

## Testing

### Manual Testing with cURL

#### Register a New User
```bash
curl -X POST http://localhost:8083/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8083/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",
    "password": "TestPassword123!"
  }' \
  -c cookies.txt \
  -v
```

#### Get User Profile
```bash
curl -X GET http://localhost:8083/me \
  -b cookies.txt
```

#### Logout
```bash
curl -X POST http://localhost:8083/logout \
  -b cookies.txt \
  -c cookies.txt
```

### Testing Default Admin User

The seeded admin user can be used for testing:
```bash
curl -X POST http://localhost:8083/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "decidish_admin",
    "password": "password"
  }' \
  -c cookies.txt
```

**Warning**: Change the default password in production!

### Unit Testing

Create `*_test.go` files for unit tests:

```go
package auth_test

import (
    "testing"
    "authorization/auth"
)

func TestGenerateToken(t *testing.T) {
    service := auth.AuthenticationService{
        JWTSecret: "test-secret",
    }
    
    token, err := service.GenerateToken("123")
    if err != nil {
        t.Fatalf("Failed to generate token: %v", err)
    }
    
    if token == "" {
        t.Error("Generated token is empty")
    }
}
```

Run tests:
```bash
go test ./...
```

---

## Troubleshooting

### Common Issues

#### 1. **"Invalid username or password" on valid credentials**
- **Cause**: JWT_SECRET mismatch between services or incorrect password
- **Solution**: 
  - Verify JWT_SECRET is identical across all services
  - Check password was hashed correctly during registration
  - Try re-registering the user

#### 2. **"Cookie not found" or "Invalid token" in other services**
- **Cause**: Cookie not being sent or JWT_SECRET mismatch
- **Solution**:
  - Check CORS configuration allows credentials
  - Verify `withCredentials: true` in frontend requests
  - Ensure all services share the same JWT_SECRET

#### 3. **"Database migrations failed" on startup**
- **Cause**: Database not accessible or migration files missing
- **Solution**:
  - Verify DATABASE_URL is correct
  - Check PostgreSQL is running and accessible
  - Ensure migrations directory is copied to Docker image

#### 4. **Cookies not being set in development (localhost)**
- **Cause**: Browser security policies or incorrect SameSite settings
- **Solution**:
  - Use `http.SameSiteNoneMode` for localhost
  - Ensure frontend and backend on same domain or use proxy
  - Check browser console for cookie warnings

#### 5. **"duplicate key value violates unique constraint" on registration**
- **Cause**: Username already exists in database
- **Solution**:
  - Return user-friendly error message
  - Check if username exists before attempting insert
  - Implement proper error handling for unique constraint violations

#### 6. **Tokens expire too quickly**
- **Cause**: Token expiration set to 24 hours
- **Solution**:
  - Adjust expiration time in `GenerateToken()` function
  - Implement token refresh mechanism
  - Consider longer-lived refresh tokens

---

## Security Best Practices

### Production Recommendations

1. **JWT Secret**:
   - Use a cryptographically secure random string (minimum 256 bits)
   - Store in environment variables or secrets management system
   - Rotate regularly (requires re-authentication of all users)

2. **Password Policy**:
   - Enforce minimum length (8+ characters)
   - Require mix of uppercase, lowercase, numbers, symbols
   - Implement rate limiting on login endpoint
   - Add account lockout after failed attempts

3. **Cookie Configuration**:
   - Always set `Secure: true` in production (HTTPS only)
   - Use `SameSite: Strict` for maximum CSRF protection
   - Consider shorter `MaxAge` for sensitive applications

4. **Database**:
   - Use connection pooling for better performance
   - Enable SSL/TLS for database connections
   - Limit database user permissions (no DROP TABLE)

5. **Monitoring**:
   - Log all authentication attempts (success and failure)
   - Set up alerts for suspicious patterns (multiple failed logins)
   - Monitor token generation rates

6. **Token Expiration**:
   - Implement token refresh mechanism
   - Use shorter expiration for sensitive operations
   - Consider implementing token revocation list

### OWASP Top 10 Mitigations

| Vulnerability | Mitigation |
|---------------|------------|
| **A01: Broken Access Control** | JWT-based authentication with user ID claims |
| **A02: Cryptographic Failures** | Bcrypt password hashing, HTTPS-only cookies |
| **A03: Injection** | Parameterized SQL queries (prepared statements) |
| **A05: Security Misconfiguration** | Environment-based configuration, secure defaults |
| **A07: Identification/Auth Failures** | Strong password hashing, JWT tokens, HttpOnly cookies |

---

## Performance Considerations

### Connection Pooling

Add connection pooling configuration:
```go
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(5 * time.Minute)
```

### Rate Limiting

Implement rate limiting to prevent brute-force attacks:
```go
// Example using github.com/ulule/limiter
import "github.com/ulule/limiter/v3"

rate := limiter.Rate{
    Period: 1 * time.Minute,
    Limit:  5, // 5 login attempts per minute
}
```

---

### Service Dependencies

```
authorization
└── PostgreSQL (user authentication)
```

### Port Allocation
- **8083**: Authorization service HTTP API
- **5432**: PostgreSQL

---

**Last Updated**: February 1, 2026  
**Version**: 1.0.0
