'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const STRATEGIES = {
  penetration: {
    key:         'penetration',
    label:       'Pénétration',
    fullLabel:   'Pénétration de marché',
    icon:        '🎯',
    color:       '#34d399',
    bg:          'rgba(52,211,153,.08)',
    border:      'rgba(52,211,153,.25)',
    market:      'Existant',
    product:     'Existant',
    risk:        'Faible',
    riskColor:   '#34d399',
    description: 'Augmenter les parts de marché avec vos produits actuels sur vos marchés existants.',
    tactics:     ['Prix compétitifs', 'Fidélisation clients', 'Acquisition agressive', 'Upsell / cross-sell', 'Promotions ciblées', 'Programme de référencement'],
  },
  development: {
    key:         'development',
    label:       'Développement',
    fullLabel:   'Développement de marché',
    icon:        '🌍',
    color:       '#60a5fa',
    bg:          'rgba(96,165,250,.08)',
    border:      'rgba(96,165,250,.25)',
    market:      'Nouveau',
    product:     'Existant',
    risk:        'Modéré',
    riskColor:   '#facc15',
    description: 'Introduire vos produits existants sur de nouveaux marchés ou segments.',
    tactics:     ['Expansion géographique', 'Nouveaux segments', 'Canaux de distribution', 'Partenariats locaux', 'Adaptation marketing', 'Export / internationalisation'],
  },
  extension: {
    key:         'extension',
    label:       'Extension',
    fullLabel:   'Extension produit',
    icon:        '🧩',
    color:       '#fb923c',
    bg:          'rgba(251,146,60,.08)',
    border:      'rgba(251,146,60,.25)',
    market:      'Existant',
    product:     'Nouveau',
    risk:        'Modéré',
    riskColor:   '#facc15',
    description: 'Développer de nouveaux produits ou services pour vos clients actuels.',
    tactics:     ['R&D produit', 'Nouvelles features', 'Gammes complémentaires', 'Innovation incrémentale', 'Co-création clients', 'Acquisitions technologiques'],
  },
  diversification: {
    key:         'diversification',
    label:       'Diversification',
    fullLabel:   'Diversification',
    icon:        '🚀',
    color:       '#f472b6',
    bg:          'rgba(244,114,182,.08)',
    border:      'rgba(244,114,182,.25)',
    market:      'Nouveau',
    product:     'Nouveau',
    risk:        'Élevé',
    riskColor:   '#f87171',
    description: 'Lancer de nouveaux produits sur de nouveaux marchés — la stratégie la plus ambitieuse.',
    tactics:     ['Diversification liée', 'Diversification conglomérale', 'Acquisitions', 'Joint ventures', 'Innovation disruptive', 'Pivot stratégique'],
  },
}

const TIME_HORIZONS = [
  { value: '6m', label: '6 mois' },
  { value: '1y', label: '1 an'   },
  { value: '2y', label: '2 ans'  },
  { value: '5y', label: '5 ans'  },
]

