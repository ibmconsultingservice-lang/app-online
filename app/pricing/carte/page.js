'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Zap, Lock, XCircle } from 'lucide-react'
import Link from 'next/link'

const PLAN_NAMES = { starter: 'Starter', pro: 'Pro', premium: 'Premium' }

// ── Same currency config as pricing/page.js ───────────────────────────────
const CURRENCY_CONFIG = {
  CFA: { code: 'CFA', symbol: 'FCFA', fromUSD: 620,  round: (v) => Math.round(v / 100) * 100, format: (v) => v.toLocaleString('fr-FR'), countries: ['SN','ML','BF','CI','BJ','TG','NE','CM','CF','TD','CG','GA','GQ','CD'] },
  GNF: { code: 'GNF', symbol: 'GNF',  fromUSD: 8600, round: (v) => Math.round(v / 1000) * 1000, format: (v) => v.toLocaleString('fr-FR'), countries: ['GN'] },  // ← ajout GNF
  NGN: { code: 'NGN', symbol: '₦',    fromUSD: 1600, round: (v) => Math.round(v / 100) * 100, format: (v) => v.toLocaleString('fr-FR'), countries: ['NG'] },
  GHS: { code: 'GHS', symbol: 'GHS',  fromUSD: 15,   round: (v) => Math.round(v * 10) / 10,   format: (v) => v.toFixed(2),              countries: ['GH'] },
  KES: { code: 'KES', symbol: 'KSh',  fromUSD: 130,  round: (v) => Math.round(v),              format: (v) => v.toLocaleString('fr-FR'), countries: ['KE','TZ','UG','RW','ET'] },
  MAD: { code: 'MAD', symbol: 'MAD',  fromUSD: 10,   round: (v) => Math.round(v * 10) / 10,   format: (v) => v.toFixed(2),              countries: ['MA','DZ','TN'] },
  EUR: { code: 'EUR', symbol: '€',    fromUSD: 0.92, round: (v) => Math.round(v * 100) / 100, format: (v) => v.toFixed(2),              countries: ['FR','BE','DE','ES','IT','PT','NL','CH','LU','MC','RE','GP','MQ','GF','PM','YT'] },
  GBP: { code: 'GBP', symbol: '£',   fromUSD: 0.79, round: (v) => Math.round(v * 100) / 100, format: (v) => v.toFixed(2),              countries: ['GB'] },
  CAD: { code: 'CAD', symbol: 'CA$',  fromUSD: 1.36, round: (v) => Math.round(v * 100) / 100, format: (v) => v.toFixed(2),              countries: ['CA'] },
  USD: { code: 'USD', symbol: '$',    fromUSD: 1,    round: (v) => Math.round(v * 100) / 100, format: (v) => v.toFixed(2),              countries: [] },
}

// Plan base prices in USD
const PLAN_USD = { starter: 9, pro: 19, premium: 39 }

function getCurrencyForCountry(code) {
  for (const cfg of Object.values(CURRENCY_CONFIG)) {
    if (cfg.countries.includes(code)) return cfg
  }
  return CURRENCY_CONFIG.USD
}

function formatPrice(usdPrice, currency) {
  const raw = usdPrice * currency.fromUSD
  const rounded = currency.round(raw)
  return `${currency.format(rounded)} ${currency.symbol}`
}

// ─────────────────────────────────────────────────────────────────────────────

function CarteForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { user }     = useAuth()

  const plan    = searchParams.get('plan')    || 'starter'
  const credits = searchParams.get('credits') || '50'
  // price in FCFA kept for PayPal backend (unchanged)
  const priceFCFA = parseInt(searchParams.get('price') || '5600')
  const usdPrice  = PLAN_USD[plan] || priceFCFA / 620

  const [status, setStatus]   = useState('idle')
  const [error, setError]     = useState('')
  const [currency, setCurrency] = useState(CURRENCY_CONFIG.CFA)
  const [loadingGeo, setLoadingGeo] = useState(true)

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user])

  useEffect(() => {
    async function detectCountry() {
      try {
        const res  = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        setCurrency(getCurrencyForCountry(data.country_code))
      } catch {
        // fallback to CFA
      } finally {
        setLoadingGeo(false)
      }
    }
    detectCountry()
  }, [])

  // ── PayPal API (amount always in USD, unchanged) ──
  const handlePayPal = async () => {
    if (!user) return
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/payment/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:    priceFCFA,
          plan:      plan,
          credits:   parseInt(credits),
          userEmail: user.email,
          userId:    user.uid,
        })
      })
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        throw new Error(data.error || 'Erreur PayPal')
      }
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  // ── WhatsApp fallback ──
  const handleWhatsApp = () => {
    const priceFormatted = formatPrice(usdPrice, currency)
    const message = encodeURIComponent(
      `Bonjour ! Je souhaite souscrire au forfait *${PLAN_NAMES[plan]}* sur IA.Business.\n\n` +
      `📧 Mon email : ${user?.email}\n` +
      `💰 Montant : ${priceFormatted}/mois\n` +
      `⚡ Crédits : ${credits}\n\n` +
      `Merci de me confirmer les modalités de paiement (Wave, Orange Money, etc.)`
    )
    window.open(`https://wa.me/447897037884?text=${message}`, '_blank')
  }

  const localPrice    = formatPrice(usdPrice, currency)
  const usdEquivalent = `$${usdPrice.toFixed(2)} USD`

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
              <span className="text-sm font-black text-slate-900">
                {loadingGeo ? (
                  <span className="animate-pulse text-slate-400">Calcul…</span>
                ) : localPrice}
              </span>
            </div>
            {currency.code !== 'USD' && !loadingGeo && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500">Équivalent USD</span>
                <span className="text-xs font-bold text-slate-700">{usdEquivalent}</span>
              </div>
            )}
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
              <li>2. Connectez-vous à PayPal ou payez par carte</li>
              <li>3. Vous êtes redirigé automatiquement</li>
              <li>4. Votre plan est activé instantanément ✅</li>
            </ol>
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
              <XCircle size={16} className="text-red-500 flex-shrink-0"/>
              <p className="text-xs text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* PayPal Button */}
          <button
            onClick={handlePayPal}
            disabled={status === 'loading'}
            className="w-full bg-[#0070BA] hover:bg-[#005ea6] text-white rounded-2xl py-4 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 mb-3 disabled:opacity-50">
            {status === 'loading' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Connexion à PayPal...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.26-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.477z"/>
                </svg>
                Payer via PayPal · {usdEquivalent}
              </>
            )}
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3.5 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2">
            <span>📱</span> Payer via WhatsApp (Wave / Orange Money)
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