'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid    = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// 6M categories (classic Ishikawa)
const BONES = [
  { id: 'man',      label: 'Main d\'œuvre', short: 'Homme',    color: '#6366f1', icon: '◈', side: 'top',    desc: 'Personnel, compétences, formation, comportement' },
  { id: 'machine',  label: 'Machine',       short: 'Machine',  color: '#f59e0b', icon: '◉', side: 'top',    desc: 'Équipements, outils, maintenance, technologie' },
  { id: 'material', label: 'Matière',       short: 'Matière',  color: '#22d3a5', icon: '⬡', side: 'top',    desc: 'Matières premières, composants, fournitures' },
  { id: 'method',   label: 'Méthode',       short: 'Méthode',  color: '#f87171', icon: '⬠', side: 'bottom', desc: 'Procédures, processus, instructions, standards' },
  { id: 'milieu',   label: 'Milieu',        short: 'Milieu',   color: '#818cf8', icon: '◎', side: 'bottom', desc: 'Environnement, conditions, lieu de travail' },
  { id: 'measure',  label: 'Mesure',        short: 'Mesure',   color: '#4ade80', icon: '⊟', side: 'bottom', desc: 'Contrôle, métriques, inspection, calibration' },
]

const PRIORITY = {
  high:   { label: 'Priorité haute',   color: '#f87171', bg: 'rgba(248,113,113,.1)' },
  medium: { label: 'Priorité moyenne', color: '#f59e0b', bg: 'rgba(245,158,11,.1)'  },
  low:    { label: 'Priorité faible',  color: '#22d3a5', bg: 'rgba(34,211,165,.1)'  },
}

