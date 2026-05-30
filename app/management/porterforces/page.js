'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const FORCES_META = {
  rivalry: {
    label: 'Rivalité entre concurrents', icon: '⚔', color: '#f87171',
    bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.25)',
    description: 'Intensité de la compétition entre les acteurs existants',
    factors: ['Nombre élevé de concurrents','Croissance lente du marché','Coûts fixes élevés','Faible différenciation','Barrières à la sortie élevées','Guerres de prix fréquentes'],
  },
  newEntrants: {
    label: 'Nouveaux entrants', icon: '🚪', color: '#fb923c',
    bg: 'rgba(251,146,60,.08)', border: 'rgba(251,146,60,.25)',
    description: "Facilité d'entrée de nouveaux compétiteurs",
    factors: ["Faibles barrières à l'entrée",'Économies d\'échelle inexistantes','Peu de capital requis','Absence de réglementation','Faible fidélisation clients','Accès facile aux technologies'],
  },
  substitutes: {
    label: 'Produits substituts', icon: '🔄', color: '#facc15',
    bg: 'rgba(250,204,21,.08)', border: 'rgba(250,204,21,.25)',
    description: 'Risque de remplacement par des alternatives',
    factors: ['Alternatives nombreuses','Prix des substituts attractifs','Facilité de switching','Performances comparables','Innovation technologique rapide','Changements des habitudes'],
  },
  suppliers: {
    label: 'Pouvoir fournisseurs', icon: '🏭', color: '#34d399',
    bg: 'rgba(52,211,153,.08)', border: 'rgba(52,211,153,.25)',
    description: 'Capacité des fournisseurs à imposer leurs conditions',
    factors: ['Fournisseurs concentrés','Absence d\'alternatives','Coûts de changement élevés','Intégration verticale possible','Matières premières rares','Dépendance technologique'],
  },
  buyers: {
    label: 'Pouvoir acheteurs', icon: '🛒', color: '#818cf8',
    bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.25)',
    description: 'Capacité des clients à influencer les prix et conditions',
    factors: ["Acheteurs concentrés",'Volume d\'achat important','Faible coût de switching','Forte sensibilité aux prix','Produits standardisés','Acheteurs informés'],
  },
}

const INTENSITY_LABELS = ['', 'Très faible', 'Faible', 'Modérée', 'Élevée', 'Très élevée']
const INTENSITY_COLORS = { 1: '#34d399', 2: '#86efac', 3: '#facc15', 4: '#fb923c', 5: '#f87171' }

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const EMPTY_FORCE = { score: 3, factors: [], notes: '', aiSummary: '' }
const DEFAULT_FORCES = () => Object.fromEntries(Object.keys(FORCES_META).map(k => [k, { ...EMPTY_FORCE }]))

