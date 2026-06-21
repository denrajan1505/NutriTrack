import { Trash2, Clock, Star } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { deleteMeal } from '../lib/api'

const MEAL_COLORS = {
  breakfast: 'bg-orange-50 text-orange-600',
  lunch: 'bg-green-50 text-green-600',
  dinner: 'bg-purple-50 text-purple-600',
  snack: 'bg-yellow-50 text-yellow-600',
  meal: 'bg-gray-50 text-gray-600',
  whatsapp: 'bg-green-50 text-green-600',
}

export default function MealCard({ meal, onDeleted }) {
  const handleDelete = async () => {
    try {
      await deleteMeal(meal.id)
      toast.success('Meal removed')
      onDeleted?.()
    } catch {
      toast.error('Failed to delete meal')
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
      {meal.image_url ? (
        <img src={meal.image_url} alt="Meal" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl">
          {meal.meal_type === 'breakfast' ? '🌅' : meal.meal_type === 'lunch' ? '☀️' : meal.meal_type === 'dinner' ? '🌙' : '🍎'}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 capitalize ${MEAL_COLORS[meal.meal_type] || MEAL_COLORS.meal}`}>
            {meal.meal_type}
          </span>
          {meal.meal_quality_score && (
            <span className="flex items-center gap-0.5 text-xs text-yellow-500 font-medium">
              <Star className="w-3 h-3 fill-current" />
              {meal.meal_quality_score}
            </span>
          )}
          <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />
            {format(new Date(meal.logged_at), 'h:mm a')}
          </span>
        </div>

        {meal.description && (
          <p className="text-sm text-gray-700 truncate mb-1.5">{meal.description}</p>
        )}

        {meal.food_items?.length > 0 && !meal.description && (
          <p className="text-sm text-gray-700 truncate mb-1.5">{meal.food_items.join(', ')}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="font-semibold text-gray-900">{Math.round(meal.calories)} kcal</span>
          <span>P: <strong>{Math.round(meal.protein)}g</strong></span>
          <span>C: <strong>{Math.round(meal.carbs)}g</strong></span>
          <span>F: <strong>{Math.round(meal.fat)}g</strong></span>
        </div>
      </div>

      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
