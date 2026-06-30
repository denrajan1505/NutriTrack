import { useEffect } from 'react'
import { Loader2, TrendingUp, Award, Flame, Droplets, Trophy, CheckCircle, XCircle, Download } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell,
} from 'recharts'
import { useWeekly } from '../hooks/useNutrition'
import { format, parseISO } from 'date-fns'

function scoreLabel(score) {
  if (score >= 80) return { text: 'Excellent', color: '#22c55e' }
  if (score >= 60) return { text: 'Good', color: '#84cc16' }
  if (score >= 40) return { text: 'Fair', color: '#f59e0b' }
  return { text: 'Poor', color: '#ef4444' }
}

function ScoreRing({ score, mealsLogged }) {
  const r = 45
  const circ = 2 * Math.PI * r
  const tooFew = mealsLogged < 3
  const displayScore = tooFew ? 0 : score
  const offset = circ - (displayScore / 100) * circ
  const { text, color } = scoreLabel(score)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={tooFew ? '#d1d5db' : color}
            strokeWidth="10" strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {tooFew ? <span className="text-2xl">📊</span> : (
            <>
              <span className="text-3xl font-bold text-gray-900">{score}</span>
              <span className="text-xs text-gray-400">/ 100</span>
            </>
          )}
        </div>
      </div>
      {!tooFew && (
        <span className="text-sm font-bold px-3 py-0.5 rounded-full" style={{ color, backgroundColor: `${color}18` }}>
          {text}
        </span>
      )}
    </div>
  )
}

const SCORE_ROWS = [
  { key: 'meal_logging',  label: 'Meal Logging',  max: 30, color: '#8b5cf6' },
  { key: 'calorie_goal',  label: 'Calorie Goal',  max: 20, color: '#f59e0b' },
  { key: 'protein_goal',  label: 'Protein Goal',  max: 20, color: '#3b82f6' },
  { key: 'water_intake',  label: 'Water Intake',  max: 15, color: '#06b6d4' },
  { key: 'food_variety',  label: 'Food Variety',  max: 15, color: '#22c55e' },
]

const MACRO_COLORS = ['#8b5cf6', '#3b82f6', '#ef4444']
const PIE_LABELS = ['Carbs', 'Protein', 'Fat']

const MEAL_TYPE_META = {
  breakfast: { emoji: '🌅', label: 'Breakfast', color: 'bg-yellow-50 text-yellow-700' },
  lunch:     { emoji: '☀️',  label: 'Lunch',     color: 'bg-orange-50 text-orange-700' },
  dinner:    { emoji: '🌙', label: 'Dinner',    color: 'bg-blue-50 text-blue-700'   },
  snack:     { emoji: '🍎', label: 'Snacks',    color: 'bg-green-50 text-green-700' },
}

