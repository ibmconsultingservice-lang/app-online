'use client'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import AuthGuard from '@/components/AuthGuard'
import { useRouter } from 'next/navigation'

const TOOLS = [
  { id:'business-plan',  icon:'📋', name:'Business Plan',     cost:5, desc:'Plan complet en minutes' },
  { id:'marketing',      icon:'📣', name:'Marketing IA',      cost:3, desc:'Stratégie & contenu' },
  { id:'rapport',        icon:'📊', name:'Rapport / Report',  cost:4, desc:'Rapports professionnels' },
  { id:'planner',        icon:'📅', name:'Planificateur',     cost:2, desc:'Gantt & planning' },
  { id:'cv-generator',   icon:'📄', name:'Générateur CV',     cost:2, desc:'CV moderne en PDF' },
  { id:'presentation',   icon:'🖥️', name:'Présentation',      cost:4, desc:'Slides PowerPoint IA' },
  { id:'word-doc',       icon:'📝', name:'Document Word',     cost:3, desc:'Documents formatés' },
  { id:'chat',           icon:'💬', name:'Chat Business',     cost:1, desc:'Assistant 24h/24' },
]

export default function DashboardPage() {
  const { profile, logout } = useAuth()
  const { credits, plan }   = useCredits()
  const router = useRouter()

  return (
    <AuthGuard>
      <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'Inter,-apple-system,sans-serif' }}>

        {/* Header */}
        <header style={{
          background:'#fff', borderBottom:'1px solid #e2e8f0',
          padding:'0 24px', height:60,
          display:'flex', alignItems:'center', justifyContent:'space-between'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, background:'#534AB7', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
            <span style={{ fontWeight:800, fontSize:16, color:'#0f172a' }}>AIBusiness</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {/* Crédits */}
            <div style={{
              background:'#f1f5f9', borderRadius:20,
              padding:'6px 14px', display:'flex', alignItems:'center', gap:6
            }}>
              <span style={{ fontSize:14 }}>⚡</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#534AB7' }}>{credits} crédits</span>
            </div>
            {/* Plan badge */}
            <span style={{
              background: plan === 'premium' ? '#534AB7' : '#e2e8f0',
              color: plan === 'premium' ? 'white' : '#64748b',
              padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700, textTransform:'uppercase'
            }}>{plan}</span>
            <button
              onClick={() => { logout(); router.push('/login') }}
              style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 14px', fontSize:12, cursor:'pointer', color:'#64748b' }}
            >Déconnexion</button>
          </div>
        </header>

        {/* Content */}
        <div style={{ maxWidth:1000, margin:'0 auto', padding:32 }}>

          {/* Welcome */}
          <div style={{ marginBottom:32 }}>
            <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', marginBottom:6 }}>
              Bonjour {profile?.name?.split(' ')[0] || 'là'} 👋
            </h1>
            <p style={{ color:'#64748b', fontSize:14 }}>
              Vous avez <strong>{credits} crédits</strong> disponibles · Plan <strong>{plan}</strong>
            </p>
          </div>

          {/* Credits alert */}
          {credits < 3 && (
            <div style={{
              background:'#fff7ed', border:'1px solid #fed7aa',
              borderRadius:12, padding:'14px 18px', marginBottom:24,
              display:'flex', alignItems:'center', justifyContent:'space-between'
            }}>
              <span style={{ fontSize:14, color:'#9a3412' }}>⚠️ Crédits faibles — rechargez pour continuer</span>
              <button
                onClick={() => router.push('/pricing')}
                style={{ background:'#f97316', color:'white', border:'none', borderRadius:8, padding:'7px 16px', fontSize:12, fontWeight:700, cursor:'pointer' }}
              >Recharger</button>
            </div>
          )}

          {/* Tools Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
            {TOOLS.map(tool => (
              <div
                key={tool.id}
                onClick={() => router.push(`/tools/${tool.id}`)}
                style={{
                  background:'#fff', border:'1px solid #e2e8f0', borderRadius:16,
                  padding:20, cursor:'pointer', transition:'all 0.15s',
                  position:'relative', overflow:'hidden'
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='0 8px 25px rgba(83,74,183,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
              >
                <div style={{ fontSize:32, marginBottom:12 }}>{tool.icon}</div>
                <h3 style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:4 }}>{tool.name}</h3>
                <p style={{ fontSize:12, color:'#64748b', marginBottom:12 }}>{tool.desc}</p>
                <span style={{
                  background:'#ede9fe', color:'#534AB7',
                  padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700
                }}>⚡ {tool.cost} crédit{tool.cost > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>

          {/* Upgrade banner */}
          {plan !== 'premium' && (
            <div style={{
              marginTop:32, background:'linear-gradient(135deg,#534AB7,#7C3AED)',
              borderRadius:20, padding:28, color:'white',
              display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16
            }}>
              <div>
                <h3 style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>🚀 Passez au Premium</h3>
                <p style={{ fontSize:14, opacity:0.9 }}>200 crédits · Téléchargements PPTX, Word, Gantt · Support prioritaire</p>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                style={{ background:'white', color:'#534AB7', border:'none', borderRadius:12, padding:'12px 24px', fontSize:14, fontWeight:800, cursor:'pointer' }}
              >Voir les plans →</button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}