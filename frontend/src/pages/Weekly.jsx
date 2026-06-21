import { useEffect } from 'react'
import { Loader2, TrendingUp, Award, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useWeekly } from '../hooks/useNutrition'
import { format, parseISO } from 'date-fns'

function ScoreRing({ score }) {
  const r = 45
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  )
}

export default function Weekly() {
  const { summary, loading, refresh } = useWeekly()

  useEffect(() => { refresh() }, [refresh])

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (!summary) return null

  const chartData = [
    { name: 'Calories', value: Math.round(summary.avg_daily_calories), label: 'kcal' },
    { name: 'Protein', value: Math.round(summary.avg_daily_protein), label: 'g' },
    { name: 'Carbs', value: Math.round(summary.avg_daily_carbs), label: 'g' },
    { name: 'Fat', value: Math.round(summary.avg_daily_fat), label: 'g' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Weekly Report</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(parseISO(summary.week_start), 'MMM d')} – {format(parseISO(summary.week_end), 'MMM d, yyyy')}
        </p>
      </div>

      {/* Nutrition score */}
      <div className="card text-center">
        <h2 className="font-semibold text-gray-900 mb-5">Nutrition Score</h2>
        <ScoreRing score={summary.nutrition_score} />
        <div className="mt-5 grid grid-cols-3 gap-4 text-center pt-4 border-t border-gray-100">
          <div>
            <p className="text-2xl font-bold text-brand-600">{summary.protein_goal_met_days}/7</p>
            <p className="text-xs text-gray-500 mt-0.5">Protein Goal Days</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-500">{summary.calorie_goal_met_days}/7</p>
            <p className="text-xs text-gray-500 mt-0.5">Calorie Goal Days</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-500">{summary.total_meals_logged}</p>
            <p className="text-xs text-gray-500 mt-0.5">Meals Logged</p>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {summary.ai_summary && (
        <div className="card bg-gradient-to-br from-brand-50 to-white border-brand-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="font-semibold text-brand-900 text-sm mb-1">AI Nutritionist</p>
              <p className="text-sm text-gray-700 leading-relaxed">{summary.ai_summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Averages chart */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Daily Averages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-yellow-50 rounded-xl">
            <p className="text-xl font-bold text-yellow-600">{Math.round(summary.avg_daily_calories)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Avg Calories</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-xl font-bold text-blue-600">{Math.round(summary.avg_daily_protein)}g</p>
            <p className="text-xs text-gray-500 mt-0.5">Avg Protein</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-xl">
            <p className="text-xl font-bold text-purple-600">{Math.round(summary.avg_daily_carbs)}g</p>
            <p className="text-xs text-gray-500 mt-0.5">Avg Carbs</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-xl font-bold text-red-500">{Math.round(summary.avg_daily_fat)}g</p>
            <p className="text-xs text-gray-500 mt-0.5">Avg Fat</p>
          </div>
        </div>
      </div>

      {/* Goal streak */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-yellow-500" />
          <h2 className="font-semibold text-gray-900">Goal Consistency</h2>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-600">Protein Goal</span>
              <span className="font-semibold text-blue-600">{summary.protein_goal_met_days} / 7 days</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${(summary.protein_goal_met_days / 7) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-600">Calorie Goal</span>
              <span className="font-semibold text-orange-500">{summary.calorie_goal_met_days} / 7 days</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${(summary.calorie_goal_met_days / 7) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
