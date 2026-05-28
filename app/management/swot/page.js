'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`

const QUADRANTS = {
  strengths:    { label: 'Forces',      en: 'Strengths',    short: 'S', color: '#22d3a5', bg: 'rgba(34,211,165,.08)',   border: 'rgba(34,211,165,.2)',   icon: '↑', hint: 'Avantages internes, compétences distinctives, ressources clés' },
  weaknesses:   { label: 'Faiblesses',  en: 'Weaknesses',   short: 'W', color: '#f87171', bg: 'rgba(248,113,113,.08)',  border: 'rgba(248,113,113,.2)',  icon: '↓', hint: 'Lacunes internes, points d\'amélioration, contraintes' },
  opportunities:{ label: 'Opportunités',en: 'Opportunities', short: 'O', color: '#60a5fa', bg: 'rgba(96,165,250,.08)',   border: 'rgba(96,165,250,.2)',   icon: '◎', hint: 'Tendances favorables, marchés émergents, facteurs externes positifs' },
  threats:      { label: 'Menaces',     en: 'Threats',      short: 'T', color: '#f59e0b', bg: 'rgba(245,158,11,.08)',   border: 'rgba(245,158,11,.2)',   icon: '⚡', hint: 'Risques externes, concurrence, changements défavorables' },
}

const PRIORITY_LABELS = { high: 'Haute', medium: 'Moyenne', low: 'Faible' }
const PRIORITY_COLORS = { high: '#f87171', medium: '#f59e0b', low: '#22d3a5' }

const EMPTY_ITEM = { text: '', priority: 'medium', impact: 3, notes: '' }

