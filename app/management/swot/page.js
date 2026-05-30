'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`

const QUADRANTS = {
  strengths:     { label:'Forces',       en:'Strengths',     short:'S', color:'#22d3a5', bg:'rgba(34,211,165,.08)',  border:'rgba(34,211,165,.22)',  icon:'↑', hint:'Avantages internes, compétences distinctives, ressources clés' },
  weaknesses:    { label:'Faiblesses',   en:'Weaknesses',    short:'W', color:'#f87171', bg:'rgba(248,113,113,.08)', border:'rgba(248,113,113,.22)', icon:'↓', hint:'Lacunes internes, points d\'amélioration, contraintes actuelles' },
  opportunities: { label:'Opportunités', en:'Opportunities', short:'O', color:'#60a5fa', bg:'rgba(96,165,250,.08)',  border:'rgba(96,165,250,.22)',  icon:'◎', hint:'Tendances favorables, marchés émergents, facteurs externes positifs' },
  threats:       { label:'Menaces',      en:'Threats',       short:'T', color:'#f59e0b', bg:'rgba(245,158,11,.08)',  border:'rgba(245,158,11,.22)',  icon:'⚡', hint:'Risques externes, concurrence, changements défavorables' },
}

const PRIORITY_LABELS = { high:'Haute', medium:'Moyenne', low:'Faible' }
const PRIORITY_COLORS = { high:'#f87171', medium:'#f59e0b', low:'#22d3a5' }
const TOWS_COLORS     = { SO:'#22d3a5', WO:'#60a5fa', ST:'#f59e0b', WT:'#f87171' }
const TOWS_ICONS      = { SO:'↗', WO:'↑', ST:'⊡', WT:'↙' }
const TOWS_LABELS     = { SO:'Attaque', WO:'Amélioration', ST:'Défense', WT:'Survie' }

const EMPTY_ITEM = { text:'', priority:'medium', impact:3, notes:'' }

