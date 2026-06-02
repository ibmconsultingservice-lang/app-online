'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const THEMES = {
  void: {
    name: 'Void', bg: '#050507', sur: '#0c0c10', sur2: '#121218', sur3: '#18181f',
    bd: 'rgba(255,255,255,.055)', bd2: 'rgba(255,255,255,.10)',
    tx: '#ededf5', mt: '#52515f', mt2: '#8e8ca0', ac: '#7c6af7', ac2: '#a89fff',
  },
  arctic: {
    name: 'Arctic', bg: '#030d16', sur: '#061828', sur2: '#0b2035', sur3: '#102640',
    bd: 'rgba(125,211,252,.08)', bd2: 'rgba(125,211,252,.16)',
    tx: '#e0f2ff', mt: '#3d6880', mt2: '#7ab0cc', ac: '#0ea5e9', ac2: '#38bdf8',
  },
  obsidian: {
    name: 'Obsidian', bg: '#0a0a0f', sur: '#111118', sur2: '#18181f', sur3: '#1e1e28',
    bd: 'rgba(255,255,255,.07)', bd2: 'rgba(255,255,255,.12)',
    tx: '#f0eff5', mt: '#6b6a7a', mt2: '#9896aa', ac: '#6366f1', ac2: '#818cf8',
  },
  forest: {
    name: 'Forest', bg: '#030d08', sur: '#071a0f', sur2: '#0d2516', sur3: '#12301e',
    bd: 'rgba(52,211,153,.07)', bd2: 'rgba(52,211,153,.14)',
    tx: '#dcfce7', mt: '#3a7a55', mt2: '#6bb880', ac: '#10b981', ac2: '#34d399',
  },
  amber: {
    name: 'Amber', bg: '#100a03', sur: '#1a1005', sur2: '#221508', sur3: '#2c1c0e',
    bd: 'rgba(251,191,36,.07)', bd2: 'rgba(251,191,36,.14)',
    tx: '#fef9e7', mt: '#7a5c20', mt2: '#c49a40', ac: '#f59e0b', ac2: '#fbbf24',
  },
  rose: {
    name: 'Rose', bg: '#0f0509', sur: '#1a0810', sur2: '#220d16', sur3: '#2c121e',
    bd: 'rgba(244,114,182,.07)', bd2: 'rgba(244,114,182,.14)',
    tx: '#fdf2f8', mt: '#7a3055', mt2: '#c07090', ac: '#ec4899', ac2: '#f472b6',
  },
}

const JOURNEY_STAGES = [
  { id: 'awareness',     label: 'Prise de conscience', icon: '◎', color: '#60a5fa' },
  { id: 'consideration', label: 'Considération',       icon: '◈', color: '#a78bfa' },
  { id: 'decision',      label: 'Décision',            icon: '◉', color: '#34d399' },
  { id: 'purchase',      label: 'Achat',               icon: '✦', color: '#f59e0b' },
  { id: 'retention',     label: 'Fidélisation',        icon: '●', color: '#f472b6' },
  { id: 'advocacy',      label: 'Recommandation',      icon: '⬡', color: '#22d3a5' },
]

const EMOTION_LEVELS = [
  { value: 1, label: 'Très frustré',   color: '#f87171' },
  { value: 2, label: 'Frustré',        color: '#fb923c' },
  { value: 3, label: 'Neutre',         color: '#facc15' },
  { value: 4, label: 'Satisfait',      color: '#34d399' },
  { value: 5, label: 'Enchanté',       color: '#22d3a5' },
]

const EMPTY_WORKFLOW = () => ({
  id: uid(),
  name: '',
  projectDesc: '',
  createdAt: new Date().toISOString(),
  generatedAt: null,
  themeKey: 'void',
  persona: {
    name: '', age: '', gender: '', job: '', location: '',
    income: '', education: '', avatar: '👤',
    goals: [], frustrations: [], motivations: [],
    buyingBehavior: '', preferredChannels: [], techSavviness: 3,
    quote: '', bio: '',
  },
  empathyMap: {
    thinks: [], feels: [], sees: [], hears: [],
    says: [], does: [],
    pains: [], gains: [],
  },
  journeyMap: JOURNEY_STAGES.map(s => ({
    stageId: s.id,
    touchpoints: [],
    customerActions: [],
    emotions: 3,
    painPoints: [],
    opportunities: [],
    channels: [],
  })),
  aiResult: null,
})

