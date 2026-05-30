'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// ── Constants ──────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const BLOCKS_META = {
  keyPartners:           { color:'#3b82f6', bg:'rgba(59,130,246,0.08)',  label:'KP', title:'Partenaires Clés',        grid:'cell-kp'   },
  keyActivities:         { color:'#8b5cf6', bg:'rgba(139,92,246,0.08)',  label:'KA', title:'Activités Clés',          grid:'cell-ka'   },
  keyResources:          { color:'#06b6d4', bg:'rgba(6,182,212,0.08)',   label:'KR', title:'Ressources Clés',         grid:'cell-kr'   },
  valuePropositions:     { color:'#f59e0b', bg:'rgba(245,158,11,0.10)',  label:'VP', title:'Propositions de Valeur',  grid:'cell-vp'   },
  customerRelationships: { color:'#ec4899', bg:'rgba(236,72,153,0.08)',  label:'CR', title:'Relations Clients',       grid:'cell-cr'   },
  channels:              { color:'#10b981', bg:'rgba(16,185,129,0.08)',  label:'CH', title:'Canaux',                  grid:'cell-ch'   },
  customerSegments:      { color:'#ef4444', bg:'rgba(239,68,68,0.08)',   label:'CS', title:'Segments Clients',        grid:'cell-cs'   },
  costStructure:         { color:'#64748b', bg:'rgba(100,116,139,0.08)', label:'C$', title:'Structure des Coûts',     grid:'cell-cost' },
  revenueStreams:        { color:'#22d3ee', bg:'rgba(34,211,238,0.08)',  label:'R$', title:'Sources de Revenus',      grid:'cell-rev'  },
}

const STATUT_COLORS = { fort:'#22d3a5', moyen:'#f59e0b', faible:'#f87171' }
const RISK_COLOR    = l => l === 'high' ? '#ef4444' : l === 'medium' ? '#f59e0b' : '#22d3ee'

const INDUSTRIES = ['SaaS','FinTech','E-commerce','Santé','Éducation','Logistique','AgriTech','Retail','Immobilier','Industrie']

const LOAD_STEPS = [
  'Analyse du contexte marché…',
  'Identification des partenaires clés…',
  'Modélisation de la proposition de valeur…',
  'Construction des flux de revenus…',
  'Génération des insights stratégiques…',
]

// ── Tiny SVG Icon ──────────────────────────────────────────────────────────────
const Icon = ({ name, size = 14 }) => {
  const d = {
    back:     'M19 12H5M12 5l-7 7 7 7',
    plus:     'M12 5v14M5 12h14',
    trash:    'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6',
    download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
    upload:   'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
    refresh:  'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
    wand:     'M15 4L9 10M3 20l6-6M10 2l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z',
    spark:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    check:    'M20 6L9 17l-5-5',
    arrow:    'M5 12h14M12 5l7 7-7 7',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d[name]}/>
    </svg>
  )
}

// ── Animated counter ───────────────────────────────────────────────────────────
function Counter({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let n = 0
    const step = (value / duration) * 16
    const t = setInterval(() => {
      n += step
      if (n >= value) { setDisplay(value); clearInterval(t) }
      else setDisplay(Math.floor(n))
    }, 16)
    return () => clearInterval(t)
  }, [value])
  return <>{display}</>
}

// ── Editable item ──────────────────────────────────────────────────────────────
function EditableItem({ value, onChange, onDelete, color }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value)
  const commit = () => { setEditing(false); if (val.trim()) onChange(val.trim()); else setVal(value) }
  return editing ? (
    <div style={{ display:'flex', gap:4 }}>
      <input value={val} onChange={e => setVal(e.target.value)}
        onBlur={commit} autoFocus
        onKeyDown={e => { if(e.key==='Enter') commit(); if(e.key==='Escape'){setVal(value);setEditing(false)} }}
        style={{ flex:1, background:'rgba(255,255,255,.06)', border:`1px solid ${color}50`, borderRadius:4, padding:'3px 7px', color:'#f0eff5', fontSize:11, outline:'none', fontFamily:'inherit' }}/>
    </div>
  ) : (
    <div className="editable-row" onClick={() => setEditing(true)}
      style={{ display:'flex', alignItems:'flex-start', gap:6, padding:'3px 0', cursor:'text', borderRadius:4 }}>
      <div style={{ width:4, height:4, borderRadius:'50%', background:color, flexShrink:0, marginTop:6 }}/>
      <span style={{ flex:1, fontSize:11, color:'rgba(240,239,245,0.8)', lineHeight:1.5 }}>{value}</span>
      <button className="del-x" onClick={e => { e.stopPropagation(); onDelete() }}
        style={{ opacity:0, background:'none', border:'none', cursor:'pointer', color:'#f87171', fontSize:11, padding:'0 2px', transition:'opacity .15s' }}>✕</button>
    </div>
  )
}

