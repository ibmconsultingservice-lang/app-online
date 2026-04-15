'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const { login, loginGoogle } = useAuth()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError('Email ou mot de passe incorrect')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      await loginGoogle()
    } catch (err) {
      setError('Erreur connexion Google')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4 font-sans relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-indigo-100/50 blur-[120px] rounded-full"/>
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-blue-100/50 blur-[120px] rounded-full"/>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors mb-8">
          ← Retour à l'accueil
        </Link>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg mb-4">
              <Zap size={22} fill="currentColor" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">
              IA<span className="text-indigo-600">.BUSINESS</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-widest">
              Connectez-vous à votre compte
            </p>
          </div>

          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all mb-6 disabled:opacity-50">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-100"/>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">ou</span>
            <div className="flex-1 h-px bg-slate-100"/>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com" required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-slate-300"/>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-slate-300"/>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-500 rounded-xl px-4 py-3 text-xs font-medium">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white rounded-xl py-3 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Connexion...' : <> Se connecter <ArrowRight size={14}/> </>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Pas de compte ?{' '}
            <Link href="/register" className="text-indigo-600 font-bold hover:underline">S'inscrire gratuitement</Link>
          </p>
        </div>

        <div className="flex justify-center gap-6 mt-6">
          {['🔒 Sécurisé', '⚡ Instantané', '🎁 10 crédits offerts'].map(b => (
            <span key={b} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{b}</span>
          ))}
        </div>
      </div>
    </main>
  )
}