const scoreColor = (v) => {
  if (v >= 4.5) return '#22d3a5'
  if (v >= 3.5) return '#34d399'
  if (v >= 2.5) return '#facc15'
  if (v >= 1.5) return '#fb923c'
  return '#f87171'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BuyerPersonaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')
  const importRef = useRef(null)

  const [project, setProject] = useState(null)
  const [workflows, setWorkflows] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('generate')  // generate | persona | empathy | journey | report
  const [themeKey, setThemeKey] = useState('void')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [toast, setToast] = useState(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genStep, setGenStep] = useState('')
  const [anlLoading, setAnlLoading] = useState(false)
  const [activeStage, setActiveStage] = useState(0)

  // inline edit states
  const [newItems, setNewItems] = useState({})  // key -> string being typed

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.BuyerPersona || []
        setWorkflows(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          setThemeKey(last.themeKey || 'void')
          setTab(last.aiResult ? 'report' : last.generatedAt ? 'persona' : 'generate')
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), BuyerPersona: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3200)
  }

  const active = workflows.find(w => w.id === activeId) || null
  const T = THEMES[themeKey] || THEMES.void

  // ── CRUD ──
  const createWorkflow = () => {
    if (!newName.trim()) return
    const w = { ...EMPTY_WORKFLOW(), id: uid(), name: newName.trim() }
    const updated = [...workflows, w]
    setWorkflows(updated); setActiveId(w.id); setThemeKey('void')
    setTab('generate'); persist(updated)
    setShowNewForm(false); setNewName('')
    showToast(`"${w.name}" créé`)
  }

  const deleteWorkflow = (id) => {
    const updated = workflows.filter(w => w.id !== id)
    setWorkflows(updated); persist(updated)
    const last = updated[updated.length - 1]
    setActiveId(last?.id || null)
    if (last) setThemeKey(last.themeKey || 'void')
    showToast('Supprimé', 'info')
  }

  const updateActive = useCallback((patch) => {
    setWorkflows(prev => {
      const updated = prev.map(w => w.id === activeId ? { ...w, ...patch } : w)
      setTimeout(() => {
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (!raw) return
          const data = JSON.parse(raw)
          data.projects = (data.projects || []).map(p =>
            p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), BuyerPersona: updated } }
          )
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        } catch {}
      }, 0)
      return updated
    })
  }, [activeId, projectId])

  const patchPersona = (patch) => updateActive({ persona: { ...active.persona, ...patch } })
  const patchEmpathy = (patch) => updateActive({ empathyMap: { ...active.empathyMap, ...patch } })

  const patchJourneyStage = (idx, patch) => {
    const jm = [...(active.journeyMap || [])]
    jm[idx] = { ...jm[idx], ...patch }
    updateActive({ journeyMap: jm })
  }

  // ── Add/remove list items ──
  const addToList = (section, field, value) => {
    if (!value?.trim()) return
    if (section === 'persona') {
      patchPersona({ [field]: [...(active.persona[field] || []), value.trim()] })
    } else if (section === 'empathy') {
      patchEmpathy({ [field]: [...(active.empathyMap[field] || []), value.trim()] })
    }
    setNewItems(p => ({ ...p, [`${section}.${field}`]: '' }))
  }

  const removeFromList = (section, field, idx) => {
    if (section === 'persona') {
      patchPersona({ [field]: (active.persona[field] || []).filter((_, i) => i !== idx) })
    } else if (section === 'empathy') {
      patchEmpathy({ [field]: (active.empathyMap[field] || []).filter((_, i) => i !== idx) })
    }
  }

  const addToJourneyList = (stageIdx, field, value) => {
    if (!value?.trim()) return
    const jm = [...(active.journeyMap || [])]
    jm[stageIdx] = { ...jm[stageIdx], [field]: [...(jm[stageIdx][field] || []), value.trim()] }
    updateActive({ journeyMap: jm })
    setNewItems(p => ({ ...p, [`journey.${stageIdx}.${field}`]: '' }))
  }

  const removeFromJourneyList = (stageIdx, field, idx) => {
    const jm = [...(active.journeyMap || [])]
    jm[stageIdx] = { ...jm[stageIdx], [field]: (jm[stageIdx][field] || []).filter((_, i) => i !== idx) }
    updateActive({ journeyMap: jm })
  }

  const ni = (key) => newItems[key] || ''
  const setNi = (key, val) => setNewItems(p => ({ ...p, [key]: val }))

  const switchTheme = (key) => { setThemeKey(key); updateActive({ themeKey: key }) }

  // ── Mode 1: Generate ──
  const runGeneration = async () => {
    if (!active?.projectDesc?.trim()) { showToast('Décrivez votre projet', 'error'); return }
    setGenLoading(true); setGenStep('Analyse du contexte…')
    try {
      const res = await fetch('/api/generer-management/generer-persona-auto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectDesc: active.projectDesc, projectName: project?.name || '', projectTag: project?.tag || '',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur serveur')
      setGenStep('Construction du profil…')
      await new Promise(r => setTimeout(r, 300))
      updateActive({
        persona: data.result.persona || active.persona,
        empathyMap: data.result.empathyMap || active.empathyMap,
        journeyMap: data.result.journeyMap || active.journeyMap,
        generatedAt: new Date().toISOString(),
        aiResult: null,
      })
      setTab('persona')
      showToast(`Profil complet généré par l'IA ✦`)
    } catch (err) { showToast(err.message, 'error') }
    setGenLoading(false); setGenStep('')
  }

  // ── Mode 2: Analyse ──
  const runAnalysis = async () => {
    if (!active || !active.persona.name) { showToast('Complétez d\'abord le persona', 'error'); return }
    setAnlLoading(true); setTab('report'); updateActive({ aiResult: null })
    try {
      const res = await fetch('/api/generer-management/analyser-persona-analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: active.persona, empathyMap: active.empathyMap,
          journeyMap: active.journeyMap, projectName: project?.name || '',
          projectTag: project?.tag || '', projectDesc: active.projectDesc,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur serveur')
      updateActive({ aiResult: data.result })
      showToast('Analyse stratégique générée ✦')
    } catch (err) { showToast(err.message, 'error'); setTab('persona') }
    setAnlLoading(false)
  }

  // ── Export JSON ──
  const exportJSON = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), workflow: active }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `BuyerPersona_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    a.click(); showToast('Export JSON téléchargé')
  }

  // ── Export CSV ──
  const exportCSV = () => {
    if (!active) return
    const p = active.persona
    const em = active.empathyMap
    const rows = [
      ['Section', 'Champ', 'Valeur'],
      ['Persona', 'Nom', p.name], ['Persona', 'Âge', p.age],
      ['Persona', 'Poste', p.job], ['Persona', 'Lieu', p.location],
      ['Persona', 'Revenu', p.income], ['Persona', 'Citation', p.quote],
      ['Persona', 'Bio', p.bio],
      ...(p.goals || []).map(g => ['Persona', 'Objectif', g]),
      ...(p.frustrations || []).map(f => ['Persona', 'Frustration', f]),
      ...(p.motivations || []).map(m => ['Persona', 'Motivation', m]),
      ...(em.thinks || []).map(t => ['Empathy', 'Pense', t]),
      ...(em.feels || []).map(f => ['Empathy', 'Ressent', f]),
      ...(em.sees || []).map(s => ['Empathy', 'Voit', s]),
      ...(em.hears || []).map(h => ['Empathy', 'Entend', h]),
      ...(em.says || []).map(s => ['Empathy', 'Dit', s]),
      ...(em.does || []).map(d => ['Empathy', 'Fait', d]),
      ...(em.pains || []).map(p2 => ['Empathy', 'Douleur', p2]),
      ...(em.gains || []).map(g => ['Empathy', 'Gain', g]),
      ...(active.journeyMap || []).flatMap((stage, i) => {
        const s = JOURNEY_STAGES[i]
        return [
          ...(stage.touchpoints || []).map(t => [s?.label || 'Étape', 'Touchpoint', t]),
          ...(stage.customerActions || []).map(a => [s?.label || 'Étape', 'Action', a]),
          ...(stage.painPoints || []).map(p2 => [s?.label || 'Étape', 'Friction', p2]),
          ...(stage.opportunities || []).map(o => [s?.label || 'Étape', 'Opportunité', o]),
          [s?.label || 'Étape', 'Émotion', EMOTION_LEVELS.find(e => e.value === stage.emotions)?.label || ''],
        ]
      }),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `BuyerPersona_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); showToast('Export CSV téléchargé')
  }

  // ── Export Word (via API route) ──
  const exportWord = async () => {
    if (!active) return
    showToast('Génération Word en cours…', 'info')
    try {
      const res = await fetch('/api/generer-management/export-buyer-persona-word', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: active }),
      })
      if (!res.ok) throw new Error('Erreur génération Word')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `BuyerPersona_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`
      a.click(); showToast('Export Word téléchargé')
    } catch (err) { showToast(err.message, 'error') }
  }

  // ── Import ──
  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result)
        const data = raw.workflow || raw
        if (!data.name) throw new Error('Format invalide')
        const imported = { ...EMPTY_WORKFLOW(), ...data, id: uid() }
        const updated = [...workflows, imported]
        setWorkflows(updated); setActiveId(imported.id)
        setThemeKey(imported.themeKey || 'void')
        persist(updated)
        setTab(imported.aiResult ? 'report' : imported.generatedAt ? 'persona' : 'generate')
        showToast(`"${imported.name}" importé`)
      } catch (err) { showToast('Fichier invalide : ' + err.message, 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  const aiResult = active?.aiResult || null

  // ── Dynamic CSS ──
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Geist+Mono:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:${T.bg}; --sur:${T.sur}; --sur2:${T.sur2}; --sur3:${T.sur3};
      --bd:${T.bd}; --bd2:${T.bd2}; --tx:${T.tx}; --mt:${T.mt}; --mt2:${T.mt2};
      --ac:${T.ac}; --ac2:${T.ac2};
    }
    html,body { background:var(--bg); color:var(--tx); font-family:'Bricolage Grotesque',sans-serif; height:100%; }
    ::-webkit-scrollbar { width:3px; height:3px; }
    ::-webkit-scrollbar-thumb { background:var(--bd2); border-radius:2px; }
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .root { min-height:100vh; display:flex; flex-direction:column; }

    /* Topbar */
    .topbar { height:54px; background:var(--sur); border-bottom:1px solid var(--bd); display:flex; align-items:center; padding:0 18px; gap:10px; position:sticky; top:0; z-index:100; }
    .logo { font-family:'Cabinet Grotesk',sans-serif; font-size:17px; font-weight:800; color:var(--ac2); letter-spacing:-.02em; }
    .proj-sub { font-size:10px; color:var(--mt); font-family:'Geist Mono',monospace; }
    .tr { margin-left:auto; display:flex; gap:6px; align-items:center; }
    .back { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:5px; background:var(--sur2); border:1px solid var(--bd2); color:var(--mt2); font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s; }
    .back:hover { color:var(--tx); }

    /* Buttons */
    .btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:5px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; border:1px solid var(--bd2); background:var(--sur2); color:var(--mt2); transition:all .15s; white-space:nowrap; }
    .btn:hover { color:var(--tx); border-color:var(--mt2); }
    .btn.pr { background:var(--ac); border-color:var(--ac); color:#fff; }
    .btn.pr:hover { opacity:.88; }
    .btn.gn { background:color-mix(in srgb, var(--ac) 10%, transparent); border-color:color-mix(in srgb, var(--ac) 30%, transparent); color:var(--ac2); }
    .btn.gn:hover { background:color-mix(in srgb, var(--ac) 18%, transparent); }
    .btn.an { background:rgba(245,158,11,.07); border-color:rgba(245,158,11,.25); color:#f59e0b; }
    .btn.an:hover { background:rgba(245,158,11,.14); }
    .btn:disabled { opacity:.3; cursor:not-allowed; pointer-events:none; }
    .btn.sm { padding:4px 9px; font-size:10px; }

    /* Theme dots */
    .tdots { display:flex; gap:4px; align-items:center; }
    .tdot { width:14px; height:14px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all .15s; }
    .tdot.on { border-color:var(--tx); transform:scale(1.25); }

    /* Layout */
    .body { flex:1; display:grid; grid-template-columns:210px 1fr; height:calc(100vh - 54px); overflow:hidden; }

    /* Sidebar */
    .sidebar { background:var(--sur); border-right:1px solid var(--bd); display:flex; flex-direction:column; overflow:hidden; }
    .sph { padding:12px 14px; border-bottom:1px solid var(--bd); display:flex; align-items:center; justify-content:space-between; }
    .spl-lbl { font-size:10px; color:var(--mt); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
    .spl { flex:1; overflow-y:auto; padding:5px; display:flex; flex-direction:column; gap:2px; }
    .wi { padding:9px 11px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
    .wi:hover { background:var(--sur2); }
    .wi.on { background:color-mix(in srgb, var(--ac) 10%, transparent); border-color:color-mix(in srgb, var(--ac) 22%, transparent); }
    .wi-name { font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:space-between; }
    .wi-meta { font-size:10px; color:var(--mt); font-family:'Geist Mono',monospace; margin-top:2px; }
    .wi-del { background:none; border:none; color:var(--mt); cursor:pointer; font-size:11px; opacity:0; }
    .wi:hover .wi-del { opacity:1; }
    .wi-del:hover { color:#f87171; }
    .sbottom { padding:8px; border-top:1px solid var(--bd); display:flex; flex-direction:column; gap:5px; }

    /* Inputs */
    .inp { width:100%; background:var(--bg); border:1px solid var(--bd2); border-radius:5px; padding:7px 9px; font-family:'Bricolage Grotesque',sans-serif; font-size:12px; color:var(--tx); outline:none; transition:border-color .15s; }
    .inp:focus { border-color:var(--ac); }
    .inp::placeholder { color:var(--mt); }
    textarea.inp { resize:vertical; min-height:56px; }
    .sel { width:100%; background:var(--bg); border:1px solid var(--bd2); border-radius:5px; padding:7px 9px; font-size:12px; color:var(--tx); outline:none; font-family:'Bricolage Grotesque',sans-serif; cursor:pointer; }
    .sel:focus { border-color:var(--ac); }
    .lbl { font-size:10px; color:var(--mt); letter-spacing:.07em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:3px; display:block; }
    .fg { display:flex; flex-direction:column; gap:3px; }

    /* Main */
    .main { overflow-y:auto; display:flex; flex-direction:column; }

    /* Tabs */
    .tabs { background:var(--sur); border-bottom:1px solid var(--bd); padding:0 18px; display:flex; gap:2px; height:42px; align-items:center; flex-shrink:0; }
    .tab-btn { padding:5px 13px; border-radius:5px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:none; background:none; color:var(--mt2); transition:all .15s; }
    .tab-btn.on { background:color-mix(in srgb, var(--ac) 14%, transparent); color:var(--ac2); }
    .tab-btn:hover:not(.on) { color:var(--tx); }

    /* Content */
    .cnt { padding:22px 24px; display:flex; flex-direction:column; gap:18px; animation:fadeIn .25s ease; }

    /* Cards */
    .card { background:var(--sur); border:1px solid var(--bd); border-radius:11px; padding:18px; }
    .ct { font-size:10px; color:var(--mt2); letter-spacing:.09em; text-transform:uppercase; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:7px; margin-bottom:13px; }
    .cdot { width:5px; height:5px; border-radius:50%; background:var(--ac); flex-shrink:0; }

    /* Generate */
    .g2 { display:grid; grid-template-columns:1fr 1fr; gap:11px; }
    .gen-bar { display:flex; align-items:center; gap:9px; padding:10px 14px; background:color-mix(in srgb, var(--ac) 6%, transparent); border:1px solid color-mix(in srgb, var(--ac) 22%, transparent); border-radius:7px; font-size:12px; color:var(--ac2); font-family:'Geist Mono',monospace; }
    .sp { width:14px; height:14px; border:2px solid color-mix(in srgb, var(--ac) 20%, transparent); border-top-color:var(--ac2); border-radius:50%; animation:spin .6s linear infinite; flex-shrink:0; }

    /* Persona hero */
    .persona-hero { display:grid; grid-template-columns:auto 1fr; gap:20px; align-items:start; }
    .avatar-box { width:80px; height:80px; border-radius:16px; background:color-mix(in srgb, var(--ac) 12%, transparent); border:1px solid color-mix(in srgb, var(--ac) 25%, transparent); display:flex; align-items:center; justify-content:center; font-size:38px; flex-shrink:0; }
    .persona-name { font-family:'Cabinet Grotesk',sans-serif; font-size:22px; font-weight:800; letter-spacing:-.02em; margin-bottom:4px; }
    .persona-role { font-size:13px; color:var(--mt2); margin-bottom:10px; }
    .persona-tags { display:flex; gap:6px; flex-wrap:wrap; }
    .p-tag { font-size:10px; font-family:'Geist Mono',monospace; padding:3px 8px; border-radius:4px; background:var(--sur2); border:1px solid var(--bd2); color:var(--mt2); }
    .persona-quote { font-size:13px; font-style:italic; color:var(--mt2); padding:10px 14px; background:color-mix(in srgb, var(--ac) 4%, transparent); border-left:2px solid var(--ac); border-radius:0 6px 6px 0; margin-top:8px; line-height:1.6; }

    /* Grid layouts */
    .g3 { display:grid; grid-template-columns:repeat(3,1fr); gap:11px; }
    .g2r { display:grid; grid-template-columns:1fr 1fr; gap:11px; }

    /* Tag list */
    .tag-list { display:flex; flex-wrap:wrap; gap:5px; min-height:28px; }
    .tag { display:flex; align-items:center; gap:4px; padding:3px 8px; border-radius:4px; font-size:11px; background:var(--sur2); border:1px solid var(--bd); color:var(--mt2); }
    .tag-del { background:none; border:none; color:var(--mt); cursor:pointer; font-size:10px; line-height:1; padding:0; }
    .tag-del:hover { color:#f87171; }
    .add-row { display:flex; gap:5px; margin-top:6px; }

    /* Tech bar */
    .tech-bar { display:flex; gap:4px; }
    .tech-dot { width:28px; height:8px; border-radius:4px; cursor:pointer; transition:all .15s; }

    /* Empathy map grid */
    .em-grid { display:grid; grid-template-columns:1fr 1fr 1fr; grid-template-rows:auto auto auto; gap:10px; }
    .em-cell { background:var(--sur2); border:1px solid var(--bd); border-radius:9px; padding:13px; }
    .em-icon { font-size:18px; margin-bottom:4px; }
    .em-title { font-size:11px; font-weight:700; margin-bottom:8px; font-family:'Cabinet Grotesk',sans-serif; }
    .em-pains-gains { grid-column:1/-1; display:grid; grid-template-columns:1fr 1fr; gap:10px; }

    /* Journey */
    .stage-tabs { display:flex; gap:4px; overflow-x:auto; padding-bottom:2px; }
    .stage-tab { padding:6px 12px; border-radius:7px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--bd2); background:var(--sur2); color:var(--mt2); white-space:nowrap; transition:all .15s; display:flex; align-items:center; gap:5px; }
    .stage-tab.on { color:var(--tx); }
    .emotion-row { display:flex; gap:5px; flex-wrap:wrap; }
    .emo-btn { padding:5px 10px; border-radius:5px; font-size:10px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--bd); background:var(--sur2); color:var(--mt2); transition:all .15s; }
    .emo-btn.on { color:#000; font-weight:700; }

    /* Journey timeline viz */
    .journey-viz { display:grid; grid-template-columns:repeat(6,1fr); gap:6px; }
    .jv-stage { display:flex; flex-direction:column; gap:4px; }
    .jv-header { text-align:center; padding:6px 4px; border-radius:6px; font-size:9px; font-family:'Geist Mono',monospace; font-weight:700; }
    .jv-emo-bar { height:40px; display:flex; align-items:flex-end; justify-content:center; }
    .jv-emo-fill { width:80%; border-radius:3px 3px 0 0; transition:height .4s ease; }
    .jv-count { text-align:center; font-size:9px; font-family:'Geist Mono',monospace; color:var(--mt); }

    /* Report */
    .score-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:9px; }
    .sc-card { background:var(--sur); border:1px solid var(--bd); border-radius:9px; padding:13px; display:flex; flex-direction:column; align-items:center; gap:5px; }
    .sc-num { font-family:'Cabinet Grotesk',sans-serif; font-size:26px; font-weight:800; }
    .sc-lbl { font-size:10px; color:var(--mt); font-family:'Geist Mono',monospace; text-transform:uppercase; letter-spacing:.07em; }
    .reco-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .reco-card { background:var(--sur); border:1px solid var(--bd); border-radius:9px; padding:13px; }
    .reco-cat { font-size:10px; font-family:'Geist Mono',monospace; font-weight:700; margin-bottom:4px; }
    .reco-title { font-size:13px; font-weight:600; margin-bottom:4px; }
    .reco-text { font-size:11px; color:var(--mt2); line-height:1.6; margin-bottom:6px; }
    .reco-action { font-size:10px; font-family:'Geist Mono',monospace; padding:3px 8px; border-radius:4px; display:inline-flex; }
    .ai-block { background:var(--sur2); border:1px solid var(--bd2); border-radius:9px; padding:13px 15px; font-size:13px; line-height:1.75; color:var(--mt2); }
    .sh { font-size:10px; color:var(--mt2); letter-spacing:.09em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:9px; display:flex; align-items:center; gap:9px; }
    .sl { flex:1; height:1px; background:var(--bd); }
    .ap-item { background:var(--sur); border:1px solid var(--bd); border-radius:8px; padding:13px; display:flex; gap:12px; }
    .ap-num { width:26px; height:26px; border-radius:6px; background:color-mix(in srgb, var(--ac) 12%, transparent); border:1px solid color-mix(in srgb, var(--ac) 25%, transparent); color:var(--ac2); font-family:'Geist Mono',monospace; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .ap-title { font-size:13px; font-weight:600; margin-bottom:3px; }
    .ap-rat { font-size:11px; color:var(--mt2); line-height:1.6; margin-bottom:5px; }
    .ap-tags { display:flex; gap:5px; flex-wrap:wrap; }
    .ap-tag { font-size:10px; font-family:'Geist Mono',monospace; padding:2px 7px; border-radius:3px; background:var(--sur2); border:1px solid var(--bd2); color:var(--mt2); }
    .synth-box { background:color-mix(in srgb, var(--ac) 5%, transparent); border:1px solid color-mix(in srgb, var(--ac) 18%, transparent); border-radius:10px; padding:15px 17px; }
    .synth-lbl { font-size:10px; font-family:'Geist Mono',monospace; color:var(--ac2); letter-spacing:.09em; text-transform:uppercase; margin-bottom:7px; }
    .synth-txt { font-size:13px; color:var(--mt2); line-height:1.75; }
    .list-item { display:flex; gap:7px; align-items:flex-start; padding:7px 10px; background:var(--sur2); border:1px solid var(--bd); border-radius:6px; font-size:12px; color:var(--mt2); line-height:1.5; margin-bottom:5px; }
    .li-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; margin-top:5px; }

    /* Empty */
    .ew { padding:60px 40px; text-align:center; }
    .ei { font-size:38px; opacity:.15; margin-bottom:12px; }
    .et { font-size:13px; color:var(--mt); line-height:1.7; }

    /* Loading */
    .ld { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:13px; padding:80px; }
    .ld-sp { width:28px; height:28px; border:2px solid color-mix(in srgb, var(--ac) 20%, transparent); border-top-color:var(--ac2); border-radius:50%; animation:spin .7s linear infinite; }

    /* Toast */
    .toast { position:fixed; bottom:22px; right:22px; z-index:600; background:var(--sur2); border:1px solid var(--bd2); border-radius:7px; padding:10px 15px; font-size:13px; box-shadow:0 8px 28px rgba(0,0,0,.5); animation:fadeIn .2s ease; display:flex; align-items:center; gap:7px; }
    .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
    .toast.info  { border-color:color-mix(in srgb, var(--ac) 30%, transparent); }

    /* Export dropdown */
    .exp-wrap { position:relative; }
    .exp-menu { position:absolute; top:calc(100% + 4px); right:0; background:var(--sur); border:1px solid var(--bd2); border-radius:7px; overflow:hidden; z-index:50; min-width:120px; box-shadow:0 8px 20px rgba(0,0,0,.4); }
    .exp-item { padding:8px 14px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:7px; transition:background .12s; }
    .exp-item:hover { background:var(--sur2); }

    .sep { height:1px; background:var(--bd); }

    @media(max-width:800px){ .body{grid-template-columns:1fr} .sidebar{display:none} .g3{grid-template-columns:1fr 1fr} .score-grid{grid-template-columns:1fr 1fr} }
  `

  const [showExportMenu, setShowExportMenu] = useState(false)

  const persona = active?.persona || {}
  const empathy = active?.empathyMap || {}
  const journeyMap = active?.journeyMap || JOURNEY_STAGES.map(() => ({ touchpoints: [], customerActions: [], emotions: 3, painPoints: [], opportunities: [], channels: [] }))
  const currentStage = journeyMap[activeStage] || {}

  const TagList = ({ section, field, color, placeholder }) => (
    <div>
      <div className="tag-list">
        {(section === 'persona' ? (persona[field] || []) : (empathy[field] || [])).map((item, i) => (
          <span key={i} className="tag" style={{ borderColor: `${color}25`, color }}>
            {item}
            <button className="tag-del" onClick={() => removeFromList(section, field, i)}>✕</button>
          </span>
        ))}
      </div>
      <div className="add-row">
        <input className="inp" placeholder={placeholder} value={ni(`${section}.${field}`)}
          onChange={e => setNi(`${section}.${field}`, e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addToList(section, field, ni(`${section}.${field}`))}
          style={{ fontSize: 11 }} />
        <button className="btn sm" onClick={() => addToList(section, field, ni(`${section}.${field}`))}>+</button>
      </div>
    </div>
  )

  const JourneyTagList = ({ stageIdx, field, color, placeholder }) => {
    const stg = journeyMap[stageIdx] || {}
    return (
      <div>
        <div className="tag-list">
          {(stg[field] || []).map((item, i) => (
            <span key={i} className="tag" style={{ borderColor: `${color}25`, color }}>
              {item}
              <button className="tag-del" onClick={() => removeFromJourneyList(stageIdx, field, i)}>✕</button>
            </span>
          ))}
        </div>
        <div className="add-row">
          <input className="inp" placeholder={placeholder} value={ni(`journey.${stageIdx}.${field}`)}
            onChange={e => setNi(`journey.${stageIdx}.${field}`, e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addToJourneyList(stageIdx, field, ni(`journey.${stageIdx}.${field}`))}
            style={{ fontSize: 11 }} />
          <button className="btn sm" onClick={() => addToJourneyList(stageIdx, field, ni(`journey.${stageIdx}.${field}`))}>+</button>
        </div>
      </div>
    )
  }

  const EmCell = ({ field, icon, title, color }) => (
    <div className="em-cell" style={{ borderColor: `${color}18` }}>
      <div className="em-icon" style={{ color }}>{icon}</div>
      <div className="em-title" style={{ color }}>{title}</div>
      <TagList section="empathy" field={field} color={color} placeholder={`${title}…`} />
    </div>
  )

  return (
    <>
      <style>{css}</style>
      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      <div className="root">

        {/* Topbar */}
        <header className="topbar">
          <button className="back" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="logo">Connaissance Client</div>
            {project && <div className="proj-sub">{project.name}</div>}
          </div>
          <div className="tr">
            <div className="tdots">
              {Object.entries(THEMES).map(([key, th]) => (
                <div key={key} className={`tdot ${themeKey === key ? 'on' : ''}`}
                  style={{ background: th.ac }} title={th.name} onClick={() => switchTheme(key)} />
              ))}
            </div>
            <div style={{ width: 1, height: 18, background: T.bd2 }} />
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Import</button>
            {active && (
              <>
                <div className="exp-wrap" style={{ position: 'relative' }}>
                  <button className="btn" onClick={() => setShowExportMenu(v => !v)}>↓ Export ▾</button>
                  {showExportMenu && (
                    <div className="exp-menu" onClick={() => setShowExportMenu(false)}>
                      <div className="exp-item" onClick={exportJSON}>📄 JSON</div>
                      <div className="exp-item" onClick={exportCSV}>📊 CSV</div>
                      <div className="exp-item" onClick={exportWord}>📝 Word (.docx)</div>
                    </div>
                  )}
                </div>
                <button className="btn an" onClick={runAnalysis} disabled={anlLoading}>
                  {anlLoading ? <><span className="sp" />Analyse…</> : '✦ Analyser'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="body">

          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sph"><span className="spl-lbl">Profils ({workflows.length})</span></div>
            <div className="spl">
              {workflows.length === 0 && <div className="ew" style={{ padding: '36px 16px' }}><div className="ei">👤</div><div className="et">Créez votre premier profil</div></div>}
              {workflows.map(w => (
                <div key={w.id} className={`wi ${activeId === w.id ? 'on' : ''}`}
                  onClick={() => { setActiveId(w.id); setThemeKey(w.themeKey || 'void'); setTab(w.aiResult ? 'report' : w.generatedAt ? 'persona' : 'generate') }}>
                  <div className="wi-name">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{w.name}</span>
                    <button className="wi-del" onClick={e => { e.stopPropagation(); deleteWorkflow(w.id) }}>✕</button>
                  </div>
                  <div className="wi-meta">
                    {new Date(w.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {w.generatedAt && <span style={{ color: T.ac2 }}> · IA</span>}
                    {w.aiResult && <span style={{ color: '#34d399' }}> · ✦</span>}
                  </div>
                </div>
              ))}
            </div>
            {showNewForm ? (
              <div className="sbottom">
                <input className="inp" placeholder="Nom du profil" value={newName}
                  onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createWorkflow()} autoFocus />
                <div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn pr" style={{ flex: 1 }} onClick={createWorkflow}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>✕</button>
                </div>
              </div>
            ) : (
              <div className="sbottom">
                <button className="btn" style={{ justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>+ Nouveau profil</button>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="main" onClick={() => showExportMenu && setShowExportMenu(false)}>
            {!active ? (
              <div className="ew" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div className="ei" style={{ fontSize: 52 }}>👤</div>
                <div style={{ fontFamily: 'Cabinet Grotesk,sans-serif', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Connaissance Client & Parcours d'Achat</div>
                <div className="et">Buyer Persona · Empathy Map · Customer Journey</div>
                <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                  <button className="btn gn" style={{ padding: '9px 18px' }} onClick={() => setShowNewForm(true)}>+ Nouveau profil</button>
                  <button className="btn" style={{ padding: '9px 18px' }} onClick={() => importRef.current?.click()}>↑ Importer JSON</button>
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="tabs">
                  {[
                    { id: 'generate', label: '✦ Générer' },
                    { id: 'persona',  label: `👤 Persona${persona.name ? ` — ${persona.name}` : ''}` },
                    { id: 'empathy',  label: '🧠 Empathy Map' },
                    { id: 'journey',  label: '🗺 Journey Map' },
                    { id: 'report',   label: '📊 Rapport IA' },
                  ].map(t => (
                    <button key={t.id} className={`tab-btn ${tab === t.id ? 'on' : ''}`}
                      onClick={() => setTab(t.id)}
                      disabled={t.id === 'report' && !aiResult && !anlLoading}>{t.label}</button>
                  ))}
                  <div style={{ marginLeft: 'auto', fontSize: 11, color: T.mt, fontFamily: 'Geist Mono,monospace' }}>{active.name}</div>
                </div>

                {/* ══ GENERATE ══ */}
                {tab === 'generate' && (
                  <div className="cnt">
                    <div className="card">
                      <div className="ct"><div className="cdot" />Description du projet / produit</div>
                      <div className="fg" style={{ marginBottom: 12 }}>
                        <label className="lbl">Contexte général *</label>
                        <textarea className="inp" rows={5}
                          placeholder="Ex : Application mobile de méditation pour cadres stressés 30-50 ans. Abonnement 15€/mois. Marché France. Concurrent : Calm, Headspace. Notre différence : séances courtes de 5 min intégrées au calendrier pro. Objectif : 10 000 abonnés en 12 mois."
                          value={active.projectDesc || ''} onChange={e => updateActive({ projectDesc: e.target.value })} />
                      </div>
                      {genLoading && <div className="gen-bar"><span className="sp" />{genStep}</div>}
                      <div style={{ display: 'flex', gap: 9 }}>
                        <button className="btn gn" style={{ padding: '9px 20px', fontSize: 12 }} onClick={runGeneration} disabled={genLoading || !active.projectDesc?.trim()}>
                          {genLoading ? 'Génération…' : '✦ Générer Persona + Empathy + Journey'}
                        </button>
                        <button className="btn" onClick={() => setTab('persona')}>Remplir manuellement →</button>
                      </div>
                      {active.generatedAt && (
                        <div style={{ marginTop: 8, padding: '8px 12px', background: `color-mix(in srgb, ${T.ac} 5%, transparent)`, border: `1px solid color-mix(in srgb, ${T.ac} 15%, transparent)`, borderRadius: 7, fontSize: 11, color: T.ac2, fontFamily: 'Geist Mono,monospace' }}>
                          ✦ Généré le {new Date(active.generatedAt).toLocaleString('fr-FR')} — modifiez dans les onglets Persona, Empathy et Journey.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ══ PERSONA ══ */}
                {tab === 'persona' && (
                  <div className="cnt">
                    {/* Hero */}
                    {(persona.name || persona.job) && (
                      <div className="card">
                        <div className="persona-hero">
                          <div className="avatar-box">{persona.avatar || '👤'}</div>
                          <div>
                            <div className="persona-name">{persona.name || 'Persona sans nom'}</div>
                            <div className="persona-role">{[persona.job, persona.location].filter(Boolean).join(' · ')}</div>
                            <div className="persona-tags">
                              {persona.age && <span className="p-tag">{persona.age} ans</span>}
                              {persona.gender && <span className="p-tag">{persona.gender}</span>}
                              {persona.income && <span className="p-tag">{persona.income}</span>}
                              {persona.education && <span className="p-tag">{persona.education}</span>}
                            </div>
                            {persona.quote && <div className="persona-quote">"{persona.quote}"</div>}
                          </div>
                        </div>
                        {persona.bio && <p style={{ fontSize: 12, color: T.mt2, lineHeight: 1.6, marginTop: 12 }}>{persona.bio}</p>}
                      </div>
                    )}

                    {/* Identité */}
                    <div className="card">
                      <div className="ct"><div className="cdot" />Identité</div>
                      <div className="g3">
                        {[
                          { f: 'name', l: 'Prénom/Nom', ph: 'Sophie Martin' },
                          { f: 'job', l: 'Poste / Rôle', ph: 'Directrice Marketing' },
                          { f: 'age', l: 'Âge', ph: '38' },
                          { f: 'gender', l: 'Genre', ph: 'Femme' },
                          { f: 'location', l: 'Localisation', ph: 'Paris, France' },
                          { f: 'income', l: 'Revenu annuel', ph: '65 000€' },
                        ].map(({ f, l, ph }) => (
                          <div key={f} className="fg">
                            <label className="lbl">{l}</label>
                            <input className="inp" placeholder={ph} value={persona[f] || ''} onChange={e => patchPersona({ [f]: e.target.value })} />
                          </div>
                        ))}
                        <div className="fg">
                          <label className="lbl">Éducation</label>
                          <input className="inp" placeholder="Master, Bac+5…" value={persona.education || ''} onChange={e => patchPersona({ education: e.target.value })} />
                        </div>
                        <div className="fg">
                          <label className="lbl">Avatar emoji</label>
                          <input className="inp" placeholder="👤" value={persona.avatar || ''} onChange={e => patchPersona({ avatar: e.target.value })} style={{ width: 70 }} />
                        </div>
                      </div>
                    </div>

                    {/* Citation & Bio */}
                    <div className="card">
                      <div className="ct"><div className="cdot" />Citation & Biographie</div>
                      <div className="fg" style={{ marginBottom: 10 }}>
                        <label className="lbl">Citation clé</label>
                        <input className="inp" placeholder="Ce que cette personne dirait spontanément sur son problème…" value={persona.quote || ''} onChange={e => patchPersona({ quote: e.target.value })} />
                      </div>
                      <div className="fg">
                        <label className="lbl">Bio narrative</label>
                        <textarea className="inp" rows={3} placeholder="Description de son quotidien, contexte de vie, déclencheurs…" value={persona.bio || ''} onChange={e => patchPersona({ bio: e.target.value })} />
                      </div>
                    </div>

                    {/* Objectifs / Frustrations / Motivations */}
                    <div className="g3">
                      {[
                        { f: 'goals', label: 'Objectifs', color: '#34d399', ph: 'Ex: Gagner 2h/jour…' },
                        { f: 'frustrations', label: 'Frustrations', color: '#f87171', ph: 'Ex: Trop de réunions…' },
                        { f: 'motivations', label: 'Motivations', color: '#f59e0b', ph: 'Ex: Reconnaissance…' },
                      ].map(({ f, label, color, ph }) => (
                        <div key={f} className="card" style={{ borderColor: `${color}18` }}>
                          <div className="ct"><div className="cdot" style={{ background: color }} />{label}</div>
                          <TagList section="persona" field={f} color={color} placeholder={ph} />
                        </div>
                      ))}
                    </div>

                    {/* Comportement & Canaux */}
                    <div className="card">
                      <div className="ct"><div className="cdot" />Comportement d'achat</div>
                      <div className="g2r">
                        <div className="fg">
                          <label className="lbl">Processus d'achat</label>
                          <textarea className="inp" rows={3} placeholder="Comment décide-t-il d'acheter ? Recherche en ligne, recommandation…" value={persona.buyingBehavior || ''} onChange={e => patchPersona({ buyingBehavior: e.target.value })} />
                        </div>
                        <div>
                          <div className="fg" style={{ marginBottom: 10 }}>
                            <label className="lbl">Aisance technologique ({persona.techSavviness || 3}/5)</label>
                            <input type="range" min={1} max={5} value={persona.techSavviness || 3}
                              style={{ accentColor: T.ac, width: '100%' }}
                              onChange={e => patchPersona({ techSavviness: +e.target.value })} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: T.mt, fontFamily: 'Geist Mono,monospace' }}>
                              <span>Novice</span><span>Expert</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <label className="lbl" style={{ marginBottom: 6 }}>Canaux préférés</label>
                        <TagList section="persona" field="preferredChannels" color={T.ac} placeholder="LinkedIn, Email, YouTube…" />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
                      <button className="btn" onClick={() => setTab('empathy')}>Empathy Map →</button>
                    </div>
                  </div>
                )}

                {/* ══ EMPATHY MAP ══ */}
                {tab === 'empathy' && (
                  <div className="cnt">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontFamily: 'Cabinet Grotesk,sans-serif', fontWeight: 800, fontSize: 20 }}>Carte d'Empathie</div>
                      {persona.name && <span style={{ fontSize: 12, color: T.mt2, fontFamily: 'Geist Mono,monospace' }}>— {persona.name}</span>}
                    </div>

                    <div className="em-grid">
                      <EmCell field="thinks" icon="💭" title="PENSE & RESSENT" color="#a78bfa" />
                      <EmCell field="sees" icon="👁" title="VOIT" color="#60a5fa" />
                      <EmCell field="hears" icon="👂" title="ENTEND" color="#34d399" />
                      <EmCell field="says" icon="💬" title="DIT & FAIT" color="#f59e0b" />
                      <EmCell field="does" icon="⚡" title="FAIT" color="#fb923c" />
                      <EmCell field="feels" icon="❤" title="RESSENT" color="#f472b6" />
                      <div className="em-pains-gains">
                        <EmCell field="pains" icon="😣" title="DOULEURS (Pains)" color="#f87171" />
                        <EmCell field="gains" icon="🎯" title="GAINS recherchés" color="#22d3a5" />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button className="btn" onClick={() => setTab('persona')}>← Persona</button>
                      <button className="btn" onClick={() => setTab('journey')}>Journey Map →</button>
                    </div>
                  </div>
                )}

                {/* ══ JOURNEY MAP ══ */}
                {tab === 'journey' && (
                  <div className="cnt">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'Cabinet Grotesk,sans-serif', fontWeight: 800, fontSize: 20 }}>Customer Journey Map</div>
                      {persona.name && <span style={{ fontSize: 12, color: T.mt2, fontFamily: 'Geist Mono,monospace' }}>— {persona.name}</span>}
                    </div>

                    {/* Viz timeline */}
                    <div className="journey-viz">
                      {JOURNEY_STAGES.map((s, i) => {
                        const stg = journeyMap[i] || {}
                        const emo = stg.emotions || 3
                        const emoCol = scoreColor(emo)
                        return (
                          <div key={s.id} className="jv-stage" onClick={() => setActiveStage(i)} style={{ cursor: 'pointer' }}>
                            <div className="jv-header" style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}30` }}>
                              {s.icon} {s.label.slice(0, 10)}
                            </div>
                            <div className="jv-emo-bar">
                              <div className="jv-emo-fill" style={{ height: `${(emo / 5) * 100}%`, background: emoCol }} />
                            </div>
                            <div className="jv-count">{(stg.touchpoints || []).length}tp</div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Stage tabs */}
                    <div className="stage-tabs">
                      {JOURNEY_STAGES.map((s, i) => (
                        <button key={s.id} className={`stage-tab ${activeStage === i ? 'on' : ''}`}
                          style={activeStage === i ? { background: `${s.color}15`, borderColor: `${s.color}35`, color: s.color } : {}}
                          onClick={() => setActiveStage(i)}>
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Active stage editor */}
                    {(() => {
                      const s = JOURNEY_STAGES[activeStage]
                      const stg = currentStage
                      return (
                        <div className="card" style={{ borderColor: `${s.color}20` }}>
                          <div className="ct" style={{ marginBottom: 16 }}>
                            <div className="cdot" style={{ background: s.color }} />
                            <span style={{ color: s.color }}>{s.icon} {s.label}</span>
                          </div>

                          {/* Emotion */}
                          <div style={{ marginBottom: 14 }}>
                            <label className="lbl" style={{ marginBottom: 6 }}>Niveau d'émotion</label>
                            <div className="emotion-row">
                              {EMOTION_LEVELS.map(e => (
                                <button key={e.value} className={`emo-btn ${stg.emotions === e.value ? 'on' : ''}`}
                                  style={stg.emotions === e.value ? { background: e.color, borderColor: e.color } : {}}
                                  onClick={() => patchJourneyStage(activeStage, { emotions: e.value })}>
                                  {e.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="g2r">
                            <div>
                              <label className="lbl" style={{ marginBottom: 6 }}>Touchpoints</label>
                              <JourneyTagList stageIdx={activeStage} field="touchpoints" color={s.color} placeholder="Ex: publicité LinkedIn…" />
                            </div>
                            <div>
                              <label className="lbl" style={{ marginBottom: 6 }}>Actions client</label>
                              <JourneyTagList stageIdx={activeStage} field="customerActions" color="#a78bfa" placeholder="Ex: compare les prix…" />
                            </div>
                            <div>
                              <label className="lbl" style={{ marginBottom: 6 }}>Points de friction 🔥</label>
                              <JourneyTagList stageIdx={activeStage} field="painPoints" color="#f87171" placeholder="Ex: site lent, manque d'info…" />
                            </div>
                            <div>
                              <label className="lbl" style={{ marginBottom: 6 }}>Opportunités ✦</label>
                              <JourneyTagList stageIdx={activeStage} field="opportunities" color="#34d399" placeholder="Ex: retargeting, chatbot…" />
                            </div>
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <label className="lbl" style={{ marginBottom: 6 }}>Canaux</label>
                            <JourneyTagList stageIdx={activeStage} field="channels" color="#f59e0b" placeholder="Ex: Email, Instagram, SEO…" />
                          </div>
                        </div>
                      )
                    })()}

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button className="btn" onClick={() => setTab('empathy')}>← Empathy Map</button>
                      <button className="btn an" onClick={runAnalysis} disabled={anlLoading}>
                        {anlLoading ? <><span className="sp" />…</> : '✦ Lancer l\'analyse IA'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ══ REPORT ══ */}
                {tab === 'report' && (
                  anlLoading ? (
                    <div className="ld">
                      <div className="ld-sp" />
                      <div style={{ fontSize: 13, color: T.mt2, fontFamily: 'Geist Mono,monospace' }}>Analyse stratégique en cours…</div>
                    </div>
                  ) : aiResult ? (
                    <div className="cnt">
                      {/* Scores */}
                      {aiResult.scores && (
                        <div className="score-grid">
                          {[
                            { k: 'persona_completeness', l: 'Complétude Persona' },
                            { k: 'empathy_depth', l: 'Profondeur Empathy' },
                            { k: 'journey_quality', l: 'Qualité Journey' },
                            { k: 'global', l: 'Score global' },
                          ].map(({ k, l }) => {
                            const v = parseFloat(aiResult.scores[k]) || 3
                            return (
                              <div key={k} className="sc-card">
                                <div className="sc-num" style={{ color: scoreColor(v) }}>{v.toFixed(1)}</div>
                                <div className="sc-lbl">{l}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Executive summary */}
                      {aiResult.executive_summary && (
                        <div>
                          <div className="sh">Synthèse exécutive <div className="sl" /></div>
                          <div className="ai-block">{aiResult.executive_summary}</div>
                        </div>
                      )}

                      {/* Persona insights */}
                      {aiResult.persona_insights && (
                        <div>
                          <div className="sh">Insights Persona <div className="sl" /></div>
                          <div className="g2r">
                            {aiResult.persona_insights.strengths?.length > 0 && (
                              <div className="card" style={{ borderColor: 'rgba(52,211,153,.2)' }}>
                                <div className="ct" style={{ color: '#34d399' }}>✓ Points forts</div>
                                {aiResult.persona_insights.strengths.map((s, i) => (
                                  <div key={i} className="list-item"><div className="li-dot" style={{ background: '#34d399' }} />{s}</div>
                                ))}
                              </div>
                            )}
                            {aiResult.persona_insights.gaps?.length > 0 && (
                              <div className="card" style={{ borderColor: 'rgba(248,113,113,.2)' }}>
                                <div className="ct" style={{ color: '#f87171' }}>⚠ Lacunes</div>
                                {aiResult.persona_insights.gaps.map((g, i) => (
                                  <div key={i} className="list-item"><div className="li-dot" style={{ background: '#f87171' }} />{g}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Empathy insights */}
                      {aiResult.empathy_insights && (
                        <div>
                          <div className="sh">Insights Empathy Map <div className="sl" /></div>
                          <div className="ai-block" style={{ marginBottom: 10 }}>{aiResult.empathy_insights.analysis}</div>
                          {aiResult.empathy_insights.key_tensions?.length > 0 && (
                            <div>
                              <div style={{ fontSize: 10, color: T.mt2, fontFamily: 'Geist Mono,monospace', marginBottom: 6, fontWeight: 700 }}>TENSIONS CLÉS IDENTIFIÉES</div>
                              {aiResult.empathy_insights.key_tensions.map((t, i) => (
                                <div key={i} className="list-item" style={{ marginBottom: 6 }}><div className="li-dot" style={{ background: '#f59e0b' }} />{t}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Journey insights */}
                      {aiResult.journey_insights && (
                        <div>
                          <div className="sh">Analyse Journey Map <div className="sl" /></div>
                          <div className="ai-block" style={{ marginBottom: 10 }}>{aiResult.journey_insights.overall}</div>
                          {aiResult.journey_insights.critical_stages?.length > 0 && (
                            <div>
                              <div style={{ fontSize: 10, color: '#f87171', fontFamily: 'Geist Mono,monospace', marginBottom: 6, fontWeight: 700 }}>🔥 ÉTAPES CRITIQUES</div>
                              {aiResult.journey_insights.critical_stages.map((s, i) => (
                                <div key={i} className="list-item" style={{ marginBottom: 6 }}>
                                  <div className="li-dot" style={{ background: '#f87171' }} />
                                  <div><strong>{s.stage}</strong> — {s.issue}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {aiResult.journey_insights.best_opportunities?.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 10, color: '#34d399', fontFamily: 'Geist Mono,monospace', marginBottom: 6, fontWeight: 700 }}>✦ MEILLEURES OPPORTUNITÉS</div>
                              {aiResult.journey_insights.best_opportunities.map((o, i) => (
                                <div key={i} className="list-item" style={{ marginBottom: 6 }}>
                                  <div className="li-dot" style={{ background: '#34d399' }} />{o}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recommendations */}
                      {aiResult.recommendations?.length > 0 && (
                        <div>
                          <div className="sh">Recommandations stratégiques <div className="sl" /></div>
                          <div className="reco-grid">
                            {aiResult.recommendations.map((r, i) => (
                              <div key={i} className="reco-card">
                                <div className="reco-cat" style={{ color: T.ac2 }}>{r.category}</div>
                                <div className="reco-title">{r.title}</div>
                                <div className="reco-text">{r.analysis}</div>
                                {r.action && (
                                  <span className="reco-action" style={{ background: `${T.ac}12`, color: T.ac, border: `1px solid ${T.ac}22` }}>→ {r.action}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action plan */}
                      {aiResult.action_plan?.length > 0 && (
                        <div>
                          <div className="sh">Plan d'action <div className="sl" /></div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {aiResult.action_plan.map((a, i) => (
                              <div key={i} className="ap-item">
                                <div className="ap-num">#{a.priority || i + 1}</div>
                                <div style={{ flex: 1 }}>
                                  <div className="ap-title">{a.action}</div>
                                  <div className="ap-rat">{a.rationale}</div>
                                  <div className="ap-tags">
                                    {a.category && <span className="ap-tag">{a.category}</span>}
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
                          <div className="sh">Synthèse finale <div className="sl" /></div>
                          <div className="synth-box">
                            <div className="synth-lbl">✦ Verdict stratégique</div>
                            <div className="synth-txt">{aiResult.synthesis}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="ew" style={{ padding: '80px 40px' }}>
                      <div className="ei" style={{ fontSize: 48 }}>✦</div>
                      <div style={{ fontFamily: 'Cabinet Grotesk,sans-serif', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Analyse IA</div>
                      <div className="et" style={{ marginBottom: 20 }}>Complétez le Persona, l'Empathy Map et le Journey Map,<br />puis lancez l'analyse pour obtenir des recommandations.</div>
                      <button className="btn an" onClick={runAnalysis} disabled={anlLoading}>✦ Lancer l'analyse IA</button>
                    </div>
                  )
                )}
              </>
            )}
          </main>
        </div>

        {toast && <div className={`toast ${toast.type || ''}`}>{toast.type === 'error' ? '✕' : '✓'} {toast.msg}</div>}
      </div>
    </>
  )
}