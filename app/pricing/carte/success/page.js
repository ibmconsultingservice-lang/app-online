'use client'
import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

const PLAN_CREDITS = { starter: 50, pro: 150, premium: 500 }
const PLAN_NAMES   = { starter: 'Starter', pro: 'Pro', premium: 'Premium' }

function SuccessContent() {
  const searchParams = useSearchParams()
  const { user }     = useAuth()
  const router       = useRouter()

  const plan    = searchParams.get('plan')
  const credits = searchParams.get('credits')
  const userId  = searchParams.get('userId')

  useEffect(() => {
    const orderId = searchParams.get('token')
    const plan    = searchParams.get('plan')
    const userId  = searchParams.get('userId')

    if (orderId && userId && plan) {
      fetch('/api/payment/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, userId, plan })
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          console.log('✅ Plan activé:', plan, '| Crédits ajoutés:', data.creditsAdded)
        } else {
          console.error('❌ Échec:', data.error)
        }
      })
      .catch(console.error)
    }
  }, [searchParams]) // ✅ searchParams dans les dépendances

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white border border-emerald-200 rounded-3xl p-12 max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={36} className="text-emerald-500"/>
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-3">Paiement confirmé !</h2>
        <p className="text-slate-500 mb-2">
          Plan <span className="font-black text-indigo-600">{PLAN_NAMES[plan] || plan}</span> activé avec succès
        </p>
        <p className="text-slate-500 mb-8">
          ⚡ <span className="font-black text-indigo-600">{PLAN_CREDITS[plan] || credits} crédits</span> ajoutés à votre compte
        </p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25">
          Accéder au Dashboard →
        </Link>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"/></div>}>
      <SuccessContent/>
    </Suspense>
  )
}