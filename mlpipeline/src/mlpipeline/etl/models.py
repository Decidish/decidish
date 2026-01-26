from pydantic import BaseModel, Field, ConfigDict
from typing import Generic, List, TypeVar

T = TypeVar('T')

class Nutrients(BaseModel):
    serving_size: str | None = Field(default=None, alias="servingSize")
    calories: str | None = Field(default=None, alias="calories")
    carbohydrate_content: str | None = Field(default=None, alias="carbohydrateContent")
    cholesterol_content: str | None = Field(default=None, alias="cholesterolContent")
    fiber_content: str | None = Field(default=None, alias="fiberContent")
    protein_content: str | None = Field(default=None, alias="proteinContent")
    saturated_fat_content: str | None = Field(default=None, alias="saturatedFatContent")
    sodium_content: str | None = Field(default=None, alias="sodiumContent")
    sugar_content: str | None = Field(default=None, alias="sugarContent")
    fat_content: str | None = Field(default=None, alias="fatContent")
    unsaturated_fat_content: str | None = Field(default=None, alias="unsaturatedFatContent")
    
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
    cuisine: str | None = None
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