'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const CATEGORY_META = {
  pricing:    { label: 'Tarifs',      icon: '💰', color: '#f472b6', bg: 'rgba(244,114,182,.08)' },
  product:    { label: 'Produit',     icon: '🧩', color: '#60a5fa', bg: 'rgba(96,165,250,.08)'  },
  marketing:  { label: 'Marketing',   icon: '📣', color: '#fb923c', bg: 'rgba(251,146,60,.08)'  },
  social:     { label: 'Social',      icon: '📡', color: '#a78bfa', bg: 'rgba(167,139,250,.08)' },
  hiring:     { label: 'RH',          icon: '👥', color: '#34d399', bg: 'rgba(52,211,153,.08)'  },
  reputation: { label: 'Réputation',  icon: '⭐', color: '#facc15', bg: 'rgba(250,204,21,.08)'  },
}

const IMPACT_COLORS = {
  faible:   '#34d399',
  modéré:   '#facc15',
  fort:     '#fb923c',
  critique: '#f87171',
}

const TREND_ICONS = { hausse: '↑', baisse: '↓', stable: '→', incertain: '?' }

const THREAT_COLORS = {
  green:  '#34d399',
  teal:   '#2dd4bf',
  yellow: '#facc15',
  orange: '#fb923c',
  red:    '#f87171',
}

const PERIOD_OPTIONS = [
  { value: 'weekly',    label: 'Hebdomadaire' },
  { value: 'monthly',   label: 'Mensuelle'    },
  { value: 'quarterly', label: 'Trimestrielle' },
]

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const EMPTY_COMPETITOR = () => ({ id: uid(), name: '', url: '', notes: '' })

const DEFAULT_REPORT = () => ({
  id:          uid(),
  name:        '',
  context:     '',
  myCompany:   '',
  period:      'weekly',
  competitors: [EMPTY_COMPETITOR()],
  watchCategories: Object.keys(CATEGORY_META),
  createdAt:   new Date().toISOString(),
  aiResult:    null,
})

