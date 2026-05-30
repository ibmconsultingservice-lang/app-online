'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const SEG_CATEGORIES = [
  { id:'geographic',    label:'Géographique',    icon:'🌍', color:'#60a5fa', bg:'rgba(96,165,250,.1)',  border:'rgba(96,165,250,.25)',  desc:'Zones géographiques, pays, régions, villes, densité' },
  { id:'demographic',   label:'Démographique',   icon:'👥', color:'#a78bfa', bg:'rgba(167,139,250,.1)', border:'rgba(167,139,250,.25)', desc:'Âge, genre, revenu, éducation, profession, famille' },
  { id:'psychographic', label:'Psychographique', icon:'🧠', color:'#fb923c', bg:'rgba(251,146,60,.1)',  border:'rgba(251,146,60,.25)',  desc:'Style de vie, valeurs, personnalité, centres d\'intérêt' },
  { id:'behavioral',    label:'Comportemental',  icon:'⚡', color:'#34d399', bg:'rgba(52,211,153,.1)',  border:'rgba(52,211,153,.25)',  desc:'Comportement d\'achat, fidélité, avantages recherchés' },
]

const PRIORITY_CONFIG = {
  primary:   { label:'Primaire',   color:'#f59e0b', bg:'rgba(245,158,11,.1)' },
  secondary: { label:'Secondaire', color:'#818cf8', bg:'rgba(129,140,248,.1)' },
  tertiary:  { label:'Tertiaire',  color:'#6b7280', bg:'rgba(107,114,128,.1)' },
}

const TARGETING_STRATEGIES = {
  undifferentiated: { label:'Non différencié',  desc:'Un seul mix pour tout le marché',             icon:'◎' },
  differentiated:   { label:'Différencié',      desc:'Mix distincts par segment cible',             icon:'◈' },
  concentrated:     { label:'Concentré',        desc:'Focus total sur un seul segment',             icon:'◉' },
  micro:            { label:'Micro-marketing',  desc:'Personnalisation poussée / individuelle',     icon:'⬡' },
}

const GROWTH_COLORS = { élevé:'#34d399', modéré:'#f59e0b', faible:'#f87171' }

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark:    { id:'dark',    label:'Sombre',     bg:'#0a0a0f', surface:'#111118', surface2:'#18181f', surface3:'#1e1e28', text:'#f0eff5', muted:'#6b6a7a', muted2:'#9896aa', border:'rgba(255,255,255,.07)', border2:'rgba(255,255,255,.12)', accent:'#6366f1', accent2:'#818cf8' },
  ocean:   { id:'ocean',   label:'Océan',      bg:'#030d1a', surface:'#071828', surface2:'#0d2035', surface3:'#122540', text:'#e0f2fe', muted:'#4a7a9b', muted2:'#7fb3cc', border:'rgba(96,165,250,.1)',  border2:'rgba(96,165,250,.2)',  accent:'#0ea5e9', accent2:'#38bdf8' },
  forest:  { id:'forest',  label:'Forêt',      bg:'#030d08', surface:'#071a0f', surface2:'#0d2516', surface3:'#12301e', text:'#dcfce7', muted:'#3a7a55', muted2:'#6bb880', border:'rgba(52,211,153,.1)',  border2:'rgba(52,211,153,.2)',  accent:'#10b981', accent2:'#34d399' },
  sunset:  { id:'sunset',  label:'Coucher',    bg:'#1a080a', surface:'#220d10', surface2:'#2d1217', surface3:'#38181e', text:'#fef2f2', muted:'#8a4444', muted2:'#c07777', border:'rgba(248,113,113,.1)', border2:'rgba(248,113,113,.2)', accent:'#f87171', accent2:'#fca5a5' },
  royal:   { id:'royal',   label:'Royal',      bg:'#08080f', surface:'#0f0f1e', surface2:'#15152a', surface3:'#1c1c36', text:'#ede9fe', muted:'#5a4a8a', muted2:'#9580cc', border:'rgba(139,92,246,.1)',  border2:'rgba(139,92,246,.2)',  accent:'#7c3aed', accent2:'#a78bfa' },
  light:   { id:'light',   label:'Clair',      bg:'#f8fafc', surface:'#ffffff', surface2:'#f1f5f9', surface3:'#e2e8f0', text:'#0f172a', muted:'#64748b', muted2:'#475569', border:'rgba(0,0,0,.08)',      border2:'rgba(0,0,0,.13)',     accent:'#6366f1', accent2:'#818cf8' },
}

