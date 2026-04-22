'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

const PLAN_NAMES = { starter: 'Starter', pro: 'Pro', premium: 'Premium' }

function SuccessContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [status, setStatus]         = useState('loading') // 'loading' | 'success' | 'error'
  const [result, setResult]         = useState(null)
  const [errorMsg, setErrorMsg]     = useState('')

  useEffect(() => {
    const orderId = searchParams.get('token')
    const plan    = searchParams.get('plan')
    const userId  = searchParams.get('userId')

    if (!orderId || !userId || !plan) {
      setErrorMsg('Paramètres de paiement manquants dans l\'URL.')
      setStatus('error')
      return
    }

    fetch('/api/payment/paypal/capture', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderId, userId, plan }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setResult(data)
          setStatus('success')
        } else {
          throw new Error(data.error || 'Activation échouée')
        }
      })
      .catch(err => {
        console.error('[success page]', err)
        setErrorMsg(err.message)
        setStatus('error')
      })
  }, [])

  // ── Loading ──
  if (status === 'loading') return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-12 max-w-md w-full text-center shadow-xl space-y-5">
        <Loader2 size={40} className="text-indigo-500 animate-spin mx-auto"/>
        <h2 className="text-xl font-black text-slate-800">Activation en cours...</h2>
        <p className="text-slate-400 text-sm">Confirmation du paiement et mise à jour de votre compte</p>
        <div className="space-y-2 text-left">
          {[
            '✓ Vérification du paiement PayPal',
            '✓ Lecture de votre compte',
            '⏳ Mise à jour du plan et des crédits',
          ].map((step, i) => (
            <p key={i} className="text-xs text-slate-400">{step}</p>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Error ──
  if (status === 'error') return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white border border-red-200 rounded-3xl p-12 max-w-md w-full text-center shadow-xl space-y-5">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={36} className="text-red-500"/>
        </div>
        <h2 className="text-xl font-black text-slate-800">Problème d'activation</h2>
        <p className="text-slate-500 text-sm">
          Votre paiement a été reçu mais l'activation automatique a échoué.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-mono text-left break-all">
          {errorMsg}
        </div>
        <p className="text-slate-400 text-xs">
          Contactez le support avec votre ID de transaction PayPal.
          Votre compte sera activé manuellement sous 24h.
        </p>
        <div className="flex gap-3">
          <Link href="/dashboard"
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm text-center transition-all">
            Dashboard
          </Link>
          <a href="mailto:support@example.com"
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm text-center transition-all">
            Contacter Support
          </a>
        </div>
      </div>
    </div>
  )

  // ── Success ──
  const planName    = PLAN_NAMES[result?.plan] || result?.plan || '—'
  const prevPlan    = PLAN_NAMES[result?.previousPlan] || result?.previousPlan
  const wasUpgraded = result?.plan !== result?.previousPlan
  const keptPlan    = !wasUpgraded && result?.previousPlan && result?.previousPlan !== 'free'

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white border border-emerald-200 rounded-3xl p-12 max-w-md w-full text-center shadow-xl space-y-5">

        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={36} className="text-emerald-500"/>
        </div>

        <h2 className="text-2xl font-black text-slate-900">Paiement confirmé !</h2>

        {/* Plan status */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-1">
          <p className="text-slate-500 text-sm">
            Plan actif :{' '}
            <span className="font-black text-indigo-600">{planName}</span>
          </p>
          {keptPlan && (
            <p className="text-xs text-slate-400">
              (Votre plan <span className="font-bold">{prevPlan}</span> a été conservé car il est supérieur)
            </p>
          )}
          {wasUpgraded && prevPlan && prevPlan !== 'free' && (
            <p className="text-xs text-slate-400">
              Mis à niveau depuis <span className="font-bold">{prevPlan}</span>
            </p>
          )}
        </div>

        {/* Credits */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-1">
          <p className="text-slate-500 text-sm">
            ⚡ <span className="font-black text-emerald-600">+{result?.creditsAdded} crédits</span> ajoutés
          </p>
          <p className="text-slate-500 text-sm">
            Solde total :{' '}
            <span className="font-black text-slate-800">{result?.credits} crédits</span>
          </p>
        </div>

        <Link href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 w-full">
          Accéder au Dashboard →
        </Link>

        <p className="text-xs text-slate-400">
          Vos crédits sont maintenant disponibles dans tous les outils.
        </p>
      </div>
    </div>
  )
}

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