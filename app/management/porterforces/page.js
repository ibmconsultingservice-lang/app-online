'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const FORCES_META = {
  rivalry: {
    label:       'Rivalité entre concurrents',
    icon:        '⚔',
    color:       '#f87171',
    bg:          'rgba(248,113,113,.08)',
    description: 'Intensité de la compétition entre les acteurs existants',
    factors: [
      'Nombre élevé de concurrents',
      'Croissance lente du marché',
      'Coûts fixes élevés',
      'Faible différenciation',
      'Barrières à la sortie élevées',
      'Guerres de prix fréquentes',
    ],
  },
  newEntrants: {
    label:       'Nouveaux entrants',
    icon:        '🚪',
    color:       '#fb923c',
    bg:          'rgba(251,146,60,.08)',
    description: 'Facilité d\'entrée de nouveaux compétiteurs',
    factors: [
      'Faibles barrières à l\'entrée',
      'Économies d\'échelle inexistantes',
      'Peu de capital requis',
      'Absence de réglementation',
      'Faible fidélisation clients',
      'Accès facile aux technologies',
    ],
  },
  substitutes: {
    label:       'Produits substituts',
    icon:        '🔄',
    color:       '#facc15',
    bg:          'rgba(250,204,21,.08)',
    description: 'Risque de remplacement par des alternatives',
    factors: [
      'Alternatives nombreuses',
      'Prix des substituts attractifs',
      'Facilité de switching',
      'Performances comparables',
      'Innovation technologique rapide',
      'Changements des habitudes',
    ],
  },
  suppliers: {
    label:       'Pouvoir fournisseurs',
    icon:        '🏭',
    color:       '#34d399',
    bg:          'rgba(52,211,153,.08)',
    description: 'Capacité des fournisseurs à imposer leurs conditions',
    factors: [
      'Fournisseurs concentrés',
      'Absence d\'alternatives',
      'Coûts de changement élevés',
      'Intégration verticale possible',
      'Matières premières rares',
      'Dépendance technologique',
    ],
  },
  buyers: {
    label:       'Pouvoir acheteurs',
    icon:        '🛒',
    color:       '#818cf8',
    bg:          'rgba(129,140,248,.08)',
    description: 'Capacité des clients à influencer les prix et conditions',
    factors: [
      'Acheteurs concentrés',
      'Volume d\'achat important',
      'Faible coût de switching',
      'Forte sensibilité aux prix',
      'Produits standardisés',
      'Acheteurs informés',
    ],
  },
}

const INTENSITY_LABELS = ['', 'Très faible', 'Faible', 'Modérée', 'Élevée', 'Très élevée']

