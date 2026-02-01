# Decidish ML Pipeline

## Overview

The **Decidish ML Pipeline** is a sophisticated machine learning service that powers the personalized recipe recommendation system. It handles recipe data ingestion, natural language processing for ingredient parsing, embedding generation, and real-time user preference learning through neural network fine-tuning.

This service combines traditional NLP, transformer-based embeddings, and online learning techniques to deliver highly personalized recipe recommendations that adapt to user interactions in real-time.

**Core Capabilities**:
- Recipe scraping from REWE and custom URLs
- Intelligent ingredient parsing with unit normalization
- Neural embedding generation for recipes and users
- Real-time user preference adaptation (online learning)
- Weekly batch fine-tuning of adapter models
- Distributed training with PostgreSQL advisory locks

---

## Architecture

### Technology Stack

- **Language**: Python 3.12+
- **Framework**: FastAPI 0.128
- **ML Libraries**:
  - PyTorch 2.9+ (with CPU optimization)
  - Sentence Transformers 5.2
  - Transformers (via sentence-transformers)
- **NLP**: Ollama AsyncClient for LLM-based ingredient parsing
- **Database**: 
  - PostgreSQL (asyncpg, psycopg2-binary)
  - pgvector for embedding storage
- **Web Scraping**: recipe-scrapers 15.11
- **Package Manager**: UV (Fast Python package installer)
- **Server**: Uvicorn 0.40 (ASGI server)

### System Components

```
mlpipeline/
├── src/mlpipeline/
│   ├── app.py                        # FastAPI application entry point
│   ├── api/                          # API endpoints and request handling
│   │   ├── routes.py                 # REST API routes
│   │   ├── schemas.py                # Pydantic request/response models
│   │   └── tasks.py                  # Background task orchestration
│   ├── embedding/                    # Embedding generation and inference
│   │   ├── embedder.py               # Recipe text embedding (SentenceTransformer)
│   │   └── services.py               # Inference & Adapter training services
│   ├── pretrain/                     # Pre-trained model definitions
│   │   ├── model.py                  # UserEncoder & RecipeEncoder architectures
│   │   ├── train.py                  # Pre-training scripts
│   │   ├── dataloader.py             # Dataset loaders
│   │   ├── preference.py             # User preference vector handling
│   │   ├── get_user_encoder.py       # User encoder utilities
│   │   ├── get_recipe_encoder.py     # Recipe encoder utilities
│   │   └── checkpoints/              # Pre-trained model checkpoints
│   │       └── user_encoder.pt
│   ├── finetune/                     # Online learning and adaptation
│   │   ├── tune_user_embedding.py    # User embedding fine-tuning logic
│   │   ├── train_user_adapter.py     # Weekly adapter training
│   │   └── BCE_model.py              # Binary Cross-Entropy training utilities
│   ├── ingredient_parser/            # NLP ingredient extraction
│   │   ├── parser.py                 # Ingredient parsing orchestrator
│   │   ├── advanced_parser.py        # LLM-based ingredient extraction
│   │   └── unit_graph.py             # Unit conversion and normalization
│   ├── etl/                          # Extract, Transform, Load pipeline
│   │   ├── pipeline.py               # Recipe ingestion pipeline
│   │   └── models.py                 # Data models for ETL
│   ├── scraper/                      # Web scraping utilities
│   │   └── __init__.py
│   └── config/                       # Configuration management
│       └── app_config.py
├── scraper/                          # Standalone scraping scripts
│   └── script.py                     # REWE sitemap scraper
├── data/                             # Training data and embeddings
├── tests/                            # Unit and integration tests
├── ckpts_weekly_user_adapter/        # Adapter model checkpoints
│   └── last.pt                       # Latest adapter weights
├── pyproject.toml                    # Python dependencies (UV format)
├── Dockerfile                        # Multi-stage Docker build
└── README.md                         # This file
```

---

## Core Features

### 1. **Recipe Data Ingestion**

Automated scraping and processing of recipes from multiple sources.

#### Sources
- **REWE Recipes**: Bulk import from REWE sitemap
- **Custom URLs**: On-demand scraping from any supported recipe site

#### Scraping Features
- Multi-threaded scraping with configurable concurrency
- Intelligent rate limiting (1-3s per request)
- Resume capability (crash-safe JSONL storage)
- Support for 100+ recipe websites via `recipe-scrapers`

#### Sitemap Scraper

Located in `scraper/script.py`, processes REWE XML sitemaps:

