'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// CVP sections metadata
const SECTIONS_META = {
  // Customer Profile (right — circle)
  customer_jobs:     { label:'Customer Jobs',    fr:'Tâches Clients',           icon:'◎', color:'#60a5fa', bg:'rgba(96,165,250,.1)',  side:'customer', desc:'Ce que le client cherche à accomplir' },
  pains:             { label:'Pains',            fr:'Douleurs',                  icon:'⚡', color:'#f87171', bg:'rgba(248,113,113,.1)', side:'customer', desc:'Obstacles, risques, frustrations' },
  gains:             { label:'Gains',            fr:'Bénéfices Désirés',         icon:'★', color:'#34d399', bg:'rgba(52,211,153,.1)',  side:'customer', desc:'Résultats et bénéfices souhaités' },
  // Value Map (left — square)
  products_services: { label:'Products & Services', fr:'Produits & Services',   icon:'⬡', color:'#f59e0b', bg:'rgba(245,158,11,.1)',  side:'value',    desc:'Ce que vous proposez' },
  pain_relievers:    { label:'Pain Relievers',   fr:'Analgésiques',              icon:'✦', color:'#f87171', bg:'rgba(248,113,113,.1)', side:'value',    desc:'Comment vous soulagez les douleurs' },
  gain_creators:     { label:'Gain Creators',    fr:'Créateurs de Gains',        icon:'◈', color:'#34d399', bg:'rgba(52,211,153,.1)',  side:'value',    desc:'Comment vous créez les bénéfices' },
}

const PRIORITY_META = {
  high:   { label:'Haute',   color:'#f87171', dot:'🔴' },
  medium: { label:'Moyenne', color:'#f59e0b', dot:'🟡' },
  low:    { label:'Faible',  color:'#34d399', dot:'🟢' },
}

const THEMES = {
  dark:   { name:'Dark',    bg:'#08080e', s1:'#0f0f18', s2:'#161622', s3:'#1c1c2e', tx:'#eeedf8', mu:'#5e5c78', mu2:'#9492b0', b1:'rgba(255,255,255,.055)', b2:'rgba(255,255,255,.10)', acc:'#6366f1', acc2:'#818cf8' },
  slate:  { name:'Slate',   bg:'#0d1117', s1:'#161b22', s2:'#21262d', s3:'#30363d', tx:'#e6edf3', mu:'#6e7681', mu2:'#8b949e', b1:'rgba(240,246,252,.07)',  b2:'rgba(240,246,252,.12)', acc:'#58a6ff', acc2:'#79c0ff' },
  forest: { name:'Forest',  bg:'#0d1409', s1:'#141d0f', s2:'#1a2614', s3:'#1f2e17', tx:'#d4e8c2', mu:'#5a7040', mu2:'#8aac6a', b1:'rgba(144,238,144,.07)',  b2:'rgba(144,238,144,.12)', acc:'#56d364', acc2:'#7ee787' },
  ocean:  { name:'Ocean',   bg:'#020a18', s1:'#0a1628', s2:'#0f1e36', s3:'#142644', tx:'#cae8ff', mu:'#3d6a8c', mu2:'#6a9fbc', b1:'rgba(56,139,253,.07)',   b2:'rgba(56,139,253,.12)',  acc:'#388bfd', acc2:'#79c0ff' },
  rose:   { name:'Rose',    bg:'#120009', s1:'#1e000f', s2:'#28001a', s3:'#330020', tx:'#ffd6e7', mu:'#7a2d4f', mu2:'#b05878', b1:'rgba(248,113,182,.07)',  b2:'rgba(248,113,182,.12)', acc:'#f472b6', acc2:'#f9a8d4' },
  amber:  { name:'Amber',   bg:'#100900', s1:'#1a1000', s2:'#241600', s3:'#2e1c00', tx:'#fef3c7', mu:'#786310', mu2:'#b08a20', b1:'rgba(245,158,11,.07)',   b2:'rgba(245,158,11,.12)',  acc:'#f59e0b', acc2:'#fbbf24' },
}

const GEN_STEPS = [
  'Analyse du contexte et du marché…',
  'Construction du profil client…',
  'Identification des douleurs et gains…',
  'Cartographie de la proposition de valeur…',
  'Calcul du fit et des recommandations…',
]

