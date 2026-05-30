'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const CRITERIA = [
  { id:'valuable',   letter:'V', label:'Valeur',        question:'Exploite une opportunité ou neutralise une menace ?',           color:'#6366f1', bg:'rgba(99,102,241,.1)',   border:'rgba(99,102,241,.25)'  },
  { id:'rare',       letter:'R', label:'Rareté',         question:'Détenue par peu ou aucun concurrent actuel ?',                  color:'#f59e0b', bg:'rgba(245,158,11,.1)',   border:'rgba(245,158,11,.25)'  },
  { id:'inimitable', letter:'I', label:'Imitabilité',    question:'Coûteux ou difficile à imiter ou substituer ?',                  color:'#22d3a5', bg:'rgba(34,211,165,.1)',   border:'rgba(34,211,165,.25)'  },
  { id:'organized',  letter:'O', label:'Organisation',   question:'L\'entreprise est-elle organisée pour l\'exploiter pleinement ?',color:'#818cf8', bg:'rgba(129,140,248,.1)',  border:'rgba(129,140,248,.25)' },
]

const CATEGORIES = [
  { id:'physical',   label:'Physique',      icon:'⬡', desc:'Équipements, locaux, infrastructure'    },
  { id:'financial',  label:'Financier',     icon:'◎', desc:'Capital, trésorerie, investissements'   },
  { id:'human',      label:'Humain',        icon:'◈', desc:'Compétences, expérience, culture'       },
  { id:'technology', label:'Technologique', icon:'◉', desc:'Brevets, logiciels, R&D'                },
  { id:'reputation', label:'Réputation',    icon:'★', desc:'Marque, image, confiance clients'       },
  { id:'relational', label:'Relationnel',   icon:'⊞', desc:'Partenariats, réseau, fournisseurs'     },
  { id:'knowledge',  label:'Connaissance',  icon:'⬠', desc:'Données, savoir-faire exclusifs'        },
  { id:'other',      label:'Autre',         icon:'◌', desc:'Autres ressources stratégiques'         },
]

const THEMES = {
  dark:   { name:'Dark',    bg:'#0a0a0f', s1:'#111118', s2:'#18181f', s3:'#1e1e28', tx:'#f0eff5', mu:'#6b6a7a', mu2:'#9896aa', b1:'rgba(255,255,255,.07)', b2:'rgba(255,255,255,.12)', acc:'#6366f1', acc2:'#818cf8' },
  slate:  { name:'Slate',   bg:'#0d1117', s1:'#161b22', s2:'#21262d', s3:'#30363d', tx:'#e6edf3', mu:'#6e7681', mu2:'#8b949e', b1:'rgba(240,246,252,.07)', b2:'rgba(240,246,252,.12)', acc:'#58a6ff', acc2:'#79c0ff' },
  forest: { name:'Forest',  bg:'#0d1409', s1:'#141d0f', s2:'#1a2614', s3:'#1f2e17', tx:'#d4e8c2', mu:'#5a7040', mu2:'#8aac6a', b1:'rgba(144,238,144,.07)', b2:'rgba(144,238,144,.12)', acc:'#56d364', acc2:'#7ee787' },
  ocean:  { name:'Ocean',   bg:'#020a18', s1:'#0a1628', s2:'#0f1e36', s3:'#142644', tx:'#cae8ff', mu:'#3d6a8c', mu2:'#6a9fbc', b1:'rgba(56,139,253,.07)',  b2:'rgba(56,139,253,.12)',  acc:'#388bfd', acc2:'#79c0ff' },
  rose:   { name:'Rose',    bg:'#120009', s1:'#1e000f', s2:'#28001a', s3:'#330020', tx:'#ffd6e7', mu:'#7a2d4f', mu2:'#b05878', b1:'rgba(248,113,182,.07)', b2:'rgba(248,113,182,.12)', acc:'#f472b6', acc2:'#f9a8d4' },
  amber:  { name:'Amber',   bg:'#100900', s1:'#1a1000', s2:'#241600', s3:'#2e1c00', tx:'#fef3c7', mu:'#786310', mu2:'#b08a20', b1:'rgba(245,158,11,.07)',  b2:'rgba(245,158,11,.12)',  acc:'#f59e0b', acc2:'#fbbf24' },
}

const getOutcome = (v, r, i, o) => {
  if (!v)                return { tier:0, label:'Désavantage compétitif',         short:'Désavantage',  color:'#f87171', bg:'rgba(248,113,113,.08)', border:'rgba(248,113,113,.2)',  icon:'↓' }
  if (v && !r)           return { tier:1, label:'Parité compétitive',             short:'Parité',       color:'#9896aa', bg:'rgba(152,150,170,.08)', border:'rgba(152,150,170,.2)',  icon:'→' }
  if (v && r && !i)      return { tier:2, label:'Avantage compétitif temporaire', short:'Temporaire',   color:'#f59e0b', bg:'rgba(245,158,11,.08)',  border:'rgba(245,158,11,.2)',   icon:'↗' }
  if (v && r && i && !o) return { tier:3, label:'Avantage non exploité',          short:'Non exploité', color:'#818cf8', bg:'rgba(129,140,248,.08)', border:'rgba(129,140,248,.2)',  icon:'◐' }
  return                        { tier:4, label:'Avantage concurrentiel durable', short:'Durable',      color:'#22d3a5', bg:'rgba(34,211,165,.08)',  border:'rgba(34,211,165,.2)',   icon:'★' }
}

const EMPTY_RESOURCE = { name:'', description:'', category:'human', valuable:null, rare:null, inimitable:null, organized:null, notes:'', strength:3 }

