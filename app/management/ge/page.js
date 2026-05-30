'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  obsidian: {
    label: 'Obsidian',
    icon: '◈',
    vars: {
      '--bg': '#0a0a0f',
      '--surface': '#111118',
      '--surface2': '#18181f',
      '--surface3': '#1e1e28',
      '--border': 'rgba(255,255,255,.07)',
      '--border2': 'rgba(255,255,255,.12)',
      '--text': '#f0eff5',
      '--muted': '#6b6a7a',
      '--muted2': '#9896aa',
      '--accent': '#6366f1',
      '--accent2': '#818cf8',
      '--invest': '#34d399',
      '--selective': '#facc15',
      '--harvest': '#f87171',
    },
  },
  slate: {
    label: 'Slate',
    icon: '◆',
    vars: {
      '--bg': '#0d1117',
      '--surface': '#161b22',
      '--surface2': '#1c2330',
      '--surface3': '#21262d',
      '--border': 'rgba(48,54,61,.8)',
      '--border2': 'rgba(99,110,123,.5)',
      '--text': '#e6edf3',
      '--muted': '#7d8590',
      '--muted2': '#8b949e',
      '--accent': '#58a6ff',
      '--accent2': '#79c0ff',
      '--invest': '#3fb950',
      '--selective': '#d29922',
      '--harvest': '#f85149',
    },
  },
  midnight: {
    label: 'Midnight',
    icon: '⬡',
    vars: {
      '--bg': '#06070d',
      '--surface': '#0e1020',
      '--surface2': '#131528',
      '--surface3': '#181b30',
      '--border': 'rgba(100,120,200,.1)',
      '--border2': 'rgba(100,120,200,.18)',
      '--text': '#dde4ff',
      '--muted': '#5a6080',
      '--muted2': '#7a82aa',
      '--accent': '#7c83ff',
      '--accent2': '#a5aaff',
      '--invest': '#36e4b4',
      '--selective': '#fbbf24',
      '--harvest': '#fb7185',
    },
  },
  graphite: {
    label: 'Graphite',
    icon: '◉',
    vars: {
      '--bg': '#111111',
      '--surface': '#1a1a1a',
      '--surface2': '#222222',
      '--surface3': '#2a2a2a',
      '--border': 'rgba(255,255,255,.06)',
      '--border2': 'rgba(255,255,255,.1)',
      '--text': '#eeeeee',
      '--muted': '#666666',
      '--muted2': '#888888',
      '--accent': '#e5e5e5',
      '--accent2': '#cccccc',
      '--invest': '#4ade80',
      '--selective': '#fbbf24',
      '--harvest': '#f87171',
    },
  },
  aurora: {
    label: 'Aurora',
    icon: '✦',
    vars: {
      '--bg': '#070b14',
      '--surface': '#0d1421',
      '--surface2': '#121b2c',
      '--surface3': '#172135',
      '--border': 'rgba(0,200,150,.07)',
      '--border2': 'rgba(0,200,150,.14)',
      '--text': '#e0f5ef',
      '--muted': '#4a7a6a',
      '--muted2': '#6a9e8e',
      '--accent': '#00c896',
      '--accent2': '#30dba8',
      '--invest': '#00e5a0',
      '--selective': '#ffcd38',
      '--harvest': '#ff6b8a',
    },
  },
}

const MARKET_CRITERIA = {
  marketSize:       { label: 'Taille du marché',          desc: 'Volume total adressable',    weight: 0.20 },
  growthRate:       { label: 'Taux de croissance',        desc: 'CAGR du marché',             weight: 0.20 },
  profitability:    { label: 'Rentabilité sectorielle',   desc: 'Marges moyennes secteur',    weight: 0.15 },
  competitionLevel: { label: 'Intensité concurrentielle', desc: 'Nb et force des acteurs (inversé)', weight: 0.15 },
  techRequirements: { label: 'Exigences technologiques',  desc: 'Niveau de technicité',       weight: 0.10 },
  environmental:    { label: 'Facteurs environnementaux', desc: 'Réglementation, ESG',        weight: 0.10 },
  cyclicality:      { label: 'Cyclicité du marché',       desc: 'Stabilité demande (inversé)',weight: 0.10 },
}

const STRENGTH_CRITERIA = {
  marketShare:    { label: 'Part de marché',          desc: 'Position relative',         weight: 0.20 },
  brandStrength:  { label: 'Force de la marque',      desc: 'Notoriété et image',        weight: 0.15 },
  productQuality: { label: 'Qualité produit/service', desc: 'Supériorité perçue',        weight: 0.15 },
  profitMargins:  { label: 'Marges bénéficiaires',    desc: 'Rentabilité propre',        weight: 0.15 },
  techCapability: { label: 'Capacité technologique',  desc: 'R&D et stack tech',         weight: 0.15 },
  manufacturing:  { label: 'Capacité opérationnelle', desc: 'Efficience et scalabilité', weight: 0.10 },
  innovation:     { label: 'Innovation',              desc: 'Pipeline et vélocité',      weight: 0.10 },
}

const ZONE_COLORS = {
  invest:    { fill: 'rgba(52,211,153,.12)',  stroke: 'rgba(52,211,153,.3)',  text: '#34d399', label: 'Investir' },
  selective: { fill: 'rgba(250,204,21,.09)', stroke: 'rgba(250,204,21,.28)', text: '#facc15', label: 'Sélectivité' },
  harvest:   { fill: 'rgba(248,113,113,.1)', stroke: 'rgba(248,113,113,.25)',text: '#f87171', label: 'Récolter' },
}

const ZONE_MAP = [
  ['invest',    'invest',    'selective'],
  ['invest',    'selective', 'harvest'  ],
  ['selective', 'harvest',   'harvest'  ],
]

const BUBBLE_COLORS = ['#818cf8','#f472b6','#fb923c','#34d399','#facc15','#60a5fa','#a78bfa','#2dd4bf','#e879f9','#4ade80']

const computeScore = (scores, criteria) => {
  let total = 0, tw = 0
  for (const [k, m] of Object.entries(criteria)) { total += (scores?.[k] ?? 3) * m.weight; tw += m.weight }
  return tw > 0 ? total / tw : 3
}