**Configuration**:
```python
INPUT_FILE = "urlset_rewe.xml"
DB_FILE = "recipes_db.jsonl"
MAX_WORKERS = 5
MIN_SLEEP = 1.0
MAX_SLEEP = 3.0
```

**Features**:
- Parses XML sitemaps for recipe URLs
- Parallel downloads with ThreadPoolExecutor
- User-Agent spoofing to avoid 403 errors
- Crash recovery (resumes from last saved recipe)
- JSONL output format (1 recipe per line)

**Usage**:
```bash
cd scraper/
python script.py
```

**API Endpoint**:
```http
POST /recipes/add/rewe
Content-Type: application/json

{
  "job_id": 12345
}

Response: {"status": "Import started"}
```

---

### 2. **Intelligent Ingredient Parsing**

LLM-powered ingredient extraction with unit normalization.

#### NLP Pipeline

**Architecture**:
```
Raw Text → LLM Extraction → Unit Normalization → Database Storage
            (Ollama)           (Unit Graph)         (PostgreSQL)
```

**Example**:
```
Input:  "2 cups of flour"
Output: {
  "amount": 240,
  "unit": "g",
  "food": "flour",
  "original": "2 cups of flour",
  "info": null,
  "allergies": ["gluten"]
}
```

#### LLM-Based Extraction

Uses Ollama AsyncClient with custom prompts to parse:
- **Amount**: Numerical quantity
- **Unit**: Measurement unit (cups, tbsp, g, kg, etc.)
- **Food**: Ingredient name
- **Additional Info**: Preparation notes (e.g., "chopped", "diced")
- **Allergies**: Detected allergens

**Concurrency Control**:
- Semaphore-controlled parallel parsing
- Max 10 concurrent LLM requests
- Timeout: 30 seconds per request

#### Unit Normalization

**Unit Graph Database**:
- Stores conversion factors between units
- Handles food-specific conversions (e.g., 1 cup flour ≠ 1 cup sugar)
- Normalizes all units to grams for consistency

**Conversion Example**:
```python
process_product_data(2, "cups", "flour")
# Returns: {"normalized": 240, "unit": "g"}
```

**Supported Units**:
- Volume: ml, l, cups, tbsp, tsp, fl oz
- Weight: g, kg, oz, lb
- Pieces: stk (pieces), dozen, etc.

---

### 3. **Embedding Generation**

Neural embeddings for semantic similarity matching.

#### Recipe Embeddings

**Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Input**: Recipe title + description + ingredients
- **Output**: Normalized 384-dim vector

**Implementation** (`embedding/embedder.py`):
```python
class TextEmbedder:
    def __init__(self):
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    def embed_recipes(self, recipes: list[str]) -> np.ndarray:
        return self.model.encode(recipes)
```

**Storage**:
- Stored in PostgreSQL with `pgvector` extension
- Indexed for fast similarity search
- Used for recipe recommendations

#### User Embeddings

**Architecture**: Multi-layer perceptron (MLP) encoder

**UserEncoder** (`pretrain/model.py`):
```python
@dataclass
class UserEncoderConfig:
    user_input_dim: int = 35      # Preference vector dimensions
    hidden_dim: int = 512          # Hidden layer size
    output_dim = 384               # Embedding dimensions (matches recipes)
    num_layers: int = 2            # MLP depth
    dropout: float = 0.1           # Dropout rate
```

**Input**: 40-dimensional preference vector from questionnaire:
- Dietary preferences (vegan, gluten-free, etc.)
- Fitness goals (weight loss, muscle gain, etc.)
- Meal context (quick meals, party food, etc.)
- Cooking methods (grill, air fryer, etc.)

**Output**: 384-dimensional embedding in same space as recipes

**Pre-training**:
- Pre-trained on historical user interactions
- Checkpoint: `pretrain/checkpoints/user_encoder.pt`
- Frozen during inference, updated during fine-tuning

---

### 4. **Real-Time User Preference Learning**

Online learning system that adapts to user interactions in milliseconds.

#### Online Tuning Endpoint

**API Route**: `POST /tune`

**Request Schema**:
```json
{
  "user_emb": [0.12, 0.45, ..., 0.89],      // 384-dim user embedding
  "recipe_emb": [0.34, 0.21, ..., 0.67],     // 384-dim recipe embedding
  "like": 1,                                  // 1 = like, 0 = dislike
  
  "use_weekly_user_adapter": true,            // Use pre-trained adapter
  "do_online_bce": false,                     // Enable online BCE optimization
  
  "bce_steps": 5,                             // Gradient descent steps
  "bce_lr": 0.05,                             // Learning rate
  "bce_temperature": 0.07,                    // Contrastive temperature
  "bce_l2_anchor": 0.01,                      // L2 regularization to anchor
  "bce_clip_grad_norm": 5.0,                  // Gradient clipping
  "bce_pos_weight": null,                     // Weight for positive samples
  "max_batch_size": 512
}
```

