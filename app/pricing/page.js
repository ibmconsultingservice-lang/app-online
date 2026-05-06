'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Check, LogOut, CreditCard } from 'lucide-react'
import { useState, useEffect } from 'react'

const USD_TO_CFA = 620
const EUR_TO_CFA = 655

const CURRENCY_CONFIG = {
  CFA: {
    code: 'CFA', symbol: 'FCFA', fromUSD: USD_TO_CFA,
    round: (v) => Math.round(v / 100) * 100,
    format: (v) => v.toLocaleString('fr-FR'),
    countries: ['SN','ML','BF','CI','BJ','TG','NE','GN','CM','CF','TD','CG','GA','GQ','CD'],
  },
  NGN: {
    code: 'NGN', symbol: '₦', fromUSD: 1600,
    round: (v) => Math.round(v / 100) * 100,
    format: (v) => v.toLocaleString('fr-FR'),
    countries: ['NG'],
  },
  GHS: {
    code: 'GHS', symbol: 'GHS', fromUSD: 15,
    round: (v) => Math.round(v * 10) / 10,
    format: (v) => v.toFixed(2),
    countries: ['GH'],
  },
  KES: {
    code: 'KES', symbol: 'KSh', fromUSD: 130,
    round: (v) => Math.round(v),
    format: (v) => v.toLocaleString('fr-FR'),
    countries: ['KE','TZ','UG','RW','ET'],
  },
  MAD: {
    code: 'MAD', symbol: 'MAD', fromUSD: 10,
    round: (v) => Math.round(v * 10) / 10,
    format: (v) => v.toFixed(2),
    countries: ['MA','DZ','TN'],
  },
  EUR: {
    code: 'EUR', symbol: '€', fromUSD: 0.92,
    round: (v) => Math.round(v * 100) / 100,
    format: (v) => v.toFixed(2),
    countries: ['FR','BE','DE','ES','IT','PT','NL','CH','LU','MC','RE','GP','MQ','GF','PM','YT'],
  },
  GBP: {
    code: 'GBP', symbol: '£', fromUSD: 0.79,
    round: (v) => Math.round(v * 100) / 100,
    format: (v) => v.toFixed(2),
    countries: ['GB'],
  },
  CAD: {
    code: 'CAD', symbol: 'CA$', fromUSD: 1.36,
    round: (v) => Math.round(v * 100) / 100,
    format: (v) => v.toFixed(2),
    countries: ['CA'],
  },
  USD: {
    code: 'USD', symbol: '$', fromUSD: 1,
    round: (v) => Math.round(v * 100) / 100,
    format: (v) => v.toFixed(2),
    countries: [],
  },
}

function getCurrencyForCountry(countryCode) {
  for (const [, cfg] of Object.entries(CURRENCY_CONFIG)) {
    if (cfg.countries.includes(countryCode)) return cfg
  }
  return CURRENCY_CONFIG.USD
}

function formatPrice(usdPrice, currency) {
  const raw = usdPrice * currency.fromUSD
  const rounded = currency.round(raw)
  return `${currency.format(rounded)} ${currency.symbol}`
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    emoji: '⚡',
    priceUSD: 9,
    credits: 50,
    popular: false,
    features: ['CV Builder', 'Générateur de Factures', 'Audio Transcription', 'Doc Repairer', '50 crédits / mois', 'Support email'],
    locked: ['Business IA', 'PPTX Genius', 'Téléchargements Word/Excel', 'Cours en ligne'],
  },
  {
    id: 'pro',
    name: 'Pro',
    emoji: '🚀',
    priceUSD: 19,
    credits: 150,
    popular: true,
    features: ['Tout Starter inclus', 'Business IA', 'PPTX Genius', 'Business Plan', '150 crédits / mois', 'Support prioritaire'],
    locked: ['Téléchargements Word/Excel', 'Cours en ligne'],
  },
  {
    id: 'premium',
    name: 'Premium',
    emoji: '👑',
    priceUSD: 39,
    credits: 500,
    popular: false,
    features: ['Tout Pro inclus', 'Téléchargements Word/Excel/PowerBI', 'Templates professionnels', 'Cours en ligne', '500 crédits / mois', 'Support WhatsApp dédié'],
    locked: [],
  },
]