const getZoneMeta = (a, s) => {
  const row = a >= 3.67 ? 0 : a >= 2.33 ? 1 : 2
  const col = s >= 3.67 ? 0 : s >= 2.33 ? 1 : 2
  return { zone: ZONE_MAP[row][col], row, col }
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`

const EMPTY_SBU = () => ({
  id: uid(), name: '', description: '', notes: '',
  marketScores:   Object.fromEntries(Object.keys(MARKET_CRITERIA).map(k => [k, 3])),
  strengthScores: Object.fromEntries(Object.keys(STRENGTH_CRITERIA).map(k => [k, 3])),
})

const DEFAULT_ANALYSIS = () => ({
  id: uid(), name: '', companyName: '', context: '',
  sbus: [EMPTY_SBU()],
  createdAt: new Date().toISOString(),
  aiResult: null,
  theme: 'obsidian',
})

// ─── Matrix SVG Component ─────────────────────────────────────────────────────
function MatrixSVG({ bubbles = [] }) {
  const W = 540, H = 480
  const PAD_L = 52, PAD_B = 44, PAD_T = 16, PAD_R = 16
  const GW = W - PAD_L - PAD_R
  const GH = H - PAD_T - PAD_B

  const zones = [
    { zone:'invest',    row:0, col:0 }, { zone:'invest',    row:0, col:1 }, { zone:'selective', row:0, col:2 },
    { zone:'invest',    row:1, col:0 }, { zone:'selective', row:1, col:1 }, { zone:'harvest',   row:1, col:2 },
    { zone:'selective', row:2, col:0 }, { zone:'harvest',   row:2, col:1 }, { zone:'harvest',   row:2, col:2 },
  ]
  const cellW = GW / 3, cellH = GH / 3
  const ticks = [1, 2, 3, 4, 5]

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
      <div style={{ fontSize:11, color:'var(--muted2)', fontFamily:'Geist Mono,monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>
        Matrice McKinsey / GE — Positionnement des DAS
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', maxWidth:W, display:'block', margin:'0 auto', overflow:'visible' }}>
        {zones.map(({ zone, row, col }) => {
          const zc = ZONE_COLORS[zone]
          const x = PAD_L + col * cellW, y = PAD_T + row * cellH
          return <rect key={`${row}-${col}`} x={x} y={y} width={cellW} height={cellH} fill={zc.fill} stroke={zc.stroke} strokeWidth={0.5} />
        })}
        {[
          { row:0, col:0, text:'Investir',    zone:'invest'    },
          { row:1, col:1, text:'Sélectivité', zone:'selective' },
          { row:2, col:2, text:'Récolter',    zone:'harvest'   },
        ].map(({ row, col, text, zone }) => {
          const zc = ZONE_COLORS[zone]
          return (
            <text key={text} x={PAD_L + (col + 0.5) * cellW} y={PAD_T + (row + 0.5) * cellH + 4}
              textAnchor="middle" fill={zc.text} fontSize={10} fontFamily="'Geist Mono',monospace" opacity={0.35} letterSpacing={1}>
              {text.toUpperCase()}
            </text>
          )
        })}
        {[1, 2].map(i => (
          <g key={`grid-${i}`}>
            <line x1={PAD_L + i * cellW} y1={PAD_T} x2={PAD_L + i * cellW} y2={PAD_T + GH} stroke="rgba(255,255,255,.1)" strokeWidth={1}/>
            <line x1={PAD_L} y1={PAD_T + i * cellH} x2={PAD_L + GW} y2={PAD_T + i * cellH} stroke="rgba(255,255,255,.1)" strokeWidth={1}/>
          </g>
        ))}
        {ticks.map(t => {
          const xPos = PAD_L + ((t - 1) / 4) * GW
          const yPos = PAD_T + (1 - (t - 1) / 4) * GH
          return (
            <g key={t}>
              <text x={xPos} y={PAD_T + GH + 14} textAnchor="middle" fill="rgba(255,255,255,.3)" fontSize={9} fontFamily="'Geist Mono',monospace">{t}</text>
              <text x={PAD_L - 8} y={yPos + 3} textAnchor="end" fill="rgba(255,255,255,.3)" fontSize={9} fontFamily="'Geist Mono',monospace">{t}</text>
            </g>
          )
        })}
        <text x={PAD_L + GW / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize={10} fontFamily="'Geist Mono',monospace" letterSpacing={1}>
          FORCE COMPÉTITIVE →
        </text>
        <text x={10} y={PAD_T + GH / 2} textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize={10} fontFamily="'Geist Mono',monospace" letterSpacing={1}
          transform={`rotate(-90, 10, ${PAD_T + GH / 2})`}>
          ATTRACTIVITÉ DU MARCHÉ →
        </text>
        {bubbles.map((b, i) => {
          const cx = PAD_L + (b.x / 100) * GW
          const cy = PAD_T + (b.y / 100) * GH
          return (
            <g key={b.id}>
              <circle cx={cx} cy={cy} r={18} fill={b.color} opacity={0.2}/>
              <circle cx={cx} cy={cy} r={18} fill="none" stroke={b.color} strokeWidth={1.5}/>
              <text x={cx} y={cy + 4} textAnchor="middle" fill={b.color} fontSize={11} fontFamily="'Syne',sans-serif" fontWeight={700}>{i + 1}</text>
              <text x={cx + 22} y={cy + 4} fill="rgba(240,239,245,.8)" fontSize={10} fontFamily="'Geist Mono',monospace">
                {(b.name || `DAS ${i+1}`).slice(0, 18)}
              </text>
            </g>
          )
        })}
      </svg>
      <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
        {Object.entries(ZONE_COLORS).map(([zone, zc]) => (
          <div key={zone} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--muted2)', fontFamily:'Geist Mono,monospace' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:zc.fill, border:`1px solid ${zc.stroke}` }}/>
            <span style={{ color:zc.text }}>{zc.label}</span>
          </div>
        ))}
        {bubbles.map((b, i) => (
          <div key={b.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--muted2)', fontFamily:'Geist Mono,monospace' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:b.color, opacity:.7 }}/>
            <span>{i + 1} — {b.name || `DAS ${i+1}`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function McKinseyGEPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,      setProject]      = useState(null)
  const [analyses,     setAnalyses]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [newForm,      setNewForm]      = useState({ name: '' })
  const [view,         setView]         = useState('setup')
  const [setupTab,     setSetupTab]     = useState('context')
  const [activeSbu,    setActiveSbu]    = useState(0)
  const [scoreTab,     setScoreTab]     = useState('market')
  const [reportTab,    setReportTab]    = useState('matrix')
  const [activeSbuR,   setActiveSbuR]   = useState(null)
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiResult,     setAiResult]     = useState(null)
  const [toast,        setToast]        = useState(null)
  const [currentTheme, setCurrentTheme] = useState('obsidian')
  const [showThemes,   setShowThemes]   = useState(false)

  // Generation state
  const [showGenModal,    setShowGenModal]    = useState(false)
  const [genDescription,  setGenDescription]  = useState('')
  const [genAnalysisName, setGenAnalysisName] = useState('')
  const [genLoading,      setGenLoading]      = useState(false)
  const [genStep,         setGenStep]         = useState('idle')

  // ── Load ──
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.McKinseyGE || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          setCurrentTheme(last.theme || 'obsidian')
          if (last.aiResult) { setAiResult(last.aiResult); setView('report'); setActiveSbuR(last.sbus?.[0]?.id) }
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), McKinseyGE: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200) }

  const active = analyses.find(a => a.id === activeId) || null

  // Theme vars injection
  const themeVars = THEMES[currentTheme]?.vars || THEMES.obsidian.vars

  // ── CRUD analyses ──
  const createAnalysis = (overrides = {}) => {
    const name = (overrides.name || newForm.name).trim()
    if (!name) return
    const a = { ...DEFAULT_ANALYSIS(), name, theme: currentTheme, ...overrides }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); setAiResult(null)
    setView('setup'); setSetupTab('context'); setActiveSbu(0)
    persist(updated); setShowNewForm(false); setNewForm({ name: '' })
    return a
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
    showToast('Analyse supprimée', 'info')
  }

  const updateActive = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated); persist(updated)
  }

  const addSbu = () => {
    const sbus = [...(active?.sbus || []), EMPTY_SBU()]
    updateActive({ sbus }); setActiveSbu(sbus.length - 1)
  }

  const removeSbu = (idx) => {
    const sbus = [...(active?.sbus || [])]
    sbus.splice(idx, 1)
    updateActive({ sbus }); setActiveSbu(Math.max(0, idx - 1))
  }

  const updateSbu = (idx, patch) => {
    const sbus = [...(active?.sbus || [])]
    sbus[idx] = { ...sbus[idx], ...patch }
    updateActive({ sbus })
  }

  const setScore = (sbuIdx, type, key, val) => {
    const sbus  = [...(active?.sbus || [])]
    const field = type === 'market' ? 'marketScores' : 'strengthScores'
    sbus[sbuIdx] = { ...sbus[sbuIdx], [field]: { ...(sbus[sbuIdx][field] || {}), [key]: val } }
    updateActive({ sbus })
  }

  const getSbuScores = (sbu) => {
    const a = computeScore(sbu.marketScores,   MARKET_CRITERIA)
    const s = computeScore(sbu.strengthScores, STRENGTH_CRITERIA)
    return { a, s, zone: ZONE_MAP[getZoneMeta(a, s).row][getZoneMeta(a, s).col] }
  }

  // ── AI Generation ──
  const handleGenerate = async () => {
    if (!genDescription.trim() || !genAnalysisName.trim()) {
      showToast('Nom et description requis', 'error'); return
    }
    setGenLoading(true); setGenStep('loading')
    try {
      const res  = await fetch('/api/generer-management/generer-ge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          description: genDescription,
          analysisName: genAnalysisName,
          companyName: '',
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur serveur')

      const { result } = data
      const a = {
        ...DEFAULT_ANALYSIS(),
        name:        genAnalysisName.trim(),
        companyName: result.companyName || '',
        context:     result.context     || '',
        sbus:        result.sbus        || [],
        theme:       currentTheme,
        generatedSynthese: result.synthese || '',
      }
      const updated = [...analyses, a]
      setAnalyses(updated); setActiveId(a.id); setAiResult(null)
      setView('setup'); setSetupTab('preview'); setActiveSbu(0)
      persist(updated)

      setGenStep('done')
      showToast(`"${a.name}" généré avec ${a.sbus.length} DAS ✦`)
      setTimeout(() => { setShowGenModal(false); setGenStep('idle'); setGenDescription(''); setGenAnalysisName('') }, 1200)
    } catch (err) {
      showToast(err.message, 'error'); setGenStep('idle')
    }
    setGenLoading(false)
  }

  // ── AI Analysis ──
  const runAI = async () => {
    if (!active || !(active.sbus || []).some(s => s.name.trim())) {
      showToast('Nommez au moins un DAS', 'error'); return
    }
    setAiLoading(true); setView('report'); setAiResult(null); setReportTab('matrix')
    try {
      const res  = await fetch('/api/generer-management/generer-ge-analyse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyse',
          projectName: project?.name, projectTag: project?.tag,
          companyName: active.companyName, context: active.context,
          sbus: active.sbus.filter(s => s.name.trim()),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateActive({ aiResult: data.result })
      setActiveSbuR(active.sbus.filter(s => s.name.trim())[0]?.id)
      showToast('Analyse McKinsey/GE générée')
    } catch (err) { showToast(err.message, 'error'); setView('setup') }
    setAiLoading(false)
  }

  // ── Export ──
  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ version: '2.0', exportedAt: new Date().toISOString(), analysis: active, result: aiResult }, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `GE_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url); showToast('Export téléchargé')
  }

  // ── Import ──
  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const raw      = JSON.parse(evt.target.result)
        const card     = raw.analysis || raw
        const imported = { ...card, id: uid(), createdAt: card.createdAt || new Date().toISOString(), theme: card.theme || 'obsidian' }
        const updated  = [...analyses, imported]
        setAnalyses(updated); setActiveId(imported.id); persist(updated)
        if (imported.aiResult) { setAiResult(imported.aiResult); setView('report') }
        if (imported.theme) setCurrentTheme(imported.theme)
        showToast(`"${imported.name}" importée (${imported.sbus?.length || 0} DAS)`)
      } catch (err) { showToast('Fichier invalide : ' + err.message, 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  const changeTheme = (themeKey) => {
    setCurrentTheme(themeKey); setShowThemes(false)
    if (active) updateActive({ theme: themeKey })
  }

  const currentSbu  = active?.sbus?.[activeSbu]
  const validSbus   = (active?.sbus || []).filter(s => s.name.trim())
  const sc = (v) => v >= 4 ? '#34d399' : v >= 3 ? '#86efac' : v >= 2 ? '#facc15' : '#f87171'

  const matrixBubbles = validSbus.map((sbu, i) => {
    const a = computeScore(sbu.marketScores,   MARKET_CRITERIA)
    const s = computeScore(sbu.strengthScores, STRENGTH_CRITERIA)
    const x = ((s - 1) / 4) * 100
    const y = 100 - ((a - 1) / 4) * 100
    return { ...sbu, a, s, x, y, color: BUBBLE_COLORS[i % BUBBLE_COLORS.length], zone: ZONE_MAP[a >= 3.67 ? 0 : a >= 2.33 ? 1 : 2][s >= 3.67 ? 0 : s >= 2.33 ? 1 : 2] }
  })

  const activeSbuResult = aiResult?.sbus?.find(s => s.id === activeSbuR) || aiResult?.sbus?.[0]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          ${Object.entries(themeVars).map(([k, v]) => `${k}:${v}`).join(';')};
        }
        body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

        .root { min-height:100vh; display:flex; flex-direction:column; }
        .topbar { height:56px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 20px; gap:12px; position:sticky; top:0; z-index:100; }
        .topbar-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .topbar-sub { font-size:11px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .topbar-right { margin-left:auto; display:flex; gap:8px; align-items:center; }
        .body { flex:1; display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 56px); overflow:hidden; }

        .btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; letter-spacing:.04em; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .btn:hover { color:var(--text); border-color:rgba(255,255,255,.2); }
        .btn.primary { background:var(--accent); border-color:var(--accent); color:var(--bg); }
        .btn.primary:hover { opacity:.9; }
        .btn.ge { background:rgba(129,140,248,.1); border-color:rgba(129,140,248,.3); color:var(--accent2); }
        .btn.ge:hover { background:rgba(129,140,248,.18); }
        .btn.gen { background:rgba(52,211,153,.08); border-color:rgba(52,211,153,.3); color:var(--invest); }
        .btn.gen:hover { background:rgba(52,211,153,.15); }
        .btn:disabled { opacity:.4; cursor:not-allowed; }
        .back-btn { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s; }
        .back-btn:hover { color:var(--text); }

        .left-panel { background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
        .panel-header { padding:16px; border-bottom:1px solid var(--border); }
        .panel-label { font-size:10px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .panel-list { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:2px; }
        .litem { padding:10px 12px; border-radius:8px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
        .litem:hover { background:var(--surface2); }
        .litem.active { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.2); }
        .litem-name { font-size:12px; font-weight:600; }
        .litem-meta { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:2px; }
        .litem-del { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; float:right; padding:2px; }
        .litem:hover .litem-del { opacity:1; }
        .ai-badge { font-size:9px; padding:1px 5px; border-radius:3px; margin-left:4px; background:rgba(52,211,153,.1); color:var(--invest); font-family:'Geist Mono',monospace; }
        .new-form { padding:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px; }
        .input { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:8px 10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--text); outline:none; transition:border-color .15s; }
        .input:focus { border-color:var(--accent); }
        .input::placeholder { color:var(--muted); }
        textarea.input { resize:vertical; min-height:56px; }
        .lbl { font-size:10px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:4px; display:block; }

        .center-panel { overflow-y:auto; padding:28px; display:flex; flex-direction:column; gap:22px; }
        .tab-strip { display:flex; gap:4px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:3px; align-self:flex-start; }
        .tab-btn { padding:5px 14px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; transition:all .15s; color:var(--muted2); border:none; background:none; }
        .tab-btn.active { background:var(--surface3); color:var(--text); }
        .view-tabs { display:flex; gap:4px; background:var(--surface2); border-radius:8px; padding:3px; border:1px solid var(--border); }

        .card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:14px; }
        .card-title { font-size:11px; color:var(--muted2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:8px; }
        .card-title-dot { width:6px; height:6px; border-radius:50%; background:var(--accent2); }

        .sbu-list { display:flex; flex-direction:column; gap:6px; }
        .sbu-tab { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:1px solid var(--border2); background:var(--surface2); cursor:pointer; transition:all .15s; }
        .sbu-tab:hover { background:var(--surface3); }
        .sbu-tab.active { border-color:rgba(99,102,241,.4); background:rgba(99,102,241,.08); }
        .sbu-num { width:24px; height:24px; border-radius:6px; background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.2); color:var(--accent2); font-family:'Geist Mono',monospace; font-size:11px; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0; }
        .sbu-tab-name { flex:1; font-size:12px; font-weight:600; }
        .sbu-tab-scores { display:flex; gap:8px; }
        .sbu-score-mini { font-size:10px; font-family:'Geist Mono',monospace; }
        .sbu-del { background:none; border:none; color:var(--muted); cursor:pointer; font-size:11px; padding:3px; border-radius:4px; }
        .sbu-del:hover { color:#f87171; }

        .score-editor { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
        .score-editor-header { padding:14px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .score-editor-title { font-size:14px; font-weight:700; }
        .score-type-tabs { display:flex; gap:4px; }
        .score-type-tab { padding:5px 12px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .score-type-tab.active { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.3); color:var(--accent2); }
        .score-list { padding:16px 20px; display:flex; flex-direction:column; gap:10px; }
        .score-row { display:grid; grid-template-columns:180px 1fr 80px; align-items:center; gap:14px; }
        .score-label-wrap { display:flex; flex-direction:column; }
        .score-crit-label { font-size:12px; font-weight:600; }
        .score-crit-desc { font-size:10px; color:var(--muted); margin-top:1px; }
        .score-weight { font-size:9px; font-family:'Geist Mono',monospace; color:var(--muted); margin-top:2px; }
        input[type=range].cr { width:100%; appearance:none; height:5px; border-radius:3px; outline:none; cursor:pointer; }
        input[type=range].cr::-webkit-slider-thumb { appearance:none; width:16px; height:16px; border-radius:50%; cursor:pointer; border:2px solid rgba(255,255,255,.2); }
        .score-val-wrap { display:flex; flex-direction:column; align-items:center; gap:3px; }
        .score-val { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; line-height:1; }
        .score-stars { display:flex; gap:2px; }
        .star { font-size:8px; }
        .sbu-live-scores { display:flex; gap:12px; padding:10px 20px; background:var(--surface2); border-top:1px solid var(--border); flex-wrap:wrap; align-items:center; }
        .live-score-item { display:flex; flex-direction:column; align-items:center; gap:2px; }
        .live-score-val { font-family:'Instrument Serif',serif; font-size:22px; font-style:italic; }
        .live-score-lbl { font-size:9px; color:var(--muted); font-family:'Geist Mono',monospace; text-transform:uppercase; letter-spacing:.06em; }
        .zone-badge { padding:4px 12px; border-radius:20px; font-size:11px; font-family:'Geist Mono',monospace; font-weight:700; }

        /* Report */
        .report-tab-strip { display:flex; gap:6px; flex-wrap:wrap; }
        .report-tab { padding:7px 14px; border-radius:8px; font-size:11px; font-family:'Geist Mono',monospace; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); cursor:pointer; transition:all .15s; }
        .report-tab.active { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.3); color:var(--accent2); }

        .portfolio-header { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
        .portfolio-score { text-align:center; flex-shrink:0; }
        .portfolio-score-val { font-family:'Instrument Serif',serif; font-size:52px; font-style:italic; line-height:1; }
        .portfolio-score-lbl { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:4px; text-transform:uppercase; letter-spacing:.06em; }
        .portfolio-counts { display:flex; gap:10px; margin-top:10px; }
        .portfolio-count { display:flex; flex-direction:column; align-items:center; padding:6px 10px; border-radius:8px; font-family:'Geist Mono',monospace; }
        .portfolio-count-val { font-size:18px; font-weight:700; }
        .portfolio-count-lbl { font-size:9px; text-transform:uppercase; letter-spacing:.05em; margin-top:2px; }
        .portfolio-summary { flex:1; font-size:13px; line-height:1.75; color:var(--muted2); min-width:200px; }

        .sbu-report-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
        .sbu-report-tab { display:flex; align-items:center; gap:7px; padding:7px 14px; border-radius:8px; font-size:11px; font-family:'Geist Mono',monospace; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); cursor:pointer; transition:all .15s; }
        .sbu-report-tab.active { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.3); color:var(--accent2); }
        .zone-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .sbu-report-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
        .sbu-report-hdr { padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
        .sbu-report-name { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; }
        .sbu-report-meta { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .sbu-report-body { padding:20px; display:flex; flex-direction:column; gap:16px; }

        .analysis-box { background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:14px 16px; font-size:13px; color:var(--text); line-height:1.75; }
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .mini-list-title { font-size:10px; font-family:'Geist Mono',monospace; text-transform:uppercase; letter-spacing:.08em; color:var(--muted2); margin-bottom:6px; }
        .mini-item { display:flex; gap:8px; align-items:flex-start; font-size:12px; color:var(--muted2); line-height:1.5; padding:3px 0; }
        .mini-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; margin-top:6px; }

        .options-list { display:flex; flex-direction:column; gap:6px; }
        .option-item { display:flex; gap:10px; align-items:flex-start; padding:10px 14px; background:var(--surface2); border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--text); line-height:1.5; }
        .opt-num { font-family:'Geist Mono',monospace; font-size:10px; color:var(--muted); flex-shrink:0; padding-top:1px; }
        .kpi-row { display:flex; gap:6px; flex-wrap:wrap; }
        .kpi-chip { padding:5px 12px; border-radius:8px; font-size:11px; font-family:'Geist Mono',monospace; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); }

        .alloc-list { display:flex; flex-direction:column; gap:6px; }
        .alloc-item { display:flex; gap:12px; align-items:center; padding:12px 16px; background:var(--surface); border:1px solid var(--border); border-radius:8px; }
        .alloc-num { width:28px; height:28px; border-radius:8px; background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.25); color:var(--accent2); font-family:'Geist Mono',monospace; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .alloc-name { font-size:13px; font-weight:600; min-width:120px; }
        .alloc-rationale { font-size:11px; color:var(--muted2); flex:1; line-height:1.5; }

        .moves-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .move-card { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:14px; }
        .move-type { font-size:10px; font-family:'Geist Mono',monospace; padding:2px 8px; border-radius:4px; background:var(--surface2); color:var(--muted2); border:1px solid var(--border2); display:inline-block; margin-bottom:4px; }
        .move-title { font-size:12px; font-weight:700; margin-bottom:4px; }
        .move-desc { font-size:11px; color:var(--muted2); line-height:1.6; }
        .move-tags { display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; }
        .move-tag { font-size:10px; font-family:'Geist Mono',monospace; padding:2px 7px; border-radius:4px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted); }

        .info-list { display:flex; flex-direction:column; gap:6px; }
        .info-item { display:flex; gap:10px; align-items:flex-start; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--muted2); line-height:1.6; }
        .risk-row { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:12px 16px; display:flex; gap:12px; align-items:flex-start; }
        .risk-sev { font-size:10px; font-family:'Geist Mono',monospace; padding:3px 8px; border-radius:4px; font-weight:700; flex-shrink:0; }
        .risk-body { flex:1; }
        .risk-title { font-size:12px; font-weight:600; margin-bottom:3px; }
        .risk-mit { font-size:11px; color:var(--muted2); line-height:1.5; }
        .roadmap-list { display:flex; flex-direction:column; gap:10px; }
        .roadmap-item { background:var(--surface); border:1px solid var(--border); border-radius:10px; overflow:hidden; }
        .roadmap-hdr { padding:10px 16px; background:var(--surface2); border-bottom:1px solid var(--border); font-size:11px; font-family:'Geist Mono',monospace; color:var(--accent2); font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
        .roadmap-milestones { padding:10px 16px; display:flex; flex-direction:column; gap:5px; }
        .roadmap-ms { display:flex; gap:8px; align-items:flex-start; font-size:12px; color:var(--muted2); line-height:1.5; }
        .ms-dot { width:5px; height:5px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:6px; }

        .sec-title { font-size:10px; color:var(--muted2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:8px; }
        .sec-line { flex:1; height:1px; background:var(--border); }
        .conclusion-box { background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:16px 20px; font-size:13px; color:var(--muted2); line-height:1.75; font-style:italic; }
        .gen-notice { font-size:11px; color:var(--invest); background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.2); border-radius:6px; padding:8px 12px; font-family:'Geist Mono',monospace; line-height:1.6; }

        /* Theme picker */
        .theme-picker { position:relative; }
        .theme-dropdown { position:absolute; right:0; top:calc(100% + 6px); background:var(--surface); border:1px solid var(--border2); border-radius:10px; padding:8px; min-width:160px; z-index:200; box-shadow:0 8px 24px rgba(0,0,0,.4); display:flex; flex-direction:column; gap:2px; }
        .theme-opt { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:6px; cursor:pointer; font-size:11px; font-family:'Geist Mono',monospace; color:var(--muted2); transition:all .15s; }
        .theme-opt:hover { background:var(--surface2); color:var(--text); }
        .theme-opt.active { background:var(--surface3); color:var(--text); }
        .theme-swatch { width:10px; height:10px; border-radius:50%; }

        /* Generation Modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.72); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .modal { background:var(--surface); border:1px solid var(--border2); border-radius:16px; padding:28px; width:100%; max-width:560px; display:flex; flex-direction:column; gap:18px; box-shadow:0 32px 80px rgba(0,0,0,.6); }
        .modal-title { font-family:'Instrument Serif',serif; font-size:22px; font-style:italic; }
        .modal-sub { font-size:12px; color:var(--muted2); line-height:1.6; margin-top:4px; }
        .gen-step { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--invest); font-family:'Geist Mono',monospace; padding:10px 14px; background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.2); border-radius:8px; }
        .gen-done { font-size:20px; text-align:center; padding:24px 0; color:var(--invest); font-family:'Geist Mono',monospace; }

        .loading-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:80px 40px; }
        .spinner { width:24px; height:24px; border:2px solid var(--border2); border-top-color:var(--accent2); border-radius:50%; animation:spin .7s linear infinite; }
        .spinner.green { border-top-color:var(--invest); }
        @keyframes spin { to { transform:rotate(360deg); } }
        .empty-cta { padding:60px 40px; text-align:center; }
        .empty-icon { font-size:40px; opacity:.25; margin-bottom:14px; }
        .empty-txt { font-size:13px; color:var(--muted); line-height:1.6; }
        .toast { position:fixed; bottom:24px; right:24px; z-index:500; background:var(--surface2); border:1px solid var(--border2); border-radius:8px; padding:12px 18px; font-size:13px; box-shadow:0 8px 32px rgba(0,0,0,.4); animation:slideUp .2s ease; display:flex; align-items:center; gap:8px; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info { border-color:rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width:700px) { .body { grid-template-columns:1fr; } .left-panel { display:none; } .moves-grid { grid-template-columns:1fr; } .two-col { grid-template-columns:1fr; } }
      `}</style>

      <div className="root">
        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="topbar-title">Matrice McKinsey / GE</div>
            {project && <div className="topbar-sub">{project.name}</div>}
          </div>
          <div className="topbar-right">
            <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport}/>
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>

            {/* Theme picker */}
            <div className="theme-picker">
              <button className="btn" onClick={() => setShowThemes(v => !v)}>
                {THEMES[currentTheme]?.icon} Thème
              </button>
              {showThemes && (
                <div className="theme-dropdown">
                  {Object.entries(THEMES).map(([key, t]) => (
                    <div key={key} className={`theme-opt ${currentTheme === key ? 'active' : ''}`} onClick={() => changeTheme(key)}>
                      <div className="theme-swatch" style={{ background: t.vars['--accent'] }}/>
                      {t.label}
                      {currentTheme === key && <span style={{ marginLeft:'auto', fontSize:10 }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {active && (
              <>
                <div className="view-tabs">
                  <button className={`tab-btn ${view === 'setup'  ? 'active' : ''}`} onClick={() => setView('setup')}>Configuration</button>
                  <button className={`tab-btn ${view === 'report' ? 'active' : ''}`} onClick={() => setView('report')} disabled={!aiResult && !aiLoading}>Analyse</button>
                </div>
                {view === 'report' && aiResult && <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>}
                <button className="btn ge" onClick={runAI} disabled={aiLoading || !validSbus.length}>
                  {aiLoading ? <><span className="spinner" style={{ width:14, height:14 }}/>Analyse…</> : '✦ Analyser'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="body" onClick={() => showThemes && setShowThemes(false)}>
          {/* ── Left panel ── */}
          <aside className="left-panel">
            <div className="panel-header"><span className="panel-label">Analyses ({analyses.length})</span></div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">🔷</div>
                  <div className="empty-txt">Générez ou créez votre première analyse McKinsey/GE</div>
                </div>
              )}
              {analyses.map(a => (
                <div key={a.id} className={`litem ${activeId === a.id ? 'active' : ''}`}
                  onClick={() => { setActiveId(a.id); setAiResult(a.aiResult || null); setView(a.aiResult ? 'report' : 'setup'); if (a.theme) setCurrentTheme(a.theme); if (a.aiResult) setActiveSbuR(a.sbus?.[0]?.id) }}>
                  <button className="litem-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  <div className="litem-name">
                    {a.name}
                    {a.generatedSynthese && <span className="ai-badge">✦ IA</span>}
                  </div>
                  <div className="litem-meta">
                    {new Date(a.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })} · {(a.sbus || []).filter(s => s.name).length} DAS{a.aiResult ? ' · ✓' : ''}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding:12, borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:6 }}>
              <button className="btn gen" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowGenModal(true)}>
                ✦ Générer par IA
              </button>
              {showNewForm ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                  <input className="input" placeholder="Nom de l'analyse" value={newForm.name}
                    onChange={e => setNewForm({ name: e.target.value })} onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus />
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn primary" style={{ flex:1 }} onClick={() => createAnalysis()}>Créer</button>
                    <button className="btn" onClick={() => setShowNewForm(false)}>Annuler</button>
                  </div>
                </div>
              ) : (
                <button className="btn" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowNewForm(true)}>+ Créer manuellement</button>
              )}
            </div>
          </aside>

          {/* ── Main panel ── */}
          <main className="center-panel">
            {!active ? (
              <div style={{ padding:'80px 40px', textAlign:'center' }}>
                <div style={{ fontSize:56, opacity:.15, marginBottom:20 }}>🔷</div>
                <div style={{ fontFamily:'Instrument Serif,serif', fontSize:22, fontStyle:'italic', marginBottom:12 }}>Matrice McKinsey / GE</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginBottom:28, lineHeight:1.7 }}>
                  Décrivez votre portefeuille et laissez l'IA construire la matrice,<br/>ou positionnez manuellement vos DAS.
                </div>
                <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                  <button className="btn gen" style={{ padding:'10px 20px', fontSize:13 }} onClick={() => setShowGenModal(true)}>✦ Générer par IA</button>
                  <button className="btn" style={{ padding:'10px 20px', fontSize:13 }} onClick={() => importRef.current?.click()}>↑ Importer un JSON</button>
                  <button className="btn" style={{ padding:'10px 20px', fontSize:13 }} onClick={() => setShowNewForm(true)}>+ Créer manuellement</button>
                </div>
              </div>
            ) : view === 'setup' ? (
              <>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                  <div>
                    <h2 style={{ fontFamily:'Instrument Serif,serif', fontSize:22, fontStyle:'italic' }}>{active.name}</h2>
                    {active.generatedSynthese && <p className="gen-notice" style={{ marginTop:8 }}>✦ Généré par IA — {active.generatedSynthese}</p>}
                  </div>
                  <div className="tab-strip">
                    <button className={`tab-btn ${setupTab === 'context' ? 'active' : ''}`} onClick={() => setSetupTab('context')}>Contexte</button>
                    <button className={`tab-btn ${setupTab === 'sbus'    ? 'active' : ''}`} onClick={() => setSetupTab('sbus')}>DAS ({(active.sbus||[]).length})</button>
                    <button className={`tab-btn ${setupTab === 'scoring' ? 'active' : ''}`} onClick={() => setSetupTab('scoring')}>Notation</button>
                    <button className={`tab-btn ${setupTab === 'preview' ? 'active' : ''}`} onClick={() => setSetupTab('preview')}>Aperçu</button>
                  </div>
                </div>

                {/* Context tab */}
                {setupTab === 'context' && (
                  <div className="card">
                    <div className="card-title"><div className="card-title-dot"/>Informations générales</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <label className="lbl">Nom de la société</label>
                        <input className="input" placeholder="Ex: Groupe ACME" value={active.companyName || ''} onChange={e => updateActive({ companyName: e.target.value })}/>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <label className="lbl">Secteur / Industrie</label>
                        <input className="input" placeholder="Ex: Industrie manufacturière" value={active.sector || ''} onChange={e => updateActive({ sector: e.target.value })}/>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label className="lbl">Contexte stratégique</label>
                      <textarea className="input" rows={3} placeholder="Enjeux stratégiques, objectifs de portefeuille…" value={active.context || ''} onChange={e => updateActive({ context: e.target.value })}/>
                    </div>
                    <button className="btn" style={{ alignSelf:'flex-end' }} onClick={() => setSetupTab('sbus')}>Définir les DAS →</button>
                  </div>
                )}

                {/* SBUs tab */}
                {setupTab === 'sbus' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div className="card">
                      <div className="card-title" style={{ justifyContent:'space-between' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:8 }}><div className="card-title-dot"/>DAS ({(active.sbus||[]).length})</span>
                        <button className="btn" style={{ padding:'4px 10px' }} onClick={addSbu}>+ Ajouter un DAS</button>
                      </div>
                      <div className="sbu-list">
                        {(active.sbus || []).map((sbu, i) => {
                          const { a, s, zone } = getSbuScores(sbu)
                          const zc = ZONE_COLORS[zone]
                          return (
                            <div key={sbu.id} className={`sbu-tab ${activeSbu === i ? 'active' : ''}`} onClick={() => { setActiveSbu(i); setSetupTab('scoring') }}>
                              <div className="sbu-num" style={{ color: BUBBLE_COLORS[i % BUBBLE_COLORS.length] }}>{i + 1}</div>
                              <div style={{ flex:1 }}>
                                <input className="input" style={{ background:'transparent', border:'none', padding:0, fontSize:13, fontWeight:600 }}
                                  placeholder={`DAS ${i + 1}`} value={sbu.name}
                                  onClick={e => e.stopPropagation()} onChange={e => updateSbu(i, { name: e.target.value })}/>
                                {sbu.description && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{sbu.description}</div>}
                              </div>
                              <div className="sbu-tab-scores">
                                <span className="sbu-score-mini" style={{ color: sc(a) }}>A:{a.toFixed(1)}</span>
                                <span className="sbu-score-mini" style={{ color: sc(s) }}>F:{s.toFixed(1)}</span>
                                <span className="zone-badge" style={{ background:zc.fill, color:zc.text, border:`1px solid ${zc.stroke}`, fontSize:10, padding:'2px 8px', borderRadius:10, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{zc.label}</span>
                              </div>
                              {(active.sbus||[]).length > 1 && <button className="sbu-del" onClick={e => { e.stopPropagation(); removeSbu(i) }}>✕</button>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {(active.sbus||[]).map((sbu, i) =>
                      activeSbu === i && (
                        <div key={sbu.id} className="card">
                          <div className="card-title"><div className="card-title-dot" style={{ background: BUBBLE_COLORS[i % BUBBLE_COLORS.length] }}/>Description</div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                              <label className="lbl">Description</label>
                              <textarea className="input" rows={2} placeholder="Activité, produits, marchés…" value={sbu.description || ''} onChange={e => updateSbu(i, { description: e.target.value })}/>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                              <label className="lbl">Notes</label>
                              <textarea className="input" rows={2} placeholder="Observations, signaux…" value={sbu.notes || ''} onChange={e => updateSbu(i, { notes: e.target.value })}/>
                            </div>
                          </div>
                          <button className="btn" style={{ alignSelf:'flex-end' }} onClick={() => setSetupTab('scoring')}>Notation →</button>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Scoring tab */}
                {setupTab === 'scoring' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {(active.sbus||[]).map((sbu, i) => (
                        <button key={sbu.id} onClick={() => setActiveSbu(i)}
                          style={{ padding:'6px 14px', borderRadius:8, fontSize:11, fontFamily:'Geist Mono,monospace',
                            border:`1px solid ${activeSbu === i ? BUBBLE_COLORS[i % BUBBLE_COLORS.length] + '60' : 'var(--border2)'}`,
                            background: activeSbu === i ? BUBBLE_COLORS[i % BUBBLE_COLORS.length] + '12' : 'var(--surface2)',
                            color: activeSbu === i ? BUBBLE_COLORS[i % BUBBLE_COLORS.length] : 'var(--muted2)',
                            cursor:'pointer', transition:'all .15s' }}>
                          {sbu.name || `DAS ${i + 1}`}
                        </button>
                      ))}
                    </div>
                    {currentSbu && (
                      <div className="score-editor">
                        <div className="score-editor-header">
                          <div className="score-editor-title" style={{ color: BUBBLE_COLORS[activeSbu % BUBBLE_COLORS.length] }}>
                            {currentSbu.name || `DAS ${activeSbu + 1}`}
                          </div>
                          <div className="score-type-tabs">
                            <button className={`score-type-tab ${scoreTab === 'market'   ? 'active' : ''}`} onClick={() => setScoreTab('market')}>🌐 Attractivité</button>
                            <button className={`score-type-tab ${scoreTab === 'strength' ? 'active' : ''}`} onClick={() => setScoreTab('strength')}>💪 Force</button>
                          </div>
                        </div>
                        <div className="score-list">
                          {(scoreTab === 'market' ? Object.entries(MARKET_CRITERIA) : Object.entries(STRENGTH_CRITERIA)).map(([key, meta]) => {
                            const val = (scoreTab === 'market' ? currentSbu.marketScores : currentSbu.strengthScores)?.[key] ?? 3
                            return (
                              <div key={key} className="score-row">
                                <div className="score-label-wrap">
                                  <span className="score-crit-label">{meta.label}</span>
                                  <span className="score-crit-desc">{meta.desc}</span>
                                  <span className="score-weight">Poids : {(meta.weight * 100).toFixed(0)}%</span>
                                </div>
                                <input type="range" className="cr" min={1} max={5} step={0.5} value={val}
                                  style={{ background:`linear-gradient(to right, ${sc(val)} ${((val-1)/4)*100}%, var(--surface3) 0%)` }}
                                  onChange={e => setScore(activeSbu, scoreTab === 'market' ? 'market' : 'strength', key, parseFloat(e.target.value))}/>
                                <div className="score-val-wrap">
                                  <span className="score-val" style={{ color: sc(val) }}>{val.toFixed(1)}</span>
                                  <div className="score-stars">{[1,2,3,4,5].map(n => <span key={n} className="star" style={{ color: n <= Math.round(val) ? sc(val) : 'var(--surface3)' }}>●</span>)}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {(() => {
                          const { a, s, zone } = getSbuScores(currentSbu)
                          const zc = ZONE_COLORS[zone]
                          return (
                            <div className="sbu-live-scores">
                              <div className="live-score-item"><span className="live-score-val" style={{ color: sc(a) }}>{a.toFixed(2)}</span><span className="live-score-lbl">Attractivité</span></div>
                              <div style={{ width:1, background:'var(--border)', margin:'0 4px' }}/>
                              <div className="live-score-item"><span className="live-score-val" style={{ color: sc(s) }}>{s.toFixed(2)}</span><span className="live-score-lbl">Force compét.</span></div>
                              <div style={{ width:1, background:'var(--border)', margin:'0 4px' }}/>
                              <span className="zone-badge" style={{ background:zc.fill, color:zc.text, border:`1px solid ${zc.stroke}`, padding:'5px 14px', borderRadius:20, fontFamily:'Geist Mono,monospace', fontSize:11, fontWeight:700 }}>{zc.label}</span>
                              <button className="btn ge" style={{ marginLeft:'auto' }} onClick={() => setSetupTab('preview')}>Aperçu →</button>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Preview tab */}
                {setupTab === 'preview' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    <MatrixSVG bubbles={matrixBubbles}/>
                    <div className="card">
                      <div className="card-title"><div className="card-title-dot"/>Récapitulatif DAS</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {matrixBubbles.map((b, i) => {
                          const zc = ZONE_COLORS[b.zone]
                          return (
                            <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
                              <span style={{ width:12, height:12, borderRadius:'50%', background:b.color, flexShrink:0, display:'inline-block' }}/>
                              <span style={{ fontSize:13, fontWeight:600, minWidth:140 }}>{b.name || `DAS ${i+1}`}</span>
                              <span style={{ fontSize:11, color:'var(--muted2)', fontFamily:'Geist Mono,monospace', flex:1 }}>Attractivité : <b style={{ color: sc(b.a) }}>{b.a.toFixed(2)}</b> · Force : <b style={{ color: sc(b.s) }}>{b.s.toFixed(2)}</b></span>
                              <span className="zone-badge" style={{ background:zc.fill, color:zc.text, border:`1px solid ${zc.stroke}`, padding:'3px 10px', borderRadius:10, fontFamily:'Geist Mono,monospace', fontSize:10, fontWeight:700 }}>{zc.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <button className="btn ge" style={{ alignSelf:'flex-end' }} onClick={runAI} disabled={aiLoading || !validSbus.length}>
                      {aiLoading ? <><span className="spinner" style={{ width:14, height:14 }}/>Analyse en cours…</> : '✦ Lancer l\'analyse IA McKinsey'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* ══ REPORT ══ */
              aiLoading ? (
                <div className="loading-wrap">
                  <div className="spinner" style={{ width:32, height:32 }}/>
                  <div style={{ fontSize:13, color:'var(--muted2)', fontFamily:'Geist Mono,monospace' }}>Analyse stratégique McKinsey/GE…</div>
                  <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>Évaluation des 9 zones, priorités et roadmap</div>
                </div>
              ) : aiResult ? (
                <>
                  {aiResult.portfolio_health && (
                    <div className="portfolio-header">
                      <div className="portfolio-score">
                        <div className="portfolio-score-val" style={{ color: aiResult.portfolio_health.score >= 3.5 ? '#34d399' : aiResult.portfolio_health.score >= 2.5 ? '#facc15' : '#f87171' }}>
                          {(aiResult.portfolio_health.score || 3).toFixed(1)}
                        </div>
                        <div className="portfolio-score-lbl">Santé portefeuille</div>
                        <div style={{ fontFamily:'Geist Mono,monospace', fontSize:11, color:'var(--muted2)', marginTop:6 }}>{aiResult.portfolio_health.label}</div>
                        <div className="portfolio-counts">
                          {[
                            { v: aiResult.portfolio_health.invest_count,    c:'#34d399', l:'Invest'  },
                            { v: aiResult.portfolio_health.selective_count, c:'#facc15', l:'Sélect'  },
                            { v: aiResult.portfolio_health.harvest_count,   c:'#f87171', l:'Récolte' },
                          ].map(({ v, c, l }) => (
                            <div key={l} className="portfolio-count" style={{ background:`${c}12`, border:`1px solid ${c}25` }}>
                              <span className="portfolio-count-val" style={{ color:c }}>{v}</span>
                              <span className="portfolio-count-lbl" style={{ color:c }}>{l}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ width:1, background:'var(--border)', alignSelf:'stretch', flexShrink:0 }}/>
                      <div className="portfolio-summary">{aiResult.portfolio_summary}</div>
                    </div>
                  )}

                  <div className="report-tab-strip">
                    {[
                      { id:'matrix',  label:'Matrice'    },
                      { id:'sbus',    label:'DAS'        },
                      { id:'alloc',   label:'Allocation' },
                      { id:'moves',   label:'Mouvements' },
                      { id:'roadmap', label:'Roadmap'    },
                      { id:'risks',   label:'Risques'    },
                    ].map(t => (
                      <button key={t.id} className={`report-tab ${reportTab === t.id ? 'active' : ''}`} onClick={() => setReportTab(t.id)}>{t.label}</button>
                    ))}
                  </div>

                  {reportTab === 'matrix' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                      <MatrixSVG bubbles={matrixBubbles}/>
                      {aiResult.synergies?.length > 0 && (
                        <div>
                          <div className="sec-title" style={{ marginBottom:10 }}>Synergies entre DAS <div className="sec-line"/></div>
                          <div className="info-list">
                            {aiResult.synergies.map((syn, i) => (
                              <div key={i} className="info-item"><span style={{ color:'var(--accent2)', fontSize:14, flexShrink:0 }}>⟳</span>{syn}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {reportTab === 'sbus' && (
                    <div>
                      <div className="sbu-report-tabs">
                        {(aiResult.sbus || []).map((s, i) => {
                          const zc = ZONE_COLORS[s.zone] || ZONE_COLORS.selective
                          return (
                            <button key={s.id || i} className={`sbu-report-tab ${activeSbuR === (s.id || i) ? 'active' : ''}`} onClick={() => setActiveSbuR(s.id || i)}>
                              <span className="zone-dot" style={{ background: zc.text }}/>
                              {s.name}
                              {s.strategic_priority && <span style={{ fontSize:9, fontFamily:'Geist Mono,monospace', color:'var(--muted)', padding:'1px 5px', borderRadius:4, background:'var(--surface3)' }}>#{s.strategic_priority}</span>}
                            </button>
                          )
                        })}
                      </div>
                      {activeSbuResult && (() => {
                        const zc   = ZONE_COLORS[activeSbuResult.zone] || ZONE_COLORS.selective
                        const sevC = (sev) => sev === 'Critique' ? '#f87171' : sev === 'Élevé' ? '#fb923c' : sev === 'Modéré' ? '#facc15' : '#34d399'
                        return (
                          <div className="sbu-report-card" style={{ borderColor: zc.stroke }}>
                            <div className="sbu-report-hdr">
                              <div>
                                <div className="sbu-report-name">{activeSbuResult.name}</div>
                                {activeSbuResult.timeline && <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', color:'var(--muted)', marginTop:4, display:'inline-block' }}>⏱ {activeSbuResult.timeline}</span>}
                              </div>
                              <div className="sbu-report-meta">
                                <span className="zone-badge" style={{ background:zc.fill, color:zc.text, border:`1px solid ${zc.stroke}`, padding:'5px 14px', borderRadius:20, fontFamily:'Geist Mono,monospace', fontSize:11, fontWeight:700 }}>{zc.label}</span>
                                {activeSbuResult.investment_level && <span style={{ fontSize:11, fontFamily:'Geist Mono,monospace', color:'var(--muted2)', padding:'5px 12px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--surface2)' }}>Invest : {activeSbuResult.investment_level}</span>}
                                {activeSbuResult.risk && <span style={{ fontSize:11, fontFamily:'Geist Mono,monospace', color: sevC(activeSbuResult.risk), padding:'4px 10px', borderRadius:8, border:`1px solid ${sevC(activeSbuResult.risk)}30`, background:`${sevC(activeSbuResult.risk)}10` }}>⚠ {activeSbuResult.risk}</span>}
                              </div>
                            </div>
                            <div className="sbu-report-body">
                              {activeSbuResult.analysis && <div className="analysis-box">{activeSbuResult.analysis}</div>}
                              {(activeSbuResult.strengths?.length > 0 || activeSbuResult.weaknesses?.length > 0) && (
                                <div className="two-col">
                                  <div>
                                    <div className="mini-list-title" style={{ color:'#34d399' }}>Forces</div>
                                    {(activeSbuResult.strengths||[]).map((s, i) => <div key={i} className="mini-item"><div className="mini-dot" style={{ background:'#34d399' }}/>{s}</div>)}
                                  </div>
                                  <div>
                                    <div className="mini-list-title" style={{ color:'#f87171' }}>Faiblesses</div>
                                    {(activeSbuResult.weaknesses||[]).map((s, i) => <div key={i} className="mini-item"><div className="mini-dot" style={{ background:'#f87171' }}/>{s}</div>)}
                                  </div>
                                </div>
                              )}
                              {activeSbuResult.strategic_options?.length > 0 && (
                                <div>
                                  <div className="sec-title" style={{ marginBottom:8 }}>Options stratégiques <div className="sec-line"/></div>
                                  <div className="options-list">
                                    {activeSbuResult.strategic_options.map((o, i) => <div key={i} className="option-item"><span className="opt-num">#{i+1}</span>{o}</div>)}
                                  </div>
                                </div>
                              )}
                              {activeSbuResult.kpis?.length > 0 && (
                                <div>
                                  <div className="sec-title" style={{ marginBottom:8 }}>KPIs <div className="sec-line"/></div>
                                  <div className="kpi-row">{activeSbuResult.kpis.map((k, i) => <span key={i} className="kpi-chip">{k}</span>)}</div>
                                </div>
                              )}
                              {activeSbuResult.risk_factors?.length > 0 && (
                                <div>
                                  <div className="sec-title" style={{ marginBottom:8 }}>Facteurs de risque <div className="sec-line"/></div>
                                  <div className="info-list">
                                    {activeSbuResult.risk_factors.map((r, i) => <div key={i} className="info-item" style={{ borderColor:'rgba(248,113,113,.15)' }}><span style={{ color:'#f87171', flexShrink:0 }}>⚠</span>{r}</div>)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {reportTab === 'alloc' && aiResult.resource_allocation?.length > 0 && (
                    <div>
                      <div className="sec-title" style={{ marginBottom:12 }}>Allocation des ressources <div className="sec-line"/></div>
                      <div className="alloc-list">
                        {[...aiResult.resource_allocation].sort((a, b) => (a.budget_priority || 0) - (b.budget_priority || 0)).map((a, i) => (
                          <div key={i} className="alloc-item">
                            <div className="alloc-num">#{a.budget_priority || i+1}</div>
                            <div className="alloc-name">{a.sbu_name}</div>
                            <div className="alloc-rationale">{a.rationale}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reportTab === 'moves' && aiResult.portfolio_moves?.length > 0 && (
                    <div>
                      <div className="sec-title" style={{ marginBottom:12 }}>Mouvements stratégiques <div className="sec-line"/></div>
                      <div className="moves-grid">
                        {aiResult.portfolio_moves.map((m, i) => {
                          const impC = m.impact === 'Fort' ? '#34d399' : m.impact === 'Modéré' ? '#facc15' : '#9896aa'
                          return (
                            <div key={i} className="move-card">
                              <span className="move-type">{m.type}</span>
                              <div className="move-title">{m.title}</div>
                              <div className="move-desc">{m.description}</div>
                              <div className="move-tags">
                                {m.impact  && <span className="move-tag" style={{ color:impC }}>Impact : {m.impact}</span>}
                                {m.urgency && <span className="move-tag">⏱ {m.urgency}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {reportTab === 'roadmap' && aiResult.roadmap?.length > 0 && (
                    <div>
                      <div className="sec-title" style={{ marginBottom:12 }}>Roadmap stratégique <div className="sec-line"/></div>
                      <div className="roadmap-list">
                        {aiResult.roadmap.map((r, i) => (
                          <div key={i} className="roadmap-item">
                            <div className="roadmap-hdr">{r.horizon}</div>
                            <div className="roadmap-milestones">
                              {(r.milestones||[]).map((ms, j) => <div key={j} className="roadmap-ms"><div className="ms-dot"/>{ms}</div>)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {aiResult.conclusion && (
                        <div style={{ marginTop:16 }}>
                          <div className="sec-title" style={{ marginBottom:10 }}>Conclusion <div className="sec-line"/></div>
                          <div className="conclusion-box">{aiResult.conclusion}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {reportTab === 'risks' && aiResult.risks?.length > 0 && (
                    <div>
                      <div className="sec-title" style={{ marginBottom:12 }}>Risques portefeuille <div className="sec-line"/></div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {aiResult.risks.map((r, i) => {
                          const sevC = r.severity === 'Critique' ? '#f87171' : r.severity === 'Élevé' ? '#fb923c' : r.severity === 'Modéré' ? '#facc15' : '#34d399'
                          return (
                            <div key={i} className="risk-row">
                              <span className="risk-sev" style={{ background:`${sevC}12`, color:sevC, border:`1px solid ${sevC}30` }}>{r.severity}</span>
                              <div className="risk-body">
                                <div className="risk-title">{r.risk}</div>
                                <div className="risk-mit">Mitigation : {r.mitigation}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-cta">
                  <div className="empty-icon">🔷</div>
                  <div className="empty-txt">Notez vos DAS puis lancez l'analyse IA</div>
                </div>
              )
            )}
          </main>
        </div>

        {/* ── AI Generation Modal ── */}
        {showGenModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !genLoading) setShowGenModal(false) }}>
            <div className="modal">
              <div>
                <div className="modal-title">✦ Générer la matrice par IA</div>
                <div className="modal-sub">
                  Décrivez votre portefeuille d'activités. Claude va identifier vos DAS, estimer leurs scores d'attractivité et de force compétitive, puis les positionner sur la matrice McKinsey/GE.
                </div>
              </div>

              {genStep === 'done' ? (
                <div className="gen-done">✓ Matrice générée avec succès</div>
              ) : (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label className="lbl">Nom de l'analyse *</label>
                    <input className="input" placeholder="Ex: Portefeuille 2026 — Groupe ACME" value={genAnalysisName}
                      onChange={e => setGenAnalysisName(e.target.value)} disabled={genLoading} autoFocus/>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label className="lbl">Description du portefeuille *</label>
                    <textarea className="input" style={{ minHeight:140, resize:'vertical' }}
                      placeholder={`Exemples :\n• "Groupe industriel avec 4 activités : fabrication d'emballages (leader, marché mature), logistique (croissance forte), recyclage (émergent) et conseil en supply chain (niche).\n• "Startup tech avec un SaaS RH dominant, une marketplace formation en lancement et un outil analytics en R&D."`}
                      value={genDescription} onChange={e => setGenDescription(e.target.value)} disabled={genLoading}/>
                  </div>
                  {genLoading && (
                    <div className="gen-step">
                      <span className="spinner green" style={{ width:14, height:14, borderWidth:2 }}/>
                      Claude identifie vos DAS et calcule leurs positions…
                    </div>
                  )}
                  <div style={{ display:'flex', gap:10 }}>
                    <button className="btn gen" style={{ flex:1, padding:'10px 0', justifyContent:'center', fontSize:13 }}
                      onClick={handleGenerate} disabled={genLoading || !genDescription.trim() || !genAnalysisName.trim()}>
                      {genLoading ? 'Génération en cours…' : '✦ Générer la matrice'}
                    </button>
                    <button className="btn" style={{ padding:'10px 16px' }} onClick={() => { if (!genLoading) setShowGenModal(false) }} disabled={genLoading}>
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {toast && <div className={`toast ${toast.type || ''}`}>{toast.type === 'error' ? '✕' : '✓'} {toast.msg}</div>}
      </div>
    </>
  )
}