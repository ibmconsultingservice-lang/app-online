'use client'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import AuthGuard from '@/components/AuthGuard'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, LogOut, ArrowRight, Lock } from 'lucide-react'

const PLAN_LEVELS = { free: 0, starter: 0, pro: 1, premium: 2 }

const TOOLS = [
  // ── Gratuit ──────────────────────────────────────────────────────────────
  { icon: '📎', name: 'PDF Merger',          desc: 'Fusionner vos fichiers PDF',            path: '/pdfmerger',     cost: 0, plan: 'free'    },
  { icon: '📤', name: 'Office to PDF',       desc: 'Convertir Word/Excel en PDF',           path: '/office2pdf',    cost: 0, plan: 'free'    },

  // ── Starter ───────────────────────────────────────────────────────────────
  { icon: '🧠', name: 'Business IA',         desc: 'Stratégie & négociation IA',            path: '/business-ia',   cost: 2, plan: 'starter' },
  { icon: '📄', name: 'CV Builder',          desc: 'CV professionnel en PDF',               path: '/cv',            cost: 2, plan: 'starter' },
  { icon: '🎙️', name: 'Audio Trans',         desc: 'Transcription audio précise',           path: '/AudioTrans',    cost: 1, plan: 'starter' },
  { icon: '🧾', name: 'Facture',             desc: 'Génération de factures pro',            path: '/facture',       cost: 1, plan: 'starter' },
  { icon: '📝', name: 'Lettres',             desc: 'Rédiger votre lettre',                  path: '/letter',        cost: 1, plan: 'starter' },
  { icon: '📧', name: 'Email',               desc: 'Email Writer Professional',             path: '/email',         cost: 1, plan: 'starter' },
  { icon: '💳', name: 'Modern Card',         desc: 'Carte de visite moderne',               path: '/CVisite',       cost: 1, plan: 'starter' },
  { icon: '🔧', name: 'Doc Repairer',        desc: 'Correction & réparation de docs',       path: '/docrepairer',   cost: 2, plan: 'starter' },
  { icon: '🔍', name: 'OCR Vision',          desc: 'Extraction de texte depuis image',      path: '/ocr-vision',    cost: 1, plan: 'starter' },
  { icon: '📑', name: 'Pdf Convert',         desc: 'Convertisseur de PDF en fichier',       path: '/pdfconvert',    cost: 1, plan: 'starter' },

  // ── Pro ───────────────────────────────────────────────────────────────────
  { icon: '🖥️', name: 'PPTX Genius',        desc: 'Présentations PowerPoint IA',           path: '/pptxgenius',    cost: 3, plan: 'pro'     },
  { icon: '📊', name: 'Business Plan',       desc: "Plan d'affaires complet",               path: '/Businessplan',  cost: 4, plan: 'pro'     },
  { icon: '📅', name: 'Project Planner',     desc: 'Planifier votre projet',                path: '/Planner',       cost: 2, plan: 'pro'     },
  { icon: '🔥', name: 'Finance Analysis',    desc: 'Analyse de vos chiffres',               path: '/FinanceAi',     cost: 3, plan: 'pro'     },
  { icon: '🔍', name: 'Document Analyser',   desc: 'Analyse approfondie de document',       path: '/docanalyser',   cost: 2, plan: 'pro'     },
  { icon: '⚖️', name: 'Contract Generator',  desc: 'Générer tout type de contrat',          path: '/Contract',      cost: 3, plan: 'pro'     },

  // ── Premium ───────────────────────────────────────────────────────────────
  { icon: '🔥', name: 'Dashboard Ai',        desc: 'Tableau de bord personnalisé',          path: '/DashboardAi',   cost: 0, plan: 'premium' },
  { icon: '👩‍🦰', name: 'Image Generator',    desc: "Générateur d'image IA",                 path: '/Imagegen',      cost: 2, plan: 'premium' },
  { icon: '🤳', name: 'Capture Me',          desc: 'Embellissez vos photos',                path: '/Capture',       cost: 2, plan: 'premium' },
  { icon: '🚀', name: 'Workflow',            desc: 'Générer workflow automatisé',            path: '/workflow',      cost: 3, plan: 'premium' },
  { icon: '🔥', name: 'Post Generator',      desc: 'Générer un post réseaux sociaux',       path: '/PostGenerator', cost: 1, plan: 'premium' },
]

const PLAN_LABELS = {
  free:    { label: 'Gratuit', color: 'bg-slate-100 text-slate-500' },
  starter: { label: 'Starter', color: 'bg-indigo-50 text-indigo-600' },
  pro:     { label: 'Pro',     color: 'bg-violet-50 text-violet-600' },
  premium: { label: 'Premium', color: 'bg-amber-50 text-amber-600' },
}

