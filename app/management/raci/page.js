'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const ROLES = ['R', 'A', 'C', 'I']

const ROLE_META = {
  R: { label: 'Responsible', fr: 'Responsable', desc: 'Réalise la tâche',               color: '#6366f1', bg: 'rgba(99,102,241,.13)',  border: 'rgba(99,102,241,.35)' },
  A: { label: 'Accountable', fr: 'Réalise',     desc: 'Valide et rend compte',           color: '#f59e0b', bg: 'rgba(245,158,11,.13)',  border: 'rgba(245,158,11,.35)' },
  C: { label: 'Consulted',   fr: 'Consulté',    desc: 'Consulté avant/pendant',          color: '#34d399', bg: 'rgba(52,211,153,.13)',  border: 'rgba(52,211,153,.35)' },
  I: { label: 'Informed',    fr: 'Informé',     desc: 'Informé du résultat',             color: '#94a3b8', bg: 'rgba(148,163,184,.13)', border: 'rgba(148,163,184,.35)' },
}

const PHASE_OPTIONS = ['Initiation', 'Planification', 'Exécution', 'Contrôle', 'Clôture', 'Général']
const ALERT_COLORS = { surcharge: '#f87171', 'sous-utilisation': '#f59e0b', confusion_roles: '#a78bfa', ok: '#34d399' }
const SEVERITE_COLORS = { haute: '#f87171', moyenne: '#f59e0b', faible: '#94a3b8' }
const PRIORITE_COLORS = { haute: '#f87171', moyenne: '#f59e0b', faible: '#34d399' }

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RACIPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,       setProject]       = useState(null)
  const [analyses,      setAnalyses]      = useState([])
  const [activeId,      setActiveId]      = useState(null)
  const [showNewForm,   setShowNewForm]   = useState(false)
  const [newAnalysis,   setNewAnalysis]   = useState({ name: '', context: '' })
  const [tab,           setTab]           = useState('matrix')    // 'matrix' | 'actors' | 'tasks'
  const [editActor,     setEditActor]     = useState(null)        // null | {} | actor
  const [actorForm,     setActorForm]     = useState({ label: '', role: '' })
  const [editTask,      setEditTask]      = useState(null)
  const [taskForm,      setTaskForm]      = useState({ label: '', phase: 'Général', desc: '' })
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiResult,      setAiResult]      = useState(null)
  const [showAiPanel,   setShowAiPanel]   = useState(false)
  const [toast,         setToast]         = useState(null)
  const [hoveredCell,   setHoveredCell]   = useState(null)        // {taskId, actorId}
  const [filterPhase,   setFilterPhase]   = useState('Tous')
  const matrixRef = useRef(null)

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.RACI || []
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), RACI: updated } }
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
      id: uid(), name: newAnalysis.name.trim(), context: newAnalysis.context.trim(),
      createdAt: new Date().toISOString(),
      actors: [], tasks: [], matrix: {}, aiResult: null,
    }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowNewForm(false); setNewAnalysis({ name: '', context: '' })
    showToast(`Analyse "${a.name}" créée`)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) setActiveId(updated[updated.length - 1]?.id || null)
    showToast('Analyse supprimée', 'info')
  }

  const updateAnalysis = useCallback((patch) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === activeId ? { ...a, ...patch } : a)
      // persist after state update
      setTimeout(() => {
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (!raw) return
          const data = JSON.parse(raw)
          data.projects = (data.projects || []).map(p =>
            p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), RACI: updated } }
          )
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        } catch {}
      }, 0)
      return updated
    })
  }, [activeId, projectId])

  // ── Actors CRUD ──
  const saveActor = () => {
    if (!actorForm.label.trim()) return
    const actor = { id: editActor?.id || uid(), label: actorForm.label.trim(), role: actorForm.role.trim() }
    const actors = editActor?.id
      ? (active.actors || []).map(a => a.id === editActor.id ? actor : a)
      : [...(active.actors || []), actor]
    updateAnalysis({ actors })
    setEditActor(null); setActorForm({ label: '', role: '' })
    showToast(editActor?.id ? 'Acteur mis à jour' : 'Acteur ajouté')
  }

  const deleteActor = (id) => {
    const actors = (active.actors || []).filter(a => a.id !== id)
    // remove from matrix
    const matrix = { ...(active.matrix || {}) }
    for (const taskId of Object.keys(matrix)) {
      if (matrix[taskId]) { const m = { ...matrix[taskId] }; delete m[id]; matrix[taskId] = m }
    }
    updateAnalysis({ actors, matrix })
    showToast('Acteur supprimé', 'info')
  }

  // ── Tasks CRUD ──
  const saveTask = () => {
    if (!taskForm.label.trim()) return
    const task = { id: editTask?.id || uid(), label: taskForm.label.trim(), phase: taskForm.phase, desc: taskForm.desc.trim() }
    const tasks = editTask?.id
      ? (active.tasks || []).map(t => t.id === editTask.id ? task : t)
      : [...(active.tasks || []), task]
    updateAnalysis({ tasks })
    setEditTask(null); setTaskForm({ label: '', phase: 'Général', desc: '' })
    showToast(editTask?.id ? 'Tâche mise à jour' : 'Tâche ajoutée')
  }

  const deleteTask = (id) => {
    const tasks = (active.tasks || []).filter(t => t.id !== id)
    const matrix = { ...(active.matrix || {}) }
    delete matrix[id]
    updateAnalysis({ tasks, matrix })
    showToast('Tâche supprimée', 'info')
  }

  // ── Matrix cell ──
  const cycleRole = (taskId, actorId) => {
    const current = active?.matrix?.[taskId]?.[actorId] || null
    const idx     = current ? ROLES.indexOf(current) : -1
    const next    = idx >= ROLES.length - 1 ? null : ROLES[idx + 1]
    const matrix  = {
      ...(active.matrix || {}),
      [taskId]: { ...(active.matrix?.[taskId] || {}), [actorId]: next },
    }
    if (!next) delete matrix[taskId][actorId]
    updateAnalysis({ matrix })
  }

  const setRole = (taskId, actorId, role) => {
    const matrix = {
      ...(active.matrix || {}),
      [taskId]: { ...(active.matrix?.[taskId] || {}), [actorId]: role },
    }
    if (!role) delete matrix[taskId][actorId]
    updateAnalysis({ matrix })
  }

  // ── Stats ──
  const getActorStats = (actorId) => {
    if (!active) return { R: 0, A: 0, C: 0, I: 0, total: 0 }
    const s = { R: 0, A: 0, C: 0, I: 0, total: 0 }
    for (const t of (active.tasks || [])) {
      const role = active.matrix?.[t.id]?.[actorId]
      if (role) { s[role]++; s.total++ }
    }
    return s
  }

  const getTaskStats = (taskId) => {
    if (!active) return { R: 0, A: 0, C: 0, I: 0, hasA: false, hasR: false }
    const s = { R: 0, A: 0, C: 0, I: 0, hasA: false, hasR: false }
    for (const a of (active.actors || [])) {
      const role = active.matrix?.[taskId]?.[a.id]
      if (role) {
        s[role]++
        if (role === 'A') s.hasA = true
        if (role === 'R') s.hasR = true
      }
    }
    return s
  }

  // Validation warnings
  const getWarnings = () => {
    if (!active) return []
    const warnings = []
    for (const t of (active.tasks || [])) {
      const s = getTaskStats(t.id)
      if (!s.hasA) warnings.push({ type: 'missing_a', taskId: t.id, label: t.label })
      if (!s.hasR) warnings.push({ type: 'missing_r', taskId: t.id, label: t.label })
      if (s.A > 1)  warnings.push({ type: 'multi_a',   taskId: t.id, label: t.label })
    }
    return warnings
  }

  const warnings = getWarnings()
  const filteredTasks = active?.tasks?.filter(t => filterPhase === 'Tous' || t.phase === filterPhase) || []
  const phases = ['Tous', ...[...new Set((active?.tasks || []).map(t => t.phase).filter(Boolean))]]

  // ── AI ──
  const runAI = async () => {
    if (!active || !active.tasks?.length || !active.actors?.length) {
      showToast('Ajoutez des tâches et acteurs', 'error'); return
    }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-raci', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisName: active.name, context: active.context, tasks: active.tasks, actors: active.actors, matrix: active.matrix, projectName: project?.name || '', projectTag: project?.tag || '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateAnalysis({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  const exportCSV = () => {
    if (!active) return
    const header = ['Tâche', 'Phase', ...(active.actors || []).map(a => a.label)].join(';')
    const rows = (active.tasks || []).map(t =>
      [t.label, t.phase || '', ...(active.actors || []).map(a => active.matrix?.[t.id]?.[a.id] || '')].join(';')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `RACI_${active.name.replace(/\s+/g, '_')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --bg:#08080e; --s1:#0f0f18; --s2:#161622; --s3:#1c1c2e;
          --b1:rgba(255,255,255,.055); --b2:rgba(255,255,255,.10); --b3:rgba(255,255,255,.16);
          --tx:#eeedf8; --mu:#5e5c78; --mu2:#9492b0;
          --acc:#6366f1; --acc2:#818cf8;
          --R:#6366f1; --A:#f59e0b; --C:#34d399; --I:#94a3b8;
        }
        body { background:var(--bg); color:var(--tx); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }

        /* ── TOP BAR ── */
        .tb { height:52px; background:var(--s1); border-bottom:1px solid var(--b1); display:flex; align-items:center; padding:0 16px; gap:10px; position:sticky; top:0; z-index:200; }
        .back { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px; background:var(--s2); border:1px solid var(--b2); color:var(--mu2); font-family:'Geist Mono',monospace; font-size:10px; cursor:pointer; transition:all .15s; }
        .back:hover { color:var(--tx); border-color:var(--b3); }
        .tb-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .tb-proj  { font-size:10px; color:var(--mu); font-family:'Geist Mono',monospace; }
        .tb-r { margin-left:auto; display:flex; gap:6px; align-items:center; }
        .btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:.04em; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; }
        .btn:hover { color:var(--tx); border-color:var(--b3); }
        .btn.p { background:var(--acc); border-color:var(--acc); color:#fff; }
        .btn.p:hover { background:#4f52d8; }
        .btn.ai { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.3); color:var(--acc2); }
        .btn.ai:hover { background:rgba(99,102,241,.18); }
        .btn:disabled { opacity:.35; cursor:not-allowed; }

        /* ── LAYOUT ── */
        .layout { display:grid; grid-template-columns:220px 1fr; height:calc(100vh - 52px); overflow:hidden; }

        /* ── LEFT ── */
        .left { background:var(--s1); border-right:1px solid var(--b1); display:flex; flex-direction:column; overflow:hidden; }
        .ph { padding:13px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .pl { font-size:9px; color:var(--mu); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .plist { flex:1; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:2px; }
        .aitem { padding:8px 10px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
        .aitem:hover { background:var(--s2); }
        .aitem.on { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.22); }
        .aname { font-size:11px; font-weight:600; }
        .ameta { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; margin-top:2px; }
        .adel { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; float:right; }
        .aitem:hover .adel { opacity:1; }
        .nform { padding:11px; border-top:1px solid var(--b1); display:flex; flex-direction:column; gap:7px; }
        .inp { width:100%; background:var(--bg); border:1px solid var(--b2); border-radius:5px; padding:7px 9px; font-family:'Syne',sans-serif; font-size:11px; color:var(--tx); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--acc); }
        .inp::placeholder { color:var(--mu); }
        textarea.inp { resize:vertical; min-height:50px; }
        .flabel { font-size:9px; color:var(--mu); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:2px; display:block; }
        select.inp { appearance:none; cursor:pointer; }

        /* ── CENTER ── */
        .center { display:flex; flex-direction:column; overflow:hidden; background:var(--bg); }

        /* ── TABS ── */
        .tabs { display:flex; gap:0; border-bottom:1px solid var(--b1); background:var(--s1); padding:0 16px; flex-shrink:0; }
        .tab { padding:12px 16px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:none; background:none; color:var(--mu2); border-bottom:2px solid transparent; transition:all .15s; display:flex; align-items:center; gap:6px; }
        .tab:hover { color:var(--tx); }
        .tab.on { color:var(--acc2); border-bottom-color:var(--acc); }
        .tab-badge { padding:1px 6px; border-radius:3px; font-size:9px; font-weight:700; }

        /* ── MATRIX TAB ── */
        .matrix-area { flex:1; overflow:auto; padding:16px; }

        /* Toolbar */
        .matrix-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
        .phase-filter { display:flex; gap:4px; flex-wrap:wrap; }
        .phase-btn { padding:4px 10px; border-radius:4px; font-size:9px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; }
        .phase-btn:hover { color:var(--tx); }
        .phase-btn.on { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.4); color:var(--acc2); }

        /* Legend */
        .legend { display:flex; gap:10px; flex-wrap:wrap; }
        .legend-item { display:flex; align-items:center; gap:5px; font-size:10px; font-family:'Geist Mono',monospace; }
        .legend-chip { width:22px; height:22px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; }

        /* Matrix table */
        .mtable-wrap { overflow-x:auto; }
        .mtable { border-collapse:collapse; width:100%; }
        .mtable th, .mtable td { border:1px solid var(--b1); }

        /* Corner */
        .th-corner { background:var(--s2); padding:10px 14px; position:sticky; left:0; z-index:10; border-right:2px solid var(--b2) !important; }

        /* Actor header */
        .th-actor { background:var(--s1); padding:0; min-width:110px; max-width:130px; }
        .actor-header { padding:10px 8px; display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer; transition:background .15s; }
        .actor-header:hover { background:var(--s2); }
        .actor-name { font-size:10px; font-weight:700; text-align:center; font-family:'Syne',sans-serif; }
        .actor-role-label { font-size:8px; color:var(--mu2); font-family:'Geist Mono',monospace; text-align:center; }
        .actor-mini-stats { display:flex; gap:3px; margin-top:3px; }
        .actor-ms { font-size:8px; font-family:'Geist Mono',monospace; padding:1px 4px; border-radius:3px; font-weight:700; }

        /* Task row */
        .td-task { background:var(--s1); padding:0; position:sticky; left:0; z-index:5; border-right:2px solid var(--b2) !important; min-width:180px; max-width:220px; }
        .task-cell { padding:10px 12px; display:flex; flex-direction:column; gap:3px; cursor:pointer; transition:background .15s; }
        .task-cell:hover { background:var(--s2); }
        .task-name { font-size:11px; font-weight:600; }
        .task-phase-chip { font-size:8px; padding:1px 6px; border-radius:3px; font-family:'Geist Mono',monospace; font-weight:600; background:rgba(99,102,241,.1); color:var(--acc2); border:1px solid rgba(99,102,241,.25); align-self:flex-start; }
        .task-warn { font-size:8px; color:#f87171; font-family:'Geist Mono',monospace; margin-top:1px; }

        /* RACI cells */
        .td-raci { padding:6px; text-align:center; vertical-align:middle; background:var(--bg); transition:background .12s; cursor:pointer; }
        .td-raci:hover { background:var(--s3); }
        .raci-chip {
          display:inline-flex; align-items:center; justify-content:center;
          width:32px; height:32px; border-radius:8px; font-size:13px; font-weight:800;
          font-family:'Geist Mono',monospace; border:2px solid transparent;
          transition:all .15s; user-select:none;
        }
        .raci-chip.empty { width:32px; height:32px; border-radius:8px; border:2px dashed var(--b2); color:var(--mu); font-size:16px; display:inline-flex; align-items:center; justify-content:center; transition:all .15s; }
        .td-raci:hover .raci-chip.empty { border-color:var(--b3); color:var(--mu2); }
        .raci-chip.R { background:rgba(99,102,241,.15); color:var(--R); border-color:rgba(99,102,241,.4); }
        .raci-chip.A { background:rgba(245,158,11,.15); color:var(--A); border-color:rgba(245,158,11,.4); }
        .raci-chip.C { background:rgba(52,211,153,.15); color:var(--C); border-color:rgba(52,211,153,.4); }
        .raci-chip.I { background:rgba(148,163,184,.15); color:var(--I); border-color:rgba(148,163,184,.35); }

        /* Context menu */
        .ctx-menu {
          position:fixed; z-index:500; background:var(--s2); border:1px solid var(--b2);
          border-radius:8px; padding:4px; box-shadow:0 8px 32px rgba(0,0,0,.5);
          display:flex; flex-direction:column; gap:2px; min-width:120px;
        }
        .ctx-item { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:5px; cursor:pointer; font-size:11px; transition:background .12s; }
        .ctx-item:hover { background:var(--s3); }
        .ctx-chip { width:22px; height:22px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; font-family:'Geist Mono',monospace; }
        .ctx-clear { color:#f87171; padding:5px 10px; text-align:center; font-size:10px; font-family:'Geist Mono',monospace; border-top:1px solid var(--b1); cursor:pointer; border-radius:0 0 6px 6px; }
        .ctx-clear:hover { background:rgba(248,113,113,.08); }

        /* ── ACTORS TAB ── */
        .actors-area { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; }
        .actors-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; }
        .actor-card { background:var(--s1); border:1px solid var(--b1); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; transition:border-color .15s; }
        .actor-card:hover { border-color:var(--b2); }
        .actor-card-top { display:flex; align-items:flex-start; gap:10px; }
        .actor-avatar { width:36px; height:36px; border-radius:9px; background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.25); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; color:var(--acc2); flex-shrink:0; font-family:'Syne',sans-serif; }
        .actor-card-name { font-size:13px; font-weight:700; }
        .actor-card-role { font-size:10px; color:var(--mu2); font-family:'Geist Mono',monospace; margin-top:2px; }
        .actor-card-actions { display:flex; gap:4px; margin-left:auto; }
        .icon-btn { width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:11px; transition:background .15s; }
        .icon-btn:hover { background:var(--s3); }
        .actor-stats-row { display:flex; gap:5px; }
        .actor-stat { flex:1; padding:6px 4px; border-radius:6px; text-align:center; display:flex; flex-direction:column; gap:2px; }
        .actor-stat-val { font-family:'Geist Mono',monospace; font-size:14px; font-weight:700; }
        .actor-stat-key { font-size:8px; font-family:'Geist Mono',monospace; opacity:.7; }
        .actor-form-card { background:var(--s2); border:1px solid var(--b2); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; }

        /* ── TASKS TAB ── */
        .tasks-area { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; }
        .tasks-list { display:flex; flex-direction:column; gap:6px; }
        .task-row { background:var(--s1); border:1px solid var(--b1); border-radius:8px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px; transition:border-color .15s; }
        .task-row:hover { border-color:var(--b2); }
        .task-num { font-family:'Geist Mono',monospace; font-size:10px; color:var(--mu); width:20px; padding-top:1px; flex-shrink:0; }
        .task-info { flex:1; min-width:0; }
        .task-row-name { font-size:12px; font-weight:600; }
        .task-row-desc { font-size:11px; color:var(--mu2); margin-top:2px; line-height:1.5; }
        .task-row-meta { display:flex; gap:6px; margin-top:5px; flex-wrap:wrap; align-items:center; }
        .task-form-card { background:var(--s2); border:1px solid var(--b2); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; }

        /* ── WARNINGS BANNER ── */
        .warn-banner { margin:0 16px 12px; background:rgba(248,113,113,.07); border:1px solid rgba(248,113,113,.2); border-radius:8px; padding:10px 14px; display:flex; align-items:flex-start; gap:8px; }
        .warn-icon { color:#f87171; font-size:14px; flex-shrink:0; margin-top:1px; }
        .warn-text { font-size:11px; color:#f87171; line-height:1.6; }

        /* ── AI PANEL ── */
        .ai-panel { position:fixed; right:0; top:52px; bottom:0; width:390px; background:var(--s1); border-left:1px solid var(--b1); z-index:150; display:flex; flex-direction:column; overflow:hidden; transform:translateX(100%); transition:transform .28s ease; }
        .ai-panel.open { transform:translateX(0); }
        .ai-ph { padding:14px 18px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .ai-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .ai-body { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; }
        .ai-st { font-size:9px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
        .ai-card { background:var(--s2); border:1px solid var(--b2); border-radius:8px; padding:13px; font-size:12px; color:var(--tx); line-height:1.7; }

        /* Score */
        .score-big { font-family:'Instrument Serif',serif; font-size:48px; font-style:italic; line-height:1; }
        .score-bar { height:6px; background:var(--s3); border-radius:3px; overflow:hidden; margin-top:8px; }
        .score-fill { height:100%; border-radius:3px; transition:width .6s ease; }

        /* Anomaly item */
        .anomaly-item { background:var(--s2); border-radius:7px; padding:10px 12px; border-left:3px solid; display:flex; flex-direction:column; gap:4px; }
        .anomaly-title { font-size:11px; font-weight:700; display:flex; align-items:center; gap:6px; }
        .anomaly-desc { font-size:11px; color:var(--mu2); line-height:1.6; }
        .anomaly-reco { font-size:10px; margin-top:4px; font-family:'Geist Mono',monospace; color:var(--tx); }

        /* Actor AI item */
        .actor-ai { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; }
        .actor-ai-top { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
        .actor-ai-name { font-size:11px; font-weight:700; }
        .actor-ai-text { font-size:11px; color:var(--mu2); line-height:1.6; }
        .actor-ai-sug { font-size:10px; color:var(--acc2); margin-top:4px; font-family:'Geist Mono',monospace; }

        /* Optim */
        .optim-item { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; }
        .optim-title { font-size:11px; font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:3px; }
        .optim-desc { font-size:11px; color:var(--mu2); line-height:1.6; }

        .ai-list { display:flex; flex-direction:column; gap:5px; }
        .ai-li { display:flex; gap:8px; align-items:flex-start; padding:7px 10px; background:var(--s2); border-radius:5px; border:1px solid var(--b1); font-size:11px; line-height:1.6; }
        .ai-li-b { font-family:'Geist Mono',monospace; font-size:9px; color:var(--mu); padding-top:2px; flex-shrink:0; }

        .spinner { width:16px; height:16px; border:2px solid var(--b2); border-top-color:var(--acc2); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .ai-loading { display:flex; align-items:center; gap:10px; padding:20px; color:var(--mu2); font-size:12px; }

        .empty { padding:50px 20px; text-align:center; }
        .empty-ico { font-size:36px; opacity:.2; margin-bottom:10px; }
        .empty-txt { font-size:12px; color:var(--mu); line-height:1.6; }

        .toast { position:fixed; bottom:20px; right:20px; z-index:999; background:var(--s2); border:1px solid var(--b2); border-radius:7px; padding:10px 16px; font-size:12px; display:flex; align-items:center; gap:7px; box-shadow:0 8px 28px rgba(0,0,0,.5); animation:su .2s ease; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info  { border-color:rgba(99,102,241,.25); }
        @keyframes su { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        @media(max-width:700px) { .layout { grid-template-columns:1fr; } .left { display:none; } }
      `}</style>

      {/* Context menu state */}
      {(() => {
        const [ctxMenu, setCtxMenu] = useState(null) // {x,y,taskId,actorId}
        const closeCtx = useCallback(() => setCtxMenu(null), [])

        useEffect(() => {
          if (ctxMenu) {
            window.addEventListener('click', closeCtx)
            return () => window.removeEventListener('click', closeCtx)
          }
        }, [ctxMenu, closeCtx])

        return (
          <div style={{ minHeight: '100vh' }} onClick={() => ctxMenu && setCtxMenu(null)}>

            {/* ── TOP BAR ── */}
            <header className="tb">
              <button className="back" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
              <div>
                <div className="tb-title">Matrice RACI</div>
                {project && <div className="tb-proj">{project.name}</div>}
              </div>
              <div className="tb-r">
                {active && (
                  <>
                    <button className="btn" onClick={exportCSV}>↓ CSV</button>
                    <button className="btn ai" onClick={runAI} disabled={aiLoading || !active?.tasks?.length || !active?.actors?.length}>
                      {aiLoading ? <><span className="spinner"/>Analyse…</> : '✦ Analyse IA'}
                    </button>
                  </>
                )}
              </div>
            </header>

            <div className="layout">

              {/* ── LEFT ── */}
              <aside className="left">
                <div className="ph"><span className="pl">Analyses ({analyses.length})</span></div>
                <div className="plist">
                  {analyses.length === 0 && <div className="empty"><div className="empty-ico">⊞</div><div className="empty-txt">Créez votre première matrice RACI</div></div>}
                  {analyses.map(a => (
                    <div key={a.id} className={`aitem ${activeId === a.id ? 'on' : ''}`} onClick={() => setActiveId(a.id)}>
                      <button className="adel" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                      <div className="aname">{a.name}</div>
                      <div className="ameta">{a.tasks?.length || 0} tâches · {a.actors?.length || 0} acteurs{a.aiResult ? ' · IA ✓' : ''}</div>
                    </div>
                  ))}
                </div>
                {showNewForm ? (
                  <div className="nform">
                    <label className="flabel">Nom du projet/analyse</label>
                    <input className="inp" placeholder="Ex: Lancement produit" value={newAnalysis.name} onChange={e => setNewAnalysis(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus/>
                    <label className="flabel">Contexte</label>
                    <textarea className="inp" rows={2} placeholder="Périmètre, équipe…" value={newAnalysis.context} onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))}/>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn p" style={{ flex:1 }} onClick={createAnalysis}>Créer</button>
                      <button className="btn" onClick={() => setShowNewForm(false)}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:10, borderTop:'1px solid var(--b1)' }}>
                    <button className="btn" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowNewForm(true)}>+ Nouvelle matrice</button>
                  </div>
                )}
              </aside>

              {/* ── CENTER ── */}
              <main className="center">
                {!active ? (
                  <div className="empty" style={{ padding:'100px 40px' }}>
                    <div className="empty-ico" style={{ fontSize:52, marginBottom:14 }}>⊞</div>
                    <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic', marginBottom:8 }}>Matrice RACI</div>
                    <div className="empty-txt">Créez une matrice pour clarifier qui fait quoi dans votre projet.</div>
                  </div>
                ) : (
                  <>
                    {/* Tabs */}
                    <div className="tabs">
                      {[
                        { key:'matrix',  label:'Matrice',  badge: null },
                        { key:'actors',  label:'Acteurs',  badge: active.actors?.length },
                        { key:'tasks',   label:'Tâches',   badge: active.tasks?.length },
                      ].map(t => (
                        <button key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
                          {t.label}
                          {t.badge > 0 && <span className="tab-badge" style={{ background:'var(--s3)', color:'var(--mu2)' }}>{t.badge}</span>}
                          {t.key === 'matrix' && warnings.length > 0 && <span className="tab-badge" style={{ background:'rgba(248,113,113,.15)', color:'#f87171' }}>⚠ {warnings.length}</span>}
                        </button>
                      ))}
                    </div>

                    {/* ── MATRIX TAB ── */}
                    {tab === 'matrix' && (
                      <div className="matrix-area">
                        {/* Toolbar */}
                        <div className="matrix-toolbar">
                          <div className="legend">
                            {Object.entries(ROLE_META).map(([r, m]) => (
                              <div key={r} className="legend-item">
                                <div className="legend-chip" style={{ background: m.bg, color: m.color, border:`1px solid ${m.border}` }}>{r}</div>
                                <span style={{ color:'var(--mu2)' }}>{m.fr}</span>
                              </div>
                            ))}
                          </div>
                          {phases.length > 1 && (
                            <div className="phase-filter" style={{ marginLeft:'auto' }}>
                              {phases.map(p => (
                                <button key={p} className={`phase-btn ${filterPhase === p ? 'on' : ''}`} onClick={() => setFilterPhase(p)}>{p}</button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Warnings */}
                        {warnings.length > 0 && (
                          <div className="warn-banner">
                            <span className="warn-icon">⚠</span>
                            <div className="warn-text">
                              {warnings.map((w, i) => (
                                <div key={i}>
                                  {w.type === 'missing_a' && `« ${w.label} » — aucun Accountable (A) défini`}
                                  {w.type === 'missing_r' && `« ${w.label} » — aucun Responsible (R) défini`}
                                  {w.type === 'multi_a'   && `« ${w.label} » — plusieurs Accountable (A) détectés`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {active.tasks?.length === 0 || active.actors?.length === 0 ? (
                          <div className="empty">
                            <div className="empty-ico">⊞</div>
                            <div className="empty-txt">
                              {active.actors?.length === 0 && active.tasks?.length === 0
                                ? 'Ajoutez des acteurs et des tâches dans les onglets correspondants.'
                                : active.actors?.length === 0
                                  ? 'Ajoutez des acteurs dans l\'onglet "Acteurs".'
                                  : 'Ajoutez des tâches dans l\'onglet "Tâches".'}
                            </div>
                          </div>
                        ) : (
                          <div className="mtable-wrap">
                            <table className="mtable" ref={matrixRef}>
                              <thead>
                                <tr>
                                  <th className="th-corner">
                                    <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', letterSpacing:'.08em' }}>
                                      TÂCHE ↓ &nbsp; ACTEUR →
                                    </div>
                                  </th>
                                  {(active.actors || []).map(actor => {
                                    const s = getActorStats(actor.id)
                                    return (
                                      <th key={actor.id} className="th-actor">
                                        <div className="actor-header" onClick={() => { setEditActor(actor); setActorForm({ label: actor.label, role: actor.role || '' }); setTab('actors') }}>
                                          <div className="actor-name">{actor.label}</div>
                                          {actor.role && <div className="actor-role-label">{actor.role}</div>}
                                          <div className="actor-mini-stats">
                                            {s.R > 0 && <span className="actor-ms" style={{ background:'rgba(99,102,241,.12)', color:'var(--R)' }}>R:{s.R}</span>}
                                            {s.A > 0 && <span className="actor-ms" style={{ background:'rgba(245,158,11,.12)', color:'var(--A)' }}>A:{s.A}</span>}
                                            {s.C > 0 && <span className="actor-ms" style={{ background:'rgba(52,211,153,.12)', color:'var(--C)' }}>C:{s.C}</span>}
                                            {s.I > 0 && <span className="actor-ms" style={{ background:'rgba(148,163,184,.12)', color:'var(--I)' }}>I:{s.I}</span>}
                                          </div>
                                        </div>
                                      </th>
                                    )
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredTasks.map((task, rowIdx) => {
                                  const ts = getTaskStats(task.id)
                                  const taskWarns = warnings.filter(w => w.taskId === task.id)
                                  return (
                                    <tr key={task.id} style={{ background: rowIdx % 2 === 0 ? 'var(--bg)' : 'rgba(255,255,255,.012)' }}>
                                      <td className="td-task">
                                        <div className="task-cell" onClick={() => { setEditTask(task); setTaskForm({ label: task.label, phase: task.phase || 'Général', desc: task.desc || '' }); setTab('tasks') }}>
                                          <div className="task-name">{task.label}</div>
                                          {task.phase && task.phase !== 'Général' && <span className="task-phase-chip">{task.phase}</span>}
                                          {taskWarns.map((w, wi) => (
                                            <div key={wi} className="task-warn">
                                              {w.type === 'missing_a' && '⚠ Pas de Accountable'}
                                              {w.type === 'missing_r' && '⚠ Pas de Responsible'}
                                              {w.type === 'multi_a'   && '⚠ Plusieurs Accountable'}
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                      {(active.actors || []).map(actor => {
                                        const role = active.matrix?.[task.id]?.[actor.id] || null
                                        const isHovered = hoveredCell?.taskId === task.id && hoveredCell?.actorId === actor.id
                                        return (
                                          <td
                                            key={actor.id}
                                            className="td-raci"
                                            onMouseEnter={() => setHoveredCell({ taskId: task.id, actorId: actor.id })}
                                            onMouseLeave={() => setHoveredCell(null)}
                                            onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setCtxMenu({ x: rect.left, y: rect.bottom + 4, taskId: task.id, actorId: actor.id }) }}
                                          >
                                            {role ? (
                                              <div className={`raci-chip ${role}`}>{role}</div>
                                            ) : (
                                              <div className="raci-chip empty">{isHovered ? '+' : ''}</div>
                                            )}
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Context menu */}
                        {ctxMenu && (
                          <div className="ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
                            {ROLES.map(r => {
                              const m = ROLE_META[r]
                              const current = active.matrix?.[ctxMenu.taskId]?.[ctxMenu.actorId]
                              return (
                                <div key={r} className="ctx-item" style={{ background: current === r ? m.bg : undefined }} onClick={() => { setRole(ctxMenu.taskId, ctxMenu.actorId, r); setCtxMenu(null) }}>
                                  <div className="ctx-chip" style={{ background: m.bg, color: m.color, border:`1px solid ${m.border}` }}>{r}</div>
                                  <div>
                                    <div style={{ fontSize:11, fontWeight:600, color: current === r ? m.color : 'var(--tx)' }}>{m.fr}</div>
                                    <div style={{ fontSize:9, color:'var(--mu2)', fontFamily:'Geist Mono,monospace' }}>{m.desc}</div>
                                  </div>
                                  {current === r && <span style={{ marginLeft:'auto', color: m.color, fontSize:10 }}>✓</span>}
                                </div>
                              )
                            })}
                            {active.matrix?.[ctxMenu.taskId]?.[ctxMenu.actorId] && (
                              <div className="ctx-clear" onClick={() => { setRole(ctxMenu.taskId, ctxMenu.actorId, null); setCtxMenu(null) }}>✕ Effacer</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── ACTORS TAB ── */}
                    {tab === 'actors' && (
                      <div className="actors-area">
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div style={{ fontFamily:'Instrument Serif,serif', fontSize:17, fontStyle:'italic' }}>{active.name}</div>
                          <button className="btn p" onClick={() => { setEditActor({}); setActorForm({ label:'', role:'' }) }}>+ Ajouter un acteur</button>
                        </div>

                        {(editActor !== null) && (
                          <div className="actor-form-card">
                            <div style={{ fontFamily:'Instrument Serif,serif', fontSize:14, fontStyle:'italic' }}>{editActor?.id ? `Modifier "${editActor.label}"` : 'Nouvel acteur'}</div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                              <div>
                                <label className="flabel">Nom / Initiales *</label>
                                <input className="inp" placeholder="Ex: Alice M." value={actorForm.label} onChange={e => setActorForm(p => ({ ...p, label: e.target.value }))} autoFocus onKeyDown={e => e.key === 'Enter' && saveActor()}/>
                              </div>
                              <div>
                                <label className="flabel">Rôle / Poste</label>
                                <input className="inp" placeholder="Ex: Chef de projet" value={actorForm.role} onChange={e => setActorForm(p => ({ ...p, role: e.target.value }))} onKeyDown={e => e.key === 'Enter' && saveActor()}/>
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="btn p" style={{ flex:1 }} onClick={saveActor}>{editActor?.id ? 'Mettre à jour' : 'Ajouter'}</button>
                              <button className="btn" onClick={() => { setEditActor(null); setActorForm({ label:'', role:'' }) }}>Annuler</button>
                            </div>
                          </div>
                        )}

                        {(active.actors || []).length === 0 ? (
                          <div className="empty"><div className="empty-ico">👤</div><div className="empty-txt">Ajoutez les acteurs qui participent au projet.</div></div>
                        ) : (
                          <div className="actors-grid">
                            {(active.actors || []).map(actor => {
                              const s = getActorStats(actor.id)
                              return (
                                <div key={actor.id} className="actor-card">
                                  <div className="actor-card-top">
                                    <div className="actor-avatar">{actor.label.slice(0,2).toUpperCase()}</div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div className="actor-card-name">{actor.label}</div>
                                      {actor.role && <div className="actor-card-role">{actor.role}</div>}
                                    </div>
                                    <div className="actor-card-actions">
                                      <button className="icon-btn" style={{ color:'var(--mu2)' }} onClick={() => { setEditActor(actor); setActorForm({ label: actor.label, role: actor.role || '' }) }}>✎</button>
                                      <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteActor(actor.id)}>✕</button>
                                    </div>
                                  </div>
                                  <div className="actor-stats-row">
                                    {Object.entries(ROLE_META).map(([r, m]) => (
                                      <div key={r} className="actor-stat" style={{ background: m.bg, border:`1px solid ${m.border}` }}>
                                        <span className="actor-stat-val" style={{ color: m.color }}>{s[r]}</span>
                                        <span className="actor-stat-key" style={{ color: m.color }}>{r}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ fontSize:10, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>
                                    {s.total} assignation(s) sur {active.tasks?.length || 0} tâche(s)
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── TASKS TAB ── */}
                    {tab === 'tasks' && (
                      <div className="tasks-area">
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div style={{ fontFamily:'Instrument Serif,serif', fontSize:17, fontStyle:'italic' }}>{active.name}</div>
                          <button className="btn p" onClick={() => { setEditTask({}); setTaskForm({ label:'', phase:'Général', desc:'' }) }}>+ Ajouter une tâche</button>
                        </div>

                        {(editTask !== null) && (
                          <div className="task-form-card">
                            <div style={{ fontFamily:'Instrument Serif,serif', fontSize:14, fontStyle:'italic' }}>{editTask?.id ? `Modifier "${editTask.label}"` : 'Nouvelle tâche'}</div>
                            <div>
                              <label className="flabel">Nom de la tâche *</label>
                              <input className="inp" placeholder="Ex: Rédiger le cahier des charges" value={taskForm.label} onChange={e => setTaskForm(p => ({ ...p, label: e.target.value }))} autoFocus/>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                              <div>
                                <label className="flabel">Phase</label>
                                <select className="inp" value={taskForm.phase} onChange={e => setTaskForm(p => ({ ...p, phase: e.target.value }))}>
                                  {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="flabel">Description (optionnel)</label>
                              <textarea className="inp" rows={2} placeholder="Détails de la tâche…" value={taskForm.desc} onChange={e => setTaskForm(p => ({ ...p, desc: e.target.value }))}/>
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="btn p" style={{ flex:1 }} onClick={saveTask}>{editTask?.id ? 'Mettre à jour' : 'Ajouter'}</button>
                              <button className="btn" onClick={() => { setEditTask(null); setTaskForm({ label:'', phase:'Général', desc:'' }) }}>Annuler</button>
                            </div>
                          </div>
                        )}

                        {(active.tasks || []).length === 0 ? (
                          <div className="empty"><div className="empty-ico">☑</div><div className="empty-txt">Ajoutez les tâches ou livrables de votre projet.</div></div>
                        ) : (
                          <div>
                            {PHASE_OPTIONS.filter(ph => (active.tasks || []).some(t => t.phase === ph)).map(phase => {
                              const phaseTasks = (active.tasks || []).filter(t => t.phase === phase)
                              if (phaseTasks.length === 0) return null
                              return (
                                <div key={phase} style={{ marginBottom:16 }}>
                                  <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>— {phase} —</div>
                                  <div className="tasks-list">
                                    {phaseTasks.map((task, i) => {
                                      const ts = getTaskStats(task.id)
                                      return (
                                        <div key={task.id} className="task-row">
                                          <span className="task-num">{i + 1}</span>
                                          <div className="task-info">
                                            <div className="task-row-name">{task.label}</div>
                                            {task.desc && <div className="task-row-desc">{task.desc}</div>}
                                            <div className="task-row-meta">
                                              {Object.entries(ROLE_META).map(([r, m]) => {
                                                const c = ts[r]
                                                if (!c) return null
                                                return (
                                                  <span key={r} style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:m.bg, color:m.color, border:`1px solid ${m.border}`, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>
                                                    {r}×{c}
                                                  </span>
                                                )
                                              })}
                                              {!ts.hasA && <span style={{ fontSize:9, color:'#f87171', fontFamily:'Geist Mono,monospace' }}>⚠ pas de A</span>}
                                              {!ts.hasR && <span style={{ fontSize:9, color:'#f87171', fontFamily:'Geist Mono,monospace' }}>⚠ pas de R</span>}
                                            </div>
                                          </div>
                                          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                                            <button className="icon-btn" style={{ color:'var(--mu2)' }} onClick={() => { setEditTask(task); setTaskForm({ label: task.label, phase: task.phase || 'Général', desc: task.desc || '' }) }}>✎</button>
                                            <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteTask(task.id)}>✕</button>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>

            {/* ── AI PANEL ── */}
            <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
              <div className="ai-ph">
                <span className="ai-title">Analyse IA ✦</span>
                <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
              </div>
              <div className="ai-body">
                {aiLoading && <div className="ai-loading"><div className="spinner"/>Analyse de la gouvernance…</div>}

                {!aiLoading && !aiResult && active?.aiResult && (() => { setAiResult(active.aiResult); return null })()}

                {aiResult && (
                  <>
                    {/* Score */}
                    {aiResult.score_gouvernance && (
                      <div style={{ background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:10, padding:14, display:'flex', gap:14, alignItems:'center' }}>
                        <div>
                          <div className="score-big" style={{ color: aiResult.score_gouvernance.note >= 7 ? '#34d399' : aiResult.score_gouvernance.note >= 5 ? '#f59e0b' : '#f87171' }}>
                            {aiResult.score_gouvernance.note}
                          </div>
                          <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', letterSpacing:'.08em' }}>/ {aiResult.score_gouvernance.sur}</div>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:9, color:'var(--mu2)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Score de gouvernance</div>
                          <div className="score-bar">
                            <div className="score-fill" style={{ width:`${(aiResult.score_gouvernance.note / aiResult.score_gouvernance.sur) * 100}%`, background: aiResult.score_gouvernance.note >= 7 ? '#34d399' : aiResult.score_gouvernance.note >= 5 ? '#f59e0b' : '#f87171' }}/>
                          </div>
                          <div style={{ fontSize:11, color:'var(--mu2)', marginTop:6, lineHeight:1.5 }}>{aiResult.score_gouvernance.commentaire}</div>
                        </div>
                      </div>
                    )}

                    {aiResult.synthese && (
                      <div>
                        <div className="ai-st">Synthèse</div>
                        <div className="ai-card">{aiResult.synthese}</div>
                      </div>
                    )}

                    {aiResult.anomalies?.length > 0 && (
                      <div>
                        <div className="ai-st">Anomalies détectées ({aiResult.anomalies.length})</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {aiResult.anomalies.map((an, i) => {
                            const sc = SEVERITE_COLORS[an.severite] || 'var(--mu2)'
                            return (
                              <div key={i} className="anomaly-item" style={{ borderLeftColor: sc }}>
                                <div className="anomaly-title">
                                  <span style={{ fontSize:9, padding:'1px 7px', borderRadius:3, background:`${sc}18`, color:sc, fontFamily:'Geist Mono,monospace', fontWeight:700, border:`1px solid ${sc}40` }}>{an.severite}</span>
                                  {an.description}
                                </div>
                                {(an.taches_concernees?.length > 0 || an.acteurs_concernes?.length > 0) && (
                                  <div style={{ fontSize:10, color:'var(--mu2)', fontFamily:'Geist Mono,monospace' }}>
                                    {an.taches_concernees?.join(', ')} {an.acteurs_concernes?.length > 0 && `· ${an.acteurs_concernes.join(', ')}`}
                                  </div>
                                )}
                                {an.recommandation && <div className="anomaly-reco">→ {an.recommandation}</div>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {aiResult.acteurs?.length > 0 && (
                      <div>
                        <div className="ai-st">Diagnostic par acteur</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {aiResult.acteurs.map((a, i) => {
                            const actor = active?.actors?.find(ac => ac.id === a.id)
                            if (!actor) return null
                            const ac = ALERT_COLORS[a.alerte] || '#94a3b8'
                            return (
                              <div key={i} className="actor-ai">
                                <div className="actor-ai-top">
                                  <div style={{ width:28, height:28, borderRadius:7, background:`${ac}18`, color:ac, border:`1px solid ${ac}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                                    {actor.label.slice(0,2).toUpperCase()}
                                  </div>
                                  <div className="actor-ai-name">{actor.label}</div>
                                  <span style={{ fontSize:9, padding:'1px 7px', borderRadius:3, background:`${ac}18`, color:ac, border:`1px solid ${ac}40`, fontFamily:'Geist Mono,monospace', fontWeight:600, marginLeft:'auto' }}>{a.alerte}</span>
                                </div>
                                <div className="actor-ai-text">{a.diagnostic}</div>
                                {a.suggestion && <div className="actor-ai-sug">→ {a.suggestion}</div>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {aiResult.bonnes_pratiques?.length > 0 && (
                      <div>
                        <div className="ai-st" style={{ color:'#34d399' }}>✓ Bonnes pratiques</div>
                        <div className="ai-list">
                          {aiResult.bonnes_pratiques.map((b, i) => (
                            <div key={i} className="ai-li"><span className="ai-li-b" style={{ color:'#34d399' }}>+</span><span>{b}</span></div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiResult.optimisations?.length > 0 && (
                      <div>
                        <div className="ai-st">Optimisations recommandées</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          {aiResult.optimisations.map((o, i) => {
                            const pc = PRIORITE_COLORS[o.priorite] || 'var(--mu2)'
                            return (
                              <div key={i} className="optim-item">
                                <div className="optim-title">
                                  <span style={{ fontSize:9, padding:'1px 7px', borderRadius:3, background:`${pc}18`, color:pc, border:`1px solid ${pc}40`, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{o.priorite}</span>
                                  {o.titre}
                                </div>
                                <div className="optim-desc">{o.description}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {aiResult.conclusion && (
                      <div>
                        <div className="ai-st">Conclusion</div>
                        <div className="ai-card" style={{ fontStyle:'italic', color:'var(--mu2)' }}>{aiResult.conclusion}</div>
                      </div>
                    )}
                  </>
                )}

                {!aiLoading && !aiResult && (
                  <div className="empty" style={{ padding:'40px 16px' }}>
                    <div className="empty-ico">✦</div>
                    <div className="empty-txt">Remplissez la matrice puis cliquez sur "Analyse IA" pour auditer la gouvernance de votre projet.</div>
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
        )
      })()}
    </>
  )
}