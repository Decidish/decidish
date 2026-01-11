from typing import List

from pydantic import BaseModel

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