const SECTIONS = [
  {
    plan: 'free',
    label: '✅ Gratuit',
    upgradeMsg: null,
  },
  {
    plan: 'starter',
    label: '⚡ Starter',
    upgradeMsg: 'Débloquez CV, Facture, Audio Trans et plus encore.',
  },
  {
    plan: 'pro',
    label: '🚀 Pro',
    upgradeMsg: 'Débloquez Business IA, PPTX Genius et Business Plan.',
  },
  {
    plan: 'premium',
    label: '👑 Premium',
    upgradeMsg: 'Débloquez les templates Word/Excel et les cours en ligne.',
  },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { credits, plan } = useCredits()
  const router = useRouter()

  const userPlanLevel = PLAN_LEVELS[plan] ?? 0

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleToolClick = (tool) => {
    // Pro et Premium uniquement bloqués pour les free
    if (PLAN_LEVELS[tool.plan] > userPlanLevel) {
      router.push('/pricing')
    } else {
      router.push(tool.path)
    }
  }
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f8fafc] font-sans">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-slate-200 px-6 md:px-10 h-16 flex items-center justify-between sticky top-0 z-50">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
              <Zap size={16} fill="currentColor" />
            </div>
            <span className="text-base font-black tracking-tighter uppercase italic">
              IA<span className="text-indigo-600">.BUSINESS</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Credits */}
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
              <Zap size={12} className="text-indigo-600" fill="currentColor"/>
              <span className="text-xs font-bold text-indigo-700">{credits ?? 0} crédits</span>
            </div>

            {/* Plan badge */}
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              PLAN_LABELS[plan]?.color || 'bg-slate-100 text-slate-500'
            }`}>
              {PLAN_LABELS[plan]?.label || 'Free'}
            </span>

            {/* Upgrade button if not premium */}
            {plan !== 'premium' && (
              <button
                onClick={() => router.push('/pricing')}
                className="h-9 px-4 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all hidden md:flex items-center gap-1">
                Upgrader ↑
              </button>
            )}

            <button
              onClick={handleLogout}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all">
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-1">
              Bonjour {user?.displayName?.split(' ')[0] || user?.name?.split(' ')[0] || 'là'} 👋
            </h1>
            <p className="text-slate-500 text-sm">
              Plan <span className="font-bold text-indigo-600 capitalize">{PLAN_LABELS[plan]?.label || 'Free'}</span>
              {' · '}
              <span className="font-bold text-indigo-600">{credits ?? 0} crédits</span> disponibles
            </p>
          </div>

          {/* Low credits alert */}
          {credits !== null && credits < 3 && plan !== 'free' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-8 flex items-center justify-between gap-4">
              <span className="text-sm text-amber-700 font-medium">
                ⚠️ Crédits faibles — rechargez pour continuer
              </span>
              <button
                onClick={() => router.push('/pricing')}
                className="bg-amber-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-amber-600 transition-all whitespace-nowrap">
                Recharger
              </button>
            </div>
          )}

          {/* ── Tools by section ──────────────────────────────────────────── */}
          {SECTIONS.map((section) => {
            const sectionTools = TOOLS.filter(t => t.plan === section.plan)
            const sectionLocked = PLAN_LEVELS[section.plan] > userPlanLevel

            return (
              <div key={section.plan} className="mb-10">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {section.label}
                  </h2>
                  {sectionLocked && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Lock size={9}/> Nécessite {section.plan}
                    </span>
                  )}
                  <div className="flex-1 h-px bg-slate-100"/>
                </div>

                {/* Tools grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectionTools.map((tool) => {
                    const locked = PLAN_LEVELS[tool.plan] > userPlanLevel
                    return (
                      <div
                        key={tool.path}
                        onClick={() => handleToolClick(tool)}
                        className={`bg-white border rounded-2xl p-5 transition-all duration-200 group relative overflow-hidden ${
                          locked
                            ? 'border-slate-100 opacity-60 cursor-not-allowed'
                            : 'border-slate-200 cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200'
                        }`}>

                        {locked && (
                          <div className="absolute top-3 right-3">
                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                              <Lock size={11} className="text-slate-400"/>
                            </div>
                          </div>
                        )}

                        <div className="text-2xl mb-3">{tool.icon}</div>
                        <h3 className="text-sm font-black text-slate-900 mb-1">{tool.name}</h3>
                        <p className="text-xs text-slate-500 mb-3">{tool.desc}</p>

                        <div className="flex items-center justify-between">
                          {tool.cost > 0 ? (
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                              ⚡ {tool.cost} crédit{tool.cost > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                              ✅ Gratuit
                            </span>
                          )}
                          {!locked && (
                            <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"/>
                          )}
                          {locked && (
                            <span
                              onClick={(e) => { e.stopPropagation(); router.push('/pricing') }}
                              className="text-[10px] font-black text-indigo-600 hover:underline cursor-pointer">
                              Débloquer →
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* ── Upgrade banner ────────────────────────────────────────────── */}
          {plan !== 'premium' && (
            <div className="mt-4 bg-slate-900 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[40%] h-full bg-indigo-600/10 blur-[60px] rounded-full pointer-events-none"/>
              <div className="relative z-10">
                <h3 className="text-lg font-black text-white mb-2">🚀 Passez au niveau supérieur</h3>
                <p className="text-slate-400 text-sm">
                  {plan === 'free'    && 'Débloquez CV, Facture, Audio Trans, Business IA et plus encore.'}
                  {plan === 'starter' && 'Débloquez PPTX Genius, Business Plan, Finance Analysis et plus.'}
                  {plan === 'pro'     && 'Débloquez Dashboard AI, Image Generator, Workflow et Post Generator.'}
                </p>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="relative z-10 bg-white text-slate-900 font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all whitespace-nowrap shadow-lg">
                Voir les forfaits →
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}