'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const DIMENSIONS = [
  {
    id: 'political', label: 'Politique', letter: 'P', color: '#6366f1',
    bg: 'rgba(99,102,241,.08)', border: 'rgba(99,102,241,.25)', icon: '⬡',
    desc: 'Stabilité gouvernementale, réglementation, fiscalité, politique commerciale',
    examples: ['Politique fiscale', 'Réglementation sectorielle', 'Stabilité politique', 'Commerce international', 'Subventions publiques'],
  },
  {
    id: 'economic', label: 'Économique', letter: 'E', color: '#22d3a5',
    bg: 'rgba(34,211,165,.08)', border: 'rgba(34,211,165,.25)', icon: '◎',
    desc: 'Croissance économique, inflation, taux d\'intérêt, chômage, pouvoir d\'achat',
    examples: ['Taux de croissance PIB', 'Inflation', 'Taux de chômage', 'Taux d\'intérêt', 'Taux de change'],
  },
  {
    id: 'social', label: 'Social', letter: 'S', color: '#f59e0b',
    bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)', icon: '◈',
    desc: 'Démographie, culture, éducation, style de vie, tendances sociales',
    examples: ['Tendances démographiques', 'Évolution culturelle', 'Niveau d\'éducation', 'Style de vie', 'Opinion publique'],
  },
  {
    id: 'technological', label: 'Technologique', letter: 'T', color: '#818cf8',
    bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.25)', icon: '◉',
    desc: 'Innovation, R&D, automatisation, cybersécurité, maturité technologique',
    examples: ['Intelligence artificielle', 'Automatisation', 'Cybersécurité', 'Maturité digitale', 'Brevets & R&D'],
  },
  {
    id: 'environmental', label: 'Environnemental', letter: 'E', color: '#4ade80',
    bg: 'rgba(74,222,128,.08)', border: 'rgba(74,222,128,.25)', icon: '⬠',
    desc: 'Changement climatique, réglementation écologique, ressources naturelles',
    examples: ['Réglementation carbone', 'Énergie renouvelable', 'Gestion des déchets', 'Changement climatique', 'Biodiversité'],
  },
  {
    id: 'legal', label: 'Légal', letter: 'L', color: '#f87171',
    bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.25)', icon: '⊟',
    desc: 'Droit du travail, propriété intellectuelle, protection des données, normes',
    examples: ['RGPD / Protection données', 'Droit du travail', 'Propriété intellectuelle', 'Normes qualité', 'Réglementation concurrence'],
  },
]

const IMPACT_LEVELS = {
  high:   { label: 'Fort',   score: 3, color: '#f87171', bg: 'rgba(248,113,113,.1)' },
  medium: { label: 'Moyen',  score: 2, color: '#f59e0b', bg: 'rgba(245,158,11,.1)'  },
  low:    { label: 'Faible', score: 1, color: '#22d3a5', bg: 'rgba(34,211,165,.1)'  },
}

const NATURE_OPTIONS = {
  opportunity: { label: 'Opportunité', color: '#22d3a5', icon: '↑' },
  threat:      { label: 'Menace',      color: '#f87171', icon: '↓' },
  neutral:     { label: 'Neutre',      color: '#9896aa', icon: '→' },
}

const TIMEFRAME_OPTIONS = {
  short:  { label: 'Court terme',  sub: '< 1 an'  },
  medium: { label: 'Moyen terme',  sub: '1-3 ans' },
  long:   { label: 'Long terme',   sub: '> 3 ans' },
}

const EMPTY_FACTOR = { title: '', description: '', impact: 'medium', nature: 'neutral', timeframe: 'medium', source: '' }

