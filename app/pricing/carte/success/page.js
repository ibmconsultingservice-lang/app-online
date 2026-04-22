'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

// ── Plan hierarchy ────────────────────────────────────────────────────────────
const PLAN_LEVELS  = { free: 0, starter: 1, pro: 2, premium: 3 }
const PLAN_CREDITS = { starter: 50, pro: 150, premium: 500 }
const PLAN_NAMES   = { starter: 'Starter', pro: 'Pro', premium: 'Premium' }

// ─────────────────────────────────────────────────────────────────────────────
function SuccessContent() {
  const searchParams = useSearchParams()
  const { user }     = useAuth()
  const router       = useRouter()

  const plan    = searchParams.get('plan')
  const userId  = searchParams.get('userId')
  const orderId = searchParams.get('token')  // PayPal returns ?token=ORDER_ID

  const [status, setStatus]         = useState('loading') // loading | success | error
  const [errorMsg, setErrorMsg]     = useState('')
  const [finalCredits, setFinalCredits] = useState(null)
  const [finalPlan, setFinalPlan]       = useState(null)

  useEffect(() => {
    if (!userId || !plan || !orderId) {
      setStatus('error')
      setErrorMsg('Paramètres manquants dans l\'URL.')
      return
    }

    activatePlan()
  }, [])

  const activatePlan = async () => {
    try {
      // 1. Capture PayPal order (confirms the payment server-side)
      const captureRes = await fetch('/api/payment/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, userId, plan }),
      })
      const captureData = await captureRes.json()

      // Allow to continue even if capture already done (idempotent)
      if (!captureData.success && captureData.error !== 'ORDER_ALREADY_CAPTURED') {
        throw new Error(captureData.error || 'Échec de la capture PayPal')
      }

      // 2. Read current user document from Firestore
      const userRef  = doc(db, 'users', userId)
      const userSnap = await getDoc(userRef)

      let currentCredits = 0
      let currentPlan    = 'free'

      if (userSnap.exists()) {
        const data   = userSnap.data()
        currentCredits = data.credits ?? 0
        currentPlan    = data.plan    ?? 'free'
      }

      // 3. Determine new plan (only upgrade, never downgrade)
      const newPlanLevel     = PLAN_LEVELS[plan]     ?? 0
      const currentPlanLevel = PLAN_LEVELS[currentPlan] ?? 0
      const upgradedPlan     = newPlanLevel > currentPlanLevel ? plan : currentPlan

      // 4. Credits to add = credits of the purchased plan
      const creditsToAdd = PLAN_CREDITS[plan] ?? 0
      const newCredits   = currentCredits + creditsToAdd

      // 5. Write back to Firestore
      await updateDoc(userRef, {
        plan:      upgradedPlan,
        credits:   newCredits,
        updatedAt: new Date().toISOString(),
      })

      setFinalPlan(upgradedPlan)
      setFinalCredits(newCredits)
      setStatus('success')

    } catch (err) {
      console.error('[success] activation error:', err)
      setErrorMsg(err.message || 'Une erreur est survenue.')
      setStatus('error')
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-12 max-w-md w-full text-center shadow-xl flex flex-col items-center gap-5">
        <Loader2 size={40} className="text-indigo-600 animate-spin"/>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Activation en cours…</p>
        <p className="text-xs text-slate-400">Vérification du paiement et mise à jour de votre compte</p>
      </div>
    </div>
  )

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white border border-red-200 rounded-3xl p-12 max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={36} className="text-red-500"/>
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-3">Problème d'activation</h2>
        <p className="text-sm text-slate-500 mb-6">{errorMsg}</p>
        <p className="text-xs text-slate-400 mb-8">
          Votre paiement a peut-être été effectué. Contactez-nous via WhatsApp pour activation manuelle.
        </p>
        <div className="flex flex-col gap-3">
          <a href="https://wa.me/221786044910" target="_blank"
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all">
            📱 Contacter via WhatsApp
          </a>
          <button onClick={() => router.push('/dashboard')}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">
            Aller au Dashboard quand même →
          </button>
        </div>
      </div>
    </div>
  )

  // ── Success ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white border border-emerald-200 rounded-3xl p-12 max-w-md w-full text-center shadow-xl">

        {/* Animated checkmark */}
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-[bounce_0.6s_ease-out]">
          <CheckCircle size={44} className="text-emerald-500"/>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-3">Paiement confirmé !</h2>

        <p className="text-slate-500 mb-2">
          Plan <span className="font-black text-indigo-600">{PLAN_NAMES[finalPlan] || finalPlan}</span> activé avec succès
        </p>

        {/* Credits info */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 my-6 text-left space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Crédits ajoutés</span>
            <span className="text-sm font-black text-indigo-600">
              +{PLAN_CREDITS[plan] ?? 0} crédits
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
            <span className="text-xs text-slate-500 font-medium">Solde total</span>
            <span className="text-sm font-black text-slate-900">
              ⚡ {finalCredits} crédits
            </span>
          </div>
        </div>

        {/* Downgrade notice if plan wasn't changed (already higher) */}
        {finalPlan !== plan && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4">
            ℹ️ Votre plan <strong>{PLAN_NAMES[finalPlan]}</strong> a été conservé (supérieur au plan acheté). Les crédits ont quand même été ajoutés.
          </p>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25">
          Accéder au Dashboard →
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"/>
      </div>
    }>
      <SuccessContent/>
    </Suspense>
  )
}