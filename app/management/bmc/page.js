'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// ── Icons (inline SVG to avoid import issues) ─────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    wand:     <path d="M15 4L9 10M3 20l6-6M5 5l14 14M10 2l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z"/>,
    download: <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>,
    refresh:  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>,
    arrow:    <path d="M5 12h14M12 5l7 7-7 7"/>,
    check:    <path d="M20 6L9 17l-5-5"/>,
    back:     <path d="M19 12H5M12 5l-7 7 7 7"/>,
    alert:    <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>,
    target:   <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    zap:      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>,
    eye:      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    edit:     <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>,
    plus:     <path d="M12 5v14M5 12h14"/>,
    trash:    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>,
    spark:    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
    info:     <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

// ── BMC Block config ───────────────────────────────────────────
const BLOCKS_META = {
  keyPartners:           { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  label: 'KP', area: 'left-top'    },
  keyActivities:         { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  label: 'KA', area: 'center-top'  },
  keyResources:          { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   label: 'KR', area: 'center-bot'  },
  valuePropositions:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   label: 'VP', area: 'center'      },
  customerRelationships: { color: '#ec4899', bg: 'rgba(236,72,153,0.08)',  label: 'CR', area: 'right-top'   },
  channels:              { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'CH', area: 'right-bot'   },
  customerSegments:      { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'CS', area: 'right'       },
  costStructure:         { color: '#64748b', bg: 'rgba(100,116,139,0.08)', label: 'C$', area: 'bottom-left' },
  revenueStreams:         { color: '#22d3ee', bg: 'rgba(34,211,238,0.08)', label: 'R$', area: 'bottom-right' },
}

// ── Animated counter ──────────────────────────────────────────
function Counter({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const step = (value / duration) * 16
    const timer = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])
  return <>{display}</>
}

// ── Editable item ─────────────────────────────────────────────
function EditableItem({ value, onChange, onDelete, color }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value)
  const ref = useRef(null)

  const commit = () => { setEditing(false); if (val.trim()) onChange(val.trim()); else setVal(value) }

  return editing ? (
    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if(e.key==='Enter') commit(); if(e.key==='Escape') { setVal(value); setEditing(false) } }}
        autoFocus
        style={{
          flex:1, background:'rgba(255,255,255,0.06)', border:`1px solid ${color}50`,
          borderRadius:4, padding:'2px 6px', color:'#f0eff5', fontSize:11,
          outline:'none', fontFamily:'inherit',
        }}
      />
    </div>
  ) : (
    <div
      style={{
        display:'flex', alignItems:'flex-start', gap:6, padding:'4px 0',
        cursor:'text', borderRadius:4, transition:'background .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}
      onClick={() => setEditing(true)}
    >
      <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0, marginTop:5 }}/>
      <span style={{ flex:1, fontSize:11, color:'rgba(240,239,245,0.8)', lineHeight:1.5 }}>{value}</span>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        style={{
          opacity:0, background:'none', border:'none', cursor:'pointer',
          color:'#f87171', fontSize:12, padding:'0 2px', lineHeight:1,
          transition:'opacity .15s',
        }}
        className="del-btn"
      >✕</button>
    </div>
  )
}