const SCORE_COLORS = (v) => {
  if (v >= 4) return '#34d399'
  if (v >= 3) return '#facc15'
  if (v >= 2) return '#fb923c'
  return '#f87171'
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const DEFAULT_ANALYSIS = () => ({
  id:                 uid(),
  name:               '',
  companyDescription: '',
  currentProducts:    '',
  currentMarkets:     '',
  objectives:         '',
  resources:          '',
  timeHorizon:        '1y',
  selectedStrategies: [],
  strategyDetails:    {},
  generatedByAI:      false,
  contextSummary:     '',
  createdAt:          new Date().toISOString(),
  aiResult:           null,
})

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnsoffPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,     setProject]     = useState(null)
  const [analyses,    setAnalyses]    = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newForm,     setNewForm]     = useState({ name: '' })

  // Generate mode
  const [showGenModal,   setShowGenModal]   = useState(false)
  const [genContext,     setGenContext]     = useState('')
  const [genLoading,     setGenLoading]     = useState(false)

  // Analyze mode
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState(null)

  const [view,        setView]        = useState('setup')   // 'setup' | 'report'
  const [activeStrat, setActiveStrat] = useState(null)
  const [toast,       setToast]       = useState(null)
  const [activeTab,   setActiveTab]   = useState('context') // 'context' | 'strategies'

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.Ansoff || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          if (last.aiResult) { setAiResult(last.aiResult); setView('report'); setActiveStrat(last.selectedStrategies?.[0] || null) }
        }
      }
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), Ansoff: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  const active = analyses.find(a => a.id === activeId) || null

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const createAnalysis = () => {
    if (!newForm.name.trim()) return
    const a = { ...DEFAULT_ANALYSIS(), name: newForm.name.trim() }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); setAiResult(null); setView('setup')
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

  const updateActive = useCallback((patch) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === activeId ? { ...a, ...patch } : a)
      persist(updated)
      return updated
    })
  }, [activeId, persist])

  const toggleStrategy = (key) => {
    const cur  = active?.selectedStrategies || []
    const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key]
    updateActive({ selectedStrategies: next })
  }

  const updateStratDetail = (key, field, value) => {
    const details = { ...(active?.strategyDetails || {}), [key]: { ...(active?.strategyDetails?.[key] || {}), [field]: value } }
    updateActive({ strategyDetails: details })
  }

  const toggleTactic = (stratKey, tactic) => {
    const cur  = active?.strategyDetails?.[stratKey]?.tactics || []
    const next = cur.includes(tactic) ? cur.filter(t => t !== tactic) : [...cur, tactic]
    updateStratDetail(stratKey, 'tactics', next)
  }

  // ── MODE 1 : Generate — IA peuple tout automatiquement ───────────────────
  const runGenerate = async () => {
    if (!active || !genContext.trim()) return
    setGenLoading(true)
    setShowGenModal(false)
    try {
      const res = await fetch('/api/generer-management/generer-ansoff', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:               'generate',
          contextDescription: genContext.trim(),
          projectName:        project?.name || '',
          projectTag:         project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      const d = data.data
      // Merge generated data into active analysis, preserve analysis name
      updateActive({
        companyDescription: d.companyDescription || '',
        currentProducts:    d.currentProducts    || '',
        currentMarkets:     d.currentMarkets     || '',
        objectives:         d.objectives         || '',
        resources:          d.resources          || '',
        timeHorizon:        d.timeHorizon        || '1y',
        selectedStrategies: d.selectedStrategies || [],
        strategyDetails:    d.strategyDetails    || {},
        contextSummary:     d.contextSummary     || '',
        generatedByAI:      true,
        aiResult:           null,   // reset previous analysis
      })
      setAiResult(null)
      setView('setup')
      setActiveTab('strategies')
      setActiveStrat(d.selectedStrategies?.[0] || null)
      setGenContext('')
      showToast(`✦ ${d.selectedStrategies?.length || 0} stratégie(s) positionnée(s) par l'IA`)
    } catch (err) {
      showToast(err.message, 'error')
    }
    setGenLoading(false)
  }

  // ── MODE 2 : Analyze — IA analyse l'existant ─────────────────────────────
  const runAI = async () => {
    if (!active || (active.selectedStrategies || []).length === 0) {
      showToast('Sélectionnez au moins une stratégie', 'error'); return
    }
    setAiLoading(true); setView('report'); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-ansoff', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:               'analyze',
          projectName:        project?.name || '',
          projectTag:         project?.tag  || '',
          companyDescription: active.companyDescription,
          currentProducts:    active.currentProducts,
          currentMarkets:     active.currentMarkets,
          objectives:         active.objectives,
          resources:          active.resources,
          timeHorizon:        active.timeHorizon,
          selectedStrategies: active.selectedStrategies,
          strategyDetails:    active.strategyDetails,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateActive({ aiResult: data.result })
      setActiveStrat(active.selectedStrategies[0])
      showToast('Analyse Ansoff générée ✦')
    } catch (err) {
      showToast(err.message, 'error'); setView('setup')
    }
    setAiLoading(false)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const exportAnalysis = () => {
    if (!active) return
    const payload = {
      version:     '1.0',
      tool:        'Ansoff',
      exportedAt:  new Date().toISOString(),
      analysis:    active,
      aiResult:    aiResult || active.aiResult || null,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `Ansoff_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('Export réussi')
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const importFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result)
        // Accept both wrapped {analysis:...} and bare analysis object
        const a = raw.analysis || raw
        if (!a.name || !Array.isArray(a.selectedStrategies)) throw new Error('Format invalide — fichier Ansoff requis')
        const imported = {
          ...a,
          id:         uid(),  // new id to avoid collision
          importedAt: new Date().toISOString(),
          aiResult:   raw.aiResult || a.aiResult || null,
        }
        const updated = [...analyses, imported]
        setAnalyses(updated); persist(updated)
        setActiveId(imported.id)
        setAiResult(imported.aiResult || null)
        setView(imported.aiResult ? 'report' : 'setup')
        if (imported.aiResult) setActiveStrat(imported.selectedStrategies?.[0] || null)
        showToast(`"${imported.name}" importé`)
      } catch (err) {
        showToast(err.message || 'Fichier JSON invalide', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const activeStratResult = aiResult?.strategies?.find(s => s.key === activeStrat)

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
        }
        body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
        .root { min-height:100vh; display:flex; flex-direction:column; }
        .topbar { height:56px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 20px; gap:12px; position:sticky; top:0; z-index:100; }
        .topbar-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .topbar-sub { font-size:11px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .topbar-right { margin-left:auto; display:flex; gap:8px; align-items:center; }
        .body { flex:1; display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 56px); overflow:hidden; }
        .btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; letter-spacing:.04em; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .btn:hover { color:var(--text); border-color:rgba(255,255,255,.2); }
        .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
        .btn.primary:hover { background:#4f52d8; }
        .btn.ansoff { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.3); color:var(--accent2); }
        .btn.ansoff:hover { background:rgba(99,102,241,.18); }
        .btn.gen { background:rgba(129,140,248,.1); border-color:rgba(129,140,248,.3); color:var(--accent2); }
        .btn.gen:hover { background:rgba(129,140,248,.18); }
        .btn:disabled { opacity:.4; cursor:not-allowed; }
        .back-btn { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s; }
        .back-btn:hover { color:var(--text); }

        /* Left panel */
        .left-panel { background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
        .panel-header { padding:16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .panel-label { font-size:10px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .panel-list { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:2px; }
        .item { padding:10px 12px; border-radius:8px; cursor:pointer; border:1px solid transparent; transition:all .15s; position:relative; }
        .item:hover { background:var(--surface2); }
        .item.active { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.2); }
        .item-name { font-size:12px; font-weight:600; }
        .item-meta { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:2px; }
        .item-del { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; position:absolute; top:8px; right:8px; padding:2px 4px; border-radius:3px; }
        .item:hover .item-del { opacity:1; }
        .ai-badge { font-size:9px; padding:1px 5px; border-radius:3px; background:rgba(129,140,248,.15); color:var(--accent2); font-family:'Geist Mono',monospace; font-weight:700; }
        .imported-badge { font-size:9px; padding:1px 5px; border-radius:3px; background:rgba(34,211,165,.1); color:#22d3a5; font-family:'Geist Mono',monospace; font-weight:700; }
        .new-form { padding:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px; }

        /* Inputs */
        .input { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:8px 10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--text); outline:none; transition:border-color .15s; }
        .input:focus { border-color:var(--accent); }
        .input::placeholder { color:var(--muted); }
        textarea.input { resize:vertical; min-height:60px; }
        .label { font-size:10px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:4px; display:block; }

        /* View tabs */
        .view-tabs { display:flex; gap:4px; background:var(--surface2); border-radius:8px; padding:3px; border:1px solid var(--border); }
        .view-tab { padding:5px 14px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; transition:all .15s; color:var(--muted2); border:none; background:none; }
        .view-tab.active { background:var(--surface3); color:var(--text); }

        /* Main */
        .center-panel { overflow-y:auto; padding:28px; display:flex; flex-direction:column; gap:24px; }
        .setup-tabs { display:flex; gap:4px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:3px; align-self:flex-start; }
        .setup-tab { padding:6px 16px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; transition:all .15s; color:var(--muted2); border:none; background:none; }
        .setup-tab.active { background:var(--surface3); color:var(--text); }

        /* Generated resume banner */
        .gen-banner { background:rgba(129,140,248,.06); border:1px solid rgba(129,140,248,.25); border-radius:10px; padding:12px 16px; display:flex; align-items:flex-start; gap:10px; }
        .gen-banner-icon { font-size:16px; flex-shrink:0; }
        .gen-banner-label { font-size:10px; color:var(--accent2); font-family:'Geist Mono',monospace; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
        .gen-banner-text { font-size:12px; color:var(--muted2); line-height:1.6; }

        /* Ansoff Matrix */
        .matrix-wrap { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:20px; }
        .matrix-title-row { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
        .matrix-title { font-size:11px; color:var(--muted2); font-family:'Geist Mono',monospace; letter-spacing:.1em; text-transform:uppercase; }
        .matrix-grid-outer { display:grid; grid-template-columns:36px 1fr 1fr; grid-template-rows:auto 1fr 1fr; gap:0; }
        .matrix-corner { grid-column:1; grid-row:1; }
        .matrix-col-labels { grid-column:2/4; grid-row:1; display:grid; grid-template-columns:1fr 1fr; }
        .matrix-col-label { text-align:center; padding:6px 0 10px; font-size:10px; font-family:'Geist Mono',monospace; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; }
        .matrix-row-label-wrap { grid-column:1; display:flex; align-items:center; justify-content:center; }
        .matrix-row-label { font-size:10px; font-family:'Geist Mono',monospace; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg); }
        .matrix-cell { border:1px solid var(--border); padding:16px; cursor:pointer; transition:all .2s; display:flex; flex-direction:column; gap:8px; min-height:140px; position:relative; background:var(--surface2); }
        .matrix-cell:hover { border-color:var(--border2); }
        .matrix-cell.selected { border-width:2px; }
        .matrix-cell.tl { border-radius:12px 0 0 0; }
        .matrix-cell.tr { border-radius:0 12px 0 0; }
        .matrix-cell.bl { border-radius:0 0 0 12px; }
        .matrix-cell.br { border-radius:0 0 12px 0; }
        .cell-check { position:absolute; top:10px; right:10px; width:20px; height:20px; border-radius:50%; border:1.5px solid; display:flex; align-items:center; justify-content:center; font-size:11px; transition:all .15s; }
        .cell-icon { font-size:22px; }
        .cell-label { font-size:13px; font-weight:700; }
        .cell-desc { font-size:11px; color:var(--muted2); line-height:1.5; }
        .risk-pill { font-size:9px; font-family:'Geist Mono',monospace; padding:2px 8px; border-radius:10px; font-weight:700; display:inline-flex; align-items:center; gap:4px; }
        /* AI-generated highlight ring on matrix cells */
        .matrix-cell.ai-selected { box-shadow:0 0 0 2px var(--accent2); }

        /* Strategy detail */
        .strat-detail-wrap { display:flex; flex-direction:column; gap:16px; }
        .strat-tabs { display:flex; gap:6px; flex-wrap:wrap; }
        .strat-tab { padding:7px 14px; border-radius:8px; font-size:11px; font-family:'Geist Mono',monospace; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); cursor:pointer; transition:all .15s; display:flex; align-items:center; gap:7px; }
        .strat-tab.active { border-width:1.5px; }
        .strat-detail-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:14px; }
        .strat-detail-header { display:flex; align-items:center; gap:12px; }
        .strat-icon-big { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; }
        .tactics-grid { display:flex; flex-wrap:wrap; gap:6px; }
        .tactic-chip { padding:5px 10px; border-radius:6px; font-size:11px; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); cursor:pointer; transition:all .15s; font-family:'Geist Mono',monospace; }
        .tactic-chip.on { border-color:rgba(99,102,241,.4); background:rgba(99,102,241,.1); color:var(--accent2); }
        .section-title { font-size:10px; color:var(--muted2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:8px; }
        .section-line { flex:1; height:1px; background:var(--border); }

        /* Report */
        .report-summary-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; gap:20px; }
        .score-trio { display:flex; gap:16px; }
        .score-trio-item { text-align:center; }
        .score-trio-val { font-family:'Instrument Serif',serif; font-size:32px; font-style:italic; }
        .score-trio-label { font-size:9px; color:var(--muted); font-family:'Geist Mono',monospace; letter-spacing:.08em; text-transform:uppercase; margin-top:2px; }
        .divider-v { width:1px; background:var(--border); flex-shrink:0; }
        .summary-text { flex:1; font-size:13px; line-height:1.75; color:var(--muted2); }
        .strat-report-tabs { display:flex; gap:6px; flex-wrap:wrap; }
        .strat-report-tab { padding:7px 14px; border-radius:8px; font-size:11px; font-family:'Geist Mono',monospace; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); cursor:pointer; transition:all .15s; display:flex; align-items:center; gap:7px; }
        .strat-report-tab.active { border-width:1.5px; }
        .priority-badge { font-size:9px; font-family:'Geist Mono',monospace; padding:2px 6px; border-radius:4px; background:rgba(99,102,241,.15); color:var(--accent2); border:1px solid rgba(99,102,241,.25); }
        .strat-report-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
        .strat-report-header { padding:18px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .strat-report-name { font-family:'Instrument Serif',serif; font-size:22px; font-style:italic; }
        .strat-scores { display:flex; gap:14px; }
        .strat-score-item { text-align:center; }
        .strat-score-val { font-size:20px; font-family:'Instrument Serif',serif; font-style:italic; }
        .strat-score-lbl { font-size:9px; color:var(--muted); font-family:'Geist Mono',monospace; text-transform:uppercase; letter-spacing:.06em; }
        .strat-headline { padding:12px 20px; background:var(--surface2); border-bottom:1px solid var(--border); font-size:13px; color:var(--muted2); font-style:italic; }
        .strat-body { padding:20px; display:flex; flex-direction:column; gap:18px; }
        .analysis-box { background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:16px; font-size:13px; color:var(--text); line-height:1.75; }
        .kpi-row { display:flex; gap:8px; flex-wrap:wrap; }
        .kpi-chip { padding:6px 12px; border-radius:8px; font-size:11px; font-family:'Geist Mono',monospace; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); }
        .phases-list { display:flex; flex-direction:column; gap:10px; }
        .phase-item { background:var(--surface2); border:1px solid var(--border); border-radius:10px; overflow:hidden; }
        .phase-header { padding:10px 14px; background:var(--surface3); display:flex; align-items:center; justify-content:space-between; }
        .phase-name { font-size:12px; font-weight:700; }
        .phase-duration { font-size:10px; font-family:'Geist Mono',monospace; color:var(--muted2); }
        .phase-actions { padding:10px 14px; display:flex; flex-direction:column; gap:5px; }
        .phase-action { font-size:12px; color:var(--muted2); display:flex; gap:8px; align-items:flex-start; line-height:1.5; }
        .phase-dot { width:5px; height:5px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:6px; }
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .mini-list-title { font-size:10px; font-family:'Geist Mono',monospace; text-transform:uppercase; letter-spacing:.08em; color:var(--muted2); margin-bottom:6px; }
        .mini-list-item { font-size:12px; color:var(--muted2); display:flex; gap:8px; align-items:flex-start; line-height:1.5; padding:4px 0; }
        .mini-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; margin-top:6px; }
        .qw-list { display:flex; flex-direction:column; gap:6px; }
        .qw-item { display:flex; gap:10px; align-items:flex-start; padding:10px 12px; background:rgba(52,211,153,.05); border:1px solid rgba(52,211,153,.15); border-radius:8px; font-size:12px; color:var(--text); line-height:1.6; }
        .qw-icon { color:#34d399; font-size:13px; flex-shrink:0; padding-top:1px; }
        .info-list { display:flex; flex-direction:column; gap:6px; }
        .info-item { display:flex; gap:10px; align-items:flex-start; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--muted2); line-height:1.6; }
        .prio-card { background:rgba(99,102,241,.05); border:1px solid rgba(99,102,241,.2); border-radius:10px; padding:16px 20px; display:flex; flex-direction:column; gap:8px; }
        .prio-label { font-size:10px; font-family:'Geist Mono',monospace; color:var(--accent2); letter-spacing:.1em; text-transform:uppercase; }
        .prio-text { font-size:13px; color:var(--text); line-height:1.7; }
        .prio-seq { font-size:12px; color:var(--muted2); line-height:1.65; margin-top:4px; }
        .conclusion-box { background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:16px 20px; font-size:13px; color:var(--muted2); line-height:1.75; font-style:italic; }
        .tf-badge { font-size:10px; font-family:'Geist Mono',monospace; padding:3px 10px; border-radius:10px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); display:inline-flex; align-items:center; gap:5px; }

        /* Generate modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.78); z-index:200; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
        .modal { background:var(--surface); border:1px solid var(--border2); border-radius:16px; padding:26px; width:100%; max-width:500px; box-shadow:0 24px 64px rgba(0,0,0,.5); }
        .modal-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; color:var(--accent2); margin-bottom:16px; }
        .modal-actions { display:flex; gap:8px; margin-top:16px; }
        .btn-full { flex:1; padding:10px; border-radius:8px; cursor:pointer; background:var(--accent); border:none; color:#fff; font-family:'Syne',sans-serif; font-size:13px; font-weight:600; transition:background .15s; }
        .btn-full:hover { background:#4f52d8; }
        .btn-cancel { padding:10px 16px; border-radius:8px; cursor:pointer; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Syne',sans-serif; font-size:13px; }

        /* Loading */
        .loading-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:80px 40px; }
        .spinner { width:24px; height:24px; border:2px solid var(--border2); border-top-color:var(--accent2); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* Empty / Toast */
        .empty-cta { padding:60px 40px; text-align:center; }
        .empty-icon { font-size:40px; opacity:.25; margin-bottom:14px; }
        .empty-txt { font-size:13px; color:var(--muted); line-height:1.6; }
        .toast { position:fixed; bottom:24px; right:24px; z-index:500; background:var(--surface2); border:1px solid var(--border2); border-radius:8px; padding:12px 18px; font-size:13px; box-shadow:0 8px 32px rgba(0,0,0,.4); animation:slideUp .2s ease; display:flex; align-items:center; gap:8px; max-width:360px; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info  { border-color:rgba(99,102,241,.3); }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        @media(max-width:700px) { .body{grid-template-columns:1fr;} .left-panel{display:none;} }
      `}</style>

      {/* Hidden file input for import */}
      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importFile}/>

      <div className="root">

        {/* Topbar */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="topbar-title">Matrice Ansoff</div>
            {project && <div className="topbar-sub">{project.name}</div>}
          </div>
          <div className="topbar-right">
            <button className="btn" onClick={() => importRef.current?.click()} title="Importer une analyse JSON">↑ Importer</button>
            {active && (
              <>
                <div className="view-tabs">
                  <button className={`view-tab ${view === 'setup' ? 'active' : ''}`} onClick={() => setView('setup')}>Configuration</button>
                  <button className={`view-tab ${view === 'report' ? 'active' : ''}`} onClick={() => setView('report')} disabled={!aiResult && !aiLoading}>Analyse</button>
                </div>
                <button className="btn" onClick={exportAnalysis} title="Exporter l'analyse en JSON">↓ Exporter</button>
                {/* ── Generate button ── */}
                <button className="btn gen" onClick={() => setShowGenModal(true)} disabled={genLoading} title="L'IA génère automatiquement les stratégies depuis un contexte">
                  {genLoading ? <><span className="spinner" style={{ width:14, height:14, borderTopColor:'var(--accent2)' }}/>Génération…</> : '⚡ Générer'}
                </button>
                {/* ── Analyze button ── */}
                <button className="btn ansoff" onClick={runAI} disabled={aiLoading || (active?.selectedStrategies || []).length === 0}>
                  {aiLoading ? <><span className="spinner" style={{ width:14, height:14 }}/>Analyse…</> : '✦ Analyser'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="body">

          {/* Left panel */}
          <aside className="left-panel">
            <div className="panel-header">
              <span className="panel-label">Analyses ({analyses.length})</span>
            </div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">🗺</div>
                  <div className="empty-txt">Créez votre première analyse Ansoff</div>
                </div>
              )}
              {analyses.map(a => {
                const selCount = (a.selectedStrategies || []).length
                return (
                  <div key={a.id} className={`item ${activeId === a.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveId(a.id)
                      setAiResult(a.aiResult || null)
                      setView(a.aiResult ? 'report' : 'setup')
                      if (a.aiResult) setActiveStrat(a.selectedStrategies?.[0])
                    }}>
                    <button className="item-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                    <div className="item-name" style={{ display:'flex', alignItems:'center', gap:5, paddingRight:18 }}>
                      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</span>
                      {a.generatedByAI && <span className="ai-badge">IA</span>}
                      {a.importedAt   && <span className="imported-badge">Import</span>}
                    </div>
                    <div className="item-meta">
                      {new Date(a.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                      {selCount > 0 && ` · ${selCount} strat.`}
                      {a.aiResult && ' · ✦ analysé'}
                    </div>
                    {/* Mini strategy chips */}
                    {selCount > 0 && (
                      <div style={{ display:'flex', gap:3, marginTop:4, flexWrap:'wrap' }}>
                        {(a.selectedStrategies || []).map(k => {
                          const s = STRATEGIES[k]
                          return <span key={k} style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:s.bg, color:s.color, border:`1px solid ${s.border}`, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{s.icon}</span>
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {showNewForm ? (
              <div className="new-form">
                <label className="label">Nom de l'analyse</label>
                <input className="input" placeholder="Ex: Croissance 2026" value={newForm.name}
                  onChange={e => setNewForm({ name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus/>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn primary" style={{ flex:1 }} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{ padding:12, borderTop:'1px solid var(--border)' }}>
                <button className="btn" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowNewForm(true)}>+ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="center-panel">
            {!active ? (
              <div className="empty-cta" style={{ padding:'80px 40px', textAlign:'center' }}>
                <div className="empty-icon" style={{ fontSize:56, marginBottom:16 }}>🗺</div>
                <div style={{ fontFamily:'Instrument Serif,serif', fontSize:22, fontStyle:'italic', marginBottom:8 }}>Stratégie de croissance Ansoff</div>
                <div className="empty-txt" style={{ marginBottom:20 }}>Créez une analyse puis utilisez ⚡ Générer pour que l'IA positionne automatiquement les stratégies depuis un contexte libre.</div>
                <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                  <button className="btn gen" onClick={() => { createAnalysis(); setShowNewForm(true) }}>⚡ Nouveau + Générer</button>
                  <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
                </div>
              </div>
            ) : view === 'setup' ? (

              /* ══ SETUP ══ */
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                  <div>
                    <h2 style={{ fontFamily:'Instrument Serif,serif', fontSize:22, fontStyle:'italic', display:'flex', alignItems:'center', gap:8 }}>
                      {active.name}
                      {active.generatedByAI && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:'rgba(129,140,248,.12)', color:'var(--accent2)', fontFamily:'Geist Mono,monospace', fontWeight:700 }}>Généré IA</span>}
                    </h2>
                  </div>
                  <div className="setup-tabs">
                    <button className={`setup-tab ${activeTab === 'context' ? 'active' : ''}`} onClick={() => setActiveTab('context')}>Contexte</button>
                    <button className={`setup-tab ${activeTab === 'strategies' ? 'active' : ''}`} onClick={() => setActiveTab('strategies')}>
                      Stratégies {(active.selectedStrategies || []).length > 0 && `(${active.selectedStrategies.length})`}
                    </button>
                  </div>
                </div>

                {/* AI generated summary banner */}
                {active.contextSummary && (
                  <div className="gen-banner">
                    <span className="gen-banner-icon">⚡</span>
                    <div style={{ flex:1 }}>
                      <div className="gen-banner-label">Généré par l'IA</div>
                      <div className="gen-banner-text">{active.contextSummary}</div>
                    </div>
                    <button onClick={() => updateActive({ contextSummary: '' })} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:13, padding:'0 2px', flexShrink:0 }}>✕</button>
                  </div>
                )}

                {activeTab === 'context' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                      {[
                        { field:'companyDescription', label:"Description de l'entreprise",    ph:'Activité, taille, positionnement…',          rows:3 },
                        { field:'objectives',         label:'Objectifs de croissance',         ph:'Doubler le CA, conquérir l\'Europe…',          rows:3 },
                        { field:'currentProducts',    label:'Produits / services actuels',     ph:'Ce que vous vendez aujourd\'hui…',            rows:2 },
                        { field:'currentMarkets',     label:'Marchés actuels',                  ph:'Géographies, segments clients…',               rows:2 },
                        { field:'resources',          label:'Ressources disponibles',           ph:'Budget, équipe, technologie, partenariats…',  rows:2 },
                      ].map(({ field, label, ph, rows }) => (
                        <div key={field} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          <label className="label">{label}</label>
                          <textarea className="input" rows={rows} placeholder={ph}
                            value={active[field] || ''} onChange={e => updateActive({ [field]: e.target.value })}/>
                        </div>
                      ))}
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <label className="label">Horizon temporel</label>
                        <div style={{ display:'flex', gap:6 }}>
                          {TIME_HORIZONS.map(t => (
                            <button key={t.value}
                              style={{ flex:1, padding:'8px 4px', borderRadius:8, textAlign:'center', fontSize:11, fontFamily:'Geist Mono,monospace', border:`1px solid ${active.timeHorizon===t.value?'rgba(99,102,241,.4)':'var(--border2)'}`, background:active.timeHorizon===t.value?'rgba(99,102,241,.12)':'var(--surface2)', color:active.timeHorizon===t.value?'var(--accent2)':'var(--muted2)', cursor:'pointer', transition:'all .15s' }}
                              onClick={() => updateActive({ timeHorizon: t.value })}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button className="btn" style={{ alignSelf:'flex-end' }} onClick={() => setActiveTab('strategies')}>Choisir les stratégies →</button>
                  </div>
                )}

                {activeTab === 'strategies' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                    {/* Matrix */}
                    <div className="matrix-wrap">
                      <div className="matrix-title-row">
                        <div className="matrix-title">Matrice Ansoff — Cliquez pour sélectionner</div>
                        <div style={{ marginLeft:'auto', fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>
                          {(active.selectedStrategies || []).length} / 4 sélectionnée(s)
                          {active.generatedByAI && <span style={{ color:'var(--accent2)', marginLeft:6 }}>· positionnées par IA</span>}
                        </div>
                      </div>
                      <div className="matrix-grid-outer">
                        <div className="matrix-corner"/>
                        <div className="matrix-col-labels">
                          <div className="matrix-col-label">Produit existant</div>
                          <div className="matrix-col-label">Nouveau produit</div>
                        </div>
                        {/* Row 1: Nouveau marché */}
                        <div className="matrix-row-label-wrap" style={{ gridRow:2 }}>
                          <span className="matrix-row-label">Nouveau marché</span>
                        </div>
                        {['development','diversification'].map((key, i) => {
                          const s    = STRATEGIES[key]
                          const isOn = (active.selectedStrategies || []).includes(key)
                          return (
                            <div key={key} className={`matrix-cell ${i===0?'tl':'tr'} ${isOn?'selected':''} ${isOn&&active.generatedByAI?'ai-selected':''}`}
                              style={{ borderColor:isOn?s.color:undefined, background:isOn?s.bg:undefined }}
                              onClick={() => toggleStrategy(key)}>
                              <div className="cell-check" style={{ borderColor:isOn?s.color:'var(--border2)', background:isOn?s.bg:'none', color:s.color }}>{isOn?'✓':''}</div>
                              <div className="cell-icon">{s.icon}</div>
                              <div className="cell-label" style={{ color:isOn?s.color:'var(--text)' }}>{s.label}</div>
                              <span className="risk-pill" style={{ background:`${s.riskColor}15`, color:s.riskColor, border:`1px solid ${s.riskColor}30` }}>⚠ {s.risk}</span>
                              <div className="cell-desc">{s.description}</div>
                            </div>
                          )
                        })}
                        {/* Row 2: Marché existant */}
                        <div className="matrix-row-label-wrap" style={{ gridRow:3 }}>
                          <span className="matrix-row-label">Marché existant</span>
                        </div>
                        {['penetration','extension'].map((key, i) => {
                          const s    = STRATEGIES[key]
                          const isOn = (active.selectedStrategies || []).includes(key)
                          return (
                            <div key={key} className={`matrix-cell ${i===0?'bl':'br'} ${isOn?'selected':''} ${isOn&&active.generatedByAI?'ai-selected':''}`}
                              style={{ borderColor:isOn?s.color:undefined, background:isOn?s.bg:undefined }}
                              onClick={() => toggleStrategy(key)}>
                              <div className="cell-check" style={{ borderColor:isOn?s.color:'var(--border2)', background:isOn?s.bg:'none', color:s.color }}>{isOn?'✓':''}</div>
                              <div className="cell-icon">{s.icon}</div>
                              <div className="cell-label" style={{ color:isOn?s.color:'var(--text)' }}>{s.label}</div>
                              <span className="risk-pill" style={{ background:`${s.riskColor}15`, color:s.riskColor, border:`1px solid ${s.riskColor}30` }}>⚠ {s.risk}</span>
                              <div className="cell-desc">{s.description}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Per-strategy detail */}
                    {(active.selectedStrategies || []).length > 0 && (
                      <div className="strat-detail-wrap">
                        <div className="section-title">Détail par stratégie <div className="section-line"/></div>
                        <div className="strat-tabs">
                          {(active.selectedStrategies || []).map(key => {
                            const s        = STRATEGIES[key]
                            const isActive = activeStrat === key
                            return (
                              <button key={key} className={`strat-tab ${isActive?'active':''}`}
                                style={{ borderColor:isActive?s.border:undefined, background:isActive?s.bg:undefined, color:isActive?s.color:undefined }}
                                onClick={() => setActiveStrat(key)}>
                                {s.icon} {s.label}
                              </button>
                            )
                          })}
                        </div>

                        {activeStrat && (active.selectedStrategies || []).includes(activeStrat) && (() => {
                          const s       = STRATEGIES[activeStrat]
                          const details = active.strategyDetails?.[activeStrat] || {}
                          return (
                            <div className="strat-detail-card" style={{ borderColor:s.border }}>
                              <div className="strat-detail-header">
                                <div className="strat-icon-big" style={{ background:s.bg, color:s.color }}>{s.icon}</div>
                                <div>
                                  <div style={{ fontSize:15, fontWeight:700, color:s.color }}>{s.fullLabel}</div>
                                  <div style={{ fontSize:11, color:'var(--muted2)', marginTop:2 }}>Marché {s.market} × Produit {s.product}</div>
                                </div>
                                {active.generatedByAI && details.rationale && (
                                  <span style={{ marginLeft:'auto', fontSize:9, padding:'2px 6px', borderRadius:3, background:'rgba(129,140,248,.12)', color:'var(--accent2)', fontFamily:'Geist Mono,monospace' }}>Pré-rempli par IA</span>
                                )}
                              </div>
                              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                <label className="label">Justification</label>
                                <textarea className="input" rows={2} placeholder="Pourquoi choisir cette voie ?"
                                  value={details.rationale||''} onChange={e => updateStratDetail(activeStrat,'rationale',e.target.value)}/>
                              </div>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <label className="label">Opportunités</label>
                                  <textarea className="input" rows={2} placeholder="Opportunités concrètes…"
                                    value={details.opportunities||''} onChange={e => updateStratDetail(activeStrat,'opportunities',e.target.value)}/>
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <label className="label">Contraintes</label>
                                  <textarea className="input" rows={2} placeholder="Obstacles, ressources manquantes…"
                                    value={details.constraints||''} onChange={e => updateStratDetail(activeStrat,'constraints',e.target.value)}/>
                                </div>
                              </div>
                              <div>
                                <label className="label" style={{ marginBottom:8 }}>Tactiques</label>
                                <div className="tactics-grid">
                                  {s.tactics.map(t => {
                                    const isOn = (details.tactics||[]).includes(t)
                                    return (
                                      <button key={t} className={`tactic-chip ${isOn?'on':''}`} onClick={() => toggleTactic(activeStrat,t)}>
                                        {isOn?'✓ ':''}{t}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    <button className="btn ansoff" style={{ alignSelf:'flex-end' }} onClick={runAI}
                      disabled={aiLoading || (active.selectedStrategies||[]).length===0}>
                      {aiLoading ? <><span className="spinner" style={{ width:14, height:14 }}/>Analyse…</> : '✦ Lancer l\'analyse IA'}
                    </button>
                  </div>
                )}
              </>

            ) : (
              /* ══ REPORT ══ */
              aiLoading ? (
                <div className="loading-wrap">
                  <div className="spinner" style={{ width:32, height:32 }}/>
                  <div style={{ fontSize:13, color:'var(--muted2)', fontFamily:'Geist Mono,monospace' }}>Analyse stratégique en cours…</div>
                  <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>Claude génère votre plan de croissance Ansoff</div>
                </div>
              ) : aiResult ? (
                <>
                  {/* Summary */}
                  <div className="report-summary-card">
                    {aiResult.global_score && (
                      <>
                        <div className="score-trio">
                          {[
                            { val:aiResult.global_score.growth_potential, label:'Potentiel' },
                            { val:aiResult.global_score.risk_level,       label:'Risque'    },
                            { val:aiResult.global_score.feasibility,      label:'Faisabilité' },
                          ].map(({ val, label }) => (
                            <div key={label} className="score-trio-item">
                              <div className="score-trio-val" style={{ color:SCORE_COLORS(val) }}>{(val||3).toFixed(1)}</div>
                              <div className="score-trio-label">{label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="divider-v"/>
                      </>
                    )}
                    <div className="summary-text">{aiResult.executive_summary}</div>
                  </div>

                  {/* Strategy tabs */}
                  {aiResult.strategies?.length > 0 && (
                    <div>
                      <div className="section-title">Analyse par stratégie <div className="section-line"/></div>
                      <div className="strat-report-tabs" style={{ marginBottom:12 }}>
                        {aiResult.strategies.map((s, i) => {
                          const meta    = STRATEGIES[s.key] || { icon:'◉', color:'var(--muted2)', bg:'var(--surface2)', border:'var(--border2)', label:s.key }
                          const isActive = activeStrat === s.key
                          return (
                            <button key={i} className={`strat-report-tab ${isActive?'active':''}`}
                              style={{ borderColor:isActive?meta.border:undefined, background:isActive?meta.bg:undefined, color:isActive?meta.color:undefined }}
                              onClick={() => setActiveStrat(s.key)}>
                              {meta.icon} {meta.label}
                              {s.priority && <span className="priority-badge">#{s.priority}</span>}
                            </button>
                          )
                        })}
                      </div>

                      {activeStratResult && (() => {
                        const s    = activeStratResult
                        const meta = STRATEGIES[s.key] || { icon:'◉', color:'var(--muted2)', bg:'var(--surface2)', border:'var(--border2)', fullLabel:s.key }
                        return (
                          <div className="strat-report-card" style={{ borderColor:meta.border }}>
                            <div className="strat-report-header">
                              <div>
                                <div className="strat-report-name">{meta.icon} {meta.fullLabel}</div>
                                {s.timeframe && <span className="tf-badge" style={{ marginTop:6, display:'inline-flex' }}>⏱ {s.timeframe}</span>}
                              </div>
                              <div className="strat-scores">
                                {[{ val:s.growth_potential, label:'Potentiel' },{ val:s.risk_score, label:'Risque' }].map(({ val, label }) => (
                                  <div key={label} className="strat-score-item">
                                    <div className="strat-score-val" style={{ color:SCORE_COLORS(val) }}>{(val||3).toFixed(1)}</div>
                                    <div className="strat-score-lbl">{label}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {s.headline && <div className="strat-headline">"{s.headline}"</div>}
                            <div className="strat-body">
                              {s.analysis && <div><div className="section-title" style={{ marginBottom:8 }}>Analyse <div className="section-line"/></div><div className="analysis-box">{s.analysis}</div></div>}
                              {s.kpis?.length > 0 && <div><div className="section-title" style={{ marginBottom:8 }}>KPIs clés <div className="section-line"/></div><div className="kpi-row">{s.kpis.map((k,i) => <span key={i} className="kpi-chip">{k}</span>)}</div></div>}
                              {s.action_steps?.length > 0 && (
                                <div>
                                  <div className="section-title" style={{ marginBottom:8 }}>Plan d'action <div className="section-line"/></div>
                                  <div className="phases-list">
                                    {s.action_steps.map((phase, i) => (
                                      <div key={i} className="phase-item">
                                        <div className="phase-header">
                                          <span className="phase-name" style={{ color:meta.color }}>{phase.phase}</span>
                                          <span className="phase-duration">{phase.duration}</span>
                                        </div>
                                        <div className="phase-actions">
                                          {(phase.actions||[]).map((a,j) => <div key={j} className="phase-action"><div className="phase-dot" style={{ background:meta.color }}/>{a}</div>)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(s.resources_needed?.length > 0 || s.risks?.length > 0) && (
                                <div className="two-col">
                                  {s.resources_needed?.length > 0 && <div><div className="mini-list-title">Ressources nécessaires</div>{s.resources_needed.map((r,i) => <div key={i} className="mini-list-item"><div className="mini-dot" style={{ background:'#60a5fa' }}/>{r}</div>)}</div>}
                                  {s.risks?.length > 0 && <div><div className="mini-list-title" style={{ color:'#fb923c' }}>Risques & mitigations</div>{s.risks.map((r,i) => <div key={i} className="mini-list-item"><div className="mini-dot" style={{ background:'#fb923c' }}/>{r}</div>)}</div>}
                                </div>
                              )}
                              {s.quick_wins?.length > 0 && (
                                <div>
                                  <div className="section-title" style={{ marginBottom:8 }}>Quick wins — 30 jours <div className="section-line"/></div>
                                  <div className="qw-list">{s.quick_wins.map((qw,i) => <div key={i} className="qw-item"><span className="qw-icon">⚡</span>{qw}</div>)}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {aiResult.synergies?.length > 0 && (
                    <div>
                      <div className="section-title">Synergies entre stratégies <div className="section-line"/></div>
                      <div className="info-list">{aiResult.synergies.map((syn,i) => <div key={i} className="info-item"><span style={{ color:'var(--accent2)',fontSize:13 }}>⟳</span>{syn}</div>)}</div>
                    </div>
                  )}

                  {aiResult.prioritization && (
                    <div>
                      <div className="section-title">Priorisation recommandée <div className="section-line"/></div>
                      <div className="prio-card">
                        <div className="prio-label">🎯 Activer en premier</div>
                        <div className="prio-text">{aiResult.prioritization.immediate}</div>
                        {aiResult.prioritization.sequence && <div className="prio-seq">{aiResult.prioritization.sequence}</div>}
                      </div>
                    </div>
                  )}

                  {aiResult.watchouts?.length > 0 && (
                    <div>
                      <div className="section-title">Pièges à éviter <div className="section-line"/></div>
                      <div className="info-list">{aiResult.watchouts.map((w,i) => <div key={i} className="info-item" style={{ borderColor:'rgba(248,113,113,.15)' }}><span style={{ color:'#f87171',fontSize:13 }}>⚠</span>{w}</div>)}</div>
                    </div>
                  )}

                  {aiResult.conclusion && (
                    <div>
                      <div className="section-title">Conclusion <div className="section-line"/></div>
                      <div className="conclusion-box">{aiResult.conclusion}</div>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn" onClick={() => setView('setup')}>← Modifier la configuration</button>
                    <button className="btn ansoff" onClick={runAI} disabled={aiLoading}>↺ Relancer l'analyse</button>
                  </div>
                </>
              ) : (
                <div className="empty-cta">
                  <div className="empty-icon">🗺</div>
                  <div className="empty-txt">Sélectionnez vos stratégies et lancez l'analyse IA</div>
                </div>
              )
            )}
          </main>
        </div>

        {/* ── Generate Modal ── */}
        {showGenModal && active && (
          <div className="modal-overlay" onClick={() => setShowGenModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">⚡ Génération automatique IA</div>
              <p style={{ fontSize:13, color:'var(--muted2)', marginBottom:16, lineHeight:1.6 }}>
                Décrivez votre entreprise, votre marché et vos ambitions — l'IA sélectionne et positionne automatiquement les stratégies Ansoff les plus pertinentes et pré-remplit tous les détails.
              </p>
              {active.selectedStrategies?.length > 0 && (
                <div style={{ padding:'8px 12px', background:'rgba(248,113,113,.06)', border:'1px solid rgba(248,113,113,.2)', borderRadius:8, marginBottom:14, fontSize:12, color:'#f87171' }}>
                  ⚠ Cette action remplacera les stratégies et détails existants.
                </div>
              )}
              <label className="label">Description du projet / contexte *</label>
              <textarea className="input" rows={5}
                placeholder="Ex: Startup EdTech B2C fondée en 2022, application mobile d'apprentissage des langues, 50 000 utilisateurs actifs en France, modèle freemium avec 3% de conversion premium, souhait de croissance internationale et lancement d'un outil B2B pour les écoles d'ici 18 mois…"
                value={genContext}
                onChange={e => setGenContext(e.target.value)}
                autoFocus
                style={{ marginTop:6, minHeight:120 }}
              />
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => { setShowGenModal(false); setGenContext('') }}>Annuler</button>
                <button className="btn-full" onClick={runGenerate} disabled={!genContext.trim()}>
                  ⚡ Générer les stratégies
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className={`toast ${toast.type||''}`}>{toast.type==='error'?'✕':'✓'} {toast.msg}</div>}
      </div>
    </>
  )
}