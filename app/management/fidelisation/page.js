'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const LS_KEY = 'mgmt_projects_v1'

// ── AARRR stages ──────────────────────────────────────────────────────────────
const STAGES = {
  acquisition: { id:'acquisition', label:'Acquisition', icon:'🎯', color:'#818cf8', bg:'rgba(129,140,248,.12)', border:'rgba(129,140,248,.3)',  short:'Attirer', desc:'Attirer des visiteurs/prospects vers votre produit' },
  activation:  { id:'activation',  label:'Activation',  icon:'⚡', color:'#60a5fa', bg:'rgba(96,165,250,.12)',  border:'rgba(96,165,250,.3)',   short:'Activer', desc:'Premier pas réussi — l\'utilisateur vit son "Aha! moment"' },
  retention:   { id:'retention',   label:'Rétention',   icon:'🔄', color:'#34d399', bg:'rgba(52,211,153,.12)',  border:'rgba(52,211,153,.3)',   short:'Fidéliser', desc:'Faire revenir les utilisateurs — cœur de la fidélisation' },
  revenue:     { id:'revenue',     label:'Revenue',     icon:'💰', color:'#facc15', bg:'rgba(250,204,21,.12)',  border:'rgba(250,204,21,.3)',   short:'Monétiser', desc:'Monétiser les utilisateurs actifs' },
  referral:    { id:'referral',    label:'Referral',    icon:'📣', color:'#f472b6', bg:'rgba(244,114,182,.12)', border:'rgba(244,114,182,.3)',  short:'Recommander', desc:'Transformer les clients en ambassadeurs' },
}

const HEALTH_COLORS = { critical:'#f87171', weak:'#fb923c', average:'#facc15', good:'#34d399', excellent:'#34d399' }
const HEALTH_LABELS  = { critical:'Critique', weak:'Fragile', average:'Moyen', good:'Bon', excellent:'Excellent' }
const TREND_ICONS    = { up:'↗', down:'↘', stable:'→' }
const TREND_COLORS   = { up:'#34d399', down:'#f87171', stable:'#facc15' }

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark:     { name:'Sombre',   bg:'#0a0a0f', surface:'#111118', surface2:'#18181f', surface3:'#1e1e28', border:'rgba(255,255,255,.07)', border2:'rgba(255,255,255,.12)', text:'#f0eff5', muted:'#6b6a7a', muted2:'#9896aa', accent:'#6366f1', accent2:'#818cf8' },
  midnight: { name:'Minuit',   bg:'#060610', surface:'#0d0d1f', surface2:'#13132e', surface3:'#1a1a3a', border:'rgba(129,140,248,.1)', border2:'rgba(129,140,248,.18)', text:'#e8e8ff', muted:'#5a5a8a', muted2:'#8888bb', accent:'#7c3aed', accent2:'#a78bfa' },
  forest:   { name:'Forêt',    bg:'#060f0a', surface:'#0d1a12', surface2:'#12221a', surface3:'#172b21', border:'rgba(52,211,153,.08)', border2:'rgba(52,211,153,.16)', text:'#e8f5ee', muted:'#4a6a58', muted2:'#7aaa90', accent:'#059669', accent2:'#34d399' },
  growth:   { name:'Growth',   bg:'#080b14', surface:'#0f1626', surface2:'#162035', surface3:'#1d2a45', border:'rgba(96,165,250,.1)', border2:'rgba(96,165,250,.2)', text:'#e2efff', muted:'#4a6080', muted2:'#7a98c0', accent:'#2563eb', accent2:'#60a5fa' },
  amber:    { name:'Ambre',    bg:'#0f0900', surface:'#1a1200', surface2:'#221900', surface3:'#2a2000', border:'rgba(251,191,36,.08)', border2:'rgba(251,191,36,.15)', text:'#fef3c7', muted:'#78600a', muted2:'#b8960a', accent:'#d97706', accent2:'#fbbf24' },
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const emptyStageData = () => ({
  score: 5, health: 'average',
  metrics: [], strengths: [], weaknesses: [], actions: [],
  mainChannels: [], ahamoment: '', onboardingSteps: [], retentionLoops: [],
  pricingModel: '', referralProgram: '', budget: '',
})

const emptySession = (name = '') => ({
  id: uid(), name, companyName: '', sector: '', businessModel: 'SaaS',
  projectContext: '', summary: '', theme: 'dark',
  northStarMetric: { metric: '', current: '', target: '', why: '' },
  aarrr: Object.fromEntries(Object.keys(STAGES).map(k => [k, emptyStageData()])),
  clv_cac: {
    cac: { value: 0, currency: '€', breakdown: { marketing: 0, sales: 0, onboarding: 0 }, trend: 'stable', comment: '' },
    clv: { value: 0, currency: '€', arpu_monthly: 0, avg_lifespan_months: 12, gross_margin_pct: 70, formula_note: '', trend: 'stable', comment: '' },
    ratio: { value: 0, health: 'average', label: '', interpretation: '' },
    payback_period_months: 0, recommendations: [],
  },
  growthLevers: [], quickWins: [], initialInsights: [],
  aiResult: null, createdAt: new Date().toISOString(),
})

// ── Ratio health helper ────────────────────────────────────────────────────────
const ratioHealth = (r) => r >= 5 ? { color:'#34d399', label:'Excellent (≥5:1)' } : r >= 3 ? { color:'#34d399', label:'Sain (≥3:1)' } : r >= 2 ? { color:'#facc15', label:'Fragile (2-3:1)' } : { color:'#f87171', label:'Critique (<2:1)' }

