import { useState, useMemo } from 'react'
import { Loader2, Target, AlertTriangle, Info } from 'lucide-react'

function calculatePreview(form) {
  const weight = parseFloat(form.current_weight)
  const targetWeight = parseFloat(form.target_weight)
  const height = parseFloat(form.height)
  const age = parseInt(form.age)
  if (!weight || !height || !age) return null

  // Mifflin-St Jeor (gender-specific)
  const genderOffset = form.gender === 'female' ? -161 : 5
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + genderOffset)

  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
  const tdee = Math.round(bmr * (multipliers[form.activity_level] || 1.55))

  let calories
  if (form.goal_type === 'weight_loss') {
    calories = Math.max(Math.round(tdee * 0.80), 1300)
  } else if (form.goal_type === 'weight_gain') {
    calories = tdee + 300
  } else if (form.goal_type === 'muscle_building') {
    calories = tdee + 250
  } else {
    calories = tdee
  }

  let protein
  if (form.goal_type === 'weight_loss') {
    protein = Math.round((targetWeight || weight) * 2.0)
  } else if (form.goal_type === 'maintenance') {
    protein = Math.round(weight * 1.5)
  } else {
    protein = Math.round(weight * 2.2)
  }

  const fat = Math.round((calories * 0.27) / 9)
  const carbCalories = calories - protein * 4 - fat * 9
  const carbs = Math.max(0, Math.round(carbCalories / 4))
  const water = parseFloat(form.water_target) || parseFloat((weight * 35 / 1000).toFixed(1))

  return {
    daily_calorie_target: calories,
    daily_protein_target: protein,
    daily_carbs_target: carbs,
    daily_fat_target: fat,
    daily_water_target: water,
    bmr,
    tdee,
  }
}

function getWeightEstimate(goalType, current, target) {
  const cur = parseFloat(current)
  const tgt = parseFloat(target)
  if (!cur || !tgt || cur === tgt) return null

  if (goalType === 'weight_loss' && cur > tgt) {
    const diff = cur - tgt
    const months = Math.round(diff * 0.6)
    const extreme = diff > 30
    return {
      type: extreme ? 'warning' : 'info',
      message: `Losing ${diff.toFixed(1)} kg at a healthy pace (~1.5–2 kg/month) may take ~${months} month${months !== 1 ? 's' : ''}.`,
      extra: extreme ? 'A goal this large is best approached with a doctor or dietitian.' : null,
    }
  }

  if ((goalType === 'weight_gain' || goalType === 'muscle_building') && tgt > cur) {
    const diff = tgt - cur
    const months = Math.round(diff / 0.5)
    return {
      type: 'info',
      message: `Gaining ${diff.toFixed(1)} kg of lean muscle at a healthy pace (~0.5 kg/month) may take ~${months} month${months !== 1 ? 's' : ''}.`,
      extra: null,
    }
  }

  return null
}

import toast from 'react-hot-toast'
import { setGoal, updateGoal } from '../lib/api'

