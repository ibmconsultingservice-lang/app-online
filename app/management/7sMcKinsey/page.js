'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const SEVEN_S = {
  strategy: {
    key: 'strategy', label: 'Stratégie', fr: 'Strategy', icon: '🧭', type: 'hard',
    color: '#60a5fa', bg: 'rgba(96,165,250,.08)', border: 'rgba(96,165,250,.25)',
    desc: 'Plan d\'action pour atteindre les objectifs face à la concurrence',
    questions: [
      'Quelle est votre stratégie de croissance actuelle ?',
      'Comment vous différenciez-vous de la concurrence ?',
      'Vos objectifs stratégiques sont-ils clairement définis et partagés ?',
    ],
  },
  structure: {
    key: 'structure', label: 'Structure', fr: 'Structure', icon: '🏗', type: 'hard',
    color: '#818cf8', bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.25)',
    desc: 'Organigramme, hiérarchie et répartition des responsabilités',
    questions: [
      'Comment est organisée la hiérarchie de décision ?',
      'Les responsabilités sont-elles clairement définies ?',
      'La structure favorise-t-elle la collaboration inter-départements ?',
    ],
  },
  systems: {
    key: 'systems', label: 'Systèmes', fr: 'Systems', icon: '⚙', type: 'hard',
    color: '#a78bfa', bg: 'rgba(167,139,250,.08)', border: 'rgba(167,139,250,.25)',
    desc: 'Processus, procédures et flux d\'information quotidiens',
    questions: [
      'Quels sont les systèmes IT et processus métier clés ?',
      'Les flux d\'information sont-ils efficaces et fiables ?',
      'Comment les performances sont-elles mesurées et reportées ?',
    ],
  },
  style: {
    key: 'style', label: 'Style', fr: 'Style', icon: '🎭', type: 'soft',
    color: '#f472b6', bg: 'rgba(244,114,182,.08)', border: 'rgba(244,114,182,.25)',
    desc: 'Style de management et culture comportementale des leaders',
    questions: [
      'Quel est le style de leadership dominant ?',
      'Comment les décisions importantes sont-elles prises ?',
      'Comment le changement est-il communiqué et conduit ?',
    ],
  },
  staff: {
    key: 'staff', label: 'Personnel', fr: 'Staff', icon: '👥', type: 'soft',
    color: '#fb923c', bg: 'rgba(251,146,60,.08)', border: 'rgba(251,146,60,.25)',
    desc: 'Profils des employés, recrutement, fidélisation et développement RH',
    questions: [
      'Avez-vous les bons profils pour exécuter votre stratégie ?',
      'Comment attirez-vous et retenez-vous les talents clés ?',
      'Y a-t-il des gaps de compétences critiques ?',
    ],
  },
  skills: {
    key: 'skills', label: 'Compétences', fr: 'Skills', icon: '🛠', type: 'soft',
    color: '#34d399', bg: 'rgba(52,211,153,.08)', border: 'rgba(52,211,153,.25)',
    desc: 'Capacités distinctives et savoir-faire qui différencient l\'entreprise',
    questions: [
      'Quelles sont vos compétences cœur (core competencies) ?',
      'Ces compétences sont-elles un avantage concurrentiel durable ?',
      'Comment les compétences sont-elles développées et transmises ?',
    ],
  },
  sharedValues: {
    key: 'sharedValues', label: 'Valeurs partagées', fr: 'Shared Values', icon: '💎', type: 'center',
    color: '#facc15', bg: 'rgba(250,204,21,.08)', border: 'rgba(250,204,21,.3)',
    desc: 'Valeurs fondamentales, culture d\'entreprise et raison d\'être (centre du modèle)',
    questions: [
      'Quelles valeurs guident les décisions et comportements au quotidien ?',
      'La culture d\'entreprise est-elle vécue ou seulement affichée ?',
      'Les valeurs sont-elles alignées avec la stratégie de changement ?',
    ],
  },
}

const CHANGE_TYPES = [
  { value: 'transformation', label: 'Transformation globale' },
  { value: 'restructuring',  label: 'Restructuration' },
  { value: 'growth',         label: 'Croissance / Scale' },
  { value: 'turnaround',     label: 'Redressement' },
  { value: 'merger',         label: 'Fusion / Acquisition' },
  { value: 'digital',        label: 'Transformation digitale' },
]

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const EMPTY_ELEMENT = { score: 3, description: '', strengths: '', weaknesses: '', notes: '' }

