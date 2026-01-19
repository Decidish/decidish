from pydantic import BaseModel
from typing import List

class AddRecipeRequest(BaseModel):
    recipe_url: str
    job_id: int

class AddReweRecipesRequest(BaseModel):
    job_id: int

class UserItem(BaseModel):
    user_id: str
    user_vector: List[float]

class EncodeBatchRequest(BaseModel):
    users: List[UserItem]

class UserEmbeddingItem(BaseModel):
    user_id: str
    user_embedding: List[float]

class EncodeBatchResponse(BaseModel):
    users: List[UserEmbeddingItem]
    embedding_dim: int