const GOALS = [
  { value: 'weight_loss', label: 'Weight Loss', emoji: '📉', desc: 'Caloric deficit to lose fat' },
  { value: 'weight_gain', label: 'Weight Gain', emoji: '📈', desc: 'Caloric surplus to gain mass' },
  { value: 'muscle_building', label: 'Muscle Building', emoji: '💪', desc: 'High protein, slight surplus' },
  { value: 'maintenance', label: 'Maintenance', emoji: '⚖️', desc: 'Maintain current weight' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (desk job, no exercise)' },
  { value: 'light', label: 'Light (exercise 1-3x/week)' },
  { value: 'moderate', label: 'Moderate (exercise 3-5x/week)' },
  { value: 'active', label: 'Active (exercise 6-7x/week)' },
  { value: 'very_active', label: 'Very Active (athlete)' },
]

export default function GoalSetting({ existing, onSaved, onPreview }) {
  const [form, setForm] = useState({
    goal_type: existing?.goal_type || 'maintenance',
    gender: existing?.gender || 'male',
    current_weight: existing?.current_weight || '',
    target_weight: existing?.target_weight || '',
    height: existing?.height || '',
    age: existing?.age || '',
    activity_level: existing?.activity_level || 'moderate',
    water_target: existing?.daily_water_target || 2.5,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v }
      onPreview?.(calculatePreview(next))
      return next
    })
    setErrors((e) => ({ ...e, [k]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.current_weight || parseFloat(form.current_weight) <= 0) e.current_weight = 'Required'
    if (!form.target_weight || parseFloat(form.target_weight) <= 0) e.target_weight = 'Required'
    if (!form.height || parseFloat(form.height) <= 0) e.height = 'Required'
    if (!form.age || parseInt(form.age) <= 0) e.age = 'Required'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); toast.error('Please fill in all required fields.'); return }
    setSaving(true)
    try {
      const payload = {
        goal_type: form.goal_type,
        gender: form.gender,
        current_weight: parseFloat(form.current_weight),
        target_weight: parseFloat(form.target_weight),
        height: parseFloat(form.height),
        age: parseInt(form.age),
        activity_level: form.activity_level,
        water_target: parseFloat(form.water_target) || 2.5,
      }
      if (existing) {
        await updateGoal(payload)
      } else {
        await setGoal(payload)
      }
      toast.success('Goal saved! Targets calculated.')
      onSaved?.()
    } catch {
      toast.error('Failed to save goal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Goal type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Your Goal</label>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => set('goal_type', g.value)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                form.goal_type === g.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <div className="text-2xl mb-2">{g.emoji}</div>
              <div className="font-semibold text-sm text-gray-900">{g.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{g.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Biological Sex</label>
        <div className="flex gap-3">
          {[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }].map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => set('gender', g.value)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                form.gender === g.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weight / height / age */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Weight (kg) <span className="text-red-500">*</span></label>
          <input
            type="number"
            value={form.current_weight}
            onChange={(e) => set('current_weight', e.target.value)}
            placeholder="70"
            className={`input-field ${errors.current_weight ? 'border-red-400 focus:ring-red-300' : ''}`}
          />
          {errors.current_weight && <p className="text-xs text-red-500 mt-1">{errors.current_weight}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Weight (kg) <span className="text-red-500">*</span></label>
          <input
            type="number"
            value={form.target_weight}
            onChange={(e) => set('target_weight', e.target.value)}
            placeholder="65"
            className={`input-field ${errors.target_weight ? 'border-red-400 focus:ring-red-300' : ''}`}
          />
          {errors.target_weight && <p className="text-xs text-red-500 mt-1">{errors.target_weight}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm) <span className="text-red-500">*</span></label>
          <input
            type="number"
            value={form.height}
            onChange={(e) => set('height', e.target.value)}
            placeholder="170"
            className={`input-field ${errors.height ? 'border-red-400 focus:ring-red-300' : ''}`}
          />
          {errors.height && <p className="text-xs text-red-500 mt-1">{errors.height}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Age <span className="text-red-500">*</span></label>
          <input
            type="number"
            value={form.age}
            onChange={(e) => set('age', e.target.value)}
            placeholder="25"
            className={`input-field ${errors.age ? 'border-red-400 focus:ring-red-300' : ''}`}
          />
          {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
        </div>
      </div>

      {/* Weight timeline estimate */}
      {(() => {
        const est = getWeightEstimate(form.goal_type, form.current_weight, form.target_weight)
        if (!est) return null
        const isWarning = est.type === 'warning'
        return (
          <div className={`rounded-xl p-3.5 flex gap-3 ${isWarning ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-100'}`}>
            {isWarning
              ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              : <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
            <div className="space-y-0.5">
              <p className={`text-xs font-semibold ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>{est.message}</p>
              {est.extra && <p className={`text-xs ${isWarning ? 'text-amber-600' : 'text-blue-600'}`}>{est.extra}</p>}
            </div>
          </div>
        )
      })()}

      {/* Activity level */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Activity Level</label>
        <select
          value={form.activity_level}
          onChange={(e) => set('activity_level', e.target.value)}
          className="input-field"
        >
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      {/* Water target */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Daily Water Goal (L)
          <span className="ml-2 text-xs font-normal text-gray-400">Recommended: 2–3L</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={form.water_target}
            onChange={(e) => set('water_target', e.target.value)}
            className="flex-1 accent-cyan-500"
          />
          <span className="text-base font-bold text-cyan-600 w-12 text-right">{form.water_target}L</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
          <span>1L</span><span>2L</span><span>3L</span><span>4L</span><span>5L</span>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
        {saving ? 'Calculating...' : 'Save Goal & Calculate Targets'}
      </button>
    </div>
  )
}
