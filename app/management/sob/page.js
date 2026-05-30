'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const ERAC = {
  exclure:   { label: 'Exclure',   icon: '✕', color: '#f87171', bg: 'rgba(248,113,113,.1)',  border: 'rgba(248,113,113,.3)',  desc: 'Supprimer totalement' },
  reduire:   { label: 'Réduire',   icon: '↓', color: '#fb923c', bg: 'rgba(251,146,60,.1)',   border: 'rgba(251,146,60,.3)',   desc: 'Ramener sous la norme' },
  renforcer: { label: 'Renforcer', icon: '↑', color: '#60a5fa', bg: 'rgba(96,165,250,.1)',   border: 'rgba(96,165,250,.3)',   desc: 'Élever au-dessus de la norme' },
  creer:     { label: 'Créer',     icon: '✦', color: '#34d399', bg: 'rgba(52,211,153,.1)',   border: 'rgba(52,211,153,.3)',   desc: 'Inventer, jamais proposé' },
}

const COMPETITOR_PALETTE = ['#f472b6','#fb923c','#facc15','#a78bfa','#2dd4bf','#f87171','#818cf8','#86efac']

const DEFAULT_FACTORS = [
  'Prix','Qualité produit','Service client','Délai de livraison',
  'Expérience utilisateur','Personnalisation','Support technique','Réputation de marque',
]

