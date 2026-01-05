from pydantic import BaseModel, Field, ConfigDict
from typing import List

class Nutrients(BaseModel):
    serving_size: str = Field(alias="servingSize")
    calories: str

class Recipe(BaseModel):
    category: str | None = None
    cook_time: int | None = None
    description: str
    image: str
    ingredients: List[str]
    instructions: str
    keywords: List[str] | None = None
    nutrients: Nutrients
    
    prep_time: int | None = None
    ratings: float | None = None
    total_time: int | None = None
    title: str
    yields: str

    model_config = ConfigDict(populate_by_name=True)