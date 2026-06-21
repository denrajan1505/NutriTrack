import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Leaf, ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-gray-900">Nutries</span>
          </div>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Check your email</h2>
              <p className="text-sm text-gray-500">
                We sent a password reset link to <span className="font-medium text-gray-700">{email}</span>
              </p>
              <p className="text-xs text-gray-400">Didn't get it? Check your spam folder.</p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Forgot password?</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Reset Link
                </button>
              </form>
            </>
          )}

          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mt-5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