// ─── Component ────────────────────────────────────────────────────────────────
export default function CompetitorSpyPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,     setProject]     = useState(null)
  const [reports,     setReports]     = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newReport,   setNewReport]   = useState(DEFAULT_REPORT())
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState(null)
  const [activeView,  setActiveView]  = useState('setup') // 'setup' | 'report'
  const [activeComp,  setActiveComp]  = useState(0)
  const [toast,       setToast]       = useState(null)

  // ── Load ──
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
          if (last.aiResult) { setAiResult(last.aiResult); setActiveView('report') }
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
    setTimeout(() => setToast(null), 3000)
  }

  const active = reports.find(r => r.id === activeId) || null

  // ── CRUD ──
  const createReport = () => {
    if (!newReport.name.trim()) return
    const r = { ...newReport, id: uid(), createdAt: new Date().toISOString() }
    const updated = [...reports, r]
    setReports(updated)
    setActiveId(r.id)
    setAiResult(null)
    setActiveView('setup')
    persist(updated)
    setShowNewForm(false)
    setNewReport(DEFAULT_REPORT())
    showToast(`Rapport "${r.name}" créé`)
  }

  const deleteReport = (id) => {
    const updated = reports.filter(r => r.id !== id)
    setReports(updated)
    persist(updated)
    if (activeId === id) {
      const last = updated[updated.length - 1]
      setActiveId(last?.id || null)
      setAiResult(last?.aiResult || null)
      setActiveView(last?.aiResult ? 'report' : 'setup')
    }
    showToast('Rapport supprimé', 'info')
  }

  const updateActive = (patch) => {
    const updated = reports.map(r => r.id === activeId ? { ...r, ...patch } : r)
    setReports(updated)
    persist(updated)
  }

  // Competitor helpers
  const addCompetitor = () => updateActive({ competitors: [...(active?.competitors || []), EMPTY_COMPETITOR()] })
  const removeCompetitor = (idx) => {
    const list = [...(active?.competitors || [])]
    list.splice(idx, 1)
    updateActive({ competitors: list })
    if (activeComp >= list.length) setActiveComp(Math.max(0, list.length - 1))
  }
  const updateCompetitor = (idx, patch) => {
    const list = [...(active?.competitors || [])]
    list[idx] = { ...list[idx], ...patch }
    updateActive({ competitors: list })
  }
  const toggleCategory = (cat) => {
    const cur = active?.watchCategories || Object.keys(CATEGORY_META)
    const next = cur.includes(cat) ? cur.filter(c => c !== cat) : [...cur, cat]
    updateActive({ watchCategories: next })
  }

  // ── AI ──
  const runAI = async () => {
    if (!active || (active.competitors || []).filter(c => c.name.trim()).length === 0) {
      showToast('Ajoutez au moins un concurrent', 'error')
      return
    }
    setAiLoading(true)
    setActiveView('report')
    setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-competitorspy', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName:      active.name,
          context:         active.context,
          myCompany:       active.myCompany,
          period:          active.period,
          competitors:     (active.competitors || []).filter(c => c.name.trim()),
          watchCategories: active.watchCategories,
          projectName:     project?.name || '',
          projectTag:      project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateActive({ aiResult: data.result })
      showToast('Rapport généré')
    } catch (err) {
      showToast(err.message, 'error')
      setActiveView('setup')
    }
    setAiLoading(false)
  }

  const exportReport = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ report: active, result: aiResult }, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `CompetitorSpy_${active.name.replace(/\s+/g, '_')}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const getThreatColor = (score) => {
    if (!score) return THREAT_COLORS.yellow
    if (score >= 4.5) return THREAT_COLORS.red
    if (score >= 3.5) return THREAT_COLORS.orange
    if (score >= 2.5) return THREAT_COLORS.yellow
    if (score >= 1.5) return THREAT_COLORS.teal
    return THREAT_COLORS.green
  }

  const validCompetitors = (active?.competitors || []).filter(c => c.name.trim())

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:       #0a0a0f;
          --surface:  #111118;
          --surface2: #18181f;
          --surface3: #1e1e28;
          --border:   rgba(255,255,255,.07);
          --border2:  rgba(255,255,255,.12);
          --text:     #f0eff5;
          --muted:    #6b6a7a;
          --muted2:   #9896aa;
          --accent:   #6366f1;
          --accent2:  #818cf8;
          --spy:      #f472b6;
          --spy2:     rgba(244,114,182,.08);
        }
        body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        /* ── Layout ── */
        .root { min-height: 100vh; display: flex; flex-direction: column; }
        .topbar {
          height: 56px; background: var(--surface); border-bottom: 1px solid var(--border);
          display: flex; align-items: center; padding: 0 20px; gap: 12px;
          position: sticky; top: 0; z-index: 100;
        }
        .topbar-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .topbar-project { font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .topbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }
        .body { flex: 1; display: grid; grid-template-columns: 240px 1fr; height: calc(100vh - 56px); overflow: hidden; }

        /* ── Buttons ── */
        .btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 14px;
          border-radius: 6px; cursor: pointer; font-family: 'Geist Mono', monospace;
          font-size: 11px; letter-spacing: .04em; border: 1px solid var(--border2);
          background: var(--surface2); color: var(--muted2); transition: all .15s;
        }
        .btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .btn.primary:hover { background: #4f52d8; }
        .btn.spy-btn { background: var(--spy2); border-color: rgba(244,114,182,.3); color: var(--spy); }
        .btn.spy-btn:hover { background: rgba(244,114,182,.15); }
        .btn:disabled { opacity: .4; cursor: not-allowed; }
        .back-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px;
          border-radius: 6px; background: var(--surface2); border: 1px solid var(--border2);
          color: var(--muted2); font-family: 'Geist Mono', monospace; font-size: 11px;
          cursor: pointer; transition: all .15s;
        }
        .back-btn:hover { color: var(--text); }

        /* ── Left panel ── */
        .left-panel {
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .panel-header {
          padding: 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .panel-label { font-size: 10px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .panel-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
        .report-item {
          padding: 10px 12px; border-radius: 8px; cursor: pointer;
          border: 1px solid transparent; transition: all .15s;
        }
        .report-item:hover { background: var(--surface2); }
        .report-item.active { background: rgba(244,114,182,.07); border-color: rgba(244,114,182,.2); }
        .report-name { font-size: 12px; font-weight: 600; }
        .report-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 2px; }
        .report-del { opacity: 0; background: none; border: none; color: #f87171; cursor: pointer; font-size: 12px; float: right; padding: 2px; }
        .report-item:hover .report-del { opacity: 1; }

        /* ── Inputs ── */
        .input {
          width: 100%; background: var(--bg); border: 1px solid var(--border2);
          border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif;
          font-size: 12px; color: var(--text); outline: none; transition: border-color .15s;
        }
        .input:focus { border-color: var(--spy); }
        .input::placeholder { color: var(--muted); }
        textarea.input { resize: vertical; min-height: 56px; }
        .form-label { font-size: 10px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 4px; display: block; }
        .input-group { display: flex; flex-direction: column; gap: 4px; }

        /* ── Main content ── */
        .center-panel { overflow-y: auto; padding: 28px; display: flex; flex-direction: column; gap: 24px; }

        /* ── Setup view ── */
        .setup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) { .setup-grid { grid-template-columns: 1fr; } }
        .card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 14px;
        }
        .card-title {
          font-size: 11px; color: var(--muted2); letter-spacing: .1em;
          text-transform: uppercase; font-family: 'Geist Mono', monospace;
          display: flex; align-items: center; gap: 8px;
        }
        .card-title-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--spy); }

        /* ── Competitor cards ── */
        .competitors-list { display: flex; flex-direction: column; gap: 8px; }
        .competitor-card {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
          transition: border-color .15s;
        }
        .competitor-card.selected { border-color: rgba(244,114,182,.4); }
        .competitor-card-header { display: flex; align-items: center; gap: 8px; }
        .comp-num { width: 22px; height: 22px; border-radius: 6px; background: var(--spy2); color: var(--spy); font-size: 11px; font-family: 'Geist Mono',monospace; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
        .comp-name-input { flex: 1; }
        .comp-del-btn { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 12px; padding: 4px; border-radius: 4px; transition: color .15s; }
        .comp-del-btn:hover { color: #f87171; }
        .comp-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

        /* ── Categories ── */
        .categories-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .cat-chip {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px;
          border-radius: 8px; font-size: 11px; font-family: 'Geist Mono', monospace;
          border: 1px solid var(--border2); background: var(--surface2);
          color: var(--muted2); cursor: pointer; transition: all .15s;
        }
        .cat-chip.on { background: var(--spy2); border-color: rgba(244,114,182,.35); color: var(--spy); }

        /* ── Period tabs ── */
        .period-tabs { display: flex; gap: 6px; }
        .period-tab {
          flex: 1; padding: 8px; border-radius: 8px; text-align: center;
          font-size: 11px; font-family: 'Geist Mono', monospace;
          border: 1px solid var(--border2); background: var(--surface2);
          color: var(--muted2); cursor: pointer; transition: all .15s;
        }
        .period-tab.active { background: rgba(99,102,241,.12); border-color: rgba(99,102,241,.35); color: var(--accent2); }

        /* ── Report view ── */
        .report-header {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 20px; display: flex; gap: 20px; align-items: center;
        }
        .threat-gauge { text-align: center; flex-shrink: 0; }
        .threat-score { font-family: 'Instrument Serif', serif; font-size: 52px; font-style: italic; line-height: 1; }
        .threat-label-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
        .threat-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-family: 'Geist Mono',monospace; font-weight: 700; }
        .exec-summary { flex: 1; font-size: 13px; line-height: 1.75; color: var(--muted2); }
        .exec-summary strong { color: var(--text); }

        /* ── Competitor reports ── */
        .comp-report-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .comp-tab {
          padding: 7px 14px; border-radius: 8px; font-size: 11px;
          font-family: 'Geist Mono',monospace; border: 1px solid var(--border2);
          background: var(--surface2); color: var(--muted2); cursor: pointer; transition: all .15s;
          display: flex; align-items: center; gap: 8px;
        }
        .comp-tab.active { background: var(--spy2); border-color: rgba(244,114,182,.3); color: var(--spy); }
        .comp-tab-score { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; }

        /* ── Competitor detail ── */
        .comp-detail { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .comp-detail-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .comp-detail-name { font-family: 'Instrument Serif',serif; font-size: 20px; font-style: italic; }
        .comp-status { font-size: 10px; font-family: 'Geist Mono',monospace; padding: 4px 10px; border-radius: 20px; background: var(--surface2); color: var(--muted2); border: 1px solid var(--border2); }
        .comp-headline { padding: 14px 20px; background: var(--surface2); border-bottom: 1px solid var(--border); font-size: 13px; color: var(--muted2); font-style: italic; }
        .comp-detail-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

        /* Categories grid in report */
        .cat-signals-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        @media (max-width: 900px) { .cat-signals-grid { grid-template-columns: 1fr 1fr; } }
        .cat-signal-card {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px;
        }
        .cat-signal-header { display: flex; align-items: center; justify-content: space-between; }
        .cat-signal-name { font-size: 10px; font-family: 'Geist Mono',monospace; color: var(--muted2); }
        .cat-signal-impact { font-size: 9px; font-family: 'Geist Mono',monospace; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
        .cat-signal-text { font-size: 11px; color: var(--text); line-height: 1.5; }
        .cat-signal-trend { font-size: 10px; font-family: 'Geist Mono',monospace; color: var(--muted); }

        /* SW list */
        .sw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .sw-col-title { font-size: 10px; font-family: 'Geist Mono',monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--muted2); margin-bottom: 6px; }
        .sw-item { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: var(--muted2); line-height: 1.5; padding: 4px 0; }
        .sw-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }

        /* Next move */
        .next-move { background: rgba(244,114,182,.05); border: 1px solid rgba(244,114,182,.2); border-radius: 8px; padding: 12px 16px; font-size: 12px; color: var(--muted2); line-height: 1.6; }
        .next-move-label { font-size: 10px; font-family: 'Geist Mono',monospace; color: var(--spy); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 6px; }

        /* Market signals */
        .signals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 900px) { .signals-grid { grid-template-columns: 1fr; } }
        .signal-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 8px; padding: 14px; display: flex; gap: 12px;
        }
        .signal-type-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .signal-title { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
        .signal-desc { font-size: 11px; color: var(--muted2); line-height: 1.6; }
        .signal-urgency { font-size: 10px; font-family: 'Geist Mono',monospace; color: var(--muted); margin-top: 6px; }

        /* Competitive matrix */
        .matrix-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .matrix-cell { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
        .matrix-role { font-size: 10px; font-family: 'Geist Mono',monospace; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 4px; }
        .matrix-name { font-size: 13px; font-weight: 700; }

        /* Action plan */
        .action-list { display: flex; flex-direction: column; gap: 8px; }
        .action-item {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 8px; padding: 14px; display: flex; gap: 14px;
        }
        .action-num { width: 28px; height: 28px; border-radius: 8px; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.25); color: var(--accent2); font-family: 'Geist Mono',monospace; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .action-body { flex: 1; }
        .action-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
        .action-rationale { font-size: 11px; color: var(--muted2); line-height: 1.6; margin-bottom: 6px; }
        .action-tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .action-tag { font-size: 10px; font-family: 'Geist Mono',monospace; padding: 2px 8px; border-radius: 4px; background: var(--surface2); border: 1px solid var(--border2); color: var(--muted2); }

        /* Watch next */
        .watch-box { background: rgba(99,102,241,.05); border: 1px solid rgba(99,102,241,.2); border-radius: 10px; padding: 16px 20px; font-size: 13px; color: var(--muted2); line-height: 1.7; }
        .watch-label { font-size: 10px; font-family: 'Geist Mono',monospace; color: var(--accent2); letter-spacing: .1em; text-transform: uppercase; margin-bottom: 8px; }

        /* View tabs */
        .view-tabs { display: flex; gap: 4px; background: var(--surface2); border-radius: 8px; padding: 3px; border: 1px solid var(--border); }
        .view-tab { padding: 5px 14px; border-radius: 6px; font-size: 11px; font-family: 'Geist Mono',monospace; cursor: pointer; transition: all .15s; color: var(--muted2); border: none; background: none; }
        .view-tab.active { background: var(--surface3); color: var(--text); }

        /* Section headers */
        .section-title { font-size: 10px; color: var(--muted2); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono',monospace; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .section-line { flex: 1; height: 1px; background: var(--border); }

        /* Loading */
        .loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 80px 40px; }
        .spinner { width: 24px; height: 24px; border: 2px solid var(--border2); border-top-color: var(--spy); border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-txt { font-size: 13px; color: var(--muted2); font-family: 'Geist Mono',monospace; }

        /* Empty */
        .empty-cta { padding: 60px 40px; text-align: center; }
        .empty-icon { font-size: 40px; opacity: .25; margin-bottom: 14px; }
        .empty-txt { font-size: 13px; color: var(--muted); line-height: 1.6; }

        /* Toast */
        .toast { position: fixed; bottom: 24px; right: 24px; z-index: 500; background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px; padding: 12px 18px; font-size: 13px; box-shadow: 0 8px 32px rgba(0,0,0,.4); animation: slideUp .2s ease; display: flex; align-items: center; gap: 8px; }
        .toast.error { border-color: rgba(248,113,113,.3); color: #f87171; }
        .toast.info { border-color: rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        /* New form */
        .new-form { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }

        @media (max-width: 700px) { .body { grid-template-columns: 1fr; } .left-panel { display: none; } }
      `}</style>

      <div className="root">

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>
            ← Retour
          </button>
          <div>
            <div className="topbar-title">CompetitorSpy</div>
            {project && <div className="topbar-project">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {active && (
              <>
                <div className="view-tabs">
                  <button className={`view-tab ${activeView === 'setup' ? 'active' : ''}`} onClick={() => setActiveView('setup')}>Configuration</button>
                  <button className={`view-tab ${activeView === 'report' ? 'active' : ''}`} onClick={() => setActiveView('report')} disabled={!aiResult && !aiLoading}>Rapport</button>
                </div>
                {activeView === 'report' && aiResult && (
                  <button className="btn" onClick={exportReport}>↓ Exporter</button>
                )}
                <button className="btn spy-btn" onClick={runAI} disabled={aiLoading}>
                  {aiLoading
                    ? <><span className="spinner" style={{ width: 14, height: 14 }}/>Analyse…</>
                    : '🔍 Générer rapport'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="body">

          {/* ── Left panel ── */}
          <aside className="left-panel">
            <div className="panel-header">
              <span className="panel-label">Rapports ({reports.length})</span>
            </div>
            <div className="panel-list">
              {reports.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-txt">Créez votre premier rapport de veille</div>
                </div>
              )}
              {reports.map(r => (
                <div key={r.id} className={`report-item ${activeId === r.id ? 'active' : ''}`}
                  onClick={() => { setActiveId(r.id); setAiResult(r.aiResult || null); setActiveView(r.aiResult ? 'report' : 'setup') }}>
                  <button className="report-del" onClick={e => { e.stopPropagation(); deleteReport(r.id) }}>✕</button>
                  <div className="report-name">{r.name}</div>
                  <div className="report-meta">
                    {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {' · '}{(r.competitors || []).filter(c => c.name).length} concurrent(s)
                    {r.aiResult && ' · ✓ IA'}
                  </div>
                </div>
              ))}
            </div>

            {showNewForm ? (
              <div className="new-form">
                <label className="form-label">Nom du rapport</label>
                <input className="input" placeholder="Ex: Veille Q2 2025" value={newReport.name}
                  onChange={e => setNewReport(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && createReport()} autoFocus />
                <label className="form-label">Notre société</label>
                <input className="input" placeholder="Votre entreprise" value={newReport.myCompany}
                  onChange={e => setNewReport(p => ({ ...p, myCompany: e.target.value }))} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn primary" style={{ flex: 1 }} onClick={createReport}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>
                  + Nouveau rapport
                </button>
              </div>
            )}
          </aside>

          {/* ── Main ── */}
          <main className="center-panel">
            {!active ? (
              <div className="empty-cta" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div className="empty-icon" style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, fontStyle: 'italic', marginBottom: 8 }}>Intelligence concurrentielle</div>
                <div className="empty-txt">Créez un rapport de veille depuis le panneau gauche</div>
              </div>
            ) : activeView === 'setup' ? (
              /* ══ SETUP VIEW ══ */
              <>
                <div>
                  <h2 style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, fontStyle: 'italic' }}>{active.name}</h2>
                </div>

                <div className="setup-grid">
                  {/* Infos générales */}
                  <div className="card">
                    <div className="card-title"><div className="card-title-dot"/>Informations générales</div>
                    <div className="input-group">
                      <label className="form-label">Notre société</label>
                      <input className="input" placeholder="Nom de votre entreprise" value={active.myCompany || ''}
                        onChange={e => updateActive({ myCompany: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="form-label">Contexte stratégique</label>
                      <textarea className="input" rows={3} placeholder="Marchés cibles, positionnement actuel, enjeux…"
                        value={active.context || ''} onChange={e => updateActive({ context: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label className="form-label">Période de veille</label>
                      <div className="period-tabs">
                        {PERIOD_OPTIONS.map(p => (
                          <button key={p.value} className={`period-tab ${active.period === p.value ? 'active' : ''}`}
                            onClick={() => updateActive({ period: p.value })}>{p.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Axes de surveillance */}
                  <div className="card">
                    <div className="card-title"><div className="card-title-dot"/>Axes de surveillance</div>
                    <div className="categories-grid">
                      {Object.entries(CATEGORY_META).map(([key, meta]) => {
                        const isOn = (active.watchCategories || []).includes(key)
                        return (
                          <button key={key} className={`cat-chip ${isOn ? 'on' : ''}`}
                            onClick={() => toggleCategory(key)}>
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      {(active.watchCategories || []).length} / {Object.keys(CATEGORY_META).length} axes sélectionnés
                    </div>
                  </div>
                </div>

                {/* Concurrents */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <div className="card-title" style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="card-title-dot"/>Concurrents à analyser ({validCompetitors.length})
                    </span>
                    <button className="btn" style={{ padding: '4px 10px' }} onClick={addCompetitor}>+ Ajouter</button>
                  </div>
                  <div className="competitors-list">
                    {(active.competitors || []).map((comp, idx) => (
                      <div key={comp.id} className={`competitor-card ${activeComp === idx ? 'selected' : ''}`}
                        onClick={() => setActiveComp(idx)}>
                        <div className="competitor-card-header">
                          <div className="comp-num">{idx + 1}</div>
                          <input className={`input comp-name-input`} placeholder={`Concurrent ${idx + 1}`}
                            value={comp.name} onClick={e => e.stopPropagation()}
                            onChange={e => updateCompetitor(idx, { name: e.target.value })} />
                          {(active.competitors || []).length > 1 && (
                            <button className="comp-del-btn" onClick={e => { e.stopPropagation(); removeCompetitor(idx) }}>✕</button>
                          )}
                        </div>
                        <div className="comp-fields">
                          <div className="input-group">
                            <label className="form-label">Site web</label>
                            <input className="input" placeholder="https://…" value={comp.url || ''}
                              onChange={e => updateCompetitor(idx, { url: e.target.value })} />
                          </div>
                          <div className="input-group">
                            <label className="form-label">Notes / signaux connus</label>
                            <input className="input" placeholder="Informations préexistantes…" value={comp.notes || ''}
                              onChange={e => updateCompetitor(idx, { notes: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn spy-btn" style={{ alignSelf: 'flex-end' }} onClick={runAI} disabled={aiLoading || validCompetitors.length === 0}>
                    {aiLoading ? <><span className="spinner" style={{ width: 14, height: 14 }}/>Analyse en cours…</> : '🔍 Lancer l\'analyse IA'}
                  </button>
                </div>
              </>
            ) : (
              /* ══ REPORT VIEW ══ */
              aiLoading ? (
                <div className="loading-wrap">
                  <div className="spinner" style={{ width: 32, height: 32 }}/>
                  <div className="loading-txt">Analyse concurrentielle en cours…</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace' }}>
                    Claude scanne les signaux et génère votre rapport
                  </div>
                </div>
              ) : aiResult ? (
                <>
                  {/* Executive summary */}
                  <div className="report-header">
                    <div className="threat-gauge">
                      <div className="threat-score" style={{ color: getThreatColor(aiResult.threat_score) }}>
                        {(aiResult.threat_score || 3).toFixed(1)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace', marginTop: 4 }}>MENACE /5</div>
                    </div>
                    <div style={{ width: 1, height: 60, background: 'var(--border)', flexShrink: 0 }}/>
                    <div className="exec-summary">{aiResult.executive_summary}</div>
                  </div>

                  {/* Competitor tabs + detail */}
                  {aiResult.competitors?.length > 0 && (
                    <div>
                      <div className="section-title">Analyse par concurrent <div className="section-line"/></div>
                      <div className="comp-report-tabs" style={{ marginBottom: 12 }}>
                        {aiResult.competitors.map((c, i) => {
                          const tc = getThreatColor(c.threat_score)
                          return (
                            <button key={i} className={`comp-tab ${activeComp === i ? 'active' : ''}`}
                              onClick={() => setActiveComp(i)}>
                              {c.name}
                              <span className="comp-tab-score" style={{ background: `${tc}20`, color: tc }}>
                                {(c.threat_score || 3).toFixed(1)}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {(() => {
                        const comp = aiResult.competitors[activeComp]
                        if (!comp) return null
                        const tc = getThreatColor(comp.threat_score)
                        return (
                          <div className="comp-detail">
                            <div className="comp-detail-header">
                              <div>
                                <div className="comp-detail-name">{comp.name}</div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span className="comp-status">{comp.status}</span>
                                <span style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, fontStyle: 'italic', color: tc }}>
                                  {(comp.threat_score || 3).toFixed(1)}/5
                                </span>
                              </div>
                            </div>
                            {comp.headline && <div className="comp-headline">"{ comp.headline}"</div>}
                            <div className="comp-detail-body">

                              {/* Categories */}
                              {comp.categories && Object.keys(comp.categories).length > 0 && (
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--muted2)', fontFamily: 'Geist Mono,monospace', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Signaux par axe</div>
                                  <div className="cat-signals-grid">
                                    {Object.entries(comp.categories).map(([catKey, catData]) => {
                                      const meta   = CATEGORY_META[catKey] || { icon: '◉', label: catKey, color: 'var(--muted2)', bg: 'var(--surface3)' }
                                      const impCol = IMPACT_COLORS[catData.impact] || 'var(--muted2)'
                                      return (
                                        <div key={catKey} className="cat-signal-card">
                                          <div className="cat-signal-header">
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                              <span style={{ color: meta.color }}>{meta.icon}</span>
                                              <span className="cat-signal-name">{meta.label}</span>
                                            </span>
                                            {catData.impact && (
                                              <span className="cat-signal-impact"
                                                style={{ background: `${impCol}15`, color: impCol, border: `1px solid ${impCol}30` }}>
                                                {catData.impact}
                                              </span>
                                            )}
                                          </div>
                                          <div className="cat-signal-text">{catData.signal}</div>
                                          {catData.trend && (
                                            <div className="cat-signal-trend">
                                              {TREND_ICONS[catData.trend] || '→'} {catData.trend}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Strengths / Weaknesses */}
                              {((comp.strengths?.length > 0) || (comp.weaknesses?.length > 0)) && (
                                <div className="sw-grid">
                                  <div>
                                    <div className="sw-col-title" style={{ color: '#f87171' }}>Forces</div>
                                    {(comp.strengths || []).map((s, i) => (
                                      <div key={i} className="sw-item">
                                        <div className="sw-dot" style={{ background: '#f87171' }}/>
                                        {s}
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <div className="sw-col-title" style={{ color: '#34d399' }}>Faiblesses exploitables</div>
                                    {(comp.weaknesses || []).map((w, i) => (
                                      <div key={i} className="sw-item">
                                        <div className="sw-dot" style={{ background: '#34d399' }}/>
                                        {w}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Next move */}
                              {comp.next_move && (
                                <div className="next-move">
                                  <div className="next-move-label">Prochain mouvement probable</div>
                                  {comp.next_move}
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
                      <div className="section-title">Signaux de marché <div className="section-line"/></div>
                      <div className="signals-grid">
                        {aiResult.market_signals.map((sig, i) => {
                          const typeColors = { opportunite: '#34d399', menace: '#f87171', tendance: '#60a5fa', rupture: '#f472b6' }
                          const tc = typeColors[sig.type] || 'var(--muted2)'
                          return (
                            <div key={i} className="signal-card">
                              <div className="signal-type-dot" style={{ background: tc }}/>
                              <div>
                                <div className="signal-title" style={{ color: tc }}>{sig.title}</div>
                                <div className="signal-desc">{sig.description}</div>
                                <div className="signal-urgency">⏱ {sig.urgency}</div>
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
                      <div className="section-title">Matrice concurrentielle <div className="section-line"/></div>
                      <div className="matrix-grid">
                        {[
                          { key: 'leader',     label: 'Leader menaçant',       color: '#f87171' },
                          { key: 'challenger', label: 'Challenger en montée',   color: '#fb923c' },
                          { key: 'vulnerable', label: 'Le plus vulnérable',     color: '#34d399' },
                          { key: 'wild_card',  label: 'Wild card imprévisible', color: '#a78bfa' },
                        ].map(({ key, label, color }) => (
                          <div key={key} className="matrix-cell" style={{ borderColor: `${color}30` }}>
                            <div className="matrix-role" style={{ color }}>{label}</div>
                            <div className="matrix-name">{aiResult.competitive_matrix[key] || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action plan */}
                  {aiResult.action_plan?.length > 0 && (
                    <div>
                      <div className="section-title">Plan d'action <div className="section-line"/></div>
                      <div className="action-list">
                        {aiResult.action_plan.map((a, i) => (
                          <div key={i} className="action-item">
                            <div className="action-num">#{a.priority || i + 1}</div>
                            <div className="action-body">
                              <div className="action-title">{a.action}</div>
                              <div className="action-rationale">{a.rationale}</div>
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

                  {/* Watch next */}
                  {aiResult.watch_next && (
                    <div>
                      <div className="section-title">À surveiller prochainement <div className="section-line"/></div>
                      <div className="watch-box">
                        <div className="watch-label">🔭 Prochaine période</div>
                        {aiResult.watch_next}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-cta">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-txt">Configurez vos concurrents puis lancez l'analyse IA</div>
                </div>
              )
            )}
          </main>
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