function DayGoalDot({ met, hasData }) {
  if (!hasData) return <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">—</div>
  return met
    ? <CheckCircle className="w-5 h-5 text-green-500" />
    : <XCircle className="w-5 h-5 text-red-400" />
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

  const sb = summary.score_breakdown
  const dd = summary.daily_data ?? []

  // Macro pie data (only days with data)
  const totalMacros = summary.avg_daily_carbs + summary.avg_daily_protein + summary.avg_daily_fat
  const pieData = totalMacros > 0
    ? [
        { name: 'Carbs',   value: Math.round(summary.avg_daily_carbs / totalMacros * 100) },
        { name: 'Protein', value: Math.round(summary.avg_daily_protein / totalMacros * 100) },
        { name: 'Fat',     value: Math.round(summary.avg_daily_fat / totalMacros * 100) },
      ]
    : []

  const calTarget = summary.calorie_target

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(parseISO(summary.week_start), 'MMM d')} – {format(parseISO(summary.week_end), 'MMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden flex items-center gap-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 active:scale-95 px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      {/* ── Nutrition Score + Breakdown ── */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Nutrition Score</h2>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-shrink-0 self-center">
            <ScoreRing score={summary.nutrition_score} mealsLogged={summary.total_meals_logged} />
          </div>
          <div className="flex-1 w-full space-y-2.5">
            {SCORE_ROWS.map(row => {
              const val = sb?.[row.key] ?? 0
              const pct = (val / row.max) * 100
              return (
                <div key={row.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{row.label}</span>
                    <span className="font-semibold" style={{ color: row.color }}>{val}/{row.max}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: row.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center pt-4 border-t border-gray-100">
          <div>
            <p className="text-xl font-bold text-brand-600">{summary.protein_goal_met_days}/7</p>
            <p className="text-xs text-gray-500 mt-0.5">Protein Days</p>
          </div>
          <div>
            <p className="text-xl font-bold text-orange-500">{summary.calorie_goal_met_days}/7</p>
            <p className="text-xs text-gray-500 mt-0.5">Calorie Days</p>
          </div>
          <div>
            <p className="text-xl font-bold text-purple-500">{summary.total_meals_logged}</p>
            <p className="text-xs text-gray-500 mt-0.5">Meals Logged</p>
          </div>
        </div>
      </div>

      {/* ── Streaks ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <p className="text-3xl font-bold text-gray-900">{summary.current_streak}</p>
          <p className="text-xs text-gray-500 mt-0.5">Current Streak</p>
          <p className="text-xs text-gray-400">days logged</p>
        </div>
        <div className="card text-center">
          <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <p className="text-3xl font-bold text-gray-900">{summary.longest_streak}</p>
          <p className="text-xs text-gray-500 mt-0.5">Longest Streak</p>
          <p className="text-xs text-gray-400">last 60 days</p>
        </div>
      </div>

      {/* ── Daily Calorie Trend ── */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Calorie Trend</h2>
        {dd.some(d => d.calories > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dd} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [`${v} kcal`, 'Calories']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              {calTarget > 0 && (
                <ReferenceLine y={calTarget} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Goal', fontSize: 10, fill: '#f59e0b', position: 'right' }} />
              )}
              <Bar dataKey="calories" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Log meals to see your trend</p>
        )}
      </div>

      {/* ── AI Nutritionist ── */}
      {(summary.ai_insights || summary.ai_summary) && (
        <div className="card bg-gradient-to-br from-brand-50 to-white border-brand-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-brand-600" />
            </div>
            <p className="font-semibold text-brand-900 text-sm">AI Nutritionist</p>
          </div>

          {summary.ai_summary && (
            <p className="text-sm text-gray-700 leading-relaxed mb-4">{summary.ai_summary}</p>
          )}

          {summary.ai_insights && (
            <div className="space-y-3">
              {summary.ai_insights.good?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-green-700 mb-1.5">👍 Good</p>
                  <ul className="space-y-1">
                    {summary.ai_insights.good.map((item, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.ai_insights.needs_improvement?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-700 mb-1.5">⚠ Needs Improvement</p>
                  <ul className="space-y-1">
                    {summary.ai_insights.needs_improvement.map((item, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.ai_insights.next_week_goals?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-brand-700 mb-1.5">🎯 Next Week Goals</p>
                  <ul className="space-y-1">
                    {summary.ai_insights.next_week_goals.map((item, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-brand-500 mt-0.5 flex-shrink-0">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Daily Averages ── */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Daily Averages</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Calories', value: Math.round(summary.avg_daily_calories), unit: 'kcal', bg: 'bg-yellow-50', color: 'text-yellow-600' },
            { label: 'Protein',  value: Math.round(summary.avg_daily_protein),  unit: 'g',    bg: 'bg-blue-50',   color: 'text-blue-600'   },
            { label: 'Carbs',    value: Math.round(summary.avg_daily_carbs),    unit: 'g',    bg: 'bg-purple-50', color: 'text-purple-600' },
            { label: 'Fat',      value: Math.round(summary.avg_daily_fat),      unit: 'g',    bg: 'bg-red-50',    color: 'text-red-500'    },
            { label: 'Fiber',    value: Math.round(summary.avg_daily_fiber),    unit: 'g',    bg: 'bg-green-50',  color: 'text-green-600'  },
            { label: 'Water',    value: summary.avg_daily_water.toFixed(1),     unit: 'L',    bg: 'bg-cyan-50',   color: 'text-cyan-600'   },
          ].map(c => (
            <div key={c.label} className={`text-center p-3 ${c.bg} rounded-xl`}>
              <p className={`text-lg font-bold ${c.color}`}>{c.value}{c.unit}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Macro Distribution ── */}
      {pieData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Macro Distribution</h2>
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <PieChart width={120} height={120}>
                <Pie data={pieData} cx={55} cy={55} innerRadius={32} outerRadius={54} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={MACRO_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </div>
            <div className="space-y-2 flex-1">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: MACRO_COLORS[i] }} />
                  <span className="text-sm text-gray-700 flex-1">{PIE_LABELS[i]}</span>
                  <span className="text-sm font-bold" style={{ color: MACRO_COLORS[i] }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Goal Consistency (day grid) ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-yellow-500" />
          <h2 className="font-semibold text-gray-900">Goal Consistency</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr>
                <th className="text-left text-gray-500 font-normal pb-2 pr-3 w-28">Goal</th>
                {dd.map(d => <th key={d.day} className="pb-2 px-1 text-gray-500 font-normal">{d.day}</th>)}
              </tr>
            </thead>
            <tbody className="space-y-2">
              <tr>
                <td className="text-left text-gray-600 py-1 pr-3">Protein</td>
                {dd.map(d => (
                  <td key={d.day} className="py-1 px-1">
                    <div className="flex justify-center">
                      <DayGoalDot met={d.protein_goal_met} hasData={d.meals_logged > 0} />
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-left text-gray-600 py-1 pr-3">Calories</td>
                {dd.map(d => (
                  <td key={d.day} className="py-1 px-1">
                    <div className="flex justify-center">
                      <DayGoalDot met={d.calorie_goal_met} hasData={d.meals_logged > 0} />
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Best / Worst Day ── */}
      {(summary.best_day || summary.worst_day) && (
        <div className="grid grid-cols-2 gap-4">
          {summary.best_day && (
            <div className="card border-green-100 bg-green-50/40">
              <p className="text-xs font-bold text-green-700 mb-2">🏆 Best Day</p>
              <p className="text-lg font-bold text-gray-900">{summary.best_day.day}</p>
              <p className="text-xs text-gray-500 mb-2">{format(parseISO(summary.best_day.date), 'MMM d')}</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1">
                  {summary.best_day.calorie_goal_met ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-400" />}
                  <span className="text-gray-600">Calories</span>
                </div>
                <div className="flex items-center gap-1">
                  {summary.best_day.protein_goal_met ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-400" />}
                  <span className="text-gray-600">Protein</span>
                </div>
              </div>
              <p className="text-lg font-bold text-green-600 mt-2">{summary.best_day.score}/100</p>
            </div>
          )}
          {summary.worst_day && (
            <div className="card border-red-100 bg-red-50/30">
              <p className="text-xs font-bold text-red-600 mb-2">📉 Needs Work</p>
              <p className="text-lg font-bold text-gray-900">{summary.worst_day.day}</p>
              <p className="text-xs text-gray-500 mb-2">{format(parseISO(summary.worst_day.date), 'MMM d')}</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1">
                  {summary.worst_day.calorie_goal_met ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-400" />}
                  <span className="text-gray-600">Calories</span>
                </div>
                <div className="flex items-center gap-1">
                  {summary.worst_day.protein_goal_met ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-400" />}
                  <span className="text-gray-600">Protein</span>
                </div>
              </div>
              <p className="text-lg font-bold text-red-500 mt-2">{summary.worst_day.score}/100</p>
            </div>
          )}
        </div>
      )}

      {/* ── Water Summary ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Droplets className="w-5 h-5 text-cyan-500" />
          <h2 className="font-semibold text-gray-900">Water Summary</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-cyan-50 rounded-xl">
            <p className="text-xl font-bold text-cyan-600">{summary.avg_daily_water.toFixed(1)}L</p>
            <p className="text-xs text-gray-500 mt-0.5">Average</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <p className="text-xl font-bold text-blue-600">{summary.best_daily_water.toFixed(1)}L</p>
            <p className="text-xs text-gray-500 mt-0.5">Best Day</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xl font-bold text-gray-500">{summary.lowest_daily_water.toFixed(1)}L</p>
            <p className="text-xs text-gray-500 mt-0.5">Lowest Day</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Weekly hydration vs goal ({summary.water_target}L/day)</span>
            <span>{Math.round(summary.avg_daily_water / summary.water_target * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(summary.avg_daily_water / summary.water_target * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Meal Distribution ── */}
      {summary.meal_distribution && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Meal Distribution</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(MEAL_TYPE_META).map(([key, meta]) => {
              const count = summary.meal_distribution[key] ?? 0
              return (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-xl ${meta.color.split(' ')[0]}`}>
                  <span className="text-xl">{meta.emoji}</span>
                  <div>
                    <p className={`text-base font-bold ${meta.color.split(' ')[1]}`}>{count}</p>
                    <p className="text-xs text-gray-500">{meta.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Top Foods ── */}
      {summary.top_foods?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Most Logged Foods</h2>
          <div className="space-y-2">
            {summary.top_foods.map((food, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-0.5">
                    <span className="text-gray-700 font-medium">{food.name}</span>
                    <span className="text-gray-400 text-xs">{food.count}×</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-400 rounded-full"
                      style={{ width: `${(food.count / summary.top_foods[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
