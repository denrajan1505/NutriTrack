import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeVoice, logMealVoice } from '../lib/api'
import { NutritionBadge, MealQualityBadge } from './NutritionCard'

export default function VoiceLogger({ onLogged }) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [mealType, setMealType] = useState('lunch')
  const [logging, setLogging] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)

  const mediaRecorder = useRef(null)
  const chunks = useRef([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      chunks.current = []

      mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data)
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
        await processAudio(blob)
      }

      mediaRecorder.current.start()
      setRecording(true)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    mediaRecorder.current?.stop()
    setRecording(false)
  }

  const processAudio = async (blob) => {
    setProcessing(true)
    try {
      const file = new File([blob], 'voice.webm', { type: 'audio/webm' })
      const { data } = await analyzeVoice(file)
      setResult(data)
    } catch (err) {
      if (err?.response?.status === 429) {
        toast.error('AI is busy — please wait 1 minute and try again')
      } else {
        const detail = err?.response?.data?.detail || 'Voice processing failed'
        toast.error(detail)
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleLog = async () => {
    if (!audioBlob || !result) return
    setLogging(true)
    try {
      const file = new File([audioBlob], 'voice.webm', { type: 'audio/webm' })
      await logMealVoice(file, mealType)
      toast.success('Meal logged!')
      setResult(null)
      setAudioBlob(null)
      onLogged?.()
    } catch {
      toast.error('Failed to log meal')
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center py-8 gap-4">
        {processing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
            <p className="text-sm text-gray-500">Transcribing & analyzing...</p>
          </div>
        ) : recording ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
              <button
                onClick={stopRecording}
                className="relative w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all"
              >
                <Square className="w-8 h-8" />
              </button>
            </div>
            <p className="text-sm font-medium text-red-500 animate-pulse">Recording... tap to stop</p>
          </>
        ) : (
          <>
            <button
              onClick={startRecording}
              disabled={!!result}
              className="w-20 h-20 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105"
            >
              <Mic className="w-8 h-8" />
            </button>
            <p className="text-sm text-gray-500">Tap and say what you ate</p>
            <p className="text-xs text-gray-400 text-center max-w-xs">
              e.g. "I ate 2 idlis with sambar and coconut chutney for breakfast"
            </p>
          </>
        )}
      </div>

      {result && (
        <div className="card space-y-4">
          {result.transcript && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">You said:</p>
              <p className="text-sm text-gray-800 italic">"{result.transcript}"</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Nutrition Analysis</h3>
            <MealQualityBadge score={result.nutrition?.meal_quality_score} />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <NutritionBadge label="Calories" value={result.nutrition?.calories || 0} unit="kcal" color="#f59e0b" />
            <NutritionBadge label="Protein" value={result.nutrition?.protein || 0} unit="g" color="#3b82f6" />
            <NutritionBadge label="Carbs" value={result.nutrition?.carbs || 0} unit="g" color="#8b5cf6" />
            <NutritionBadge label="Fat" value={result.nutrition?.fat || 0} unit="g" color="#ef4444" />
          </div>

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

          <button onClick={() => { setResult(null); setAudioBlob(null) }} className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
