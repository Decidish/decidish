from pydantic import BaseModel, Field, ConfigDict
from typing import List

class Nutrients(BaseModel):
    serving_size: str = Field(alias="servingSize")
    calories: str

class Recipe(BaseModel):
    category: str
    cook_time: int
    description: str
    image: str
    ingredients: List[str]
    instructions: str
    keywords: List[str]
    nutrients: Nutrients
    
    prep_time: int
    ratings: float
    total_time: int
    title: str
    yields: str

    model_config = ConfigDict(populate_by_name=True)