// ── BMC Block card ────────────────────────────────────────────
function BMCBlock({ blockKey, block, meta, onUpdateItem, onDeleteItem, onAddItem, highlighted, onHighlight }) {
  const [adding, setAdding] = useState(false)
  const [newVal, setNewVal] = useState('')

  const commitAdd = () => {
    if (newVal.trim()) { onAddItem(newVal.trim()); setNewVal('') }
    setAdding(false)
  }

  return (
    <div
      style={{
        background: highlighted ? meta.bg : 'rgba(17,17,24,0.9)',
        border: `1px solid ${highlighted ? meta.color + '60' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 10,
        padding: '14px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'all .2s',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => onHighlight(blockKey)}
      onMouseLeave={() => onHighlight(null)}
    >
      {/* Top accent line */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:2,
        background: highlighted ? meta.color : 'transparent',
        transition:'background .2s',
      }}/>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{
            width:22, height:22, borderRadius:5,
            background:`${meta.color}20`, border:`1px solid ${meta.color}40`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:9, fontWeight:800, color:meta.color, letterSpacing:.5,
            fontFamily:'Geist Mono, monospace',
          }}>
            {meta.label}
          </div>
          <span style={{ fontSize:11, fontWeight:700, color:'rgba(240,239,245,0.9)', letterSpacing:.2 }}>
            {block.title}
          </span>
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          style={{
            width:18, height:18, borderRadius:4,
            background:`${meta.color}15`, border:`1px solid ${meta.color}30`,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:meta.color, transition:'all .15s',
          }}
        >
          <Icon name="plus" size={10}/>
        </button>
      </div>

      {/* Items */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:1 }}>
        <style>{`.del-btn { opacity:0 !important; } div:hover > .del-btn { opacity:1 !important; }`}</style>
        {(block.items || []).map((item, i) => (
          <EditableItem
            key={i}
            value={item}
            color={meta.color}
            onChange={val => onUpdateItem(i, val)}
            onDelete={() => onDeleteItem(i)}
          />
        ))}

        {adding && (
          <div style={{ display:'flex', gap:4, marginTop:2 }}>
            <input
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={e => { if(e.key==='Enter') commitAdd(); if(e.key==='Escape') setAdding(false) }}
              autoFocus
              placeholder="Nouvel élément..."
              style={{
                flex:1, background:'rgba(255,255,255,0.06)', border:`1px solid ${meta.color}50`,
                borderRadius:4, padding:'4px 8px', color:'#f0eff5', fontSize:11,
                outline:'none', fontFamily:'inherit',
              }}
            />
          </div>
        )}
      </div>

      {/* Insight */}
      {block.insight && (
        <div style={{
          padding:'6px 8px', borderRadius:6,
          background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)',
          fontSize:10, color:'rgba(240,239,245,0.4)', lineHeight:1.5,
          fontStyle:'italic',
        }}>
          {block.insight}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function BusinessCanvasPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const projectId    = searchParams.get('project')

  const [phase, setPhase]         = useState('input')    // 'input' | 'loading' | 'canvas'
  const [company, setCompany]     = useState('')
  const [industry, setIndustry]   = useState('')
  const [context, setContext]     = useState('')
  const [mode, setMode]           = useState('generate') // 'generate' | 'analyse'
  const [loadStep, setLoadStep]   = useState(0)
  const [canvas, setCanvas]       = useState(null)
  const [error, setError]         = useState('')
  const [highlighted, setHighlighted] = useState(null)
  const [activeTab, setActiveTab] = useState('canvas')   // 'canvas' | 'insights' | 'risks'
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  const LOAD_STEPS = [
    'Analyse du contexte marché...',
    'Identification des partenaires clés...',
    'Modélisation de la proposition de valeur...',
    'Construction des flux de revenus...',
    'Génération des insights stratégiques...',
  ]

  // ── Generate ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!company.trim()) return
    setPhase('loading'); setError(''); setLoadStep(0)
    let step = 0
    const iv = setInterval(() => { step = Math.min(step+1, LOAD_STEPS.length-1); setLoadStep(step) }, 1800)
    try {
      const res  = await fetch('/api/generer-management/generer-businesscanvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, industry, context, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCanvas(data)
      setPhase('canvas')
    } catch(err) {
      setError(err.message); setPhase('input')
    } finally {
      clearInterval(iv)
    }
  }

  // ── Canvas CRUD ───────────────────────────────────────────
  const updateItem = useCallback((blockKey, idx, val) => {
    setCanvas(prev => {
      const blocks = { ...prev.blocks }
      const items  = [...blocks[blockKey].items]
      items[idx]   = val
      blocks[blockKey] = { ...blocks[blockKey], items }
      return { ...prev, blocks }
    })
  }, [])

  const deleteItem = useCallback((blockKey, idx) => {
    setCanvas(prev => {
      const blocks = { ...prev.blocks }
      const items  = blocks[blockKey].items.filter((_,i) => i !== idx)
      blocks[blockKey] = { ...blocks[blockKey], items }
      return { ...prev, blocks }
    })
  }, [])

  const addItem = useCallback((blockKey, val) => {
    setCanvas(prev => {
      const blocks = { ...prev.blocks }
      const items  = [...blocks[blockKey].items, val]
      blocks[blockKey] = { ...blocks[blockKey], items }
      return { ...prev, blocks }
    })
  }, [])

  // ── Export ────────────────────────────────────────────────
  const exportCanvas = () => {
    const blob = new Blob([JSON.stringify(canvas, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bmc_${canvas.company.replace(/\s+/g,'_')}_${Date.now()}.json`
    a.click()
  }

  const exportCSV = () => {
    const rows = [['Bloc', 'Élément', 'Insight']]
    Object.entries(canvas.blocks).forEach(([key, block]) => {
      block.items.forEach((item, i) => {
        rows.push([block.title, item, i === 0 ? (block.insight || '') : ''])
      })
    })
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `bmc_${canvas.company}.csv`; a.click()
  }

  // ── Risk color ────────────────────────────────────────────
  const riskColor = l => l === 'high' ? '#ef4444' : l === 'medium' ? '#f59e0b' : '#22d3ee'

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --bg:#0a0a0f; --surface:#111118; --surface2:#18181f;
          --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.12);
          --text:#f0eff5; --muted:#6b6a7a; --muted2:#9896aa;
          --accent:#f59e0b; --accent2:#fbbf24;
          --green:#22d3a5; --red:#f87171;
        }
        body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping { 75%,100%{transform:scale(1.6);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        .fade-up { animation: fadeUp .4s ease both; }

        .bmc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1.4fr 1fr 1fr;
          grid-template-rows: 1fr 1fr auto;
          gap: 8px;
          height: 100%;
        }
        .cell-kp  { grid-column:1; grid-row:1/3; }
        .cell-ka  { grid-column:2; grid-row:1; }
        .cell-kr  { grid-column:2; grid-row:2; }
        .cell-vp  { grid-column:3; grid-row:1/3; }
        .cell-cr  { grid-column:4; grid-row:1; }
        .cell-ch  { grid-column:4; grid-row:2; }
        .cell-cs  { grid-column:5; grid-row:1/3; }
        .cell-cost { grid-column:1/4; grid-row:3; }
        .cell-rev  { grid-column:4/6; grid-row:3; }

        input[type='range']::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#f59e0b; cursor:pointer; border:2px solid #fff2; }
        input[type='range']::-webkit-slider-runnable-track { height:4px; background:rgba(255,255,255,0.1); border-radius:2px; }

        .tab-btn { padding:8px 18px; border-radius:6px; cursor:pointer; font-size:12px; font-family:'Geist Mono',monospace; border:1px solid transparent; transition:all .15s; background:transparent; color:var(--muted2); }
        .tab-btn.active { background:rgba(245,158,11,0.12); border-color:rgba(245,158,11,0.35); color:#f59e0b; }
        .tab-btn:hover:not(.active) { color:var(--text); border-color:var(--border2); }
      `}</style>

      <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:"'Syne',sans-serif" }}>

        {/* ── TOPBAR ── */}
        <header style={{
          height:56, background:'var(--surface)', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', padding:'0 24px', gap:16,
          position:'sticky', top:0, zIndex:100,
        }}>
          <button
            onClick={() => phase === 'canvas' ? setPhase('input') : router.back()}
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1px solid var(--border2)', borderRadius:6, padding:'6px 12px', cursor:'pointer', color:'var(--muted2)', fontSize:12, fontFamily:'Geist Mono,monospace' }}
          >
            <Icon name="back" size={13}/> Retour
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#f59e0b' }}/>
            <span style={{ fontFamily:'Instrument Serif,serif', fontSize:18, fontStyle:'italic' }}>Business Model Canvas</span>
            {canvas && (
              <span style={{ padding:'2px 8px', borderRadius:4, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', fontSize:10, color:'#f59e0b', fontFamily:'Geist Mono,monospace' }}>
                {canvas.company}
              </span>
            )}
          </div>

          {canvas && (
            <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
              {/* Tabs */}
              <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.03)', borderRadius:8, padding:3 }}>
                {[['canvas','⊟ Canvas'],['insights','◉ Insights'],['risks','⬡ Risques']].map(([id,label]) => (
                  <button key={id} className={`tab-btn ${activeTab===id?'active':''}`} onClick={() => setActiveTab(id)}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={exportCanvas}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:6, background:'rgba(255,255,255,0.05)', border:'1px solid var(--border2)', cursor:'pointer', color:'var(--muted2)', fontSize:11, fontFamily:'Geist Mono,monospace' }}>
                <Icon name="download" size={13}/> JSON
              </button>
              <button onClick={exportCSV}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:6, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', cursor:'pointer', color:'#f59e0b', fontSize:11, fontFamily:'Geist Mono,monospace' }}>
                <Icon name="download" size={13}/> CSV
              </button>
              <button onClick={() => setPhase('input')}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:6, background:'rgba(255,255,255,0.05)', border:'1px solid var(--border2)', cursor:'pointer', color:'var(--muted2)', fontSize:11, fontFamily:'Geist Mono,monospace' }}>
                <Icon name="refresh" size={13}/> Nouveau
              </button>
            </div>
          )}
        </header>

        {/* ═══ INPUT PHASE ═══ */}
        {phase === 'input' && (
          <div style={{ maxWidth:680, margin:'0 auto', padding:'60px 24px' }} className="fade-up">

            {/* Hero */}
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8, marginBottom:20,
                padding:'6px 16px', borderRadius:99, background:'rgba(245,158,11,0.1)',
                border:'1px solid rgba(245,158,11,0.25)',
              }}>
                <Icon name="spark" size={13}/>
                <span style={{ fontSize:11, color:'#f59e0b', fontFamily:'Geist Mono,monospace', letterSpacing:.1 }}>
                  Méthode Osterwalder · IA
                </span>
              </div>
              <h1 style={{ fontFamily:'Instrument Serif,serif', fontSize:42, fontStyle:'italic', lineHeight:1.1, marginBottom:12 }}>
                Construisez votre<br/>
                <span style={{ background:'linear-gradient(90deg,#f59e0b,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  modèle d'affaires
                </span>
              </h1>
              <p style={{ fontSize:14, color:'var(--muted2)', lineHeight:1.7 }}>
                Décrivez votre entreprise — l'IA génère les 9 blocs du BMC<br/>
                avec des insights stratégiques personnalisés.
              </p>
            </div>

            {error && (
              <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:24 }}>
                <Icon name="alert" size={15}/>
                <span style={{ fontSize:13, color:'#f87171' }}>{error}</span>
              </div>
            )}

            {/* Form */}
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Mode toggle */}
              <div>
                <div style={{ fontSize:10, color:'var(--muted)', letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'Geist Mono,monospace', marginBottom:10 }}>
                  Mode de génération
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { id:'generate', icon:'⚡', label:'Générer', desc:'BMC complet de zéro' },
                    { id:'analyse',  icon:'◉', label:'Analyser', desc:'Enrichir votre existant' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setMode(m.id)}
                      style={{
                        padding:'14px 16px', borderRadius:10, cursor:'pointer', textAlign:'left',
                        background: mode===m.id ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
                        border: mode===m.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                        transition:'all .15s',
                      }}>
                      <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
                      <div style={{ fontSize:13, fontWeight:700, color: mode===m.id ? '#f59e0b' : 'var(--text)', marginBottom:2 }}>{m.label}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Company */}
              <div>
                <label style={{ display:'block', fontSize:10, color:'var(--muted)', letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>
                  Nom de l'entreprise *
                </label>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handleGenerate()}
                  placeholder="Ex: Sumuria, Tesla, Airbnb..."
                  style={{
                    width:'100%', padding:'13px 16px', borderRadius:10,
                    background:'var(--surface)', border:'1px solid var(--border2)',
                    color:'var(--text)', fontSize:15, outline:'none', fontFamily:'inherit',
                    transition:'border-color .15s',
                  }}
                  onFocus={e => e.target.style.borderColor='rgba(245,158,11,0.5)'}
                  onBlur={e => e.target.style.borderColor='var(--border2)'}
                  autoFocus
                />
              </div>

              {/* Industry */}
              <div>
                <label style={{ display:'block', fontSize:10, color:'var(--muted)', letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>
                  Secteur d'activité
                </label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                  {['SaaS','FinTech','E-commerce','Santé','Éducation','Logistique','AgriTech','Retail'].map(s => (
                    <button key={s} onClick={() => setIndustry(s)}
                      style={{
                        padding:'5px 12px', borderRadius:6, cursor:'pointer', fontSize:11,
                        fontFamily:'Geist Mono,monospace',
                        background: industry===s ? 'rgba(245,158,11,0.15)' : 'var(--surface2)',
                        border: industry===s ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                        color: industry===s ? '#f59e0b' : 'var(--muted2)',
                        transition:'all .15s',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
                <input
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="Ou tapez votre secteur..."
                  style={{
                    width:'100%', padding:'11px 14px', borderRadius:8,
                    background:'var(--surface)', border:'1px solid var(--border)',
                    color:'var(--text)', fontSize:13, outline:'none', fontFamily:'inherit',
                    transition:'border-color .15s',
                  }}
                  onFocus={e => e.target.style.borderColor='rgba(245,158,11,0.4)'}
                  onBlur={e => e.target.style.borderColor='var(--border)'}
                />
              </div>

              {/* Context */}
              <div>
                <label style={{ display:'block', fontSize:10, color:'var(--muted)', letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>
                  Contexte additionnel
                </label>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="Ex: Startup B2B ciblant les PME africaines, modèle freemium, 3 ans d'existence..."
                  rows={3}
                  style={{
                    width:'100%', padding:'11px 14px', borderRadius:8,
                    background:'var(--surface)', border:'1px solid var(--border)',
                    color:'var(--text)', fontSize:13, outline:'none', resize:'vertical',
                    fontFamily:'inherit', lineHeight:1.6, minHeight:80,
                    transition:'border-color .15s',
                  }}
                  onFocus={e => e.target.style.borderColor='rgba(245,158,11,0.4)'}
                  onBlur={e => e.target.style.borderColor='var(--border)'}
                />
              </div>

              {/* CTA */}
              <button
                onClick={handleGenerate}
                disabled={!company.trim()}
                style={{
                  width:'100%', padding:'16px', borderRadius:12, cursor: company.trim() ? 'pointer' : 'not-allowed',
                  background: company.trim() ? 'linear-gradient(135deg,#f59e0b,#ec4899)' : 'var(--surface2)',
                  border:'none', color: company.trim() ? '#fff' : 'var(--muted)',
                  fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  boxShadow: company.trim() ? '0 8px 32px rgba(245,158,11,0.25)' : 'none',
                  transition:'all .2s',
                }}>
                <Icon name="wand" size={17}/>
                Générer le Business Model Canvas
                <Icon name="arrow" size={15}/>
              </button>
            </div>

            {/* Feature chips */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:32, justifyContent:'center' }}>
              {[
                { icon:'⊟', label:'9 blocs Osterwalder' },
                { icon:'◉', label:'Insights IA' },
                { icon:'⬡', label:'Analyse des risques' },
                { icon:'≡', label:'Export JSON + CSV' },
              ].map(f => (
                <div key={f.label} style={{
                  display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                  borderRadius:99, background:'var(--surface)', border:'1px solid var(--border)',
                  fontSize:11, color:'var(--muted2)',
                }}>
                  <span>{f.icon}</span> {f.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ LOADING PHASE ═══ */}
        {phase === 'loading' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 56px)', gap:32, textAlign:'center' }}>
            {/* Animated orb */}
            <div style={{ position:'relative', width:96, height:96 }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(245,158,11,0.2)', animation:'ping 1.4s ease infinite' }}/>
              <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'2px solid rgba(245,158,11,0.1)', animation:'ping 1.4s ease infinite', animationDelay:'.4s' }}/>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(245,158,11,0.08)', border:'2px solid rgba(245,158,11,0.3)' }}>
                <span style={{ fontSize:32 }}>⊟</span>
              </div>
            </div>

            <div style={{ maxWidth:340, width:'100%' }}>
              {LOAD_STEPS.map((s, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderRadius:10,
                  marginBottom:6, transition:'all .4s',
                  background: i===loadStep ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
                  border: i===loadStep ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                  opacity: i>loadStep ? 0.3 : 1,
                }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background: i<loadStep ? '#22d3a5' : i===loadStep ? '#f59e0b' : 'rgba(255,255,255,0.05)' }}>
                    {i < loadStep
                      ? <Icon name="check" size={11}/>
                      : i === loadStep
                        ? <div style={{ width:11, height:11, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                        : <div style={{ width:7, height:7, borderRadius:'50%', background:'rgba(255,255,255,.2)' }}/>
                    }
                  </div>
                  <span style={{ fontSize:12, color: i===loadStep ? '#f59e0b' : 'rgba(255,255,255,0.4)', fontFamily:'Geist Mono,monospace' }}>{s}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize:11, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>
              Claude · Osterwalder · StratOS
            </p>
          </div>
        )}

        {/* ═══ CANVAS PHASE ═══ */}
        {phase === 'canvas' && canvas && (
          <div style={{ padding:'16px 16px 32px' }} className="fade-up">

            {/* Scores bar */}
            <div style={{
              display:'flex', gap:16, flexWrap:'wrap', marginBottom:16,
              padding:'12px 20px', borderRadius:12,
              background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'Geist Mono,monospace', marginBottom:4 }}>Score Global</div>
                <div style={{ fontSize:28, fontWeight:800, color:'#f59e0b', lineHeight:1 }}>
                  <Counter value={canvas.score?.overall || 72}/>
                  <span style={{ fontSize:14, color:'var(--muted)', marginLeft:2 }}>/100</span>
                </div>
              </div>
              {[
                { label:'Viabilité',   key:'viability',   color:'#22d3a5' },
                { label:'Innovation',  key:'innovation',  color:'#8b5cf6' },
                { label:'Scalabilité', key:'scalability', color:'#06b6d4' },
              ].map(s => (
                <div key={s.key} style={{ flex:1, minWidth:140 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace', letterSpacing:'.05em' }}>{s.label}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:s.color, fontFamily:'Geist Mono,monospace' }}>
                      <Counter value={canvas.score?.[s.key] || 70}/>%
                    </span>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:s.color, width:`${canvas.score?.[s.key] || 70}%`, transition:'width 1.2s ease' }}/>
                  </div>
                </div>
              ))}
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>{canvas.industry}</div>
                <div style={{ fontSize:12, color:'var(--muted2)', fontStyle:'italic', maxWidth:240 }}>{canvas.tagline}</div>
              </div>
            </div>

            {/* ── CANVAS TAB ── */}
            {activeTab === 'canvas' && (
              <div style={{ background:'rgba(17,17,24,0.6)', borderRadius:12, border:'1px solid var(--border)', padding:8, height:'calc(100vh - 200px)', minHeight:500 }}>
                <div className="bmc-grid" style={{ height:'100%' }}>
                  <div className="cell-kp">
                    <BMCBlock blockKey="keyPartners" block={canvas.blocks.keyPartners} meta={BLOCKS_META.keyPartners}
                      onUpdateItem={(i,v)=>updateItem('keyPartners',i,v)} onDeleteItem={i=>deleteItem('keyPartners',i)} onAddItem={v=>addItem('keyPartners',v)}
                      highlighted={highlighted==='keyPartners'} onHighlight={setHighlighted}/>
                  </div>
                  <div className="cell-ka">
                    <BMCBlock blockKey="keyActivities" block={canvas.blocks.keyActivities} meta={BLOCKS_META.keyActivities}
                      onUpdateItem={(i,v)=>updateItem('keyActivities',i,v)} onDeleteItem={i=>deleteItem('keyActivities',i)} onAddItem={v=>addItem('keyActivities',v)}
                      highlighted={highlighted==='keyActivities'} onHighlight={setHighlighted}/>
                  </div>
                  <div className="cell-kr">
                    <BMCBlock blockKey="keyResources" block={canvas.blocks.keyResources} meta={BLOCKS_META.keyResources}
                      onUpdateItem={(i,v)=>updateItem('keyResources',i,v)} onDeleteItem={i=>deleteItem('keyResources',i)} onAddItem={v=>addItem('keyResources',v)}
                      highlighted={highlighted==='keyResources'} onHighlight={setHighlighted}/>
                  </div>
                  <div className="cell-vp">
                    <BMCBlock blockKey="valuePropositions" block={canvas.blocks.valuePropositions} meta={BLOCKS_META.valuePropositions}
                      onUpdateItem={(i,v)=>updateItem('valuePropositions',i,v)} onDeleteItem={i=>deleteItem('valuePropositions',i)} onAddItem={v=>addItem('valuePropositions',v)}
                      highlighted={highlighted==='valuePropositions'} onHighlight={setHighlighted}/>
                  </div>
                  <div className="cell-cr">
                    <BMCBlock blockKey="customerRelationships" block={canvas.blocks.customerRelationships} meta={BLOCKS_META.customerRelationships}
                      onUpdateItem={(i,v)=>updateItem('customerRelationships',i,v)} onDeleteItem={i=>deleteItem('customerRelationships',i)} onAddItem={v=>addItem('customerRelationships',v)}
                      highlighted={highlighted==='customerRelationships'} onHighlight={setHighlighted}/>
                  </div>
                  <div className="cell-ch">
                    <BMCBlock blockKey="channels" block={canvas.blocks.channels} meta={BLOCKS_META.channels}
                      onUpdateItem={(i,v)=>updateItem('channels',i,v)} onDeleteItem={i=>deleteItem('channels',i)} onAddItem={v=>addItem('channels',v)}
                      highlighted={highlighted==='channels'} onHighlight={setHighlighted}/>
                  </div>
                  <div className="cell-cs">
                    <BMCBlock blockKey="customerSegments" block={canvas.blocks.customerSegments} meta={BLOCKS_META.customerSegments}
                      onUpdateItem={(i,v)=>updateItem('customerSegments',i,v)} onDeleteItem={i=>deleteItem('customerSegments',i)} onAddItem={v=>addItem('customerSegments',v)}
                      highlighted={highlighted==='customerSegments'} onHighlight={setHighlighted}/>
                  </div>
                  <div className="cell-cost">
                    <BMCBlock blockKey="costStructure" block={canvas.blocks.costStructure} meta={BLOCKS_META.costStructure}
                      onUpdateItem={(i,v)=>updateItem('costStructure',i,v)} onDeleteItem={i=>deleteItem('costStructure',i)} onAddItem={v=>addItem('costStructure',v)}
                      highlighted={highlighted==='costStructure'} onHighlight={setHighlighted}/>
                  </div>
                  <div className="cell-rev">
                    <BMCBlock blockKey="revenueStreams" block={canvas.blocks.revenueStreams} meta={BLOCKS_META.revenueStreams}
                      onUpdateItem={(i,v)=>updateItem('revenueStreams',i,v)} onDeleteItem={i=>deleteItem('revenueStreams',i)} onAddItem={v=>addItem('revenueStreams',v)}
                      highlighted={highlighted==='revenueStreams'} onHighlight={setHighlighted}/>
                  </div>
                </div>
              </div>
            )}

            {/* ── INSIGHTS TAB ── */}
            {activeTab === 'insights' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:960, margin:'0 auto' }} className="fade-up">

                {/* Strategic insights */}
                <div style={{ background:'rgba(255,255,255,0.02)', borderRadius:12, border:'1px solid var(--border)', padding:20 }}>
                  <div style={{ fontSize:11, color:'#f59e0b', fontFamily:'Geist Mono,monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:16 }}>
                    ◉ Insights stratégiques
                  </div>
                  {(canvas.strategic_insights || []).map((insight, i) => (
                    <div key={i} style={{ display:'flex', gap:12, marginBottom:16, padding:'12px 14px', borderRadius:8, background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.1)' }}>
                      <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'#f59e0b', fontFamily:'Geist Mono,monospace' }}>
                        {i+1}
                      </div>
                      <p style={{ fontSize:13, color:'rgba(240,239,245,0.8)', lineHeight:1.6 }}>{insight}</p>
                    </div>
                  ))}
                </div>

                {/* Opportunities */}
                <div style={{ background:'rgba(255,255,255,0.02)', borderRadius:12, border:'1px solid var(--border)', padding:20 }}>
                  <div style={{ fontSize:11, color:'#22d3a5', fontFamily:'Geist Mono,monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:16 }}>
                    ⊕ Opportunités de croissance
                  </div>
                  {(canvas.opportunities || []).map((opp, i) => (
                    <div key={i} style={{ display:'flex', gap:12, marginBottom:12, alignItems:'flex-start' }}>
                      <div style={{ width:5, height:5, borderRadius:'50%', background:'#22d3a5', flexShrink:0, marginTop:7 }}/>
                      <p style={{ fontSize:13, color:'rgba(240,239,245,0.75)', lineHeight:1.6 }}>{opp}</p>
                    </div>
                  ))}

                  {/* Block-level insights */}
                  <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--border)' }}>
                    <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'Geist Mono,monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>
                      Insights par bloc
                    </div>
                    {Object.entries(canvas.blocks).map(([key, block]) => {
                      const meta = BLOCKS_META[key]
                      if (!block.insight) return null
                      return (
                        <div key={key} style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
                          <div style={{ padding:'2px 6px', borderRadius:4, background:`${meta.color}15`, border:`1px solid ${meta.color}30`, fontSize:9, fontFamily:'Geist Mono,monospace', color:meta.color, flexShrink:0, marginTop:2 }}>
                            {meta.label}
                          </div>
                          <p style={{ fontSize:12, color:'rgba(240,239,245,0.6)', lineHeight:1.5, fontStyle:'italic' }}>{block.insight}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── RISKS TAB ── */}
            {activeTab === 'risks' && (
              <div style={{ maxWidth:680, margin:'0 auto' }} className="fade-up">
                <div style={{ background:'rgba(255,255,255,0.02)', borderRadius:12, border:'1px solid var(--border)', padding:24 }}>
                  <div style={{ fontSize:11, color:'#ef4444', fontFamily:'Geist Mono,monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:20 }}>
                    ⬡ Analyse des risques
                  </div>

                  {(canvas.risks || []).map((risk, i) => (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:16, padding:'16px 18px', borderRadius:10, marginBottom:10,
                      background:`${riskColor(risk.level)}08`, border:`1px solid ${riskColor(risk.level)}25`,
                    }}>
                      <div style={{
                        padding:'3px 10px', borderRadius:99, flexShrink:0,
                        background:`${riskColor(risk.level)}15`, border:`1px solid ${riskColor(risk.level)}35`,
                        fontSize:10, fontFamily:'Geist Mono,monospace', fontWeight:700,
                        color:riskColor(risk.level), textTransform:'uppercase', letterSpacing:.5,
                      }}>
                        {risk.level}
                      </div>
                      <p style={{ fontSize:13, color:'rgba(240,239,245,0.8)', lineHeight:1.5 }}>{risk.text}</p>
                    </div>
                  ))}

                  {/* Revenue and cost model */}
                  <div style={{ marginTop:24, paddingTop:20, borderTop:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(34,211,238,0.05)', border:'1px solid rgba(34,211,238,0.15)' }}>
                      <div style={{ fontSize:10, color:'#22d3ee', fontFamily:'Geist Mono,monospace', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Modèle de revenus</div>
                      <p style={{ fontSize:13, color:'rgba(240,239,245,0.7)' }}>{canvas.blocks.revenueStreams?.model || 'N/A'}</p>
                    </div>
                    <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(100,116,139,0.05)', border:'1px solid rgba(100,116,139,0.15)' }}>
                      <div style={{ fontSize:10, color:'#94a3b8', fontFamily:'Geist Mono,monospace', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Structure de coûts</div>
                      <p style={{ fontSize:13, color:'rgba(240,239,245,0.7)' }}>{canvas.blocks.costStructure?.type || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}