const WHATSAPP_NUMBER = '447897037884'

// ── NEW: Promo Banner Component ──
function PromoBanner({ onWhatsApp }) {
  const [visible, setVisible] = useState(true)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1200)
    return () => clearInterval(interval)
  }, [])

  if (!visible) return null

  const handlePromo = () => {
    const message = encodeURIComponent(
      `🔥 PROMO MAI-JUIN 2026 🔥\n\n` +
      `Je souhaite profiter de l'offre exceptionnelle :\n` +
      `✅ Souscrire au forfait *Starter* et recevoir le forfait *Premium* activé !\n\n` +
      `📧 Mon email : (à préciser)\n\n` +
      `Merci de me confirmer les modalités.`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank')
  }

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 mb-10">
      <div className="relative overflow-hidden rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #4c1d95 70%, #7c3aed 100%)',
          boxShadow: '0 25px 60px rgba(124,58,237,0.4)',
        }}>

        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i}
              className="absolute rounded-full opacity-20"
              style={{
                width: `${60 + i * 30}px`,
                height: `${60 + i * 30}px`,
                background: i % 2 === 0 ? '#a78bfa' : '#f59e0b',
                top: `${10 + i * 12}%`,
                left: `${5 + i * 15}%`,
                animation: `float${i % 3} ${3 + i}s ease-in-out infinite alternate`,
                filter: 'blur(20px)',
              }}
            />
          ))}
          {/* Stars */}
          {[...Array(12)].map((_, i) => (
            <div key={`star-${i}`}
              className="absolute text-yellow-300"
              style={{
                fontSize: `${8 + (i % 4) * 4}px`,
                top: `${Math.random() * 80 + 10}%`,
                left: `${Math.random() * 90 + 5}%`,
                animation: `twinkle ${1.5 + (i % 3) * 0.5}s ease-in-out infinite alternate`,
                opacity: 0.6 + (i % 3) * 0.2,
              }}>
              ★
            </div>
          ))}
        </div>

        {/* Close button */}
        <button onClick={() => setVisible(false)}
          className="absolute top-4 right-4 z-20 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm">
          ✕
        </button>

        <div className="relative z-10 px-8 py-10 md:px-14 md:py-12 flex flex-col md:flex-row items-center gap-8">

          {/* Left — Text */}
          <div className="flex-1 text-center md:text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 rounded-full px-4 py-1.5 mb-5">
              <span className="text-yellow-300 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                🔥 Offre Limitée · Mai — Juin 2026
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
              Promotion{' '}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)', backgroundSize: '200%', animation: 'shimmer 2s linear infinite' }}>
                Exceptionnelle
              </span>
            </h2>

            {/* Offer */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-6">
              <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-5 py-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="text-white font-black text-sm">Forfait Starter</p>
                  <p className="text-violet-300 text-xs font-bold">Vous payez</p>
                </div>
              </div>

              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-400 text-slate-900 font-black text-lg flex-shrink-0">
                →
              </div>

              <div className="flex items-center gap-2 bg-yellow-400/20 border-2 border-yellow-400/60 rounded-2xl px-5 py-3 relative">
                <div className="absolute -top-2.5 -right-2.5 bg-yellow-400 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Vous recevez
                </div>
                <span className="text-2xl">👑</span>
                <div>
                  <p className="text-white font-black text-sm">Forfait Premium</p>
                  <p className="text-yellow-300 text-xs font-bold">Activé gratuitement !</p>
                </div>
              </div>
            </div>

            {/* Countdown text */}
            <p className="text-violet-300 text-xs font-medium">
              ⏳ Offre valable jusqu'au <strong className="text-white">30 Juin 2026</strong> · Places limitées
            </p>
          </div>

          {/* Right — CTA */}
          <div className="flex flex-col items-center gap-4 flex-shrink-0">

            {/* Price badge */}
            <div className="text-center">
              <div className="text-slate-400 line-through text-sm font-bold">Valeur : 39$/mois</div>
              <div className="text-white font-black text-3xl">9$ <span className="text-violet-300 text-lg font-bold">/mois</span></div>
              <div className="text-yellow-300 text-xs font-black uppercase tracking-widest mt-1">Économisez 77% 🎉</div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handlePromo}
              className="relative group px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-900 overflow-hidden transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
              <span className="relative z-10 flex items-center gap-2">
                📱 Souscrire maintenant
              </span>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-all"/>
            </button>

            <p className="text-violet-300 text-[10px] font-medium text-center max-w-[200px]">
              Via WhatsApp · Activation sous 2h · Paiement Wave / Orange Money / PayPal
            </p>
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="relative z-10 border-t border-white/10 px-8 py-3 overflow-hidden">
          <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
            {[...Array(4)].map((_, i) => (
              <span key={i} className="text-[10px] font-black text-violet-300 uppercase tracking-widest flex items-center gap-4">
                <span className="text-yellow-400">★</span> Starter payé → Premium activé
                <span className="text-yellow-400 mx-4">·</span> Offre Mai-Juin 2026
                <span className="text-yellow-400 mx-4">·</span> 500 crédits inclus
                <span className="text-yellow-400 mx-4">·</span> Tous outils débloqués
                <span className="text-yellow-400 mx-4">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 0% }
          100% { background-position: 200% }
        }
        @keyframes twinkle {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes float0 { from { transform: translateY(0px) } to { transform: translateY(-15px) } }
        @keyframes float1 { from { transform: translateY(0px) } to { transform: translateY(-25px) } }
        @keyframes float2 { from { transform: translateY(0px) } to { transform: translateY(-10px) } }
        @keyframes marquee {
          0% { transform: translateX(0%) }
          100% { transform: translateX(-50%) }
        }
        .animate-marquee {
          animation: marquee 18s linear infinite;
        }
      `}</style>
    </div>
  )
}

function PlanCard({ plan, onWhatsApp, onCard, currency }) {
  const priceFormatted = formatPrice(plan.priceUSD, currency)
  const usdLabel = currency.code !== 'USD' ? `$${plan.priceUSD} USD` : null

  return (
    <div className={`relative bg-white border-2 ${
      plan.popular ? 'border-violet-500 shadow-2xl shadow-violet-500/20' : 'border-slate-200'
    } rounded-3xl p-8 flex flex-col`}>

      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
          Le plus populaire
        </div>
      )}

      <div className="mb-6">
        <div className="text-3xl mb-3">{plan.emoji}</div>
        <h3 className="text-xl font-black text-slate-900">Niveau {plan.name}</h3>
        <div className="mt-4">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-4xl font-black text-slate-900">{priceFormatted}</span>
            <span className="text-slate-400 text-sm">/mois</span>
          </div>
          {usdLabel && (
            <div className="mt-1">
              <span className="text-xs text-slate-400">{usdLabel}</span>
            </div>
          )}
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
          <Zap size={12} fill="currentColor"/> {plan.credits} crédits/mois
        </div>
      </div>

      <div className="flex-1 space-y-3 mb-8">
        {plan.features.map(f => (
          <div key={f} className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check size={10} className="text-emerald-600" strokeWidth={3}/>
            </div>
            <span className="text-sm text-slate-700 font-medium">{f}</span>
          </div>
        ))}
        {plan.locked.map(f => (
          <div key={f} className="flex items-start gap-2.5 opacity-35">
            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[8px]">🔒</span>
            </div>
            <span className="text-sm text-slate-400 font-medium line-through">{f}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => onCard(plan)}
          className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            plan.popular
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25'
              : plan.id === 'premium'
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25'
              : 'bg-slate-900 hover:bg-indigo-600 text-white'
          }`}>
          <CreditCard size={14}/> Payer par carte Visa
        </button>

        <button
          onClick={() => onWhatsApp(plan)}
          className="w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
          <span>📱</span> Souscrire via WhatsApp
        </button>
      </div>
    </div>
  )
}

