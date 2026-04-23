'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Zap, ArrowRight, Shield, Users, Star, LogOut, ChevronDown } from 'lucide-react'

const TOOLS = [
  // ── Free ─────────────────────────────────────────────────────────────────
  
  { icon: '📎', name: 'PDF Merger',          desc: 'Fusionner vos fichiers PDF',            path: '/pdfmerger',     img: '/images/tools/tool-10-pdf-merger.png',    plan: 'free'    },
  { icon: '📤', name: 'Office to PDF',       desc: 'Convertir Word/Excel en PDF',           path: '/office2pdf',    img: '/images/tools/tool-11-office-to-pdf.png', plan: 'free'    },

  // ── Starter ───────────────────────────────────────────────────────────────
  { icon: '🧠', name: 'Business IA',         desc: 'Stratégie & négociation IA',            path: '/business-ia',   img: '/images/tools/tool-01-business-ia.png',   plan: 'starter' },
  { icon: '📄', name: 'CV Builder',          desc: 'CV professionnel en PDF',               path: '/cv',            img: '/images/tools/tool-02-cv-builder.png',    plan: 'starter' },
  { icon: '🎙️', name: 'Audio Trans',         desc: 'Transcription audio précise',           path: '/AudioTrans',    img: '/images/tools/tool-03-audio-trans.png',   plan: 'starter' },
  { icon: '🧾', name: 'Facture',             desc: 'Génération de factures pro',            path: '/facture',       img: '/images/tools/tool-05-facture.png',       plan: 'starter' },
  { icon: '📝', name: 'Lettres',             desc: 'Rédiger votre lettre',                  path: '/letter',        img: '/images/tools/tool-01-letter.png',        plan: 'starter' },
  { icon: '📧', name: 'Email',               desc: 'Email Writer Professional',             path: '/email',         img: '/images/tools/tool-01-email.png',         plan: 'starter' },
  { icon: '💳', name: 'Modern Card',         desc: 'Carte de visite moderne',               path: '/CVisite',       img: '/images/tools/tool-01-visite.png',        plan: 'starter' },
  { icon: '🔧', name: 'Doc Repairer',        desc: 'Correction & réparation de docs',       path: '/docrepairer',   img: '/images/tools/tool-07-doc-repairer.png',  plan: 'starter' },
  { icon: '🔍', name: 'OCR Vision',          desc: 'Extraction de texte depuis image',      path: '/ocr-vision',    img: '/images/tools/tool-08-ocr-vision.png',    plan: 'starter' },
  { icon: '📑', name: 'Pdf Convert',         desc: 'Convertisseur de pdf en fichier',       path: '/pdfconvert',    img: '/images/tools/tool-01-pdfconvert.png',    plan: 'starter' },

  // ── Pro ───────────────────────────────────────────────────────────────────
  { icon: '🖥️', name: 'PPTX Genius',        desc: 'Présentations PowerPoint IA',           path: '/pptxgenius',    img: '/images/tools/tool-04-pptx-genius.png',   plan: 'pro'     },
  { icon: '📊', name: 'Business Plan',       desc: "Plan d'affaires complet",               path: '/Businessplan',  img: '/images/tools/tool-06-business-plan.png', plan: 'pro'     },
  { icon: '📅', name: 'Project Planner',     desc: 'Planifier votre projet',                path: '/Planner',       img: '/images/tools/tool-01-planner.png',       plan: 'pro'     },
  { icon: '🔥', name: 'Finance Analysis',    desc: 'Faites une analyse de vos chiffres',    path: '/FinanceAi',     img: '/images/tools/tool-01-finance.png',        plan: 'pro'     },
  { icon: '🔍', name: 'Document Analyser',   desc: 'Analyse approfondie de document',       path: '/docanalyser',   img: '/images/tools/tool-01-analyser.png',      plan: 'pro'     },
  { icon: '⚖️', name: 'Contract Generator',  desc: 'Générer tout type de contrat',          path: '/Contract',      img: '/images/tools/tool-01-contract.png',      plan: 'pro'     },

  // ── Premium ───────────────────────────────────────────────────────────────
  { icon: '🔥', name: 'Dashboard Ai',        desc: 'Créer un tableau de bord personalisé',  path: '/DashboardAi',   img: '/images/tools/tool-01-dashboard.png',     plan: 'premium' },
  { icon: '👩‍🦰', name: 'Image Generator',    desc: "Générateur d'image",                    path: '/Imagegen',      img: '/images/tools/tool-01-image.jpg',         plan: 'premium' },
  { icon: '🤳', name: 'Capture Me',          desc: 'Take your image and make it beautiful', path: '/Capture',       img: '/images/tools/tool-01-capture.png',       plan: 'premium' },
  { icon: '🚀', name: 'Workflow',            desc: 'Générer workflow',                      path: '/workflow',      img: '/images/tools/tool-01-workflow.png',      plan: 'premium' },
  { icon: '🔥', name: 'Post Generator',      desc: 'Générer un post',                       path: '/PostGenerator', img: '/images/tools/tool-01-post.png',          plan: 'premium' },
]

