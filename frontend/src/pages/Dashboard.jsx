import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, UtensilsCrossed, Lightbulb, ChevronRight, Camera, Mic } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDashboard, useSuggestions } from '../hooks/useNutrition'
import { ProgressBar, MacroRing } from '../components/NutritionCard'
import MealCard from '../components/MealCard'
import WaterTracker from '../components/WaterTracker'

export default function Dashboard() {
  const { user } = useAuth()
  const { dashboard, loading, refresh } = useDashboard()
  const { suggestions, refresh: refreshSuggestions } = useSuggestions()
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    refresh()
  }, [refresh])

  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  const d = dashboard
  const hasData = d?.meals?.length > 0
  const caloriesPct = hasData ? Math.min((d.total_calories / d.calorie_target) * 100, 100) : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hey, {name} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Onboarding banner — shown only when no meals logged today */}
      {d && !hasData && (
        <div className="card border-2 border-dashed border-brand-200 bg-brand-50/50 text-center py-10 space-y-4">
          <div className="text-6xl">🥗</div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Log your first meal to see your stats</h2>
            <p className="text-sm text-gray-500 mt-1">Your calorie progress, macros, and trends will appear here.</p>
          </div>
          <Link
            to="/log"
            className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3"
          >
            <UtensilsCrossed className="w-5 h-5" />
            Log a Meal
          </Link>
          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Snap a photo</span>
            <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> Speak it</span>
            <span className="flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" /> Type it</span>
          </div>
        </div>
      )}

      {/* Calorie hero */}
      {hasData && (
        <div className="card bg-gradient-to-br from-brand-500 to-brand-600 text-white border-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-brand-100 text-sm font-medium">Calories Today</p>
              <p className="text-4xl font-bold mt-1">{Math.round(d.total_calories)}</p>
              <p className="text-brand-200 text-sm">of {d.calorie_target} kcal</p>
            </div>
            <div className="text-right">
              <p className="text-brand-100 text-sm">Remaining</p>
              <p className="text-3xl font-bold mt-1">
                {Math.max(0, d.calorie_target - Math.round(d.total_calories))}
              </p>
              <p className="text-brand-200 text-sm">kcal</p>
            </div>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${caloriesPct}%` }}
            />
          </div>
          <p className="text-brand-100 text-xs mt-2">{Math.round(caloriesPct)}% of daily goal</p>
        </div>
      )}

      {/* Macros */}
      {hasData && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Macros</h2>
          <div className="flex items-center justify-around">
            <MacroRing label="Protein" current={d.total_protein} target={d.protein_target} color="#3b82f6" />
            <MacroRing label="Carbs" current={d.total_carbs} target={d.carbs_target} color="#8b5cf6" />
            <MacroRing label="Fat" current={d.total_fat} target={d.fat_target} color="#ef4444" />
          </div>
        </div>
      )}

      {/* Water */}
      {d && (
        <WaterTracker
          current={d.water_intake}
          target={d.water_target}
          onLogged={refresh}
        />
      )}

      {/* AI Suggestions */}
      <div className="card">
        <button
          onClick={() => {
            setShowSuggestions(!showSuggestions)
            if (!suggestions) refreshSuggestions()
          }}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-gray-900">AI Suggestions</span>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showSuggestions ? 'rotate-90' : ''}`} />
        </button>

        {showSuggestions && suggestions && (
          <div className="mt-4 space-y-3">
            {d && d.total_protein < d.protein_target && (
              <div className="bg-blue-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-blue-800">Protein gap: {Math.round(suggestions.protein_gap)}g remaining</p>
                <p className="text-blue-600 text-xs mt-0.5">{suggestions.motivational_tip}</p>
              </div>
            )}
            {suggestions.suggestions?.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="text-2xl">{i === 0 ? '🍗' : i === 1 ? '🥚' : '🥛'}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{s.food_name}</p>
                  <p className="text-xs text-gray-500">{s.portion} · {Math.round(s.calories)} kcal · {Math.round(s.protein)}g protein</p>
                  <p className="text-xs text-brand-600 mt-0.5">{s.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's meals */}
      {d && d.meals.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Today's Meals</h2>
            <Link to="/log" className="text-xs text-brand-600 font-medium hover:text-brand-700">
              + Add more
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {d.meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onDeleted={refresh} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
