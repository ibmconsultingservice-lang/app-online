'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc, deleteDoc, increment } from 'firebase/firestore'
import { Zap, Search, Check, Plus, Minus, Trash2, RefreshCw } from 'lucide-react'

const ADMIN_EMAIL = 'ibmconsultingservice@gmail.com'

const PLAN_CREDITS = {
  free:     10,
  starter:  50,
  pro:      150,
  premium:  500,
}

const PLAN_COLORS = {
  free:    'bg-slate-100 text-slate-500',
  starter: 'bg-indigo-50 text-indigo-600',
  pro:     'bg-violet-50 text-violet-600',
  premium: 'bg-amber-50 text-amber-600',
}

export default function AdminPage() {
  const { user }  = useAuth()
  const router    = useRouter()

  const [users, setUsers]         = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(null)
  const [success, setSuccess]     = useState(null)
  const [creditInput, setCreditInput] = useState({}) // { userId: amount }
  const [deleting, setDeleting]   = useState(null)

  // ── Guard ─────────────────────────────────────
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) router.push('/')
  }, [user])

  // ── Load users ────────────────────────────────
  const loadUsers = () => {
    if (!user || user.email !== ADMIN_EMAIL) return
    setLoading(true)
    getDocs(collection(db, 'users')).then(snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }

  useEffect(() => { loadUsers() }, [user])

  // ── Update plan ───────────────────────────────
  const handlePlanUpdate = async (userId, plan) => {
    setSaving(userId)
    const credits = PLAN_CREDITS[plan]
    await updateDoc(doc(db, 'users', userId), { plan, credits })
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, plan, credits } : u
    ))
    showSuccess(userId)
    setSaving(null)
  }

  // ── Add credits ───────────────────────────────
  const handleAddCredits = async (userId, amount) => {
    if (!amount || amount === 0) return
    setSaving(userId + '_credit')
    await updateDoc(doc(db, 'users', userId), {
      credits: increment(amount)
    })
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, credits: (u.credits ?? 0) + amount } : u
    ))
    setCreditInput(prev => ({ ...prev, [userId]: '' }))
    showSuccess(userId + '_credit')
    setSaving(null)
  }

  // ── Delete user ───────────────────────────────
  const handleDelete = async (userId) => {
    if (!confirm('Supprimer cet utilisateur ? Cette action est irréversible.')) return
    setDeleting(userId)
    await deleteDoc(doc(db, 'users', userId))
    setUsers(prev => prev.filter(u => u.id !== userId))
    setDeleting(null)
  }

  const showSuccess = (id) => {
    setSuccess(id)
    setTimeout(() => setSuccess(null), 2000)
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (!user || user.email !== ADMIN_EMAIL) return null

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
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
          <button
            onClick={loadUsers}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors border border-slate-200 rounded-xl px-4 py-2 hover:border-indigo-200">
            <RefreshCw size={13}/> Actualiser
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(PLAN_CREDITS).map(([plan, credits]) => {
            const count = users.filter(u => (u.plan || 'free') === plan).length
            return (
              <div key={plan} className={`rounded-2xl px-5 py-4 border ${PLAN_COLORS[plan]} border-current/10`}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{plan}</p>
                <p className="text-2xl font-black">{count}</p>
                <p className="text-[10px] font-medium opacity-60">utilisateurs</p>
              </div>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par email ou nom..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 bg-white"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100">
            <span className="col-span-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Utilisateur</span>
            <span className="col-span-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
            <span className="col-span-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Crédits</span>
            <span className="col-span-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</span>
            <span className="col-span-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</span>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Aucun utilisateur trouvé</div>
          ) : (
            filtered.map(u => (
              <div key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                <div className="grid grid-cols-12 gap-2 px-6 py-4 items-center">

                  {/* Name */}
                  <div className="col-span-3">
                    <p className="text-sm font-bold text-slate-900 truncate">{u.name || '—'}</p>
                    <p className="text-[10px] text-slate-400 truncate font-mono">{u.id.slice(0, 10)}...</p>
                  </div>

                  {/* Email */}
                  <div className="col-span-3">
                    <p className="text-xs text-slate-600 truncate">{u.email}</p>
                    <p className="text-[10px] text-slate-400">
                      {u.createdAt?.toDate?.()?.toLocaleDateString('fr-FR') || '—'}
                    </p>
                  </div>

                  {/* Credits + adjust */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-sm font-black text-indigo-600">⚡ {u.credits ?? 0}</span>
                      {success === u.id + '_credit' && (
                        <Check size={12} className="text-emerald-500" strokeWidth={3}/>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        placeholder="N"
                        value={creditInput[u.id] || ''}
                        onChange={e => setCreditInput(prev => ({ ...prev, [u.id]: parseInt(e.target.value) || '' }))}
                        className="w-12 text-xs border border-slate-200 rounded-lg px-1.5 py-1 outline-none focus:border-indigo-400 text-center"
                      />
                      <button
                        onClick={() => handleAddCredits(u.id, creditInput[u.id] || 10)}
                        disabled={saving === u.id + '_credit'}
                        title="Ajouter crédits"
                        className="w-6 h-6 bg-emerald-100 hover:bg-emerald-500 hover:text-white text-emerald-600 rounded-lg flex items-center justify-center transition-all">
                        <Plus size={11} strokeWidth={3}/>
                      </button>
                      <button
                        onClick={() => handleAddCredits(u.id, -(creditInput[u.id] || 10))}
                        disabled={saving === u.id + '_credit'}
                        title="Retirer crédits"
                        className="w-6 h-6 bg-red-50 hover:bg-red-500 hover:text-white text-red-400 rounded-lg flex items-center justify-center transition-all">
                        <Minus size={11} strokeWidth={3}/>
                      </button>
                    </div>
                  </div>

                  {/* Plan selector */}
                  <div className="col-span-2 flex items-center gap-2">
                    <select
                      value={u.plan || 'free'}
                      onChange={e => handlePlanUpdate(u.id, e.target.value)}
                      disabled={saving === u.id}
                      className="flex-1 text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 cursor-pointer bg-white">
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                    </select>
                    {success === u.id && (
                      <Check size={14} className="text-emerald-500 flex-shrink-0" strokeWidth={3}/>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={deleting === u.id}
                      title="Supprimer l'utilisateur"
                      className="w-8 h-8 bg-red-50 hover:bg-red-500 hover:text-white text-red-300 rounded-xl flex items-center justify-center transition-all disabled:opacity-30">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex gap-4 flex-wrap items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Crédits par plan :</span>
          {Object.entries(PLAN_CREDITS).map(([plan, credits]) => (
            <div key={plan} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{plan}</span>
              <span className="text-xs font-black text-indigo-600">⚡ {credits}</span>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}