const EMPTY_CAUSE = { text: '', priority: 'medium', subcauses: [] }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IshikawaPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const svgRef       = useRef(null)

  const [project,      setProject]      = useState(null)
  const [analyses,     setAnalyses]     = useState([])
  const [activeId,     setActiveId]     = useState(null)
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [newAnalysis,  setNewAnalysis]  = useState({ problem: '', context: '', impact: '' })

  // Active tool tab
  const [activeTool,   setActiveTool]   = useState('ishikawa')  // 'ishikawa' | '5why'

  // Ishikawa state
  const [activeBone,   setActiveBone]   = useState(null)
  const [causeForm,    setCauseForm]    = useState({ boneId: '', causeIdx: null, subIdx: null, text: '', priority: 'medium' })
  const [showCauseForm, setShowCauseForm] = useState(false)
  const [hoveredBone,  setHoveredBone]  = useState(null)

  // 5 Whys state
  const [activeWhy,    setActiveWhy]    = useState(null)  // why chain id
  const [whyForm,      setWhyForm]      = useState({ text: '' })
  const [showWhyForm,  setShowWhyForm]  = useState(false)
  const [editWhyIdx,   setEditWhyIdx]   = useState(null)

  // AI
  const [aiLoading,      setAiLoading]      = useState(false)
  const [genLoading,     setGenLoading]      = useState(false)  // generate mode spinner
  const [aiResult,       setAiResult]       = useState(null)
  const [showAiPanel,    setShowAiPanel]     = useState(false)

  // Generate mode modal
  const [showGenModal,   setShowGenModal]    = useState(false)
  const [genContext,     setGenContext]      = useState('')
  const [genResume,      setGenResume]       = useState('')    // resume returned after generation

  const [toast,        setToast]        = useState(null)
  const importRef = useRef(null)

  // ── Load ──
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.ISHIKAWA || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          setAiResult(last.aiResult || null)
        }
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
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), ISHIKAWA: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const active = analyses.find(a => a.id === activeId) || null

  const updateActive = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated); persist(updated)
  }

  // ── CRUD analyses ──
  const createAnalysis = () => {
    if (!newAnalysis.problem.trim()) return
    const a = {
      id: uid(),
      problem:   newAnalysis.problem.trim(),
      context:   newAnalysis.context.trim(),
      impact:    newAnalysis.impact.trim(),
      createdAt: new Date().toISOString(),
      bones:     Object.fromEntries(BONES.map(b => [b.id, []])),   // { boneId: [cause] }
      whyChains: [],  // [{ id, title, steps: [{ id, why, because }] }]
      aiResult:  null,
    }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowNewForm(false); setNewAnalysis({ problem: '', context: '', impact: '' })
    showToast('Analyse créée')
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) setActiveId(updated[updated.length - 1]?.id || null)
    showToast('Analyse supprimée', 'info')
  }

  // ── Ishikawa: causes ──
  const getBoneCauses = (boneId) => active?.bones?.[boneId] || []

  const saveCause = () => {
    if (!causeForm.text.trim()) return
    const { boneId, causeIdx, subIdx, text, priority } = causeForm
    const bones = { ...(active.bones || {}) }
    const causes = [...(bones[boneId] || [])]

    if (causeIdx === null) {
      // New root cause
      causes.push({ id: uid(), text: text.trim(), priority, subcauses: [] })
    } else if (subIdx === null) {
      // Edit root cause
      causes[causeIdx] = { ...causes[causeIdx], text: text.trim(), priority }
    } else if (subIdx === -1) {
      // New subcause
      const subs = [...(causes[causeIdx].subcauses || []), { id: uid(), text: text.trim(), priority }]
      causes[causeIdx] = { ...causes[causeIdx], subcauses: subs }
    } else {
      // Edit subcause
      const subs = [...(causes[causeIdx].subcauses || [])]
      subs[subIdx] = { ...subs[subIdx], text: text.trim(), priority }
      causes[causeIdx] = { ...causes[causeIdx], subcauses: subs }
    }

    bones[boneId] = causes
    updateActive({ bones })
    setShowCauseForm(false)
    setCauseForm({ boneId: '', causeIdx: null, subIdx: null, text: '', priority: 'medium' })
    showToast('Cause enregistrée')
  }

  const deleteCause = (boneId, causeIdx, subIdx = null) => {
    const bones  = { ...(active.bones || {}) }
    const causes = [...(bones[boneId] || [])]
    if (subIdx === null) {
      causes.splice(causeIdx, 1)
    } else {
      const subs = [...(causes[causeIdx].subcauses || [])]
      subs.splice(subIdx, 1)
      causes[causeIdx] = { ...causes[causeIdx], subcauses: subs }
    }
    bones[boneId] = causes
    updateActive({ bones })
  }

  const openCauseForm = (boneId, causeIdx = null, subIdx = null, defaults = {}) => {
    setCauseForm({ boneId, causeIdx, subIdx, text: defaults.text || '', priority: defaults.priority || 'medium' })
    setShowCauseForm(true)
  }

  // ── 5 Whys: chains ──
  const createWhyChain = () => {
    if (!active) return
    const chain = { id: uid(), title: `Chaîne ${(active.whyChains||[]).length + 1}`, steps: [] }
    updateActive({ whyChains: [...(active.whyChains || []), chain] })
    setActiveWhy(chain.id)
    showToast('Chaîne 5 Pourquoi créée')
  }

  const deleteWhyChain = (id) => {
    updateActive({ whyChains: (active.whyChains || []).filter(c => c.id !== id) })
    if (activeWhy === id) setActiveWhy(null)
  }

  const addWhyStep = (chainId) => {
    const chain = (active.whyChains || []).find(c => c.id === chainId)
    if (!chain || chain.steps.length >= 5) return
    const step = { id: uid(), why: '', because: '' }
    const updated = (active.whyChains || []).map(c =>
      c.id === chainId ? { ...c, steps: [...c.steps, step] } : c
    )
    updateActive({ whyChains: updated })
  }

  const updateWhyStep = (chainId, stepId, field, value) => {
    const updated = (active.whyChains || []).map(c => {
      if (c.id !== chainId) return c
      return { ...c, steps: c.steps.map(s => s.id === stepId ? { ...s, [field]: value } : s) }
    })
    updateActive({ whyChains: updated })
  }

  const deleteWhyStep = (chainId, stepId) => {
    const updated = (active.whyChains || []).map(c => {
      if (c.id !== chainId) return c
      return { ...c, steps: c.steps.filter(s => s.id !== stepId) }
    })
    updateActive({ whyChains: updated })
  }

  const updateChainTitle = (chainId, title) => {
    const updated = (active.whyChains || []).map(c => c.id === chainId ? { ...c, title } : c)
    updateActive({ whyChains: updated })
  }

  // ── Stats ──
  const totalCauses = active ? Object.values(active.bones || {}).reduce((s, arr) => {
    return s + arr.length + arr.reduce((ss, c) => ss + (c.subcauses?.length || 0), 0)
  }, 0) : 0

  const highPriority = active ? Object.values(active.bones || {}).reduce((s, arr) => {
    return s + arr.filter(c => c.priority === 'high').length +
      arr.reduce((ss, c) => ss + (c.subcauses || []).filter(sc => sc.priority === 'high').length, 0)
  }, 0) : 0

  const totalChains = active?.whyChains?.length || 0
  const completedChains = (active?.whyChains || []).filter(c => c.steps.length >= 5 && c.steps.every(s => s.because.trim())).length

  // ── Export (single analysis) ──
  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ version: 1, type: 'ishikawa', exportedAt: new Date().toISOString(), analysis: active }, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `Ishikawa_${active.problem.slice(0, 30).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('Export réussi')
  }

  // ── Import ──
  const importAnalysis = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw  = JSON.parse(ev.target.result)
        // Support both wrapped {analysis:...} and bare analysis object
        const data = raw.analysis || raw
        if (!data.problem) throw new Error('Format invalide')
        // Merge into current project analyses (give a new id to avoid collision)
        const imported = { ...data, id: uid(), importedAt: new Date().toISOString() }
        const updated  = [...analyses, imported]
        setAnalyses(updated); setActiveId(imported.id); persist(updated)
        setAiResult(imported.aiResult || null)
        showToast(`Analyse "${imported.problem.slice(0, 30)}" importée`)
      } catch { showToast('Fichier invalide ou format non reconnu', 'error') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── MODE 1 : Generate — IA peuple tout automatiquement ──
  const runGenerate = async () => {
    if (!active) return
    setGenLoading(true)
    setShowGenModal(false)
    try {
      const res  = await fetch('/api/generer-management/generer-ishikawa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:        'generate',
          problem:     active.problem,
          context:     genContext.trim() || active.context,
          impact:      active.impact,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
          nbWhyChains: 2,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      // Populate bones, whyChains, and resume
      updateActive({
        bones:     data.data.bones,
        whyChains: data.data.whyChains,
        aiGenResume: data.data.resume,
      })
      setGenResume(data.data.resume || '')
      setGenContext('')
      showToast('Diagramme généré par l\'IA ✦')
    } catch (err) { showToast(err.message, 'error') }
    setGenLoading(false)
  }

  // ── MODE 2 : Analyze — IA analyse l'existant ──
  const runAI = async () => {
    if (!totalCauses && !totalChains) { showToast('Ajoutez des causes ou des pourquoi d\'abord', 'error'); return }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res  = await fetch('/api/generer-ishikawa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode:        'analyze',
          problem:     active.problem,
          context:     active.context,
          impact:      active.impact,
          bones:       active.bones,
          whyChains:   active.whyChains,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateActive({ aiResult: data.result })
      showToast('Analyse IA terminée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── SVG Fishbone diagram ──
  const FishboneSVG = () => {
    const W = 900, H = 420
    const spineY  = H / 2
    const headX   = W - 80
    const tailX   = 60
    const topBones    = BONES.filter(b => b.side === 'top')
    const bottomBones = BONES.filter(b => b.side === 'bottom')

    // Spine segments for bones attachment
    const spineLen = headX - tailX - 60
    const topAttach    = topBones.map((_, i)    => tailX + 80 + (i + 1) * (spineLen / (topBones.length + 1)))
    const bottomAttach = bottomBones.map((_, i) => tailX + 80 + (i + 1) * (spineLen / (bottomBones.length + 1)))
    const boneLen = 120
    const boneAngle = 40 // degrees

    return (
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: 400, display: 'block' }}
        xmlns="http://www.w3.org/2000/svg">

        {/* Background */}
        <rect width={W} height={H} fill="var(--surface)" rx="12"/>
        <rect width={W} height={H} fill="none" stroke="var(--border)" strokeWidth="1" rx="12"/>

        {/* Title */}
        <text x={tailX} y={22} fill="rgba(255,255,255,.3)" fontSize="11" fontFamily="Geist Mono,monospace">
          Diagramme d&apos;Ishikawa
        </text>

        {/* Main spine */}
        <line x1={tailX} y1={spineY} x2={headX - 20} y2={spineY} stroke="rgba(255,255,255,.2)" strokeWidth="3" strokeLinecap="round"/>

        {/* Arrow head */}
        <polygon points={`${headX - 20},${spineY - 10} ${headX + 10},${spineY} ${headX - 20},${spineY + 10}`} fill="rgba(255,255,255,.25)"/>

        {/* Problem box */}
        <rect x={headX - 10} y={spineY - 28} width={110} height={56} rx="8"
          fill={active?.problem ? '#1a1a2e' : 'var(--surface2)'} stroke="rgba(99,102,241,.5)" strokeWidth="1.5"/>
        <text x={headX + 45} y={spineY - 8} textAnchor="middle" fill="#818cf8" fontSize="9" fontFamily="Geist Mono,monospace" fontWeight="700" letterSpacing=".06em">
          PROBLÈME
        </text>
        {active?.problem && (
          <foreignObject x={headX - 4} y={spineY - 2} width={98} height={36}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 9, color: '#e0e0f5', lineHeight: 1.4, padding: '2px 4px', wordBreak: 'break-word', textAlign: 'center', fontFamily: 'Syne,sans-serif', fontWeight: 600 }}>
              {active.problem.slice(0, 50)}{active.problem.length > 50 ? '…' : ''}
            </div>
          </foreignObject>
        )}

        {/* Top bones */}
        {topBones.map((bone, i) => {
          const ax   = topAttach[i]
          const rad  = (180 - boneAngle) * Math.PI / 180
          const bx   = ax + boneLen * Math.cos(rad)
          const by   = spineY - boneLen * Math.sin(boneAngle * Math.PI / 180)
          const causes = getBoneCauses(bone.id)
          const isHov  = hoveredBone === bone.id

          return (
            <g key={bone.id} onClick={() => { setActiveBone(bone.id); setHoveredBone(bone.id) }}
              style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredBone(bone.id)} onMouseLeave={() => setHoveredBone(null)}>
              {/* Bone line */}
              <line x1={ax} y1={spineY} x2={bx} y2={by} stroke={isHov ? bone.color : bone.color + '70'} strokeWidth={isHov ? 2.5 : 1.5} strokeLinecap="round"/>
              {/* Label */}
              <rect x={bx - 38} y={by - 20} width={76} height={20} rx="4" fill={isHov ? bone.color + '25' : bone.color + '12'} stroke={isHov ? bone.color + '60' : bone.color + '30'}/>
              <text x={bx} y={by - 7} textAnchor="middle" fill={bone.color} fontSize="10" fontWeight="700" fontFamily="Geist Mono,monospace">{bone.short}</text>
              {/* Cause count badge */}
              {causes.length > 0 && (
                <circle cx={bx + 34} cy={by - 10} r="8" fill={bone.color}/>
              )}
              {causes.length > 0 && (
                <text x={bx + 34} y={by - 7} textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="Geist Mono,monospace">{causes.length}</text>
              )}
              {/* Cause ticks along bone */}
              {causes.slice(0, 4).map((cause, ci) => {
                const t   = (ci + 1) / 5
                const cx2 = ax + (bx - ax) * t
                const cy2 = spineY + (by - spineY) * t
                const px  = PRIORITY[cause.priority]
                return (
                  <g key={cause.id}>
                    <circle cx={cx2} cy={cy2} r="5" fill={px.color} stroke="var(--surface)" strokeWidth="1.5"/>
                    <text x={cx2} y={cy2 - 8} textAnchor="middle" fill={px.color} fontSize="8" fontFamily="Syne,sans-serif"
                      style={{ opacity: 0.85 }}>
                      {cause.text.slice(0, 10)}{cause.text.length > 10 ? '…' : ''}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Bottom bones */}
        {bottomBones.map((bone, i) => {
          const ax   = bottomAttach[i]
          const rad  = boneAngle * Math.PI / 180
          const bx   = ax + boneLen * Math.cos(rad)
          const by   = spineY + boneLen * Math.sin(rad)
          const causes = getBoneCauses(bone.id)
          const isHov  = hoveredBone === bone.id

          return (
            <g key={bone.id} onClick={() => { setActiveBone(bone.id); setHoveredBone(bone.id) }}
              style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredBone(bone.id)} onMouseLeave={() => setHoveredBone(null)}>
              <line x1={ax} y1={spineY} x2={bx} y2={by} stroke={isHov ? bone.color : bone.color + '70'} strokeWidth={isHov ? 2.5 : 1.5} strokeLinecap="round"/>
              <rect x={bx - 38} y={by} width={76} height={20} rx="4" fill={isHov ? bone.color + '25' : bone.color + '12'} stroke={isHov ? bone.color + '60' : bone.color + '30'}/>
              <text x={bx} y={by + 13} textAnchor="middle" fill={bone.color} fontSize="10" fontWeight="700" fontFamily="Geist Mono,monospace">{bone.short}</text>
              {causes.length > 0 && (
                <circle cx={bx + 34} cy={by + 10} r="8" fill={bone.color}/>
              )}
              {causes.length > 0 && (
                <text x={bx + 34} y={by + 13} textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="Geist Mono,monospace">{causes.length}</text>
              )}
              {causes.slice(0, 4).map((cause, ci) => {
                const t   = (ci + 1) / 5
                const cx2 = ax + (bx - ax) * t
                const cy2 = spineY + (by - spineY) * t
                const px  = PRIORITY[cause.priority]
                return (
                  <g key={cause.id}>
                    <circle cx={cx2} cy={cy2} r="5" fill={px.color} stroke="var(--surface)" strokeWidth="1.5"/>
                    <text x={cx2} y={cy2 + 14} textAnchor="middle" fill={px.color} fontSize="8" fontFamily="Syne,sans-serif" style={{ opacity: 0.85 }}>
                      {cause.text.slice(0, 10)}{cause.text.length > 10 ? '…' : ''}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    )
  }

  // ── 5 Whys chain view ──
  const WhyChainView = ({ chain }) => {
    const isActive = activeWhy === chain.id
    return (
      <div style={{ background: 'var(--surface)', border: `1px solid ${isActive ? 'rgba(99,102,241,.3)' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color .15s' }}>
        {/* Chain header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: isActive ? 'rgba(99,102,241,.06)' : 'transparent' }}
          onClick={() => setActiveWhy(isActive ? null : chain.id)}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent2)', fontFamily: 'Geist Mono,monospace' }}>
            5W
          </div>
          <input
            value={chain.title}
            onChange={e => updateChainTitle(chain.id, e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'Syne,sans-serif' }}
          />
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace' }}>{chain.steps.length}/5 étapes</span>
          <button style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 13 }}
            onClick={e => { e.stopPropagation(); deleteWhyChain(chain.id) }}>✕</button>
          <span style={{ fontSize: 10, color: 'var(--muted)', transition: 'transform .2s', transform: isActive ? 'rotate(90deg)' : 'none' }}>▶</span>
        </div>

        {isActive && (
          <div style={{ padding: '16px' }}>
            {/* Problem echo */}
            <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#f87171', fontWeight: 600 }}>
              🔴 Problème : {active?.problem || '—'}
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {chain.steps.map((step, idx) => (
                <div key={step.id} style={{ display: 'flex', gap: 0, position: 'relative' }}>
                  {/* Connector line */}
                  {idx < chain.steps.length - 1 && (
                    <div style={{ position: 'absolute', left: 20, top: 40, width: 2, height: 'calc(100% - 8px)', background: 'var(--border2)', zIndex: 0 }}/>
                  )}

                  {/* Step number */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 12, zIndex: 1 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(99,102,241,${0.15 + idx * 0.08})`, border: '1px solid rgba(99,102,241,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent2)', fontFamily: 'Geist Mono,monospace' }}>#{idx + 1}</span>
                    </div>
                  </div>

                  {/* Step content */}
                  <div style={{ flex: 1, paddingBottom: 16 }}>
                    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--accent2)', fontFamily: 'Geist Mono,monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                        Pourquoi #{idx + 1}
                      </div>
                      <input
                        className="why-inp"
                        placeholder={`Pourquoi ${idx === 0 ? 'le problème existe-t-il ?' : `cela se produit-il (cause #${idx}) ?`}`}
                        value={step.why}
                        onChange={e => updateWhyStep(chain.id, step.id, 'why', e.target.value)}
                        style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: 12, outline: 'none', width: '100%', fontFamily: 'Syne,sans-serif', transition: 'border-color .15s' }}
                      />
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace' }}>Parce que…</div>
                      <textarea
                        placeholder="Réponse / cause identifiée"
                        value={step.because}
                        onChange={e => updateWhyStep(chain.id, step.id, 'because', e.target.value)}
                        rows={2}
                        style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: 12, outline: 'none', width: '100%', fontFamily: 'Syne,sans-serif', resize: 'vertical', transition: 'border-color .15s' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <button onClick={() => deleteWhyStep(chain.id, step.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11, fontFamily: 'Geist Mono,monospace' }}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Root cause display */}
            {chain.steps.length > 0 && chain.steps[chain.steps.length - 1].because.trim() && (
              <div style={{ padding: '12px 14px', background: 'rgba(34,211,165,.06)', border: '1px solid rgba(34,211,165,.25)', borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#22d3a5', fontFamily: 'Geist Mono,monospace', fontWeight: 700, marginBottom: 4 }}>★ CAUSE RACINE IDENTIFIÉE</div>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>{chain.steps[chain.steps.length - 1].because}</div>
              </div>
            )}

            {/* Add step button */}
            {chain.steps.length < 5 && (
              <button onClick={() => addWhyStep(chain.id)}
                style={{ width: '100%', padding: '10px', border: '1px dashed var(--border2)', borderRadius: 8, background: 'transparent', color: 'var(--muted2)', fontSize: 12, cursor: 'pointer', fontFamily: 'Geist Mono,monospace', transition: 'all .15s' }}>
                + Ajouter Pourquoi #{chain.steps.length + 1}
              </button>
            )}
            {chain.steps.length >= 5 && (
              <div style={{ textAlign: 'center', fontSize: 11, color: '#22d3a5', fontFamily: 'Geist Mono,monospace', padding: '8px' }}>
                ✓ 5 niveaux atteints — cause racine identifiée
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const currentBone = BONES.find(b => b.id === activeBone)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --bg:#0a0a0f; --surface:#111118; --surface2:#18181f; --surface3:#1e1e28;
          --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.12);
          --text:#f0eff5; --muted:#6b6a7a; --muted2:#9896aa;
          --accent:#6366f1; --accent2:#818cf8;
        }
        body { background:var(--bg); color:var(--text); font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

        .root { min-height:100vh; display:flex; flex-direction:column; }

        .topbar { height:56px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 20px; gap:12px; position:sticky; top:0; z-index:100; }
        .back-btn { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Geist Mono',monospace; font-size:11px; cursor:pointer; transition:all .15s; }
        .back-btn:hover { color:var(--text); }
        .topbar-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .topbar-sub { font-size:11px; color:var(--muted); font-family:'Geist Mono',monospace; }
        .topbar-right { margin-left:auto; display:flex; gap:8px; align-items:center; }
        .btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .btn:hover { color:var(--text); border-color:rgba(255,255,255,.2); }
        .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
        .btn.primary:hover { background:#4f52d8; }
        .btn.ai { background:rgba(34,211,165,.08); border-color:rgba(34,211,165,.25); color:#22d3a5; }
        .btn.ai:hover { background:rgba(34,211,165,.15); }
        .btn.tab-active { background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.3); color:var(--accent2); }
        .btn:disabled { opacity:.4; cursor:not-allowed; }

        .body { flex:1; display:grid; grid-template-columns:240px 1fr; height:calc(100vh - 56px); overflow:hidden; }

        .left-panel { background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
        .panel-hd { padding:14px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .panel-label { font-size:10px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
        .panel-list { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:2px; }
        .a-item { padding:10px 12px; border-radius:8px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
        .a-item:hover { background:var(--surface2); }
        .a-item.active { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.25); }
        .a-name { font-size:12px; font-weight:600; color:var(--text); display:flex; align-items:center; justify-content:space-between; }
        .a-del { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:12px; }
        .a-item:hover .a-del { opacity:1; }
        .a-meta { font-size:10px; color:var(--muted); font-family:'Geist Mono',monospace; margin-top:2px; }
        .new-form { padding:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px; }
        .inp { width:100%; background:var(--bg); border:1px solid var(--border2); border-radius:6px; padding:8px 10px; font-family:'Syne',sans-serif; font-size:12px; color:var(--text); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:var(--accent); }
        .inp::placeholder { color:var(--muted); }
        textarea.inp { resize:vertical; }
        .form-label { display:block; font-size:10px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; margin-bottom:5px; font-family:'Geist Mono',monospace; }

        .main { overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:16px; }

        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:12px 14px; }
        .stat-val { font-size:24px; font-weight:800; font-family:'Geist Mono',monospace; }
        .stat-lbl { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; margin-top:3px; font-family:'Geist Mono',monospace; }

        .tool-tabs { display:flex; gap:6px; }
        .tool-tab { padding:8px 18px; border-radius:8px; cursor:pointer; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); font-size:12px; font-weight:600; transition:all .15s; display:flex; align-items:center; gap:7px; }
        .tool-tab.active { background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.3); color:var(--accent2); }
        .tool-tab:hover:not(.active) { color:var(--text); }

        /* Bones panel */
        .bones-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .bone-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px; cursor:pointer; transition:all .2s; }
        .bone-card:hover { transform:translateY(-1px); }
        .bone-card.selected { border-width:1.5px; }
        .bone-header { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
        .bone-letter { width:30px; height:30px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; font-family:'Geist Mono',monospace; }
        .bone-name { font-size:12px; font-weight:700; }
        .bone-count { font-size:10px; font-family:'Geist Mono',monospace; margin-left:auto; }
        .cause-pill { display:inline-flex; align-items:center; gap:4px; padding:'3px 8px'; border-radius:99px; font-size:10px; margin:2px; }

        /* Cause list */
        .cause-list { display:flex; flex-direction:column; gap:6px; }
        .cause-item { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:10px 12px; transition:border-color .15s; }
        .cause-item:hover { border-color:var(--border2); }
        .cause-row { display:flex; align-items:center; gap:8px; }
        .cause-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .cause-text { font-size:12px; font-weight:600; flex:1; }
        .cause-actions { display:flex; gap:3px; }
        .icon-btn { width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:11px; color:var(--muted2); transition:all .15s; }
        .icon-btn:hover { background:var(--surface3); color:var(--text); }
        .subcause-item { padding:6px 10px; background:var(--surface3); border-radius:5px; display:flex; align-items:center; gap:7px; margin-top:5px; }
        .subcause-text { font-size:11px; color:var(--muted2); flex:1; }

        /* Modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.78); z-index:200; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
        .modal { background:var(--surface); border:1px solid var(--border2); border-radius:16px; padding:24px; width:100%; max-width:460px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,.5); }
        .modal-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; margin-bottom:16px; }
        .form-group { margin-bottom:14px; }
        .seg-group { display:flex; gap:5px; flex-wrap:wrap; }
        .seg-btn { padding:6px 12px; border-radius:6px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--border2); background:var(--surface2); color:var(--muted2); transition:all .15s; }
        .seg-btn.sel { background:rgba(99,102,241,.15); border-color:rgba(99,102,241,.35); color:var(--accent2); }
        .modal-actions { display:flex; gap:8px; margin-top:16px; }
        .btn-full { flex:1; padding:10px; border-radius:8px; cursor:pointer; background:var(--accent); border:none; color:#fff; font-family:'Syne',sans-serif; font-size:13px; font-weight:600; }
        .btn-full:hover { background:#4f52d8; }
        .btn-cancel { padding:10px 16px; border-radius:8px; cursor:pointer; background:var(--surface2); border:1px solid var(--border2); color:var(--muted2); font-family:'Syne',sans-serif; font-size:13px; }

        /* AI Panel */
        .ai-panel { position:fixed; right:0; top:56px; bottom:0; width:420px; background:var(--surface); border-left:1px solid var(--border); z-index:80; display:flex; flex-direction:column; overflow:hidden; transform:translateX(100%); transition:transform .3s ease; }
        .ai-panel.open { transform:translateX(0); }
        .ai-panel-hd { padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
        .ai-panel-title { font-family:'Instrument Serif',serif; font-size:18px; font-style:italic; }
        .ai-content { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
        .ai-slbl { font-size:10px; color:var(--muted2); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:8px; }
        .ai-block { background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:14px; font-size:13px; color:var(--text); line-height:1.7; }
        .ai-cause-card { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; gap:10px; }
        .ai-priority-item { display:flex; gap:10px; padding:8px 12px; background:var(--surface2); border:1px solid var(--border); border-radius:6px; }
        .ai-num { font-family:'Geist Mono',monospace; font-size:10px; color:var(--muted); min-width:20px; padding-top:2px; }
        .spinner { width:18px; height:18px; border:2px solid var(--border2); border-top-color:#22d3a5; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg);} }
        .toast { position:fixed; bottom:24px; right:24px; z-index:500; background:var(--surface2); border:1px solid var(--border2); border-radius:8px; padding:12px 18px; font-size:13px; box-shadow:0 8px 32px rgba(0,0,0,.4); animation:slideUp .2s ease; display:flex; align-items:center; gap:8px; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info { border-color:rgba(99,102,241,.3); }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        .why-inp:focus { border-color:var(--accent) !important; }
        @media(max-width:900px){ .body{grid-template-columns:1fr;} .left-panel{display:none;} .stats-row{grid-template-columns:repeat(2,1fr);} .bones-grid{grid-template-columns:repeat(2,1fr);} }
      `}</style>

      <div className="root">

        {/* Topbar */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="topbar-title">Ishikawa + 5 Pourquoi</div>
            {project && <div className="topbar-sub">{project.name}</div>}
          </div>
          <div className="topbar-right">
            <button className="btn" onClick={() => importRef.current?.click()} title="Importer une analyse sauvegardée">↑ Importer</button>
            {active && <>
              <button className="btn" onClick={exportAnalysis} title="Exporter l'analyse active en JSON">↓ Exporter</button>
              <button
                className="btn"
                style={{ background: genLoading ? 'rgba(99,102,241,.15)' : 'rgba(99,102,241,.1)', borderColor: 'rgba(99,102,241,.3)', color: 'var(--accent2)' }}
                onClick={() => setShowGenModal(true)}
                disabled={genLoading || !active}
                title="L'IA génère automatiquement toutes les causes et chaînes 5 Pourquoi"
              >
                {genLoading ? <><span className="spinner" style={{ borderTopColor: 'var(--accent2)' }}/>Génération…</> : '⚡ Générer'}
              </button>
              <button className="btn ai" onClick={runAI} disabled={aiLoading || (!totalCauses && !totalChains)} title="L'IA analyse les données existantes et propose un diagnostic">
                {aiLoading ? <><span className="spinner"/>Analyse…</> : '✦ Analyser'}
              </button>
            </>}
          </div>
          <input ref={importRef} type="file" accept=".json" hidden onChange={importAnalysis}/>
        </header>

        <div className="body">

          {/* Left panel */}
          <aside className="left-panel">
            <div className="panel-hd"><span className="panel-label">Analyses ({analyses.length})</span></div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, opacity: .2, marginBottom: 8 }}>⬡</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Créez votre première analyse</div>
                </div>
              )}
              {analyses.map(a => (
                <div key={a.id} className={`a-item ${activeId === a.id ? 'active' : ''}`}
                  onClick={() => { setActiveId(a.id); setAiResult(a.aiResult || null) }}>
                  <div className="a-name">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{a.problem}</span>
                    <button className="a-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  </div>
                  <div className="a-meta">
                    {Object.values(a.bones || {}).reduce((s, arr) => s + arr.length, 0)} causes · {a.whyChains?.length || 0} chaînes
                  </div>
                </div>
              ))}
            </div>
            {showNewForm ? (
              <div className="new-form">
                <span className="form-label">Problème *</span>
                <textarea className="inp" rows={2} placeholder="Décrivez le problème à analyser" value={newAnalysis.problem} onChange={e => setNewAnalysis(p => ({ ...p, problem: e.target.value }))} autoFocus/>
                <span className="form-label">Contexte</span>
                <input className="inp" placeholder="Département, process…" value={newAnalysis.context} onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))}/>
                <span className="form-label">Impact</span>
                <input className="inp" placeholder="Impact observé…" value={newAnalysis.impact} onChange={e => setNewAnalysis(p => ({ ...p, impact: e.target.value }))}/>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn primary" style={{ flex: 1 }} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>✕</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>+ Nouvelle analyse</button>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="main">
            {!active ? (
              <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, opacity: .15, marginBottom: 16 }}>⬡</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, fontStyle: 'italic', marginBottom: 8 }}>Sélectionnez ou créez une analyse</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Utilisez le panneau gauche pour démarrer</div>
              </div>
            ) : (<>

              {/* Stats */}
              <div className="stats-row">
                {[
                  { val: totalCauses,  lbl: 'Causes identifiées', color: 'var(--text)'  },
                  { val: highPriority, lbl: 'Priorité haute',      color: '#f87171'      },
                  { val: totalChains,  lbl: 'Chaînes 5 Pourquoi',  color: 'var(--accent2)' },
                  { val: completedChains, lbl: 'Chaînes complètes', color: '#22d3a5'     },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                    <div className="stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Problem banner */}
              <div style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>🔴</span>
                <div>
                  <div style={{ fontSize: 11, color: '#f87171', fontFamily: 'Geist Mono,monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Problème analysé</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: active.context || active.impact ? 4 : 0 }}>{active.problem}</div>
                  {active.context && <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Contexte : {active.context}</div>}
                  {active.impact  && <div style={{ fontSize: 12, color: 'var(--muted2)' }}>Impact : {active.impact}</div>}
                </div>
              </div>

              {/* AI generated resume banner */}
              {(active.aiGenResume || genResume) && (
                <div style={{ background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.25)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--accent2)', fontFamily: 'Geist Mono,monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Généré par l'IA</div>
                    <div style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.6 }}>{active.aiGenResume || genResume}</div>
                  </div>
                  <button onClick={() => updateActive({ aiGenResume: '' })} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, marginLeft: 'auto', flexShrink: 0 }}>✕</button>
                </div>
              )}

              {/* Tool tabs */}
              <div className="tool-tabs">
                <button className={`tool-tab ${activeTool === 'ishikawa' ? 'active' : ''}`} onClick={() => setActiveTool('ishikawa')}>
                  <span>🐟</span> Ishikawa (6M)
                </button>
                <button className={`tool-tab ${activeTool === '5why' ? 'active' : ''}`} onClick={() => setActiveTool('5why')}>
                  <span>❓</span> 5 Pourquoi
                </button>
              </div>

              {/* ── ISHIKAWA TAB ── */}
              {activeTool === 'ishikawa' && (<>
                {/* SVG Fishbone */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <FishboneSVG/>
                  <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono,monospace' }}>Cliquez sur une arête pour gérer ses causes</span>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                      {Object.entries(PRIORITY).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'Geist Mono,monospace', color: v.color }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: v.color }}/>
                          {v.label.replace('Priorité ', '')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bone tabs */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {BONES.map(b => {
                    const count = getBoneCauses(b.id).length
                    const isSel = activeBone === b.id
                    return (
                      <button key={b.id} onClick={() => setActiveBone(b.id)}
                        style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${isSel ? b.border : 'var(--border2)'}`, background: isSel ? b.bg : 'var(--surface2)', color: isSel ? b.color : 'var(--muted2)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s', fontFamily: 'Syne,sans-serif' }}>
                        <span style={{ fontSize: 14 }}>{b.icon}</span>
                        {b.short}
                        {count > 0 && <span style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', padding: '1px 6px', borderRadius: 4, background: b.bg, color: b.color }}>{count}</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Causes for selected bone */}
                {activeBone && currentBone && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: currentBone.bg, border: `1px solid ${currentBone.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: currentBone.color }}>{currentBone.icon}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: currentBone.color }}>{currentBone.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted2)' }}>{currentBone.desc}</div>
                      </div>
                      <button className="btn primary" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 11 }}
                        onClick={() => openCauseForm(activeBone)}>+ Cause</button>
                    </div>

                    <div className="cause-list">
                      {getBoneCauses(activeBone).length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border2)', borderRadius: 10, color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>
                          Aucune cause {currentBone.label.toLowerCase()} — cliquez "+ Cause" pour en ajouter
                        </div>
                      )}
                      {getBoneCauses(activeBone).map((cause, ci) => {
                        const px = PRIORITY[cause.priority]
                        return (
                          <div key={cause.id} className="cause-item">
                            <div className="cause-row">
                              <div className="cause-dot" style={{ background: px.color }}/>
                              <div className="cause-text">{cause.text}</div>
                              <span style={{ fontSize: 10, fontFamily: 'Geist Mono,monospace', padding: '2px 7px', borderRadius: 4, background: px.bg, color: px.color, border: `1px solid ${px.color}30` }}>{px.label.replace('Priorité ', '')}</span>
                              <div className="cause-actions">
                                <button className="icon-btn" onClick={() => openCauseForm(activeBone, ci, null, { text: cause.text, priority: cause.priority })}>✎</button>
                                <button className="icon-btn" style={{ color: 'rgba(129,140,248,.8)' }} onClick={() => openCauseForm(activeBone, ci, -1)}>+ sous</button>
                                <button className="icon-btn" style={{ color: '#f87171' }} onClick={() => deleteCause(activeBone, ci)}>✕</button>
                              </div>
                            </div>
                            {/* Subcauses */}
                            {(cause.subcauses || []).map((sub, si) => {
                              const spx = PRIORITY[sub.priority]
                              return (
                                <div key={sub.id} className="subcause-item">
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border2)', flexShrink: 0 }}/>
                                  <div style={{ width: 4, height: 1, background: spx.color, flexShrink: 0 }}/>
                                  <div className="subcause-text">{sub.text}</div>
                                  <span style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: spx.color }}>{sub.priority}</span>
                                  <button className="icon-btn" style={{ fontSize: 10 }} onClick={() => openCauseForm(activeBone, ci, si, { text: sub.text, priority: sub.priority })}>✎</button>
                                  <button className="icon-btn" style={{ color: '#f87171', fontSize: 10 }} onClick={() => deleteCause(activeBone, ci, si)}>✕</button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {!activeBone && (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border2)', borderRadius: 12 }}>
                    <div style={{ fontSize: 32, opacity: .2, marginBottom: 8 }}>🐟</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Cliquez sur une arête du diagramme ou un onglet ci-dessus pour gérer les causes de cette catégorie</div>
                  </div>
                )}
              </>)}

              {/* ── 5 POURQUOI TAB ── */}
              {activeTool === '5why' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(active.whyChains || []).length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--border2)', borderRadius: 12 }}>
                      <div style={{ fontSize: 36, opacity: .2, marginBottom: 12 }}>❓</div>
                      <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 18, fontStyle: 'italic', marginBottom: 8 }}>Méthode des 5 Pourquoi</div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 20px' }}>
                        Remontez à la cause racine en vous demandant "Pourquoi ?" 5 fois de suite. Créez plusieurs chaînes pour explorer différentes pistes.
                      </div>
                      <button className="btn primary" onClick={createWhyChain}>+ Créer une chaîne 5 Pourquoi</button>
                    </div>
                  )}
                  {(active.whyChains || []).map(chain => <WhyChainView key={chain.id} chain={chain}/>)}
                  {(active.whyChains || []).length > 0 && (
                    <button className="btn" style={{ justifyContent: 'center', padding: '10px' }} onClick={createWhyChain}>
                      + Nouvelle chaîne 5 Pourquoi
                    </button>
                  )}
                </div>
              )}
            </>)}
          </main>
        </div>

        {/* ── Generate Modal ── */}
        {showGenModal && (
          <div className="modal-overlay" onClick={() => setShowGenModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-title" style={{ color: 'var(--accent2)' }}>⚡ Génération automatique IA</div>
              <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 16, lineHeight: 1.6 }}>
                L'IA va analyser le problème <strong style={{ color: 'var(--text)' }}>"{active?.problem}"</strong> et peupler automatiquement toutes les arêtes du diagramme Ishikawa ainsi que {2} chaînes 5 Pourquoi.
              </p>
              <div style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#f87171' }}>
                ⚠ Cette action remplacera les causes et chaînes existantes.
              </div>
              <div className="form-group">
                <label className="form-label">Contexte additionnel pour la génération (optionnel)</label>
                <textarea className="inp" rows={3}
                  placeholder="Ex: Secteur agroalimentaire, ligne de production automatisée, problème récurrent depuis 3 mois, équipe de 12 personnes…"
                  value={genContext}
                  onChange={e => setGenContext(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowGenModal(false)}>Annuler</button>
                <button className="btn-full" style={{ background: 'var(--accent)' }} onClick={runGenerate}>
                  ⚡ Générer le diagramme
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cause form modal */}
        {showCauseForm && (
          <div className="modal-overlay" onClick={() => setShowCauseForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title" style={{ color: currentBone?.color }}>
                {causeForm.causeIdx === null ? 'Nouvelle cause' : causeForm.subIdx === -1 ? 'Nouvelle sous-cause' : 'Modifier la cause'}
                {currentBone && <span style={{ fontSize: 13, color: 'var(--muted2)', fontStyle: 'normal' }}> — {currentBone.label}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Description de la cause *</label>
                <textarea className="inp" rows={3} placeholder="Ex: Manque de formation sur les nouvelles procédures" value={causeForm.text} onChange={e => setCauseForm(p => ({ ...p, text: e.target.value }))} autoFocus/>
              </div>
              <div className="form-group">
                <label className="form-label">Niveau de priorité</label>
                <div className="seg-group">
                  {Object.entries(PRIORITY).map(([k, v]) => (
                    <button key={k} className={`seg-btn ${causeForm.priority === k ? 'sel' : ''}`}
                      style={causeForm.priority === k ? { background: v.bg, borderColor: v.color + '50', color: v.color } : {}}
                      onClick={() => setCauseForm(p => ({ ...p, priority: k }))}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowCauseForm(false)}>Annuler</button>
                <button className="btn-full" onClick={saveCause}>Enregistrer</button>
              </div>
            </div>
          </div>
        )}

        {/* AI Panel */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-panel-hd">
            <span className="ai-panel-title">Diagnostic IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-content">
            {aiLoading && <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted2)', fontSize: 13 }}><span className="spinner"/>Diagnostic en cours…</div>}
            {!aiLoading && aiResult && <>
              {aiResult.diagnostic && <div><div className="ai-slbl">Diagnostic global</div><div className="ai-block">{aiResult.diagnostic}</div></div>}
              {aiResult.causes_racines?.length > 0 && (
                <div>
                  <div className="ai-slbl">Causes racines identifiées</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {aiResult.causes_racines.map((c, i) => {
                      const bone = BONES.find(b => b.id === c.categorie || b.label.toLowerCase().includes((c.categorie||'').toLowerCase()))
                      return (
                        <div key={i} className="ai-cause-card" style={{ borderColor: bone?.border || 'var(--border)' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: bone?.bg || 'var(--surface3)', color: bone?.color || 'var(--muted2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                            {bone?.icon || '?'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: bone?.color || 'var(--text)', marginBottom: 3 }}>{c.cause}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.6 }}>{c.explication}</div>
                            {c.action && <div style={{ fontSize: 10, color: 'var(--accent2)', marginTop: 5, padding: '3px 8px', background: 'rgba(129,140,248,.08)', borderRadius: 4, border: '1px solid rgba(129,140,248,.15)', fontFamily: 'Geist Mono,monospace', display: 'inline-block' }}>→ {c.action}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {aiResult.why_insights?.length > 0 && (
                <div>
                  <div className="ai-slbl">Insights 5 Pourquoi</div>
                  {aiResult.why_insights.map((w, i) => (
                    <div key={i} style={{ padding: '8px 12px', marginBottom: 5, background: 'rgba(129,140,248,.06)', border: '1px solid rgba(129,140,248,.2)', borderRadius: 6, fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
                      <span style={{ color: 'var(--accent2)', marginRight: 6 }}>◎</span>{w}
                    </div>
                  ))}
                </div>
              )}
              {aiResult.manquantes?.length > 0 && (
                <div>
                  <div className="ai-slbl">Dimensions à explorer</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {aiResult.manquantes.map((m, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 6, fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
                        <span style={{ color: '#f59e0b', marginRight: 6 }}>⚠</span>{m}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiResult.plan_action?.length > 0 && (
                <div>
                  <div className="ai-slbl">Plan d'action recommandé</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {aiResult.plan_action.map((p, i) => (
                      <div key={i} className="ai-priority-item">
                        <span className="ai-num">#{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.action}</div>
                          {p.delai && <div style={{ fontSize: 10, color: '#22d3a5', fontFamily: 'Geist Mono,monospace', marginTop: 2 }}>⏱ {p.delai}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiResult.conclusion && <div><div className="ai-slbl">Verdict</div><div className="ai-block" style={{ fontStyle: 'italic', color: 'var(--muted2)' }}>{aiResult.conclusion}</div></div>}
            </>}
            {!aiLoading && !aiResult && (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, opacity: .2, marginBottom: 12 }}>✦</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Renseignez des causes et/ou des chaînes 5 Pourquoi, puis cliquez sur "Analyse IA" pour identifier les causes racines et obtenir un plan d'action.
                </div>
              </div>
            )}
          </div>
        </div>

        {toast && <div className={`toast ${toast.type || ''}`}>{toast.type === 'error' ? '✕' : '✓'} {toast.msg}</div>}
      </div>
    </>
  )
}