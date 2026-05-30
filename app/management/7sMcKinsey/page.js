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
  'Critique': '#f87171', 'Élevé': '#fb923c', 'Modéré': '#f59e0b',
  'Haute': '#f87171', 'Moyenne': '#f59e0b', 'Faible': '#22d3a5', 'Élevée': '#fb923c',
}

// ─── AI Generation Panel ──────────────────────────────────────────────────────
function AIGeneratePanel({ projectName, companyName, onGenerated, onClose }) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const generate = async () => {
    if (description.trim().length < 15) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-7sMcKinsey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate', description, projectName, companyName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur API')
      setResult(json.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,15,.75)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 500,
    }}>
      <div style={{
        background: '#111118', border: '1px solid rgba(250,204,21,.2)',
        borderRadius: 20, width: 660, maxHeight: '88vh', overflow: 'auto',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 64px rgba(0,0,0,.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,.07)',
          background: 'linear-gradient(135deg, rgba(250,204,21,.06) 0%, rgba(99,102,241,.06) 100%)',
          borderRadius: '20px 20px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>✦</span>
            <div>
              <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 17, color: '#facc15' }}>
                IA — Génération 7S automatique
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2, fontFamily: 'Geist Mono, monospace' }}>
                Décrivez votre organisation, l'IA évalue les 7 facteurs
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.3)', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Input */}
          {!result && (
            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Geist Mono, monospace', display: 'block', marginBottom: 8 }}>
                Description de l'organisation / initiative
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Startup SaaS B2B de 45 personnes en phase de scale. Produit de gestion RH, levée de fonds Série A de 8M€ il y a 6 mois. Équipe commerciale à renforcer, culture très tech mais management encore informel. Volonté de structurer les processus et d'accélérer l'expansion Europe..."
                style={{
                  width: '100%', minHeight: 140, padding: '14px 16px',
                  background: '#0a0a0f', border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 10, color: '#f0eff5', fontSize: 13, lineHeight: 1.7,
                  fontFamily: 'Syne, sans-serif', resize: 'vertical', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', textAlign: 'right', marginTop: 4, fontFamily: 'Geist Mono, monospace' }}>
                {description.length} caractères
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: 12, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, fontSize: 12, color: '#f87171', display: 'flex', gap: 8 }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,.1)', borderTop: '2px solid #facc15', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', fontFamily: 'Geist Mono, monospace' }}>
                Génération de l'évaluation 7S en cours…
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {/* Result preview */}
          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 16, background: 'rgba(250,204,21,.06)', border: '1px solid rgba(250,204,21,.2)', borderRadius: 12 }}>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 15, color: '#facc15', marginBottom: 6 }}>
                  ✦ {result.projectTitle}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, margin: 0 }}>{result.summary}</p>
              </div>

              {/* Scores preview */}
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Geist Mono, monospace', marginBottom: 8 }}>
                  Scores générés
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(SEVEN_S).map(([key, meta]) => {
                    const score = result.elements?.[key]?.score ?? 3
                    return (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px', background: meta.bg, border: `1px solid ${meta.border}`,
                        borderRadius: 6, fontSize: 11,
                      }}>
                        <span>{meta.icon}</span>
                        <span style={{ color: meta.color, fontWeight: 700, fontFamily: 'Geist Mono, monospace' }}>{score}/5</span>
                        <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 10 }}>{meta.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {result.initialRecommendations?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Geist Mono, monospace', marginBottom: 8 }}>
                    Recommandations initiales
                  </div>
                  {result.initialRecommendations.map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 8, padding: '7px 10px', marginBottom: 5,
                      background: 'rgba(34,211,165,.04)', border: '1px solid rgba(34,211,165,.15)',
                      borderRadius: 7, fontSize: 12, color: 'rgba(255,255,255,.6)',
                    }}>
                      <span style={{ color: '#22d3a5', flexShrink: 0 }}>→</span>
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#0d0d14', borderRadius: '0 0 20px 20px',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)',
            background: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,.4)',
            fontFamily: 'Geist Mono, monospace',
          }}>
            Annuler
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {result && (
              <button onClick={() => { onGenerated(result); onClose() }} style={{
                padding: '8px 18px', borderRadius: 8, background: '#facc15',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                color: '#0a0a0f', fontFamily: 'Geist Mono, monospace',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                ✦ Appliquer cette évaluation
              </button>
            )}
            {!result && !loading && (
              <button
                onClick={generate}
                disabled={description.trim().length < 15}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  background: description.trim().length >= 15 ? 'rgba(250,204,21,.15)' : 'rgba(255,255,255,.05)',
                  border: `1px solid ${description.trim().length >= 15 ? 'rgba(250,204,21,.3)' : 'rgba(255,255,255,.08)'}`,
                  cursor: description.trim().length >= 15 ? 'pointer' : 'not-allowed',
                  fontSize: 12, fontWeight: 700,
                  color: description.trim().length >= 15 ? '#facc15' : 'rgba(255,255,255,.2)',
                  fontFamily: 'Geist Mono, monospace',
                }}
              >
                ✦ Générer l'évaluation 7S
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 7S Hexagon SVG diagram ───────────────────────────────────────────────────
function SevenSHexagon({ elements, activeKey, onSelect }) {
  const cx = 200, cy = 200, r = 110, dotR = 38
  const outerKeys = ['strategy', 'structure', 'systems', 'style', 'staff', 'skills']
  const angles = outerKeys.map((_, i) => (Math.PI * 2 * i) / 6 - Math.PI / 2)
  const positions = {}
  outerKeys.forEach((key, i) => {
    positions[key] = { x: cx + r * Math.cos(angles[i]), y: cy + r * Math.sin(angles[i]) }
  })
  positions['sharedValues'] = { x: cx, y: cy }

  return (
    <svg viewBox="0 0 400 400" style={{ width: '100%', maxWidth: 340, display: 'block', margin: '0 auto' }}>
      {outerKeys.map(key => {
        const pos = positions[key]
        return <line key={`line-${key}`} x1={cx} y1={cy} x2={pos.x} y2={pos.y} stroke="rgba(255,255,255,.06)" strokeWidth="1.5" strokeDasharray="4 4" />
      })}
      <polygon points={outerKeys.map(key => `${positions[key].x},${positions[key].y}`).join(' ')} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
      <polygon
        points={outerKeys.map(key => {
          const pos = positions[key]; const score = (elements[key]?.score ?? 3) / 5
          const dx = pos.x - cx, dy = pos.y - cy
          return `${cx + dx * score},${cy + dy * score}`
        }).join(' ')}
        fill="rgba(99,102,241,.06)" stroke="rgba(99,102,241,.3)" strokeWidth="1"
      />
      {outerKeys.map(key => {
        const pos = positions[key]; const s = SEVEN_S[key]; const score = elements[key]?.score ?? 3; const isActive = activeKey === key
        return (
          <g key={key} style={{ cursor: 'pointer' }} onClick={() => onSelect(key)}>
            <circle cx={pos.x} cy={pos.y} r={dotR + 4} fill={isActive ? s.bg : 'transparent'} />
            <circle cx={pos.x} cy={pos.y} r={dotR} fill={`color-mix(in srgb, ${s.color} ${12 + score * 8}%, #111118)`} stroke={isActive ? s.color : s.border} strokeWidth={isActive ? 2 : 1} />
            {(() => {
              const pct = score / 5; const arcR = dotR - 5
              const startAngle = -Math.PI / 2; const endAngle = startAngle + pct * Math.PI * 2
              const x1 = pos.x + arcR * Math.cos(startAngle); const y1 = pos.y + arcR * Math.sin(startAngle)
              const x2 = pos.x + arcR * Math.cos(endAngle); const y2 = pos.y + arcR * Math.sin(endAngle)
              const large = pct > 0.5 ? 1 : 0
              if (pct <= 0) return null
              return <path d={`M ${x1} ${y1} A ${arcR} ${arcR} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
            })()}
            <text x={pos.x} y={pos.y - 5} textAnchor="middle" fill="#fff" fontSize="14" dominantBaseline="middle">{s.icon}</text>
            <text x={pos.x} y={pos.y + 10} textAnchor="middle" fill={s.color} fontSize="8" fontWeight="700" fontFamily="'Geist Mono', monospace">{score}/5</text>
          </g>
        )
      })}
      {(() => {
        const key = 'sharedValues'; const s = SEVEN_S[key]; const score = elements[key]?.score ?? 3; const isActive = activeKey === key
        return (
          <g style={{ cursor: 'pointer' }} onClick={() => onSelect(key)}>
            <circle cx={cx} cy={cy} r={42} fill={`color-mix(in srgb, ${s.color} ${10 + score * 6}%, #0a0a0f)`} stroke={isActive ? s.color : s.border} strokeWidth={isActive ? 2.5 : 1.5} />
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#fff" fontSize="16" dominantBaseline="middle">{s.icon}</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill={s.color} fontSize="8" fontWeight="700" fontFamily="'Geist Mono', monospace">{score}/5</text>
          </g>
        )
      })()}
      {outerKeys.map(key => {
        const pos = positions[key]; const s = SEVEN_S[key]; const labelR = r + dotR + 12
        const angle = angles[outerKeys.indexOf(key)]
        const lx = cx + labelR * Math.cos(angle); const ly = cy + labelR * Math.sin(angle)
        return (
          <text key={`label-${key}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={s.color} fontSize="9" fontWeight="700" fontFamily="'Geist Mono', monospace" opacity="0.8">
            {s.label.toUpperCase()}
          </text>
        )
      })}
      <text x={cx} y={cy + 56} textAnchor="middle" fill={SEVEN_S.sharedValues.color} fontSize="8" fontWeight="700" fontFamily="'Geist Mono', monospace" opacity="0.8">VALEURS PARTAGÉES</text>
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SevenSPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')

  const [project, setProject]       = useState(null)
  const [analyses, setAnalyses]     = useState([])
  const [activeId, setActiveId]     = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [showGenPanel, setShowGenPanel] = useState(false)
  const [newAnalysis, setNewAnalysis] = useState({ name: '', companyName: '', changeInitiative: '', context: '', changeType: 'transformation' })
  const [activeKey, setActiveKey]   = useState('strategy')
  const [elemForm, setElemForm]     = useState(EMPTY_ELEMENT)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiResult, setAiResult]     = useState(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiTab, setAiTab]           = useState('summary')
  const [toast, setToast]           = useState(null)
  const [showDiagram, setShowDiagram] = useState(true)
  const importRef = useState(null)

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

  // ── CRUD ──
  const createAnalysis = () => {
    if (!newAnalysis.name.trim()) return
    const a = {
      id: uid(), name: newAnalysis.name.trim(),
      companyName: newAnalysis.companyName.trim(),
      changeInitiative: newAnalysis.changeInitiative.trim(),
      context: newAnalysis.context.trim(),
      changeType: newAnalysis.changeType,
      createdAt: new Date().toISOString(),
      elements: Object.fromEntries(Object.keys(SEVEN_S).map(k => [k, { ...EMPTY_ELEMENT }])),
      aiResult: null,
    }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowNewForm(false)
    setNewAnalysis({ name: '', companyName: '', changeInitiative: '', context: '', changeType: 'transformation' })
    setActiveKey('strategy'); showToast(`Analyse "${a.name}" créée`)
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

  const selectElement = (key) => {
    setActiveKey(key)
    const current = active?.elements?.[key] || EMPTY_ELEMENT
    setElemForm({ ...EMPTY_ELEMENT, ...current })
  }

  const saveElement = () => {
    if (!active) return
    const elements = { ...(active.elements || {}), [activeKey]: { ...elemForm, score: parseFloat(elemForm.score) || 3 } }
    updateAnalysis({ elements })
    showToast(`${SEVEN_S[activeKey]?.label} mis à jour`)
  }

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

  // ── AI: Apply generated 7S ──
  const handleGenerated = (data) => {
    if (!active) {
      // Create new analysis with generated data
      const a = {
        id: uid(), name: data.projectTitle || 'Analyse générée par IA',
        companyName: project?.name || '', changeInitiative: '',
        context: '', changeType: data.changeType || 'transformation',
        createdAt: new Date().toISOString(),
        elements: data.elements,
        generatedSummary: data.summary,
        initialRecommendations: data.initialRecommendations || [],
        aiResult: null,
      }
      const updated = [...analyses, a]
      setAnalyses(updated); setActiveId(a.id); persist(updated)
      showToast('Évaluation 7S générée et appliquée')
    } else {
      // Overwrite current analysis elements
      updateAnalysis({
        elements: data.elements,
        generatedSummary: data.summary,
        initialRecommendations: data.initialRecommendations || [],
        changeType: data.changeType || active.changeType,
      })
      showToast('Évaluation 7S mise à jour par l\'IA')
    }
    setActiveKey('strategy')
    const current = data.elements?.['strategy'] || EMPTY_ELEMENT
    setElemForm({ ...EMPTY_ELEMENT, ...current })
  }

  // ── AI Analyst ──
  const runAI = async () => {
    if (!active) return
    setAiLoading(true); setShowAiPanel(true); setAiResult(null); setAiTab('summary')
    try {
      const res = await fetch('/api/generer-management/generer-7sMcKinsey-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'analyze',
          projectName: project?.name || '',
          projectTag: project?.tag || '',
          companyName: active.companyName,
          changeInitiative: active.changeInitiative,
          context: active.context,
          changeType: active.changeType,
          elements: active.elements,
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

  // ── Export JSON ──
  const exportAnalysis = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `7S_${active.name.replace(/\s+/g, '_')}_${Date.now()}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('Export JSON téléchargé')
  }

  // ── Export CSV ──
  const exportCSV = () => {
    if (!active) return
    const headers = ['Facteur', 'Type', 'Score', 'Description', 'Points forts', 'Points faibles', 'Notes']
    const rows = Object.entries(SEVEN_S).map(([key, meta]) => {
      const el = active.elements?.[key] || {}
      return [
        `"${meta.label}"`,
        meta.type,
        el.score ?? 3,
        `"${(el.description || '').replace(/"/g, '""')}"`,
        `"${(el.strengths || '').replace(/"/g, '""')}"`,
        `"${(el.weaknesses || '').replace(/"/g, '""')}"`,
        `"${(el.notes || '').replace(/"/g, '""')}"`,
      ]
    })
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `7S_${active.name.replace(/\s+/g, '_')}_${Date.now()}.csv`
    a.click(); URL.revokeObjectURL(url)
    showToast('Export CSV téléchargé')
  }

  // ── Import JSON ──
  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        // Validate minimal structure
        if (!data.elements || !data.name) { showToast('Fichier JSON invalide', 'error'); return }
        if (window.confirm(`Importer l'analyse "${data.name}" ?`)) {
          const a = { ...data, id: uid(), createdAt: data.createdAt || new Date().toISOString() }
          const updated = [...analyses, a]
          setAnalyses(updated); setActiveId(a.id); persist(updated)
          showToast(`Analyse "${a.name}" importée`)
        }
      } catch { showToast('Erreur de lecture du fichier JSON', 'error') }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  useEffect(() => {
    if (active?.aiResult && !aiResult) setAiResult(active.aiResult)
    else if (!active?.aiResult) setAiResult(null)
  }, [activeId])

  const currentElem = SEVEN_S[activeKey]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0a0f; --surface: #111118; --surface2: #18181f; --surface3: #1e1e28;
          --border: rgba(255,255,255,.07); --border2: rgba(255,255,255,.12);
          --text: #f0eff5; --muted: #6b6a7a; --muted2: #9896aa;
          --accent: #6366f1; --accent2: #818cf8;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
        .root { min-height: 100vh; display: flex; flex-direction: column; }
        .topbar { height: 56px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 12px; position: sticky; top: 0; z-index: 100; }
        .back-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border2); color: var(--muted2); font-family: 'Geist Mono', monospace; font-size: 11px; cursor: pointer; transition: all .15s; }
        .back-btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .topbar-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .topbar-sub { font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .topbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }
        .btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 11px; letter-spacing: .04em; border: 1px solid var(--border2); background: var(--surface2); color: var(--muted2); transition: all .15s; }
        .btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .btn.primary:hover { background: #4f52d8; }
        .btn.ai { background: rgba(250,204,21,.08); border-color: rgba(250,204,21,.25); color: #facc15; }
        .btn.ai:hover { background: rgba(250,204,21,.15); }
        .btn.ai-gen { background: rgba(99,102,241,.08); border-color: rgba(99,102,241,.25); color: var(--accent2); }
        .btn.ai-gen:hover { background: rgba(99,102,241,.15); }
        .btn:disabled { opacity: .4; cursor: not-allowed; }
        .body { flex: 1; display: grid; grid-template-columns: 240px 1fr 380px; height: calc(100vh - 56px); overflow: hidden; }
        .left-panel { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .panel-header { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .panel-label { font-size: 10px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .panel-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
        .analysis-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
        .analysis-item:hover { background: var(--surface2); }
        .analysis-item.active { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.25); }
        .a-name { font-size: 12px; font-weight: 600; color: var(--text); }
        .a-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 2px; }
        .a-del { opacity: 0; background: none; border: none; color: #f87171; cursor: pointer; font-size: 12px; float: right; padding: 0; }
        .analysis-item:hover .a-del { opacity: 1; }
        .readiness-badge { display: inline-block; margin-top: 5px; font-size: 10px; font-family: 'Geist Mono', monospace; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
        .new-form { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
        .input { width: 100%; background: var(--bg); border: 1px solid var(--border2); border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif; font-size: 12px; color: var(--text); outline: none; transition: border-color .15s; }
        .input:focus { border-color: var(--accent); }
        .input::placeholder { color: var(--muted); }
        textarea.input { resize: vertical; min-height: 52px; }
        select.input { appearance: none; cursor: pointer; }
        .form-label { font-size: 10px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 3px; display: block; font-family: 'Geist Mono', monospace; }
        .center-panel { overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
        .overview-header { display: flex; gap: 16px; align-items: flex-start; }
        .overview-left { flex: 1; }
        .main-title { font-family: 'Instrument Serif', serif; font-size: 22px; font-style: italic; }
        .main-sub { font-size: 12px; color: var(--muted2); margin-top: 4px; line-height: 1.5; }
        .change-badge { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; font-size: 10px; font-family: 'Geist Mono', monospace; font-weight: 700; padding: 3px 9px; border-radius: 4px; background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.25); color: var(--accent2); }
        .ai-gen-badge { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; margin-left: 6px; font-size: 9px; font-family: 'Geist Mono', monospace; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: rgba(250,204,21,.08); border: 1px solid rgba(250,204,21,.2); color: #facc15; }
        .score-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .score-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
        .sc-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-family: 'Geist Mono', monospace; }
        .sc-value { font-size: 20px; font-weight: 800; font-family: 'Geist Mono', monospace; }
        .sc-sub { font-size: 10px; color: var(--muted2); }
        .sevens-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .s-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; cursor: pointer; transition: all .15s; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; }
        .s-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: 2px 2px 0 0; opacity: 0; transition: opacity .2s; }
        .s-card:hover { border-color: var(--border2); }
        .s-card:hover::before, .s-card.selected::before { opacity: 1; }
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
        .diagram-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .diagram-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .diagram-title { font-size: 12px; font-weight: 700; color: var(--muted2); text-transform: uppercase; letter-spacing: .06em; font-family: 'Geist Mono', monospace; }
        .right-panel { background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .elem-header { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
        .elem-icon-row { display: flex; align-items: center; gap: 10px; }
        .elem-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .elem-name { font-family: 'Instrument Serif', serif; font-size: 16px; font-style: italic; }
        .elem-fr { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .elem-desc { font-size: 11px; color: var(--muted2); line-height: 1.5; }
        .type-tag { font-size: 9px; font-family: 'Geist Mono', monospace; font-weight: 700; padding: 2px 7px; border-radius: 3px; }
        .form-scroll { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .form-group { display: flex; flex-direction: column; }
        .score-dots { display: flex; gap: 6px; justify-content: space-between; }
        .score-dot { flex: 1; height: 28px; border-radius: 5px; cursor: pointer; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-family: 'Geist Mono', monospace; font-weight: 700; background: var(--surface2); color: var(--muted2); transition: all .15s; }
        .score-dot:hover { border-color: var(--border2); color: var(--text); }
        .score-dot.active { color: #fff; }
        .score-labels { display: flex; justify-content: space-between; font-size: 9px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .questions-list { display: flex; flex-direction: column; gap: 6px; }
        .question-item { display: flex; gap: 8px; align-items: flex-start; padding: 8px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); }
        .q-num { font-size: 9px; font-family: 'Geist Mono', monospace; color: var(--muted); flex-shrink: 0; padding-top: 1px; }
        .q-text { font-size: 11px; color: var(--muted2); line-height: 1.5; }
        .section-sep { height: 1px; background: var(--border); }
        .ai-panel { position: fixed; right: 0; top: 56px; bottom: 0; width: 480px; background: var(--surface); border-left: 1px solid var(--border); z-index: 80; display: flex; flex-direction: column; overflow: hidden; transform: translateX(100%); transition: transform .3s ease; }
        .ai-panel.open { transform: translateX(0); }
        .ai-panel-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .ai-panel-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .ai-tabs { display: flex; gap: 4px; padding: 10px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0; flex-wrap: wrap; }
        .ai-tab { padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 10px; font-family: 'Geist Mono', monospace; font-weight: 600; border: 1px solid var(--border); background: var(--surface2); color: var(--muted2); transition: all .15s; letter-spacing: .04em; }
        .ai-tab:hover { color: var(--text); border-color: var(--border2); }
        .ai-tab.active { background: var(--surface3); color: var(--text); border-color: var(--border2); }
        .ai-content { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
        .ai-section-title { font-size: 10px; color: var(--muted2); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 6px; }
        .ai-box { background: var(--surface2); border: 1px solid var(--border2); border-radius: 10px; padding: 14px; font-size: 13px; color: var(--text); line-height: 1.7; }
        .readiness-hero { display: flex; align-items: center; gap: 14px; padding: 16px; background: var(--surface2); border-radius: 10px; border: 1px solid var(--border2); }
        .readiness-score-circle { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px; font-weight: 800; font-family: 'Geist Mono', monospace; }
        .readiness-label { font-size: 16px; font-weight: 700; font-family: 'Instrument Serif', serif; font-style: italic; }
        .readiness-sub { font-size: 11px; color: var(--muted2); margin-top: 2px; }
        .align-row { padding: 10px 12px; background: var(--surface2); border-radius: 8px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
        .align-pair { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }
        .align-status { font-size: 10px; font-family: 'Geist Mono', monospace; padding: 2px 7px; border-radius: 4px; }
        .align-analysis { font-size: 11px; color: var(--muted2); line-height: 1.5; }
        .elem-ai-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .elem-ai-header { display: flex; align-items: center; gap: 8px; }
        .elem-ai-name { font-size: 12px; font-weight: 700; }
        .elem-ai-assessment { font-size: 12px; color: var(--muted2); line-height: 1.6; }
        .tags-row { display: flex; flex-wrap: wrap; gap: 4px; }
        .tag { font-size: 10px; font-family: 'Geist Mono', monospace; padding: 2px 7px; border-radius: 4px; }
        .tag.strength { background: rgba(34,211,165,.1); color: #22d3a5; }
        .tag.risk { background: rgba(248,113,113,.1); color: #f87171; }
        .tag.action { background: rgba(99,102,241,.1); color: var(--accent2); }
        .risk-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .risk-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .risk-name { font-size: 12px; font-weight: 700; flex: 1; }
        .risk-badges { display: flex; gap: 4px; }
        .severity-chip { font-size: 9px; font-family: 'Geist Mono', monospace; font-weight: 700; padding: 2px 7px; border-radius: 3px; }
        .risk-source { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .risk-mitigation { font-size: 11px; color: var(--muted2); line-height: 1.5; }
        .phase-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .phase-name { font-size: 13px; font-weight: 700; }
        .phase-action { display: flex; gap: 8px; font-size: 11px; color: var(--text); padding: 5px 0; border-bottom: 1px solid var(--border); }
        .phase-action:last-child { border-bottom: none; }
        .phase-action-num { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--muted); flex-shrink: 0; }
        .quick-win { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; background: rgba(34,211,165,.04); border: 1px solid rgba(34,211,165,.15); border-radius: 8px; }
        .qw-action { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
        .qw-impact { font-size: 11px; color: var(--muted2); }
        .kpi-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 8px 12px; background: var(--surface2); border-radius: 6px; border: 1px solid var(--border); }
        .kpi-name { font-size: 12px; font-weight: 600; }
        .kpi-target { font-size: 11px; color: var(--muted2); }
        .kpi-timeline { font-size: 10px; font-family: 'Geist Mono', monospace; color: var(--accent2); white-space: nowrap; }
        .ai-loading { display: flex; align-items: center; gap: 12px; padding: 24px; color: var(--muted2); font-size: 13px; }
        .spinner { width: 18px; height: 18px; border: 2px solid var(--border2); border-top-color: #facc15; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-cta { padding: 40px 16px; text-align: center; }
        .empty-icon { font-size: 36px; opacity: .25; margin-bottom: 12px; }
        .empty-txt { font-size: 13px; color: var(--muted); line-height: 1.6; }
        .toast { position: fixed; bottom: 24px; right: 24px; z-index: 600; background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px; padding: 12px 18px; font-size: 13px; box-shadow: 0 8px 32px rgba(0,0,0,.4); animation: slideUp .2s ease; display: flex; align-items: center; gap: 8px; }
        .toast.error { border-color: rgba(248,113,113,.3); color: #f87171; }
        .toast.info { border-color: rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1200px) { .body { grid-template-columns: 220px 1fr; } .right-panel { display: none; } }
        @media (max-width: 760px) { .body { grid-template-columns: 1fr; } .left-panel { display: none; } .sevens-grid { grid-template-columns: 1fr 1fr; } .score-cards { grid-template-columns: 1fr 1fr; } }
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
            {/* AI Generate */}
            <button className="btn ai-gen" onClick={() => setShowGenPanel(true)}>
              ✦ Générer 7S par IA
            </button>

            {active && (
              <>
                {/* AI Analyze */}
                <button className="btn ai" onClick={runAI} disabled={aiLoading}>
                  {aiLoading
                    ? <><span className="spinner" style={{ borderTopColor: '#facc15' }} /> Analyse…</>
                    : '✦ Analyser'}
                </button>

                {/* Export dropdown */}
                <div style={{ position: 'relative' }}>
                  <select
                    className="btn"
                    style={{ appearance: 'none', paddingRight: 28, cursor: 'pointer' }}
                    onChange={e => {
                      if (e.target.value === 'json') exportAnalysis()
                      if (e.target.value === 'csv') exportCSV()
                      e.target.value = ''
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>↓ Exporter</option>
                    <option value="json">JSON (complet)</option>
                    <option value="csv">CSV (tableur)</option>
                  </select>
                </div>

                {/* Import */}
                <label className="btn" style={{ cursor: 'pointer' }}>
                  ↑ Importer
                  <input type="file" accept=".json,application/json" hidden onChange={handleImport} />
                </label>
              </>
            )}

            {/* Import (no active) */}
            {!active && (
              <label className="btn" style={{ cursor: 'pointer' }}>
                ↑ Importer JSON
                <input type="file" accept=".json,application/json" hidden onChange={handleImport} />
              </label>
            )}
          </div>
        </header>

        <div className="body">

          {/* ── Left panel ── */}
          <aside className="left-panel">
            <div className="panel-header">
              <span className="panel-label">Analyses ({analyses.length})</span>
            </div>
            <div className="panel-list">
              {analyses.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">🧭</div>
                  <div className="empty-txt">Créez ou générez votre première analyse 7S</div>
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
                    {a.generatedSummary && (
                      <span style={{ fontSize: 9, color: '#facc15', fontFamily: 'Geist Mono, monospace', display: 'block', marginTop: 3 }}>✦ Généré par IA</span>
                    )}
                    {rc && avg && (
                      <span className="readiness-badge" style={{ background: rc.bg, color: rc.color }}>
                        {avg}/5 — {readLabel}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* New form */}
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
              <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowNewForm(true)}>
                  + Manuel
                </button>
                <button className="btn ai-gen" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }} onClick={() => setShowGenPanel(true)}>
                  ✦ Générer par IA
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
                <div className="empty-txt" style={{ marginBottom: 20 }}>
                  Évaluez les 7 facteurs internes pour prédire le succès de votre changement
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="btn ai-gen" onClick={() => setShowGenPanel(true)} style={{ padding: '10px 20px' }}>
                    ✦ Générer par IA
                  </button>
                  <button className="btn" onClick={() => setShowNewForm(true)} style={{ padding: '10px 20px' }}>
                    + Créer manuellement
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="overview-header">
                  <div className="overview-left">
                    <h2 className="main-title">{active.name}</h2>
                    {active.companyName && <p className="main-sub">{active.companyName}</p>}
                    {active.changeInitiative && <p className="main-sub">Initiative : {active.changeInitiative}</p>}
                    {active.generatedSummary && (
                      <p className="main-sub" style={{ fontStyle: 'italic', color: 'rgba(250,204,21,.6)', marginTop: 6 }}>
                        {active.generatedSummary}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {active.changeType && (
                        <span className="change-badge">
                          {CHANGE_TYPES.find(c => c.value === active.changeType)?.label}
                        </span>
                      )}
                      {active.generatedSummary && (
                        <span className="ai-gen-badge">✦ Généré par IA</span>
                      )}
                    </div>
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

                {/* Initial recommendations from generation */}
                {active.initialRecommendations?.length > 0 && (
                  <div style={{ background: 'rgba(250,204,21,.04)', border: '1px solid rgba(250,204,21,.15)', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 10, color: '#facc15', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'Geist Mono, monospace', marginBottom: 8 }}>
                      ✦ Recommandations initiales IA
                    </div>
                    {active.initialRecommendations.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 12, color: 'rgba(255,255,255,.6)', borderBottom: i < active.initialRecommendations.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                        <span style={{ color: '#facc15', flexShrink: 0 }}>→</span> {r}
                      </div>
                    ))}
                  </div>
                )}

                {/* Score cards */}
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

                {/* Diagram */}
                <div className="diagram-section">
                  <div className="diagram-header">
                    <span className="diagram-title">Carte des 7S</span>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 10 }} onClick={() => setShowDiagram(v => !v)}>
                      {showDiagram ? '⊟ Masquer' : '⊞ Afficher'}
                    </button>
                  </div>
                  {showDiagram && (
                    <SevenSHexagon elements={active.elements || {}} activeKey={activeKey} onSelect={selectElement} />
                  )}
                </div>

                {/* 7S Grid */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700 }}>Évaluation des 7 facteurs</h3>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Geist Mono, monospace' }}>Cliquez pour évaluer →</span>
                  </div>
                  <div className="sevens-grid">
                    {['strategy','structure','systems','style','staff','skills','sharedValues'].map(key => {
                      const s = SEVEN_S[key]
                      const elem = active.elements?.[key] || {}
                      const score = elem.score ?? 3
                      const isSelected = activeKey === key
                      const typeLabel = s.type === 'hard' ? 'Facteur dur' : s.type === 'soft' ? 'Facteur mou' : 'Centre'
                      const typeColor = s.type === 'hard' ? '#818cf8' : s.type === 'soft' ? '#f472b6' : '#facc15'
                      return (
                        <div
                          key={key}
                          className={`s-card ${isSelected ? 'selected' : ''}`}
                          style={isSelected ? { borderColor: s.border, background: s.bg } : {}}
                          onClick={() => selectElement(key)}
                        >
                          <div className="s-card-header">
                            <div className="s-icon-wrap" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                              {s.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="s-name" style={{ color: s.color }}>{s.label}</div>
                              <span className="s-type-badge" style={{ background: `color-mix(in srgb, ${typeColor} 12%, transparent)`, color: typeColor }}>{typeLabel}</span>
                            </div>
                          </div>
                          <div className="s-desc">{s.desc}</div>
                          <div className="s-score-row">
                            <div className="s-score-bar">
                              <div className="s-score-fill" style={{ width: `${score / 5 * 100}%`, background: s.color }} />
                            </div>
                            <span className="s-score-num" style={{ color: s.color }}>{score}/5</span>
                          </div>
                          {elem.description && <div className="s-notes-preview">{elem.description}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </main>

          {/* ── Right panel: element form ── */}
          <aside className="right-panel">
            {!active ? (
              <div className="empty-cta"><div className="empty-txt">Sélectionnez une analyse</div></div>
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
                    <span className="type-tag" style={{ marginLeft: 'auto',
                      background: currentElem.type === 'center' ? 'rgba(250,204,21,.1)' : currentElem.type === 'hard' ? 'rgba(129,140,248,.1)' : 'rgba(244,114,182,.1)',
                      color: currentElem.type === 'center' ? '#facc15' : currentElem.type === 'hard' ? '#818cf8' : '#f472b6',
                    }}>
                      {currentElem.type === 'hard' ? 'Dur' : currentElem.type === 'soft' ? 'Mou' : 'Centre'}
                    </span>
                  </div>
                  <div className="elem-desc">{currentElem.desc}</div>
                </div>

                <div className="form-scroll">
                  <div className="form-group">
                    <label className="form-label">Score de maturité</label>
                    <div className="score-dots">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button key={v} className={`score-dot ${elemForm.score == v ? 'active' : ''}`}
                          style={elemForm.score == v ? { background: currentElem.color, borderColor: currentElem.color } : {}}
                          onClick={() => setElemForm(p => ({ ...p, score: v }))}>
                          {v}
                        </button>
                      ))}
                    </div>
                    <div className="score-labels">
                      <span>Très faible</span><span>Moyen</span><span>Excellent</span>
                    </div>
                  </div>
                  <div className="section-sep" />
                  <div className="form-group">
                    <label className="form-label">Évaluation globale</label>
                    <textarea className="input" rows={3} placeholder="Décrivez l'état actuel de cet élément…"
                      value={elemForm.description} onChange={e => setElemForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Points forts</label>
                    <textarea className="input" rows={2} placeholder="Atouts, bonnes pratiques en place…"
                      value={elemForm.strengths} onChange={e => setElemForm(p => ({ ...p, strengths: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Points faibles / Risques</label>
                    <textarea className="input" rows={2} placeholder="Lacunes, dysfonctionnements, menaces…"
                      value={elemForm.weaknesses} onChange={e => setElemForm(p => ({ ...p, weaknesses: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes complémentaires</label>
                    <textarea className="input" rows={2} placeholder="Observations, données chiffrées…"
                      value={elemForm.notes} onChange={e => setElemForm(p => ({ ...p, notes: e.target.value }))} />
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

        {/* ── AI Analysis Panel ── */}
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
                {aiTab === 'summary' && (
                  <>
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
                                  <span className="risk-name">{m.pair?.map(k => SEVEN_S[k]?.label || k).join(' ↔ ')}</span>
                                  <span className="severity-chip" style={{ background: `color-mix(in srgb, ${sev} 12%, transparent)`, color: sev }}>{m.severity}</span>
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
                            const alignColor = row.alignment === 'Alignés' ? '#22d3a5' : row.alignment === 'Partiellement alignés' ? '#f59e0b' : '#f87171'
                            const aPriorColor = SEVERITY_COLOR[row.priority] || '#f59e0b'
                            return (
                              <div key={i} className="align-row">
                                <div className="align-pair">
                                  <span>{SEVEN_S[row.element_a]?.icon} {SEVEN_S[row.element_a]?.label}</span>
                                  <span style={{ color: 'var(--muted)', fontWeight: 400 }}>↔</span>
                                  <span>{SEVEN_S[row.element_b]?.icon} {SEVEN_S[row.element_b]?.label}</span>
                                  <span className="align-status" style={{ marginLeft: 'auto', background: `color-mix(in srgb, ${alignColor} 12%, transparent)`, color: alignColor }}>{row.alignment}</span>
                                </div>
                                {row.analysis && <div className="align-analysis">{row.analysis}</div>}
                                {row.priority && <span style={{ fontSize: 9, color: aPriorColor, fontFamily: 'Geist Mono, monospace' }}>Priorité : {row.priority}</span>}
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
                            <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'Geist Mono, monospace', color: meta.color, fontWeight: 700 }}>
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
                            <div className="tags-row">{el.strengths.map((s, i) => <span key={i} className="tag strength">+ {s}</span>)}</div>
                          )}
                          {el.risks?.length > 0 && (
                            <div className="tags-row">{el.risks.map((r, i) => <span key={i} className="tag risk">⚠ {r}</span>)}</div>
                          )}
                          {el.actions?.length > 0 && (
                            <div className="tags-row">{el.actions.map((a, i) => <span key={i} className="tag action">→ {a}</span>)}</div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

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
                                    <span className="severity-chip" style={{ background: `color-mix(in srgb, ${sev} 12%, transparent)`, color: sev }}>Sévérité : {r.severity}</span>
                                    <span className="severity-chip" style={{ background: `color-mix(in srgb, ${prob} 12%, transparent)`, color: prob }}>P : {r.probability}</span>
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
                              <span style={{ color: '#22d3a5', fontSize: 14, flexShrink: 0 }}>✓</span>
                              <div>
                                <div className="qw-action">{qw.action}</div>
                                {qw.impact && <div className="qw-impact">{qw.impact}</div>}
                                {qw.s_element && (
                                  <span style={{ fontSize: 9, fontFamily: 'Geist Mono, monospace', color: SEVEN_S[qw.s_element]?.color, marginTop: 4, display: 'block' }}>
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

                {aiTab === 'roadmap' && aiResult.transformation_roadmap?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {aiResult.transformation_roadmap.map((phase, i) => {
                      const colors = ['#818cf8', '#f59e0b', '#22d3a5']
                      const c = colors[i] || 'var(--accent2)'
                      return (
                        <div key={i} className="phase-card" style={{ borderColor: `color-mix(in srgb, ${c} 20%, transparent)` }}>
                          <div>
                            <div className="phase-name" style={{ color: c }}>{phase.phase}</div>
                            {phase.milestone && <div style={{ fontSize: 11, color: 'var(--muted2)', fontStyle: 'italic' }}>{phase.milestone}</div>}
                          </div>
                          {phase.focus_elements?.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {phase.focus_elements.map((el, j) => {
                                const s = SEVEN_S[el]
                                return s ? (
                                  <span key={j} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: s.bg, color: s.color, fontFamily: 'Geist Mono, monospace', fontWeight: 700 }}>
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
                  Cliquez sur "Analyser" pour obtenir une évaluation complète de l'alignement 7S et la feuille de route de transformation.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── AI Generate Panel modal ── */}
        {showGenPanel && (
          <AIGeneratePanel
            projectName={project?.name || ''}
            companyName={active?.companyName || ''}
            onGenerated={handleGenerated}
            onClose={() => setShowGenPanel(false)}
          />
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