const EMPTY_SEGMENT = (catId) => ({ id: uid(), label:'', description:'', size:'', growth:'modéré', relevance:3, category: catId })
const EMPTY_TARGET  = () => ({ id: uid(), label:'', segmentType:'demographic', priority:'primary', potential:3, competition:3, fit:3, rationale:'', estimatedSize:'', keyNeeds:[] })
const EMPTY_STP     = () => ({
  companyName: '', industry: '', contextSummary: '', generatedByAI: false,
  segmentation: { geographic:[], demographic:[], psychographic:[], behavioral:[] },
  targeting: { strategy:'concentrated', strategyRationale:'', segments:[] },
  positioning: {
    targetCustomer:'', category:'', differentiator:'', benefit:'', proof:'',
    valueProposition:'', positioningStatement:'',
    pillars: [],
    perceptualMap: { xAxis:'', yAxis:'', xLabel:{ low:'', high:'' }, yLabel:{ low:'', high:'' }, brand:{ x:3, y:3, label:'Notre marque' }, competitors:[] },
  },
})

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function STPPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,   setProject]   = useState(null)
  const [analyses,  setAnalyses]  = useState([])
  const [activeId,  setActiveId]  = useState(null)
  const [stp,       setStp]       = useState(null)   // live editing state

  const [view,      setView]      = useState('segmentation') // 'segmentation'|'targeting'|'positioning'|'report'
  const [theme,     setTheme]     = useState('dark')
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [newName,      setNewName]      = useState('')
  const [showGenModal, setShowGenModal] = useState(false)
  const [genContext,   setGenContext]   = useState('')
  const [genLoading,   setGenLoading]  = useState(false)

  // AI analyze
  const [aiLoading,   setAiLoading]  = useState(false)
  const [aiResult,    setAiResult]   = useState(null)

  // Forms
  const [editSeg,      setEditSeg]      = useState(null)   // { catId, idx } or null
  const [segForm,      setSegForm]      = useState(null)
  const [editTarget,   setEditTarget]   = useState(null)   // idx or null
  const [targetForm,   setTargetForm]   = useState(null)
  const [showMapEditor,setShowMapEditor]= useState(false)
  const [newCompetitor,setNewCompetitor]= useState({ name:'', x:3, y:3 })
  const [newPillar,    setNewPillar]    = useState({ title:'', description:'', icon:'⭐' })
  const [showPillarForm,setShowPillarForm] = useState(false)
  const [newNeed,      setNewNeed]      = useState('')

  const [toast, setToast] = useState(null)

  const T = THEMES[theme] || THEMES.dark

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.STP || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          setStp(last.stpData)
          if (last.aiResult) { setAiResult(last.aiResult); setView('report') }
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), STP: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  const active = analyses.find(a => a.id === activeId) || null

  // ── STP live update ───────────────────────────────────────────────────────
  const updateStp = useCallback((patch) => {
    setStp(prev => {
      const next = { ...prev, ...patch }
      setAnalyses(all => {
        const updated = all.map(a => a.id === activeId ? { ...a, stpData: next } : a)
        persist(updated)
        return updated
      })
      return next
    })
  }, [activeId, persist])

  const updatePositioning = (patch) => updateStp({ positioning: { ...stp.positioning, ...patch } })
  const updateTargeting   = (patch) => updateStp({ targeting:   { ...stp.targeting,   ...patch } })

  // ── CRUD analyses ─────────────────────────────────────────────────────────
  const createAnalysis = () => {
    if (!newName.trim()) return
    const id    = uid()
    const data  = { ...EMPTY_STP(), id }
    const record = { id, name: newName.trim(), createdAt: new Date().toISOString(), stpData: data, aiResult: null }
    const updated = [...analyses, record]
    setAnalyses(updated); setActiveId(id); setStp(data); setAiResult(null); setView('segmentation')
    persist(updated); setShowNewForm(false); setNewName('')
    showToast(`Analyse "${record.name}" créée`)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) {
      const last = updated[updated.length - 1]
      setActiveId(last?.id || null); setStp(last?.stpData || null); setAiResult(last?.aiResult || null)
    }
    showToast('Analyse supprimée', 'info')
  }

  const selectAnalysis = (a) => {
    setActiveId(a.id); setStp(a.stpData); setAiResult(a.aiResult || null)
    setView(a.aiResult ? 'report' : 'segmentation')
  }

  // ── Segmentation CRUD ──────────────────────────────────────────────────────
  const saveSegment = () => {
    if (!segForm?.label?.trim()) return
    const { catId, idx } = editSeg
    const current = [...(stp.segmentation?.[catId] || [])]
    if (idx === null) current.push({ ...segForm, id: uid() })
    else current[idx] = { ...current[idx], ...segForm }
    updateStp({ segmentation: { ...stp.segmentation, [catId]: current } })
    setEditSeg(null); setSegForm(null)
    showToast(idx === null ? 'Segment ajouté' : 'Segment mis à jour')
  }

  const deleteSegment = (catId, idx) => {
    const current = (stp.segmentation?.[catId] || []).filter((_, i) => i !== idx)
    updateStp({ segmentation: { ...stp.segmentation, [catId]: current } })
  }

  const openSegForm = (catId, idx=null) => {
    const cat = SEG_CATEGORIES.find(c => c.id === catId)
    setEditSeg({ catId, idx })
    setSegForm(idx === null ? EMPTY_SEGMENT(catId) : { ...stp.segmentation[catId][idx] })
  }

  // ── Targeting CRUD ─────────────────────────────────────────────────────────
  const saveTarget = () => {
    if (!targetForm?.label?.trim()) return
    const current = [...(stp.targeting?.segments || [])]
    if (editTarget === null) current.push({ ...targetForm, id: uid() })
    else current[editTarget] = { ...current[editTarget], ...targetForm }
    updateTargeting({ segments: current })
    setEditTarget(null); setTargetForm(null)
    showToast(editTarget === null ? 'Cible ajoutée' : 'Cible mise à jour')
  }

  const deleteTarget = (idx) => {
    const current = (stp.targeting?.segments || []).filter((_, i) => i !== idx)
    updateTargeting({ segments: current })
  }

  // ── Positioning: pillars ───────────────────────────────────────────────────
  const addPillar = () => {
    if (!newPillar.title.trim()) return
    const pillars = [...(stp.positioning?.pillars || []), { ...newPillar, id: uid() }]
    updatePositioning({ pillars })
    setNewPillar({ title:'', description:'', icon:'⭐' }); setShowPillarForm(false)
  }
  const deletePillar = (idx) => updatePositioning({ pillars: (stp.positioning?.pillars || []).filter((_,i)=>i!==idx) })

  // ── Perceptual map ─────────────────────────────────────────────────────────
  const addCompetitor = () => {
    if (!newCompetitor.name.trim()) return
    const competitors = [...(stp.positioning?.perceptualMap?.competitors || []), { ...newCompetitor, id: uid() }]
    updatePositioning({ perceptualMap: { ...stp.positioning?.perceptualMap, competitors } })
    setNewCompetitor({ name:'', x:3, y:3 })
  }
  const deleteCompetitor = (idx) => {
    const competitors = (stp.positioning?.perceptualMap?.competitors || []).filter((_,i)=>i!==idx)
    updatePositioning({ perceptualMap: { ...stp.positioning?.perceptualMap, competitors } })
  }
  const updateMap = (patch) => updatePositioning({ perceptualMap: { ...stp.positioning?.perceptualMap, ...patch } })

  // ── MODE 1: Generate ───────────────────────────────────────────────────────
  const runGenerate = async () => {
    if (!active || !genContext.trim()) return
    setGenLoading(true); setShowGenModal(false)
    try {
      const res  = await fetch('/api/generer-management/generer-stp', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contextDescription: genContext.trim(), projectName: project?.name||'', projectTag: project?.tag||'' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const d = data.data
      const newStp = {
        ...EMPTY_STP(),
        companyName:    d.companyName    || '',
        industry:       d.industry       || '',
        contextSummary: d.contextSummary || '',
        generatedByAI:  true,
        segmentation:   d.segmentation  || EMPTY_STP().segmentation,
        targeting:      d.targeting     || EMPTY_STP().targeting,
        positioning:    d.positioning   || EMPTY_STP().positioning,
      }
      setStp(newStp)
      setAnalyses(prev => {
        const updated = prev.map(a => a.id === activeId ? { ...a, stpData: newStp, aiResult: null } : a)
        persist(updated); return updated
      })
      setAiResult(null); setView('segmentation'); setGenContext('')
      showToast('✦ STP généré par l\'IA')
    } catch (err) { showToast(err.message, 'error') }
    setGenLoading(false)
  }

  // ── MODE 2: Analyze ────────────────────────────────────────────────────────
  const runAnalyze = async () => {
    if (!stp) return
    setAiLoading(true); setView('report'); setAiResult(null)
    try {
      const res  = await fetch('/api/generer-management/analyser-stp', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ stp, projectName: project?.name||'', projectTag: project?.tag||'' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiResult(data.result)
      setAnalyses(prev => {
        const updated = prev.map(a => a.id === activeId ? { ...a, aiResult: data.result } : a)
        persist(updated); return updated
      })
      showToast('Analyse STP générée ✦')
    } catch (err) { showToast(err.message, 'error'); setView('segmentation') }
    setAiLoading(false)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const exportAnalysis = () => {
    if (!active) return
    const payload = { version:'1.0', tool:'STP', exportedAt: new Date().toISOString(), analysis: active.name, stpData: stp, aiResult: aiResult||null }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' })
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `STP_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); showToast('Export réussi')
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const importFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw  = JSON.parse(ev.target.result)
        const data = raw.stpData || raw
        if (!data.segmentation) throw new Error('Format invalide — fichier STP requis')
        const id     = uid()
        const record = { id, name: raw.analysis || data.companyName || 'STP importé', createdAt: raw.exportedAt || new Date().toISOString(), importedAt: new Date().toISOString(), stpData: data, aiResult: raw.aiResult || null }
        const updated = [...analyses, record]
        setAnalyses(updated); persist(updated)
        setActiveId(id); setStp(data); setAiResult(raw.aiResult || null)
        setView(raw.aiResult ? 'report' : 'segmentation')
        showToast(`"${record.name}" importé`)
      } catch (err) { showToast(err.message || 'Fichier invalide', 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  // ── Perceptual map SVG ─────────────────────────────────────────────────────
  const PerceptualMap = ({ map }) => {
    if (!map?.xAxis) return null
    const W=300, H=300, pad=20
    const toXY = (x, y) => ({ px: pad + ((x-1)/4)*(W-2*pad), py: pad + ((5-y)/4)*(H-2*pad) })
    const brand = map.brand || { x:3, y:3, label:'Notre marque' }
    const bp    = toXY(brand.x, brand.y)
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', maxWidth:300, background: T.surface2, borderRadius:10, border:`1px solid ${T.border2}` }}>
        {/* Axes */}
        <line x1={W/2} y1={pad} x2={W/2} y2={H-pad} stroke={T.border2} strokeWidth="1"/>
        <line x1={pad} y1={H/2} x2={W-pad} y2={H/2} stroke={T.border2} strokeWidth="1"/>
        {/* Axis labels */}
        <text x={W/2} y={pad-4} textAnchor="middle" fill={T.muted2} fontSize="9" fontFamily="Geist Mono,monospace">{map.yLabel?.high || 'Haut'}</text>
        <text x={W/2} y={H-4} textAnchor="middle" fill={T.muted2} fontSize="9" fontFamily="Geist Mono,monospace">{map.yLabel?.low || 'Bas'}</text>
        <text x={W-pad+2} y={H/2+3} textAnchor="start" fill={T.muted2} fontSize="9" fontFamily="Geist Mono,monospace">{map.xLabel?.high || '→'}</text>
        <text x={pad-2} y={H/2+3} textAnchor="end" fill={T.muted2} fontSize="9" fontFamily="Geist Mono,monospace">{map.xLabel?.low || '←'}</text>
        {/* Axis titles */}
        <text x={W-4} y={H/2-6} textAnchor="end" fill={T.muted} fontSize="8" fontFamily="Geist Mono,monospace">{map.xAxis?.slice(0,15)}</text>
        <text x={W/2+4} y={pad+12} textAnchor="start" fill={T.muted} fontSize="8" fontFamily="Geist Mono,monospace">{map.yAxis?.slice(0,15)}</text>
        {/* Competitors */}
        {(map.competitors||[]).map((c, i) => {
          const p = toXY(c.x, c.y)
          return (
            <g key={i}>
              <circle cx={p.px} cy={p.py} r="5" fill={`${T.muted}60`} stroke={T.border2} strokeWidth="1"/>
              <text x={p.px} y={p.py-8} textAnchor="middle" fill={T.muted2} fontSize="8" fontFamily="Geist Mono,monospace">{c.name?.slice(0,12)}</text>
            </g>
          )
        })}
        {/* Our brand */}
        <circle cx={bp.px} cy={bp.py} r="7" fill={T.accent} stroke={T.surface} strokeWidth="2"/>
        <text x={bp.px} y={bp.py-10} textAnchor="middle" fill={T.accent2} fontSize="9" fontWeight="700" fontFamily="Geist Mono,monospace">{brand.label?.slice(0,12)}</text>
      </svg>
    )
  }

  // ── Score ring ──────────────────────────────────────────────────────────────
  const ScoreRing = ({ value, size=48, color }) => {
    const r = (size-4)/2, circ = 2*Math.PI*r, off = circ - (value/5)*circ
    return (
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth="3"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={size*.22} fontFamily="Geist Mono,monospace" fontWeight="700" style={{ transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px` }}>
          {value.toFixed(1)}
        </text>
      </svg>
    )
  }

  // ── CSS vars injected inline via style tag ─────────────────────────────────
  const cssVars = Object.entries(T).map(([k, v]) => `--${k}:${v}`).join(';')

  const totalSegs = stp ? Object.values(stp.segmentation||{}).reduce((s,a)=>s+a.length,0) : 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .3s ease both; }
        .stp-root { min-height:100vh; display:flex; flex-direction:column; }

        /* Topbar */
        .tb { height:56px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 20px; gap:10px; position:sticky; top:0; z-index:100; }
        .back-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:6px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s; }
        .back-btn:hover { color:var(--text); }
        .tb-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .tb-sub { font-size:11px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .tb-right { margin-left:auto; display:flex; gap:6px; align-items:center; }

        /* Buttons */
        .btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .btn:hover { color:var(--text); border-color:var(--border2); }
        .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
        .btn.primary:hover { opacity:.9; }
        .btn.gen { background:rgba(129,140,248,.1); border-color:rgba(129,140,248,.3); color:var(--accent2); }
        .btn.gen:hover { background:rgba(129,140,248,.18); }
        .btn.ai { background:rgba(245,158,11,.08); border-color:rgba(245,158,11,.25); color:#f59e0b; }
        .btn.ai:hover { background:rgba(245,158,11,.15); }
        .btn:disabled { opacity:.35; cursor:not-allowed; }
        .btn.sm { padding:5px 10px; font-size:10px; }

        /* Theme pills */
        .theme-pill { padding:3px 8px; border-radius:99px; font-size:10px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .theme-pill.on { background:var(--accent); border-color:var(--accent); color:#fff; }

        /* Layout */
        .body { flex:1; display:grid; grid-template-columns:230px 1fr; height:calc(100vh - 56px); overflow:hidden; }

        /* Left sidebar */
        .sidebar { background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
        .ph { padding:14px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .pl { font-size:10px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .plist { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:2px; }
        .a-item { padding:10px 12px; border-radius:8px; cursor:pointer; border:1px solid transparent; transition:all .15s; position:relative; }
        .a-item:hover { background:var(--surface2); }
        .a-item.active { background:color-mix(in srgb, var(--accent) 10%, transparent); border-color:color-mix(in srgb, var(--accent) 30%, transparent); }
        .a-name { font-size:12px; font-weight:600; color:var(--text); padding-right:18px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .a-meta { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:2px; }
        .a-del { opacity:0; position:absolute; top:8px; right:8px; background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; }
        .a-item:hover .a-del { opacity:1; }
        .side-bottom { padding:10px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px; flex-shrink:0; }
        .lbl { font-size:10px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:3px; display:block; }
        .inp { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:7px 10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--text); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--accent); }
        .inp::placeholder { color:var(--muted); }
        textarea.inp { resize:vertical; }

        /* Main */
        .main { overflow-y:auto; background:var(--bg); display:flex; flex-direction:column; }

        /* Nav tabs */
        .nav-tabs { background:var(--surface); border-bottom:1px solid var(--border); padding:0 20px; display:flex; gap:2px; align-items:center; height:44px; flex-shrink:0; }
        .nav-tab { padding:6px 14px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:none; background:none; color:var(--muted2); transition:all .15s; }
        .nav-tab.active { background:color-mix(in srgb, var(--accent) 15%, transparent); color:var(--accent2); }
        .nav-tab:hover:not(.active) { color:var(--text); }
        .nav-sep { width:1px; height:20px; background:var(--border2); margin:0 4px; }

        /* Content area */
        .content { padding:24px; flex:1; display:flex; flex-direction:column; gap:20px; }

        /* Generated banner */
        .gen-banner { background:color-mix(in srgb, var(--accent2) 8%, transparent); border:1px solid color-mix(in srgb, var(--accent2) 25%, transparent); border-radius:10px; padding:12px 16px; display:flex; gap:10px; align-items:flex-start; }
        .gen-banner-lbl { font-size:10px; color:var(--accent2); font-family:'Geist Mono',monospace; font-weight:700; letter-spacing:.08em; margin-bottom:3px; }

        /* Section header */
        .sec-hd { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
        .sec-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; }
        .sec-count { font-size:10px; font-family:'Geist Mono',monospace; color:var(--muted2); padding:2px 8px; border-radius:4px; background:var(--surface2); border:1px solid var(--border); }

        /* Category block */
        .cat-block { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-bottom:14px; }
        .cat-hd { padding:12px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px; }
        .cat-icon-wrap { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; }
        .cat-label { font-size:13px; font-weight:700; }
        .cat-desc { font-size:11px; color:var(--muted2); flex:1; }
        .cat-count { font-size:10px; font-family:'Geist Mono',monospace; color:var(--muted2); }
        .cat-body { padding:10px; display:flex; flex-direction:column; gap:6px; }
        .seg-card { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:10px 12px; display:flex; gap:10px; align-items:flex-start; transition:border-color .15s; }
        .seg-card:hover { border-color:var(--border2); }
        .seg-info { flex:1; min-width:0; }
        .seg-name { font-size:12px; font-weight:700; margin-bottom:3px; }
        .seg-desc { font-size:11px; color:var(--muted2); line-height:1.5; }
        .seg-chips { display:flex; gap:5px; flex-wrap:wrap; margin-top:5px; }
        .chip { padding:2px 7px; border-radius:4px; font-size:9px; font-family:'Geist Mono',monospace; }
        .seg-actions { display:flex; flex-direction:column; gap:3px; }
        .icon-btn { width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:11px; color:var(--muted2); transition:all .15s; }
        .icon-btn:hover { background:var(--surface3); color:var(--text); }

        /* Targeting */
        .strategy-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:20px; }
        .strat-opt { padding:12px 14px; border-radius:10px; border:1px solid var(--border2); background:var(--surface2); cursor:pointer; transition:all .15s; }
        .strat-opt.on { border-color:color-mix(in srgb, var(--accent) 50%, transparent); background:color-mix(in srgb, var(--accent) 10%, transparent); }
        .strat-opt:hover:not(.on) { border-color:var(--border2); }
        .strat-icon { font-size:16px; margin-bottom:4px; }
        .strat-name { font-size:12px; font-weight:700; margin-bottom:2px; }
        .strat-desc { font-size:10px; color:var(--muted2); line-height:1.4; font-family:'Geist Mono',monospace; }
        .target-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; margin-bottom:8px; transition:border-color .15s; }
        .target-card:hover { border-color:var(--border2); }
        .target-priority { padding:4px 10px; border-radius:6px; font-size:10px; font-weight:700; font-family:'Geist Mono',monospace; flex-shrink:0; }
        .target-body { flex:1; min-width:0; }
        .target-name { font-size:13px; font-weight:700; margin-bottom:4px; }
        .target-rationale { font-size:11px; color:var(--muted2); line-height:1.5; margin-bottom:6px; }
        .target-scores { display:flex; gap:10px; flex-wrap:wrap; }
        .target-score { font-size:10px; font-family:'Geist Mono',monospace; }
        .needs-wrap { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
        .need-chip { padding:2px 8px; border-radius:4px; font-size:10px; background:var(--surface3); border:1px solid var(--border); color:var(--muted2); }

        /* Positioning */
        .pos-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .pos-field { display:flex; flex-direction:column; gap:4px; }
        .statement-box { background:color-mix(in srgb, var(--accent) 5%, transparent); border:1px solid color-mix(in srgb, var(--accent) 25%, transparent); border-radius:10px; padding:14px 16px; font-size:13px; color:var(--text); line-height:1.7; font-style:italic; }
        .pillar-card { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px 14px; display:flex; gap:10px; align-items:flex-start; }
        .pillar-icon { font-size:20px; flex-shrink:0; }
        .pillar-title { font-size:12px; font-weight:700; margin-bottom:2px; }
        .pillar-desc { font-size:11px; color:var(--muted2); line-height:1.5; }
        .pillars-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:8px; }

        /* Modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.78); z-index:200; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
        .modal { background:var(--surface); border:1px solid var(--border2); border-radius:16px; padding:24px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,.5); }
        .modal-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; margin-bottom:16px; }
        .form-group { margin-bottom:12px; }
        .form-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .select { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:7px 10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--text); outline:none; cursor:pointer; }
        .select:focus { border-color:var(--accent); }
        .modal-actions { display:flex; gap:8px; margin-top:16px; }
        .btn-full { flex:1; padding:10px; border-radius:8px; cursor:pointer; background:var(--accent); border:none; color:#fff; font-family:'Syne',sans-serif; font-size:13px; font-weight:600; }
        .btn-cancel { padding:10px 14px; border-radius:8px; cursor:pointer; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Syne',sans-serif; font-size:13px; }
        .range-inp { width:100%; accent-color:var(--accent); }
        .range-val { font-size:11px; color:var(--accent2); font-family:'Geist Mono',monospace; margin-left:4px; }

        /* Score circles for segment */
        .relevance-dots { display:flex; gap:3px; }
        .r-dot { width:7px; height:7px; border-radius:50%; }

        /* Report */
        .report-scores { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .score-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px; display:flex; flex-direction:column; align-items:center; gap:6px; }
        .score-lbl { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; text-transform:uppercase; letter-spacing:.08em; }
        .ai-block { background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:14px 16px; font-size:13px; color:var(--text); line-height:1.75; }
        .ai-section { margin-bottom:20px; }
        .ai-section-title { font-size:10px; color:var(--muted2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:8px; display:flex; align-items:center; gap:8px; }
        .ai-section-line { flex:1; height:1px; background:var(--border); }
        .ai-list { display:flex; flex-direction:column; gap:5px; }
        .ai-list-item { display:flex; gap:8px; align-items:flex-start; padding:8px 12px; background:var(--surface2); border:1px solid var(--border); border-radius:6px; font-size:12px; line-height:1.6; }
        .ai-list-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:5px; }
        .coherence-item { display:flex; gap:10px; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--muted2); line-height:1.6; }
        .kpi-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px; }
        .kpi-card { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:10px 12px; }
        .kpi-name { font-size:11px; font-weight:600; margin-bottom:4px; }
        .kpi-meta { font-size:10px; color:var(--muted2); font-family:'Geist Mono',monospace; }
        .improved-stmt { background:color-mix(in srgb, var(--accent) 6%, transparent); border:1px solid color-mix(in srgb, var(--accent) 25%, transparent); border-radius:10px; padding:14px 16px; font-size:13px; color:var(--text); line-height:1.75; font-style:italic; }

        /* Empty */
        .empty-cta { padding:60px 40px; text-align:center; }
        .empty-icon { font-size:40px; opacity:.2; margin-bottom:12px; }
        .empty-txt { font-size:13px; color:var(--muted); line-height:1.6; }

        /* Spinner / Toast */
        .spinner { width:16px; height:16px; border:2px solid var(--border2); border-top-color:var(--accent2); border-radius:50%; animation:spin .7s linear infinite; }
        .toast { position:fixed; bottom:24px; right:24px; z-index:500; background:var(--surface2); border:1px solid var(--border2); border-radius:8px; padding:12px 18px; font-size:12px; box-shadow:0 8px 32px rgba(0,0,0,.4); animation:fadeUp .2s ease; display:flex; align-items:center; gap:7px; max-width:360px; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info  { border-color:color-mix(in srgb, var(--accent) 40%, transparent); }

        @media(max-width:800px){ .body{grid-template-columns:1fr;} .sidebar{display:none;} .report-scores{grid-template-columns:1fr 1fr;} }
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={importFile}/>

      <div className="stp-root" style={{ [`--bg`]:T.bg,[`--surface`]:T.surface,[`--surface2`]:T.surface2,[`--surface3`]:T.surface3,[`--text`]:T.text,[`--muted`]:T.muted,[`--muted2`]:T.muted2,[`--border`]:T.border,[`--border2`]:T.border2,[`--accent`]:T.accent,[`--accent2`]:T.accent2 }}>

        {/* Topbar */}
        <header className="tb">
          <button className="back-btn" onClick={() => router.push(`/management${projectId?`?project=${projectId}`:''}`)}>← Retour</button>
          <div>
            <div className="tb-title">STP Analysis</div>
            {project && <div className="tb-sub">{project.name}</div>}
          </div>
          {/* Theme switcher */}
          <div style={{ display:'flex', gap:4, marginLeft:12 }}>
            {Object.values(THEMES).map(t => (
              <button key={t.id} className={`theme-pill ${theme===t.id?'on':''}`} onClick={() => setTheme(t.id)}
                style={theme===t.id?{}:{ background:t.surface, borderColor:t.border2, color:t.muted2 }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="tb-right">
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
            {active && <>
              <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>
              <button className="btn gen" onClick={() => setShowGenModal(true)} disabled={genLoading}>
                {genLoading ? <><span className="spinner"/>Génération…</> : '⚡ Générer'}
              </button>
              <button className="btn ai" onClick={runAnalyze} disabled={aiLoading}>
                {aiLoading ? <><span className="spinner"/>Analyse…</> : '✦ Analyser'}
              </button>
            </>}
          </div>
        </header>

        <div className="body">

          {/* Sidebar */}
          <aside className="sidebar">
            <div className="ph"><span className="pl">Analyses ({analyses.length})</span></div>
            <div className="plist">
              {analyses.length === 0 && <div className="empty-cta"><div className="empty-icon">🎯</div><div className="empty-txt">Créez votre première analyse STP</div></div>}
              {analyses.map(a => (
                <div key={a.id} className={`a-item ${activeId===a.id?'active':''}`} onClick={() => selectAnalysis(a)}>
                  <button className="a-del" onClick={e=>{e.stopPropagation();deleteAnalysis(a.id)}}>✕</button>
                  <div className="a-name">{a.name}</div>
                  <div className="a-meta">
                    {new Date(a.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
                    {a.stpData?.generatedByAI && ' · IA'}
                    {a.importedAt && ' · Importé'}
                    {a.aiResult && ' · ✦'}
                  </div>
                </div>
              ))}
            </div>
            {showNewForm ? (
              <div className="side-bottom">
                <label className="lbl">Nom de l'analyse</label>
                <input className="inp" placeholder="Ex: Lancement 2025" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createAnalysis()} autoFocus/>
                <div style={{display:'flex',gap:5}}>
                  <button className="btn primary" style={{flex:1}} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={()=>setShowNewForm(false)}>✕</button>
                </div>
              </div>
            ) : (
              <div className="side-bottom">
                <button className="btn" style={{justifyContent:'center'}} onClick={()=>setShowNewForm(true)}>+ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="main">
            {!active ? (
              <div className="empty-cta" style={{padding:'100px 60px',textAlign:'center'}}>
                <div className="empty-icon" style={{fontSize:56,marginBottom:16}}>🎯</div>
                <div style={{fontFamily:'Instrument Serif,serif',fontSize:24,fontStyle:'italic',marginBottom:8}}>Segmentation · Targeting · Positioning</div>
                <div className="empty-txt" style={{marginBottom:24}}>Créez une analyse puis utilisez ⚡ Générer pour que l'IA positionne automatiquement votre STP depuis un contexte libre.</div>
                <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                  <button className="btn gen" onClick={()=>setShowNewForm(true)}>⚡ Nouvelle analyse</button>
                  <button className="btn" onClick={()=>importRef.current?.click()}>↑ Importer JSON</button>
                </div>
              </div>
            ) : (<>

              {/* Nav tabs */}
              <div className="nav-tabs">
                {[
                  {id:'segmentation', label:`Segmentation ${totalSegs > 0 ? `(${totalSegs})`:''}` },
                  {id:'targeting',    label:`Targeting ${(stp?.targeting?.segments?.length||0)>0?`(${stp.targeting.segments.length})`:''}` },
                  {id:'positioning',  label:'Positioning'},
                  {id:'report',       label:'Analyse IA'},
                ].map(tab => (
                  <button key={tab.id} className={`nav-tab ${view===tab.id?'active':''}`} onClick={()=>setView(tab.id)}>{tab.label}</button>
                ))}
                <div className="nav-sep"/>
                <span style={{fontSize:10,color:'var(--muted)',fontFamily:'Geist Mono,monospace'}}>{active.name}</span>
              </div>

              {/* ── SEGMENTATION ── */}
              {view === 'segmentation' && (
                <div className="content fade-up">
                  {stp.contextSummary && (
                    <div className="gen-banner">
                      <span style={{fontSize:16}}>⚡</span>
                      <div style={{flex:1}}>
                        <div className="gen-banner-lbl">Généré par l'IA</div>
                        <div style={{fontSize:12,color:'var(--muted2)',lineHeight:1.6}}>{stp.contextSummary}</div>
                      </div>
                      <button onClick={()=>updateStp({contextSummary:''})} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:13}}>✕</button>
                    </div>
                  )}
                  <div className="sec-hd">
                    <span style={{fontSize:24}}>🔍</span>
                    <h2 className="sec-title">Segmentation du marché</h2>
                    <span className="sec-count">{totalSegs} segment(s)</span>
                  </div>

                  {SEG_CATEGORIES.map(cat => {
                    const segs = stp.segmentation?.[cat.id] || []
                    return (
                      <div key={cat.id} className="cat-block">
                        <div className="cat-hd">
                          <div className="cat-icon-wrap" style={{background:cat.bg,border:`1px solid ${cat.border}`}}>{cat.icon}</div>
                          <div style={{flex:1}}>
                            <div className="cat-label" style={{color:cat.color}}>{cat.label}</div>
                            <div style={{fontSize:11,color:'var(--muted2)'}}>{cat.desc}</div>
                          </div>
                          <span className="cat-count">{segs.length} seg.</span>
                          <button className="btn sm" onClick={()=>openSegForm(cat.id)}>+ Ajouter</button>
                        </div>
                        <div className="cat-body">
                          {segs.length===0 && <div style={{padding:'12px 8px',fontSize:11,color:'var(--muted)',fontStyle:'italic'}}>Aucun segment — cliquez "+ Ajouter" ou utilisez ⚡ Générer</div>}
                          {segs.map((seg, idx) => {
                            const gColor = GROWTH_COLORS[seg.growth] || 'var(--muted2)'
                            return (
                              <div key={seg.id||idx} className="seg-card">
                                <div className="seg-info">
                                  <div className="seg-name">{seg.label}</div>
                                  {seg.description && <div className="seg-desc">{seg.description}</div>}
                                  <div className="seg-chips">
                                    {seg.size && <span className="chip" style={{background:'var(--surface3)',color:'var(--muted2)',border:'1px solid var(--border)'}}>{seg.size}</span>}
                                    {seg.growth && <span className="chip" style={{background:`${gColor}15`,color:gColor,border:`1px solid ${gColor}30`}}>{seg.growth}</span>}
                                    {seg.relevance && (
                                      <div className="relevance-dots" style={{marginLeft:2}}>
                                        {[1,2,3,4,5].map(i => <div key={i} className="r-dot" style={{background: i<=seg.relevance ? cat.color : 'var(--border2)'}}/>)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="seg-actions">
                                  <button className="icon-btn" onClick={()=>openSegForm(cat.id, idx)}>✎</button>
                                  <button className="icon-btn" style={{color:'#f87171'}} onClick={()=>deleteSegment(cat.id, idx)}>✕</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  <div style={{display:'flex',justifyContent:'flex-end'}}>
                    <button className="btn" onClick={()=>setView('targeting')}>Passer au Targeting →</button>
                  </div>
                </div>
              )}

              {/* ── TARGETING ── */}
              {view === 'targeting' && (
                <div className="content fade-up">
                  <div className="sec-hd">
                    <span style={{fontSize:24}}>🎯</span>
                    <h2 className="sec-title">Stratégie de ciblage</h2>
                  </div>

                  {/* Strategy selector */}
                  <div>
                    <div className="lbl" style={{marginBottom:8}}>Stratégie de ciblage</div>
                    <div className="strategy-grid">
                      {Object.entries(TARGETING_STRATEGIES).map(([key, s]) => (
                        <div key={key} className={`strat-opt ${stp.targeting?.strategy===key?'on':''}`} onClick={()=>updateTargeting({strategy:key})}>
                          <div className="strat-icon">{s.icon}</div>
                          <div className="strat-name" style={{color:stp.targeting?.strategy===key?'var(--accent2)':'var(--text)'}}>{s.label}</div>
                          <div className="strat-desc">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{marginBottom:16}}>
                      <label className="lbl">Justification de la stratégie</label>
                      <textarea className="inp" rows={2} placeholder="Pourquoi cette stratégie est adaptée à votre contexte…"
                        value={stp.targeting?.strategyRationale||''} onChange={e=>updateTargeting({strategyRationale:e.target.value})}/>
                    </div>
                  </div>

                  {/* Segments cibles */}
                  <div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <div className="lbl" style={{marginBottom:0}}>Segments cibles ({stp.targeting?.segments?.length||0})</div>
                      <button className="btn sm" onClick={()=>{setEditTarget(null);setTargetForm(EMPTY_TARGET())}}>+ Ajouter</button>
                    </div>
                    {(stp.targeting?.segments||[]).length===0 && (
                      <div style={{padding:'24px',textAlign:'center',border:'1px dashed var(--border2)',borderRadius:10,color:'var(--muted)',fontSize:12,fontStyle:'italic'}}>
                        Aucun segment cible — ajoutez des segments ou générez avec l'IA
                      </div>
                    )}
                    {(stp.targeting?.segments||[]).map((t, idx) => {
                      const pc = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.primary
                      return (
                        <div key={t.id||idx} className="target-card">
                          <div>
                            <span className="target-priority" style={{background:pc.bg,color:pc.color,border:`1px solid ${pc.color}30`}}>{pc.label}</span>
                          </div>
                          <div className="target-body">
                            <div className="target-name">{t.label}</div>
                            {t.rationale && <div className="target-rationale">{t.rationale}</div>}
                            <div className="target-scores">
                              {[{l:'Potentiel',v:t.potential},{l:'Concurrence',v:t.competition},{l:'Fit',v:t.fit}].map(s=>(
                                <span key={s.l} className="target-score" style={{color:s.v>=4?'#34d399':s.v>=3?'#f59e0b':'#f87171'}}>{s.l}: {s.v}/5</span>
                              ))}
                              {t.estimatedSize && <span className="target-score" style={{color:'var(--muted2)'}}>Taille: {t.estimatedSize}</span>}
                            </div>
                            {(t.keyNeeds||[]).length > 0 && (
                              <div className="needs-wrap">
                                {t.keyNeeds.map((n,i) => <span key={i} className="need-chip">{n}</span>)}
                              </div>
                            )}
                          </div>
                          <div style={{display:'flex',gap:3}}>
                            <button className="icon-btn" onClick={()=>{setEditTarget(idx);setTargetForm({...t})}}>✎</button>
                            <button className="icon-btn" style={{color:'#f87171'}} onClick={()=>deleteTarget(idx)}>✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <button className="btn" onClick={()=>setView('segmentation')}>← Segmentation</button>
                    <button className="btn" onClick={()=>setView('positioning')}>Passer au Positioning →</button>
                  </div>
                </div>
              )}

              {/* ── POSITIONING ── */}
              {view === 'positioning' && (
                <div className="content fade-up">
                  <div className="sec-hd">
                    <span style={{fontSize:24}}>🏆</span>
                    <h2 className="sec-title">Positionnement</h2>
                  </div>

                  {/* Positioning fields grid */}
                  <div className="pos-grid">
                    {[
                      {field:'targetCustomer', label:'Client cible',       ph:'Description précise du client idéal'},
                      {field:'category',       label:'Catégorie marché',   ph:'Dans quelle catégorie vous positionnez-vous ?'},
                      {field:'differentiator', label:'Différenciateur clé',ph:'Ce qui vous rend unique et défendable'},
                      {field:'benefit',        label:'Bénéfice principal', ph:'Ce que le client gagne concrètement'},
                      {field:'proof',          label:'Preuve / Reason to believe', ph:'Pourquoi vous croire ?'},
                    ].map(({field,label,ph}) => (
                      <div key={field} className="pos-field">
                        <label className="lbl">{label}</label>
                        <input className="inp" placeholder={ph} value={stp.positioning?.[field]||''} onChange={e=>updatePositioning({[field]:e.target.value})}/>
                      </div>
                    ))}
                    <div className="pos-field">
                      <label className="lbl">Horizon temporel</label>
                      <input className="inp" placeholder="Ex: Leaders dans 3 ans" value={stp.positioning?.timeHorizon||''} onChange={e=>updatePositioning({timeHorizon:e.target.value})}/>
                    </div>
                  </div>

                  {/* Value proposition */}
                  <div>
                    <label className="lbl">Proposition de valeur</label>
                    <textarea className="inp" rows={3} placeholder="Décrivez votre proposition de valeur complète en 2-3 phrases…"
                      value={stp.positioning?.valueProposition||''} onChange={e=>updatePositioning({valueProposition:e.target.value})}/>
                  </div>

                  {/* Positioning statement */}
                  <div>
                    <label className="lbl">Positioning Statement</label>
                    <textarea className="inp" rows={3} placeholder="Pour [client cible], [marque] est le/la [catégorie] qui [différenciateur] parce que [preuve]."
                      value={stp.positioning?.positioningStatement||''} onChange={e=>updatePositioning({positioningStatement:e.target.value})}/>
                    {stp.positioning?.positioningStatement && (
                      <div className="statement-box" style={{marginTop:8}}>{stp.positioning.positioningStatement}</div>
                    )}
                  </div>

                  {/* Pillars */}
                  <div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                      <label className="lbl" style={{marginBottom:0}}>Piliers de positionnement ({(stp.positioning?.pillars||[]).length})</label>
                      <button className="btn sm" onClick={()=>setShowPillarForm(true)}>+ Ajouter</button>
                    </div>
                    {showPillarForm && (
                      <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:10,padding:14,marginBottom:10,display:'flex',flexDirection:'column',gap:8}}>
                        <div className="form-row">
                          <div><label className="lbl">Icône</label><input className="inp" value={newPillar.icon} onChange={e=>setNewPillar(p=>({...p,icon:e.target.value}))} style={{width:60}}/></div>
                          <div style={{gridColumn:'span 1',flex:1}}><label className="lbl">Titre</label><input className="inp" placeholder="Ex: Excellence technologique" value={newPillar.title} onChange={e=>setNewPillar(p=>({...p,title:e.target.value}))} autoFocus/></div>
                        </div>
                        <div><label className="lbl">Description</label><input className="inp" placeholder="Description du pilier…" value={newPillar.description} onChange={e=>setNewPillar(p=>({...p,description:e.target.value}))}/></div>
                        <div style={{display:'flex',gap:6}}><button className="btn-full" style={{padding:'7px',borderRadius:6,background:'var(--accent)',border:'none',color:'#fff',cursor:'pointer',fontSize:12}} onClick={addPillar}>Ajouter</button><button className="btn-cancel" style={{padding:'7px 12px',borderRadius:6,background:'var(--surface2)',border:'1px solid var(--border2)',color:'var(--muted2)',cursor:'pointer',fontSize:12}} onClick={()=>setShowPillarForm(false)}>Annuler</button></div>
                      </div>
                    )}
                    <div className="pillars-grid">
                      {(stp.positioning?.pillars||[]).map((p, i) => (
                        <div key={p.id||i} className="pillar-card">
                          <div className="pillar-icon">{p.icon}</div>
                          <div style={{flex:1}}>
                            <div className="pillar-title">{p.title}</div>
                            <div className="pillar-desc">{p.description}</div>
                          </div>
                          <button className="icon-btn" style={{color:'#f87171',flexShrink:0}} onClick={()=>deletePillar(i)}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Perceptual map */}
                  <div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                      <label className="lbl" style={{marginBottom:0}}>Carte perceptuelle</label>
                      <button className="btn sm" onClick={()=>setShowMapEditor(!showMapEditor)}>{showMapEditor?'Fermer':'Éditer'}</button>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
                      <PerceptualMap map={stp.positioning?.perceptualMap}/>
                      {showMapEditor && (
                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                          <div className="form-row">
                            <div><label className="lbl">Axe X</label><input className="inp" placeholder="Ex: Prix" value={stp.positioning?.perceptualMap?.xAxis||''} onChange={e=>updateMap({xAxis:e.target.value})}/></div>
                            <div><label className="lbl">Axe Y</label><input className="inp" placeholder="Ex: Qualité" value={stp.positioning?.perceptualMap?.yAxis||''} onChange={e=>updateMap({yAxis:e.target.value})}/></div>
                          </div>
                          <div className="form-row">
                            <div><label className="lbl">Notre marque X ({stp.positioning?.perceptualMap?.brand?.x||3})</label><input type="range" className="range-inp" min="1" max="5" step=".5" value={stp.positioning?.perceptualMap?.brand?.x||3} onChange={e=>updateMap({brand:{...stp.positioning.perceptualMap.brand,x:+e.target.value}})}/></div>
                            <div><label className="lbl">Notre marque Y ({stp.positioning?.perceptualMap?.brand?.y||3})</label><input type="range" className="range-inp" min="1" max="5" step=".5" value={stp.positioning?.perceptualMap?.brand?.y||3} onChange={e=>updateMap({brand:{...stp.positioning.perceptualMap.brand,y:+e.target.value}})}/></div>
                          </div>
                          <div style={{marginTop:4}}>
                            <label className="lbl">Ajouter un concurrent</label>
                            <div style={{display:'grid',gridTemplateColumns:'1fr .4fr .4fr auto',gap:4,alignItems:'center'}}>
                              <input className="inp" placeholder="Nom" value={newCompetitor.name} onChange={e=>setNewCompetitor(p=>({...p,name:e.target.value}))}/>
                              <input className="inp" type="number" min="1" max="5" step=".5" placeholder="X" value={newCompetitor.x} onChange={e=>setNewCompetitor(p=>({...p,x:+e.target.value}))}/>
                              <input className="inp" type="number" min="1" max="5" step=".5" placeholder="Y" value={newCompetitor.y} onChange={e=>setNewCompetitor(p=>({...p,y:+e.target.value}))}/>
                              <button className="btn sm" onClick={addCompetitor}>+</button>
                            </div>
                          </div>
                          {(stp.positioning?.perceptualMap?.competitors||[]).map((c,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--muted2)'}}>
                              <span style={{flex:1}}>{c.name}</span>
                              <span style={{fontFamily:'Geist Mono,monospace'}}>({c.x},{c.y})</span>
                              <button className="icon-btn" style={{color:'#f87171'}} onClick={()=>deleteCompetitor(i)}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <button className="btn" onClick={()=>setView('targeting')}>← Targeting</button>
                    <button className="btn ai" onClick={runAnalyze} disabled={aiLoading}>
                      {aiLoading?<><span className="spinner"/>Analyse…</>:'✦ Lancer l\'analyse IA'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── REPORT ── */}
              {view === 'report' && (
                <div className="content fade-up">
                  {aiLoading ? (
                    <div style={{padding:'80px 40px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
                      <div className="spinner" style={{width:32,height:32,borderTopColor:T.accent}}/>
                      <div style={{fontSize:13,color:'var(--muted2)',fontFamily:'Geist Mono,monospace'}}>Analyse STP en cours par Claude…</div>
                    </div>
                  ) : aiResult ? (<>

                    {/* Scores */}
                    <div className="report-scores">
                      {[
                        {key:'segmentation', label:'Segmentation'},
                        {key:'targeting',    label:'Targeting'},
                        {key:'positioning',  label:'Positioning'},
                        {key:'global',       label:'Score global'},
                      ].map(s => {
                        const v = aiResult.scores?.[s.key] || 3
                        const c = v>=4?'#34d399':v>=3?'#f59e0b':'#f87171'
                        return (
                          <div key={s.key} className="score-card">
                            <ScoreRing value={v} color={c}/>
                            <div className="score-lbl">{s.label}</div>
                          </div>
                        )
                      })}
                    </div>
                    {aiResult.scores?.commentaire && <div style={{fontSize:11,color:'var(--muted2)',fontStyle:'italic',textAlign:'center',marginTop:-10}}>{aiResult.scores.commentaire}</div>}

                    {/* Diagnostic */}
                    {aiResult.diagnostic && (
                      <div className="ai-section">
                        <div className="ai-section-title">Diagnostic global <div className="ai-section-line"/></div>
                        <div className="ai-block">{aiResult.diagnostic}</div>
                      </div>
                    )}

                    {/* Segmentation analysis */}
                    {aiResult.segmentation_analysis && (
                      <div className="ai-section">
                        <div className="ai-section-title">Analyse Segmentation <div className="ai-section-line"/></div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                          {aiResult.segmentation_analysis.forces?.length > 0 && (
                            <div><div style={{fontSize:10,color:'#34d399',fontFamily:'Geist Mono,monospace',marginBottom:5,fontWeight:700}}>✓ FORCES</div>
                              <div className="ai-list">{aiResult.segmentation_analysis.forces.map((f,i)=><div key={i} className="ai-list-item"><div className="ai-list-dot" style={{background:'#34d399'}}/>{f}</div>)}</div>
                            </div>
                          )}
                          {aiResult.segmentation_analysis.gaps?.length > 0 && (
                            <div><div style={{fontSize:10,color:'#f87171',fontFamily:'Geist Mono,monospace',marginBottom:5,fontWeight:700}}>⚠ LACUNES</div>
                              <div className="ai-list">{aiResult.segmentation_analysis.gaps.map((g,i)=><div key={i} className="ai-list-item"><div className="ai-list-dot" style={{background:'#f87171'}}/>{g}</div>)}</div>
                            </div>
                          )}
                        </div>
                        {aiResult.segmentation_analysis.best_segment && (
                          <div style={{padding:'10px 14px',background:'color-mix(in srgb, var(--accent) 6%, transparent)',border:'1px solid color-mix(in srgb, var(--accent) 25%, transparent)',borderRadius:8,fontSize:12,lineHeight:1.6}}>
                            ⭐ <strong>Meilleur segment :</strong> {aiResult.segmentation_analysis.best_segment}
                          </div>
                        )}
                        {aiResult.segmentation_analysis.suggestions?.length > 0 && (
                          <div style={{marginTop:10}}>
                            <div style={{fontSize:10,color:'var(--muted2)',fontFamily:'Geist Mono,monospace',marginBottom:5,fontWeight:700}}>SEGMENTS SUGGÉRÉS</div>
                            <div className="ai-list">{aiResult.segmentation_analysis.suggestions.map((s,i)=>(
                              <div key={i} className="ai-list-item"><div className="ai-list-dot" style={{background:'var(--accent2)'}}/><div><strong>{s.label}</strong> ({s.category}) — {s.rationale}</div></div>
                            ))}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Targeting analysis */}
                    {aiResult.targeting_analysis && (
                      <div className="ai-section">
                        <div className="ai-section-title">Analyse Targeting <div className="ai-section-line"/></div>
                        <div className="ai-block" style={{marginBottom:10}}>{aiResult.targeting_analysis.strategy_assessment}</div>
                        {aiResult.targeting_analysis.priority_recommendation && (
                          <div style={{padding:'10px 14px',background:'color-mix(in srgb, #f59e0b 8%, transparent)',border:'1px solid color-mix(in srgb, #f59e0b 25%, transparent)',borderRadius:8,fontSize:12,lineHeight:1.6,marginBottom:10}}>
                            🎯 <strong>Priorité :</strong> {aiResult.targeting_analysis.priority_recommendation}
                          </div>
                        )}
                        {aiResult.targeting_analysis.risks?.length > 0 && (
                          <div className="ai-list">{aiResult.targeting_analysis.risks.map((r,i)=><div key={i} className="ai-list-item"><div className="ai-list-dot" style={{background:'#fb923c'}}/>{r}</div>)}</div>
                        )}
                      </div>
                    )}

                    {/* Positioning analysis */}
                    {aiResult.positioning_analysis && (
                      <div className="ai-section">
                        <div className="ai-section-title">Analyse Positioning <div className="ai-section-line"/></div>
                        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                          <div>
                            <div style={{fontSize:10,color:'var(--muted)',fontFamily:'Geist Mono,monospace',marginBottom:3}}>FORCE DU DIFFÉRENCIATEUR</div>
                            <div style={{display:'flex',gap:3}}>
                              {[1,2,3,4,5].map(i=><div key={i} style={{width:16,height:16,borderRadius:3,background:i<=(aiResult.positioning_analysis.differentiation_strength||3)?T.accent:'var(--border2)'}}/>)}
                            </div>
                          </div>
                          <div style={{fontSize:12,color:'var(--muted2)',lineHeight:1.6,flex:1}}>{aiResult.positioning_analysis.statement_quality}</div>
                        </div>
                        {aiResult.positioning_analysis.white_spaces?.length > 0 && (
                          <div style={{marginBottom:10}}>
                            <div style={{fontSize:10,color:'#34d399',fontFamily:'Geist Mono,monospace',marginBottom:5,fontWeight:700}}>🗺 ESPACES LIBRES (WHITE SPACES)</div>
                            <div className="ai-list">{aiResult.positioning_analysis.white_spaces.map((w,i)=><div key={i} className="ai-list-item"><div className="ai-list-dot" style={{background:'#34d399'}}/>{w}</div>)}</div>
                          </div>
                        )}
                        {aiResult.positioning_analysis.improvements?.length > 0 && (
                          <div>
                            <div style={{fontSize:10,color:'var(--accent2)',fontFamily:'Geist Mono,monospace',marginBottom:5,fontWeight:700}}>💡 AMÉLIORATIONS SUGGÉRÉES</div>
                            <div className="ai-list">{aiResult.positioning_analysis.improvements.map((imp,i)=><div key={i} className="ai-list-item"><div className="ai-list-dot" style={{background:'var(--accent2)'}}/>{imp}</div>)}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Coherence check */}
                    {aiResult.coherence_check?.length > 0 && (
                      <div className="ai-section">
                        <div className="ai-section-title">Cohérence STP <div className="ai-section-line"/></div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          {aiResult.coherence_check.map((c,i)=>{
                            const colors = {alignement:'#34d399',tension:'#f87171',opportunite:'#f59e0b',risque:'#fb923c'}
                            const icons  = {alignement:'↔',tension:'⚡',opportunite:'◎',risque:'⚠'}
                            const col    = colors[c.type] || 'var(--muted2)'
                            return (
                              <div key={i} className="coherence-item" style={{borderColor:`${col}25`}}>
                                <span style={{color:col,fontSize:14,flexShrink:0}}>{icons[c.type]||'→'}</span>
                                <span>{c.description}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Priorities */}
                    {aiResult.priorites?.length > 0 && (
                      <div className="ai-section">
                        <div className="ai-section-title">Priorités d'action <div className="ai-section-line"/></div>
                        <div className="ai-list">{aiResult.priorites.map((p,i)=>(
                          <div key={i} className="ai-list-item"><span style={{fontFamily:'Geist Mono,monospace',fontSize:10,color:'var(--muted)',minWidth:22}}>#{i+1}</span>{p}</div>
                        ))}</div>
                      </div>
                    )}

                    {/* Improved statement */}
                    {aiResult.positioning_statement_improved && (
                      <div className="ai-section">
                        <div className="ai-section-title">Positioning statement amélioré <div className="ai-section-line"/></div>
                        <div className="improved-stmt">{aiResult.positioning_statement_improved}</div>
                        <button className="btn sm" style={{marginTop:8}} onClick={()=>{updatePositioning({positioningStatement:aiResult.positioning_statement_improved});showToast('Statement mis à jour')}}>
                          ← Appliquer au positionnement
                        </button>
                      </div>
                    )}

                    {/* KPIs */}
                    {aiResult.kpis_recommandes?.length > 0 && (
                      <div className="ai-section">
                        <div className="ai-section-title">KPIs recommandés <div className="ai-section-line"/></div>
                        <div className="kpi-row">
                          {aiResult.kpis_recommandes.map((k,i)=>(
                            <div key={i} className="kpi-card">
                              <div className="kpi-name">{k.kpi}</div>
                              <div className="kpi-meta">{k.frequence} · Cible : {k.cible}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conclusion */}
                    {aiResult.conclusion && (
                      <div className="ai-section">
                        <div className="ai-section-title">Verdict <div className="ai-section-line"/></div>
                        <div className="ai-block" style={{fontStyle:'italic',color:'var(--muted2)'}}>{aiResult.conclusion}</div>
                      </div>
                    )}

                    <div style={{display:'flex',gap:8}}>
                      <button className="btn" onClick={()=>setView('segmentation')}>← Modifier le STP</button>
                      <button className="btn ai" onClick={runAnalyze} disabled={aiLoading}>↺ Relancer l'analyse</button>
                    </div>

                  </>) : (
                    <div className="empty-cta" style={{padding:'80px 40px'}}>
                      <div className="empty-icon" style={{fontSize:48,marginBottom:16}}>✦</div>
                      <div style={{fontFamily:'Instrument Serif,serif',fontSize:20,fontStyle:'italic',marginBottom:8}}>Analyse IA</div>
                      <div className="empty-txt" style={{marginBottom:20}}>Renseignez votre STP puis cliquez sur "✦ Analyser" pour obtenir un diagnostic complet et des recommandations stratégiques.</div>
                      <button className="btn ai" onClick={runAnalyze} disabled={aiLoading}>✦ Lancer l'analyse IA</button>
                    </div>
                  )}
                </div>
              )}
            </>)}
          </main>
        </div>

        {/* ── Segment form modal ── */}
        {editSeg && segForm && (() => {
          const cat = SEG_CATEGORIES.find(c => c.id === editSeg.catId)
          return (
            <div className="modal-overlay" onClick={()=>{setEditSeg(null);setSegForm(null)}}>
              <div className="modal" onClick={e=>e.stopPropagation()}>
                <div className="modal-title" style={{color:cat.color}}>{editSeg.idx===null?'Nouveau segment':'Modifier le segment'} — {cat.label}</div>
                <div className="form-group"><label className="lbl">Nom du segment *</label><input className="inp" placeholder={`Ex: ${cat.label.toLowerCase()} clé`} value={segForm.label} onChange={e=>setSegForm(p=>({...p,label:e.target.value}))} autoFocus/></div>
                <div className="form-group"><label className="lbl">Description</label><textarea className="inp" rows={2} placeholder="Caractéristiques précises…" value={segForm.description||''} onChange={e=>setSegForm(p=>({...p,description:e.target.value}))}/></div>
                <div className="form-row" style={{marginBottom:12}}>
                  <div><label className="lbl">Taille estimée</label><input className="inp" placeholder="Ex: 2.5M personnes" value={segForm.size||''} onChange={e=>setSegForm(p=>({...p,size:e.target.value}))}/></div>
                  <div>
                    <label className="lbl">Croissance</label>
                    <select className="select" value={segForm.growth||'modéré'} onChange={e=>setSegForm(p=>({...p,growth:e.target.value}))}>
                      <option value="élevé">Élevé</option><option value="modéré">Modéré</option><option value="faible">Faible</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="lbl">Pertinence <span className="range-val">{segForm.relevance||3}/5</span></label><input type="range" className="inp" min="1" max="5" value={segForm.relevance||3} onChange={e=>setSegForm(p=>({...p,relevance:+e.target.value}))}/></div>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={()=>{setEditSeg(null);setSegForm(null)}}>Annuler</button>
                  <button className="btn-full" onClick={saveSegment}>{editSeg.idx===null?'Ajouter':'Mettre à jour'}</button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Target form modal ── */}
        {targetForm && (
          <div className="modal-overlay" onClick={()=>{setEditTarget(null);setTargetForm(null)}}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">{editTarget===null?'Nouveau segment cible':'Modifier la cible'}</div>
              <div className="form-group"><label className="lbl">Nom du segment cible *</label><input className="inp" placeholder="Ex: Professionnels urbains 25-40 ans" value={targetForm.label||''} onChange={e=>setTargetForm(p=>({...p,label:e.target.value}))} autoFocus/></div>
              <div className="form-row" style={{marginBottom:12}}>
                <div>
                  <label className="lbl">Priorité</label>
                  <select className="select" value={targetForm.priority||'primary'} onChange={e=>setTargetForm(p=>({...p,priority:e.target.value}))}>
                    <option value="primary">Primaire</option><option value="secondary">Secondaire</option><option value="tertiary">Tertiaire</option>
                  </select>
                </div>
                <div><label className="lbl">Taille adressable</label><input className="inp" placeholder="Ex: 500k€ TAM" value={targetForm.estimatedSize||''} onChange={e=>setTargetForm(p=>({...p,estimatedSize:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label className="lbl">Justification</label><textarea className="inp" rows={2} placeholder="Pourquoi cibler ce segment ?" value={targetForm.rationale||''} onChange={e=>setTargetForm(p=>({...p,rationale:e.target.value}))}/></div>
              {[{f:'potential',l:'Potentiel marché'},{f:'competition',l:'Intensité concurrence'},{f:'fit',l:'Adéquation produit'}].map(({f,l})=>(
                <div key={f} className="form-group"><label className="lbl">{l} <span className="range-val">{targetForm[f]||3}/5</span></label><input type="range" className="inp" min="1" max="5" value={targetForm[f]||3} onChange={e=>setTargetForm(p=>({...p,[f]:+e.target.value}))}/></div>
              ))}
              <div className="form-group">
                <label className="lbl">Besoins clés</label>
                <div style={{display:'flex',gap:6,marginBottom:6}}>
                  <input className="inp" placeholder="Ajouter un besoin…" value={newNeed} onChange={e=>setNewNeed(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&newNeed.trim()){ setTargetForm(p=>({...p,keyNeeds:[...(p.keyNeeds||[]),newNeed.trim()]})); setNewNeed('') } }}/>
                  <button className="btn sm" onClick={()=>{ if(newNeed.trim()){ setTargetForm(p=>({...p,keyNeeds:[...(p.keyNeeds||[]),newNeed.trim()]})); setNewNeed('') } }}>+</button>
                </div>
                <div className="needs-wrap">{(targetForm.keyNeeds||[]).map((n,i)=><span key={i} className="need-chip" style={{cursor:'pointer'}} onClick={()=>setTargetForm(p=>({...p,keyNeeds:p.keyNeeds.filter((_,j)=>j!==i)}))}>{n} ✕</span>)}</div>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={()=>{setEditTarget(null);setTargetForm(null)}}>Annuler</button>
                <button className="btn-full" onClick={saveTarget}>{editTarget===null?'Ajouter':'Mettre à jour'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Generate modal ── */}
        {showGenModal && active && (
          <div className="modal-overlay" onClick={()=>setShowGenModal(false)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title" style={{color:'var(--accent2)'}}>⚡ Génération automatique STP</div>
              <p style={{fontSize:13,color:'var(--muted2)',marginBottom:16,lineHeight:1.6}}>
                Décrivez votre entreprise, votre marché et vos ambitions — l'IA génère automatiquement les segments, les cibles, le positionnement et la carte perceptuelle.
              </p>
              {totalSegs > 0 && (
                <div style={{padding:'8px 12px',background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:8,marginBottom:14,fontSize:12,color:'#f87171'}}>
                  ⚠ Cette action remplacera les données STP existantes.
                </div>
              )}
              <label className="lbl">Description du projet / contexte *</label>
              <textarea className="inp" rows={6} style={{marginTop:4,minHeight:120}}
                placeholder="Ex: Solution SaaS B2B de gestion des notes de frais pour les PME de 20-200 salariés en France. Prix moyen 199€/mois. Concurrents : Spendesk, Rydoo. Notre avantage : intégration comptable native et onboarding en 30 min. Objectif : conquérir les PME du secteur services d'ici 2 ans."
                value={genContext} onChange={e=>setGenContext(e.target.value)} autoFocus/>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={()=>{setShowGenModal(false);setGenContext('')}}>Annuler</button>
                <button className="btn-full" onClick={runGenerate} disabled={!genContext.trim()}>⚡ Générer le STP</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className={`toast ${toast.type||''}`}>{toast.type==='error'?'✕':'✓'} {toast.msg}</div>}
      </div>
    </>
  )
}