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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Image */}
        <div className="relative w-full h-48 sm:h-64">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors cursor-pointer z-10"
          >
            <i className="ri-close-line text-xl sm:text-2xl text-gray-900"></i>
          </button>
          <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6">
            <h2 className="text-xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 line-clamp-2">{recipe.title}</h2>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {recipe.keywords?.slice(0, 4).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Allergens */}
          {recipe.allergies && recipe.allergies.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <i className="ri-alert-line text-amber-600"></i>
                Allergens
              </h3>
              <div className="bg-amber-50 rounded-xl p-3 sm:p-4">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {recipe.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/90 text-amber-700 rounded-full text-xs sm:text-sm font-medium border border-amber-200"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-emerald-50 rounded-xl p-3 sm:p-4 text-center">
              <i className="ri-time-line text-xl sm:text-2xl text-[#2F855A] mb-1 sm:mb-2"></i>
              <div className="text-xs sm:text-sm text-gray-600">Prep</div>
              <div className="text-base sm:text-lg font-bold text-gray-900">
                {recipe.prep_time || 10}m
              </div>
            </div>
            <div className="bg-teal-50 rounded-xl p-3 sm:p-4 text-center">
              <i className="ri-fire-line text-xl sm:text-2xl text-teal-600 mb-1 sm:mb-2"></i>
              <div className="text-xs sm:text-sm text-gray-600">Cook</div>
              <div className="text-base sm:text-lg font-bold text-gray-900">
                {recipe.cook_time || recipe.total_time - (recipe.prep_time || 10)}m
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 sm:p-4 text-center">
              <i className="ri-restaurant-line text-xl sm:text-2xl text-green-600 mb-1 sm:mb-2"></i>
              <div className="text-xs sm:text-sm text-gray-600">Servings</div>
              <div className="text-base sm:text-lg font-bold text-gray-900">{recipe.yields}</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 sm:p-4 text-center">
              <i className="ri-flashlight-line text-xl sm:text-2xl text-amber-600 mb-1 sm:mb-2"></i>
              <div className="text-xs sm:text-sm text-gray-600">Calories</div>
              <div className="text-base sm:text-lg font-bold text-gray-900">{recipe.nutrients.calories}</div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">About</h3>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{recipe.description}</p>
          </div>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <i className="ri-shopping-basket-line text-[#2F855A]"></i>
                Ingredients
              </h3>
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div
                      key={`${ingredient}-${index}`}
                      className="flex items-center gap-2 sm:gap-3 bg-white rounded-lg p-2 sm:p-3 border border-gray-200"
                    >
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#2F855A] rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-xs sm:text-sm">{ingredient}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && recipe.instructions.trim() ? (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <i className="ri-list-ordered text-[#2F855A]"></i>
                Instructions
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {recipe.instructions.split("\n").filter(line => line.trim()).map((instruction, index) => (
                  <div key={index} className="flex gap-3 sm:gap-4">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-[#2F855A] text-white rounded-full font-bold text-xs sm:text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="flex-1 text-sm sm:text-base text-gray-700 leading-relaxed pt-0.5 sm:pt-1">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-safe">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer text-sm sm:text-base"
            >
              Close
            </button>
            {showAddToShoppingButton && onAddToShoppingList && (
              <button
                onClick={onAddToShoppingList}
                className="flex-1 py-3 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <i className="ri-shopping-cart-2-line text-lg sm:text-xl"></i>
                <span className="hidden xs:inline">Add to</span> <span>Cart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
