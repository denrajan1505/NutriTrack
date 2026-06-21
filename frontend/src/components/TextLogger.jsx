import { useState } from 'react'
import { Send, Loader2, PenLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeText, logMealText, logMealManual } from '../lib/api'
import { NutritionBadge, MealQualityBadge } from './NutritionCard'

const EXAMPLES = [
  '2 idlis with sambar and coconut chutney',
  '2 chapatis, chicken curry, and curd',
  'Biryani with raita and papad',
  'Oats porridge with banana and almonds',
]

function ManualEntry({ description, onLogged }) {
  const [mealType, setMealType] = useState('lunch')
  const [form, setForm] = useState({ calories: '', protein: '', carbs: '', fat: '' })
  const [logging, setLogging] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const valid = form.calories && form.protein && form.carbs && form.fat

  const handleLog = async () => {
    if (!valid) return
    setLogging(true)
    try {
      await logMealManual({
        description,
        meal_type: mealType,
        calories: parseFloat(form.calories),
        protein: parseFloat(form.protein),
        carbs: parseFloat(form.carbs),
        fat: parseFloat(form.fat),
      })
      toast.success('Meal logged!')
      onLogged?.()
    } catch {
      toast.error('Failed to log meal')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <PenLine className="w-4 h-4 flex-shrink-0" />
        <span>AI analysis unavailable. Enter values manually to log this meal.</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'calories', label: 'Calories', unit: 'kcal' },
          { key: 'protein', label: 'Protein', unit: 'g' },
          { key: 'carbs', label: 'Carbs', unit: 'g' },
          { key: 'fat', label: 'Fat', unit: 'g' },
        ].map(({ key, label, unit }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label} ({unit})</label>
            <input
              type="number"
              min="0"
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder="0"
              className="input-field"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="input-field flex-1">
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
        <button onClick={handleLog} disabled={!valid || logging} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {logging && <Loader2 className="w-4 h-4 animate-spin" />}
          Log Meal
        </button>
      </div>
    </div>
  )
}

export default function TextLogger({ onLogged }) {
  const [text, setText] = useState('')
  const [mealType, setMealType] = useState('lunch')
  const [nutrition, setNutrition] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [manualMode, setManualMode] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setAnalyzing(true)
    setManualMode(false)
    try {
      const { data } = await analyzeText(text)
      setNutrition(data)
    } catch {
      setManualMode(true)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleLog = async () => {
    if (!text.trim() || !nutrition) return
    setLogging(true)
    try {
      await logMealText(text, mealType)
      toast.success('Meal logged!')
      setText('')
      setNutrition(null)
      onLogged?.()
    } catch {
      toast.error('Failed to log meal')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setNutrition(null); setManualMode(false) }}
          placeholder="Describe what you ate...&#10;e.g. 2 idlis with sambar and coconut chutney"
          className="input-field min-h-[100px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) handleAnalyze()
          }}
        />

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-400 self-center">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setText(ex); setNutrition(null); setManualMode(false) }}
              className="text-xs bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-600 rounded-full px-3 py-1 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!text.trim() || analyzing}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Analyze Nutrition
            </>
          )}
        </button>
      </div>

      {manualMode && <ManualEntry description={text} onLogged={onLogged} />}

      {nutrition && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Nutrition Breakdown</h3>
            <MealQualityBadge score={nutrition.meal_quality_score} />
          </div>

          {nutrition.food_items?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {nutrition.food_items.map((item, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">{item}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NutritionBadge label="Calories" value={nutrition.calories} unit="kcal" color="#f59e0b" />
            <NutritionBadge label="Protein" value={nutrition.protein} unit="g" color="#3b82f6" />
            <NutritionBadge label="Carbs" value={nutrition.carbs} unit="g" color="#8b5cf6" />
            <NutritionBadge label="Fat" value={nutrition.fat} unit="g" color="#ef4444" />
          </div>

          {nutrition.description && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{nutrition.description}</p>
          )}

          <div className="flex gap-3">
            <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="input-field flex-1">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
            <button onClick={handleLog} disabled={logging} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {logging && <Loader2 className="w-4 h-4 animate-spin" />}
              Log Meal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
