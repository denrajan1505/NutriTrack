import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { UtensilsCrossed } from 'lucide-react'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import LogMeal from './pages/LogMeal'
import Weekly from './pages/Weekly'
import Goals from './pages/Goals'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const hideFab = location.pathname === '/log'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden"><Navbar /></div>
      <main className="lg:ml-60 pt-16 lg:pt-0 pb-24 lg:pb-0 px-4 lg:px-8 py-6 max-w-2xl mx-auto lg:mx-0 lg:max-w-3xl print:ml-0 print:pt-0 print:pb-0 print:max-w-full print:px-0">
        <Outlet />
      </main>

      {!hideFab && (
        <Link
          to="/log"
          className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold text-sm px-5 py-3.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all print:hidden"
        >
          <UtensilsCrossed className="w-5 h-5" />
          Log Meal
        </Link>
      )}
    </div>
  )
}

function PublicRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#22c55e', secondary: 'white' } },
          }}
        />
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/log" element={<LogMeal />} />
            <Route path="/weekly" element={<Weekly />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