const INTENSITY_COLORS = {
  1: '#34d399',
  2: '#86efac',
  3: '#facc15',
  4: '#fb923c',
  5: '#f87171',
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const EMPTY_FORCE = { score: 3, factors: [], notes: '' }
const DEFAULT_FORCES = () =>
  Object.fromEntries(Object.keys(FORCES_META).map(k => [k, { ...EMPTY_FORCE, factors: [] }]))

// ─── Porter Page ──────────────────────────────────────────────────────────────
export default function PorterPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,     setProject]     = useState(null)
  const [analyses,    setAnalyses]    = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newAnalysis, setNewAnalysis] = useState({ name: '', context: '' })
  const [activeForce, setActiveForce] = useState('rivalry')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [toast,       setToast]       = useState(null)

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.Porter || []
        setAnalyses(list)
        if (list.length > 0) setActiveId(list[list.length - 1].id)
      }
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), Porter: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const active = analyses.find(a => a.id === activeId) || null

  // ── CRUD analyses ──
  const createAnalysis = () => {
    if (!newAnalysis.name.trim()) return
    const a = {
      id:        uid(),
      name:      newAnalysis.name.trim(),
      context:   newAnalysis.context.trim(),
      createdAt: new Date().toISOString(),
      forces:    DEFAULT_FORCES(),
      aiResult:  null,
    }
    const updated = [...analyses, a]
    setAnalyses(updated)
    setActiveId(a.id)
    persist(updated)
    setShowNewForm(false)
    setNewAnalysis({ name: '', context: '' })
    showToast(`Analyse "${a.name}" créée`)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated)
    persist(updated)
    if (activeId === id) setActiveId(updated[updated.length - 1]?.id || null)
    showToast('Analyse supprimée', 'info')
  }

  const updateAnalysis = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated)
    persist(updated)
  }

  // ── Update a single force ──
  const updateForce = (forceKey, patch) => {
    if (!active) return
    const forces = { ...(active.forces || DEFAULT_FORCES()), [forceKey]: { ...(active.forces?.[forceKey] || EMPTY_FORCE), ...patch } }
    updateAnalysis({ forces })
  }

  const toggleFactor = (forceKey, factor) => {
    const current = active?.forces?.[forceKey]?.factors || []
    const next    = current.includes(factor) ? current.filter(f => f !== factor) : [...current, factor]
    updateForce(forceKey, { factors: next })
  }

  // ── Computed scores ──
  const getAvgScore = () => {
    if (!active?.forces) return 3
    const scores = Object.values(active.forces).map(f => f.score || 3)
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }

  const getAttractiveness = (avg) => {
    if (avg <= 1.8) return { label: 'Très attractive',  color: '#34d399', bar: 90 }
    if (avg <= 2.6) return { label: 'Attractive',        color: '#86efac', bar: 70 }
    if (avg <= 3.4) return { label: 'Neutre',            color: '#facc15', bar: 50 }
    if (avg <= 4.2) return { label: 'Peu attractive',    color: '#fb923c', bar: 30 }
    return              { label: 'Non attractive',    color: '#f87171', bar: 10 }
  }

  // ── AI ──
  const runAI = async () => {
    if (!active) return
    setAiLoading(true)
    setShowAiPanel(true)
    setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-porterforces', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: active.name,
          context:      active.context,
          forces:       active.forces,
          projectName:  project?.name || '',
          projectTag:   project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateAnalysis({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) {
      showToast(err.message, 'error')
    }
    setAiLoading(false)
  }

  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `Porter_${active.name.replace(/\s+/g, '_')}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const avg = getAvgScore()
  const attracts = getAttractiveness(avg)

  const currentForce = active?.forces?.[activeForce] || EMPTY_FORCE
  const forceMeta    = FORCES_META[activeForce]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:       #0a0a0f;
          --surface:  #111118;
          --surface2: #18181f;
          --surface3: #1e1e28;
          --border:   rgba(255,255,255,.07);
          --border2:  rgba(255,255,255,.12);
          --text:     #f0eff5;
          --muted:    #6b6a7a;
          --muted2:   #9896aa;
          --accent:   #6366f1;
          --accent2:  #818cf8;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        .root { min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Topbar ── */
        .topbar {
          height: 56px; background: var(--surface); border-bottom: 1px solid var(--border);
          display: flex; align-items: center; padding: 0 20px; gap: 12px;
          position: sticky; top: 0; z-index: 100;
        }
        .back-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px;
          border-radius: 6px; background: var(--surface2); border: 1px solid var(--border2);
          color: var(--muted2); font-family: 'Geist Mono', monospace; font-size: 11px;
          cursor: pointer; transition: all .15s;
        }
        .back-btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .topbar-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .topbar-project { font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .topbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }
        .btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 14px;
          border-radius: 6px; cursor: pointer; font-family: 'Geist Mono', monospace;
          font-size: 11px; letter-spacing: .04em; border: 1px solid var(--border2);
          background: var(--surface2); color: var(--muted2); transition: all .15s;
        }
        .btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .btn.primary:hover { background: #4f52d8; }
        .btn.ai { background: rgba(250,204,21,.08); border-color: rgba(250,204,21,.25); color: #facc15; }
        .btn.ai:hover { background: rgba(250,204,21,.15); }
        .btn:disabled { opacity: .4; cursor: not-allowed; }

        /* ── Body layout ── */
        .body { flex: 1; display: grid; grid-template-columns: 240px 1fr 340px; height: calc(100vh - 56px); overflow: hidden; }

        /* ── Left panel ── */
        .left-panel {
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .panel-header {
          padding: 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .panel-label { font-size: 10px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .panel-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
        .analysis-item {
          padding: 10px 12px; border-radius: 8px; cursor: pointer;
          border: 1px solid transparent; transition: all .15s;
        }
        .analysis-item:hover { background: var(--surface2); }
        .analysis-item.active { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.25); }
        .analysis-name { font-size: 12px; font-weight: 600; color: var(--text); }
        .analysis-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 2px; }
        .analysis-del { opacity: 0; background: none; border: none; color: #f87171; cursor: pointer; font-size: 12px; float: right; padding: 2px; }
        .analysis-item:hover .analysis-del { opacity: 1; }
        .new-form { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
        .input {
          width: 100%; background: var(--bg); border: 1px solid var(--border2);
          border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif;
          font-size: 12px; color: var(--text); outline: none; transition: border-color .15s;
        }
        .input:focus { border-color: var(--accent); }
        .input::placeholder { color: var(--muted); }
        textarea.input { resize: vertical; min-height: 56px; }
        .form-label { font-size: 10px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 3px; display: block; }

        /* ── Center panel ── */
        .center-panel { overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; }

        /* ── Radar / pentagon ── */
        .radar-wrap { position: relative; width: 100%; max-width: 420px; margin: 0 auto; }

        /* ── Score overview ── */
        .score-overview {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 20px;
        }
        .score-big { font-family: 'Instrument Serif', serif; font-size: 52px; font-style: italic; line-height: 1; }
        .score-label { font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 4px; letter-spacing: .08em; text-transform: uppercase; }
        .attract-badge {
          padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
          font-family: 'Geist Mono', monospace;
        }
        .score-bar-wrap { flex: 1; }
        .score-bar-track { height: 6px; background: var(--surface3); border-radius: 3px; overflow: hidden; margin-top: 8px; }
        .score-bar-fill { height: 100%; border-radius: 3px; transition: width .5s ease; }

        /* ── Forces grid ── */
        .forces-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        @media (max-width: 900px) { .forces-grid { grid-template-columns: 1fr 1fr; } }
        .force-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 14px; cursor: pointer; transition: all .15s;
          display: flex; flex-direction: column; gap: 10px;
        }
        .force-card:hover { border-color: var(--border2); }
        .force-card.selected { border-color: var(--accent); background: rgba(99,102,241,.05); }
        .force-card-top { display: flex; align-items: center; gap: 10px; }
        .force-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .force-name { font-size: 12px; font-weight: 700; }
        .force-score-row { display: flex; align-items: center; gap: 8px; }
        .force-intensity { font-size: 10px; font-family: 'Geist Mono', monospace; }
        .mini-bar-track { flex: 1; height: 4px; background: var(--surface3); border-radius: 2px; overflow: hidden; }
        .mini-bar-fill { height: 100%; border-radius: 2px; transition: width .3s; }
        .force-factors-count { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }

        /* ── Right panel ── */
        .right-panel {
          background: var(--surface); border-left: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .right-content { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
        .force-detail-header { display: flex; align-items: center; gap: 12px; }
        .force-detail-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .force-detail-name { font-size: 14px; font-weight: 700; }
        .force-detail-desc { font-size: 11px; color: var(--muted2); margin-top: 2px; }

        /* Score slider */
        .score-slider-wrap { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
        .slider-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .slider-value { font-family: 'Instrument Serif', serif; font-size: 28px; font-style: italic; }
        .slider-intensity { font-size: 11px; font-family: 'Geist Mono', monospace; }
        input[type=range].score-range { width: 100%; appearance: none; height: 6px; border-radius: 3px; outline: none; cursor: pointer; margin: 6px 0; }
        input[type=range].score-range::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid rgba(255,255,255,.2); }
        .slider-markers { display: flex; justify-content: space-between; margin-top: 4px; }
        .slider-marker { font-size: 9px; color: var(--muted); font-family: 'Geist Mono', monospace; }

        /* Factors */
        .factors-wrap { display: flex; flex-direction: column; gap: 8px; }
        .factors-title { font-size: 10px; color: var(--muted2); letter-spacing: .08em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .factors-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .factor-chip {
          padding: 5px 10px; border-radius: 6px; font-size: 11px;
          border: 1px solid var(--border2); background: var(--surface2);
          color: var(--muted2); cursor: pointer; transition: all .15s;
          font-family: 'Geist Mono', monospace;
        }
        .factor-chip:hover { border-color: var(--border2); color: var(--text); }
        .factor-chip.on { background: rgba(99,102,241,.12); border-color: rgba(99,102,241,.4); color: var(--accent2); }

        /* Notes */
        .notes-wrap { display: flex; flex-direction: column; gap: 6px; }

        /* ── AI Panel ── */
        .ai-panel {
          position: fixed; right: 0; top: 56px; bottom: 0; width: 420px;
          background: var(--surface); border-left: 1px solid var(--border);
          z-index: 80; display: flex; flex-direction: column; overflow: hidden;
          transform: translateX(100%); transition: transform .3s ease;
        }
        .ai-panel.open { transform: translateX(0); }
        .ai-panel-header {
          padding: 16px 20px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .ai-panel-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .ai-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .ai-section-title { font-size: 10px; color: var(--muted2); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 8px; }
        .ai-summary { background: var(--surface2); border: 1px solid var(--border2); border-radius: 10px; padding: 16px; font-size: 13px; color: var(--text); line-height: 1.7; }
        .ai-force-item { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; gap: 10px; }
        .ai-force-icon { font-size: 18px; flex-shrink: 0; }
        .ai-force-name { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
        .ai-force-text { font-size: 12px; color: var(--muted2); line-height: 1.6; }
        .ai-force-action { font-size: 11px; margin-top: 6px; padding: 4px 10px; border-radius: 4px; display: inline-block; font-family: 'Geist Mono', monospace; }
        .ai-list { display: flex; flex-direction: column; gap: 6px; }
        .ai-list-item { display: flex; gap: 10px; align-items: flex-start; padding: 8px 12px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); font-size: 12px; color: var(--text); line-height: 1.6; }
        .ai-list-num { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--muted); padding-top: 1px; flex-shrink: 0; }
        .ai-loading { display: flex; align-items: center; gap: 12px; padding: 24px; color: var(--muted2); font-size: 13px; }
        .spinner { width: 18px; height: 18px; border: 2px solid var(--border2); border-top-color: #facc15; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Empty ── */
        .empty-cta { padding: 32px 16px; text-align: center; }
        .empty-icon { font-size: 36px; opacity: .3; margin-bottom: 12px; }
        .empty-txt { font-size: 13px; color: var(--muted); line-height: 1.6; }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 500;
          background: var(--surface2); border: 1px solid var(--border2);
          border-radius: 8px; padding: 12px 18px; font-size: 13px;
          box-shadow: 0 8px 32px rgba(0,0,0,.4); animation: slideUp .2s ease;
          display: flex; align-items: center; gap: 8px;
        }
        .toast.error { border-color: rgba(248,113,113,.3); color: #f87171; }
        .toast.info  { border-color: rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        /* ── Responsive ── */
        @media (max-width: 1024px) { .body { grid-template-columns: 200px 1fr; } .right-panel { display: none; } }
        @media (max-width: 700px)  { .body { grid-template-columns: 1fr; } .left-panel { display: none; } }
      `}</style>

      <div className="root">

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>
            ← Retour
          </button>
          <div>
            <div className="topbar-title">Porter's 5 Forces</div>
            {project && <div className="topbar-project">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {active && (
              <>
                <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>
                <button className="btn ai" onClick={runAI} disabled={aiLoading}>
                  {aiLoading
                    ? <><span className="spinner" />Analyse…</>
                    : '✦ Analyse IA'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="body">

          {/* ── Left: analyses list ── */}
          <aside className="left-panel">
            <div className="panel-header">
              <span className="panel-label">Analyses ({analyses.length})</span>
            </div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">⚔</div>
                  <div className="empty-txt">Créez votre première analyse Porter ci-dessous</div>
                </div>
              )}
              {analyses.map(a => (
                <div
                  key={a.id}
                  className={`analysis-item ${activeId === a.id ? 'active' : ''}`}
                  onClick={() => setActiveId(a.id)}
                >
                  <button className="analysis-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  <div className="analysis-name">{a.name}</div>
                  <div className="analysis-meta">
                    {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {a.aiResult && ' · IA ✓'}
                  </div>
                </div>
              ))}
            </div>

            {showNewForm ? (
              <div className="new-form">
                <label className="form-label">Nom de l'analyse</label>
                <input
                  className="input"
                  placeholder="Ex: Marché SaaS B2B"
                  value={newAnalysis.name}
                  onChange={e => setNewAnalysis(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && createAnalysis()}
                  autoFocus
                />
                <label className="form-label">Contexte (optionnel)</label>
                <textarea
                  className="input"
                  placeholder="Secteur, marché cible…"
                  value={newAnalysis.context}
                  onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))}
                  rows={2}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn primary" style={{ flex: 1 }} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>
                  + Nouvelle analyse
                </button>
              </div>
            )}
          </aside>

          {/* ── Center ── */}
          <main className="center-panel">
            {!active ? (
              <div className="empty-cta" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div className="empty-icon" style={{ fontSize: 52, marginBottom: 16 }}>⚔</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, fontStyle: 'italic', marginBottom: 8 }}>
                  Sélectionnez ou créez une analyse
                </div>
                <div className="empty-txt">Utilisez le panneau gauche pour commencer</div>
              </div>
            ) : (
              <>
                <div>
                  <h2 style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, fontStyle: 'italic' }}>{active.name}</h2>
                  {active.context && <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6, lineHeight: 1.6 }}>{active.context}</p>}
                </div>

                {/* Global score card */}
                <div className="score-overview">
                  <div>
                    <div className="score-big" style={{ color: attracts.color }}>{avg.toFixed(1)}</div>
                    <div className="score-label">Intensité moyenne /5</div>
                    <div
                      className="attract-badge"
                      style={{ background: `${attracts.color}15`, color: attracts.color, border: `1px solid ${attracts.color}40`, marginTop: 8 }}
                    >
                      {attracts.label}
                    </div>
                  </div>
                  <div className="score-bar-wrap">
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace', letterSpacing: '.06em' }}>
                      ATTRACTIVITÉ DU MARCHÉ
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(FORCES_META).map(([key, meta]) => {
                        const score = active.forces?.[key]?.score || 3
                        const color = INTENSITY_COLORS[Math.round(score)]
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setActiveForce(key)}>
                            <span style={{ fontSize: 12, width: 18, textAlign: 'center' }}>{meta.icon}</span>
                            <div style={{ flex: 1, height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${(score / 5) * 100}%`, height: '100%', background: color, borderRadius: 2, transition: 'width .4s' }}/>
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--muted2)', fontFamily: 'Geist Mono,monospace', width: 24, textAlign: 'right' }}>{score.toFixed(1)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Forces grid */}
                <div className="forces-grid">
                  {Object.entries(FORCES_META).map(([key, meta]) => {
                    const f      = active.forces?.[key] || EMPTY_FORCE
                    const score  = f.score || 3
                    const color  = INTENSITY_COLORS[Math.round(score)]
                    const isSelected = activeForce === key
                    return (
                      <div
                        key={key}
                        className={`force-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setActiveForce(key)}
                        style={{ borderColor: isSelected ? meta.color : undefined }}
                      >
                        <div className="force-card-top">
                          <div className="force-icon" style={{ background: meta.bg, color: meta.color }}>{meta.icon}</div>
                          <div>
                            <div className="force-name" style={{ color: isSelected ? meta.color : 'var(--text)' }}>{meta.label}</div>
                          </div>
                        </div>
                        <div className="force-score-row">
                          <div className="mini-bar-track">
                            <div className="mini-bar-fill" style={{ width: `${(score / 5) * 100}%`, background: color }}/>
                          </div>
                          <span className="force-intensity" style={{ color, minWidth: 60 }}>{INTENSITY_LABELS[Math.round(score)]}</span>
                        </div>
                        <div className="force-factors-count">
                          {f.factors?.length || 0} facteur(s) identifié(s)
                          {f.notes && ' · Notes ✓'}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pentagon SVG */}
                {(() => {
                  const forceKeys = ['rivalry', 'newEntrants', 'substitutes', 'suppliers', 'buyers']
                  const cx = 210, cy = 210, r = 160
                  const angles = forceKeys.map((_, i) => (i * 2 * Math.PI / 5) - Math.PI / 2)
                  const scores = forceKeys.map(k => (active.forces?.[k]?.score || 3) / 5)

                  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]
                  const toXY = (angle, ratio) => ({
                    x: cx + r * ratio * Math.cos(angle),
                    y: cy + r * ratio * Math.sin(angle),
                  })

                  const dataPoints = angles.map((a, i) => toXY(a, scores[i]))
                  const dataPath   = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'

                  return (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace', letterSpacing: '.08em', marginBottom: 12 }}>
                        RADAR DES 5 FORCES
                      </div>
                      <svg viewBox="0 0 420 420" style={{ width: '100%', maxWidth: 420, display: 'block', margin: '0 auto' }}>
                        {/* Grid */}
                        {gridLevels.map((lvl, li) => {
                          const pts = angles.map(a => toXY(a, lvl))
                          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'
                          return <path key={li} d={path} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                        })}
                        {/* Spokes */}
                        {angles.map((a, i) => {
                          const end = toXY(a, 1)
                          return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                        })}
                        {/* Data area */}
                        <path d={dataPath} fill="rgba(99,102,241,.15)" stroke="rgba(99,102,241,.6)" strokeWidth="2"/>
                        {/* Data points */}
                        {dataPoints.map((p, i) => (
                          <circle
                            key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="5"
                            fill={INTENSITY_COLORS[Math.round((active.forces?.[forceKeys[i]]?.score || 3))]}
                            stroke="rgba(255,255,255,.2)" strokeWidth="1.5"
                          />
                        ))}
                        {/* Labels */}
                        {angles.map((a, i) => {
                          const meta  = FORCES_META[forceKeys[i]]
                          const lp    = toXY(a, 1.22)
                          const score = active.forces?.[forceKeys[i]]?.score || 3
                          return (
                            <g key={i}>
                              <text x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
                                fill={meta.color} fontSize="16">{meta.icon}</text>
                              <text x={lp.x.toFixed(1)} y={(lp.y + 16).toFixed(1)} textAnchor="middle"
                                fill="rgba(240,239,245,.6)" fontSize="9" fontFamily="'Geist Mono',monospace">
                                {score.toFixed(1)}
                              </text>
                            </g>
                          )
                        })}
                        {/* Center score */}
                        <text x={cx} y={cy - 8} textAnchor="middle" fill="rgba(240,239,245,.9)" fontSize="22"
                          fontFamily="'Instrument Serif',serif" fontStyle="italic">{avg.toFixed(1)}</text>
                        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(240,239,245,.3)" fontSize="9"
                          fontFamily="'Geist Mono',monospace">INTENSITÉ MOY.</text>
                      </svg>
                    </div>
                  )
                })()}
              </>
            )}
          </main>

          {/* ── Right: force editor ── */}
          <aside className="right-panel">
            <div className="panel-header">
              <span className="panel-label">Évaluation</span>
            </div>

            {!active ? (
              <div className="empty-cta"><div className="empty-txt">Sélectionnez une analyse</div></div>
            ) : (
              <div className="right-content">

                {/* Force selector tabs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Object.entries(FORCES_META).map(([key, meta]) => {
                    const score   = active.forces?.[key]?.score || 3
                    const isActive = activeForce === key
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveForce(key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                          borderRadius: 8, border: `1px solid ${isActive ? meta.color + '60' : 'transparent'}`,
                          background: isActive ? meta.bg : 'none', cursor: 'pointer',
                          transition: 'all .15s', textAlign: 'left', width: '100%',
                        }}
                      >
                        <span style={{ color: meta.color, fontSize: 14 }}>{meta.icon}</span>
                        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: isActive ? meta.color : 'var(--muted2)' }}>
                          {meta.label}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', color: INTENSITY_COLORS[Math.round(score)] }}>
                          {score.toFixed(1)}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ height: 1, background: 'var(--border)' }}/>

                {/* Force detail */}
                <div className="force-detail-header">
                  <div className="force-detail-icon" style={{ background: forceMeta.bg, color: forceMeta.color }}>
                    {forceMeta.icon}
                  </div>
                  <div>
                    <div className="force-detail-name" style={{ color: forceMeta.color }}>{forceMeta.label}</div>
                    <div className="force-detail-desc">{forceMeta.description}</div>
                  </div>
                </div>

                {/* Score slider */}
                <div className="score-slider-wrap">
                  <div className="slider-label-row">
                    <span className="slider-value" style={{ color: INTENSITY_COLORS[Math.round(currentForce.score || 3)] }}>
                      {(currentForce.score || 3).toFixed(1)}
                    </span>
                    <span className="slider-intensity" style={{ color: INTENSITY_COLORS[Math.round(currentForce.score || 3)] }}>
                      {INTENSITY_LABELS[Math.round(currentForce.score || 3)]}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="score-range"
                    min="1" max="5" step="0.5"
                    value={currentForce.score || 3}
                    onChange={e => updateForce(activeForce, { score: parseFloat(e.target.value) })}
                    style={{
                      background: `linear-gradient(to right, ${INTENSITY_COLORS[Math.round(currentForce.score || 3)]} ${((currentForce.score || 3) - 1) / 4 * 100}%, var(--surface3) 0%)`
                    }}
                  />
                  <div className="slider-markers">
                    {INTENSITY_LABELS.slice(1).map((l, i) => (
                      <span key={i} className="slider-marker">{l.split(' ')[0]}</span>
                    ))}
                  </div>
                </div>

                {/* Factors */}
                <div className="factors-wrap">
                  <div className="factors-title">Facteurs contributifs</div>
                  <div className="factors-grid">
                    {forceMeta.factors.map(f => {
                      const isOn = (currentForce.factors || []).includes(f)
                      return (
                        <button
                          key={f}
                          className={`factor-chip ${isOn ? 'on' : ''}`}
                          onClick={() => toggleFactor(activeForce, f)}
                        >
                          {isOn ? '✓ ' : ''}{f}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="notes-wrap">
                  <label className="form-label">Notes & observations</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Observations spécifiques à votre marché…"
                    value={currentForce.notes || ''}
                    onChange={e => updateForce(activeForce, { notes: e.target.value })}
                  />
                </div>

              </div>
            )}
          </aside>
        </div>

        {/* ── AI Panel ── */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-panel-header">
            <span className="ai-panel-title">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-content">
            {aiLoading && (
              <div className="ai-loading">
                <div className="spinner"/>
                Analyse en cours par Claude…
              </div>
            )}

            {!aiLoading && !aiResult && active?.aiResult && (() => { setAiResult(active.aiResult); return null })()}

            {aiResult && (
              <>
                {aiResult.synthese && (
                  <div>
                    <div className="ai-section-title">Synthèse stratégique</div>
                    <div className="ai-summary">{aiResult.synthese}</div>
                  </div>
                )}

                {aiResult.forces?.length > 0 && (
                  <div>
                    <div className="ai-section-title">Analyse par force</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {aiResult.forces.map((f, i) => {
                        const meta = FORCES_META[f.key] || { icon: '◉', color: 'var(--muted2)', bg: 'var(--surface3)', label: f.key }
                        return (
                          <div key={i} className="ai-force-item">
                            <span className="ai-force-icon" style={{ color: meta.color }}>{meta.icon}</span>
                            <div>
                              <div className="ai-force-name">{meta.label}</div>
                              <div className="ai-force-text">{f.analyse}</div>
                              <span
                                className="ai-force-action"
                                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
                              >
                                {f.action}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {aiResult.opportunites?.length > 0 && (
                  <div>
                    <div className="ai-section-title">Opportunités</div>
                    <div className="ai-list">
                      {aiResult.opportunites.map((o, i) => (
                        <div key={i} className="ai-list-item">
                          <span className="ai-list-num" style={{ color: '#34d399' }}>↑</span>
                          <span>{o}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.menaces?.length > 0 && (
                  <div>
                    <div className="ai-section-title">Menaces</div>
                    <div className="ai-list">
                      {aiResult.menaces.map((m, i) => (
                        <div key={i} className="ai-list-item">
                          <span className="ai-list-num" style={{ color: '#f87171' }}>↓</span>
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.recommandations?.length > 0 && (
                  <div>
                    <div className="ai-section-title">Recommandations</div>
                    <div className="ai-list">
                      {aiResult.recommandations.map((r, i) => (
                        <div key={i} className="ai-list-item">
                          <span className="ai-list-num">#{i + 1}</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.conclusion && (
                  <div>
                    <div className="ai-section-title">Conclusion</div>
                    <div className="ai-summary" style={{ fontStyle: 'italic', color: 'var(--muted2)' }}>
                      {aiResult.conclusion}
                    </div>
                  </div>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div className="empty-cta">
                <div className="empty-icon">✦</div>
                <div className="empty-txt">
                  Évaluez les 5 forces puis cliquez sur "Analyse IA" pour obtenir des recommandations stratégiques personnalisées.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div className={`toast ${toast.type || ''}`}>
            {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}
