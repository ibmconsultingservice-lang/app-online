'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const SEVEN_P = {
  product:      { label: 'Produit',      icon: '⬡', color: '#60a5fa', desc: 'Caractéristiques, qualité, design, marque, packaging, gamme' },
  price:        { label: 'Prix',         icon: '◈', color: '#34d399', desc: 'Stratégie tarifaire, remises, conditions de paiement, valeur perçue' },
  place:        { label: 'Distribution', icon: '◎', color: '#f59e0b', desc: 'Canaux de vente, couverture, logistique, accessibilité' },
  promotion:    { label: 'Promotion',    icon: '✦', color: '#f472b6', desc: 'Communication, publicité, relations presse, réseaux sociaux' },
  people:       { label: 'Personnel',    icon: '●', color: '#a78bfa', desc: 'Équipe, compétences, culture, expérience client' },
  process:      { label: 'Processus',    icon: '◑', color: '#fb923c', desc: 'Procédures, automatisation, parcours client, efficacité opérationnelle' },
  physical:     { label: 'Preuve physique', icon: '▣', color: '#2dd4bf', desc: 'Environnement, apparence, témoignages, certifications, preuves tangibles' },
}

const SCORE_COLORS = { 1: '#f87171', 2: '#fb923c', 3: '#facc15', 4: '#34d399', 5: '#22d3a5' }