// ── Themes ──────────────────────────────────────────────────────────────────
const THEMES = {
  ocean: {
    label: 'Océan',
    bg: '#050c1a',
    surface: '#081428',
    surface2: '#0c1e3a',
    surface3: '#10274d',
    border: 'rgba(6,182,212,.12)',
    border2: 'rgba(6,182,212,.22)',
    text: '#e0f2fe',
    muted: '#4a7fa0',
    muted2: '#7fb8d4',
    accent: '#06b6d4',
    accent2: '#22d3ee',
    accentBg: 'rgba(6,182,212,.1)',
    accentBorder: 'rgba(6,182,212,.28)',
  },
  midnight: {
    label: 'Minuit',
    bg: '#0a0a0f',
    surface: '#111118',
    surface2: '#18181f',
    surface3: '#1e1e28',
    border: 'rgba(255,255,255,.07)',
    border2: 'rgba(255,255,255,.12)',
    text: '#f0eff5',
    muted: '#6b6a7a',
    muted2: '#9896aa',
    accent: '#6366f1',
    accent2: '#818cf8',
    accentBg: 'rgba(99,102,241,.1)',
    accentBorder: 'rgba(99,102,241,.3)',
  },
  forest: {
    label: 'Forêt',
    bg: '#060d0a',
    surface: '#0a1410',
    surface2: '#0f1d17',
    surface3: '#14271f',
    border: 'rgba(52,211,153,.1)',
    border2: 'rgba(52,211,153,.2)',
    text: '#ecfdf5',
    muted: '#3d7055',
    muted2: '#6db38e',
    accent: '#34d399',
    accent2: '#6ee7b7',
    accentBg: 'rgba(52,211,153,.1)',
    accentBorder: 'rgba(52,211,153,.28)',
  },
  sunset: {
    label: 'Coucher de soleil',
    bg: '#0f0806',
    surface: '#1a0f0a',
    surface2: '#261710',
    surface3: '#321f15',
    border: 'rgba(251,146,60,.1)',
    border2: 'rgba(251,146,60,.2)',
    text: '#fff7ed',
    muted: '#7a4a2d',
    muted2: '#c4895a',
    accent: '#fb923c',
    accent2: '#fdba74',
    accentBg: 'rgba(251,146,60,.1)',
    accentBorder: 'rgba(251,146,60,.28)',
  },
  aurora: {
    label: 'Aurore',
    bg: '#08060f',
    surface: '#100e1a',
    surface2: '#181526',
    surface3: '#201c32',
    border: 'rgba(167,139,250,.1)',
    border2: 'rgba(167,139,250,.2)',
    text: '#f5f3ff',
    muted: '#5b5478',
    muted2: '#9d8fc4',
    accent: '#a78bfa',
    accent2: '#c4b5fd',
    accentBg: 'rgba(167,139,250,.1)',
    accentBorder: 'rgba(167,139,250,.28)',
  },
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const DEFAULT_ANALYSIS = () => ({
  id: uid(), name: '', companyName: '', industry: '',
  targetCustomer: '', context: '', strategicIntent: '',
  competitors: [{ id: uid(), name: 'Concurrent A', color: COMPETITOR_PALETTE[0] }],
  canvasFactors: DEFAULT_FACTORS.map(name => ({
    id: uid(), name, myScore: 5, competitorScores: {}, eracAction: null,
  })),
  newFactors: [],
  createdAt: new Date().toISOString(),
  aiResult: null, generatedByAI: false, theme: 'ocean',
})

// ─── Canvas Chart SVG ─────────────────────────────────────────────────────────
function CanvasChart({ active, theme: t }) {
  const factors   = active?.canvasFactors || []
  const comps     = active?.competitors   || []
  if (!factors.length) return null

  const W = 800, H = 320
  const padL = 110, padR = 20, padT = 24, padB = 40
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const step   = chartW / Math.max(1, factors.length - 1)

  const yOf = (score) => padT + chartH - ((Math.min(10, Math.max(0, score)) / 10) * chartH)
  const xOf = (i)     => padL + i * step

  const myColor = t.accent

  const pathOf = (getScore) => {
    const pts = factors.map((_, i) => `${xOf(i).toFixed(1)},${yOf(getScore(i)).toFixed(1)}`)
    return `M ${pts.join(' L ')}`
  }

  const gridLines = [0, 2, 4, 6, 8, 10]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {/* Grid */}
      {gridLines.map(v => (
        <g key={v}>
          <line x1={padL} y1={yOf(v).toFixed(1)} x2={W - padR} y2={yOf(v).toFixed(1)}
            stroke={t.border} strokeWidth="1" />
          <text x={padL - 8} y={(yOf(v) + 4).toFixed(1)} textAnchor="end"
            fill={t.muted} fontSize="10" fontFamily="'Geist Mono',monospace">{v}</text>
        </g>
      ))}

      {/* Vertical lines */}
      {factors.map((f, i) => (
        <line key={i} x1={xOf(i).toFixed(1)} y1={padT} x2={xOf(i).toFixed(1)} y2={H - padB}
          stroke={t.border} strokeWidth="1" strokeDasharray="3 3" />
      ))}

      {/* Competitor curves */}
      {comps.map((c) => (
        <path key={c.id}
          d={pathOf(i => factors[i]?.competitorScores?.[c.name] ?? 3)}
          fill="none" stroke={c.color} strokeWidth="1.5" strokeDasharray="5 3" opacity="0.65" />
      ))}

      {/* My curve fill */}
      {factors.length > 1 && (
        <path
          d={`${pathOf(i => factors[i].myScore ?? 5)} L ${xOf(factors.length - 1).toFixed(1)},${H - padB} L ${padL},${H - padB} Z`}
          fill={`${myColor}14`} />
      )}
      {/* My curve line */}
      <path d={pathOf(i => factors[i].myScore ?? 5)}
        fill="none" stroke={myColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* My dots */}
      {factors.map((f, i) => {
        const erac = f.eracAction
        const eDot = erac ? ERAC[erac]?.color : null
        return (
          <g key={f.id}>
            <circle cx={xOf(i).toFixed(1)} cy={yOf(f.myScore ?? 5).toFixed(1)} r="5"
              fill={eDot || myColor} stroke={t.bg} strokeWidth="2" />
            {erac && (
              <text x={xOf(i).toFixed(1)} y={(yOf(f.myScore ?? 5) - 10).toFixed(1)}
                textAnchor="middle" fill={eDot} fontSize="9" fontFamily="'Geist Mono',monospace">
                {ERAC[erac].icon}
              </text>
            )}
          </g>
        )
      })}

      {/* X labels */}
      {factors.map((f, i) => (
        <text key={i} x={xOf(i).toFixed(1)} y={(H - padB + 14).toFixed(1)}
          textAnchor="middle" fill={t.muted2} fontSize="9"
          fontFamily="'Geist Mono',monospace"
          style={{ userSelect: 'none' }}>
          {f.name.length > 12 ? f.name.slice(0, 12) + '…' : f.name}
        </text>
      ))}
    </svg>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BlueOceanPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,     setProject]     = useState(null)
  const [analyses,    setAnalyses]    = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [createMode,  setCreateMode]  = useState('ai-gen')
  const [newForm,     setNewForm]     = useState({ name: '', context: '', industry: '', company: '' })
  const [view,        setView]        = useState('setup')
  const [setupTab,    setSetupTab]    = useState('context')
  const [reportTab,   setReportTab]   = useState('overview')
  const [activeErac,  setActiveErac]  = useState('exclure')
  const [newFName,    setNewFName]    = useState('')
  const [newCName,    setNewCName]    = useState('')
  const [newNFName,   setNewNFName]   = useState('')
  const [newNFDesc,   setNewNFDesc]   = useState('')
  const [currentTheme, setCurrentTheme] = useState('ocean')
  const [showThemePicker, setShowThemePicker] = useState(false)

  // AI gen
  const [aiGenLoading, setAiGenLoading] = useState(false)
  const [aiGenStep,    setAiGenStep]    = useState('')

  // AI analyse
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiResult,     setAiResult]     = useState(null)
  const [toast,        setToast]        = useState(null)

  const t = THEMES[currentTheme] || THEMES.ocean

  // ── Load ──
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.BlueOcean || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          if (last.aiResult) { setAiResult(last.aiResult); setView('report') }
          if (last.theme) setCurrentTheme(last.theme)
        }
      }
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), BlueOcean: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3200)
  }

  const active = analyses.find(a => a.id === activeId) || null

  const ua = useCallback((patch) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === activeId ? { ...a, ...patch } : a)
      persist(updated)
      return updated
    })
  }, [activeId, persist])

  // ── Theme change ──
  const changeTheme = (key) => {
    setCurrentTheme(key)
    ua({ theme: key })
    setShowThemePicker(false)
  }

  // ── CRUD ──
  const createManual = () => {
    if (!newForm.name.trim()) return
    const a = { ...DEFAULT_ANALYSIS(), name: newForm.name.trim(), context: newForm.context.trim(), industry: newForm.industry.trim(), companyName: newForm.company.trim(), theme: currentTheme }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); setAiResult(null); setView('setup'); setSetupTab('context')
    persist(updated); setShowNewForm(false); setNewForm({ name: '', context: '', industry: '', company: '' })
    showToast(`"${a.name}" créée`)
  }

  // ── AI AUTO-GENERATE ──
  const createWithAI = async () => {
    if (!newForm.name.trim() || !newForm.context.trim()) return
    setAiGenLoading(true); setAiGenStep('Analyse du marché…')

    const placeholder = {
      ...DEFAULT_ANALYSIS(),
      name: newForm.name.trim(), context: newForm.context.trim(),
      industry: newForm.industry.trim(), companyName: newForm.company.trim(),
      theme: currentTheme, generatedByAI: true, generating: true,
    }
    const withPh = [...analyses, placeholder]
    setAnalyses(withPh); setActiveId(placeholder.id); persist(withPh); setShowNewForm(false)

    try {
      setAiGenStep('Cartographie des facteurs concurrentiels…')
      const res = await fetch('/api/generer-management/generer-sob-auto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName:   newForm.name.trim(),
          context:        newForm.context.trim(),
          industry:       newForm.industry.trim(),
          companyName:    newForm.company.trim(),
          projectName:    project?.name || '',
          projectTag:     project?.tag  || newForm.industry.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      setAiGenStep('Construction du canevas stratégique…')

      setAnalyses(prev => {
        const updated = prev.map(a => a.id === placeholder.id ? {
          ...a,
          canvasFactors:   data.canvasFactors   || a.canvasFactors,
          competitors:     data.competitors     || a.competitors,
          newFactors:      data.newFactors      || [],
          companyName:     data.companyName     || a.companyName,
          industry:        data.industry        || a.industry,
          targetCustomer:  data.targetCustomer  || '',
          strategicIntent: data.strategicIntent || '',
          aiResult:        data.result          || null,
          generating:      false, generatedByAI: true,
        } : a)
        persist(updated)
        return updated
      })

      if (data.result) { setAiResult(data.result); setView('report'); setReportTab('overview') }
      showToast('Océan Bleu généré par l\'IA ✦')
    } catch (err) {
      setAnalyses(prev => { const u = prev.filter(a => a.id !== placeholder.id); persist(u); return u })
      setActiveId(analyses[analyses.length - 1]?.id || null)
      showToast(err.message, 'error')
    }
    setAiGenLoading(false); setAiGenStep('')
    setNewForm({ name: '', context: '', industry: '', company: '' })
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) {
      const last = updated[updated.length - 1]
      setActiveId(last?.id || null); setAiResult(last?.aiResult || null)
      setView(last?.aiResult ? 'report' : 'setup')
      if (last?.theme) setCurrentTheme(last.theme)
    }
    showToast('Supprimée', 'info')
  }

  // ── Factor helpers ──
  const addFactor = () => {
    if (!newFName.trim()) return
    const f = { id: uid(), name: newFName.trim(), myScore: 5, competitorScores: {}, eracAction: null }
    ua({ canvasFactors: [...(active?.canvasFactors || []), f] })
    setNewFName('')
  }
  const removeFactor = (id) => ua({ canvasFactors: (active?.canvasFactors || []).filter(f => f.id !== id) })
  const updateFactor = (id, patch) => ua({ canvasFactors: (active?.canvasFactors || []).map(f => f.id === id ? { ...f, ...patch } : f) })
  const setErac = (fid, action) => updateFactor(fid, { eracAction: (active?.canvasFactors || []).find(f => f.id === fid)?.eracAction === action ? null : action })
  const addCompetitor = () => {
    if (!newCName.trim()) return
    const idx  = (active?.competitors || []).length
    ua({ competitors: [...(active?.competitors || []), { id: uid(), name: newCName.trim(), color: COMPETITOR_PALETTE[idx % COMPETITOR_PALETTE.length] }] })
    setNewCName('')
  }
  const removeCompetitor = (id) => ua({ competitors: (active?.competitors || []).filter(c => c.id !== id) })
  const setCompScore = (fid, cName, val) => updateFactor(fid, { competitorScores: { ...(active?.canvasFactors?.find(f => f.id === fid)?.competitorScores || {}), [cName]: val } })
  const addNewFactor = () => {
    if (!newNFName.trim()) return
    ua({ newFactors: [...(active?.newFactors || []), { id: uid(), name: newNFName.trim(), description: newNFDesc.trim() }] })
    setNewNFName(''); setNewNFDesc('')
  }
  const removeNewFactor = (id) => ua({ newFactors: (active?.newFactors || []).filter(f => f.id !== id) })
  const eracGroups = () => {
    const g = { exclure: [], reduire: [], renforcer: [], creer: [] }
    for (const f of (active?.canvasFactors || [])) if (f.eracAction && g[f.eracAction]) g[f.eracAction].push(f.name)
    return g
  }

  // ── AI Analyse ──
  const runAI = async () => {
    if (!active || !(active.canvasFactors || []).length) { showToast('Ajoutez des facteurs', 'error'); return }
    setAiLoading(true); setView('report'); setAiResult(null); setReportTab('overview')
    try {
      const res = await fetch('/api/generer-management/generer-sob', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project?.name, projectTag: project?.tag,
          companyName: active.companyName, industry: active.industry,
          targetCustomer: active.targetCustomer, context: active.context,
          strategicIntent: active.strategicIntent,
          canvasFactors: active.canvasFactors,
          competitors: active.competitors,
          eracDecisions: eracGroups(),
          newFactors: active.newFactors || [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result); ua({ aiResult: data.result })
      showToast('Analyse Océan Bleu générée ✦')
    } catch (err) { showToast(err.message, 'error'); setView('setup') }
    setAiLoading(false)
  }

  // ── Export ──
  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ ...active, result: aiResult, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `BlueOcean_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url); showToast('Exportée')
  }

  // ── Import ──
  const importAnalysis = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.canvasFactors || !data.name) throw new Error('Format invalide')
        const imported = { ...data, id: uid(), importedAt: new Date().toISOString() }
        const updated = [...analyses, imported]
        setAnalyses(updated); setActiveId(imported.id)
        setAiResult(imported.aiResult || imported.result || null)
        if (imported.aiResult || imported.result) setView('report')
        if (imported.theme) setCurrentTheme(imported.theme)
        persist(updated); showToast(`"${imported.name}" importée`)
      } catch { showToast('Format JSON invalide', 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  const oceanColor = (s) => s >= 4 ? '#34d399' : s >= 3 ? t.accent : s >= 2 ? '#facc15' : '#f87171'

  // ── Render helpers ──────────────────────────────────────────────────────────

  const SetupContextTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { key: 'companyName', label: 'Nom de votre société', ph: 'Ex: Acme Corp' },
          { key: 'industry',    label: 'Secteur / industrie',  ph: 'Ex: Fintech, Retail…' },
          { key: 'targetCustomer', label: 'Client cible', ph: 'Ex: PME, jeunes actifs…' },
          { key: 'strategicIntent', label: 'Intention stratégique', ph: 'Ex: Créer un marché inexploré…' },
        ].map(({ key, label, ph }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={lbl}>{label}</label>
            <input style={inp(t)} placeholder={ph} value={active?.[key] || ''}
              onChange={e => ua({ [key]: e.target.value })} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={lbl}>Contexte stratégique</label>
        <textarea style={{ ...inp(t), minHeight: 80, resize: 'vertical' }}
          placeholder="Décrivez votre situation actuelle, vos concurrents, vos défis…"
          value={active?.context || ''} onChange={e => ua({ context: e.target.value })} />
      </div>
    </div>
  )

  const SetupFactorsTab = () => {
    const factors = active?.canvasFactors || []
    const comps   = active?.competitors || []
    const colCount = 3 + comps.length
    const gridCols = `160px 70px ${comps.map(() => '70px').join(' ')} 100px 40px`
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Add competitor */}
        <div style={card(t)}>
          <div style={cardTitle(t)}>Concurrents</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inp(t), flex: 1 }} placeholder="Nom du concurrent"
              value={newCName} onChange={e => setNewCName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCompetitor()} />
            <button style={btnSmall(t)} onClick={addCompetitor}>+ Ajouter</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {comps.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 6, background: t.surface2, border: `1px solid ${t.border}` }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                <button onClick={() => removeCompetitor(c.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring table */}
        <div style={card(t)}>
          <div style={cardTitle(t)}>Scoring des facteurs (0–10)</div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 6, minWidth: 400, padding: '8px 12px', background: t.surface3, borderRadius: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: t.muted, fontFamily: 'Geist Mono,monospace', textTransform: 'uppercase', letterSpacing: '.07em' }}>Facteur</span>
              <span style={{ fontSize: 10, color: t.accent, fontFamily: 'Geist Mono,monospace' }}>Nous</span>
              {comps.map(c => <span key={c.id} style={{ fontSize: 10, color: c.color, fontFamily: 'Geist Mono,monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>)}
              <span style={{ fontSize: 10, color: t.muted, fontFamily: 'Geist Mono,monospace' }}>ERAC</span>
              <span />
            </div>
            {factors.map(f => (
              <div key={f.id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 6, padding: '7px 12px', borderBottom: `1px solid ${t.border}`, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <input type="number" min="0" max="10" step="0.5"
                  style={{ ...inp(t), padding: '4px 6px', fontSize: 12, textAlign: 'center', width: 60 }}
                  value={f.myScore ?? 5} onChange={e => updateFactor(f.id, { myScore: parseFloat(e.target.value) || 0 })} />
                {comps.map(c => (
                  <input key={c.id} type="number" min="0" max="10" step="0.5"
                    style={{ ...inp(t), padding: '4px 6px', fontSize: 12, textAlign: 'center', width: 60 }}
                    value={f.competitorScores?.[c.name] ?? 3}
                    onChange={e => setCompScore(f.id, c.name, parseFloat(e.target.value) || 0)} />
                ))}
                <div style={{ display: 'flex', gap: 3 }}>
                  {Object.entries(ERAC).map(([k, v]) => (
                    <button key={k} title={v.label}
                      style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer', border: `1px solid ${f.eracAction === k ? v.color : t.border}`, background: f.eracAction === k ? v.bg : 'none', color: f.eracAction === k ? v.color : t.muted, transition: 'all .15s' }}
                      onClick={() => setErac(f.id, k)}>
                      {v.icon}
                    </button>
                  ))}
                </div>
                <button onClick={() => removeFactor(f.id)} style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 11, padding: 4, borderRadius: 4 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input style={{ ...inp(t), flex: 1 }} placeholder="Nouveau facteur de concurrence"
              value={newFName} onChange={e => setNewFName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFactor()} />
            <button style={btnSmall(t)} onClick={addFactor}>+ Ajouter</button>
          </div>
        </div>
      </div>
    )
  }

  const SetupEracTab = () => {
    const factors = active?.canvasFactors || []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ERAC board */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Object.entries(ERAC).map(([key, meta]) => {
            const tagged = factors.filter(f => f.eracAction === key)
            const untagged = factors.filter(f => f.eracAction !== key)
            return (
              <div key={key} style={{ border: `1px solid ${activeErac === key ? meta.border : t.border}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setActiveErac(key)}>
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9, background: activeErac === key ? meta.bg : t.surface2 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: meta.color, fontWeight: 700 }}>{meta.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                    <div style={{ fontSize: 10, color: t.muted }}>{meta.desc}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'Geist Mono,monospace', color: meta.color }}>{tagged.length}</span>
                </div>
                <div style={{ padding: '10px 14px', minHeight: 56, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {tagged.length === 0 && <span style={{ fontSize: 11, color: t.muted, fontStyle: 'italic' }}>Aucun facteur assigné</span>}
                  {tagged.map(f => (
                    <span key={f.id} style={{ padding: '3px 9px', borderRadius: 5, fontSize: 10, fontFamily: 'Geist Mono,monospace', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {f.name}
                      <button onClick={e => { e.stopPropagation(); setErac(f.id, key) }} style={{ background: 'none', border: 'none', color: meta.color, cursor: 'pointer', fontSize: 9, padding: 0 }}>✕</button>
                    </span>
                  ))}
                </div>
                {activeErac === key && untagged.length > 0 && (
                  <div style={{ padding: '6px 14px', borderTop: `1px solid ${t.border}`, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {untagged.map(f => (
                      <button key={f.id} onClick={e => { e.stopPropagation(); setErac(f.id, key) }}
                        style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'Geist Mono,monospace', background: t.surface3, color: t.muted2, border: `1px solid ${t.border}`, cursor: 'pointer' }}>
                        + {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Create new factors */}
        <div style={card(t)}>
          <div style={cardTitle(t)}>Facteurs à Créer (nouveaux)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inp(t), flex: 2 }} placeholder="Nom du facteur" value={newNFName} onChange={e => setNewNFName(e.target.value)} />
              <input style={{ ...inp(t), flex: 3 }} placeholder="Description / valeur apportée" value={newNFDesc} onChange={e => setNewNFDesc(e.target.value)} />
              <button style={btnSmall(t)} onClick={addNewFactor}>+ Ajouter</button>
            </div>
            {(active?.newFactors || []).map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', background: ERAC.creer.bg, border: `1px solid ${ERAC.creer.border}`, borderRadius: 8 }}>
                <span style={{ color: ERAC.creer.color, fontSize: 14, marginTop: 1 }}>✦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ERAC.creer.color }}>{f.name}</div>
                  {f.description && <div style={{ fontSize: 11, color: t.muted2, marginTop: 2 }}>{f.description}</div>}
                </div>
                <button onClick={() => removeNewFactor(f.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const ReportOverview = () => {
    if (!aiResult) return null
    const d = aiResult.ocean_diagnostic || {}
    const c = aiResult.canvas_analysis  || {}
    const oc = oceanColor(d.ocean_score || 2.5)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hero */}
        <div style={{ ...card(t), flexDirection: 'row', alignItems: 'center', gap: 22, background: `color-mix(in srgb, ${oc} 8%, ${t.surface})`, borderColor: `color-mix(in srgb, ${oc} 30%, transparent)` }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 64, fontStyle: 'italic', color: oc, lineHeight: 1 }}>{(d.ocean_score || 2.5).toFixed(1)}</div>
            <div style={{ fontSize: 9, color: t.muted, fontFamily: 'Geist Mono,monospace', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>Score Océan</div>
            <div style={{ marginTop: 8, padding: '4px 12px', borderRadius: 20, background: `${oc}18`, border: `1px solid ${oc}40`, color: oc, fontSize: 11, fontFamily: 'Geist Mono,monospace', fontWeight: 700 }}>{d.label || 'Zone de Transition'}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: t.muted2, lineHeight: 1.75 }}>{d.current_state}</div>
            {c.headline && (
              <div style={{ marginTop: 12, padding: '10px 16px', background: `${t.accent}12`, border: `1px solid ${t.accentBorder}`, borderRadius: 8, fontFamily: 'Instrument Serif,serif', fontSize: 16, fontStyle: 'italic', color: t.accent }}>
                "{c.headline}"
              </div>
            )}
          </div>
        </div>

        {/* Canvas chart */}
        {active && (
          <div style={card(t)}>
            <div style={cardTitle(t)}>Canevas stratégique</div>
            <CanvasChart active={active} theme={t} />
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.muted2, fontFamily: 'Geist Mono,monospace' }}>
                <div style={{ width: 20, height: 2, background: t.accent, borderRadius: 1 }} />
                {active.companyName || 'Nous'}
              </div>
              {(active.competitors || []).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.muted2, fontFamily: 'Geist Mono,monospace' }}>
                  <div style={{ width: 20, height: 2, background: c.color, borderRadius: 1, opacity: 0.65 }} />
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Convergence / Divergence */}
        {(c.convergence_factors?.length > 0 || c.divergence_opportunities?.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {c.convergence_factors?.length > 0 && (
              <div style={card(t)}>
                <div style={{ fontSize: 10, color: '#f87171', fontFamily: 'Geist Mono,monospace', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>⚔ Zones de convergence</div>
                {c.convergence_factors.map((f, i) => <div key={i} style={{ fontSize: 12, color: t.muted2, padding: '5px 0', borderBottom: `1px solid ${t.border}` }}>{f}</div>)}
              </div>
            )}
            {c.divergence_opportunities?.length > 0 && (
              <div style={card(t)}>
                <div style={{ fontSize: 10, color: t.accent, fontFamily: 'Geist Mono,monospace', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>〰 Opportunités de rupture</div>
                {c.divergence_opportunities.map((f, i) => <div key={i} style={{ fontSize: 12, color: t.muted2, padding: '5px 0', borderBottom: `1px solid ${t.border}` }}>{f}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Conclusion */}
        {aiResult.conclusion && (
          <div style={{ ...card(t), background: `${t.accent}0d`, borderColor: t.accentBorder }}>
            <div style={{ fontSize: 13, color: t.text, lineHeight: 1.75, fontStyle: 'italic' }}>{aiResult.conclusion}</div>
          </div>
        )}
      </div>
    )
  }

  const ReportErac = () => {
    const reco = aiResult?.erac_recommendations || {}
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.entries(ERAC).map(([key, meta]) => {
          const items = reco[key] || []
          return (
            <div key={key} style={{ border: `1px solid ${meta.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', background: meta.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${meta.color}20`, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: meta.color, fontWeight: 700 }}>{meta.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'Geist Mono,monospace', color: meta.color, background: `${meta.color}18`, padding: '2px 8px', borderRadius: 4 }}>{items.length} facteur(s)</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {items.length === 0 && <div style={{ fontSize: 11, color: t.muted, fontStyle: 'italic' }}>Aucune recommandation pour ce quadrant</div>}
                {items.map((item, i) => (
                  <div key={i} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.factor || item.name}
                      {item.impact && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: `${item.impact === 'Fort' ? '#f87171' : item.impact === 'Modéré' ? '#f59e0b' : '#34d399'}18`, color: item.impact === 'Fort' ? '#f87171' : item.impact === 'Modéré' ? '#f59e0b' : '#34d399', fontFamily: 'Geist Mono,monospace', fontWeight: 600 }}>{item.impact}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: t.muted2, lineHeight: 1.6 }}>{item.rationale}</div>
                    {(item.target_level || item.value_proposition || item.saving_estimate) && (
                      <div style={{ marginTop: 7, fontSize: 11, color: meta.color, padding: '6px 10px', background: meta.bg, borderRadius: 5 }}>
                        {item.target_level || item.value_proposition || item.saving_estimate}
                      </div>
                    )}
                    {item.difficulty && <div style={{ marginTop: 4, fontSize: 10, fontFamily: 'Geist Mono,monospace', color: t.muted }}>Difficulté : {item.difficulty}</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const ReportValueCurve = () => {
    const vc = aiResult?.new_value_curve || {}
    const nc = aiResult?.non_customers   || {}
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {vc.tagline && (
          <div style={{ ...card(t), alignItems: 'center', background: `${t.accent}0e`, borderColor: t.accentBorder }}>
            <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, fontStyle: 'italic', color: t.accent, textAlign: 'center' }}>"{vc.tagline}"</div>
          </div>
        )}
        {vc.description && <div style={card(t)}><div style={sectionTitle(t)}>Nouvelle courbe de valeur</div><div style={{ fontSize: 13, color: t.muted2, lineHeight: 1.7 }}>{vc.description}</div></div>}
        {vc.key_differences?.length > 0 && (
          <div style={card(t)}>
            <div style={sectionTitle(t)}>Différences clés</div>
            {vc.key_differences.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, marginTop: i === 0 ? 0 : 6 }}>
                <span style={{ color: t.accent, fontSize: 14, flexShrink: 0 }}>〰</span>
                <span style={{ fontSize: 12, color: t.text, lineHeight: 1.5 }}>{d}</span>
              </div>
            ))}
          </div>
        )}
        {/* Non-customers */}
        {Object.values(nc).some(v => v) && (
          <div style={card(t)}>
            <div style={sectionTitle(t)}>Non-clients à reconquérir</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {['tier1','tier2','tier3'].map((tier, i) => {
                const data = nc[tier]; if (!data) return null
                return (
                  <div key={tier} style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: t.accent, textTransform: 'uppercase', letterSpacing: '.08em' }}>Niveau {i + 1}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, margin: '4px 0' }}>{data.label}</div>
                    <div style={{ fontSize: 11, color: t.muted2, lineHeight: 1.5 }}>{data.description}</div>
                    {data.unlock_lever && <div style={{ marginTop: 8, fontSize: 11, padding: '7px 10px', background: `${t.accent}10`, border: `1px solid ${t.accentBorder}`, borderRadius: 6, color: t.accent }}>{data.unlock_lever}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const ReportRoadmap = () => {
    const plan    = aiResult?.action_plan       || []
    const hurdles = aiResult?.four_hurdles      || {}
    const metrics = aiResult?.blue_ocean_metrics || []
    const phaseColors = [t.accent, '#a78bfa', '#34d399']
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Phases */}
        {plan.map((phase, i) => (
          <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: t.surface2, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: phaseColors[i] || t.accent }}>{phase.phase}</div>
              {phase.milestone && <div style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', color: t.muted2 }}>{phase.milestone}</div>}
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {(phase.actions || []).map((action, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: phaseColors[i] || t.accent, flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 12, color: t.muted2, lineHeight: 1.5 }}>{action}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Four hurdles */}
        {Object.keys(hurdles).length > 0 && (
          <div style={card(t)}>
            <div style={sectionTitle(t)}>4 Obstacles au changement</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { key: 'cognitive', label: 'Cognitif' },
                { key: 'resource',  label: 'Ressources' },
                { key: 'motivation',label: 'Motivation' },
                { key: 'political', label: 'Politique' },
              ].map(({ key, label }) => {
                const h = hurdles[key]; if (!h) return null
                return (
                  <div key={key} style={{ border: `1px solid ${t.border}`, borderRadius: 9, padding: 14 }}>
                    <div style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', color: t.muted2, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 12, color: t.text, lineHeight: 1.55, marginBottom: 8 }}>{h.hurdle}</div>
                    <div style={{ fontSize: 11, color: t.muted2, padding: '7px 10px', background: t.surface2, borderRadius: 6 }}>{h.solution}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Metrics */}
        {metrics.length > 0 && (
          <div style={card(t)}>
            <div style={sectionTitle(t)}>KPIs Océan Bleu</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {metrics.map((m, i) => (
                <div key={i} style={{ border: `1px solid ${t.border}`, borderRadius: 9, padding: 14 }}>
                  <div style={{ fontSize: 11, color: t.muted2, fontFamily: 'Geist Mono,monospace', marginBottom: 6 }}>{m.metric}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.accent }}>{m.target}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Style helpers ──────────────────────────────────────────────────────────
  const inp = (t) => ({
    width: '100%', background: t.bg, border: `1px solid ${t.border2}`,
    borderRadius: 6, padding: '8px 10px', fontFamily: 'Syne,sans-serif',
    fontSize: 12, color: t.text, outline: 'none',
  })
  const card = (t) => ({
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
  })
  const cardTitle = (t) => ({
    fontSize: 10, color: t.muted2, letterSpacing: '.1em',
    textTransform: 'uppercase', fontFamily: 'Geist Mono,monospace',
  })
  const sectionTitle = (t) => ({
    fontSize: 10, color: t.muted2, letterSpacing: '.1em',
    textTransform: 'uppercase', fontFamily: 'Geist Mono,monospace', marginBottom: 8,
  })
  const lbl = {
    fontSize: 10, color: '#9896aa', letterSpacing: '.08em',
    textTransform: 'uppercase', fontFamily: 'Geist Mono,monospace', marginBottom: 4,
  }
  const btnSmall = (t) => ({
    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
    borderRadius: 6, cursor: 'pointer', fontFamily: 'Geist Mono,monospace', fontSize: 10,
    border: `1px solid ${t.border2}`, background: t.surface2, color: t.muted2,
    transition: 'all .15s', whiteSpace: 'nowrap',
  })

  const REPORT_TABS = [
    { id: 'overview',   label: 'Vue globale' },
    { id: 'erac',       label: 'ERAC' },
    { id: 'valuecurve', label: 'Nouvelle courbe' },
    { id: 'roadmap',    label: 'Plan d\'action' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${t.bg};color:${t.text};font-family:'Syne',sans-serif;min-height:100vh;transition:background .3s;}
        ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:${t.border2};border-radius:2px;}
        input,textarea,select{transition:border-color .15s;}
        input:focus,textarea:focus{border-color:${t.accent} !important;outline:none;}
        .spinner{width:16px;height:16px;border:2px solid ${t.border2};border-top-color:${t.accent};border-radius:50%;animation:spin .7s linear infinite;}
        .gen-spinner{width:20px;height:20px;border:2px solid ${t.border2};border-top-color:${t.accent2};border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .btn-hover:hover{color:${t.text} !important;border-color:${t.border2} !important;}
        .litem-del{opacity:0;background:none;border:none;color:#f87171;cursor:pointer;font-size:12px;float:right;padding:2px;}
        .litem:hover .litem-del{opacity:1;}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importAnalysis} />

      <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: 'Syne,sans-serif', display: 'flex', flexDirection: 'column' }}>

        {/* TOPBAR */}
        <header style={{ height: 56, background: t.surface, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: t.surface2, border: `1px solid ${t.border2}`, color: t.muted2, fontFamily: 'Geist Mono,monospace', fontSize: 11, cursor: 'pointer' }}>
            ← Retour
          </button>
          <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 18, fontStyle: 'italic' }}>Stratégie Océan Bleu</div>
          <span style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', color: t.accent, background: t.accentBg, border: `1px solid ${t.accentBorder}`, padding: '2px 8px', borderRadius: 10 }}>ERAC · Canevas</span>
          {project && <span style={{ fontSize: 11, color: t.muted, fontFamily: 'Geist Mono,monospace' }}>{project.name}</span>}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Theme picker */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowThemePicker(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: t.surface2, border: `1px solid ${t.border2}`, color: t.muted2, fontFamily: 'Geist Mono,monospace', fontSize: 10, cursor: 'pointer' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.accent }} />
                {THEMES[currentTheme].label}
              </button>
              {showThemePicker && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 10, padding: 8, display: 'flex', flexDirection: 'column', gap: 3, zIndex: 300, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
                  {Object.entries(THEMES).map(([key, th]) => (
                    <button key={key} onClick={() => changeTheme(key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 6, border: `1px solid ${currentTheme === key ? th.accent + '60' : 'transparent'}`, background: currentTheme === key ? `${th.accent}12` : 'none', cursor: 'pointer', fontSize: 12, color: currentTheme === key ? th.accent : t.muted2 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: th.accent }} />
                      {th.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => importRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: t.surface2, border: `1px solid ${t.border2}`, color: t.muted2, fontFamily: 'Geist Mono,monospace', fontSize: 10, cursor: 'pointer' }}>
              ↑ Importer
            </button>

            {active && (
              <>
                {/* View toggle */}
                <div style={{ display: 'flex', gap: 3, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: 3 }}>
                  {[{id:'setup',l:'Configuration'},{id:'report',l:'Analyse'}].map(v => (
                    <button key={v.id} onClick={() => setView(v.id)}
                      disabled={v.id === 'report' && !aiResult && !aiLoading}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'Geist Mono,monospace', cursor: 'pointer', border: 'none', background: view === v.id ? t.surface3 : 'none', color: view === v.id ? t.text : t.muted2, transition: 'all .15s', opacity: v.id === 'report' && !aiResult && !aiLoading ? 0.4 : 1 }}>
                      {v.l}
                    </button>
                  ))}
                </div>

                {view === 'report' && aiResult && (
                  <button onClick={exportAnalysis}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, background: t.surface2, border: `1px solid ${t.border2}`, color: t.muted2, fontFamily: 'Geist Mono,monospace', fontSize: 10, cursor: 'pointer' }}>
                    ↓ Exporter
                  </button>
                )}

                <button onClick={runAI} disabled={aiLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, fontFamily: 'Geist Mono,monospace', fontSize: 11, cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.7 : 1 }}>
                  {aiLoading ? <><span className="spinner" />Analyse…</> : '〰 Tracer l\'Océan Bleu'}
                </button>
              </>
            )}
          </div>
        </header>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '240px 1fr', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

          {/* LEFT PANEL */}
          <aside style={{ background: t.surface, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: t.muted, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'Geist Mono,monospace' }}>Analyses ({analyses.length})</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {analyses.length === 0 && (
                <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, opacity: .25, marginBottom: 12 }}>🌊</div>
                  <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.6 }}>Créez votre première analyse Océan Bleu</div>
                </div>
              )}
              {analyses.map(a => (
                <div key={a.id} className="litem"
                  style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${activeId === a.id ? t.accentBorder : 'transparent'}`, background: activeId === a.id ? t.accentBg : 'none', transition: 'all .15s' }}
                  onClick={() => { setActiveId(a.id); setAiResult(a.aiResult || null); setView(a.aiResult ? 'report' : 'setup'); if (a.theme) setCurrentTheme(a.theme) }}>
                  <button className="litem-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: t.muted, fontFamily: 'Geist Mono,monospace', marginTop: 3 }}>
                    {a.generating ? '⟳ Génération…' : new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    {a.generatedByAI && ' · IA'}{a.importedAt && ' · Importée'}
                    {a.aiResult && ' · 〰'}
                  </div>
                </div>
              ))}
            </div>

            {showNewForm ? (
              <div style={{ padding: 12, borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 9, flexShrink: 0 }}>
                {/* Mode toggle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, background: t.bg, borderRadius: 6, padding: 3, border: `1px solid ${t.border}` }}>
                  {[{id:'ai-gen',l:'✦ IA Auto'},{id:'manual',l:'✎ Manuel'}].map(m => (
                    <button key={m.id} onClick={() => setCreateMode(m.id)}
                      style={{ padding: '5px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'Geist Mono,monospace', fontWeight: 700, cursor: 'pointer', border: 'none', background: createMode === m.id ? t.surface2 : 'transparent', color: createMode === m.id ? t.text : t.muted, transition: 'all .15s' }}>
                      {m.l}
                    </button>
                  ))}
                </div>
                {[
                  { key: 'name',    label: 'Nom de l\'analyse', ph: 'Ex: Rupture marché 2026', req: true },
                  { key: 'company', label: 'Société',           ph: 'Ex: Acme Corp' },
                  { key: 'industry',label: 'Secteur',           ph: 'Ex: Fintech, Retail…' },
                ].map(f => (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <label style={{ fontSize: 9, color: t.muted, letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'Geist Mono,monospace' }}>{f.label}</label>
                    <input style={{ ...inp(t), fontSize: 11, padding: '6px 9px' }} placeholder={f.ph}
                      value={newForm[f.key]} onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                      autoFocus={f.key === 'name'} />
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 9, color: t.muted, letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'Geist Mono,monospace' }}>{createMode === 'ai-gen' ? 'Description / contexte *' : 'Contexte'}</label>
                  <textarea style={{ ...inp(t), minHeight: createMode === 'ai-gen' ? 70 : 50, resize: 'vertical', fontSize: 11, padding: '6px 9px' }}
                    placeholder={createMode === 'ai-gen' ? "Décrivez votre activité, concurrents, marché, défis… L'IA va tout générer." : "Contexte stratégique…"}
                    value={newForm.context} onChange={e => setNewForm(p => ({ ...p, context: e.target.value }))} />
                </div>
                {createMode === 'ai-gen' && (
                  <div style={{ fontSize: 9, color: t.accent2, background: `${t.accent}08`, border: `1px solid ${t.accentBorder}`, borderRadius: 5, padding: '7px 9px', lineHeight: 1.5 }}>
                    ✦ L'IA va identifier les facteurs de concurrence, les scores, les décisions ERAC et générer l'analyse complète.
                  </div>
                )}
                <div style={{ display: 'flex', gap: 5 }}>
                  {createMode === 'ai-gen' ? (
                    <button onClick={createWithAI} disabled={aiGenLoading || !newForm.name.trim() || !newForm.context.trim()}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 6, background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, fontFamily: 'Geist Mono,monospace', fontSize: 10, cursor: 'pointer', opacity: (aiGenLoading || !newForm.name.trim() || !newForm.context.trim()) ? 0.4 : 1 }}>
                      {aiGenLoading ? <><span className="gen-spinner" style={{ width: 14, height: 14 }} />{aiGenStep || 'Génération…'}</> : '✦ Générer'}
                    </button>
                  ) : (
                    <button onClick={createManual}
                      style={{ flex: 1, padding: '7px', borderRadius: 6, background: t.accent, border: `1px solid ${t.accent}`, color: '#fff', fontFamily: 'Geist Mono,monospace', fontSize: 10, cursor: 'pointer' }}>
                      Créer
                    </button>
                  )}
                  <button onClick={() => { setShowNewForm(false); setNewForm({ name: '', context: '', industry: '', company: '' }) }}
                    style={{ padding: '7px 10px', borderRadius: 6, background: t.surface2, border: `1px solid ${t.border2}`, color: t.muted2, fontFamily: 'Geist Mono,monospace', fontSize: 10, cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: `1px solid ${t.border}` }}>
                <button onClick={() => setShowNewForm(true)}
                  style={{ width: '100%', padding: '7px', borderRadius: 6, background: t.surface2, border: `1px solid ${t.border2}`, color: t.muted2, fontFamily: 'Geist Mono,monospace', fontSize: 10, cursor: 'pointer' }}>
                  + Nouvelle analyse
                </button>
              </div>
            )}
          </aside>

          {/* CENTER */}
          <main style={{ overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, background: t.bg }}>
            {!active ? (
              <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🌊</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 24, fontStyle: 'italic', marginBottom: 8, color: t.text }}>Stratégie Océan Bleu</div>
                <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.6 }}>Cartographiez la concurrence, appliquez ERAC, tracez votre espace non contesté</div>
              </div>
            ) : active.generating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 40px' }}>
                <div className="gen-spinner" />
                <div style={{ fontSize: 14, color: t.accent, fontFamily: 'Geist Mono,monospace' }}>{aiGenStep || 'Génération en cours…'}</div>
                <div style={{ fontSize: 12, color: t.muted }}>L'IA analyse le marché et construit le canevas stratégique…</div>
              </div>
            ) : view === 'setup' ? (
              <>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, fontStyle: 'italic' }}>{active.name}</h2>
                    {active.generatedByAI && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: t.accentBg, color: t.accent2, fontFamily: 'Geist Mono,monospace', fontWeight: 700, border: `1px solid ${t.accentBorder}` }}>Généré par IA</span>}
                  </div>
                  {active.industry && <div style={{ fontSize: 11, color: t.muted, fontFamily: 'Geist Mono,monospace', marginTop: 4 }}>Secteur : {active.industry}</div>}
                </div>

                {/* Setup tabs */}
                <div style={{ display: 'flex', gap: 3, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: 3, alignSelf: 'flex-start' }}>
                  {[{id:'context',l:'Contexte'},{id:'factors',l:'Facteurs & Scores'},{id:'erac',l:'ERAC'}].map(tb => (
                    <button key={tb.id} onClick={() => setSetupTab(tb.id)}
                      style={{ padding: '5px 14px', borderRadius: 6, fontSize: 11, fontFamily: 'Geist Mono,monospace', cursor: 'pointer', border: 'none', background: setupTab === tb.id ? t.surface3 : 'none', color: setupTab === tb.id ? t.text : t.muted2, transition: 'all .15s' }}>
                      {tb.l}
                    </button>
                  ))}
                </div>

                {setupTab === 'context' && <SetupContextTab />}
                {setupTab === 'factors' && <SetupFactorsTab />}
                {setupTab === 'erac'    && <SetupEracTab />}

                <button onClick={runAI} disabled={aiLoading}
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, fontFamily: 'Geist Mono,monospace', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  {aiLoading ? <><span className="spinner" />Analyse en cours…</> : '〰 Tracer l\'Océan Bleu'}
                </button>
              </>
            ) : (
              <>
                {/* Report header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontFamily: 'Instrument Serif,serif', fontSize: 22, fontStyle: 'italic' }}>{active.name}</h2>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: t.accentBg, color: t.accent, fontFamily: 'Geist Mono,monospace', fontWeight: 700, border: `1px solid ${t.accentBorder}` }}>〰 Analyse Océan Bleu</span>
                </div>

                {/* Report tabs */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {REPORT_TABS.map(tb => (
                    <button key={tb.id} onClick={() => setReportTab(tb.id)}
                      style={{ padding: '7px 14px', borderRadius: 8, fontSize: 11, fontFamily: 'Geist Mono,monospace', border: `1px solid ${reportTab === tb.id ? t.accentBorder : t.border2}`, background: reportTab === tb.id ? t.accentBg : t.surface2, color: reportTab === tb.id ? t.accent : t.muted2, cursor: 'pointer', transition: 'all .15s' }}>
                      {tb.label}
                    </button>
                  ))}
                </div>

                {aiLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 40px' }}>
                    <div style={{ width: 32, height: 32, border: `2px solid ${t.border2}`, borderTopColor: t.accent, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    <div style={{ fontSize: 14, color: t.accent, fontFamily: 'Geist Mono,monospace' }}>Tracé de l'Océan Bleu en cours…</div>
                  </div>
                ) : aiResult ? (
                  <>
                    {reportTab === 'overview'   && <ReportOverview />}
                    {reportTab === 'erac'        && <ReportErac />}
                    {reportTab === 'valuecurve'  && <ReportValueCurve />}
                    {reportTab === 'roadmap'     && <ReportRoadmap />}
                  </>
                ) : (
                  <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, opacity: .25, marginBottom: 12 }}>〰</div>
                    <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.6 }}>Lancez l'analyse pour voir les résultats.</div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 500, background: t.surface2, border: `1px solid ${toast.type === 'error' ? 'rgba(248,113,113,.3)' : t.border2}`, borderRadius: 8, padding: '12px 18px', fontSize: 13, boxShadow: '0 8px 32px rgba(0,0,0,.4)', animation: 'slideUp .2s ease', display: 'flex', alignItems: 'center', gap: 8, color: toast.type === 'error' ? '#f87171' : t.text }}>
            {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}