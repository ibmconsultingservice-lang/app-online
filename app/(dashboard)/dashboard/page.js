'use client'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import AuthGuard from '@/components/AuthGuard'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, LogOut, ArrowRight } from 'lucide-react'

const TOOLS = [
  { icon: '🧠', name: 'Business IA',   desc: 'Stratégie & négociation',     path: '/business-ia',  cost: 2 },
  { icon: '📄', name: 'CV Builder',    desc: 'CV professionnel PDF',        path: '/cv',           cost: 2 },
  { icon: '🎙️', name: 'Audio Trans',   desc: 'Transcription audio',         path: '/AudioTrans',   cost: 1 },
  { icon: '🖥️', name: 'PPTX Genius',  desc: 'Présentations IA',            path: '/pptxgenius',   cost: 3 },
  { icon: '🧾', name: 'Facture',       desc: 'Génération de factures',      path: '/facture',      cost: 1 },
  { icon: '📊', name: 'Business Plan', desc: 'Plan d\'affaires complet',    path: '/Businessplan', cost: 4 },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { credits, plan } = useCredits()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f8fafc] font-sans">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 md:px-10 h-16 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
              <Zap size={16} fill="currentColor" />
            </div>
            <span className="text-base font-black tracking-tighter uppercase italic">
              IA<span className="text-indigo-600">.BUSINESS</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
              <Zap size={12} className="text-indigo-600" fill="currentColor"/>
              <span className="text-xs font-bold text-indigo-700">{credits ?? 0} crédits</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              plan === 'premium'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}>{plan ?? 'free'}</span>
            <button onClick={handleLogout}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all">
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-1">
              Bonjour {user?.displayName?.split(' ')[0] || user?.name?.split(' ')[0] || 'là'} 👋
            </h1>
            <p className="text-slate-500 text-sm">
              Vous avez <span className="font-bold text-indigo-600">{credits ?? 0} crédits</span> disponibles
            </p>
          </div>

          {/* Low credits alert */}
          {credits !== null && credits < 3 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-8 flex items-center justify-between gap-4">
              <span className="text-sm text-amber-700 font-medium">⚠️ Crédits faibles — rechargez pour continuer</span>
              <button onClick={() => router.push('/pricing')}
                className="bg-amber-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-amber-600 transition-all whitespace-nowrap">
                Recharger
              </button>
            </div>
          )}

          {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((tool) => (
              <div key={tool.path}
                onClick={() => router.push(tool.path)}
                className="bg-white border border-slate-200 rounded-2xl p-6 cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 group relative overflow-hidden">
                <div className="text-3xl mb-4">{tool.icon}</div>
                <h3 className="text-sm font-black text-slate-900 mb-1">{tool.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{tool.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    ⚡ {tool.cost} crédit{tool.cost > 1 ? 's' : ''}
                  </span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>

          {/* Upgrade banner */}
          {plan !== 'premium' && (
            <div className="mt-10 bg-slate-900 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[40%] h-full bg-indigo-600/10 blur-[60px] rounded-full pointer-events-none"/>
              <div className="relative z-10">
                <h3 className="text-lg font-black text-white mb-2">🚀 Passez au Premium</h3>
                <p className="text-slate-400 text-sm">200 crédits · Exports PPTX & Word · Support prioritaire</p>
              </div>
              <button onClick={() => router.push('/pricing')}
                className="relative z-10 bg-white text-slate-900 font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all whitespace-nowrap shadow-lg">
                Voir les plans →
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}