// ─── Component ────────────────────────────────────────────────────────────────
export default function PESTELPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,     setProject]     = useState(null)
  const [analyses,    setAnalyses]    = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)

  // New analysis form
  const [newMode,     setNewMode]     = useState('manual') // 'manual' | 'ai'
  const [newForm,     setNewForm]     = useState({ name: '', industry: '', geography: '', companyName: '', context: '' })

  // UI state
  const [activeDim,   setActiveDim]   = useState('all')
  const [viewMode,    setViewMode]    = useState('grid')
  const [showFactorForm, setShowFactorForm] = useState(false)
  const [editFactor,  setEditFactor]  = useState(null)
  const [factorForm,  setFactorForm]  = useState(EMPTY_FACTOR)
  const [formDim,     setFormDim]     = useState('political')

  // AI states
  const [genLoading,  setGenLoading]  = useState(false)  // generating factors from context
  const [aiLoading,   setAiLoading]   = useState(false)  // analyzing existing factors
  const [aiResult,    setAiResult]    = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const [toast,       setToast]       = useState(null)

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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), PESTEL: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const active = analyses.find(a => a.id === activeId) || null

  const ua = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated); persist(updated)
  }

  // ── Create analysis (manual) ──
  const createManual = () => {
    if (!newForm.name.trim()) return
    const a = {
      id: uid(), name: newForm.name.trim(),
      industry: newForm.industry.trim(), geography: newForm.geography.trim(),
      companyName: newForm.companyName.trim(), context: newForm.context.trim(),
      createdAt: new Date().toISOString(), factors: {}, aiResult: null,
      generatedByAI: false,
    }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); setAiResult(null)
    persist(updated); setShowNewForm(false); setNewForm({ name: '', industry: '', geography: '', companyName: '', context: '' })
    showToast(`Analyse "${a.name}" créée`)
  }

  // ── Create analysis (AI generation) ──
  const createWithAI = async () => {
    if (!newForm.context.trim()) { showToast('Décrivez votre projet pour la génération IA', 'error'); return }
    setGenLoading(true)
    try {
      const res  = await fetch('/api/generer-management/generer-pestel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:        'generate',
          context:     newForm.context,
          industry:    newForm.industry,
          geography:   newForm.geography,
          companyName: newForm.companyName,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()

      // Handle both HTTP errors and API-level failures
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'La génération a échoué — réessayez ou utilisez le mode manuel.')
      }

      const r = data.result
      if (!r || !r.factors) {
        throw new Error('Réponse IA invalide — réessayez.')
      }

      // Convert generated factors — add ids
      const factors = {}
      const DIMS = ['political', 'economic', 'social', 'technological', 'environmental', 'legal']
      for (const dim of DIMS) {
        const list = r.factors[dim]
        factors[dim] = Array.isArray(list) ? list.map(f => ({ id: uid(), ...f })) : []
      }

      const totalGenerated = Object.values(factors).reduce((s, arr) => s + arr.length, 0)
      if (totalGenerated === 0) {
        throw new Error('Aucun facteur généré — veuillez préciser davantage votre contexte et réessayer.')
      }

      const a = {
        id:             uid(),
        name:           newForm.name.trim() || r.analysis_name || `PESTEL — ${newForm.industry || 'Projet'}`,
        industry:       newForm.industry.trim(),
        geography:      newForm.geography.trim(),
        companyName:    newForm.companyName.trim(),
        context:        newForm.context.trim(),
        createdAt:      new Date().toISOString(),
        factors,
        aiResult:       null,
        generatedByAI:  true,
        genHeadline:    r.headline || '',
        quickSynthesis: r.quick_synthesis || null,
      }

      const updated = [...analyses, a]
      setAnalyses(updated); setActiveId(a.id); setAiResult(null)
      persist(updated); setShowNewForm(false)
      setNewForm({ name: '', industry: '', geography: '', companyName: '', context: '' })
      showToast(`✦ PESTEL généré — ${totalGenerated} facteurs créés`)
    } catch (err) {
      showToast(err.message, 'error')
    }
    setGenLoading(false)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) {
      const last = updated[updated.length - 1]
      setActiveId(last?.id || null); setAiResult(last?.aiResult || null)
    }
    showToast('Analyse supprimée', 'info')
  }

  // ── Factor CRUD ──
  const getDimFactors = (dimId) => active?.factors?.[dimId] || []

  const saveFactor = () => {
    if (!factorForm.title.trim()) return
    const factor      = { id: editFactor?.id || uid(), ...factorForm }
    const dimFactors  = getDimFactors(formDim)
    const updated     = editFactor
      ? dimFactors.map(f => f.id === editFactor.id ? factor : f)
      : [...dimFactors, factor]
    ua({ factors: { ...(active?.factors || {}), [formDim]: updated } })
    setShowFactorForm(false); setEditFactor(null); setFactorForm(EMPTY_FACTOR)
    showToast(editFactor ? 'Facteur mis à jour' : 'Facteur ajouté')
  }

  const deleteFactor = (dimId, factorId) => {
    const updated = getDimFactors(dimId).filter(f => f.id !== factorId)
    ua({ factors: { ...(active?.factors || {}), [dimId]: updated } })
  }

  const startEdit = (dim, factor) => {
    setFormDim(dim); setEditFactor(factor)
    setFactorForm({ title: factor.title, description: factor.description || '', impact: factor.impact, nature: factor.nature, timeframe: factor.timeframe, source: factor.source || '' })
    setShowFactorForm(true)
  }

  const openAdd = (dim) => {
    setFormDim(dim); setEditFactor(null); setFactorForm(EMPTY_FACTOR); setShowFactorForm(true)
  }

  // ── Stats ──
  const totalFactors       = DIMENSIONS.reduce((s, d) => s + getDimFactors(d.id).length, 0)
  const totalOpportunities = DIMENSIONS.reduce((s, d) => s + getDimFactors(d.id).filter(f => f.nature === 'opportunity').length, 0)
  const totalThreats       = DIMENSIONS.reduce((s, d) => s + getDimFactors(d.id).filter(f => f.nature === 'threat').length, 0)
  const highImpact         = DIMENSIONS.reduce((s, d) => s + getDimFactors(d.id).filter(f => f.impact === 'high').length, 0)

  const dimScore = (dimId) => {
    const factors = getDimFactors(dimId)
    if (!factors.length) return 0
    return Math.round(factors.reduce((s, f) => s + (IMPACT_LEVELS[f.impact]?.score || 1), 0) / factors.length * 33.3)
  }

  // ── Export ──
  const exportAnalysis = () => {
    if (!active) return
    const payload = { version: '2.0', exportedAt: new Date().toISOString(), analysis: { ...active, aiResult } }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `PESTEL_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('Export JSON téléchargé')
  }

  // ── Import ──
  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw  = JSON.parse(ev.target.result)
        // support both v1 (direct analysis) and v2 ({ analysis, ... })
        const data = raw.analysis || raw
        if (!data.factors) throw new Error('Format invalide')
        const imported = {
          ...data,
          id:        uid(),
          name:      data.name ? `${data.name} (importé)` : 'Analyse importée',
          createdAt: data.createdAt || new Date().toISOString(),
        }
        const updated = [...analyses, imported]
        setAnalyses(updated); setActiveId(imported.id)
        setAiResult(imported.aiResult || null)
        persist(updated)
        showToast(`Analyse "${imported.name}" importée — ${Object.values(imported.factors).reduce((s, arr) => s + arr.length, 0)} facteurs`)
      } catch (err) {
        showToast(`Erreur d'import : ${err.message}`, 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = '' // reset
  }

  // ── AI Analyze ──
  const runAnalyze = async () => {
    if (!totalFactors) { showToast('Ajoutez des facteurs d\'abord', 'error'); return }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res  = await fetch('/api/generer-management/generer-pestel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:         'analyze',
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
      ua({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── Radar SVG ──
  const RadarChart = () => {
    const cx = 180, cy = 180, r = 130
    const scores   = DIMENSIONS.map(d => ({ ...d, score: dimScore(d.id) / 100 }))
    const angleStep = (2 * Math.PI) / 6
    const pts = scores.map((d, i) => {
      const angle = i * angleStep - Math.PI / 2
      return { x: cx + r * d.score * Math.cos(angle), y: cy + r * d.score * Math.sin(angle), ...d }
    })
    return (
      <svg viewBox="0 0 360 360" style={{ width: '100%', maxWidth: 340, margin: '0 auto', display: 'block' }}>
        {[0.25, 0.5, 0.75, 1].map(level => (
          <polygon key={level}
            points={DIMENSIONS.map((_, i) => { const a = i * angleStep - Math.PI / 2; return `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}` }).join(' ')}
            fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        ))}
        {DIMENSIONS.map((_, i) => {
          const a = i * angleStep - Math.PI / 2
          return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        })}
        <polygon points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(99,102,241,.15)" stroke="#6366f1" strokeWidth="2" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill={p.color} stroke="var(--surface)" strokeWidth="2" />)}
        {DIMENSIONS.map((d, i) => {
          const a  = i * angleStep - Math.PI / 2
          const lx = cx + (r + 22) * Math.cos(a)
          const ly = cy + (r + 22) * Math.sin(a)
          return (
            <g key={d.id}>
              <text x={lx} y={ly - 5} textAnchor="middle" fill={d.color} fontSize="12" fontWeight="700" fontFamily="'Geist Mono',monospace">{d.letter}</text>
              <text x={lx} y={ly + 9} textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="9" fontFamily="'Geist Mono',monospace">{dimScore(d.id)}%</text>
            </g>
          )
        })}
      </svg>
    )
  }

  const currentDim = DIMENSIONS.find(d => d.id === (activeDim !== 'all' ? activeDim : 'political'))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
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
        .topbar { height:56px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 20px; gap:10px; position:sticky; top:0; z-index:100; }
        .back-btn { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s; }
        .back-btn:hover { color:var(--text); }
        .topbar-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .topbar-sub { font-size:11px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .topbar-right { margin-left:auto; display:flex; gap:6px; align-items:center; }
        .btn { display:flex; align-items:center; gap:6px; padding:7px 13px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; white-space:nowrap; }
        .btn:hover { color:var(--text); border-color:rgba(255,255,255,.2); }
        .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
        .btn.primary:hover { background:#4f52d8; }
        .btn.ai { background:rgba(129,140,248,.1); border-color:rgba(129,140,248,.3); color:var(--accent2); }
        .btn.ai:hover { background:rgba(129,140,248,.2); }
        .btn.active-v { background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.3); color:var(--accent2); }
        .btn:disabled { opacity:.4; cursor:not-allowed; }

        /* Layout */
        .body { flex:1; display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 56px); overflow:hidden; }

        /* Left panel */
        .left-panel { background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
        .panel-hd { padding:14px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .panel-label { font-size:10px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .panel-list { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:2px; }
        .a-item { padding:10px 12px; border-radius:8px; cursor:pointer; border:1px solid transparent; transition:all .15s; position:relative; }
        .a-item:hover { background:var(--surface2); }
        .a-item.active { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.25); }
        .a-name { font-size:12px; font-weight:600; color:var(--text); display:flex; align-items:center; justify-content:space-between; }
        .a-del { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; padding:2px; }
        .a-item:hover .a-del { opacity:1; }
        .a-meta { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:3px; line-height:1.4; }
        .a-ai-badge { display:inline-flex; align-items:center; gap:3px; font-size:9px; padding:1px 5px; border-radius:4px; background:rgba(129,140,248,.12); color:var(--accent2); border:1px solid rgba(129,140,248,.2); margin-top:3px; }
        .panel-bottom { border-top:1px solid var(--border); }
        .inp { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:8px 10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--text); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--accent); }
        .inp::placeholder { color:var(--muted); }
        textarea.inp { resize:vertical; }
        .form-label { display:block; font-size:10px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; margin-bottom:5px; font-family:'Geist Mono',monospace; }

        /* New analysis form */
        .new-form { padding:14px; display:flex; flex-direction:column; gap:10px; }
        .mode-tabs { display:flex; gap:4px; background:var(--surface3); border-radius:8px; padding:3px; }
        .mode-tab { flex:1; padding:6px 4px; border-radius:6px; text-align:center; font-size:10px; font-family:'Geist Mono',monospace; cursor:pointer; border:none; background:none; color:var(--muted2); transition:all .15s; }
        .mode-tab.active { background:var(--surface); color:var(--text); }
        .ai-mode-desc { font-size:10px; color:var(--muted2); background:rgba(129,140,248,.08); border:1px solid rgba(129,140,248,.2); border-radius:6px; padding:8px 10px; line-height:1.5; }

        /* Main */
        .main { overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px; }

        /* Gen banner */
        .gen-banner { background:rgba(129,140,248,.07); border:1px solid rgba(129,140,248,.2); border-radius:10px; padding:12px 16px; display:flex; align-items:center; gap:10px; }
        .gen-banner-icon { font-size:16px; }
        .gen-banner-text { font-size:12px; color:var(--muted2); flex:1; line-height:1.5; }
        .gen-banner-text b { color:var(--text); }

        /* Quick synthesis */
        .quick-synth { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:16px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
        .qs-col-title { font-size:10px; font-family:'Geist Mono',monospace; text-transform:uppercase; letter-spacing:.08em; color:var(--muted2); margin-bottom:6px; }
        .qs-item { font-size:11px; color:var(--text); padding:4px 0; display:flex; gap:6px; align-items:flex-start; line-height:1.5; }

        /* Stats row */
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px 16px; }
        .stat-val { font-size:28px; font-weight:800; font-family:'Geist Mono',monospace; }
        .stat-lbl { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; margin-top:4px; font-family:'Geist Mono',monospace; }

        /* Dim tabs */
        .dim-tabs { display:flex; gap:6px; flex-wrap:wrap; }
        .dim-tab { padding:7px 13px; border-radius:8px; cursor:pointer; border:1px solid var(--border2); background:var(--surface2); transition:all .15s; display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; }
        .dim-tab-letter { width:22px; height:22px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; font-family:'Geist Mono',monospace; }
        .dim-tab-count { font-size:10px; font-family:'Geist Mono',monospace; opacity:.7; }

        /* Grid view */
        .pestel-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; }
        .dim-section { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
        .dim-section-hd { padding:13px 16px; display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--border); }
        .dim-badge { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; flex-shrink:0; }
        .dim-section-name { font-size:13px; font-weight:700; }
        .dim-factor-list { padding:10px; display:flex; flex-direction:column; gap:6px; }
        .factor-card { padding:10px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface2); transition:border-color .15s; }
        .factor-card:hover { border-color:var(--border2); }
        .factor-header { display:flex; align-items:flex-start; gap:8px; margin-bottom:4px; }
        .factor-nature-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:3px; }
        .factor-title-text { font-size:12px; font-weight:600; flex:1; color:var(--text); }
        .factor-actions { display:flex; gap:2px; }
        .icon-btn { width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:11px; color:var(--muted2); transition:all .15s; }
        .icon-btn:hover { background:var(--surface3); color:var(--text); }
        .factor-desc { font-size:11px; color:var(--muted2); margin-bottom:6px; line-height:1.5; }
        .factor-chips { display:flex; gap:5px; flex-wrap:wrap; }
        .chip { padding:2px 7px; border-radius:4px; font-size:10px; font-family:'Geist Mono',monospace; }
        .dim-add-btn { margin:0 10px 10px; border:1px dashed var(--border2); border-radius:8px; padding:8px; text-align:center; cursor:pointer; color:var(--muted); font-size:11px; transition:all .15s; font-family:'Geist Mono',monospace; }
        .dim-add-btn:hover { border-color:var(--accent); color:var(--accent); }

        /* Single dim view */
        .single-dim { display:flex; flex-direction:column; gap:14px; }
        .single-dim-hd { display:flex; align-items:center; gap:12px; padding:16px 20px; border-radius:12px; border:1px solid; }
        .single-dim-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; }
        .single-dim-title { font-size:18px; font-weight:700; }
        .single-dim-desc { font-size:12px; color:var(--muted2); margin-top:2px; line-height:1.5; }
        .example-chips { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
        .example-chip { padding:3px 8px; border-radius:4px; font-size:10px; font-family:'Geist Mono',monospace; background:var(--surface3); color:var(--muted2); border:1px solid var(--border); cursor:pointer; transition:all .15s; }
        .example-chip:hover { color:var(--text); border-color:var(--border2); }
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

        /* Radar */
        .radar-wrap { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:24px; display:flex; flex-direction:column; align-items:center; gap:16px; }

        /* Modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:200; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
        .modal { background:var(--surface); border:1px solid var(--border2); border-radius:16px; padding:26px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,.5); }
        .modal-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; margin-bottom:18px; }
        .form-group { margin-bottom:14px; }
        .form-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .seg-group { display:flex; gap:4px; flex-wrap:wrap; }
        .seg-btn { padding:6px 12px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .seg-btn.sel { background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.35); color:var(--accent2); }
        .modal-actions { display:flex; gap:8px; margin-top:16px; }
        .btn-save { flex:1; padding:10px; border-radius:8px; cursor:pointer; background:var(--accent); border:none; color:#fff; font-family:'Syne',sans-serif; font-size:13px; font-weight:600; }
        .btn-save:hover { background:#4f52d8; }
        .btn-cancel { padding:10px 16px; border-radius:8px; cursor:pointer; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Syne',sans-serif; font-size:13px; }

        /* AI Panel */
        .ai-panel { position:fixed; right:0; top:56px; bottom:0; width:430px; background:var(--surface); border-left:1px solid var(--border); z-index:80; display:flex; flex-direction:column; overflow:hidden; transform:translateX(100%); transition:transform .3s ease; }
        .ai-panel.open { transform:translateX(0); }
        .ai-panel-hd { padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .ai-panel-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .ai-content { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
        .ai-slbl { font-size:10px; color:var(--muted2); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:8px; }
        .ai-block { background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:14px; font-size:13px; color:var(--text); line-height:1.7; }
        .ai-score-row { display:flex; gap:10px; }
        .ai-score-pill { flex:1; text-align:center; padding:10px; background:var(--surface2); border:1px solid var(--border2); border-radius:8px; }
        .ai-score-val { font-family:'Instrument Serif',serif; font-size:24px; font-style:italic; }
        .ai-score-lbl { font-size:9px; font-family:'Geist Mono',monospace; color:var(--muted); text-transform:uppercase; margin-top:2px; letter-spacing:.06em; }
        .ai-verdict { font-size:11px; font-family:'Geist Mono',monospace; text-align:center; margin-top:6px; }
        .ai-dim-card { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; gap:10px; }
        .ai-dim-letter { width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; font-family:'Geist Mono',monospace; flex-shrink:0; }
        .ai-dim-content { flex:1; min-width:0; }
        .ai-dim-name { font-size:11px; font-weight:700; margin-bottom:3px; }
        .ai-dim-text { font-size:11px; color:var(--muted2); line-height:1.6; }
        .ai-dim-alert { font-size:10px; color:#f87171; margin-top:4px; padding:4px 6px; background:rgba(248,113,113,.08); border-radius:4px; border:1px solid rgba(248,113,113,.2); }
        .ai-interaction-item { display:flex; gap:10px; padding:8px 12px; background:var(--surface2); border:1px solid var(--border); border-radius:6px; font-size:11px; color:var(--muted2); line-height:1.5; }
        .ai-int-type { font-family:'Geist Mono',monospace; font-size:9px; padding:2px 6px; border-radius:4px; background:var(--surface3); color:var(--muted); flex-shrink:0; white-space:nowrap; }
        .ai-veille-item { display:flex; gap:10px; padding:8px 12px; background:var(--surface2); border:1px solid var(--border); border-radius:6px; align-items:flex-start; }
        .ai-veille-freq { font-size:9px; font-family:'Geist Mono',monospace; padding:2px 6px; border-radius:4px; background:var(--surface3); color:var(--muted); flex-shrink:0; }
        .ai-list-item { display:flex; gap:8px; padding:8px 12px; border-radius:6px; font-size:12px; color:var(--text); line-height:1.6; }
        .ai-priority-item { display:flex; gap:10px; padding:8px 12px; background:var(--surface2); border:1px solid var(--border); border-radius:6px; }
        .ai-priority-num { font-family:'Geist Mono',monospace; font-size:10px; color:var(--muted); min-width:20px; }
        .spinner { width:16px; height:16px; border:2px solid var(--border2); border-top-color:var(--accent2); border-radius:50%; animation:spin .7s linear infinite; }
        .spinner-lg { width:28px; height:28px; border:2px solid var(--border2); border-top-color:var(--accent2); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        .empty-cta { padding:32px; text-align:center; }
        .empty-icon { font-size:32px; opacity:.25; margin-bottom:10px; }
        .empty-txt { font-size:13px; color:var(--muted); line-height:1.6; }

        /* Gen loading overlay */
        .gen-overlay { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:80px 40px; }
        .gen-overlay-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; color:var(--accent2); }
        .gen-overlay-sub { font-size:12px; color:var(--muted); font-family:'Geist Mono',monospace; }

        .toast { position:fixed; bottom:24px; right:24px; z-index:500; background:var(--surface2); border:1px solid var(--border2); border-radius:8px; padding:12px 18px; font-size:13px; box-shadow:0 8px 32px rgba(0,0,0,.4); animation:slideUp .2s ease; display:flex; align-items:center; gap:8px; max-width:340px; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info  { border-color:rgba(99,102,241,.3); }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        @media(max-width:900px) { .body{grid-template-columns:1fr;} .left-panel{display:none;} .stats-row{grid-template-columns:repeat(2,1fr);} }
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      <div className="root">

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="topbar-title">PESTEL Analysis</div>
            {project && <div className="topbar-sub">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {active && (
              <>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[{ id: 'grid', icon: '⊞' }, { id: 'radar', icon: '◎' }, { id: 'table', icon: '≡' }].map(v => (
                    <button key={v.id} className={`btn ${viewMode === v.id ? 'active-v' : ''}`} style={{ padding: '6px 10px' }} onClick={() => setViewMode(v.id)}>{v.icon}</button>
                  ))}
                </div>
                <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
                <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>
                <button className="btn ai" onClick={runAnalyze} disabled={aiLoading || !totalFactors}>
                  {aiLoading ? <><span className="spinner" />Analyse…</> : '✦ Analyser'}
                </button>
              </>
            )}
            {!active && (
              <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer une analyse</button>
            )}
          </div>
        </header>

        <div className="body">
          {/* ── Left panel ── */}
          <aside className="left-panel">
            <div className="panel-hd">
              <span className="panel-label">Analyses ({analyses.length})</span>
            </div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">⬡</div>
                  <div className="empty-txt">Créez ou importez votre première analyse PESTEL</div>
                </div>
              )}
              {analyses.map(a => {
                const factorCount = Object.values(a.factors || {}).reduce((s, arr) => s + arr.length, 0)
                return (
                  <div key={a.id} className={`a-item ${activeId === a.id ? 'active' : ''}`}
                    onClick={() => { setActiveId(a.id); setAiResult(a.aiResult || null) }}>
                    <div className="a-name">
                      <span>{a.name}</span>
                      <button className="a-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                    </div>
                    <div className="a-meta">
                      {factorCount} facteur{factorCount !== 1 ? 's' : ''}
                      {a.industry ? ` · ${a.industry}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      {a.generatedByAI && <span className="a-ai-badge">✦ Généré IA</span>}
                      {a.aiResult      && <span className="a-ai-badge">📊 Analysé</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="panel-bottom">
              {showNewForm ? (
                <div className="new-form">
                  <div className="mode-tabs">
                    <button className={`mode-tab ${newMode === 'manual' ? 'active' : ''}`} onClick={() => setNewMode('manual')}>Manuel</button>
                    <button className={`mode-tab ${newMode === 'ai'     ? 'active' : ''}`} onClick={() => setNewMode('ai')}>✦ Générer avec l'IA</button>
                  </div>

                  {newMode === 'ai' && (
                    <div className="ai-mode-desc">
                      Décrivez votre projet en quelques phrases — l'IA génère automatiquement tous les facteurs PESTEL.
                    </div>
                  )}

                  <div>
                    <label className="form-label">Nom de l'analyse</label>
                    <input className="inp" placeholder={newMode === 'ai' ? 'Laissez vide pour auto' : 'Ex: PESTEL 2025'} value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} />
                  </div>

                  {newMode === 'ai' && (
                    <div>
                      <label className="form-label">Description du projet *</label>
                      <textarea className="inp" rows={4} placeholder="Ex: Startup SaaS B2B dans la gestion RH, cible PME françaises, lancement prévu en 2025, budget limité, équipe de 8 personnes…" value={newForm.context} onChange={e => setNewForm(p => ({ ...p, context: e.target.value }))} />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>
                      <label className="form-label">Industrie</label>
                      <input className="inp" placeholder="Ex: FinTech" value={newForm.industry} onChange={e => setNewForm(p => ({ ...p, industry: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Géographie</label>
                      <input className="inp" placeholder="Ex: France" value={newForm.geography} onChange={e => setNewForm(p => ({ ...p, geography: e.target.value }))} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {newMode === 'manual' ? (
                      <button className="btn primary" style={{ flex: 1 }} onClick={createManual}>Créer</button>
                    ) : (
                      <button className="btn ai" style={{ flex: 1, justifyContent: 'center' }} onClick={createWithAI} disabled={genLoading}>
                        {genLoading ? <><span className="spinner" />Génération…</> : '✦ Générer'}
                      </button>
                    )}
                    <button className="btn" onClick={() => { setShowNewForm(false); setNewForm({ name: '', industry: '', geography: '', companyName: '', context: '' }) }}>✕</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 12, display: 'flex', gap: 6 }}>
                  <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>+ Nouvelle</button>
                  <button className="btn" style={{ padding: '7px 10px' }} title="Importer un fichier JSON" onClick={() => importRef.current?.click()}>↑</button>
                </div>
              )}
            </div>
          </aside>

          {/* ── Main ── */}
          <main className="main">
            {genLoading ? (
              <div className="gen-overlay">
                <span className="spinner-lg" />
                <div className="gen-overlay-title">Génération PESTEL en cours…</div>
                <div className="gen-overlay-sub">Claude analyse votre contexte et identifie les facteurs macro-environnementaux</div>
              </div>
            ) : !active ? (
              <div className="empty-cta" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div className="empty-icon" style={{ fontSize: 52 }}>⬡</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, fontStyle: 'italic', marginBottom: 8 }}>Analyse PESTEL</div>
                <div className="empty-txt" style={{ maxWidth: 360, margin: '0 auto' }}>
                  Créez une analyse manuellement, laissez l'IA la générer depuis votre contexte, ou importez un fichier JSON existant.
                </div>
              </div>
            ) : (
              <>
                {/* ── AI generated banner ── */}
                {active.generatedByAI && active.genHeadline && (
                  <div className="gen-banner">
                    <span className="gen-banner-icon">✦</span>
                    <div className="gen-banner-text">
                      <b>Généré par IA</b> — {active.genHeadline}
                      <div style={{ marginTop: 3, fontSize: 11, color: 'var(--muted)' }}>Vous pouvez modifier, ajouter ou supprimer des facteurs librement.</div>
                    </div>
                  </div>
                )}

                {/* ── Quick synthesis (if AI-generated) ── */}
                {active.quickSynthesis && (
                  <div className="quick-synth">
                    <div>
                      <div className="qs-col-title" style={{ color: '#22d3a5' }}>Opportunités détectées</div>
                      {(active.quickSynthesis.top_opportunities || []).map((o, i) => (
                        <div key={i} className="qs-item"><span style={{ color: '#22d3a5', flexShrink: 0 }}>↑</span>{o}</div>
                      ))}
                    </div>
                    <div>
                      <div className="qs-col-title" style={{ color: '#f87171' }}>Menaces principales</div>
                      {(active.quickSynthesis.top_threats || []).map((t, i) => (
                        <div key={i} className="qs-item"><span style={{ color: '#f87171', flexShrink: 0 }}>↓</span>{t}</div>
                      ))}
                    </div>
                    <div>
                      <div className="qs-col-title" style={{ color: '#facc15' }}>Facteur critique</div>
                      {active.quickSynthesis.critical_factor && (
                        <div className="qs-item"><span style={{ color: '#facc15', flexShrink: 0 }}>⚠</span>{active.quickSynthesis.critical_factor}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Stats ── */}
                <div className="stats-row">
                  {[
                    { val: totalFactors,       lbl: 'Facteurs identifiés', color: 'var(--text)' },
                    { val: totalOpportunities, lbl: 'Opportunités',        color: '#22d3a5'     },
                    { val: totalThreats,       lbl: 'Menaces',             color: '#f87171'     },
                    { val: highImpact,         lbl: 'Impact fort',         color: '#f59e0b'     },
                  ].map((s, i) => (
                    <div key={i} className="stat-card">
                      <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="stat-lbl">{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* ── Radar view ── */}
                {viewMode === 'radar' && (
                  <div className="radar-wrap">
                    <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 18, fontStyle: 'italic', alignSelf: 'flex-start' }}>Radar PESTEL — {active.name}</div>
                    <RadarChart />
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {DIMENSIONS.map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'Geist Mono,monospace' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                          <span style={{ color: d.color }}>{d.label}</span>
                          <span style={{ color: 'var(--muted)' }}>{dimScore(d.id)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Table view ── */}
                {viewMode === 'table' && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
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
                                <td><span style={{ color: d.color, fontWeight: 700, fontFamily: 'Geist Mono,monospace', fontSize: 11 }}>{d.letter} {d.label}</span></td>
                                <td style={{ fontWeight: 600 }}>{f.title}</td>
                                <td><span className="chip" style={{ background: nat.color + '18', color: nat.color, border: `1px solid ${nat.color}30` }}>{nat.icon} {nat.label}</span></td>
                                <td><span className="chip" style={{ background: imp.bg, color: imp.color }}>{imp.label}</span></td>
                                <td style={{ color: 'var(--muted2)', fontSize: 11, fontFamily: 'Geist Mono,monospace' }}>{tf?.label}</td>
                                <td style={{ color: 'var(--muted2)', maxWidth: 200, fontSize: 11 }}>{f.description}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 2 }}>
                                    <button className="icon-btn" onClick={() => { setActiveDim(d.id); startEdit(d.id, f); setViewMode('grid') }}>✎</button>
                                    <button className="icon-btn" style={{ color: '#f87171' }} onClick={() => deleteFactor(d.id, f.id)}>✕</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                        {totalFactors === 0 && (
                          <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px', fontStyle: 'italic' }}>Aucun facteur — ajoutez-en dans la vue Grille</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Grid view ── */}
                {viewMode === 'grid' && (
                  <>
                    <div className="dim-tabs">
                      <button className="dim-tab" style={{ background: activeDim === 'all' ? 'var(--surface3)' : 'var(--surface2)', color: activeDim === 'all' ? 'var(--text)' : 'var(--muted2)', borderColor: activeDim === 'all' ? 'var(--border2)' : 'var(--border)' }}
                        onClick={() => setActiveDim('all')}>Toutes</button>
                      {DIMENSIONS.map(d => {
                        const count = getDimFactors(d.id).length
                        const isSel = activeDim === d.id
                        return (
                          <button key={d.id} className="dim-tab" onClick={() => setActiveDim(d.id)}
                            style={{ background: isSel ? d.bg : 'var(--surface2)', border: `1px solid ${isSel ? d.border : 'var(--border2)'}`, color: isSel ? d.color : 'var(--muted2)' }}>
                            <span className="dim-tab-letter" style={{ background: d.bg, color: d.color }}>{d.letter}</span>
                            {d.label}
                            {count > 0 && <span className="dim-tab-count">({count})</span>}
                          </button>
                        )
                      })}
                    </div>

                    {activeDim === 'all' && (
                      <div className="pestel-grid">
                        {DIMENSIONS.map(d => {
                          const factors = getDimFactors(d.id)
                          return (
                            <div key={d.id} className="dim-section">
                              <div className="dim-section-hd">
                                <div className="dim-badge" style={{ background: d.bg, color: d.color }}>{d.letter}</div>
                                <div style={{ flex: 1 }}>
                                  <div className="dim-section-name" style={{ color: d.color }}>{d.label}</div>
                                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace' }}>{d.desc.slice(0, 38)}…</div>
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace' }}>{factors.length}</span>
                              </div>
                              <div className="dim-factor-list">
                                {factors.length === 0 && <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', padding: '4px 2px' }}>Aucun facteur</div>}
                                {factors.map(f => {
                                  const nat = NATURE_OPTIONS[f.nature]
                                  const imp = IMPACT_LEVELS[f.impact]
                                  return (
                                    <div key={f.id} className="factor-card">
                                      <div className="factor-header">
                                        <div className="factor-nature-dot" style={{ background: nat.color }} />
                                        <span className="factor-title-text">{f.title}</span>
                                        <div className="factor-actions">
                                          <button className="icon-btn" onClick={() => startEdit(d.id, f)}>✎</button>
                                          <button className="icon-btn" style={{ color: '#f87171' }} onClick={() => deleteFactor(d.id, f.id)}>✕</button>
                                        </div>
                                      </div>
                                      {f.description && <div className="factor-desc">{f.description.slice(0, 80)}{f.description.length > 80 ? '…' : ''}</div>}
                                      <div className="factor-chips">
                                        <span className="chip" style={{ background: nat.color + '18', color: nat.color, border: `1px solid ${nat.color}30` }}>{nat.icon} {nat.label}</span>
                                        <span className="chip" style={{ background: imp.bg, color: imp.color, border: `1px solid ${imp.color}30` }}>{imp.label}</span>
                                        <span className="chip" style={{ background: 'var(--surface3)', color: 'var(--muted2)', border: '1px solid var(--border)' }}>{TIMEFRAME_OPTIONS[f.timeframe]?.label}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="dim-add-btn" onClick={() => openAdd(d.id)}>+ Ajouter un facteur {d.label.toLowerCase()}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {activeDim !== 'all' && (() => {
                      const d = DIMENSIONS.find(x => x.id === activeDim)
                      if (!d) return null
                      return (
                        <div className="single-dim">
                          <div className="single-dim-hd" style={{ background: d.bg, borderColor: d.border }}>
                            <div className="single-dim-icon" style={{ background: d.bg, color: d.color, border: `1px solid ${d.border}` }}>{d.letter}</div>
                            <div style={{ flex: 1 }}>
                              <div className="single-dim-title" style={{ color: d.color }}>{d.label}</div>
                              <div className="single-dim-desc">{d.desc}</div>
                              <div className="example-chips">
                                {d.examples.map(ex => (
                                  <span key={ex} className="example-chip"
                                    onClick={() => { setFormDim(d.id); setEditFactor(null); setFactorForm({ ...EMPTY_FACTOR, title: ex }); setShowFactorForm(true) }}>
                                    {ex}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button className="btn primary" onClick={() => openAdd(d.id)}>+ Ajouter</button>
                          </div>

                          {getDimFactors(activeDim).length === 0 && (
                            <div className="empty-cta" style={{ border: '1px dashed var(--border2)', borderRadius: 12, padding: '40px' }}>
                              <div className="empty-icon">{d.icon}</div>
                              <div className="empty-txt">Aucun facteur {d.label.toLowerCase()} — cliquez sur un exemple ou "+ Ajouter"</div>
                            </div>
                          )}

                          {getDimFactors(activeDim).map(f => {
                            const nat = NATURE_OPTIONS[f.nature]
                            const imp = IMPACT_LEVELS[f.impact]
                            const tf  = TIMEFRAME_OPTIONS[f.timeframe]
                            return (
                              <div key={f.id} className="factor-detail">
                                <div className="factor-detail-left">
                                  <div className="nature-icon" style={{ background: nat.color + '18', color: nat.color, border: `1px solid ${nat.color}30` }}>{nat.icon}</div>
                                  <div className="impact-dot" style={{ background: imp.color }} />
                                </div>
                                <div className="factor-detail-content">
                                  <div className="factor-detail-title">{f.title}</div>
                                  {f.description && <div className="factor-detail-desc">{f.description}</div>}
                                  {f.source && <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace', marginBottom: 6 }}>Source : {f.source}</div>}
                                  <div className="factor-detail-meta">
                                    <span className="chip" style={{ background: nat.color + '18', color: nat.color, border: `1px solid ${nat.color}30` }}>{nat.label}</span>
                                    <span className="chip" style={{ background: imp.bg, color: imp.color, border: `1px solid ${imp.color}30` }}>Impact {imp.label}</span>
                                    <span className="chip" style={{ background: 'var(--surface3)', color: 'var(--muted2)', border: '1px solid var(--border)' }}>{tf?.label} ({tf?.sub})</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <button className="icon-btn" onClick={() => startEdit(d.id, f)}>✎</button>
                                  <button className="icon-btn" style={{ color: '#f87171' }} onClick={() => deleteFactor(activeDim, f.id)}>✕</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </>
                )}
              </>
            )}
          </main>
        </div>

        {/* ── Factor form modal ── */}
        {showFactorForm && (
          <div className="modal-overlay" onClick={() => { setShowFactorForm(false); setEditFactor(null) }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              {(() => {
                const d = DIMENSIONS.find(x => x.id === formDim)
                return (
                  <>
                    <div className="modal-title" style={{ color: d?.color }}>
                      {editFactor ? 'Modifier le facteur' : 'Nouveau facteur'} — {d?.label}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Titre du facteur *</label>
                      <input className="inp" placeholder={`Ex: ${d?.examples?.[0] || 'Facteur...'}`} value={factorForm.title} onChange={e => setFactorForm(p => ({ ...p, title: e.target.value }))} autoFocus />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="inp" rows={3} style={{ resize: 'vertical' }} placeholder="Décrivez l'impact sur votre activité…" value={factorForm.description} onChange={e => setFactorForm(p => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nature</label>
                      <div className="seg-group">
                        {Object.entries(NATURE_OPTIONS).map(([k, v]) => (
                          <button key={k} className={`seg-btn ${factorForm.nature === k ? 'sel' : ''}`}
                            style={factorForm.nature === k ? { background: v.color + '18', borderColor: v.color + '50', color: v.color } : {}}
                            onClick={() => setFactorForm(p => ({ ...p, nature: k }))}>
                            {v.icon} {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Impact</label>
                        <div className="seg-group" style={{ flexDirection: 'column' }}>
                          {Object.entries(IMPACT_LEVELS).map(([k, v]) => (
                            <button key={k} className={`seg-btn ${factorForm.impact === k ? 'sel' : ''}`}
                              style={factorForm.impact === k ? { background: v.bg, borderColor: v.color + '50', color: v.color } : {}}
                              onClick={() => setFactorForm(p => ({ ...p, impact: k }))}>
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Horizon temporel</label>
                        <div className="seg-group" style={{ flexDirection: 'column' }}>
                          {Object.entries(TIMEFRAME_OPTIONS).map(([k, v]) => (
                            <button key={k} className={`seg-btn ${factorForm.timeframe === k ? 'sel' : ''}`}
                              onClick={() => setFactorForm(p => ({ ...p, timeframe: k }))}>
                              {v.label} <span style={{ opacity: .6, fontSize: 10 }}>({v.sub})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 14 }}>
                      <label className="form-label">Source / Référence</label>
                      <input className="inp" placeholder="Ex: Rapport INSEE 2024, RGPD UE…" value={factorForm.source} onChange={e => setFactorForm(p => ({ ...p, source: e.target.value }))} />
                    </div>

                    <div className="modal-actions">
                      <button className="btn-cancel" onClick={() => { setShowFactorForm(false); setEditFactor(null) }}>Annuler</button>
                      <button className="btn-save" onClick={saveFactor}>{editFactor ? 'Mettre à jour' : 'Ajouter'}</button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── AI Analysis Panel ── */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-panel-hd">
            <span className="ai-panel-title">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-content">
            {aiLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted2)', fontSize: 13 }}>
                <span className="spinner" />Analyse macro-environnementale en cours…
              </div>
            )}

            {!aiLoading && aiResult && (
              <>
                {/* Score global */}
                {aiResult.score_global && (
                  <div>
                    <div className="ai-slbl">Score macro-environnemental</div>
                    <div className="ai-score-row">
                      <div className="ai-score-pill">
                        <div className="ai-score-val" style={{ color: '#22d3a5' }}>{(aiResult.score_global.opportunites || 3).toFixed(1)}</div>
                        <div className="ai-score-lbl">Opportunités</div>
                      </div>
                      <div className="ai-score-pill">
                        <div className="ai-score-val" style={{ color: '#f87171' }}>{(aiResult.score_global.menaces || 3).toFixed(1)}</div>
                        <div className="ai-score-lbl">Menaces</div>
                      </div>
                    </div>
                    <div className="ai-verdict" style={{ color: 'var(--muted2)', marginTop: 8 }}>
                      {aiResult.score_global.volatilite && <span style={{ marginRight: 8 }}>〰 {aiResult.score_global.volatilite}</span>}
                      {aiResult.score_global.verdict && <span>{aiResult.score_global.verdict}</span>}
                    </div>
                  </div>
                )}

                {aiResult.synthese && (
                  <div>
                    <div className="ai-slbl">Synthèse macro-environnementale</div>
                    <div className="ai-block">{aiResult.synthese}</div>
                  </div>
                )}

                {aiResult.dimensions?.length > 0 && (
                  <div>
                    <div className="ai-slbl">Analyse par dimension</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {aiResult.dimensions.map((d, i) => {
                        const dim = DIMENSIONS.find(x => x.id === d.id)
                        const tendColor = d.tendance === 'Favorable' ? '#22d3a5' : d.tendance === 'Défavorable' ? '#f87171' : 'var(--muted2)'
                        return (
                          <div key={i} className="ai-dim-card" style={{ borderColor: dim?.border || 'var(--border)' }}>
                            <div className="ai-dim-letter" style={{ background: dim?.bg || 'var(--surface3)', color: dim?.color || 'var(--muted2)' }}>
                              {dim?.letter || d.dimension?.charAt(0) || '?'}
                            </div>
                            <div className="ai-dim-content">
                              <div className="ai-dim-name" style={{ color: dim?.color || 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {d.dimension}
                                {d.tendance && <span style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: tendColor, padding: '1px 5px', borderRadius: 4, background: tendColor + '15', border: `1px solid ${tendColor}30` }}>{d.tendance}</span>}
                                {d.score && <span style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: 'var(--muted)' }}>{d.score}/5</span>}
                              </div>
                              <div className="ai-dim-text">{d.analyse}</div>
                              {d.opportunite_cle && <div style={{ fontSize: 10, color: '#22d3a5', marginTop: 4, padding: '3px 6px', background: 'rgba(34,211,165,.08)', borderRadius: 4, border: '1px solid rgba(34,211,165,.2)' }}>↑ {d.opportunite_cle}</div>}
                              {d.alerte && <div className="ai-dim-alert">⚠ {d.alerte}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {aiResult.interactions?.length > 0 && (
                  <div>
                    <div className="ai-slbl">Interactions entre dimensions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiResult.interactions.map((inter, i) => (
                        <div key={i} className="ai-interaction-item">
                          <span className="ai-int-type">{inter.type}</span>
                          <span style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.5 }}>{inter.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.opportunites?.length > 0 && (
                  <div>
                    <div className="ai-slbl">Opportunités clés à saisir</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiResult.opportunites.map((o, i) => (
                        <div key={i} className="ai-list-item" style={{ background: 'rgba(34,211,165,.06)', border: '1px solid rgba(34,211,165,.2)', borderRadius: 6 }}>
                          <span style={{ color: '#22d3a5' }}>↑</span>{o}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.menaces?.length > 0 && (
                  <div>
                    <div className="ai-slbl">Menaces prioritaires</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiResult.menaces.map((m, i) => (
                        <div key={i} className="ai-list-item" style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 6 }}>
                          <span style={{ color: '#f87171' }}>↓</span>{m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.priorites?.length > 0 && (
                  <div>
                    <div className="ai-slbl">Actions stratégiques recommandées</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiResult.priorites.map((p, i) => (
                        <div key={i} className="ai-priority-item">
                          <span className="ai-priority-num">#{i + 1}</span>
                          <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.veille?.length > 0 && (
                  <div>
                    <div className="ai-slbl">Signaux à surveiller</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiResult.veille.map((v, i) => {
                        const dim = DIMENSIONS.find(x => x.id === v.dimension)
                        return (
                          <div key={i} className="ai-veille-item">
                            {dim && <span style={{ color: dim.color, fontSize: 12, flexShrink: 0 }}>{dim.letter}</span>}
                            <span style={{ flex: 1, fontSize: 11, color: 'var(--text)' }}>{v.signal}</span>
                            <span className="ai-veille-freq">{v.frequence}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {aiResult.conclusion && (
                  <div>
                    <div className="ai-slbl">Verdict stratégique</div>
                    <div className="ai-block" style={{ fontStyle: 'italic', color: 'var(--muted2)' }}>{aiResult.conclusion}</div>
                  </div>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div className="empty-cta">
                <div className="empty-icon">✦</div>
                <div className="empty-txt">
                  Cliquez sur <b style={{ color: 'var(--accent2)' }}>Analyser</b> pour obtenir une synthèse macro-environnementale, les interactions entre dimensions et des recommandations stratégiques.
                </div>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <div className={`toast ${toast.type || ''}`}>
            {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}