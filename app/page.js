'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Zap, ArrowRight, Shield, Users, Star, LogOut } from 'lucide-react'

const TOOLS = [
  { icon: '🧠', name: 'Business IA',   desc: 'Stratégie & négociation IA',      path: '/business-ia',   img: '/images/tools/tool-01-business-ia.png'   },
  { icon: '📄', name: 'CV Builder',    desc: 'CV professionnel en PDF',          path: '/cv',            img: '/images/tools/tool-02-cv-builder.png'    },
  { icon: '🎙️', name: 'Audio Trans',   desc: 'Transcription audio précise',      path: '/AudioTrans',    img: '/images/tools/tool-03-audio-trans.png'   },
  { icon: '🖥️', name: 'PPTX Genius',  desc: 'Présentations PowerPoint IA',      path: '/pptxgenius',    img: '/images/tools/tool-04-pptx-genius.png'   },
  { icon: '🧾', name: 'Facture',       desc: 'Génération de factures pro',       path: '/facture',       img: '/images/tools/tool-05-facture.png'       },
  { icon: '📊', name: 'Business Plan', desc: "Plan d'affaires complet",          path: '/Businessplan',  img: '/images/tools/tool-06-business-plan.png' },
  { icon: '📊', name: 'Lettres', desc: "Rédiger votre lettre",          path: '/letter',  img: '/images/tools/tool-01-letter.png' },
  { icon: '📊', name: 'Project Planner', desc: "Planifier votre projet",          path: '/Planner',  img: '/images/tools/tool-01-planner.png' },
  { icon: '🔧', name: 'Doc Repairer',  desc: 'Correction & réparation de docs',  path: '/docrepairer',   img: '/images/tools/tool-07-doc-repairer.png'  },
  { icon: '🔍', name: 'OCR Vision',    desc: 'Extraction de texte depuis image', path: '/ocr-vision',    img: '/images/tools/tool-08-ocr-vision.png'    },
  { icon: '🖼️', name: 'Remove BG',     desc: 'Suppression de fond IA',           path: '/Removebg',      img: '/images/tools/tool-09-remove-bg.png'     },
  { icon: '📎', name: 'PDF Merger',    desc: 'Fusionner vos fichiers PDF',       path: '/pdfmerger',     img: '/images/tools/tool-10-pdf-merger.png'    },
  { icon: '📤', name: 'Office to PDF', desc: 'Convertir Word/Excel en PDF',      path: '/office2pdf',    img: '/images/tools/tool-11-office-to-pdf.png' },
]

// Isolated component so each card manages its own image state
function ToolCard({ tool, onClick }) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 group"
    >
      {/* Tool Image */}
      <div className="relative w-full h-44 overflow-hidden">
        {imgFailed ? (
          /* Fallback: gradient + large emoji */
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