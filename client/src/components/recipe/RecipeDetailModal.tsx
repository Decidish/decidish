import { UIRecipe } from '@/types/recipe';

interface RecipeDetailModalProps {
  recipe: UIRecipe | null;
  open: boolean;
  onClose: () => void;
  onAddToShoppingList?: () => void;
  showAddToShoppingButton?: boolean;
}

export default function RecipeDetailModal({
  recipe,
  open,
  onClose,
  onAddToShoppingList,
  showAddToShoppingButton = true,
}: RecipeDetailModalProps) {
  if (!open || !recipe) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Image */}
        <div className="relative w-full h-64">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-2xl text-gray-900"></i>
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <h2 className="text-3xl font-bold text-white mb-3">{recipe.title}</h2>
            <div className="flex flex-wrap gap-2">
              {recipe.keywords?.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Allergens */}
          {recipe.allergies && recipe.allergies.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="ri-alert-line text-amber-600"></i>
                Allergens
              </h3>
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex flex-wrap gap-2">
                  {recipe.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white/90 text-amber-700 rounded-full text-sm font-medium border border-amber-200"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <i className="ri-time-line text-2xl text-[#2F855A] mb-2"></i>
              <div className="text-sm text-gray-600">Prep Time</div>
              <div className="text-lg font-bold text-gray-900">
                {recipe.prep_time || 10}m
              </div>
            </div>
            <div className="bg-teal-50 rounded-xl p-4 text-center">
              <i className="ri-fire-line text-2xl text-teal-600 mb-2"></i>
              <div className="text-sm text-gray-600">Cook Time</div>
              <div className="text-lg font-bold text-gray-900">
                {recipe.cook_time || recipe.total_time - (recipe.prep_time || 10)}m
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <i className="ri-restaurant-line text-2xl text-green-600 mb-2"></i>
              <div className="text-sm text-gray-600">Servings</div>
              <div className="text-lg font-bold text-gray-900">{recipe.yields}</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <i className="ri-flashlight-line text-2xl text-amber-600 mb-2"></i>
              <div className="text-sm text-gray-600">Calories</div>
              <div className="text-lg font-bold text-gray-900">{recipe.nutrients.calories}</div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">About This Recipe</h3>
            <p className="text-base text-gray-700 leading-relaxed">{recipe.description}</p>
          </div>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="ri-shopping-basket-line text-[#2F855A]"></i>
                Ingredients
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div
                      key={`${ingredient}-${index}`}
                      className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div className="w-2 h-2 bg-[#2F855A] rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">{ingredient}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-list-ordered text-[#2F855A]"></i>
              Instructions
            </h3>
            <div className="space-y-4">
              {recipe.instructions?.split("\n").map((instruction, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#2F855A] text-white rounded-full font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="flex-1 text-base text-gray-700 leading-relaxed pt-1">{instruction}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap"
            >
              Close
            </button>
            {showAddToShoppingButton && onAddToShoppingList && (
              <button
                onClick={onAddToShoppingList}
                className="flex-1 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
              >
                <i className="ri-shopping-cart-2-line text-xl"></i>
                <span>Add to Shopping List</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