const EMPTY_ITEM = { text:'', priority:'medium', importance:3, notes:'' }
const DEFAULT_CANVAS = () => ({
  customer_jobs:[], pains:[], gains:[],
  products_services:[], pain_relievers:[], gain_creators:[],
})

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function CVPPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,     setProject]     = useState(null)
  const [canvases,    setCanvases]    = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [formMode,    setFormMode]    = useState('ai')
  const [genDesc,     setGenDesc]     = useState('')
  const [genLoading,  setGenLoading]  = useState(false)
  const [genStep,     setGenStep]     = useState(0)
  const [manName,     setManName]     = useState('')
  const [manContext,  setManContext]  = useState('')
  const [manSegment,  setManSegment]  = useState('')

  // Editor state
  const [activeSection, setActiveSection] = useState('customer_jobs')
  const [editItem,      setEditItem]      = useState(null)   // index | null
  const [itemForm,      setItemForm]      = useState(EMPTY_ITEM)
  const [addingTo,      setAddingTo]      = useState(null)   // section key | null

  // AI analysis
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)

  // UI
  const [theme,       setTheme]       = useState('dark')
  const [showThemes,  setShowThemes]  = useState(false)
  const [viewMode,    setViewMode]    = useState('canvas')   // 'canvas' | 'list'
  const [toast,       setToast]       = useState(null)

  const T = THEMES[theme] || THEMES.dark

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects||[]).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.CVP_Customer || []
        setCanvases(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id); setAiResult(last.aiResult || null)
        }
      }
      const saved = localStorage.getItem('cvp_theme')
      if (saved && THEMES[saved]) setTheme(saved)
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects||[]).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools||{}), CVP_Customer: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type='success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const setThemeAndSave = (t) => {
    setTheme(t); localStorage.setItem('cvp_theme', t); setShowThemes(false)
  }

  const active  = canvases.find(c => c.id === activeId) || null
  const canvas  = active?.canvas || DEFAULT_CANVAS()

  const updateActive = useCallback((patch) => {
    setCanvases(prev => {
      const updated = prev.map(c => c.id === activeId ? { ...c, ...patch } : c)
      setTimeout(() => {
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (!raw) return
          const data = JSON.parse(raw)
          data.projects = (data.projects||[]).map(p =>
            p.id !== projectId ? p : { ...p, tools: { ...(p.tools||{}), CVP_Customer: updated } }
          )
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        } catch {}
      }, 0)
      return updated
    })
  }, [activeId, projectId])

  // ── Canvas CRUD ──────────────────────────────────────────────────────────────
  const selectCanvas = (c) => {
    setActiveId(c.id); setAiResult(c.aiResult || null); setShowForm(false)
  }

  const deleteCanvas = (id) => {
    const updated = canvases.filter(c => c.id !== id)
    setCanvases(updated); persist(updated)
    if (activeId === id) setActiveId(updated[updated.length-1]?.id || null)
    showToast('Canvas supprimé', 'info')
  }

  const createManual = () => {
    if (!manName.trim()) return
    const record = {
      id: uid(), name: manName.trim(), context: manContext.trim(), segment: manSegment.trim(),
      createdAt: new Date().toISOString(), canvas: DEFAULT_CANVAS(), aiResult: null, generatedByAI: false,
    }
    const updated = [...canvases, record]
    setCanvases(updated); persist(updated); setActiveId(record.id)
    setShowForm(false); setManName(''); setManContext(''); setManSegment('')
    showToast(`"${record.name}" créé`)
  }

  // ── AI GENERATION (Mode 1) ───────────────────────────────────────────────────
  const generateAI = async () => {
    if (!genDesc.trim()) return
    setGenLoading(true); setGenStep(0)
    let s = 0
    const iv = setInterval(() => { s = Math.min(s+1, GEN_STEPS.length-1); setGenStep(s) }, 1700)
    try {
      const res = await fetch('/api/generer-management/generer-vp-auto', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ description:genDesc, projectName:project?.name||'', projectTag:project?.tag||'' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const { result } = data

      const newId = uid()
      const record = {
        id: newId, name: result.canvasName || 'CVP IA',
        context: result.context || '', segment: result.segment || '',
        createdAt: new Date().toISOString(), generatedByAI: true,
        canvas: result.canvas,
        aiResult: {
          fit_score: result.fit_score, fit_label: result.fit_label || '',
          synthese: result.synthese, forces: result.forces || [],
          gaps: result.gaps || [], recommandations: result.recommandations || [],
          differentiateurs: result.differentiateurs || [], conclusion: result.conclusion,
        },
      }
      const updated = [...canvases, record]
      setCanvases(updated); persist(updated)
      setActiveId(newId); setAiResult(record.aiResult)
      setShowAiPanel(true); setShowForm(false); setGenDesc('')
      showToast(`✦ CVP généré — ${Object.values(result.canvas).reduce((s,a)=>s+a.length,0)} éléments`)
    } catch (err) { showToast(err.message, 'error') }
    finally { clearInterval(iv); setGenLoading(false) }
  }

  // ── AI ANALYSIS (Mode 2) ────────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (!active) return
    const total = Object.values(canvas).reduce((s,a)=>s+a.length, 0)
    if (total === 0) { showToast('Ajoutez des éléments d\'abord', 'error'); return }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-vp-analyse', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ canvasName:active.name, context:active.context, segment:active.segment, canvas, projectName:project?.name||'', projectTag:project?.tag||'' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiResult(data.result); updateActive({ aiResult: data.result })
      showToast('Analyse générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── Item CRUD ────────────────────────────────────────────────────────────────
  const saveItem = (sectionKey) => {
    if (!itemForm.text.trim()) return
    const item = { id:uid(), ...itemForm, text: itemForm.text.trim() }
    const items = editItem !== null
      ? (canvas[sectionKey]||[]).map((it,i) => i===editItem ? item : it)
      : [...(canvas[sectionKey]||[]), item]
    updateActive({ canvas: { ...canvas, [sectionKey]: items } })
    setAddingTo(null); setEditItem(null); setItemForm(EMPTY_ITEM)
    showToast(editItem !== null ? 'Élément mis à jour' : 'Élément ajouté')
  }

  const deleteItem = (sectionKey, idx) => {
    const items = (canvas[sectionKey]||[]).filter((_,i) => i !== idx)
    updateActive({ canvas: { ...canvas, [sectionKey]: items } })
  }

  const startEdit = (sectionKey, idx, item) => {
    setActiveSection(sectionKey); setEditItem(idx); setAddingTo(sectionKey)
    setItemForm({ text:item.text, priority:item.priority||'medium', importance:item.importance||3, notes:item.notes||'' })
  }

  // ── EXPORT ───────────────────────────────────────────────────────────────────
  const exportJSON = () => {
    if (!active) return
    const payload = { ...active, exportedAt:new Date().toISOString(), exportVersion:'1.0', tool:'CVP_Customer' }
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `CVP_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); showToast('Exporté en JSON')
  }

  const exportCSV = () => {
    if (!active) return
    const rows = [['Section','Côté','Élément','Priorité','Importance','Notes']]
    Object.entries(canvas).forEach(([key, items]) => {
      const meta = SECTIONS_META[key]
      ;(items||[]).forEach(item => {
        rows.push([meta.fr, meta.side==='customer'?'Profil Client':'Carte Valeur', item.text, item.priority||'medium', item.importance||3, item.notes||''])
      })
    })
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `CVP_${active.name.replace(/\s+/g,'_')}.csv`
    a.click(); showToast('Exporté en CSV')
  }

  const exportWord = () => {
    if (!active) return
    const priorityLabel = p => ({ high:'Haute', medium:'Moyenne', low:'Faible' }[p] || p)
    const sectionHTML = (key) => {
      const meta  = SECTIONS_META[key]
      const items = canvas[key] || []
      if (!items.length) return ''
      return `
        <h3 style="color:${meta.color};margin:16px 0 8px;font-size:13pt;">${meta.icon} ${meta.fr}</h3>
        <p style="color:#666;font-size:9pt;margin:0 0 8px;">${meta.desc}</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr style="background:#f5f5f5;">
            <th style="border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:10pt;">Élément</th>
            <th style="border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:10pt;width:80px;">Priorité</th>
            <th style="border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:10pt;width:80px;">Impact</th>
            <th style="border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:10pt;">Notes</th>
          </tr>
          ${items.map(it => `
          <tr>
            <td style="border:1px solid #ddd;padding:6px 10px;font-size:10pt;">${it.text}</td>
            <td style="border:1px solid #ddd;padding:6px 10px;font-size:10pt;">${priorityLabel(it.priority)}</td>
            <td style="border:1px solid #ddd;padding:6px 10px;font-size:10pt;text-align:center;">${it.importance||3}/5</td>
            <td style="border:1px solid #ddd;padding:6px 10px;font-size:10pt;color:#666;">${it.notes||''}</td>
          </tr>`).join('')}
        </table>`
    }

    const fitScore = aiResult?.fit_score
    const html = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
<meta charset="UTF-8">
<title>${active.name}</title>
<style>
  body { font-family: Calibri, sans-serif; font-size:11pt; color:#1a1a2e; margin:2cm; }
  h1 { font-size:22pt; color:#1a1a2e; margin-bottom:6px; }
  h2 { font-size:15pt; color:#333; margin:24px 0 10px; border-bottom:2px solid #eee; padding-bottom:6px; }
  .meta { color:#666; font-size:10pt; margin-bottom:20px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:4px; font-size:9pt; font-weight:bold; }
  .fit-box { background:#f8f8f8; border:1px solid #ddd; border-radius:8px; padding:16px 20px; margin-bottom:24px; }
  .section-box { margin-bottom:24px; }
  .force { background:#e8f5e9; border-left:4px solid #34d399; padding:6px 12px; margin-bottom:8px; font-size:10pt; }
  .gap   { background:#fff3e0; border-left:4px solid #f59e0b; padding:6px 12px; margin-bottom:8px; font-size:10pt; }
  .reco  { background:#e3f2fd; border-left:4px solid #60a5fa; padding:6px 12px; margin-bottom:8px; font-size:10pt; }
</style>
</head>
<body>
<h1>Customer Value Proposition</h1>
<div class="meta">
  <strong>${active.name}</strong>${active.segment ? ` · Segment : ${active.segment}` : ''}${active.context ? ` · ${active.context}` : ''}<br/>
  Généré le ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}
</div>

${fitScore ? `
<div class="fit-box">
  <strong>Score de Fit Valeur/Client : ${fitScore}/100</strong>${aiResult.fit_label ? ` — ${aiResult.fit_label}` : ''}<br/>
  ${aiResult.synthese ? `<p style="margin:8px 0 0;color:#444;font-size:10pt;">${aiResult.synthese}</p>` : ''}
</div>` : ''}

<h2>👤 Profil Client</h2>
${sectionHTML('customer_jobs')}
${sectionHTML('pains')}
${sectionHTML('gains')}

<h2>💎 Carte de Valeur</h2>
${sectionHTML('products_services')}
${sectionHTML('pain_relievers')}
${sectionHTML('gain_creators')}

${aiResult ? `
<h2>📊 Analyse Stratégique</h2>

${aiResult.forces?.length ? `
<h3 style="color:#34d399;margin:14px 0 8px;">✓ Forces</h3>
${aiResult.forces.map(f => `<div class="force">${f}</div>`).join('')}` : ''}

${aiResult.gaps?.length ? `
<h3 style="color:#f59e0b;margin:14px 0 8px;">⚠ Gaps identifiés</h3>
${aiResult.gaps.map(g => `<div class="gap"><strong>${g.impact?.toUpperCase()||''}${g.type?' · '+g.type:''}</strong> — ${g.description||g}</div>`).join('')}` : ''}

${aiResult.recommandations?.length ? `
<h3 style="color:#60a5fa;margin:14px 0 8px;">→ Recommandations</h3>
${aiResult.recommandations.map((r,i) => {
  const text = typeof r === 'string' ? r : `[${r.priorite?.toUpperCase()||''}] ${r.action} — ${r.rationale||''}`
  return `<div class="reco"><strong>#${i+1}</strong> ${text}</div>`
}).join('')}` : ''}

${aiResult.conclusion ? `<p style="font-style:italic;color:#555;margin-top:20px;border-top:1px solid #eee;padding-top:16px;">${aiResult.conclusion}</p>` : ''}
` : ''}