const PLAN_BADGE = {
  free:    { label: 'Gratuit',  bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  starter: { label: 'Starter',  bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-200'  },
  pro:     { label: 'Pro',      bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-200'  },
  premium: { label: 'Premium',  bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200'   },
}

// Group tools by category for the nav dropdown
const NAV_CATEGORIES = [
  { label: '💼 Business',   tools: ['Business IA', 'Business Plan', 'Document Analyser', 'Contract Generator', 'Workflow'] },
  { label: '📄 Documents',  tools: ['CV Builder', 'Facture', 'Lettres', 'Email', 'Doc Repairer', 'Modern Card'] },
  { label: '🎵 Média & IA', tools: ['Audio Trans', 'PPTX Genius', 'OCR Vision', 'Image Generator', 'Capture Me', 'Post Generator'] },
  { label: '🛠️ Outils',    tools: ['Remove BG', 'PDF Merger', 'Office to PDF', 'Pdf Convert', 'Project Planner'] },
]

function ToolCard({ tool, onClick }) {
  const [imgFailed, setImgFailed] = useState(false)
  const badge = PLAN_BADGE[tool.plan] || PLAN_BADGE.free

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 group"
    >
      {/* Tool Image */}
      <div className="relative w-full h-44 overflow-hidden">
        {imgFailed ? (
          <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
            <span className="text-6xl">{tool.icon}</span>
          </div>
        ) : (
          <img
            src={tool.img}
            alt={tool.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
        )}
        {/* Plan badge on image */}
        <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${badge.bg} ${badge.text} ${badge.border}`}>
          {tool.plan === 'free' && '✅ '}
          {tool.plan === 'starter' && '⚡ '}
          {tool.plan === 'pro' && '🚀 '}
          {tool.plan === 'premium' && '👑 '}
          {badge.label}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{tool.icon}</span>
          <h3 className="text-base font-black text-slate-900">{tool.name}</h3>
        </div>
        <p className="text-xs text-slate-500 font-medium mb-4">{tool.desc}</p>
        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Ouvrir <ArrowRight size={10}/>
        </span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-x-hidden">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-indigo-100/60 blur-[120px] rounded-full"/>
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-blue-100/60 blur-[120px] rounded-full"/>
      </div>

      {/* Nav */}
      <nav className="relative z-50 max-w-7xl mx-auto px-6 md:px-12 py-6 flex justify-between items-center border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
            <Zap size={20} fill="currentColor" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">
            sumur<span className="text-indigo-600">.IA</span>
          </span>
        </div>

        <div className="flex items-center gap-3">

          {/* ── Tools Dropdown ── */}
          <div className="relative hidden md:block" onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
            <button className="h-10 px-5 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-1.5">
              Outils <ChevronDown size={12} className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}/>
            </button>

            {menuOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[700px] bg-white border border-slate-200 rounded-3xl shadow-2xl shadow-slate-900/10 p-6 z-50">
                {/* Arrow */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-slate-200 rotate-45"/>

                <div className="grid grid-cols-4 gap-6">
                  {NAV_CATEGORIES.map(cat => {
                    const catTools = TOOLS.filter(t => cat.tools.includes(t.name))
                    return (
                      <div key={cat.label}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 pb-2 border-b border-slate-100">{cat.label}</p>
                        <div className="space-y-1">
                          {catTools.map(tool => {
                            const badge = PLAN_BADGE[tool.plan]
                            return (
                              <button
                                key={tool.path}
                                onClick={() => { setMenuOpen(false); router.push(tool.path) }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-all text-left group/item"
                              >
                                <span className="text-base flex-shrink-0">{tool.icon}</span>
                                <span className="text-xs font-bold text-slate-700 group-hover/item:text-indigo-700 flex-1 truncate">{tool.name}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.bg} ${badge.text}`}>
                                  {badge.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {Object.entries(PLAN_BADGE).map(([key, val]) => (
                      <span key={key} className={`flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full border ${val.bg} ${val.text} ${val.border}`}>
                        {key === 'free' && '✅'}
                        {key === 'starter' && '⚡'}
                        {key === 'pro' && '🚀'}
                        {key === 'premium' && '👑'}
                        {val.label}
                      </span>
                    ))}
                  </div>
                  <Link href="/pricing" onClick={() => setMenuOpen(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    Voir les forfaits <ArrowRight size={10}/>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Tarifs */}
          <Link href="/pricing"
            className="h-10 px-5 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all hidden md:flex items-center">
            Tarifs
          </Link>

          {user ? (
            <>
              <Link href="/dashboard"
                className="h-10 px-5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md">
                Dashboard
              </Link>
              <button onClick={handleLogout}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login"
                className="h-10 px-5 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all hidden md:flex items-center">
                Connexion
              </Link>
              <Link href="/register"
                className="h-10 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-md">
                Commencer →
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-10 shadow-sm">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
          Systèmes IA Connectés v2.0
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] mb-8">
          L'intelligence qui <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
            travaille pour vous.
          </span>
        </h1>

        <p className="max-w-xl mx-auto text-slate-500 text-lg font-medium leading-relaxed mb-10">
          Simplifiez vos processus métier avec nos outils d'automatisation propulsés par les derniers modèles d'IA.
        </p>

        {!user ? (
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25">
              Créer un compte gratuit <ArrowRight size={16}/>
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all">
              Se connecter
            </Link>
          </div>
        ) : (
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25">
            ⚡ Accéder à mes outils <ArrowRight size={16}/>
          </Link>
        )}
      </section>

      {/* Free tools banner */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-black text-sm">✅ Gratuit sans inscription :</span>
            <span className="text-emerald-700 text-xs font-medium">Remove BG · PDF Merger · Office to PDF</span>
          </div>
          <Link href="/pricing"
            className="text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
            Voir tous les forfaits <ArrowRight size={10}/>
          </Link>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map((tool) => (
            <ToolCard
              key={tool.path}
              tool={tool}
              onClick={() => router.push(tool.path)}
            />
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-20 border-t border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { icon: Shield, color: 'indigo', title: 'Sécurité Totale', desc: 'Données cryptées de bout en bout. Aucune conservation après traitement.' },
            { icon: Users, color: 'emerald', title: '+50 000 Utilisateurs', desc: 'Professionnels qui automatisent leurs tâches quotidiennes avec précision.' },
            { icon: Star, color: 'blue', title: 'Qualité Premium', desc: 'Modèles Claude Sonnet et Whisper pour des résultats inégalés.' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="flex flex-col items-center md:items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-${color}-50 flex items-center justify-center text-${color}-600`}>
                <Icon size={22}/>
              </div>
              <h4 className="text-sm font-black uppercase tracking-widest">{title}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-100 text-center relative z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-4">
          © 2026 IA Business Ecosystem
        </p>
        <div className="flex justify-center gap-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          <a href="mailto:contact@iabusinessevo.com" className="hover:text-slate-900 transition-colors">Contact</a>
          <Link href="/pricing" className="hover:text-slate-900 transition-colors">Tarifs</Link>
          <Link href="/login" className="hover:text-slate-900 transition-colors">Connexion</Link>
          <Link href="/register" className="hover:text-slate-900 transition-colors">S'inscrire</Link>
        </div>
      </footer>
    </main>
  )
}