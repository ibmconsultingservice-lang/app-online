'use client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '9 900',
    eur: '15',
    credits: 50,
    color: '#64748b',
    features: [
      '50 crédits / mois',
      'Accès aux 17 outils IA',
      'Chat business (50 req/jour)',
      'Business plan basique',
      'Support email 48h',
    ],
    notIncluded: [
      'Téléchargement PPTX/Word/Gantt',
      'Rapports avancés',
      'Support prioritaire',
    ]
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '29 900',
    eur: '45',
    credits: 200,
    color: '#534AB7',
    popular: true,
    features: [
      '200 crédits / mois',
      'Accès aux 17 outils IA',
      'Chat business illimité 24h/24',
      'Business plan complet + export',
      '📥 Téléchargement PPTX, Word, Gantt',
      'Rapports & Marketing avancés',
      'Support WhatsApp prioritaire',
    ],
    notIncluded: []
  },
]

export default function PricingPage() {
  const { user } = useAuth()
  const router = useRouter()

  return (
    <main style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'Inter,-apple-system,sans-serif' }}>
      
      {/* Nav */}
      <nav style={{ padding:'20px 32px', borderBottom:'1px solid #e2e8f0', background:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
          <div style={{ width:32, height:32, background:'#0f172a', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14 }}>⚡</div>
          <span style={{ fontWeight:900, fontSize:15, color:'#0f172a' }}>IA<span style={{color:'#4f46e5'}}>.BUSINESS</span></span>
        </Link>
        {user ? (
          <Link href="/dashboard" style={{ background:'#534AB7', color:'white', padding:'8px 18px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>
            Dashboard
          </Link>
        ) : (
          <Link href="/login" style={{ background:'#0f172a', color:'white', padding:'8px 18px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>
            Connexion
          </Link>
        )}
      </nav>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'60px 20px' }}>
        
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <h1 style={{ fontSize:36, fontWeight:900, color:'#0f172a', marginBottom:10 }}>
            Choisissez votre plan
          </h1>
          <p style={{ color:'#64748b', fontSize:16 }}>
            Paiement par <strong>Carte</strong>, <strong>Orange Money</strong> ou <strong>Wave</strong>
          </p>
        </div>

        {/* Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {PLANS.map(plan => (
            <div key={plan.key} style={{
              background:'#fff',
              borderRadius:20,
              padding:32,
              border: plan.popular ? `2px solid ${plan.color}` : '1px solid #e2e8f0',
              position:'relative',
              boxShadow: plan.popular ? '0 8px 30px rgba(83,74,183,0.15)' : 'none'
            }}>
              {plan.popular && (
                <div style={{
                  position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)',
                  background:'#534AB7', color:'white', padding:'4px 20px',
                  borderRadius:20, fontSize:11, fontWeight:800, whiteSpace:'nowrap'
                }}>
                  ⭐ POPULAIRE
                </div>
              )}

              <h2 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:6 }}>{plan.name}</h2>
              
              <div style={{ marginBottom:24 }}>
                <span style={{ fontSize:32, fontWeight:900, color:plan.color }}>{plan.price} FCFA</span>
                <span style={{ fontSize:13, color:'#94a3b8' }}> / mois</span>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>≈ {plan.eur}€ · {plan.credits} crédits inclus</div>
              </div>

              {/* Features */}
              <div style={{ marginBottom:24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8, fontSize:13, color:'#334155' }}>
                    <span style={{ color:'#22c55e', flexShrink:0 }}>✓</span> {f}
                  </div>
                ))}
                {plan.notIncluded.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8, fontSize:13, color:'#94a3b8' }}>
                    <span style={{ flexShrink:0 }}>✗</span> {f}
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {/* Carte */}
                <button
                  onClick={() => user ? alert('Stripe bientôt disponible') : router.push('/login')}
                  style={{ background:'#0f172a', color:'white', border:'none', borderRadius:10, padding:'11px 0', fontSize:13, fontWeight:700, cursor:'pointer' }}
                >
                  💳 Payer par carte
                </button>

                {/* Orange Money */}
                <button
                  onClick={() => user ? router.push('/payment-contact?plan='+plan.name+'&method=orange') : router.push('/login')}
                  style={{ background:'#f97316', color:'white', border:'none', borderRadius:10, padding:'11px 0', fontSize:13, fontWeight:700, cursor:'pointer' }}
                >
                  🟠 Orange Money
                </button>

                {/* Wave */}
                <button
                  onClick={() => user ? router.push('/payment-contact?plan='+plan.name+'&method=wave') : router.push('/login')}
                  style={{ background:'#06b6d4', color:'white', border:'none', borderRadius:10, padding:'11px 0', fontSize:13, fontWeight:700, cursor:'pointer' }}
                >
                  🔵 Wave
                </button>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign:'center', marginTop:28, fontSize:12, color:'#94a3b8' }}>
          🔒 Paiements sécurisés · Activation sous 2h pour Orange Money & Wave
        </p>
      </div>
    </main>
  )
}