</body>
</html>`

    const blob = new Blob([html], { type:'application/msword' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `CVP_${active.name.replace(/\s+/g,'_')}.doc`
    a.click(); showToast('Exporté en Word (.doc)')
  }

  // ── IMPORT ────────────────────────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.name || !data.canvas) throw new Error('Format invalide')
        const record = {
          ...data, id:uid(), importedAt:new Date().toISOString(),
          canvas: {
            customer_jobs:     (data.canvas.customer_jobs||[]).map(i=>({...i,id:uid()})),
            pains:             (data.canvas.pains||[]).map(i=>({...i,id:uid()})),
            gains:             (data.canvas.gains||[]).map(i=>({...i,id:uid()})),
            products_services: (data.canvas.products_services||[]).map(i=>({...i,id:uid()})),
            pain_relievers:    (data.canvas.pain_relievers||[]).map(i=>({...i,id:uid()})),
            gain_creators:     (data.canvas.gain_creators||[]).map(i=>({...i,id:uid()})),
          },
        }
        const updated = [...canvases, record]
        setCanvases(updated); persist(updated)
        setActiveId(record.id); setAiResult(record.aiResult||null)
        showToast(`"${record.name}" importé`)
      } catch { showToast('Fichier JSON invalide', 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  // ── Stats helpers ─────────────────────────────────────────────────────────────
  const totalItems = Object.values(canvas).reduce((s,a)=>s+a.length, 0)
  const fitScore   = active?.aiResult?.fit_score || aiResult?.fit_score
  const fitColor   = !fitScore ? 'var(--mu2)' : fitScore>=75?'#34d399':fitScore>=50?'#f59e0b':'#f87171'

  // ─── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --bg:${T.bg}; --s1:${T.s1}; --s2:${T.s2}; --s3:${T.s3};
          --tx:${T.tx}; --mu:${T.mu}; --mu2:${T.mu2};
          --b1:${T.b1}; --b2:${T.b2};
          --acc:${T.acc}; --acc2:${T.acc2};
        }
        body { background:var(--bg); color:var(--tx); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes ping  { 75%,100%{transform:scale(1.6);opacity:0} }
        .fu { animation:fadeUp .3s ease both; }

        /* TOPBAR */
        .tb { height:54px; background:var(--s1); border-bottom:1px solid var(--b1); display:flex; align-items:center; padding:0 16px; gap:10px; position:sticky; top:0; z-index:200; }
        .back { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px; background:var(--s2); border:1px solid var(--b2); color:var(--mu2); font-family:'Geist Mono',monospace; font-size:10px; cursor:pointer; transition:all .15s; }
        .back:hover { color:var(--tx); }
        .tb-ti { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .tb-pj { font-size:10px; color:var(--mu); font-family:'Geist Mono',monospace; }
        .tb-r  { margin-left:auto; display:flex; gap:6px; align-items:center; }
        .btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:10px; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; }
        .btn:hover { color:var(--tx); border-color:var(--b2); }
        .btn.p   { background:var(--acc); border-color:var(--acc); color:#fff; font-weight:700; }
        .btn.p:hover { opacity:.88; }
        .btn.ai  { background:rgba(96,165,250,.08); border-color:rgba(96,165,250,.25); color:#60a5fa; }
        .btn.ai:hover { background:rgba(96,165,250,.15); }
        .btn.gen { background:rgba(167,139,250,.1); border-color:rgba(167,139,250,.3); color:#a78bfa; }
        .btn.gen:hover { background:rgba(167,139,250,.18); }
        .btn.va  { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.3); color:var(--acc2); }
        .btn:disabled { opacity:.35; cursor:not-allowed; }
        .btn-sm { padding:4px 9px; font-size:9px; }
        .export-menu { position:absolute; top:40px; right:0; background:var(--s1); border:1px solid var(--b2); border-radius:8px; padding:4px; z-index:400; min-width:130px; box-shadow:0 8px 24px rgba(0,0,0,.5); display:flex; flex-direction:column; gap:2px; }
        .export-item { padding:7px 12px; border-radius:5px; cursor:pointer; font-size:10px; font-family:'Geist Mono',monospace; color:var(--mu2); transition:background .12s; display:flex; align-items:center; gap:7px; }
        .export-item:hover { background:var(--s2); color:var(--tx); }

        /* LAYOUT */
        .layout { display:grid; grid-template-columns:230px 1fr 300px; height:calc(100vh - 54px); overflow:hidden; }

        /* LEFT */
        .left { background:var(--s1); border-right:1px solid var(--b1); display:flex; flex-direction:column; overflow:hidden; }
        .ph { padding:12px 13px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .pl { font-size:9px; color:var(--mu); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .plist { flex:1; overflow-y:auto; padding:5px; display:flex; flex-direction:column; gap:2px; }
        .citem { padding:8px 10px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; position:relative; }
        .citem:hover { background:var(--s2); }
        .citem.on { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.22); }
        .cname { font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
        .cmeta { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; margin-top:2px; }
        .cdel  { opacity:0; position:absolute; top:7px; right:7px; background:none; border:none; color:#f87171; cursor:pointer; font-size:10px; padding:2px 4px; }
        .citem:hover .cdel { opacity:1; }
        .ai-badge { font-size:8px; padding:1px 5px; border-radius:3px; background:rgba(167,139,250,.15); color:#a78bfa; border:1px solid rgba(167,139,250,.3); font-family:'Geist Mono',monospace; font-weight:700; }
        .fit-badge { font-size:8px; padding:1px 5px; border-radius:3px; font-family:'Geist Mono',monospace; font-weight:700; }
        .mt-toggle { display:flex; gap:2px; background:var(--s2); border:1px solid var(--b1); border-radius:6px; padding:2px; }
        .mt-btn { flex:1; padding:6px 8px; border-radius:4px; font-family:'Geist Mono',monospace; font-size:9px; cursor:pointer; border:none; background:none; color:var(--mu2); transition:all .15s; text-align:center; }
        .mt-btn.on { background:var(--s3); color:var(--tx); box-shadow:0 1px 4px rgba(0,0,0,.3); }
        .mt-btn.ai-m.on { color:#a78bfa; background:rgba(167,139,250,.12); }
        .gen-ta { width:100%; background:rgba(167,139,250,.05); border:1px solid rgba(167,139,250,.22); border-radius:6px; padding:9px; font-family:'Syne',sans-serif; font-size:11px; color:var(--tx); outline:none; resize:vertical; min-height:90px; transition:border-color .15s; }
        .gen-ta:focus { border-color:rgba(167,139,250,.5); }
        .gen-ta::placeholder { color:var(--mu); }
        .inp { width:100%; background:var(--bg); border:1px solid var(--b2); border-radius:5px; padding:7px 9px; font-family:'Syne',sans-serif; font-size:11px; color:var(--tx); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--acc); }
        .inp::placeholder { color:var(--mu); }
        textarea.inp { resize:vertical; }
        .flabel { font-size:9px; color:var(--mu); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:2px; display:block; }

        /* THEME PICKER */
        .theme-picker { position:absolute; top:44px; right:0; background:var(--s1); border:1px solid var(--b2); border-radius:10px; padding:8px; display:flex; gap:5px; flex-wrap:wrap; z-index:300; min-width:190px; box-shadow:0 8px 24px rgba(0,0,0,.5); }
        .tswatch { display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer; padding:5px; border-radius:6px; border:1px solid transparent; transition:all .15s; }
        .tswatch:hover { background:var(--s2); }
        .tswatch.on { border-color:rgba(99,102,241,.4); background:rgba(99,102,241,.08); }
        .tdot { width:26px; height:26px; border-radius:50%; border:2px solid rgba(255,255,255,.15); }
        .tname { font-size:8px; font-family:'Geist Mono',monospace; color:var(--mu2); }

        /* CENTER */
        .center { overflow-y:auto; display:flex; flex-direction:column; background:var(--bg); }

        /* GEN LOADING */
        .gl { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:500px; gap:22px; }
        .g-orb { position:relative; width:80px; height:80px; }
        .g-r1  { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(167,139,250,.2); animation:ping 1.4s ease infinite; }
        .g-r2  { position:absolute; inset:10px; border-radius:50%; border:2px solid rgba(167,139,250,.1); animation:ping 1.4s ease infinite; animation-delay:.4s; }
        .g-c   { position:absolute; inset:0; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(167,139,250,.08); border:2px solid rgba(167,139,250,.3); font-size:28px; }
        .gsteps{ max-width:300px; width:100%; display:flex; flex-direction:column; gap:5px; }
        .gstep { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; transition:all .35s; border:1px solid transparent; }
        .gstep.a { background:rgba(167,139,250,.07); border-color:rgba(167,139,250,.22); }
        .gstep.d { opacity:.4; }
        .gstep.f { opacity:.18; }
        .gsd { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:10px; }
        .spnr { width:13px; height:13px; border:2px solid rgba(255,255,255,.2); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
        .spnr-sm { width:11px; height:11px; border:2px solid var(--b1); border-top-color:var(--acc2); border-radius:50%; animation:spin .7s linear infinite; }

        /* MAIN CANVAS AREA */
        .main { padding:18px; display:flex; flex-direction:column; gap:16px; }

        /* FIT SCORE */
        .fit-row { background:var(--s1); border:1px solid var(--b1); border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:18px; }
        .fit-big { font-family:'Instrument Serif',serif; font-size:44px; font-style:italic; line-height:1; }
        .fit-bar { flex:1; height:6px; background:var(--s3); border-radius:3px; overflow:hidden; }
        .fit-fill{ height:100%; border-radius:3px; transition:width .6s ease; }

        /* CVP CANVAS VISUAL */
        .cvp-canvas { display:grid; grid-template-columns:1fr auto 1fr; gap:0; align-items:center; }
        .cvp-value-map { background:var(--s1); border:1px solid var(--b1); border-radius:10px 0 0 10px; overflow:hidden; min-height:420px; display:flex; flex-direction:column; }
        .cvp-circle-wrap { display:flex; align-items:center; justify-content:center; width:44px; }
        .cvp-connector { width:44px; height:2px; background:var(--b2); }
        .cvp-customer { background:var(--s1); border:1px solid var(--b1); border-radius:50%; width:360px; height:360px; display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; position:relative; }

        /* Section blocks inside value map */
        .vm-section { flex:1; border-bottom:1px solid var(--b1); padding:12px 14px; display:flex; flex-direction:column; gap:6px; transition:background .15s; cursor:pointer; }
        .vm-section:last-child { border-bottom:none; }
        .vm-section:hover { background:var(--s2); }
        .vm-section.active { background:rgba(99,102,241,.06); border-left:2px solid var(--acc); }
        .vs-head { display:flex; align-items:center; gap:7px; }
        .vs-icon { font-size:14px; }
        .vs-label { font-size:10px; font-weight:700; font-family:'Geist Mono',monospace; letter-spacing:.04em; }
        .vs-count { font-size:9px; font-family:'Geist Mono',monospace; padding:1px 6px; border-radius:3px; }
        .vs-items { display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; }
        .vs-chip { padding:2px 8px; border-radius:4px; font-size:9px; font-family:'Geist Mono',monospace; border:1px solid; cursor:pointer; transition:opacity .15s; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .vs-chip:hover { opacity:.75; }
        .vs-add { padding:2px 8px; border-radius:4px; font-size:9px; font-family:'Geist Mono',monospace; border:1px dashed; cursor:pointer; transition:all .15s; }

        /* Customer circle sections */
        .cp-top  { flex:1; padding:10px 14px; border-bottom:1px solid var(--b1); display:flex; flex-direction:column; gap:5px; transition:background .15s; cursor:pointer; }
        .cp-mid  { flex:1; padding:10px 14px; border-bottom:1px solid var(--b1); display:flex; flex-direction:column; gap:5px; transition:background .15s; cursor:pointer; position:relative; }
        .cp-bot  { flex:1; padding:10px 14px; display:flex; flex-direction:column; gap:5px; transition:background .15s; cursor:pointer; }
        .cp-top:hover, .cp-mid:hover, .cp-bot:hover { background:var(--s2); }
        .cp-top.active, .cp-mid.active, .cp-bot.active { background:rgba(99,102,241,.06); border-right:2px solid var(--acc); }
        .cp-label { font-size:10px; font-weight:700; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:5px; }

        /* List view */
        .list-view { display:flex; flex-direction:column; gap:10px; }
        .list-section { background:var(--s1); border:1px solid var(--b1); border-radius:9px; overflow:hidden; }
        .ls-head { padding:11px 14px; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--b1); cursor:pointer; transition:background .15s; }
        .ls-head:hover { background:var(--s2); }
        .ls-body { padding:10px 14px; display:flex; flex-direction:column; gap:6px; }
        .ls-item { display:flex; align-items:flex-start; gap:8px; padding:7px 10px; background:var(--s2); border:1px solid var(--b1); border-radius:6px; transition:border-color .15s; }
        .ls-item:hover { border-color:var(--b2); }
        .ls-prio { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:5px; }
        .ls-text { flex:1; font-size:11px; line-height:1.5; }
        .ls-meta { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; }
        .ls-acts { display:flex; gap:3px; }
        .icon-btn { width:20px; height:20px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:10px; color:var(--mu2); transition:all .15s; }
        .icon-btn:hover { background:var(--s3); color:var(--tx); }

        /* RIGHT PANEL — Editor */
        .right { background:var(--s1); border-left:1px solid var(--b1); display:flex; flex-direction:column; overflow:hidden; }
        .rpanel { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:12px; }
        .sect-nav { display:flex; flex-direction:column; gap:2px; }
        .sn-btn { display:flex; align-items:center; gap:8px; padding:7px 9px; border-radius:6px; border:1px solid transparent; cursor:pointer; background:none; transition:all .15s; text-align:left; width:100%; }
        .sn-btn:hover { background:var(--s2); }
        .sn-btn.on { border-color:var(--b2); background:var(--s2); }
        .sn-icon { width:22px; height:22px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; }
        .sn-name { font-size:10px; font-weight:600; flex:1; }
        .sn-count{ font-size:9px; font-family:'Geist Mono',monospace; }
        .section-divider { font-size:8px; color:var(--mu); font-family:'Geist Mono',monospace; letter-spacing:.1em; text-transform:uppercase; padding:6px 2px 2px; }
        .item-form { background:var(--s2); border:1px solid var(--b2); border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:8px; }
        .prio-row { display:flex; gap:5px; }
        .prio-opt { flex:1; padding:5px 6px; border-radius:5px; border:1px solid var(--b2); background:var(--s3); font-size:9px; font-family:'Geist Mono',monospace; cursor:pointer; text-align:center; transition:all .15s; color:var(--mu2); }
        .prio-opt.on { font-weight:700; }
        .items-list { display:flex; flex-direction:column; gap:5px; }
        .item-row { background:var(--s2); border:1px solid var(--b1); border-radius:6px; padding:7px 9px; display:flex; gap:7px; align-items:flex-start; transition:border-color .15s; }
        .item-row:hover { border-color:var(--b2); }
        .item-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:5px; }
        .item-text{ flex:1; font-size:11px; line-height:1.5; }
        .item-acts { display:flex; gap:2px; flex-shrink:0; }

        /* AI PANEL */
        .ai-panel { position:fixed; right:0; top:54px; bottom:0; width:390px; background:var(--s1); border-left:1px solid var(--b1); z-index:150; display:flex; flex-direction:column; overflow:hidden; transform:translateX(100%); transition:transform .28s ease; }
        .ai-panel.open { transform:translateX(0); }
        .ai-ph { padding:13px 17px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
        .ai-tl { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
        .ai-body { flex:1; overflow-y:auto; padding:13px; display:flex; flex-direction:column; gap:12px; }
        .ai-st { font-size:9px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
        .ai-card { background:var(--s2); border:1px solid var(--b2); border-radius:8px; padding:12px; font-size:12px; color:var(--tx); line-height:1.7; }
        .ai-li { display:flex; gap:8px; align-items:flex-start; padding:6px 10px; background:var(--s2); border-radius:5px; border:1px solid var(--b1); font-size:11px; line-height:1.6; margin-bottom:5px; }
        .ai-li-b{ font-family:'Geist Mono',monospace; font-size:9px; color:var(--mu); padding-top:2px; flex-shrink:0; }
        .ai-gap  { background:var(--s2); border:1px solid var(--b1); border-radius:6px; padding:9px 11px; margin-bottom:5px; }
        .ai-reco { background:var(--s2); border:1px solid var(--b1); border-radius:6px; padding:9px 11px; margin-bottom:5px; }
        .ai-reco-title { font-size:11px; font-weight:700; margin-bottom:3px; display:flex; align-items:center; gap:6px; }
        .ai-reco-rat   { font-size:10px; color:var(--mu2); line-height:1.6; }
        .coverage-row { display:flex; gap:6px; align-items:center; padding:5px 9px; background:var(--s2); border-radius:5px; border:1px solid var(--b1); font-size:10px; }
        .cov-icon { flex-shrink:0; font-size:12px; }
        .spinner { width:16px; height:16px; border:2px solid var(--b1); border-top-color:#60a5fa; border-radius:50%; animation:spin .7s linear infinite; }

        /* EMPTY */
        .empty-c { display:flex; align-items:center; justify-content:center; flex:1; min-height:400px; }

        /* TOAST */
        .toast { position:fixed; bottom:20px; right:20px; z-index:999; background:var(--s2); border:1px solid var(--b2); border-radius:7px; padding:10px 16px; font-size:12px; display:flex; align-items:center; gap:7px; box-shadow:0 8px 28px rgba(0,0,0,.5); animation:fadeUp .2s ease; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info  { border-color:rgba(99,102,241,.25); }

        @media(max-width:1100px){ .layout{ grid-template-columns:210px 1fr; } .right{ display:none; } }
        @media(max-width:700px)  { .layout{ grid-template-columns:1fr; } .left{ display:none; } }
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport}/>

      <div style={{ minHeight:'100vh' }}>

        {/* ── TOPBAR ── */}
        <header className="tb">
          <button className="back" onClick={() => router.push(`/management${projectId?`?project=${projectId}`:''}`)}>← Retour</button>
          <div>
            <div className="tb-ti">Value Proposition Canvas</div>
            {project && <div className="tb-pj">{project.name}</div>}
          </div>
          <div className="tb-r">
            {active && (
              <>
                <div style={{ display:'flex', gap:3 }}>
                  <button className={`btn ${viewMode==='canvas'?'va':''}`} style={{ padding:'5px 9px' }} onClick={() => setViewMode('canvas')}>⊞ Canvas</button>
                  <button className={`btn ${viewMode==='list'?'va':''}`}   style={{ padding:'5px 9px' }} onClick={() => setViewMode('list')}>≡ Liste</button>
                </div>
                {/* Export dropdown */}
                <div style={{ position:'relative' }}>
                  <button className="btn" onClick={() => setShowThemes(p => p === 'export' ? false : 'export')}>↓ Export ▾</button>
                  {showThemes === 'export' && (
                    <div className="export-menu">
                      <div className="export-item" onClick={() => { exportJSON(); setShowThemes(false) }}>⬡ JSON</div>
                      <div className="export-item" onClick={() => { exportCSV();  setShowThemes(false) }}>≡ CSV</div>
                      <div className="export-item" onClick={() => { exportWord(); setShowThemes(false) }}>◎ Word (.doc)</div>
                    </div>
                  )}
                </div>
                <button className="btn ai" onClick={runAnalysis} disabled={aiLoading}>
                  {aiLoading ? <><span className="spnr-sm"/>Analyse…</> : '✦ Analyser'}
                </button>
              </>
            )}
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>
            {/* Theme picker */}
            <div style={{ position:'relative' }}>
              <button className="btn" onClick={() => setShowThemes(p => p === 'themes' ? false : 'themes')} style={{ padding:'5px 9px' }}>
                <div style={{ width:13,height:13,borderRadius:'50%',background:T.acc,border:'1px solid rgba(255,255,255,.2)' }}/>
              </button>
              {showThemes === 'themes' && (
                <div className="theme-picker">
                  {Object.entries(THEMES).map(([key,th]) => (
                    <div key={key} className={`tswatch ${theme===key?'on':''}`} onClick={() => setThemeAndSave(key)}>
                      <div className="tdot" style={{ background:`linear-gradient(135deg,${th.bg} 50%,${th.acc})` }}/>
                      <span className="tname">{th.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="layout" onClick={() => { if(showThemes) setShowThemes(false) }}>

          {/* ── LEFT SIDEBAR ── */}
          <aside className="left">
            <div className="ph"><span className="pl">Canvas ({canvases.length})</span></div>
            <div className="plist">
              {canvases.length === 0 && (
                <div style={{ padding:'28px 12px',textAlign:'center' }}>
                  <div style={{ fontSize:32,opacity:.15,marginBottom:10 }}>◎</div>
                  <div style={{ fontSize:11,color:'var(--mu)' }}>Créez votre première proposition de valeur</div>
                </div>
              )}
              {canvases.map(c => {
                const score = c.aiResult?.fit_score
                const fc    = score ? (score>=75?'#34d399':score>=50?'#f59e0b':'#f87171') : null
                return (
                  <div key={c.id} className={`citem ${activeId===c.id?'on':''}`} onClick={() => selectCanvas(c)}>
                    <button className="cdel" onClick={e=>{e.stopPropagation();deleteCanvas(c.id)}}>✕</button>
                    <div className="cname">
                      {c.name}
                      {c.generatedByAI && <span className="ai-badge">IA</span>}
                      {score && <span className="fit-badge" style={{ background:`${fc}18`,color:fc,border:`1px solid ${fc}40` }}>fit {score}</span>}
                    </div>
                    <div className="cmeta">
                      {c.segment && `${c.segment} · `}
                      {Object.values(c.canvas||{}).reduce((s,a)=>s+a.length,0)} éléments
                      {c.importedAt && ' · importé'}
                    </div>
                    <div className="cmeta">{new Date(c.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</div>
                  </div>
                )
              })}
            </div>

            {showForm ? (
              <div style={{ padding:10,borderTop:'1px solid var(--b1)',display:'flex',flexDirection:'column',gap:7 }}>
                <div className="mt-toggle">
                  <button className={`mt-btn ai-m ${formMode==='ai'?'on':''}`} onClick={() => setFormMode('ai')}>✦ IA Auto</button>
                  <button className={`mt-btn ${formMode==='manual'?'on':''}`} onClick={() => setFormMode('manual')}>✎ Manuel</button>
                </div>
                {formMode === 'ai' ? (
                  <>
                    <div>
                      <label className="flabel">Décrivez votre entreprise / offre</label>
                      <textarea className="gen-ta" rows={5} value={genDesc} onChange={e=>setGenDesc(e.target.value)}
                        placeholder="Ex: SaaS B2B pour PME africaines qui automatise la gestion RH — recrutement, paie, congés. Cible : DRH de 10-100 salariés fatigués des tableaux Excel et des processus manuels. Concurrent : Excel, logiciels legacy coûteux…"
                        autoFocus/>
                    </div>
                    <div style={{ display:'flex',gap:5 }}>
                      <button className="btn gen" style={{ flex:1,justifyContent:'center' }} onClick={generateAI} disabled={genLoading||!genDesc.trim()}>
                        {genLoading ? <><span className="spnr"/>…</> : '✦ Générer CVP'}
                      </button>
                      <button className="btn" onClick={() => {setShowForm(false);setGenDesc('')}}>✕</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div><label className="flabel">Nom *</label><input className="inp" placeholder="Ex: CVP SaaS RH" value={manName} onChange={e=>setManName(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&createManual()}/></div>
                    <div><label className="flabel">Segment client</label><input className="inp" placeholder="Ex: PME 10-50 salariés" value={manSegment} onChange={e=>setManSegment(e.target.value)}/></div>
                    <div><label className="flabel">Contexte</label><textarea className="inp" rows={2} placeholder="Secteur, marché, objectif…" value={manContext} onChange={e=>setManContext(e.target.value)}/></div>
                    <div style={{ display:'flex',gap:5 }}>
                      <button className="btn p" style={{ flex:1,justifyContent:'center' }} onClick={createManual}>Créer</button>
                      <button className="btn" onClick={() => setShowForm(false)}>✕</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ padding:10,borderTop:'1px solid var(--b1)',display:'flex',flexDirection:'column',gap:5 }}>
                <button className="btn gen" style={{ justifyContent:'center' }} onClick={() => {setShowForm(true);setFormMode('ai')}}>✦ Générer avec l'IA</button>
                <button className="btn" style={{ justifyContent:'center' }} onClick={() => {setShowForm(true);setFormMode('manual')}}>✎ Nouveau manuel</button>
              </div>
            )}
          </aside>

          {/* ── CENTER ── */}
          <main className="center">
            {genLoading ? (
              <div className="gl fu">
                <div className="g-orb"><div className="g-r1"/><div className="g-r2"/><div className="g-c">◎</div></div>
                <div className="gsteps">
                  {GEN_STEPS.map((s,i) => (
                    <div key={i} className={`gstep ${i===genStep?'a':i<genStep?'d':'f'}`}>
                      <div className="gsd" style={{ background:i<genStep?'#22d3a5':i===genStep?'#a78bfa':'rgba(255,255,255,.07)' }}>
                        {i<genStep ? '✓' : i===genStep ? <div style={{ width:9,height:9,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin .7s linear infinite' }}/> : <div style={{ width:5,height:5,borderRadius:'50%',background:'rgba(255,255,255,.15)' }}/>}
                      </div>
                      <span style={{ fontSize:10,color:i===genStep?'#a78bfa':'rgba(255,255,255,.3)',fontFamily:'Geist Mono,monospace' }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace' }}>Value Proposition Canvas · Osterwalder · Claude</div>
              </div>
            ) : !active ? (
              <div className="empty-c">
                <div style={{ textAlign:'center',padding:'60px 40px' }} className="fu">
                  <div style={{ fontSize:52,opacity:.12,marginBottom:14 }}>◎</div>
                  <div style={{ fontFamily:'Instrument Serif,serif',fontSize:21,fontStyle:'italic',marginBottom:8 }}>Value Proposition Canvas</div>
                  <div style={{ fontSize:12,color:'var(--mu)',lineHeight:1.7,maxWidth:340,margin:'0 auto 20px' }}>
                    Définissez précisément la valeur que vous apportez à vos clients. L'IA génère automatiquement les 6 blocs du canvas depuis une simple description.
                  </div>
                  <div style={{ display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap' }}>
                    <button className="btn gen" onClick={() => {setShowForm(true);setFormMode('ai')}}>✦ Générer avec l'IA</button>
                    <button className="btn" onClick={() => {setShowForm(true);setFormMode('manual')}}>✎ Manuel</button>
                    <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer JSON</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="main fu">
                {/* Header */}
                <div>
                  <div style={{ fontFamily:'Instrument Serif,serif',fontSize:20,fontStyle:'italic' }}>{active.name}</div>
                  {active.segment  && <div style={{ fontSize:10,color:'var(--acc2)',fontFamily:'Geist Mono,monospace',marginTop:3 }}>Segment : {active.segment}</div>}
                  {active.context  && <div style={{ fontSize:11,color:'var(--mu2)',marginTop:2,lineHeight:1.5 }}>{active.context}</div>}
                  {active.generatedByAI && <span style={{ fontSize:8,padding:'1px 6px',borderRadius:3,background:'rgba(167,139,250,.1)',color:'#a78bfa',border:'1px solid rgba(167,139,250,.25)',fontFamily:'Geist Mono,monospace',display:'inline-block',marginTop:4 }}>✦ Générée par IA · modifiable</span>}
                </div>

                {/* Fit score */}
                {fitScore && (
                  <div className="fit-row">
                    <div>
                      <div className="fit-big" style={{ color:fitColor }}>{fitScore}</div>
                      <div style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace',marginTop:3 }}>FIT SCORE /100</div>
                      {aiResult?.fit_label && <div style={{ fontSize:10,color:fitColor,fontFamily:'Geist Mono,monospace',marginTop:4 }}>{aiResult.fit_label}</div>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace',letterSpacing:'.06em',marginBottom:6 }}>ADÉQUATION VALEUR / CLIENT</div>
                      <div className="fit-bar"><div className="fit-fill" style={{ width:`${fitScore}%`,background:fitColor }}/></div>
                      {aiResult?.synthese && <div style={{ fontSize:11,color:'var(--mu2)',marginTop:8,lineHeight:1.6 }}>{aiResult.synthese.slice(0,180)}…</div>}
                    </div>
                    <button className="btn ai btn-sm" onClick={() => setShowAiPanel(true)}>Voir analyse ✦</button>
                  </div>
                )}

                {viewMode === 'canvas' ? (
                  /* ── CANVAS VIEW ── */
                  <div style={{ display:'flex',gap:0,alignItems:'stretch',minHeight:400 }}>
                    {/* Value Map — left rectangle */}
                    <div style={{ flex:1,background:'var(--s1)',border:'1px solid var(--b1)',borderRadius:'10px 0 0 10px',overflow:'hidden',display:'flex',flexDirection:'column',borderRight:'none' }}>
                      <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--b1)',background:'var(--s2)',display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ fontSize:12,fontWeight:700,fontFamily:'Geist Mono,monospace',color:'var(--acc2)' }}>💎 CARTE DE VALEUR</span>
                        <span style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace',marginLeft:'auto' }}>{(canvas.products_services||[]).length+(canvas.pain_relievers||[]).length+(canvas.gain_creators||[]).length} éléments</span>
                      </div>
                      {['products_services','pain_relievers','gain_creators'].map((key,i) => {
                        const meta  = SECTIONS_META[key]
                        const items = canvas[key] || []
                        const isActive = activeSection === key
                        return (
                          <div key={key} className={`vm-section ${isActive?'active':''}`}
                            style={{ borderColor:isActive?meta.color:undefined }}
                            onClick={() => { setActiveSection(key); setEditItem(null); setAddingTo(null) }}>
                            <div className="vs-head">
                              <span className="vs-icon" style={{ color:meta.color }}>{meta.icon}</span>
                              <span className="vs-label" style={{ color:meta.color }}>{meta.fr}</span>
                              <span className="vs-count" style={{ background:meta.bg,color:meta.color,border:`1px solid ${meta.color}40`,marginLeft:'auto' }}>{items.length}</span>
                            </div>
                            <div className="vs-items">
                              {items.slice(0,3).map((item,idx) => (
                                <span key={idx} className="vs-chip" style={{ background:meta.bg,color:meta.color,borderColor:`${meta.color}40` }}
                                  title={item.text} onClick={e => { e.stopPropagation(); startEdit(key,idx,item) }}>
                                  {item.text}
                                </span>
                              ))}
                              {items.length > 3 && <span style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace' }}>+{items.length-3}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Connector */}
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',width:32,flexShrink:0,background:'var(--s1)',borderTop:'1px solid var(--b1)',borderBottom:'1px solid var(--b1)' }}>
                      <div style={{ width:2,height:60,background:'var(--b2)',borderRadius:1 }}/>
                    </div>

                    {/* Customer Profile — right circle (styled as circle) */}
                    <div style={{ width:320,flexShrink:0,background:'var(--s1)',border:'1px solid var(--b1)',borderRadius:'0 50% 50% 0 / 0 50% 50% 0',overflow:'hidden',display:'flex',flexDirection:'column',borderLeft:'none',position:'relative' }}>
                      <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--b1)',background:'var(--s2)',display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ fontSize:12,fontWeight:700,fontFamily:'Geist Mono,monospace',color:'var(--acc2)' }}>👤 PROFIL CLIENT</span>
                        <span style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace',marginLeft:'auto' }}>{(canvas.customer_jobs||[]).length+(canvas.pains||[]).length+(canvas.gains||[]).length} éléments</span>
                      </div>
                      {['customer_jobs','pains','gains'].map((key,i) => {
                        const meta  = SECTIONS_META[key]
                        const items = canvas[key] || []
                        const isActive = activeSection === key
                        return (
                          <div key={key} className={`vm-section ${isActive?'active':''}`}
                            style={{ borderColor:isActive?meta.color:undefined }}
                            onClick={() => { setActiveSection(key); setEditItem(null); setAddingTo(null) }}>
                            <div className="vs-head">
                              <span className="vs-icon" style={{ color:meta.color }}>{meta.icon}</span>
                              <span className="vs-label" style={{ color:meta.color }}>{meta.fr}</span>
                              <span className="vs-count" style={{ background:meta.bg,color:meta.color,border:`1px solid ${meta.color}40`,marginLeft:'auto' }}>{items.length}</span>
                            </div>
                            <div className="vs-items">
                              {items.slice(0,3).map((item,idx) => (
                                <span key={idx} className="vs-chip" style={{ background:meta.bg,color:meta.color,borderColor:`${meta.color}40` }}
                                  title={item.text} onClick={e => { e.stopPropagation(); startEdit(key,idx,item) }}>
                                  {item.text}
                                </span>
                              ))}
                              {items.length > 3 && <span style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace' }}>+{items.length-3}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  /* ── LIST VIEW ── */
                  <div className="list-view">
                    {/* Customer Profile */}
                    <div style={{ fontSize:10,color:'var(--acc2)',fontFamily:'Geist Mono,monospace',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:4 }}>👤 Profil Client</div>
                    {['customer_jobs','pains','gains'].map(key => {
                      const meta  = SECTIONS_META[key]
                      const items = canvas[key] || []
                      return (
                        <div key={key} className="list-section">
                          <div className="ls-head" onClick={() => { setActiveSection(key); setEditItem(null); setAddingTo(null) }}>
                            <span style={{ color:meta.color,fontSize:14 }}>{meta.icon}</span>
                            <span style={{ fontSize:11,fontWeight:700,color:meta.color }}>{meta.fr}</span>
                            <span style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace' }}>{meta.desc}</span>
                            <span style={{ marginLeft:'auto',fontSize:9,padding:'1px 7px',borderRadius:3,background:meta.bg,color:meta.color,border:`1px solid ${meta.color}40`,fontFamily:'Geist Mono,monospace' }}>{items.length}</span>
                          </div>
                          {items.length > 0 && (
                            <div className="ls-body">
                              {items.map((item,idx) => {
                                const pm = PRIORITY_META[item.priority||'medium']
                                return (
                                  <div key={idx} className="ls-item">
                                    <div className="ls-prio" style={{ background:pm.color }}/>
                                    <div style={{ flex:1,minWidth:0 }}>
                                      <div className="ls-text">{item.text}</div>
                                      {item.notes && <div className="ls-meta">{item.notes}</div>}
                                      <div className="ls-meta">{pm.label} · {item.importance||3}/5</div>
                                    </div>
                                    <div className="ls-acts">
                                      <button className="icon-btn" onClick={() => startEdit(key,idx,item)}>✎</button>
                                      <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteItem(key,idx)}>✕</button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div style={{ fontSize:10,color:'var(--acc2)',fontFamily:'Geist Mono,monospace',letterSpacing:'.08em',textTransform:'uppercase',marginTop:8,marginBottom:4 }}>💎 Carte de Valeur</div>
                    {['products_services','pain_relievers','gain_creators'].map(key => {
                      const meta  = SECTIONS_META[key]
                      const items = canvas[key] || []
                      return (
                        <div key={key} className="list-section">
                          <div className="ls-head" onClick={() => { setActiveSection(key); setEditItem(null); setAddingTo(null) }}>
                            <span style={{ color:meta.color,fontSize:14 }}>{meta.icon}</span>
                            <span style={{ fontSize:11,fontWeight:700,color:meta.color }}>{meta.fr}</span>
                            <span style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace' }}>{meta.desc}</span>
                            <span style={{ marginLeft:'auto',fontSize:9,padding:'1px 7px',borderRadius:3,background:meta.bg,color:meta.color,border:`1px solid ${meta.color}40`,fontFamily:'Geist Mono,monospace' }}>{items.length}</span>
                          </div>
                          {items.length > 0 && (
                            <div className="ls-body">
                              {items.map((item,idx) => {
                                const pm = PRIORITY_META[item.priority||'medium']
                                return (
                                  <div key={idx} className="ls-item">
                                    <div className="ls-prio" style={{ background:pm.color }}/>
                                    <div style={{ flex:1,minWidth:0 }}>
                                      <div className="ls-text">{item.text}</div>
                                      {item.notes && <div className="ls-meta">{item.notes}</div>}
                                      <div className="ls-meta">{pm.label} · {item.importance||3}/5</div>
                                    </div>
                                    <div className="ls-acts">
                                      <button className="icon-btn" onClick={() => startEdit(key,idx,item)}>✎</button>
                                      <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteItem(key,idx)}>✕</button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* ── RIGHT — Editor Panel ── */}
          <aside className="right">
            <div className="ph"><span className="pl">Éditeur</span></div>
            {!active ? (
              <div style={{ padding:'32px 14px',textAlign:'center' }}>
                <div style={{ fontSize:11,color:'var(--mu)' }}>Sélectionnez un canvas</div>
              </div>
            ) : (
              <div className="rpanel">
                {/* Section selector */}
                <div className="sect-nav">
                  <div className="section-divider">— Profil Client —</div>
                  {['customer_jobs','pains','gains'].map(key => {
                    const meta  = SECTIONS_META[key]
                    const count = (canvas[key]||[]).length
                    return (
                      <button key={key} className={`sn-btn ${activeSection===key?'on':''}`}
                        onClick={() => { setActiveSection(key); setEditItem(null); setAddingTo(null) }}>
                        <div className="sn-icon" style={{ background:meta.bg,color:meta.color }}>{meta.icon}</div>
                        <span className="sn-name" style={{ color:activeSection===key?meta.color:'var(--mu2)' }}>{meta.fr}</span>
                        <span className="sn-count" style={{ color:meta.color }}>{count}</span>
                      </button>
                    )
                  })}
                  <div className="section-divider">— Carte de Valeur —</div>
                  {['products_services','pain_relievers','gain_creators'].map(key => {
                    const meta  = SECTIONS_META[key]
                    const count = (canvas[key]||[]).length
                    return (
                      <button key={key} className={`sn-btn ${activeSection===key?'on':''}`}
                        onClick={() => { setActiveSection(key); setEditItem(null); setAddingTo(null) }}>
                        <div className="sn-icon" style={{ background:meta.bg,color:meta.color }}>{meta.icon}</div>
                        <span className="sn-name" style={{ color:activeSection===key?meta.color:'var(--mu2)' }}>{meta.fr}</span>
                        <span className="sn-count" style={{ color:meta.color }}>{count}</span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ height:1,background:'var(--b1)' }}/>

                {/* Active section detail */}
                {(() => {
                  const meta  = SECTIONS_META[activeSection]
                  const items = canvas[activeSection] || []
                  return (
                    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <div style={{ width:32,height:32,borderRadius:8,background:meta.bg,color:meta.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>{meta.icon}</div>
                        <div>
                          <div style={{ fontSize:12,fontWeight:700,color:meta.color }}>{meta.fr}</div>
                          <div style={{ fontSize:9,color:'var(--mu2)',marginTop:1 }}>{meta.desc}</div>
                        </div>
                      </div>

                      {/* Add form */}
                      {(addingTo === activeSection) && (
                        <div className="item-form" style={{ borderColor:`${meta.color}40` }}>
                          <div>
                            <label className="flabel">Texte *</label>
                            <textarea className="inp" rows={2} value={itemForm.text} onChange={e=>setItemForm(p=>({...p,text:e.target.value}))}
                              placeholder={meta.desc} autoFocus/>
                          </div>
                          <div>
                            <label className="flabel">Priorité</label>
                            <div className="prio-row">
                              {Object.entries(PRIORITY_META).map(([k,pm]) => (
                                <button key={k} className={`prio-opt ${itemForm.priority===k?'on':''}`}
                                  style={itemForm.priority===k ? {background:pm.color+'20',borderColor:pm.color+'60',color:pm.color} : {}}
                                  onClick={() => setItemForm(p=>({...p,priority:k}))}>
                                  {pm.dot} {pm.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="flabel">Importance <span style={{ color:meta.color,fontFamily:'Geist Mono,monospace' }}>{itemForm.importance}/5</span></label>
                            <input type="range" min={1} max={5} value={itemForm.importance}
                              onChange={e=>setItemForm(p=>({...p,importance:parseInt(e.target.value)}))}
                              style={{ width:'100%',accentColor:meta.color }}/>
                          </div>
                          <div>
                            <label className="flabel">Notes</label>
                            <input className="inp" placeholder="Contexte, source…" value={itemForm.notes} onChange={e=>setItemForm(p=>({...p,notes:e.target.value}))}/>
                          </div>
                          <div style={{ display:'flex',gap:5 }}>
                            <button className="btn p" style={{ flex:1,justifyContent:'center',background:meta.color,borderColor:meta.color,color:'#000' }} onClick={() => saveItem(activeSection)}>
                              {editItem !== null ? 'Mettre à jour' : `Ajouter à ${meta.fr}`}
                            </button>
                            <button className="btn" onClick={() => {setAddingTo(null);setEditItem(null);setItemForm(EMPTY_ITEM)}}>✕</button>
                          </div>
                        </div>
                      )}

                      {/* Items */}
                      {items.length > 0 && (
                        <div className="items-list">
                          {items.map((item,idx) => {
                            const pm = PRIORITY_META[item.priority||'medium']
                            return (
                              <div key={idx} className="item-row">
                                <div className="item-dot" style={{ background:pm.color }}/>
                                <div style={{ flex:1,minWidth:0 }}>
                                  <div className="item-text">{item.text}</div>
                                  {item.notes && <div style={{ fontSize:9,color:'var(--mu)',marginTop:2 }}>{item.notes}</div>}
                                  <div style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace',marginTop:2 }}>{pm.label} · {item.importance||3}/5</div>
                                </div>
                                <div className="item-acts">
                                  <button className="icon-btn" onClick={() => startEdit(activeSection,idx,item)}>✎</button>
                                  <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteItem(activeSection,idx)}>✕</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {addingTo !== activeSection && (
                        <button className="btn" style={{ width:'100%',justifyContent:'center',borderColor:`${meta.color}40`,color:meta.color }}
                          onClick={() => { setAddingTo(activeSection); setEditItem(null); setItemForm(EMPTY_ITEM) }}>
                          + Ajouter à {meta.fr}
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </aside>
        </div>

        {/* ── AI PANEL ── */}
        <div className={`ai-panel ${showAiPanel?'open':''}`}>
          <div className="ai-ph">
            <span className="ai-tl">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-body">
            {aiLoading && (
              <div style={{ display:'flex',alignItems:'center',gap:10,color:'var(--mu2)',fontSize:12,padding:'16px 0' }}>
                <span className="spinner"/>Analyse du canvas en cours…
              </div>
            )}

            {!aiLoading && !aiResult && active?.aiResult && (() => { setAiResult(active.aiResult); return null })()}

            {aiResult && !aiLoading && (
              <>
                {/* Fit score */}
                {aiResult.fit_score && (
                  <div style={{ background:'var(--s2)',border:`1px solid ${fitColor}40`,borderRadius:9,padding:14,display:'flex',gap:14,alignItems:'center' }}>
                    <div>
                      <div style={{ fontFamily:'Instrument Serif,serif',fontSize:40,fontStyle:'italic',color:fitColor,lineHeight:1 }}>{aiResult.fit_score}</div>
                      <div style={{ fontSize:9,color:'var(--mu)',fontFamily:'Geist Mono,monospace',marginTop:4 }}>FIT SCORE /100</div>
                    </div>
                    <div style={{ flex:1 }}>
                      {aiResult.fit_label && <div style={{ fontSize:11,fontWeight:700,color:fitColor,marginBottom:6 }}>{aiResult.fit_label}</div>}
                      <div className="fit-bar"><div className="fit-fill" style={{ width:`${aiResult.fit_score}%`,background:fitColor }}/></div>
                    </div>
                  </div>
                )}

                {aiResult.synthese && (
                  <div><div className="ai-st">Synthèse</div><div className="ai-card">{aiResult.synthese}</div></div>
                )}

                {/* Coverage */}
                {aiResult.adéquation?.pains_couverts?.length > 0 && (
                  <div>
                    <div className="ai-st">Couverture Douleurs ↔ Analgésiques</div>
                    {aiResult.adéquation.pains_couverts.map((c,i) => (
                      <div key={i} className="coverage-row">
                        <span className="cov-icon">{c.couvert ? '✓' : '✗'}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:10,color:'var(--tx)' }}>{c.pain}</div>
                          {c.reliever && <div style={{ fontSize:9,color:'var(--mu2)',marginTop:1 }}>→ {c.reliever}</div>}
                          {!c.couvert && <div style={{ fontSize:9,color:'#f87171',marginTop:1 }}>Non couvert</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {aiResult.forces?.length > 0 && (
                  <div>
                    <div className="ai-st" style={{ color:'#34d399' }}>✓ Forces</div>
                    {aiResult.forces.map((f,i) => (
                      <div key={i} className="ai-li"><span className="ai-li-b" style={{ color:'#34d399' }}>+</span><span>{f}</span></div>
                    ))}
                  </div>
                )}

                {aiResult.gaps?.length > 0 && (
                  <div>
                    <div className="ai-st" style={{ color:'#f59e0b' }}>⚠ Gaps identifiés</div>
                    {aiResult.gaps.map((g,i) => {
                      const ic = { critique:'#f87171',élevé:'#fb923c',modéré:'#f59e0b' }[g.impact||'modéré'] || '#f59e0b'
                      const text = typeof g === 'string' ? g : g.description
                      const impact = typeof g === 'object' ? g.impact : null
                      return (
                        <div key={i} className="ai-gap" style={{ borderLeft:`3px solid ${ic}` }}>
                          {impact && <span style={{ fontSize:8,padding:'1px 6px',borderRadius:3,background:`${ic}18`,color:ic,border:`1px solid ${ic}40`,fontFamily:'Geist Mono,monospace',fontWeight:700 }}>{impact}</span>}
                          <div style={{ fontSize:11,color:'var(--mu2)',marginTop:impact?4:0,lineHeight:1.6 }}>{text}</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {aiResult.recommandations?.length > 0 && (
                  <div>
                    <div className="ai-st">Recommandations</div>
                    {aiResult.recommandations.map((r,i) => {
                      const isObj = typeof r === 'object'
                      const pc    = { haute:'#f87171',moyenne:'#f59e0b',faible:'#34d399' }[isObj?r.priorite:'moyenne'] || 'var(--mu2)'
                      return (
                        <div key={i} className="ai-reco" style={{ borderLeft:`3px solid ${pc}` }}>
                          <div className="ai-reco-title">
                            {isObj && <span style={{ fontSize:8,padding:'1px 7px',borderRadius:3,background:`${pc}18`,color:pc,border:`1px solid ${pc}40`,fontFamily:'Geist Mono,monospace',fontWeight:700 }}>{r.priorite}</span>}
                            <span style={{ fontSize:11,fontWeight:700 }}>{isObj?r.action:r}</span>
                          </div>
                          {isObj && r.rationale && <div className="ai-reco-rat">{r.rationale}</div>}
                        </div>
                      )
                    })}
                  </div>
                )}

                {aiResult.differentiateurs?.length > 0 && (
                  <div>
                    <div className="ai-st" style={{ color:'var(--acc2)' }}>◈ Différenciateurs</div>
                    {aiResult.differentiateurs.map((d,i) => (
                      <div key={i} className="ai-li"><span className="ai-li-b" style={{ color:'var(--acc2)' }}>◈</span><span>{d}</span></div>
                    ))}
                  </div>
                )}

                {aiResult.conclusion && (
                  <div><div className="ai-st">Verdict</div><div className="ai-card" style={{ fontStyle:'italic',color:'var(--mu2)' }}>{aiResult.conclusion}</div></div>
                )}

                {active && Object.values(canvas).some(a=>a.length>0) && (
                  <button className="btn ai" style={{ width:'100%',justifyContent:'center' }} onClick={runAnalysis}>↺ Relancer l'analyse</button>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div style={{ padding:'40px 14px',textAlign:'center' }}>
                <div style={{ fontSize:28,opacity:.12,marginBottom:10 }}>✦</div>
                <div style={{ fontSize:11,color:'var(--mu)',lineHeight:1.7 }}>Remplissez votre canvas puis cliquez sur "Analyser" pour obtenir le score de fit et les recommandations stratégiques.</div>
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