'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const PERSPECTIVES = {
  finance: {
    label: 'Finance',
    icon: '◈',
    color: '#22d3a5',
    bg: 'rgba(34,211,165,.08)',
    desc: 'Résultats financiers & création de valeur',
    examples: 'ROE, EBITDA, Croissance CA, Réduction coûts',
  },
  clients: {
    label: 'Clients',
    icon: '◎',
    color: '#818cf8',
    bg: 'rgba(129,140,248,.08)',
    desc: 'Satisfaction, fidélisation & conquête clients',
    examples: 'NPS, Part de marché, Taux rétention, Délai livraison',
  },
  processus: {
    label: 'Processus internes',
    icon: '⬡',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,.08)',
    desc: 'Excellence opérationnelle & efficacité',
    examples: 'Taux de défaut, Cycle time, Taux automatisation',
  },
  apprentissage: {
    label: 'Apprentissage',
    icon: '✦',
    color: '#f87171',
    bg: 'rgba(248,113,113,.08)',
    desc: 'Capital humain, innovation & capacité de changement',
    examples: 'Satisfaction RH, Formations, Taux innovation, Turnover',
  },
}

const STATUS_CONFIG = {
  atteint:      { label: 'Atteint',    color: '#22d3a5', bg: 'rgba(34,211,165,.12)',  icon: '●' },
  'en-cours':   { label: 'En cours',   color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  icon: '◑' },
  'en-retard':  { label: 'En retard',  color: '#f87171', bg: 'rgba(248,113,113,.12)', icon: '○' },
  'non-defini': { label: 'Non défini', color: '#6b6a7a', bg: 'rgba(107,106,122,.12)', icon: '◌' },
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const EMPTY_OBJECTIVE = {
  name: '', description: '', perspective: 'finance',
  kpi: '', cible: '', valeurActuelle: '', unite: '',
  responsable: '', echeance: '', status: 'non-defini', poids: 1,
}

// ─── BSC Page ─────────────────────────────────────────────────────────────────
export default function BSCPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  // State
  const [project, setProject]               = useState(null)
  const [scorecards, setScorecards]         = useState([])
  const [activeId, setActiveId]             = useState(null)
  const [showNewForm, setShowNewForm]       = useState(false)
  const [newCard, setNewCard]               = useState({ name: '', vision: '', strategie: '' })
  const [editObj, setEditObj]               = useState(null)
  const [objForm, setObjForm]               = useState(EMPTY_OBJECTIVE)
  const [activePerspective, setActivePerspective] = useState('all')
  const [aiLoading, setAiLoading]           = useState(false)
  const [aiResult, setAiResult]             = useState(null)
  const [showAiPanel, setShowAiPanel]       = useState(false)
  const [toast, setToast]                   = useState(null)
  const [viewMode, setViewMode]             = useState('tableau')

  // Generation mode
  const [showGenModal, setShowGenModal]     = useState(false)
  const [genDescription, setGenDescription] = useState('')
  const [genCardName, setGenCardName]       = useState('')
  const [genLoading, setGenLoading]         = useState(false)
  const [genStep, setGenStep]               = useState('idle') // idle | loading | done

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.BSC || []
        setScorecards(list)
        if (list.length > 0) setActiveId(list[list.length - 1].id)
      }
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p => {
        if (p.id !== projectId) return p
        return { ...p, tools: { ...(p.tools || {}), BSC: updated } }
      })
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const active = scorecards.find(s => s.id === activeId) || null

  // ── Score helpers ──
  const computeScore = (objectives) => {
    if (!objectives?.length) return null
    const scored = objectives.filter(o => o.status !== 'non-defini')
    if (!scored.length) return null
    const totalWeight = scored.reduce((s, o) => s + (o.poids || 1), 0)
    const ws = scored.reduce((s, o) => {
      const val = o.status === 'atteint' ? 1 : o.status === 'en-cours' ? 0.5 : 0
      return s + val * (o.poids || 1)
    }, 0)
    return Math.round((ws / totalWeight) * 100)
  }

  const perspectiveScore = (key) => {
    if (!active) return null
    return computeScore((active.objectives || []).filter(o => o.perspective === key))
  }

  const globalScore = active ? computeScore(active.objectives) : null

  const filteredObjectives = (active?.objectives || []).filter(
    o => activePerspective === 'all' || o.perspective === activePerspective
  )

  // ── CRUD scorecards ──
  const createScorecard = (overrides = {}) => {
    const name = (overrides.name || newCard.name).trim()
    if (!name) return
    const s = {
      id: uid(),
      name,
      vision:    overrides.vision    || newCard.vision.trim(),
      strategie: overrides.strategie || newCard.strategie.trim(),
      createdAt: new Date().toISOString(),
      objectives: overrides.objectives || [],
      aiResult: null,
    }
    const updated = [...scorecards, s]
    setScorecards(updated)
    setActiveId(s.id)
    persist(updated)
    setShowNewForm(false)
    setNewCard({ name: '', vision: '', strategie: '' })
    return s
  }

  const deleteScorecard = (id) => {
    const updated = scorecards.filter(s => s.id !== id)
    setScorecards(updated)
    persist(updated)
    if (activeId === id) setActiveId(updated[updated.length - 1]?.id || null)
    showToast('Scorecard supprimée', 'info')
  }

  const updateScorecard = (patch) => {
    const updated = scorecards.map(s => s.id === activeId ? { ...s, ...patch } : s)
    setScorecards(updated)
    persist(updated)
  }

  // ── CRUD objectives ──
  const saveObjective = () => {
    if (!objForm.name.trim()) return
    const obj = {
      id: editObj?.id || uid(),
      ...objForm,
      name: objForm.name.trim(),
      poids: parseFloat(objForm.poids) || 1,
    }
    const objectives = editObj
      ? (active.objectives || []).map(o => o.id === editObj.id ? obj : o)
      : [...(active.objectives || []), obj]
    updateScorecard({ objectives })
    setEditObj(null)
    setObjForm(EMPTY_OBJECTIVE)
    showToast(editObj ? 'Objectif mis à jour' : 'Objectif ajouté')
  }

  const deleteObjective = (id) => {
    const objectives = (active.objectives || []).filter(o => o.id !== id)
    updateScorecard({ objectives })
    if (editObj?.id === id) { setEditObj(null); setObjForm(EMPTY_OBJECTIVE) }
  }

  const startEdit = (obj) => {
    setEditObj(obj)
    setObjForm({ ...obj })
    setActivePerspective(obj.perspective)
  }

  const updateStatus = (id, status) => {
    const objectives = (active.objectives || []).map(o => o.id === id ? { ...o, status } : o)
    updateScorecard({ objectives })
  }

  // ── AI Generation ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!genDescription.trim() || !genCardName.trim()) {
      showToast('Nom et description requis', 'error')
      return
    }
    setGenLoading(true)
    setGenStep('loading')
    try {
      const res = await fetch('/api/generer-management/generer-bsc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          description: genDescription,
          cardName: genCardName,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur serveur')

      const { result } = data
      // Create the scorecard with generated objectives
      const s = {
        id: uid(),
        name: genCardName.trim(),
        vision:    result.vision    || '',
        strategie: result.strategie || '',
        createdAt: new Date().toISOString(),
        objectives: result.objectives || [],
        aiResult: null,
        generatedSynthese: result.synthese || '',
      }
      const updated = [...scorecards, s]
      setScorecards(updated)
      setActiveId(s.id)
      persist(updated)

      setGenStep('done')
      showToast(`BSC "${s.name}" généré avec ${s.objectives.length} objectifs ✦`)
      setTimeout(() => {
        setShowGenModal(false)
        setGenStep('idle')
        setGenDescription('')
        setGenCardName('')
      }, 1200)
    } catch (err) {
      showToast(err.message, 'error')
      setGenStep('idle')
    }
    setGenLoading(false)
  }

  // ── AI Analysis ────────────────────────────────────────────────────────────
  const runAI = async () => {
    if (!active || !active.objectives?.length) {
      showToast('Ajoutez au moins un objectif', 'error')
      return
    }
    setAiLoading(true)
    setShowAiPanel(true)
    setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-balancescorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyse',
          cardName:    active.name,
          vision:      active.vision,
          strategie:   active.strategie,
          objectives:  active.objectives,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateScorecard({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) {
      showToast(err.message, 'error')
    }
    setAiLoading(false)
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportCard = () => {
    if (!active) return
    const exportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      scorecard: active,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `BSC_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Export JSON téléchargé')
  }

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const raw  = JSON.parse(evt.target.result)
        // Support both v2.0 wrapper and bare scorecard
        const card = raw.scorecard || raw
        if (!card.name || !Array.isArray(card.objectives)) {
          throw new Error('Format invalide')
        }
        // Re-assign a fresh id to avoid collision
        const imported = { ...card, id: uid(), createdAt: card.createdAt || new Date().toISOString() }
        const updated  = [...scorecards, imported]
        setScorecards(updated)
        setActiveId(imported.id)
        persist(updated)
        showToast(`"${imported.name}" importée (${imported.objectives.length} objectifs)`)
      } catch (err) {
        showToast('Fichier invalide : ' + err.message, 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = '' // reset for re-import
  }

  const getProgressWidth = (current, target) => {
    if (!current || !target) return 0
    const c = parseFloat(current)
    const t = parseFloat(target)
    if (isNaN(c) || isNaN(t) || t === 0) return 0
    return Math.min(100, Math.round((c / t) * 100))
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const css = `
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
    }
    body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

    .bsc-root { min-height: 100vh; display: flex; flex-direction: column; }

    /* ── Topbar ── */
    .topbar {
      height: 56px; background: var(--surface); border-bottom: 1px solid var(--border);
      display: flex; align-items: center; padding: 0 20px; gap: 12px;
      position: sticky; top: 0; z-index: 100;
    }
    .back-btn {
      display: flex; align-items: center; gap: 6px; padding: 6px 12px;
      border-radius: 6px; background: var(--surface2); border: 1px solid var(--border2);
      color: var(--muted2); font-family: 'Geist Mono', monospace; font-size: 11px;
      cursor: pointer; transition: all .15s;
    }
    .back-btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
    .topbar-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
    .topbar-project { font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace; }
    .topbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }

    .btn {
      display: flex; align-items: center; gap: 6px; padding: 7px 14px;
      border-radius: 6px; cursor: pointer; font-family: 'Geist Mono', monospace;
      font-size: 11px; letter-spacing: .04em; border: 1px solid var(--border2);
      background: var(--surface2); color: var(--muted2); transition: all .15s;
    }
    .btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
    .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .btn.primary:hover { background: #4f52d8; }
    .btn.ai { background: rgba(129,140,248,.1); border-color: rgba(129,140,248,.3); color: var(--accent2); }
    .btn.ai:hover { background: rgba(129,140,248,.2); }
    .btn.gen { background: rgba(34,211,165,.08); border-color: rgba(34,211,165,.3); color: #22d3a5; }
    .btn.gen:hover { background: rgba(34,211,165,.15); }
    .btn.active { background: var(--surface3); border-color: var(--border2); color: var(--text); }
    .btn:disabled { opacity: .4; cursor: not-allowed; }

    /* ── Layout ── */
    .bsc-body {
      flex: 1; display: grid; grid-template-columns: 240px 1fr 360px;
      height: calc(100vh - 56px); overflow: hidden;
    }

    /* ── Left: scorecards ── */
    .scorecards-panel {
      background: var(--surface); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .panel-header {
      padding: 16px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .panel-label {
      font-size: 10px; color: var(--muted); letter-spacing: .1em;
      text-transform: uppercase; font-family: 'Geist Mono', monospace;
    }
    .panel-actions { display: flex; gap: 4px; }
    .panel-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
    .scorecard-item {
      padding: 10px 12px; border-radius: 8px; cursor: pointer;
      border: 1px solid transparent; transition: all .15s;
      display: flex; align-items: flex-start; gap: 8px;
    }
    .scorecard-item:hover { background: var(--surface2); }
    .scorecard-item.active { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.25); }
    .scorecard-name { font-size: 12px; font-weight: 600; color: var(--text); }
    .scorecard-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 2px; }
    .scorecard-del {
      opacity: 0; background: none; border: none; color: #f87171;
      cursor: pointer; font-size: 12px; margin-left: auto; padding: 2px;
    }
    .scorecard-item:hover .scorecard-del { opacity: 1; }
    .score-badge {
      font-size: 10px; font-family: 'Geist Mono', monospace;
      padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-top: 4px; display: inline-block;
    }
    .ai-badge {
      font-size: 9px; padding: 1px 5px; border-radius: 3px; margin-left: 4px;
      background: rgba(34,211,165,.1); color: #22d3a5; font-family: 'Geist Mono', monospace;
    }
    .new-form { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
    .input {
      width: 100%; background: var(--bg); border: 1px solid var(--border2);
      border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif;
      font-size: 12px; color: var(--text); outline: none; transition: border-color .15s;
    }
    .input:focus { border-color: var(--accent); }
    .input::placeholder { color: var(--muted); }
    textarea.input { resize: vertical; min-height: 52px; }

    /* ── Center: main content ── */
    .main-panel { overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }

    /* ── BSC header ── */
    .bsc-header { display: flex; flex-direction: column; gap: 14px; }
    .bsc-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .bsc-title { font-family: 'Instrument Serif', serif; font-size: 22px; font-style: italic; }
    .bsc-vision { font-size: 12px; color: var(--muted2); line-height: 1.6; margin-top: 4px; }
    .bsc-gen-notice {
      font-size: 11px; color: #22d3a5; background: rgba(34,211,165,.07);
      border: 1px solid rgba(34,211,165,.2); border-radius: 6px; padding: 8px 12px;
      line-height: 1.6; font-family: 'Geist Mono', monospace;
    }

    /* ── Score ring ── */
    .score-ring-wrap { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .score-ring {
      width: 56px; height: 56px; border-radius: 50%;
      border: 3px solid var(--border2); display: flex; align-items: center;
      justify-content: center; position: relative; flex-shrink: 0;
    }
    .score-ring-num { font-size: 14px; font-weight: 800; font-family: 'Geist Mono', monospace; }
    .score-label { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }

    /* ── Perspective cards ── */
    .perspective-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .p-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 6px;
      transition: border-color .15s; cursor: pointer;
    }
    .p-card:hover { border-color: var(--border2); }
    .p-card-icon { font-size: 20px; margin-bottom: 2px; }
    .p-card-name { font-size: 12px; font-weight: 700; }
    .p-card-count { font-size: 10px; color: var(--muted2); font-family: 'Geist Mono', monospace; }
    .p-card-bar { height: 3px; border-radius: 2px; background: var(--border); margin-top: 4px; overflow: hidden; }
    .p-card-bar-fill { height: 100%; border-radius: 2px; transition: width .4s ease; }

    /* ── Objectives ── */
    .objectives-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .view-toggle { display: flex; gap: 4px; }

    /* Table view */
    .obj-table { width: 100%; border-collapse: collapse; }
    .obj-table th {
      text-align: left; padding: 8px 12px; font-size: 10px;
      color: var(--muted); letter-spacing: .08em; text-transform: uppercase;
      font-family: 'Geist Mono', monospace; border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    .obj-table td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .obj-table tr:hover td { background: var(--surface2); }
    .obj-table tr:last-child td { border-bottom: none; }
    .obj-name-cell { display: flex; flex-direction: column; gap: 3px; }
    .obj-name { font-weight: 600; }
    .obj-kpi { font-size: 10px; color: var(--muted2); font-family: 'Geist Mono', monospace; }
    .progress-bar { width: 80px; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 2px; transition: width .3s ease; }
    .status-select {
      background: var(--surface3); border: 1px solid var(--border);
      border-radius: 4px; padding: 3px 6px; font-size: 10px;
      font-family: 'Geist Mono', monospace; color: var(--text); cursor: pointer; outline: none;
    }
    .icon-btn {
      width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center;
      justify-content: center; background: none; border: none; cursor: pointer;
      font-size: 12px; transition: background .15s; color: var(--muted2);
    }
    .icon-btn:hover { background: var(--surface3); color: var(--text); }
    .actions-cell { display: flex; gap: 4px; align-items: center; }

    /* Card view */
    .obj-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
    .obj-card {
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
      transition: border-color .15s;
    }
    .obj-card:hover { border-color: var(--border2); }
    .obj-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .obj-card-name { font-size: 13px; font-weight: 700; flex: 1; }
    .obj-card-kpi { font-size: 11px; color: var(--muted2); font-family: 'Geist Mono', monospace; }
    .obj-card-metrics { display: flex; gap: 8px; flex-wrap: wrap; }
    .metric-chip {
      font-size: 10px; font-family: 'Geist Mono', monospace; color: var(--muted2);
      background: var(--surface3); padding: 2px 7px; border-radius: 4px;
    }
    .obj-card-footer { display: flex; align-items: center; justify-content: space-between; }
    .obj-card-actions { display: flex; gap: 4px; }
    .status-chip {
      display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px;
      border-radius: 4px; font-size: 10px; font-family: 'Geist Mono', monospace; font-weight: 600;
    }

    /* ── Right: form panel ── */
    .form-panel {
      background: var(--surface); border-left: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .form-scroll { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
    .form-label {
      font-size: 10px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase;
      margin-bottom: 4px; display: block; font-family: 'Geist Mono', monospace;
    }
    .form-group { display: flex; flex-direction: column; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .perspective-select-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .p-select-item {
      padding: 8px 10px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--border); background: var(--surface2);
      transition: all .15s; display: flex; align-items: center; gap: 6px;
    }
    .p-select-item:hover { border-color: var(--border2); }
    .status-select-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .status-item {
      padding: 6px 10px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--border); background: var(--surface2);
      transition: all .15s; font-size: 11px; font-family: 'Geist Mono', monospace;
      display: flex; align-items: center; gap: 5px; font-weight: 600;
    }
    .status-item:hover { border-color: var(--border2); }
    .poids-display { font-family: 'Geist Mono', monospace; font-size: 13px; color: var(--accent2); font-weight: 700; }
    .range-input { width: 100%; accent-color: var(--accent); margin-top: 4px; }
    .section-sep { height: 1px; background: var(--border); }

    /* ── AI Panel ── */
    .ai-panel {
      position: fixed; right: 0; top: 56px; bottom: 0; width: 440px;
      background: var(--surface); border-left: 1px solid var(--border);
      z-index: 80; display: flex; flex-direction: column; overflow: hidden;
      transform: translateX(100%); transition: transform .3s ease;
    }
    .ai-panel.open { transform: translateX(0); }
    .ai-panel-header {
      padding: 16px 20px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .ai-panel-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
    .ai-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .ai-section-title {
      font-size: 11px; color: var(--muted2); letter-spacing: .08em;
      text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 8px;
    }
    .ai-box {
      background: var(--surface2); border: 1px solid var(--border2);
      border-radius: 10px; padding: 14px; font-size: 13px; color: var(--text); line-height: 1.7;
    }
    .ai-obj-reco {
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 8px; padding: 12px; display: flex; gap: 10px;
    }
    .ai-obj-icon { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
    .ai-obj-name { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
    .ai-obj-text { font-size: 12px; color: var(--muted2); line-height: 1.6; }
    .ai-action-chip {
      font-size: 11px; margin-top: 6px; padding: 3px 8px; border-radius: 4px;
      display: inline-block; font-family: 'Geist Mono', monospace;
    }
    .ai-loading { display: flex; align-items: center; gap: 12px; padding: 24px; color: var(--muted2); font-size: 13px; }
    .spinner {
      width: 18px; height: 18px; border: 2px solid var(--border2);
      border-top-color: var(--accent2); border-radius: 50%; animation: spin .7s linear infinite;
    }
    .spinner.green { border-top-color: #22d3a5; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ai-gauge-wrap { display: flex; flex-direction: column; gap: 8px; }
    .ai-gauge-row { display: flex; flex-direction: column; gap: 4px; }
    .ai-gauge-label { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
    .ai-gauge-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .ai-gauge-fill { height: 100%; border-radius: 3px; transition: width .6s ease; }
    .prio-item {
      display: flex; gap: 10px; align-items: flex-start; padding: 8px 12px;
      background: var(--surface2); border-radius: 6px; border: 1px solid var(--border);
    }
    .prio-num { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--muted); padding-top: 1px; }
    .prio-text { font-size: 12px; color: var(--text); line-height: 1.6; }

    /* ── Generation Modal ── */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 200;
      display: flex; align-items: center; justify-content: center; padding: 20px;
      backdrop-filter: blur(4px);
    }
    .modal {
      background: var(--surface); border: 1px solid var(--border2);
      border-radius: 16px; padding: 28px; width: 100%; max-width: 560px;
      display: flex; flex-direction: column; gap: 18px;
      box-shadow: 0 32px 80px rgba(0,0,0,.6);
    }
    .modal-title { font-family: 'Instrument Serif', serif; font-size: 22px; font-style: italic; }
    .modal-sub { font-size: 12px; color: var(--muted2); line-height: 1.6; }
    .gen-step-indicator {
      display: flex; align-items: center; gap: 8px; font-size: 12px;
      color: #22d3a5; font-family: 'Geist Mono', monospace;
      padding: 10px 14px; background: rgba(34,211,165,.07);
      border: 1px solid rgba(34,211,165,.2); border-radius: 8px;
    }
    .gen-done {
      font-size: 20px; text-align: center; padding: 24px 0;
      color: #22d3a5; font-family: 'Geist Mono', monospace;
    }

    /* ── Empty states ── */
    .empty-cta { padding: 40px 20px; text-align: center; }
    .empty-icon { font-size: 36px; opacity: .25; margin-bottom: 12px; }
    .empty-txt { font-size: 13px; color: var(--muted); line-height: 1.6; }

    /* ── Toast ── */
    .toast {
      position: fixed; bottom: 24px; right: 24px; z-index: 500;
      background: var(--surface2); border: 1px solid var(--border2);
      border-radius: 8px; padding: 12px 18px; font-size: 13px;
      box-shadow: 0 8px 32px rgba(0,0,0,.4); animation: slideUp .2s ease;
      display: flex; align-items: center; gap: 8px;
    }
    .toast.error { border-color: rgba(248,113,113,.3); color: #f87171; }
    .toast.info  { border-color: rgba(99,102,241,.3); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 1100px) {
      .bsc-body { grid-template-columns: 200px 1fr; }
      .form-panel { display: none; }
      .perspective-cards { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 700px) {
      .bsc-body { grid-template-columns: 1fr; }
      .scorecards-panel { display: none; }
      .perspective-cards { grid-template-columns: repeat(2, 1fr); }
    }
  `

  return (
    <>
      <style>{css}</style>

      <div className="bsc-root">

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>
            ← Retour
          </button>
          <div>
            <div className="topbar-title">Balanced Scorecard</div>
            {project && <div className="topbar-project">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {/* Import hidden input */}
            <input
              ref={importRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
            <button className="btn" onClick={() => importRef.current?.click()}>
              ↑ Importer
            </button>
            {active && (
              <>
                <button className="btn" onClick={exportCard}>↓ Exporter</button>
                <button
                  className="btn ai"
                  onClick={runAI}
                  disabled={aiLoading || !active?.objectives?.length}
                >
                  {aiLoading
                    ? <><span className="spinner" /> Analyse…</>
                    : '✦ Analyse IA'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="bsc-body">

          {/* ── Left: scorecards list ── */}
          <aside className="scorecards-panel">
            <div className="panel-header">
              <span className="panel-label">Scorecards ({scorecards.length})</span>
            </div>
            <div className="panel-list">
              {scorecards.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">⬡</div>
                  <div className="empty-txt">Générez ou créez votre première scorecard</div>
                </div>
              )}
              {scorecards.map(s => {
                const score = computeScore(s.objectives)
                const scoreColor = score === null ? 'var(--muted)'
                  : score >= 70 ? '#22d3a5'
                  : score >= 40 ? '#f59e0b'
                  : '#f87171'
                const isAIGenerated = s.generatedSynthese

                return (
                  <div
                    key={s.id}
                    className={`scorecard-item ${activeId === s.id ? 'active' : ''}`}
                    onClick={() => setActiveId(s.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="scorecard-name">
                        {s.name}
                        {isAIGenerated && <span className="ai-badge">✦ IA</span>}
                      </div>
                      <div className="scorecard-meta">
                        {s.objectives?.length || 0} obj. · {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </div>
                      {score !== null && (
                        <span className="score-badge" style={{ background: `color-mix(in srgb, ${scoreColor} 15%, transparent)`, color: scoreColor }}>
                          {score}%
                        </span>
                      )}
                    </div>
                    <button className="scorecard-del" onClick={e => { e.stopPropagation(); deleteScorecard(s.id) }}>✕</button>
                  </div>
                )
              })}
            </div>

            {/* Bottom actions */}
            <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* AI Generate CTA */}
              <button className="btn gen" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowGenModal(true)}>
                ✦ Générer par IA
              </button>
              {/* Manual create */}
              {showNewForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <input
                    className="input"
                    placeholder="Nom de la scorecard"
                    value={newCard.name}
                    onChange={e => setNewCard(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && createScorecard()}
                    autoFocus
                  />
                  <textarea
                    className="input"
                    placeholder="Vision stratégique (optionnel)"
                    value={newCard.vision}
                    onChange={e => setNewCard(p => ({ ...p, vision: e.target.value }))}
                    rows={2}
                  />
                  <textarea
                    className="input"
                    placeholder="Axes stratégiques (optionnel)"
                    value={newCard.strategie}
                    onChange={e => setNewCard(p => ({ ...p, strategie: e.target.value }))}
                    rows={2}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn primary" style={{ flex: 1 }} onClick={() => createScorecard()}>Créer</button>
                    <button className="btn" onClick={() => setShowNewForm(false)}>Annuler</button>
                  </div>
                </div>
              ) : (
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>
                  + Créer manuellement
                </button>
              )}
            </div>
          </aside>

          {/* ── Center: main ── */}
          <main className="main-panel">
            {!active ? (
              <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, opacity: .15, marginBottom: 20 }}>⬡</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, fontStyle: 'italic', marginBottom: 12 }}>
                  Démarrez votre Balanced Scorecard
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.7 }}>
                  Décrivez votre projet et laissez l'IA construire un BSC complet,<br />
                  ou créez-le manuellement perspective par perspective.
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn gen" style={{ padding: '10px 20px', fontSize: 13 }} onClick={() => setShowGenModal(true)}>
                    ✦ Générer par IA
                  </button>
                  <button className="btn" style={{ padding: '10px 20px', fontSize: 13 }} onClick={() => importRef.current?.click()}>
                    ↑ Importer un JSON
                  </button>
                  <button className="btn" style={{ padding: '10px 20px', fontSize: 13 }} onClick={() => setShowNewForm(true)}>
                    + Créer manuellement
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bsc-header">
                  <div className="bsc-title-row">
                    <div style={{ flex: 1 }}>
                      <h2 className="bsc-title">{active.name}</h2>
                      {active.vision    && <p className="bsc-vision">Vision : {active.vision}</p>}
                      {active.strategie && <p className="bsc-vision" style={{ marginTop: 2 }}>Stratégie : {active.strategie}</p>}
                      {active.generatedSynthese && (
                        <p className="bsc-gen-notice" style={{ marginTop: 8 }}>
                          ✦ BSC généré par IA — {active.generatedSynthese}
                        </p>
                      )}
                    </div>
                    {globalScore !== null && (
                      <div className="score-ring-wrap">
                        <div
                          className="score-ring"
                          style={{
                            borderColor: globalScore >= 70 ? '#22d3a5' : globalScore >= 40 ? '#f59e0b' : '#f87171',
                            boxShadow: `0 0 20px ${globalScore >= 70 ? 'rgba(34,211,165,.2)' : globalScore >= 40 ? 'rgba(245,158,11,.2)' : 'rgba(248,113,113,.2)'}`,
                          }}
                        >
                          <span className="score-ring-num" style={{ color: globalScore >= 70 ? '#22d3a5' : globalScore >= 40 ? '#f59e0b' : '#f87171' }}>
                            {globalScore}%
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700 }}>Score global</div>
                          <div className="score-label">pondéré</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Perspective summary cards */}
                  <div className="perspective-cards">
                    {Object.entries(PERSPECTIVES).map(([key, p]) => {
                      const count    = (active.objectives || []).filter(o => o.perspective === key).length
                      const pScore   = perspectiveScore(key)
                      const attained = (active.objectives || []).filter(o => o.perspective === key && o.status === 'atteint').length
                      return (
                        <div
                          key={key}
                          className={`p-card ${activePerspective === key ? 'selected' : ''}`}
                          style={{
                            borderColor: activePerspective === key ? `color-mix(in srgb, ${p.color} 35%, transparent)` : undefined,
                            background: activePerspective === key ? p.bg : undefined,
                          }}
                          onClick={() => setActivePerspective(activePerspective === key ? 'all' : key)}
                        >
                          <div className="p-card-icon" style={{ color: p.color }}>{p.icon}</div>
                          <div className="p-card-name" style={{ color: p.color }}>{p.label}</div>
                          <div className="p-card-count">{count} objectif{count !== 1 ? 's' : ''} · {attained} atteint{attained !== 1 ? 's' : ''}</div>
                          <div className="p-card-bar">
                            <div className="p-card-bar-fill" style={{ width: pScore !== null ? `${pScore}%` : '0%', background: p.color }} />
                          </div>
                          {pScore !== null && (
                            <span style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', color: p.color, fontWeight: 700 }}>
                              {pScore}%
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Objectives section */}
                <div>
                  <div className="objectives-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {activePerspective === 'all'
                          ? `Tous les objectifs (${active.objectives?.length || 0})`
                          : `${PERSPECTIVES[activePerspective]?.label} (${filteredObjectives.length})`}
                      </span>
                      {activePerspective !== 'all' && (
                        <button className="btn" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => setActivePerspective('all')}>
                          ✕ Réinitialiser
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div className="view-toggle">
                        <button className={`btn ${viewMode === 'tableau' ? 'active' : ''}`} style={{ padding: '5px 10px' }} onClick={() => setViewMode('tableau')}>
                          ⊞ Tableau
                        </button>
                        <button className={`btn ${viewMode === 'carte' ? 'active' : ''}`} style={{ padding: '5px 10px' }} onClick={() => setViewMode('carte')}>
                          ⊟ Cartes
                        </button>
                      </div>
                      <button
                        className="btn primary"
                        style={{ padding: '5px 12px', fontSize: 11 }}
                        onClick={() => {
                          setEditObj(false)
                          setObjForm({ ...EMPTY_OBJECTIVE, perspective: activePerspective !== 'all' ? activePerspective : 'finance' })
                        }}
                      >
                        + Ajouter
                      </button>
                    </div>
                  </div>

                  {filteredObjectives.length === 0 ? (
                    <div className="empty-cta">
                      <div className="empty-icon">◎</div>
                      <div className="empty-txt">
                        Aucun objectif{activePerspective !== 'all' ? ` dans "${PERSPECTIVES[activePerspective]?.label}"` : ''}.<br />
                        Ajoutez-en un via le bouton "Ajouter" ou utilisez "Générer par IA".
                      </div>
                    </div>
                  ) : viewMode === 'tableau' ? (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginTop: 12 }}>
                      <table className="obj-table">
                        <thead>
                          <tr>
                            <th>Objectif</th>
                            <th>Perspective</th>
                            <th>KPI</th>
                            <th>Cible</th>
                            <th>Actuel</th>
                            <th>Progression</th>
                            <th>Statut</th>
                            <th>Responsable</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredObjectives.map(o => {
                            const persp    = PERSPECTIVES[o.perspective]
                            const status   = STATUS_CONFIG[o.status] || STATUS_CONFIG['non-defini']
                            const progress = getProgressWidth(o.valeurActuelle, o.cible)
                            return (
                              <tr key={o.id}>
                                <td>
                                  <div className="obj-name-cell">
                                    <span className="obj-name">{o.name}</span>
                                    {o.description && <span className="obj-kpi">{o.description}</span>}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', fontWeight: 700, color: persp?.color, background: persp?.bg, padding: '2px 7px', borderRadius: 4 }}>
                                    {persp?.icon} {persp?.label}
                                  </span>
                                </td>
                                <td><span className="obj-kpi">{o.kpi || '—'}</span></td>
                                <td>
                                  <span style={{ fontFamily: 'Geist Mono,monospace', fontSize: 11 }}>
                                    {o.cible ? `${o.cible}${o.unite ? ' ' + o.unite : ''}` : '—'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontFamily: 'Geist Mono,monospace', fontSize: 11 }}>
                                    {o.valeurActuelle ? `${o.valeurActuelle}${o.unite ? ' ' + o.unite : ''}` : '—'}
                                  </span>
                                </td>
                                <td>
                                  {progress > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${progress}%`, background: persp?.color }} />
                                      </div>
                                      <span style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', color: 'var(--muted2)' }}>{progress}%</span>
                                    </div>
                                  ) : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                                </td>
                                <td>
                                  <select
                                    className="status-select"
                                    value={o.status}
                                    onChange={e => updateStatus(o.id, e.target.value)}
                                    style={{ color: status.color }}
                                  >
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                      <option key={k} value={k}>{v.icon} {v.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td><span style={{ fontSize: 11, color: 'var(--muted2)' }}>{o.responsable || '—'}</span></td>
                                <td>
                                  <div className="actions-cell">
                                    <button className="icon-btn" onClick={() => startEdit(o)}>✎</button>
                                    <button className="icon-btn" style={{ color: '#f87171' }} onClick={() => deleteObjective(o.id)}>✕</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="obj-cards-grid" style={{ marginTop: 12 }}>
                      {filteredObjectives.map(o => {
                        const persp    = PERSPECTIVES[o.perspective]
                        const status   = STATUS_CONFIG[o.status] || STATUS_CONFIG['non-defini']
                        const progress = getProgressWidth(o.valeurActuelle, o.cible)
                        return (
                          <div key={o.id} className="obj-card" style={{ borderColor: `color-mix(in srgb, ${persp?.color} 15%, transparent)` }}>
                            <div className="obj-card-header">
                              <span className="obj-card-name">{o.name}</span>
                              <span style={{ background: persp?.bg, color: persp?.color, fontSize: 10, padding: '2px 7px', borderRadius: 4, fontFamily: 'Geist Mono,monospace', fontWeight: 700 }}>
                                {persp?.icon}
                              </span>
                            </div>
                            {o.kpi && <span className="obj-card-kpi">KPI : {o.kpi}</span>}
                            {progress > 0 && (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted2)', marginBottom: 4, fontFamily: 'Geist Mono,monospace' }}>
                                  <span>{o.valeurActuelle}{o.unite ? ' ' + o.unite : ''} / {o.cible}{o.unite ? ' ' + o.unite : ''}</span>
                                  <span style={{ color: persp?.color }}>{progress}%</span>
                                </div>
                                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${progress}%`, background: persp?.color, borderRadius: 2 }} />
                                </div>
                              </div>
                            )}
                            <div className="obj-card-metrics">
                              {o.cible      && <span className="metric-chip">Cible : {o.cible}{o.unite ? ' ' + o.unite : ''}</span>}
                              {o.responsable && <span className="metric-chip">{o.responsable}</span>}
                              {o.echeance    && <span className="metric-chip">{o.echeance}</span>}
                            </div>
                            <div className="obj-card-footer">
                              <span className="status-chip" style={{ background: status.bg, color: status.color }}>
                                {status.icon} {status.label}
                              </span>
                              <div className="obj-card-actions">
                                <button className="icon-btn" onClick={() => startEdit(o)}>✎</button>
                                <button className="icon-btn" style={{ color: '#f87171' }} onClick={() => deleteObjective(o.id)}>✕</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </main>

          {/* ── Right: form panel ── */}
          <aside className="form-panel">
            <div className="panel-header">
              <span className="panel-label">
                {editObj !== null ? (editObj ? `Modifier "${editObj.name}"` : 'Nouvel objectif') : 'Détails'}
              </span>
              {active && editObj === null && (
                <button className="btn" style={{ padding: '5px 10px', fontSize: 10 }} onClick={() => {
                  setEditObj(false)
                  setObjForm({ ...EMPTY_OBJECTIVE, perspective: activePerspective !== 'all' ? activePerspective : 'finance' })
                }}>
                  + Ajouter
                </button>
              )}
            </div>

            {editObj !== null ? (
              <div className="form-scroll">
                <div className="form-group">
                  <label className="form-label">Nom de l'objectif *</label>
                  <input
                    className="input"
                    placeholder="Ex: Augmenter le CA de 20%"
                    value={objForm.name}
                    onChange={e => setObjForm(p => ({ ...p, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="input" rows={2} placeholder="Contexte, enjeux…"
                    value={objForm.description}
                    onChange={e => setObjForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="section-sep" />
                <div className="form-group">
                  <label className="form-label">Perspective *</label>
                  <div className="perspective-select-grid">
                    {Object.entries(PERSPECTIVES).map(([key, p]) => (
                      <div
                        key={key}
                        className={`p-select-item ${objForm.perspective === key ? 'selected' : ''}`}
                        style={objForm.perspective === key ? { background: p.bg, borderColor: `color-mix(in srgb, ${p.color} 40%, transparent)` } : {}}
                        onClick={() => setObjForm(prev => ({ ...prev, perspective: key }))}
                      >
                        <span style={{ color: p.color }}>{p.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: objForm.perspective === key ? p.color : 'var(--muted2)' }}>{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="section-sep" />
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">KPI / Indicateur</label>
                    <input className="input" placeholder="Ex: Taux de croissance" value={objForm.kpi}
                      onChange={e => setObjForm(p => ({ ...p, kpi: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unité</label>
                    <input className="input" placeholder="%, k€, pts…" value={objForm.unite}
                      onChange={e => setObjForm(p => ({ ...p, unite: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Valeur cible</label>
                    <input className="input" type="number" placeholder="Ex: 100" value={objForm.cible}
                      onChange={e => setObjForm(p => ({ ...p, cible: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valeur actuelle</label>
                    <input className="input" type="number" placeholder="Ex: 67" value={objForm.valeurActuelle}
                      onChange={e => setObjForm(p => ({ ...p, valeurActuelle: e.target.value }))} />
                  </div>
                </div>
                <div className="section-sep" />
                <div className="form-group">
                  <label className="form-label">Statut</label>
                  <div className="status-select-grid">
                    {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                      <div
                        key={key}
                        className="status-item"
                        style={objForm.status === key ? { background: s.bg, borderColor: `color-mix(in srgb, ${s.color} 40%, transparent)`, color: s.color } : {}}
                        onClick={() => setObjForm(p => ({ ...p, status: key }))}
                      >
                        <span>{s.icon}</span> {s.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Responsable</label>
                    <input className="input" placeholder="Nom / équipe" value={objForm.responsable}
                      onChange={e => setObjForm(p => ({ ...p, responsable: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Échéance</label>
                    <input className="input" type="date" value={objForm.echeance}
                      onChange={e => setObjForm(p => ({ ...p, echeance: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Poids — <span className="poids-display">{objForm.poids}x</span>
                  </label>
                  <input type="range" className="range-input" min="1" max="5" step="1"
                    value={objForm.poids}
                    onChange={e => setObjForm(p => ({ ...p, poids: e.target.value }))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace', marginTop: 2 }}>
                    <span>Faible</span><span>Important</span><span>Critique</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
                  <button className="btn primary" style={{ flex: 1 }} onClick={saveObjective}>
                    {editObj ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                  <button className="btn" onClick={() => { setEditObj(null); setObjForm(EMPTY_OBJECTIVE) }}>Annuler</button>
                </div>
              </div>
            ) : (
              <div className="empty-cta">
                {!active ? (
                  <div className="empty-txt">Sélectionnez une scorecard</div>
                ) : (
                  <>
                    <div style={{ fontSize: 28, opacity: .2, marginBottom: 12 }}>◎</div>
                    <div className="empty-txt">Cliquez sur un objectif pour le modifier, ou ajoutez-en un nouveau.</div>
                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(PERSPECTIVES).map(([key, p]) => (
                        <div key={key} style={{ background: p.bg, border: `1px solid color-mix(in srgb, ${p.color} 20%, transparent)`, borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: p.color, marginBottom: 3 }}>{p.icon} {p.label}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted2)', lineHeight: 1.5 }}>{p.examples}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* ── AI Analysis Panel ── */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-panel-header">
            <span className="ai-panel-title">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-content">
            {aiLoading && (
              <div className="ai-loading">
                <div className="spinner" />
                Analyse en cours par Claude…
              </div>
            )}

            {!aiLoading && !aiResult && active?.aiResult && (() => { setAiResult(active.aiResult); return null })()}

            {aiResult && (
              <>
                {aiResult.synthese && (
                  <div>
                    <div className="ai-section-title">Synthèse stratégique</div>
                    <div className="ai-box">{aiResult.synthese}</div>
                  </div>
                )}
                {aiResult.scoreParPerspective && (
                  <div>
                    <div className="ai-section-title">Maturité par perspective</div>
                    <div className="ai-gauge-wrap">
                      {Object.entries(aiResult.scoreParPerspective).map(([key, val]) => {
                        const p = PERSPECTIVES[key]
                        if (!p) return null
                        return (
                          <div key={key} className="ai-gauge-row">
                            <div className="ai-gauge-label">
                              <span style={{ fontSize: 11, fontWeight: 600, color: p.color }}>{p.icon} {p.label}</span>
                              <span style={{ fontFamily: 'Geist Mono,monospace', fontSize: 11, color: p.color }}>{val}%</span>
                            </div>
                            <div className="ai-gauge-bar">
                              <div className="ai-gauge-fill" style={{ width: `${val}%`, background: p.color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {aiResult.recommandations?.length > 0 && (
                  <div>
                    <div className="ai-section-title">Recommandations par objectif</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {aiResult.recommandations.map((r, i) => {
                        const p = PERSPECTIVES[r.perspective] || PERSPECTIVES.finance
                        return (
                          <div key={i} className="ai-obj-reco">
                            <span className="ai-obj-icon" style={{ color: p.color }}>{p.icon}</span>
                            <div>
                              <div className="ai-obj-name">{r.objectif}</div>
                              <div className="ai-obj-text">{r.analyse}</div>
                              <span className="ai-action-chip" style={{ background: p.bg, color: p.color, border: `1px solid color-mix(in srgb, ${p.color} 25%, transparent)` }}>
                                {r.action}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {aiResult.alignement && (
                  <div>
                    <div className="ai-section-title">Alignement stratégique</div>
                    <div className="ai-box">{aiResult.alignement}</div>
                  </div>
                )}
                {aiResult.priorites?.length > 0 && (
                  <div>
                    <div className="ai-section-title">Priorités d'action</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiResult.priorites.map((p, i) => (
                        <div key={i} className="prio-item">
                          <span className="prio-num">#{i + 1}</span>
                          <span className="prio-text">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiResult.conclusion && (
                  <div>
                    <div className="ai-section-title">Conclusion</div>
                    <div className="ai-box" style={{ fontStyle: 'italic', color: 'var(--muted2)' }}>{aiResult.conclusion}</div>
                  </div>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div className="empty-cta">
                <div className="empty-icon">✦</div>
                <div className="empty-txt">
                  Cliquez sur "Analyse IA" pour obtenir une évaluation stratégique complète de votre Balanced Scorecard.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── AI Generation Modal ── */}
        {showGenModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !genLoading) setShowGenModal(false) }}>
            <div className="modal">
              <div>
                <div className="modal-title">✦ Générer un BSC par IA</div>
                <div className="modal-sub" style={{ marginTop: 6 }}>
                  Décrivez votre projet, organisation ou contexte stratégique. Claude va construire automatiquement un Balanced Scorecard complet avec des objectifs, KPIs et cibles adaptés à votre secteur.
                </div>
              </div>

              {genStep === 'done' ? (
                <div className="gen-done">
                  ✓ BSC généré avec succès
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Nom du Balanced Scorecard *</label>
                    <input
                      className="input"
                      placeholder="Ex: BSC 2025 — Croissance Internationale"
                      value={genCardName}
                      onChange={e => setGenCardName(e.target.value)}
                      disabled={genLoading}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description du projet / organisation *</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 140, resize: 'vertical' }}
                      placeholder={`Exemples :\n• "Startup SaaS B2B dans la logistique, 20 employés, objectif : atteindre 1M€ ARR en 18 mois. Notre principal défi est la rétention client et l'automatisation des processus."\n• "Cabinet de conseil RH en croissance, souhaitant structurer sa performance autour de la qualité de service, la fidélisation des talents et la diversification des offres."`}
                      value={genDescription}
                      onChange={e => setGenDescription(e.target.value)}
                      disabled={genLoading}
                    />
                  </div>

                  {genLoading && (
                    <div className="gen-step-indicator">
                      <span className="spinner green" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Claude analyse votre contexte et génère les objectifs BSC…
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn gen"
                      style={{ flex: 1, padding: '10px 0', justifyContent: 'center', fontSize: 13 }}
                      onClick={handleGenerate}
                      disabled={genLoading || !genDescription.trim() || !genCardName.trim()}
                    >
                      {genLoading ? 'Génération en cours…' : '✦ Générer le BSC'}
                    </button>
                    <button
                      className="btn"
                      style={{ padding: '10px 16px' }}
                      onClick={() => { if (!genLoading) setShowGenModal(false) }}
                      disabled={genLoading}
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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

