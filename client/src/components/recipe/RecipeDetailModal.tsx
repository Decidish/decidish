import { useEffect, useState } from 'react';
import { UIRecipe } from '@/types/recipe';
import { userHistoryApi } from '@/api/user-history/userHistoryApi';

interface RecipeDetailModalProps {
  recipe: UIRecipe | null;
  open: boolean;
  onClose: () => void;
  onAddToShoppingList?: () => void;
  showAddToShoppingButton?: boolean;
  onStatusChange?: (recipeId: number, status: 'liked' | 'disliked' | null) => void;
}

export default function RecipeDetailModal({
  recipe,
  open,
  onClose,
  onAddToShoppingList,
  showAddToShoppingButton = true,
  onStatusChange,
}: RecipeDetailModalProps) {
  if (!open || !recipe) return null;

  const [status, setStatus] = useState<'liked' | 'disliked' | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const history = await userHistoryApi.getUserHistory();
        const entry = history.find(h => (h.recipe?.id ?? h.recipe_id) === recipe.id);
        setStatus(entry ? (entry.action ? 'liked' : 'disliked') : null);
      } catch (err) {
        console.error('[RecipeDetailModal] Failed to load status', err);
      }
    };
    if (open && recipe?.id) {
      loadStatus();
    }
  }, [open, recipe?.id]);

  const handleLike = async (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (!recipe) return;
    if (status === 'liked') {
      try { await userHistoryApi.removeAction(recipe.id); } catch (err) { console.error('Failed to remove like', err); }
      setStatus(null);
      onStatusChange?.(recipe.id, null);
      return;
    }
    try { await userHistoryApi.recordAction('like', recipe.id); } catch (err) { console.error('Failed to record like', err); }
    setStatus('liked');
    onStatusChange?.(recipe.id, 'liked');
  };

  const handleDislike = async (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (!recipe) return;
    if (status === 'disliked') {
      try { await userHistoryApi.removeAction(recipe.id); } catch (err) { console.error('Failed to remove dislike', err); }
      setStatus(null);
      onStatusChange?.(recipe.id, null);
      return;
    }
    try { await userHistoryApi.recordAction('dislike', recipe.id); } catch (err) { console.error('Failed to record dislike', err); }
    setStatus('disliked');
    onStatusChange?.(recipe.id, 'disliked');
  };

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-2xl text-gray-900"></i>
          </button>
          {status === 'liked' && (
            <div className="absolute top-4 left-4 w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <i className="ri-heart-fill text-lg text-white"></i>
            </div>
          )}
          {status === 'disliked' && (
            <div className="absolute top-4 left-4 w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
              <i className="ri-thumb-down-fill text-lg text-white"></i>
            </div>
          )}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10 pointer-events-auto">
            <button
              onClick={handleDislike}
              className={`w-10 h-10 rounded-full transition-all flex items-center justify-center cursor-pointer text-lg shadow-sm border-2 ${
                status === 'disliked'
                  ? 'bg-gray-500 text-white border-gray-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
              aria-label="Dislike"
              title="Dislike"
            >
              <i className="ri-thumb-down-fill"></i>
            </button>
            <button
              onClick={handleLike}
              className={`w-10 h-10 rounded-full transition-all flex items-center justify-center cursor-pointer text-lg shadow-sm border-2 ${
                status === 'liked'
                  ? 'bg-[#2F855A] text-white border-emerald-700'
                  : 'bg-emerald-50 text-[#2F855A] border-emerald-200 hover:bg-emerald-100'
              }`}
              aria-label="Like"
              title="Like"
            >
              <i className="ri-heart-fill"></i>
            </button>
          </div>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <i className="ri-shopping-basket-line text-[#2F855A]"></i>
                  Ingredients
                </h3>
                {onAddToShoppingList && (
                  <button
                    onClick={onAddToShoppingList}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all text-sm whitespace-nowrap flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <i className="ri-search-line text-lg"></i>
                    <span>Search in my market</span>
                  </button>
                )}
              </div>
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

          {/* Action buttons (removed) */}
        </div>
      </div>
    </div>
  );
}