**Response**:
```json
{
  "updated_user_emb": [[0.13, 0.46, ..., 0.88]],
  "model_info": {
    "adapter_version": "weekly_20260201_epoch1",
    "loss_main": 0.234,
    "loss_reg": 0.012,
    "cos_like_mean": 0.78,
    "cos_dislike_mean": 0.32
  }
}
```

#### Adaptation Strategies

**Strategy 1: Adapter-Based (Default)**
- Uses pre-trained `ResidualAdapter` model
- Fast inference (~10ms per update)
- Consistent across users
- Updated weekly via batch training

**Strategy 2: Online BCE Optimization**
- Per-user gradient descent optimization
- 5 steps of AdamW optimization
- Anchored to original embedding (L2 regularization)
- More personalized but slower (~50ms)

#### Adapter Architecture

**ResidualAdapter** (`finetune/tune_user_embedding.py`):
```python
class ResidualAdapter(nn.Module):
    def __init__(self, dim: int, hidden: int, dropout: float = 0.0):
        super().__init__()
        self.ln = nn.LayerNorm(dim)
        self.fc1 = nn.Linear(dim, hidden)  # 384 → 384
        self.fc2 = nn.Linear(hidden, dim)  # 384 → 384
        self.drop = nn.Dropout(dropout)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.ln(x)
        h = self.fc1(h)
        h = F.gelu(h)
        h = self.drop(h)
        h = self.fc2(h)
        return x + h  # Residual connection
```

**Key Features**:
- **Residual Connection**: Preserves original embedding while adding refinement
- **Layer Normalization**: Stabilizes training
- **GELU Activation**: Smooth non-linearity
- **Dropout**: Regularization (disabled during inference)

#### Loss Function

**Contrastive Learning with Binary Cross-Entropy**:
```python
def compute_loss(user_emb, recipe_emb, like, temperature=0.07):
    # Normalize embeddings
    u = F.normalize(user_emb, dim=-1)
    r = F.normalize(recipe_emb, dim=-1)
    
    # Cosine similarity
    logits = (u * r).sum(dim=-1) / temperature
    
    # Binary cross-entropy
    loss = F.binary_cross_entropy_with_logits(logits, like.float())
    
    return loss
```

**Temperature**: Controls sharpness of similarity distribution
- Lower temperature (0.07) → More discriminative
- Higher temperature → Softer similarities

**Regularization**:
- **L2 Anchor**: Keeps updated embedding close to original
- **Gradient Clipping**: Prevents exploding gradients

---

### 5. **Weekly Batch Fine-Tuning**

Distributed training system for updating the global adapter model.

#### Training Endpoint

**API Route**: `POST /finetune_user_adapter`

**Request Schema**:
```json
{
  "epochs": 1,
  "val_split": 0.1,
  "max_batch_size": 2048,
  "lr_user": 0.001,
  "weight_decay": 0.0,
  "clip_grad_norm": 5.0,
  "pos_weight": null,
  "tag": "weekly_batch_20260201",
  "save_best_as_last": true
}
```

**Response**:
```json
{
  "updated_count": 15234,
  "train_metrics": {
    "loss": 0.234,
    "accuracy": 0.87,
    "auc": 0.91
  },
  "val_metrics": {
    "loss": 0.256,
    "accuracy": 0.85,
    "auc": 0.89
  },
  "model_info": {
    "adapter_version": "weekly_batch_20260201_epoch1",
    "checkpoint_path": "ckpts_weekly_user_adapter/last.pt"
  }
}
```

#### Distributed Training Lock

**Problem**: Multiple replicas in Kubernetes attempting to train simultaneously

**Solution**: PostgreSQL Advisory Locks

**Implementation** (`embedding/services.py`):
```python
class PostgresDistributedLock:
    def __init__(self, db_url: str, lock_name: str):
        self.db_url = db_url
        # Convert string to 64-bit integer for Postgres
        self.lock_id = struct.unpack("q", 
            hashlib.sha256(lock_name.encode()).digest()[:8])[0]
    
    def __enter__(self):
        self.conn = psycopg2.connect(self.db_url)
        self.conn.autocommit = True
        with self.conn.cursor() as cur:
            # Blocks until lock is available
            cur.execute("SELECT pg_advisory_lock(%s)", (self.lock_id,))
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        with self.conn.cursor() as cur:
            cur.execute("SELECT pg_advisory_unlock(%s)", (self.lock_id,))
        self.conn.close()
```

