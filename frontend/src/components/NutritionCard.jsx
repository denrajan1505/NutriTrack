export function MacroRing({ label, current, target, color, unit = 'g' }) {
  const pct = Math.min((current / target) * 100, 100)
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="40" cy="40" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-gray-900">{Math.round(current)}</span>
          <span className="text-[10px] text-gray-400">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <p className="text-[10px] text-gray-400">/ {target}{unit}</p>
      </div>
    </div>
  )
}

export function ProgressBar({ label, current, target, color, unit = 'g' }) {
  const pct = Math.min((current / target) * 100, 100)
  const over = current > target

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-semibold ${over ? 'text-orange-500' : 'text-gray-900'}`}>
          {Math.round(current)} / {target} {unit}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function NutritionBadge({ label, value, unit, color }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: `${color}15` }}>
      <span className="text-lg font-bold" style={{ color }}>{Math.round(value)}</span>
      <span className="text-xs text-gray-500">{unit}</span>
      <span className="text-xs font-medium text-gray-600 mt-0.5">{label}</span>
    </div>
  )
}

export function MealQualityBadge({ score }) {
  if (!score) return null
  const color = score >= 80 ? 'text-green-600 bg-green-50' : score >= 60 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {score}/100 · {label}
    </span>
  )
}