export default function PricingPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [currency, setCurrency] = useState(CURRENCY_CONFIG.CFA)
  const [countryCode, setCountryCode] = useState(null)
  const [loadingGeo, setLoadingGeo] = useState(true)

  useEffect(() => {
    async function detectCountry() {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        const code = data.country_code
        setCountryCode(code)
        setCurrency(getCurrencyForCountry(code))
      } catch {
        // silently fall back to CFA default
      } finally {
        setLoadingGeo(false)
      }
    }
    detectCountry()
  }, [])

  const handleWhatsApp = (plan) => {
    const priceFormatted = formatPrice(plan.priceUSD, currency)
    const userEmail = user?.email || 'non connecté'
    const message = encodeURIComponent(
      `Bonjour ! Je souhaite souscrire au forfait *${plan.name}* sur IA.Business.\n\n` +
      `📧 Mon email : ${userEmail}\n` +
      `💰 Montant : ${priceFormatted}/mois\n` +
      `⚡ Crédits : ${plan.credits} crédits\n\n` +
      `Merci de me confirmer les modalités de paiement (Wave, Orange Money, etc.)`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank')
  }

  const handleCard = (plan) => {
    const priceCFA = Math.round(plan.priceUSD * USD_TO_CFA / 100) * 100
    router.push(`/pricing/carte?plan=${plan.id}&credits=${plan.credits}&price=${priceCFA}`)
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-indigo-100/50 blur-[120px] rounded-full"/>
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-violet-100/50 blur-[120px] rounded-full"/>
      </div>

      <nav className="relative z-50 max-w-7xl mx-auto px-6 md:px-12 py-6 flex justify-between items-center border-b border-slate-200/60">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
            <Zap size={20} fill="currentColor"/>
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">
            IA<span className="text-indigo-600">.BUSINESS</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="h-10 px-5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center shadow-md">
                Dashboard
              </Link>
              <button onClick={() => { logout(); router.push('/') }}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-500 transition-all">
                <LogOut size={15}/>
              </button>
            </>
          ) : (
            <Link href="/register" className="h-10 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center shadow-md">
              Commencer →
            </Link>
          )}
        </div>
      </nav>

      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-8 shadow-sm">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
          Paiement sécurisé via Carte Visa · Wave · Orange Money · WhatsApp
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] mb-6">
          Choisissez votre <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">
            niveau d'accès
          </span>
        </h1>
        <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
          Prix en {currency.code} · Paiement par carte Visa, Wave ou Orange Money. Activation automatique.
        </p>

        <div className="mt-6 inline-flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-6 py-3 shadow-sm">
          {loadingGeo ? (
            <span className="text-xs text-slate-400 font-bold animate-pulse">Détection de votre devise…</span>
          ) : (
            <>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                {countryCode ? `📍 ${countryCode}` : '🌍 International'}
              </span>
              <span className="text-xs font-black text-slate-700">
                Devise : {currency.symbol} {currency.code}
              </span>
              {currency.code !== 'USD' && (
                <span className="text-xs font-black text-slate-700">
                  1 USD ≈ {currency.fromUSD} {currency.code}
                </span>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── NEW: Promo Banner inserted here ── */}
      <PromoBanner onWhatsApp={handleWhatsApp} />

      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} onWhatsApp={handleWhatsApp} onCard={handleCard} currency={currency}/>
          ))}
        </div>

        <div className="mt-16 bg-white border border-slate-200 rounded-3xl p-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">
            ✅ Toujours gratuit — sans inscription requise
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '🖼️', name: 'Remove Background', desc: 'Suppression de fond instantanée' },
              { icon: '📎', name: 'PDF Merger', desc: 'Fusionner vos fichiers PDF' },
              { icon: '📤', name: 'Office to PDF', desc: 'Convertir Word/Excel en PDF' },
            ].map(tool => (
              <div key={tool.name} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
                <span className="text-2xl">{tool.icon}</span>
                <div>
                  <p className="text-sm font-black text-slate-900">{tool.name}</p>
                  <p className="text-xs text-slate-500">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Une question ?{' '}
            <a href="mailto:contact@iabusinessevo.com" className="text-indigo-600 font-bold hover:underline">
              contact@iabusinessevo.com
            </a>
            {' · '}
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" className="text-emerald-600 font-bold hover:underline">
              WhatsApp direct
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}