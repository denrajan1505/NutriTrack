import { useState, useCallback, useRef } from 'react'
import { getTodayDashboard, getWeeklySummary, getMealSuggestions } from '../lib/api'
import toast from 'react-hot-toast'

export function useDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getTodayDashboard()
      setDashboard(data)
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  return { dashboard, loading, refresh }
}

export function useWeekly() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef(null)

  const refresh = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const { data } = await getWeeklySummary()
      if (!controller.signal.aborted) setSummary(data)
    } catch {
      if (!controller.signal.aborted) toast.error('Failed to load weekly summary')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  return { summary, loading, refresh }
}

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getMealSuggestions()
      setSuggestions(data)
    } catch {
      toast.error('Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }, [])

  return { suggestions, loading, refresh }
}