// ── BMC Block ──────────────────────────────────────────────────────────────────
function BMCBlock({ blockKey, block, meta, onUpdate, onDelete, onAdd, highlight, onHL }) {
  const [adding, setAdding] = useState(false)
  const [newVal, setNewVal] = useState('')
  const commit = () => { if(newVal.trim()){onAdd(newVal.trim());setNewVal('')} setAdding(false) }
  return (
    <div
      style={{ background: highlight ? meta.bg : 'rgba(17,17,24,.9)', border:`1px solid ${highlight ? meta.color+'55' : 'rgba(255,255,255,.07)'}`, borderRadius:10, padding:12, height:'100%', display:'flex', flexDirection:'column', gap:7, transition:'all .2s', position:'relative', overflow:'hidden' }}
      onMouseEnter={() => onHL(blockKey)} onMouseLeave={() => onHL(null)}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background: highlight ? meta.color : 'transparent', transition:'background .2s' }}/>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:20, height:20, borderRadius:4, background:`${meta.color}20`, border:`1px solid ${meta.color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:meta.color, fontFamily:'Geist Mono,monospace' }}>{meta.label}</div>
          <span style={{ fontSize:10, fontWeight:700, color:'rgba(240,239,245,.9)' }}>{block.title || meta.title}</span>
        </div>
        <button onClick={() => setAdding(a => !a)} style={{ width:16, height:16, borderRadius:3, background:`${meta.color}15`, border:`1px solid ${meta.color}30`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:meta.color }}>
          <Icon name="plus" size={9}/>
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:1 }}>
        {(block.items||[]).map((item, i) => (
          <EditableItem key={i} value={item} color={meta.color} onChange={v => onUpdate(i,v)} onDelete={() => onDelete(i)}/>
        ))}
        {adding && (
          <div style={{ display:'flex', gap:4, marginTop:2 }}>
            <input value={newVal} onChange={e => setNewVal(e.target.value)} onBlur={commit}
              onKeyDown={e => { if(e.key==='Enter') commit(); if(e.key==='Escape') setAdding(false) }}
              autoFocus placeholder="Nouvel élément…"
              style={{ flex:1, background:'rgba(255,255,255,.06)', border:`1px solid ${meta.color}50`, borderRadius:4, padding:'4px 8px', color:'#f0eff5', fontSize:11, outline:'none', fontFamily:'inherit' }}/>
          </div>
        )}
      </div>
      {block.insight && (
        <div style={{ padding:'5px 7px', borderRadius:5, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.04)', fontSize:9, color:'rgba(240,239,245,.35)', lineHeight:1.5, fontStyle:'italic' }}>{block.insight}</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function BusinessCanvasPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  // ── Sidebar / history ──
  const [project,    setProject]    = useState(null)
  const [canvases,   setCanvases]   = useState([])
  const [activeId,   setActiveId]   = useState(null)

  // ── Input form ──
  const [showForm,   setShowForm]   = useState(false)
  const [genMode,    setGenMode]    = useState('ai')
  const [company,    setCompany]    = useState('')
  const [industry,   setIndustry]   = useState('')
  const [description,setDescription]= useState('')
  const [manCtx,     setManCtx]     = useState('')

  // ── Canvas state ──
  const [canvas,     setCanvas]     = useState(null)
  const [activeTab,  setActiveTab]  = useState('canvas')
  const [highlight,  setHighlight]  = useState(null)

  // ── AI ──
  const [genLoading, setGenLoading] = useState(false)
  const [genStep,    setGenStep]    = useState(0)
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiResult,   setAiResult]   = useState(null)
  const [showAiPanel,setShowAiPanel]= useState(false)

  const [toast,      setToast]      = useState(null)
  const [error,      setError]      = useState('')

  // ── Load from localStorage ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.BMC || []
        setCanvases(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          setCanvas(last.canvasData)
          if (last.aiResult) setAiResult(last.aiResult)
        }
      }
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), BMC: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Checks whether a canvas object has at least one filled block
  const canvasHasContent = (c) => {
    if (!c) return false
    const blocks = c.blocks || c
    if (typeof blocks !== 'object') return false
    return Object.values(blocks).some(b => {
      if (Array.isArray(b?.items)) return b.items.length > 0
      if (typeof b === 'object' && b !== null) return Object.keys(b).some(k => k !== 'insight' && k !== 'title')
      return false
    })
  }

  // Count filled blocks for display
  const countFilled = (c) => {
    if (!c) return 0
    const blocks = c.blocks || c
    return Object.keys(BLOCKS_META).filter(k => {
      const b = blocks[k]
      return Array.isArray(b?.items) ? b.items.length > 0 : false
    }).length
  }

  // ── Active record ──
  const active = canvases.find(c => c.id === activeId) || null

  // ── Select canvas ──
  const selectCanvas = (item) => {
    setActiveId(item.id)
    setCanvas(item.canvasData)
    setAiResult(item.aiResult || null)
    setShowAiPanel(!!item.aiResult)
    setShowForm(false)
  }

  // ── Save canvas to localStorage ──
  const saveCanvas = useCallback((canvasData, meta = {}) => {
    const existing = canvases.find(c => c.id === activeId)
    let updated
    if (existing) {
      updated = canvases.map(c => c.id === activeId ? { ...c, canvasData, ...meta } : c)
    } else {
      const record = {
        id:         activeId || uid(),
        name:       meta.name || canvasData.company || 'Canvas sans titre',
        company:    canvasData.company,
        industry:   canvasData.industry || '',
        createdAt:  new Date().toISOString(),
        generatedByAI: meta.generatedByAI || false,
        canvasData,
        aiResult:   null,
        ...meta,
      }
      updated = [...canvases, record]
    }
    setCanvases(updated)
    persist(updated)
  }, [canvases, activeId, persist])

  const deleteCanvas = (id) => {
    const updated = canvases.filter(c => c.id !== id)
    setCanvases(updated); persist(updated)
    if (activeId === id) {
      const last = updated[updated.length - 1]
      if (last) { setActiveId(last.id); setCanvas(last.canvasData); setAiResult(last.aiResult || null) }
      else { setActiveId(null); setCanvas(null); setAiResult(null) }
    }
    showToast('Canvas supprimé', 'info')
  }

  const updateAiResult = useCallback((result) => {
    setAiResult(result)
    setCanvases(prev => {
      const updated = prev.map(c => c.id === activeId ? { ...c, aiResult: result } : c)
      persist(updated)
      return updated
    })
  }, [activeId, persist])

  // ── Canvas block CRUD ──────────────────────────────────────────────────────
  const updateItem = useCallback((blockKey, idx, val) => {
    setCanvas(prev => {
      const blocks = { ...prev.blocks, [blockKey]: { ...prev.blocks[blockKey], items: prev.blocks[blockKey].items.map((v,i) => i===idx ? val : v) } }
      const next = { ...prev, blocks }
      saveCanvas(next)
      return next
    })
  }, [saveCanvas])

  const deleteItem = useCallback((blockKey, idx) => {
    setCanvas(prev => {
      const blocks = { ...prev.blocks, [blockKey]: { ...prev.blocks[blockKey], items: prev.blocks[blockKey].items.filter((_,i) => i!==idx) } }
      const next = { ...prev, blocks }
      saveCanvas(next)
      return next
    })
  }, [saveCanvas])

  const addItem = useCallback((blockKey, val) => {
    setCanvas(prev => {
      const existing = prev.blocks?.[blockKey] || { items: [], insight: '' }
      const blocks = { ...prev.blocks, [blockKey]: { ...existing, items: [...(existing.items||[]), val] } }
      const next = { ...prev, blocks }
      saveCanvas(next)
      return next
    })
  }, [saveCanvas])

  // ── AI GENERATION (Mode 1) ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!company.trim() && !description.trim()) return
    setGenLoading(true); setError(''); setGenStep(0)
    let step = 0
    const iv = setInterval(() => { step = Math.min(step+1, LOAD_STEPS.length-1); setGenStep(step) }, 1600)
    try {
      const res = await fetch('/api/generer-management/generer-bmc', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ company: company || description.slice(0,60), industry, context: description || manCtx, mode:'generate' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la génération')

      const newId = uid()
      setActiveId(newId)
      setCanvas(data)
      setAiResult(null)
      setShowAiPanel(false)
      setActiveTab('canvas')

      const record = {
        id: newId,
        name: data.company || company || 'Canvas IA',
        company: data.company,
        industry: data.industry || industry,
        createdAt: new Date().toISOString(),
        generatedByAI: true,
        canvasData: data,
        aiResult: null,
      }
      const updated = [...canvases, record]
      setCanvases(updated); persist(updated)
      setShowForm(false); setCompany(''); setIndustry(''); setDescription('')
      showToast(`✦ "${data.company}" généré (9 blocs)`)
    } catch(err) {
      setError(err.message)
    } finally {
      clearInterval(iv); setGenLoading(false)
    }
  }

  // ── AI ANALYSIS (Mode 2) — fixed ───────────────────────────────────────────
  const runAnalysis = async () => {
    // Guard 1 : canvas must exist
    if (!canvas) {
      showToast('Aucun canvas sélectionné — générez ou importez un BMC d\'abord', 'error')
      return
    }

    // Guard 2 : canvas must have at least one block with content
    if (!canvasHasContent(canvas)) {
      showToast('Le canvas est vide — ajoutez des éléments dans au moins un bloc', 'error')
      return
    }

    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/analyser-bmc', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          canvas,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Show the specific error message from the API, not a generic one
        throw new Error(data.error || 'Erreur serveur lors de l\'analyse')
      }
      updateAiResult(data.result)
      showToast('Analyse IA générée ✦')
    } catch(err) {
      showToast(err.message, 'error')
      // Don't close the panel — let the user see the error context
    } finally {
      setAiLoading(false)
    }
  }

  // ── EXPORT ─────────────────────────────────────────────────────────────────
  const exportJSON = () => {
    if (!canvas) return
    const payload = { ...canvas, exportedAt: new Date().toISOString(), exportVersion:'1.0', tool:'BMC', aiAnalysis: aiResult || undefined }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `BMC_${(canvas.company||'canvas').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    showToast('Canvas exporté (JSON)')
  }

  const exportCSV = () => {
    if (!canvas) return
    const rows = [['Bloc','Élément','Insight']]
    Object.entries(canvas.blocks || {}).forEach(([key, block]) => {
      ;(block.items||[]).forEach((item,i) => rows.push([block.title || BLOCKS_META[key]?.title || key, item, i===0 ? (block.insight||'') : '']))
    })
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `BMC_${(canvas.company||'canvas').replace(/\s+/g,'_')}.csv`; a.click()
    showToast('Canvas exporté (CSV)')
  }

  // ── IMPORT ─────────────────────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        // Accept both {blocks:...} and flat structure
        if (!data.blocks && !Object.keys(BLOCKS_META).some(k => data[k])) {
          throw new Error('Format non reconnu — le fichier ne contient pas de blocs BMC')
        }
        // Normalise: if flat structure (no blocks key), wrap it
        const canvasData = data.blocks ? data : { ...data, blocks: Object.fromEntries(Object.keys(BLOCKS_META).map(k => [k, data[k] || { items:[], insight:'' }])) }
        const newId = uid()
        const record = {
          id: newId,
          name: data.company || 'Canvas importé',
          company: data.company || '',
          industry: data.industry || '',
          createdAt: data.exportedAt || new Date().toISOString(),
          importedAt: new Date().toISOString(),
          generatedByAI: false,
          canvasData,
          aiResult: data.aiAnalysis || null,
        }
        const updated = [...canvases, record]
        setCanvases(updated); persist(updated)
        setActiveId(newId); setCanvas(canvasData)
        setAiResult(data.aiAnalysis || null)
        if (data.aiAnalysis) setShowAiPanel(true)
        showToast(`"${record.name}" importé avec succès`)
      } catch(err) {
        showToast(err.message || 'Fichier JSON invalide', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  const filledCount = countFilled(canvas)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --bg:#0a0a0f; --s1:#111118; --s2:#18181f; --s3:#1e1e28;
          --b1:rgba(255,255,255,.06); --b2:rgba(255,255,255,.11); --b3:rgba(255,255,255,.17);
          --tx:#f0eff5; --mu:#6b6a7a; --mu2:#9896aa;
          --acc:#f59e0b; --acc2:#fbbf24; --gen:#a78bfa;
        }
        body { background:var(--bg); color:var(--tx); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping    { 75%,100%{transform:scale(1.6);opacity:0} }
        .fade-up { animation:fadeUp .35s ease both; }
        .editable-row:hover { background:rgba(255,255,255,.03) !important; }
        .editable-row:hover .del-x { opacity:1 !important; }

        .tb { height:54px; background:var(--s1); border-bottom:1px solid var(--b1); display:flex; align-items:center; padding:0 16px; gap:10px; position:sticky; top:0; z-index:200; }
        .back { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px; background:var(--s2); border:1px solid var(--b2); color:var(--mu2); font-family:'Geist Mono',monospace; font-size:10px; cursor:pointer; transition:all .15s; }
        .back:hover { color:var(--tx); border-color:var(--b3); }
        .tb-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .tb-proj  { font-size:10px; color:var(--mu); font-family:'Geist Mono',monospace; }
        .tb-right { margin-left:auto; display:flex; gap:6px; align-items:center; }
        .btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:.04em; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; }
        .btn:hover { color:var(--tx); border-color:var(--b3); }
        .btn.p   { background:var(--acc); border-color:var(--acc); color:#000; font-weight:700; }
        .btn.p:hover { background:var(--acc2); }
        .btn.ai  { background:rgba(245,158,11,.1); border-color:rgba(245,158,11,.3); color:var(--acc); }
        .btn.ai:hover { background:rgba(245,158,11,.18); }
        .btn.gen { background:rgba(167,139,250,.1); border-color:rgba(167,139,250,.3); color:var(--gen); }
        .btn.gen:hover { background:rgba(167,139,250,.18); }
        .btn:disabled { opacity:.35; cursor:not-allowed; }
        .tabs-row { display:flex; gap:2px; background:rgba(255,255,255,.03); border-radius:7px; padding:2px; }
        .tab-b { padding:5px 14px; border-radius:5px; cursor:pointer; font-size:10px; font-family:'Geist Mono',monospace; border:1px solid transparent; background:none; color:var(--mu2); transition:all .15s; }
        .tab-b.on { background:rgba(245,158,11,.12); border-color:rgba(245,158,11,.3); color:var(--acc); }
        .tab-b:hover:not(.on) { color:var(--tx); }

        .layout { display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 54px); overflow:hidden; }

        .left { background:var(--s1); border-right:1px solid var(--b1); display:flex; flex-direction:column; overflow:hidden; }
        .ph { padding:13px 14px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .pl { font-size:9px; color:var(--mu); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .plist { flex:1; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:2px; }
        .citem { padding:9px 11px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; position:relative; }
        .citem:hover { background:var(--s2); }
        .citem.on { background:rgba(245,158,11,.08); border-color:rgba(245,158,11,.25); }
        .cname { font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px; }
        .cmeta { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; margin-top:2px; }
        .cdel  { opacity:0; position:absolute; top:7px; right:8px; background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; padding:2px 4px; border-radius:3px; }
        .citem:hover .cdel { opacity:1; }
        .ai-badge { font-size:8px; padding:1px 5px; border-radius:3px; background:rgba(167,139,250,.15); color:var(--gen); border:1px solid rgba(167,139,250,.3); font-family:'Geist Mono',monospace; font-weight:700; }
        .sidebar-btns { padding:10px; border-top:1px solid var(--b1); display:flex; flex-direction:column; gap:5px; }
        .inp { width:100%; background:var(--bg); border:1px solid var(--b2); border-radius:5px; padding:7px 9px; font-family:'Syne',sans-serif; font-size:11px; color:var(--tx); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--acc); }
        .inp::placeholder { color:var(--mu); }
        textarea.inp { resize:vertical; min-height:64px; }
        .flabel { font-size:9px; color:var(--mu); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:2px; display:block; }

        .center { overflow-y:auto; display:flex; flex-direction:column; background:var(--bg); }
        .canvas-wrap { padding:12px; display:flex; flex-direction:column; gap:10px; flex:1; }

        .score-row { display:flex; gap:14px; flex-wrap:wrap; padding:10px 16px; background:rgba(255,255,255,.02); border:1px solid var(--b1); border-radius:10px; align-items:center; }
        .score-big { font-size:26px; font-weight:800; color:var(--acc); line-height:1; }
        .score-lbl { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; letter-spacing:.05em; }

        .bmc-grid { display:grid; grid-template-columns:1fr 1fr 1.3fr 1fr 1fr; grid-template-rows:1fr 1fr auto; gap:6px; flex:1; min-height:460px; }
        .cell-kp   { grid-column:1; grid-row:1/3; }
        .cell-ka   { grid-column:2; grid-row:1; }
        .cell-kr   { grid-column:2; grid-row:2; }
        .cell-vp   { grid-column:3; grid-row:1/3; }
        .cell-cr   { grid-column:4; grid-row:1; }
        .cell-ch   { grid-column:4; grid-row:2; }
        .cell-cs   { grid-column:5; grid-row:1/3; }
        .cell-cost { grid-column:1/4; grid-row:3; }
        .cell-rev  { grid-column:4/6; grid-row:3; }

        .new-form-wrap { max-width:600px; margin:40px auto; padding:0 24px; width:100%; }
        .mode-toggle { display:flex; gap:2px; background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:2px; margin-bottom:16px; }
        .mode-btn { flex:1; padding:7px 12px; border-radius:5px; font-family:'Geist Mono',monospace; font-size:10px; cursor:pointer; border:none; background:none; color:var(--mu2); transition:all .15s; text-align:center; }
        .mode-btn.on { background:var(--s3); color:var(--tx); box-shadow:0 1px 4px rgba(0,0,0,.3); }
        .mode-btn.ai-mode.on { color:var(--gen); background:rgba(167,139,250,.12); }
        .gen-ta { width:100%; background:rgba(167,139,250,.05); border:1px solid rgba(167,139,250,.22); border-radius:7px; padding:10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--tx); outline:none; transition:border-color .15s; resize:vertical; min-height:96px; }
        .gen-ta:focus { border-color:rgba(167,139,250,.5); }
        .gen-ta::placeholder { color:var(--mu); }
        .industry-pills { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
        .ind-pill { padding:4px 10px; border-radius:5px; cursor:pointer; font-size:10px; font-family:'Geist Mono',monospace; border:1px solid var(--b1); background:var(--s2); color:var(--mu2); transition:all .15s; }
        .ind-pill.on { background:rgba(245,158,11,.12); border-color:rgba(245,158,11,.35); color:var(--acc); }

        .gen-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:400px; gap:24px; }
        .gen-orb { position:relative; width:80px; height:80px; }
        .gen-orb-ring { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(245,158,11,.2); animation:ping 1.4s ease infinite; }
        .gen-orb-ring2 { position:absolute; inset:10px; border-radius:50%; border:2px solid rgba(245,158,11,.1); animation:ping 1.4s ease infinite; animation-delay:.4s; }
        .gen-orb-core { position:absolute; inset:0; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(245,158,11,.08); border:2px solid rgba(245,158,11,.3); font-size:28px; }
        .gen-steps { max-width:300px; width:100%; display:flex; flex-direction:column; gap:5px; }
        .gen-step { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; transition:all .35s; border:1px solid transparent; }
        .gen-step.active { background:rgba(245,158,11,.08); border-color:rgba(245,158,11,.25); }
        .gen-step.done   { opacity:.5; }
        .gen-step.future { opacity:.25; }
        .gen-step-dot { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:10px; }

        .tab-content { padding:16px; max-width:1000px; margin:0 auto; width:100%; }
        .insight-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .insight-card { background:rgba(255,255,255,.02); border-radius:10px; border:1px solid var(--b1); padding:18px; }
        .ic-title { font-size:10px; font-family:'Geist Mono',monospace; letter-spacing:.1em; text-transform:uppercase; margin-bottom:14px; }

        .ai-panel { position:fixed; right:0; top:54px; bottom:0; width:400px; background:var(--s1); border-left:1px solid var(--b1); z-index:150; display:flex; flex-direction:column; overflow:hidden; transform:translateX(100%); transition:transform .28s ease; }
        .ai-panel.open { transform:translateX(0); }
        .ai-ph { padding:14px 18px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .ai-title-t { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .ai-body { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:13px; }
        .ai-st { font-size:9px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
        .ai-card { background:var(--s2); border:1px solid var(--b2); border-radius:8px; padding:13px; font-size:12px; color:var(--tx); line-height:1.7; }
        .ai-bloc-item { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; }
        .ai-bloc-top { display:flex; align-items:center; gap:7px; margin-bottom:4px; }
        .ai-bloc-key { font-size:8px; padding:1px 6px; border-radius:3px; font-family:'Geist Mono',monospace; font-weight:700; }
        .ai-bloc-name { font-size:11px; font-weight:700; }
        .ai-bloc-txt { font-size:11px; color:var(--mu2); line-height:1.6; }
        .ai-bloc-sug { font-size:10px; color:var(--acc); font-family:'Geist Mono',monospace; margin-top:5px; }
        .ai-li { display:flex; gap:8px; align-items:flex-start; padding:7px 10px; background:var(--s2); border-radius:5px; border:1px solid var(--b1); font-size:11px; line-height:1.6; }
        .ai-li-b { font-family:'Geist Mono',monospace; font-size:9px; color:var(--mu); padding-top:2px; flex-shrink:0; }
        .spinner { width:15px; height:15px; border:2px solid var(--b2); border-top-color:var(--acc); border-radius:50%; animation:spin .7s linear infinite; }

        .ai-score-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .ai-score-card { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px; }
        .ai-score-val { font-family:'Instrument Serif',serif; font-size:22px; font-style:italic; }
        .ai-score-bar { height:3px; background:var(--s3); border-radius:2px; margin-top:5px; overflow:hidden; }
        .ai-score-fill { height:100%; border-radius:2px; }

        /* Filled blocks indicator */
        .fill-indicator { display:flex; gap:3px; align-items:center; }
        .fill-dot { width:6px; height:6px; border-radius:50%; transition:background .3s; }

        .empty-c { display:flex; align-items:center; justify-content:center; flex:1; }
        .empty-inner { text-align:center; padding:60px 40px; }
        .empty-ico { font-size:44px; opacity:.18; margin-bottom:14px; }

        .toast { position:fixed; bottom:20px; right:20px; z-index:999; background:var(--s2); border:1px solid var(--b2); border-radius:7px; padding:10px 16px; font-size:12px; display:flex; align-items:center; gap:7px; box-shadow:0 8px 28px rgba(0,0,0,.5); animation:fadeUp .2s ease; max-width:360px; }
        .toast.error { border-color:rgba(248,113,113,.4); color:#f87171; background:rgba(15,10,10,.95); }
        .toast.info  { border-color:rgba(99,102,241,.25); }

        @media(max-width:900px) { .layout { grid-template-columns:1fr; } .left { display:none; } }
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport}/>

      <div style={{ minHeight:'100vh' }}>

        {/* ── TOPBAR ── */}
        <header className="tb">
          <button className="back" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>
            <Icon name="back" size={12}/> Retour
          </button>
          <div>
            <div className="tb-title">Business Model Canvas</div>
            {project && <div className="tb-proj">{project.name}</div>}
          </div>
          <div className="tb-right">
            {canvas && (
              <>
                <div className="tabs-row">
                  {[['canvas','⊟ Canvas'],['insights','◉ Insights'],['risks','⬡ Risques']].map(([id,lbl]) => (
                    <button key={id} className={`tab-b ${activeTab===id?'on':''}`} onClick={() => setActiveTab(id)}>{lbl}</button>
                  ))}
                </div>
                <button className="btn" onClick={exportJSON}><Icon name="download" size={11}/> JSON</button>
                <button className="btn" onClick={exportCSV}><Icon name="download" size={11}/> CSV</button>
                <button className="btn ai" onClick={runAnalysis} disabled={aiLoading}
                  title={!canvasHasContent(canvas) ? 'Ajoutez des éléments dans le canvas avant d\'analyser' : 'Lancer l\'analyse IA'}>
                  {aiLoading ? <><span className="spinner"/>Analyse…</> : `✦ Analyser${filledCount > 0 ? ` (${filledCount}/9)` : ''}`}
                </button>
              </>
            )}
            <button className="btn" onClick={() => importRef.current?.click()}>
              <Icon name="upload" size={11}/> Importer
            </button>
          </div>
        </header>

        <div className="layout">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="left">
            <div className="ph">
              <span className="pl">Canvases ({canvases.length})</span>
            </div>
            <div className="plist">
              {canvases.length === 0 && (
                <div style={{ padding:'28px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:32, opacity:.15, marginBottom:10 }}>⊟</div>
                  <div style={{ fontSize:11, color:'var(--mu)' }}>Créez votre premier BMC</div>
                </div>
              )}
              {canvases.map(c => {
                const filled = countFilled(c.canvasData)
                return (
                  <div key={c.id} className={`citem ${activeId===c.id?'on':''}`} onClick={() => selectCanvas(c)}>
                    <button className="cdel" onClick={e => { e.stopPropagation(); deleteCanvas(c.id) }}>✕</button>
                    <div className="cname">
                      {c.name}
                      {c.generatedByAI && <span className="ai-badge">IA</span>}
                    </div>
                    <div className="cmeta">
                      {c.industry && `${c.industry} · `}
                      {new Date(c.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                      {c.importedAt && ' · importé'}
                      {c.aiResult && ' · ✦ analysé'}
                    </div>
                    {/* Fill indicator dots */}
                    <div className="fill-indicator" style={{ marginTop:4 }}>
                      {Array.from({length:9},(_,i) => (
                        <div key={i} className="fill-dot" style={{ background: i < filled ? 'var(--acc)' : 'rgba(255,255,255,.08)' }}/>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="sidebar-btns">
              {showForm ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div className="mode-toggle">
                    <button className={`mode-btn ai-mode ${genMode==='ai'?'on':''}`} onClick={() => setGenMode('ai')}>✦ IA Auto</button>
                    <button className={`mode-btn ${genMode==='manual'?'on':''}`} onClick={() => setGenMode('manual')}>✎ Manuel</button>
                  </div>
                  {genMode === 'ai' ? (
                    <>
                      <div>
                        <label className="flabel">Décrivez votre projet</label>
                        <textarea className="gen-ta" rows={4} value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Ex: Startup SaaS B2B ciblant les PME africaines, solution de gestion RH, modèle freemium, 2 ans d'existence…"
                          autoFocus/>
                      </div>
                      <div>
                        <label className="flabel">Secteur</label>
                        <div className="industry-pills">
                          {INDUSTRIES.slice(0,6).map(ind => (
                            <button key={ind} className={`ind-pill ${industry===ind?'on':''}`} onClick={() => setIndustry(i => i===ind ? '' : ind)}>{ind}</button>
                          ))}
                        </div>
                        <input className="inp" placeholder="Ou tapez…" value={industry} onChange={e => setIndustry(e.target.value)}/>
                      </div>
                      {error && <div style={{ fontSize:10, color:'#f87171', fontFamily:'Geist Mono,monospace', padding:'6px 8px', background:'rgba(248,113,113,.06)', borderRadius:5, border:'1px solid rgba(248,113,113,.2)' }}>{error}</div>}
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn gen" style={{ flex:1, justifyContent:'center' }} onClick={handleGenerate} disabled={genLoading || !description.trim()}>
                          {genLoading ? <><span className="spinner"/>…</> : '✦ Générer'}
                        </button>
                        <button className="btn" onClick={() => { setShowForm(false); setError('') }}>✕</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="flabel">Entreprise *</label>
                        <input className="inp" placeholder="Nom de l'entreprise" value={company} onChange={e => setCompany(e.target.value)} autoFocus/>
                      </div>
                      <div>
                        <label className="flabel">Secteur</label>
                        <input className="inp" placeholder="Ex: SaaS, Retail…" value={industry} onChange={e => setIndustry(e.target.value)}/>
                      </div>
                      <div>
                        <label className="flabel">Contexte</label>
                        <textarea className="inp" rows={2} placeholder="Contexte additionnel…" value={manCtx} onChange={e => setManCtx(e.target.value)}/>
                      </div>
                      {error && <div style={{ fontSize:10, color:'#f87171', padding:'6px 8px', background:'rgba(248,113,113,.06)', borderRadius:5, border:'1px solid rgba(248,113,113,.2)' }}>{error}</div>}
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn p" style={{ flex:1, justifyContent:'center' }} onClick={handleGenerate} disabled={genLoading || !company.trim()}>
                          {genLoading ? <><span className="spinner"/>…</> : 'Générer'}
                        </button>
                        <button className="btn" onClick={() => { setShowForm(false); setError('') }}>✕</button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <button className="btn gen" style={{ justifyContent:'center' }} onClick={() => { setShowForm(true); setGenMode('ai') }}>
                    ✦ Générer avec l'IA
                  </button>
                  <button className="btn" style={{ justifyContent:'center' }} onClick={() => { setShowForm(true); setGenMode('manual') }}>
                    ✎ Nouveau manuel
                  </button>
                </>
              )}
            </div>
          </aside>

          {/* ── CENTER ── */}
          <main className="center">
            {genLoading ? (
              <div className="gen-loading fade-up">
                <div className="gen-orb">
                  <div className="gen-orb-ring"/>
                  <div className="gen-orb-ring2"/>
                  <div className="gen-orb-core">⊟</div>
                </div>
                <div className="gen-steps">
                  {LOAD_STEPS.map((s, i) => (
                    <div key={i} className={`gen-step ${i===genStep?'active':i<genStep?'done':'future'}`}>
                      <div className="gen-step-dot" style={{ background: i<genStep ? '#22d3a5' : i===genStep ? 'var(--acc)' : 'rgba(255,255,255,.07)' }}>
                        {i<genStep ? <Icon name="check" size={10}/> : i===genStep ? <div style={{ width:10, height:10, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : <div style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,.15)' }}/>}
                      </div>
                      <span style={{ fontSize:11, color: i===genStep ? 'var(--acc)' : 'rgba(255,255,255,.35)', fontFamily:'Geist Mono,monospace' }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>Modèle Osterwalder · Claude Sonnet</div>
              </div>
            ) : !canvas ? (
              <div className="empty-c">
                <div className="empty-inner fade-up">
                  <div className="empty-ico">⊟</div>
                  <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic', marginBottom:8 }}>Business Model Canvas</div>
                  <div style={{ fontSize:12, color:'var(--mu)', lineHeight:1.7, maxWidth:320, margin:'0 auto 20px' }}>
                    Décrivez votre entreprise en quelques phrases — l'IA génère les 9 blocs Osterwalder avec insights stratégiques.
                  </div>
                  <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                    <button className="btn gen" onClick={() => { setShowForm(true); setGenMode('ai') }}>✦ Générer avec l'IA</button>
                    <button className="btn" onClick={() => { setShowForm(true); setGenMode('manual') }}>✎ Saisir manuellement</button>
                    <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer JSON</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="canvas-wrap fade-up">

                {/* Scores bar */}
                {activeTab === 'canvas' && (
                  <div className="score-row">
                    <div>
                      <div className="score-lbl">Score global</div>
                      <div className="score-big"><Counter value={canvas.score?.overall||72}/><span style={{ fontSize:13, color:'var(--mu)', marginLeft:2 }}>/100</span></div>
                    </div>
                    {[
                      { label:'Viabilité',   key:'viability',   color:'#22d3a5' },
                      { label:'Innovation',  key:'innovation',  color:'#8b5cf6' },
                      { label:'Scalabilité', key:'scalability', color:'#06b6d4' },
                    ].map(s => (
                      <div key={s.key} style={{ flex:1, minWidth:120 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', letterSpacing:'.05em' }}>{s.label}</span>
                          <span style={{ fontSize:10, fontWeight:700, color:s.color, fontFamily:'Geist Mono,monospace' }}><Counter value={canvas.score?.[s.key]||70}/>%</span>
                        </div>
                        <div style={{ height:3, background:'rgba(255,255,255,.06)', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:99, background:s.color, width:`${canvas.score?.[s.key]||70}%`, transition:'width 1.2s ease' }}/>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginLeft:'auto', textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--mu)', marginBottom:2 }}>{canvas.company}</div>
                      {canvas.tagline && <div style={{ fontSize:11, color:'var(--mu2)', fontStyle:'italic', maxWidth:200 }}>{canvas.tagline}</div>}
                      <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', marginTop:4 }}>{filledCount}/9 blocs remplis</div>
                    </div>
                  </div>
                )}

                {/* CANVAS TAB */}
                {activeTab === 'canvas' && (
                  <div style={{ background:'rgba(17,17,24,.6)', borderRadius:10, border:'1px solid var(--b1)', padding:6, flex:1 }}>
                    <div className="bmc-grid">
                      {Object.entries(BLOCKS_META).map(([key, meta]) => (
                        <div key={key} className={meta.grid}>
                          <BMCBlock
                            blockKey={key}
                            block={{ ...(canvas.blocks?.[key]||{ items:[], insight:'' }), title: meta.title }}
                            meta={meta}
                            onUpdate={(i,v) => updateItem(key,i,v)}
                            onDelete={i => deleteItem(key,i)}
                            onAdd={v => addItem(key,v)}
                            highlight={highlight===key}
                            onHL={setHighlight}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* INSIGHTS TAB */}
                {activeTab === 'insights' && (
                  <div className="tab-content fade-up">
                    <div className="insight-grid">
                      <div className="insight-card">
                        <div className="ic-title" style={{ color:'var(--acc)' }}>◉ Insights stratégiques</div>
                        {(canvas.strategic_insights||[]).length === 0 && <div style={{ fontSize:12, color:'var(--mu)', fontStyle:'italic' }}>Générez d'abord le canvas avec l'IA pour obtenir des insights.</div>}
                        {(canvas.strategic_insights||[]).map((ins,i) => (
                          <div key={i} style={{ display:'flex', gap:10, marginBottom:14, padding:'10px 12px', borderRadius:7, background:'rgba(245,158,11,.04)', border:'1px solid rgba(245,158,11,.1)' }}>
                            <div style={{ width:20, height:20, borderRadius:'50%', background:'rgba(245,158,11,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--acc)', flexShrink:0, fontFamily:'Geist Mono,monospace' }}>{i+1}</div>
                            <p style={{ fontSize:12, color:'rgba(240,239,245,.8)', lineHeight:1.6 }}>{ins}</p>
                          </div>
                        ))}
                      </div>
                      <div className="insight-card">
                        <div className="ic-title" style={{ color:'#22d3a5' }}>⊕ Opportunités</div>
                        {(canvas.opportunities||[]).map((opp,i) => (
                          <div key={i} style={{ display:'flex', gap:8, marginBottom:10 }}>
                            <div style={{ width:4, height:4, borderRadius:'50%', background:'#22d3a5', flexShrink:0, marginTop:7 }}/>
                            <p style={{ fontSize:12, color:'rgba(240,239,245,.75)', lineHeight:1.6 }}>{opp}</p>
                          </div>
                        ))}
                        <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--b1)' }}>
                          <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:10 }}>Insights par bloc</div>
                          {Object.entries(canvas.blocks||{}).map(([key,block]) => {
                            if (!block?.insight) return null
                            const meta = BLOCKS_META[key]
                            return (
                              <div key={key} style={{ display:'flex', gap:8, marginBottom:8 }}>
                                <span style={{ padding:'1px 6px', borderRadius:3, background:`${meta?.color}15`, border:`1px solid ${meta?.color}30`, fontSize:8, fontFamily:'Geist Mono,monospace', color:meta?.color, flexShrink:0, alignSelf:'flex-start', marginTop:2 }}>{meta?.label}</span>
                                <p style={{ fontSize:11, color:'rgba(240,239,245,.55)', lineHeight:1.5, fontStyle:'italic' }}>{block.insight}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* RISKS TAB */}
                {activeTab === 'risks' && (
                  <div className="tab-content fade-up">
                    <div style={{ maxWidth:620, margin:'0 auto' }}>
                      <div className="insight-card">
                        <div className="ic-title" style={{ color:'#ef4444' }}>⬡ Analyse des risques</div>
                        {(canvas.risks||[]).length === 0 && <div style={{ fontSize:12, color:'var(--mu)', fontStyle:'italic' }}>Lancez l'analyse IA pour identifier les risques stratégiques.</div>}
                        {(canvas.risks||[]).map((risk,i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px', borderRadius:9, marginBottom:8, background:`${RISK_COLOR(risk.level)}07`, border:`1px solid ${RISK_COLOR(risk.level)}25` }}>
                            <div style={{ padding:'2px 10px', borderRadius:99, background:`${RISK_COLOR(risk.level)}15`, border:`1px solid ${RISK_COLOR(risk.level)}35`, fontSize:9, fontFamily:'Geist Mono,monospace', fontWeight:700, color:RISK_COLOR(risk.level), textTransform:'uppercase', flexShrink:0 }}>
                              {risk.level}
                            </div>
                            <p style={{ fontSize:12, color:'rgba(240,239,245,.8)', lineHeight:1.5 }}>{risk.text}</p>
                          </div>
                        ))}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:18, paddingTop:16, borderTop:'1px solid var(--b1)' }}>
                          <div style={{ padding:'12px 14px', borderRadius:9, background:'rgba(34,211,238,.05)', border:'1px solid rgba(34,211,238,.15)' }}>
                            <div style={{ fontSize:9, color:'#22d3ee', fontFamily:'Geist Mono,monospace', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>Modèle de revenus</div>
                            <p style={{ fontSize:12, color:'rgba(240,239,245,.7)' }}>{canvas.blocks?.revenueStreams?.model || (canvas.blocks?.revenueStreams?.items?.[0]) || '—'}</p>
                          </div>
                          <div style={{ padding:'12px 14px', borderRadius:9, background:'rgba(100,116,139,.05)', border:'1px solid rgba(100,116,139,.15)' }}>
                            <div style={{ fontSize:9, color:'#94a3b8', fontFamily:'Geist Mono,monospace', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>Structure de coûts</div>
                            <p style={{ fontSize:12, color:'rgba(240,239,245,.7)' }}>{canvas.blocks?.costStructure?.type || (canvas.blocks?.costStructure?.items?.[0]) || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* ── AI ANALYSIS PANEL ── */}
        <div className={`ai-panel ${showAiPanel?'open':''}`}>
          <div className="ai-ph">
            <div>
              <span className="ai-title-t">Analyse IA ✦</span>
              {active?.generatedByAI && <div style={{ fontSize:9, color:'var(--gen)', fontFamily:'Geist Mono,monospace', marginTop:2 }}>Canvas généré automatiquement</div>}
              {canvas && <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', marginTop:1 }}>{filledCount}/9 blocs analysés</div>}
            </div>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-body">
            {aiLoading && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'20px 0', color:'var(--mu2)', fontSize:12 }}>
                <span className="spinner"/>Analyse du canvas en cours…
              </div>
            )}

            {aiResult && !aiLoading && (
              <>
                {aiResult.score && (
                  <div>
                    <div className="ai-st">Score après analyse</div>
                    <div className="ai-score-grid">
                      {[
                        { label:'Global',     key:'overall',    color:'var(--acc)' },
                        { label:'Viabilité',  key:'viability',  color:'#22d3a5' },
                        { label:'Innovation', key:'innovation', color:'#8b5cf6' },
                        { label:'Scalabilité',key:'scalability',color:'#06b6d4' },
                      ].map(s => (
                        <div key={s.key} className="ai-score-card">
                          <div className="ai-score-val" style={{ color:s.color }}>
                            <Counter value={aiResult.score[s.key]||70}/>
                            <span style={{ fontSize:11, color:'var(--mu)', marginLeft:2 }}>{s.key==='overall'?'/100':'%'}</span>
                          </div>
                          <div style={{ fontSize:9, color:'var(--mu2)', fontFamily:'Geist Mono,monospace', marginTop:2 }}>{s.label}</div>
                          <div className="ai-score-bar">
                            <div className="ai-score-fill" style={{ width:`${aiResult.score[s.key]||70}%`, background:s.color }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                    {aiResult.score.commentaire && <div style={{ fontSize:11, color:'var(--mu2)', marginTop:6, fontStyle:'italic' }}>{aiResult.score.commentaire}</div>}
                  </div>
                )}

                {aiResult.diagnostic && (
                  <div>
                    <div className="ai-st">Diagnostic global</div>
                    <div className="ai-card">{aiResult.diagnostic}</div>
                  </div>
                )}

                {aiResult.blocs?.length > 0 && (
                  <div>
                    <div className="ai-st">Analyse par bloc</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {aiResult.blocs.map((b,i) => {
                        const meta = BLOCKS_META[b.key]
                        if (!meta) return null
                        const sc = STATUT_COLORS[b.statut] || 'var(--mu2)'
                        return (
                          <div key={i} className="ai-bloc-item" style={{ borderLeft:`3px solid ${sc}` }}>
                            <div className="ai-bloc-top">
                              <div className="ai-bloc-key" style={{ background:`${meta.color}18`, color:meta.color, border:`1px solid ${meta.color}35` }}>{meta.label}</div>
                              <span className="ai-bloc-name">{meta.title}</span>
                              <span style={{ marginLeft:'auto', fontSize:9, padding:'1px 7px', borderRadius:3, background:`${sc}18`, color:sc, border:`1px solid ${sc}40`, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{b.statut}</span>
                            </div>
                            <div className="ai-bloc-txt">{b.analyse}</div>
                            {b.suggestion && <div className="ai-bloc-sug">→ {b.suggestion}</div>}
                            {b.items_a_ajouter?.length > 0 && (
                              <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:4 }}>
                                {b.items_a_ajouter.map((it,j) => (
                                  <span key={j}
                                    style={{ fontSize:9, padding:'2px 7px', borderRadius:3, background:`${meta.color}12`, color:meta.color, border:`1px solid ${meta.color}30`, fontFamily:'Geist Mono,monospace', cursor:'pointer' }}
                                    onClick={() => addItem(b.key, it)}>
                                    + {it}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {aiResult.coherences?.length > 0 && (
                  <div>
                    <div className="ai-st">Alignements & tensions</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {aiResult.coherences.map((c,i) => {
                        const tc = c.type==='alignement' ? '#22d3a5' : c.type==='tension' ? '#f87171' : '#f59e0b'
                        return (
                          <div key={i} className="ai-li">
                            <span className="ai-li-b" style={{ color:tc }}>{c.type==='alignement'?'↔':c.type==='tension'?'⚡':'◎'}</span>
                            <span>{c.description}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {aiResult.priorites?.length > 0 && (
                  <div>
                    <div className="ai-st">Priorités d'action</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {aiResult.priorites.map((p,i) => (
                        <div key={i} className="ai-li">
                          <span className="ai-li-b">#{i+1}</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.opportunites_cachees?.length > 0 && (
                  <div>
                    <div className="ai-st" style={{ color:'#22d3a5' }}>⊕ Opportunités cachées</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {aiResult.opportunites_cachees.map((o,i) => (
                        <div key={i} className="ai-li"><span className="ai-li-b" style={{ color:'#22d3a5' }}>↑</span><span>{o}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.risques?.length > 0 && (
                  <div>
                    <div className="ai-st" style={{ color:'#f87171' }}>⬡ Risques identifiés</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {aiResult.risques.map((r,i) => (
                        <div key={i} className="ai-li" style={{ borderColor:`${RISK_COLOR(r.level)}30` }}>
                          <span className="ai-li-b" style={{ color:RISK_COLOR(r.level) }}>{r.level==='high'?'▲':r.level==='medium'?'◆':'▽'}</span>
                          <span>{r.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.conclusion && (
                  <div>
                    <div className="ai-st">Conclusion</div>
                    <div className="ai-card" style={{ fontStyle:'italic', color:'var(--mu2)' }}>{aiResult.conclusion}</div>
                  </div>
                )}

                {canvas && (
                  <button className="btn ai" style={{ width:'100%', justifyContent:'center', marginTop:4 }} onClick={runAnalysis} disabled={aiLoading}>
                    ↺ Relancer l'analyse
                  </button>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div style={{ padding:'40px 16px', textAlign:'center' }}>
                <div style={{ fontSize:32, opacity:.15, marginBottom:12 }}>✦</div>
                <div style={{ fontSize:11, color:'var(--mu)', lineHeight:1.7 }}>
                  Cliquez sur <strong style={{ color:'var(--tx)' }}>Analyser</strong> dans la barre du haut pour obtenir un diagnostic complet avec recommandations bloc par bloc.
                </div>
                {canvas && !canvasHasContent(canvas) && (
                  <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(248,113,113,.06)', border:'1px solid rgba(248,113,113,.2)', borderRadius:8, fontSize:11, color:'#f87171' }}>
                    ⚠ Ajoutez des éléments dans au moins un bloc avant d'analyser.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── TOAST ── */}
        {toast && (
          <div className={`toast ${toast.type||''}`}>
            {toast.type==='error' ? '✕' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}