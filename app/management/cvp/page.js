'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const PRIMARY_KEYS = ['inbound', 'operations', 'outbound', 'marketing', 'service']
const SUPPORT_KEYS = ['infra', 'hrm', 'tech', 'procurement']

const ACTIVITIES_META = {
  inbound:     { label: 'Logistique interne',      icon: '↓', color: '#38bdf8', bg: 'rgba(56,189,248,.09)',  desc: 'Réception, stockage, distribution des intrants',   tasks: ['Gestion des stocks','Transport entrant','Contrôle qualité','Planification','Relations fournisseurs'] },
  operations:  { label: 'Production / Opérations', icon: '⚙', color: '#a78bfa', bg: 'rgba(167,139,250,.09)', desc: 'Transformation des intrants en produits finis',      tasks: ['Fabrication','Assemblage','Tests qualité','Maintenance','Gestion capacité'] },
  outbound:    { label: 'Logistique externe',       icon: '↑', color: '#34d399', bg: 'rgba(52,211,153,.09)',  desc: 'Stockage et distribution vers les clients',         tasks: ['Expédition','Gestion commandes','Entrepôts','Livraison','Retours'] },
  marketing:   { label: 'Marketing & Ventes',       icon: '◎', color: '#f59e0b', bg: 'rgba(245,158,11,.09)',  desc: 'Moyens pour attirer et convertir les clients',      tasks: ['Publicité','Force de vente','Pricing','CRM','Études marché'] },
  service:     { label: 'Services',                 icon: '✦', color: '#fb923c', bg: 'rgba(251,146,60,.09)',  desc: 'Maintien et amélioration de la valeur produit',     tasks: ['SAV','Installation','Formation','Support','Garantie'] },
  infra:       { label: 'Infrastructure',           icon: '⬡', color: '#94a3b8', bg: 'rgba(148,163,184,.09)', desc: 'Direction, finance, juridique, qualité',            tasks: ['Management','Finance','Juridique','Qualité','Planification'] },
  hrm:         { label: 'Ressources Humaines',      icon: '◉', color: '#f472b6', bg: 'rgba(244,114,182,.09)', desc: 'Recrutement, formation, rémunération',              tasks: ['Recrutement','Formation','Paie','Culture','Performance'] },
  tech:        { label: 'R&D / Technologie',        icon: '⌬', color: '#818cf8', bg: 'rgba(129,140,248,.09)', desc: 'Innovation, R&D, amélioration des procédés',        tasks: ['R&D produit','Automatisation','IT','Brevets','Veille techno'] },
  procurement: { label: 'Approvisionnement',        icon: '⊕', color: '#4ade80', bg: 'rgba(74,222,128,.09)',  desc: 'Achats de toutes les ressources utilisées',         tasks: ['Négociation achats','Sourcing','Éval. fournisseurs','Contrats','Audit'] },
}

const STATUS_OPTIONS = [
  { value: 'strength',    label: 'Force',       color: '#34d399', icon: '▲' },
  { value: 'neutral',     label: 'Neutre',      color: '#94a3b8', icon: '◆' },
  { value: 'weakness',    label: 'Faiblesse',   color: '#f87171', icon: '▼' },
  { value: 'opportunity', label: 'Opportunité', color: '#f59e0b', icon: '◉' },
]

const IMPACT_COLORS   = { high: '#f87171', medium: '#f59e0b', low: '#34d399' }
const PRIORITE_COLORS = { haute: '#f87171', moyenne: '#f59e0b', faible: '#34d399' }