// ─── Porter Page ──────────────────────────────────────────────────────────────
export default function PorterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')
  const importRef = useRef(null)

  const [project, setProject] = useState(null)
  const [analyses, setAnalyses] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  // Mode: 'ai-gen' = AI auto-generate from context | 'manual' = manual creation
  const [createMode, setCreateMode] = useState('ai-gen')
  const [newAnalysis, setNewAnalysis] = useState({ name: '', context: '', sector: '' })
  const [activeForce, setActiveForce] = useState('rivalry')

  // AI Generate state
  const [aiGenLoading, setAiGenLoading] = useState(false)
  const [aiGenStep, setAiGenStep] = useState('') // progress message

  // AI Analysis state  
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const [toast, setToast] = useState(null)

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
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          setAiResult(last.aiResult || null)
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), Porter: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const active = analyses.find(a => a.id === activeId) || null

  const updateAnalysis = useCallback((patch) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === activeId ? { ...a, ...patch } : a)
      persist(updated)
      return updated
    })
  }, [activeId, persist])

  // ── CRUD analyses ──
  const createManual = () => {
    if (!newAnalysis.name.trim()) return
    const a = {
      id: uid(), name: newAnalysis.name.trim(),
      context: newAnalysis.context.trim(), sector: newAnalysis.sector.trim(),
      createdAt: new Date().toISOString(), forces: DEFAULT_FORCES(),
      aiResult: null, generatedByAI: false,
    }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowNewForm(false); setNewAnalysis({ name: '', context: '', sector: '' })
    showToast(`Analyse "${a.name}" créée`)
  }

  // ── AI AUTO-GENERATE ──
  const createWithAI = async () => {
    if (!newAnalysis.name.trim() || !newAnalysis.context.trim()) return
    setAiGenLoading(true)
    setAiGenStep('Lecture du contexte…')

    // Create placeholder immediately so user sees progress
    const placeholder = {
      id: uid(), name: newAnalysis.name.trim(),
      context: newAnalysis.context.trim(), sector: newAnalysis.sector.trim(),
      createdAt: new Date().toISOString(), forces: DEFAULT_FORCES(),
      aiResult: null, generatedByAI: true, generating: true,
    }
    const withPlaceholder = [...analyses, placeholder]
    setAnalyses(withPlaceholder)
    setActiveId(placeholder.id)
    persist(withPlaceholder)
    setShowNewForm(false)

    try {
      setAiGenStep('Analyse des 5 forces en cours…')
      const res = await fetch('/api/generer-management/generer-porterforces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          analysisName: newAnalysis.name.trim(),
          context: newAnalysis.context.trim(),
          sector: newAnalysis.sector.trim(),
          projectName: project?.name || '',
          projectTag: project?.tag || newAnalysis.sector.trim(),
          forces: DEFAULT_FORCES(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      setAiGenStep('Positionnement sur la matrice…')
      const generatedForces = data.generatedForces || DEFAULT_FORCES()

      // Update placeholder with real data
      setAnalyses(prev => {
        const updated = prev.map(a => a.id === placeholder.id
          ? { ...a, forces: generatedForces, aiResult: data.result || null, generating: false, generatedByAI: true }
          : a
        )
        persist(updated)
        return updated
      })
      if (data.result) setAiResult(data.result)
      setShowAiPanel(true)
      showToast('Analyse Porter générée par l\'IA ✦')
    } catch (err) {
      // Remove placeholder on error
      setAnalyses(prev => {
        const updated = prev.filter(a => a.id !== placeholder.id)
        persist(updated)
        return updated
      })
      setActiveId(analyses[analyses.length - 1]?.id || null)
      showToast(err.message, 'error')
    }
    setAiGenLoading(false)
    setAiGenStep('')
    setNewAnalysis({ name: '', context: '', sector: '' })
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) {
      const last = updated[updated.length - 1]
      setActiveId(last?.id || null)
      setAiResult(last?.aiResult || null)
    }
    showToast('Analyse supprimée', 'info')
  }

  // ── Force updates ──
  const updateForce = (forceKey, patch) => {
    if (!active) return
    const forces = {
      ...(active.forces || DEFAULT_FORCES()),
      [forceKey]: { ...(active.forces?.[forceKey] || EMPTY_FORCE), ...patch }
    }
    updateAnalysis({ forces })
  }

  const toggleFactor = (forceKey, factor) => {
    const current = active?.forces?.[forceKey]?.factors || []
    const next = current.includes(factor) ? current.filter(f => f !== factor) : [...current, factor]
    updateForce(forceKey, { factors: next })
  }

  // ── Scores ──
  const getAvgScore = (a = active) => {
    if (!a?.forces) return 3
    const scores = Object.values(a.forces).map(f => f.score || 3)
    return scores.reduce((x, y) => x + y, 0) / scores.length
  }

  const getAttractiveness = (avg) => {
    if (avg <= 1.8) return { label: 'Très attractive', color: '#34d399', pct: 90 }
    if (avg <= 2.6) return { label: 'Attractive', color: '#86efac', pct: 70 }
    if (avg <= 3.4) return { label: 'Neutre', color: '#facc15', pct: 50 }
    if (avg <= 4.2) return { label: 'Peu attractive', color: '#fb923c', pct: 30 }
    return { label: 'Non attractive', color: '#f87171', pct: 10 }
  }

  // ── AI Analyse (existing data) ──
  const runAIAnalysis = async () => {
    if (!active) return
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-porterforces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'analyse',
          analysisName: active.name,
          context: active.context,
          sector: active.sector || '',
          forces: active.forces,
          projectName: project?.name || '',
          projectTag: project?.tag || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateAnalysis({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── Export ──
  const exportAnalysis = () => {
    if (!active) return
    const exportData = { ...active, exportedAt: new Date().toISOString(), version: '1.0' }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Porter_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('Analyse exportée')
  }

  // ── Import ──
  const importAnalysis = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.forces || !data.name) throw new Error('Format invalide')
        const imported = {
          ...data,
          id: uid(), // new id to avoid collision
          createdAt: data.createdAt || new Date().toISOString(),
          importedAt: new Date().toISOString(),
        }
        const updated = [...analyses, imported]
        setAnalyses(updated); setActiveId(imported.id)
        setAiResult(imported.aiResult || null)
        persist(updated)
        showToast(`"${imported.name}" importée`)
      } catch {
        showToast('Fichier invalide — format JSON Porter requis', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const avg = getAvgScore()
  const attracts = getAttractiveness(avg)
  const currentForce = active?.forces?.[activeForce] || EMPTY_FORCE
  const forceMeta = FORCES_META[activeForce]

  // ── Pentagon radar SVG ──
  const PentagonRadar = ({ a }) => {
    const forceKeys = ['rivalry', 'newEntrants', 'substitutes', 'suppliers', 'buyers']
    const cx = 200, cy = 200, r = 150
    const angles = forceKeys.map((_, i) => (i * 2 * Math.PI / 5) - Math.PI / 2)
    const scores = forceKeys.map(k => ((a?.forces?.[k]?.score || 3) / 5))
    const toXY = (angle, ratio) => ({ x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) })
    const dataPoints = angles.map((angle, i) => toXY(angle, scores[i]))
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]
    const avgS = getAvgScore(a)
    const att = getAttractiveness(avgS)

    return (
      <svg viewBox="0 0 400 400" style={{ width: '100%', maxWidth: 380, display: 'block', margin: '0 auto' }}>
        {gridLevels.map((lvl, li) => {
          const pts = angles.map(angle => toXY(angle, lvl))
          return <path key={li} d={pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
        })}
        {angles.map((angle, i) => { const end = toXY(angle, 1); return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="rgba(255,255,255,.05)" strokeWidth="1" /> })}
        <path d={dataPath} fill="rgba(99,102,241,.12)" stroke="rgba(99,102,241,.5)" strokeWidth="2" />
        {dataPoints.map((p, i) => {
          const key = forceKeys[i]
          const meta = FORCES_META[key]
          const score = a?.forces?.[key]?.score || 3
          return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="5" fill={INTENSITY_COLORS[Math.round(score)]} stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
        })}
        {angles.map((angle, i) => {
          const meta = FORCES_META[forceKeys[i]]
          const lp = toXY(angle, 1.26)
          const score = a?.forces?.[forceKeys[i]]?.score || 3
          return (
            <g key={i}>
              <text x={lp.x.toFixed(1)} y={(lp.y - 8).toFixed(1)} textAnchor="middle" fill={meta.color} fontSize="16">{meta.icon}</text>
              <text x={lp.x.toFixed(1)} y={(lp.y + 8).toFixed(1)} textAnchor="middle" fill="rgba(240,239,245,.5)" fontSize="9" fontFamily="'Geist Mono',monospace">{score.toFixed(1)}</text>
            </g>
          )
        })}
        <text x={cx} y={cy - 10} textAnchor="middle" fill="rgba(240,239,245,.9)" fontSize="24" fontFamily="'Instrument Serif',serif" fontStyle="italic">{avgS.toFixed(1)}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={att.color} fontSize="9" fontFamily="'Geist Mono',monospace" fontWeight="700">{att.label.toUpperCase()}</text>
      </svg>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0a0f; --surface: #111118; --surface2: #18181f; --surface3: #1e1e28;
          --border: rgba(255,255,255,.07); --border2: rgba(255,255,255,.12);
          --text: #f0eff5; --muted: #6b6a7a; --muted2: #9896aa;
          --accent: #6366f1; --accent2: #818cf8;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
        .root { min-height: 100vh; display: flex; flex-direction: column; }

        /* Topbar */
        .topbar { height: 56px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 12px; position: sticky; top: 0; z-index: 100; }
        .back-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border2); color: var(--muted2); font-family: 'Geist Mono', monospace; font-size: 11px; cursor: pointer; transition: all .15s; }
        .back-btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .topbar-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .topbar-project { font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .topbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }
        .btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 11px; letter-spacing: .04em; border: 1px solid var(--border2); background: var(--surface2); color: var(--muted2); transition: all .15s; }
        .btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .btn.primary:hover { background: #4f52d8; }
        .btn.ai { background: rgba(250,204,21,.08); border-color: rgba(250,204,21,.25); color: #facc15; }
        .btn.ai:hover { background: rgba(250,204,21,.15); }
        .btn.ai-gen { background: rgba(129,140,248,.1); border-color: rgba(129,140,248,.3); color: var(--accent2); }
        .btn.ai-gen:hover { background: rgba(129,140,248,.2); }
        .btn:disabled { opacity: .4; cursor: not-allowed; }

        /* Body */
        .body { flex: 1; display: grid; grid-template-columns: 240px 1fr 340px; height: calc(100vh - 56px); overflow: hidden; }

        /* Left panel */
        .left-panel { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .panel-header { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .panel-label { font-size: 10px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .panel-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
        .analysis-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: all .15s; position: relative; }
        .analysis-item:hover { background: var(--surface2); }
        .analysis-item.active { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.25); }
        .analysis-name { font-size: 12px; font-weight: 600; color: var(--text); display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; }
        .analysis-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 3px; }
        .analysis-del { opacity: 0; background: none; border: none; color: #f87171; cursor: pointer; font-size: 12px; flex-shrink: 0; padding: 0; }
        .analysis-item:hover .analysis-del { opacity: 1; }
        .ai-badge { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(129,140,248,.15); color: var(--accent2); font-family: 'Geist Mono', monospace; font-weight: 700; flex-shrink: 0; }
        .attract-mini { font-size: 9px; font-family: 'Geist Mono', monospace; font-weight: 700; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }

        /* Create form */
        .create-form { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; }
        .mode-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: var(--bg); border-radius: 6px; padding: 3px; border: 1px solid var(--border); }
        .mode-btn { padding: 5px 8px; border-radius: 4px; font-size: 10px; font-family: 'Geist Mono', monospace; font-weight: 700; cursor: pointer; border: none; background: transparent; color: var(--muted2); transition: all .15s; text-align: center; }
        .mode-btn.active { background: var(--surface2); color: var(--text); }
        .input { width: 100%; background: var(--bg); border: 1px solid var(--border2); border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif; font-size: 12px; color: var(--text); outline: none; transition: border-color .15s; }
        .input:focus { border-color: var(--accent); }
        .input::placeholder { color: var(--muted); }
        textarea.input { resize: vertical; min-height: 60px; }
        .form-label { font-size: 10px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 3px; display: block; }
        .ai-gen-hint { font-size: 10px; color: var(--accent2); background: rgba(129,140,248,.07); border: 1px solid rgba(129,140,248,.15); border-radius: 6px; padding: 8px 10px; line-height: 1.5; }

        /* Center panel */
        .center-panel { overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }

        /* Score overview */
        .score-overview { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 20px; }
        .score-big { font-family: 'Instrument Serif', serif; font-size: 48px; font-style: italic; line-height: 1; }
        .score-label { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 4px; letter-spacing: .08em; text-transform: uppercase; }
        .attract-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; font-family: 'Geist Mono', monospace; display: inline-block; margin-top: 8px; }
        .score-bars { flex: 1; display: flex; flex-direction: column; gap: 7px; }
        .score-bar-row { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 3px 6px; border-radius: 5px; transition: background .15s; }
        .score-bar-row:hover { background: var(--surface2); }
        .score-bar-track { flex: 1; height: 4px; background: var(--surface3); border-radius: 2px; overflow: hidden; }
        .score-bar-fill { height: 100%; border-radius: 2px; transition: width .4s ease; }

        /* Forces grid */
        .forces-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .force-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; cursor: pointer; transition: all .15s; display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden; }
        .force-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; opacity: 0; transition: opacity .2s; }
        .force-card:hover { border-color: var(--border2); }
        .force-card:hover::after, .force-card.selected::after { opacity: 1; }
        .force-card-top { display: flex; align-items: center; gap: 10px; }
        .force-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; }
        .force-name { font-size: 12px; font-weight: 700; }
        .force-score-row { display: flex; align-items: center; gap: 8px; }
        .mini-bar-track { flex: 1; height: 4px; background: var(--surface3); border-radius: 2px; overflow: hidden; }
        .mini-bar-fill { height: 100%; border-radius: 2px; transition: width .4s; }
        .force-intensity { font-size: 10px; font-family: 'Geist Mono', monospace; min-width: 62px; }
        .force-meta-row { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .ai-summary-preview { font-size: 10px; color: var(--muted2); line-height: 1.5; font-style: italic; border-top: 1px solid var(--border); padding-top: 8px; }

        /* Radar section */
        .radar-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
        .radar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .radar-title { font-size: 11px; color: var(--muted2); font-family: 'Geist Mono', monospace; letter-spacing: .08em; text-transform: uppercase; }

        /* Generating overlay */
        .generating-banner { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: rgba(129,140,248,.07); border: 1px solid rgba(129,140,248,.2); border-radius: 10px; }
        .gen-spinner { width: 20px; height: 20px; border: 2px solid var(--border2); border-top-color: var(--accent2); border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .gen-step { font-size: 12px; color: var(--accent2); font-family: 'Geist Mono', monospace; }

        /* Right panel */
        .right-panel { background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .right-scroll { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px; }
        .force-selector { display: flex; flex-direction: column; gap: 3px; }
        .force-sel-btn { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 7px; border: 1px solid transparent; background: none; cursor: pointer; text-align: left; width: 100%; transition: all .15s; }
        .force-sel-btn:hover { background: var(--surface2); }
        .force-sel-btn.active { border-color: var(--border2); background: var(--surface2); }
        .sep { height: 1px; background: var(--border); }
        .force-detail-hd { display: flex; align-items: center; gap: 10px; }
        .force-detail-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .force-detail-name { font-size: 13px; font-weight: 700; }
        .force-detail-desc { font-size: 11px; color: var(--muted2); margin-top: 2px; line-height: 1.5; }
        .score-widget { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
        .score-widget-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .score-big-sm { font-family: 'Instrument Serif', serif; font-size: 32px; font-style: italic; }
        .intensity-lbl { font-size: 11px; font-family: 'Geist Mono', monospace; font-weight: 700; }
        input[type=range].score-range { width: 100%; appearance: none; height: 6px; border-radius: 3px; outline: none; cursor: pointer; margin: 6px 0; }
        input[type=range].score-range::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid rgba(255,255,255,.2); }
        .slider-markers { display: flex; justify-content: space-between; margin-top: 3px; }
        .slider-mk { font-size: 9px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .factors-title { font-size: 10px; color: var(--muted2); letter-spacing: .08em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 8px; }
        .factors-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
        .factor-chip { padding: 4px 9px; border-radius: 5px; font-size: 10px; border: 1px solid var(--border2); background: var(--surface2); color: var(--muted2); cursor: pointer; transition: all .15s; font-family: 'Geist Mono', monospace; }
        .factor-chip:hover { color: var(--text); border-color: var(--border2); }
        .factor-chip.on { background: rgba(99,102,241,.12); border-color: rgba(99,102,241,.4); color: var(--accent2); }
        .notes-section { display: flex; flex-direction: column; gap: 5px; }
        .ai-gen-summary { font-size: 11px; color: var(--muted2); line-height: 1.6; padding: 10px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); border-left: 3px solid var(--accent2); }

        /* AI Panel */
        .ai-panel { position: fixed; right: 0; top: 56px; bottom: 0; width: 420px; background: var(--surface); border-left: 1px solid var(--border); z-index: 80; display: flex; flex-direction: column; overflow: hidden; transform: translateX(100%); transition: transform .3s ease; }
        .ai-panel.open { transform: translateX(0); }
        .ai-panel-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .ai-panel-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .ai-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .ai-section-title { font-size: 10px; color: var(--muted2); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 8px; }
        .ai-summary { background: var(--surface2); border: 1px solid var(--border2); border-radius: 10px; padding: 14px; font-size: 13px; color: var(--text); line-height: 1.7; }
        .ai-force-item { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; gap: 10px; }
        .ai-force-icon { font-size: 17px; flex-shrink: 0; margin-top: 1px; }
        .ai-force-name { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
        .ai-force-text { font-size: 12px; color: var(--muted2); line-height: 1.6; }
        .ai-force-action { font-size: 10px; margin-top: 6px; padding: 3px 8px; border-radius: 4px; display: inline-block; font-family: 'Geist Mono', monospace; font-weight: 600; }
        .ai-list { display: flex; flex-direction: column; gap: 5px; }
        .ai-list-item { display: flex; gap: 10px; align-items: flex-start; padding: 8px 12px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); font-size: 12px; color: var(--text); line-height: 1.6; }
        .ai-list-num { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--muted); padding-top: 1px; flex-shrink: 0; }
        .ai-loading { display: flex; align-items: center; gap: 12px; padding: 24px; color: var(--muted2); font-size: 13px; }
        .spinner { width: 18px; height: 18px; border: 2px solid var(--border2); border-top-color: #facc15; border-radius: 50%; animation: spin .7s linear infinite; }

        /* Empty */
        .empty-cta { padding: 40px 20px; text-align: center; }
        .empty-icon { font-size: 40px; opacity: .25; margin-bottom: 14px; }
        .empty-txt { font-size: 13px; color: var(--muted); line-height: 1.6; }

        /* Toast */
        .toast { position: fixed; bottom: 24px; right: 24px; z-index: 500; background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px; padding: 12px 18px; font-size: 13px; box-shadow: 0 8px 32px rgba(0,0,0,.4); animation: slideUp .2s ease; display: flex; align-items: center; gap: 8px; }
        .toast.error { border-color: rgba(248,113,113,.3); color: #f87171; }
        .toast.info { border-color: rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        @media (max-width: 1100px) { .body { grid-template-columns: 220px 1fr; } .right-panel { display: none; } }
        @media (max-width: 700px) { .body { grid-template-columns: 1fr; } .left-panel { display: none; } .forces-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importAnalysis} />

      <div className="root">

        {/* Topbar */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="topbar-title">Porter's 5 Forces</div>
            {project && <div className="topbar-project">{project.name}</div>}
          </div>
          <div className="topbar-right">
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
            {active && (
              <>
                <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>
                <button className="btn ai" onClick={runAIAnalysis} disabled={aiLoading || active?.generating}>
                  {aiLoading ? <><span className="spinner" />Analyse…</> : '✦ Analyse IA'}
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
                  <div className="empty-icon">⚔</div>
                  <div className="empty-txt">Créez votre première analyse Porter</div>
                </div>
              )}
              {analyses.map(a => {
                const aAvg = getAvgScore(a)
                const aAtt = getAttractiveness(aAvg)
                return (
                  <div
                    key={a.id}
                    className={`analysis-item ${activeId === a.id ? 'active' : ''}`}
                    onClick={() => { setActiveId(a.id); setAiResult(a.aiResult || null) }}
                  >
                    <div className="analysis-name">
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                        {a.generatedByAI && <span className="ai-badge">IA</span>}
                        <button className="analysis-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                      </div>
                    </div>
                    <div className="analysis-meta">
                      {a.generating ? '⟳ Génération en cours…' : new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      {a.importedAt && ' · Importée'}
                    </div>
                    {!a.generating && (
                      <span className="attract-mini" style={{ background: `color-mix(in srgb, ${aAtt.color} 15%, transparent)`, color: aAtt.color }}>
                        {aAvg.toFixed(1)} — {aAtt.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {showNewForm ? (
              <div className="create-form">
                <div className="mode-toggle">
                  <button className={`mode-btn ${createMode === 'ai-gen' ? 'active' : ''}`} onClick={() => setCreateMode('ai-gen')}>✦ IA Auto</button>
                  <button className={`mode-btn ${createMode === 'manual' ? 'active' : ''}`} onClick={() => setCreateMode('manual')}>✎ Manuel</button>
                </div>

                <div>
                  <label className="form-label">Nom de l'analyse</label>
                  <input className="input" placeholder="Ex: Marché SaaS B2B" value={newAnalysis.name}
                    onChange={e => setNewAnalysis(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && createMode === 'manual' && createManual()} autoFocus />
                </div>
                <div>
                  <label className="form-label">{createMode === 'ai-gen' ? 'Description du projet / marché *' : 'Contexte (optionnel)'}</label>
                  <textarea className="input" rows={createMode === 'ai-gen' ? 4 : 2}
                    placeholder={createMode === 'ai-gen'
                      ? "Décrivez votre activité, votre marché cible, vos produits/services, vos principaux concurrents… Plus c'est précis, meilleure sera l'analyse IA."
                      : "Secteur, marché cible…"}
                    value={newAnalysis.context}
                    onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Secteur d'activité</label>
                  <input className="input" placeholder="Ex: Fintech, Retail, SaaS…" value={newAnalysis.sector}
                    onChange={e => setNewAnalysis(p => ({ ...p, sector: e.target.value }))} />
                </div>

                {createMode === 'ai-gen' && (
                  <div className="ai-gen-hint">
                    ✦ L'IA va automatiquement évaluer les 5 forces, identifier les facteurs pertinents et positionner chaque force sur la matrice.
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6 }}>
                  {createMode === 'ai-gen' ? (
                    <button className="btn ai-gen" style={{ flex: 1, justifyContent: 'center' }}
                      onClick={createWithAI}
                      disabled={aiGenLoading || !newAnalysis.name.trim() || !newAnalysis.context.trim()}>
                      {aiGenLoading ? <><span className="spinner" style={{ borderTopColor: 'var(--accent2)' }} />{aiGenStep || 'Génération…'}</> : '✦ Générer avec l\'IA'}
                    </button>
                  ) : (
                    <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={createManual}>
                      Créer
                    </button>
                  )}
                  <button className="btn" onClick={() => { setShowNewForm(false); setNewAnalysis({ name: '', context: '', sector: '' }) }}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>+ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* Center panel */}
          <main className="center-panel">
            {!active ? (
              <div className="empty-cta" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div className="empty-icon" style={{ fontSize: 52, marginBottom: 16 }}>⚔</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, fontStyle: 'italic', marginBottom: 8 }}>Sélectionnez ou créez une analyse</div>
                <div className="empty-txt">Utilisez le mode IA pour générer automatiquement toute l'analyse à partir d'un contexte, ou créez manuellement.</div>
              </div>
            ) : (
              <>
                {/* Title */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, fontStyle: 'italic' }}>{active.name}</h2>
                    {active.generatedByAI && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(129,140,248,.12)', color: 'var(--accent2)', fontFamily: 'Geist Mono,monospace', fontWeight: 700 }}>Généré par IA</span>}
                  </div>
                  {active.context && <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 6, lineHeight: 1.6 }}>{active.context.slice(0, 200)}{active.context.length > 200 ? '…' : ''}</p>}
                  {active.sector && <span style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', color: 'var(--accent2)', marginTop: 4, display: 'inline-block' }}>Secteur : {active.sector}</span>}
                </div>

                {/* Generating banner */}
                {active.generating && (
                  <div className="generating-banner">
                    <div className="gen-spinner" />
                    <div>
                      <div className="gen-step">{aiGenStep || 'Génération en cours…'}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>L'IA analyse votre marché et positionne les 5 forces…</div>
                    </div>
                  </div>
                )}

                {!active.generating && (
                  <>
                    {/* Score overview */}
                    <div className="score-overview">
                      <div>
                        <div className="score-big" style={{ color: attracts.color }}>{avg.toFixed(1)}</div>
                        <div className="score-label">Intensité moyenne /5</div>
                        <div className="attract-badge" style={{ background: `color-mix(in srgb, ${attracts.color} 12%, transparent)`, color: attracts.color, border: `1px solid color-mix(in srgb, ${attracts.color} 35%, transparent)` }}>
                          {attracts.label}
                        </div>
                      </div>
                      <div className="score-bars">
                        {Object.entries(FORCES_META).map(([key, meta]) => {
                          const score = active.forces?.[key]?.score || 3
                          const color = INTENSITY_COLORS[Math.round(score)]
                          return (
                            <div key={key} className="score-bar-row" onClick={() => setActiveForce(key)}>
                              <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{meta.icon}</span>
                              <div className="score-bar-track">
                                <div className="score-bar-fill" style={{ width: `${(score / 5) * 100}%`, background: color }} />
                              </div>
                              <span style={{ fontSize: 10, color: 'var(--muted2)', fontFamily: 'Geist Mono,monospace', width: 24, textAlign: 'right', flexShrink: 0 }}>{score.toFixed(1)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Forces grid */}
                    <div className="forces-grid">
                      {Object.entries(FORCES_META).map(([key, meta]) => {
                        const f = active.forces?.[key] || EMPTY_FORCE
                        const score = f.score || 3
                        const color = INTENSITY_COLORS[Math.round(score)]
                        const isSelected = activeForce === key
                        return (
                          <div
                            key={key}
                            className={`force-card ${isSelected ? 'selected' : ''}`}
                            style={{ borderColor: isSelected ? meta.color : undefined, background: isSelected ? meta.bg : undefined }}
                            onClick={() => setActiveForce(key)}
                          >
                            <div className="force-card-top">
                              <div className="force-icon" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>{meta.icon}</div>
                              <div className="force-name" style={{ color: isSelected ? meta.color : 'var(--text)' }}>{meta.label}</div>
                            </div>
                            <div className="force-score-row">
                              <div className="mini-bar-track">
                                <div className="mini-bar-fill" style={{ width: `${(score / 5) * 100}%`, background: color }} />
                              </div>
                              <span className="force-intensity" style={{ color }}>{INTENSITY_LABELS[Math.round(score)]}</span>
                            </div>
                            <div className="force-meta-row">
                              <span>{f.factors?.length || 0} facteur(s)</span>
                              {f.notes && <span>Notes ✓</span>}
                            </div>
                            {f.aiSummary && (
                              <div className="ai-summary-preview">{f.aiSummary.slice(0, 80)}…</div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Pentagon radar */}
                    <div className="radar-section">
                      <div className="radar-header">
                        <span className="radar-title">Radar des 5 Forces</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace' }}>
                          Attractivité inversement proportionnelle à l'intensité
                        </span>
                      </div>
                      <PentagonRadar a={active} />
                    </div>
                  </>
                )}
              </>
            )}
          </main>

          {/* Right panel: force editor */}
          <aside className="right-panel">
            <div className="panel-header">
              <span className="panel-label">Évaluation de la force</span>
            </div>
            {!active ? (
              <div className="empty-cta"><div className="empty-txt">Sélectionnez une analyse</div></div>
            ) : (
              <div className="right-scroll">
                {/* Force selector */}
                <div className="force-selector">
                  {Object.entries(FORCES_META).map(([key, meta]) => {
                    const score = active.forces?.[key]?.score || 3
                    const isActive = activeForce === key
                    return (
                      <button key={key} className={`force-sel-btn ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveForce(key)}
                        style={isActive ? { borderColor: `color-mix(in srgb, ${meta.color} 40%, transparent)`, background: meta.bg } : {}}>
                        <span style={{ color: meta.color, fontSize: 14 }}>{meta.icon}</span>
                        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: isActive ? meta.color : 'var(--muted2)' }}>{meta.label}</span>
                        <span style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', color: INTENSITY_COLORS[Math.round(score)] }}>{score.toFixed(1)}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="sep" />

                {/* Active force detail */}
                <div className="force-detail-hd">
                  <div className="force-detail-icon" style={{ background: forceMeta.bg, border: `1px solid ${forceMeta.border}` }}>{forceMeta.icon}</div>
                  <div>
                    <div className="force-detail-name" style={{ color: forceMeta.color }}>{forceMeta.label}</div>
                    <div className="force-detail-desc">{forceMeta.description}</div>
                  </div>
                </div>

                {/* AI-generated summary for this force */}
                {currentForce.aiSummary && (
                  <div>
                    <div className="form-label">Analyse IA générée</div>
                    <div className="ai-gen-summary">{currentForce.aiSummary}</div>
                  </div>
                )}

                {/* Score widget */}
                <div className="score-widget">
                  <div className="score-widget-top">
                    <span className="score-big-sm" style={{ color: INTENSITY_COLORS[Math.round(currentForce.score || 3)] }}>
                      {(currentForce.score || 3).toFixed(1)}
                    </span>
                    <span className="intensity-lbl" style={{ color: INTENSITY_COLORS[Math.round(currentForce.score || 3)] }}>
                      {INTENSITY_LABELS[Math.round(currentForce.score || 3)]}
                    </span>
                  </div>
                  <input type="range" className="score-range" min="1" max="5" step="0.5"
                    value={currentForce.score || 3}
                    onChange={e => updateForce(activeForce, { score: parseFloat(e.target.value) })}
                    style={{ background: `linear-gradient(to right, ${INTENSITY_COLORS[Math.round(currentForce.score || 3)]} ${((currentForce.score || 3) - 1) / 4 * 100}%, var(--surface3) 0%)` }}
                  />
                  <div className="slider-markers">
                    {['Très faible', 'Faible', 'Modérée', 'Élevée', 'Très élevée'].map((l, i) => (
                      <span key={i} className="slider-mk">{l.split(' ')[0]}</span>
                    ))}
                  </div>
                </div>

                {/* Factors */}
                <div>
                  <div className="factors-title">Facteurs contributifs</div>
                  <div className="factors-wrap">
                    {forceMeta.factors.map(f => {
                      const isOn = (currentForce.factors || []).includes(f)
                      return (
                        <button key={f} className={`factor-chip ${isOn ? 'on' : ''}`} onClick={() => toggleFactor(activeForce, f)}>
                          {isOn ? '✓ ' : ''}{f}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="notes-section">
                  <label className="form-label">Notes & observations</label>
                  <textarea className="input" rows={3} placeholder="Observations spécifiques à votre marché…"
                    value={currentForce.notes || ''}
                    onChange={e => updateForce(activeForce, { notes: e.target.value })} />
                </div>

                <div style={{ height: 8 }} />
              </div>
            )}
          </aside>
        </div>

        {/* AI Panel */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-panel-header">
            <span className="ai-panel-title">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-content">
            {aiLoading && (
              <div className="ai-loading">
                <div className="spinner" />
                Analyse en cours par Claude…
              </div>
            )}

            {aiResult && !aiLoading && (
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
                              <span className="ai-force-action" style={{ background: meta.bg, color: meta.color, border: `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)` }}>
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
                    <div className="ai-section-title">Recommandations stratégiques</div>
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
                    <div className="ai-summary" style={{ fontStyle: 'italic', color: 'var(--muted2)' }}>{aiResult.conclusion}</div>
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

        {/* Toast */}
        {toast && (
          <div className={`toast ${toast.type || ''}`}>
            {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}