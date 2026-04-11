'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { Zap, Search, Check } from 'lucide-react'

const ADMIN_EMAIL = 'ibmconsultingservice@gmail.com' // ← ton email admin

const PLAN_CREDITS = {
  free:     10,
  starter:  50,
  pro:      150,
  premium:  500,
}

export default function AdminPage() {
  const { user } = useAuth()
  const router   = useRouter()
  const [users, setUsers]     = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [success, setSuccess] = useState(null)

  // ── Protection admin ──────────────────────────
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      router.push('/')
    }
  }, [user])

  // ── Charger tous les users ────────────────────
  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    getDocs(collection(db, 'users')).then(snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user])

  const handleUpdate = async (userId, plan) => {
    setSaving(userId)
    const credits = PLAN_CREDITS[plan]
    await updateDoc(doc(db, 'users', userId), { plan, credits })
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, plan, credits } : u
    ))
    setSuccess(userId)
    setTimeout(() => setSuccess(null), 2000)
    setSaving(null)
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (!user || user.email !== ADMIN_EMAIL) return null

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
            <Zap size={18} fill="currentColor"/>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Admin Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium">
              {users.length} utilisateurs enregistrés
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par email ou nom..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          />
        </div>

        {/* Users table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
            <span className="col-span-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Utilisateur</span>
            <span className="col-span-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
            <span className="col-span-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Crédits</span>
            <span className="col-span-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</span>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Aucun utilisateur trouvé</div>
          ) : (
            filtered.map(u => (
              <div key={u.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-4">
                  <p className="text-sm font-bold text-slate-900 truncate">{u.name || '—'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{u.id.slice(0, 12)}...</p>
                </div>
                <div className="col-span-3">
                  <p className="text-xs text-slate-600 truncate">{u.email}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-black text-indigo-600">⚡ {u.credits ?? 0}</span>
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <select
                    value={u.plan || 'free'}
                    onChange={e => handleUpdate(u.id, e.target.value)}
                    disabled={saving === u.id}
                    className="flex-1 text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                  {success === u.id && (
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-emerald-600" strokeWidth={3}/>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex gap-4 flex-wrap">
          {Object.entries(PLAN_CREDITS).map(([plan, credits]) => (
            <div key={plan} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{plan}</span>
              <span className="text-xs font-black text-indigo-600">⚡ {credits} crédits</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}