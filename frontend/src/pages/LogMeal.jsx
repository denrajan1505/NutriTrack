import { useState } from 'react'
import { Camera, Mic, Type } from 'lucide-react'
import PhotoUpload from '../components/PhotoUpload'
import VoiceLogger from '../components/VoiceLogger'
import TextLogger from '../components/TextLogger'
import { useNavigate } from 'react-router-dom'

const TABS = [
  { id: 'photo', label: 'Photo', icon: Camera, desc: 'Snap your food' },
  { id: 'voice', label: 'Voice', icon: Mic, desc: 'Say what you ate' },
  { id: 'text', label: 'Text', icon: Type, desc: 'Type your meal' },
]

const TAB_BANNERS = {
  photo: { text: '✨ AI identifies your food & calculates nutrition instantly.', color: 'bg-brand-50 text-brand-700 border-brand-100' },
  voice: { text: '🎙️ Speak naturally — AI understands and logs your meal.', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  text: { text: '💬 Describe any meal and AI breaks down the nutrition.', color: 'bg-gray-50 text-gray-600 border-gray-100' },
}

export default function LogMeal() {
  const [tab, setTab] = useState('photo')
  const navigate = useNavigate()

  const handleLogged = () => {
    setTimeout(() => navigate('/dashboard'), 1200)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log Meal</h1>
        <p className="text-sm text-gray-500 mt-0.5">Snap. Speak. Track.</p>
      </div>

      {/* Tab switcher */}
      <div className="grid grid-cols-3 gap-2">
        {TABS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`p-4 rounded-2xl border-2 transition-all text-center ${
              tab === id
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <Icon className={`w-6 h-6 mx-auto mb-1.5 ${tab === id ? 'text-brand-600' : 'text-gray-400'}`} />
            <p className={`text-sm font-semibold ${tab === id ? 'text-brand-700' : 'text-gray-600'}`}>{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* AI feature banner */}
      <div className={`text-xs font-medium px-4 py-2.5 rounded-xl border ${TAB_BANNERS[tab].color}`}>
        {TAB_BANNERS[tab].text}
      </div>

      {/* Tab content */}
      <div className="card">
        {tab === 'photo' && <PhotoUpload onLogged={handleLogged} />}
        {tab === 'voice' && <VoiceLogger onLogged={handleLogged} />}
        {tab === 'text' && <TextLogger onLogged={handleLogged} />}
      </div>
    </div>
  )
}
