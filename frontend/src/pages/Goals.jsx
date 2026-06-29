import { useEffect, useState } from 'react'
import { Loader2, Target } from 'lucide-react'
import { getGoal } from '../lib/api'
import GoalSetting from '../components/GoalSetting'

export default function Goals() {
  const [existingGoal, setExistingGoal] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const fetchGoal = async () => {
    try {
      const { data } = await getGoal()
      setExistingGoal(data)
    } catch {
      setExistingGoal(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGoal() }, [])

  const handleSaved = () => {
    setSaved(true)
    setPreview(null)
    fetchGoal()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nutrition Goals</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI calculates your personalized targets</p>
      </div>

      {(existingGoal || preview) && (() => {
        const targets = preview || existingGoal
        return (
          <div className="card bg-gradient-to-br from-brand-50 to-white border-brand-100">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-brand-600" />
              <h2 className="font-semibold text-gray-900">Current Targets</h2>
              {preview && (
                <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 font-semibold rounded-full px-2 py-0.5">Preview</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-yellow-500">{targets.daily_calorie_target}</p>
                <p className="text-xs text-gray-500 mt-0.5">Daily Calories</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-blue-500">{targets.daily_protein_target}g</p>
                <p className="text-xs text-gray-500 mt-0.5">Daily Protein</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-purple-500">{targets.daily_carbs_target}g</p>
                <p className="text-xs text-gray-500 mt-0.5">Daily Carbs</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-cyan-500">{targets.daily_water_target}L</p>
                <p className="text-xs text-gray-500 mt-0.5">Daily Water</p>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-5">
          {existingGoal ? 'Update Goal' : 'Set Your Goal'}
        </h2>
        <GoalSetting existing={existingGoal} onSaved={handleSaved} onPreview={setPreview} />
      </div>
    </div>
  )
}