const GEN_STEPS = [
  'Analyse du contexte stratégique…',
  'Identification des ressources clés…',
  'Évaluation des critères VRIO…',
  'Calcul des avantages compétitifs…',
  'Génération des recommandations…',
]

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function VRIOPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,     setProject]     = useState(null)
  const [analyses,    setAnalyses]    = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [formMode,    setFormMode]    = useState('ai')     // 'ai' | 'manual'
  const [newAnalysis, setNewAnalysis] = useState({ name:'', context:'' })
  const [genDesc,     setGenDesc]     = useState('')
  const [genLoading,  setGenLoading]  = useState(false)
  const [genStep,     setGenStep]     = useState(0)

  const [showResForm, setShowResForm] = useState(false)
  const [editRes,     setEditRes]     = useState(null)
  const [resForm,     setResForm]     = useState(EMPTY_RESOURCE)

  const [viewMode,    setViewMode]    = useState('matrix') // 'matrix' | 'funnel' | 'table'
  const [filterCat,   setFilterCat]   = useState('all')
  const [filterTier,  setFilterTier]  = useState('all')

  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const [theme,       setTheme]       = useState('dark')
  const [showThemes,  setShowThemes]  = useState(false)
  const [toast,       setToast]       = useState(null)

  const T = THEMES[theme] || THEMES.dark

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects||[]).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.VRIO || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id); setAiResult(last.aiResult || null)
        }
      }
      const saved = localStorage.getItem('vrio_theme')
      if (saved && THEMES[saved]) setTheme(saved)
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects||[]).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools||{}), VRIO: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type='success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const setThemeAndSave = (t) => {
    setTheme(t); localStorage.setItem('vrio_theme', t); setShowThemes(false)
  }

  const active    = analyses.find(a => a.id === activeId) || null
  const resources = active?.resources || []

  const updateActive = useCallback((patch) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === activeId ? { ...a, ...patch } : a)
      setTimeout(() => {
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (!raw) return
          const data = JSON.parse(raw)
          data.projects = (data.projects||[]).map(p =>
            p.id !== projectId ? p : { ...p, tools: { ...(p.tools||{}), VRIO: updated } }
          )
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        } catch {}
      }, 0)
      return updated
    })
  }, [activeId, projectId])

  // ── Analysis CRUD ──────────────────────────────────────────────────────────
  const selectAnalysis = (a) => {
    setActiveId(a.id); setAiResult(a.aiResult || null); setShowForm(false)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) setActiveId(updated[updated.length-1]?.id || null)
    showToast('Analyse supprimée', 'info')
  }

  const createManual = () => {
    if (!newAnalysis.name.trim()) return
    const a = { id:uid(), name:newAnalysis.name.trim(), context:newAnalysis.context.trim(), createdAt:new Date().toISOString(), resources:[], aiResult:null }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowForm(false); setNewAnalysis({ name:'', context:'' })
    showToast(`"${a.name}" créée`)
  }

  // ── AI GENERATION (Mode 1) ─────────────────────────────────────────────────
  const generateAI = async () => {
    if (!genDesc.trim()) return
    setGenLoading(true); setGenStep(0)
    let s = 0
    const iv = setInterval(() => { s = Math.min(s+1, GEN_STEPS.length-1); setGenStep(s) }, 1600)
    try {
      const res = await fetch('/api/generer-management/generer-vrio-auto', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ description:genDesc, projectName:project?.name||'', projectTag:project?.tag||'' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const { result } = data
      const newId = uid()
      const record = {
        id: newId, name: result.analysisName || 'Analyse IA',
        context: result.context || genDesc.slice(0, 200),
        createdAt: new Date().toISOString(),
        resources: result.resources || [],
        generatedByAI: true,
        aiResult: {
          synthese:      result.synthese,
          ressources:    result.ressources_analyse || [],
          avantages_cles: result.avantages_cles || [],
          vulnerabilites: result.vulnerabilites  || [],
          priorites:     result.priorites || [],
          conclusion:    result.conclusion,
        },
      }
      const updated = [...analyses, record]
      setAnalyses(updated); persist(updated)
      setActiveId(newId); setAiResult(record.aiResult)
      setShowAiPanel(true); setShowForm(false); setGenDesc('')
      showToast(`✦ ${record.resources.length} ressources générées`)
    } catch (err) { showToast(err.message, 'error') }
    finally { clearInterval(iv); setGenLoading(false) }
  }

  // ── AI ANALYSIS (Mode 2) ───────────────────────────────────────────────────
  const runAI = async () => {
    if (!resources.length) { showToast('Ajoutez des ressources d\'abord', 'error'); return }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-vrio', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ analysisName:active.name, context:active.context, resources, projectName:project?.name||'', projectTag:project?.tag||'' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiResult(data.result); updateActive({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── Resource CRUD ──────────────────────────────────────────────────────────
  const saveResource = () => {
    if (!resForm.name.trim()) return
    const res = { id:editRes?.id||uid(), ...resForm, outcome: getOutcome(resForm.valuable, resForm.rare, resForm.inimitable, resForm.organized) }
    const updated = editRes ? resources.map(r => r.id===editRes.id ? res : r) : [...resources, res]
    updateActive({ resources: updated })
    setShowResForm(false); setEditRes(null); setResForm(EMPTY_RESOURCE)
    showToast(editRes ? 'Ressource mise à jour' : 'Ressource ajoutée')
  }

  const deleteResource = (id) => {
    updateActive({ resources: resources.filter(r => r.id !== id) })
    showToast('Ressource supprimée', 'info')
  }

  const startEdit = (res) => {
    setEditRes(res)
    setResForm({ name:res.name, description:res.description||'', category:res.category||'human', valuable:res.valuable, rare:res.rare, inimitable:res.inimitable, organized:res.organized, notes:res.notes||'', strength:res.strength||3 })
    setShowResForm(true)
  }

  const toggleCriterion = (resId, criterion) => {
    const updated = resources.map(r => {
      if (r.id !== resId) return r
      const patched = { ...r, [criterion]: !r[criterion] }
      return { ...patched, outcome: getOutcome(patched.valuable, patched.rare, patched.inimitable, patched.organized) }
    })
    updateActive({ resources: updated })
  }

  // ── Export / Import ────────────────────────────────────────────────────────
  const exportJSON = () => {
    if (!active) return
    const payload = { ...active, exportedAt:new Date().toISOString(), exportVersion:'1.0', tool:'VRIO' }
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `VRIO_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); showToast('Analyse exportée')
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.name || !Array.isArray(data.resources)) throw new Error('Format invalide')
        const record = { ...data, id:uid(), importedAt:new Date().toISOString(),
          resources:(data.resources||[]).map(r => ({ ...r, id:uid(), outcome: getOutcome(r.valuable,r.rare,r.inimitable,r.organized) })) }
        const updated = [...analyses, record]
        setAnalyses(updated); persist(updated)
        setActiveId(record.id); setAiResult(record.aiResult||null)
        showToast(`"${record.name}" importée`)
      } catch { showToast('Fichier JSON invalide', 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalRes    = resources.length
  const durable     = resources.filter(r => r.outcome?.tier === 4).length
  const temporary   = resources.filter(r => r.outcome?.tier === 2 || r.outcome?.tier === 3).length
  const parity      = resources.filter(r => r.outcome?.tier === 1).length
  const vrioScore   = totalRes === 0 ? 0 : Math.round(
    resources.reduce((s,r) => {
      const yes = [r.valuable,r.rare,r.inimitable,r.organized].filter(x=>x===true).length
      return s + (yes/4)
    }, 0) / totalRes * 100
  )

  const visibleRes = resources.filter(r => {
    const catOk  = filterCat  === 'all' || r.category === filterCat
    const tierOk = filterTier === 'all' || String(r.outcome?.tier) === filterTier
    return catOk && tierOk
  })

  const liveOutcome = (resForm.valuable !== null || resForm.rare !== null)
    ? getOutcome(resForm.valuable, resForm.rare, resForm.inimitable, resForm.organized) : null

  // ── CSS variables string ───────────────────────────────────────────────────
  const cssVars = `
    --bg:${T.bg}; --s1:${T.s1}; --s2:${T.s2}; --s3:${T.s3};
    --tx:${T.tx}; --mu:${T.mu}; --mu2:${T.mu2};
    --b1:${T.b1}; --b2:${T.b2};
    --acc:${T.acc}; --acc2:${T.acc2};
  `

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); color:var(--tx); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes ping  { 75%,100%{transform:scale(1.6);opacity:0} }
        .fade-up { animation:fadeUp .3s ease both; }

        /* TOPBAR */
        .tb { height:54px; background:var(--s1); border-bottom:1px solid var(--b1); display:flex; align-items:center; padding:0 16px; gap:10px; position:sticky; top:0; z-index:200; }
        .back { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px; background:var(--s2); border:1px solid var(--b2); color:var(--mu2); font-family:'Geist Mono',monospace; font-size:10px; cursor:pointer; transition:all .15s; }
        .back:hover { color:var(--tx); border-color:var(--b2); }
        .tb-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .tb-proj  { font-size:10px; color:var(--mu); font-family:'Geist Mono',monospace; }
        .tb-right { margin-left:auto; display:flex; gap:6px; align-items:center; }
        .btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:.04em; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; }
        .btn:hover { color:var(--tx); border-color:var(--b2); }
        .btn.p   { background:var(--acc); border-color:var(--acc); color:#fff; font-weight:700; }
        .btn.p:hover { opacity:.88; }
        .btn.ai  { background:rgba(34,211,165,.08); border-color:rgba(34,211,165,.25); color:#22d3a5; }
        .btn.ai:hover { background:rgba(34,211,165,.15); }
        .btn.gen { background:rgba(167,139,250,.1); border-color:rgba(167,139,250,.3); color:#a78bfa; }
        .btn.gen:hover { background:rgba(167,139,250,.18); }
        .btn.va  { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.3); color:var(--acc2); }
        .btn:disabled { opacity:.35; cursor:not-allowed; }

        /* LAYOUT */
        .layout { display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 54px); overflow:hidden; }

        /* LEFT */
        .left { background:var(--s1); border-right:1px solid var(--b1); display:flex; flex-direction:column; overflow:hidden; }
        .ph { padding:13px 14px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .pl { font-size:9px; color:var(--mu); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .plist { flex:1; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:2px; }
        .aitem { padding:9px 11px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; position:relative; }
        .aitem:hover { background:var(--s2); }
        .aitem.on { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.22); }
        .aname { font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px; }
        .ameta { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; margin-top:2px; }
        .adel  { opacity:0; position:absolute; top:7px; right:8px; background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; padding:2px 4px; }
        .aitem:hover .adel { opacity:1; }
        .ai-badge { font-size:8px; padding:1px 5px; border-radius:3px; background:rgba(167,139,250,.15); color:#a78bfa; border:1px solid rgba(167,139,250,.3); font-family:'Geist Mono',monospace; font-weight:700; }
        .mode-toggle { display:flex; gap:2px; background:var(--s2); border:1px solid var(--b1); border-radius:6px; padding:2px; }
        .mode-btn { flex:1; padding:6px 8px; border-radius:4px; font-family:'Geist Mono',monospace; font-size:9px; cursor:pointer; border:none; background:none; color:var(--mu2); transition:all .15s; text-align:center; }
        .mode-btn.on { background:var(--s3); color:var(--tx); box-shadow:0 1px 4px rgba(0,0,0,.3); }
        .mode-btn.ai-m.on { color:#a78bfa; background:rgba(167,139,250,.12); }
        .gen-ta { width:100%; background:rgba(167,139,250,.05); border:1px solid rgba(167,139,250,.22); border-radius:6px; padding:9px; font-family:'Syne',sans-serif; font-size:11px; color:var(--tx); outline:none; resize:vertical; min-height:80px; transition:border-color .15s; }
        .gen-ta:focus { border-color:rgba(167,139,250,.5); }
        .gen-ta::placeholder { color:var(--mu); }
        .inp { width:100%; background:var(--bg); border:1px solid var(--b2); border-radius:5px; padding:7px 9px; font-family:'Syne',sans-serif; font-size:11px; color:var(--tx); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--acc); }
        .inp::placeholder { color:var(--mu); }
        textarea.inp { resize:vertical; }
        .flabel { font-size:9px; color:var(--mu); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:2px; display:block; }

        /* THEME PICKER */
        .theme-picker { position:absolute; top:44px; right:0; background:var(--s1); border:1px solid var(--b2); border-radius:10px; padding:8px; display:flex; gap:6px; flex-wrap:wrap; z-index:300; box-shadow:0 8px 24px rgba(0,0,0,.5); min-width:200px; }
        .theme-swatch { display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; padding:6px; border-radius:7px; border:1px solid transparent; transition:all .15s; }
        .theme-swatch:hover { background:var(--s2); }
        .theme-swatch.on { border-color:rgba(99,102,241,.4); background:rgba(99,102,241,.08); }
        .theme-dot { width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,.15); }
        .theme-name { font-size:9px; font-family:'Geist Mono',monospace; color:var(--mu2); }

        /* CENTER */
        .center { overflow-y:auto; display:flex; flex-direction:column; background:var(--bg); }

        /* GEN LOADING */
        .gen-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:500px; gap:22px; }
        .gen-orb { position:relative; width:80px; height:80px; }
        .gorb-r  { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(167,139,250,.2); animation:ping 1.4s ease infinite; }
        .gorb-r2 { position:absolute; inset:10px; border-radius:50%; border:2px solid rgba(167,139,250,.1); animation:ping 1.4s ease infinite; animation-delay:.4s; }
        .gorb-c  { position:absolute; inset:0; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(167,139,250,.08); border:2px solid rgba(167,139,250,.3); font-size:28px; }
        .gsteps  { max-width:300px; width:100%; display:flex; flex-direction:column; gap:5px; }
        .gstep   { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; transition:all .35s; border:1px solid transparent; }
        .gstep.a { background:rgba(167,139,250,.07); border-color:rgba(167,139,250,.22); }
        .gstep.d { opacity:.4; }
        .gstep.f { opacity:.18; }
        .gstep-d { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:10px; }
        .spinner-sm { width:12px; height:12px; border:2px solid rgba(255,255,255,.2); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }

        /* MAIN */
        .main { padding:20px; display:flex; flex-direction:column; gap:16px; }
        .stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:9px; }
        .stat-card { background:var(--s1); border:1px solid var(--b1); border-radius:9px; padding:13px 14px; }
        .stat-val  { font-size:24px; font-weight:800; font-family:'Geist Mono',monospace; line-height:1; }
        .stat-lbl  { font-size:9px; color:var(--mu); text-transform:uppercase; letter-spacing:.06em; margin-top:5px; font-family:'Geist Mono',monospace; }

        /* MATRIX TABLE */
        .matrix-wrap { background:var(--s1); border:1px solid var(--b1); border-radius:10px; overflow:hidden; }
        .matrix-head { padding:11px 18px; display:grid; grid-template-columns:2fr repeat(4,1fr) 1fr 72px; gap:8px; align-items:center; border-bottom:1px solid var(--b1); }
        .mh-col { display:flex; flex-direction:column; align-items:center; gap:3px; }
        .mh-letter { width:30px; height:30px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; font-family:'Geist Mono',monospace; }
        .mh-label  { font-size:9px; font-weight:700; font-family:'Geist Mono',monospace; letter-spacing:.04em; }
        .mh-q      { font-size:8px; color:var(--mu); text-align:center; line-height:1.4; max-width:88px; }
        .res-row   { padding:10px 18px; display:grid; grid-template-columns:2fr repeat(4,1fr) 1fr 72px; gap:8px; align-items:center; border-bottom:1px solid var(--b1); transition:background .15s; }
        .res-row:last-child { border-bottom:none; }
        .res-row:hover { background:var(--s2); }
        .res-nwrap { display:flex; align-items:center; gap:7px; min-width:0; }
        .res-cicon { font-size:13px; flex-shrink:0; }
        .res-name  { font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .res-clbl  { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; }
        .oc-chip   { padding:3px 9px; border-radius:5px; font-size:9px; font-weight:700; font-family:'Geist Mono',monospace; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; }
        .res-acts  { display:flex; gap:3px; justify-content:flex-end; }
        .icon-btn  { width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:11px; color:var(--mu2); transition:all .15s; }
        .icon-btn:hover { background:var(--s3); color:var(--tx); }
        .bool-btn  { width:26px; height:26px; border-radius:5px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; transition:all .15s; }

        /* FUNNEL */
        .funnel-wrap { display:flex; flex-direction:column; gap:7px; max-width:660px; margin:0 auto; width:100%; }
        .funnel-item { display:flex; align-items:center; gap:12px; }
        .funnel-bar  { flex:1; display:flex; justify-content:center; }
        .funnel-inner{ min-height:50px; border-radius:8px; padding:10px 16px; display:flex; align-items:center; gap:10px; transition:all .2s; }

        /* TABLE VIEW */
        .table-wrap { background:var(--s1); border:1px solid var(--b1); border-radius:10px; overflow:auto; }
        table { width:100%; border-collapse:collapse; }
        th { padding:9px 13px; text-align:left; font-size:9px; color:var(--mu); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; border-bottom:1px solid var(--b1); background:var(--s2); white-space:nowrap; }
        td { padding:9px 13px; border-bottom:1px solid var(--b1); vertical-align:middle; }
        tr:last-child td { border-bottom:none; }
        tr:hover td { background:var(--s2); cursor:pointer; }

        /* FILTERS */
        .filters { display:flex; gap:5px; flex-wrap:wrap; align-items:center; }
        .fchip { padding:4px 10px; border-radius:99px; font-size:10px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; white-space:nowrap; }
        .fchip.on { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.3); color:var(--acc2); }
        .fchip:hover:not(.on) { color:var(--tx); }
        .fsep { width:1px; height:16px; background:var(--b2); flex-shrink:0; }

        /* LEGEND */
        .legend { display:flex; gap:6px; flex-wrap:wrap; }
        .leg-i { display:flex; align-items:center; gap:4px; padding:3px 9px; border-radius:99px; font-size:9px; font-family:'Geist Mono',monospace; }

        /* MODAL */
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.82); z-index:300; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
        .modal   { background:var(--s1); border:1px solid var(--b2); border-radius:14px; padding:24px; width:100%; max-width:530px; max-height:92vh; overflow-y:auto; box-shadow:0 24px 60px rgba(0,0,0,.5); }
        .modal-title { font-family:'Instrument Serif',serif; font-size:19px; font-style:italic; margin-bottom:16px; }
        .fgroup { margin-bottom:12px; }
        .frow   { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .cat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; }
        .cat-opt { padding:7px 5px; border-radius:7px; border:1px solid var(--b2); background:var(--s2); cursor:pointer; text-align:center; transition:all .15s; }
        .cat-opt.on { border-color:rgba(99,102,241,.4); background:rgba(99,102,241,.1); }
        .cat-opt:hover:not(.on) { background:var(--s3); }
        .cat-ico { font-size:15px; }
        .cat-lbl { font-size:8px; color:var(--mu2); font-family:'Geist Mono',monospace; margin-top:2px; }
        .vrio-crit-list { display:flex; flex-direction:column; gap:9px; }
        .crit-row { background:var(--s2); border:1px solid var(--b1); border-radius:9px; padding:11px 13px; display:flex; align-items:flex-start; gap:10px; transition:border-color .15s; }
        .crit-row.y { border-color:rgba(34,211,165,.3); background:rgba(34,211,165,.03); }
        .crit-row.n { border-color:rgba(248,113,113,.3); background:rgba(248,113,113,.03); }
        .crit-badge { width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; font-family:'Geist Mono',monospace; flex-shrink:0; margin-top:1px; }
        .crit-label { font-size:11px; font-weight:700; margin-bottom:2px; }
        .crit-q     { font-size:10px; color:var(--mu2); line-height:1.5; }
        .bool-grp   { display:flex; gap:5px; margin-top:5px; }
        .bool-opt   { padding:4px 13px; border-radius:5px; border:1px solid var(--b2); background:var(--s3); color:var(--mu2); font-size:10px; font-family:'Geist Mono',monospace; cursor:pointer; transition:all .15s; }
        .bool-opt.y.on { background:rgba(34,211,165,.15); border-color:rgba(34,211,165,.4); color:#22d3a5; }
        .bool-opt.n.on { background:rgba(248,113,113,.15); border-color:rgba(248,113,113,.4); color:#f87171; }
        .bool-opt:hover:not(.on) { color:var(--tx); }
        .live-oc { padding:9px 13px; border-radius:7px; display:flex; align-items:center; gap:9px; font-size:11px; font-weight:700; transition:all .3s; margin-bottom:12px; }
        .m-actions { display:flex; gap:7px; margin-top:16px; }
        .m-save   { flex:1; padding:10px; border-radius:7px; cursor:pointer; background:var(--acc); border:none; color:#fff; font-family:'Syne',sans-serif; font-size:12px; font-weight:700; }
        .m-cancel { padding:10px 14px; border-radius:7px; cursor:pointer; background:var(--s2); border:1px solid var(--b2); color:var(--mu2); font-family:'Syne',sans-serif; font-size:12px; }

        /* AI PANEL */
        .ai-panel { position:fixed; right:0; top:54px; bottom:0; width:400px; background:var(--s1); border-left:1px solid var(--b1); z-index:150; display:flex; flex-direction:column; overflow:hidden; transform:translateX(100%); transition:transform .28s ease; }
        .ai-panel.open { transform:translateX(0); }
        .ai-ph { padding:14px 18px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .ai-tl { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .ai-body { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:13px; }
        .ai-st { font-size:9px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
        .ai-card { background:var(--s2); border:1px solid var(--b2); border-radius:8px; padding:13px; font-size:12px; color:var(--tx); line-height:1.7; }
        .ai-rc { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; }
        .ai-rname { font-size:11px; font-weight:700; margin-bottom:3px; }
        .ai-rtext { font-size:11px; color:var(--mu2); line-height:1.6; }
        .ai-ract  { font-size:10px; padding:3px 8px; border-radius:4px; font-family:'Geist Mono',monospace; display:inline-block; margin-top:4px; }
        .ai-pi    { display:flex; gap:9px; padding:7px 10px; background:var(--s2); border:1px solid var(--b1); border-radius:6px; }
        .ai-pnum  { font-family:'Geist Mono',monospace; font-size:9px; color:var(--mu); min-width:18px; padding-top:2px; }
        .spinner  { width:16px; height:16px; border:2px solid var(--b1); border-top-color:#22d3a5; border-radius:50%; animation:spin .7s linear infinite; }

        /* TOAST */
        .toast { position:fixed; bottom:20px; right:20px; z-index:999; background:var(--s2); border:1px solid var(--b2); border-radius:7px; padding:10px 16px; font-size:12px; display:flex; align-items:center; gap:7px; box-shadow:0 8px 28px rgba(0,0,0,.5); animation:fadeUp .2s ease; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info  { border-color:rgba(99,102,241,.25); }

        /* EMPTY */
        .empty-c { display:flex; align-items:center; justify-content:center; flex:1; min-height:400px; }

        @media(max-width:900px){ .layout{grid-template-columns:1fr;} .left{display:none;} .stats-row{grid-template-columns:repeat(3,1fr);} }
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport}/>

      <div style={{ minHeight:'100vh', background:T.bg, color:T.tx, '--bg':T.bg,'--s1':T.s1,'--s2':T.s2,'--s3':T.s3,'--tx':T.tx,'--mu':T.mu,'--mu2':T.mu2,'--b1':T.b1,'--b2':T.b2,'--acc':T.acc,'--acc2':T.acc2 }}>
        <style>{`:root { ${cssVars} }`}</style>

        {/* ── TOPBAR ── */}
        <header className="tb">
          <button className="back" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="tb-title">VRIO Matrix</div>
            {project && <div className="tb-proj">{project.name}</div>}
          </div>
          <div className="tb-right">
            {active && (
              <>
                <div style={{ display:'flex', gap:3 }}>
                  {[{id:'matrix',icon:'⊞'},{id:'funnel',icon:'◎'},{id:'table',icon:'≡'}].map(v => (
                    <button key={v.id} className={`btn ${viewMode===v.id?'va':''}`} style={{ padding:'5px 10px' }} onClick={() => setViewMode(v.id)}>{v.icon}</button>
                  ))}
                </div>
                <button className="btn" onClick={exportJSON}>↓ Export</button>
                <button className="btn ai" onClick={runAI} disabled={aiLoading || !resources.length}>
                  {aiLoading ? <><span className="spinner"/>Analyse…</> : '✦ Analyser'}
                </button>
              </>
            )}
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Import</button>
            {/* Theme picker */}
            <div style={{ position:'relative' }}>
              <button className="btn" onClick={() => setShowThemes(t => !t)} style={{ padding:'5px 10px' }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:T.acc, border:'1px solid rgba(255,255,255,.2)' }}/>
              </button>
              {showThemes && (
                <div className="theme-picker">
                  {Object.entries(THEMES).map(([key, th]) => (
                    <div key={key} className={`theme-swatch ${theme===key?'on':''}`} onClick={() => setThemeAndSave(key)}>
                      <div className="theme-dot" style={{ background:`linear-gradient(135deg, ${th.bg} 50%, ${th.acc})` }}/>
                      <span className="theme-name">{th.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="layout">

          {/* ── LEFT ── */}
          <aside className="left">
            <div className="ph"><span className="pl">Analyses ({analyses.length})</span></div>
            <div className="plist">
              {analyses.length === 0 && (
                <div style={{ padding:'28px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:32, opacity:.15, marginBottom:10 }}>◈</div>
                  <div style={{ fontSize:11, color:'var(--mu)' }}>Créez votre première analyse VRIO</div>
                </div>
              )}
              {analyses.map(a => {
                const dur = (a.resources||[]).filter(r => r.outcome?.tier===4).length
                return (
                  <div key={a.id} className={`aitem ${activeId===a.id?'on':''}`} onClick={() => selectAnalysis(a)}>
                    <button className="adel" onClick={e=>{e.stopPropagation();deleteAnalysis(a.id)}}>✕</button>
                    <div className="aname">
                      {a.name}
                      {a.generatedByAI && <span className="ai-badge">IA</span>}
                    </div>
                    <div className="ameta">{(a.resources||[]).length} res. · {dur} durable(s) · {new Date(a.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</div>
                  </div>
                )
              })}
            </div>

            {showForm ? (
              <div style={{ padding:10, borderTop:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:7 }}>
                <div className="mode-toggle">
                  <button className={`mode-btn ai-m ${formMode==='ai'?'on':''}`} onClick={() => setFormMode('ai')}>✦ IA Auto</button>
                  <button className={`mode-btn ${formMode==='manual'?'on':''}`} onClick={() => setFormMode('manual')}>✎ Manuel</button>
                </div>
                {formMode === 'ai' ? (
                  <>
                    <div>
                      <label className="flabel">Décrivez votre entreprise / projet</label>
                      <textarea className="gen-ta" rows={5} value={genDesc}
                        onChange={e => setGenDesc(e.target.value)}
                        placeholder="Ex: Startup SaaS B2B proposant une plateforme RH pour PME africaines. Équipe de 15 personnes. Algorithme propriétaire de matching de talents, partenariat exclusif avec 3 universités, marque reconnue sur 4 pays…"
                        autoFocus/>
                    </div>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn gen" style={{ flex:1, justifyContent:'center' }} onClick={generateAI} disabled={genLoading || !genDesc.trim()}>
                        {genLoading ? <><span className="spinner-sm"/>…</> : '✦ Générer VRIO'}
                      </button>
                      <button className="btn" onClick={() => { setShowForm(false); setGenDesc('') }}>✕</button>
                    </div>
                  </>
                ) : (
                  <>
                    <input className="inp" placeholder="Nom de l'analyse *" value={newAnalysis.name} onChange={e=>setNewAnalysis(p=>({...p,name:e.target.value}))} autoFocus onKeyDown={e=>e.key==='Enter'&&createManual()}/>
                    <textarea className="inp" rows={2} placeholder="Contexte, secteur…" value={newAnalysis.context} onChange={e=>setNewAnalysis(p=>({...p,context:e.target.value}))}/>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn p" style={{ flex:1, justifyContent:'center' }} onClick={createManual}>Créer</button>
                      <button className="btn" onClick={() => setShowForm(false)}>✕</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ padding:10, borderTop:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:5 }}>
                <button className="btn gen" style={{ justifyContent:'center' }} onClick={() => { setShowForm(true); setFormMode('ai') }}>✦ Générer avec l'IA</button>
                <button className="btn" style={{ justifyContent:'center' }} onClick={() => { setShowForm(true); setFormMode('manual') }}>✎ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* ── CENTER ── */}
          <main className="center">
            {genLoading ? (
              <div className="gen-loading fade-up">
                <div className="gen-orb"><div className="gorb-r"/><div className="gorb-r2"/><div className="gorb-c">◈</div></div>
                <div className="gsteps">
                  {GEN_STEPS.map((s,i) => (
                    <div key={i} className={`gstep ${i===genStep?'a':i<genStep?'d':'f'}`}>
                      <div className="gstep-d" style={{ background:i<genStep?'#22d3a5':i===genStep?'#a78bfa':'rgba(255,255,255,.07)' }}>
                        {i<genStep ? '✓' : i===genStep ? <div style={{ width:9,height:9,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/> : <div style={{ width:5,height:5,borderRadius:'50%',background:'rgba(255,255,255,.15)' }}/>}
                      </div>
                      <span style={{ fontSize:10,color:i===genStep?'#a78bfa':'rgba(255,255,255,.3)',fontFamily:'Geist Mono,monospace' }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace' }}>VRIO Framework · Barney 1991 · Claude</div>
              </div>
            ) : !active ? (
              <div className="empty-c">
                <div style={{ textAlign:'center', padding:'60px 40px' }} className="fade-up">
                  <div style={{ fontSize:52, opacity:.15, marginBottom:14 }}>◈</div>
                  <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic', marginBottom:8 }}>VRIO Matrix</div>
                  <div style={{ fontSize:12, color:'var(--mu)', lineHeight:1.7, maxWidth:320, margin:'0 auto 20px' }}>
                    Décrivez votre entreprise — l'IA identifie et évalue automatiquement vos ressources stratégiques selon le framework VRIO.
                  </div>
                  <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                    <button className="btn gen" onClick={() => { setShowForm(true); setFormMode('ai') }}>✦ Générer avec l'IA</button>
                    <button className="btn" onClick={() => { setShowForm(true); setFormMode('manual') }}>✎ Saisir manuellement</button>
                    <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="main fade-up">
                <div>
                  <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic' }}>{active.name}</div>
                  {active.context && <div style={{ fontSize:11, color:'var(--mu2)', marginTop:4, lineHeight:1.6 }}>{active.context}</div>}
                  {active.generatedByAI && <span style={{ fontSize:8,padding:'1px 6px',borderRadius:3,background:'rgba(167,139,250,.1)',color:'#a78bfa',border:'1px solid rgba(167,139,250,.25)',fontFamily:'Geist Mono,monospace',display:'inline-block',marginTop:5 }}>✦ Générée par IA · modifiable</span>}
                </div>

                {/* Stats */}
                <div className="stats-row">
                  {[
                    { val:totalRes,     lbl:'Ressources',       color:'var(--tx)' },
                    { val:durable,      lbl:'Avantage durable', color:'#22d3a5'   },
                    { val:temporary,    lbl:'Avantage temp.',   color:'#f59e0b'   },
                    { val:parity,       lbl:'Parité',           color:'#9896aa'   },
                    { val:`${vrioScore}%`, lbl:'Score VRIO',    color:vrioScore>=70?'#22d3a5':vrioScore>=40?'#f59e0b':'#f87171' },
                  ].map((s,i) => (
                    <div key={i} className="stat-card">
                      <div className="stat-val" style={{ color:s.color }}>{s.val}</div>
                      <div className="stat-lbl">{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="legend">
                  {[{tier:4,label:'Durable',color:'#22d3a5'},{tier:3,label:'Non exploité',color:'#818cf8'},{tier:2,label:'Temporaire',color:'#f59e0b'},{tier:1,label:'Parité',color:'#9896aa'},{tier:0,label:'Désavantage',color:'#f87171'}].map(l => (
                    <div key={l.tier} className="leg-i" style={{ background:l.color+'12', border:`1px solid ${l.color}25`, color:l.color }}>
                      <div style={{ width:5,height:5,borderRadius:'50%',background:l.color }}/>{l.label}
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="filters">
                  <button className={`fchip ${filterCat==='all'?'on':''}`} onClick={() => setFilterCat('all')}>Toutes</button>
                  {CATEGORIES.map(c => resources.some(r=>r.category===c.id) && (
                    <button key={c.id} className={`fchip ${filterCat===c.id?'on':''}`} onClick={() => setFilterCat(c.id)}>{c.icon} {c.label}</button>
                  ))}
                  <div className="fsep"/>
                  <button className={`fchip ${filterTier==='all'?'on':''}`} onClick={() => setFilterTier('all')}>Tous niveaux</button>
                  {[4,3,2,1,0].map(t => {
                    const o = getOutcome(t>=1,t>=2,t>=3,t>=4)
                    return resources.some(r=>r.outcome?.tier===t) && (
                      <button key={t} className={`fchip ${filterTier===String(t)?'on':''}`}
                        style={filterTier===String(t)?{background:o.bg,borderColor:o.border,color:o.color}:{}}
                        onClick={() => setFilterTier(String(t))}>{o.icon} {o.short}</button>
                    )
                  })}
                </div>

                {/* ── Matrix view ── */}
                {viewMode === 'matrix' && (
                  <div className="matrix-wrap">
                    <div className="matrix-head">
                      <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'.06em' }}>Ressource / Capacité</div>
                      {CRITERIA.map(c => (
                        <div key={c.id} className="mh-col">
                          <div className="mh-letter" style={{ background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>{c.letter}</div>
                          <span className="mh-label" style={{ color:c.color }}>{c.label}</span>
                          <span className="mh-q">{c.question.slice(0,48)}…</span>
                        </div>
                      ))}
                      <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', textAlign:'center', textTransform:'uppercase', letterSpacing:'.05em' }}>Résultat</div>
                      <div style={{ display:'flex', justifyContent:'flex-end' }}>
                        <button className="btn p" style={{ padding:'4px 9px', fontSize:9 }} onClick={() => { setEditRes(null); setResForm(EMPTY_RESOURCE); setShowResForm(true) }}>+ Ajouter</button>
                      </div>
                    </div>

                    {visibleRes.length === 0 && (
                      <div style={{ padding:'40px 20px', textAlign:'center' }}>
                        <div style={{ fontSize:28, opacity:.15, marginBottom:10 }}>◈</div>
                        <div style={{ fontSize:12, color:'var(--mu)' }}>{totalRes===0 ? 'Ajoutez vos premières ressources stratégiques' : 'Aucune ressource pour ces filtres'}</div>
                      </div>
                    )}

                    {visibleRes.map(res => {
                      const cat     = CATEGORIES.find(c => c.id === res.category)
                      const outcome = res.outcome || getOutcome(res.valuable, res.rare, res.inimitable, res.organized)
                      return (
                        <div key={res.id} className="res-row">
                          <div className="res-nwrap">
                            <span className="res-cicon">{cat?.icon||'◌'}</span>
                            <div style={{ minWidth:0 }}>
                              <div className="res-name">{res.name}</div>
                              <div className="res-clbl">{cat?.label}</div>
                            </div>
                          </div>
                          {CRITERIA.map(c => (
                            <div key={c.id} style={{ display:'flex', justifyContent:'center' }}>
                              <button className="bool-btn" onClick={() => toggleCriterion(res.id, c.id)} style={{
                                background: res[c.id]===null ? 'var(--s3)' : res[c.id] ? 'rgba(34,211,165,.15)' : 'rgba(248,113,113,.15)',
                                color:      res[c.id]===null ? 'var(--mu)'   : res[c.id] ? '#22d3a5'             : '#f87171',
                                outline:    res[c.id]===null ? 'none'        : `1.5px solid ${res[c.id] ? 'rgba(34,211,165,.4)' : 'rgba(248,113,113,.4)'}`,
                              }}>
                                {res[c.id]===null ? '?' : res[c.id] ? '✓' : '✕'}
                              </button>
                            </div>
                          ))}
                          <div>
                            <span className="oc-chip" style={{ background:outcome.bg, color:outcome.color, border:`1px solid ${outcome.border}` }}>
                              {outcome.icon} {outcome.short}
                            </span>
                          </div>
                          <div className="res-acts">
                            <button className="icon-btn" onClick={() => startEdit(res)}>✎</button>
                            <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteResource(res.id)}>✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Funnel view ── */}
                {viewMode === 'funnel' && (
                  <div>
                    <div style={{ fontFamily:'Instrument Serif,serif', fontSize:17, fontStyle:'italic', marginBottom:14 }}>Entonnoir VRIO — {active.name}</div>
                    {totalRes === 0 ? (
                      <div style={{ textAlign:'center', padding:'48px', fontSize:12, color:'var(--mu)' }}>Ajoutez des ressources pour visualiser l'entonnoir</div>
                    ) : (
                      <div className="funnel-wrap">
                        {[
                          { tier:4, label:'Avantage Durable',      criteria:'V+R+I+O', color:'#22d3a5' },
                          { tier:3, label:'Avantage Non Exploité',  criteria:'V+R+I',   color:'#818cf8' },
                          { tier:2, label:'Avantage Temporaire',    criteria:'V+R',     color:'#f59e0b' },
                          { tier:1, label:'Parité Compétitive',     criteria:'V',       color:'#9896aa' },
                          { tier:0, label:'Désavantage',            criteria:'—',       color:'#f87171' },
                        ].map((t, i) => {
                          const items = resources.filter(r => r.outcome?.tier === t.tier)
                          const w = 100 - i * 8
                          return (
                            <div key={t.tier} className="funnel-item">
                              <div className="funnel-bar">
                                <div className="funnel-inner" style={{ width:`${w}%`, background:`${t.color}10`, border:`1px solid ${t.color}28` }}>
                                  <div style={{ minWidth:130 }}>
                                    <div style={{ fontSize:11, fontWeight:700, color:t.color }}>{t.label}</div>
                                    <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>{t.criteria}</div>
                                  </div>
                                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, flex:1 }}>
                                    {items.length === 0
                                      ? <span style={{ fontSize:10, color:'var(--mu)', fontStyle:'italic' }}>Aucune</span>
                                      : items.map(r => {
                                          const cat = CATEGORIES.find(c => c.id === r.category)
                                          return (
                                            <span key={r.id} onClick={() => startEdit(r)} style={{ padding:'2px 9px', borderRadius:99, fontSize:10, cursor:'pointer', background:`${t.color}18`, color:t.color, border:`1px solid ${t.color}30`, fontWeight:600 }}>
                                              {cat?.icon} {r.name}
                                            </span>
                                          )
                                        })
                                    }
                                  </div>
                                  <span style={{ fontSize:16, fontWeight:800, color:`${t.color}88`, fontFamily:'Geist Mono,monospace', marginLeft:'auto', flexShrink:0 }}>{items.length}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Table view ── */}
                {viewMode === 'table' && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {['Ressource','Cat.','V','R','I','O','Résultat','Notes',''].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRes.map(res => {
                          const cat     = CATEGORIES.find(c => c.id === res.category)
                          const outcome = res.outcome || getOutcome(res.valuable, res.rare, res.inimitable, res.organized)
                          return (
                            <tr key={res.id} onClick={() => startEdit(res)}>
                              <td style={{ fontWeight:600, fontSize:12 }}>{res.name}</td>
                              <td style={{ fontSize:11, color:'var(--mu2)', fontFamily:'Geist Mono,monospace' }}>{cat?.icon} {cat?.label}</td>
                              {CRITERIA.map(c => (
                                <td key={c.id} style={{ textAlign:'center', fontWeight:700, fontSize:12, color:res[c.id]===null?'var(--mu)':res[c.id]?'#22d3a5':'#f87171' }}>
                                  {res[c.id]===null?'?':res[c.id]?'✓':'✕'}
                                </td>
                              ))}
                              <td><span className="oc-chip" style={{ background:outcome.bg, color:outcome.color, border:`1px solid ${outcome.border}` }}>{outcome.icon} {outcome.short}</span></td>
                              <td style={{ fontSize:10, color:'var(--mu2)', maxWidth:140 }}>{res.notes?.slice(0,50)}{res.notes?.length>50?'…':''}</td>
                              <td><button className="icon-btn" style={{ color:'#f87171' }} onClick={e=>{e.stopPropagation();deleteResource(res.id)}}>✕</button></td>
                            </tr>
                          )
                        })}
                        {visibleRes.length === 0 && (
                          <tr><td colSpan={9} style={{ padding:'36px', textAlign:'center', color:'var(--mu)', fontStyle:'italic', fontSize:12 }}>
                            {totalRes===0 ? 'Aucune ressource' : 'Aucun résultat pour ces filtres'}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* ── RESOURCE FORM MODAL ── */}
        {showResForm && (
          <div className="overlay" onClick={() => { setShowResForm(false); setEditRes(null) }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{editRes ? `Modifier "${editRes.name}"` : 'Nouvelle ressource'}</div>
              <div className="fgroup">
                <label className="flabel">Nom *</label>
                <input className="inp" placeholder="Ex: Algorithme propriétaire de matching" value={resForm.name} onChange={e=>setResForm(p=>({...p,name:e.target.value}))} autoFocus/>
              </div>
              <div className="fgroup">
                <label className="flabel">Description</label>
                <textarea className="inp" rows={2} placeholder="Rôle stratégique de cette ressource…" value={resForm.description} onChange={e=>setResForm(p=>({...p,description:e.target.value}))}/>
              </div>
              <div className="fgroup">
                <label className="flabel">Catégorie</label>
                <div className="cat-grid">
                  {CATEGORIES.map(c => (
                    <div key={c.id} className={`cat-opt ${resForm.category===c.id?'on':''}`} onClick={() => setResForm(p=>({...p,category:c.id}))}>
                      <div className="cat-ico">{c.icon}</div>
                      <div className="cat-lbl" style={{ color:resForm.category===c.id?'var(--acc2)':'var(--mu2)' }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="fgroup">
                <label className="flabel">Évaluation VRIO</label>
                <div className="vrio-crit-list">
                  {CRITERIA.map(c => {
                    const val = resForm[c.id]
                    return (
                      <div key={c.id} className={`crit-row ${val===true?'y':val===false?'n':''}`}>
                        <div className="crit-badge" style={{ background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>{c.letter}</div>
                        <div style={{ flex:1 }}>
                          <div className="crit-label" style={{ color:c.color }}>{c.label}</div>
                          <div className="crit-q">{c.question}</div>
                          <div className="bool-grp">
                            <button className={`bool-opt y ${val===true?'on':''}`} onClick={() => setResForm(p=>({...p,[c.id]:true}))}>✓ Oui</button>
                            <button className={`bool-opt n ${val===false?'on':''}`} onClick={() => setResForm(p=>({...p,[c.id]:false}))}>✕ Non</button>
                            <button className={`bool-opt ${val===null?'on':''}`} onClick={() => setResForm(p=>({...p,[c.id]:null}))}>? NSP</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {liveOutcome && (
                <div className="live-oc" style={{ background:liveOutcome.bg, border:`1px solid ${liveOutcome.border}`, color:liveOutcome.color }}>
                  <span style={{ fontSize:18 }}>{liveOutcome.icon}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700 }}>{liveOutcome.label}</div>
                    <div style={{ fontSize:9, opacity:.6, fontFamily:'Geist Mono,monospace' }}>Résultat calculé en temps réel</div>
                  </div>
                </div>
              )}
              <div className="fgroup">
                <label className="flabel">Notes / Justification</label>
                <textarea className="inp" rows={2} placeholder="Sources, contexte concurrentiel…" value={resForm.notes} onChange={e=>setResForm(p=>({...p,notes:e.target.value}))}/>
              </div>
              <div className="m-actions">
                <button className="m-cancel" onClick={() => { setShowResForm(false); setEditRes(null) }}>Annuler</button>
                <button className="m-save" onClick={saveResource}>{editRes ? 'Mettre à jour' : 'Ajouter la ressource'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── AI PANEL ── */}
        <div className={`ai-panel ${showAiPanel?'open':''}`}>
          <div className="ai-ph">
            <span className="ai-tl">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-body">
            {aiLoading && (
              <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--mu2)', fontSize:12 }}>
                <span className="spinner"/>Analyse VRIO en cours…
              </div>
            )}

            {!aiLoading && aiResult && (
              <>
                {aiResult.synthese && (
                  <div><div className="ai-st">Synthèse stratégique</div><div className="ai-card">{aiResult.synthese}</div></div>
                )}

                {aiResult.ressources?.length > 0 && (
                  <div>
                    <div className="ai-st">Analyse par ressource</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      {aiResult.ressources.map((r,i) => {
                        const o = getOutcome(r.tier>=1,r.tier>=2,r.tier>=3,r.tier>=4)
                        return (
                          <div key={i} className="ai-rc" style={{ borderColor:o.border }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                              <span style={{ fontSize:13 }}>{o.icon}</span>
                              <span className="ai-rname" style={{ color:o.color }}>{r.nom}</span>
                              <span style={{ marginLeft:'auto', fontSize:9, fontFamily:'Geist Mono,monospace', color:o.color, background:o.bg, padding:'1px 7px', borderRadius:3, border:`1px solid ${o.border}` }}>{o.short}</span>
                            </div>
                            <div className="ai-rtext">{r.analyse}</div>
                            {r.action && <span className="ai-ract" style={{ background:o.bg, color:o.color, border:`1px solid ${o.border}` }}>→ {r.action}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {aiResult.avantages_cles?.length > 0 && (
                  <div>
                    <div className="ai-st" style={{ color:'#22d3a5' }}>★ Avantages concurrentiels</div>
                    {aiResult.avantages_cles.map((a,i) => (
                      <div key={i} style={{ padding:'7px 11px', marginBottom:5, background:'rgba(34,211,165,.05)', border:'1px solid rgba(34,211,165,.2)', borderRadius:6, fontSize:11, lineHeight:1.6 }}>
                        <span style={{ color:'#22d3a5', marginRight:5 }}>★</span>{a}
                      </div>
                    ))}
                  </div>
                )}

                {aiResult.vulnerabilites?.length > 0 && (
                  <div>
                    <div className="ai-st" style={{ color:'#f87171' }}>⚠ Vulnérabilités</div>
                    {aiResult.vulnerabilites.map((v,i) => (
                      <div key={i} style={{ padding:'7px 11px', marginBottom:5, background:'rgba(248,113,113,.05)', border:'1px solid rgba(248,113,113,.2)', borderRadius:6, fontSize:11, lineHeight:1.6 }}>
                        <span style={{ color:'#f87171', marginRight:5 }}>⚠</span>{v}
                      </div>
                    ))}
                  </div>
                )}

                {aiResult.priorites?.length > 0 && (
                  <div>
                    <div className="ai-st">Recommandations stratégiques</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {aiResult.priorites.map((p,i) => (
                        <div key={i} className="ai-pi">
                          <span className="ai-pnum">#{i+1}</span>
                          <span style={{ fontSize:11, color:'var(--tx)', lineHeight:1.6 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.conclusion && (
                  <div><div className="ai-st">Verdict</div><div className="ai-card" style={{ fontStyle:'italic', color:'var(--mu2)' }}>{aiResult.conclusion}</div></div>
                )}

                {resources.length > 0 && (
                  <button className="btn ai" style={{ width:'100%', justifyContent:'center' }} onClick={runAI}>↺ Relancer l'analyse</button>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div style={{ padding:'40px 16px', textAlign:'center' }}>
                <div style={{ fontSize:28, opacity:.15, marginBottom:10 }}>✦</div>
                <div style={{ fontSize:11, color:'var(--mu)', lineHeight:1.7 }}>Cliquez sur "Analyser" pour obtenir un diagnostic complet de vos avantages concurrentiels.</div>
              </div>
            )}
          </div>
        </div>

        {/* ── TOAST ── */}
        {toast && <div className={`toast ${toast.type||''}`}>{toast.type==='error'?'✕':'✓'} {toast.msg}</div>}
      </div>
    </>
  )
}