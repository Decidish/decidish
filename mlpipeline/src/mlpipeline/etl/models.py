from pydantic import BaseModel, Field, ConfigDict
from typing import Generic, List, TypeVar

T = TypeVar('T')

class Nutrients(BaseModel):
    serving_size: str = Field(alias="servingSize")
    calories: str

class Ingredient(BaseModel):
    original: str
    amount: float | None = None
    unit: str | None = None
    food: str | None = None
    info: str | None = None

class BaseRecipe(BaseModel, Generic[T]):
    category: str | None = None
    cook_time: int | None = None
    description: str
    image: str
    ingredients: List[T]
    instructions: str
    keywords: List[str] | None = None
    nutrients: Nutrients
    
    prep_time: int | None = None
    ratings: float | None = None
    total_time: int | None = None
    title: str
    yields: str

    model_config = ConfigDict(populate_by_name=True)


class ProcessedRecipe(BaseRecipe[Ingredient]):
    pass

class RawRecipe(BaseRecipe[str]):
    pass