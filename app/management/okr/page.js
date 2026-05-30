'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`

const STATUS_CONFIG = {
  on_track:    { label:'On Track',    color:'#22d3a5', bg:'rgba(34,211,165,.1)',  icon:'●' },
  at_risk:     { label:'At Risk',     color:'#f59e0b', bg:'rgba(245,158,11,.1)',  icon:'◐' },
  off_track:   { label:'Off Track',   color:'#f87171', bg:'rgba(248,113,113,.1)', icon:'○' },
  completed:   { label:'Completed',   color:'#818cf8', bg:'rgba(129,140,248,.1)', icon:'◉' },
  not_started: { label:'Not Started', color:'#6b6a7a', bg:'rgba(107,106,122,.1)', icon:'◌' },
}

const PERIODS = ['Q1','Q2','Q3','Q4','H1','H2','Annuel','Sprint','Personnalisé']
const LEVELS  = [
  { id:'company',  label:'Entreprise', icon:'⬡', color:'#6366f1' },
  { id:'team',     label:'Équipe',     icon:'◈', color:'#22d3a5' },
  { id:'personal', label:'Individuel', icon:'◎', color:'#f59e0b' },
]

const EMPTY_OBJ = { title:'', description:'', level:'company', period:'Q1', year:new Date().getFullYear().toString(), status:'not_started' }
const EMPTY_KR  = { title:'', metric:'', target:'', current:'', unit:'', status:'not_started', notes:'' }

const calcProgress = (current, target) => {
  const c = parseFloat(current), t = parseFloat(target)
  if (!t || isNaN(c) || isNaN(t)) return 0
  return Math.min(100, Math.round((c/t)*100))
}
const avgProgress = (krs = []) => {
  if (!krs.length) return 0
  return Math.round(krs.reduce((s, kr) => s + calcProgress(kr.current, kr.target), 0) / krs.length)
}
const inferStatus = (p) => {
  if (p >= 100) return 'completed'
  if (p >= 70)  return 'on_track'
  if (p >= 40)  return 'at_risk'
  if (p > 0)    return 'off_track'
  return 'not_started'
}

