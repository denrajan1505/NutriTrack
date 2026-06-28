import { useState, useRef, useEffect } from 'react'
import { Mic, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeText, logMealText } from '../lib/api'
import { NutritionBadge, MealQualityBadge } from './NutritionCard'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const EXAMPLE_PROMPTS = [
  '2 idlis with sambar and coconut chutney',
  '1 cup rice, dal tadka and mixed sabzi',
  'Masala dosa with chutney for breakfast',
  'Chicken biryani with raita, 1 plate',
  '2 rotis with paneer butter masala',
  'Poha with chai for breakfast',
]

export default function VoiceLogger({ onLogged }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [nutrition, setNutrition] = useState(null)
  const [mealType, setMealType] = useState('lunch')
  const [logging, setLogging] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!SpeechRecognition) {
      setSupported(false)
    }
  }, [])

  const startListening = () => {
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => setListening(true)

    recognition.onresult = async (e) => {
      const text = e.results[0][0].transcript
      setTranscript(text)
      setListening(false)
      await analyzeTranscript(text)
    }

    recognition.onerror = (e) => {
      setListening(false)
      if (e.error === 'not-allowed') {
        toast.error('Microphone access denied')
      } else if (e.error === 'no-speech') {
        toast.error('No speech detected. Try again.')
      } else {
        toast.error(`Voice error: ${e.error}`)
      }
    }

    recognition.onend = () => setListening(false)
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const analyzeTranscript = async (text) => {
    if (!text.trim()) return
    setAnalyzing(true)
    setNutrition(null)
    try {
      const { data } = await analyzeText(text)
      setNutrition(data)
    } catch (err) {
      if (err?.response?.status === 429) {
        toast.error('AI is busy — please wait 1 minute and try again')
      } else {
        toast.error('Analysis failed. Please try text logging.')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const handleLog = async () => {
    if (!transcript || !nutrition) return
    setLogging(true)
    try {
      await logMealText(transcript, mealType)
      toast.success('Meal logged!')
      setTranscript('')
      setNutrition(null)
      onLogged?.()
    } catch {
      toast.error('Failed to log meal')
    } finally {
      setLogging(false)
    }
  }

  if (!supported) {
    return (
      <div className="flex flex-col items-center py-10 gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-amber-400" />
        <p className="text-sm text-gray-600">Voice input is not supported in this browser.</p>
        <p className="text-xs text-gray-400">Please use Chrome or Safari, or switch to text logging.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center py-8 gap-4">
        {analyzing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
            <p className="text-sm text-gray-500">Analyzing nutrition...</p>
          </div>
        ) : listening ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
              <button
                onClick={stopListening}
                className="relative w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all"
              >
                <Mic className="w-8 h-8" />
              </button>
            </div>
            <p className="text-sm font-medium text-red-500 animate-pulse">Listening... tap to stop</p>
          </>
        ) : (
          <>
            <button
              onClick={startListening}
              disabled={!!nutrition}
              className="w-20 h-20 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105"
            >
              <Mic className="w-8 h-8" />
            </button>
            <p className="text-sm text-gray-500">Tap the mic and say what you ate</p>

            {/* Example prompts */}
            {!nutrition && (
              <div className="w-full pt-1">
                <p className="text-xs text-gray-400 text-center mb-2.5">Or tap an example to try instantly ↓</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setTranscript(prompt); analyzeTranscript(prompt) }}
                      className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 rounded-full px-3 py-1.5 transition-colors text-left"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {transcript && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">You said:</p>
          <p className="text-sm text-gray-800 italic">"{transcript}"</p>
        </div>
      )}

      {nutrition && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Nutrition Analysis</h3>
            <MealQualityBadge score={nutrition.meal_quality_score} />
          </div>

          <div className="grid grid-cols-4 gap-3">
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

          <button onClick={() => { setTranscript(''); setNutrition(null) }} className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
