import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzePhoto, logMealPhoto } from '../lib/api'
import { MealQualityBadge, NutritionBadge } from './NutritionCard'

export default function PhotoUpload({ onLogged }) {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [nutrition, setNutrition] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [mealType, setMealType] = useState('lunch')

  const onDrop = useCallback(async (acceptedFiles) => {
    const f = acceptedFiles[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setNutrition(null)
    setAnalyzing(true)
    try {
      const { data } = await analyzePhoto(f)
      setNutrition(data)
    } catch {
      toast.error('Could not analyze image. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  })

  const handleLog = async () => {
    if (!file || !nutrition) return
    setLogging(true)
    try {
      await logMealPhoto(file, mealType)
      toast.success('Meal logged!')
      setFile(null)
      setPreview(null)
      setNutrition(null)
      onLogged?.()
    } catch {
      toast.error('Failed to log meal')
    } finally {
      setLogging(false)
    }
  }

  const clear = () => {
    setFile(null)
    setPreview(null)
    setNutrition(null)
  }

  return (
    <div className="space-y-4">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Camera className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {isDragActive ? 'Drop your food photo here' : 'Take or upload a food photo'}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 10MB</p>
          <button type="button" className="btn-primary mt-4 inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Choose Photo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden">
            <img src={preview} alt="Food" className="w-full max-h-64 object-cover" />
            <button
              onClick={clear}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {analyzing && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <p className="text-white text-sm font-medium">Analyzing with AI...</p>
              </div>
            )}
          </div>

          {nutrition && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Nutrition Analysis</h3>
                <MealQualityBadge score={nutrition.meal_quality_score} />
              </div>

              {nutrition.food_items?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {nutrition.food_items.map((item, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">{item}</span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                <NutritionBadge label="Calories" value={nutrition.calories} unit="kcal" color="#f59e0b" />
                <NutritionBadge label="Protein" value={nutrition.protein} unit="g" color="#3b82f6" />
                <NutritionBadge label="Carbs" value={nutrition.carbs} unit="g" color="#8b5cf6" />
                <NutritionBadge label="Fat" value={nutrition.fat} unit="g" color="#ef4444" />
              </div>

              {nutrition.description && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{nutrition.description}</p>
              )}

              <div className="flex gap-3 pt-1">
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="input-field flex-1"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
                <button onClick={handleLog} disabled={logging} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Log Meal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