// ─── SWOT Page ────────────────────────────────────────────────
export default function SWOTPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,     setProject]     = useState(null)
  const [analyses,    setAnalyses]    = useState([])
  const [activeId,    setActiveId]    = useState(null)

  // UI state
  const [phase,       setPhase]       = useState('list')  // 'list'|'setup-generate'|'setup-manual'|'canvas'
  const [newForm,     setNewForm]     = useState({ name:'', context:'', objective:'' })
  const [editItem,    setEditItem]    = useState(null)
  const [itemForm,    setItemForm]    = useState(EMPTY_ITEM)
  const [addingTo,    setAddingTo]    = useState(null)
  const [focusQ,      setFocusQ]      = useState(null)
  const [dragItem,    setDragItem]    = useState(null)
  const [dragOver,    setDragOver]    = useState(null)
  const [toast,       setToast]       = useState(null)

  // AI state
  const [aiMode,      setAiMode]      = useState(null)    // null|'generating'|'analysing'|'done'
  const [aiStep,      setAiStep]      = useState(0)
  const [aiResult,    setAiResult]    = useState(null)
  const [showPanel,   setShowPanel]   = useState(false)

  // Active tab in AI panel
  const [panelTab,    setPanelTab]    = useState('strategies')  // 'strategies'|'priorities'|'risks'

  const fileRef = useRef(null)

  const GEN_STEPS = [
    'Analyse du contexte et du marché…',
    'Identification des forces internes…',
    'Détection des faiblesses…',
    'Exploration des opportunités…',
    'Évaluation des menaces…',
    'Construction des stratégies TOWS…',
    'Finalisation de l\'analyse…',
  ]
  const ANALYSE_STEPS = [
    'Lecture de votre matrice SWOT…',
    'Croisement des quadrants…',
    'Construction des stratégies TOWS…',
    'Priorisation des actions…',
    'Génération du rapport stratégique…',
  ]

  // ── Persist ──────────────────────────────────────────────────
  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), SWOT: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.SWOT || []
        setAnalyses(list)
        if (list.length > 0) {
          setActiveId(list[list.length-1].id)
          setPhase('canvas')
        }
      }
    } catch {}
  }, [projectId])

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const active = analyses.find(a => a.id === activeId) || null

  // ── Restore AI result when switching ─────────────────────────
  useEffect(() => {
    if (active?.aiResult) { setAiResult(active.aiResult); setAiMode('done') }
    else { setAiResult(null); setAiMode(null) }
  }, [activeId])

  // ── CRUD analyses ─────────────────────────────────────────────
  const updateAnalysis = useCallback((patch) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === activeId ? { ...a, ...patch } : a)
      persist(updated)
      return updated
    })
  }, [activeId, persist])

  const deleteAnalysis = (id) => {
    setAnalyses(prev => {
      const updated = prev.filter(a => a.id !== id)
      persist(updated)
      if (activeId === id) {
        const next = updated[updated.length-1]
        setActiveId(next?.id || null)
        setPhase(next ? 'canvas' : 'list')
      }
      return updated
    })
    showToast('Analyse supprimée', 'info')
  }

  // ── CRUD items ────────────────────────────────────────────────
  const saveItem = (quadrant) => {
    if (!itemForm.text.trim()) return
    const item = {
      id:       editItem?.id || uid(),
      text:     itemForm.text.trim(),
      priority: itemForm.priority,
      impact:   parseInt(itemForm.impact) || 3,
      notes:    itemForm.notes.trim(),
    }
    const prev  = active.items[quadrant] || []
    const items = editItem
      ? prev.map(i => i.id === editItem.id ? item : i)
      : [...prev, item]
    updateAnalysis({ items: { ...active.items, [quadrant]: items } })
    setEditItem(null); setAddingTo(null); setItemForm(EMPTY_ITEM)
    showToast(editItem ? 'Élément mis à jour' : 'Ajouté ✓')
  }

  const deleteItem = (quadrant, id) => {
    const items = (active.items[quadrant] || []).filter(i => i.id !== id)
    updateAnalysis({ items: { ...active.items, [quadrant]: items } })
    if (editItem?.id === id) { setEditItem(null); setItemForm(EMPTY_ITEM) }
  }

  const startEdit = (quadrant, item) => {
    setEditItem({ quadrant, id: item.id })
    setAddingTo(quadrant)
    setItemForm({ text:item.text, priority:item.priority, impact:item.impact, notes:item.notes })
  }

  // ── Drag across quadrants ─────────────────────────────────────
  const onDrop = (targetQ) => {
    if (!dragItem || dragItem.quadrant === targetQ) { setDragItem(null); setDragOver(null); return }
    const src   = [...(active.items[dragItem.quadrant] || [])]
    const moved = src.find(i => i.id === dragItem.id)
    if (!moved) return
    const newSrc = src.filter(i => i.id !== dragItem.id)
    const newTgt = [...(active.items[targetQ] || []), moved]
    updateAnalysis({ items: { ...active.items, [dragItem.quadrant]: newSrc, [targetQ]: newTgt } })
    showToast(`Déplacé vers ${QUADRANTS[targetQ].label}`)
    setDragItem(null); setDragOver(null)
  }

  // ── Health score ──────────────────────────────────────────────
  const getHealth = () => {
    if (!active) return null
    const s = (active.items?.strengths     || []).length
    const w = (active.items?.weaknesses    || []).length
    const o = (active.items?.opportunities || []).length
    const t = (active.items?.threats       || []).length
    const total = s + w + o + t
    if (total === 0) return null
    const aiScore   = active.aiResult?.healthScore || null
    const balance   = Math.round(((s + o) / total) * 100)
    const coverage  = Math.min(100, Math.round((Math.min(s,5)+Math.min(w,4)+Math.min(o,5)+Math.min(t,4)) / 18 * 100))
    const base      = Math.round(balance*0.5 + coverage*0.5)
    const score     = aiScore || base
    return { score, balance, coverage, s, w, o, t, total }
  }
  const health = getHealth()
  const totalItems = active ? Object.values(active.items || {}).reduce((s,arr) => s+arr.length, 0) : 0

  // ═══════════════════════════════════════
  // AI — MODE 1: Generate elements
  // ═══════════════════════════════════════
  const handleGenerate = async () => {
    if (!newForm.name.trim() || !newForm.context.trim()) return

    // Create new analysis shell
    const analysis = {
      id:        uid(),
      name:      newForm.name.trim(),
      context:   newForm.context.trim(),
      objective: newForm.objective.trim(),
      createdAt: new Date().toISOString(),
      mode:      'ai-generated',
      items:     { strengths:[], weaknesses:[], opportunities:[], threats:[] },
      aiResult:  null,
    }
    const withNew = [...analyses, analysis]
    setAnalyses(withNew); persist(withNew)
    setActiveId(analysis.id)

    setPhase('canvas')
    setAiMode('generating'); setAiStep(0); setShowPanel(true)

    let step = 0
    const iv = setInterval(() => { step = Math.min(step+1, GEN_STEPS.length-1); setAiStep(step) }, 900)

    try {
      const res  = await fetch('/api/generer-management/generer-swot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:        'generate',
          analysisName: analysis.name,
          context:     analysis.context,
          objective:   analysis.objective,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Patch the analysis with generated items + result
      const aiRes = data.analysis
      setAnalyses(prev => {
        const updated = prev.map(a => a.id === analysis.id
          ? { ...a, items: data.items, aiResult: aiRes }
          : a
        )
        persist(updated)
        return updated
      })
      setAiResult(aiRes)
      setAiMode('done')
      showToast('SWOT généré par l\'IA ✓')
    } catch (err) {
      showToast(err.message, 'error')
      setAiMode(null)
    } finally {
      clearInterval(iv)
      setNewForm({ name:'', context:'', objective:'' })
    }
  }

  // ═══════════════════════════════════════
  // AI — MODE 2: Analyse existing
  // ═══════════════════════════════════════
  const handleAnalyse = async () => {
    if (!active || totalItems === 0) { showToast('Ajoutez des éléments d\'abord', 'error'); return }
    setAiMode('analysing'); setAiStep(0); setShowPanel(true)

    let step = 0
    const iv = setInterval(() => { step = Math.min(step+1, ANALYSE_STEPS.length-1); setAiStep(step) }, 1000)

    try {
      const res  = await fetch('/api/generer-management/generer-swot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:        'analyse',
          analysisName: active.name,
          context:     active.context,
          objective:   active.objective,
          items:       active.items,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiResult(data.analysis)
      updateAnalysis({ aiResult: data.analysis })
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
    const blob = new Blob([JSON.stringify({ version:'2.0', exported: new Date().toISOString(), analysis: active }, null,2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `SWOT_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(a.href)
    showToast('Export réussi ↓')
  }

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ version:'2.0', exported: new Date().toISOString(), project: project?.name, analyses }, null,2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `SWOT_ALL_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(a.href)
    showToast(`${analyses.length} analyse(s) exportée(s)`)
  }

  const importFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.analysis) {
          // Single analysis
          const imported = { ...data.analysis, id: uid(), name: data.analysis.name + ' (importé)', createdAt: new Date().toISOString() }
          const updated  = [...analyses, imported]
          setAnalyses(updated); persist(updated)
          setActiveId(imported.id); setPhase('canvas')
          showToast(`Analyse "${imported.name}" importée`)
        } else if (data.analyses) {
          // Bulk
          const imported = data.analyses.map(a => ({ ...a, id: uid(), name: a.name + ' (importé)', createdAt: new Date().toISOString() }))
          const updated  = [...analyses, ...imported]
          setAnalyses(updated); persist(updated)
          setActiveId(imported[imported.length-1].id); setPhase('canvas')
          showToast(`${imported.length} analyse(s) importée(s)`)
        }
      } catch { showToast('Fichier JSON invalide', 'error') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const isAiRunning = aiMode === 'generating' || aiMode === 'analysing'
  const currentSteps = aiMode === 'generating' ? GEN_STEPS : ANALYSE_STEPS

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
        @keyframes spin  { to { transform:rotate(360deg); } }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping  { 75%,100%{transform:scale(1.5);opacity:0} }
        @keyframes slideUp{ from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }

        /* ── Root ── */
        .swot-root { min-height:100vh; display:flex; flex-direction:column; }

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
          white-space:nowrap;
        }
        .back-btn:hover { color:var(--text); }
        .topbar-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .topbar-project { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .topbar-right { margin-left:auto; display:flex; gap:6px; align-items:center; }
        .tbtn {
          display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:6px; cursor:pointer;
          font-family:'Geist Mono',monospace; font-size:11px; border:1px solid var(--border2);
          background:var(--surface2); color:var(--muted2); transition:all .15s; white-space:nowrap;
        }
        .tbtn:hover { color:var(--text); border-color:rgba(255,255,255,.2); }
        .tbtn.primary { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.3); color:var(--accent2); }
        .tbtn.ai { background:rgba(96,165,250,.08); border-color:rgba(96,165,250,.25); color:#60a5fa; }
        .tbtn.ai:hover { background:rgba(96,165,250,.15); }
        .tbtn:disabled { opacity:.4; cursor:not-allowed; }

        /* ── Body grid ── */
        .swot-body { flex:1; display:grid; grid-template-columns:230px 1fr; overflow:hidden; height:calc(100vh - 56px); }

        /* ── Sidebar ── */
        .sidebar {
          background:var(--surface); border-right:1px solid var(--border);
          display:flex; flex-direction:column; overflow:hidden;
        }
        .panel-hdr {
          padding:12px 14px 8px; border-bottom:1px solid var(--border);
          display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
        }
        .panel-lbl { font-size:9px; color:var(--muted); letter-spacing:.12em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .panel-list { flex:1; overflow-y:auto; padding:6px 8px; display:flex; flex-direction:column; gap:2px; }

        .analysis-row {
          padding:9px 10px; border-radius:7px; cursor:pointer;
          border:1px solid transparent; transition:all .15s; display:flex; gap:8px; align-items:flex-start;
        }
        .analysis-row:hover { background:var(--surface2); }
        .analysis-row.active { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.25); }
        .ar-dot { width:7px; height:7px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:4px; }
        .ar-dot.off { background:var(--muted); }
        .ar-name { font-size:12px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ar-meta { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:1px; }
        .ar-del { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; padding:2px 4px; flex-shrink:0; margin-left:auto; }
        .analysis-row:hover .ar-del { opacity:1; }

        /* Health widget */
        .health-w {
          margin:0 10px 10px; padding:11px 12px; border-radius:8px;
          background:var(--surface2); border:1px solid var(--border); flex-shrink:0;
        }
        .hw-lbl { font-size:9px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
        .hw-score { font-size:26px; font-weight:800; line-height:1; margin-bottom:4px; }
        .hw-bar-bg { height:4px; background:var(--border2); border-radius:2px; margin-bottom:8px; overflow:hidden; }
        .hw-bar    { height:100%; border-radius:2px; transition:width .8s ease; }
        .hw-grid   { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
        .hw-cell   { display:flex; align-items:center; gap:5px; font-size:10px; font-family:'Geist Mono',monospace; }
        .hw-dot    { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

        /* Sidebar footer */
        .sb-footer { padding:10px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px; flex-shrink:0; }
        .sb-new-btn {
          width:100%; padding:8px 10px; border-radius:7px; border:1px dashed var(--border2);
          background:transparent; color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px;
          cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; gap:6px;
        }
        .sb-new-btn:hover { border-color:var(--accent); color:var(--accent); }
        .sb-row { display:flex; gap:6px; }
        .sb-small-btn {
          flex:1; padding:6px 0; border-radius:6px; border:1px solid var(--border);
          background:var(--surface2); color:var(--muted); font-family:'Geist Mono',monospace;
          font-size:10px; cursor:pointer; transition:all .15s; text-align:center;
        }
        .sb-small-btn:hover { color:var(--text); border-color:var(--border2); }

        /* ── Main content ── */
        .swot-main { overflow:hidden; display:flex; flex-direction:column; }

        /* ── PHASE: list ── */
        .phase-center { flex:1; display:flex; align-items:center; justify-content:center; padding:40px; }
        .phase-card { max-width:580px; width:100%; text-align:center; }
        .phase-icon { font-size:42px; opacity:.18; margin-bottom:20px; }
        .phase-title { font-family:'Instrument Serif',serif; font-size:28px; font-style:italic; margin-bottom:10px; }
        .phase-sub { font-size:13px; color:var(--muted2); line-height:1.7; margin-bottom:32px; }
        .mode-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px; text-align:left; }
        .mode-card {
          padding:20px; border-radius:12px; cursor:pointer; transition:all .2s;
          background:var(--surface); border:1px solid var(--border2);
        }
        .mode-card:hover { border-color:var(--accent); transform:translateY(-2px); }
        .mode-card.selected { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.4); }
        .mode-card-icon { font-size:24px; margin-bottom:10px; }
        .mode-card-title { font-size:14px; font-weight:700; color:var(--text); margin-bottom:4px; }
        .mode-card-desc { font-size:11px; color:var(--muted2); line-height:1.6; }

        /* ── PHASE: setup ── */
        .setup-form { max-width:520px; width:100%; }
        .sf-title { font-family:'Instrument Serif',serif; font-size:24px; font-style:italic; margin-bottom:20px; }
        .sf-row { margin-bottom:14px; }
        .sf-lbl { display:block; font-size:9px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
        .sf-input {
          width:100%; background:var(--bg); border:1px solid var(--border2);
          border-radius:8px; padding:10px 13px; font-family:'Syne',sans-serif;
          font-size:13px; color:var(--text); outline:none; transition:border-color .15s;
        }
        .sf-input:focus { border-color:var(--accent); }
        .sf-input::placeholder { color:var(--muted); }
        textarea.sf-input { resize:vertical; }
        .sf-btns { display:flex; gap:10px; margin-top:20px; }
        .sf-btn-primary {
          flex:1; padding:12px; border-radius:8px; border:none; cursor:pointer;
          background:linear-gradient(135deg,#6366f1,#818cf8); color:#fff;
          font-family:'Syne',sans-serif; font-weight:700; font-size:14px;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:opacity .15s;
        }
        .sf-btn-primary:hover:not(:disabled) { opacity:.85; }
        .sf-btn-primary:disabled { opacity:.4; cursor:not-allowed; }
        .sf-btn-secondary {
          padding:12px 20px; border-radius:8px; cursor:pointer;
          background:var(--surface2); border:1px solid var(--border2); color:var(--muted2);
          font-family:'Syne',sans-serif; font-size:13px; transition:all .15s;
        }
        .sf-btn-secondary:hover { color:var(--text); }

        /* ── Canvas header ── */
        .canvas-header {
          padding:14px 20px 0; display:flex; align-items:flex-start; justify-content:space-between; flex-shrink:0;
        }
        .canvas-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; }
        .canvas-ctx { font-size:11px; color:var(--muted2); line-height:1.6; margin-top:3px; max-width:520px; }
        .canvas-obj {
          display:inline-flex; align-items:center; gap:5px; margin-top:5px;
          padding:3px 10px; border-radius:99px;
          background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.2);
          font-size:10px; color:var(--accent2); font-family:'Geist Mono',monospace;
        }
        .canvas-actions { display:flex; gap:6px; flex-shrink:0; }

        /* ── SWOT Grid ── */
        .swot-grid {
          display:grid; grid-template-columns:1fr 1fr;
          gap:10px; padding:14px 20px; flex:1; overflow:auto;
          min-height:0;
        }

        .q-card {
          background:var(--surface); border:1px solid var(--qborder);
          border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:8px;
          transition:all .2s; position:relative; overflow:hidden; min-height:200px;
          background-image:radial-gradient(circle at 90% 10%, var(--qbg) 0%, transparent 55%);
        }
        .q-card.drag-over { border-color:var(--qcolor); box-shadow:0 0 0 1px var(--qcolor); }
        .q-card.expanded  { grid-column:1/-1; }
        .q-top-bar { position:absolute; top:0; left:0; right:0; height:2px; background:var(--qcolor); opacity:0; transition:opacity .2s; }
        .q-card:hover .q-top-bar { opacity:1; }

        .q-head { display:flex; align-items:flex-start; justify-content:space-between; }
        .q-head-left { display:flex; align-items:center; gap:9px; }
        .q-badge {
          width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;
          font-size:14px; font-weight:800; color:var(--qcolor);
          background:var(--qbg); border:1px solid var(--qborder); flex-shrink:0;
        }
        .q-label { font-size:13px; font-weight:700; color:var(--text); }
        .q-en    { font-size:9px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .q-head-right { display:flex; align-items:center; gap:6px; }
        .q-count {
          min-width:20px; height:20px; border-radius:5px; display:flex; align-items:center; justify-content:center;
          background:var(--qbg); color:var(--qcolor); font-size:10px; font-weight:700;
          border:1px solid var(--qborder); font-family:'Geist Mono',monospace; padding:0 3px;
        }
        .q-icon-btn {
          background:none; border:none; color:var(--muted); cursor:pointer; font-size:13px;
          padding:2px 4px; border-radius:4px; transition:color .15s;
        }
        .q-icon-btn:hover { color:var(--text); }
        .q-hint { font-size:10px; color:var(--muted); line-height:1.5; font-style:italic; }

        .q-items { display:flex; flex-direction:column; gap:5px; flex:1; }
        .q-empty { display:flex; align-items:center; gap:8px; font-size:11px; color:var(--muted); padding:6px 0; }

        .swot-item {
          background:var(--surface2); border:1px solid var(--border);
          border-radius:7px; padding:8px 10px; transition:all .15s; cursor:grab;
          animation:fadeUp .25s ease both;
        }
        .swot-item:hover { border-color:var(--border2); }
        .swot-item.editing { border-color:var(--qcolor); }
        .si-top { display:flex; align-items:flex-start; gap:7px; }
        .si-pdot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:5px; }
        .si-text { font-size:12px; color:var(--text); line-height:1.5; flex:1; }
        .si-acts { display:flex; gap:2px; opacity:0; transition:opacity .15s; }
        .swot-item:hover .si-acts { opacity:1; }
        .si-btn {
          width:20px; height:20px; border-radius:4px; display:flex; align-items:center; justify-content:center;
          background:none; border:none; cursor:pointer; font-size:11px; color:var(--muted2); transition:all .15s;
        }
        .si-btn:hover { background:var(--surface3); color:var(--text); }
        .si-btn.del:hover { color:#f87171; }
        .si-impact { display:flex; align-items:center; gap:3px; margin-top:5px; }
        .imp-dot { width:6px; height:6px; border-radius:50%; }

        /* Item form */
        .item-form {
          background:var(--surface3); border:1px solid var(--qborder,var(--border2));
          border-radius:8px; padding:11px; display:flex; flex-direction:column; gap:7px;
        }
        .if-input {
          width:100%; background:var(--bg); border:1px solid var(--border2);
          border-radius:6px; padding:8px 10px; font-family:'Syne',sans-serif;
          font-size:12px; color:var(--text); outline:none; resize:vertical; transition:border-color .15s;
        }
        .if-input:focus { border-color:var(--qcolor,var(--accent)); }
        .if-input::placeholder { color:var(--muted); }
        .if-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .if-group { display:flex; flex-direction:column; gap:4px; }
        .if-lbl { font-size:9px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .pp-row { display:flex; gap:3px; }
        .pp {
          flex:1; padding:4px 0; border-radius:4px; border:1px solid var(--border2);
          background:var(--surface2); color:var(--muted2); font-size:9px; font-family:'Geist Mono',monospace;
          cursor:pointer; transition:all .15s; text-align:center;
        }
        .pp.active { font-weight:700; }
        .pp:hover:not(.active) { border-color:var(--pcolor,var(--accent)); color:var(--pcolor,var(--accent)); }
        .if-footer { display:flex; gap:6px; }
        .if-save {
          flex:1; padding:7px; border-radius:6px; border:none; color:#000;
          font-weight:700; font-family:'Geist Mono',monospace; font-size:11px;
          cursor:pointer; transition:opacity .15s;
        }
        .if-save:hover { opacity:.85; }
        .if-cancel {
          padding:7px 13px; border-radius:6px; border:1px solid var(--border2); background:var(--surface2);
          color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s;
        }
        .if-cancel:hover { color:var(--text); }
        .q-add-btn {
          width:100%; padding:6px; border-radius:6px; border:1px dashed var(--qborder);
          background:transparent; color:var(--qcolor); font-family:'Geist Mono',monospace;
          font-size:11px; cursor:pointer; transition:all .15s; margin-top:auto;
        }
        .q-add-btn:hover { background:var(--qbg); }

        /* ── AI Panel ── */
        .ai-panel {
          position:fixed; right:0; top:56px; bottom:0; width:420px;
          background:var(--surface); border-left:1px solid var(--border);
          z-index:80; display:flex; flex-direction:column;
          transform:translateX(100%); transition:transform .3s ease;
          box-shadow:-12px 0 40px rgba(0,0,0,.4);
        }
        .ai-panel.open { transform:translateX(0); }
        .ai-ph {
          padding:14px 16px; border-bottom:1px solid var(--border);
          display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
        }
        .ai-pt { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .ai-tabs { display:flex; gap:2px; padding:10px 14px 0; flex-shrink:0; }
        .ai-tab {
          padding:6px 14px; border-radius:6px 6px 0 0; cursor:pointer;
          font-family:'Geist Mono',monospace; font-size:11px; border:1px solid transparent;
          background:transparent; color:var(--muted2); transition:all .15s;
        }
        .ai-tab.active { background:var(--surface2); border-color:var(--border); border-bottom-color:var(--surface2); color:var(--text); }
        .ai-tab:hover:not(.active) { color:var(--text); }
        .ai-body { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:12px; }

        .ai-loading { padding:24px 16px; display:flex; flex-direction:column; gap:10px; }
        .ai-load-row { display:flex; align-items:center; gap:10px; padding:9px 13px; border-radius:8px; transition:all .4s; }
        .spinner { width:14px; height:14px; border:2px solid var(--border2); border-top-color:#60a5fa; border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }

        .ai-section { display:flex; flex-direction:column; gap:8px; }
        .ai-slbl { font-size:9px; color:var(--muted2); letter-spacing:.12em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .ai-block { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px; font-size:12px; color:var(--text); line-height:1.7; }
        .ai-strat {
          display:flex; gap:10px; padding:11px 13px; background:var(--surface2);
          border:1px solid var(--border); border-radius:8px; animation:fadeUp .3s ease both;
        }
        .as-icon { font-size:16px; flex-shrink:0; }
        .as-title { font-size:12px; font-weight:700; margin-bottom:3px; }
        .as-desc  { font-size:11px; color:var(--muted2); line-height:1.6; }
        .as-tag { font-size:9px; padding:2px 7px; border-radius:4px; display:inline-block; margin-top:5px; font-family:'Geist Mono',monospace; }
        .ai-prio { display:flex; gap:8px; padding:8px 10px; background:var(--surface2); border-radius:6px; border:1px solid var(--border); }
        .ai-pn { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; padding-top:1px; min-width:18px; }
        .ai-pt2 { font-size:11px; color:var(--text); line-height:1.6; }
        .ai-risk { display:flex; gap:8px; padding:9px 11px; border-radius:7px; border:1px solid; }
        .ai-empty { padding:32px 20px; text-align:center; }
        .ai-empty-icon { font-size:30px; opacity:.18; margin-bottom:12px; }
        .ai-empty-text { font-size:12px; color:var(--muted); line-height:1.7; }

        /* ── Toast ── */
        .toast {
          position:fixed; bottom:22px; right:22px; z-index:600;
          background:var(--surface2); border:1px solid var(--border2);
          border-radius:8px; padding:10px 16px; font-size:12px;
          box-shadow:0 8px 32px rgba(0,0,0,.4); animation:slideUp .2s ease;
          display:flex; align-items:center; gap:8px; max-width:320px;
        }
        .toast.error { border-color:rgba(248,113,113,.35); color:#f87171; }
        .toast.info  { border-color:rgba(99,102,241,.3); }

        /* ── Responsive ── */
        @media(max-width:900px) { .swot-body { grid-template-columns:1fr; } .sidebar { display:none; } }
        @media(max-width:640px) { .swot-grid { grid-template-columns:1fr; } }
      `}</style>

      <div className="swot-root">

        {/* ══ TOPBAR ══ */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>
            ← Retour
          </button>
          <div>
            <div className="topbar-title">SWOT Analysis</div>
            {project && <div className="topbar-project">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {phase === 'canvas' && active && (
              <>
                <button className="tbtn" onClick={exportSingle}>↓ Export</button>
                <button className="tbtn" onClick={exportAll}>↓ Tout</button>
                <button className="tbtn ai"
                  onClick={() => { setShowPanel(true); setPanelTab('strategies'); if (!aiResult && !isAiRunning) handleAnalyse() }}
                  disabled={isAiRunning || totalItems === 0}>
                  {isAiRunning && aiMode==='analysing'
                    ? <><span className="spinner"/>Analyse…</>
                    : '✦ Analyser IA'
                  }
                </button>
              </>
            )}
          </div>
        </header>

        <div className="swot-body">

          {/* ══ SIDEBAR ══ */}
          <aside className="sidebar">
            <div className="panel-hdr">
              <span className="panel-lbl">Analyses ({analyses.length})</span>
            </div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div style={{ padding:'20px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:28, opacity:.18, marginBottom:8 }}>⊞</div>
                  <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.6 }}>Créez votre première analyse SWOT</div>
                </div>
              )}
              {analyses.map(a => {
                const tot = Object.values(a.items || {}).reduce((s,arr) => s+arr.length, 0)
                const hasAI = !!a.aiResult
                return (
                  <div key={a.id}
                    className={`analysis-row ${activeId===a.id ? 'active' : ''}`}
                    onClick={() => { setActiveId(a.id); setPhase('canvas'); setAiResult(a.aiResult||null); setAiMode(a.aiResult?'done':null) }}>
                    <div className={`ar-dot ${activeId===a.id?'':'off'}`}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="ar-name">{a.name}</div>
                      <div className="ar-meta">{tot} élémt · {new Date(a.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}{hasAI ? ' · ✦' : ''}</div>
                    </div>
                    <button className="ar-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  </div>
                )
              })}
            </div>

            {/* Health */}
            {health && (
              <div className="health-w">
                <div className="hw-lbl">Santé stratégique</div>
                <div className="hw-score" style={{ color: health.score>=70 ? '#22d3a5' : health.score>=45 ? '#f59e0b' : '#f87171' }}>
                  {health.score}<span style={{ fontSize:13, fontWeight:400, color:'var(--muted)' }}>/100</span>
                </div>
                <div className="hw-bar-bg">
                  <div className="hw-bar" style={{ width:`${health.score}%`, background: health.score>=70 ? '#22d3a5' : health.score>=45 ? '#f59e0b' : '#f87171' }}/>
                </div>
                <div className="hw-grid">
                  {Object.entries(QUADRANTS).map(([k,q]) => (
                    <div key={k} className="hw-cell">
                      <div className="hw-dot" style={{ background:q.color }}/>
                      <span style={{ color:'var(--muted)' }}>{q.short}</span>
                      <span style={{ color:'var(--text)', fontWeight:600 }}>{health[k[0]]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sb-footer">
              <button className="sb-new-btn" onClick={() => setPhase('list')}>
                + Nouvelle analyse
              </button>
              <div className="sb-row">
                <button className="sb-small-btn" onClick={() => fileRef.current?.click()}>↑ Import</button>
                {analyses.length > 1 && <button className="sb-small-btn" onClick={exportAll}>↓ Tout exporter</button>}
              </div>
            </div>
          </aside>

          {/* ══ MAIN ══ */}
          <main className="swot-main">

            {/* ── PHASE: list / mode selection ── */}
            {(phase === 'list' || phase === 'setup-generate' || phase === 'setup-manual') && (
              <div className="phase-center">
                {phase === 'list' && (
                  <div className="phase-card fade-up">
                    <div className="phase-icon">⊞</div>
                    <div className="phase-title">Nouvelle analyse SWOT</div>
                    <div className="phase-sub">Choisissez votre méthode de construction :<br/>laissez l'IA tout générer, ou bâtissez manuellement.</div>

                    <div className="mode-grid">
                      <div className="mode-card" onClick={() => setPhase('setup-generate')}>
                        <div className="mode-card-icon">✦</div>
                        <div className="mode-card-title">Génération IA automatique</div>
                        <div className="mode-card-desc">
                          Décrivez votre entreprise en quelques lignes. L'IA remplit les 4 quadrants avec des éléments pertinents et génère une analyse TOWS complète.
                        </div>
                        <div style={{ marginTop:10, fontSize:10, color:'#60a5fa', fontFamily:'Geist Mono,monospace' }}>
                          ← Recommandé pour démarrer vite
                        </div>
                      </div>
                      <div className="mode-card" onClick={() => setPhase('setup-manual')}>
                        <div className="mode-card-icon">✎</div>
                        <div className="mode-card-title">Construction manuelle</div>
                        <div className="mode-card-desc">
                          Créez votre matrice élément par élément. Vous restez maître du contenu, avec la possibilité d'appeler l'IA pour analyser à tout moment.
                        </div>
                        <div style={{ marginTop:10, fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>
                          ← Contrôle total sur le contenu
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                      <span>ou</span>
                      <button className="tbtn" onClick={() => fileRef.current?.click()}>↑ Importer un fichier JSON</button>
                    </div>
                  </div>
                )}

                {/* ── Setup Generate ── */}
                {phase === 'setup-generate' && (
                  <div className="setup-form fade-up">
                    <div className="sf-title">✦ Génération IA automatique</div>
                    <div className="sf-row">
                      <label className="sf-lbl">Nom de l'analyse *</label>
                      <input className="sf-input" value={newForm.name} onChange={e => setNewForm(p=>({...p,name:e.target.value}))}
                        placeholder="Ex: SWOT Lancement Produit 2025" autoFocus
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl">Description du projet / entreprise *</label>
                      <textarea className="sf-input" rows={5} value={newForm.context}
                        onChange={e => setNewForm(p=>({...p,context:e.target.value}))}
                        placeholder="Décrivez votre entreprise, votre secteur, vos produits, votre marché, vos ressources, votre taille… Plus c'est détaillé, plus l'analyse sera pertinente."
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl">Objectif stratégique (optionnel)</label>
                      <input className="sf-input" value={newForm.objective} onChange={e => setNewForm(p=>({...p,objective:e.target.value}))}
                        placeholder="Ex: Expansion en Afrique de l'Ouest d'ici 18 mois"
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-btns">
                      <button className="sf-btn-secondary" onClick={() => setPhase('list')}>← Retour</button>
                      <button className="sf-btn-primary"
                        disabled={!newForm.name.trim() || !newForm.context.trim() || isAiRunning}
                        onClick={handleGenerate}>
                        {isAiRunning
                          ? <><span className="spinner" style={{ borderTopColor:'#fff' }}/>Génération…</>
                          : <><span>✦</span> Générer le SWOT</>
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Setup Manual ── */}
                {phase === 'setup-manual' && (
                  <div className="setup-form fade-up">
                    <div className="sf-title">✎ Construction manuelle</div>
                    <div className="sf-row">
                      <label className="sf-lbl">Nom de l'analyse *</label>
                      <input className="sf-input" value={newForm.name} onChange={e => setNewForm(p=>({...p,name:e.target.value}))}
                        placeholder="Ex: SWOT Expansion Marché B2B"
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}
                        onKeyDown={e => { if (e.key==='Enter' && newForm.name.trim()) {
                          const a = { id:uid(), name:newForm.name.trim(), context:newForm.context.trim(), objective:newForm.objective.trim(), createdAt:new Date().toISOString(), mode:'manual', items:{strengths:[],weaknesses:[],opportunities:[],threats:[]}, aiResult:null }
                          const updated = [...analyses, a]; setAnalyses(updated); persist(updated)
                          setActiveId(a.id); setPhase('canvas'); setNewForm({name:'',context:'',objective:''})
                        }}} autoFocus/>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl">Contexte (optionnel)</label>
                      <textarea className="sf-input" rows={3} value={newForm.context}
                        onChange={e => setNewForm(p=>({...p,context:e.target.value}))}
                        placeholder="Décrivez brièvement le contexte de cette analyse…"
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-row">
                      <label className="sf-lbl">Objectif stratégique (optionnel)</label>
                      <input className="sf-input" value={newForm.objective} onChange={e => setNewForm(p=>({...p,objective:e.target.value}))}
                        placeholder="Ex: Identifier les priorités pour 2026"
                        onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border2)'}/>
                    </div>
                    <div className="sf-btns">
                      <button className="sf-btn-secondary" onClick={() => setPhase('list')}>← Retour</button>
                      <button className="sf-btn-primary"
                        disabled={!newForm.name.trim()}
                        onClick={() => {
                          const a = { id:uid(), name:newForm.name.trim(), context:newForm.context.trim(), objective:newForm.objective.trim(), createdAt:new Date().toISOString(), mode:'manual', items:{strengths:[],weaknesses:[],opportunities:[],threats:[]}, aiResult:null }
                          const updated = [...analyses, a]; setAnalyses(updated); persist(updated)
                          setActiveId(a.id); setPhase('canvas'); setNewForm({name:'',context:'',objective:''})
                          showToast(`"${a.name}" créée`)
                        }}>
                        Créer la matrice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PHASE: canvas ── */}
            {phase === 'canvas' && active && (
              <>
                {/* Canvas header */}
                <div className="canvas-header">
                  <div>
                    <div className="canvas-title">{active.name}</div>
                    {active.context && <div className="canvas-ctx">{active.context.length > 140 ? active.context.slice(0,140)+'…' : active.context}</div>}
                    {active.objective && <div className="canvas-obj">◎ {active.objective}</div>}
                  </div>
                  <div className="canvas-actions">
                    {active.mode === 'ai-generated' && !isAiRunning && (
                      <span style={{ fontSize:10, padding:'4px 9px', borderRadius:99, background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.2)', color:'var(--accent2)', fontFamily:'Geist Mono,monospace' }}>
                        ✦ IA
                      </span>
                    )}
                    {totalItems > 0 && (
                      <span style={{ fontSize:10, padding:'4px 9px', borderRadius:99, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--muted2)', fontFamily:'Geist Mono,monospace' }}>
                        {totalItems} élément{totalItems>1?'s':''}
                      </span>
                    )}
                  </div>
                </div>

                {/* AI loading bar */}
                {isAiRunning && (
                  <div style={{ margin:'10px 20px 0', padding:'12px 16px', borderRadius:10, background:'rgba(96,165,250,.06)', border:'1px solid rgba(96,165,250,.2)', display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span className="spinner" style={{ width:13, height:13 }}/>
                      <span style={{ fontSize:12, color:'#60a5fa', fontFamily:'Geist Mono,monospace' }}>
                        {aiMode==='generating' ? GEN_STEPS[aiStep] : ANALYSE_STEPS[aiStep]}
                      </span>
                    </div>
                    <div style={{ height:3, background:'rgba(255,255,255,.06)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', background:'#60a5fa', borderRadius:2, width:`${Math.round((aiStep+1)/currentSteps.length*100)}%`, transition:'width .8s ease' }}/>
                    </div>
                  </div>
                )}

                {/* SWOT 2×2 */}
                <div className="swot-grid" style={{ paddingRight: showPanel ? '440px' : '20px', transition:'padding-right .3s' }}>
                  {Object.entries(QUADRANTS).map(([qKey, q]) => {
                    const items    = active.items?.[qKey] || []
                    const isExpand = focusQ === qKey

                    return (
                      <div key={qKey}
                        className={`q-card ${dragOver===qKey?'drag-over':''} ${isExpand?'expanded':''}`}
                        style={{ '--qcolor':q.color, '--qbg':q.bg, '--qborder':q.border }}
                        onDragOver={e => { e.preventDefault(); setDragOver(qKey) }}
                        onDrop={() => onDrop(qKey)}
                        onDragLeave={() => setDragOver(null)}
                      >
                        <div className="q-top-bar"/>

                        {/* Header */}
                        <div className="q-head">
                          <div className="q-head-left">
                            <div className="q-badge">{q.short}</div>
                            <div>
                              <div className="q-label">{q.label}</div>
                              <div className="q-en">{q.en}</div>
                            </div>
                          </div>
                          <div className="q-head-right">
                            <span className="q-count">{items.length}</span>
                            <button className="q-icon-btn" onClick={() => setFocusQ(isExpand?null:qKey)}>
                              {isExpand ? '⊟' : '⊞'}
                            </button>
                          </div>
                        </div>
                        <div className="q-hint">{q.hint}</div>

                        {/* Items */}
                        <div className="q-items">
                          {items.length===0 && addingTo!==qKey && (
                            <div className="q-empty">
                              <span style={{ opacity:.3 }}>{q.icon}</span>
                              <span>Aucun élément — ajoutez ou générez via l'IA</span>
                            </div>
                          )}
                          {items.map(item => (
                            <div key={item.id}
                              className={`swot-item ${editItem?.id===item.id?'editing':''}`}
                              style={{ '--qcolor':q.color }}
                              draggable
                              onDragStart={() => setDragItem({ quadrant:qKey, id:item.id })}>
                              <div className="si-top">
                                <div className="si-pdot" style={{ background:PRIORITY_COLORS[item.priority] }}/>
                                <span className="si-text">{item.text}</span>
                                <div className="si-acts">
                                  <button className="si-btn" onClick={() => startEdit(qKey, item)}>✎</button>
                                  <button className="si-btn del" onClick={() => deleteItem(qKey, item.id)}>✕</button>
                                </div>
                              </div>
                              <div className="si-impact">
                                {[1,2,3,4,5].map(n => (
                                  <div key={n} className="imp-dot" style={{ background: n<=item.impact ? q.color : 'var(--border2)' }}/>
                                ))}
                                {item.notes && <span style={{ fontSize:10, marginLeft:4, opacity:.4 }}>📝</span>}
                              </div>
                            </div>
                          ))}

                          {/* Inline add/edit form */}
                          {addingTo===qKey && (
                            <div className="item-form" style={{ '--qcolor':q.color, '--qborder':q.border }}>
                              <textarea className="if-input" rows={2} value={itemForm.text}
                                onChange={e => setItemForm(p=>({...p,text:e.target.value}))}
                                placeholder={`Décrivez cette ${q.label.toLowerCase()}…`} autoFocus/>
                              <div className="if-row">
                                <div className="if-group">
                                  <span className="if-lbl">Priorité</span>
                                  <div className="pp-row">
                                    {Object.entries(PRIORITY_LABELS).map(([k,v]) => (
                                      <button key={k} className={`pp ${itemForm.priority===k?'active':''}`}
                                        style={{ '--pcolor':PRIORITY_COLORS[k], ...(itemForm.priority===k ? { background:PRIORITY_COLORS[k], borderColor:PRIORITY_COLORS[k], color:'#000' } : {}) }}
                                        onClick={() => setItemForm(p=>({...p,priority:k}))}>
                                        {v}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="if-group">
                                  <span className="if-lbl">Impact <strong style={{ color:q.color }}>{itemForm.impact}/5</strong></span>
                                  <input type="range" min={1} max={5} value={itemForm.impact}
                                    onChange={e => setItemForm(p=>({...p,impact:e.target.value}))}
                                    style={{ width:'100%', accentColor:q.color }}/>
                                </div>
                              </div>
                              <textarea className="if-input" rows={1} value={itemForm.notes}
                                onChange={e => setItemForm(p=>({...p,notes:e.target.value}))}
                                placeholder="Note additionnelle (optionnel)…"
                                style={{ fontSize:11, opacity:.75 }}/>
                              <div className="if-footer">
                                <button className="if-save" style={{ background:q.color }} onClick={() => saveItem(qKey)}>
                                  {editItem ? 'Mettre à jour' : `+ Ajouter`}
                                </button>
                                <button className="if-cancel" onClick={() => { setAddingTo(null); setEditItem(null); setItemForm(EMPTY_ITEM) }}>
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {addingTo !== qKey && (
                          <button className="q-add-btn" onClick={() => { setAddingTo(qKey); setEditItem(null); setItemForm(EMPTY_ITEM) }}>
                            + Ajouter un élément
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </main>
        </div>

        {/* ══ AI PANEL ══ */}
        <div className={`ai-panel ${showPanel?'open':''}`}>
          <div className="ai-ph">
            <span className="ai-pt">Analyse stratégique ✦</span>
            <button className="tbtn" onClick={() => setShowPanel(false)}>✕</button>
          </div>

          {/* Tabs */}
          {aiMode==='done' && aiResult && (
            <div className="ai-tabs">
              {[
                ['strategies', 'TOWS'],
                ['priorities', 'Priorités'],
                ['risks',      'Risques'],
              ].map(([id,label]) => (
                <button key={id} className={`ai-tab ${panelTab===id?'active':''}`} onClick={() => setPanelTab(id)}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="ai-body">

            {/* Loading */}
            {isAiRunning && (
              <div className="ai-loading">
                <div style={{ fontSize:11, color:'var(--muted2)', fontFamily:'Geist Mono,monospace', marginBottom:4 }}>
                  {aiMode==='generating' ? '✦ Génération en cours…' : '✦ Analyse en cours…'}
                </div>
                {currentSteps.map((step, i) => (
                  <div key={i} className="ai-load-row"
                    style={{
                      background: i===aiStep ? 'rgba(96,165,250,.08)' : 'rgba(255,255,255,.02)',
                      border: i===aiStep ? '1px solid rgba(96,165,250,.2)' : '1px solid transparent',
                      opacity: i>aiStep ? .3 : 1,
                    }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      background: i<aiStep ? '#22d3a5' : i===aiStep ? '#60a5fa' : 'rgba(255,255,255,.05)' }}>
                      {i<aiStep
                        ? <span style={{ fontSize:9, color:'#000' }}>✓</span>
                        : i===aiStep
                          ? <span className="spinner"/>
                          : <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,.2)', display:'block' }}/>
                      }
                    </div>
                    <span style={{ fontSize:11, color: i===aiStep ? '#60a5fa' : 'rgba(255,255,255,.35)', fontFamily:'Geist Mono,monospace' }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Result */}
            {aiMode==='done' && aiResult && !isAiRunning && (
              <>
                {/* Diagnostic (always shown above tabs) */}
                {aiResult.diagnostic && panelTab==='strategies' && (
                  <div className="ai-section">
                    <div className="ai-slbl">Diagnostic global</div>
                    <div className="ai-block">{aiResult.diagnostic}</div>
                  </div>
                )}

                {/* TOWS strategies */}
                {panelTab==='strategies' && aiResult.strategies?.length > 0 && (
                  <div className="ai-section">
                    <div className="ai-slbl">Stratégies croisées (TOWS)</div>
                    {aiResult.strategies.map((s, i) => {
                      const c = TOWS_COLORS[s.type] || 'var(--accent2)'
                      return (
                        <div key={i} className="ai-strat" style={{ animationDelay:`${i*0.06}s` }}>
                          <span className="as-icon" style={{ color:c }}>{TOWS_ICONS[s.type]}</span>
                          <div>
                            <div className="as-title">{s.titre}</div>
                            <div className="as-desc">{s.description}</div>
                            <span className="as-tag"
                              style={{ background:`color-mix(in srgb,${c} 12%,transparent)`, color:c, border:`1px solid color-mix(in srgb,${c} 22%,transparent)` }}>
                              {s.type} · {TOWS_LABELS[s.type]}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Priorities */}
                {panelTab==='priorities' && aiResult.priorites?.length > 0 && (
                  <div className="ai-section">
                    <div className="ai-slbl">Actions prioritaires</div>
                    {aiResult.priorites.map((p, i) => (
                      <div key={i} className="ai-prio">
                        <span className="ai-pn">#{i+1}</span>
                        <span className="ai-pt2">{p}</span>
                      </div>
                    ))}
                    {aiResult.conclusion && (
                      <div className="ai-block" style={{ fontStyle:'italic', color:'var(--muted2)', marginTop:4 }}>
                        "{aiResult.conclusion}"
                      </div>
                    )}
                  </div>
                )}

                {/* Risks */}
                {panelTab==='risks' && (
                  <div className="ai-section">
                    <div className="ai-slbl">Risques critiques</div>
                    {(aiResult.risques || []).map((r, i) => (
                      <div key={i} className="ai-risk"
                        style={{ background:'rgba(248,113,113,.05)', borderColor:'rgba(248,113,113,.2)' }}>
                        <span style={{ color:'#f87171', flexShrink:0 }}>⚡</span>
                        <span style={{ fontSize:11, color:'rgba(240,239,245,.8)', lineHeight:1.6 }}>{r}</span>
                      </div>
                    ))}
                    {aiResult.suggestions?.length > 0 && (
                      <>
                        <div className="ai-slbl" style={{ marginTop:8 }}>Suggestions d'amélioration</div>
                        {aiResult.suggestions.map((s, i) => (
                          <div key={i} className="ai-prio">
                            <span className="ai-pn" style={{ color:'#60a5fa' }}>→</span>
                            <span className="ai-pt2">{s}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Re-analyse button */}
                <button className="tbtn ai" style={{ marginTop:8, justifyContent:'center', width:'100%' }}
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
                  Remplissez votre matrice SWOT puis cliquez sur <strong style={{ color:'var(--text)' }}>Analyser IA</strong> pour obtenir les stratégies TOWS croisées, les priorités d'action et les risques critiques.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden file input */}
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