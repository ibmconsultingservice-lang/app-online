'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const DIMENSIONS = [
  {
    id:       'political',
    label:    'Politique',
    letter:   'P',
    color:    '#6366f1',
    bg:       'rgba(99,102,241,.08)',
    border:   'rgba(99,102,241,.25)',
    icon:     '⬡',
    desc:     'Stabilité gouvernementale, réglementation, fiscalité, politique commerciale, lobbying',
    examples: ['Politique fiscale', 'Réglementation sectorielle', 'Stabilité politique', 'Commerce international', 'Subventions publiques'],
  },
  {
    id:       'economic',
    label:    'Économique',
    letter:   'E',
    color:    '#22d3a5',
    bg:       'rgba(34,211,165,.08)',
    border:   'rgba(34,211,165,.25)',
    icon:     '◎',
    desc:     'Croissance économique, inflation, taux d\'intérêt, chômage, pouvoir d\'achat',
    examples: ['Taux de croissance PIB', 'Inflation', 'Taux de chômage', 'Taux d\'intérêt', 'Taux de change'],
  },
  {
    id:       'social',
    label:    'Social',
    letter:   'S',
    color:    '#f59e0b',
    bg:       'rgba(245,158,11,.08)',
    border:   'rgba(245,158,11,.25)',
    icon:     '◈',
    desc:     'Démographie, culture, éducation, style de vie, tendances sociales',
    examples: ['Tendances démographiques', 'Évolution culturelle', 'Niveau d\'éducation', 'Style de vie', 'Opinion publique'],
  },
  {
    id:       'technological',
    label:    'Technologique',
    letter:   'T',
    color:    '#818cf8',
    bg:       'rgba(129,140,248,.08)',
    border:   'rgba(129,140,248,.25)',
    icon:     '◉',
    desc:     'Innovation, R&D, automatisation, cybersécurité, maturité technologique',
    examples: ['Intelligence artificielle', 'Automatisation', 'Cybersécurité', 'Maturité digitale', 'Brevets & R&D'],
  },
  {
    id:       'environmental',
    label:    'Environnemental',
    letter:   'E',
    color:    '#4ade80',
    bg:       'rgba(74,222,128,.08)',
    border:   'rgba(74,222,128,.25)',
    icon:     '⬠',
    desc:     'Changement climatique, réglementation écologique, ressources naturelles, empreinte carbone',
    examples: ['Réglementation carbone', 'Énergie renouvelable', 'Gestion des déchets', 'Changement climatique', 'Biodiversité'],
  },
  {
    id:       'legal',
    label:    'Légal',
    letter:   'L',
    color:    '#f87171',
    bg:       'rgba(248,113,113,.08)',
    border:   'rgba(248,113,113,.25)',
    icon:     '⊟',
    desc:     'Droit du travail, propriété intellectuelle, protection des données, normes, litiges',
    examples: ['RGPD / Protection données', 'Droit du travail', 'Propriété intellectuelle', 'Normes qualité', 'Réglementation concurrence'],
  },
]

const IMPACT_LEVELS = {
  high:    { label: 'Fort',   score: 3, color: '#f87171', bg: 'rgba(248,113,113,.1)' },
  medium:  { label: 'Moyen',  score: 2, color: '#f59e0b', bg: 'rgba(245,158,11,.1)'  },
  low:     { label: 'Faible', score: 1, color: '#22d3a5', bg: 'rgba(34,211,165,.1)'  },
}

const NATURE_OPTIONS = {
  opportunity: { label: 'Opportunité', color: '#22d3a5', icon: '↑' },
  threat:      { label: 'Menace',      color: '#f87171', icon: '↓' },
  neutral:     { label: 'Neutre',      color: '#9896aa', icon: '→' },
}

const TIMEFRAME_OPTIONS = {
  short:  { label: 'Court terme',  sub: '< 1 an' },
  medium: { label: 'Moyen terme',  sub: '1-3 ans' },
  long:   { label: 'Long terme',   sub: '> 3 ans' },
}

const EMPTY_FACTOR = { title: '', description: '', impact: 'medium', nature: 'neutral', timeframe: 'medium', source: '' }

