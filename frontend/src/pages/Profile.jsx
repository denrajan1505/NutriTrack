import { useState, useEffect } from 'react'
import { User, Smartphone, Crown, Shield, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { linkPhone, getMe } from '../lib/api'
import toast from 'react-hot-toast'

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    features: ['20 meal logs/month', 'Basic calorie tracking', 'AI photo analysis'],
    current: true,
    color: 'border-gray-200',
  },
  {
    name: 'Pro',
    price: '₹199/mo',
    features: ['Unlimited meal logs', 'AI meal recommendations', 'Weekly reports', 'Voice logging'],
    color: 'border-brand-400 bg-brand-50',
    badge: 'Popular',
  },
  {
    name: 'Premium',
    price: '₹499/mo',
    features: ['Everything in Pro', 'WhatsApp AI agent', 'Advanced analytics', 'Personalized coaching'],
    color: 'border-purple-400 bg-purple-50',
    badge: 'Best Value',
  },
]

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [linking, setLinking] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    getMe().then(({ data }) => setIsAdmin(data.is_admin)).catch(() => {})
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleLinkPhone = async () => {
    if (!phone.trim()) return
    setLinking(true)
    try {
      await linkPhone(phone)
      toast.success('WhatsApp linked! Send a message to get started.')
      setPhone('')
    } catch {
      toast.error('Failed to link phone')
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* User card */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-brand-700">
          {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-lg">{user?.user_metadata?.full_name || 'User'}</p>
            {isAdmin && (
              <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 font-semibold rounded-full px-2.5 py-0.5">
                <ShieldCheck className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1 mt-1.5 inline-block">Free Plan</span>
        </div>
      </div>

      {/* WhatsApp integration */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold text-gray-900">WhatsApp Agent</h2>
          <span className="text-xs bg-purple-100 text-purple-600 font-semibold rounded-full px-2 py-0.5 ml-auto">Premium</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Link your WhatsApp to log meals by just sending a message or photo.
          Text <strong>+1 (415) 523-8886</strong> on WhatsApp to get started.
        </p>
        <div className="flex gap-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
            className="input-field flex-1"
          />
          <button onClick={handleLinkPhone} disabled={linking} className="btn-primary whitespace-nowrap">
            Link Number
          </button>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Upgrade Plan</h2>
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`card border-2 ${plan.color} relative`}>
              {plan.badge && (
                <span className="absolute -top-2.5 right-4 text-xs font-bold bg-brand-500 text-white rounded-full px-3 py-0.5">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{plan.name}</p>
                  <p className="text-xl font-bold text-brand-600">{plan.price}</p>
                </div>
                {plan.current ? (
                  <span className="text-xs bg-green-100 text-green-600 font-semibold rounded-full px-3 py-1">Current</span>
                ) : (
                  <button className="btn-primary text-sm py-2 px-4">Upgrade</button>
                )}
              </div>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-100 text-red-500 hover:bg-red-50 font-semibold text-sm transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  )
}