const THEMES = {
  obsidian: {
    name: 'Obsidian',
    bg: '#080810', surface: '#0f0f1a', surface2: '#161623', surface3: '#1c1c2e',
    border: 'rgba(255,255,255,.06)', border2: 'rgba(255,255,255,.11)',
    text: '#eeedf5', muted: '#5e5d6e', muted2: '#9290a8',
    accent: '#6366f1', accent2: '#818cf8',
  },
  midnight: {
    name: 'Midnight',
    bg: '#050d1a', surface: '#0a1628', surface2: '#0f1f36', surface3: '#152844',
    border: 'rgba(96,165,250,.08)', border2: 'rgba(96,165,250,.15)',
    text: '#e8f0fe', muted: '#4a5e7a', muted2: '#7a9bb5',
    accent: '#3b82f6', accent2: '#60a5fa',
  },
  forest: {
    name: 'Forest',
    bg: '#050f0a', surface: '#091710', surface2: '#0e2016', surface3: '#132a1d',
    border: 'rgba(52,211,153,.07)', border2: 'rgba(52,211,153,.14)',
    text: '#e8f5ee', muted: '#3d5c48', muted2: '#6b9e80',
    accent: '#10b981', accent2: '#34d399',
  },
  ember: {
    name: 'Ember',
    bg: '#100806', surface: '#1a0e0a', surface2: '#221410', surface3: '#2c1a14',
    border: 'rgba(251,146,60,.07)', border2: 'rgba(251,146,60,.14)',
    text: '#faf0e8', muted: '#6b4535', muted2: '#b07855',
    accent: '#f97316', accent2: '#fb923c',
  },
  slate: {
    name: 'Slate',
    bg: '#0c0e12', surface: '#13161c', surface2: '#191d24', surface3: '#1f242e',
    border: 'rgba(255,255,255,.06)', border2: 'rgba(255,255,255,.10)',
    text: '#dde2ee', muted: '#505870', muted2: '#8891aa',
    accent: '#8b5cf6', accent2: '#a78bfa',
  },
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const EMPTY_ITEM = (p_key) => ({
  id: uid(),
  p_key,
  title: '',
  description: '',
  score: 3,
  status: 'actif',   // actif | planifié | en-cours | à-améliorer
  notes: '',
})

const DEFAULT_ANALYSIS = () => ({
  id:          uid(),
  name:        '',
  projectDesc: '',
  myCompany:   '',
  sector:      '',
  region:      '',
  targetMarket: '',
  objectives:  '',
  createdAt:   new Date().toISOString(),
  generatedAt: null,
  items:       [],
  aiResult:    null,
  themeKey:    'obsidian',
})

const STATUS_CFG = {
  'actif':        { label: 'Actif',      color: '#34d399' },
  'planifié':     { label: 'Planifié',   color: '#60a5fa' },
  'en-cours':     { label: 'En cours',   color: '#f59e0b' },
  'à-améliorer':  { label: 'À améliorer',color: '#f87171' },
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Mix7PPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,      setProject]      = useState(null)
  const [analyses,     setAnalyses]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [newName,      setNewName]      = useState('')
  const [activeView,   setActiveView]   = useState('generate')  // generate | setup | report
  const [activeP,      setActiveP]      = useState('product')
  const [editItem,     setEditItem]     = useState(null)        // null | false | item obj
  const [itemForm,     setItemForm]     = useState(null)
  const [toast,        setToast]        = useState(null)
  const [genLoading,   setGenLoading]   = useState(false)
  const [genStep,      setGenStep]      = useState('')
  const [anlLoading,   setAnlLoading]   = useState(false)
  const [themeKey,     setThemeKey]     = useState('obsidian')

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.Mix7P || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          setThemeKey(last.themeKey || 'obsidian')
          setActiveView(last.aiResult ? 'report' : last.generatedAt ? 'setup' : 'generate')
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), Mix7P: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const active = analyses.find(a => a.id === activeId) || null
  const t = THEMES[themeKey] || THEMES.obsidian

  // ── CRUD analyses ──
  const createAnalysis = () => {
    if (!newName.trim()) return
    const a = { ...DEFAULT_ANALYSIS(), id: uid(), name: newName.trim() }
    const updated = [...analyses, a]
    setAnalyses(updated)
    setActiveId(a.id)
    setActiveView('generate')
    persist(updated)
    setShowNewForm(false)
    setNewName('')
    showToast(`Analyse "${a.name}" créée`)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated)
    persist(updated)
    const last = updated[updated.length - 1]
    setActiveId(last?.id || null)
    if (last) setThemeKey(last.themeKey || 'obsidian')
    setActiveView('generate')
    showToast('Analyse supprimée', 'info')
  }

  const updateActive = useCallback((patch) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === activeId ? { ...a, ...patch } : a)
      setTimeout(() => {
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (!raw) return
          const data = JSON.parse(raw)
          data.projects = (data.projects || []).map(p =>
            p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), Mix7P: updated } }
          )
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        } catch {}
      }, 0)
      return updated
    })
  }, [activeId, projectId])

  // ── Items CRUD ──
  const getItems = (p_key) => (active?.items || []).filter(i => i.p_key === p_key)
  const allItems = active?.items || []

  const saveItem = () => {
    if (!itemForm?.title?.trim()) return
    const item = { ...itemForm, title: itemForm.title.trim() }
    const existing = allItems.find(i => i.id === item.id)
    const updated = existing
      ? allItems.map(i => i.id === item.id ? item : i)
      : [...allItems, item]
    updateActive({ items: updated })
    setEditItem(null)
    setItemForm(null)
    showToast(existing ? 'Élément mis à jour' : 'Élément ajouté')
  }

  const deleteItem = (id) => {
    updateActive({ items: allItems.filter(i => i.id !== id) })
    if (editItem?.id === id) { setEditItem(null); setItemForm(null) }
  }

  const startEdit = (item) => {
    setEditItem(item)
    setItemForm({ ...item })
    setActiveP(item.p_key)
  }

  const startNew = (p_key) => {
    const blank = EMPTY_ITEM(p_key || activeP)
    setEditItem(false)
    setItemForm(blank)
  }

  // ── Score helpers ──
  const pScore = (p_key) => {
    const items = getItems(p_key).filter(i => i.score)
    if (!items.length) return null
    return (items.reduce((s, i) => s + (i.score || 3), 0) / items.length).toFixed(1)
  }

  const globalScore = () => {
    const scored = allItems.filter(i => i.score)
    if (!scored.length) return null
    return (scored.reduce((s, i) => s + (i.score || 3), 0) / scored.length).toFixed(1)
  }

  const scoreColor = (s) => {
    const n = parseFloat(s)
    if (n >= 4.5) return '#22d3a5'
    if (n >= 3.5) return '#34d399'
    if (n >= 2.5) return '#facc15'
    if (n >= 1.5) return '#fb923c'
    return '#f87171'
  }

  // ── Theme switch ──
  const switchTheme = (key) => {
    setThemeKey(key)
    updateActive({ themeKey: key })
  }

  // ── Mode 1 : Génération ──
  const runGeneration = async () => {
    if (!active?.projectDesc?.trim()) {
      showToast('Décrivez votre projet', 'error'); return
    }
    setGenLoading(true)
    setGenStep('Analyse du contexte marché…')
    try {
      const res = await fetch('/api/generer-management/generer-mix-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectDesc:  active.projectDesc,
          myCompany:    active.myCompany,
          sector:       active.sector,
          region:       active.region,
          targetMarket: active.targetMarket,
          objectives:   active.objectives,
          projectName:  project?.name || '',
          projectTag:   project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur serveur')
      setGenStep('Construction des 7P…')
      await new Promise(r => setTimeout(r, 300))
      updateActive({
        items:       data.result.items || [],
        generatedAt: new Date().toISOString(),
        aiResult:    null,
      })
      setActiveView('setup')
      showToast(`${(data.result.items || []).length} éléments générés sur les 7P ✦`)
    } catch (err) {
      showToast(err.message, 'error')
    }
    setGenLoading(false)
    setGenStep('')
  }

  // ── Mode 2 : Analyse ──
  const runAnalysis = async () => {
    if (!active || allItems.length === 0) {
      showToast('Ajoutez au moins un élément', 'error'); return
    }
    setAnlLoading(true)
    setActiveView('report')
    updateActive({ aiResult: null })
    try {
      const res = await fetch('/api/generer-management/generer-mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: active.name,
          projectDesc:  active.projectDesc,
          myCompany:    active.myCompany,
          sector:       active.sector,
          region:       active.region,
          targetMarket: active.targetMarket,
          objectives:   active.objectives,
          items:        allItems,
          projectName:  project?.name || '',
          projectTag:   project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur serveur')
      updateActive({ aiResult: data.result })
      showToast('Analyse stratégique générée ✦')
    } catch (err) {
      showToast(err.message, 'error')
      setActiveView('setup')
    }
    setAnlLoading(false)
  }

  // ── Export / Import ──
  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), analysis: active }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Mix7P_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('Export téléchargé')
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const raw = JSON.parse(evt.target.result)
        const data = raw.analysis || raw
        if (!data.name) throw new Error('Format invalide')
        const imported = { ...DEFAULT_ANALYSIS(), ...data, id: uid() }
        const updated = [...analyses, imported]
        setAnalyses(updated); setActiveId(imported.id)
        setThemeKey(imported.themeKey || 'obsidian')
        persist(updated)
        setActiveView(imported.aiResult ? 'report' : imported.generatedAt ? 'setup' : 'generate')
        showToast(`"${imported.name}" importé`)
      } catch (err) { showToast('Fichier invalide : ' + err.message, 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  const aiResult = active?.aiResult || null

  // ── CSS (dynamic theme) ──
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Fraunces:ital,wght@0,400;0,700;1,300;1,400;1,600&family=DM+Mono:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:       ${t.bg};
      --sur:      ${t.surface};
      --sur2:     ${t.surface2};
      --sur3:     ${t.surface3};
      --bd:       ${t.border};
      --bd2:      ${t.border2};
      --tx:       ${t.text};
      --mt:       ${t.muted};
      --mt2:      ${t.muted2};
      --ac:       ${t.accent};
      --ac2:      ${t.accent2};
    }
    html, body { background: var(--bg); color: var(--tx); font-family: 'DM Sans', sans-serif; height: 100%; }
    ::-webkit-scrollbar { width: 3px; height: 3px; }
    ::-webkit-scrollbar-thumb { background: var(--bd2); border-radius: 2px; }
    .root { min-height: 100vh; display: flex; flex-direction: column; }

    /* ── Topbar ── */
    .topbar {
      height: 54px; background: var(--sur); border-bottom: 1px solid var(--bd);
      display: flex; align-items: center; padding: 0 18px; gap: 10px;
      position: sticky; top: 0; z-index: 100;
    }
    .logo { font-family: 'Fraunces', serif; font-style: italic; font-size: 17px; color: var(--ac2); }
    .proj-lbl { font-size: 10px; color: var(--mt); font-family: 'DM Mono', monospace; margin-top: 1px; }
    .tr { margin-left: auto; display: flex; gap: 7px; align-items: center; }
    .back-btn {
      display: flex; align-items: center; gap: 5px; padding: 5px 11px;
      border-radius: 5px; background: var(--sur2); border: 1px solid var(--bd2);
      color: var(--mt2); font-family: 'DM Mono',monospace; font-size: 11px; cursor: pointer; transition: all .15s;
    }
    .back-btn:hover { color: var(--tx); }

    /* ── Buttons ── */
    .btn {
      display: flex; align-items: center; gap: 5px; padding: 6px 13px;
      border-radius: 5px; cursor: pointer; font-family: 'DM Mono',monospace;
      font-size: 11px; letter-spacing: .03em; border: 1px solid var(--bd2);
      background: var(--sur2); color: var(--mt2); transition: all .15s; white-space: nowrap;
    }
    .btn:hover { color: var(--tx); border-color: var(--mt2); }
    .btn.primary { background: var(--ac); border-color: var(--ac); color: #fff; }
    .btn.primary:hover { opacity: .88; }
    .btn.gen { background: rgba(52,211,153,.07); border-color: rgba(52,211,153,.25); color: #34d399; }
    .btn.gen:hover { background: rgba(52,211,153,.14); }
    .btn.anl { background: color-mix(in srgb, var(--ac) 10%, transparent); border-color: color-mix(in srgb, var(--ac) 30%, transparent); color: var(--ac2); }
    .btn.anl:hover { background: color-mix(in srgb, var(--ac) 18%, transparent); }
    .btn:disabled { opacity: .3; cursor: not-allowed; pointer-events: none; }

    /* ── Body ── */
    .body { flex: 1; display: grid; grid-template-columns: 220px 1fr; height: calc(100vh - 54px); overflow: hidden; }

    /* ── Left ── */
    .left { background: var(--sur); border-right: 1px solid var(--bd); display: flex; flex-direction: column; overflow: hidden; }
    .ph { padding: 13px 14px; border-bottom: 1px solid var(--bd); display: flex; align-items: center; justify-content: space-between; }
    .ph-lbl { font-size: 10px; color: var(--mt); letter-spacing: .1em; text-transform: uppercase; font-family: 'DM Mono',monospace; }
    .pl { flex: 1; overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
    .ai { padding: 9px 11px; border-radius: 7px; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
    .ai:hover { background: var(--sur2); }
    .ai.on { background: color-mix(in srgb, var(--ac) 10%, transparent); border-color: color-mix(in srgb, var(--ac) 22%, transparent); }
    .ai-name { font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; }
    .ai-meta { font-size: 10px; color: var(--mt); font-family: 'DM Mono',monospace; margin-top: 2px; }
    .ai-del { background: none; border: none; color: var(--mt); cursor: pointer; font-size: 11px; opacity: 0; transition: opacity .15s; }
    .ai:hover .ai-del { opacity: 1; }
    .ai-del:hover { color: #f87171; }
    .nf { padding: 9px; border-top: 1px solid var(--bd); display: flex; flex-direction: column; gap: 6px; }

    /* ── Inputs ── */
    .inp {
      width: 100%; background: var(--bg); border: 1px solid var(--bd2);
      border-radius: 5px; padding: 7px 9px; font-family: 'DM Sans',sans-serif;
      font-size: 12px; color: var(--tx); outline: none; transition: border-color .15s;
    }
    .inp:focus { border-color: var(--ac); }
    .inp::placeholder { color: var(--mt); }
    textarea.inp { resize: vertical; min-height: 58px; }
    .lbl { font-size: 10px; color: var(--mt); letter-spacing: .07em; text-transform: uppercase; font-family: 'DM Mono',monospace; margin-bottom: 3px; display: block; }
    .fg { display: flex; flex-direction: column; gap: 3px; }

    /* ── Center ── */
    .center { overflow-y: auto; padding: 22px 26px; display: flex; flex-direction: column; gap: 20px; }

    /* ── Nav tabs ── */
    .ntabs { display: flex; gap: 3px; background: var(--sur); border: 1px solid var(--bd); border-radius: 7px; padding: 3px; width: fit-content; }
    .ntab { padding: 5px 13px; border-radius: 4px; font-size: 11px; font-family: 'DM Mono',monospace; cursor: pointer; transition: all .15s; color: var(--mt2); border: none; background: none; }
    .ntab.on { background: var(--sur3); color: var(--tx); }
    .ntab:disabled { opacity: .3; cursor: not-allowed; }

    /* ── Theme switcher ── */
    .themes { display: flex; gap: 5px; align-items: center; }
    .theme-dot {
      width: 16px; height: 16px; border-radius: 50%; cursor: pointer;
      border: 2px solid transparent; transition: all .15s;
    }
    .theme-dot.on { border-color: var(--tx); transform: scale(1.2); }

    /* ── Cards ── */
    .card { background: var(--sur); border: 1px solid var(--bd); border-radius: 11px; padding: 18px; display: flex; flex-direction: column; gap: 13px; }
    .ct { font-size: 10px; color: var(--mt2); letter-spacing: .09em; text-transform: uppercase; font-family: 'DM Mono',monospace; display: flex; align-items: center; gap: 7px; }
    .cdot { width: 5px; height: 5px; border-radius: 50%; background: var(--ac); flex-shrink: 0; }

    /* ── Generate view ── */
    .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
    .gen-bar {
      display: flex; align-items: center; gap: 9px; padding: 11px 14px;
      background: rgba(52,211,153,.05); border: 1px solid rgba(52,211,153,.18); border-radius: 7px;
      font-size: 12px; color: #34d399; font-family: 'DM Mono',monospace;
    }
    .spin { width: 14px; height: 14px; border: 2px solid rgba(52,211,153,.2); border-top-color: #34d399; border-radius: 50%; animation: spin .6s linear infinite; flex-shrink: 0; }
    .spin.ac { border-color: color-mix(in srgb, var(--ac) 20%, transparent); border-top-color: var(--ac2); }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Setup: 7P tabs ── */
    .p-tabs { display: flex; gap: 5px; flex-wrap: wrap; }
    .p-tab {
      display: flex; align-items: center; gap: 6px; padding: 7px 13px;
      border-radius: 8px; font-size: 11px; font-family: 'DM Mono',monospace;
      border: 1px solid var(--bd2); background: var(--sur2); color: var(--mt2);
      cursor: pointer; transition: all .15s;
    }
    .p-tab.on { color: var(--tx); }
    .p-tab-count { font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 700; }

    /* ── P overview cards ── */
    .p-overview { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    @media (max-width: 1200px) { .p-overview { grid-template-columns: repeat(4, 1fr); } }
    .pov {
      background: var(--sur); border: 1px solid var(--bd); border-radius: 9px;
      padding: 12px; display: flex; flex-direction: column; gap: 6px;
      cursor: pointer; transition: all .15s;
    }
    .pov:hover { border-color: var(--bd2); }
    .pov.on { border-color: color-mix(in srgb, var(--ac) 30%, transparent); background: color-mix(in srgb, var(--ac) 6%, transparent); }
    .pov-icon { font-size: 18px; }
    .pov-name { font-size: 11px; font-weight: 600; }
    .pov-count { font-size: 10px; color: var(--mt2); font-family: 'DM Mono',monospace; }
    .pov-bar { height: 3px; background: var(--bd); border-radius: 2px; overflow: hidden; margin-top: 3px; }
    .pov-fill { height: 100%; border-radius: 2px; transition: width .4s ease; }
    .pov-score { font-size: 10px; font-family: 'DM Mono',monospace; font-weight: 700; margin-top: 1px; }

    /* ── Item cards ── */
    .items-grid { display: flex; flex-direction: column; gap: 7px; margin-top: 10px; }
    .item-card {
      background: var(--sur2); border: 1px solid var(--bd); border-radius: 9px;
      padding: 13px 15px; display: flex; gap: 12px; align-items: flex-start;
      transition: border-color .15s;
    }
    .item-card:hover { border-color: var(--bd2); }
    .item-score-badge {
      width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center;
      justify-content: center; font-size: 12px; font-weight: 700; font-family: 'DM Mono',monospace;
      flex-shrink: 0;
    }
    .item-body { flex: 1; min-width: 0; }
    .item-title { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
    .item-desc { font-size: 11px; color: var(--mt2); line-height: 1.5; margin-bottom: 6px; }
    .item-foot { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
    .stat-chip { font-size: 10px; font-family: 'DM Mono',monospace; padding: 2px 7px; border-radius: 4px; font-weight: 600; }
    .item-actions { display: flex; gap: 4px; margin-left: auto; }
    .ibtn { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; font-size: 12px; transition: background .15s; color: var(--mt2); }
    .ibtn:hover { background: var(--sur3); color: var(--tx); }

    /* ── Right form panel ── */
    .rp { background: var(--sur); border-left: 1px solid var(--bd); display: flex; flex-direction: column; overflow: hidden; width: 300px; flex-shrink: 0; }
    .rph { padding: 13px 14px; border-bottom: 1px solid var(--bd); display: flex; align-items: center; justify-content: space-between; }
    .rph-lbl { font-size: 10px; color: var(--mt); letter-spacing: .09em; text-transform: uppercase; font-family: 'DM Mono',monospace; }
    .rfs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }

    /* Score slider */
    .score-row { display: flex; gap: 5px; flex-wrap: wrap; }
    .score-btn { width: 34px; height: 28px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; font-family: 'DM Mono',monospace; cursor: pointer; border: 1px solid var(--bd); background: var(--sur2); color: var(--mt2); transition: all .15s; }
    .score-btn.on { color: #000; }

    /* P selector */
    .p-sel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
    .p-sel-item { padding: 7px 9px; border-radius: 6px; cursor: pointer; border: 1px solid var(--bd); background: var(--sur2); transition: all .15s; display: flex; align-items: center; gap: 5px; font-size: 10px; font-family: 'DM Mono',monospace; color: var(--mt2); font-weight: 600; }
    .p-sel-item:hover { border-color: var(--bd2); }
    .p-sel-item.on { color: var(--tx); }

    /* Status selector */
    .stat-sel { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
    .stat-item { padding: 6px 8px; border-radius: 5px; cursor: pointer; border: 1px solid var(--bd); background: var(--sur2); font-size: 10px; font-family: 'DM Mono',monospace; color: var(--mt2); transition: all .15s; font-weight: 600; }
    .stat-item.on { color: #fff; }
    .sep { height: 1px; background: var(--bd); }

    /* ── Report ── */
    .rpt-hero { background: var(--sur); border: 1px solid var(--bd); border-radius: 11px; padding: 18px; display: flex; gap: 18px; align-items: center; }
    .global-score { text-align: center; flex-shrink: 0; }
    .gs-num { font-family: 'Fraunces',serif; font-size: 52px; font-style: italic; line-height: 1; }
    .gs-lbl { font-size: 10px; color: var(--mt); font-family: 'DM Mono',monospace; margin-top: 3px; }
    .sv { width: 1px; background: var(--bd); align-self: stretch; flex-shrink: 0; }
    .exec-txt { flex: 1; font-size: 13px; line-height: 1.75; color: var(--mt2); }

    /* P score bars */
    .p-scores { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    @media (max-width: 1200px) { .p-scores { grid-template-columns: repeat(4, 1fr); } }
    .ps-card { background: var(--sur); border: 1px solid var(--bd); border-radius: 9px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .ps-icon { font-size: 16px; }
    .ps-name { font-size: 11px; font-weight: 600; }
    .ps-score { font-size: 13px; font-weight: 700; font-family: 'DM Mono',monospace; }
    .ps-bar { height: 4px; background: var(--bd); border-radius: 2px; overflow: hidden; }
    .ps-fill { height: 100%; border-radius: 2px; transition: width .5s ease; }

    /* Reco cards */
    .reco-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
    @media (max-width: 900px) { .reco-grid { grid-template-columns: 1fr; } }
    .reco-card { background: var(--sur); border: 1px solid var(--bd); border-radius: 9px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .reco-head { display: flex; align-items: center; gap: 8px; }
    .reco-icon { font-size: 16px; flex-shrink: 0; }
    .reco-p { font-size: 11px; font-weight: 700; }
    .reco-title { font-size: 13px; font-weight: 600; }
    .reco-text { font-size: 11px; color: var(--mt2); line-height: 1.6; }
    .reco-action { font-size: 10px; font-family: 'DM Mono',monospace; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; }
    .prio-tag { font-size: 9px; font-family: 'DM Mono',monospace; padding: 2px 6px; border-radius: 3px; }

    /* Opportunities / risks */
    .or-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
    .or-card { background: var(--sur); border: 1px solid var(--bd); border-radius: 9px; padding: 14px; }
    .or-title { font-size: 12px; font-weight: 700; margin-bottom: 8px; }
    .or-item { display: flex; gap: 7px; align-items: flex-start; padding: 4px 0; font-size: 12px; color: var(--mt2); line-height: 1.5; }
    .or-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }

    /* Action plan */
    .ap-list { display: flex; flex-direction: column; gap: 7px; }
    .ap-item { background: var(--sur); border: 1px solid var(--bd); border-radius: 8px; padding: 13px; display: flex; gap: 12px; }
    .ap-num { width: 26px; height: 26px; border-radius: 7px; background: color-mix(in srgb, var(--ac) 12%, transparent); border: 1px solid color-mix(in srgb, var(--ac) 25%, transparent); color: var(--ac2); font-family: 'DM Mono',monospace; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ap-body { flex: 1; }
    .ap-title { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
    .ap-rat { font-size: 11px; color: var(--mt2); line-height: 1.6; margin-bottom: 5px; }
    .ap-tags { display: flex; gap: 5px; flex-wrap: wrap; }
    .ap-tag { font-size: 10px; font-family: 'DM Mono',monospace; padding: 2px 7px; border-radius: 3px; background: var(--sur2); border: 1px solid var(--bd2); color: var(--mt2); }

    /* Synthesis */
    .synth-box { background: color-mix(in srgb, var(--ac) 5%, transparent); border: 1px solid color-mix(in srgb, var(--ac) 18%, transparent); border-radius: 10px; padding: 16px 18px; }
    .synth-lbl { font-size: 10px; font-family: 'DM Mono',monospace; color: var(--ac2); letter-spacing: .09em; text-transform: uppercase; margin-bottom: 7px; }
    .synth-txt { font-size: 13px; color: var(--mt2); line-height: 1.75; }

    /* Section headers */
    .sh { font-size: 10px; color: var(--mt2); letter-spacing: .09em; text-transform: uppercase; font-family: 'DM Mono',monospace; margin-bottom: 10px; display: flex; align-items: center; gap: 9px; }
    .sl { flex: 1; height: 1px; background: var(--bd); }

    /* Loading / empty */
    .ld { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 13px; padding: 80px 40px; }
    .ld-txt { font-size: 13px; color: var(--mt2); font-family: 'DM Mono',monospace; }
    .ew { padding: 60px 40px; text-align: center; }
    .ew-ic { font-size: 40px; opacity: .15; margin-bottom: 12px; }
    .ew-tx { font-size: 13px; color: var(--mt); line-height: 1.7; }

    /* Toast */
    .toast { position: fixed; bottom: 22px; right: 22px; z-index: 600; background: var(--sur2); border: 1px solid var(--bd2); border-radius: 7px; padding: 10px 16px; font-size: 13px; box-shadow: 0 8px 28px rgba(0,0,0,.5); animation: su .2s ease; display: flex; align-items: center; gap: 7px; }
    .toast.error { border-color: rgba(248,113,113,.3); color: #f87171; }
    .toast.info { border-color: color-mix(in srgb, var(--ac) 30%, transparent); }
    @keyframes su { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

    @media (max-width: 800px) { .body { grid-template-columns: 1fr; } .left { display: none; } }
  `

  const activeItems = getItems(activeP)
  const gs = globalScore()

  return (
    <>
      <style>{css}</style>
      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      <div className="root">

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="logo">Mix Marketing 7P</div>
            {project && <div className="proj-lbl">{project.name}</div>}
          </div>
          <div className="tr">
            {/* Theme switcher */}
            <div className="themes">
              {Object.entries(THEMES).map(([key, th]) => (
                <div key={key} className={`theme-dot ${themeKey === key ? 'on' : ''}`}
                  style={{ background: th.accent }}
                  title={th.name}
                  onClick={() => switchTheme(key)}
                />
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: t.border2 }}/>
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
            {active && (
              <>
                <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>
                <button className="btn anl" onClick={runAnalysis} disabled={anlLoading || allItems.length === 0}>
                  {anlLoading ? <><span className="spin ac"/>Analyse…</> : '✦ Analyser'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="body">

          {/* ── Left panel ── */}
          <aside className="left">
            <div className="ph">
              <span className="ph-lbl">Analyses ({analyses.length})</span>
            </div>
            <div className="pl">
              {analyses.length === 0 && (
                <div className="ew" style={{ padding: '36px 16px' }}>
                  <div className="ew-ic">⬡</div>
                  <div className="ew-tx">Créez votre première analyse 7P</div>
                </div>
              )}
              {analyses.map(a => (
                <div key={a.id} className={`ai ${activeId === a.id ? 'on' : ''}`}
                  onClick={() => {
                    setActiveId(a.id)
                    setThemeKey(a.themeKey || 'obsidian')
                    setActiveView(a.aiResult ? 'report' : a.generatedAt ? 'setup' : 'generate')
                    setEditItem(null); setItemForm(null)
                  }}>
                  <div className="ai-name">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{a.name}</span>
                    <button className="ai-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  </div>
                  <div className="ai-meta">
                    {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {' · '}{(a.items || []).length} éléments
                    {a.aiResult && <span style={{ color: '#34d399' }}> · ✦</span>}
                  </div>
                </div>
              ))}
            </div>
            {showNewForm ? (
              <div className="nf">
                <input className="inp" placeholder="Nom de l'analyse" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus />
                <div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn primary" style={{ flex: 1 }} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 9, borderTop: `1px solid ${t.border}` }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>+ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* ── Center + Right ── */}
          {!active ? (
            <div className="ew" style={{ padding: '80px 40px', textAlign: 'center', flex: 1 }}>
              <div className="ew-ic" style={{ fontSize: 52 }}>⬡</div>
              <div style={{ fontFamily: 'Fraunces,serif', fontStyle: 'italic', fontSize: 22, marginBottom: 8 }}>Analyse Mix Marketing 7P</div>
              <div className="ew-tx">Décrivez votre projet et laissez l'IA construire votre analyse complète,<br/>ou créez-la manuellement P par P.</div>
              <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                <button className="btn gen" style={{ padding: '9px 18px' }} onClick={() => setShowNewForm(true)}>+ Nouvelle analyse</button>
                <button className="btn" style={{ padding: '9px 18px' }} onClick={() => importRef.current?.click()}>↑ Importer</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* Center */}
              <main className="center" style={{ flex: 1 }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h2 style={{ fontFamily: 'Fraunces,serif', fontStyle: 'italic', fontSize: 21 }}>{active.name}</h2>
                    {active.sector && <div style={{ fontSize: 11, color: t.muted, fontFamily: 'DM Mono,monospace', marginTop: 2 }}>{active.sector}{active.region ? ` · ${active.region}` : ''}</div>}
                  </div>
                  <div className="ntabs">
                    <button className={`ntab ${activeView === 'generate' ? 'on' : ''}`} onClick={() => setActiveView('generate')}>✦ Générer</button>
                    <button className={`ntab ${activeView === 'setup' ? 'on' : ''}`} onClick={() => setActiveView('setup')}>Config</button>
                    <button className={`ntab ${activeView === 'report' ? 'on' : ''}`} onClick={() => setActiveView('report')} disabled={!aiResult && !anlLoading}>Rapport</button>
                  </div>
                </div>

                {/* ══ GENERATE ══ */}
                {activeView === 'generate' && (
                  <>
                    <div className="card">
                      <div className="ct"><div className="cdot"/>Description du projet</div>
                      <div className="fg">
                        <label className="lbl">Description générale *</label>
                        <textarea className="inp" rows={4}
                          placeholder="Ex : Cabinet de conseil en transformation digitale, 30 consultants, clients PME/ETI en France. Objectif : lancer une offre de formation en ligne certifiante. Différenciateur : accompagnement post-formation sur 6 mois."
                          value={active.projectDesc || ''}
                          onChange={e => updateActive({ projectDesc: e.target.value })} />
                      </div>
                      <div className="g2">
                        <div className="fg"><label className="lbl">Notre entreprise</label><input className="inp" placeholder="Nom" value={active.myCompany || ''} onChange={e => updateActive({ myCompany: e.target.value })} /></div>
                        <div className="fg"><label className="lbl">Secteur</label><input className="inp" placeholder="Ex: SaaS, Retail…" value={active.sector || ''} onChange={e => updateActive({ sector: e.target.value })} /></div>
                        <div className="fg"><label className="lbl">Type d'activité</label><input className="inp" placeholder="B2B, B2C…" value={active.activityType || ''} onChange={e => updateActive({ activityType: e.target.value })} /></div>
                        <div className="fg"><label className="lbl">Région / Marché</label><input className="inp" placeholder="France, Europe…" value={active.region || ''} onChange={e => updateActive({ region: e.target.value })} /></div>
                      </div>
                      <div className="fg"><label className="lbl">Marché cible</label><input className="inp" placeholder="Segment clients, persona…" value={active.targetMarket || ''} onChange={e => updateActive({ targetMarket: e.target.value })} /></div>
                      <div className="fg"><label className="lbl">Objectifs stratégiques</label><textarea className="inp" rows={2} placeholder="Croissance, parts de marché, fidélisation…" value={active.objectives || ''} onChange={e => updateActive({ objectives: e.target.value })} /></div>
                    </div>

                    {genLoading && <div className="gen-bar"><span className="spin"/>{genStep}</div>}

                    <div style={{ display: 'flex', gap: 9 }}>
                      <button className="btn gen" style={{ padding: '9px 20px', fontSize: 12 }} onClick={runGeneration} disabled={genLoading || !active.projectDesc?.trim()}>
                        {genLoading ? 'Génération…' : '✦ Générer les 7P par IA'}
                      </button>
                      <button className="btn" onClick={() => setActiveView('setup')}>Configurer manuellement →</button>
                    </div>

                    {active.generatedAt && (
                      <div style={{ padding: '9px 13px', background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.14)', borderRadius: 7, fontSize: 11, color: '#34d399', fontFamily: 'DM Mono,monospace' }}>
                        ✦ Généré le {new Date(active.generatedAt).toLocaleString('fr-FR')} — {allItems.length} éléments sur les 7P.
                        <span style={{ color: t.muted2 }}> Ajustez en "Config".</span>
                      </div>
                    )}
                  </>
                )}

                {/* ══ SETUP ══ */}
                {activeView === 'setup' && (
                  <>
                    {/* P overview */}
                    <div className="p-overview">
                      {Object.entries(SEVEN_P).map(([key, p]) => {
                        const items = getItems(key)
                        const sc = pScore(key)
                        return (
                          <div key={key} className={`pov ${activeP === key ? 'on' : ''}`} onClick={() => { setActiveP(key); setEditItem(null); setItemForm(null) }}>
                            <div className="pov-icon" style={{ color: p.color }}>{p.icon}</div>
                            <div className="pov-name" style={{ color: p.color }}>{p.label}</div>
                            <div className="pov-count">{items.length} élément{items.length !== 1 ? 's' : ''}</div>
                            <div className="pov-bar"><div className="pov-fill" style={{ width: sc ? `${(parseFloat(sc) / 5) * 100}%` : '0%', background: p.color }}/></div>
                            {sc && <div className="pov-score" style={{ color: scoreColor(sc) }}>{sc}/5</div>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Active P items */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: SEVEN_P[activeP].color, fontSize: 18 }}>{SEVEN_P[activeP].icon}</span>
                          <span style={{ fontFamily: 'Fraunces,serif', fontStyle: 'italic', fontSize: 17, color: SEVEN_P[activeP].color }}>{SEVEN_P[activeP].label}</span>
                          <span style={{ fontSize: 11, color: t.muted, fontFamily: 'DM Mono,monospace' }}>— {SEVEN_P[activeP].desc}</span>
                        </div>
                        <button className="btn primary" style={{ padding: '5px 11px', fontSize: 11 }} onClick={() => startNew(activeP)}>+ Ajouter</button>
                      </div>

                      {activeItems.length === 0 ? (
                        <div className="ew" style={{ padding: '28px 20px' }}>
                          <div className="ew-ic" style={{ fontSize: 28 }}>{SEVEN_P[activeP].icon}</div>
                          <div className="ew-tx">Aucun élément pour "{SEVEN_P[activeP].label}".<br/>Ajoutez-en un ou utilisez "Générer par IA".</div>
                        </div>
                      ) : (
                        <div className="items-grid">
                          {activeItems.map(item => {
                            const st = STATUS_CFG[item.status] || STATUS_CFG['actif']
                            const sc = item.score || 3
                            return (
                              <div key={item.id} className="item-card">
                                <div className="item-score-badge" style={{ background: `${scoreColor(sc)}18`, color: scoreColor(sc), border: `1px solid ${scoreColor(sc)}30` }}>{sc}</div>
                                <div className="item-body">
                                  <div className="item-title">{item.title}</div>
                                  {item.description && <div className="item-desc">{item.description}</div>}
                                  <div className="item-foot">
                                    <span className="stat-chip" style={{ background: `${st.color}14`, color: st.color, border: `1px solid ${st.color}25` }}>{st.label}</span>
                                    {item.notes && <span style={{ fontSize: 10, color: t.muted, fontFamily: 'DM Mono,monospace' }}>📝 Note</span>}
                                  </div>
                                </div>
                                <div className="item-actions">
                                  <button className="ibtn" onClick={() => startEdit(item)}>✎</button>
                                  <button className="ibtn" style={{ color: '#f87171' }} onClick={() => deleteItem(item.id)}>✕</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
                      <button className="btn" onClick={() => setActiveView('generate')}>← Regénérer</button>
                      <button className="btn anl" onClick={runAnalysis} disabled={anlLoading || allItems.length === 0}>
                        {anlLoading ? <><span className="spin ac"/>Analyse…</> : '✦ Lancer l\'analyse IA'}
                      </button>
                    </div>
                  </>
                )}

                {/* ══ REPORT ══ */}
                {activeView === 'report' && (
                  anlLoading ? (
                    <div className="ld">
                      <div className="spin ac" style={{ width: 28, height: 28 }}/>
                      <div className="ld-txt">Analyse stratégique en cours…</div>
                      <div style={{ fontSize: 11, color: t.muted, fontFamily: 'DM Mono,monospace' }}>Claude évalue vos 7P et formule les recommandations</div>
                    </div>
                  ) : aiResult ? (
                    <>
                      {/* Hero */}
                      <div className="rpt-hero">
                        <div className="global-score">
                          <div className="gs-num" style={{ color: scoreColor(aiResult.global_score || gs || 3) }}>
                            {(aiResult.global_score || parseFloat(gs) || 3).toFixed(1)}
                          </div>
                          <div className="gs-lbl">SCORE / 5</div>
                        </div>
                        <div className="sv"/>
                        <div className="exec-txt">{aiResult.executive_summary}</div>
                      </div>

                      {/* P scores */}
                      {aiResult.p_scores && (
                        <div>
                          <div className="sh">Score par P <div className="sl"/></div>
                          <div className="p-scores">
                            {Object.entries(SEVEN_P).map(([key, p]) => {
                              const sc = aiResult.p_scores[key]
                              if (sc === undefined) return null
                              return (
                                <div key={key} className="ps-card">
                                  <div className="ps-icon" style={{ color: p.color }}>{p.icon}</div>
                                  <div className="ps-name" style={{ color: p.color }}>{p.label}</div>
                                  <div className="ps-score" style={{ color: scoreColor(sc) }}>{sc}/5</div>
                                  <div className="ps-bar"><div className="ps-fill" style={{ width: `${(sc / 5) * 100}%`, background: p.color }}/></div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {aiResult.recommendations?.length > 0 && (
                        <div>
                          <div className="sh">Recommandations par axe <div className="sl"/></div>
                          <div className="reco-grid">
                            {aiResult.recommendations.map((r, i) => {
                              const p = SEVEN_P[r.p_key] || SEVEN_P.product
                              return (
                                <div key={i} className="reco-card" style={{ borderColor: `${p.color}20` }}>
                                  <div className="reco-head">
                                    <span className="reco-icon" style={{ color: p.color }}>{p.icon}</span>
                                    <span className="reco-p" style={{ color: p.color }}>{p.label}</span>
                                    {r.priority && <span className="prio-tag" style={{ background: `${scoreColor(6 - r.priority)}15`, color: scoreColor(6 - r.priority) }}>P{r.priority}</span>}
                                  </div>
                                  <div className="reco-title">{r.title}</div>
                                  <div className="reco-text">{r.analysis}</div>
                                  {r.action && (
                                    <span className="reco-action" style={{ background: `${p.color}12`, color: p.color, border: `1px solid ${p.color}22` }}>→ {r.action}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Opportunities & Risks */}
                      {(aiResult.opportunities?.length > 0 || aiResult.risks?.length > 0) && (
                        <div>
                          <div className="sh">Opportunités & Risques <div className="sl"/></div>
                          <div className="or-grid">
                            <div className="or-card" style={{ borderColor: 'rgba(52,211,153,.2)' }}>
                              <div className="or-title" style={{ color: '#34d399' }}>Opportunités</div>
                              {(aiResult.opportunities || []).map((o, i) => (
                                <div key={i} className="or-item"><div className="or-dot" style={{ background: '#34d399' }}/>{o}</div>
                              ))}
                            </div>
                            <div className="or-card" style={{ borderColor: 'rgba(248,113,113,.2)' }}>
                              <div className="or-title" style={{ color: '#f87171' }}>Risques & Points faibles</div>
                              {(aiResult.risks || []).map((r, i) => (
                                <div key={i} className="or-item"><div className="or-dot" style={{ background: '#f87171' }}/>{r}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action plan */}
                      {aiResult.action_plan?.length > 0 && (
                        <div>
                          <div className="sh">Plan d'action prioritaire <div className="sl"/></div>
                          <div className="ap-list">
                            {aiResult.action_plan.map((a, i) => (
                              <div key={i} className="ap-item">
                                <div className="ap-num">#{a.priority || i + 1}</div>
                                <div className="ap-body">
                                  <div className="ap-title">{a.action}</div>
                                  <div className="ap-rat">{a.rationale}</div>
                                  <div className="ap-tags">
                                    {a.p_key && <span className="ap-tag">{SEVEN_P[a.p_key]?.icon} {SEVEN_P[a.p_key]?.label || a.p_key}</span>}
                                    {a.timeline && <span className="ap-tag">⏱ {a.timeline}</span>}
                                    {a.impact && <span className="ap-tag">→ {a.impact}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Synthesis */}
                      {aiResult.synthesis && (
                        <div>
                          <div className="sh">Synthèse stratégique <div className="sl"/></div>
                          <div className="synth-box">
                            <div className="synth-lbl">✦ Conclusion</div>
                            <div className="synth-txt">{aiResult.synthesis}</div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="ew">
                      <div className="ew-ic">✦</div>
                      <div className="ew-tx">Configurez vos 7P puis lancez l'analyse IA depuis "Config".</div>
                    </div>
                  )
                )}
              </main>

              {/* ── Right panel (form) ── */}
              {(activeView === 'setup') && (
                <aside className="rp">
                  <div className="rph">
                    <span className="rph-lbl">{itemForm ? (editItem ? `Modifier` : 'Nouvel élément') : 'Détails'}</span>
                    {!itemForm && (
                      <button className="btn" style={{ padding: '4px 9px', fontSize: 10 }} onClick={() => startNew(activeP)}>+ Ajouter</button>
                    )}
                  </div>

                  {itemForm ? (
                    <div className="rfs">
                      <div className="fg"><label className="lbl">Titre *</label>
                        <input className="inp" placeholder="Ex: Offre Premium SaaS" value={itemForm.title}
                          onChange={e => setItemForm(p => ({ ...p, title: e.target.value }))} autoFocus />
                      </div>
                      <div className="fg"><label className="lbl">Description</label>
                        <textarea className="inp" rows={3} placeholder="Détail, caractéristiques, contexte…"
                          value={itemForm.description || ''}
                          onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div className="sep"/>
                      <div className="fg"><label className="lbl">Axe P *</label>
                        <div className="p-sel-grid">
                          {Object.entries(SEVEN_P).map(([key, p]) => (
                            <div key={key} className={`p-sel-item ${itemForm.p_key === key ? 'on' : ''}`}
                              style={itemForm.p_key === key ? { background: `${p.color}12`, borderColor: `${p.color}30`, color: p.color } : {}}
                              onClick={() => setItemForm(prev => ({ ...prev, p_key: key }))}>
                              <span style={{ color: p.color }}>{p.icon}</span>{p.label}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="sep"/>
                      <div className="fg"><label className="lbl">Score (1–5)</label>
                        <div className="score-row">
                          {[1,2,3,4,5].map(s => (
                            <button key={s} className={`score-btn ${itemForm.score === s ? 'on' : ''}`}
                              style={itemForm.score === s ? { background: SCORE_COLORS[s], borderColor: SCORE_COLORS[s] } : {}}
                              onClick={() => setItemForm(p => ({ ...p, score: s }))}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div className="fg"><label className="lbl">Statut</label>
                        <div className="stat-sel">
                          {Object.entries(STATUS_CFG).map(([key, sc]) => (
                            <div key={key} className={`stat-item ${itemForm.status === key ? 'on' : ''}`}
                              style={itemForm.status === key ? { background: sc.color, borderColor: sc.color } : {}}
                              onClick={() => setItemForm(p => ({ ...p, status: key }))}>{sc.label}</div>
                          ))}
                        </div>
                      </div>
                      <div className="fg"><label className="lbl">Notes internes</label>
                        <textarea className="inp" rows={2} placeholder="Remarques, sources, next steps…"
                          value={itemForm.notes || ''}
                          onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, paddingBottom: 6 }}>
                        <button className="btn primary" style={{ flex: 1 }} onClick={saveItem}>{editItem ? 'Mettre à jour' : 'Ajouter'}</button>
                        <button className="btn" onClick={() => { setEditItem(null); setItemForm(null) }}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div className="rfs">
                      <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.6, marginBottom: 10 }}>
                        Cliquez sur un élément pour le modifier, ou ajoutez-en un nouveau.
                      </div>
                      {Object.entries(SEVEN_P).map(([key, p]) => (
                        <div key={key} style={{ background: `${p.color}08`, border: `1px solid ${p.color}18`, borderRadius: 7, padding: '9px 11px', cursor: 'pointer' }}
                          onClick={() => { setActiveP(key); startNew(key) }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: p.color, marginBottom: 2 }}>{p.icon} {p.label}</div>
                          <div style={{ fontSize: 10, color: t.muted2, lineHeight: 1.5 }}>{p.desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </aside>
              )}
            </div>
          )}
        </div>

        {toast && (
          <div className={`toast ${toast.type || ''}`}>
            {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}