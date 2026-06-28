import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getAdminUsers } from '../lib/api'
import { Users, Shield, Mail, Clock, CheckCircle, XCircle, Search } from 'lucide-react'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function UserAvatar({ name, email }) {
  const letter = (name?.[0] || email?.[0] || '?').toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">
      {letter}
    </div>
  )
}

export default function Admin() {
  const { isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAdmin, loading, navigate])

  useEffect(() => {
    if (!isAdmin) return
    getAdminUsers()
      .then(({ data }) => {
        setUsers(data.users)
        setTotal(data.total)
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setFetching(false))
  }, [isAdmin])

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center text-red-600 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500">Manage and monitor all users</p>
        </div>
      </div>

      {/* Stats card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-sm text-gray-500">Total registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
        />
      </div>

      {/* User list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No users found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((u) => (
              <div key={u.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <UserAvatar name={u.full_name} email={u.email} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {u.full_name || 'No name'}
                    </p>
                    {u.email_confirmed ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Unverified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" /> {u.email}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Joined {formatDate(u.created_at)}
                    </p>
                    {u.last_sign_in_at && (
                      <p className="text-xs text-gray-400">
                        Last login: {formatDate(u.last_sign_in_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