**Usage**:
```python
with PostgresDistributedLock(db_url, "adapter_training"):
    # Only one replica executes this block
    train_adapter_model()
```

**Benefits**:
- Automatic lock release on pod crash (connection dies)
- No external coordination service needed
- Built-in timeout support
- Works across K8s replicas

#### Training Data Pipeline

**Data Source**: User interaction history from PostgreSQL

**Query**:
```sql
SELECT 
    user_id,
    user_embedding,
    recipe_embedding,
    interaction_type  -- 'like' or 'dislike'
FROM user_history
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
```

**Batch Processing**:
1. Fetch all interactions from past week
2. Split into train/validation (90/10 default)
3. Create batches of size 2048
4. Train adapter for N epochs
5. Validate on held-out data
6. Save best checkpoint as `last.pt`

**Checkpoint Versioning**:
- Checkpoints saved to `ckpts_weekly_user_adapter/`
- Filename: `weekly_batch_{timestamp}_epoch{n}.pt`
- `last.pt` symlinked to best checkpoint
- Model cache automatically reloads on file change

---

### 6. **Model Cache & Hot Reloading**

Automatic model reloading without service restart.

#### ModelCache Implementation

**Features**:
- Lazy loading (loads on first request)
- File change detection via `mtime`
- Hot reload without downtime
- Thread-safe model access

**Code** (`finetune/tune_user_embedding.py`):
```python
class ModelCache:
    def __init__(self, cfg: CoreCfg):
        self.cfg = cfg
        self._model: Optional[UserAdapterOnly] = None
        self._ckpt_path: Optional[str] = None
        self._ckpt_mtime: Optional[float] = None
    
    def get(self, reload_if_changed: bool = True) -> Tuple[UserAdapterOnly, Dict]:
        latest = _latest_ckpt_path(self.cfg.ckpt_dir)
        latest_mtime = os.path.getmtime(latest) if latest else None
        
        # Reload if checkpoint changed
        if (latest != self._ckpt_path) or (latest_mtime != self._ckpt_mtime):
            logger.info(f"Loading new checkpoint: {latest}")
            self._model = load_adapter_model(latest)
            self._ckpt_path = latest
            self._ckpt_mtime = latest_mtime
        
        return self._model, {"checkpoint": self._ckpt_path}
```

**Reload Triggers**:
1. First request (lazy initialization)
2. Checkpoint file modified
3. New checkpoint created
4. `last.pt` symlink updated

**Benefits**:
- Zero-downtime model updates
- No service restart required
- Automatic deployment in K8s
- Consistent across replicas

---

### 7. **Batch User Encoding**

Stateless inference endpoint for encoding user preference vectors.

#### Endpoint

**API Route**: `POST /encode_users_batch`

**Request**:
```json
{
  "users": [
    {
      "user_id": "user_123",
      "user_vector": [0.1, 0.2, ..., 0.9]  // 35 dimensions
    },
    {
      "user_id": "user_456",
      "user_vector": [0.3, 0.4, ..., 0.8]
    }
  ]
}
```

**Response**:
```json
{
  "users": [
    {
      "user_id": "user_123",
      "user_embedding": [0.12, 0.34, ..., 0.56]  // 384 dimensions
    },
    {
      "user_id": "user_456",
      "user_embedding": [0.23, 0.45, ..., 0.67]
    }
  ],
  "embedding_dim": 384
}
```

#### Use Cases
- Initial user embedding generation after questionnaire
- Batch re-encoding after preference updates
- Migrating users to new model version

---

## API Documentation

### Base URL

```
Production: https://ml.decidish.win
Development: http://localhost:8000
```

### Endpoints Summary

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/health` | GET | Health check and model version | No |
| `/recipes/add` | POST | Add single recipe from URL | Yes |
| `/recipes/add/rewe` | POST | Bulk import REWE recipes | Yes |
| `/encode_users_batch` | POST | Batch user vector encoding | Yes |
| `/tune` | POST | Online user embedding tuning | Yes |
| `/finetune_user_adapter` | POST | Weekly batch adapter training | Yes |

### Detailed API Specifications

#### 1. Health Check

```http
GET /health

Response:
{
  "status": "ok",
  "adapter_version": "weekly_20260201_epoch1",
  "checkpoint_path": "ckpts_weekly_user_adapter/last.pt",
  "checkpoint_mtime": 1738425600.0,
  "device": "cpu"
}
```

#### 2. Add Single Recipe

```http
POST /recipes/add
Content-Type: application/json

