'use client'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import AuthGuard from '@/components/AuthGuard'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, LogOut, ArrowRight, Lock, Home, Search, Bell, Settings } from 'lucide-react'

const PLAN_LEVELS = { free: 0, starter: 1, pro: 2, premium: 3 }

const TOOLS = [
  { icon: '📎', name: 'PDF Merger',        desc: 'Fusionner vos fichiers PDF',          path: '/pdfmerger',     cost: 0, plan: 'free',    color: '#1e3a5f' },
  { icon: '📤', name: 'Office to PDF',     desc: 'Convertir Word/Excel en PDF',         path: '/office2pdf',    cost: 0, plan: 'free',    color: '#1e3a5f' },
  { icon: '🧠', name: 'Business IA',       desc: 'Stratégie & négociation IA',          path: '/business-ia',   cost: 2, plan: 'starter', color: '#2d1b4e' },
  { icon: '📄', name: 'CV Builder',        desc: 'CV professionnel en PDF',             path: '/cv',            cost: 2, plan: 'starter', color: '#1a3a2e' },
  { icon: '🎙️', name: 'Audio Trans',       desc: 'Transcription audio précise',         path: '/AudioTrans',    cost: 1, plan: 'starter', color: '#3a1a2e' },
  { icon: '🧾', name: 'Facture',           desc: 'Génération de factures pro',          path: '/facture',       cost: 1, plan: 'starter', color: '#2d1b4e' },
  { icon: '📝', name: 'Lettres',           desc: 'Rédiger votre lettre',                path: '/letter',        cost: 1, plan: 'starter', color: '#1e3a5f' },
  { icon: '📧', name: 'Email',             desc: 'Email Writer Professional',           path: '/email',         cost: 1, plan: 'starter', color: '#1a3a2e' },
  { icon: '💳', name: 'Modern Card',       desc: 'Carte de visite moderne',             path: '/CVisite',       cost: 1, plan: 'starter', color: '#3a2a1a' },
  { icon: '🔧', name: 'Doc Repairer',      desc: 'Correction & réparation de docs',     path: '/docrepairer',   cost: 2, plan: 'starter', color: '#1e3a5f' },
  { icon: '🔍', name: 'OCR Vision',        desc: 'Extraction de texte depuis image',    path: '/ocr-vision',    cost: 1, plan: 'starter', color: '#2d1b4e' },
  { icon: '📑', name: 'Pdf Convert',       desc: 'Convertisseur de PDF en fichier',     path: '/pdfconvert',    cost: 1, plan: 'starter', color: '#1a3a2e' },
  { icon: '🖥️', name: 'PPTX Genius',      desc: 'Présentations PowerPoint IA',         path: '/pptxgenius',    cost: 3, plan: 'pro',     color: '#3a1a2e' },
  { icon: '📊', name: 'Business Plan',     desc: "Plan d'affaires complet",             path: '/Businessplan',  cost: 4, plan: 'pro',     color: '#2d1b4e' },
  { icon: '📅', name: 'Project Planner',   desc: 'Planifier votre projet',              path: '/Planner',       cost: 2, plan: 'pro',     color: '#1a3a2e' },
  { icon: '🔥', name: 'Finance Analysis',  desc: 'Analyse de vos chiffres',             path: '/FinanceAi',     cost: 3, plan: 'pro',     color: '#3a2a1a' },
  { icon: '🔍', name: 'Doc Analyser',      desc: 'Analyse approfondie de document',     path: '/docanalyser',   cost: 2, plan: 'pro',     color: '#1e3a5f' },
  { icon: '⚖️', name: 'Contract Gen.',     desc: 'Générer tout type de contrat',        path: '/Contract',      cost: 3, plan: 'pro',     color: '#2d1b4e' },
  { icon: '🚀', name: 'Personal Project Mapping',     desc: 'Suivez vos projects personnels',        path: '/ppm',      cost: 3, plan: 'pro',     color: '#4e1b43' },
  { icon: '🐱‍🏍', name: 'Management tools',     desc: 'Suivez vos projects personnels',        path: '/management',      cost: 3, plan: 'pro',     color: '#4e1b43' },
  { icon: '🔥', name: 'Dashboard Ai',      desc: 'Tableau de bord personnalisé',        path: '/DashboardAi',   cost: 0, plan: 'premium', color: '#3a1a2e' },
  { icon: '👩‍🦰', name: 'Image Generator',  desc: "Générateur d'image IA",               path: '/Imagegen',      cost: 2, plan: 'premium', color: '#1a3a2e' },
  { icon: '🤳', name: 'Capture Me',        desc: 'Embellissez vos photos',              path: '/Capture',       cost: 2, plan: 'premium', color: '#2d1b4e' },
  { icon: '🚀', name: 'Workflow',          desc: 'Générer workflow automatisé',          path: '/workflow',      cost: 3, plan: 'premium', color: '#1e3a5f' },
  { icon: '🔥', name: 'Post Generator',    desc: 'Générer un post réseaux sociaux',     path: '/PostGenerator', cost: 1, plan: 'premium', color: '#3a2a1a' },
]

