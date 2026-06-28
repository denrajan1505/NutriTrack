import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { getMe } from '../lib/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

const INACTIVITY_MS = 30 * 60 * 1000  // 30 min
const WARN_MS = 28 * 60 * 1000         // warn at 28 min

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)
  const warnRef = useRef(null)

  useEffect(() => {
    if (!user) { setIsAdmin(false); setPlan('free'); return }
    getMe()
      .then(({ data }) => {
        setIsAdmin(!!data.is_admin)
        setPlan(data.plan || 'free')
      })
      .catch(() => { setIsAdmin(false); setPlan('free') })
  }, [user?.id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      clearTimeout(timerRef.current)
      clearTimeout(warnRef.current)
      return
    }

    const reset = () => {
      clearTimeout(timerRef.current)
      clearTimeout(warnRef.current)
      warnRef.current = setTimeout(() => {
        toast('You will be signed out in 2 minutes due to inactivity.', { icon: '⚠️', duration: 10000 })
      }, WARN_MS)
      timerRef.current = setTimeout(() => {
        supabase.auth.signOut()
        toast.error('Signed out due to inactivity.')
      }, INACTIVITY_MS)
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      clearTimeout(timerRef.current)
      clearTimeout(warnRef.current)
    }
  }, [user?.id])

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = () => supabase.auth.signOut()

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, plan, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