// ─── SWOT Page ────────────────────────────────────────────────────────────────
export default function SWOTPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,      setProject]      = useState(null)
  const [analyses,     setAnalyses]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [newAnalysis,  setNewAnalysis]  = useState({ name: '', context: '', objective: '' })
  const [editItem,     setEditItem]     = useState(null)   // { quadrant, id } or null
  const [itemForm,     setItemForm]     = useState(EMPTY_ITEM)
  const [addingTo,     setAddingTo]     = useState(null)   // quadrant key
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiResult,     setAiResult]     = useState(null)
  const [showAiPanel,  setShowAiPanel]  = useState(false)
  const [toast,        setToast]        = useState(null)
  const [dragItem,     setDragItem]     = useState(null)   // { quadrant, id }
  const [dragOver,     setDragOver]     = useState(null)   // quadrant key
  const [focusQ,       setFocusQ]       = useState(null)   // fullscreen quadrant

  // ── Load ──
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
        if (list.length > 0) setActiveId(list[list.length - 1].id)
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), SWOT: updated } }
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
      id: uid(), name: newAnalysis.name.trim(),
      context: newAnalysis.context.trim(), objective: newAnalysis.objective.trim(),
      createdAt: new Date().toISOString(),
      items: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      aiResult: null,
    }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowNewForm(false); setNewAnalysis({ name: '', context: '', objective: '' })
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

  // ── CRUD items ──
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
    showToast(editItem ? 'Élément mis à jour' : 'Élément ajouté')
  }

  const deleteItem = (quadrant, id) => {
    const items = (active.items[quadrant] || []).filter(i => i.id !== id)
    updateAnalysis({ items: { ...active.items, [quadrant]: items } })
    if (editItem?.id === id) { setEditItem(null); setItemForm(EMPTY_ITEM) }
  }

  const startEdit = (quadrant, item) => {
    setEditItem({ quadrant, id: item.id })
    setAddingTo(quadrant)
    setItemForm({ text: item.text, priority: item.priority, impact: item.impact, notes: item.notes })
  }

  // ── Drag to reorder within quadrant ──
  const onDragStart = (quadrant, id) => setDragItem({ quadrant, id })
  const onDrop = (targetQuadrant) => {
    if (!dragItem || dragItem.quadrant !== targetQuadrant) {
      // Move across quadrants
      if (dragItem && dragItem.quadrant !== targetQuadrant) {
        const srcItems  = [...(active.items[dragItem.quadrant] || [])]
        const moving    = srcItems.find(i => i.id === dragItem.id)
        if (!moving) return
        const newSrc    = srcItems.filter(i => i.id !== dragItem.id)
        const newTarget = [...(active.items[targetQuadrant] || []), moving]
        updateAnalysis({ items: { ...active.items, [dragItem.quadrant]: newSrc, [targetQuadrant]: newTarget } })
        showToast(`Déplacé vers ${QUADRANTS[targetQuadrant].label}`)
      }
    }
    setDragItem(null); setDragOver(null)
  }

  // ── Health score ──
  const computeScore = () => {
    if (!active) return null
    const s = (active.items.strengths     || []).length
    const w = (active.items.weaknesses    || []).length
    const o = (active.items.opportunities || []).length
    const t = (active.items.threats       || []).length
    const total = s + w + o + t
    if (total === 0) return null
    // Score: more strengths & opportunities = better, balanced = better
    const positive  = s + o
    const negative  = w + t
    const balance   = total > 0 ? Math.round((positive / total) * 100) : 50
    const coverage  = Math.min(100, Math.round((Math.min(s,4) + Math.min(w,4) + Math.min(o,4) + Math.min(t,4)) / 16 * 100))
    const score     = Math.round((balance * 0.5) + (coverage * 0.5))
    return { score, balance, coverage, s, w, o, t, total }
  }
  const health = computeScore()

  // ── Total items ──
  const totalItems = active
    ? Object.values(active.items).reduce((s, arr) => s + arr.length, 0)
    : 0

  // ── AI ──
  const runAI = async () => {
    if (!active || totalItems === 0) { showToast('Ajoutez des éléments d\'abord', 'error'); return }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-swot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: active.name,
          context:      active.context,
          objective:    active.objective,
          items:        active.items,
          projectName:  project?.name || '',
          projectTag:   project?.tag  || '',
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

  // Restore cached AI result
  useEffect(() => {
    if (active?.aiResult && !aiResult) setAiResult(active.aiResult)
    else if (!active?.aiResult) setAiResult(null)
  }, [activeId])

  // ── Export ──
  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `SWOT_${active.name.replace(/\s+/g,'_')}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Inline item form ──
  const ItemForm = ({ quadrant }) => {
    const q = QUADRANTS[quadrant]
    return (
      <div className="item-form" style={{ '--qcolor': q.color }}>
        <textarea
          className="item-input"
          placeholder={`Décrivez cette ${q.label.toLowerCase()}…`}
          value={itemForm.text}
          onChange={e => setItemForm(p => ({ ...p, text: e.target.value }))}
          autoFocus rows={2}
        />
        <div className="item-form-row">
          <div className="item-form-group">
            <span className="item-form-label">Priorité</span>
            <div className="priority-pills">
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  className={`priority-pill ${itemForm.priority === k ? 'active' : ''}`}
                  style={{ '--pcolor': PRIORITY_COLORS[k] }}
                  onClick={() => setItemForm(p => ({ ...p, priority: k }))}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="item-form-group">
            <span className="item-form-label">Impact <strong style={{ color: q.color }}>{itemForm.impact}/5</strong></span>
            <input type="range" min="1" max="5" value={itemForm.impact}
              onChange={e => setItemForm(p => ({ ...p, impact: e.target.value }))}
              className="impact-range" style={{ accentColor: q.color }}
            />
          </div>
        </div>
        <textarea
          className="item-input"
          placeholder="Notes additionnelles (optionnel)…"
          value={itemForm.notes}
          onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))}
          rows={1}
          style={{ fontSize: 11, opacity: .7 }}
        />
        <div className="item-form-actions">
          <button className="item-save-btn" style={{ background: q.color }} onClick={() => saveItem(quadrant)}>
            {editItem ? 'Mettre à jour' : `+ Ajouter à ${q.label}`}
          </button>
          <button className="item-cancel-btn" onClick={() => { setAddingTo(null); setEditItem(null); setItemForm(EMPTY_ITEM) }}>
            Annuler
          </button>
        </div>
      </div>
    )
  }

  // ── Quadrant card ──
  const QuadrantCard = ({ qKey }) => {
    const q     = QUADRANTS[qKey]
    const items = (active?.items?.[qKey] || [])
    const isFocused = focusQ === qKey
    return (
      <div
        className={`swot-quadrant ${dragOver === qKey ? 'drag-over' : ''} ${isFocused ? 'focused' : ''}`}
        style={{ '--qcolor': q.color, '--qbg': q.bg, '--qborder': q.border }}
        onDragOver={e => { e.preventDefault(); setDragOver(qKey) }}
        onDrop={() => onDrop(qKey)}
        onDragLeave={() => setDragOver(null)}
      >
        {/* Header */}
        <div className="q-header">
          <div className="q-header-left">
            <div className="q-badge">{q.short}</div>
            <div>
              <div className="q-title">{q.label}</div>
              <div className="q-en">{q.en}</div>
            </div>
          </div>
          <div className="q-header-right">
            <span className="q-count">{items.length}</span>
            <button className="q-focus-btn" onClick={() => setFocusQ(isFocused ? null : qKey)} title={isFocused ? 'Réduire' : 'Agrandir'}>
              {isFocused ? '⊟' : '⊞'}
            </button>
          </div>
        </div>

        <div className="q-hint">{q.hint}</div>

        {/* Items */}
        <div className="q-items">
          {items.length === 0 && addingTo !== qKey && (
            <div className="q-empty">
              <span style={{ opacity:.3 }}>{q.icon}</span>
              <span>Aucun élément</span>
            </div>
          )}
          {items.map(item => (
            <div
              key={item.id}
              className={`swot-item ${editItem?.id === item.id ? 'editing' : ''}`}
              draggable
              onDragStart={() => onDragStart(qKey, item.id)}
            >
              <div className="item-top">
                <div className="item-priority-dot" style={{ background: PRIORITY_COLORS[item.priority] }} title={PRIORITY_LABELS[item.priority]}/>
                <span className="item-text">{item.text}</span>
                <div className="item-actions">
                  <button className="item-btn" onClick={() => startEdit(qKey, item)}>✎</button>
                  <button className="item-btn danger" onClick={() => deleteItem(qKey, item.id)}>✕</button>
                </div>
              </div>
              {/* Impact dots */}
              <div className="item-impact">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className="impact-dot" style={{ background: n <= item.impact ? q.color : 'var(--border2)' }}/>
                ))}
                {item.notes && <span className="item-notes-flag">📝</span>}
              </div>
            </div>
          ))}

          {/* Inline form */}
          {addingTo === qKey && editItem?.quadrant === qKey && <ItemForm quadrant={qKey}/>}
          {addingTo === qKey && !editItem && <ItemForm quadrant={qKey}/>}
        </div>

        {/* Add button */}
        {addingTo !== qKey && (
          <button
            className="q-add-btn"
            onClick={() => { setAddingTo(qKey); setEditItem(null); setItemForm(EMPTY_ITEM) }}
          >
            + Ajouter
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:      #0a0a0f;
          --surface: #111118;
          --surface2:#18181f;
          --surface3:#1e1e28;
          --border:  rgba(255,255,255,.07);
          --border2: rgba(255,255,255,.12);
          --text:    #f0eff5;
          --muted:   #6b6a7a;
          --muted2:  #9896aa;
          --accent:  #6366f1;
          --accent2: #818cf8;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        .swot-root { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }

        /* ── Topbar ── */
        .topbar {
          height: 56px; background: var(--surface); border-bottom: 1px solid var(--border);
          display: flex; align-items: center; padding: 0 20px; gap: 12px;
          position: sticky; top: 0; z-index: 100; flex-shrink: 0;
        }
        .back-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px;
          background: var(--surface2); border: 1px solid var(--border2); color: var(--muted2);
          font-family: 'Geist Mono', monospace; font-size: 11px; cursor: pointer; transition: all .15s;
          white-space: nowrap;
        }
        .back-btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .topbar-center { display: flex; flex-direction: column; }
        .topbar-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; line-height: 1.2; }
        .topbar-project { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .topbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }
        .btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px;
          cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 11px; letter-spacing: .04em;
          border: 1px solid var(--border2); background: var(--surface2); color: var(--muted2);
          transition: all .15s; white-space: nowrap;
        }
        .btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .btn.ai { background: rgba(96,165,250,.08); border-color: rgba(96,165,250,.25); color: #60a5fa; }
        .btn.ai:hover { background: rgba(96,165,250,.15); }
        .btn:disabled { opacity:.4; cursor:not-allowed; }

        /* ── Body: sidebar + main ── */
        .swot-body { flex: 1; display: grid; grid-template-columns: 220px 1fr; overflow: hidden; height: calc(100vh - 56px); }

        /* ── Analyses sidebar ── */
        .analyses-panel {
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .panel-header {
          padding: 14px 14px 10px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .panel-label { font-size: 10px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .panel-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
        .analysis-item {
          padding: 9px 11px; border-radius: 7px; cursor: pointer;
          border: 1px solid transparent; transition: all .15s; display: flex; gap: 8px; align-items: flex-start;
        }
        .analysis-item:hover { background: var(--surface2); }
        .analysis-item.active { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.25); }
        .analysis-name { font-size: 12px; font-weight: 600; color: var(--text); }
        .analysis-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 2px; }
        .analysis-del { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; margin-left:auto; padding:2px 4px; flex-shrink:0; }
        .analysis-item:hover .analysis-del { opacity:1; }

        .new-form { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 7px; }
        .input {
          width: 100%; background: var(--bg); border: 1px solid var(--border2);
          border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif;
          font-size: 12px; color: var(--text); outline: none; transition: border-color .15s;
        }
        .input:focus { border-color: var(--accent); }
        .input::placeholder { color: var(--muted); }
        textarea.input { resize: vertical; }
        .btn-row { display: flex; gap: 6px; }
        .btn-sm {
          flex: 1; padding: 8px; border-radius: 6px; cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 11px;
          transition: all .15s; border: 1px solid var(--border2); background: var(--surface2); color: var(--muted2);
        }
        .btn-sm.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .btn-sm.primary:hover { background: #4f52d8; }
        .btn-sm:hover { color: var(--text); }
        .btn-new-analysis {
          margin: 10px 12px 12px; padding: 9px 12px; border-radius: 7px; width: calc(100% - 24px);
          border: 1px dashed var(--border2); background: transparent; color: var(--muted2);
          font-family: 'Geist Mono', monospace; font-size: 11px; cursor: pointer; transition: all .15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .btn-new-analysis:hover { border-color: var(--accent); color: var(--accent); }

        /* ── Health widget in sidebar ── */
        .health-widget {
          margin: 0 12px 12px; padding: 12px; border-radius: 8px;
          background: var(--surface2); border: 1px solid var(--border);
        }
        .health-label { font-size: 9px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 8px; }
        .health-score { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
        .health-bar-wrap { height: 4px; background: var(--border2); border-radius: 2px; margin-bottom: 8px; }
        .health-bar { height: 100%; border-radius: 2px; transition: width .5s ease; }
        .health-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
        .health-cell { display: flex; align-items: center; gap: 5px; font-size: 10px; font-family: 'Geist Mono', monospace; }
        .health-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        /* ── Main content ── */
        .swot-main { overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }

        .swot-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .swot-title { font-family: 'Instrument Serif', serif; font-size: 24px; font-style: italic; }
        .swot-context { font-size: 12px; color: var(--muted2); line-height: 1.6; margin-top: 4px; }
        .swot-objective {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 99px; margin-top: 6px;
          background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.2);
          font-size: 11px; color: var(--accent2); font-family: 'Geist Mono', monospace;
        }

        /* ── SWOT 2x2 grid ── */
        .swot-grid {
          display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto;
          gap: 12px;
        }

        .swot-quadrant {
          background: var(--surface); border: 1px solid var(--qborder);
          border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px;
          transition: all .2s; min-height: 220px;
          background-image: radial-gradient(circle at 90% 10%, var(--qbg) 0%, transparent 60%);
        }
        .swot-quadrant.drag-over { border-color: var(--qcolor); box-shadow: 0 0 0 1px var(--qcolor); }
        .swot-quadrant.focused { grid-column: 1 / -1; }

        .q-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .q-header-left { display: flex; align-items: center; gap: 10px; }
        .q-badge {
          width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 800; color: var(--qcolor);
          background: var(--qbg); border: 1px solid var(--qborder); flex-shrink: 0;
        }
        .q-title { font-size: 14px; font-weight: 700; color: var(--text); }
        .q-en { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .q-header-right { display: flex; align-items: center; gap: 8px; }
        .q-count {
          min-width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
          background: var(--qbg); color: var(--qcolor); font-size: 11px; font-weight: 700;
          border: 1px solid var(--qborder); font-family: 'Geist Mono', monospace; padding: 0 4px;
        }
        .q-focus-btn {
          background: none; border: none; color: var(--muted); cursor: pointer; font-size: 14px;
          padding: 2px 4px; border-radius: 4px; transition: color .15s;
        }
        .q-focus-btn:hover { color: var(--text); }
        .q-hint { font-size: 10px; color: var(--muted); line-height: 1.5; font-style: italic; }

        /* ── Items ── */
        .q-items { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .q-empty { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--muted); padding: 8px 0; }

        .swot-item {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 7px; padding: 8px 10px; transition: all .15s; cursor: grab;
        }
        .swot-item:hover { border-color: var(--border2); }
        .swot-item.editing { border-color: var(--qcolor); }
        .item-top { display: flex; align-items: flex-start; gap: 7px; }
        .item-priority-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .item-text { font-size: 12px; color: var(--text); line-height: 1.5; flex: 1; }
        .item-actions { display: flex; gap: 2px; opacity: 0; transition: opacity .15s; }
        .swot-item:hover .item-actions { opacity: 1; }
        .item-btn {
          width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer; font-size: 11px; color: var(--muted2); transition: all .15s;
        }
        .item-btn:hover { background: var(--surface3); color: var(--text); }
        .item-btn.danger:hover { color: #f87171; }
        .item-impact { display: flex; align-items: center; gap: 3px; margin-top: 5px; }
        .impact-dot { width: 6px; height: 6px; border-radius: 50%; }
        .item-notes-flag { font-size: 10px; margin-left: 4px; opacity: .5; }

        /* ── Item inline form ── */
        .item-form {
          background: var(--surface3); border: 1px solid var(--qcolor, var(--border2));
          border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;
        }
        .item-input {
          width: 100%; background: var(--bg); border: 1px solid var(--border2);
          border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif;
          font-size: 12px; color: var(--text); outline: none; resize: vertical;
          transition: border-color .15s;
        }
        .item-input:focus { border-color: var(--qcolor, var(--accent)); }
        .item-input::placeholder { color: var(--muted); }
        .item-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .item-form-group { display: flex; flex-direction: column; gap: 5px; }
        .item-form-label { font-size: 10px; color: var(--muted); letter-spacing: .06em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .priority-pills { display: flex; gap: 4px; }
        .priority-pill {
          flex: 1; padding: 4px 0; border-radius: 4px; border: 1px solid var(--border2);
          background: var(--surface2); color: var(--muted2); font-size: 10px; font-family: 'Geist Mono', monospace;
          cursor: pointer; transition: all .15s; text-align: center;
        }
        .priority-pill.active { background: var(--pcolor); border-color: var(--pcolor); color: #000; font-weight: 700; }
        .priority-pill:hover:not(.active) { border-color: var(--pcolor); color: var(--pcolor); }
        .impact-range { width: 100%; }
        .item-form-actions { display: flex; gap: 6px; }
        .item-save-btn {
          flex: 1; padding: 8px; border-radius: 6px; border: none; color: #000; font-weight: 700;
          font-family: 'Geist Mono', monospace; font-size: 11px; cursor: pointer; transition: opacity .15s;
        }
        .item-save-btn:hover { opacity: .85; }
        .item-cancel-btn {
          padding: 8px 14px; border-radius: 6px; border: 1px solid var(--border2); background: var(--surface2);
          color: var(--muted2); font-family: 'Geist Mono', monospace; font-size: 11px; cursor: pointer; transition: all .15s;
        }
        .item-cancel-btn:hover { color: var(--text); }

        /* ── Add button ── */
        .q-add-btn {
          width: 100%; padding: 7px; border-radius: 6px; border: 1px dashed var(--qborder);
          background: transparent; color: var(--qcolor); font-family: 'Geist Mono', monospace;
          font-size: 11px; cursor: pointer; transition: all .15s; margin-top: auto;
        }
        .q-add-btn:hover { background: var(--qbg); }

        /* ── Empty state ── */
        .empty-main { flex: 1; display: flex; align-items: center; justify-content: center; }
        .empty-card { text-align: center; padding: 60px 40px; }
        .empty-icon { font-size: 40px; opacity: .2; margin-bottom: 16px; }
        .empty-title { font-family: 'Instrument Serif', serif; font-size: 20px; font-style: italic; margin-bottom: 8px; }
        .empty-sub { font-size: 12px; color: var(--muted); }

        /* ── AI Panel ── */
        .ai-panel {
          position: fixed; right: 0; top: 56px; bottom: 0; width: 400px;
          background: var(--surface); border-left: 1px solid var(--border);
          z-index: 80; display: flex; flex-direction: column;
          transform: translateX(100%); transition: transform .3s ease;
        }
        .ai-panel.open { transform: translateX(0); }
        .ai-panel-header {
          padding: 14px 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .ai-panel-title { font-family: 'Instrument Serif', serif; font-size: 17px; font-style: italic; }
        .ai-content { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
        .ai-section { display: flex; flex-direction: column; gap: 8px; }
        .ai-section-title { font-size: 10px; color: var(--muted2); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .ai-block { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-size: 12px; color: var(--text); line-height: 1.7; }
        .ai-strategy-item { display: flex; gap: 10px; padding: 10px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 7px; }
        .ai-strategy-icon { font-size: 16px; flex-shrink: 0; }
        .ai-strategy-title { font-size: 12px; font-weight: 700; margin-bottom: 3px; }
        .ai-strategy-text { font-size: 11px; color: var(--muted2); line-height: 1.6; }
        .ai-strategy-type { font-size: 10px; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 5px; font-family: 'Geist Mono', monospace; }
        .ai-prio { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); }
        .ai-prio-num { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; padding-top: 1px; min-width: 18px; }
        .ai-prio-text { font-size: 11px; color: var(--text); line-height: 1.6; }
        .ai-loading { display: flex; align-items: center; gap: 10px; padding: 20px; color: var(--muted2); font-size: 12px; }
        .spinner { width: 16px; height: 16px; border: 2px solid var(--border2); border-top-color: #60a5fa; border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 500;
          background: var(--surface2); border: 1px solid var(--border2);
          border-radius: 8px; padding: 11px 16px; font-size: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,.4); animation: slideUp .2s ease;
          display: flex; align-items: center; gap: 8px;
        }
        .toast.error { border-color: rgba(248,113,113,.3); color: #f87171; }
        .toast.info  { border-color: rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .swot-body { grid-template-columns: 1fr; }
          .analyses-panel { display: none; }
        }
        @media (max-width: 640px) {
          .swot-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="swot-root">

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>
            ← Retour
          </button>
          <div className="topbar-center">
            <div className="topbar-title">SWOT Analysis</div>
            {project && <div className="topbar-project">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {active && <>
              <button className="btn" onClick={exportAnalysis}>↓ Export</button>
              <button className="btn ai" onClick={runAI} disabled={aiLoading || totalItems === 0}>
                {aiLoading
                  ? <><span className="spinner"/>Analyse…</>
                  : '✦ Analyse IA'
                }
              </button>
            </>}
          </div>
        </header>

        <div className="swot-body">

          {/* ── Sidebar ── */}
          <aside className="analyses-panel">
            <div className="panel-header">
              <span className="panel-label">Analyses ({analyses.length})</span>
            </div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div style={{ padding: '24px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:28, opacity:.2, marginBottom:8 }}>⊞</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>Créez votre première analyse SWOT</div>
                </div>
              )}
              {analyses.map(a => {
                const tot = Object.values(a.items || {}).reduce((s, arr) => s + arr.length, 0)
                return (
                  <div key={a.id} className={`analysis-item ${activeId === a.id ? 'active' : ''}`} onClick={() => setActiveId(a.id)}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="analysis-name">{a.name}</div>
                      <div className="analysis-meta">{tot} élément(s) · {new Date(a.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}</div>
                    </div>
                    <button className="analysis-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  </div>
                )
              })}
            </div>

            {/* Health score */}
            {active && health && (
              <div className="health-widget">
                <div className="health-label">Santé stratégique</div>
                <div className="health-score" style={{ color: health.score >= 70 ? '#22d3a5' : health.score >= 40 ? '#f59e0b' : '#f87171' }}>
                  {health.score}<span style={{ fontSize:14, fontWeight:400, color:'var(--muted)' }}>/100</span>
                </div>
                <div className="health-bar-wrap">
                  <div className="health-bar" style={{ width:`${health.score}%`, background: health.score >= 70 ? '#22d3a5' : health.score >= 40 ? '#f59e0b' : '#f87171' }}/>
                </div>
                <div className="health-grid">
                  {Object.entries(QUADRANTS).map(([k, q]) => (
                    <div key={k} className="health-cell">
                      <div className="health-dot" style={{ background: q.color }}/>
                      <span style={{ color:'var(--muted)' }}>{q.short}</span>
                      <span style={{ color:'var(--text)', fontWeight:600 }}>{health[k[0]]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New analysis form */}
            {showNewForm ? (
              <div className="new-form">
                <span style={{ fontSize:10, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', fontFamily:'Geist Mono,monospace' }}>Nouvelle analyse</span>
                <input className="input" placeholder="Nom *" value={newAnalysis.name}
                  onChange={e => setNewAnalysis(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus/>
                <input className="input" placeholder="Contexte (optionnel)" value={newAnalysis.context}
                  onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))}/>
                <input className="input" placeholder="Objectif stratégique (optionnel)" value={newAnalysis.objective}
                  onChange={e => setNewAnalysis(p => ({ ...p, objective: e.target.value }))}/>
                <div className="btn-row">
                  <button className="btn-sm primary" onClick={createAnalysis}>Créer</button>
                  <button className="btn-sm" onClick={() => setShowNewForm(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <button className="btn-new-analysis" onClick={() => setShowNewForm(true)}>
                + Nouvelle analyse
              </button>
            )}
          </aside>

          {/* ── Main ── */}
          <main className="swot-main">
            {!active ? (
              <div className="empty-main">
                <div className="empty-card">
                  <div className="empty-icon">⊞</div>
                  <div className="empty-title">Sélectionnez ou créez une analyse</div>
                  <div className="empty-sub">Utilisez le panneau gauche pour démarrer votre SWOT</div>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="swot-header">
                  <div>
                    <h2 className="swot-title">{active.name}</h2>
                    {active.context && <p className="swot-context">{active.context}</p>}
                    {active.objective && (
                      <div className="swot-objective">
                        <span>◎</span> {active.objective}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    {totalItems > 0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:6, background:'var(--surface2)', border:'1px solid var(--border)', fontSize:11, fontFamily:'Geist Mono,monospace', color:'var(--muted2)' }}>
                        {totalItems} élément{totalItems > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* SWOT 2×2 */}
                <div className="swot-grid">
                  {Object.keys(QUADRANTS).map(qKey => (
                    <QuadrantCard key={qKey} qKey={qKey}/>
                  ))}
                </div>
              </>
            )}
          </main>
        </div>

        {/* ── AI Panel ── */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-panel-header">
            <span className="ai-panel-title">Analyse stratégique ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-content">
            {aiLoading && (
              <div className="ai-loading">
                <div className="spinner"/>
                Claude analyse votre SWOT…
              </div>
            )}

            {aiResult && !aiLoading && (
              <>
                {aiResult.diagnostic && (
                  <div className="ai-section">
                    <div className="ai-section-title">Diagnostic global</div>
                    <div className="ai-block">{aiResult.diagnostic}</div>
                  </div>
                )}

                {aiResult.strategies?.length > 0 && (
                  <div className="ai-section">
                    <div className="ai-section-title">Stratégies croisées (TOWS)</div>
                    {aiResult.strategies.map((s, i) => {
                      const typeColors = { 'SO': '#22d3a5', 'WO': '#60a5fa', 'ST': '#f59e0b', 'WT': '#f87171' }
                      const c = typeColors[s.type] || 'var(--accent2)'
                      return (
                        <div key={i} className="ai-strategy-item">
                          <span className="ai-strategy-icon" style={{ color: c }}>{s.type === 'SO' ? '↗' : s.type === 'WO' ? '↑' : s.type === 'ST' ? '⊡' : '↙'}</span>
                          <div>
                            <div className="ai-strategy-title">{s.titre}</div>
                            <div className="ai-strategy-text">{s.description}</div>
                            <span className="ai-strategy-type" style={{ background:`color-mix(in srgb, ${c} 15%, transparent)`, color: c, border:`1px solid color-mix(in srgb, ${c} 25%, transparent)` }}>
                              {s.type} · {s.type === 'SO' ? 'Attaque' : s.type === 'WO' ? 'Amélioration' : s.type === 'ST' ? 'Défense' : 'Survie'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {aiResult.priorites?.length > 0 && (
                  <div className="ai-section">
                    <div className="ai-section-title">Priorités d'action</div>
                    {aiResult.priorites.map((p, i) => (
                      <div key={i} className="ai-prio">
                        <span className="ai-prio-num">#{i+1}</span>
                        <span className="ai-prio-text">{p}</span>
                      </div>
                    ))}
                  </div>
                )}

                {aiResult.risques?.length > 0 && (
                  <div className="ai-section">
                    <div className="ai-section-title">Risques critiques</div>
                    {aiResult.risques.map((r, i) => (
                      <div key={i} className="ai-prio">
                        <span className="ai-prio-num" style={{ color:'#f87171' }}>⚡</span>
                        <span className="ai-prio-text">{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {aiResult.conclusion && (
                  <div className="ai-section">
                    <div className="ai-section-title">Conclusion</div>
                    <div className="ai-block" style={{ fontStyle:'italic', color:'var(--muted2)' }}>{aiResult.conclusion}</div>
                  </div>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div style={{ padding:'32px 20px', textAlign:'center' }}>
                <div style={{ fontSize:32, opacity:.2, marginBottom:12 }}>✦</div>
                <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.7 }}>
                  Remplissez votre matrice SWOT puis cliquez sur <strong style={{ color:'var(--text)' }}>Analyse IA</strong> pour obtenir des stratégies TOWS croisées et des recommandations prioritaires.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div className={`toast ${toast.type || ''}`}>
            {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}