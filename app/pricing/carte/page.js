'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Zap, Lock, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const PLAN_NAMES   = { starter: 'Starter', pro: 'Pro', premium: 'Premium' }
const PLAN_CREDITS = { starter: 50, pro: 150, premium: 500 }

// ← Your PayPal email where you receive money
const PAYPAL_EMAIL = 'ibmconsultingservice@gmail.com'

function CarteForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { user }     = useAuth()

  const plan    = searchParams.get('plan')    || 'starter'
  const price   = searchParams.get('price')   || '5600'
  const credits = searchParams.get('credits') || '50'

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user])

  const handlePayPal = () => {
    const priceCFA = parseInt(price)
    // Convert CFA to USD for PayPal (approximate)
    const priceUSD = (priceCFA / 620).toFixed(2)

    const note = encodeURIComponent(
      `Plan ${PLAN_NAMES[plan]} - IA.Business - Email: ${user?.email} - Credits: ${credits}`
    )

    // PayPal.me direct payment link
    const paypalUrl = `https://www.paypal.com/paypalme/${PAYPAL_EMAIL}/${priceUSD}USD`
    window.open(paypalUrl, '_blank')
  }

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Bonjour ! Je viens de payer le forfait *${PLAN_NAMES[plan]}* sur IA.Business via PayPal.\n\n` +
      `📧 Mon email : ${user?.email}\n` +
      `💰 Montant : ${parseInt(price).toLocaleString('fr-FR')} FCFA\n` +
      `⚡ Crédits : ${credits}\n\n` +
      `Merci de confirmer et activer mon compte.`
    )
    window.open(`https://wa.me/221786044910?text=${message}`, '_blank')
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-indigo-100/50 blur-[120px] rounded-full"/>
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-violet-100/50 blur-[120px] rounded-full"/>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <Link href="/pricing" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors mb-8">
          ← Retour aux forfaits
        </Link>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-10">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <Zap size={18} fill="currentColor"/>
            </div>
            <span className="text-lg font-black tracking-tighter uppercase italic">
              IA<span className="text-indigo-600">.BUSINESS</span>
            </span>
          </div>

          {/* Order summary */}
          <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Récapitulatif</p>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-slate-700">Plan {PLAN_NAMES[plan]}</span>
              <span className="text-sm font-black text-slate-900">{parseInt(price).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500">Équivalent USD</span>
              <span className="text-xs font-bold text-slate-700">${(parseInt(price) / 620).toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500">Crédits inclus</span>
              <span className="text-xs font-bold text-indigo-600">⚡ {credits} crédits/mois</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-500">Email</span>
              <span className="text-xs font-bold text-slate-700 truncate ml-4">{user?.email}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
            <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2">📋 Comment ça marche</p>
            <ol className="text-xs text-blue-600 space-y-1 font-medium">
              <li>1. Cliquez "Payer via PayPal" ci-dessous</li>
              <li>2. Effectuez le paiement avec votre carte Visa</li>
              <li>3. Envoyez-nous le justificatif via WhatsApp</li>
              <li>4. Activation de votre plan sous 2h ✅</li>
            </ol>
          </div>

          {/* PayPal Button */}
          <button
            onClick={handlePayPal}
            className="w-full bg-[#0070BA] hover:bg-[#005ea6] text-white rounded-2xl py-4 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.26-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.477z"/>
            </svg>
            Payer via PayPal · ${(parseInt(price) / 620).toFixed(2)} USD
          </button>

          {/* WhatsApp confirm button */}
          <button
            onClick={handleWhatsApp}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3.5 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2">
            <span>📱</span> Confirmer le paiement via WhatsApp
          </button>

          {/* Security */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <Lock size={12} className="text-slate-400"/>
            <span className="text-[10px] text-slate-400 font-medium">Paiement sécurisé · PayPal · SSL</span>
          </div>
          <div className="flex justify-center gap-3 mt-3">
            {['VISA', 'MASTERCARD', 'PAYPAL', 'WAVE', 'OM'].map(b => (
              <span key={b} className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function CartePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"/>
      </div>
    }>
      <CarteForm/>
    </Suspense>
  )
}