{
  "recipe_url": "https://www.rewe.de/rezepte/pizza-margherita/",
  "job_id": 12345
}

Response:
{
  "status": "Recipe addition started"
}
```

**Background Process**:
1. Scrape recipe HTML
2. Extract structured data (title, ingredients, instructions)
3. Parse ingredients with NLP
4. Generate recipe embedding
5. Store in database
6. Update job status

#### 3. Bulk REWE Import

```http
POST /recipes/add/rewe
Content-Type: application/json

{
  "job_id": 67890
}

Response:
{
  "status": "Import started"
}
```

**ETL Pipeline**:
1. Load recipe URLs from configuration
2. Parallel scraping with rate limiting
3. Batch ingredient parsing
4. Bulk embedding generation
5. Batch database insertion
6. Update job progress

#### 4. Encode Users Batch

```http
POST /encode_users_batch
Content-Type: application/json

{
  "users": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_vector": [0.1, 0.2, 0.0, 0.8, ..., 0.5]  // 35 values
    }
  ]
}

Response:
{
  "users": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_embedding": [0.123, 0.456, ..., 0.789]  // 384 values
    }
  ],
  "embedding_dim": 384
}
```

**Validation**:
- `user_vector` must be exactly 35 dimensions
- All values should be floats in range [0, 1]
- Batch size limit: 512 users

#### 5. Online Tuning

```http
POST /tune
Content-Type: application/json

{
  "user_emb": [0.12, 0.34, ..., 0.56],          // 384-dim
  "recipe_emb": [0.23, 0.45, ..., 0.67],        // 384-dim
  "like": 1,                                     // 0 or 1
  "use_weekly_user_adapter": true,
  "do_online_bce": false,
  "bce_steps": 5,
  "bce_lr": 0.05,
  "bce_temperature": 0.07,
  "bce_l2_anchor": 0.01,
  "bce_clip_grad_norm": 5.0,
  "bce_pos_weight": null,
  "max_batch_size": 512
}

Response:
{
  "updated_user_emb": [[0.13, 0.35, ..., 0.57]],
  "model_info": {
    "adapter_version": "weekly_20260201_epoch1",
    "adapter_checkpoint": "ckpts_weekly_user_adapter/last.pt",
    "loss_main": 0.234,
    "loss_reg": 0.012,
    "loss_total": 0.246,
    "cos_like_mean": 0.78,
    "cos_dislike_mean": 0.32
  }
}
```

**Processing Time**:
- Adapter-based: ~10ms
- Online BCE: ~50ms (5 steps)

#### 6. Fine-Tune Adapter

```http
POST /finetune_user_adapter
Content-Type: application/json

{
  "epochs": 1,
  "val_split": 0.1,
  "max_batch_size": 2048,
  "lr_user": 0.001,
  "weight_decay": 0.0,
  "clip_grad_norm": 5.0,
  "pos_weight": 2.0,
  "tag": "weekly_batch_20260201",
  "save_best_as_last": true
}

