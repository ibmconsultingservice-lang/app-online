'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
// Option A : Si le dossier components est à la racine, à côté de 'app'
import SetupView from '../../../components/SetupView';
import ReportView from '../../../components/ReportView';
// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const ERAC = {
  exclure:   { label: 'Exclure',   icon: '✕', color: '#f87171', bg: 'rgba(248,113,113,.1)', border: 'rgba(248,113,113,.3)', desc: 'Supprimer totalement' },
  reduire:   { label: 'Réduire',   icon: '↓', color: '#fb923c', bg: 'rgba(251,146,60,.1)',  border: 'rgba(251,146,60,.3)',  desc: 'Ramener sous la norme' },
  renforcer: { label: 'Renforcer', icon: '↑', color: '#60a5fa', bg: 'rgba(96,165,250,.1)',  border: 'rgba(96,165,250,.3)',  desc: 'Élever au-dessus de la norme' },
  creer:     { label: 'Créer',     icon: '✦', color: '#34d399', bg: 'rgba(52,211,153,.1)',  border: 'rgba(52,211,153,.3)',  desc: 'Inventer, jamais proposé' },
}

const COMPETITOR_PALETTE = [
  '#f472b6', '#fb923c', '#facc15', '#a78bfa', '#2dd4bf', '#f87171', '#818cf8', '#86efac',
]

const DEFAULT_FACTORS = [
  'Prix', 'Qualité produit', 'Service client', 'Délai de livraison',
  'Expérience utilisateur', 'Personnalisation', 'Support technique', 'Réputation de marque',
]

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const DEFAULT_ANALYSIS = () => ({
  id: uid(),
  name: '',
  companyName: '',
  industry: '',
  targetCustomer: '',
  context: '',
  strategicIntent: '',
  competitors: [{ id: uid(), name: 'Concurrent A', color: COMPETITOR_PALETTE[0] }],
  canvasFactors: DEFAULT_FACTORS.map(name => ({
    id: uid(), name,
    myScore: 5,
    competitorScores: {},
    eracAction: null,
  })),
  newFactors: [],
  createdAt: new Date().toISOString(),
  aiResult: null,
})

