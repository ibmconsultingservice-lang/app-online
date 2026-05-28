'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const STATUS_CONFIG = {
  on_track:    { label: 'On Track',    color: '#22d3a5', bg: 'rgba(34,211,165,.1)',  icon: '●' },
  at_risk:     { label: 'At Risk',     color: '#f59e0b', bg: 'rgba(245,158,11,.1)',  icon: '◐' },
  off_track:   { label: 'Off Track',   color: '#f87171', bg: 'rgba(248,113,113,.1)', icon: '○' },
  completed:   { label: 'Completed',   color: '#818cf8', bg: 'rgba(129,140,248,.1)', icon: '◉' },
  not_started: { label: 'Not Started', color: '#6b6a7a', bg: 'rgba(107,106,122,.1)', icon: '◌' },
}

const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'Annuel', 'Sprint', 'Personnalisé']
const LEVELS  = [
  { id: 'company',  label: 'Entreprise',  icon: '⬡', color: '#6366f1' },
  { id: 'team',     label: 'Équipe',      icon: '◈', color: '#22d3a5' },
  { id: 'personal', label: 'Individuel',  icon: '◎', color: '#f59e0b' },
]

const EMPTY_OBJ = { title: '', description: '', level: 'company', period: 'Q1', year: new Date().getFullYear().toString(), status: 'not_started' }
const EMPTY_KR  = { title: '', metric: '', target: '', current: '', unit: '', status: 'not_started', notes: '' }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const calcProgress = (current, target) => {
  const c = parseFloat(current), t = parseFloat(target)
  if (!t || isNaN(c) || isNaN(t)) return 0
  return Math.min(100, Math.round((c / t) * 100))
}

const avgProgress = (krs = []) => {
  if (!krs.length) return 0
  return Math.round(krs.reduce((s, kr) => s + calcProgress(kr.current, kr.target), 0) / krs.length)
}

const inferStatus = (progress) => {
  if (progress >= 100) return 'completed'
  if (progress >= 70)  return 'on_track'
  if (progress >= 40)  return 'at_risk'
  if (progress > 0)    return 'off_track'
  return 'not_started'
}

