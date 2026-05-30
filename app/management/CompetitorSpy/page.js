'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const CATEGORY_META = {
  pricing:    { label: 'Tarifs',     icon: '💰', color: '#f472b6', bg: 'rgba(244,114,182,.08)' },
  product:    { label: 'Produit',    icon: '🧩', color: '#60a5fa', bg: 'rgba(96,165,250,.08)'  },
  marketing:  { label: 'Marketing',  icon: '📣', color: '#fb923c', bg: 'rgba(251,146,60,.08)'  },
  social:     { label: 'Social',     icon: '📡', color: '#a78bfa', bg: 'rgba(167,139,250,.08)' },
  hiring:     { label: 'RH',         icon: '👥', color: '#34d399', bg: 'rgba(52,211,153,.08)'  },
  reputation: { label: 'Réputation', icon: '⭐', color: '#facc15', bg: 'rgba(250,204,21,.08)'  },
}

const IMPACT_COLORS  = { faible: '#34d399', modéré: '#facc15', fort: '#fb923c', critique: '#f87171' }
const TREND_ICONS    = { hausse: '↑', baisse: '↓', stable: '→', incertain: '?' }
const THREAT_COLORS  = { green:'#34d399', teal:'#2dd4bf', yellow:'#facc15', orange:'#fb923c', red:'#f87171' }
const PERIOD_OPTIONS = [{ value:'weekly',label:'Hebdo'},{value:'monthly',label:'Mensuel'},{value:'quarterly',label:'Trimestriel'}]
const SECTORS        = ['SaaS','FinTech','E-commerce','Santé','Éducation','Logistique','AgriTech','Retail','Immobilier','Industrie','Food Tech','Média']
const REGIONS        = ['Afrique de l\'Ouest','Afrique Sub-saharienne','Maghreb','Europe','Amérique du Nord','Asie','Moyen-Orient','Global']
const ACTIVITY_TYPES = ['B2B','B2C','B2B2C','Marketplace','SaaS','Service','Industrie','Commerce']

const EMPTY_COMP = () => ({ id: uid(), name: '', url: '', notes: '', positioning: '' })
const DEFAULT_REPORT = () => ({
  id: uid(), name: '', context: '', myCompany: '', sector: '', activityType: '', region: '', objectives: '',
  period: 'monthly', competitors: [EMPTY_COMP()], watchCategories: Object.keys(CATEGORY_META),
  createdAt: new Date().toISOString(), aiResult: null, generatedByAI: false,
})

const GEN_STEPS = [
  'Analyse du secteur et du marché cible…',
  'Identification des concurrents pertinents…',
  'Évaluation des niveaux de menace…',
  'Analyse des signaux par catégorie…',
  'Génération du plan d\'action…',
]

