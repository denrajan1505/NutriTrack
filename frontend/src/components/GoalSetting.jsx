import { useState } from 'react'
import { Loader2, Target } from 'lucide-react'
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

export default function GoalSetting({ existing, onSaved }) {
  const [form, setForm] = useState({
    goal_type: existing?.goal_type || 'maintenance',
    current_weight: existing?.current_weight || '',
    target_weight: existing?.target_weight || '',
    height: '',
    age: '',
    activity_level: 'moderate',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.goal_type) return
    setSaving(true)
    try {
      const payload = {
        goal_type: form.goal_type,
        current_weight: form.current_weight ? parseFloat(form.current_weight) : null,
        target_weight: form.target_weight ? parseFloat(form.target_weight) : null,
        height: form.height ? parseFloat(form.height) : null,
        age: form.age ? parseInt(form.age) : null,
        activity_level: form.activity_level,
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Weight (kg)</label>
          <input
            type="number"
            value={form.current_weight}
            onChange={(e) => set('current_weight', e.target.value)}
            placeholder="70"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Weight (kg)</label>
          <input
            type="number"
            value={form.target_weight}
            onChange={(e) => set('target_weight', e.target.value)}
            placeholder="65"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm)</label>
          <input
            type="number"
            value={form.height}
            onChange={(e) => set('height', e.target.value)}
            placeholder="170"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
          <input
            type="number"
            value={form.age}
            onChange={(e) => set('age', e.target.value)}
            placeholder="25"
            className="input-field"
          />
        </div>
      </div>

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

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
        {saving ? 'Calculating...' : 'Save Goal & Calculate Targets'}
      </button>
    </div>
  )
}