const READINESS_CONFIG = {
  'Très prêt':          { color: '#22d3a5', bg: 'rgba(34,211,165,.1)' },
  'Prêt':               { color: '#22d3a5', bg: 'rgba(34,211,165,.1)' },
  'Prêt avec réserves': { color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
  'En préparation':     { color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
  'Fragile':            { color: '#f87171', bg: 'rgba(248,113,113,.1)' },
  'Pas prêt':           { color: '#f87171', bg: 'rgba(248,113,113,.1)' },
}

const SEVERITY_COLOR = {
  'Critique':  '#f87171',
  'Élevé':     '#fb923c',
  'Modéré':    '#f59e0b',
  'Haute':     '#f87171',
  'Moyenne':   '#f59e0b',
  'Faible':    '#22d3a5',
  'Élevée':    '#fb923c',
}

// ─── 7S Hexagon SVG diagram ───────────────────────────────────────────────────
function SevenSHexagon({ elements, activeKey, onSelect }) {
  // Positions: center = sharedValues, 6 outer = the rest
  const cx = 200, cy = 200, r = 110, dotR = 38
  const outerKeys = ['strategy', 'structure', 'systems', 'style', 'staff', 'skills']
  const angles = outerKeys.map((_, i) => (Math.PI * 2 * i) / 6 - Math.PI / 2)
  const positions = {}
  outerKeys.forEach((key, i) => {
    positions[key] = { x: cx + r * Math.cos(angles[i]), y: cy + r * Math.sin(angles[i]) }
  })
  positions['sharedValues'] = { x: cx, y: cy }

  const getScoreColor = (key) => {
    const s = SEVEN_S[key]
    const score = elements[key]?.score ?? 3
    const alpha = 0.3 + (score / 5) * 0.7
    return { color: s.color, alpha }
  }

  return (
    <svg viewBox="0 0 400 400" style={{ width: '100%', maxWidth: 340, display: 'block', margin: '0 auto' }}>
      {/* Connection lines from center to outer */}
      {outerKeys.map(key => {
        const pos = positions[key]
        return (
          <line
            key={`line-${key}`}
            x1={cx} y1={cy} x2={pos.x} y2={pos.y}
            stroke="rgba(255,255,255,.06)" strokeWidth="1.5" strokeDasharray="4 4"
          />
        )
      })}
      {/* Hexagon outline */}
      <polygon
        points={outerKeys.map((key) => `${positions[key].x},${positions[key].y}`).join(' ')}
        fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1"
      />
      {/* Score polygon */}
      <polygon
        points={outerKeys.map((key) => {
          const pos = positions[key]
          const score = (elements[key]?.score ?? 3) / 5
          const dx = pos.x - cx, dy = pos.y - cy
          return `${cx + dx * score},${cy + dy * score}`
        }).join(' ')}
        fill="rgba(99,102,241,.06)" stroke="rgba(99,102,241,.3)" strokeWidth="1"
      />
      {/* Outer dots */}
      {outerKeys.map(key => {
        const pos = positions[key]
        const s = SEVEN_S[key]
        const score = elements[key]?.score ?? 3
        const isActive = activeKey === key
        return (
          <g key={key} style={{ cursor: 'pointer' }} onClick={() => onSelect(key)}>
            <circle cx={pos.x} cy={pos.y} r={dotR + 4} fill={isActive ? s.bg : 'transparent'} />
            <circle
              cx={pos.x} cy={pos.y} r={dotR}
              fill={`color-mix(in srgb, ${s.color} ${12 + score * 8}%, #111118)`}
              stroke={isActive ? s.color : s.border}
              strokeWidth={isActive ? 2 : 1}
            />
            {/* Score arc */}
            {(() => {
              const pct = score / 5
              const arcR = dotR - 5
              const startAngle = -Math.PI / 2
              const endAngle = startAngle + pct * Math.PI * 2
              const x1 = pos.x + arcR * Math.cos(startAngle)
              const y1 = pos.y + arcR * Math.sin(startAngle)
              const x2 = pos.x + arcR * Math.cos(endAngle)
              const y2 = pos.y + arcR * Math.sin(endAngle)
              const large = pct > 0.5 ? 1 : 0
              if (pct <= 0) return null
              return (
                <path
                  d={`M ${x1} ${y1} A ${arcR} ${arcR} 0 ${large} 1 ${x2} ${y2}`}
                  fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round"
                />
              )
            })()}
            <text x={pos.x} y={pos.y - 5} textAnchor="middle" fill="#fff" fontSize="14" dominantBaseline="middle">
              {s.icon}
            </text>
            <text x={pos.x} y={pos.y + 10} textAnchor="middle" fill={s.color} fontSize="8" fontWeight="700" fontFamily="'Geist Mono', monospace">
              {score}/5
            </text>
          </g>
        )
      })}
      {/* Center — Shared Values */}
      {(() => {
        const key = 'sharedValues'
        const s = SEVEN_S[key]
        const score = elements[key]?.score ?? 3
        const isActive = activeKey === key
        return (
          <g style={{ cursor: 'pointer' }} onClick={() => onSelect(key)}>
            <circle cx={cx} cy={cy} r={42}
              fill={`color-mix(in srgb, ${s.color} ${10 + score * 6}%, #0a0a0f)`}
              stroke={isActive ? s.color : s.border}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#fff" fontSize="16" dominantBaseline="middle">
              {s.icon}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill={s.color} fontSize="8" fontWeight="700" fontFamily="'Geist Mono', monospace">
              {score}/5
            </text>
          </g>
        )
      })()}
      {/* Labels */}
      {outerKeys.map(key => {
        const pos = positions[key]
        const s = SEVEN_S[key]
        const labelR = r + dotR + 12
        const angle = angles[outerKeys.indexOf(key)]
        const lx = cx + labelR * Math.cos(angle)
        const ly = cy + labelR * Math.sin(angle)
        return (
          <text key={`label-${key}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fill={s.color} fontSize="9" fontWeight="700" fontFamily="'Geist Mono', monospace"
            opacity="0.8"
          >
            {s.label.toUpperCase()}
          </text>
        )
      })}
      <text x={cx} y={cy + 56} textAnchor="middle" fill={SEVEN_S.sharedValues.color}
        fontSize="8" fontWeight="700" fontFamily="'Geist Mono', monospace" opacity="0.8"
      >
        VALEURS PARTAGÉES
      </text>
    </svg>
  )
}

// ─── 7S Page ──────────────────────────────────────────────────────────────────
export default function SevenSPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const [project, setProject]       = useState(null)
  const [analyses, setAnalyses]     = useState([])
  const [activeId, setActiveId]     = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newAnalysis, setNewAnalysis] = useState({ name: '', companyName: '', changeInitiative: '', context: '', changeType: 'transformation' })
  const [activeKey, setActiveKey]   = useState('strategy')
  const [elemForm, setElemForm]     = useState(EMPTY_ELEMENT)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiResult, setAiResult]     = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiTab, setAiTab]           = useState('summary') // 'summary'|'elements'|'risks'|'roadmap'
  const [toast, setToast]           = useState(null)
  const [showDiagram, setShowDiagram] = useState(true)

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.SevenS || []
        setAnalyses(list)
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
        return { ...p, tools: { ...(p.tools || {}), SevenS: updated } }
      })
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const active = analyses.find(a => a.id === activeId) || null

  // ── CRUD analyses ──
  const createAnalysis = () => {
    if (!newAnalysis.name.trim()) return
    const a = {
      id: uid(),
      name: newAnalysis.name.trim(),
      companyName: newAnalysis.companyName.trim(),
      changeInitiative: newAnalysis.changeInitiative.trim(),
      context: newAnalysis.context.trim(),
      changeType: newAnalysis.changeType,
      createdAt: new Date().toISOString(),
      elements: Object.fromEntries(Object.keys(SEVEN_S).map(k => [k, { ...EMPTY_ELEMENT }])),
      aiResult: null,
    }
    const updated = [...analyses, a]
    setAnalyses(updated)
    setActiveId(a.id)
    persist(updated)
    setShowNewForm(false)
    setNewAnalysis({ name: '', companyName: '', changeInitiative: '', context: '', changeType: 'transformation' })
    setActiveKey('strategy')
    showToast(`Analyse "${a.name}" créée`)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated)
    persist(updated)
    if (activeId === id) setActiveId(updated[updated.length - 1]?.id || null)
    showToast('Analyse supprimée', 'info')
  }

  const updateAnalysis = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated)
    persist(updated)
  }

  // ── Select element ──
  const selectElement = (key) => {
    setActiveKey(key)
    const current = active?.elements?.[key] || EMPTY_ELEMENT
    setElemForm({ ...EMPTY_ELEMENT, ...current })
  }

  // ── Save element form ──
  const saveElement = () => {
    if (!active) return
    const elements = { ...(active.elements || {}), [activeKey]: { ...elemForm, score: parseFloat(elemForm.score) || 3 } }
    updateAnalysis({ elements })
    showToast(`${SEVEN_S[activeKey]?.label} mis à jour`)
  }

  // ── Average score ──
  const avgScore = active
    ? (Object.values(active.elements || {}).reduce((s, e) => s + (e.score ?? 3), 0) / 7).toFixed(1)
    : null

  const getReadiness = (score) => {
    if (score >= 4.5) return 'Très prêt'
    if (score >= 3.8) return 'Prêt'
    if (score >= 3.2) return 'Prêt avec réserves'
    if (score >= 2.5) return 'En préparation'
    if (score >= 1.8) return 'Fragile'
    return 'Pas prêt'
  }

  // ── AI Analysis ──
  const runAI = async () => {
    if (!active) return
    setAiLoading(true)
    setShowAiPanel(true)
    setAiResult(null)
    setAiTab('summary')
    try {
      const res = await fetch('/api/generer-management/generer-7sMcKinsey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName:      project?.name || '',
          projectTag:       project?.tag  || '',
          companyName:      active.companyName,
          changeInitiative: active.changeInitiative,
          context:          active.context,
          changeType:       active.changeType,
          elements:         active.elements,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateAnalysis({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) {
      showToast(err.message, 'error')
    }
    setAiLoading(false)
  }

  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `7S_${active.name.replace(/\s+/g, '_')}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  // Load ai result from saved data
  useEffect(() => {
    if (active?.aiResult && !aiResult) {
      setAiResult(active.aiResult)
    } else if (!active?.aiResult) {
      setAiResult(null)
    }
  }, [activeId])

  const currentElem = SEVEN_S[activeKey]
  const currentScore = active?.elements?.[activeKey]?.score ?? elemForm.score

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
        }
        body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        .root { min-height: 100vh; display: flex; flex-direction: column; }

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
        .topbar-sub { font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace; }
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
        .btn.ai { background: rgba(250,204,21,.08); border-color: rgba(250,204,21,.25); color: #facc15; }
        .btn.ai:hover { background: rgba(250,204,21,.15); }
        .btn.active-tab { background: var(--surface3); color: var(--text); border-color: var(--border2); }
        .btn:disabled { opacity: .4; cursor: not-allowed; }

        /* ── Layout ── */
        .body {
          flex: 1; display: grid; grid-template-columns: 230px 1fr 380px;
          height: calc(100vh - 56px); overflow: hidden;
        }

        /* ── Left panel ── */
        .left-panel {
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .panel-header {
          padding: 14px 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .panel-label {
          font-size: 10px; color: var(--muted); letter-spacing: .1em;
          text-transform: uppercase; font-family: 'Geist Mono', monospace;
        }
        .panel-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
        .analysis-item {
          padding: 10px 12px; border-radius: 8px; cursor: pointer;
          border: 1px solid transparent; transition: all .15s;
        }
        .analysis-item:hover { background: var(--surface2); }
        .analysis-item.active { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.25); }
        .a-name { font-size: 12px; font-weight: 600; color: var(--text); }
        .a-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 2px; }
        .a-del {
          opacity: 0; background: none; border: none; color: #f87171;
          cursor: pointer; font-size: 12px; float: right; padding: 0;
        }
        .analysis-item:hover .a-del { opacity: 1; }
        .readiness-badge {
          display: inline-block; margin-top: 5px; font-size: 10px; font-family: 'Geist Mono', monospace;
          font-weight: 700; padding: 2px 7px; border-radius: 4px;
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
        select.input { appearance: none; cursor: pointer; }
        .form-label { font-size: 10px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 3px; display: block; font-family: 'Geist Mono', monospace; }

        /* ── Center ── */
        .center-panel { overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }

        /* ── Overview header ── */
        .overview-header { display: flex; gap: 16px; align-items: flex-start; }
        .overview-left { flex: 1; }
        .main-title { font-family: 'Instrument Serif', serif; font-size: 22px; font-style: italic; }
        .main-sub { font-size: 12px; color: var(--muted2); margin-top: 4px; line-height: 1.5; }
        .change-badge {
          display: inline-flex; align-items: center; gap: 5px; margin-top: 8px;
          font-size: 10px; font-family: 'Geist Mono', monospace; font-weight: 700;
          padding: 3px 9px; border-radius: 4px; background: rgba(99,102,241,.1);
          border: 1px solid rgba(99,102,241,.25); color: var(--accent2);
        }

        /* ── Score cards row ── */
        .score-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .score-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 4px;
        }
        .sc-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-family: 'Geist Mono', monospace; }
        .sc-value { font-size: 20px; font-weight: 800; font-family: 'Geist Mono', monospace; }
        .sc-sub { font-size: 10px; color: var(--muted2); }

        /* ── 7S grid ── */
        .sevens-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .s-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 14px; cursor: pointer; transition: all .15s;
          display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden;
        }
        .s-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          border-radius: 2px 2px 0 0; opacity: 0; transition: opacity .2s;
        }
        .s-card:hover { border-color: var(--border2); }
        .s-card:hover::before { opacity: 1; }
        .s-card.selected { }
        .s-card.selected::before { opacity: 1; }
        .s-card-header { display: flex; align-items: center; gap: 8px; }
        .s-icon-wrap { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .s-name { font-size: 12px; font-weight: 700; }
        .s-type-badge { font-size: 9px; font-family: 'Geist Mono', monospace; padding: 2px 6px; border-radius: 3px; }
        .s-desc { font-size: 11px; color: var(--muted2); line-height: 1.5; }
        .s-score-row { display: flex; align-items: center; gap: 8px; }
        .s-score-bar { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
        .s-score-fill { height: 100%; border-radius: 2px; transition: width .3s ease; }
        .s-score-num { font-size: 11px; font-family: 'Geist Mono', monospace; font-weight: 700; }
        .s-notes-preview { font-size: 10px; color: var(--muted); font-style: italic; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .center-card { grid-column: 2; background: rgba(250,204,21,.03); }

        /* ── Diagram toggle ── */
        .diagram-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .diagram-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .diagram-title { font-size: 12px; font-weight: 700; color: var(--muted2); text-transform: uppercase; letter-spacing: .06em; font-family: 'Geist Mono', monospace; }

        /* ── Right panel: element form ── */
        .right-panel {
          background: var(--surface); border-left: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .elem-header {
          padding: 14px 16px; border-bottom: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 8px;
        }
        .elem-icon-row { display: flex; align-items: center; gap: 10px; }
        .elem-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .elem-name { font-family: 'Instrument Serif', serif; font-size: 16px; font-style: italic; }
        .elem-fr { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .elem-desc { font-size: 11px; color: var(--muted2); line-height: 1.5; }
        .type-tag { font-size: 9px; font-family: 'Geist Mono', monospace; font-weight: 700; padding: 2px 7px; border-radius: 3px; }
        .form-scroll { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .form-group { display: flex; flex-direction: column; }
        .score-slider-wrap { display: flex; flex-direction: column; gap: 6px; }
        .score-dots { display: flex; gap: 6px; justify-content: space-between; }
        .score-dot {
          flex: 1; height: 28px; border-radius: 5px; cursor: pointer; border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-family: 'Geist Mono', monospace; font-weight: 700;
          background: var(--surface2); color: var(--muted2); transition: all .15s;
        }
        .score-dot:hover { border-color: var(--border2); color: var(--text); }
        .score-dot.active { color: #fff; }
        .score-labels { display: flex; justify-content: space-between; font-size: 9px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .questions-list { display: flex; flex-direction: column; gap: 6px; }
        .question-item { display: flex; gap: 8px; align-items: flex-start; padding: 8px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); }
        .q-num { font-size: 9px; font-family: 'Geist Mono', monospace; color: var(--muted); flex-shrink: 0; padding-top: 1px; }
        .q-text { font-size: 11px; color: var(--muted2); line-height: 1.5; }
        .section-sep { height: 1px; background: var(--border); }

        /* ── AI Panel ── */
        .ai-panel {
          position: fixed; right: 0; top: 56px; bottom: 0; width: 480px;
          background: var(--surface); border-left: 1px solid var(--border);
          z-index: 80; display: flex; flex-direction: column; overflow: hidden;
          transform: translateX(100%); transition: transform .3s ease;
        }
        .ai-panel.open { transform: translateX(0); }
        .ai-panel-header {
          padding: 14px 20px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .ai-panel-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .ai-tabs { display: flex; gap: 4px; padding: 10px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0; flex-wrap: wrap; }
        .ai-tab {
          padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 10px;
          font-family: 'Geist Mono', monospace; font-weight: 600; border: 1px solid var(--border);
          background: var(--surface2); color: var(--muted2); transition: all .15s; letter-spacing: .04em;
        }
        .ai-tab:hover { color: var(--text); border-color: var(--border2); }
        .ai-tab.active { background: var(--surface3); color: var(--text); border-color: var(--border2); }
        .ai-content { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
        .ai-section-title { font-size: 10px; color: var(--muted2); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 6px; }
        .ai-box {
          background: var(--surface2); border: 1px solid var(--border2);
          border-radius: 10px; padding: 14px; font-size: 13px; color: var(--text); line-height: 1.7;
        }
        .readiness-hero {
          display: flex; align-items: center; gap: 14px; padding: 16px;
          background: var(--surface2); border-radius: 10px; border: 1px solid var(--border2);
        }
        .readiness-score-circle {
          width: 64px; height: 64px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          font-size: 20px; font-weight: 800; font-family: 'Geist Mono', monospace;
        }
        .readiness-label { font-size: 16px; font-weight: 700; font-family: 'Instrument Serif', serif; font-style: italic; }
        .readiness-sub { font-size: 11px; color: var(--muted2); margin-top: 2px; }

        /* alignment matrix */
        .align-row {
          padding: 10px 12px; background: var(--surface2); border-radius: 8px;
          border: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px;
        }
        .align-pair { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }
        .align-status { font-size: 10px; font-family: 'Geist Mono', monospace; padding: 2px 7px; border-radius: 4px; }
        .align-analysis { font-size: 11px; color: var(--muted2); line-height: 1.5; }
        .align-priority { font-size: 9px; font-family: 'Geist Mono', monospace; }

        /* element detail */
        .elem-ai-card {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;
        }
        .elem-ai-header { display: flex; align-items: center; gap: 8px; }
        .elem-ai-name { font-size: 12px; font-weight: 700; }
        .elem-ai-assessment { font-size: 12px; color: var(--muted2); line-height: 1.6; }
        .tags-row { display: flex; flex-wrap: wrap; gap: 4px; }
        .tag { font-size: 10px; font-family: 'Geist Mono', monospace; padding: 2px 7px; border-radius: 4px; }
        .tag.strength { background: rgba(34,211,165,.1); color: #22d3a5; }
        .tag.risk { background: rgba(248,113,113,.1); color: #f87171; }
        .tag.action { background: rgba(99,102,241,.1); color: var(--accent2); }

        /* risks */
        .risk-card {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px;
        }
        .risk-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .risk-name { font-size: 12px; font-weight: 700; flex: 1; }
        .risk-badges { display: flex; gap: 4px; }
        .severity-chip { font-size: 9px; font-family: 'Geist Mono', monospace; font-weight: 700; padding: 2px 7px; border-radius: 3px; }
        .risk-source { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .risk-mitigation { font-size: 11px; color: var(--muted2); line-height: 1.5; }

        /* roadmap */
        .phase-card {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
        }
        .phase-name { font-size: 13px; font-weight: 700; }
        .phase-milestone { font-size: 11px; color: var(--muted2); font-style: italic; }
        .phase-action { display: flex; gap: 8px; font-size: 11px; color: var(--text); padding: 5px 0; border-bottom: 1px solid var(--border); }
        .phase-action:last-child { border-bottom: none; }
        .phase-action-num { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--muted); flex-shrink: 0; }
        .quick-win {
          display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px;
          background: rgba(34,211,165,.04); border: 1px solid rgba(34,211,165,.15);
          border-radius: 8px;
        }
        .qw-icon { color: #22d3a5; font-size: 14px; flex-shrink: 0; }
        .qw-action { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
        .qw-impact { font-size: 11px; color: var(--muted2); }
        .kpi-row {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
          padding: 8px 12px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border);
        }
        .kpi-name { font-size: 12px; font-weight: 600; }
        .kpi-target { font-size: 11px; color: var(--muted2); }
        .kpi-timeline { font-size: 10px; font-family: 'Geist Mono', monospace; color: var(--accent2); white-space: nowrap; }

        /* loading */
        .ai-loading { display: flex; align-items: center; gap: 12px; padding: 24px; color: var(--muted2); font-size: 13px; }
        .spinner { width: 18px; height: 18px; border: 2px solid var(--border2); border-top-color: #facc15; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* empty */
        .empty-cta { padding: 40px 16px; text-align: center; }
        .empty-icon { font-size: 36px; opacity: .25; margin-bottom: 12px; }
        .empty-txt { font-size: 13px; color: var(--muted); line-height: 1.6; }

        /* toast */
        .toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 500;
          background: var(--surface2); border: 1px solid var(--border2);
          border-radius: 8px; padding: 12px 18px; font-size: 13px;
          box-shadow: 0 8px 32px rgba(0,0,0,.4); animation: slideUp .2s ease;
          display: flex; align-items: center; gap: 8px;
        }
        .toast.error { border-color: rgba(248,113,113,.3); color: #f87171; }
        .toast.info { border-color: rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1200px) { .body { grid-template-columns: 220px 1fr; } .right-panel { display: none; } }
        @media (max-width: 760px)  { .body { grid-template-columns: 1fr; } .left-panel { display: none; } .sevens-grid { grid-template-columns: 1fr 1fr; } .score-cards { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <div className="root">

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>
            ← Retour
          </button>
          <div>
            <div className="topbar-title">Modèle 7S McKinsey</div>
            {project && <div className="topbar-sub">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {active && (
              <>
                <button className="btn" onClick={exportAnalysis}>↓ Exporter</button>
                <button className="btn ai" onClick={runAI} disabled={aiLoading}>
                  {aiLoading
                    ? <><span className="spinner" style={{ borderTopColor: '#facc15' }} /> Analyse…</>
                    : '✦ Analyse IA'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="body">

          {/* ── Left: analyses ── */}
          <aside className="left-panel">
            <div className="panel-header">
              <span className="panel-label">Analyses ({analyses.length})</span>
            </div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">🧭</div>
                  <div className="empty-txt">Créez votre première analyse 7S</div>
                </div>
              )}
              {analyses.map(a => {
                const avg = a.elements
                  ? (Object.values(a.elements).reduce((s, e) => s + (e.score ?? 3), 0) / 7).toFixed(1)
                  : null
                const readLabel = avg ? getReadiness(parseFloat(avg)) : null
                const rc = readLabel ? (READINESS_CONFIG[readLabel] || { color: 'var(--muted)', bg: 'rgba(107,106,122,.1)' }) : null
                const changeLabel = CHANGE_TYPES.find(c => c.value === a.changeType)?.label
                return (
                  <div
                    key={a.id}
                    className={`analysis-item ${activeId === a.id ? 'active' : ''}`}
                    onClick={() => { setActiveId(a.id); setAiResult(a.aiResult || null) }}
                  >
                    <button className="a-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                    <div className="a-name">{a.name}</div>
                    <div className="a-meta">
                      {changeLabel && <span style={{ color: 'var(--accent2)' }}>{changeLabel} · </span>}
                      {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </div>
                    {rc && avg && (
                      <span className="readiness-badge" style={{ background: rc.bg, color: rc.color }}>
                        {avg}/5 — {readLabel}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            {showNewForm ? (
              <div className="new-form">
                <span className="form-label">Nom de l'analyse</span>
                <input className="input" placeholder="Ex: Transformation 2025" value={newAnalysis.name}
                  onChange={e => setNewAnalysis(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus />
                <span className="form-label">Société</span>
                <input className="input" placeholder="Nom de l'entreprise" value={newAnalysis.companyName}
                  onChange={e => setNewAnalysis(p => ({ ...p, companyName: e.target.value }))} />
                <span className="form-label">Initiative de changement</span>
                <input className="input" placeholder="Ex: Fusion avec TechCo" value={newAnalysis.changeInitiative}
                  onChange={e => setNewAnalysis(p => ({ ...p, changeInitiative: e.target.value }))} />
                <span className="form-label">Type de changement</span>
                <select className="input" value={newAnalysis.changeType}
                  onChange={e => setNewAnalysis(p => ({ ...p, changeType: e.target.value }))}>
                  {CHANGE_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <span className="form-label">Contexte (optionnel)</span>
                <textarea className="input" rows={2} placeholder="Secteur, enjeux marché…"
                  value={newAnalysis.context}
                  onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn primary" style={{ flex: 1 }} onClick={createAnalysis}>Créer</button>
                  <button className="btn" onClick={() => setShowNewForm(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>
                  + Nouvelle analyse
                </button>
              </div>
            )}
          </aside>

          {/* ── Center ── */}
          <main className="center-panel">
            {!active ? (
              <div className="empty-cta" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div className="empty-icon" style={{ fontSize: 52, marginBottom: 16 }}>🧭</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, fontStyle: 'italic', marginBottom: 8 }}>
                  Sélectionnez ou créez une analyse 7S
                </div>
                <div className="empty-txt">Évaluez les 7 facteurs internes pour prédire le succès de votre changement</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="overview-header">
                  <div className="overview-left">
                    <h2 className="main-title">{active.name}</h2>
                    {active.companyName && <p className="main-sub">{active.companyName}</p>}
                    {active.changeInitiative && <p className="main-sub">Initiative : {active.changeInitiative}</p>}
                    {active.changeType && (
                      <span className="change-badge">
                        {CHANGE_TYPES.find(c => c.value === active.changeType)?.label}
                      </span>
                    )}
                  </div>
                  {avgScore && (() => {
                    const rl = getReadiness(parseFloat(avgScore))
                    const rc = READINESS_CONFIG[rl] || { color: 'var(--muted2)', bg: 'var(--surface2)' }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: '50%',
                          border: `3px solid ${rc.color}`,
                          boxShadow: `0 0 24px color-mix(in srgb, ${rc.color} 30%, transparent)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 800, fontFamily: 'Geist Mono, monospace',
                          color: rc.color, background: rc.bg,
                        }}>
                          {avgScore}
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', color: rc.color, textAlign: 'center' }}>
                          {rl}
                        </span>
                      </div>
                    )
                  })()}
                </div>

                {/* Scores row */}
                <div className="score-cards">
                  {[
                    { label: 'Score moyen', value: avgScore ?? '—', sub: '/ 5' },
                    { label: 'Facteurs durs', value: (['strategy','structure','systems'].reduce((s,k) => s + (active.elements?.[k]?.score ?? 3), 0) / 3).toFixed(1), sub: 'Strategy · Structure · Systems', color: '#818cf8' },
                    { label: 'Facteurs mous', value: (['style','staff','skills'].reduce((s,k) => s + (active.elements?.[k]?.score ?? 3), 0) / 3).toFixed(1), sub: 'Style · Staff · Skills', color: '#f472b6' },
                    { label: 'Valeurs partagées', value: (active.elements?.sharedValues?.score ?? 3).toString(), sub: 'Pivot central', color: '#facc15' },
                  ].map((sc, i) => (
                    <div key={i} className="score-card">
                      <span className="sc-label">{sc.label}</span>
                      <span className="sc-value" style={sc.color ? { color: sc.color } : {}}>{sc.value}</span>
                      <span className="sc-sub">{sc.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Diagram + grid toggle */}
                <div className="diagram-section">
                  <div className="diagram-header">
                    <span className="diagram-title">Carte des 7S</span>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 10 }} onClick={() => setShowDiagram(v => !v)}>
                      {showDiagram ? '⊟ Masquer' : '⊞ Afficher'}
                    </button>
                  </div>
                  {showDiagram && (
                    <SevenSHexagon
                      elements={active.elements || {}}
                      activeKey={activeKey}
                      onSelect={selectElement}
                    />
                  )}
                </div>

                {/* 7S cards grid */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700 }}>Évaluation des 7 facteurs</h3>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono, monospace' }}>
                      Cliquez sur un facteur pour l'évaluer →
                    </span>
                  </div>
                  <div className="sevens-grid">
                    {/* Reorder: hard on row1, soft on row2, values centered */}
                    {(['strategy','structure','systems','style','staff','skills','sharedValues']).map(key => {
                      const s = SEVEN_S[key]
                      const elem = active.elements?.[key] || {}
                      const score = elem.score ?? 3
                      const isSelected = activeKey === key
                      const typeLabel = s.type === 'hard' ? 'Facteur dur' : s.type === 'soft' ? 'Facteur mou' : 'Centre'
                      const typeColor = s.type === 'hard' ? '#818cf8' : s.type === 'soft' ? '#f472b6' : '#facc15'
                      return (
                        <div
                          key={key}
                          className={`s-card ${isSelected ? 'selected' : ''} ${key === 'sharedValues' ? 'center-card' : ''}`}
                          style={isSelected ? { borderColor: s.border, background: s.bg } : {}}
                          onClick={() => selectElement(key)}
                        >
                          <div className="s-card-header">
                            <div className="s-icon-wrap" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                              {s.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="s-name" style={{ color: s.color }}>{s.label}</div>
                              <span className="s-type-badge" style={{ background: `color-mix(in srgb, ${typeColor} 12%, transparent)`, color: typeColor }}>
                                {typeLabel}
                              </span>
                            </div>
                          </div>
                          <div className="s-desc">{s.desc}</div>
                          <div className="s-score-row">
                            <div className="s-score-bar">
                              <div className="s-score-fill" style={{ width: `${score / 5 * 100}%`, background: s.color }} />
                            </div>
                            <span className="s-score-num" style={{ color: s.color }}>{score}/5</span>
                          </div>
                          {elem.description && (
                            <div className="s-notes-preview">{elem.description}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </main>

          {/* ── Right: element form ── */}
          <aside className="right-panel">
            {!active ? (
              <div className="empty-cta">
                <div className="empty-txt">Sélectionnez une analyse</div>
              </div>
            ) : (
              <>
                <div className="elem-header">
                  <div className="elem-icon-row">
                    <div className="elem-icon" style={{ background: currentElem.bg, border: `1px solid ${currentElem.border}` }}>
                      {currentElem.icon}
                    </div>
                    <div>
                      <div className="elem-name" style={{ color: currentElem.color }}>{currentElem.label}</div>
                      <div className="elem-fr">{currentElem.fr}</div>
                    </div>
                    <span className="type-tag" style={{
                      marginLeft: 'auto',
                      background: currentElem.type === 'center' ? 'rgba(250,204,21,.1)' : currentElem.type === 'hard' ? 'rgba(129,140,248,.1)' : 'rgba(244,114,182,.1)',
                      color: currentElem.type === 'center' ? '#facc15' : currentElem.type === 'hard' ? '#818cf8' : '#f472b6',
                    }}>
                      {currentElem.type === 'hard' ? 'Dur' : currentElem.type === 'soft' ? 'Mou' : 'Centre'}
                    </span>
                  </div>
                  <div className="elem-desc">{currentElem.desc}</div>
                </div>

                <div className="form-scroll">
                  {/* Score */}
                  <div className="form-group">
                    <label className="form-label">Score de maturité</label>
                    <div className="score-dots">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button
                          key={v}
                          className={`score-dot ${elemForm.score === v || elemForm.score === v.toString() ? 'active' : ''}`}
                          style={elemForm.score == v ? { background: currentElem.color, borderColor: currentElem.color } : {}}
                          onClick={() => setElemForm(p => ({ ...p, score: v }))}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <div className="score-labels">
                      <span>Très faible</span>
                      <span>Moyen</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  <div className="section-sep" />

                  <div className="form-group">
                    <label className="form-label">Évaluation globale</label>
                    <textarea className="input" rows={3}
                      placeholder="Décrivez l'état actuel de cet élément…"
                      value={elemForm.description}
                      onChange={e => setElemForm(p => ({ ...p, description: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Points forts</label>
                    <textarea className="input" rows={2}
                      placeholder="Atouts, bonnes pratiques en place…"
                      value={elemForm.strengths}
                      onChange={e => setElemForm(p => ({ ...p, strengths: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Points faibles / Risques</label>
                    <textarea className="input" rows={2}
                      placeholder="Lacunes, dysfonctionnements, menaces…"
                      value={elemForm.weaknesses}
                      onChange={e => setElemForm(p => ({ ...p, weaknesses: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes complémentaires</label>
                    <textarea className="input" rows={2}
                      placeholder="Observations, données chiffrées…"
                      value={elemForm.notes}
                      onChange={e => setElemForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>

                  <div className="section-sep" />

                  <div className="form-group">
                    <label className="form-label">Questions guides</label>
                    <div className="questions-list">
                      {currentElem.questions.map((q, i) => (
                        <div key={i} className="question-item">
                          <span className="q-num">#{i + 1}</span>
                          <span className="q-text">{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="btn primary" onClick={saveElement}>
                    Enregistrer {currentElem.label}
                  </button>

                  <div style={{ height: 8 }} />
                </div>
              </>
            )}
          </aside>
        </div>

        {/* ── AI Panel ── */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-panel-header">
            <span className="ai-panel-title">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>

          {!aiLoading && aiResult && (
            <div className="ai-tabs">
              {[
                { id: 'summary',  label: 'Synthèse' },
                { id: 'elements', label: 'Par facteur' },
                { id: 'risks',    label: 'Risques' },
                { id: 'roadmap',  label: 'Feuille de route' },
              ].map(t => (
                <button key={t.id} className={`ai-tab ${aiTab === t.id ? 'active' : ''}`} onClick={() => setAiTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="ai-content">
            {aiLoading && (
              <div className="ai-loading">
                <div className="spinner" />
                Analyse 7S en cours par Claude…
              </div>
            )}

            {!aiLoading && aiResult && (
              <>
                {/* ── Summary tab ── */}
                {aiTab === 'summary' && (
                  <>
                    {/* Readiness hero */}
                    {aiResult.readiness_score && (() => {
                      const label = aiResult.readiness_label || getReadiness(aiResult.readiness_score)
                      const rc = READINESS_CONFIG[label] || { color: 'var(--muted2)', bg: 'var(--surface2)' }
                      return (
                        <div className="readiness-hero">
                          <div className="readiness-score-circle" style={{ background: rc.bg, border: `3px solid ${rc.color}`, color: rc.color }}>
                            {aiResult.readiness_score.toFixed(1)}
                          </div>
                          <div>
                            <div className="readiness-label" style={{ color: rc.color }}>{label}</div>
                            <div className="readiness-sub">Score de readiness au changement</div>
                          </div>
                        </div>
                      )
                    })()}

                    {aiResult.executive_summary && (
                      <div>
                        <div className="ai-section-title">Synthèse exécutive</div>
                        <div className="ai-box">{aiResult.executive_summary}</div>
                      </div>
                    )}

                    {aiResult.critical_misalignments?.length > 0 && (
                      <div>
                        <div className="ai-section-title">Désalignements critiques</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {aiResult.critical_misalignments.map((m, i) => {
                            const sev = SEVERITY_COLOR[m.severity] || '#f59e0b'
                            return (
                              <div key={i} className="risk-card" style={{ borderColor: `color-mix(in srgb, ${sev} 20%, transparent)` }}>
                                <div className="risk-header">
                                  <span className="risk-name">
                                    {m.pair?.map(k => SEVEN_S[k]?.label || k).join(' ↔ ')}
                                  </span>
                                  <span className="severity-chip" style={{ background: `color-mix(in srgb, ${sev} 12%, transparent)`, color: sev }}>
                                    {m.severity}
                                  </span>
                                </div>
                                <div className="risk-mitigation">{m.description}</div>
                                {m.resolution && (
                                  <div style={{ fontSize: 11, color: 'var(--accent2)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                                    → {m.resolution}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {aiResult.alignment_matrix?.length > 0 && (
                      <div>
                        <div className="ai-section-title">Matrice d'alignement</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {aiResult.alignment_matrix.slice(0, 6).map((row, i) => {
                            const aPriorColor = SEVERITY_COLOR[row.priority] || '#f59e0b'
                            const alignColor = row.alignment === 'Alignés' ? '#22d3a5'
                              : row.alignment === 'Partiellement alignés' ? '#f59e0b'
                              : '#f87171'
                            return (
                              <div key={i} className="align-row">
                                <div className="align-pair">
                                  <span>{SEVEN_S[row.element_a]?.icon} {SEVEN_S[row.element_a]?.label}</span>
                                  <span style={{ color: 'var(--muted)', fontWeight: 400 }}>↔</span>
                                  <span>{SEVEN_S[row.element_b]?.icon} {SEVEN_S[row.element_b]?.label}</span>
                                  <span className="align-status" style={{ marginLeft: 'auto', background: `color-mix(in srgb, ${alignColor} 12%, transparent)`, color: alignColor }}>
                                    {row.alignment}
                                  </span>
                                </div>
                                {row.analysis && <div className="align-analysis">{row.analysis}</div>}
                                {row.priority && (
                                  <span className="align-priority" style={{ color: aPriorColor }}>Priorité : {row.priority}</span>
                                )}
                              </div>
                            )
                          })}
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

                {/* ── Elements tab ── */}
                {aiTab === 'elements' && aiResult.elements && (
                  <>
                    {Object.entries(SEVEN_S).map(([key, meta]) => {
                      const el = aiResult.elements[key]
                      if (!el) return null
                      return (
                        <div key={key} className="elem-ai-card">
                          <div className="elem-ai-header">
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                              {meta.icon}
                            </div>
                            <div className="elem-ai-name" style={{ color: meta.color }}>{meta.label}</div>
                            <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'Geist Mono,monospace', color: meta.color, fontWeight: 700 }}>
                              {active?.elements?.[key]?.score ?? 3}/5
                            </span>
                          </div>
                          {el.assessment && <div className="elem-ai-assessment">{el.assessment}</div>}
                          {el.change_impact && (
                            <div style={{ fontSize: 11, padding: '6px 10px', background: 'var(--surface3)', borderRadius: 5, color: 'var(--muted2)', fontStyle: 'italic', borderLeft: `3px solid ${meta.color}` }}>
                              Impact changement : {el.change_impact}
                            </div>
                          )}
                          {el.strengths?.length > 0 && (
                            <div className="tags-row">
                              {el.strengths.map((s, i) => <span key={i} className="tag strength">+ {s}</span>)}
                            </div>
                          )}
                          {el.risks?.length > 0 && (
                            <div className="tags-row">
                              {el.risks.map((r, i) => <span key={i} className="tag risk">⚠ {r}</span>)}
                            </div>
                          )}
                          {el.actions?.length > 0 && (
                            <div className="tags-row">
                              {el.actions.map((a, i) => <span key={i} className="tag action">→ {a}</span>)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {/* ── Risks tab ── */}
                {aiTab === 'risks' && (
                  <>
                    {aiResult.change_risks?.length > 0 && (
                      <div>
                        <div className="ai-section-title">Risques de transformation ({aiResult.change_risks.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {aiResult.change_risks.map((r, i) => {
                            const sev = SEVERITY_COLOR[r.severity] || '#f59e0b'
                            const prob = SEVERITY_COLOR[r.probability] || '#f59e0b'
                            return (
                              <div key={i} className="risk-card">
                                <div className="risk-header">
                                  <span className="risk-name">{r.risk}</span>
                                  <div className="risk-badges">
                                    <span className="severity-chip" style={{ background: `color-mix(in srgb, ${sev} 12%, transparent)`, color: sev }}>
                                      Sévérité : {r.severity}
                                    </span>
                                    <span className="severity-chip" style={{ background: `color-mix(in srgb, ${prob} 12%, transparent)`, color: prob }}>
                                      P : {r.probability}
                                    </span>
                                  </div>
                                </div>
                                {r.source && <div className="risk-source">Source : {r.source}</div>}
                                {r.mitigation && <div className="risk-mitigation">→ {r.mitigation}</div>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {aiResult.quick_wins?.length > 0 && (
                      <div>
                        <div className="ai-section-title">Quick wins — &lt; 30 jours</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {aiResult.quick_wins.map((qw, i) => (
                            <div key={i} className="quick-win">
                              <span className="qw-icon">✓</span>
                              <div>
                                <div className="qw-action">{qw.action}</div>
                                {qw.impact && <div className="qw-impact">{qw.impact}</div>}
                                {qw.s_element && (
                                  <span style={{ fontSize: 9, fontFamily: 'Geist Mono,monospace', color: SEVEN_S[qw.s_element]?.color, marginTop: 4, display: 'block' }}>
                                    {SEVEN_S[qw.s_element]?.icon} {SEVEN_S[qw.s_element]?.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiResult.kpis?.length > 0 && (
                      <div>
                        <div className="ai-section-title">KPIs de transformation</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {aiResult.kpis.map((kpi, i) => (
                            <div key={i} className="kpi-row">
                              <div>
                                <div className="kpi-name">{kpi.name}</div>
                                <div className="kpi-target">Cible : {kpi.target}</div>
                              </div>
                              <span className="kpi-timeline">{kpi.timeline}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Roadmap tab ── */}
                {aiTab === 'roadmap' && aiResult.transformation_roadmap?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {aiResult.transformation_roadmap.map((phase, i) => {
                      const colors = ['#818cf8', '#f59e0b', '#22d3a5']
                      const c = colors[i] || 'var(--accent2)'
                      return (
                        <div key={i} className="phase-card" style={{ borderColor: `color-mix(in srgb, ${c} 20%, transparent)` }}>
                          <div>
                            <div className="phase-name" style={{ color: c }}>{phase.phase}</div>
                            {phase.milestone && <div className="phase-milestone">{phase.milestone}</div>}
                          </div>
                          {phase.focus_elements?.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {phase.focus_elements.map((el, j) => {
                                const s = SEVEN_S[el]
                                return s ? (
                                  <span key={j} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: s.bg, color: s.color, fontFamily: 'Geist Mono,monospace', fontWeight: 700 }}>
                                    {s.icon} {s.label}
                                  </span>
                                ) : null
                              })}
                            </div>
                          )}
                          <div>
                            {phase.actions?.map((action, j) => (
                              <div key={j} className="phase-action">
                                <span className="phase-action-num">→</span>
                                <span>{action}</span>
                              </div>
                            ))}
                          </div>
                          {phase.success_criteria && (
                            <div style={{ fontSize: 11, color: 'var(--muted2)', padding: '6px 10px', background: 'var(--surface3)', borderRadius: 5, borderLeft: `3px solid ${c}`, fontStyle: 'italic' }}>
                              ✓ {phase.success_criteria}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div className="empty-cta">
                <div className="empty-icon">✦</div>
                <div className="empty-txt">
                  Cliquez sur "Analyse IA" pour obtenir une évaluation complète de l'alignement 7S et la feuille de route de transformation.
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