// ─── OKR Page ─────────────────────────────────────────────────────────────────
export default function OKRPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,      setProject]      = useState(null)
  const [analyses,     setAnalyses]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [newAnalysis,  setNewAnalysis]  = useState({ name: '', context: '' })

  // Objective form
  const [showObjForm,  setShowObjForm]  = useState(false)
  const [editObj,      setEditObj]      = useState(null)
  const [objForm,      setObjForm]      = useState(EMPTY_OBJ)
  const [expandedObjs, setExpandedObjs] = useState({})

  // KR form
  const [showKRForm,   setShowKRForm]   = useState(null)  // objectiveId
  const [editKR,       setEditKR]       = useState(null)
  const [krForm,       setKRForm]       = useState(EMPTY_KR)

  // Filters
  const [filterLevel,  setFilterLevel]  = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

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
        const list = proj.tools?.OKR || []
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), OKR: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const active = analyses.find(a => a.id === activeId) || null

  const updateActive = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated)
    persist(updated)
  }

  // ── CRUD analyses ──
  const createAnalysis = () => {
    if (!newAnalysis.name.trim()) return
    const a = { id: uid(), name: newAnalysis.name.trim(), context: newAnalysis.context.trim(), createdAt: new Date().toISOString(), objectives: [], aiResult: null }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowNewForm(false); setNewAnalysis({ name: '', context: '' })
    showToast(`OKR "${a.name}" créé`)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) setActiveId(updated[updated.length - 1]?.id || null)
    showToast('Analyse supprimée', 'info')
  }

  // ── CRUD Objectives ──
  const saveObjective = () => {
    if (!objForm.title.trim()) return
    const obj = {
      id:          editObj?.id || uid(),
      ...objForm,
      keyResults:  editObj?.keyResults || [],
      createdAt:   editObj?.createdAt  || new Date().toISOString(),
    }
    const objectives = editObj
      ? (active.objectives || []).map(o => o.id === editObj.id ? obj : o)
      : [...(active.objectives || []), obj]
    updateActive({ objectives })
    setShowObjForm(false); setEditObj(null); setObjForm(EMPTY_OBJ)
    showToast(editObj ? 'Objectif mis à jour' : 'Objectif ajouté')
  }

  const deleteObjective = (id) => {
    const objectives = (active.objectives || []).filter(o => o.id !== id)
    updateActive({ objectives })
    showToast('Objectif supprimé', 'info')
  }

  const startEditObj = (obj) => {
    setEditObj(obj)
    setObjForm({ title: obj.title, description: obj.description || '', level: obj.level, period: obj.period, year: obj.year || new Date().getFullYear().toString(), status: obj.status })
    setShowObjForm(true)
  }

  // ── CRUD Key Results ──
  const saveKR = (objectiveId) => {
    if (!krForm.title.trim()) return
    const kr = { id: editKR?.id || uid(), ...krForm }
    const objectives = (active.objectives || []).map(o => {
      if (o.id !== objectiveId) return o
      const krs = editKR
        ? (o.keyResults || []).map(k => k.id === editKR.id ? kr : k)
        : [...(o.keyResults || []), kr]
      const prog = avgProgress(krs)
      return { ...o, keyResults: krs, status: inferStatus(prog) }
    })
    updateActive({ objectives })
    setShowKRForm(null); setEditKR(null); setKRForm(EMPTY_KR)
    showToast(editKR ? 'KR mis à jour' : 'Key Result ajouté')
  }

  const deleteKR = (objId, krId) => {
    const objectives = (active.objectives || []).map(o => {
      if (o.id !== objId) return o
      const krs = (o.keyResults || []).filter(k => k.id !== krId)
      return { ...o, keyResults: krs, status: inferStatus(avgProgress(krs)) }
    })
    updateActive({ objectives })
  }

  const updateKRProgress = (objId, krId, value) => {
    const objectives = (active.objectives || []).map(o => {
      if (o.id !== objId) return o
      const krs = (o.keyResults || []).map(k => k.id === krId ? { ...k, current: value } : k)
      return { ...o, keyResults: krs, status: inferStatus(avgProgress(krs)) }
    })
    updateActive({ objectives })
  }

  const startEditKR = (objId, kr) => {
    setEditKR(kr); setKRForm({ title: kr.title, metric: kr.metric || '', target: kr.target || '', current: kr.current || '', unit: kr.unit || '', status: kr.status, notes: kr.notes || '' })
    setShowKRForm(objId)
  }

  const toggleExpand = (id) => setExpandedObjs(p => ({ ...p, [id]: !p[id] }))

  // ── Filter objectives ──
  const visibleObjectives = (active?.objectives || []).filter(o => {
    const lvl = filterLevel  === 'all' || o.level  === filterLevel
    const st  = filterStatus === 'all' || o.status === filterStatus
    return lvl && st
  })

  // ── Stats ──
  const allObjectives  = active?.objectives || []
  const totalObjs      = allObjectives.length
  const completedObjs  = allObjectives.filter(o => o.status === 'completed').length
  const onTrackObjs    = allObjectives.filter(o => o.status === 'on_track').length
  const totalKRs       = allObjectives.reduce((s, o) => s + (o.keyResults?.length || 0), 0)
  const globalProgress = totalObjs === 0 ? 0 : Math.round(
    allObjectives.reduce((s, o) => s + avgProgress(o.keyResults), 0) / totalObjs
  )

  // ── Export ──
  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `OKR_${active.name.replace(/\s+/g, '_')}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── AI ──
  const runAI = async () => {
    if (!active?.objectives?.length) { showToast('Ajoutez au moins un objectif', 'error'); return }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res  = await fetch('/api/generer-management/generer-okr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisName: active.name, context: active.context, objectives: active.objectives, projectName: project?.name || '', projectTag: project?.tag || '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateActive({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── Progress ring SVG ──
  const ProgressRing = ({ progress, size = 44, stroke = 3, color = '#6366f1' }) => {
    const r = (size - stroke * 2) / 2
    const circ = 2 * Math.PI * r
    const offset = circ - (progress / 100) * circ
    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .4s ease' }}/>
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
          fill="var(--text)" fontSize={size * .22} fontFamily="Geist Mono,monospace" fontWeight="500"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
          {progress}%
        </text>
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
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        .okr-root { min-height: 100vh; display: flex; flex-direction: column; }

        /* Topbar */
        .topbar {
          height: 56px; background: var(--surface); border-bottom: 1px solid var(--border);
          display: flex; align-items: center; padding: 0 20px; gap: 12px;
          position: sticky; top: 0; z-index: 100;
        }
        .back-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px;
          background: var(--surface2); border: 1px solid var(--border2); color: var(--muted2);
          font-family: 'Geist Mono', monospace; font-size: 11px; cursor: pointer; transition: all .15s;
        }
        .back-btn:hover { color: var(--text); }
        .topbar-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .topbar-sub { font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .topbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }
        .btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px;
          cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 11px;
          border: 1px solid var(--border2); background: var(--surface2); color: var(--muted2); transition: all .15s;
        }
        .btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .btn.primary:hover { background: #4f52d8; }
        .btn.ai { background: rgba(129,140,248,.1); border-color: rgba(129,140,248,.3); color: var(--accent2); }
        .btn.ai:hover { background: rgba(129,140,248,.2); }
        .btn:disabled { opacity:.4; cursor:not-allowed; }

        /* Body layout */
        .okr-body { flex: 1; display: grid; grid-template-columns: 240px 1fr; height: calc(100vh - 56px); overflow: hidden; }

        /* Left panel */
        .left-panel { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .panel-hd { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .panel-label { font-size: 10px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .panel-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
        .a-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
        .a-item:hover { background: var(--surface2); }
        .a-item.active { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.25); }
        .a-name { font-size: 12px; font-weight: 600; color: var(--text); display: flex; align-items: center; justify-content: space-between; }
        .a-del { opacity: 0; background: none; border: none; color: #f87171; cursor: pointer; font-size: 12px; }
        .a-item:hover .a-del { opacity: 1; }
        .a-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 2px; }
        .new-form { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
        .inp { width: 100%; background: var(--bg); border: 1px solid var(--border2); border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif; font-size: 12px; color: var(--text); outline: none; transition: border-color .15s; }
        .inp:focus { border-color: var(--accent); }
        .inp::placeholder { color: var(--muted); }
        textarea.inp { resize: vertical; min-height: 52px; }

        /* Main */
        .main { overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }

        /* Stats row */
        .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
        .stat-val { font-size: 26px; font-weight: 800; color: var(--text); font-family: 'Geist Mono', monospace; }
        .stat-lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin-top: 4px; font-family: 'Geist Mono', monospace; }

        /* Global progress bar */
        .global-bar-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; }
        .global-bar-track { flex: 1; height: 8px; background: var(--surface3); border-radius: 99px; overflow: hidden; }
        .global-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent), var(--accent2)); transition: width .5s ease; }
        .global-bar-label { font-size: 12px; color: var(--muted2); font-family: 'Geist Mono', monospace; white-space: nowrap; }

        /* Filters row */
        .filters-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .filter-chip { padding: 5px 12px; border-radius: 99px; font-size: 11px; font-family: 'Geist Mono', monospace; cursor: pointer; border: 1px solid var(--border2); background: var(--surface2); color: var(--muted2); transition: all .15s; }
        .filter-chip.active { background: rgba(99,102,241,.15); border-color: rgba(99,102,241,.35); color: var(--accent2); }
        .filter-chip:hover:not(.active) { color: var(--text); }
        .filter-sep { width: 1px; height: 20px; background: var(--border2); }

        /* Objective card */
        .obj-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: border-color .15s; }
        .obj-card:hover { border-color: var(--border2); }
        .obj-header { padding: 16px 18px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .obj-level-badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-family: 'Geist Mono', monospace; font-weight: 600; display: flex; align-items: center; gap: 4px; }
        .obj-title-wrap { flex: 1; min-width: 0; }
        .obj-title { font-size: 14px; font-weight: 700; color: var(--text); }
        .obj-period { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 2px; }
        .obj-actions { display: flex; gap: 6px; align-items: center; }
        .icon-btn { width: 26px; height: 26px; border-radius: 5px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; font-size: 13px; color: var(--muted2); transition: all .15s; }
        .icon-btn:hover { background: var(--surface3); color: var(--text); }
        .status-badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-family: 'Geist Mono', monospace; display: flex; align-items: center; gap: 4px; }
        .expand-icon { font-size: 10px; color: var(--muted); transition: transform .2s; }
        .expand-icon.open { transform: rotate(90deg); }

        /* KR list */
        .krs-wrap { border-top: 1px solid var(--border); }
        .kr-row { padding: 12px 18px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
        .kr-row:last-child { border-bottom: none; }
        .kr-header { display: flex; align-items: center; gap: 10px; }
        .kr-num { width: 20px; height: 20px; border-radius: 4px; background: var(--surface3); display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--muted); font-family: 'Geist Mono', monospace; flex-shrink: 0; }
        .kr-title { font-size: 12px; font-weight: 600; color: var(--text); flex: 1; }
        .kr-metric { font-size: 11px; color: var(--muted2); font-family: 'Geist Mono', monospace; }
        .kr-progress-row { display: flex; align-items: center; gap: 10px; padding-left: 30px; }
        .kr-track { flex: 1; height: 5px; background: var(--surface3); border-radius: 99px; overflow: hidden; }
        .kr-fill { height: 100%; border-radius: 99px; transition: width .3s ease; }
        .kr-pct { font-size: 10px; color: var(--muted2); font-family: 'Geist Mono', monospace; min-width: 32px; text-align: right; }
        .kr-current-input { width: 72px; background: var(--bg); border: 1px solid var(--border2); border-radius: 4px; padding: 3px 6px; font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--text); outline: none; text-align: center; }
        .kr-current-input:focus { border-color: var(--accent); }
        .kr-target-lbl { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }

        /* Add KR row */
        .add-kr-row { padding: 10px 18px; border-top: 1px solid var(--border); }

        /* Add objective btn */
        .add-obj-btn { border: 2px dashed var(--border2); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all .2s; color: var(--muted2); font-size: 13px; font-family: 'Geist Mono', monospace; }
        .add-obj-btn:hover { border-color: var(--accent); color: var(--accent); }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .modal { background: var(--surface); border: 1px solid var(--border2); border-radius: 16px; padding: 26px; width: 100%; max-width: 480px; box-shadow: 0 24px 64px rgba(0,0,0,.5); max-height: 90vh; overflow-y: auto; }
        .modal-title { font-family: 'Instrument Serif', serif; font-size: 20px; font-style: italic; color: var(--text); margin-bottom: 18px; }
        .form-group { margin-bottom: 14px; }
        .form-label { display: block; font-size: 10px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 5px; font-family: 'Geist Mono', monospace; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .select { width: 100%; background: var(--bg); border: 1px solid var(--border2); border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif; font-size: 13px; color: var(--text); outline: none; cursor: pointer; }
        .select:focus { border-color: var(--accent); }
        .modal-actions { display: flex; gap: 8px; margin-top: 18px; }
        .btn-full { flex: 1; padding: 10px; border-radius: 8px; cursor: pointer; background: var(--accent); border: none; color: #fff; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; }
        .btn-full:hover { background: #4f52d8; }
        .btn-cancel { padding: 10px 16px; border-radius: 8px; cursor: pointer; background: var(--surface2); border: 1px solid var(--border2); color: var(--muted2); font-family: 'Syne', sans-serif; font-size: 13px; }

        /* Level selector */
        .level-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .level-opt { padding: 10px 8px; border-radius: 8px; border: 1px solid var(--border2); cursor: pointer; text-align: center; transition: all .15s; }
        .level-opt.selected { border-color: var(--accent); background: rgba(99,102,241,.1); }
        .level-opt:hover:not(.selected) { border-color: var(--border2); background: var(--surface2); }
        .level-opt-icon { font-size: 18px; margin-bottom: 4px; }
        .level-opt-label { font-size: 10px; color: var(--muted2); font-family: 'Geist Mono', monospace; }

        /* AI Panel */
        .ai-panel { position: fixed; right: 0; top: 56px; bottom: 0; width: 400px; background: var(--surface); border-left: 1px solid var(--border); z-index: 80; display: flex; flex-direction: column; overflow: hidden; transform: translateX(100%); transition: transform .3s ease; }
        .ai-panel.open { transform: translateX(0); }
        .ai-panel-hd { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .ai-panel-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .ai-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .ai-section-lbl { font-size: 10px; color: var(--muted2); letter-spacing: .08em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 8px; }
        .ai-block { background: var(--surface2); border: 1px solid var(--border2); border-radius: 10px; padding: 14px; font-size: 13px; color: var(--text); line-height: 1.7; }
        .ai-obj-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .ai-obj-name { font-size: 12px; font-weight: 700; }
        .ai-obj-score { display: flex; align-items: center; gap: 8px; }
        .ai-score-bar { flex: 1; height: 4px; background: var(--surface3); border-radius: 99px; overflow: hidden; }
        .ai-score-fill { height: 100%; border-radius: 99px; }
        .ai-obj-text { font-size: 11px; color: var(--muted2); line-height: 1.6; }
        .ai-priority-item { display: flex; gap: 10px; padding: 8px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; font-size: 12px; line-height: 1.6; }
        .ai-priority-num { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--muted); padding-top: 2px; min-width: 20px; }
        .spinner { width: 18px; height: 18px; border: 2px solid var(--border2); border-top-color: var(--accent2); border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Toast */
        .toast { position: fixed; bottom: 24px; right: 24px; z-index: 500; background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px; padding: 12px 18px; font-size: 13px; box-shadow: 0 8px 32px rgba(0,0,0,.4); animation: slideUp .2s ease; display: flex; align-items: center; gap: 8px; }
        .toast.error { border-color: rgba(248,113,113,.3); color: #f87171; }
        .toast.info  { border-color: rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        /* Empty */
        .empty-cta { padding: 48px 24px; text-align: center; }
        .empty-icon { font-size: 36px; opacity: .25; margin-bottom: 12px; }
        .empty-txt { font-size: 13px; color: var(--muted); line-height: 1.6; }

        @media (max-width: 900px) { .okr-body { grid-template-columns: 1fr; } .left-panel { display: none; } .stats-row { grid-template-columns: repeat(3,1fr); } }
      `}</style>

      <div className="okr-root">

        {/* Topbar */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="topbar-title">OKR Framework</div>
            {project && <div className="topbar-sub">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {active && <>
              <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>
              <button className="btn ai" onClick={runAI} disabled={aiLoading || !active?.objectives?.length}>
                {aiLoading ? <><span className="spinner"/>Analyse…</> : '✦ Analyse IA'}
              </button>
            </>}
          </div>
        </header>

        <div className="okr-body">

          {/* Left panel */}
          <aside className="left-panel">
            <div className="panel-hd">
              <span className="panel-label">Cycles OKR ({analyses.length})</span>
            </div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">◎</div>
                  <div className="empty-txt">Créez votre premier cycle OKR</div>
                </div>
              )}
              {analyses.map(a => (
                <div key={a.id} className={`a-item ${activeId === a.id ? 'active' : ''}`} onClick={() => { setActiveId(a.id); setAiResult(a.aiResult || null) }}>
                  <div className="a-name">
                    <span>{a.name}</span>
                    <button className="a-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  </div>
                  <div className="a-meta">
                    {a.objectives?.length || 0} objectif(s) · {a.objectives?.reduce((s,o) => s+(o.keyResults?.length||0),0)||0} KR
                  </div>
                </div>
              ))}
            </div>

            {showNewForm ? (
              <div className="new-form">
                <span className="form-label">Nom du cycle</span>
                <input className="inp" placeholder="Ex: OKR Q2 2025" value={newAnalysis.name} onChange={e => setNewAnalysis(p => ({...p, name: e.target.value}))} onKeyDown={e => e.key==='Enter' && createAnalysis()} autoFocus/>
                <span className="form-label">Contexte</span>
                <textarea className="inp" placeholder="Vision, priorités…" value={newAnalysis.context} onChange={e => setNewAnalysis(p => ({...p, context: e.target.value}))} rows={2}/>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn primary" style={{flex:1}} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{ padding:12, borderTop:'1px solid var(--border)' }}>
                <button className="btn" style={{width:'100%', justifyContent:'center'}} onClick={() => setShowNewForm(true)}>+ Nouveau cycle</button>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="main">
            {!active ? (
              <div className="empty-cta" style={{padding:'80px 40px'}}>
                <div className="empty-icon" style={{fontSize:48}}>◎</div>
                <div style={{fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic', marginBottom:8}}>Sélectionnez ou créez un cycle OKR</div>
                <div className="empty-txt">Utilisez le panneau gauche pour démarrer</div>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="stats-row">
                  {[
                    { val: totalObjs,      lbl: 'Objectifs' },
                    { val: totalKRs,       lbl: 'Key Results' },
                    { val: completedObjs,  lbl: 'Complétés',  color: '#22d3a5' },
                    { val: onTrackObjs,    lbl: 'On Track',   color: '#6366f1' },
                    { val: `${globalProgress}%`, lbl: 'Progression', color: globalProgress >= 70 ? '#22d3a5' : globalProgress >= 40 ? '#f59e0b' : '#f87171' },
                  ].map((s, i) => (
                    <div key={i} className="stat-card">
                      <div className="stat-val" style={s.color ? { color: s.color } : {}}>{s.val}</div>
                      <div className="stat-lbl">{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Global progress */}
                {totalObjs > 0 && (
                  <div className="global-bar-wrap">
                    <span style={{fontSize:12, color:'var(--muted2)', fontFamily:'Geist Mono,monospace', whiteSpace:'nowrap'}}>Progression globale</span>
                    <div className="global-bar-track">
                      <div className="global-bar-fill" style={{width:`${globalProgress}%`}}/>
                    </div>
                    <span className="global-bar-label">{globalProgress}%</span>
                    <ProgressRing progress={globalProgress} size={44} color={globalProgress >= 70 ? '#22d3a5' : globalProgress >= 40 ? '#f59e0b' : '#6366f1'}/>
                  </div>
                )}

                {/* Filters */}
                <div className="filters-row">
                  {['all', ...LEVELS.map(l => l.id)].map(lv => (
                    <button key={lv} className={`filter-chip ${filterLevel === lv ? 'active' : ''}`} onClick={() => setFilterLevel(lv)}>
                      {lv === 'all' ? 'Tous niveaux' : LEVELS.find(l=>l.id===lv)?.label}
                    </button>
                  ))}
                  <div className="filter-sep"/>
                  {['all', ...Object.keys(STATUS_CONFIG)].map(st => (
                    <button key={st} className={`filter-chip ${filterStatus === st ? 'active' : ''}`} onClick={() => setFilterStatus(st)}>
                      {st === 'all' ? 'Tous statuts' : STATUS_CONFIG[st]?.label}
                    </button>
                  ))}
                </div>

                {/* Objectives list */}
                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  {visibleObjectives.length === 0 && totalObjs > 0 && (
                    <div className="empty-cta" style={{padding:'32px', border:'1px dashed var(--border2)', borderRadius:12}}>
                      <div className="empty-txt">Aucun objectif ne correspond aux filtres sélectionnés</div>
                    </div>
                  )}

                  {visibleObjectives.map(obj => {
                    const prog  = avgProgress(obj.keyResults)
                    const st    = STATUS_CONFIG[obj.status] || STATUS_CONFIG.not_started
                    const lv    = LEVELS.find(l => l.id === obj.level) || LEVELS[0]
                    const open  = expandedObjs[obj.id] !== false // default open
                    return (
                      <div key={obj.id} className="obj-card">
                        {/* Header */}
                        <div className="obj-header" onClick={() => toggleExpand(obj.id)}>
                          <ProgressRing progress={prog} size={40} color={st.color}/>
                          <div className="obj-title-wrap">
                            <div className="obj-title">{obj.title}</div>
                            <div className="obj-period" style={{display:'flex', gap:8, alignItems:'center', marginTop:4}}>
                              <span className="obj-level-badge" style={{background:`${lv.color}18`, color:lv.color, border:`1px solid ${lv.color}30`}}>
                                {lv.icon} {lv.label}
                              </span>
                              <span style={{color:'var(--muted)'}}>{obj.period} {obj.year}</span>
                              {obj.description && <span style={{color:'var(--muted)', fontSize:10}}>· {obj.description.slice(0,40)}{obj.description.length>40?'…':''}</span>}
                            </div>
                          </div>
                          <div className="obj-actions" onClick={e => e.stopPropagation()}>
                            <span className="status-badge" style={{background:st.bg, color:st.color, border:`1px solid ${st.color}30`}}>
                              {st.icon} {st.label}
                            </span>
                            <button className="icon-btn" onClick={() => startEditObj(obj)}>✎</button>
                            <button className="icon-btn" style={{color:'#f87171'}} onClick={() => deleteObjective(obj.id)}>✕</button>
                          </div>
                          <span className={`expand-icon ${open ? 'open' : ''}`}>▶</span>
                        </div>

                        {/* KRs */}
                        {open && (
                          <div className="krs-wrap">
                            {(obj.keyResults || []).length === 0 && (
                              <div style={{padding:'14px 18px', fontSize:12, color:'var(--muted)', fontStyle:'italic'}}>
                                Aucun Key Result — ajoutez-en un ci-dessous
                              </div>
                            )}
                            {(obj.keyResults || []).map((kr, idx) => {
                              const kprog = calcProgress(kr.current, kr.target)
                              const kst   = STATUS_CONFIG[kr.status] || STATUS_CONFIG.not_started
                              const barColor = kprog >= 70 ? '#22d3a5' : kprog >= 40 ? '#f59e0b' : '#f87171'
                              return (
                                <div key={kr.id} className="kr-row">
                                  <div className="kr-header">
                                    <div className="kr-num">{idx+1}</div>
                                    <div className="kr-title">{kr.title}</div>
                                    {kr.metric && <span className="kr-metric">{kr.metric}</span>}
                                    <span className="status-badge" style={{background:kst.bg, color:kst.color, border:`1px solid ${kst.color}30`, fontSize:10}}>
                                      {kst.icon}
                                    </span>
                                    <button className="icon-btn" style={{fontSize:11, color:'var(--muted)'}} onClick={() => startEditKR(obj.id, kr)}>✎</button>
                                    <button className="icon-btn" style={{fontSize:11, color:'#f87171'}} onClick={() => deleteKR(obj.id, kr.id)}>✕</button>
                                  </div>
                                  <div className="kr-progress-row">
                                    <span style={{fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace'}}>Actuel:</span>
                                    <input
                                      className="kr-current-input"
                                      type="number"
                                      value={kr.current}
                                      onChange={e => updateKRProgress(obj.id, kr.id, e.target.value)}
                                      placeholder="0"
                                    />
                                    <span className="kr-target-lbl">/ {kr.target || '?'} {kr.unit}</span>
                                    <div className="kr-track">
                                      <div className="kr-fill" style={{width:`${kprog}%`, background:barColor}}/>
                                    </div>
                                    <span className="kr-pct">{kprog}%</span>
                                  </div>
                                  {kr.notes && <div style={{paddingLeft:30, fontSize:11, color:'var(--muted)', fontStyle:'italic'}}>{kr.notes}</div>}
                                </div>
                              )
                            })}

                            {/* Add KR */}
                            {showKRForm === obj.id ? (
                              <div style={{padding:'14px 18px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10}}>
                                <div style={{fontFamily:'Instrument Serif,serif', fontSize:14, fontStyle:'italic', color:'var(--text)'}}>
                                  {editKR ? 'Modifier le Key Result' : 'Nouveau Key Result'}
                                </div>
                                <div className="form-group" style={{marginBottom:0}}>
                                  <label className="form-label">Titre du KR *</label>
                                  <input className="inp" placeholder="Ex: Atteindre 10 000 utilisateurs actifs" value={krForm.title} onChange={e => setKRForm(p=>({...p,title:e.target.value}))}/>
                                </div>
                                <div className="form-row">
                                  <div>
                                    <label className="form-label">Métrique</label>
                                    <input className="inp" placeholder="Ex: MAU, NPS, CA…" value={krForm.metric} onChange={e => setKRForm(p=>({...p,metric:e.target.value}))}/>
                                  </div>
                                  <div>
                                    <label className="form-label">Unité</label>
                                    <input className="inp" placeholder="Ex: %, k€, pts" value={krForm.unit} onChange={e => setKRForm(p=>({...p,unit:e.target.value}))}/>
                                  </div>
                                </div>
                                <div className="form-row">
                                  <div>
                                    <label className="form-label">Valeur cible</label>
                                    <input className="inp" type="number" placeholder="100" value={krForm.target} onChange={e => setKRForm(p=>({...p,target:e.target.value}))}/>
                                  </div>
                                  <div>
                                    <label className="form-label">Valeur actuelle</label>
                                    <input className="inp" type="number" placeholder="0" value={krForm.current} onChange={e => setKRForm(p=>({...p,current:e.target.value}))}/>
                                  </div>
                                </div>
                                <div>
                                  <label className="form-label">Notes</label>
                                  <input className="inp" placeholder="Contexte, source de données…" value={krForm.notes} onChange={e => setKRForm(p=>({...p,notes:e.target.value}))}/>
                                </div>
                                <div style={{display:'flex', gap:8}}>
                                  <button className="btn-full" onClick={() => saveKR(obj.id)}>
                                    {editKR ? 'Mettre à jour' : 'Ajouter le KR'}
                                  </button>
                                  <button className="btn-cancel" onClick={() => { setShowKRForm(null); setEditKR(null); setKRForm(EMPTY_KR) }}>Annuler</button>
                                </div>
                              </div>
                            ) : (
                              <div className="add-kr-row">
                                <button className="btn" style={{fontSize:10}} onClick={() => { setShowKRForm(obj.id); setEditKR(null); setKRForm(EMPTY_KR) }}>
                                  + Ajouter un Key Result
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add objective button */}
                  <div className="add-obj-btn" onClick={() => { setEditObj(null); setObjForm(EMPTY_OBJ); setShowObjForm(true) }}>
                    + Ajouter un objectif
                  </div>
                </div>
              </>
            )}
          </main>
        </div>

        {/* Objective modal */}
        {showObjForm && (
          <div className="modal-overlay" onClick={() => { setShowObjForm(false); setEditObj(null) }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{editObj ? 'Modifier l\'objectif' : 'Nouvel objectif'}</div>

              <div className="form-group">
                <label className="form-label">Titre de l'objectif *</label>
                <input className="inp" placeholder="Ex: Devenir la référence sur notre marché" value={objForm.title} onChange={e => setObjForm(p=>({...p,title:e.target.value}))} autoFocus/>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="inp" rows={2} placeholder="Contexte, ambition…" value={objForm.description} onChange={e => setObjForm(p=>({...p,description:e.target.value}))}/>
              </div>

              <div className="form-group">
                <label className="form-label">Niveau</label>
                <div className="level-grid">
                  {LEVELS.map(lv => (
                    <div key={lv.id} className={`level-opt ${objForm.level === lv.id ? 'selected' : ''}`} onClick={() => setObjForm(p=>({...p,level:lv.id}))}
                      style={objForm.level===lv.id ? {borderColor:lv.color, background:`${lv.color}15`} : {}}>
                      <div className="level-opt-icon" style={{color: objForm.level===lv.id ? lv.color : 'var(--muted2)'}}>{lv.icon}</div>
                      <div className="level-opt-label" style={{color: objForm.level===lv.id ? lv.color : 'var(--muted2)'}}>{lv.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Période</label>
                  <select className="select inp" value={objForm.period} onChange={e => setObjForm(p=>({...p,period:e.target.value}))}>
                    {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Année</label>
                  <input className="inp" type="number" value={objForm.year} onChange={e => setObjForm(p=>({...p,year:e.target.value}))} min="2020" max="2035"/>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => { setShowObjForm(false); setEditObj(null) }}>Annuler</button>
                <button className="btn-full" onClick={saveObjective}>{editObj ? 'Mettre à jour' : 'Créer l\'objectif'}</button>
              </div>
            </div>
          </div>
        )}

        {/* AI Panel */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-panel-hd">
            <span className="ai-panel-title">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-content">
            {aiLoading && (
              <div style={{display:'flex', alignItems:'center', gap:12, color:'var(--muted2)', fontSize:13}}>
                <span className="spinner"/>
                Analyse OKR en cours…
              </div>
            )}

            {!aiLoading && aiResult && <>
              {aiResult.synthese && (
                <div>
                  <div className="ai-section-lbl">Synthèse du cycle</div>
                  <div className="ai-block">{aiResult.synthese}</div>
                </div>
              )}
              {aiResult.objectifs?.length > 0 && (
                <div>
                  <div className="ai-section-lbl">Analyse par objectif</div>
                  <div style={{display:'flex', flexDirection:'column', gap:8}}>
                    {aiResult.objectifs.map((o, i) => {
                      const scoreColor = o.score >= 70 ? '#22d3a5' : o.score >= 40 ? '#f59e0b' : '#f87171'
                      return (
                        <div key={i} className="ai-obj-card">
                          <div className="ai-obj-name">{o.titre}</div>
                          <div className="ai-obj-score">
                            <div className="ai-score-bar"><div className="ai-score-fill" style={{width:`${o.score}%`, background:scoreColor}}/></div>
                            <span style={{fontSize:11, color:scoreColor, fontFamily:'Geist Mono,monospace', minWidth:32}}>{o.score}%</span>
                          </div>
                          <div className="ai-obj-text">{o.analyse}</div>
                          {o.suggestion && <div style={{fontSize:11, color:'var(--accent2)', padding:'6px 8px', background:'rgba(129,140,248,.08)', borderRadius:5, border:'1px solid rgba(129,140,248,.15)'}}>
                            💡 {o.suggestion}
                          </div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {aiResult.priorites?.length > 0 && (
                <div>
                  <div className="ai-section-lbl">Priorités d'action</div>
                  <div style={{display:'flex', flexDirection:'column', gap:6}}>
                    {aiResult.priorites.map((p, i) => (
                      <div key={i} className="ai-priority-item">
                        <span className="ai-priority-num">#{i+1}</span>
                        <span style={{fontSize:12, color:'var(--text)'}}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiResult.krs_suggeres?.length > 0 && (
                <div>
                  <div className="ai-section-lbl">KRs suggérés par l'IA</div>
                  <div style={{display:'flex', flexDirection:'column', gap:6}}>
                    {aiResult.krs_suggeres.map((kr, i) => (
                      <div key={i} style={{padding:'10px 12px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', fontSize:12}}>
                        <div style={{fontWeight:700, marginBottom:4}}>{kr.objectif}</div>
                        <div style={{color:'var(--muted2)'}}>{kr.kr}</div>
                        <div style={{color:'var(--accent2)', fontFamily:'Geist Mono,monospace', fontSize:10, marginTop:4}}>Cible : {kr.cible}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiResult.conclusion && (
                <div>
                  <div className="ai-section-lbl">Conclusion</div>
                  <div className="ai-block" style={{fontStyle:'italic', color:'var(--muted2)'}}>{aiResult.conclusion}</div>
                </div>
              )}
            </>}

            {!aiLoading && !aiResult && (
              <div className="empty-cta">
                <div className="empty-icon">✦</div>
                <div className="empty-txt">Cliquez sur "Analyse IA" pour obtenir une évaluation complète de vos OKR et des recommandations personnalisées.</div>
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