// ─── PESTEL Page ──────────────────────────────────────────────────────────────
export default function PESTELPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,      setProject]      = useState(null)
  const [analyses,     setAnalyses]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [newAnalysis,  setNewAnalysis]  = useState({ name: '', industry: '', geography: '' })

  // Active dimension view
  const [activeDim,    setActiveDim]    = useState('political')

  // Factor form
  const [showFactorForm, setShowFactorForm] = useState(false)
  const [editFactor,     setEditFactor]     = useState(null)
  const [factorForm,     setFactorForm]     = useState(EMPTY_FACTOR)

  // View mode
  const [viewMode,     setViewMode]     = useState('grid')   // 'grid' | 'radar' | 'table'

  // AI
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiResult,     setAiResult]     = useState(null)
  const [showAiPanel,  setShowAiPanel]  = useState(false)

  const [toast,        setToast]        = useState(null)

  // ── Load ──
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.PESTEL || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          setAiResult(last.aiResult || null)
        }
      }
    } catch {}
  }, [projectId])

  // ── Persist ──
  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), PESTEL: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const active = analyses.find(a => a.id === activeId) || null

  const updateActive = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated); persist(updated)
  }

  // ── CRUD analyses ──
  const createAnalysis = () => {
    if (!newAnalysis.name.trim()) return
    const a = {
      id: uid(), name: newAnalysis.name.trim(),
      industry: newAnalysis.industry.trim(),
      geography: newAnalysis.geography.trim(),
      createdAt: new Date().toISOString(),
      factors: {}, // dimensionId → [factor]
      aiResult: null,
    }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowNewForm(false); setNewAnalysis({ name: '', industry: '', geography: '' })
    showToast(`Analyse "${a.name}" créée`)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) setActiveId(updated[updated.length - 1]?.id || null)
    showToast('Analyse supprimée', 'info')
  }

  // ── CRUD factors ──
  const getDimFactors = (dimId) => active?.factors?.[dimId] || []

  const saveFactor = () => {
    if (!factorForm.title.trim()) return
    const factor = { id: editFactor?.id || uid(), ...factorForm }
    const dimFactors = getDimFactors(activeDim)
    const updated = editFactor
      ? dimFactors.map(f => f.id === editFactor.id ? factor : f)
      : [...dimFactors, factor]
    updateActive({ factors: { ...(active.factors || {}), [activeDim]: updated } })
    setShowFactorForm(false); setEditFactor(null); setFactorForm(EMPTY_FACTOR)
    showToast(editFactor ? 'Facteur mis à jour' : 'Facteur ajouté')
  }

  const deleteFactor = (dimId, factorId) => {
    const updated = getDimFactors(dimId).filter(f => f.id !== factorId)
    updateActive({ factors: { ...(active.factors || {}), [dimId]: updated } })
  }

  const startEdit = (factor) => {
    setEditFactor(factor)
    setFactorForm({ title: factor.title, description: factor.description || '', impact: factor.impact, nature: factor.nature, timeframe: factor.timeframe, source: factor.source || '' })
    setShowFactorForm(true)
  }

  // ── Stats ──
  const totalFactors    = DIMENSIONS.reduce((s, d) => s + getDimFactors(d.id).length, 0)
  const totalOpportunities = DIMENSIONS.reduce((s, d) => s + getDimFactors(d.id).filter(f => f.nature === 'opportunity').length, 0)
  const totalThreats    = DIMENSIONS.reduce((s, d) => s + getDimFactors(d.id).filter(f => f.nature === 'threat').length, 0)
  const highImpact      = DIMENSIONS.reduce((s, d) => s + getDimFactors(d.id).filter(f => f.impact === 'high').length, 0)

  const dimScore = (dimId) => {
    const factors = getDimFactors(dimId)
    if (!factors.length) return 0
    return Math.round(factors.reduce((s, f) => s + (IMPACT_LEVELS[f.impact]?.score || 1), 0) / factors.length * 33.3)
  }

  // ── Export ──
  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `PESTEL_${active.name.replace(/\s+/g, '_')}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── AI ──
  const runAI = async () => {
    if (!totalFactors) { showToast('Ajoutez des facteurs d\'abord', 'error'); return }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res  = await fetch('/api/generer-management/generer-pestel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: active.name,
          industry:     active.industry,
          geography:    active.geography,
          factors:      active.factors,
          projectName:  project?.name || '',
          projectTag:   project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateActive({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── Radar chart (pure SVG) ──
  const RadarChart = () => {
    const cx = 180, cy = 180, r = 130
    const scores = DIMENSIONS.map(d => ({ ...d, score: dimScore(d.id) / 100 }))
    const angleStep = (2 * Math.PI) / 6
    const pts = scores.map((d, i) => {
      const angle = i * angleStep - Math.PI / 2
      return { x: cx + r * d.score * Math.cos(angle), y: cy + r * d.score * Math.sin(angle), ...d }
    })
    const gridLevels = [0.25, 0.5, 0.75, 1]
    return (
      <svg viewBox="0 0 360 360" style={{ width:'100%', maxWidth:340, margin:'0 auto', display:'block' }}>
        {/* Grid rings */}
        {gridLevels.map(level => (
          <polygon key={level} points={DIMENSIONS.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2
            return `${cx + r * level * Math.cos(angle)},${cy + r * level * Math.sin(angle)}`
          }).join(' ')}
          fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
        ))}
        {/* Axis lines */}
        {DIMENSIONS.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2
          return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
        })}
        {/* Data polygon */}
        <polygon points={pts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(99,102,241,.15)" stroke="#6366f1" strokeWidth="2"/>
        {/* Data points */}
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill={p.color} stroke="var(--surface)" strokeWidth="2"/>)}
        {/* Labels */}
        {DIMENSIONS.map((d, i) => {
          const angle  = i * angleStep - Math.PI / 2
          const lx     = cx + (r + 22) * Math.cos(angle)
          const ly     = cy + (r + 22) * Math.sin(angle)
          const score  = dimScore(d.id)
          return (
            <g key={d.id}>
              <text x={lx} y={ly - 5} textAnchor="middle" fill={d.color} fontSize="12" fontWeight="700" fontFamily="Geist Mono, monospace">{d.letter}</text>
              <text x={lx} y={ly + 9} textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="9" fontFamily="Geist Mono, monospace">{score}%</text>
            </g>
          )
        })}
      </svg>
    )
  }

  const currentDim = DIMENSIONS.find(d => d.id === activeDim)

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
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

        .root { min-height:100vh; display:flex; flex-direction:column; }

        /* Topbar */
        .topbar { height:56px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 20px; gap:12px; position:sticky; top:0; z-index:100; }
        .back-btn { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s; }
        .back-btn:hover { color:var(--text); }
        .topbar-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .topbar-sub { font-size:11px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .topbar-right { margin-left:auto; display:flex; gap:8px; align-items:center; }
        .btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .btn:hover { color:var(--text); border-color:rgba(255,255,255,.2); }
        .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
        .btn.primary:hover { background:#4f52d8; }
        .btn.ai { background:rgba(129,140,248,.1); border-color:rgba(129,140,248,.3); color:var(--accent2); }
        .btn.ai:hover { background:rgba(129,140,248,.2); }
        .btn.active { background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.3); color:var(--accent2); }
        .btn:disabled { opacity:.4; cursor:not-allowed; }

        /* Layout */
        .body { flex:1; display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 56px); overflow:hidden; }

        /* Left panel */
        .left-panel { background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
        .panel-hd { padding:14px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .panel-label { font-size:10px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .panel-list { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:2px; }
        .a-item { padding:10px 12px; border-radius:8px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
        .a-item:hover { background:var(--surface2); }
        .a-item.active { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.25); }
        .a-name { font-size:12px; font-weight:600; color:var(--text); display:flex; align-items:center; justify-content:space-between; }
        .a-del { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; }
        .a-item:hover .a-del { opacity:1; }
        .a-meta { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:2px; }
        .new-form { padding:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px; }
        .inp { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:8px 10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--text); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--accent); }
        .inp::placeholder { color:var(--muted); }
        .form-label { display:block; font-size:10px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; margin-bottom:5px; font-family:'Geist Mono',monospace; }

        /* Main */
        .main { overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px; }

        /* Stats row */
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px 16px; }
        .stat-val { font-size:28px; font-weight:800; font-family:'Geist Mono',monospace; }
        .stat-lbl { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; margin-top:4px; font-family:'Geist Mono',monospace; }

        /* Dimension tabs */
        .dim-tabs { display:flex; gap:6px; flex-wrap:wrap; }
        .dim-tab { padding:8px 14px; border-radius:8px; cursor:pointer; border:1px solid var(--border2); background:var(--surface2); transition:all .15s; display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; }
        .dim-tab:hover { border-color:var(--border2); }
        .dim-tab-letter { width:22px; height:22px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; font-family:'Geist Mono',monospace; }
        .dim-tab-count { font-size:10px; font-family:'Geist Mono',monospace; opacity:.7; }

        /* Content area: depends on view mode */
        /* Grid view */
        .pestel-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:14px; }
        .dim-section { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
        .dim-section-hd { padding:14px 16px; display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--border); }
        .dim-badge { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; flex-shrink:0; }
        .dim-section-name { font-size:13px; font-weight:700; }
        .dim-section-count { font-size:10px; font-family:'Geist Mono',monospace; margin-left:auto; }
        .dim-factor-list { padding:10px; display:flex; flex-direction:column; gap:6px; }
        .factor-card { padding:10px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface2); transition:border-color .15s; }
        .factor-card:hover { border-color:var(--border2); }
        .factor-header { display:flex; align-items:flex-start; gap:8px; margin-bottom:4px; }
        .factor-nature-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:3px; }
        .factor-title { font-size:12px; font-weight:600; flex:1; color:var(--text); }
        .factor-actions { display:flex; gap:2px; }
        .icon-btn { width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:11px; color:var(--muted2); transition:all .15s; }
        .icon-btn:hover { background:var(--surface3); color:var(--text); }
        .factor-desc { font-size:11px; color:var(--muted2); margin-bottom:6px; line-height:1.5; }
        .factor-chips { display:flex; gap:5px; flex-wrap:wrap; }
        .chip { padding:2px 7px; border-radius:4px; font-size:10px; font-family:'Geist Mono',monospace; }
        .dim-add-btn { margin:0 10px 10px; border:1px dashed var(--border2); border-radius:8px; padding:8px; text-align:center; cursor:pointer; color:var(--muted); font-size:11px; transition:all .15s; font-family:'Geist Mono',monospace; }
        .dim-add-btn:hover { border-color:var(--accent); color:var(--accent); }

        /* Single dim view (when a tab is active) */
        .single-dim { display:flex; flex-direction:column; gap:14px; }
        .single-dim-hd { display:flex; align-items:center; gap:12px; padding:18px 20px; border-radius:12px; border:1px solid; }
        .single-dim-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; }
        .single-dim-title { font-size:18px; font-weight:700; }
        .single-dim-desc { font-size:12px; color:var(--muted2); margin-top:2px; line-height:1.5; }
        .example-chips { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
        .example-chip { padding:3px 8px; border-radius:4px; font-size:10px; font-family:'Geist Mono',monospace; background:var(--surface3); color:var(--muted2); border:1px solid var(--border); cursor:pointer; transition:all .15s; }
        .example-chip:hover { color:var(--text); border-color:var(--border2); }

        /* Factor detail card (single dim view) */
        .factor-detail { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px 16px; display:flex; gap:12px; transition:border-color .15s; }
        .factor-detail:hover { border-color:var(--border2); }
        .factor-detail-left { display:flex; flex-direction:column; align-items:center; gap:6px; }
        .nature-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; }
        .impact-dot { width:8px; height:8px; border-radius:50%; }
        .factor-detail-content { flex:1; min-width:0; }
        .factor-detail-title { font-size:13px; font-weight:700; margin-bottom:4px; }
        .factor-detail-desc { font-size:12px; color:var(--muted2); line-height:1.6; margin-bottom:8px; }
        .factor-detail-meta { display:flex; gap:6px; flex-wrap:wrap; }

        /* Table view */
        .pestel-table { width:100%; border-collapse:collapse; }
        .pestel-table th { padding:10px 14px; text-align:left; font-size:10px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; border-bottom:1px solid var(--border2); }
        .pestel-table td { padding:10px 14px; font-size:12px; border-bottom:1px solid var(--border); vertical-align:top; }
        .pestel-table tr:hover td { background:var(--surface2); }

        /* Radar view */
        .radar-wrap { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:24px; display:flex; flex-direction:column; align-items:center; gap:16px; }

        /* Factor form modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:200; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
        .modal { background:var(--surface); border:1px solid var(--border2); border-radius:16px; padding:26px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,.5); }
        .modal-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; margin-bottom:18px; }
        .form-group { margin-bottom:14px; }
        .form-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .seg-group { display:flex; gap:4px; flex-wrap:wrap; }
        .seg-btn { padding:6px 12px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .seg-btn.sel { background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.35); color:var(--accent2); }
        .modal-actions { display:flex; gap:8px; margin-top:16px; }
        .btn-full { flex:1; padding:10px; border-radius:8px; cursor:pointer; background:var(--accent); border:none; color:#fff; font-family:'Syne',sans-serif; font-size:13px; font-weight:600; }
        .btn-full:hover { background:#4f52d8; }
        .btn-cancel { padding:10px 16px; border-radius:8px; cursor:pointer; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Syne',sans-serif; font-size:13px; }

        /* AI Panel */
        .ai-panel { position:fixed; right:0; top:56px; bottom:0; width:420px; background:var(--surface); border-left:1px solid var(--border); z-index:80; display:flex; flex-direction:column; overflow:hidden; transform:translateX(100%); transition:transform .3s ease; }
        .ai-panel.open { transform:translateX(0); }
        .ai-panel-hd { padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .ai-panel-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .ai-content { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
        .ai-slbl { font-size:10px; color:var(--muted2); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:8px; }
        .ai-block { background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:14px; font-size:13px; color:var(--text); line-height:1.7; }
        .ai-dim-card { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; gap:10px; }
        .ai-dim-letter { width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; font-family:'Geist Mono',monospace; flex-shrink:0; }
        .ai-dim-content { flex:1; min-width:0; }
        .ai-dim-name { font-size:11px; font-weight:700; margin-bottom:3px; }
        .ai-dim-text { font-size:11px; color:var(--muted2); line-height:1.6; }
        .ai-priority-item { display:flex; gap:10px; padding:8px 12px; background:var(--surface2); border:1px solid var(--border); border-radius:6px; }
        .ai-priority-num { font-family:'Geist Mono',monospace; font-size:10px; color:var(--muted); min-width:20px; }
        .spinner { width:18px; height:18px; border:2px solid var(--border2); border-top-color:var(--accent2); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .empty-cta { padding:32px; text-align:center; }
        .empty-icon { font-size:32px; opacity:.25; margin-bottom:10px; }
        .empty-txt { font-size:13px; color:var(--muted); line-height:1.6; }
        .toast { position:fixed; bottom:24px; right:24px; z-index:500; background:var(--surface2); border:1px solid var(--border2); border-radius:8px; padding:12px 18px; font-size:13px; box-shadow:0 8px 32px rgba(0,0,0,.4); animation:slideUp .2s ease; display:flex; align-items:center; gap:8px; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info  { border-color:rgba(99,102,241,.3); }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        @media(max-width:900px){ .body{grid-template-columns:1fr;} .left-panel{display:none;} .stats-row{grid-template-columns:repeat(2,1fr);} }
      `}</style>

      <div className="root">

        {/* Topbar */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="topbar-title">PESTEL Analysis</div>
            {project && <div className="topbar-sub">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {active && <>
              <div style={{display:'flex', gap:4}}>
                {[{id:'grid',icon:'⊞'},{id:'radar',icon:'◎'},{id:'table',icon:'≡'}].map(v => (
                  <button key={v.id} className={`btn ${viewMode===v.id?'active':''}`} style={{padding:'6px 10px'}} onClick={() => setViewMode(v.id)}>{v.icon}</button>
                ))}
              </div>
              <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>
              <button className="btn ai" onClick={runAI} disabled={aiLoading || !totalFactors}>
                {aiLoading ? <><span className="spinner"/>Analyse…</> : '✦ Analyse IA'}
              </button>
            </>}
          </div>
        </header>

        <div className="body">

          {/* Left panel */}
          <aside className="left-panel">
            <div className="panel-hd"><span className="panel-label">Analyses ({analyses.length})</span></div>
            <div className="panel-list">
              {analyses.length === 0 && <div className="empty-cta"><div className="empty-icon">⬡</div><div className="empty-txt">Créez votre première analyse PESTEL</div></div>}
              {analyses.map(a => (
                <div key={a.id} className={`a-item ${activeId===a.id?'active':''}`} onClick={() => { setActiveId(a.id); setAiResult(a.aiResult||null) }}>
                  <div className="a-name">
                    <span>{a.name}</span>
                    <button className="a-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  </div>
                  <div className="a-meta">
                    {Object.values(a.factors||{}).reduce((s,arr)=>s+arr.length,0)} facteur(s)
                    {a.industry && ` · ${a.industry}`}
                  </div>
                </div>
              ))}
            </div>
            {showNewForm ? (
              <div className="new-form">
                <span className="form-label">Nom de l'analyse</span>
                <input className="inp" placeholder="Ex: PESTEL 2025" value={newAnalysis.name} onChange={e=>setNewAnalysis(p=>({...p,name:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&createAnalysis()} autoFocus/>
                <span className="form-label">Industrie / Secteur</span>
                <input className="inp" placeholder="Ex: FinTech, Retail…" value={newAnalysis.industry} onChange={e=>setNewAnalysis(p=>({...p,industry:e.target.value}))}/>
                <span className="form-label">Géographie</span>
                <input className="inp" placeholder="Ex: France, Europe, Global…" value={newAnalysis.geography} onChange={e=>setNewAnalysis(p=>({...p,geography:e.target.value}))}/>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn primary" style={{flex:1}} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={()=>setShowNewForm(false)}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{padding:12,borderTop:'1px solid var(--border)'}}>
                <button className="btn" style={{width:'100%',justifyContent:'center'}} onClick={()=>setShowNewForm(true)}>+ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="main">
            {!active ? (
              <div className="empty-cta" style={{padding:'80px 40px'}}>
                <div className="empty-icon" style={{fontSize:48}}>⬡</div>
                <div style={{fontFamily:'Instrument Serif,serif',fontSize:20,fontStyle:'italic',marginBottom:8}}>Sélectionnez ou créez une analyse</div>
                <div className="empty-txt">Utilisez le panneau gauche pour démarrer votre PESTEL</div>
              </div>
            ) : (<>

              {/* Stats */}
              <div className="stats-row">
                {[
                  { val: totalFactors,       lbl: 'Facteurs identifiés',  color: 'var(--text)' },
                  { val: totalOpportunities, lbl: 'Opportunités',         color: '#22d3a5'     },
                  { val: totalThreats,       lbl: 'Menaces',              color: '#f87171'     },
                  { val: highImpact,         lbl: 'Impact fort',          color: '#f59e0b'     },
                ].map((s,i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-val" style={{color:s.color}}>{s.val}</div>
                    <div className="stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* View: Radar */}
              {viewMode === 'radar' && (
                <div className="radar-wrap">
                  <div style={{fontFamily:'Instrument Serif,serif',fontSize:18,fontStyle:'italic',alignSelf:'flex-start'}}>Radar PESTEL — {active.name}</div>
                  <RadarChart/>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
                    {DIMENSIONS.map(d => (
                      <div key={d.id} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontFamily:'Geist Mono,monospace'}}>
                        <div style={{width:8,height:8,borderRadius:50,background:d.color}}/>
                        <span style={{color:d.color}}>{d.label}</span>
                        <span style={{color:'var(--muted)'}}>{dimScore(d.id)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View: Table */}
              {viewMode === 'table' && (
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'auto'}}>
                  <table className="pestel-table">
                    <thead>
                      <tr>
                        <th>Dimension</th><th>Facteur</th><th>Nature</th><th>Impact</th><th>Horizon</th><th>Description</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {DIMENSIONS.flatMap(d =>
                        getDimFactors(d.id).map(f => {
                          const nat = NATURE_OPTIONS[f.nature]
                          const imp = IMPACT_LEVELS[f.impact]
                          const tf  = TIMEFRAME_OPTIONS[f.timeframe]
                          return (
                            <tr key={f.id}>
                              <td><span style={{color:d.color,fontWeight:700,fontFamily:'Geist Mono,monospace',fontSize:11}}>{d.letter} {d.label}</span></td>
                              <td style={{fontWeight:600}}>{f.title}</td>
                              <td><span className="chip" style={{background:nat.color+'18',color:nat.color,border:`1px solid ${nat.color}30`}}>{nat.icon} {nat.label}</span></td>
                              <td><span className="chip" style={{background:imp.bg,color:imp.color}}>{imp.label}</span></td>
                              <td style={{color:'var(--muted2)',fontSize:11,fontFamily:'Geist Mono,monospace'}}>{tf?.label}</td>
                              <td style={{color:'var(--muted2)',maxWidth:200}}>{f.description}</td>
                              <td>
                                <div style={{display:'flex',gap:2}}>
                                  <button className="icon-btn" onClick={()=>{setActiveDim(d.id);startEdit(f);setViewMode('grid')}}>✎</button>
                                  <button className="icon-btn" style={{color:'#f87171'}} onClick={()=>deleteFactor(d.id,f.id)}>✕</button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                      {totalFactors === 0 && <tr><td colSpan={7} style={{textAlign:'center',color:'var(--muted)',padding:'32px',fontStyle:'italic'}}>Aucun facteur — ajoutez-en dans la vue Grille</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View: Grid */}
              {viewMode === 'grid' && (<>
                {/* Dimension tabs */}
                <div className="dim-tabs">
                  <button className={`dim-tab ${!activeDim||activeDim==='all'?'':''}` } style={{background:'var(--surface2)',border:'1px solid var(--border2)',color:'var(--muted2)',fontSize:12}} onClick={()=>setActiveDim('all')}>
                    Toutes
                  </button>
                  {DIMENSIONS.map(d => {
                    const count = getDimFactors(d.id).length
                    const isSel = activeDim === d.id
                    return (
                      <button key={d.id} className="dim-tab" onClick={()=>setActiveDim(d.id)}
                        style={{background: isSel ? d.bg : 'var(--surface2)', border:`1px solid ${isSel ? d.border : 'var(--border2)'}`, color: isSel ? d.color : 'var(--muted2)'}}>
                        <span className="dim-tab-letter" style={{background:d.bg,color:d.color}}>{d.letter}</span>
                        {d.label}
                        {count > 0 && <span className="dim-tab-count">({count})</span>}
                      </button>
                    )
                  })}
                </div>

                {/* All dimensions overview */}
                {(activeDim === 'all' || !activeDim) && (
                  <div className="pestel-grid">
                    {DIMENSIONS.map(d => {
                      const factors = getDimFactors(d.id)
                      return (
                        <div key={d.id} className="dim-section">
                          <div className="dim-section-hd">
                            <div className="dim-badge" style={{background:d.bg,color:d.color}}>{d.letter}</div>
                            <div>
                              <div className="dim-section-name" style={{color:d.color}}>{d.label}</div>
                              <div style={{fontSize:10,color:'var(--muted)',fontFamily:'Geist Mono,monospace'}}>{d.desc.slice(0,40)}…</div>
                            </div>
                            <span className="dim-section-count" style={{color:'var(--muted)'}}>{factors.length} facteur{factors.length!==1?'s':''}</span>
                          </div>
                          <div className="dim-factor-list">
                            {factors.length === 0 && <div style={{fontSize:11,color:'var(--muted)',fontStyle:'italic',padding:'4px 2px'}}>Aucun facteur</div>}
                            {factors.map(f => {
                              const nat = NATURE_OPTIONS[f.nature]
                              const imp = IMPACT_LEVELS[f.impact]
                              return (
                                <div key={f.id} className="factor-card">
                                  <div className="factor-header">
                                    <div className="factor-nature-dot" style={{background:nat.color}}/>
                                    <span className="factor-title">{f.title}</span>
                                    <div className="factor-actions">
                                      <button className="icon-btn" onClick={()=>{setActiveDim(d.id);startEdit(f)}}>✎</button>
                                      <button className="icon-btn" style={{color:'#f87171'}} onClick={()=>deleteFactor(d.id,f.id)}>✕</button>
                                    </div>
                                  </div>
                                  {f.description && <div className="factor-desc">{f.description.slice(0,80)}{f.description.length>80?'…':''}</div>}
                                  <div className="factor-chips">
                                    <span className="chip" style={{background:nat.color+'18',color:nat.color,border:`1px solid ${nat.color}30`}}>{nat.icon} {nat.label}</span>
                                    <span className="chip" style={{background:imp.bg,color:imp.color,border:`1px solid ${imp.color}30`}}>{imp.label}</span>
                                    <span className="chip" style={{background:'var(--surface3)',color:'var(--muted2)',border:'1px solid var(--border)'}}>{TIMEFRAME_OPTIONS[f.timeframe]?.label}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="dim-add-btn" onClick={()=>{setActiveDim(d.id);setEditFactor(null);setFactorForm(EMPTY_FACTOR);setShowFactorForm(true)}}>
                            + Ajouter un facteur {d.label.toLowerCase()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Single dimension view */}
                {activeDim && activeDim !== 'all' && currentDim && (
                  <div className="single-dim">
                    {/* Dim header */}
                    <div className="single-dim-hd" style={{background:currentDim.bg, borderColor:currentDim.border}}>
                      <div className="single-dim-icon" style={{background:currentDim.bg,color:currentDim.color,border:`1px solid ${currentDim.border}`}}>
                        {currentDim.letter}
                      </div>
                      <div style={{flex:1}}>
                        <div className="single-dim-title" style={{color:currentDim.color}}>{currentDim.label}</div>
                        <div className="single-dim-desc">{currentDim.desc}</div>
                        <div className="example-chips">
                          {currentDim.examples.map(ex => (
                            <span key={ex} className="example-chip" onClick={()=>{setEditFactor(null);setFactorForm({...EMPTY_FACTOR,title:ex});setShowFactorForm(true)}}>{ex}</span>
                          ))}
                        </div>
                      </div>
                      <button className="btn primary" onClick={()=>{setEditFactor(null);setFactorForm(EMPTY_FACTOR);setShowFactorForm(true)}}>+ Ajouter</button>
                    </div>

                    {/* Factor list */}
                    {getDimFactors(activeDim).length === 0 && (
                      <div className="empty-cta" style={{border:'1px dashed var(--border2)',borderRadius:12,padding:'40px'}}>
                        <div className="empty-icon">{currentDim.icon}</div>
                        <div className="empty-txt">Aucun facteur {currentDim.label.toLowerCase()} — cliquez sur un exemple ou "+ Ajouter"</div>
                      </div>
                    )}
                    {getDimFactors(activeDim).map(f => {
                      const nat = NATURE_OPTIONS[f.nature]
                      const imp = IMPACT_LEVELS[f.impact]
                      const tf  = TIMEFRAME_OPTIONS[f.timeframe]
                      return (
                        <div key={f.id} className="factor-detail">
                          <div className="factor-detail-left">
                            <div className="nature-icon" style={{background:nat.color+'18',color:nat.color,border:`1px solid ${nat.color}30`}}>{nat.icon}</div>
                            <div className="impact-dot" style={{background:imp.color}}/>
                          </div>
                          <div className="factor-detail-content">
                            <div className="factor-detail-title">{f.title}</div>
                            {f.description && <div className="factor-detail-desc">{f.description}</div>}
                            {f.source && <div style={{fontSize:10,color:'var(--muted)',fontFamily:'Geist Mono,monospace',marginBottom:6}}>Source : {f.source}</div>}
                            <div className="factor-detail-meta">
                              <span className="chip" style={{background:nat.color+'18',color:nat.color,border:`1px solid ${nat.color}30`}}>{nat.label}</span>
                              <span className="chip" style={{background:imp.bg,color:imp.color,border:`1px solid ${imp.color}30`}}>Impact {imp.label}</span>
                              <span className="chip" style={{background:'var(--surface3)',color:'var(--muted2)',border:'1px solid var(--border)'}}>{tf?.label} ({tf?.sub})</span>
                            </div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',gap:4}}>
                            <button className="icon-btn" onClick={()=>startEdit(f)}>✎</button>
                            <button className="icon-btn" style={{color:'#f87171'}} onClick={()=>deleteFactor(activeDim,f.id)}>✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>)}
            </>)}
          </main>
        </div>

        {/* Factor form modal */}
        {showFactorForm && (
          <div className="modal-overlay" onClick={()=>{setShowFactorForm(false);setEditFactor(null)}}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title" style={{color:currentDim?.color}}>
                {editFactor?'Modifier le facteur':'Nouveau facteur'} — {currentDim?.label}
              </div>

              <div className="form-group">
                <label className="form-label">Titre du facteur *</label>
                <input className="inp" placeholder={`Ex: ${currentDim?.examples?.[0]||'Facteur...'}`} value={factorForm.title} onChange={e=>setFactorForm(p=>({...p,title:e.target.value}))} autoFocus/>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="inp" rows={3} style={{resize:'vertical'}} placeholder="Décrivez l'impact de ce facteur sur votre activité…" value={factorForm.description} onChange={e=>setFactorForm(p=>({...p,description:e.target.value}))}/>
              </div>

              <div className="form-group">
                <label className="form-label">Nature</label>
                <div className="seg-group">
                  {Object.entries(NATURE_OPTIONS).map(([k,v]) => (
                    <button key={k} className={`seg-btn ${factorForm.nature===k?'sel':''}`}
                      style={factorForm.nature===k?{background:v.color+'18',borderColor:v.color+'50',color:v.color}:{}}
                      onClick={()=>setFactorForm(p=>({...p,nature:k}))}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Niveau d'impact</label>
                  <div className="seg-group" style={{flexDirection:'column'}}>
                    {Object.entries(IMPACT_LEVELS).map(([k,v]) => (
                      <button key={k} className={`seg-btn ${factorForm.impact===k?'sel':''}`}
                        style={factorForm.impact===k?{background:v.bg,borderColor:v.color+'50',color:v.color}:{}}
                        onClick={()=>setFactorForm(p=>({...p,impact:k}))}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Horizon temporel</label>
                  <div className="seg-group" style={{flexDirection:'column'}}>
                    {Object.entries(TIMEFRAME_OPTIONS).map(([k,v]) => (
                      <button key={k} className={`seg-btn ${factorForm.timeframe===k?'sel':''}`} onClick={()=>setFactorForm(p=>({...p,timeframe:k}))}>
                        {v.label} <span style={{opacity:.6,fontSize:10}}>({v.sub})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{marginTop:14}}>
                <label className="form-label">Source / Référence (optionnel)</label>
                <input className="inp" placeholder="Ex: Rapport INSEE, étude McKinsey…" value={factorForm.source} onChange={e=>setFactorForm(p=>({...p,source:e.target.value}))}/>
              </div>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={()=>{setShowFactorForm(false);setEditFactor(null)}}>Annuler</button>
                <button className="btn-full" onClick={saveFactor}>{editFactor?'Mettre à jour':'Ajouter le facteur'}</button>
              </div>
            </div>
          </div>
        )}

        {/* AI Panel */}
        <div className={`ai-panel ${showAiPanel?'open':''}`}>
          <div className="ai-panel-hd">
            <span className="ai-panel-title">Analyse IA ✦</span>
            <button className="btn" onClick={()=>setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-content">
            {aiLoading && <div style={{display:'flex',alignItems:'center',gap:12,color:'var(--muted2)',fontSize:13}}><span className="spinner"/>Analyse PESTEL en cours…</div>}

            {!aiLoading && aiResult && <>
              {aiResult.synthese && <div><div className="ai-slbl">Synthèse macro-environnementale</div><div className="ai-block">{aiResult.synthese}</div></div>}

              {aiResult.dimensions?.length > 0 && (
                <div>
                  <div className="ai-slbl">Analyse par dimension</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {aiResult.dimensions.map((d,i) => {
                      const dim = DIMENSIONS.find(x => x.id === d.id || x.label.toLowerCase() === d.dimension?.toLowerCase())
                      return (
                        <div key={i} className="ai-dim-card" style={{borderColor:dim?.border||'var(--border)'}}>
                          <div className="ai-dim-letter" style={{background:dim?.bg||'var(--surface3)',color:dim?.color||'var(--muted2)'}}>{dim?.letter||'?'}</div>
                          <div className="ai-dim-content">
                            <div className="ai-dim-name" style={{color:dim?.color||'var(--text)'}}>{d.dimension}</div>
                            <div className="ai-dim-text">{d.analyse}</div>
                            {d.alerte && <div style={{fontSize:10,color:'#f87171',marginTop:4,padding:'4px 6px',background:'rgba(248,113,113,.08)',borderRadius:4,border:'1px solid rgba(248,113,113,.2)'}}>⚠ {d.alerte}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {aiResult.opportunites?.length > 0 && (
                <div>
                  <div className="ai-slbl">Opportunités clés à saisir</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {aiResult.opportunites.map((o,i) => (
                      <div key={i} style={{padding:'8px 12px',background:'rgba(34,211,165,.06)',border:'1px solid rgba(34,211,165,.2)',borderRadius:6,fontSize:12,color:'var(--text)',lineHeight:1.6}}>
                        <span style={{color:'#22d3a5',marginRight:6}}>↑</span>{o}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.menaces?.length > 0 && (
                <div>
                  <div className="ai-slbl">Menaces prioritaires</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {aiResult.menaces.map((m,i) => (
                      <div key={i} style={{padding:'8px 12px',background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:6,fontSize:12,color:'var(--text)',lineHeight:1.6}}>
                        <span style={{color:'#f87171',marginRight:6}}>↓</span>{m}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.priorites?.length > 0 && (
                <div>
                  <div className="ai-slbl">Actions stratégiques recommandées</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {aiResult.priorites.map((p,i) => (
                      <div key={i} className="ai-priority-item">
                        <span className="ai-priority-num">#{i+1}</span>
                        <span style={{fontSize:12,color:'var(--text)',lineHeight:1.6}}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.conclusion && <div><div className="ai-slbl">Verdict stratégique</div><div className="ai-block" style={{fontStyle:'italic',color:'var(--muted2)'}}>{aiResult.conclusion}</div></div>}
            </>}

            {!aiLoading && !aiResult && (
              <div className="empty-cta">
                <div className="empty-icon">✦</div>
                <div className="empty-txt">Cliquez sur "Analyse IA" pour obtenir une synthèse macro-environnementale complète et des recommandations stratégiques.</div>
              </div>
            )}
          </div>
        </div>

        {toast && <div className={`toast ${toast.type||''}`}>{toast.type==='error'?'✕':'✓'} {toast.msg}</div>}
      </div>
    </>
  )
}