// ─── AI Generate Panel ────────────────────────────────────────────────────────
function AIGeneratePanel({ projectName, onGenerated, onClose, theme }) {
  const T = THEMES[theme] || THEMES.dark
  const [desc, setDesc]       = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  const generate = async () => {
    if (desc.trim().length < 15) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res  = await fetch('/api/generer-management/generer-fidelisation-auto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, projectName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur API')
      setResult(json.data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const box = { background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: 10, padding: 14 }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500 }}>
      <div style={{ background:T.surface, border:`1px solid ${T.accent}35`, borderRadius:20, width:700, maxHeight:'90vh', overflow:'auto', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,.6)' }}>

        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${T.border}`, background:`linear-gradient(135deg, ${T.accent}10, ${T.accent2}06)`, borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:24 }}>🚀</span>
            <div>
              <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:17, color:T.accent2 }}>IA — Génération AARRR & CLV/CAC</div>
              <div style={{ fontSize:11, color:T.muted, marginTop:2, fontFamily:'Geist Mono,monospace' }}>Décrivez votre business, l'IA construit le tableau de bord Growth</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:18 }}>✕</button>
        </div>

        <div style={{ padding:24, flex:1, display:'flex', flexDirection:'column', gap:16 }}>
          {!result && (
            <div>
              <label style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', display:'block', marginBottom:8 }}>Description du business / projet</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Ex: Application SaaS B2B de gestion de projets pour PME. 2 000 clients payants, abonnement 49€/mois. Acquisition principalement via Google Ads et bouche-à-oreille. Fort taux de churn (12%/mois) malgré un bon produit. Pas de programme de fidélisation structuré. L'équipe veut réduire le CAC et augmenter la LTV pour améliorer la rentabilité..."
                style={{ width:'100%', minHeight:130, padding:'14px 16px', background:T.bg, border:`1.5px solid ${T.border2}`, borderRadius:10, color:T.text, fontSize:13, lineHeight:1.7, fontFamily:'Syne,sans-serif', resize:'vertical', outline:'none', boxSizing:'border-box' }} />
              <div style={{ fontSize:10, color:T.muted, textAlign:'right', marginTop:4, fontFamily:'Geist Mono,monospace' }}>{desc.length} car.</div>
            </div>
          )}

          {error && <div style={{ padding:12, background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)', borderRadius:8, fontSize:12, color:'#f87171' }}>⚠ {error}</div>}

          {loading && (
            <div style={{ textAlign:'center', padding:36, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
              <div style={{ width:36, height:36, border:`2px solid ${T.border2}`, borderTop:`2px solid ${T.accent}`, borderRadius:'50%', animation:'spin .8s linear infinite' }} />
              <p style={{ fontSize:13, color:T.muted2, fontFamily:'Geist Mono,monospace' }}>Analyse AARRR & CLV/CAC en cours…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {result && !loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ ...box, background:`${T.accent}08`, border:`1px solid ${T.accent}25` }}>
                <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:15, color:T.accent2, marginBottom:6 }}>🚀 {result.companyName || result.projectTitle || 'Analyse générée'}</div>
                <p style={{ fontSize:12, color:T.muted2, lineHeight:1.7, margin:0 }}>{result.summary}</p>
              </div>

              {/* AARRR preview */}
              <div>
                <div style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Scores AARRR générés</div>
                <div style={{ display:'flex', gap:6 }}>
                  {Object.entries(STAGES).map(([sk, sv]) => {
                    const score = result.aarrr?.[sk]?.score || 5
                    const health = result.aarrr?.[sk]?.health || 'average'
                    return (
                      <div key={sk} style={{ flex:1, padding:'10px 8px', background:sv.bg, border:`1px solid ${sv.border}`, borderRadius:8, textAlign:'center' }}>
                        <div style={{ fontSize:16, marginBottom:4 }}>{sv.icon}</div>
                        <div style={{ fontSize:16, fontWeight:800, color:sv.color, fontFamily:'Geist Mono,monospace' }}>{score}</div>
                        <div style={{ fontSize:8, color:T.muted, textTransform:'uppercase', letterSpacing:'.05em' }}>{sv.short}</div>
                        <div style={{ fontSize:9, color:HEALTH_COLORS[health], marginTop:2 }}>{HEALTH_LABELS[health]}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* CLV/CAC preview */}
              {result.clv_cac && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[
                    { label:'CAC', val:`${result.clv_cac.cac?.value || 0}${result.clv_cac.cac?.currency || '€'}`, color:'#fb923c' },
                    { label:'CLV', val:`${result.clv_cac.clv?.value || 0}${result.clv_cac.clv?.currency || '€'}`, color:'#34d399' },
                    { label:'Ratio CLV/CAC', val:`${result.clv_cac.ratio?.value || 0}:1`, color: ratioHealth(result.clv_cac.ratio?.value || 0).color },
                  ].map(s => (
                    <div key={s.label} style={{ ...box, textAlign:'center' }}>
                      <div style={{ fontSize:20, fontWeight:800, color:s.color, fontFamily:'Geist Mono,monospace' }}>{s.val}</div>
                      <div style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace', marginTop:3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {result.quickWins?.length > 0 && (
                <div>
                  <div style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Quick Wins identifiés</div>
                  {result.quickWins.slice(0,3).map((w,i) => (
                    <div key={i} style={{ display:'flex', gap:8, padding:'7px 10px', marginBottom:5, background:'rgba(52,211,153,.05)', border:'1px solid rgba(52,211,153,.15)', borderRadius:7, fontSize:12, color:T.muted2 }}>
                      <span style={{ color:'#34d399' }}>→</span> {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding:'14px 24px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:T.bg, borderRadius:'0 0 20px 20px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${T.border2}`, background:'none', cursor:'pointer', fontSize:12, color:T.muted, fontFamily:'Geist Mono,monospace' }}>Annuler</button>
          <div style={{ display:'flex', gap:8 }}>
            {result && <button onClick={() => { onGenerated(result); onClose() }} style={{ padding:'8px 18px', borderRadius:8, background:T.accent, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'#fff', fontFamily:'Geist Mono,monospace' }}>🚀 Appliquer ce dashboard</button>}
            {!result && !loading && <button onClick={generate} disabled={desc.trim().length < 15} style={{ padding:'8px 18px', borderRadius:8, background:desc.trim().length>=15?`${T.accent}22`:`${T.surface2}`, border:`1px solid ${desc.trim().length>=15?T.accent+'50':T.border}`, cursor:desc.trim().length>=15?'pointer':'not-allowed', fontSize:12, fontWeight:700, color:desc.trim().length>=15?T.accent2:T.muted, fontFamily:'Geist Mono,monospace' }}>🚀 Générer l'analyse</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Stage Editor ─────────────────────────────────────────────────────────────
function StageEditor({ stageKey, data, onChange, theme }) {
  const T  = THEMES[theme] || THEMES.dark
  const sv = STAGES[stageKey]
  const d  = data || emptyStageData()

  const inp  = { width:'100%', background:T.bg, border:`1px solid ${T.border2}`, borderRadius:7, padding:'8px 11px', fontSize:12, color:T.text, outline:'none', fontFamily:'Syne,sans-serif', boxSizing:'border-box' }
  const lbl  = { fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'Geist Mono,monospace', display:'block', marginBottom:4 }

  const addMetric = () => onChange({ ...d, metrics: [...(d.metrics||[]), { name:'', value:'', trend:'stable', benchmark:'' }] })
  const updMetric = (i, patch) => onChange({ ...d, metrics: d.metrics.map((m, idx) => idx===i ? {...m,...patch} : m) })
  const delMetric = (i) => onChange({ ...d, metrics: d.metrics.filter((_,idx) => idx!==i) })

  const addListItem = (field) => onChange({ ...d, [field]: [...(d[field]||[]), ''] })
  const updListItem = (field, i, v) => onChange({ ...d, [field]: d[field].map((x, idx) => idx===i ? v : x) })
  const delListItem = (field, i) => onChange({ ...d, [field]: d[field].filter((_,idx) => idx!==i) })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Score & health */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={lbl}>Score de maturité (1-10)</label>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="range" min={1} max={10} value={d.score||5} onChange={e => onChange({...d, score:parseInt(e.target.value)})} style={{ flex:1, accentColor:sv.color }} />
            <span style={{ fontSize:18, fontWeight:800, color:sv.color, fontFamily:'Geist Mono,monospace', minWidth:28 }}>{d.score||5}</span>
          </div>
        </div>
        <div>
          <label style={lbl}>Santé</label>
          <select style={inp} value={d.health||'average'} onChange={e => onChange({...d, health:e.target.value})}>
            {Object.entries(HEALTH_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Stage-specific fields */}
      {stageKey === 'acquisition' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={lbl}>Budget mensuel</label><input style={inp} placeholder="ex: 15 000€/mois" value={d.budget||''} onChange={e=>onChange({...d,budget:e.target.value})} /></div>
          <div><label style={lbl}>Canaux principaux (virgule)</label><input style={inp} placeholder="SEO, Google Ads, LinkedIn" value={(d.mainChannels||[]).join(', ')} onChange={e=>onChange({...d,mainChannels:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} /></div>
        </div>
      )}
      {stageKey === 'activation' && (
        <div><label style={lbl}>Moment "Aha!" (description)</label><input style={inp} placeholder="Le moment où l'utilisateur réalise la valeur…" value={d.ahamoment||''} onChange={e=>onChange({...d,ahamoment:e.target.value})} /></div>
      )}
      {stageKey === 'revenue' && (
        <div><label style={lbl}>Modèle de pricing</label><input style={inp} placeholder="Freemium, Per-seat, Usage-based…" value={d.pricingModel||''} onChange={e=>onChange({...d,pricingModel:e.target.value})} /></div>
      )}
      {stageKey === 'referral' && (
        <div><label style={lbl}>Programme de parrainage</label><input style={inp} placeholder="Description du programme existant ou recommandé…" value={d.referralProgram||''} onChange={e=>onChange({...d,referralProgram:e.target.value})} /></div>
      )}

      {/* Metrics */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <label style={lbl}>Métriques clés</label>
          <button onClick={addMetric} style={{ fontSize:11, padding:'3px 10px', borderRadius:5, border:`1px solid ${sv.border}`, background:sv.bg, color:sv.color, cursor:'pointer', fontFamily:'Geist Mono,monospace' }}>+ Ajouter</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(d.metrics||[]).map((m, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 100px 80px 100px 28px', gap:6, alignItems:'center' }}>
              <input style={inp} placeholder="Nom de la métrique" value={m.name} onChange={e=>updMetric(i,{name:e.target.value})} />
              <input style={inp} placeholder="Valeur" value={m.value} onChange={e=>updMetric(i,{value:e.target.value})} />
              <select style={inp} value={m.trend||'stable'} onChange={e=>updMetric(i,{trend:e.target.value})}>
                <option value="up">↗ Hausse</option><option value="down">↘ Baisse</option><option value="stable">→ Stable</option>
              </select>
              <input style={inp} placeholder="Benchmark" value={m.benchmark||''} onChange={e=>updMetric(i,{benchmark:e.target.value})} />
              <button onClick={()=>delMetric(i)} style={{ background:'none', border:`1px solid rgba(248,113,113,.3)`, borderRadius:5, color:'#f87171', cursor:'pointer', fontSize:12, height:32 }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths / Weaknesses / Actions */}
      {[
        { field:'strengths',  label:'Points forts',   color:'#34d399', ph:'Avantage concurrentiel…' },
        { field:'weaknesses', label:'Points faibles',  color:'#f87171', ph:'Lacune ou risque identifié…' },
        { field:'actions',    label:'Actions',         color:sv.color,  ph:'Action concrète à mener…' },
      ].map(({ field, label, color, ph }) => (
        <div key={field}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <label style={{ ...lbl, color }}>{label}</label>
            <button onClick={()=>addListItem(field)} style={{ fontSize:10, padding:'2px 8px', borderRadius:4, border:`1px solid ${color}40`, background:`${color}10`, color, cursor:'pointer', fontFamily:'Geist Mono,monospace' }}>+</button>
          </div>
          {(d[field]||[]).map((v, i) => (
            <div key={i} style={{ display:'flex', gap:6, marginBottom:5 }}>
              <input style={{ ...inp, borderLeft:`2px solid ${color}50` }} value={v} placeholder={ph} onChange={e=>updListItem(field,i,e.target.value)} />
              <button onClick={()=>delListItem(field,i)} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:5, color:T.muted, cursor:'pointer', fontSize:11, padding:'0 8px' }}>✕</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── CLV/CAC Editor ───────────────────────────────────────────────────────────
function ClvCacEditor({ data, onChange, theme }) {
  const T   = THEMES[theme] || THEMES.dark
  const d   = data || {}
  const cac = d.cac || {}
  const clv = d.clv || {}

  const inp = { width:'100%', background:T.bg, border:`1px solid ${T.border2}`, borderRadius:7, padding:'8px 11px', fontSize:12, color:T.text, outline:'none', fontFamily:'Syne,sans-serif', boxSizing:'border-box' }
  const lbl = { fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'Geist Mono,monospace', display:'block', marginBottom:4 }

  const ratio = cac.value > 0 ? (clv.value / cac.value) : 0
  const rh    = ratioHealth(ratio)
  const payback = clv.arpu_monthly > 0 ? Math.ceil(cac.value / (clv.arpu_monthly * (clv.gross_margin_pct||70) / 100)) : 0
  const clvCalc = clv.arpu_monthly > 0 && clv.avg_lifespan_months > 0 ? Math.round(clv.arpu_monthly * clv.avg_lifespan_months * (clv.gross_margin_pct||70) / 100) : clv.value

  const upd = (section, patch) => onChange({ ...d, [section]: { ...d[section], ...patch } })
  const updBreak = (key, val) => onChange({ ...d, cac: { ...cac, breakdown: { ...cac.breakdown, [key]: parseFloat(val)||0 } } })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Live ratio card */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
        {[
          { label:'CAC', val:`${cac.value||0}${cac.currency||'€'}`, color:'#fb923c', sub:'Coût d\'acquisition' },
          { label:'CLV calculé', val:`${clvCalc}${clv.currency||'€'}`, color:'#34d399', sub:`${clv.arpu_monthly||0}€ × ${clv.avg_lifespan_months||0}m × ${clv.gross_margin_pct||70}%` },
          { label:'Ratio CLV/CAC', val:`${ratio.toFixed(1)}:1`, color:rh.color, sub:rh.label },
          { label:'Payback period', val:`${payback}m`, color:'#facc15', sub:'Mois pour récupérer le CAC' },
        ].map(s => (
          <div key={s.label} style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:10, padding:14, textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:'Geist Mono,monospace' }}>{s.val}</div>
            <div style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace', marginTop:4 }}>{s.label}</div>
            <div style={{ fontSize:9, color:T.muted, marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Ratio bar */}
      <div style={{ background:T.surface2, borderRadius:10, padding:14, border:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace', marginBottom:8 }}>
          <span style={{ color:'#f87171' }}>Critique &lt;1:1</span>
          <span style={{ color:'#fb923c' }}>Fragile 1-2:1</span>
          <span style={{ color:'#facc15' }}>Attention 2-3:1</span>
          <span style={{ color:'#34d399' }}>Sain ≥3:1</span>
          <span style={{ color:'#34d399' }}>Excellent ≥5:1</span>
        </div>
        <div style={{ height:8, background:`${T.border}`, borderRadius:4, overflow:'hidden', position:'relative' }}>
          <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${Math.min(100, (ratio/6)*100)}%`, background:`linear-gradient(to right, #f87171, #fb923c, #facc15, #34d399)`, borderRadius:4, transition:'width .5s' }} />
          <div style={{ position:'absolute', left:`${Math.min(98, (3/6)*100)}%`, top:'-4px', height:'calc(100% + 8px)', width:2, background:'rgba(255,255,255,.4)', borderRadius:1 }} />
        </div>
        <div style={{ fontSize:11, color:rh.color, marginTop:6, fontWeight:700 }}>
          {ratio < 1 ? '⚠ L\'entreprise perd de l\'argent sur chaque client.' : ratio < 3 ? '⚠ Ratio insuffisant — investir en rétention pour augmenter la CLV.' : ratio < 5 ? '✓ Ratio sain — maintenir et optimiser.' : '✦ Excellent — levier de croissance activé.'}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* CAC */}
        <div style={{ background:T.surface2, border:`1px solid rgba(251,146,60,.2)`, borderRadius:10, padding:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#fb923c', marginBottom:12, fontFamily:'Geist Mono,monospace' }}>💸 CAC — Coût d'Acquisition</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div><label style={{ fontSize:10, color:T.muted, display:'block', marginBottom:3, fontFamily:'Geist Mono,monospace' }}>CAC total</label><input type="number" style={{ background:T.bg, border:`1px solid ${T.border2}`, borderRadius:7, padding:'7px 10px', fontSize:13, color:'#fb923c', fontWeight:700, outline:'none', width:'100%', boxSizing:'border-box' }} value={cac.value||0} onChange={e=>upd('cac',{value:parseFloat(e.target.value)||0})} /></div>
            {[['marketing','Marketing'],['sales','Sales'],['onboarding','Onboarding']].map(([k,l]) => (
              <div key={k}><label style={{ fontSize:10, color:T.muted, display:'block', marginBottom:3, fontFamily:'Geist Mono,monospace' }}>{l}</label><input type="number" style={{ background:T.bg, border:`1px solid ${T.border2}`, borderRadius:7, padding:'6px 10px', fontSize:12, color:T.text, outline:'none', width:'100%', boxSizing:'border-box' }} value={cac.breakdown?.[k]||0} onChange={e=>updBreak(k,e.target.value)} /></div>
            ))}
            <div><label style={{ fontSize:10, color:T.muted, display:'block', marginBottom:3, fontFamily:'Geist Mono,monospace' }}>Commentaire</label><input style={{ background:T.bg, border:`1px solid ${T.border2}`, borderRadius:7, padding:'6px 10px', fontSize:12, color:T.text, outline:'none', width:'100%', boxSizing:'border-box' }} value={cac.comment||''} onChange={e=>upd('cac',{comment:e.target.value})} placeholder="Tendance, contexte…" /></div>
          </div>
        </div>

        {/* CLV */}
        <div style={{ background:T.surface2, border:`1px solid rgba(52,211,153,.2)`, borderRadius:10, padding:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#34d399', marginBottom:12, fontFamily:'Geist Mono,monospace' }}>💎 CLV — Customer Lifetime Value</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { key:'arpu_monthly', label:'ARPU mensuel (€)', type:'number', ph:'42' },
              { key:'avg_lifespan_months', label:'Durée de vie (mois)', type:'number', ph:'14' },
              { key:'gross_margin_pct', label:'Marge brute (%)', type:'number', ph:'72' },
            ].map(({ key, label, type, ph }) => (
              <div key={key}><label style={{ fontSize:10, color:T.muted, display:'block', marginBottom:3, fontFamily:'Geist Mono,monospace' }}>{label}</label><input type={type} style={{ background:T.bg, border:`1px solid ${T.border2}`, borderRadius:7, padding:'7px 10px', fontSize:13, color:'#34d399', fontWeight:700, outline:'none', width:'100%', boxSizing:'border-box' }} value={clv[key]||''} placeholder={ph} onChange={e=>upd('clv',{[key]:parseFloat(e.target.value)||0, value:clvCalc})} /></div>
            ))}
            <div style={{ fontSize:11, color:T.muted, fontStyle:'italic', padding:'6px 10px', background:T.surface, borderRadius:6 }}>
              CLV = {clv.arpu_monthly||0}€ × {clv.avg_lifespan_months||0}m × {clv.gross_margin_pct||70}% = <strong style={{ color:'#34d399' }}>{clvCalc}€</strong>
            </div>
            <div><label style={{ fontSize:10, color:T.muted, display:'block', marginBottom:3, fontFamily:'Geist Mono,monospace' }}>Commentaire</label><input style={{ background:T.bg, border:`1px solid ${T.border2}`, borderRadius:7, padding:'6px 10px', fontSize:12, color:T.text, outline:'none', width:'100%', boxSizing:'border-box' }} value={clv.comment||''} onChange={e=>upd('clv',{comment:e.target.value})} placeholder="Tendance, contexte…" /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Analysis Panel ────────────────────────────────────────────────────────────
function AnalysisPanel({ result, onClose, theme }) {
  const T   = THEMES[theme] || THEMES.dark
  const [tab, setTab] = useState('summary')

  const scoreColor = (s) => s>=80?'#34d399':s>=60?'#facc15':s>=40?'#fb923c':'#f87171'
  const effortColors = { low:'#34d399', medium:'#facc15', high:'#f87171' }
  const stageInfo = (s) => STAGES[s] || { color:T.muted2, icon:'?' }

  return (
    <div style={{ position:'fixed', right:0, top:0, bottom:0, width:520, background:T.surface, borderLeft:`1px solid ${T.border}`, zIndex:90, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'-8px 0 40px rgba(0,0,0,.4)' }}>

      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:18, color:T.accent2 }}>Analyse Growth IA 🚀</div>
        <button onClick={onClose} style={{ background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:11, color:T.muted, fontFamily:'Geist Mono,monospace' }}>✕ Fermer</button>
      </div>

      <div style={{ display:'flex', gap:3, padding:'10px 14px', borderBottom:`1px solid ${T.border}`, flexShrink:0, flexWrap:'wrap' }}>
        {[['summary','Synthèse'],['funnel','Funnel'],['economics','Économie unitaire'],['roadmap','Roadmap 90j'],['experiments','Expériences']].map(([id,label]) => (
          <button key={id} onClick={()=>setTab(id)} style={{ padding:'5px 10px', borderRadius:5, fontSize:10, fontFamily:'Geist Mono,monospace', fontWeight:600, border:`1px solid ${tab===id?T.accent2+'50':T.border}`, background:tab===id?`${T.accent}15`:T.surface2, color:tab===id?T.accent2:T.muted2, cursor:'pointer', transition:'all .15s' }}>{label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:18, display:'flex', flexDirection:'column', gap:14 }}>

        {/* ── SUMMARY ── */}
        {tab === 'summary' && (
          <>
            <div style={{ display:'flex', gap:14, alignItems:'center', padding:16, background:T.surface2, borderRadius:12, border:`1px solid ${T.border2}` }}>
              <div style={{ width:72, height:72, borderRadius:'50%', border:`4px solid ${scoreColor(result.growth_score)}`, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', flexShrink:0, background:`${scoreColor(result.growth_score)}10` }}>
                <div style={{ fontSize:22, fontWeight:900, fontFamily:'Geist Mono,monospace', color:scoreColor(result.growth_score) }}>{result.growth_score}</div>
                <div style={{ fontSize:9, color:T.muted }}>/100</div>
              </div>
              <div>
                <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:16, color:scoreColor(result.growth_score) }}>{result.growth_label}</div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Score de maturité Growth</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:6 }}>Synthèse exécutive</div>
              <div style={{ background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:10, padding:14, fontSize:13, color:T.text, lineHeight:1.75 }}>{result.executive_summary}</div>
            </div>

            {result.funnel_analysis?.bottleneck && (
              <div style={{ padding:14, background:'rgba(248,113,113,.06)', border:'1px solid rgba(248,113,113,.2)', borderRadius:10 }}>
                <div style={{ fontSize:10, color:'#f87171', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:6 }}>🚧 Bottleneck principal</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{stageInfo(result.funnel_analysis.bottleneck.stage).icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:stageInfo(result.funnel_analysis.bottleneck.stage).color, textTransform:'capitalize' }}>{result.funnel_analysis.bottleneck.stage}</span>
                  {result.funnel_analysis.bottleneck.estimated_revenue_impact && <span style={{ fontSize:11, color:'#34d399', fontFamily:'Geist Mono,monospace', marginLeft:'auto' }}>{result.funnel_analysis.bottleneck.estimated_revenue_impact}</span>}
                </div>
                <div style={{ fontSize:12, color:T.muted2 }}>{result.funnel_analysis.bottleneck.reason}</div>
              </div>
            )}

            {result.north_star_recommendation && (
              <div style={{ padding:14, background:`${T.accent}08`, border:`1px solid ${T.accent}25`, borderRadius:10 }}>
                <div style={{ fontSize:10, color:T.accent2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:6 }}>⭐ North Star recommandée</div>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:4 }}>{result.north_star_recommendation.metric}</div>
                <div style={{ display:'flex', gap:12, marginBottom:6 }}>
                  <span style={{ fontSize:11, color:T.muted }}>Actuel : <strong style={{ color:'#fb923c' }}>{result.north_star_recommendation.current}</strong></span>
                  <span style={{ fontSize:11, color:T.muted }}>→ Cible 90j : <strong style={{ color:'#34d399' }}>{result.north_star_recommendation['90day_target']}</strong></span>
                </div>
                <div style={{ fontSize:11, color:T.muted2, fontStyle:'italic' }}>{result.north_star_recommendation.why}</div>
              </div>
            )}

            {result.risks?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Risques identifiés</div>
                {result.risks.map((r,i) => {
                  const c = r.severity==='Critique'?'#f87171':r.severity==='Élevé'?'#fb923c':r.severity==='Modéré'?'#facc15':'#34d399'
                  return (
                    <div key={i} style={{ padding:'10px 12px', marginBottom:6, background:T.surface2, border:`1px solid ${c}25`, borderLeft:`3px solid ${c}`, borderRadius:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', fontWeight:700, color:c, padding:'1px 6px', borderRadius:3, background:`${c}12` }}>{r.severity}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{r.risk}</span>
                      </div>
                      <div style={{ fontSize:11, color:T.muted2 }}>→ {r.mitigation}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {result.conclusion && <div style={{ background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:10, padding:14, fontSize:13, color:T.muted2, lineHeight:1.75, fontStyle:'italic' }}>{result.conclusion}</div>}
          </>
        )}

        {/* ── FUNNEL ── */}
        {tab === 'funnel' && result.funnel_analysis?.stages && (
          <>
            {result.funnel_analysis.funnel_efficiency && <div style={{ background:T.surface2, borderRadius:10, padding:14, fontSize:13, color:T.muted2, lineHeight:1.7, border:`1px solid ${T.border2}` }}>{result.funnel_analysis.funnel_efficiency}</div>}
            {Object.entries(STAGES).map(([sk, sv]) => {
              const s = result.funnel_analysis.stages[sk]
              if (!s) return null
              const pc = s.priority==='high'?'#f87171':s.priority==='medium'?'#facc15':'#34d399'
              return (
                <div key={sk} style={{ background:sv.bg, border:`1px solid ${sv.border}`, borderRadius:10, padding:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span>{sv.icon}</span>
                    <span style={{ fontWeight:700, color:sv.color, fontFamily:'Geist Mono,monospace', fontSize:12 }}>{sv.label}</span>
                    <span style={{ fontSize:11, fontFamily:'Geist Mono,monospace', fontWeight:700, color:pc, marginLeft:'auto', padding:'2px 7px', borderRadius:4, background:`${pc}12` }}>Priorité {s.priority}</span>
                  </div>
                  <div style={{ fontSize:12, color:T.text, lineHeight:1.6, marginBottom:s.quick_win?8:0 }}>{s.assessment}</div>
                  {s.quick_win && <div style={{ fontSize:11, color:sv.color, fontStyle:'italic' }}>⚡ Quick win : {s.quick_win}</div>}
                </div>
              )
            })}
          </>
        )}

        {/* ── UNIT ECONOMICS ── */}
        {tab === 'economics' && result.clv_cac_analysis && (
          <>
            <div style={{ background:T.surface2, borderRadius:10, padding:14, fontSize:13, color:T.text, lineHeight:1.75, border:`1px solid ${T.border2}` }}>
              <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:6 }}>Santé économie unitaire : <span style={{ color:result.clv_cac_analysis.unit_economics_health==='Excellent'?'#34d399':result.clv_cac_analysis.unit_economics_health==='Bon'?'#34d399':result.clv_cac_analysis.unit_economics_health==='Acceptable'?'#facc15':'#f87171' }}>{result.clv_cac_analysis.unit_economics_health}</span></div>
              {result.clv_cac_analysis.ratio_assessment}
            </div>
            {result.clv_cac_analysis.improvement_scenarios?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Scénarios d'amélioration</div>
                {result.clv_cac_analysis.improvement_scenarios.map((s,i) => (
                  <div key={i} style={{ padding:'10px 12px', marginBottom:6, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{s.lever}</span>
                      <span style={{ fontSize:11, fontFamily:'Geist Mono,monospace', color:'#34d399' }}>→ {s.ratio_new}</span>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ fontSize:10, color:T.muted }}>CLV impact : {s.clv_impact}</span>
                      <span style={{ fontSize:10, color:effortColors[s.difficulty?.toLowerCase()?.includes('facil')?'low':s.difficulty?.toLowerCase()?.includes('moyen')?'medium':'high']||T.muted }}>Difficulté : {s.difficulty}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {[
              { title:'Réduire le CAC', items:result.clv_cac_analysis.cac_reduction_tips, color:'#fb923c' },
              { title:'Augmenter la CLV', items:result.clv_cac_analysis.clv_increase_tips, color:'#34d399' },
            ].map(({ title, items, color }) => items?.length > 0 && (
              <div key={title}>
                <div style={{ fontSize:10, color, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>{title}</div>
                {items.map((tip,i) => <div key={i} style={{ display:'flex', gap:8, padding:'7px 10px', marginBottom:5, background:T.surface2, borderLeft:`2px solid ${color}`, borderRadius:6, fontSize:12, color:T.muted2 }}><span style={{ color }}>→</span>{tip}</div>)}
              </div>
            ))}
          </>
        )}

        {/* ── ROADMAP ── */}
        {tab === 'roadmap' && (
          <>
            {result['90day_roadmap']?.map((m,i) => {
              const colors = ['#818cf8','#60a5fa','#34d399']
              const c = colors[i] || T.accent2
              return (
                <div key={i} style={{ background:T.surface2, border:`1px solid ${c}25`, borderRadius:10, overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px', background:`${c}12`, borderBottom:`1px solid ${c}20`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:c }}>Mois {m.month}</span>
                    <span style={{ fontSize:11, color:T.muted }}>{m.focus}</span>
                    {m.kpi_target && <span style={{ fontSize:11, color:'#34d399', fontFamily:'Geist Mono,monospace' }}>🎯 {m.kpi_target}</span>}
                  </div>
                  <div style={{ padding:14 }}>
                    {m.actions?.map((a,j) => (
                      <div key={j} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:`1px solid ${T.border}`, fontSize:12, color:T.text }}>
                        <span style={{ color:c, fontFamily:'Geist Mono,monospace', fontWeight:700, flexShrink:0 }}>{j+1}.</span>{a}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {result.growth_opportunities?.slice(0,4).map((o,i) => (
              <div key={i} style={{ padding:'10px 14px', background:T.surface2, border:`1px solid ${stageInfo(o.stage).color}25`, borderLeft:`3px solid ${stageInfo(o.stage).color}`, borderRadius:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:stageInfo(o.stage).color, textTransform:'uppercase', fontFamily:'Geist Mono,monospace' }}>{o.stage}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{o.title}</span>
                  <span style={{ marginLeft:'auto', fontSize:10, color:'#34d399', fontFamily:'Geist Mono,monospace' }}>{o.potential_impact}</span>
                </div>
                <div style={{ fontSize:11, color:T.muted2 }}>{o.description}</div>
                <div style={{ display:'flex', gap:8, marginTop:6 }}>
                  <span style={{ fontSize:10, color:effortColors[o.effort]||T.muted, fontFamily:'Geist Mono,monospace' }}>Effort: {o.effort}</span>
                  <span style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace' }}>⏱ {o.timeframe}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── EXPERIMENTS ── */}
        {tab === 'experiments' && (
          <>
            <div style={{ fontSize:10, color:T.muted, marginBottom:4 }}>Backlog d'expériences Growth à lancer en priorité</div>
            {result.experiment_backlog?.map((exp,i) => {
              const sv = stageInfo(exp.stage)
              return (
                <div key={i} style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:10, padding:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', padding:'2px 7px', borderRadius:4, background:sv.bg, color:sv.color, border:`1px solid ${sv.border}` }}>{sv.icon} {exp.stage}</span>
                    <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', color:T.muted, padding:'2px 7px', borderRadius:4, background:T.surface, border:`1px solid ${T.border}` }}>{exp.test_type}</span>
                    <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', color:T.muted }}>⏱ {exp.duration_days}j</span>
                    <span style={{ fontSize:10, color:effortColors[exp.effort]||T.muted, fontFamily:'Geist Mono,monospace', marginLeft:'auto' }}>Effort: {exp.effort}</span>
                  </div>
                  <div style={{ fontSize:12, fontStyle:'italic', color:T.text, lineHeight:1.6, marginBottom:6 }}>"{exp.hypothesis}"</div>
                  <div style={{ fontSize:11, color:sv.color }}>Métrique : {exp.metric_to_move}</div>
                </div>
              )
            })}
            {result.retention_deep_dive && (
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:10, color:'#34d399', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:10 }}>🔄 Stratégie Rétention approfondie</div>
                {result.retention_deep_dive.churn_drivers?.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, color:T.muted2, marginBottom:6 }}>Causes de churn</div>
                    {result.retention_deep_dive.churn_drivers.map((d,i) => <div key={i} style={{ fontSize:11, color:T.muted2, padding:'4px 10px', background:T.surface2, borderLeft:'2px solid #f87171', borderRadius:5, marginBottom:4 }}>⚠ {d}</div>)}
                  </div>
                )}
                {result.retention_deep_dive.reactivation_strategy && (
                  <div style={{ padding:12, background:'rgba(52,211,153,.05)', border:'1px solid rgba(52,211,153,.15)', borderRadius:8, fontSize:12, color:T.muted2 }}>
                    <strong style={{ color:'#34d399' }}>Réactivation : </strong>{result.retention_deep_dive.reactivation_strategy}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Export Word (via HTML print) ─────────────────────────────────────────────
const exportWord = (session, aiResult) => {
  const s = session
  const r = aiResult
  const stagesHTML = Object.entries(STAGES).map(([sk, sv]) => {
    const d = s.aarrr?.[sk] || {}
    const metrics = (d.metrics||[]).map(m => `<tr><td>${m.name}</td><td><strong>${m.value}</strong></td><td style="color:${TREND_COLORS[m.trend]||'#666'}">${TREND_ICONS[m.trend]||'→'}</td><td>${m.benchmark||'—'}</td></tr>`).join('')
    return `<h2 style="color:${sv.color};border-left:4px solid ${sv.color};padding-left:12px;margin-top:24px">${sv.icon} ${sv.label} — Score: ${d.score||'?'}/10</h2>
<table border="1" style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px"><thead><tr style="background:#f0f0f0"><th>Métrique</th><th>Valeur</th><th>Tendance</th><th>Benchmark</th></tr></thead><tbody>${metrics}</tbody></table>
${d.actions?.length?`<p><strong>Actions :</strong> ${d.actions.join(' · ')}</p>`:''}`
  }).join('')

  const cac = s.clv_cac?.cac || {}; const clv = s.clv_cac?.clv || {}; const ratio = s.clv_cac?.ratio || {}
  const clvCalc = clv.arpu_monthly > 0 ? Math.round(clv.arpu_monthly * (clv.avg_lifespan_months||12) * (clv.gross_margin_pct||70) / 100) : clv.value || 0

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${s.name} — Growth Dashboard</title>
<style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;color:#333;line-height:1.6}h1{color:#6366f1;border-bottom:2px solid #6366f1;padding-bottom:8px}h2{margin-top:24px}table{border-collapse:collapse;width:100%}td,th{padding:7px 10px;border:1px solid #ddd;text-align:left}tr:nth-child(even){background:#f9f9f9}.metric-card{display:inline-block;margin:6px;padding:10px 16px;background:#f0f4ff;border-radius:6px;text-align:center}.score{font-size:24px;font-weight:bold;color:#6366f1}@media print{body{margin:20px}}</style></head>
<body>
<h1>📊 Growth Dashboard — ${s.name}</h1>
<p>${s.companyName ? `<strong>${s.companyName}</strong> · ` : ''}${s.sector||''} · ${s.businessModel||''}</p>
${s.summary?`<p style="background:#f0f4ff;padding:12px;border-radius:8px">${s.summary}</p>`:''}
${r?`<p style="background:#e8fdf2;padding:12px;border-radius:8px"><strong>Score Growth IA : ${r.growth_score}/100 — ${r.growth_label}</strong></p>`:''}
<h2>💰 CLV / CAC</h2>
<table><tr><th>Indicateur</th><th>Valeur</th><th>Détail</th></tr>
<tr><td>CAC</td><td><strong>${cac.value||0}${cac.currency||'€'}</strong></td><td>Marketing: ${cac.breakdown?.marketing||0}€ · Sales: ${cac.breakdown?.sales||0}€ · Onboarding: ${cac.breakdown?.onboarding||0}€</td></tr>
<tr><td>CLV</td><td><strong>${clvCalc}${clv.currency||'€'}</strong></td><td>ARPU ${clv.arpu_monthly||0}€/m × ${clv.avg_lifespan_months||0}m × ${clv.gross_margin_pct||70}% marge</td></tr>
<tr><td>Ratio CLV/CAC</td><td><strong>${ratio.value||0}:1</strong></td><td>${ratio.label||''} — ${ratio.health||''}</td></tr>
<tr><td>Payback period</td><td><strong>${s.clv_cac?.payback_period_months||0} mois</strong></td><td></td></tr>
</table>
<h2>🔢 Framework AARRR</h2>${stagesHTML}
${r?.executive_summary?`<h2>🎯 Analyse IA — Synthèse</h2><p>${r.executive_summary}</p>`:''}
${r?.['90day_roadmap']?.length?`<h2>📅 Roadmap 90 jours</h2>${r['90day_roadmap'].map(m=>`<h3>Mois ${m.month} — ${m.focus}</h3><ul>${m.actions?.map(a=>`<li>${a}</li>`).join('')||''}</ul><p><em>KPI cible : ${m.kpi_target||''}</em></p>`).join('')}`:''}
${r?.conclusion?`<h2>💡 Conclusion</h2><p><em>${r.conclusion}</em></p>`:''}
<p style="margin-top:40px;font-size:11px;color:#999">Exporté le ${new Date().toLocaleString('fr-FR')} — Growth Dashboard AARRR</p>
<div style="text-align:right;margin-top:16px"><button onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨️ Imprimer / Enregistrer en Word</button></div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = `Growth_${s.name.replace(/\s+/g,'_')}_${Date.now()}.html`; a.click(); URL.revokeObjectURL(url)
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GrowthPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,      setProject]      = useState(null)
  const [sessions,     setSessions]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [newForm,      setNewForm]      = useState({ name:'' })
  const [theme,        setTheme]        = useState('dark')
  const [showGenPanel, setShowGenPanel] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [aiResult,     setAiResult]     = useState(null)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [view,         setView]         = useState('dashboard')  // dashboard | edit-aarrr | edit-clvcac
  const [activeStage,  setActiveStage]  = useState('acquisition')
  const [toast,        setToast]        = useState(null)

  const T = THEMES[theme] || THEMES.dark

  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects||[]).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.Growth || []
        setSessions(list)
        if (list.length > 0) {
          const last = list[list.length-1]
          setActiveId(last.id)
          if (last.aiResult) setAiResult(last.aiResult)
          if (last.theme)    setTheme(last.theme)
        }
      }
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects||[]).map(p => p.id!==projectId ? p : { ...p, tools: { ...(p.tools||{}), Growth: updated } })
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(()=>setToast(null),3000) }
  const active = sessions.find(s => s.id === activeId) || null

  const createSession = () => {
    if (!newForm.name.trim()) return
    const s = emptySession(newForm.name.trim())
    const updated = [...sessions, s]
    setSessions(updated); setActiveId(s.id); setAiResult(null); persist(updated)
    setShowNewForm(false); setNewForm({ name:'' })
    showToast(`Session "${s.name}" créée`)
  }

  const deleteSession = (id) => {
    const updated = sessions.filter(s => s.id!==id)
    setSessions(updated); persist(updated)
    if (activeId===id) { setActiveId(updated[updated.length-1]?.id||null); setAiResult(null) }
    showToast('Session supprimée', 'info')
  }

  const updateActive = useCallback((patch) => {
    setSessions(prev => {
      const updated = prev.map(s => s.id===activeId ? { ...s, ...patch } : s)
      setTimeout(()=>persist(updated),0)
      return updated
    })
  }, [activeId, persist])

  const updateStage = (stageKey, patch) => {
    updateActive({ aarrr: { ...(active?.aarrr||{}), [stageKey]: { ...(active?.aarrr?.[stageKey]||emptyStageData()), ...patch } } })
  }

  const handleGenerated = (data) => {
    const s = active
      ? { ...active, companyName:data.companyName||active.companyName, sector:data.sector||active.sector, businessModel:data.businessModel||active.businessModel, summary:data.summary||'', aarrr:data.aarrr, clv_cac:data.clv_cac, growthLevers:data.growthLevers||[], quickWins:data.quickWins||[], initialInsights:data.initialInsights||[], northStarMetric:data.northStarMetric||active.northStarMetric, aiResult:null }
      : { ...emptySession(data.companyName||'Session IA'), companyName:data.companyName||'', sector:data.sector||'', businessModel:data.businessModel||'SaaS', summary:data.summary||'', aarrr:data.aarrr, clv_cac:data.clv_cac, growthLevers:data.growthLevers||[], quickWins:data.quickWins||[], initialInsights:data.initialInsights||[], northStarMetric:data.northStarMetric||{metric:'',current:'',target:'',why:''} }

    if (active) {
      updateActive(s)
    } else {
      const updated = [...sessions, s]
      setSessions(updated); setActiveId(s.id); persist(updated)
    }
    setAiResult(null); showToast('Dashboard Growth généré par IA ✓')
  }

  const runAnalysis = async () => {
    if (!active) return
    setAiLoading(true); setShowAnalysis(true); setAiResult(null)
    try {
      const res  = await fetch('/api/generer-management/generer-fidelisation', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ aarrr:active.aarrr, clv_cac:active.clv_cac, companyName:active.companyName, sector:active.sector, businessModel:active.businessModel, northStarMetric:active.northStarMetric, projectName:project?.name||active.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Erreur serveur')
      setAiResult(data.result)
      updateActive({ aiResult:data.result })
      showToast('Analyse Growth complète ✓')
    } catch (err) { showToast(err.message,'error'); setShowAnalysis(false) }
    setAiLoading(false)
  }

  const changeTheme = (tid) => { setTheme(tid); if(active) updateActive({ theme:tid }) }

  const exportJSON = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ session:active, aiResult, exportedAt:new Date().toISOString() },null,2)], { type:'application/json' })
    const url  = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download=`Growth_${active.name.replace(/\s+/g,'_')}_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url)
    showToast('Export JSON téléchargé')
  }

  const exportCSV = () => {
    if (!active) return
    const rows = [['Étape AARRR','Métrique','Valeur','Tendance','Benchmark']]
    Object.entries(STAGES).forEach(([sk,sv]) => {
      const d = active.aarrr?.[sk] || {}
      ;(d.metrics||[]).forEach(m => rows.push([sv.label, m.name, m.value, m.trend||'', m.benchmark||'']))
    })
    const cac = active.clv_cac?.cac||{}; const clv = active.clv_cac?.clv||{}
    rows.push(['CLV/CAC','CAC',cac.value||0,'',''],['CLV/CAC','CLV',clv.value||0,'',''],['CLV/CAC','Ratio CLV/CAC',active.clv_cac?.ratio?.value||0,'',''],['CLV/CAC','Payback (mois)',active.clv_cac?.payback_period_months||0,'',''])
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})
    const url  = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download=`Growth_${active.name.replace(/\s+/g,'_')}_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url)
    showToast('Export CSV téléchargé')
  }

  const handleImport = (e) => {
    const file = e.target.files[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const s = data.session || data
        if (!s.aarrr || !s.name) { showToast('Fichier invalide','error'); return }
        if (window.confirm(`Importer "${s.name}" ?`)) {
          const ns = { ...s, id:uid(), createdAt:s.createdAt||new Date().toISOString() }
          const updated = [...sessions, ns]
          setSessions(updated); setActiveId(ns.id); setAiResult(ns.aiResult||null)
          if(ns.theme) setTheme(ns.theme)
          persist(updated); showToast(`"${ns.name}" importé`)
        }
      } catch { showToast('Erreur lecture JSON','error') }
    }
    reader.readAsText(file,'UTF-8'); e.target.value=''
  }

  // CLV computed
  const clvCalc = active?.clv_cac?.clv ? Math.round((active.clv_cac.clv.arpu_monthly||0) * (active.clv_cac.clv.avg_lifespan_months||12) * (active.clv_cac.clv.gross_margin_pct||70) / 100) : 0
  const ratio = active?.clv_cac?.cac?.value > 0 ? parseFloat(((active.clv_cac.clv?.value||clvCalc) / active.clv_cac.cac.value).toFixed(1)) : 0
  const rh    = ratioHealth(ratio)

  // ── FIX 1: btn helper — replaced spread in style with Object.assign ──────────
  const btnBase = { display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:6, cursor:'pointer', fontFamily:'Geist Mono,monospace', fontSize:11, letterSpacing:'.04em', border:`1px solid ${T.border2}`, background:T.surface, color:T.muted2, transition:'all .15s', whiteSpace:'nowrap' }
  const btn = (label, onClick, extraStyle) => (
    <button onClick={onClick} style={Object.assign({}, btnBase, extraStyle || {})}>{label}</button>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:${T.bg};color:${T.text};font-family:'Syne',sans-serif}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:${T.border2};border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        input,textarea,select{font-family:'Syne',sans-serif}
        .litem{padding:10px 12px;border-radius:8px;cursor:pointer;border:1px solid transparent;transition:all .15s}
        .litem:hover{background:${T.surface2}}
        .litem.active{background:${T.accent}10;border-color:${T.accent}30}
        .toast{position:fixed;bottom:24px;right:24px;z-index:900;background:${T.surface};border:1px solid ${T.border2};border-radius:8px;padding:12px 18px;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:slideUp .2s ease;display:flex;align-items:center;gap:8px}
        .toast.error{border-color:rgba(248,113,113,.3);color:#f87171}
      `}</style>

      <div style={{ minHeight:'100vh', background:T.bg, color:T.text }}>

        {/* ── Topbar ── */}
        <header style={{ height:56, background:T.surface, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', padding:'0 20px', gap:10, position:'sticky', top:0, zIndex:80, flexWrap:'wrap' }}>
          {btn('← Retour', () => router.push(`/management${projectId?`?project=${projectId}`:''}`))}
          <div>
            <div style={{ fontFamily:'Instrument Serif,serif', fontSize:18, fontStyle:'italic' }}>Growth Dashboard — AARRR & CLV/CAC</div>
            {project && <div style={{ fontSize:11, color:T.muted, fontFamily:'Geist Mono,monospace' }}>{project.name}</div>}
          </div>

          <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            {/* View tabs */}
            {active && (
              <div style={{ display:'flex', gap:2, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:8, padding:2 }}>
                {[['dashboard','📊 Dashboard'],['edit-aarrr','✏️ AARRR'],['edit-clvcac','💰 CLV/CAC']].map(([v,l]) => (
                  <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontFamily:'Geist Mono,monospace', border:'none', background:view===v?T.surface3:'transparent', color:view===v?T.text:T.muted, cursor:'pointer', transition:'all .15s' }}>{l}</button>
                ))}
              </div>
            )}

            {/* FIX 2: Theme select — use Object.entries to get proper keys */}
            <select
              style={{ background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:6, padding:'6px 10px', fontSize:11, color:T.muted2, outline:'none', fontFamily:'Geist Mono,monospace' }}
              value={theme}
              onChange={e=>changeTheme(e.target.value)}
            >
              {Object.entries(THEMES).map(([tid, t]) => (
                <option key={tid} value={tid}>{t.name}</option>
              ))}
            </select>

            {btn('🚀 Générer', ()=>setShowGenPanel(true), { background:`${T.accent}18`, borderColor:`${T.accent}40`, color:T.accent2 })}

            {/* FIX 3: No more array of btn() calls — render directly to avoid missing key */}
            {active && active.aarrr && (
              <button
                onClick={runAnalysis}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:6, cursor:'pointer', fontFamily:'Geist Mono,monospace', fontSize:11, border:'1px solid rgba(52,211,153,.25)', background:'rgba(52,211,153,.08)', color:'#34d399', transition:'all .15s', whiteSpace:'nowrap' }}
              >
                📈 Analyser
              </button>
            )}

            {active && (
              <select
                style={{ background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:6, padding:'6px 10px', fontSize:11, color:T.muted2, outline:'none', fontFamily:'Geist Mono,monospace' }}
                defaultValue=""
                onChange={e=>{ if(e.target.value==='json')exportJSON(); if(e.target.value==='csv')exportCSV(); if(e.target.value==='word')exportWord(active,aiResult); e.target.value='' }}
              >
                <option value="" disabled>↓ Exporter</option>
                <option value="json">JSON (complet)</option>
                <option value="csv">CSV (métriques)</option>
                <option value="word">Word/HTML (rapport)</option>
              </select>
            )}

            <label style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:6, cursor:'pointer', fontFamily:'Geist Mono,monospace', fontSize:11, border:`1px solid ${T.border2}`, background:T.surface, color:T.muted2 }}>
              ↑ Importer<input type="file" accept=".json" hidden onChange={handleImport} />
            </label>
          </div>
        </header>

        <div style={{ display:'grid', gridTemplateColumns:'230px 1fr', height:'calc(100vh - 56px)', overflow:'hidden' }}>

          {/* ── Left panel ── */}
          <aside style={{ background:T.surface, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:10, color:T.muted, letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'Geist Mono,monospace' }}>Sessions ({sessions.length})</span>
            </div>

            <div style={{ flex:1, overflow:'auto', padding:8, display:'flex', flexDirection:'column', gap:2 }}>
              {sessions.length===0 && <div style={{ textAlign:'center', padding:'40px 16px' }}><div style={{ fontSize:36, opacity:.2, marginBottom:12 }}>🚀</div><div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>Créez ou générez votre premier dashboard Growth</div></div>}
              {sessions.map(s => {
                const r = s.clv_cac?.ratio?.value || 0
                const rh2 = ratioHealth(r)
                return (
                  <div key={s.id} className={`litem ${activeId===s.id?'active':''}`} onClick={()=>{ setActiveId(s.id); setAiResult(s.aiResult||null); if(s.theme) setTheme(s.theme) }}>
                    <button onClick={e=>{e.stopPropagation();deleteSession(s.id)}} style={{ float:'right', background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:11, opacity:.4 }} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=.4}>✕</button>
                    <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:3 }}>{s.name}</div>
                    <div style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace' }}>{s.companyName||''}{s.sector?` · ${s.sector}`:''}</div>
                    {r > 0 && <div style={{ fontSize:10, color:rh2.color, fontFamily:'Geist Mono,monospace', marginTop:3 }}>CLV/CAC: {r}:1 — {rh2.label}</div>}
                    {s.aiResult && <div style={{ fontSize:9, color:T.accent2, marginTop:2, fontFamily:'Geist Mono,monospace' }}>✦ Analysé — Score: {s.aiResult.growth_score}/100</div>}
                  </div>
                )
              })}
            </div>

            {showNewForm ? (
              <div style={{ padding:12, borderTop:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:8 }}>
                <input style={{ background:T.bg, border:`1px solid ${T.border2}`, borderRadius:6, padding:'8px 10px', fontSize:12, color:T.text, outline:'none', width:'100%' }} placeholder="Nom de la session" value={newForm.name} onChange={e=>setNewForm({name:e.target.value})} onKeyDown={e=>e.key==='Enter'&&createSession()} autoFocus />
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={createSession} style={{ flex:1, padding:'7px', borderRadius:6, background:T.accent, border:'none', color:'#fff', cursor:'pointer', fontSize:11, fontFamily:'Geist Mono,monospace' }}>Créer</button>
                  <button onClick={()=>setShowNewForm(false)} style={{ padding:'7px 12px', borderRadius:6, background:T.surface2, border:`1px solid ${T.border}`, color:T.muted, cursor:'pointer', fontSize:11 }}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ padding:12, borderTop:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:6 }}>
                <button onClick={()=>setShowNewForm(true)} style={{ width:'100%', padding:'7px', borderRadius:6, background:T.surface2, border:`1px solid ${T.border}`, color:T.muted2, cursor:'pointer', fontSize:11, fontFamily:'Geist Mono,monospace' }}>+ Manuel</button>
                <button onClick={()=>setShowGenPanel(true)} style={{ width:'100%', padding:'7px', borderRadius:6, background:`${T.accent}15`, border:`1px solid ${T.accent}35`, color:T.accent2, cursor:'pointer', fontSize:11, fontFamily:'Geist Mono,monospace' }}>🚀 Générer par IA</button>
              </div>
            )}
          </aside>

          {/* ── Main ── */}
          <main style={{ overflow:'auto', display:'flex', flexDirection:'column', background:T.bg }}>
            {!active ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:40, textAlign:'center' }}>
                <div style={{ fontSize:56, opacity:.2 }}>🚀</div>
                <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:22, color:T.text }}>Growth Dashboard — AARRR & CLV/CAC</div>
                <div style={{ fontSize:13, color:T.muted, maxWidth:440, lineHeight:1.7 }}>Pilotez votre croissance avec le framework Pirate Metrics et optimisez votre ratio CLV/CAC pour une acquisition rentable.</div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>setShowGenPanel(true)} style={{ padding:'10px 20px', borderRadius:8, background:T.accent, border:'none', color:'#fff', cursor:'pointer', fontSize:13, fontFamily:'Geist Mono,monospace' }}>🚀 Générer par IA</button>
                  <button onClick={()=>setShowNewForm(true)} style={{ padding:'10px 20px', borderRadius:8, background:T.surface, border:`1px solid ${T.border2}`, color:T.muted2, cursor:'pointer', fontSize:13, fontFamily:'Geist Mono,monospace' }}>+ Créer manuellement</button>
                </div>
              </div>
            ) : (

              <div style={{ padding:20, display:'flex', flexDirection:'column', gap:20 }}>

                {/* Session header */}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                  <div>
                    <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:22, color:T.text }}>{active.name}</div>
                    <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>
                      {active.companyName && <span style={{ color:T.muted2, fontWeight:600 }}>{active.companyName}</span>}
                      {active.sector && <span> · {active.sector}</span>}
                      {active.businessModel && <span> · {active.businessModel}</span>}
                    </div>
                    {active.summary && <div style={{ fontSize:12, color:T.muted2, marginTop:6, maxWidth:600, lineHeight:1.6, fontStyle:'italic' }}>{active.summary}</div>}
                  </div>
                  {aiResult && <div style={{ padding:'8px 16px', borderRadius:20, background:`${T.accent}12`, border:`1px solid ${T.accent}30`, fontSize:12, color:T.accent2, fontFamily:'Geist Mono,monospace', cursor:'pointer' }} onClick={()=>setShowAnalysis(true)}>✦ Score Growth: {aiResult.growth_score}/100 — {aiResult.growth_label}</div>}
                </div>

                {/* ── DASHBOARD VIEW ── */}
                {view === 'dashboard' && (
                  <>
                    {/* CLV/CAC hero */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                      {[
                        { label:'CAC', val:`${active.clv_cac?.cac?.value||0}€`, color:'#fb923c', icon:'💸', sub:'Coût d\'acquisition client' },
                        { label:'CLV', val:`${clvCalc||active.clv_cac?.clv?.value||0}€`, color:'#34d399', icon:'💎', sub:'Valeur vie client' },
                        { label:'Ratio CLV/CAC', val:`${ratio}:1`, color:rh.color, icon:'⚖️', sub:rh.label },
                        { label:'Payback', val:`${active.clv_cac?.payback_period_months||0} mois`, color:'#facc15', icon:'⏱', sub:'Pour récupérer le CAC' },
                      ].map(s => (
                        <div key={s.label} style={{ background:T.surface, border:`1px solid ${s.color}25`, borderRadius:12, padding:16, cursor:'pointer' }} onClick={()=>setView('edit-clvcac')}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                            <span style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'Geist Mono,monospace' }}>{s.label}</span>
                            <span style={{ fontSize:20 }}>{s.icon}</span>
                          </div>
                          <div style={{ fontSize:26, fontWeight:800, color:s.color, fontFamily:'Geist Mono,monospace', lineHeight:1 }}>{s.val}</div>
                          <div style={{ fontSize:10, color:T.muted, marginTop:5 }}>{s.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* AARRR funnel */}
                    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:20 }}>
                      <div style={{ fontSize:11, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:16 }}>🏴‍☠️ AARRR — Pirate Metrics</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {Object.entries(STAGES).map(([sk, sv]) => {
                          const d = active.aarrr?.[sk] || {}
                          const score = d.score || 5
                          const health = d.health || 'average'
                          const metrics = (d.metrics||[]).slice(0,2)
                          return (
                            <div key={sk} style={{ flex:'1 1 160px', background:sv.bg, border:`1px solid ${sv.border}`, borderRadius:10, padding:14, cursor:'pointer', position:'relative', overflow:'hidden' }} onClick={()=>{ setView('edit-aarrr'); setActiveStage(sk) }}>
                              <div style={{ position:'absolute', bottom:0, left:0, width:`${score*10}%`, height:3, background:sv.color, borderRadius:'0 2px 2px 0', opacity:.6 }} />
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                                <span style={{ fontSize:20 }}>{sv.icon}</span>
                                <span style={{ fontSize:11, fontFamily:'Geist Mono,monospace', fontWeight:700, color:HEALTH_COLORS[health], padding:'2px 6px', borderRadius:4, background:`${HEALTH_COLORS[health]}15` }}>{HEALTH_LABELS[health]}</span>
                              </div>
                              <div style={{ fontSize:13, fontWeight:700, color:sv.color, marginBottom:2 }}>{sv.label}</div>
                              <div style={{ fontSize:10, color:T.muted, marginBottom:10 }}>{sv.short}</div>
                              <div style={{ fontSize:22, fontWeight:900, fontFamily:'Geist Mono,monospace', color:sv.color, lineHeight:1 }}>{score}<span style={{ fontSize:12, fontWeight:400 }}>/10</span></div>
                              {metrics.map((m,i) => (
                                <div key={i} style={{ marginTop:6, fontSize:10, color:T.muted2, display:'flex', justifyContent:'space-between' }}>
                                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{m.name}</span>
                                  <span style={{ color:TREND_COLORS[m.trend]||T.muted2, fontFamily:'Geist Mono,monospace', fontWeight:700, marginLeft:6 }}>{m.value}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* North Star */}
                    {(active.northStarMetric?.metric || active.initialInsights?.length > 0) && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                        {active.northStarMetric?.metric && (
                          <div style={{ background:T.surface, border:`1px solid ${T.accent}30`, borderRadius:12, padding:16 }}>
                            <div style={{ fontSize:10, color:T.accent2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>⭐ North Star Metric</div>
                            <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:6 }}>{active.northStarMetric.metric}</div>
                            <div style={{ display:'flex', gap:14 }}>
                              <div><div style={{ fontSize:12, color:'#fb923c', fontWeight:700 }}>{active.northStarMetric.current}</div><div style={{ fontSize:9, color:T.muted }}>Actuel</div></div>
                              <div><div style={{ fontSize:12, color:'#34d399', fontWeight:700 }}>{active.northStarMetric.target}</div><div style={{ fontSize:9, color:T.muted }}>Cible</div></div>
                            </div>
                            {active.northStarMetric.why && <div style={{ fontSize:11, color:T.muted, marginTop:8, fontStyle:'italic' }}>{active.northStarMetric.why}</div>}
                          </div>
                        )}
                        {active.quickWins?.length > 0 && (
                          <div style={{ background:T.surface, border:`1px solid rgba(52,211,153,.2)`, borderRadius:12, padding:16 }}>
                            <div style={{ fontSize:10, color:'#34d399', textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>⚡ Quick Wins</div>
                            {active.quickWins.slice(0,3).map((w,i) => <div key={i} style={{ display:'flex', gap:7, padding:'5px 0', borderBottom:`1px solid ${T.border}`, fontSize:12, color:T.muted2 }}><span style={{ color:'#34d399', flexShrink:0 }}>{i+1}.</span>{w}</div>)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Growth levers */}
                    {active.growthLevers?.length > 0 && (
                      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:20 }}>
                        <div style={{ fontSize:11, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:14 }}>🔧 Leviers de croissance</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {active.growthLevers.map((l,i) => {
                            const sv  = STAGES[l.stage] || { color:T.muted2, icon:'?' }
                            const efc = { low:'#34d399', medium:'#facc15', high:'#f87171' }
                            return (
                              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:T.surface2, borderRadius:8, border:`1px solid ${T.border}` }}>
                                <span>{sv.icon}</span>
                                <span style={{ flex:1, fontSize:12, color:T.text }}>{l.lever}</span>
                                <span style={{ fontSize:10, color:efc[l.effort]||T.muted, fontFamily:'Geist Mono,monospace', padding:'2px 6px', borderRadius:4, background:`${efc[l.effort]||T.muted}12` }}>Effort: {l.effort}</span>
                                <span style={{ fontSize:10, color:efc[l.impact]||T.muted, fontFamily:'Geist Mono,monospace', padding:'2px 6px', borderRadius:4, background:`${efc[l.impact]||T.muted}12` }}>Impact: {l.impact}</span>
                                <span style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace' }}>{l.timeframe}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── EDIT AARRR VIEW ── */}
                {view === 'edit-aarrr' && (
                  <div>
                    <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap' }}>
                      {Object.entries(STAGES).map(([sk,sv]) => (
                        <button key={sk} onClick={()=>setActiveStage(sk)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:`1px solid ${activeStage===sk?sv.color+'60':T.border2}`, background:activeStage===sk?sv.bg:T.surface2, color:activeStage===sk?sv.color:T.muted2, cursor:'pointer', fontSize:11, fontFamily:'Geist Mono,monospace', fontWeight:activeStage===sk?700:400, transition:'all .15s' }}>
                          <span>{sv.icon}</span> {sv.label}
                          <span style={{ fontSize:11, fontWeight:700, fontFamily:'Geist Mono,monospace', color:activeStage===sk?sv.color:T.muted }}>
                            {active.aarrr?.[sk]?.score||5}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div style={{ background:T.surface, border:`1px solid ${STAGES[activeStage].border}`, borderRadius:12, padding:20 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                        <span style={{ fontSize:24 }}>{STAGES[activeStage].icon}</span>
                        <div>
                          <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:18, color:STAGES[activeStage].color }}>{STAGES[activeStage].label}</div>
                          <div style={{ fontSize:11, color:T.muted }}>{STAGES[activeStage].desc}</div>
                        </div>
                      </div>
                      <StageEditor stageKey={activeStage} data={active.aarrr?.[activeStage]} onChange={patch => updateStage(activeStage, patch)} theme={theme} />
                    </div>
                  </div>
                )}

                {/* ── EDIT CLV/CAC VIEW ── */}
                {view === 'edit-clvcac' && (
                  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:20 }}>
                    <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:18, color:T.text, marginBottom:20 }}>💰 CLV / CAC — Économie unitaire</div>
                    <ClvCacEditor data={active.clv_cac} onChange={patch => updateActive({ clv_cac: patch })} theme={theme} />
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {showGenPanel && <AIGeneratePanel projectName={active?.name||project?.name||''} onGenerated={handleGenerated} onClose={()=>setShowGenPanel(false)} theme={theme} />}
        {showAnalysis && aiResult && <AnalysisPanel result={aiResult} onClose={()=>setShowAnalysis(false)} theme={theme} />}
        {aiLoading && !aiResult && (
          <div style={{ position:'fixed', right:0, top:56, bottom:0, width:520, background:T.surface, borderLeft:`1px solid ${T.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, zIndex:90 }}>
            <div style={{ width:32, height:32, border:`2px solid ${T.border2}`, borderTop:`2px solid ${T.accent}`, borderRadius:'50%', animation:'spin .8s linear infinite' }} />
            <div style={{ fontSize:13, color:T.muted2, fontFamily:'Geist Mono,monospace' }}>Analyse Growth en cours…</div>
          </div>
        )}
        {toast && <div className={`toast ${toast.type||''}`}>{toast.type==='error'?'✕':'✓'} {toast.msg}</div>}
      </div>
    </>
  )
}