const DEFAULT_ACTIVITY = () => ({ cost: 0, value: 0, status: 'neutral', notes: '', tasks: [], aiNotes: '' })
const DEFAULT_ACTIVITIES = () => Object.fromEntries([...PRIMARY_KEYS, ...SUPPORT_KEYS].map(k => [k, DEFAULT_ACTIVITY()]))

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CVPPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,     setProject]     = useState(null)
  const [analyses,    setAnalyses]    = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [createMode,  setCreateMode]  = useState('ai-gen') // 'ai-gen' | 'manual'
  const [newAnalysis, setNewAnalysis] = useState({ name: '', context: '', sector: '' })
  const [activeKey,   setActiveKey]   = useState('operations')
  const [view,        setView]        = useState('chain') // 'chain' | 'table'

  // AI generate
  const [aiGenLoading, setAiGenLoading] = useState(false)
  const [aiGenStep,    setAiGenStep]    = useState('')

  // AI analyse
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiResult,     setAiResult]     = useState(null)
  const [showAiPanel,  setShowAiPanel]  = useState(false)

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
        const list = proj.tools?.CVP || []
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), CVP: updated } }
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

  // ── CRUD ──
  const createManual = () => {
    if (!newAnalysis.name.trim()) return
    const a = {
      id: uid(), name: newAnalysis.name.trim(),
      context: newAnalysis.context.trim(), sector: newAnalysis.sector.trim(),
      createdAt: new Date().toISOString(),
      activities: DEFAULT_ACTIVITIES(),
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
    setAiGenStep('Analyse du contexte…')

    const placeholder = {
      id: uid(), name: newAnalysis.name.trim(),
      context: newAnalysis.context.trim(), sector: newAnalysis.sector.trim(),
      createdAt: new Date().toISOString(),
      activities: DEFAULT_ACTIVITIES(),
      aiResult: null, generatedByAI: true, generating: true,
    }
    const withPh = [...analyses, placeholder]
    setAnalyses(withPh); setActiveId(placeholder.id); persist(withPh)
    setShowNewForm(false)

    try {
      setAiGenStep('Cartographie des activités…')
      const res = await fetch('/api/generer-management/generer-cvp-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: newAnalysis.name.trim(),
          context:      newAnalysis.context.trim(),
          sector:       newAnalysis.sector.trim(),
          projectName:  project?.name || '',
          projectTag:   project?.tag  || newAnalysis.sector.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      setAiGenStep('Positionnement sur la chaîne…')
      const generatedActivities = data.generatedActivities || DEFAULT_ACTIVITIES()

      setAnalyses(prev => {
        const updated = prev.map(a => a.id === placeholder.id
          ? { ...a, activities: generatedActivities, aiResult: data.result || null, generating: false, generatedByAI: true }
          : a
        )
        persist(updated)
        return updated
      })
      if (data.result) { setAiResult(data.result); setShowAiPanel(true) }
      showToast('Chaîne de valeur générée par l\'IA ✦')
    } catch (err) {
      setAnalyses(prev => {
        const updated = prev.filter(a => a.id !== placeholder.id)
        persist(updated)
        return updated
      })
      setActiveId(analyses[analyses.length - 1]?.id || null)
      showToast(err.message, 'error')
    }
    setAiGenLoading(false); setAiGenStep('')
    setNewAnalysis({ name: '', context: '', sector: '' })
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

  // ── Export ──
  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ ...active, exportedAt: new Date().toISOString(), version: '1.0' }, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `CVP_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`
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
        if (!data.activities || !data.name) throw new Error('Format invalide')
        const imported = { ...data, id: uid(), importedAt: new Date().toISOString() }
        const updated = [...analyses, imported]
        setAnalyses(updated); setActiveId(imported.id)
        setAiResult(imported.aiResult || null)
        persist(updated)
        showToast(`"${imported.name}" importée`)
      } catch { showToast('Fichier invalide — format CVP requis', 'error') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── AI Analyse ──
  const runAI = async () => {
    if (!active) return
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-cvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: active.name, context: active.context,
          activities: active.activities,
          projectName: project?.name || '', projectTag: project?.tag || '',
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

  const stats      = getStats()
  const currentAct = active?.activities?.[activeKey] || DEFAULT_ACTIVITY()
  const currentMeta = ACTIVITIES_META[activeKey]

  // ── Activity block renderer ──
  const ActivityBlock = ({ actKey, isSupport = false }) => {
    const meta  = ACTIVITIES_META[actKey]
    const act   = active?.activities?.[actKey] || DEFAULT_ACTIVITY()
    const st    = STATUS_OPTIONS.find(s => s.value === act.status) || STATUS_OPTIONS[1]
    const isSelected = activeKey === actKey
    return (
      <div
        onClick={() => setActiveKey(actKey)}
        style={{
          flex: isSupport ? '1 1 140px' : 1,
          minWidth: 0, cursor: 'pointer',
          padding: '12px 10px',
          border: `1px solid ${isSelected ? meta.color : 'rgba(255,255,255,.06)'}`,
          borderRadius: isSupport ? 8 : 0,
          background: isSelected ? `color-mix(in srgb, ${meta.color} 6%, #101018)` : '#101018',
          display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden',
          transition: 'all .15s',
        }}
      >
        {/* Status bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: st.color, borderRadius: 0 }} />
        {/* Icon + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ color: meta.color, fontSize: isSupport ? 14 : 18 }}>{meta.icon}</span>
          <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.3, color: isSelected ? meta.color : 'var(--tx)' }}>{meta.label}</div>
        </div>
        {/* Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 'auto' }}>
          {act.cost > 0  && <span style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: '#9896b0' }}>Coût: {act.cost}k€</span>}
          {act.value > 0 && <span style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: '#9896b0' }}>Val: {act.value}k€</span>}
          {act.aiNotes   && <span style={{ fontSize: 9, color: '#9896b0', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{act.aiNotes}</span>}
          <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}40`, fontFamily: 'Geist Mono,monospace', fontWeight: 600, alignSelf: 'flex-start', marginTop: 2 }}>
            {st.icon} {st.label}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --bg:#09090e;--s1:#101018;--s2:#16161f;--s3:#1c1c28;
          --b1:rgba(255,255,255,.06);--b2:rgba(255,255,255,.11);--b3:rgba(255,255,255,.18);
          --tx:#eeedf6;--mu:#65637a;--mu2:#9896b0;--acc:#6366f1;--acc2:#818cf8;
          --green:#34d399;--red:#f87171;--amber:#f59e0b;
        }
        body{background:var(--bg);color:var(--tx);font-family:'Syne',sans-serif;min-height:100vh;}
        ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px;}

        /* Topbar */
        .tb{height:54px;background:var(--s1);border-bottom:1px solid var(--b1);display:flex;align-items:center;padding:0 18px;gap:10px;position:sticky;top:0;z-index:200;}
        .back{display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:6px;background:var(--s2);border:1px solid var(--b2);color:var(--mu2);font-family:'Geist Mono',monospace;font-size:10px;cursor:pointer;transition:all .15s;}
        .back:hover{color:var(--tx);border-color:var(--b3);}
        .tb-title{font-family:'Instrument Serif',serif;font-size:17px;font-style:italic;}
        .tb-proj{font-size:10px;color:var(--mu);font-family:'Geist Mono',monospace;}
        .tb-right{margin-left:auto;display:flex;gap:7px;align-items:center;}
        .btn{display:flex;align-items:center;gap:5px;padding:6px 13px;border-radius:6px;cursor:pointer;font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.04em;border:1px solid var(--b2);background:var(--s2);color:var(--mu2);transition:all .15s;}
        .btn:hover{color:var(--tx);border-color:var(--b3);}
        .btn.p{background:var(--acc);border-color:var(--acc);color:#fff;}
        .btn.p:hover{background:#4f52d8;}
        .btn.ai{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3);color:var(--acc2);}
        .btn.ai:hover{background:rgba(99,102,241,.18);}
        .btn.ai-gen{background:rgba(129,140,248,.08);border-color:rgba(129,140,248,.28);color:var(--acc2);}
        .btn.ai-gen:hover{background:rgba(129,140,248,.16);}
        .btn:disabled{opacity:.35;cursor:not-allowed;}
        .view-toggle{display:flex;gap:2px;background:var(--s2);border:1px solid var(--b2);border-radius:6px;padding:2px;}
        .view-btn{padding:4px 10px;border-radius:4px;font-family:'Geist Mono',monospace;font-size:10px;cursor:pointer;border:none;background:none;color:var(--mu2);transition:all .15s;}
        .view-btn.on{background:var(--s3);color:var(--tx);}

        /* Layout */
        .layout{display:grid;grid-template-columns:220px 1fr 320px;height:calc(100vh - 54px);overflow:hidden;}

        /* Left */
        .left{background:var(--s1);border-right:1px solid var(--b1);display:flex;flex-direction:column;overflow:hidden;}
        .ph{padding:14px;border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
        .pl{font-size:9px;color:var(--mu);letter-spacing:.1em;text-transform:uppercase;font-family:'Geist Mono',monospace;}
        .plist{flex:1;overflow-y:auto;padding:6px;display:flex;flex-direction:column;gap:2px;}
        .aitem{padding:9px 11px;border-radius:7px;cursor:pointer;border:1px solid transparent;transition:all .15s;}
        .aitem:hover{background:var(--s2);}
        .aitem.on{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.22);}
        .aname{font-size:11px;font-weight:600;display:flex;align-items:flex-start;justify-content:space-between;gap:4px;}
        .ameta{font-size:9px;color:var(--mu);font-family:'Geist Mono',monospace;margin-top:2px;}
        .adel{opacity:0;background:none;border:none;color:var(--red);cursor:pointer;font-size:11px;flex-shrink:0;padding:0;}
        .aitem:hover .adel{opacity:1;}
        .ai-gen-badge{font-size:8px;padding:1px 5px;border-radius:3px;background:rgba(129,140,248,.15);color:var(--acc2);font-family:'Geist Mono',monospace;font-weight:700;flex-shrink:0;}
        .margin-mini{font-size:9px;font-family:'Geist Mono',monospace;font-weight:700;padding:2px 6px;border-radius:3px;margin-top:4px;display:inline-block;}

        /* Create form */
        .cform{padding:11px;border-top:1px solid var(--b1);display:flex;flex-direction:column;gap:8px;flex-shrink:0;}
        .mode-toggle{display:grid;grid-template-columns:1fr 1fr;gap:3px;background:var(--bg);border-radius:5px;padding:3px;border:1px solid var(--b1);}
        .mode-btn{padding:5px 8px;border-radius:4px;font-size:9px;font-family:'Geist Mono',monospace;font-weight:700;cursor:pointer;border:none;background:transparent;color:var(--mu2);transition:all .15s;text-align:center;}
        .mode-btn.on{background:var(--s2);color:var(--tx);}
        .inp{width:100%;background:var(--bg);border:1px solid var(--b2);border-radius:5px;padding:7px 9px;font-family:'Syne',sans-serif;font-size:11px;color:var(--tx);outline:none;transition:border-color .15s;}
        .inp:focus{border-color:var(--acc);}
        .inp::placeholder{color:var(--mu);}
        textarea.inp{resize:vertical;min-height:56px;}
        .flabel{font-size:9px;color:var(--mu);letter-spacing:.08em;text-transform:uppercase;font-family:'Geist Mono',monospace;margin-bottom:2px;display:block;}
        .ai-hint{font-size:9px;color:var(--acc2);background:rgba(129,140,248,.06);border:1px solid rgba(129,140,248,.14);border-radius:5px;padding:7px 9px;line-height:1.5;}

        /* Center */
        .center{overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:18px;background:var(--bg);}

        /* Stats */
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
        .stat-card{background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:13px;display:flex;flex-direction:column;gap:3px;}
        .stat-val{font-family:'Instrument Serif',serif;font-size:24px;font-style:italic;}
        .stat-lbl{font-size:9px;color:var(--mu);font-family:'Geist Mono',monospace;letter-spacing:.07em;text-transform:uppercase;}

        /* Chain */
        .chain-wrap{display:flex;flex-direction:column;gap:10px;}
        .support-band{background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:10px;display:flex;gap:6px;}
        .support-label{writing-mode:vertical-lr;transform:rotate(180deg);font-size:8px;color:var(--mu);font-family:'Geist Mono',monospace;letter-spacing:.1em;text-transform:uppercase;padding:4px 2px;display:flex;align-items:center;}
        .primary-area{display:flex;gap:8px;align-items:stretch;}
        .primary-label-bar{writing-mode:vertical-lr;transform:rotate(180deg);font-size:8px;color:var(--mu);font-family:'Geist Mono',monospace;letter-spacing:.1em;text-transform:uppercase;padding:0 6px;display:flex;align-items:center;background:var(--s1);border:1px solid var(--b1);border-right:none;border-radius:10px 0 0 10px;}
        .primary-acts{flex:1;display:flex;background:var(--s1);border:1px solid var(--b1);border-radius:0 10px 10px 0;overflow:hidden;}
        .divider{width:1px;background:var(--b1);flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;}
        .margin-col{width:76px;flex-shrink:0;background:rgba(99,102,241,.05);border-left:1px solid var(--b1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:10px 6px;}

        /* Generating banner */
        .gen-banner{display:flex;align-items:center;gap:12px;padding:14px 18px;background:rgba(129,140,248,.06);border:1px solid rgba(129,140,248,.18);border-radius:10px;}
        .gen-spinner{width:18px;height:18px;border:2px solid var(--b2);border-top-color:var(--acc2);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
        .gen-step{font-size:11px;color:var(--acc2);font-family:'Geist Mono',monospace;}
        @keyframes spin{to{transform:rotate(360deg);}}

        /* Table */
        .table-wrap{background:var(--s1);border:1px solid var(--b1);border-radius:10px;overflow:hidden;}
        table{width:100%;border-collapse:collapse;}
        th{padding:9px 13px;font-size:9px;color:var(--mu);font-family:'Geist Mono',monospace;letter-spacing:.07em;text-transform:uppercase;border-bottom:1px solid var(--b1);text-align:left;background:var(--s2);}
        td{padding:9px 13px;font-size:11px;border-bottom:1px solid var(--b1);vertical-align:middle;}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:var(--s2);cursor:pointer;}

        /* Right panel */
        .right{background:var(--s1);border-left:1px solid var(--b1);display:flex;flex-direction:column;overflow:hidden;}
        .rcontent{flex:1;overflow-y:auto;padding:13px;display:flex;flex-direction:column;gap:13px;}
        .act-selector{display:flex;flex-direction:column;gap:2px;}
        .act-sel-btn{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:6px;border:1px solid transparent;cursor:pointer;background:none;transition:all .15s;text-align:left;width:100%;}
        .act-sel-btn:hover{background:var(--s2);}
        .act-sel-btn.on{border-color:var(--b2);background:var(--s2);}
        .act-sel-ic{width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;}
        .type-sep{font-size:8px;color:var(--mu);font-family:'Geist Mono',monospace;letter-spacing:.1em;text-transform:uppercase;padding:6px 2px 2px;}
        .sep{height:1px;background:var(--b1);}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .field-group{display:flex;flex-direction:column;gap:4px;}
        .status-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
        .status-btn{padding:6px 8px;border-radius:6px;cursor:pointer;border:1px solid var(--b2);background:var(--s2);transition:all .15s;display:flex;align-items:center;gap:5px;font-size:10px;font-family:'Geist Mono',monospace;font-weight:600;}
        .status-btn:hover{border-color:var(--b3);}
        .task-grid{display:flex;flex-wrap:wrap;gap:5px;}
        .task-chip{padding:4px 8px;border-radius:4px;font-size:10px;font-family:'Geist Mono',monospace;border:1px solid var(--b2);background:var(--s2);color:var(--mu2);cursor:pointer;transition:all .15s;}
        .task-chip:hover{color:var(--tx);}
        .task-chip.on{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.4);color:var(--acc2);}
        .ai-note-box{font-size:10px;color:var(--mu2);line-height:1.6;padding:9px;background:var(--s2);border-radius:5px;border:1px solid var(--b1);border-left:3px solid var(--acc2);font-style:italic;}

        /* AI Panel */
        .ai-panel{position:fixed;right:0;top:54px;bottom:0;width:400px;background:var(--s1);border-left:1px solid var(--b1);z-index:150;display:flex;flex-direction:column;overflow:hidden;transform:translateX(100%);transition:transform .28s ease;}
        .ai-panel.open{transform:translateX(0);}
        .ai-ph{padding:14px 18px;border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
        .ai-ttl{font-family:'Instrument Serif',serif;font-size:17px;font-style:italic;}
        .ai-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:13px;}
        .ai-st{font-size:9px;color:var(--mu2);letter-spacing:.1em;text-transform:uppercase;font-family:'Geist Mono',monospace;margin-bottom:6px;}
        .ai-card{background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:13px;font-size:12px;color:var(--tx);line-height:1.7;}
        .ai-act-item{background:var(--s2);border:1px solid var(--b1);border-radius:7px;padding:10px 12px;display:flex;gap:9px;}
        .ai-act-name{font-size:11px;font-weight:700;margin-bottom:3px;}
        .ai-act-diag{font-size:11px;color:var(--mu2);line-height:1.6;}
        .ai-act-action{font-size:9px;margin-top:5px;padding:3px 7px;border-radius:3px;display:inline-block;font-family:'Geist Mono',monospace;font-weight:600;}
        .ai-impact{font-size:8px;padding:1px 5px;border-radius:3px;font-family:'Geist Mono',monospace;font-weight:600;margin-left:5px;}
        .ai-list{display:flex;flex-direction:column;gap:5px;}
        .ai-li{display:flex;gap:7px;align-items:flex-start;padding:7px 10px;background:var(--s2);border-radius:5px;border:1px solid var(--b1);font-size:11px;line-height:1.6;}
        .ai-li-b{font-family:'Geist Mono',monospace;font-size:9px;color:var(--mu);padding-top:2px;flex-shrink:0;}
        .ai-optim{background:var(--s2);border:1px solid var(--b1);border-radius:7px;padding:11px;}
        .ai-optim-ttl{font-size:11px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px;}
        .ai-optim-desc{font-size:11px;color:var(--mu2);line-height:1.6;}
        .ai-optim-acts{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;}
        .ai-optim-act{font-size:9px;padding:2px 7px;border-radius:3px;font-family:'Geist Mono',monospace;background:var(--s3);color:var(--mu2);}
        .spinner{width:16px;height:16px;border:2px solid var(--b2);border-top-color:var(--acc2);border-radius:50%;animation:spin .7s linear infinite;}
        .ai-loading{display:flex;align-items:center;gap:10px;padding:20px;color:var(--mu2);font-size:12px;}

        /* Empty & Toast */
        .empty{padding:60px 20px;text-align:center;}
        .empty-ico{font-size:40px;opacity:.2;margin-bottom:12px;}
        .empty-txt{font-size:12px;color:var(--mu);line-height:1.6;}
        .toast{position:fixed;bottom:20px;right:20px;z-index:999;background:var(--s2);border:1px solid var(--b2);border-radius:7px;padding:10px 16px;font-size:12px;display:flex;align-items:center;gap:7px;box-shadow:0 8px 28px rgba(0,0,0,.5);animation:su .2s ease;}
        .toast.error{border-color:rgba(248,113,113,.3);color:var(--red);}
        .toast.info{border-color:rgba(99,102,241,.25);}
        @keyframes su{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

        @media(max-width:1100px){.layout{grid-template-columns:200px 1fr;}.right{display:none;}}
        @media(max-width:700px){.layout{grid-template-columns:1fr;}.left{display:none;}.stats-row{grid-template-columns:1fr 1fr;}}
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importAnalysis} />

      <div style={{ minHeight: '100vh' }}>

        {/* TOPBAR */}
        <header className="tb">
          <button className="back" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="tb-title">Chaîne de Valeur</div>
            {project && <div className="tb-proj">{project.name}</div>}
          </div>
          <div className="tb-right">
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
            {active && !active.generating && (
              <>
                <div className="view-toggle">
                  <button className={`view-btn ${view === 'chain' ? 'on' : ''}`} onClick={() => setView('chain')}>Chaîne</button>
                  <button className={`view-btn ${view === 'table' ? 'on' : ''}`} onClick={() => setView('table')}>Tableau</button>
                </div>
                <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>
                <button className="btn ai" onClick={runAI} disabled={aiLoading}>
                  {aiLoading ? <><span className="spinner" />Analyse…</> : '✦ Analyse IA'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="layout">

          {/* LEFT */}
          <aside className="left">
            <div className="ph">
              <span className="pl">Analyses ({analyses.length})</span>
            </div>
            <div className="plist">
              {analyses.length === 0 && (
                <div className="empty"><div className="empty-ico">⛓</div><div className="empty-txt">Créez votre première analyse</div></div>
              )}
              {analyses.map(a => {
                const acts = Object.values(a.activities || {})
                const tv = acts.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
                const tc = acts.reduce((s, x) => s + (parseFloat(x.cost)  || 0), 0)
                const mp = tv > 0 ? ((tv - tc) / tv * 100).toFixed(0) : null
                const mpColor = mp !== null ? (mp >= 20 ? '#34d399' : mp >= 0 ? '#f59e0b' : '#f87171') : 'var(--mu)'
                return (
                  <div key={a.id} className={`aitem ${activeId === a.id ? 'on' : ''}`}
                    onClick={() => { setActiveId(a.id); setAiResult(a.aiResult || null) }}>
                    <div className="aname">
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        {a.generatedByAI && <span className="ai-gen-badge">IA</span>}
                        <button className="adel" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                      </div>
                    </div>
                    <div className="ameta">
                      {a.generating ? '⟳ Génération…' : new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      {a.importedAt && ' · Importée'}
                    </div>
                    {!a.generating && mp !== null && (
                      <span className="margin-mini" style={{ background: `color-mix(in srgb, ${mpColor} 12%, transparent)`, color: mpColor }}>
                        Marge : {mp}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {showNewForm ? (
              <div className="cform">
                <div className="mode-toggle">
                  <button className={`mode-btn ${createMode === 'ai-gen' ? 'on' : ''}`} onClick={() => setCreateMode('ai-gen')}>✦ IA Auto</button>
                  <button className={`mode-btn ${createMode === 'manual' ? 'on' : ''}`} onClick={() => setCreateMode('manual')}>✎ Manuel</button>
                </div>
                <div>
                  <label className="flabel">Nom de l'analyse</label>
                  <input className="inp" placeholder="Ex: Chaîne Valeur 2025" value={newAnalysis.name}
                    onChange={e => setNewAnalysis(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && createMode === 'manual' && createManual()} autoFocus />
                </div>
                <div>
                  <label className="flabel">{createMode === 'ai-gen' ? 'Description du projet / activité *' : 'Contexte (optionnel)'}</label>
                  <textarea className="inp" rows={createMode === 'ai-gen' ? 4 : 2}
                    placeholder={createMode === 'ai-gen'
                      ? "Décrivez votre activité, vos produits/services, votre modèle économique, vos forces et faiblesses connues… L'IA va remplir toute la chaîne automatiquement."
                      : "Secteur, périmètre…"}
                    value={newAnalysis.context}
                    onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))} />
                </div>
                <div>
                  <label className="flabel">Secteur d'activité</label>
                  <input className="inp" placeholder="Ex: Retail, SaaS, Industrie…" value={newAnalysis.sector}
                    onChange={e => setNewAnalysis(p => ({ ...p, sector: e.target.value }))} />
                </div>
                {createMode === 'ai-gen' && (
                  <div className="ai-hint">
                    ✦ L'IA va évaluer chaque activité, estimer les forces/faiblesses, ajouter des notes contextuelles et fournir une synthèse stratégique complète.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 5 }}>
                  {createMode === 'ai-gen' ? (
                    <button className="btn ai-gen" style={{ flex: 1, justifyContent: 'center' }}
                      onClick={createWithAI}
                      disabled={aiGenLoading || !newAnalysis.name.trim() || !newAnalysis.context.trim()}>
                      {aiGenLoading
                        ? <><span className="spinner" style={{ borderTopColor: 'var(--acc2)' }} />{aiGenStep || 'Génération…'}</>
                        : '✦ Générer avec l\'IA'}
                    </button>
                  ) : (
                    <button className="btn p" style={{ flex: 1, justifyContent: 'center' }} onClick={createManual}>Créer</button>
                  )}
                  <button className="btn" onClick={() => { setShowNewForm(false); setNewAnalysis({ name: '', context: '', sector: '' }) }}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 10, borderTop: '1px solid var(--b1)' }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>+ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* CENTER */}
          <main className="center">
            {!active ? (
              <div className="empty" style={{ padding: '80px 40px' }}>
                <div className="empty-ico" style={{ fontSize: 52, marginBottom: 14 }}>⛓</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, fontStyle: 'italic', marginBottom: 8 }}>Chaîne de Valeur de Porter</div>
                <div className="empty-txt">Décrivez votre activité et laissez l'IA générer automatiquement la chaîne, ou créez-la manuellement.</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontFamily: 'Instrument Serif,serif', fontSize: 21, fontStyle: 'italic' }}>{active.name}</h2>
                    {active.generatedByAI && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(129,140,248,.12)', color: 'var(--acc2)', fontFamily: 'Geist Mono,monospace', fontWeight: 700 }}>Généré par IA</span>}
                  </div>
                  {active.context && <p style={{ fontSize: 11, color: 'var(--mu2)', marginTop: 5, lineHeight: 1.6 }}>{active.context.slice(0, 200)}{active.context.length > 200 ? '…' : ''}</p>}
                  {active.sector && <span style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: 'var(--acc2)', marginTop: 4, display: 'inline-block' }}>Secteur : {active.sector}</span>}
                </div>

                {/* Generating banner */}
                {active.generating && (
                  <div className="gen-banner">
                    <div className="gen-spinner" />
                    <div>
                      <div className="gen-step">{aiGenStep || 'Génération en cours…'}</div>
                      <div style={{ fontSize: 9, color: 'var(--mu)', marginTop: 2 }}>L'IA cartographie vos activités et évalue leur contribution à la valeur…</div>
                    </div>
                  </div>
                )}

                {!active.generating && (
                  <>
                    {/* Stats */}
                    <div className="stats-row">
                      {[
                        { label: 'Coût total', val: stats.totalCost > 0 ? `${stats.totalCost.toLocaleString()} k€` : '—', color: 'var(--red)' },
                        { label: 'Valeur totale', val: stats.totalValue > 0 ? `${stats.totalValue.toLocaleString()} k€` : '—', color: 'var(--green)' },
                        { label: 'Marge brute', val: stats.margin !== 0 ? `${stats.margin.toLocaleString()} k€` : '—', color: stats.margin >= 0 ? 'var(--green)' : 'var(--red)' },
                        { label: 'Taux marge', val: stats.totalValue > 0 ? `${stats.marginPct.toFixed(1)}%` : '—', color: stats.marginPct >= 20 ? 'var(--green)' : stats.marginPct >= 0 ? 'var(--amber)' : 'var(--red)' },
                      ].map((s, i) => (
                        <div key={i} className="stat-card">
                          <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                          <div className="stat-lbl">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {view === 'chain' ? (
                      <div className="chain-wrap">
                        {/* Support band */}
                        <div className="support-band">
                          <div className="support-label">Activités de soutien</div>
                          <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                            {SUPPORT_KEYS.map(k => <ActivityBlock key={k} actKey={k} isSupport />)}
                          </div>
                        </div>

                        {/* Primary flow */}
                        <div className="primary-area">
                          <div className="primary-label-bar">Activités principales</div>
                          <div className="primary-acts">
                            {PRIMARY_KEYS.map((k, idx) => (
                              <div key={k} style={{ display: 'flex', flex: 1, minWidth: 0 }}>
                                <ActivityBlock actKey={k} />
                                {idx < PRIMARY_KEYS.length - 1 && (
                                  <div className="divider">
                                    <span style={{ position: 'absolute', fontSize: 9, color: 'var(--mu)', background: 'var(--s1)', padding: '1px 0' }}>›</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="margin-col">
                              <div style={{ fontSize: 8, color: 'var(--mu)', fontFamily: 'Geist Mono,monospace', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'center' }}>Marge</div>
                              <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 18, fontStyle: 'italic', color: stats.margin >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                {stats.totalValue > 0 ? `${stats.marginPct.toFixed(0)}%` : '—'}
                              </div>
                              <div style={{ width: 4, height: 60, background: 'var(--s3)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: `${Math.max(4, Math.min(100, Math.abs(stats.marginPct)))}%`, background: stats.margin >= 0 ? 'var(--green)' : 'var(--red)', borderRadius: 2, marginTop: stats.margin >= 0 ? 'auto' : 0, transition: 'height .5s' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Activité</th><th>Type</th><th>Coût (k€)</th><th>Valeur (k€)</th><th>Ratio V/C</th><th>Statut</th><th>Tâches</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...PRIMARY_KEYS, ...SUPPORT_KEYS].map(key => {
                              const meta = ACTIVITIES_META[key]
                              const act  = active.activities?.[key] || DEFAULT_ACTIVITY()
                              const st   = STATUS_OPTIONS.find(s => s.value === act.status) || STATUS_OPTIONS[1]
                              const vc   = act.cost > 0 && act.value > 0 ? (act.value / act.cost).toFixed(2) : '—'
                              const vcNum = parseFloat(vc)
                              return (
                                <tr key={key} onClick={() => { setActiveKey(key); setView('chain') }}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                      <span style={{ color: meta.color }}>{meta.icon}</span>
                                      <span style={{ fontWeight: 600, fontSize: 11 }}>{meta.label}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}40`, padding: '2px 7px', borderRadius: 3, fontSize: 9, fontFamily: 'Geist Mono,monospace', fontWeight: 600 }}>
                                      {PRIMARY_KEYS.includes(key) ? 'Principale' : 'Soutien'}
                                    </span>
                                  </td>
                                  <td style={{ fontFamily: 'Geist Mono,monospace', fontSize: 11 }}>{act.cost || '—'}</td>
                                  <td style={{ fontFamily: 'Geist Mono,monospace', fontSize: 11 }}>{act.value || '—'}</td>
                                  <td style={{ fontFamily: 'Geist Mono,monospace', fontSize: 11, color: vcNum >= 1.5 ? 'var(--green)' : vcNum >= 1 ? 'var(--amber)' : 'var(--red)' }}>{vc}</td>
                                  <td>
                                    <span style={{ background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}40`, padding: '2px 7px', borderRadius: 3, fontSize: 9, fontFamily: 'Geist Mono,monospace', fontWeight: 600 }}>
                                      {st.icon} {st.label}
                                    </span>
                                  </td>
                                  <td style={{ fontFamily: 'Geist Mono,monospace', fontSize: 10, color: 'var(--mu2)' }}>{act.tasks?.length || 0}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </main>

          {/* RIGHT: editor */}
          <aside className="right">
            <div className="ph"><span className="pl">Éditeur d'activité</span></div>
            {!active ? (
              <div className="empty"><div className="empty-txt">Sélectionnez une analyse</div></div>
            ) : (
              <div className="rcontent">
                <div className="act-selector">
                  <div className="type-sep">— Principales —</div>
                  {PRIMARY_KEYS.map(key => {
                    const meta = ACTIVITIES_META[key]
                    const act  = active.activities?.[key] || DEFAULT_ACTIVITY()
                    const st   = STATUS_OPTIONS.find(s => s.value === act.status) || STATUS_OPTIONS[1]
                    return (
                      <button key={key} className={`act-sel-btn ${activeKey === key ? 'on' : ''}`} onClick={() => setActiveKey(key)}>
                        <div className="act-sel-ic" style={{ background: meta.bg, color: meta.color }}>{meta.icon}</div>
                        <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: activeKey === key ? meta.color : 'var(--mu2)' }}>{meta.label}</span>
                        <span style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: st.color }}>{st.icon}</span>
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
                        <div className="act-sel-ic" style={{ background: meta.bg, color: meta.color }}>{meta.icon}</div>
                        <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: activeKey === key ? meta.color : 'var(--mu2)' }}>{meta.label}</span>
                        <span style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: st.color }}>{st.icon}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="sep" />

                {/* Active activity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: currentMeta.bg, color: currentMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
                    {currentMeta.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: currentMeta.color }}>{currentMeta.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--mu2)', marginTop: 1 }}>{currentMeta.desc}</div>
                  </div>
                </div>

                {/* AI notes for this activity */}
                {currentAct.aiNotes && (
                  <div>
                    <label className="flabel">Note IA</label>
                    <div className="ai-note-box">{currentAct.aiNotes}</div>
                  </div>
                )}

                {/* Financials */}
                <div className="field-row">
                  <div className="field-group">
                    <label className="flabel">Coût (k€)</label>
                    <input className="inp" type="number" placeholder="0" value={currentAct.cost || ''}
                      onChange={e => updateActivity(activeKey, { cost: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="field-group">
                    <label className="flabel">Valeur créée (k€)</label>
                    <input className="inp" type="number" placeholder="0" value={currentAct.value || ''}
                      onChange={e => updateActivity(activeKey, { value: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                {/* Ratio */}
                {currentAct.cost > 0 && currentAct.value > 0 && (() => {
                  const ratio = (currentAct.value / currentAct.cost).toFixed(2)
                  const color = ratio >= 1.5 ? 'var(--green)' : ratio >= 1 ? 'var(--amber)' : 'var(--red)'
                  return (
                    <div style={{ background: 'var(--s2)', border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, borderRadius: 6, padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'Geist Mono,monospace', fontSize: 9, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Ratio valeur/coût</span>
                      <span style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, fontStyle: 'italic', color, marginLeft: 'auto' }}>{ratio}×</span>
                    </div>
                  )
                })()}

                {/* Status */}
                <div className="field-group">
                  <label className="flabel">Statut stratégique</label>
                  <div className="status-grid">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s.value}
                        className="status-btn"
                        onClick={() => updateActivity(activeKey, { status: s.value })}
                        style={{ borderColor: currentAct.status === s.value ? `${s.color}60` : undefined, background: currentAct.status === s.value ? `${s.color}10` : undefined, color: currentAct.status === s.value ? s.color : 'var(--mu2)' }}>
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
                      return <button key={t} className={`task-chip ${isOn ? 'on' : ''}`} onClick={() => toggleTask(activeKey, t)}>{isOn ? '✓ ' : ''}{t}</button>
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="field-group">
                  <label className="flabel">Notes & observations</label>
                  <textarea className="inp" rows={3} placeholder="Forces, faiblesses, pistes d'amélioration…"
                    value={currentAct.notes || ''}
                    onChange={e => updateActivity(activeKey, { notes: e.target.value })} />
                </div>

                <div style={{ height: 8 }} />
              </div>
            )}
          </aside>
        </div>

        {/* AI Panel */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-ph">
            <span className="ai-ttl">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-body">
            {aiLoading && <div className="ai-loading"><div className="spinner" />Analyse en cours par Claude…</div>}

            {aiResult && !aiLoading && (
              <>
                {aiResult.synthese && (
                  <div><div className="ai-st">Synthèse stratégique</div><div className="ai-card">{aiResult.synthese}</div></div>
                )}
                {aiResult.avantage_concurrentiel && (
                  <div>
                    <div className="ai-st">Avantage concurrentiel</div>
                    <div className="ai-card" style={{ borderColor: 'rgba(99,102,241,.25)', background: 'rgba(99,102,241,.06)', fontStyle: 'italic' }}>{aiResult.avantage_concurrentiel}</div>
                  </div>
                )}
                {aiResult.activites?.length > 0 && (
                  <div>
                    <div className="ai-st">Diagnostic par activité</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {aiResult.activites.map((a, i) => {
                        const meta = ACTIVITIES_META[a.key] || { icon: '◉', color: 'var(--mu2)', bg: 'var(--s3)', label: a.key }
                        const ic   = IMPACT_COLORS[a.impact] || 'var(--mu2)'
                        return (
                          <div key={i} className="ai-act-item">
                            <span style={{ fontSize: 15, color: meta.color, flexShrink: 0, marginTop: 1 }}>{meta.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="ai-act-name">
                                {meta.label}
                                <span className="ai-impact" style={{ background: `${ic}18`, color: ic, border: `1px solid ${ic}40` }}>{a.impact}</span>
                              </div>
                              <div className="ai-act-diag">{a.diagnostic}</div>
                              <span className="ai-act-action" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>{a.action}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {(aiResult.createurs_valeur?.length > 0 || aiResult.destructeurs_valeur?.length > 0) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {aiResult.createurs_valeur?.length > 0 && (
                      <div>
                        <div className="ai-st" style={{ color: 'var(--green)' }}>▲ Créateurs</div>
                        <div className="ai-list">{aiResult.createurs_valeur.map((c, i) => <div key={i} className="ai-li"><span className="ai-li-b" style={{ color: 'var(--green)' }}>+</span><span>{c}</span></div>)}</div>
                      </div>
                    )}
                    {aiResult.destructeurs_valeur?.length > 0 && (
                      <div>
                        <div className="ai-st" style={{ color: 'var(--red)' }}>▼ Destructeurs</div>
                        <div className="ai-list">{aiResult.destructeurs_valeur.map((d, i) => <div key={i} className="ai-li"><span className="ai-li-b" style={{ color: 'var(--red)' }}>−</span><span>{d}</span></div>)}</div>
                      </div>
                    )}
                  </div>
                )}
                {aiResult.optimisations?.length > 0 && (
                  <div>
                    <div className="ai-st">Optimisations recommandées</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {aiResult.optimisations.map((o, i) => {
                        const pc = PRIORITE_COLORS[o.priorite] || 'var(--mu2)'
                        return (
                          <div key={i} className="ai-optim">
                            <div className="ai-optim-ttl">
                              <span style={{ background: `${pc}18`, color: pc, border: `1px solid ${pc}40`, padding: '1px 6px', borderRadius: 3, fontSize: 9, fontFamily: 'Geist Mono,monospace' }}>{o.priorite}</span>
                              {o.titre}
                            </div>
                            <div className="ai-optim-desc">{o.description}</div>
                            {o.activites_concernees?.length > 0 && (
                              <div className="ai-optim-acts">
                                {o.activites_concernees.map((k, j) => <span key={j} className="ai-optim-act">{ACTIVITIES_META[k]?.icon} {ACTIVITIES_META[k]?.label || k}</span>)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {aiResult.conclusion && (
                  <div><div className="ai-st">Conclusion</div><div className="ai-card" style={{ fontStyle: 'italic', color: 'var(--mu2)' }}>{aiResult.conclusion}</div></div>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div className="empty" style={{ padding: '40px 16px' }}>
                <div className="empty-ico">✦</div>
                <div className="empty-txt">Renseignez vos activités puis cliquez sur "Analyse IA" pour identifier vos leviers de création de valeur.</div>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && <div className={`toast ${toast.type || ''}`}>{toast.type === 'error' ? '✕' : '✓'} {toast.msg}</div>}
      </div>
    </>
  )
}