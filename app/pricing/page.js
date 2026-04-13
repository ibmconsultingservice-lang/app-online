'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Check, LogOut, CreditCard } from 'lucide-react'

const USD_TO_CFA = 620
const EUR_TO_CFA = 655

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

const WHATSAPP_NUMBER = '221786044910'

function PlanCard({ plan, onWhatsApp, onCard }) {
  const priceCFA = Math.round(plan.priceUSD * USD_TO_CFA / 100) * 100

  return (
    <div className={`relative bg-white border-2 ${
      plan.popular ? 'border-violet-500 shadow-2xl shadow-violet-500/20' : 'border-slate-200'
    } rounded-3xl p-8 flex flex-col`}>

      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
          Le plus populaire
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="text-3xl mb-3">{plan.emoji}</div>
        <h3 className="text-xl font-black text-slate-900">Niveau {plan.name}</h3>
        <div className="mt-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900">{priceCFA.toLocaleString('fr-FR')}</span>
            <span className="text-slate-500 font-bold">FCFA</span>
            <span className="text-slate-400 text-sm">/mois</span>
          </div>
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-slate-400">${plan.priceUSD} USD</span>
            <span className="text-xs text-slate-400">{Math.round(plan.priceUSD * EUR_TO_CFA / 100) * 100} EUR</span>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
          <Zap size={12} fill="currentColor"/> {plan.credits} crédits/mois
        </div>
      </div>

      {/* Features */}
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

      {/* ── TWO BUTTONS ── */}
      <div className="flex flex-col gap-3">
        {/* Carte Visa — CinetPay */}
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

        {/* WhatsApp */}
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

  const handleWhatsApp = (plan) => {
    const priceCFA = Math.round(plan.priceUSD * USD_TO_CFA / 100) * 100
    const userEmail = user?.email || 'non connecté'
    const message = encodeURIComponent(
      `Bonjour ! Je souhaite souscrire au forfait *${plan.name}* sur IA.Business.\n\n` +
      `📧 Mon email : ${userEmail}\n` +
      `💰 Montant : ${priceCFA.toLocaleString('fr-FR')} FCFA/mois\n` +
      `⚡ Crédits : ${plan.credits} crédits\n\n` +
      `Merci de me confirmer les modalités de paiement (Wave, Orange Money, etc.)`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank')
  }

  const handleCard = (plan) => {
    // Redirect to card payment page with plan info
    router.push(`/pricing/carte?plan=${plan.id}&credits=${plan.credits}&price=${Math.round(plan.priceUSD * USD_TO_CFA / 100) * 100}`)
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
          Prix en FCFA · Paiement par carte Visa, Wave ou Orange Money. Activation automatique.
        </p>
        <div className="mt-6 inline-flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-6 py-3 shadow-sm">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Taux du jour</span>
          <span className="text-xs font-black text-slate-700">1 USD = {USD_TO_CFA} FCFA</span>
          <span className="text-xs font-black text-slate-700">1 EUR = {EUR_TO_CFA} FCFA</span>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} onWhatsApp={handleWhatsApp} onCard={handleCard}/>
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