// ─── Main component ───────────────────────────────────────────────────────────
export default function BlueOceanPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,      setProject]      = useState(null)
  const [analyses,     setAnalyses]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [newForm,      setNewForm]      = useState({ name: '' })
  const [view,         setView]         = useState('setup')
  const [setupTab,     setSetupTab]     = useState('context')
  const [reportTab,    setReportTab]    = useState('canvas')
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiResult,     setAiResult]     = useState(null)
  const [toast,        setToast]        = useState(null)
  const [newFactorName, setNewFactorName] = useState('')
  const [newCompName,   setNewCompName]   = useState('')
  const [activeEracTab, setActiveEracTab] = useState('exclure')
  const [newNFName,     setNewNFName]     = useState('')
  const [newNFDesc,     setNewNFDesc]     = useState('')
  const canvasRef = useRef(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.BlueOcean || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), BlueOcean: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const active = analyses.find(a => a.id === activeId) || null

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const createAnalysis = () => {
    if (!newForm.name.trim()) return
    const a = { ...DEFAULT_ANALYSIS(), name: newForm.name.trim() }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); setAiResult(null); setView('setup'); setSetupTab('context')
    persist(updated); setShowNewForm(false); setNewForm({ name: '' })
    showToast(`Analyse "${a.name}" créée`)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) {
      const last = updated[updated.length - 1]
      setActiveId(last?.id || null); setAiResult(last?.aiResult || null)
      setView(last?.aiResult ? 'report' : 'setup')
    }
    showToast('Analyse supprimée', 'info')
  }

  const ua = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated); persist(updated)
  }

  // Factor helpers
  const addFactor = () => {
    if (!newFactorName.trim()) return
    const f = { id: uid(), name: newFactorName.trim(), myScore: 5, competitorScores: {}, eracAction: null }
    ua({ canvasFactors: [...(active?.canvasFactors || []), f] })
    setNewFactorName('')
  }

  const removeFactor = (id) => ua({ canvasFactors: (active?.canvasFactors || []).filter(f => f.id !== id) })

  const updateFactor = (id, patch) => ua({
    canvasFactors: (active?.canvasFactors || []).map(f => f.id === id ? { ...f, ...patch } : f),
  })

  const setErac = (factorId, action) => updateFactor(factorId, {
    eracAction: (active?.canvasFactors || []).find(f => f.id === factorId)?.eracAction === action ? null : action,
  })

  // Competitor helpers
  const addCompetitor = () => {
    if (!newCompName.trim()) return
    const idx   = (active?.competitors || []).length
    const comp  = { id: uid(), name: newCompName.trim(), color: COMPETITOR_PALETTE[idx % COMPETITOR_PALETTE.length] }
    ua({ competitors: [...(active?.competitors || []), comp] })
    setNewCompName('')
  }

  const removeCompetitor = (id) => ua({ competitors: (active?.competitors || []).filter(c => c.id !== id) })

  const setCompScore = (factorId, compName, val) => updateFactor(factorId, {
    competitorScores: { ...(active?.canvasFactors?.find(f => f.id === factorId)?.competitorScores || {}), [compName]: val },
  })

  // New factors (Create)
  const addNewFactor = () => {
    if (!newNFName.trim()) return
    ua({ newFactors: [...(active?.newFactors || []), { id: uid(), name: newNFName.trim(), description: newNFDesc.trim() }] })
    setNewNFName(''); setNewNFDesc('')
  }

  const removeNewFactor = (id) => ua({ newFactors: (active?.newFactors || []).filter(f => f.id !== id) })

  // Derived: erac grouping
  const eracGroups = () => {
    const groups = { exclure: [], reduire: [], renforcer: [], creer: [] }
    for (const f of (active?.canvasFactors || [])) {
      if (f.eracAction && groups[f.eracAction]) groups[f.eracAction].push(f.name)
    }
    return groups
  }

  // ── AI ────────────────────────────────────────────────────────────────────
  const runAI = async () => {
    if (!active || !(active.canvasFactors || []).length) {
      showToast('Ajoutez des facteurs de concurrence', 'error'); return
    }
    setAiLoading(true); setView('report'); setAiResult(null); setReportTab('canvas')
    try {
      const res = await fetch('/api/generer-management/generer-sob', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName:     project?.name,
          projectTag:      project?.tag,
          companyName:     active.companyName,
          industry:        active.industry,
          targetCustomer:  active.targetCustomer,
          context:         active.context,
          strategicIntent: active.strategicIntent,
          canvasFactors:   active.canvasFactors,
          competitors:     active.competitors,
          eracDecisions:   eracGroups(),
          newFactors:      active.newFactors || [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      ua({ aiResult: data.result })
      showToast('Analyse Océan Bleu générée ✦')
    } catch (err) { showToast(err.message, 'error'); setView('setup') }
    setAiLoading(false)
  }

  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ analysis: active, result: aiResult }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `BlueOcean_${active.name.replace(/\s+/g, '_')}.json`; a.click(); URL.revokeObjectURL(url)
  }

  // ocean score color
  const oceanColor = (s) => s >= 4 ? '#34d399' : s >= 3 ? '#60a5fa' : s >= 2 ? '#facc15' : '#f87171'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:#0a0a0f; --surface:#111118; --surface2:#18181f; --surface3:#1e1e28;
          --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.12);
          --text:#f0eff5; --muted:#6b6a7a; --muted2:#9896aa;
          --accent:#6366f1; --accent2:#818cf8;
          --ocean:#06b6d4; --ocean2:rgba(6,182,212,.12); --ocean3:rgba(6,182,212,.25);
        }
        body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

        .root { min-height:100vh; display:flex; flex-direction:column; }
        .topbar { height:56px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 20px; gap:12px; position:sticky; top:0; z-index:100; }
        .topbar-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .topbar-badge { font-size:10px; font-family:'Geist Mono',monospace; color:var(--ocean); background:var(--ocean2); border:1px solid var(--ocean3); padding:2px 8px; border-radius:10px; }
        .topbar-sub { font-size:11px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .topbar-right { margin-left:auto; display:flex; gap:8px; align-items:center; }
        .body { flex:1; display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 56px); overflow:hidden; }

        .btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; letter-spacing:.04em; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .btn:hover { color:var(--text); border-color:rgba(255,255,255,.2); }
        .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
        .btn.ocean { background:var(--ocean2); border-color:var(--ocean3); color:var(--ocean); }
        .btn.ocean:hover { background:rgba(6,182,212,.2); }
        .btn:disabled { opacity:.4; cursor:not-allowed; }
        .back-btn { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s; }
        .back-btn:hover { color:var(--text); }

        .left-panel { background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
        .panel-header { padding:16px; border-bottom:1px solid var(--border); }
        .panel-label { font-size:10px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .panel-list { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:2px; }
        .litem { padding:10px 12px; border-radius:8px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
        .litem:hover { background:var(--surface2); }
        .litem.active { background:var(--ocean2); border-color:var(--ocean3); }
        .litem-name { font-size:12px; font-weight:600; }
        .litem-meta { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:2px; }
        .litem-del { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; float:right; padding:2px; }
        .litem:hover .litem-del { opacity:1; }
        .new-form { padding:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px; }

        .input { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:8px 10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--text); outline:none; transition:border-color .15s; }
        .input:focus { border-color:var(--ocean); }
        .input::placeholder { color:var(--muted); }
        textarea.input { resize:vertical; min-height:54px; }
        .lbl { font-size:10px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:4px; display:block; }

        .center-panel { overflow-y:auto; padding:28px; display:flex; flex-direction:column; gap:22px; }

        /* Tabs */
        .tab-strip { display:flex; gap:3px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:3px; }
        .tab-btn { padding:5px 14px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; color:var(--muted2); border:none; background:none; transition:all .15s; white-space:nowrap; }
        .tab-btn.active { background:var(--surface3); color:var(--text); }
        .view-tabs { display:flex; gap:3px; background:var(--surface2); border-radius:8px; padding:3px; border:1px solid var(--border); }

        .card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:14px; }
        .card-title { font-size:11px; color:var(--muted2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:8px; }
        .card-dot { width:6px; height:6px; border-radius:50%; }

        /* ── Competitor row ── */
        .comp-row { display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--surface2); border-radius:8px; border:1px solid var(--border); }
        .comp-color-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .comp-name { font-size:12px; font-weight:600; flex:1; }
        .comp-del { background:none; border:none; color:var(--muted); cursor:pointer; font-size:11px; padding:4px; border-radius:4px; transition:color .15s; }
        .comp-del:hover { color:#f87171; }

        /* ── Factor row (scoring table) ── */
        .factors-table { display:flex; flex-direction:column; gap:0; border:1px solid var(--border); border-radius:10px; overflow:hidden; }
        .factors-thead { display:grid; padding:8px 14px; background:var(--surface3); border-bottom:1px solid var(--border); font-size:10px; font-family:'Geist Mono',monospace; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; gap:8px; }
        .factor-row { display:grid; padding:10px 14px; border-bottom:1px solid var(--border); gap:8px; align-items:center; background:var(--surface2); transition:background .1s; }
        .factor-row:last-child { border-bottom:none; }
        .factor-row:hover { background:var(--surface3); }
        .factor-name-cell { font-size:12px; font-weight:600; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .score-input { background:var(--bg); border:1px solid var(--border2); border-radius:5px; padding:4px 8px; color:var(--text); font-family:'Geist Mono',monospace; font-size:12px; width:54px; text-align:center; outline:none; transition:border-color .15s; }
        .score-input:focus { border-color:var(--ocean); }
        .erac-mini { display:flex; gap:3px; }
        .erac-chip { width:22px; height:22px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:10px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
        .factor-del-btn { background:none; border:none; color:var(--muted); cursor:pointer; font-size:10px; padding:3px; border-radius:4px; transition:color .15s; }
        .factor-del-btn:hover { color:#f87171; }

        /* ── ERAC board ── */
        .erac-board { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .erac-col { border:1px solid var(--border2); border-radius:10px; overflow:hidden; }
        .erac-col-header { padding:10px 14px; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--border2); }
        .erac-col-icon { width:26px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; }
        .erac-col-label { font-size:12px; font-weight:700; }
        .erac-col-desc { font-size:10px; margin-left:auto; font-family:'Geist Mono',monospace; }
        .erac-col-body { padding:10px 14px; min-height:60px; display:flex; flex-direction:column; gap:5px; }
        .erac-factor-tag { display:flex; align-items:center; gap:6px; padding:5px 10px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; }
        .erac-factor-remove { background:none; border:none; font-size:10px; cursor:pointer; opacity:.5; padding:0 2px; }
        .erac-factor-remove:hover { opacity:1; }
        .erac-empty { font-size:11px; color:var(--muted); font-style:italic; }

        /* ── Canvas chart ── */
        .canvas-wrap { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; }
        .canvas-legend { display:flex; gap:14px; flex-wrap:wrap; margin-top:12px; }
        .legend-item { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--muted2); font-family:'Geist Mono',monospace; }
        .legend-line { width:20px; height:2px; border-radius:1px; }

        /* ── Report ── */
        .report-tab-strip { display:flex; gap:5px; flex-wrap:wrap; }
        .report-tab { padding:7px 14px; border-radius:8px; font-size:11px; font-family:'Geist Mono',monospace; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); cursor:pointer; transition:all .15s; }
        .report-tab.active { background:var(--ocean2); border-color:var(--ocean3); color:var(--ocean); }

        .ocean-header { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:22px; display:flex; gap:22px; align-items:center; }
        .ocean-score-block { flex-shrink:0; text-align:center; }
        .ocean-score-val { font-family:'Instrument Serif',serif; font-size:60px; font-style:italic; line-height:1; }
        .ocean-score-lbl { font-size:9px; color:var(--muted); font-family:'Geist Mono',monospace; text-transform:uppercase; letter-spacing:.1em; margin-top:4px; }
        .ocean-label-badge { padding:4px 14px; border-radius:20px; font-family:'Geist Mono',monospace; font-size:11px; font-weight:700; margin-top:8px; display:inline-block; }
        .ocean-text { flex:1; font-size:13px; line-height:1.75; color:var(--muted2); }

        .sec-title { font-size:10px; color:var(--muted2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:8px; margin-bottom:10px; }
        .sec-line { flex:1; height:1px; background:var(--border); }

        /* ERAC report grid */
        .erac-report-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .erac-report-col { border:1px solid var(--border2); border-radius:10px; overflow:hidden; }
        .erac-report-header { padding:10px 14px; display:flex; align-items:center; gap:8px; }
        .erac-report-items { padding:8px 14px; display:flex; flex-direction:column; gap:8px; }
        .erac-report-item { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:10px 14px; }
        .erac-item-factor { font-size:12px; font-weight:700; margin-bottom:3px; }
        .erac-item-rationale { font-size:11px; color:var(--muted2); line-height:1.55; }
        .erac-item-meta { display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; }
        .erac-meta-tag { font-size:10px; font-family:'Geist Mono',monospace; padding:2px 7px; border-radius:4px; background:var(--surface3); border:1px solid var(--border2); color:var(--muted); }

        /* Value curve */
        .value-curve-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
        .value-curve-body { padding:20px; display:flex; flex-direction:column; gap:12px; }
        .tagline-box { background:var(--ocean2); border:1px solid var(--ocean3); border-radius:10px; padding:16px 20px; font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; color:var(--ocean); text-align:center; }
        .diff-list { display:flex; flex-direction:column; gap:6px; }
        .diff-item { display:flex; gap:10px; align-items:flex-start; padding:9px 14px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--text); line-height:1.5; }
        .diff-icon { color:var(--ocean); flex-shrink:0; font-size:13px; }

        /* Non-customers */
        .nc-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
        .nc-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:8px; }
        .nc-tier { font-size:10px; font-family:'Geist Mono',monospace; color:var(--ocean); letter-spacing:.08em; text-transform:uppercase; }
        .nc-label { font-size:12px; font-weight:700; }
        .nc-desc { font-size:11px; color:var(--muted2); line-height:1.55; }
        .nc-lever { font-size:11px; color:var(--text); padding:8px 12px; background:var(--ocean2); border:1px solid var(--ocean3); border-radius:6px; line-height:1.5; margin-top:4px; }

        /* Four hurdles */
        .hurdles-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .hurdle-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:8px; }
        .hurdle-type { font-size:10px; font-family:'Geist Mono',monospace; color:var(--muted2); text-transform:uppercase; letter-spacing:.08em; }
        .hurdle-text { font-size:12px; color:var(--text); line-height:1.55; }
        .hurdle-solution { font-size:11px; color:var(--muted2); padding:8px 12px; background:var(--surface2); border-radius:6px; line-height:1.5; }

        /* Action plan */
        .phases-list { display:flex; flex-direction:column; gap:10px; }
        .phase-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; overflow:hidden; }
        .phase-header { padding:10px 16px; background:var(--surface2); border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .phase-title { font-size:12px; font-weight:700; color:var(--ocean); }
        .phase-milestone { font-size:11px; font-family:'Geist Mono',monospace; color:var(--muted2); }
        .phase-actions { padding:12px 16px; display:flex; flex-direction:column; gap:6px; }
        .phase-action { display:flex; gap:8px; align-items:flex-start; font-size:12px; color:var(--muted2); line-height:1.5; }
        .pa-dot { width:5px; height:5px; border-radius:50%; background:var(--ocean); flex-shrink:0; margin-top:6px; }

        /* Metrics */
        .metrics-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .metric-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:6px; }
        .metric-name { font-size:11px; font-family:'Geist Mono',monospace; color:var(--muted2); }
        .metric-target { font-size:13px; font-weight:700; color:var(--ocean); }

        /* Conclusion */
        .conclusion-box { background:var(--ocean2); border:1px solid var(--ocean3); border-radius:10px; padding:18px 20px; font-size:13px; color:var(--text); line-height:1.75; }

        /* Loading */
        .loading-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:80px 40px; }
        .spinner { width:28px; height:28px; border:2px solid var(--border2); border-top-color:var(--ocean); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .empty-cta { padding:60px 40px; text-align:center; }
        .empty-icon { font-size:40px; opacity:.25; margin-bottom:14px; }
        .empty-txt { font-size:13px; color:var(--muted); line-height:1.6; }
        .toast { position:fixed; bottom:24px; right:24px; z-index:500; background:var(--surface2); border:1px solid var(--border2); border-radius:8px; padding:12px 18px; font-size:13px; box-shadow:0 8px 32px rgba(0,0,0,.4); animation:slideUp .2s ease; display:flex; align-items:center; gap:8px; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info { border-color:rgba(99,102,241,.3); }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        @media(max-width:700px){.body{grid-template-columns:1fr;}.left-panel{display:none;}}
      `}</style>

      <div className="root">
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="topbar-title">Stratégie Océan Bleu</div>
            <span className="topbar-badge">ERAC · Canevas</span>
            {project && <div className="topbar-sub">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {active && (
              <>
                <div className="view-tabs">
                  <button className={`tab-btn ${view === 'setup'  ? 'active' : ''}`} onClick={() => setView('setup')}>Configuration</button>
                  <button className={`tab-btn ${view === 'report' ? 'active' : ''}`} onClick={() => setView('report')} disabled={!aiResult && !aiLoading}>Analyse</button>
                </div>
                {view === 'report' && aiResult && <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>}
                <button className="btn ocean" onClick={runAI} disabled={aiLoading}>
                  {aiLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} />Analyse…</> : '〰 Tracer l\'Océan Bleu'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="body">
          {/* Left panel */}
          <aside className="left-panel">
            <div className="panel-header"><span className="panel-label">Analyses ({analyses.length})</span></div>
            <div className="panel-list">
              {analyses.length === 0 && <div className="empty-cta"><div className="empty-icon">🌊</div><div className="empty-txt">Créez votre première analyse Océan Bleu</div></div>}
              {analyses.map(a => (
                <div key={a.id} className={`litem ${activeId === a.id ? 'active' : ''}`}
                  onClick={() => { setActiveId(a.id); setAiResult(a.aiResult || null); setView(a.aiResult ? 'report' : 'setup') }}>
                  <button className="litem-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  <div className="litem-name">{a.name}</div>
                  <div className="litem-meta">
                    {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {' · '}{(a.canvasFactors || []).length} facteur(s)
                    {a.aiResult ? ' · 🌊 IA' : ''}
                  </div>
                </div>
              ))}
            </div>
            {showNewForm ? (
              <div className="new-form">
                <label className="lbl">Nom de l'analyse</label>
                <input className="input" placeholder="Ex: Rupture marché 2026" value={newForm.name}
                  onChange={e => setNewForm({ name: e.target.value })} onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn primary" style={{ flex: 1 }} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>+ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="center-panel">
            {!active ? (
              <div className="empty-cta" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🌊</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 24, fontStyle: 'italic', marginBottom: 8 }}>Stratégie Océan Bleu</div>
                <div className="empty-txt">Cartographiez la concurrence, appliquez ERAC, tracez votre espace non contesté</div>
              </div>
            ) : view === 'setup' ? (
              <SetupView
                active={active} ua={ua}
                setupTab={setupTab} setSetupTab={setSetupTab}
                newFactorName={newFactorName} setNewFactorName={setNewFactorName}
                newCompName={newCompName} setNewCompName={setNewCompName}
                newNFName={newNFName} setNewNFName={setNewNFName}
                newNFDesc={newNFDesc} setNewNFDesc={setNewNFDesc}
                addFactor={addFactor} removeFactor={removeFactor} updateFactor={updateFactor}
                setErac={setErac} addCompetitor={addCompetitor} removeCompetitor={removeCompetitor}
                setCompScore={setCompScore} eracGroups={eracGroups}
                addNewFactor={addNewFactor} removeNewFactor={removeNewFactor}
                runAI={runAI} aiLoading={aiLoading}
                activeEracTab={activeEracTab} setActiveEracTab={setActiveEracTab}
              />
            ) : (
              <ReportView
                active={active} aiResult={aiResult} aiLoading={aiLoading}
                reportTab={reportTab} setReportTab={setReportTab}
                oceanColor={oceanColor}
              />
            )}
          </main>
        </div>

        {toast && <div className={`toast ${toast.type || ''}`}>{toast.type === 'error' ? '✕' : '✓'} {toast.msg}</div>}
      </div>
    </>
  )
}