import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { getMe } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)

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