const PLAN_LABELS = {
  free:    { label: 'Gratuit', color: 'bg-slate-700 text-slate-300' },
  starter: { label: 'Starter', color: 'bg-indigo-900 text-indigo-300' },
  pro:     { label: 'Pro',     color: 'bg-violet-900 text-violet-300' },
  premium: { label: 'Premium', color: 'bg-amber-900 text-amber-300' },
}

const SECTIONS = [
  { plan: 'free',    label: '✅ Gratuit'  },
  { plan: 'starter', label: '⚡ Starter'  },
  { plan: 'pro',     label: '🚀 Pro'      },
  { plan: 'premium', label: '👑 Premium'  },
]

const NAV_ITEMS = [
  { icon: '🏠', label: 'Accueil',    path: '/'          },
  { icon: '📄', label: 'CV Builder', path: '/cv'        },
  { icon: '🖥️', label: 'PPTX Genius',path: '/pptxgenius'},
  { icon: '📅', label: 'Planner',    path: '/Planner'   },
  { icon: '🔧', label: 'Doc Repairer',path: '/docrepairer'},
  { icon: '🔍', label: 'Doc Analyser',path: '/docanalyser'},
  { icon: '📝', label: 'Lettres',    path: '/letter'    },
  { icon: '⚖️', label: 'Contract Gen.',path: '/Contract' },
  { icon: '🔥', label: 'Dashboard AI',path: '/DashboardAi'},
  { icon: '💳', label: 'Cartes visite',path: '/CVisite'  },
  { icon: '🎙️', label: 'Audio Trans', path: '/AudioTrans'},
  { icon: '🚀', label: 'Workflow',   path: '/workflow'  },
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
    const toolLevel = PLAN_LEVELS[tool.plan] ?? 0
    const userLevel = PLAN_LEVELS[plan] ?? 0
    if (plan === 'free' && tool.plan === 'starter' && (credits ?? 0) > 0) {
      router.push(tool.path); return
    }
    if (toolLevel > userLevel) router.push('/pricing')
    else router.push(tool.path)
  }

  const firstName = user?.displayName?.split(' ')[0] || user?.name?.split(' ')[0] || 'là'

  return (
    <AuthGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0d1117', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 240, minHeight: '100vh', background: '#0d1117',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', padding: '24px 0',
          position: 'sticky', top: 0, flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{ padding: '0 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} color="white" fill="white"/>
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                IA<span style={{ color: '#818cf8' }}>.BUSINESS</span>
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
            {NAV_ITEMS.map(item => (
              <div
                key={item.path}
                onClick={() => router.push(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                  marginBottom: 2, transition: 'all 0.15s',
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 13, fontWeight: 500,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.color = '#a5b4fc'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>

          {/* User section */}
          <div style={{ padding: '16px 16px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {firstName[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', margin: 0, truncate: 'overflow', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstName}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{PLAN_LABELS[plan]?.label || 'Free'}</p>
              </div>
              <button onClick={handleLogout} title="Déconnexion"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 6, display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >
                <LogOut size={15}/>
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'auto' }}>

          {/* Topbar */}
          <header style={{
            height: 64, background: '#0d1117',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 32px', position: 'sticky', top: 0, zIndex: 50,
          }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                Bienvenue sur IA.Business
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Votre plateforme d'IA tout-en-un.</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Credits */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999, padding: '6px 14px' }}>
                <Zap size={12} color="#818cf8" fill="#818cf8"/>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc' }}>{credits ?? 0} crédits</span>
              </div>

              {/* Plan */}
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(139,92,246,0.3)' }}>
                {PLAN_LABELS[plan]?.label || 'Free'}
              </span>

              {plan !== 'premium' && (
                <button
                  onClick={() => router.push('/pricing')}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 10, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>
                  Upgrader ↑
                </button>
              )}

              <Bell size={18} color="rgba(255,255,255,0.4)" style={{ cursor: 'pointer' }}/>
            </div>
          </header>

          <div style={{ padding: '32px', flex: 1 }}>

            {/* Low credits alert */}
            {credits !== null && credits < 3 && plan !== 'free' && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '14px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>⚠️ Crédits faibles — rechargez pour continuer</span>
                <button onClick={() => router.push('/pricing')} style={{ background: '#f59e0b', border: 'none', color: '#000', padding: '7px 16px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}>Recharger</button>
              </div>
            )}

            {/* Tools sections */}
            {SECTIONS.map((section) => {
              const sectionTools = TOOLS.filter(t => t.plan === section.plan)
              const sectionLocked = PLAN_LEVELS[section.plan] > userPlanLevel

              return (
                <div key={section.plan} style={{ marginBottom: 40 }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)' }}>
                      {section.label}
                    </span>
                    {sectionLocked && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: 999 }}>
                        <Lock size={9}/> Nécessite {section.plan}
                      </span>
                    )}
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }}/>
                  </div>

                  {/* Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {sectionTools.map((tool) => {
                      const locked = PLAN_LEVELS[tool.plan] > userPlanLevel
                      return (
                        <div
                          key={tool.path}
                          onClick={() => !locked && handleToolClick(tool)}
                          style={{
                            background: locked ? 'rgba(255,255,255,0.03)' : tool.color,
                            border: `1px solid ${locked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 16, padding: '20px 16px',
                            cursor: locked ? 'not-allowed' : 'pointer',
                            opacity: locked ? 0.5 : 1,
                            transition: 'all 0.2s',
                            position: 'relative',
                            display: 'flex', flexDirection: 'column', gap: 8,
                          }}
                          onMouseEnter={e => { if (!locked) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = locked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'; }}
                        >
                          {locked && (
                            <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, background: 'rgba(255,255,255,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Lock size={10} color="rgba(255,255,255,0.4)"/>
                            </div>
                          )}

                          <span style={{ fontSize: 28 }}>{tool.icon}</span>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 3px' }}>{tool.name}</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.4 }}>{tool.desc}</p>
                          </div>

                          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {tool.cost > 0 ? (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.15)', padding: '3px 8px', borderRadius: 999 }}>
                                ⚡ {tool.cost} cr.
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '3px 8px', borderRadius: 999 }}>
                                ✅ Gratuit
                              </span>
                            )}
                            {locked ? (
                              <span
                                onClick={e => { e.stopPropagation(); router.push('/pricing') }}
                                style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', cursor: 'pointer' }}>
                                Débloquer →
                              </span>
                            ) : (
                              <ArrowRight size={13} color="rgba(255,255,255,0.2)"/>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Upgrade banner */}
            {plan !== 'premium' && (
              <div style={{
                marginTop: 8,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 20, padding: '28px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: 'rgba(139,92,246,0.15)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }}/>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>🚀 Passez au niveau supérieur</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    {plan === 'free'    && 'Débloquez CV, Facture, Audio Trans, Business IA et plus encore.'}
                    {plan === 'starter' && 'Débloquez PPTX Genius, Business Plan, Finance Analysis et plus.'}
                    {plan === 'pro'     && 'Débloquez Dashboard AI, Image Generator, Workflow et Post Generator.'}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/pricing')}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Voir les forfaits →
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}