Response:
{
  "updated_count": 15234,
  "train_metrics": {
    "loss": 0.234,
    "accuracy": 0.87,
    "auc_roc": 0.91,
    "precision": 0.85,
    "recall": 0.89
  },
  "val_metrics": {
    "loss": 0.256,
    "accuracy": 0.85,
    "auc_roc": 0.89,
    "precision": 0.83,
    "recall": 0.87
  },
  "model_info": {
    "adapter_version": "weekly_batch_20260201_epoch1",
    "checkpoint_path": "ckpts_weekly_user_adapter/last.pt",
    "training_duration_seconds": 1234.56,
    "samples_per_second": 12.34
  }
}
```

**Processing Time**: 10-30 minutes (depends on data size)

**Locking Behavior**:
- If another replica is training, this request **blocks**
- Maximum wait time: 60 minutes (configurable)
- Returns 503 if lock cannot be acquired

---

## Database Schema

### Recipe Embeddings Table

```sql
CREATE TABLE recipe_embeddings (
    recipe_id INTEGER PRIMARY KEY REFERENCES recipes(id),
    embedding VECTOR(384) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipe_embeddings_vector 
ON recipe_embeddings 
USING ivfflat (embedding vector_cosine_ops);
```

### User Embeddings Table

```sql
CREATE TABLE user_embeddings (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    embedding VECTOR(384) NOT NULL,
    preference_vector FLOAT[] NOT NULL,  -- Original 35-dim vector
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_embeddings_vector 
ON user_embeddings 
USING ivfflat (embedding vector_cosine_ops);
```

### User History Table

```sql
CREATE TABLE user_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    recipe_id INTEGER REFERENCES recipes(id),
    interaction_type VARCHAR(20) NOT NULL,  -- 'like', 'dislike', 'view'
    user_embedding VECTOR(384),
    recipe_embedding VECTOR(384),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_history_user_id ON user_history(user_id);
CREATE INDEX idx_user_history_created_at ON user_history(created_at);
```

---

## Configuration

### Environment Variables

```bash
# Database Configuration
DB_NAME=decidish_db
DB_USER=decidish_user
DB_PASSWORD=secure_password
DB_HOST=postgres.decidish.win
DB_PORT=5432

# Ollama Configuration (for ingredient parsing)
OLLAMA_HOST=https://ollama.decidish.win

# Model Configuration
EMB_DIM=384
ADAPTER_CKPT_DIR=./ckpts_weekly_user_adapter

# Performance Tuning
MAX_CONCURRENT_REQUESTS=10
TORCH_NUM_THREADS=4

# PyTorch CPU Optimization
OMP_NUM_THREADS=4
MKL_NUM_THREADS=4
```

### Application Config

**File**: `src/mlpipeline/config/app_config.py`

```python
class AppConfig:
    def __init__(self):
        self.db_name = os.getenv("DB_NAME")
        self.db_user = os.getenv("DB_USER")
        self.db_password = os.getenv("DB_PASSWORD")
        self.db_host = os.getenv("DB_HOST")
        self.db_port = os.getenv("DB_PORT", "5432")
        
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.max_concurrent = int(os.getenv("MAX_CONCURRENT_REQUESTS", "10"))
        
    @property
    def db_connection_string(self):
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
```

---

## Running the Service

### Prerequisites

- **Python**: 3.12 or 3.13
- **UV Package Manager**: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **PostgreSQL**: 14+ with `pgvector` extension
- **Ollama**: Running instance for ingredient parsing

### Local Development

#### 1. Install Dependencies

```bash
cd mlpipeline

# Install UV (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync
```

#### 2. Configure Environment

```bash
# Create .env file
cat > .env << EOF
DB_NAME=decidish_db
DB_USER=decidish_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
OLLAMA_HOST=http://localhost:11434
EMB_DIM=384
ADAPTER_CKPT_DIR=./ckpts_weekly_user_adapter
EOF
```

#### 3. Download Pre-trained Models

```bash
# Ensure pre-trained user encoder exists
mkdir -p src/mlpipeline/pretrain/checkpoints/

# Download or train user encoder
# (Instructions for training: see Pre-training section below)

# Ensure adapter checkpoint directory exists
mkdir -p ckpts_weekly_user_adapter
```

#### 4. Start Service

```bash
# With UV
uv run python -m mlpipeline.app

# Or activate virtual environment
source .venv/bin/activate
python -m mlpipeline.app
```

Service starts on `http://0.0.0.0:8000`

#### 5. Test API

```bash
# Health check
curl http://localhost:8000/health

# Encode user batch
curl -X POST http://localhost:8000/encode_users_batch \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {
        "user_id": "test_user",
        "user_vector": [0.1, 0.2, 0.3, ..., 0.9]
      }
    ]
  }'
```

---

## Docker Deployment

### Dockerfile

**Multi-stage build** for optimal image size:

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install UV package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install dependencies (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# Copy application code
COPY . .
RUN uv sync --frozen

EXPOSE 8000

ENV PYTHONPATH=src

# Run with UV
CMD ["uv", "run", "python", "-m", "mlpipeline.app"]
```

### Build Image

```bash
docker build -t decidish-mlpipeline:latest .
```

### Run Container

```bash
docker run -d \
  --name mlpipeline \
  -p 8000:8000 \
  -e DB_NAME=decidish_db \
  -e DB_USER=decidish_user \
  -e DB_PASSWORD=secure_password \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e OLLAMA_HOST=http://ollama:11434 \
  -v $(pwd)/ckpts_weekly_user_adapter:/app/ckpts_weekly_user_adapter \
  decidish-mlpipeline:latest
```

### Docker Compose

```yaml
services:
  mlpipeline:
    build:
      context: ./mlpipeline
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DB_NAME=decidish_db
      - DB_USER=decidish_user
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_HOST=postgres
      - DB_PORT=5432
      - OLLAMA_HOST=http://ollama:11434
      - EMB_DIM=384
    volumes:
      - ./ckpts_weekly_user_adapter:/app/ckpts_weekly_user_adapter
    depends_on:
      - postgres
      - ollama
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Pre-training Models

### Training User Encoder

**Script**: `src/mlpipeline/pretrain/train.py`

**Data Requirements**:
- Historical user preference vectors (35-dim)
- Historical user interactions (likes/dislikes)
- Recipe embeddings (384-dim)

**Training Command**:
```bash
uv run python -m mlpipeline.pretrain.train \
  --data-path data/user_interactions.csv \
  --epochs 10 \
  --batch-size 128 \
  --lr 0.001 \
  --output-dir src/mlpipeline/pretrain/checkpoints/
```

**Output**: `user_encoder.pt`

### Training Recipe Encoder

**Script**: `src/mlpipeline/pretrain/get_recipe_encoder.py`

**Pre-trained Base**: Uses `sentence-transformers/all-MiniLM-L6-v2`

**Fine-tuning** (optional):
```bash
uv run python -m mlpipeline.pretrain.get_recipe_encoder \
  --recipe-data data/recipes.jsonl \
  --finetune \
  --epochs 5 \
  --output-dir src/mlpipeline/pretrain/checkpoints/
```

---

## Testing

### Unit Tests

**Framework**: pytest

**Run Tests**:
```bash
# All tests
uv run pytest

# Specific test file
uv run pytest tests/test_embedder.py

# With coverage
uv run pytest --cov=mlpipeline --cov-report=html
```

### Integration Tests

**Requirements**:
- Running PostgreSQL instance
- Test database

**Setup Test DB**:
```bash
psql -U postgres -c "CREATE DATABASE decidish_test;"
psql -U postgres -d decidish_test -c "CREATE EXTENSION vector;"
```

**Run Integration Tests**:
```bash
export DB_NAME=decidish_test
uv run pytest tests/integration/
```

### API Tests

**Manual Testing with cURL**:

```bash
# Health check
curl http://localhost:8000/health

# Encode users
curl -X POST http://localhost:8000/encode_users_batch \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/users_batch.json

# Tune embedding
curl -X POST http://localhost:8000/tune \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/tune_request.json
```

---

## Performance Optimization

### PyTorch CPU Optimization

**Configuration**:
```bash
# Limit thread pool size
export OMP_NUM_THREADS=4
export MKL_NUM_THREADS=4
export TORCH_NUM_THREADS=4

# Use CPU-optimized PyTorch
# (Installed via pyproject.toml with pytorch-cpu index)
```

### Database Connection Pooling

**asyncpg** connection pool:
```python
import asyncpg

pool = await asyncpg.create_pool(
    dsn=db_connection_string,
    min_size=5,
    max_size=20,
    command_timeout=60
)
```

### Caching Strategies

1. **Model Checkpoints**: Loaded once, cached in memory
2. **User Encodings**: Stored in database, cached in Redis (future)
3. **Recipe Embeddings**: Pre-computed, indexed in pgvector

### Batch Processing

- **User Encoding**: Process up to 512 users per request
- **Recipe Embedding**: Batch size 64 for SentenceTransformer
- **Ingredient Parsing**: 10 concurrent LLM requests

---

## Monitoring & Logging

### Logging Configuration

```python
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("mlpipeline.log")
    ]
)
```

### Key Metrics

**Latency**:
- `/tune` endpoint: p50 < 20ms, p99 < 100ms
- `/encode_users_batch`: p50 < 50ms, p99 < 200ms
- `/finetune_user_adapter`: 10-30 minutes

**Throughput**:
- User encoding: 100 users/second
- Online tuning: 50 requests/second
- Recipe embedding: 10 recipes/second

**Model Metrics**:
- Adapter training loss: < 0.3
- Validation accuracy: > 85%
- Cosine similarity (liked recipes): > 0.7

---

## Troubleshooting

### Common Issues

#### 1. **"Checkpoint not found" error**

**Symptom**: `FileNotFoundError: user_encoder.pt not found`

**Solution**:
```bash
# Ensure pre-trained model exists
ls src/mlpipeline/pretrain/checkpoints/user_encoder.pt

# Or train new model
uv run python -m mlpipeline.pretrain.train
```

#### 2. **Ollama connection timeout**

**Symptom**: `TimeoutError: Ollama request timed out`

**Solution**:
```bash
# Check Ollama service status
curl http://localhost:11434/api/tags

# Restart Ollama
docker restart ollama

# Increase timeout in code
client = AsyncClient(host=OLLAMA_HOST, timeout=60.0)
```

#### 3. **PostgreSQL advisory lock stuck**

**Symptom**: `/finetune_user_adapter` hangs indefinitely

**Solution**:
```sql
-- Check active locks
SELECT * FROM pg_locks WHERE locktype = 'advisory';

-- Force release (if needed)
SELECT pg_advisory_unlock_all();
```

#### 4. **Out of memory during training**

**Symptom**: `RuntimeError: CUDA out of memory` or `MemoryError`

**Solution**:
```bash
# Reduce batch size
curl -X POST /finetune_user_adapter \
  -d '{"max_batch_size": 512, ...}'

# Use CPU instead of GPU
export CUDA_VISIBLE_DEVICES=""

# Increase Docker memory limit
docker update --memory 8g mlpipeline
```

#### 5. **Slow embedding generation**

**Symptom**: Embedding endpoints taking > 1 second

**Solution**:
```bash
# Use CPU-optimized PyTorch
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Limit thread count
export OMP_NUM_THREADS=4

# Enable model quantization (future improvement)
```

#### 6. **Recipe scraping failures**

**Symptom**: `403 Forbidden` or `ConnectionError`

**Solution**:
- Increase delay between requests (MIN_SLEEP, MAX_SLEEP)
- Rotate User-Agent headers
- Check if site blocks scraping (robots.txt)
- Use proxy service (if necessary)

---

## Architecture Decisions

### Why PyTorch over TensorFlow?

- **Pythonic API**: More intuitive for research and prototyping
- **Dynamic Computation Graph**: Easier debugging
- **Strong Community**: Excellent transformer libraries
- **Production Ready**: TorchServe for deployment

### Why Sentence Transformers?

- **Pre-trained Models**: State-of-the-art embeddings out-of-the-box
- **Efficient**: Optimized for semantic search
- **Easy Fine-Tuning**: Simple API for domain adaptation
- **pgvector Integration**: Seamless vector database integration

### Why Adapter-Based Fine-Tuning?

- **Parameter Efficiency**: Only tune 1-2% of parameters
- **Fast Training**: Converges in minutes, not hours
- **Preserve Pre-training**: Keeps general knowledge
- **Easy Rollback**: Revert to base model if needed

### Why PostgreSQL Advisory Locks?

- **Built-in**: No external service (Redis, Zookeeper)
- **Automatic Release**: Lock freed on connection drop
- **Transactional**: Works with database transactions
- **Simple**: Single SQL call to acquire/release

---

## Appendix

### Useful Commands

```bash
# Install dependencies
uv sync

# Run service
uv run python -m mlpipeline.app

# Run tests
uv run pytest

# Run scraper
cd scraper && python script.py

# Train user encoder
uv run python -m mlpipeline.pretrain.train

# Fine-tune adapter
curl -X POST http://localhost:8000/finetune_user_adapter \
  -H "Content-Type: application/json" \
  -d '{"epochs": 1, "val_split": 0.1}'

# Check model cache
ls -lh ckpts_weekly_user_adapter/

# Monitor logs
tail -f mlpipeline.log

# Database connection test
psql postgresql://user:pass@host:5432/db -c "SELECT 1"
```

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_NAME` | PostgreSQL database name | - | Yes |
| `DB_USER` | Database user | - | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_HOST` | Database host | `localhost` | Yes |
| `DB_PORT` | Database port | `5432` | No |
| `OLLAMA_HOST` | Ollama API endpoint | `http://localhost:11434` | Yes |
| `EMB_DIM` | Embedding dimensions | `384` | No |
| `ADAPTER_CKPT_DIR` | Adapter checkpoint directory | `./ckpts_weekly_user_adapter` | No |
| `MAX_CONCURRENT_REQUESTS` | Max concurrent LLM requests | `10` | No |
| `OMP_NUM_THREADS` | OpenMP thread count | `4` | No |
| `MKL_NUM_THREADS` | MKL thread count | `4` | No |
| `TORCH_NUM_THREADS` | PyTorch thread count | `4` | No |

### Model Dimensions Reference

| Component | Input Dim | Hidden Dim | Output Dim |
|-----------|-----------|------------|------------|
| UserEncoder | 35 | 512 | 384 |
| RecipeEncoder | 384 | 512 | 384 |
| ResidualAdapter | 384 | 384 | 384 |
| SentenceTransformer | - | - | 384 |

### API Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input (wrong dimensions, etc.) |
| 404 | Not Found | Endpoint does not exist |
| 500 | Internal Server Error | Server-side error (model error, DB error) |
| 503 | Service Unavailable | Lock acquisition failed, system busy |

---

**Last Updated**: February 1, 2026  
**Version**: 1.0.0  
**Authors**: ML Team @ Decidish