// ─── Progress Ring ────────────────────────────────────────────
function ProgressRing({ progress, size = 44, stroke = 3, color = '#6366f1' }) {
  const r    = (size - stroke*2) / 2
  const circ = 2 * Math.PI * r
  const off  = circ - (progress/100) * circ
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition:'stroke-dashoffset .5s ease' }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        fill="var(--text)" fontSize={size*.22} fontFamily="Geist Mono,monospace" fontWeight="500"
        style={{ transform:'rotate(90deg)', transformOrigin:`${size/2}px ${size/2}px` }}>
        {progress}%
      </text>
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function OKRPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const fileRef      = useRef(null)

  const [project,      setProject]      = useState(null)
  const [analyses,     setAnalyses]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [phase,        setPhase]        = useState('list')  // 'list'|'setup-gen'|'setup-manual'|'canvas'

  // New cycle form
  const [newForm,      setNewForm]      = useState({ name:'', context:'', objective:'', year: new Date().getFullYear().toString() })

  // Objective form
  const [showObjForm,  setShowObjForm]  = useState(false)
  const [editObj,      setEditObj]      = useState(null)
  const [objForm,      setObjForm]      = useState(EMPTY_OBJ)
  const [expandedObjs, setExpandedObjs] = useState({})

  // KR form
  const [showKRForm,   setShowKRForm]   = useState(null)
  const [editKR,       setEditKR]       = useState(null)
  const [krForm,       setKRForm]       = useState(EMPTY_KR)

  // Filters
  const [filterLevel,  setFilterLevel]  = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // AI
  const [aiMode,       setAiMode]       = useState(null)   // null|'generating'|'analysing'|'done'
  const [aiStep,       setAiStep]       = useState(0)
  const [aiResult,     setAiResult]     = useState(null)
  const [showPanel,    setShowPanel]    = useState(false)
  const [panelTab,     setPanelTab]     = useState('summary')  // 'summary'|'objectives'|'priorities'

  const [toast,        setToast]        = useState(null)

  const GEN_STEPS = [
    'Analyse du contexte organisationnel…',
    'Définition des objectifs stratégiques…',
    'Création des Key Results mesurables…',
    'Vérification de l\'alignement vertical…',
    'Génération du plan de suivi…',
    'Finalisation du cycle OKR…',
  ]
  const ANALYSE_STEPS = [
    'Lecture des objectifs en cours…',
    'Évaluation de la progression des KRs…',
    'Analyse de la qualité et cohérence…',
    'Construction des recommandations…',
    'Génération du rapport stratégique…',
  ]

  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects||[]).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.OKR || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length-1]
          setActiveId(last.id)
          setAiResult(last.aiResult || null)
          setAiMode(last.aiResult ? 'done' : null)
          setPhase('canvas')
        }
      }
    } catch {}
  }, [projectId])

  // ── Persist ───────────────────────────────────────────────────
  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects||[]).map(p =>
        p.id !== projectId ? p : { ...p, tools:{ ...(p.tools||{}), OKR: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const active = analyses.find(a => a.id === activeId) || null

  const updateActive = useCallback((patch) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === activeId ? { ...a, ...patch } : a)
      persist(updated)
      return updated
    })
  }, [activeId, persist])

  // Restore AI result when switching cycles
  useEffect(() => {
    if (active?.aiResult) { setAiResult(active.aiResult); setAiMode('done') }
    else { setAiResult(null); setAiMode(null) }
  }, [activeId])

  // ── CRUD Analyses ─────────────────────────────────────────────
  const deleteAnalysis = (id) => {
    setAnalyses(prev => {
      const updated = prev.filter(a => a.id !== id)
      persist(updated)
      if (activeId === id) {
        const next = updated[updated.length-1]
        setActiveId(next?.id || null)
        setPhase(next ? 'canvas' : 'list')
        setAiResult(null); setAiMode(null)
      }
      return updated
    })
    showToast('Cycle supprimé', 'info')
  }

  // ── CRUD Objectives ───────────────────────────────────────────
  const saveObjective = () => {
    if (!objForm.title.trim()) return
    const obj = {
      id:         editObj?.id || uid(),
      ...objForm,
      keyResults: editObj?.keyResults || [],
      createdAt:  editObj?.createdAt  || new Date().toISOString(),
    }
    const objectives = editObj
      ? (active.objectives||[]).map(o => o.id === editObj.id ? obj : o)
      : [...(active.objectives||[]), obj]
    updateActive({ objectives })
    setShowObjForm(false); setEditObj(null); setObjForm(EMPTY_OBJ)
    showToast(editObj ? 'Objectif mis à jour' : 'Objectif ajouté ✓')
  }

  const deleteObjective = (id) => {
    const objectives = (active.objectives||[]).filter(o => o.id !== id)
    updateActive({ objectives })
    showToast('Objectif supprimé', 'info')
  }

  const startEditObj = (obj) => {
    setEditObj(obj)
    setObjForm({ title:obj.title, description:obj.description||'', level:obj.level, period:obj.period, year:obj.year||new Date().getFullYear().toString(), status:obj.status })
    setShowObjForm(true)
  }

  // ── CRUD Key Results ──────────────────────────────────────────
  const saveKR = (objectiveId) => {
    if (!krForm.title.trim()) return
    const kr = { id: editKR?.id || uid(), ...krForm }
    const objectives = (active.objectives||[]).map(o => {
      if (o.id !== objectiveId) return o
      const krs  = editKR ? (o.keyResults||[]).map(k => k.id===editKR.id ? kr : k) : [...(o.keyResults||[]), kr]
      const prog = avgProgress(krs)
      return { ...o, keyResults: krs, status: inferStatus(prog) }
    })
    updateActive({ objectives })
    setShowKRForm(null); setEditKR(null); setKRForm(EMPTY_KR)
    showToast(editKR ? 'KR mis à jour' : 'Key Result ajouté ✓')
  }

  const deleteKR = (objId, krId) => {
    const objectives = (active.objectives||[]).map(o => {
      if (o.id !== objId) return o
      const krs = (o.keyResults||[]).filter(k => k.id !== krId)
      return { ...o, keyResults: krs, status: inferStatus(avgProgress(krs)) }
    })
    updateActive({ objectives })
  }

  const updateKRProgress = (objId, krId, value) => {
    const objectives = (active.objectives||[]).map(o => {
      if (o.id !== objId) return o
      const krs = (o.keyResults||[]).map(k => k.id===krId ? { ...k, current:value } : k)
      return { ...o, keyResults: krs, status: inferStatus(avgProgress(krs)) }
    })
    updateActive({ objectives })
  }

  const startEditKR = (objId, kr) => {
    setEditKR(kr)
    setKRForm({ title:kr.title, metric:kr.metric||'', target:kr.target||'', current:kr.current||'', unit:kr.unit||'', status:kr.status, notes:kr.notes||'' })
    setShowKRForm(objId)
  }

  const toggleExpand = (id) => setExpandedObjs(p => ({ ...p, [id]: p[id]===false }))

  // ── Filters ───────────────────────────────────────────────────
  const visibleObjectives = (active?.objectives||[]).filter(o => {
    const lvl = filterLevel==='all' || o.level===filterLevel
    const st  = filterStatus==='all' || o.status===filterStatus
    return lvl && st
  })

  // ── Stats ─────────────────────────────────────────────────────
  const allObjs        = active?.objectives || []
  const totalObjs      = allObjs.length
  const totalKRs       = allObjs.reduce((s,o) => s+(o.keyResults?.length||0), 0)
  const completedObjs  = allObjs.filter(o => o.status==='completed').length
  const onTrackObjs    = allObjs.filter(o => o.status==='on_track').length
  const globalProgress = totalObjs===0 ? 0 : Math.round(allObjs.reduce((s,o) => s + avgProgress(o.keyResults), 0) / totalObjs)

  // ═══════════════════════════════════════
  // AI — MODE 1: Generate
  // ═══════════════════════════════════════
  const handleGenerate = async () => {
    if (!newForm.name.trim() || !newForm.context.trim()) return

    // Create cycle shell
    const cycle = {
      id:         uid(),
      name:       newForm.name.trim(),
      context:    newForm.context.trim(),
      objective:  newForm.objective.trim(),
      year:       newForm.year,
      mode:       'ai-generated',
      createdAt:  new Date().toISOString(),
      objectives: [],
      aiResult:   null,
    }
    const withNew = [...analyses, cycle]
    setAnalyses(withNew); persist(withNew)
    setActiveId(cycle.id)
    setPhase('canvas')
    setAiMode('generating'); setAiStep(0); setShowPanel(true)

    let step = 0
    const iv = setInterval(() => { step = Math.min(step+1, GEN_STEPS.length-1); setAiStep(step) }, 1000)

    try {
      const res  = await fetch('/api/generer-management/generer-okr', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({
          mode:          'generate',
          cycleName:     cycle.name,
          context:       cycle.context,
          objective:     cycle.objective,
          year:          cycle.year,
          projectName:   project?.name || '',
          projectTag:    project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Patch with generated objectives
      setAnalyses(prev => {
        const updated = prev.map(a => a.id === cycle.id
          ? { ...a, objectives: data.objectives, aiResult: data.analysis }
          : a
        )
        persist(updated)
        return updated
      })
      setAiResult(data.analysis)
      setAiMode('done')
      // Expand all generated objectives
      const expMap = {}
      data.objectives.forEach(o => { expMap[o.id] = true })
      setExpandedObjs(expMap)
      showToast(`${data.objectives.length} objectifs générés par l'IA ✓`)
    } catch (err) {
      showToast(err.message, 'error')
      setAiMode(null)
    } finally {
      clearInterval(iv)
      setNewForm({ name:'', context:'', objective:'', year: new Date().getFullYear().toString() })
    }
  }

  // ═══════════════════════════════════════
  // AI — MODE 2: Analyse existing
  // ═══════════════════════════════════════
  const handleAnalyse = async () => {
    if (!active?.objectives?.length) { showToast('Ajoutez au moins un objectif', 'error'); return }
    setAiMode('analysing'); setAiStep(0); setShowPanel(true)

    let step = 0
    const iv = setInterval(() => { step = Math.min(step+1, ANALYSE_STEPS.length-1); setAiStep(step) }, 1000)

    try {
      const res  = await fetch('/api/generer-management/generer-okr', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({
          mode:        'analyse',
          cycleName:   active.name,
          context:     active.context,
          objective:   active.objective,
          objectives:  active.objectives,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiResult(data.analysis)
      updateActive({ aiResult: data.analysis })
      setAiMode('done')
      showToast('Analyse stratégique générée ✓')
    } catch (err) {
      showToast(err.message, 'error')
      setAiMode(null)
    } finally {
      clearInterval(iv)
    }
  }

  // ── Export / Import ───────────────────────────────────────────
  const exportSingle = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ version:'2.0', exported: new Date().toISOString(), cycle: active }, null,2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `OKR_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(a.href)
    showToast('Export réussi ↓')
  }

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ version:'2.0', exported: new Date().toISOString(), project: project?.name, cycles: analyses }, null,2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `OKR_ALL_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(a.href)
    showToast(`${analyses.length} cycle(s) exporté(s)`)
  }

  const importFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.cycle) {
          const imported = { ...data.cycle, id:uid(), name:data.cycle.name+' (importé)', createdAt:new Date().toISOString() }
          const updated  = [...analyses, imported]
          setAnalyses(updated); persist(updated)
          setActiveId(imported.id); setPhase('canvas')
          setAiResult(imported.aiResult||null); setAiMode(imported.aiResult?'done':null)
          showToast(`Cycle "${imported.name}" importé`)
        } else if (data.cycles) {
          const imported = data.cycles.map(c => ({ ...c, id:uid(), name:c.name+' (importé)', createdAt:new Date().toISOString() }))
          const updated  = [...analyses, ...imported]
          setAnalyses(updated); persist(updated)
          setActiveId(imported[imported.length-1].id); setPhase('canvas')
          showToast(`${imported.length} cycle(s) importé(s)`)
        }
      } catch { showToast('Fichier JSON invalide', 'error') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const isAiRunning    = aiMode==='generating' || aiMode==='analysing'
  const currentSteps   = aiMode==='generating' ? GEN_STEPS : ANALYSE_STEPS

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
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
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp{ from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }

        .okr-root { min-height:100vh; display:flex; flex-direction:column; }

        /* ── Topbar ── */
        .topbar {
          height:56px; background:var(--surface); border-bottom:1px solid var(--border);
          display:flex; align-items:center; padding:0 20px; gap:10px;
          position:sticky; top:0; z-index:100; flex-shrink:0;
        }
        .back-btn {
          display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:6px;
          background:var(--surface2); border:1px solid var(--border2); color:var(--muted2);
          font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s;
        }
        .back-btn:hover { color:var(--text); }
        .topbar-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .topbar-sub { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .topbar-right { margin-left:auto; display:flex; gap:6px; align-items:center; }
        .tbtn {
          display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:6px; cursor:pointer;
          font-family:'Geist Mono',monospace; font-size:11px; border:1px solid var(--border2);
          background:var(--surface2); color:var(--muted2); transition:all .15s; white-space:nowrap;
        }
        .tbtn:hover { color:var(--text); border-color:rgba(255,255,255,.2); }
        .tbtn.ai { background:rgba(129,140,248,.08); border-color:rgba(129,140,248,.25); color:var(--accent2); }
        .tbtn.ai:hover { background:rgba(129,140,248,.18); }
        .tbtn:disabled { opacity:.4; cursor:not-allowed; }

        /* ── Body ── */
        .okr-body { flex:1; display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 56px); overflow:hidden; }

        /* ── Sidebar ── */
        .sidebar { background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
        .sb-hdr { padding:12px 14px 8px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .sb-lbl { font-size:9px; color:var(--muted); letter-spacing:.12em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .sb-list { flex:1; overflow-y:auto; padding:6px 8px; display:flex; flex-direction:column; gap:2px; }

        .cycle-row { padding:9px 10px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
        .cycle-row:hover { background:var(--surface2); }
        .cycle-row.active { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.25); }
        .cr-head { display:flex; align-items:center; justify-content:space-between; }
        .cr-name { font-size:12px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
        .cr-del { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; padding:1px 4px; flex-shrink:0; }
        .cycle-row:hover .cr-del { opacity:1; }
        .cr-meta { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:2px; }

        /* Health widget */
        .health-w { margin:0 10px 10px; padding:11px 12px; border-radius:8px; background:var(--surface2); border:1px solid var(--border); flex-shrink:0; }
        .hw-lbl { font-size:9px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
        .hw-score { font-size:26px; font-weight:800; line-height:1; margin-bottom:4px; }
        .hw-bar-bg { height:4px; background:var(--border2); border-radius:2px; margin-bottom:8px; overflow:hidden; }
        .hw-bar { height:100%; border-radius:2px; transition:width .8s ease; }
        .hw-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; }
        .hw-cell { display:flex; align-items:center; gap:5px; font-size:10px; font-family:'Geist Mono',monospace; }
        .hw-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

        .sb-footer { padding:10px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px; flex-shrink:0; }
        .sb-new-btn {
          width:100%; padding:8px; border-radius:7px; border:1px dashed var(--border2);
          background:transparent; color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px;
          cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; gap:6px;
        }
        .sb-new-btn:hover { border-color:var(--accent); color:var(--accent); }
        .sb-row { display:flex; gap:6px; }
        .sb-sm {
          flex:1; padding:6px; border-radius:6px; border:1px solid var(--border);
          background:var(--surface2); color:var(--muted); font-family:'Geist Mono',monospace; font-size:10px;
          cursor:pointer; transition:all .15s; text-align:center;
        }
        .sb-sm:hover { color:var(--text); border-color:var(--border2); }

        /* ── Main ── */
        .main { overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:18px; }

        /* Phase center */
        .phase-center { flex:1; display:flex; align-items:center; justify-content:center; padding:40px 24px; overflow-y:auto; }
        .phase-card { max-width:580px; width:100%; text-align:center; }
        .phase-icon { font-size:40px; opacity:.18; margin-bottom:18px; }
        .phase-title { font-family:'Instrument Serif',serif; font-size:26px; font-style:italic; margin-bottom:8px; }
        .phase-sub { font-size:13px; color:var(--muted2); line-height:1.7; margin-bottom:28px; }
        .mode-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; text-align:left; }
        .mode-card {
          padding:20px; border-radius:12px; cursor:pointer; transition:all .2s;
          background:var(--surface); border:1px solid var(--border2);
        }
        .mode-card:hover { border-color:var(--accent); transform:translateY(-2px); }
        .mode-icon { font-size:22px; margin-bottom:10px; }
        .mode-title { font-size:14px; font-weight:700; color:var(--text); margin-bottom:4px; }
        .mode-desc { font-size:11px; color:var(--muted2); line-height:1.6; }

        /* Setup form */
        .setup-form { max-width:520px; width:100%; }
        .sf-title { font-family:'Instrument Serif',serif; font-size:22px; font-style:italic; margin-bottom:18px; }
        .sf-row { margin-bottom:14px; }
        .sf-lbl { display:block; font-size:9px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:5px; }
        .sf-input {
          width:100%; background:var(--bg); border:1px solid var(--border2);
          border-radius:8px; padding:10px 13px; font-family:'Syne',sans-serif;
          font-size:13px; color:var(--text); outline:none; transition:border-color .15s;
        }
        .sf-input:focus { border-color:var(--accent); }
        .sf-input::placeholder { color:var(--muted); }
        textarea.sf-input { resize:vertical; }
        .sf-btns { display:flex; gap:10px; margin-top:18px; }
        .sf-primary {
          flex:1; padding:12px; border-radius:8px; border:none; cursor:pointer;
          background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#fff;
          font-family:'Syne',sans-serif; font-weight:700; font-size:14px;
          display:flex; align-items:center; justify-content:center; gap:8px; transition:opacity .15s;
        }
        .sf-primary:hover:not(:disabled) { opacity:.85; }
        .sf-primary:disabled { opacity:.4; cursor:not-allowed; }
        .sf-secondary {
          padding:12px 18px; border-radius:8px; cursor:pointer;
          background:var(--surface2); border:1px solid var(--border2); color:var(--muted2);
          font-family:'Syne',sans-serif; font-size:13px; transition:all .15s;
        }
        .sf-secondary:hover { color:var(--text); }

        /* ── Canvas stats ── */
        .stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
        .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:13px 15px; }
        .stat-val { font-size:24px; font-weight:800; font-family:'Geist Mono',monospace; }
        .stat-lbl { font-size:9px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; margin-top:3px; font-family:'Geist Mono',monospace; }

        /* Global bar */
        .global-bar-row { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:14px; }
        .gb-track { flex:1; height:7px; background:var(--surface3); border-radius:99px; overflow:hidden; }
        .gb-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,var(--accent),var(--accent2)); transition:width .5s ease; }
        .gb-lbl { font-size:11px; color:var(--muted2); font-family:'Geist Mono',monospace; white-space:nowrap; }

        /* ── AI loading bar ── */
        .ai-loading-bar { padding:12px 16px; border-radius:10px; background:rgba(129,140,248,.06); border:1px solid rgba(129,140,248,.2); display:flex; flex-direction:column; gap:6px; }

        /* Filters */
        .filters-row { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
        .fchip { padding:5px 11px; border-radius:99px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .fchip.active { background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.35); color:var(--accent2); }
        .fchip:hover:not(.active) { color:var(--text); }
        .f-sep { width:1px; height:18px; background:var(--border2); }

        /* ── Objective card ── */
        .obj-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; transition:border-color .15s; animation:fadeUp .3s ease both; }
        .obj-card:hover { border-color:var(--border2); }
        .obj-hdr { padding:14px 16px; display:flex; align-items:center; gap:10px; cursor:pointer; }
        .obj-info { flex:1; min-width:0; }
        .obj-title { font-size:14px; font-weight:700; color:var(--text); }
        .obj-tags { display:flex; gap:6px; align-items:center; margin-top:4px; flex-wrap:wrap; }
        .lvl-badge { padding:2px 7px; border-radius:4px; font-size:10px; font-family:'Geist Mono',monospace; font-weight:600; display:flex; align-items:center; gap:3px; }
        .per-badge { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .desc-snip { font-size:10px; color:var(--muted); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .obj-right { display:flex; align-items:center; gap:6px; }
        .st-badge { padding:3px 8px; border-radius:4px; font-size:10px; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:4px; }
        .icon-btn { width:24px; height:24px; border-radius:5px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:12px; color:var(--muted2); transition:all .15s; }
        .icon-btn:hover { background:var(--surface3); color:var(--text); }
        .expand-caret { font-size:9px; color:var(--muted); transition:transform .2s; }
        .expand-caret.open { transform:rotate(90deg); }

        /* ── KRs ── */
        .krs-body { border-top:1px solid var(--border); }
        .kr-row { padding:11px 16px; border-bottom:1px solid var(--border); display:flex; flex-direction:column; gap:7px; }
        .kr-row:last-of-type { border-bottom:none; }
        .kr-hdr { display:flex; align-items:center; gap:8px; }
        .kr-num { width:18px; height:18px; border-radius:4px; background:var(--surface3); display:flex; align-items:center; justify-content:center; font-size:9px; color:var(--muted); font-family:'Geist Mono',monospace; flex-shrink:0; }
        .kr-title { font-size:12px; font-weight:600; color:var(--text); flex:1; }
        .kr-metric { font-size:10px; color:var(--muted2); font-family:'Geist Mono',monospace; }
        .kr-prog-row { display:flex; align-items:center; gap:8px; padding-left:26px; }
        .kr-current-input { width:68px; background:var(--bg); border:1px solid var(--border2); border-radius:4px; padding:3px 6px; font-family:'Geist Mono',monospace; font-size:11px; color:var(--text); outline:none; text-align:center; transition:border-color .15s; }
        .kr-current-input:focus { border-color:var(--accent); }
        .kr-tgt { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .kr-track { flex:1; height:5px; background:var(--surface3); border-radius:99px; overflow:hidden; }
        .kr-fill { height:100%; border-radius:99px; transition:width .3s ease; }
        .kr-pct { font-size:10px; color:var(--muted2); font-family:'Geist Mono',monospace; min-width:30px; text-align:right; }

        .kr-form-wrap { padding:12px 16px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px; }
        .kr-form-title { font-family:'Instrument Serif',serif; font-size:13px; font-style:italic; color:var(--text); }
        .kr-form-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .inp { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:8px 10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--text); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--accent); }
        .inp::placeholder { color:var(--muted); }
        .kr-form-lbl { display:block; font-size:9px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:4px; }
        .kr-form-btns { display:flex; gap:6px; margin-top:4px; }
        .kr-save-btn { flex:1; padding:8px; border-radius:6px; border:none; cursor:pointer; background:var(--accent); color:#fff; font-family:'Syne',sans-serif; font-weight:700; font-size:12px; }
        .kr-cancel-btn { padding:8px 14px; border-radius:6px; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); font-family:'Syne',sans-serif; font-size:12px; cursor:pointer; }

        .add-kr-row { padding:9px 16px; border-top:1px solid var(--border); }
        .add-obj-btn { border:2px dashed var(--border2); border-radius:12px; padding:18px; text-align:center; cursor:pointer; transition:all .2s; color:var(--muted2); font-size:12px; font-family:'Geist Mono',monospace; }
        .add-obj-btn:hover { border-color:var(--accent); color:var(--accent); }

        /* ── Objective Modal ── */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:200; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
        .modal { background:var(--surface); border:1px solid var(--border2); border-radius:16px; padding:24px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,.5); }
        .modal-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; margin-bottom:18px; }
        .fg { margin-bottom:13px; }
        .fl { display:block; font-size:9px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:5px; }
        .form-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .sel { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:8px 10px; font-family:'Syne',sans-serif; font-size:13px; color:var(--text); outline:none; cursor:pointer; }
        .sel:focus { border-color:var(--accent); }
        select.sel option { background:var(--surface2); }
        .level-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
        .lv-opt { padding:10px 6px; border-radius:8px; border:1px solid var(--border2); cursor:pointer; text-align:center; transition:all .15s; }
        .lv-opt.sel-lv { border-color:var(--accent); background:rgba(99,102,241,.1); }
        .lv-opt:hover:not(.sel-lv) { background:var(--surface2); }
        .lv-icon { font-size:18px; margin-bottom:4px; }
        .lv-label { font-size:10px; color:var(--muted2); font-family:'Geist Mono',monospace; }
        .modal-footer { display:flex; gap:8px; margin-top:18px; }
        .m-primary { flex:1; padding:10px; border-radius:8px; cursor:pointer; background:var(--accent); border:none; color:#fff; font-family:'Syne',sans-serif; font-size:13px; font-weight:600; }
        .m-cancel { padding:10px 16px; border-radius:8px; cursor:pointer; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Syne',sans-serif; font-size:13px; }

        /* ── AI Panel ── */
        .ai-panel {
          position:fixed; right:0; top:56px; bottom:0; width:420px;
          background:var(--surface); border-left:1px solid var(--border);
          z-index:80; display:flex; flex-direction:column;
          transform:translateX(100%); transition:transform .3s ease;
          box-shadow:-12px 0 40px rgba(0,0,0,.4);
        }
        .ai-panel.open { transform:translateX(0); }
        .ai-ph { padding:14px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .ai-pt { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .ai-tabs { display:flex; gap:2px; padding:10px 14px 0; flex-shrink:0; }
        .ai-tab { padding:6px 13px; border-radius:6px 6px 0 0; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; border:1px solid transparent; background:transparent; color:var(--muted2); transition:all .15s; }
        .ai-tab.active { background:var(--surface2); border-color:var(--border); border-bottom-color:var(--surface2); color:var(--text); }
        .ai-body { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:12px; }

        .ai-block { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px; font-size:12px; color:var(--text); line-height:1.75; }
        .ai-slbl { font-size:9px; color:var(--muted2); letter-spacing:.12em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:8px; }
        .ai-obj-card { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:6px; animation:fadeUp .3s ease both; }
        .ai-obj-name { font-size:12px; font-weight:700; }
        .ai-score-row { display:flex; align-items:center; gap:8px; }
        .ai-score-track { flex:1; height:4px; background:var(--surface3); border-radius:99px; overflow:hidden; }
        .ai-score-fill { height:100%; border-radius:99px; transition:width .8s ease; }
        .ai-obj-text { font-size:11px; color:var(--muted2); line-height:1.6; }
        .ai-prio { display:flex; gap:8px; padding:8px 10px; background:var(--surface2); border-radius:6px; border:1px solid var(--border); }
        .ai-pn { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; padding-top:1px; min-width:18px; }
        .ai-pt2 { font-size:11px; color:var(--text); line-height:1.6; }
        .ai-kr-sug { padding:10px 12px; background:var(--surface2); border-radius:8px; border:1px solid var(--border); }
        .ai-empty { padding:30px 20px; text-align:center; }
        .ai-empty-icon { font-size:28px; opacity:.18; margin-bottom:12px; }
        .ai-empty-text { font-size:12px; color:var(--muted); line-height:1.7; }

        .spinner { width:13px; height:13px; border:2px solid var(--border2); border-top-color:var(--accent2); border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }

        /* Toast */
        .toast { position:fixed; bottom:22px; right:22px; z-index:600; background:var(--surface2); border:1px solid var(--border2); border-radius:8px; padding:10px 16px; font-size:12px; box-shadow:0 8px 32px rgba(0,0,0,.4); animation:slideUp .2s ease; display:flex; align-items:center; gap:8px; max-width:320px; }
        .toast.error { border-color:rgba(248,113,113,.35); color:#f87171; }
        .toast.info  { border-color:rgba(99,102,241,.3); }

        @media(max-width:900px) { .okr-body{grid-template-columns:1fr} .sidebar{display:none} .stats-row{grid-template-columns:repeat(3,1fr)} }
      `}</style>

      <div className="okr-root">

        {/* ══ TOPBAR ══ */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>
            ← Retour
          </button>
          <div>
            <div className="topbar-title">OKR Framework</div>
            {project && <div className="topbar-sub">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {phase === 'canvas' && active && (
              <>
                <button className="tbtn" onClick={exportSingle}>↓ Export</button>
                <button className="tbtn" onClick={exportAll}>↓ Tout</button>
                <button className="tbtn ai"
                  onClick={() => { setShowPanel(true); setPanelTab('summary'); if (!aiResult && !isAiRunning) handleAnalyse() }}
                  disabled={isAiRunning || !active?.objectives?.length}>
                  {isAiRunning && aiMode==='analysing'
                    ? <><span className="spinner"/>Analyse…</>
                    : '✦ Analyser IA'
                  }
                </button>
              </>
            )}
          </div>
        </header>

        <div className="okr-body">

          {/* ══ SIDEBAR ══ */}
          <aside className="sidebar">
            <div className="sb-hdr">
              <span className="sb-lbl">Cycles ({analyses.length})</span>
            </div>
            <div className="sb-list">
              {analyses.length === 0 && (
                <div style={{ padding:'20px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:28, opacity:.18, marginBottom:8 }}>◎</div>
                  <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.6 }}>Créez votre premier cycle OKR</div>
                </div>
              )}
              {analyses.map(a => {
                const nObj = a.objectives?.length || 0
                const nKR  = a.objectives?.reduce((s,o) => s+(o.keyResults?.length||0), 0) || 0
                const hasAI = !!a.aiResult
                return (
                  <div key={a.id}
                    className={`cycle-row ${activeId===a.id ? 'active' : ''}`}
                    onClick={() => { setActiveId(a.id); setPhase('canvas') }}>
                    <div className="cr-head">
                      <span className="cr-name">{a.name}</span>
                      <button className="cr-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                    </div>
                    <div className="cr-meta">{nObj} obj · {nKR} KR{hasAI ? ' · ✦' : ''}</div>
                  </div>
                )
              })}
            </div>

            {/* Health */}
            {active && totalObjs > 0 && (() => {
              const score = aiResult?.healthScore || globalProgress
              const scoreColor = score>=70 ? '#22d3a5' : score>=45 ? '#f59e0b' : '#f87171'
              return (
                <div className="health-w">
                  <div className="hw-lbl">Santé du cycle</div>
                  <div className="hw-score" style={{ color:scoreColor }}>
                    {score}<span style={{ fontSize:12, fontWeight:400, color:'var(--muted)' }}>/100</span>
                  </div>
                  <div className="hw-bar-bg">
                    <div className="hw-bar" style={{ width:`${score}%`, background:scoreColor }}/>
                  </div>
                  <div className="hw-grid">
                    <div className="hw-cell"><div className="hw-dot" style={{ background:'#22d3a5' }}/><span style={{ color:'var(--muted)' }}>OK</span><span style={{ fontWeight:600 }}>{onTrackObjs}</span></div>
                    <div className="hw-cell"><div className="hw-dot" style={{ background:'#f59e0b' }}/><span style={{ color:'var(--muted)' }}>⚠</span><span style={{ fontWeight:600 }}>{allObjs.filter(o=>o.status==='at_risk').length}</span></div>
                    <div className="hw-cell"><div className="hw-dot" style={{ background:'#f87171' }}/><span style={{ color:'var(--muted)' }}>✕</span><span style={{ fontWeight:600 }}>{allObjs.filter(o=>o.status==='off_track').length}</span></div>
                  </div>
                </div>
              )
            })()}

            <div className="sb-footer">
              <button className="sb-new-btn" onClick={() => setPhase('list')}>+ Nouveau cycle</button>
              <div className="sb-row">
                <button className="sb-sm" onClick={() => fileRef.current?.click()}>↑ Import</button>
                {analyses.length > 0 && <button className="sb-sm" onClick={exportAll}>↓ Tout</button>}
              </div>
            </div>
          </aside>

          {/* ══ MAIN ══ */}
          <main className="main">

            {/* ── PHASE: list / mode selection ── */}
            {(phase==='list' || phase==='setup-gen' || phase==='setup-manual') && (
              <div className="phase-center">

                {phase==='list' && (
                  <div className="phase-card fade-up">
                    <div className="phase-icon">◎</div>
                    <div className="phase-title">Nouveau cycle OKR</div>
                    <div className="phase-sub">Choisissez votre méthode :<br/>génération IA complète ou construction manuelle.</div>
                    <div className="mode-grid">
                      <div className="mode-card" onClick={() => setPhase('setup-gen')}>
                        <div className="mode-icon">✦</div>
                        <div className="mode-title">Génération IA automatique</div>
                        <div className="mode-desc">Décrivez votre organisation en quelques lignes. L'IA crée 3-5 objectifs ambitieux avec leurs Key Results mesurables et une analyse stratégique.</div>
                        <div style={{ marginTop:10, fontSize:10, color:'var(--accent2)', fontFamily:'Geist Mono,monospace' }}>← Recommandé pour démarrer</div>
                      </div>
                      <div className="mode-card" onClick={() => setPhase('setup-manual')}>
                        <div className="mode-icon">✎</div>
                        <div className="mode-title">Construction manuelle</div>
                        <div className="mode-desc">Créez vos objectifs et KRs un par un. Contrôle total sur le contenu, avec accès à l'analyse IA à tout moment.</div>
                        <div style={{ marginTop:10, fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>← Contrôle total</div>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                      <span>ou</span>
                      <button className="tbtn" onClick={() => fileRef.current?.click()}>↑ Importer un fichier JSON</button>
                    </div>
                  </div>
                )}

                {/* ── Setup Generate ── */}
                {phase==='setup-gen' && (
                  <div className="setup-form fade-up">
                    <div className="sf-title">✦ Génération IA automatique</div>
                    <div className="sf-row">
                      <label className="sf-lbl">Nom du cycle *</label>
                      <input className="sf-input" value={newForm.name} onChange={e => setNewForm(p=>({...p,name:e.target.value}))}
                        placeholder="Ex: OKR Q2 2025 — Croissance" autoFocus
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl">Description de l'organisation *</label>
                      <textarea className="sf-input" rows={5} value={newForm.context} onChange={e => setNewForm(p=>({...p,context:e.target.value}))}
                        placeholder="Décrivez votre entreprise, secteur, équipe, taille, stade de développement, défis actuels, ressources disponibles, marchés ciblés… Plus c'est détaillé, meilleurs seront les OKRs générés."
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl">Ambition / Vision du cycle (optionnel)</label>
                      <input className="sf-input" value={newForm.objective} onChange={e => setNewForm(p=>({...p,objective:e.target.value}))}
                        placeholder="Ex: Doubler notre base client et atteindre la rentabilité"
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl">Année</label>
                      <input className="sf-input" type="number" value={newForm.year} onChange={e => setNewForm(p=>({...p,year:e.target.value}))} min="2024" max="2030" style={{ width:120 }}/>
                    </div>
                    <div className="sf-btns">
                      <button className="sf-secondary" onClick={() => setPhase('list')}>← Retour</button>
                      <button className="sf-primary"
                        disabled={!newForm.name.trim() || !newForm.context.trim() || isAiRunning}
                        onClick={handleGenerate}>
                        {isAiRunning
                          ? <><span className="spinner" style={{ borderTopColor:'#fff' }}/>Génération…</>
                          : <><span>✦</span> Générer le cycle OKR</>
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Setup Manual ── */}
                {phase==='setup-manual' && (
                  <div className="setup-form fade-up">
                    <div className="sf-title">✎ Construction manuelle</div>
                    <div className="sf-row">
                      <label className="sf-lbl">Nom du cycle *</label>
                      <input className="sf-input" value={newForm.name} onChange={e => setNewForm(p=>({...p,name:e.target.value}))}
                        placeholder="Ex: OKR Q3 2025" autoFocus
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl">Contexte (optionnel)</label>
                      <textarea className="sf-input" rows={3} value={newForm.context} onChange={e => setNewForm(p=>({...p,context:e.target.value}))}
                        placeholder="Vision, priorités stratégiques du cycle…"
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl">Ambition / Vision (optionnel)</label>
                      <input className="sf-input" value={newForm.objective} onChange={e => setNewForm(p=>({...p,objective:e.target.value}))}
                        placeholder="Ex: Leader du marché africain sur notre segment"
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-btns">
                      <button className="sf-secondary" onClick={() => setPhase('list')}>← Retour</button>
                      <button className="sf-primary" disabled={!newForm.name.trim()}
                        onClick={() => {
                          const cycle = { id:uid(), name:newForm.name.trim(), context:newForm.context.trim(), objective:newForm.objective.trim(), year:newForm.year, mode:'manual', createdAt:new Date().toISOString(), objectives:[], aiResult:null }
                          const updated = [...analyses, cycle]; setAnalyses(updated); persist(updated)
                          setActiveId(cycle.id); setPhase('canvas')
                          setNewForm({ name:'', context:'', objective:'', year:new Date().getFullYear().toString() })
                          showToast(`Cycle "${cycle.name}" créé`)
                        }}>
                        Créer le cycle
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PHASE: canvas ── */}
            {phase==='canvas' && active && (
              <>
                {/* Stats */}
                <div className="stats-row">
                  {[
                    { val:totalObjs,      lbl:'Objectifs' },
                    { val:totalKRs,       lbl:'Key Results' },
                    { val:completedObjs,  lbl:'Complétés',  c:'#22d3a5' },
                    { val:onTrackObjs,    lbl:'On Track',   c:'#6366f1' },
                    { val:`${globalProgress}%`, lbl:'Progression', c: globalProgress>=70?'#22d3a5':globalProgress>=40?'#f59e0b':'#f87171' },
                  ].map((s,i) => (
                    <div key={i} className="stat-card">
                      <div className="stat-val" style={s.c ? { color:s.c } : {}}>{s.val}</div>
                      <div className="stat-lbl">{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Global progress bar */}
                {totalObjs > 0 && (
                  <div className="global-bar-row">
                    <span style={{ fontSize:11, color:'var(--muted2)', fontFamily:'Geist Mono,monospace', whiteSpace:'nowrap' }}>
                      {active.name}
                    </span>
                    {active.objective && (
                      <span style={{ fontSize:10, color:'var(--muted)', fontStyle:'italic', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        — {active.objective}
                      </span>
                    )}
                    <div className="gb-track" style={{ flex:'0 0 200px' }}>
                      <div className="gb-fill" style={{ width:`${globalProgress}%` }}/>
                    </div>
                    <span className="gb-lbl">{globalProgress}%</span>
                    <ProgressRing progress={globalProgress} size={42}
                      color={globalProgress>=70?'#22d3a5':globalProgress>=40?'#f59e0b':'#6366f1'}/>
                  </div>
                )}

                {/* AI loading */}
                {isAiRunning && (
                  <div className="ai-loading-bar">
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span className="spinner"/>
                      <span style={{ fontSize:11, color:'var(--accent2)', fontFamily:'Geist Mono,monospace' }}>
                        {aiMode==='generating' ? GEN_STEPS[aiStep] : ANALYSE_STEPS[aiStep]}
                      </span>
                    </div>
                    <div style={{ height:3, background:'rgba(255,255,255,.06)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', background:'var(--accent2)', borderRadius:2, width:`${Math.round((aiStep+1)/currentSteps.length*100)}%`, transition:'width .8s ease' }}/>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="filters-row">
                  {['all', ...LEVELS.map(l=>l.id)].map(lv => (
                    <button key={lv} className={`fchip ${filterLevel===lv?'active':''}`} onClick={() => setFilterLevel(lv)}>
                      {lv==='all' ? 'Tous niveaux' : LEVELS.find(l=>l.id===lv)?.label}
                    </button>
                  ))}
                  <div className="f-sep"/>
                  {['all','on_track','at_risk','off_track','completed','not_started'].map(st => (
                    <button key={st} className={`fchip ${filterStatus===st?'active':''}`} onClick={() => setFilterStatus(st)}>
                      {st==='all' ? 'Tous' : STATUS_CONFIG[st]?.label}
                    </button>
                  ))}
                </div>

                {/* Objectives */}
                <div style={{ display:'flex', flexDirection:'column', gap:10, paddingRight: showPanel ? 440 : 0, transition:'padding-right .3s' }}>
                  {visibleObjectives.length===0 && totalObjs>0 && (
                    <div style={{ padding:'28px', border:'1px dashed var(--border2)', borderRadius:12, textAlign:'center', fontSize:12, color:'var(--muted)' }}>
                      Aucun objectif ne correspond aux filtres
                    </div>
                  )}

                  {visibleObjectives.map((obj, oi) => {
                    const prog  = avgProgress(obj.keyResults)
                    const st    = STATUS_CONFIG[obj.status] || STATUS_CONFIG.not_started
                    const lv    = LEVELS.find(l => l.id===obj.level) || LEVELS[0]
                    const open  = expandedObjs[obj.id] !== false  // default open

                    return (
                      <div key={obj.id} className="obj-card" style={{ animationDelay:`${oi*0.04}s` }}>
                        <div className="obj-hdr" onClick={() => toggleExpand(obj.id)}>
                          <ProgressRing progress={prog} size={40} color={st.color}/>
                          <div className="obj-info">
                            <div className="obj-title">{obj.title}</div>
                            <div className="obj-tags">
                              <span className="lvl-badge" style={{ background:`${lv.color}18`, color:lv.color, border:`1px solid ${lv.color}30` }}>
                                {lv.icon} {lv.label}
                              </span>
                              <span className="per-badge">{obj.period} {obj.year}</span>
                              {obj.description && <span className="desc-snip">{obj.description}</span>}
                            </div>
                          </div>
                          <div className="obj-right" onClick={e => e.stopPropagation()}>
                            <span className="st-badge" style={{ background:st.bg, color:st.color, border:`1px solid ${st.color}30` }}>
                              {st.icon} {st.label}
                            </span>
                            <button className="icon-btn" onClick={() => startEditObj(obj)}>✎</button>
                            <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteObjective(obj.id)}>✕</button>
                          </div>
                          <span className={`expand-caret ${open?'open':''}`}>▶</span>
                        </div>

                        {open && (
                          <div className="krs-body">
                            {(!obj.keyResults || obj.keyResults.length===0) && showKRForm!==obj.id && (
                              <div style={{ padding:'12px 16px', fontSize:11, color:'var(--muted)', fontStyle:'italic' }}>
                                Aucun Key Result — ajoutez-en un pour mesurer la progression
                              </div>
                            )}

                            {(obj.keyResults||[]).map((kr, ki) => {
                              const kprog    = calcProgress(kr.current, kr.target)
                              const barColor = kprog>=70 ? '#22d3a5' : kprog>=40 ? '#f59e0b' : '#f87171'
                              const kst      = STATUS_CONFIG[kr.status] || STATUS_CONFIG.not_started
                              return (
                                <div key={kr.id} className="kr-row">
                                  <div className="kr-hdr">
                                    <div className="kr-num">{ki+1}</div>
                                    <div className="kr-title">{kr.title}</div>
                                    {kr.metric && <span className="kr-metric">{kr.metric}</span>}
                                    <span className="st-badge" style={{ background:kst.bg, color:kst.color, border:`1px solid ${kst.color}30`, fontSize:10 }}>{kst.icon}</span>
                                    <button className="icon-btn" style={{ fontSize:10 }} onClick={() => startEditKR(obj.id, kr)}>✎</button>
                                    <button className="icon-btn" style={{ fontSize:10, color:'#f87171' }} onClick={() => deleteKR(obj.id, kr.id)}>✕</button>
                                  </div>
                                  <div className="kr-prog-row">
                                    <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace', whiteSpace:'nowrap' }}>Actuel :</span>
                                    <input className="kr-current-input" type="number" value={kr.current}
                                      onChange={e => updateKRProgress(obj.id, kr.id, e.target.value)}
                                      placeholder="0"/>
                                    <span className="kr-tgt">/ {kr.target||'?'} {kr.unit}</span>
                                    <div className="kr-track"><div className="kr-fill" style={{ width:`${kprog}%`, background:barColor }}/></div>
                                    <span className="kr-pct">{kprog}%</span>
                                  </div>
                                  {kr.notes && <div style={{ paddingLeft:26, fontSize:10, color:'var(--muted)', fontStyle:'italic' }}>{kr.notes}</div>}
                                </div>
                              )
                            })}

                            {/* KR form */}
                            {showKRForm===obj.id && (
                              <div className="kr-form-wrap">
                                <div className="kr-form-title">{editKR ? 'Modifier le Key Result' : 'Nouveau Key Result'}</div>
                                <div>
                                  <label className="kr-form-lbl">Titre du KR *</label>
                                  <input className="inp" value={krForm.title} onChange={e => setKRForm(p=>({...p,title:e.target.value}))}
                                    placeholder="Ex: Atteindre 10 000 utilisateurs actifs" autoFocus/>
                                </div>
                                <div className="kr-form-row">
                                  <div>
                                    <label className="kr-form-lbl">Métrique</label>
                                    <input className="inp" value={krForm.metric} onChange={e => setKRForm(p=>({...p,metric:e.target.value}))}
                                      placeholder="Ex: MAU, NPS, CA…"/>
                                  </div>
                                  <div>
                                    <label className="kr-form-lbl">Unité</label>
                                    <input className="inp" value={krForm.unit} onChange={e => setKRForm(p=>({...p,unit:e.target.value}))}
                                      placeholder="%, k€, pts, users"/>
                                  </div>
                                </div>
                                <div className="kr-form-row">
                                  <div>
                                    <label className="kr-form-lbl">Cible *</label>
                                    <input className="inp" type="number" value={krForm.target} onChange={e => setKRForm(p=>({...p,target:e.target.value}))} placeholder="100"/>
                                  </div>
                                  <div>
                                    <label className="kr-form-lbl">Actuel</label>
                                    <input className="inp" type="number" value={krForm.current} onChange={e => setKRForm(p=>({...p,current:e.target.value}))} placeholder="0"/>
                                  </div>
                                </div>
                                <div>
                                  <label className="kr-form-lbl">Notes</label>
                                  <input className="inp" value={krForm.notes} onChange={e => setKRForm(p=>({...p,notes:e.target.value}))}
                                    placeholder="Source de données, contexte de mesure…"/>
                                </div>
                                <div className="kr-form-btns">
                                  <button className="kr-save-btn" onClick={() => saveKR(obj.id)}>
                                    {editKR ? 'Mettre à jour' : 'Ajouter le KR'}
                                  </button>
                                  <button className="kr-cancel-btn" onClick={() => { setShowKRForm(null); setEditKR(null); setKRForm(EMPTY_KR) }}>
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            )}

                            {showKRForm!==obj.id && (
                              <div className="add-kr-row">
                                <button className="tbtn" style={{ fontSize:10 }}
                                  onClick={() => { setShowKRForm(obj.id); setEditKR(null); setKRForm(EMPTY_KR) }}>
                                  + Ajouter un Key Result
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add objective */}
                  <div className="add-obj-btn" onClick={() => { setEditObj(null); setObjForm(EMPTY_OBJ); setShowObjForm(true) }}>
                    + Ajouter un objectif
                  </div>
                </div>
              </>
            )}
          </main>
        </div>

        {/* ══ OBJECTIVE MODAL ══ */}
        {showObjForm && (
          <div className="modal-overlay" onClick={() => { setShowObjForm(false); setEditObj(null) }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{editObj ? 'Modifier l\'objectif' : 'Nouvel objectif'}</div>

              <div className="fg">
                <label className="fl">Titre de l'objectif *</label>
                <input className="inp" value={objForm.title} onChange={e => setObjForm(p=>({...p,title:e.target.value}))}
                  placeholder="Ex: Devenir leader incontesté sur notre marché" autoFocus/>
              </div>
              <div className="fg">
                <label className="fl">Description</label>
                <textarea className="inp" rows={2} value={objForm.description} onChange={e => setObjForm(p=>({...p,description:e.target.value}))}
                  placeholder="Contexte, ambition, résultat attendu…"/>
              </div>
              <div className="fg">
                <label className="fl">Niveau</label>
                <div className="level-grid">
                  {LEVELS.map(lv => (
                    <div key={lv.id} className={`lv-opt ${objForm.level===lv.id?'sel-lv':''}`}
                      style={objForm.level===lv.id ? { borderColor:lv.color, background:`${lv.color}15` } : {}}
                      onClick={() => setObjForm(p=>({...p,level:lv.id}))}>
                      <div className="lv-icon" style={{ color: objForm.level===lv.id ? lv.color : 'var(--muted2)' }}>{lv.icon}</div>
                      <div className="lv-label" style={{ color: objForm.level===lv.id ? lv.color : 'var(--muted2)' }}>{lv.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="fg" style={{ marginBottom:0 }}>
                  <label className="fl">Période</label>
                  <select className="sel inp" value={objForm.period} onChange={e => setObjForm(p=>({...p,period:e.target.value}))}>
                    {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="fg" style={{ marginBottom:0 }}>
                  <label className="fl">Année</label>
                  <input className="inp" type="number" value={objForm.year} onChange={e => setObjForm(p=>({...p,year:e.target.value}))} min="2024" max="2035"/>
                </div>
              </div>

              <div className="modal-footer">
                <button className="m-cancel" onClick={() => { setShowObjForm(false); setEditObj(null) }}>Annuler</button>
                <button className="m-primary" onClick={saveObjective}>{editObj ? 'Mettre à jour' : 'Créer l\'objectif'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ AI PANEL ══ */}
        <div className={`ai-panel ${showPanel?'open':''}`}>
          <div className="ai-ph">
            <span className="ai-pt">Analyse IA ✦</span>
            <button className="tbtn" onClick={() => setShowPanel(false)}>✕</button>
          </div>

          {/* Tabs */}
          {aiMode==='done' && aiResult && (
            <div className="ai-tabs">
              {[['summary','Synthèse'],['objectives','Objectifs'],['priorities','Priorités']].map(([id,label]) => (
                <button key={id} className={`ai-tab ${panelTab===id?'active':''}`} onClick={() => setPanelTab(id)}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="ai-body">

            {/* Loading */}
            {isAiRunning && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontSize:10, color:'var(--muted2)', fontFamily:'Geist Mono,monospace', marginBottom:4 }}>
                  {aiMode==='generating' ? '✦ Génération du cycle…' : '✦ Analyse en cours…'}
                </div>
                {currentSteps.map((step, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, transition:'all .4s',
                    background: i===aiStep ? 'rgba(129,140,248,.08)' : 'rgba(255,255,255,.02)',
                    border: i===aiStep ? '1px solid rgba(129,140,248,.2)' : '1px solid transparent',
                    opacity: i>aiStep ? .3 : 1,
                  }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      background: i<aiStep ? '#22d3a5' : i===aiStep ? 'var(--accent2)' : 'rgba(255,255,255,.05)' }}>
                      {i<aiStep
                        ? <span style={{ fontSize:9, color:'#000' }}>✓</span>
                        : i===aiStep ? <span className="spinner"/>
                        : <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,.2)', display:'block' }}/>
                      }
                    </div>
                    <span style={{ fontSize:11, color: i===aiStep ? 'var(--accent2)' : 'rgba(255,255,255,.3)', fontFamily:'Geist Mono,monospace' }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Result */}
            {aiMode==='done' && aiResult && !isAiRunning && (
              <>
                {/* Summary tab */}
                {panelTab==='summary' && (
                  <>
                    {aiResult.synthese && (
                      <div>
                        <div className="ai-slbl">Synthèse du cycle</div>
                        <div className="ai-block">{aiResult.synthese}</div>
                      </div>
                    )}
                    {aiResult.krs_suggeres?.length > 0 && (
                      <div>
                        <div className="ai-slbl">KRs suggérés</div>
                        {aiResult.krs_suggeres.map((kr, i) => (
                          <div key={i} className="ai-kr-sug" style={{ marginBottom:6 }}>
                            <div style={{ fontSize:11, fontWeight:700, marginBottom:3 }}>{kr.objectif}</div>
                            <div style={{ fontSize:11, color:'var(--muted2)' }}>{kr.kr}</div>
                            <div style={{ fontSize:10, color:'var(--accent2)', fontFamily:'Geist Mono,monospace', marginTop:3 }}>Cible : {kr.cible}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {aiResult.conclusion && (
                      <div className="ai-block" style={{ fontStyle:'italic', color:'var(--muted2)', fontSize:11 }}>
                        "{aiResult.conclusion}"
                      </div>
                    )}
                  </>
                )}

                {/* Objectives tab */}
                {panelTab==='objectives' && aiResult.objectifs?.length > 0 && (
                  <div>
                    <div className="ai-slbl">Analyse par objectif</div>
                    {aiResult.objectifs.map((o, i) => {
                      const sc = o.score>=70 ? '#22d3a5' : o.score>=40 ? '#f59e0b' : '#f87171'
                      return (
                        <div key={i} className="ai-obj-card" style={{ marginBottom:8, animationDelay:`${i*0.05}s` }}>
                          <div className="ai-obj-name">{o.titre}</div>
                          <div className="ai-score-row">
                            <div className="ai-score-track"><div className="ai-score-fill" style={{ width:`${o.score}%`, background:sc }}/></div>
                            <span style={{ fontSize:10, color:sc, fontFamily:'Geist Mono,monospace', minWidth:28 }}>{o.score}%</span>
                          </div>
                          <div className="ai-obj-text">{o.analyse}</div>
                          {o.suggestion && (
                            <div style={{ fontSize:10, color:'var(--accent2)', padding:'5px 8px', background:'rgba(129,140,248,.08)', borderRadius:5, border:'1px solid rgba(129,140,248,.15)' }}>
                              💡 {o.suggestion}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Priorities tab */}
                {panelTab==='priorities' && aiResult.priorites?.length > 0 && (
                  <div>
                    <div className="ai-slbl">Priorités d'action</div>
                    {aiResult.priorites.map((p, i) => (
                      <div key={i} className="ai-prio" style={{ marginBottom:6 }}>
                        <span className="ai-pn">#{i+1}</span>
                        <span className="ai-pt2">{p}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Re-analyse */}
                <button className="tbtn ai" style={{ width:'100%', justifyContent:'center', marginTop:8 }}
                  onClick={handleAnalyse} disabled={isAiRunning}>
                  ↻ Relancer l'analyse
                </button>
              </>
            )}

            {/* Empty */}
            {!isAiRunning && !aiResult && (
              <div className="ai-empty">
                <div className="ai-empty-icon">✦</div>
                <div className="ai-empty-text">
                  Cliquez sur <strong style={{ color:'var(--text)' }}>Analyser IA</strong> pour obtenir une évaluation complète de vos OKR, une analyse par objectif, et des priorités d'action concrètes.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden import */}
        <input ref={fileRef} type="file" accept=".json" hidden onChange={importFile}/>

        {/* Toast */}
        {toast && (
          <div className={`toast ${toast.type||''}`}>
            {toast.type==='error' ? '✕' : toast.type==='info' ? 'ℹ' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}