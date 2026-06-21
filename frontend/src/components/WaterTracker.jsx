import { useState } from 'react'
import { Droplets, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { logWater } from '../lib/api'

const QUICK_AMOUNTS = [0.25, 0.5, 1.0]

export default function WaterTracker({ current = 0, target = 2.5, onLogged }) {
  const [loading, setLoading] = useState(false)

  const handleLog = async (amount) => {
    setLoading(true)
    try {
      await logWater(amount)
      toast.success(`+${amount * 1000}ml logged`)
      onLogged?.()
    } catch {
      toast.error('Failed to log water')
    } finally {
      setLoading(false)
    }
  }

  const pct = Math.min((current / target) * 100, 100)
  const cups = Math.round(current / 0.25)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Hydration</h3>
        </div>
        <span className="text-sm font-semibold text-blue-600">{current.toFixed(1)}L / {target}L</span>
      </div>

      <div className="relative h-3 bg-blue-50 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">{cups} glasses</span>
        <span className="text-xs text-gray-400">{Math.round(pct)}% of daily goal</span>
      </div>

      <div className="flex gap-2">
        {QUICK_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => handleLog(amt)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {amt * 1000}ml
          </button>
        ))}
      </div>
    </div>
  )
}
