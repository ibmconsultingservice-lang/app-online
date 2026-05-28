'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const PRIMARY_KEYS = ['inbound', 'operations', 'outbound', 'marketing', 'service']
const SUPPORT_KEYS = ['infra', 'hrm', 'tech', 'procurement']

const ACTIVITIES_META = {
  inbound:     { label: 'Logistique interne',      icon: '↓', color: '#38bdf8', bg: 'rgba(56,189,248,.09)',  desc: 'Réception, stockage, distribution des intrants', tasks: ['Gestion des stocks', 'Transport entrant', 'Contrôle qualité', 'Planification', 'Relations fournisseurs'] },
  operations:  { label: 'Production / Opérations', icon: '⚙', color: '#a78bfa', bg: 'rgba(167,139,250,.09)', desc: 'Transformation des intrants en produits finis',     tasks: ['Fabrication', 'Assemblage', 'Tests qualité', 'Maintenance', 'Gestion capacité'] },
  outbound:    { label: 'Logistique externe',       icon: '↑', color: '#34d399', bg: 'rgba(52,211,153,.09)',  desc: 'Stockage et distribution vers les clients',         tasks: ['Expédition', 'Gestion commandes', 'Entrepôts', 'Livraison', 'Retours'] },
  marketing:   { label: 'Marketing & Ventes',       icon: '◎', color: '#f59e0b', bg: 'rgba(245,158,11,.09)',  desc: 'Moyens pour attirer et convertir les clients',      tasks: ['Publicité', 'Force de vente', 'Pricing', 'CRM', 'Études marché'] },
  service:     { label: 'Services',                 icon: '✦', color: '#fb923c', bg: 'rgba(251,146,60,.09)',  desc: 'Maintien et amélioration de la valeur produit',     tasks: ['SAV', 'Installation', 'Formation', 'Support', 'Garantie'] },
  infra:       { label: 'Infrastructure',           icon: '⬡', color: '#94a3b8', bg: 'rgba(148,163,184,.09)', desc: 'Direction, finance, juridique, qualité',            tasks: ['Management', 'Finance', 'Juridique', 'Qualité', 'Planification'] },
  hrm:         { label: 'Ressources Humaines',      icon: '◉', color: '#f472b6', bg: 'rgba(244,114,182,.09)', desc: 'Recrutement, formation, rémunération',              tasks: ['Recrutement', 'Formation', 'Paie', 'Culture', 'Performance'] },
  tech:        { label: 'R&D / Technologie',        icon: '⌬', color: '#818cf8', bg: 'rgba(129,140,248,.09)', desc: 'Innovation, R&D, amélioration des procédés',        tasks: ['R&D produit', 'Automatisation', 'IT', 'Brevets', 'Veille techno'] },
  procurement: { label: 'Approvisionnement',        icon: '⊕', color: '#4ade80', bg: 'rgba(74,222,128,.09)',  desc: 'Achats de toutes les ressources utilisées',         tasks: ['Négociation achats', 'Sourcing', 'Éval. fournisseurs', 'Contrats', 'Audit'] },
}

const STATUS_OPTIONS = [
  { value: 'strength',    label: 'Force',        color: '#34d399', icon: '▲' },
  { value: 'neutral',     label: 'Neutre',       color: '#94a3b8', icon: '◆' },
  { value: 'weakness',    label: 'Faiblesse',    color: '#f87171', icon: '▼' },
  { value: 'opportunity', label: 'Opportunité',  color: '#f59e0b', icon: '◉' },
]

const IMPACT_COLORS = { high: '#f87171', medium: '#f59e0b', low: '#34d399' }
const PRIORITE_COLORS = { haute: '#f87171', moyenne: '#f59e0b', faible: '#34d399' }