export default function CompetitorSpyPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,     setProject]     = useState(null)
  const [reports,     setReports]     = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [formMode,    setFormMode]    = useState('ai')     // 'ai' | 'manual'
  const [newReport,   setNewReport]   = useState(DEFAULT_REPORT())
  const [genLoading,  setGenLoading]  = useState(false)
  const [genStep,     setGenStep]     = useState(0)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState(null)
  const [activeView,  setActiveView]  = useState('setup')  // 'setup' | 'report'
  const [activeComp,  setActiveComp]  = useState(0)
  const [toast,       setToast]       = useState(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.CompetitorSpy || []
        setReports(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          setAiResult(last.aiResult || null)
          setActiveView(last.aiResult ? 'report' : 'setup')
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), CompetitorSpy: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const active = reports.find(r => r.id === activeId) || null

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const selectReport = (r) => {
    setActiveId(r.id); setAiResult(r.aiResult || null)
    setActiveView(r.aiResult ? 'report' : 'setup'); setShowForm(false)
  }

  const deleteReport = (id) => {
    const updated = reports.filter(r => r.id !== id)
    setReports(updated); persist(updated)
    if (activeId === id) {
      const last = updated[updated.length - 1]
      if (last) { setActiveId(last.id); setAiResult(last.aiResult || null); setActiveView(last.aiResult ? 'report' : 'setup') }
      else { setActiveId(null); setAiResult(null); setActiveView('setup') }
    }
    showToast('Rapport supprimé', 'info')
  }

  const updateActive = useCallback((patch) => {
    setReports(prev => {
      const updated = prev.map(r => r.id === activeId ? { ...r, ...patch } : r)
      setTimeout(() => {
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (!raw) return
          const data = JSON.parse(raw)
          data.projects = (data.projects || []).map(p =>
            p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), CompetitorSpy: updated } }
          )
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        } catch {}
      }, 0)
      return updated
    })
  }, [activeId, projectId])

  // Competitor helpers
  const addComp       = () => updateActive({ competitors: [...(active?.competitors || []), EMPTY_COMP()] })
  const removeComp    = (i) => { const l = [...(active?.competitors||[])]; l.splice(i,1); updateActive({ competitors: l }); if (activeComp >= l.length) setActiveComp(Math.max(0, l.length-1)) }
  const updateComp    = (i, patch) => { const l = [...(active?.competitors||[])]; l[i] = { ...l[i], ...patch }; updateActive({ competitors: l }) }
  const toggleCat     = (cat) => { const c = active?.watchCategories||Object.keys(CATEGORY_META); updateActive({ watchCategories: c.includes(cat) ? c.filter(x=>x!==cat) : [...c, cat] }) }

  // ── AI GENERATION (Mode 1) ─────────────────────────────────────────────────
  const generateAI = async () => {
    const { name, sector, activityType, region, objectives, context } = newReport
    if (!name.trim() && !sector.trim() && !context.trim()) {
      showToast('Renseignez au moins le nom ou le secteur', 'error'); return
    }
    setGenLoading(true); setGenStep(0)
    let s = 0
    const iv = setInterval(() => { s = Math.min(s+1, GEN_STEPS.length-1); setGenStep(s) }, 1800)
    try {
      const res = await fetch('/api/generer-management/generer-competitorspy-auto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: name, sector, activityType, region, objectives, description: context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const { result } = data
      const newId = uid()
      // Map generated competitors to our format
      const competitors = (result.competitors || []).map(c => ({
        id: uid(), name: c.name, url: c.url || '', notes: c.notes || '', positioning: c.positioning || '',
      }))

      const record = {
        id: newId, name: result.reportName || name,
        context: result.context || context,
        myCompany: result.myCompany || name,
        sector, activityType, region, objectives,
        period: newReport.period,
        competitors, watchCategories: result.watchCategories || Object.keys(CATEGORY_META),
        createdAt: new Date().toISOString(),
        generatedByAI: true,
        aiResult: {
          threat_score:       result.threat_score,
          executive_summary:  result.executive_summary,
          competitors:        result.competitors || [],
          market_signals:     result.market_signals || [],
          competitive_matrix: result.competitive_matrix || {},
          action_plan:        result.action_plan || [],
          watch_next:         result.watch_next || '',
        },
      }

      const updated = [...reports, record]
      setReports(updated); persist(updated)
      setActiveId(newId)
      setAiResult(record.aiResult)
      setActiveView('report')
      setActiveComp(0)
      setShowForm(false)
      setNewReport(DEFAULT_REPORT())
      showToast(`✦ ${competitors.length} concurrents identifiés`)
    } catch (err) { showToast(err.message, 'error') }
    finally { clearInterval(iv); setGenLoading(false) }
  }

  // Manual create
  const createManual = () => {
    if (!newReport.name.trim()) return
    const record = { ...newReport, id: uid(), createdAt: new Date().toISOString(), aiResult: null }
    const updated = [...reports, record]
    setReports(updated); persist(updated)
    setActiveId(record.id); setAiResult(null); setActiveView('setup')
    setShowForm(false); setNewReport(DEFAULT_REPORT())
    showToast(`Rapport "${record.name}" créé`)
  }

  // ── AI ANALYSIS (Mode 2) ───────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (!active) return
    const valids = (active.competitors||[]).filter(c => c.name.trim())
    if (valids.length === 0) { showToast('Ajoutez au moins un concurrent', 'error'); return }
    setAiLoading(true); setActiveView('report'); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-competitorspy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: active.name, context: active.context, myCompany: active.myCompany,
          period: active.period, competitors: valids, watchCategories: active.watchCategories,
          projectName: project?.name||'', projectTag: project?.tag||'',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiResult(data.result)
      updateActive({ aiResult: data.result })
      showToast('Rapport d\'analyse généré')
    } catch (err) { showToast(err.message, 'error'); setActiveView('setup') }
    setAiLoading(false)
  }

  // ── EXPORT ─────────────────────────────────────────────────────────────────
  const exportJSON = () => {
    if (!active) return
    const payload = { ...active, exportedAt: new Date().toISOString(), exportVersion: '1.0', tool: 'CompetitorSpy' }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `CompetitorSpy_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); showToast('Rapport exporté')
  }

  // ── IMPORT ─────────────────────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.name && !data.competitors) throw new Error('Format invalide')
        const record = { ...data, id: uid(), importedAt: new Date().toISOString(),
          competitors: (data.competitors||[]).map(c => ({ ...c, id: uid() })) }
        const updated = [...reports, record]
        setReports(updated); persist(updated)
        setActiveId(record.id); setAiResult(record.aiResult||null)
        setActiveView(record.aiResult ? 'report' : 'setup')
        showToast(`"${record.name}" importé`)
      } catch { showToast('Fichier JSON invalide', 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getThreatColor = (s) => {
    if (!s) return THREAT_COLORS.yellow
    if (s >= 4.5) return THREAT_COLORS.red
    if (s >= 3.5) return THREAT_COLORS.orange
    if (s >= 2.5) return THREAT_COLORS.yellow
    if (s >= 1.5) return THREAT_COLORS.teal
    return THREAT_COLORS.green
  }

  const validComps = (active?.competitors||[]).filter(c => c.name.trim())

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --bg:#0a0a0f; --s1:#111118; --s2:#18181f; --s3:#1e1e28;
          --b1:rgba(255,255,255,.06); --b2:rgba(255,255,255,.11); --b3:rgba(255,255,255,.17);
          --tx:#f0eff5; --mu:#6b6a7a; --mu2:#9896aa;
          --acc:#6366f1; --acc2:#818cf8;
          --spy:#f472b6; --spy2:rgba(244,114,182,.08);
          --gen:#a78bfa;
        }
        body { background:var(--bg); color:var(--tx); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping  { 75%,100%{transform:scale(1.6);opacity:0} }
        .fade-up { animation:fadeUp .3s ease both; }

        /* ── TOP BAR ── */
        .tb { height:54px; background:var(--s1); border-bottom:1px solid var(--b1); display:flex; align-items:center; padding:0 16px; gap:10px; position:sticky; top:0; z-index:200; }
        .back { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px; background:var(--s2); border:1px solid var(--b2); color:var(--mu2); font-family:'Geist Mono',monospace; font-size:10px; cursor:pointer; transition:all .15s; }
        .back:hover { color:var(--tx); border-color:var(--b3); }
        .tb-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .tb-proj  { font-size:10px; color:var(--mu); font-family:'Geist Mono',monospace; }
        .tb-right { margin-left:auto; display:flex; gap:6px; align-items:center; }
        .btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:.04em; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; }
        .btn:hover { color:var(--tx); border-color:var(--b3); }
        .btn.p   { background:var(--acc); border-color:var(--acc); color:#fff; }
        .btn.p:hover { background:#4f52d8; }
        .btn.spy { background:var(--spy2); border-color:rgba(244,114,182,.3); color:var(--spy); }
        .btn.spy:hover { background:rgba(244,114,182,.15); }
        .btn.gen { background:rgba(167,139,250,.1); border-color:rgba(167,139,250,.3); color:var(--gen); }
        .btn.gen:hover { background:rgba(167,139,250,.18); }
        .btn:disabled { opacity:.35; cursor:not-allowed; }
        .view-tabs { display:flex; gap:2px; background:var(--s2); border-radius:6px; padding:2px; border:1px solid var(--b1); }
        .vt { padding:4px 12px; border-radius:4px; font-size:10px; font-family:'Geist Mono',monospace; cursor:pointer; border:none; background:none; color:var(--mu2); transition:all .15s; }
        .vt.on { background:var(--s3); color:var(--tx); }

        /* ── LAYOUT ── */
        .layout { display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 54px); overflow:hidden; }

        /* ── LEFT ── */
        .left { background:var(--s1); border-right:1px solid var(--b1); display:flex; flex-direction:column; overflow:hidden; }
        .ph { padding:13px 14px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .pl { font-size:9px; color:var(--mu); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .plist { flex:1; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:2px; }
        .ritem { padding:9px 11px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; position:relative; }
        .ritem:hover { background:var(--s2); }
        .ritem.on { background:rgba(244,114,182,.06); border-color:rgba(244,114,182,.2); }
        .rname { font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px; }
        .rmeta { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; margin-top:2px; }
        .rdel  { opacity:0; position:absolute; top:7px; right:8px; background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; padding:2px 4px; }
        .ritem:hover .rdel { opacity:1; }
        .ai-badge { font-size:8px; padding:1px 5px; border-radius:3px; background:rgba(167,139,250,.15); color:var(--gen); border:1px solid rgba(167,139,250,.3); font-family:'Geist Mono',monospace; font-weight:700; }
        .spy-badge { font-size:8px; padding:1px 5px; border-radius:3px; background:var(--spy2); color:var(--spy); border:1px solid rgba(244,114,182,.3); font-family:'Geist Mono',monospace; font-weight:700; }
        .sidebar-btns { padding:10px; border-top:1px solid var(--b1); display:flex; flex-direction:column; gap:5px; }
        .inp { width:100%; background:var(--bg); border:1px solid var(--b2); border-radius:5px; padding:7px 9px; font-family:'Syne',sans-serif; font-size:11px; color:var(--tx); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--spy); }
        .inp::placeholder { color:var(--mu); }
        textarea.inp { resize:vertical; min-height:56px; }
        .flabel { font-size:9px; color:var(--mu); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:2px; display:block; }
        select.inp { appearance:none; cursor:pointer; }
        .pills { display:flex; flex-wrap:wrap; gap:4px; }
        .pill { padding:3px 8px; border-radius:4px; font-size:9px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--b1); background:var(--s2); color:var(--mu2); transition:all .15s; }
        .pill.on { background:var(--spy2); border-color:rgba(244,114,182,.35); color:var(--spy); }
        .mode-toggle { display:flex; gap:2px; background:var(--s2); border:1px solid var(--b1); border-radius:6px; padding:2px; }
        .mode-btn { flex:1; padding:6px 8px; border-radius:4px; font-family:'Geist Mono',monospace; font-size:9px; cursor:pointer; border:none; background:none; color:var(--mu2); transition:all .15s; text-align:center; }
        .mode-btn.on { background:var(--s3); color:var(--tx); box-shadow:0 1px 4px rgba(0,0,0,.3); }
        .mode-btn.ai-m.on { color:var(--gen); background:rgba(167,139,250,.12); }

        /* ── CENTER ── */
        .center { overflow-y:auto; display:flex; flex-direction:column; background:var(--bg); }

        /* Gen loading */
        .gen-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:500px; gap:22px; }
        .gen-orb { position:relative; width:80px; height:80px; }
        .gorb-r  { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(244,114,182,.2); animation:ping 1.4s ease infinite; }
        .gorb-r2 { position:absolute; inset:10px; border-radius:50%; border:2px solid rgba(244,114,182,.1); animation:ping 1.4s ease infinite; animation-delay:.4s; }
        .gorb-c  { position:absolute; inset:0; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(244,114,182,.08); border:2px solid rgba(244,114,182,.3); font-size:30px; }
        .gen-steps { max-width:300px; width:100%; display:flex; flex-direction:column; gap:5px; }
        .gstep { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; transition:all .35s; border:1px solid transparent; }
        .gstep.a  { background:rgba(244,114,182,.07); border-color:rgba(244,114,182,.2); }
        .gstep.d  { opacity:.45; }
        .gstep.f  { opacity:.2; }
        .gstep-dot { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:10px; }

        /* ── SETUP PANEL ── */
        .setup-area { padding:20px; display:flex; flex-direction:column; gap:18px; }
        .card { background:var(--s1); border:1px solid var(--b1); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:12px; }
        .card-title { font-size:9px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:7px; }
        .ctdot { width:5px; height:5px; border-radius:50%; background:var(--spy); }
        .setup-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media(max-width:900px){ .setup-grid{ grid-template-columns:1fr; } }
        .period-row { display:flex; gap:5px; }
        .ptab { flex:1; padding:6px; border-radius:6px; text-align:center; font-size:10px; font-family:'Geist Mono',monospace; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); cursor:pointer; transition:all .15s; }
        .ptab.on { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.3); color:var(--acc2); }
        .cats-grid { display:flex; flex-wrap:wrap; gap:5px; }
        .cat-chip { display:flex; align-items:center; gap:5px; padding:5px 10px; border-radius:7px; font-size:10px; font-family:'Geist Mono',monospace; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); cursor:pointer; transition:all .15s; }
        .cat-chip.on { background:var(--spy2); border-color:rgba(244,114,182,.35); color:var(--spy); }
        .comp-card { background:var(--s2); border:1px solid var(--b1); border-radius:9px; padding:12px; display:flex; flex-direction:column; gap:8px; transition:border-color .15s; }
        .comp-card.sel { border-color:rgba(244,114,182,.4); }
        .comp-header { display:flex; align-items:center; gap:7px; }
        .comp-num { width:20px; height:20px; border-radius:5px; background:var(--spy2); color:var(--spy); font-size:10px; font-family:'Geist Mono',monospace; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0; }
        .comp-del { background:none; border:none; color:var(--mu); cursor:pointer; font-size:11px; padding:2px 4px; border-radius:3px; transition:color .15s; }
        .comp-del:hover { color:#f87171; }
        .comp-fields { display:grid; grid-template-columns:1fr 1fr; gap:7px; }

        /* ── REPORT PANEL ── */
        .report-area { padding:18px; display:flex; flex-direction:column; gap:18px; }
        .report-header { background:var(--s1); border:1px solid var(--b1); border-radius:10px; padding:16px 20px; display:flex; gap:18px; align-items:center; }
        .threat-big { font-family:'Instrument Serif',serif; font-size:48px; font-style:italic; line-height:1; }
        .threat-sub { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; margin-top:4px; }
        .exec-sum { flex:1; font-size:12px; line-height:1.75; color:var(--mu2); }
        .sec-title { font-size:9px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:8px; }
        .sec-line  { flex:1; height:1px; background:var(--b1); }
        .comp-tabs { display:flex; gap:5px; flex-wrap:wrap; }
        .ctab { padding:6px 12px; border-radius:7px; font-size:10px; font-family:'Geist Mono',monospace; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); cursor:pointer; transition:all .15s; display:flex; align-items:center; gap:6px; }
        .ctab.on { background:var(--spy2); border-color:rgba(244,114,182,.3); color:var(--spy); }
        .cscore { font-size:9px; padding:1px 6px; border-radius:3px; font-weight:700; }
        .comp-detail { background:var(--s1); border:1px solid var(--b1); border-radius:10px; overflow:hidden; }
        .cd-header { padding:14px 18px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .cd-name { font-family:'Instrument Serif',serif; font-size:19px; font-style:italic; }
        .cd-status { font-size:9px; font-family:'Geist Mono',monospace; padding:3px 9px; border-radius:20px; background:var(--s2); color:var(--mu2); border:1px solid var(--b2); }
        .cd-headline { padding:12px 18px; background:var(--s2); border-bottom:1px solid var(--b1); font-size:12px; color:var(--mu2); font-style:italic; }
        .cd-body { padding:16px 18px; display:flex; flex-direction:column; gap:14px; }
        .cat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
        @media(max-width:900px){ .cat-grid{ grid-template-columns:1fr 1fr; } }
        .cat-card { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px; display:flex; flex-direction:column; gap:5px; }
        .cat-card-head { display:flex; align-items:center; justify-content:space-between; }
        .cat-name { font-size:9px; font-family:'Geist Mono',monospace; color:var(--mu2); display:flex; align-items:center; gap:4px; }
        .cat-imp  { font-size:8px; font-family:'Geist Mono',monospace; padding:1px 6px; border-radius:3px; font-weight:700; }
        .cat-sig  { font-size:11px; color:var(--tx); line-height:1.5; }
        .cat-trend{ font-size:10px; font-family:'Geist Mono',monospace; color:var(--mu); }
        .sw-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .sw-title { font-size:9px; font-family:'Geist Mono',monospace; letter-spacing:.08em; text-transform:uppercase; color:var(--mu2); margin-bottom:5px; }
        .sw-item { display:flex; gap:7px; align-items:flex-start; font-size:11px; color:var(--mu2); line-height:1.5; padding:3px 0; }
        .sw-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; margin-top:5px; }
        .next-move { background:var(--spy2); border:1px solid rgba(244,114,182,.18); border-radius:7px; padding:10px 14px; }
        .nm-label { font-size:9px; font-family:'Geist Mono',monospace; color:var(--spy); letter-spacing:.06em; text-transform:uppercase; margin-bottom:5px; }
        .nm-text  { font-size:11px; color:var(--mu2); line-height:1.6; }
        .signals-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
        @media(max-width:900px){ .signals-grid{ grid-template-columns:1fr; } }
        .sig-card { background:var(--s1); border:1px solid var(--b1); border-radius:8px; padding:12px; display:flex; gap:10px; }
        .sig-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:4px; }
        .sig-title{ font-size:11px; font-weight:700; margin-bottom:3px; }
        .sig-desc { font-size:11px; color:var(--mu2); line-height:1.6; }
        .sig-urg  { font-size:9px; font-family:'Geist Mono',monospace; color:var(--mu); margin-top:5px; }
        .mtrx-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
        .mtrx-cell { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; }
        .mtrx-role { font-size:9px; font-family:'Geist Mono',monospace; letter-spacing:.06em; text-transform:uppercase; color:var(--mu); margin-bottom:3px; }
        .mtrx-name { font-size:12px; font-weight:700; }
        .gaps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
        @media(max-width:900px){ .gaps-grid{ grid-template-columns:1fr; } }
        .gap-card  { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; }
        .gap-title { font-size:9px; font-family:'Geist Mono',monospace; letter-spacing:.06em; text-transform:uppercase; margin-bottom:7px; }
        .gap-item  { font-size:11px; color:var(--mu2); line-height:1.5; padding:2px 0; display:flex; gap:6px; }
        .action-list { display:flex; flex-direction:column; gap:8px; }
        .action-item { background:var(--s1); border:1px solid var(--b1); border-radius:8px; padding:12px 14px; display:flex; gap:12px; }
        .action-num  { width:26px; height:26px; border-radius:7px; background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.25); color:var(--acc2); font-family:'Geist Mono',monospace; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .action-title { font-size:12px; font-weight:600; margin-bottom:3px; }
        .action-rat   { font-size:11px; color:var(--mu2); line-height:1.6; margin-bottom:5px; }
        .action-tags  { display:flex; gap:5px; flex-wrap:wrap; }
        .action-tag   { font-size:9px; font-family:'Geist Mono',monospace; padding:1px 7px; border-radius:3px; background:var(--s2); border:1px solid var(--b2); color:var(--mu2); }
        .kpis-list { display:flex; flex-direction:column; gap:5px; }
        .kpi-item  { display:flex; gap:8px; align-items:flex-start; padding:7px 10px; background:var(--s2); border-radius:5px; border:1px solid var(--b1); font-size:11px; color:var(--tx); line-height:1.6; }
        .kpi-b { font-family:'Geist Mono',monospace; font-size:9px; color:var(--mu); padding-top:2px; flex-shrink:0; }
        .watch-box { background:rgba(99,102,241,.04); border:1px solid rgba(99,102,241,.18); border-radius:8px; padding:14px 18px; }
        .watch-label { font-size:9px; font-family:'Geist Mono',monospace; color:var(--acc2); letter-spacing:.08em; text-transform:uppercase; margin-bottom:7px; }
        .watch-text  { font-size:12px; color:var(--mu2); line-height:1.7; }
        .ai-loading-r { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:400px; gap:14px; }
        .spinner { width:24px; height:24px; border:2px solid var(--b2); border-top-color:var(--spy); border-radius:50%; animation:spin .7s linear infinite; }
        .spinner-sm { width:13px; height:13px; border:2px solid var(--b2); border-top-color:var(--spy); border-radius:50%; animation:spin .7s linear infinite; }
        .empty-c { display:flex; align-items:center; justify-content:center; flex:1; min-height:400px; }
        .empty-inner { text-align:center; padding:60px 40px; }
        .empty-ico { font-size:44px; opacity:.18; margin-bottom:14px; }
        .toast { position:fixed; bottom:20px; right:20px; z-index:999; background:var(--s2); border:1px solid var(--b2); border-radius:7px; padding:10px 16px; font-size:12px; display:flex; align-items:center; gap:7px; box-shadow:0 8px 28px rgba(0,0,0,.5); animation:fadeUp .2s ease; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info  { border-color:rgba(99,102,241,.25); }
        @media(max-width:700px){ .layout{ grid-template-columns:1fr; } .left{ display:none; } }
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport}/>

      <div style={{ minHeight:'100vh' }}>

        {/* ── TOPBAR ── */}
        <header className="tb">
          <button className="back" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="tb-title">CompetitorSpy 🔍</div>
            {project && <div className="tb-proj">{project.name}</div>}
          </div>
          <div className="tb-right">
            {active && (
              <>
                <div className="view-tabs">
                  <button className={`vt ${activeView==='setup'?'on':''}`} onClick={() => setActiveView('setup')}>Configuration</button>
                  <button className={`vt ${activeView==='report'?'on':''}`} onClick={() => setActiveView('report')} disabled={!aiResult && !aiLoading}>Rapport</button>
                </div>
                <button className="btn" onClick={exportJSON}>↓ JSON</button>
                <button className="btn spy" onClick={runAnalysis} disabled={aiLoading}>
                  {aiLoading ? <><span className="spinner-sm"/>Analyse…</> : '🔍 Analyser'}
                </button>
              </>
            )}
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
          </div>
        </header>

        <div className="layout">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="left">
            <div className="ph"><span className="pl">Rapports ({reports.length})</span></div>
            <div className="plist">
              {reports.length === 0 && (
                <div style={{ padding:'28px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:32, opacity:.15, marginBottom:10 }}>🔍</div>
                  <div style={{ fontSize:11, color:'var(--mu)' }}>Créez votre premier rapport</div>
                </div>
              )}
              {reports.map(r => {
                const compCount = (r.competitors||[]).filter(c=>c.name).length
                const ts = r.aiResult?.threat_score
                const tc = ts ? getThreatColor(ts) : null
                return (
                  <div key={r.id} className={`ritem ${activeId===r.id?'on':''}`} onClick={() => selectReport(r)}>
                    <button className="rdel" onClick={e=>{e.stopPropagation();deleteReport(r.id)}}>✕</button>
                    <div className="rname">
                      {r.name}
                      {r.generatedByAI && <span className="ai-badge">IA</span>}
                      {r.aiResult && <span className="spy-badge">✓ veille</span>}
                    </div>
                    <div className="rmeta">
                      {r.sector && `${r.sector} · `}
                      {compCount} concurrent(s)
                      {ts && <span style={{ color:tc, marginLeft:4 }}>⬡{ts.toFixed(1)}</span>}
                    </div>
                    <div className="rmeta">{new Date(r.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}{r.importedAt && ' · importé'}</div>
                  </div>
                )
              })}
            </div>

            {/* ── New form / mode toggle ── */}
            {showForm ? (
              <div style={{ padding:10, borderTop:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:8 }}>
                <div className="mode-toggle">
                  <button className={`mode-btn ai-m ${formMode==='ai'?'on':''}`} onClick={() => setFormMode('ai')}>✦ IA Auto</button>
                  <button className={`mode-btn ${formMode==='manual'?'on':''}`} onClick={() => setFormMode('manual')}>✎ Manuel</button>
                </div>

                {formMode === 'ai' ? (
                  <>
                    <div>
                      <label className="flabel">Nom du projet *</label>
                      <input className="inp" placeholder="Ex: Sumuria RH" value={newReport.name} onChange={e=>setNewReport(p=>({...p,name:e.target.value}))} autoFocus/>
                    </div>
                    <div>
                      <label className="flabel">Secteur</label>
                      <div className="pills" style={{ marginBottom:4 }}>
                        {SECTORS.slice(0,6).map(s => <button key={s} className={`pill ${newReport.sector===s?'on':''}`} onClick={() => setNewReport(p=>({...p,sector:p.sector===s?'':s}))}>{s}</button>)}
                      </div>
                      <input className="inp" placeholder="Ou tapez…" value={newReport.sector} onChange={e=>setNewReport(p=>({...p,sector:e.target.value}))}/>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      <div>
                        <label className="flabel">Type activité</label>
                        <div className="pills">
                          {ACTIVITY_TYPES.slice(0,4).map(t => <button key={t} className={`pill ${newReport.activityType===t?'on':''}`} onClick={() => setNewReport(p=>({...p,activityType:p.activityType===t?'':t}))}>{t}</button>)}
                        </div>
                      </div>
                      <div>
                        <label className="flabel">Région</label>
                        <div className="pills">
                          {REGIONS.slice(0,4).map(r => <button key={r} className={`pill ${newReport.region===r?'on':''}`} onClick={() => setNewReport(p=>({...p,region:p.region===r?'':r}))}>{r.split(' ')[0]}</button>)}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="flabel">Objectifs</label>
                      <input className="inp" placeholder="Croissance, expansion…" value={newReport.objectives} onChange={e=>setNewReport(p=>({...p,objectives:e.target.value}))}/>
                    </div>
                    <div>
                      <label className="flabel">Contexte additionnel</label>
                      <textarea className="inp" rows={2} placeholder="Description libre de votre activité, cibles…" value={newReport.context} onChange={e=>setNewReport(p=>({...p,context:e.target.value}))}/>
                    </div>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn gen" style={{ flex:1, justifyContent:'center' }} onClick={generateAI} disabled={genLoading || (!newReport.name.trim() && !newReport.sector.trim())}>
                        {genLoading ? <><span className="spinner-sm"/>…</> : '✦ Identifier compétiteurs'}
                      </button>
                      <button className="btn" onClick={() => { setShowForm(false); setNewReport(DEFAULT_REPORT()) }}>✕</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="flabel">Nom du rapport *</label>
                      <input className="inp" placeholder="Ex: Veille Q2 2025" value={newReport.name} onChange={e=>setNewReport(p=>({...p,name:e.target.value}))} autoFocus onKeyDown={e=>e.key==='Enter'&&createManual()}/>
                    </div>
                    <div>
                      <label className="flabel">Notre société</label>
                      <input className="inp" placeholder="Nom de votre entreprise" value={newReport.myCompany} onChange={e=>setNewReport(p=>({...p,myCompany:e.target.value}))}/>
                    </div>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn p" style={{ flex:1, justifyContent:'center' }} onClick={createManual}>Créer</button>
                      <button className="btn" onClick={() => { setShowForm(false); setNewReport(DEFAULT_REPORT()) }}>✕</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="sidebar-btns">
                <button className="btn gen" style={{ justifyContent:'center' }} onClick={() => { setShowForm(true); setFormMode('ai') }}>✦ IA Auto</button>
                <button className="btn" style={{ justifyContent:'center' }} onClick={() => { setShowForm(true); setFormMode('manual') }}>✎ Manuel</button>
              </div>
            )}
          </aside>

          {/* ── CENTER ── */}
          <main className="center">

            {/* Generation loading */}
            {genLoading ? (
              <div className="gen-loading fade-up">
                <div className="gen-orb">
                  <div className="gorb-r"/> <div className="gorb-r2"/>
                  <div className="gorb-c">🔍</div>
                </div>
                <div className="gen-steps">
                  {GEN_STEPS.map((s, i) => (
                    <div key={i} className={`gstep ${i===genStep?'a':i<genStep?'d':'f'}`}>
                      <div className="gstep-dot" style={{ background: i<genStep?'#22d3a5':i===genStep?'var(--spy)':'rgba(255,255,255,.07)' }}>
                        {i<genStep ? '✓' : i===genStep ? <div style={{ width:10,height:10,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/> : <div style={{ width:6,height:6,borderRadius:'50%',background:'rgba(255,255,255,.15)' }}/>}
                      </div>
                      <span style={{ fontSize:11, color:i===genStep?'var(--spy)':'rgba(255,255,255,.35)', fontFamily:'Geist Mono,monospace' }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>Intelligence concurrentielle · Claude</div>
              </div>
            ) : !active ? (
              <div className="empty-c">
                <div className="empty-inner fade-up">
                  <div className="empty-ico">🔍</div>
                  <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic', marginBottom:8 }}>CompetitorSpy</div>
                  <div style={{ fontSize:12, color:'var(--mu)', lineHeight:1.7, maxWidth:320, margin:'0 auto 20px' }}>
                    Décrivez votre projet — l'IA identifie automatiquement vos compétiteurs clés et évalue leur niveau de menace.
                  </div>
                  <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                    <button className="btn gen" onClick={() => { setShowForm(true); setFormMode('ai') }}>✦ IA Auto</button>
                    <button className="btn" onClick={() => { setShowForm(true); setFormMode('manual') }}>✎ Saisir manuellement</button>
                    <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
                  </div>
                </div>
              </div>

            ) : activeView === 'setup' ? (
              /* ══ SETUP VIEW ══ */
              <div className="setup-area fade-up">
                <div>
                  <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic' }}>{active.name}</div>
                  {active.generatedByAI && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background:'rgba(167,139,250,.12)', color:'var(--gen)', border:'1px solid rgba(167,139,250,.25)', fontFamily:'Geist Mono,monospace', display:'inline-block', marginTop:5 }}>✦ Généré par IA · modifiable</span>}
                </div>

                <div className="setup-grid">
                  {/* Infos générales */}
                  <div className="card">
                    <div className="card-title"><div className="ctdot"/>Informations générales</div>
                    <div><label className="flabel">Notre société</label><input className="inp" placeholder="Votre entreprise" value={active.myCompany||''} onChange={e=>updateActive({myCompany:e.target.value})}/></div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div><label className="flabel">Secteur</label><input className="inp" placeholder="SaaS, Retail…" value={active.sector||''} onChange={e=>updateActive({sector:e.target.value})}/></div>
                      <div><label className="flabel">Région</label><input className="inp" placeholder="Afrique, Europe…" value={active.region||''} onChange={e=>updateActive({region:e.target.value})}/></div>
                    </div>
                    <div><label className="flabel">Contexte stratégique</label><textarea className="inp" rows={3} value={active.context||''} onChange={e=>updateActive({context:e.target.value})} placeholder="Marchés, enjeux, objectifs…"/></div>
                    <div><label className="flabel">Période de veille</label>
                      <div className="period-row">
                        {PERIOD_OPTIONS.map(p => <button key={p.value} className={`ptab ${active.period===p.value?'on':''}`} onClick={() => updateActive({period:p.value})}>{p.label}</button>)}
                      </div>
                    </div>
                  </div>

                  {/* Axes de surveillance */}
                  <div className="card">
                    <div className="card-title"><div className="ctdot"/>Axes de surveillance ({(active.watchCategories||[]).length}/{Object.keys(CATEGORY_META).length})</div>
                    <div className="cats-grid">
                      {Object.entries(CATEGORY_META).map(([key, meta]) => {
                        const isOn = (active.watchCategories||[]).includes(key)
                        return <button key={key} className={`cat-chip ${isOn?'on':''}`} onClick={() => toggleCat(key)}><span>{meta.icon}</span><span>{meta.label}</span></button>
                      })}
                    </div>
                  </div>
                </div>

                {/* Concurrents */}
                <div className="card">
                  <div className="card-title" style={{ justifyContent:'space-between' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:7 }}><div className="ctdot"/>Concurrents ({validComps.length})</span>
                    <button className="btn" style={{ padding:'3px 9px', fontSize:9 }} onClick={addComp}>+ Ajouter</button>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    {(active.competitors||[]).map((comp, idx) => (
                      <div key={comp.id} className={`comp-card ${activeComp===idx?'sel':''}`} onClick={() => setActiveComp(idx)}>
                        <div className="comp-header">
                          <div className="comp-num">{idx+1}</div>
                          <input className="inp" placeholder={`Concurrent ${idx+1}`} value={comp.name} onClick={e=>e.stopPropagation()} onChange={e=>updateComp(idx,{name:e.target.value})} style={{ flex:1 }}/>
                          {(active.competitors||[]).length > 1 && <button className="comp-del" onClick={e=>{e.stopPropagation();removeComp(idx)}}>✕</button>}
                        </div>
                        <div className="comp-fields">
                          <div><label className="flabel">Site web</label><input className="inp" placeholder="https://…" value={comp.url||''} onChange={e=>updateComp(idx,{url:e.target.value})}/></div>
                          <div><label className="flabel">Positionnement</label><input className="inp" placeholder="Leader marché…" value={comp.positioning||''} onChange={e=>updateComp(idx,{positioning:e.target.value})}/></div>
                          <div style={{ gridColumn:'span 2' }}><label className="flabel">Notes / signaux connus</label><input className="inp" placeholder="Infos connues, financement…" value={comp.notes||''} onChange={e=>updateComp(idx,{notes:e.target.value})}/></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn spy" style={{ alignSelf:'flex-end' }} onClick={runAnalysis} disabled={aiLoading || validComps.length===0}>
                    {aiLoading ? <><span className="spinner-sm"/>Analyse…</> : '🔍 Lancer l\'analyse IA'}
                  </button>
                </div>
              </div>

            ) : aiLoading ? (
              <div className="ai-loading-r">
                <div className="spinner"/>
                <div style={{ fontSize:13, color:'var(--mu2)', fontFamily:'Geist Mono,monospace' }}>Analyse concurrentielle en cours…</div>
                <div style={{ fontSize:11, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>Claude scanne les signaux et génère votre rapport</div>
              </div>

            ) : aiResult ? (
              /* ══ REPORT VIEW ══ */
              <div className="report-area fade-up">

                {/* Header */}
                <div className="report-header">
                  <div style={{ textAlign:'center', flexShrink:0 }}>
                    <div className="threat-big" style={{ color:getThreatColor(aiResult.threat_score) }}>{(aiResult.threat_score||3).toFixed(1)}</div>
                    <div className="threat-sub">MENACE /5</div>
                  </div>
                  <div style={{ width:1, height:56, background:'var(--b1)', flexShrink:0 }}/>
                  <div className="exec-sum">{aiResult.executive_summary}</div>
                </div>

                {/* Competitor tabs */}
                {aiResult.competitors?.length > 0 && (
                  <div>
                    <div className="sec-title">Analyse par concurrent <div className="sec-line"/></div>
                    <div className="comp-tabs" style={{ marginBottom:10 }}>
                      {aiResult.competitors.map((c,i) => {
                        const tc = getThreatColor(c.threat_score)
                        return (
                          <button key={i} className={`ctab ${activeComp===i?'on':''}`} onClick={() => setActiveComp(i)}>
                            {c.name}
                            <span className="cscore" style={{ background:`${tc}18`, color:tc }}>⬡{(c.threat_score||3).toFixed(1)}</span>
                          </button>
                        )
                      })}
                    </div>
                    {(() => {
                      const comp = aiResult.competitors[activeComp]; if (!comp) return null
                      const tc = getThreatColor(comp.threat_score)
                      return (
                        <div className="comp-detail">
                          <div className="cd-header">
                            <div>
                              <div className="cd-name">{comp.name}</div>
                            </div>
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              {comp.status && <span className="cd-status">{comp.status}</span>}
                              <span style={{ fontFamily:'Instrument Serif,serif', fontSize:22, fontStyle:'italic', color:tc }}>{(comp.threat_score||3).toFixed(1)}/5</span>
                            </div>
                          </div>
                          {comp.headline && <div className="cd-headline">"{comp.headline}"</div>}
                          <div className="cd-body">
                            {/* Categories */}
                            {comp.categories && Object.keys(comp.categories).length > 0 && (
                              <div>
                                <div style={{ fontSize:9, color:'var(--mu2)', fontFamily:'Geist Mono,monospace', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Signaux par axe</div>
                                <div className="cat-grid">
                                  {Object.entries(comp.categories).map(([catKey, catData]) => {
                                    const meta   = CATEGORY_META[catKey] || { icon:'◉', label:catKey, color:'var(--mu2)', bg:'var(--s3)' }
                                    const impCol = IMPACT_COLORS[catData.impact] || 'var(--mu2)'
                                    return (
                                      <div key={catKey} className="cat-card">
                                        <div className="cat-card-head">
                                          <span className="cat-name"><span style={{ color:meta.color }}>{meta.icon}</span>{meta.label}</span>
                                          {catData.impact && <span className="cat-imp" style={{ background:`${impCol}15`, color:impCol, border:`1px solid ${impCol}30` }}>{catData.impact}</span>}
                                        </div>
                                        <div className="cat-sig">{catData.signal}</div>
                                        {catData.trend && <div className="cat-trend">{TREND_ICONS[catData.trend]||'→'} {catData.trend}</div>}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            {/* SW */}
                            {((comp.strengths?.length > 0)||(comp.weaknesses?.length > 0)) && (
                              <div className="sw-grid">
                                <div>
                                  <div className="sw-title" style={{ color:'#f87171' }}>Forces</div>
                                  {(comp.strengths||[]).map((s,i) => <div key={i} className="sw-item"><div className="sw-dot" style={{ background:'#f87171' }}/>{s}</div>)}
                                </div>
                                <div>
                                  <div className="sw-title" style={{ color:'#34d399' }}>Faiblesses exploitables</div>
                                  {(comp.weaknesses||[]).map((w,i) => <div key={i} className="sw-item"><div className="sw-dot" style={{ background:'#34d399' }}/>{w}</div>)}
                                </div>
                              </div>
                            )}
                            {comp.next_move && (
                              <div className="next-move">
                                <div className="nm-label">🎯 Prochain mouvement probable</div>
                                <div className="nm-text">{comp.next_move}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Market signals */}
                {aiResult.market_signals?.length > 0 && (
                  <div>
                    <div className="sec-title">Signaux de marché <div className="sec-line"/></div>
                    <div className="signals-grid">
                      {aiResult.market_signals.map((sig, i) => {
                        const tc = { opportunite:'#34d399', menace:'#f87171', tendance:'#60a5fa', rupture:'#f472b6' }[sig.type] || 'var(--mu2)'
                        return (
                          <div key={i} className="sig-card">
                            <div className="sig-dot" style={{ background:tc }}/>
                            <div>
                              <div className="sig-title" style={{ color:tc }}>{sig.title}</div>
                              <div className="sig-desc">{sig.description}</div>
                              <div className="sig-urg">⏱ {sig.urgency}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Competitive matrix */}
                {aiResult.competitive_matrix && Object.keys(aiResult.competitive_matrix).length > 0 && (
                  <div>
                    <div className="sec-title">Matrice concurrentielle <div className="sec-line"/></div>
                    <div className="mtrx-grid">
                      {[{key:'leader',label:'Leader menaçant',color:'#f87171'},{key:'challenger',label:'Challenger',color:'#fb923c'},{key:'vulnerable',label:'Plus vulnérable',color:'#34d399'},{key:'wild_card',label:'Wild card',color:'#a78bfa'}].map(({key,label,color}) => (
                        <div key={key} className="mtrx-cell" style={{ borderColor:`${color}30` }}>
                          <div className="mtrx-role" style={{ color }}>{label}</div>
                          <div className="mtrx-name">{aiResult.competitive_matrix[key]||'—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gaps analysis */}
                {aiResult.gaps_analysis && (
                  <div>
                    <div className="sec-title">Analyse différentielle <div className="sec-line"/></div>
                    <div className="gaps-grid">
                      {[
                        { key:'nos_avantages', label:'Nos avantages',     color:'#34d399', icon:'▲' },
                        { key:'nos_lacunes',   label:'Lacunes à combler', color:'#f87171', icon:'▼' },
                        { key:'white_spaces',  label:'Opportunités',      color:'#60a5fa', icon:'◎' },
                      ].map(({ key, label, color, icon }) => (
                        <div key={key} className="gap-card" style={{ borderColor:`${color}20` }}>
                          <div className="gap-title" style={{ color }}>{icon} {label}</div>
                          {(aiResult.gaps_analysis[key]||[]).map((item,i) => (
                            <div key={i} className="gap-item"><span style={{ color, flexShrink:0, fontSize:9, marginTop:2 }}>→</span>{item}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action plan */}
                {aiResult.action_plan?.length > 0 && (
                  <div>
                    <div className="sec-title">Plan d'action <div className="sec-line"/></div>
                    <div className="action-list">
                      {aiResult.action_plan.map((a,i) => (
                        <div key={i} className="action-item">
                          <div className="action-num">#{a.priority||i+1}</div>
                          <div>
                            <div className="action-title">{a.action}</div>
                            <div className="action-rat">{a.rationale}</div>
                            <div className="action-tags">
                              {a.timeline && <span className="action-tag">⏱ {a.timeline}</span>}
                              {a.owner    && <span className="action-tag">👤 {a.owner}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* KPIs */}
                {aiResult.kpis_to_track?.length > 0 && (
                  <div>
                    <div className="sec-title">KPIs à surveiller <div className="sec-line"/></div>
                    <div className="kpis-list">
                      {aiResult.kpis_to_track.map((k,i) => (
                        <div key={i} className="kpi-item">
                          <span className="kpi-b" style={{ color:'var(--spy)' }}>⬡</span>
                          <span>{k}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Watch next */}
                {aiResult.watch_next && (
                  <div>
                    <div className="sec-title">À surveiller <div className="sec-line"/></div>
                    <div className="watch-box">
                      <div className="watch-label">🔭 Prochaine période</div>
                      <div className="watch-text">{aiResult.watch_next}</div>
                    </div>
                  </div>
                )}

                <button className="btn spy" style={{ alignSelf:'flex-start' }} onClick={runAnalysis}>↺ Actualiser l'analyse</button>
              </div>
            ) : (
              <div className="empty-c">
                <div style={{ textAlign:'center', padding:'40px 24px' }}>
                  <div style={{ fontSize:36, opacity:.15, marginBottom:12 }}>🔍</div>
                  <div style={{ fontSize:12, color:'var(--mu)', lineHeight:1.7 }}>Configurez vos concurrents puis lancez l'analyse IA</div>
                </div>
              </div>
            )}
          </main>
        </div>

        {toast && (
          <div className={`toast ${toast.type||''}`}>
            {toast.type==='error'?'✕':'✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}