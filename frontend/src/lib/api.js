import axios from 'axios'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: `${API_URL}/api/v1` })

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Meals
export const analyzePhoto = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/meals/analyze/photo', form)
}

export const analyzeText = (text, mealType = 'meal') =>
  api.post('/meals/analyze/text', { text, meal_type: mealType })

export const analyzeVoice = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/meals/analyze/voice', form)
}

export const logMealPhoto = (file, mealType, mealDate) => {
  const form = new FormData()
  form.append('file', file)
  form.append('meal_type', mealType)
  if (mealDate) form.append('meal_date', mealDate)
  return api.post('/meals/log/photo', form)
}

export const logMealText = (description, mealType, mealDate) =>
  api.post('/meals/log/text', { description, meal_type: mealType, date: mealDate })

export const logMealVoice = (file, mealType) => {
  const form = new FormData()
  form.append('file', file)
  form.append('meal_type', mealType)
  return api.post('/meals/log/voice', form)
}

export const logMealManual = (data) => api.post('/meals/log/manual', data)

export const getMealHistory = (startDate, endDate) =>
  api.get('/meals/history', { params: { start_date: startDate, end_date: endDate } })

export const deleteMeal = (id) => api.delete(`/meals/${id}`)

// Dashboard
export const getTodayDashboard = () => api.get('/dashboard/today')
export const getDashboardByDate = (date) => api.get(`/dashboard/date/${date}`)
export const getWeeklySummary = () => api.get('/dashboard/weekly')
export const getMealSuggestions = () => api.get('/dashboard/suggestions')
export const logWater = (amount, date) =>
  api.post('/dashboard/water', null, { params: { amount_liters: amount, log_date: date } })

// Auth
export const getMe = () => api.get('/auth/me')

// Goals
export const setGoal = (goalData) => api.post('/goals/', goalData)
export const getGoal = () => api.get('/goals/')
export const updateGoal = (goalData) => api.put('/goals/', goalData)

// WhatsApp
export const linkPhone = (phone) =>
  api.post('/whatsapp/link-phone', null, { params: { phone } })

export default api