const DEFAULT_ACTIVITY = () => ({ cost: 0, value: 0, status: 'neutral', notes: '', tasks: [] })
const DEFAULT_ACTIVITIES = () =>
  Object.fromEntries([...PRIMARY_KEYS, ...SUPPORT_KEYS].map(k => [k, DEFAULT_ACTIVITY()]))

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CVPPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,     setProject]     = useState(null)
  const [analyses,    setAnalyses]    = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newAnalysis, setNewAnalysis] = useState({ name: '', context: '' })
  const [activeKey,   setActiveKey]   = useState('operations')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [toast,       setToast]       = useState(null)
  const [view,        setView]        = useState('chain') // 'chain' | 'table'

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.CVP || []
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), CVP: updated } }
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
      activities: DEFAULT_ACTIVITIES(),
      aiResult: null,
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

  const updateAnalysis = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated); persist(updated)
  }

  const updateActivity = (key, patch) => {
    if (!active) return
    const activities = {
      ...(active.activities || DEFAULT_ACTIVITIES()),
      [key]: { ...(active.activities?.[key] || DEFAULT_ACTIVITY()), ...patch },
    }
    updateAnalysis({ activities })
  }

  const toggleTask = (key, task) => {
    const current = active?.activities?.[key]?.tasks || []
    const next = current.includes(task) ? current.filter(t => t !== task) : [...current, task]
    updateActivity(key, { tasks: next })
  }

  // ── Stats ──
  const getStats = () => {
    if (!active?.activities) return { totalCost: 0, totalValue: 0, margin: 0, marginPct: 0 }
    const acts = Object.values(active.activities)
    const totalCost  = acts.reduce((s, a) => s + (parseFloat(a.cost)  || 0), 0)
    const totalValue = acts.reduce((s, a) => s + (parseFloat(a.value) || 0), 0)
    const margin     = totalValue - totalCost
    const marginPct  = totalValue > 0 ? ((margin / totalValue) * 100) : 0
    return { totalCost, totalValue, margin, marginPct }
  }

  // ── AI ──
  const runAI = async () => {
    if (!active) return
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-cvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: active.name,
          context:      active.context,
          activities:   active.activities,
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
    a.href = url; a.download = `CVP_${active.name.replace(/\s+/g, '_')}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const stats       = getStats()
  const currentAct  = active?.activities?.[activeKey] || DEFAULT_ACTIVITY()
  const currentMeta = ACTIVITIES_META[activeKey]
  const statusOpt   = STATUS_OPTIONS.find(s => s.value === (currentAct.status || 'neutral'))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:      #09090e;
          --s1:      #101018;
          --s2:      #16161f;
          --s3:      #1c1c28;
          --b1:      rgba(255,255,255,.06);
          --b2:      rgba(255,255,255,.11);
          --b3:      rgba(255,255,255,.18);
          --tx:      #eeedf6;
          --mu:      #65637a;
          --mu2:     #9896b0;
          --acc:     #6366f1;
          --acc2:    #818cf8;
          --green:   #34d399;
          --red:     #f87171;
          --amber:   #f59e0b;
        }
        body { background: var(--bg); color: var(--tx); font-family: 'Syne', sans-serif; min-height: 100vh; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: var(--b2); border-radius: 2px; }

        /* ── TOPBAR ── */
        .tb {
          height: 54px; background: var(--s1); border-bottom: 1px solid var(--b1);
          display: flex; align-items: center; padding: 0 18px; gap: 10px;
          position: sticky; top: 0; z-index: 200;
        }
        .back {
          display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px;
          background:var(--s2); border:1px solid var(--b2); color:var(--mu2);
          font-family:'Geist Mono',monospace; font-size:10px; cursor:pointer; transition:all .15s;
        }
        .back:hover { color:var(--tx); border-color:var(--b3); }
        .tb-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .tb-proj  { font-size:10px; color:var(--mu); font-family:'Geist Mono',monospace; }
        .tb-right { margin-left:auto; display:flex; gap:7px; align-items:center; }
        .btn {
          display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:6px;
          cursor:pointer; font-family:'Geist Mono',monospace; font-size:10px;
          letter-spacing:.04em; border:1px solid var(--b2); background:var(--s2);
          color:var(--mu2); transition:all .15s;
        }
        .btn:hover { color:var(--tx); border-color:var(--b3); }
        .btn.p  { background:var(--acc); border-color:var(--acc); color:#fff; }
        .btn.p:hover { background:#4f52d8; }
        .btn.ai { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.3); color:var(--acc2); }
        .btn.ai:hover { background:rgba(99,102,241,.18); }
        .btn:disabled { opacity:.35; cursor:not-allowed; }
        .view-toggle { display:flex; gap:2px; background:var(--s2); border:1px solid var(--b2); border-radius:6px; padding:2px; }
        .view-btn {
          padding:4px 10px; border-radius:4px; font-family:'Geist Mono',monospace;
          font-size:10px; cursor:pointer; border:none; background:none;
          color:var(--mu2); transition:all .15s;
        }
        .view-btn.on { background:var(--s3); color:var(--tx); }

        /* ── LAYOUT ── */
        .layout { display:grid; grid-template-columns:220px 1fr 320px; height:calc(100vh - 54px); overflow:hidden; }

        /* ── LEFT ── */
        .left {
          background:var(--s1); border-right:1px solid var(--b1);
          display:flex; flex-direction:column; overflow:hidden;
        }
        .ph { padding:14px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .pl { font-size:9px; color:var(--mu); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .plist { flex:1; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:2px; }
        .aitem {
          padding:9px 11px; border-radius:7px; cursor:pointer;
          border:1px solid transparent; transition:all .15s;
        }
        .aitem:hover { background:var(--s2); }
        .aitem.on { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.22); }
        .aname { font-size:11px; font-weight:600; }
        .ameta { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; margin-top:2px; }
        .adel { opacity:0; background:none; border:none; color:var(--red); cursor:pointer; font-size:11px; float:right; }
        .aitem:hover .adel { opacity:1; }
        .nform { padding:11px; border-top:1px solid var(--b1); display:flex; flex-direction:column; gap:7px; }
        .inp {
          width:100%; background:var(--bg); border:1px solid var(--b2);
          border-radius:5px; padding:7px 9px; font-family:'Syne',sans-serif;
          font-size:11px; color:var(--tx); outline:none; transition:border-color .15s;
        }
        .inp:focus { border-color:var(--acc); }
        .inp::placeholder { color:var(--mu); }
        textarea.inp { resize:vertical; min-height:50px; }
        .flabel { font-size:9px; color:var(--mu); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:2px; display:block; }

        /* ── CENTER ── */
        .center { overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:20px; background:var(--bg); }

        /* ── STATS ROW ── */
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .stat-card {
          background:var(--s1); border:1px solid var(--b1); border-radius:10px;
          padding:14px; display:flex; flex-direction:column; gap:4px;
        }
        .stat-val { font-family:'Instrument Serif',serif; font-size:26px; font-style:italic; }
        .stat-lbl { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; letter-spacing:.08em; text-transform:uppercase; }

        /* ── CHAIN DIAGRAM ── */
        .chain-wrap { display:flex; flex-direction:column; gap:12px; }

        /* Support band */
        .support-band {
          background:var(--s1); border:1px solid var(--b1); border-radius:10px;
          padding:10px; display:flex; gap:6px;
        }
        .support-label {
          writing-mode:vertical-lr; transform:rotate(180deg);
          font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace;
          letter-spacing:.1em; text-transform:uppercase; padding:4px 2px;
          display:flex; align-items:center;
        }
        .support-acts { display:flex; gap:6px; flex:1; flex-wrap:wrap; }

        /* Primary flow */
        .primary-flow { display:flex; align-items:stretch; gap:0; }
        .primary-label {
          writing-mode:vertical-lr; transform:rotate(180deg);
          font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace;
          letter-spacing:.1em; text-transform:uppercase; padding:0 6px;
          display:flex; align-items:center; background:var(--s1);
          border:1px solid var(--b1); border-right:none; border-radius:10px 0 0 10px;
        }
        .primary-acts { display:flex; flex:1; gap:0; }

        /* Arrow connector */
        .arrow-conn { width:16px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:var(--mu); font-size:10px; z-index:1; }

        /* Activity block */
        .act-block {
          flex:1; min-width:0; cursor:pointer; transition:all .15s;
          display:flex; flex-direction:column; gap:8px;
          padding:12px 10px; border:1px solid var(--b1); background:var(--s1);
          position:relative; overflow:hidden;
        }
        .act-block:first-child { border-radius:0; }
        .act-block.support-act { border-radius:8px; min-width:120px; flex:1; }
        .act-block:hover { background:var(--s2); border-color:var(--b2); z-index:2; }
        .act-block.selected { border-color:var(--acc) !important; background:rgba(99,102,241,.06) !important; z-index:3; }
        .act-status-bar { position:absolute; top:0; left:0; right:0; height:2px; border-radius:0; }
        .act-icon { font-size:18px; }
        .act-name { font-size:10px; font-weight:700; line-height:1.3; }
        .act-metrics { display:flex; flex-direction:column; gap:3px; margin-top:auto; }
        .act-metric { font-size:9px; font-family:'Geist Mono',monospace; color:var(--mu2); }
        .act-status-chip {
          font-size:8px; padding:2px 6px; border-radius:3px;
          font-family:'Geist Mono',monospace; font-weight:600;
          display:inline-flex; align-items:center; gap:3px; margin-top:4px;
          align-self:flex-start;
        }

        /* Margin arrow */
        .margin-arrow {
          background:var(--s1); border:1px solid var(--b1); border-radius:10px;
          padding:12px 16px; display:flex; align-items:center; gap:12px;
        }
        .margin-label { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; letter-spacing:.08em; text-transform:uppercase; }
        .margin-val { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; }
        .margin-bar { flex:1; height:6px; background:var(--s3); border-radius:3px; overflow:hidden; }
        .margin-fill { height:100%; border-radius:3px; transition:width .5s ease; }

        /* ── TABLE VIEW ── */
        .table-wrap { background:var(--s1); border:1px solid var(--b1); border-radius:10px; overflow:hidden; }
        table { width:100%; border-collapse:collapse; }
        th { padding:10px 14px; font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; letter-spacing:.08em; text-transform:uppercase; border-bottom:1px solid var(--b1); text-align:left; background:var(--s2); }
        td { padding:10px 14px; font-size:11px; border-bottom:1px solid var(--b1); vertical-align:middle; }
        tr:last-child td { border-bottom:none; }
        tr:hover td { background:var(--s2); cursor:pointer; }
        .type-badge { padding:2px 7px; border-radius:3px; font-size:9px; font-family:'Geist Mono',monospace; font-weight:600; }

        /* ── RIGHT ── */
        .right {
          background:var(--s1); border-left:1px solid var(--b1);
          display:flex; flex-direction:column; overflow:hidden;
        }
        .rcontent { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:14px; }

        /* Activity selector */
        .act-selector { display:flex; flex-direction:column; gap:2px; }
        .act-sel-btn {
          display:flex; align-items:center; gap:8px; padding:7px 9px;
          border-radius:6px; border:1px solid transparent; cursor:pointer;
          background:none; transition:all .15s; text-align:left; width:100%;
        }
        .act-sel-btn:hover { background:var(--s2); }
        .act-sel-btn.on { border-color:var(--b2); background:var(--s2); }
        .act-sel-icon { width:24px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0; }
        .act-sel-name { font-size:10px; font-weight:600; flex:1; }
        .act-sel-score { font-size:9px; font-family:'Geist Mono',monospace; }
        .type-sep { font-size:8px; color:var(--mu); font-family:'Geist Mono',monospace; letter-spacing:.1em; text-transform:uppercase; padding:8px 2px 2px; }

        /* Fields */
        .field-group { display:flex; flex-direction:column; gap:5px; }
        .field-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }

        /* Status picker */
        .status-grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
        .status-btn {
          padding:6px 8px; border-radius:6px; cursor:pointer; border:1px solid var(--b2);
          background:var(--s2); transition:all .15s; display:flex; align-items:center; gap:6px;
          font-size:10px; font-family:'Geist Mono',monospace; font-weight:600;
        }
        .status-btn:hover { border-color:var(--b3); }
        .status-btn.on { background:var(--s3); }

        /* Tasks */
        .task-grid { display:flex; flex-wrap:wrap; gap:5px; }
        .task-chip {
          padding:4px 9px; border-radius:5px; font-size:10px;
          font-family:'Geist Mono',monospace; border:1px solid var(--b2);
          background:var(--s2); color:var(--mu2); cursor:pointer; transition:all .15s;
        }
        .task-chip:hover { color:var(--tx); }
        .task-chip.on { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.4); color:var(--acc2); }

        /* ── AI PANEL ── */
        .ai-panel {
          position:fixed; right:0; top:54px; bottom:0; width:400px;
          background:var(--s1); border-left:1px solid var(--b1);
          z-index:150; display:flex; flex-direction:column; overflow:hidden;
          transform:translateX(100%); transition:transform .28s ease;
        }
        .ai-panel.open { transform:translateX(0); }
        .ai-ph {
          padding:14px 18px; border-bottom:1px solid var(--b1);
          display:flex; align-items:center; justify-content:space-between;
        }
        .ai-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .ai-body { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; }
        .ai-st { font-size:9px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
        .ai-card { background:var(--s2); border:1px solid var(--b2); border-radius:8px; padding:14px; font-size:12px; color:var(--tx); line-height:1.7; }
        .ai-act-item { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; display:flex; gap:9px; }
        .ai-act-icon { font-size:16px; flex-shrink:0; margin-top:1px; }
        .ai-act-name { font-size:11px; font-weight:700; margin-bottom:3px; }
        .ai-act-diag { font-size:11px; color:var(--mu2); line-height:1.6; }
        .ai-act-action { font-size:10px; margin-top:5px; padding:3px 8px; border-radius:4px; display:inline-block; font-family:'Geist Mono',monospace; }
        .ai-impact { font-size:9px; padding:1px 6px; border-radius:3px; font-family:'Geist Mono',monospace; font-weight:600; margin-left:6px; }
        .ai-list { display:flex; flex-direction:column; gap:5px; }
        .ai-li { display:flex; gap:8px; align-items:flex-start; padding:7px 10px; background:var(--s2); border-radius:5px; border:1px solid var(--b1); font-size:11px; line-height:1.6; }
        .ai-li-bullet { font-family:'Geist Mono',monospace; font-size:9px; color:var(--mu); padding-top:2px; flex-shrink:0; }
        .ai-optim { background:var(--s2); border:1px solid var(--b1); border-radius:8px; padding:12px; }
        .ai-optim-title { font-size:11px; font-weight:700; margin-bottom:4px; display:flex; align-items:center; gap:6px; }
        .ai-optim-desc { font-size:11px; color:var(--mu2); line-height:1.6; }
        .ai-optim-acts { display:flex; gap:4px; flex-wrap:wrap; margin-top:6px; }
        .ai-optim-act { font-size:9px; padding:2px 7px; border-radius:3px; font-family:'Geist Mono',monospace; background:var(--s3); color:var(--mu2); }
        .spinner { width:16px; height:16px; border:2px solid var(--b2); border-top-color:var(--acc2); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .ai-loading { display:flex; align-items:center; gap:10px; padding:20px; color:var(--mu2); font-size:12px; }

        /* ── EMPTY ── */
        .empty { padding:60px 20px; text-align:center; }
        .empty-ico { font-size:40px; opacity:.2; margin-bottom:12px; }
        .empty-txt { font-size:12px; color:var(--mu); line-height:1.6; }

        /* ── TOAST ── */
        .toast {
          position:fixed; bottom:20px; right:20px; z-index:999;
          background:var(--s2); border:1px solid var(--b2); border-radius:7px;
          padding:10px 16px; font-size:12px; display:flex; align-items:center; gap:7px;
          box-shadow:0 8px 28px rgba(0,0,0,.5); animation:su .2s ease;
        }
        .toast.error { border-color:rgba(248,113,113,.3); color:var(--red); }
        .toast.info  { border-color:rgba(99,102,241,.25); }
        @keyframes su { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        @media(max-width:1100px){ .layout{ grid-template-columns:200px 1fr; } .right{ display:none; } }
        @media(max-width:700px){ .layout{ grid-template-columns:1fr; } .left{ display:none; } }
      `}</style>

      <div style={{ minHeight: '100vh' }}>

        {/* ── TOPBAR ── */}
        <header className="tb">
          <button className="back" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="tb-title">Chaîne de Valeur</div>
            {project && <div className="tb-proj">{project.name}</div>}
          </div>
          <div className="tb-right">
            <div className="view-toggle">
              <button className={`view-btn ${view === 'chain' ? 'on' : ''}`} onClick={() => setView('chain')}>Chaîne</button>
              <button className={`view-btn ${view === 'table' ? 'on' : ''}`} onClick={() => setView('table')}>Tableau</button>
            </div>
            {active && (
              <>
                <button className="btn" onClick={exportAnalysis}>↓ Export</button>
                <button className="btn ai" onClick={runAI} disabled={aiLoading}>
                  {aiLoading ? <><span className="spinner"/>Analyse…</> : '✦ Analyse IA'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="layout">

          {/* ── LEFT ── */}
          <aside className="left">
            <div className="ph">
              <span className="pl">Analyses ({analyses.length})</span>
            </div>
            <div className="plist">
              {analyses.length === 0 && (
                <div className="empty"><div className="empty-ico">⛓</div><div className="empty-txt">Créez votre première analyse</div></div>
              )}
              {analyses.map(a => (
                <div key={a.id} className={`aitem ${activeId === a.id ? 'on' : ''}`} onClick={() => setActiveId(a.id)}>
                  <button className="adel" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  <div className="aname">{a.name}</div>
                  <div className="ameta">
                    {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {a.aiResult && ' · IA ✓'}
                  </div>
                </div>
              ))}
            </div>
            {showNewForm ? (
              <div className="nform">
                <label className="flabel">Nom</label>
                <input className="inp" placeholder="Ex: Chaîne valeur 2025" value={newAnalysis.name}
                  onChange={e => setNewAnalysis(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus/>
                <label className="flabel">Contexte</label>
                <textarea className="inp" rows={2} placeholder="Secteur, périmètre…" value={newAnalysis.context}
                  onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))}/>
                <div style={{ display:'flex', gap:5 }}>
                  <button className="btn p" style={{ flex:1 }} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{ padding:10, borderTop:'1px solid var(--b1)' }}>
                <button className="btn" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowNewForm(true)}>+ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* ── CENTER ── */}
          <main className="center">
            {!active ? (
              <div className="empty" style={{ padding:'100px 40px' }}>
                <div className="empty-ico" style={{ fontSize:52, marginBottom:14 }}>⛓</div>
                <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic', marginBottom:8 }}>Chaîne de Valeur de Porter</div>
                <div className="empty-txt">Créez une analyse pour décomposer vos activités et identifier où se crée réellement la valeur.</div>
              </div>
            ) : (
              <>
                <div>
                  <h2 style={{ fontFamily:'Instrument Serif,serif', fontSize:21, fontStyle:'italic' }}>{active.name}</h2>
                  {active.context && <p style={{ fontSize:11, color:'var(--mu2)', marginTop:5, lineHeight:1.6 }}>{active.context}</p>}
                </div>

                {/* Stats */}
                <div className="stats-row">
                  {[
                    { label:'Coût total', val: stats.totalCost > 0 ? `${stats.totalCost.toLocaleString()} k€` : '—', color:'var(--red)' },
                    { label:'Valeur totale', val: stats.totalValue > 0 ? `${stats.totalValue.toLocaleString()} k€` : '—', color:'var(--green)' },
                    { label:'Marge brute', val: stats.margin !== 0 ? `${stats.margin.toLocaleString()} k€` : '—', color: stats.margin >= 0 ? 'var(--green)' : 'var(--red)' },
                    { label:'Taux de marge', val: stats.totalValue > 0 ? `${stats.marginPct.toFixed(1)}%` : '—', color: stats.marginPct >= 20 ? 'var(--green)' : stats.marginPct >= 0 ? 'var(--amber)' : 'var(--red)' },
                  ].map((s, i) => (
                    <div key={i} className="stat-card">
                      <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="stat-lbl">{s.label}</div>
                    </div>
                  ))}
                </div>

                {view === 'chain' ? (
                  <div className="chain-wrap">

                    {/* Support activities band */}
                    <div className="support-band">
                      <div className="support-label">Activités de soutien</div>
                      <div className="support-acts">
                        {SUPPORT_KEYS.map(key => {
                          const meta = ACTIVITIES_META[key]
                          const act  = active.activities?.[key] || DEFAULT_ACTIVITY()
                          const st   = STATUS_OPTIONS.find(s => s.value === act.status) || STATUS_OPTIONS[1]
                          const isSelected = activeKey === key
                          return (
                            <div
                              key={key}
                              className={`act-block support-act ${isSelected ? 'selected' : ''}`}
                              onClick={() => setActiveKey(key)}
                              style={{ borderColor: isSelected ? meta.color : undefined, minHeight: 90 }}
                            >
                              <div className="act-status-bar" style={{ background: st.color }}/>
                              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                <span style={{ color: meta.color, fontSize: 16 }}>{meta.icon}</span>
                                <div className="act-name">{meta.label}</div>
                              </div>
                              <div className="act-metrics">
                                {act.cost  > 0 && <span className="act-metric">Coût: {act.cost}k€</span>}
                                {act.value > 0 && <span className="act-metric">Val: {act.value}k€</span>}
                                <span className="act-status-chip" style={{ background:`${st.color}18`, color:st.color, border:`1px solid ${st.color}40` }}>
                                  {st.icon} {st.label}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Primary activities flow */}
                    <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
                      <div className="primary-label">Activités principales</div>
                      <div className="primary-acts" style={{ flex:1, background:'var(--s1)', border:'1px solid var(--b1)', borderRadius:'0 10px 10px 0', overflow:'hidden' }}>
                        {PRIMARY_KEYS.map((key, idx) => {
                          const meta = ACTIVITIES_META[key]
                          const act  = active.activities?.[key] || DEFAULT_ACTIVITY()
                          const st   = STATUS_OPTIONS.find(s => s.value === act.status) || STATUS_OPTIONS[1]
                          const isSelected = activeKey === key
                          return (
                            <div key={key} style={{ display:'flex', flex:1, minWidth:0 }}>
                              <div
                                className={`act-block ${isSelected ? 'selected' : ''}`}
                                onClick={() => setActiveKey(key)}
                                style={{ borderRadius:0, borderColor: isSelected ? meta.color : undefined, minHeight:130 }}
                              >
                                <div className="act-status-bar" style={{ background: st.color }}/>
                                <span style={{ color: meta.color, fontSize:20 }}>{meta.icon}</span>
                                <div className="act-name">{meta.label}</div>
                                <div className="act-metrics">
                                  {act.cost  > 0 && <span className="act-metric">Coût: {act.cost}k€</span>}
                                  {act.value > 0 && <span className="act-metric">Val: {act.value}k€</span>}
                                  {act.tasks?.length > 0 && <span className="act-metric">{act.tasks.length} tâche(s)</span>}
                                  <span className="act-status-chip" style={{ background:`${st.color}18`, color:st.color, border:`1px solid ${st.color}40` }}>
                                    {st.icon} {st.label}
                                  </span>
                                </div>
                              </div>
                              {idx < PRIMARY_KEYS.length - 1 && (
                                <div style={{ width:1, background:'var(--b1)', flexShrink:0, position:'relative' }}>
                                  <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', color:'var(--mu)', fontSize:10, background:'var(--s1)', padding:'2px 0' }}>›</div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {/* Margin arrow */}
                        <div style={{ width:80, flexShrink:0, background:'rgba(99,102,241,.06)', borderLeft:'1px solid var(--b1)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 8px' }}>
                          <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', letterSpacing:'.06em', textTransform:'uppercase', textAlign:'center' }}>Marge</div>
                          <div style={{ fontFamily:'Instrument Serif,serif', fontSize:18, fontStyle:'italic', color: stats.margin >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {stats.totalValue > 0 ? `${stats.marginPct.toFixed(0)}%` : '—'}
                          </div>
                          <div style={{ width:4, flex:1, maxHeight:60, background:'var(--s3)', borderRadius:2, overflow:'hidden', margin:'4px 0' }}>
                            <div style={{ height:`${Math.max(5, Math.min(100, stats.marginPct))}%`, background: stats.margin >= 0 ? 'var(--green)' : 'var(--red)', borderRadius:2, transition:'height .5s' }}/>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Table view */
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Activité</th>
                          <th>Type</th>
                          <th>Coût (k€)</th>
                          <th>Valeur (k€)</th>
                          <th>Ratio V/C</th>
                          <th>Statut</th>
                          <th>Tâches</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...PRIMARY_KEYS, ...SUPPORT_KEYS].map(key => {
                          const meta = ACTIVITIES_META[key]
                          const act  = active.activities?.[key] || DEFAULT_ACTIVITY()
                          const st   = STATUS_OPTIONS.find(s => s.value === act.status) || STATUS_OPTIONS[1]
                          const vc   = act.cost > 0 && act.value > 0 ? (act.value / act.cost).toFixed(2) : '—'
                          return (
                            <tr key={key} onClick={() => { setActiveKey(key); setView('chain') }}>
                              <td>
                                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                                  <span style={{ color:meta.color }}>{meta.icon}</span>
                                  <span style={{ fontWeight:600, fontSize:11 }}>{meta.label}</span>
                                </div>
                              </td>
                              <td>
                                <span className="type-badge" style={{ background: meta.color + '18', color: meta.color, border:`1px solid ${meta.color}40` }}>
                                  {ACTIVITIES_META[key].label.includes('Logistique') || PRIMARY_KEYS.includes(key) ? 'Principale' : 'Soutien'}
                                </span>
                              </td>
                              <td style={{ fontFamily:'Geist Mono,monospace', fontSize:11 }}>{act.cost || '—'}</td>
                              <td style={{ fontFamily:'Geist Mono,monospace', fontSize:11 }}>{act.value || '—'}</td>
                              <td style={{ fontFamily:'Geist Mono,monospace', fontSize:11, color: parseFloat(vc) >= 1.5 ? 'var(--green)' : parseFloat(vc) >= 1 ? 'var(--amber)' : 'var(--red)' }}>{vc}</td>
                              <td>
                                <span style={{ background:`${st.color}18`, color:st.color, border:`1px solid ${st.color}40`, padding:'2px 8px', borderRadius:4, fontSize:9, fontFamily:'Geist Mono,monospace', fontWeight:600 }}>
                                  {st.icon} {st.label}
                                </span>
                              </td>
                              <td style={{ fontFamily:'Geist Mono,monospace', fontSize:10, color:'var(--mu2)' }}>{act.tasks?.length || 0}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </main>

          {/* ── RIGHT: editor ── */}
          <aside className="right">
            <div className="ph">
              <span className="pl">Éditeur d'activité</span>
            </div>
            {!active ? (
              <div className="empty"><div className="empty-txt">Sélectionnez une analyse</div></div>
            ) : (
              <div className="rcontent">

                {/* Activity selector */}
                <div className="act-selector">
                  <div className="type-sep">— Principales —</div>
                  {PRIMARY_KEYS.map(key => {
                    const meta = ACTIVITIES_META[key]
                    const act  = active.activities?.[key] || DEFAULT_ACTIVITY()
                    const st   = STATUS_OPTIONS.find(s => s.value === act.status) || STATUS_OPTIONS[1]
                    return (
                      <button key={key} className={`act-sel-btn ${activeKey === key ? 'on' : ''}`} onClick={() => setActiveKey(key)}>
                        <div className="act-sel-icon" style={{ background: meta.bg, color: meta.color }}>{meta.icon}</div>
                        <span className="act-sel-name" style={{ color: activeKey === key ? meta.color : 'var(--mu2)' }}>{meta.label}</span>
                        <span className="act-sel-score" style={{ color: st.color }}>{st.icon}</span>
                      </button>
                    )
                  })}
                  <div className="type-sep">— Soutien —</div>
                  {SUPPORT_KEYS.map(key => {
                    const meta = ACTIVITIES_META[key]
                    const act  = active.activities?.[key] || DEFAULT_ACTIVITY()
                    const st   = STATUS_OPTIONS.find(s => s.value === act.status) || STATUS_OPTIONS[1]
                    return (
                      <button key={key} className={`act-sel-btn ${activeKey === key ? 'on' : ''}`} onClick={() => setActiveKey(key)}>
                        <div className="act-sel-icon" style={{ background: meta.bg, color: meta.color }}>{meta.icon}</div>
                        <span className="act-sel-name" style={{ color: activeKey === key ? meta.color : 'var(--mu2)' }}>{meta.label}</span>
                        <span className="act-sel-score" style={{ color: st.color }}>{st.icon}</span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ height:1, background:'var(--b1)' }}/>

                {/* Selected activity detail */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:currentMeta.bg, color:currentMeta.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                    {currentMeta.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:currentMeta.color }}>{currentMeta.label}</div>
                    <div style={{ fontSize:10, color:'var(--mu2)', marginTop:1 }}>{currentMeta.desc}</div>
                  </div>
                </div>

                {/* Financials */}
                <div className="field-row">
                  <div className="field-group">
                    <label className="flabel">Coût (k€)</label>
                    <input className="inp" type="number" placeholder="0" value={currentAct.cost || ''}
                      onChange={e => updateActivity(activeKey, { cost: parseFloat(e.target.value) || 0 })}/>
                  </div>
                  <div className="field-group">
                    <label className="flabel">Valeur créée (k€)</label>
                    <input className="inp" type="number" placeholder="0" value={currentAct.value || ''}
                      onChange={e => updateActivity(activeKey, { value: parseFloat(e.target.value) || 0 })}/>
                  </div>
                </div>

                {/* Ratio display */}
                {currentAct.cost > 0 && currentAct.value > 0 && (() => {
                  const ratio = (currentAct.value / currentAct.cost).toFixed(2)
                  const color = ratio >= 1.5 ? 'var(--green)' : ratio >= 1 ? 'var(--amber)' : 'var(--red)'
                  return (
                    <div style={{ background:'var(--s2)', border:`1px solid ${color}40`, borderRadius:7, padding:'8px 12px', display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontFamily:'Geist Mono,monospace', fontSize:9, color:'var(--mu)', textTransform:'uppercase', letterSpacing:'.06em' }}>Ratio valeur/coût</span>
                      <span style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic', color, marginLeft:'auto' }}>{ratio}×</span>
                    </div>
                  )
                })()}

                {/* Status */}
                <div className="field-group">
                  <label className="flabel">Statut stratégique</label>
                  <div className="status-grid">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        className={`status-btn ${currentAct.status === s.value ? 'on' : ''}`}
                        onClick={() => updateActivity(activeKey, { status: s.value })}
                        style={{ borderColor: currentAct.status === s.value ? s.color + '60' : undefined, color: currentAct.status === s.value ? s.color : 'var(--mu2)' }}
                      >
                        <span>{s.icon}</span> {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tasks */}
                <div className="field-group">
                  <label className="flabel">Tâches / sous-activités</label>
                  <div className="task-grid">
                    {currentMeta.tasks.map(t => {
                      const isOn = (currentAct.tasks || []).includes(t)
                      return (
                        <button key={t} className={`task-chip ${isOn ? 'on' : ''}`} onClick={() => toggleTask(activeKey, t)}>
                          {isOn ? '✓ ' : ''}{t}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="field-group">
                  <label className="flabel">Notes & observations</label>
                  <textarea className="inp" rows={3} placeholder="Forces, faiblesses, pistes d'amélioration…"
                    value={currentAct.notes || ''}
                    onChange={e => updateActivity(activeKey, { notes: e.target.value })}/>
                </div>

              </div>
            )}
          </aside>
        </div>

        {/* ── AI PANEL ── */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-ph">
            <span className="ai-title">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-body">
            {aiLoading && (
              <div className="ai-loading"><div className="spinner"/>Analyse en cours par Claude…</div>
            )}

            {!aiLoading && !aiResult && active?.aiResult && (() => { setAiResult(active.aiResult); return null })()}

            {aiResult && (
              <>
                {aiResult.synthese && (
                  <div>
                    <div className="ai-st">Synthèse stratégique</div>
                    <div className="ai-card">{aiResult.synthese}</div>
                  </div>
                )}

                {aiResult.avantage_concurrentiel && (
                  <div>
                    <div className="ai-st">Avantage concurrentiel</div>
                    <div className="ai-card" style={{ borderColor:'rgba(99,102,241,.25)', background:'rgba(99,102,241,.06)', fontStyle:'italic' }}>
                      {aiResult.avantage_concurrentiel}
                    </div>
                  </div>
                )}

                {aiResult.activites?.length > 0 && (
                  <div>
                    <div className="ai-st">Diagnostic par activité</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      {aiResult.activites.map((a, i) => {
                        const meta = ACTIVITIES_META[a.key] || { icon:'◉', color:'var(--mu2)', bg:'var(--s3)', label:a.key }
                        const impColor = IMPACT_COLORS[a.impact] || 'var(--mu2)'
                        return (
                          <div key={i} className="ai-act-item">
                            <span className="ai-act-icon" style={{ color:meta.color }}>{meta.icon}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div className="ai-act-name">
                                {meta.label}
                                <span className="ai-impact" style={{ background:`${impColor}18`, color:impColor, border:`1px solid ${impColor}40` }}>
                                  {a.impact}
                                </span>
                              </div>
                              <div className="ai-act-diag">{a.diagnostic}</div>
                              <span className="ai-act-action" style={{ background:meta.bg, color:meta.color, border:`1px solid ${meta.color}40` }}>
                                {a.action}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {(aiResult.createurs_valeur?.length > 0 || aiResult.destructeurs_valeur?.length > 0) && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {aiResult.createurs_valeur?.length > 0 && (
                      <div>
                        <div className="ai-st" style={{ color:'var(--green)' }}>▲ Créateurs</div>
                        <div className="ai-list">
                          {aiResult.createurs_valeur.map((c, i) => (
                            <div key={i} className="ai-li"><span className="ai-li-bullet" style={{ color:'var(--green)' }}>+</span><span>{c}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiResult.destructeurs_valeur?.length > 0 && (
                      <div>
                        <div className="ai-st" style={{ color:'var(--red)' }}>▼ Destructeurs</div>
                        <div className="ai-list">
                          {aiResult.destructeurs_valeur.map((d, i) => (
                            <div key={i} className="ai-li"><span className="ai-li-bullet" style={{ color:'var(--red)' }}>−</span><span>{d}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {aiResult.optimisations?.length > 0 && (
                  <div>
                    <div className="ai-st">Optimisations recommandées</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      {aiResult.optimisations.map((o, i) => {
                        const pc = PRIORITE_COLORS[o.priorite] || 'var(--mu2)'
                        return (
                          <div key={i} className="ai-optim">
                            <div className="ai-optim-title">
                              <span style={{ background:`${pc}18`, color:pc, border:`1px solid ${pc}40`, padding:'1px 7px', borderRadius:3, fontSize:9, fontFamily:'Geist Mono,monospace' }}>{o.priorite}</span>
                              {o.titre}
                            </div>
                            <div className="ai-optim-desc">{o.description}</div>
                            {o.activites_concernees?.length > 0 && (
                              <div className="ai-optim-acts">
                                {o.activites_concernees.map((k, j) => (
                                  <span key={j} className="ai-optim-act">{ACTIVITIES_META[k]?.icon} {ACTIVITIES_META[k]?.label || k}</span>
                                ))}
                              </div>
                            )}
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
                <div className="empty-txt">Renseignez vos activités puis cliquez sur "Analyse IA" pour identifier vos leviers de création de valeur.</div>
              </div>
            )}
          </div>
        </div>

        {/* ── TOAST ── */}
        {toast && (
          <div className={`toast ${toast.type || ''}`}>
            {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}