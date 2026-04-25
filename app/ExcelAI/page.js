'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import {
  Zap, Upload, TrendingUp, TrendingDown, FileText,
  Printer, BarChart2, AlertTriangle, CheckCircle,
  RefreshCw, DollarSign, Percent, Target, Activity, PieChart,
  MessageSquare, Send, Bot, User, Sparkles, ChevronDown,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// CSV PARSER — runs in browser, no library needed
// Returns { headers, rows, aggregates }
// ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    if (vals.length === headers.length) {
      const row = {}
      headers.forEach((h, j) => { row[h] = vals[j] })
      rows.push(row)
    }
  }

  // ── Auto-detect numeric and category columns ──────────────────
  const aggregates = {}

  // Detect amount column (contains FCFA or Montant or Total)
  const amountCol = headers.find(h => /montant|total|amount|fcfa|prix|ca/i.test(h))
  const statusCol = headers.find(h => /statut|status|état|etat/i.test(h))
  const dateCol   = headers.find(h => /date/i.test(h))
  const catCol    = headers.find(h => /catégorie|categorie|category|type/i.test(h))
  const qtyCol    = headers.find(h => /quantité|quantite|qty|qté/i.test(h))

  aggregates.totalRows = rows.length
  aggregates.amountCol = amountCol || null
  aggregates.statusCol = statusCol || null

  // Total global
  if (amountCol) {
    const nums = rows.map(r => parseFloat((r[amountCol] || '0').replace(/\s/g, '').replace(/,/g, '')) || 0)
    aggregates.totalAmount = nums.reduce((a, b) => a + b, 0)

    // By status
    if (statusCol) {
      const byStatus = {}
      rows.forEach((r, i) => {
        const s = r[statusCol]?.trim() || 'Inconnu'
        byStatus[s] = (byStatus[s] || 0) + nums[i]
      })
      aggregates.byStatus = byStatus

      // Count by status
      const countByStatus = {}
      rows.forEach(r => {
        const s = r[statusCol]?.trim() || 'Inconnu'
        countByStatus[s] = (countByStatus[s] || 0) + 1
      })
      aggregates.countByStatus = countByStatus
    }

    // By category
    if (catCol) {
      const byCat = {}
      rows.forEach((r, i) => {
        const c = r[catCol]?.trim() || 'Autre'
        byCat[c] = (byCat[c] || 0) + nums[i]
      })
      aggregates.byCategory = byCat
    }

    // By month (if date col exists)
    if (dateCol) {
      const byMonth = {}
      rows.forEach((r, i) => {
        const d = r[dateCol]?.trim() || ''
        const m = d.slice(0, 7) // YYYY-MM
        if (m) byMonth[m] = (byMonth[m] || 0) + nums[i]
      })
      aggregates.byMonth = byMonth
    }

    aggregates.avgAmount = aggregates.totalAmount / rows.length
    aggregates.maxAmount = Math.max(...nums)
    aggregates.minAmount = Math.min(...nums.filter(n => n > 0))
  }

  // Total quantity
  if (qtyCol) {
    const qtys = rows.map(r => parseFloat((r[qtyCol] || '0').replace(/\s/g, '')) || 0)
    aggregates.totalQty = qtys.reduce((a, b) => a + b, 0)
  }

  return { headers, rows, aggregates }
}

// Format number as FCFA
function fmt(n) {
  if (!n && n !== 0) return '—'
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA'
}

// ── KPI Card ─────────────────────────────────────────────────────
function KpiCard({ label, value, trend, trendLabel, icon: Icon, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    red:    'bg-red-50 text-red-600 border-red-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  }
  const cls = colors[color] || colors.blue
  const isPos = trend >= 0
  return (
    <div className="bg-white border rounded-2xl p-5 flex flex-col gap-3 border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cls}`}><Icon size={15}/></div>
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-bold ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {isPos ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
            <span>{isPos ? '+' : ''}{trend}% {trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mini Bar Chart ────────────────────────────────────────────────
function MiniBarChart({ data, color = '#3b82f6', label }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1)
  return (
    <div className="space-y-2">
      {label && <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>}
      <div className="flex items-end gap-1.5 h-24">
        {data.map((d, i) => {
          const h = Math.max((Math.abs(d.value) / max) * 100, 4)
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                <div className="w-full rounded-t-sm transition-all duration-700"
                  style={{ height: `${h}%`, background: d.value < 0 ? '#ef4444' : color, opacity: 0.65 + (i / data.length) * 0.35 }}/>
              </div>
              <span className="text-[8px] text-slate-400 font-bold truncate w-full text-center">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Alert Badge ───────────────────────────────────────────────────
function AlertBadge({ type, message }) {
  const s = {
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    danger:  'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
  }
  const ic = {
    warning: <AlertTriangle size={13}/>,
    danger:  <AlertTriangle size={13}/>,
    success: <CheckCircle size={13}/>,
    info:    <Activity size={13}/>,
  }
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${s[type] || s.info}`}>
      <span className="mt-0.5 shrink-0">{ic[type]}</span>
      <span>{message}</span>
    </div>
  )
}

// ── Variable Slider ───────────────────────────────────────────────
function VariableSlider({ label, value, min, max, step = 1, unit = '%', onChange, description }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">{label}</span>
        <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg tabular-nums">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"/>
      <div className="flex justify-between text-[9px] text-slate-300 font-bold">
        <span>{min}{unit}</span>
        {description && <span className="italic text-slate-300">{description}</span>}
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

// ── Chat Message ──────────────────────────────────────────────────
function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'

  const renderBlock = (block, i) => {
    if (block.type === 'text') {
      return <p key={i} className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{block.content}</p>
    }
    if (block.type === 'table') {
      return (
        <div key={i} className="overflow-x-auto rounded-xl border border-slate-200 mt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0f1f3d]">
                {block.headers.map((h, j) => (
                  <th key={j} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, j) => (
                <tr key={j} className={j % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  {row.map((cell, k) => (
                    <td key={k} className={`px-3 py-2 text-slate-700 font-medium border-b border-slate-100 ${k === 0 ? 'font-bold text-slate-800' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    if (block.type === 'chart') {
      const max = Math.max(...block.data.map(d => Math.abs(d.value)), 1)
      return (
        <div key={i} className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{block.title}</p>
          <div className="flex items-end gap-2 h-28">
            {block.data.map((d, j) => {
              const h = Math.max((Math.abs(d.value) / max) * 100, 4)
              const col = block.chartType === 'negative-positive'
                ? (d.value < 0 ? '#ef4444' : '#10b981')
                : block.color || '#3b82f6'
              return (
                <div key={j} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] text-slate-500 font-bold">{d.displayValue || d.value}</span>
                  <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
                    <div className="w-full rounded-t-sm" style={{ height: `${h}%`, background: col, opacity: 0.8 }}/>
                  </div>
                  <span className="text-[8px] text-slate-400 font-bold truncate w-full text-center">{d.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    if (block.type === 'insight') {
      const colors = {
        positive: 'bg-green-50 border-green-200 text-green-800',
        negative: 'bg-red-50 border-red-200 text-red-800',
        neutral:  'bg-blue-50 border-blue-200 text-blue-800',
        warning:  'bg-amber-50 border-amber-200 text-amber-800',
      }
      const icons = { positive: '✅', negative: '⚠️', neutral: 'ℹ️', warning: '🔶' }
      return (
        <div key={i} className={`flex gap-2 p-3 rounded-xl border text-xs font-medium mt-2 ${colors[block.tone] || colors.neutral}`}>
          <span>{icons[block.tone] || 'ℹ️'}</span>
          <span>{block.content}</span>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-[#0f1f3d]' : 'bg-blue-600'}`}>
        {isUser ? <User size={14} color="white"/> : <Bot size={14} color="white"/>}
      </div>
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {isUser ? 'Vous' : 'Consultant IA'}
        </span>
        {isUser ? (
          <div className="bg-[#0f1f3d] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm font-medium">{msg.content}</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-4 space-y-3 shadow-sm w-full">
            {msg.loading ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }}/>
                  ))}
                </div>
                <span className="text-xs text-slate-400 font-medium">Le consultant calcule sur vos données brutes...</span>
              </div>
            ) : (
              msg.blocks?.map((block, i) => renderBlock(block, i))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const SUGGESTED_QUESTIONS = [
  { icon: '💰', text: 'Donne-moi le CA total par statut (Payé, Livré, En attente, Annulé)' },
  { icon: '📊', text: 'Quel est le CA par catégorie de produit ?' },
  { icon: '📅', text: 'Quelle est l\'évolution mensuelle du CA ?' },
  { icon: '🏆', text: 'Quels sont les 5 meilleurs clients ?' },
  { icon: '⚠️', text: 'Analyse le taux d\'annulation et ses impacts' },
  { icon: '🎯', text: 'Quel commercial performe le mieux ?' },
]

// ─────────────────────────────────────────────────────────────────
export default function FinanceAIPage() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [step, setStep]             = useState('upload')
  const [file, setFile]             = useState(null)
  const [manualData, setManualData] = useState('')
  const [loading, setLoading]       = useState(false)
  const [analysis, setAnalysis]     = useState(null)
  const [activeTab, setActiveTab]   = useState('overview')

  // ── RAW CSV data stored in state for chat ─────────────────────
  const [csvData, setCsvData]       = useState(null)  // { headers, rows, aggregates }
  const [csvText, setCsvText]       = useState('')    // raw text for API

  // ── Consultant chat ───────────────────────────────────────────
  const [chatOpen, setChatOpen]         = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput]       = useState('')
  const [chatLoading, setChatLoading]   = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const chatEndRef  = useRef(null)
  const chatInputRef = useRef(null)

  const [variables, setVariables] = useState({
    growthRate: 10, costReduction: 5, taxRate: 30, discountRate: 10, inflationRate: 3,
  })

  const fileRef = useRef(null)
  const updateVar = (k, v) => setVariables(p => ({ ...p, [k]: v }))

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (chatOpen && chatMessages.length === 0 && analysis) {
      // Build welcome with real computed numbers
      const agg = csvData?.aggregates
      let welcomeText = 'Bonjour ! Je suis votre consultant financier IA.\n\nContrairement à une analyse approximative, je travaille directement sur vos données brutes — chaque chiffre que je vous donne est calculé ligne par ligne depuis votre fichier.'

      let insightContent = `Score de santé : ${analysis.healthScore}/100`

      if (agg?.byStatus) {
        const lines = Object.entries(agg.byStatus)
          .map(([s, v]) => `${s} : ${fmt(v)}`)
          .join(' · ')
        insightContent = `Données réelles — ${lines} · Total : ${fmt(agg.totalAmount)}`
      }

      setChatMessages([{
        role: 'assistant',
        blocks: [
          { type: 'text', content: welcomeText },
          { type: 'insight', tone: 'neutral', content: insightContent },
        ]
      }])
    }
  }, [chatOpen])

  // ── Read file and parse CSV immediately on upload ─────────────
  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setStep('variables')

    if (f.name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target.result
        setCsvText(text)
        const parsed = parseCSV(text)
        setCsvData(parsed)
      }
      reader.readAsText(f, 'UTF-8')
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && /\.(xlsx|xls|csv)$/.test(f.name)) {
      // Trigger same logic
      const fakeEvent = { target: { files: [f] } }
      handleFileChange(fakeEvent)
    }
  }, [])

  const callAPI = async (creditCost) => {
    const formData = new FormData()
    if (file) formData.append('file', file)
    if (manualData) formData.append('manualData', manualData)
    formData.append('variables', JSON.stringify(variables))

    const res = await fetch('/api/generer-financeai', { method: 'POST', body: formData })
    if (!res.ok) throw new Error(`Erreur ${res.status}`)
    const data = await res.json()
    if (data.analysis) {
      setAnalysis(data.analysis)
      setStep('analysis')
      await deductCredits(creditCost)
      setChatMessages([])
    }
  }

  const handleAnalyze = async () => {
    if (!file && !manualData.trim()) return alert('Importez un fichier ou saisissez des données.')
    if (!hasCredits(4)) { router.push('/pricing'); return }
    setLoading(true)
    try { await callAPI(4) } catch (e) { alert('Erreur d\'analyse.'); console.error(e) } finally { setLoading(false) }
  }

  const handleRecalculate = async () => {
    if (!analysis || !hasCredits(2)) { if (!hasCredits(2)) router.push('/pricing'); return }
    setLoading(true)
    try { await callAPI(2) } catch (e) { alert('Erreur de recalcul.') } finally { setLoading(false) }
  }

  // ── Send chat — passes raw aggregates + csvText to API ────────
  const sendChatMessage = async (questionOverride = null) => {
    const question = questionOverride || chatInput.trim()
    if (!question || chatLoading) return
    if (!hasCredits(1)) { router.push('/pricing'); return }

    setShowSuggestions(false)
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: question }])

    const loadingId = Date.now()
    setChatMessages(prev => [...prev, { role: 'assistant', loading: true, id: loadingId, blocks: [] }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/financeai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          analysis,
          variables,
          // ── KEY FIX: send real computed aggregates and raw rows ──
          csvAggregates: csvData?.aggregates || null,
          csvHeaders:    csvData?.headers    || null,
          // Send first 50 rows as sample so Claude can see real data
          csvSampleRows: csvData?.rows?.slice(0, 50) || null,
          // Send full raw text (truncated to ~8000 chars to stay in context)
          csvRawText:    csvText ? csvText.slice(0, 8000) : (manualData || null),
          chatHistory:   chatMessages.filter(m => !m.loading).slice(-6),
        })
      })

      const data = await res.json()
      setChatMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { role: 'assistant', blocks: data.blocks || [{ type: 'text', content: data.error || 'Erreur.' }] }
          : m
      ))
      await deductCredits(1)
    } catch {
      setChatMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { role: 'assistant', blocks: [{ type: 'text', content: 'Erreur de connexion. Réessayez.' }] }
          : m
      ))
    } finally {
      setChatLoading(false)
    }
  }

  const exportReport = () => {
    const el = document.getElementById('finance-report')
    if (!el) return
    const clone = el.cloneNode(true)
    clone.querySelectorAll('.no-print').forEach(e => e.remove())
    const html = `<html><head><meta charset='utf-8'><style>body{font-family:Georgia,serif;padding:40px;color:#1a1a1a;line-height:1.6}h1,h2,h3{color:#0f1f3d}</style></head><body>${clone.innerHTML}</body></html>`
    const blob = new Blob([html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `FinanceAI_${Date.now()}.doc`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  if (!allowed) return (
    <div className="min-h-screen bg-[#060d1f] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-blue-500 rounded-2xl flex items-center justify-center"><BarChart2 size={20} color="white"/></div>
      <div className="w-6 h-6 border-2 border-white/10 border-t-blue-400 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Vérification du plan...</p>
    </div>
  )

  const STEPS_LABELS = ['Import', 'Variables', 'Analyse']
  const stepIdx = ['upload','variables','analysis'].indexOf(step)

  return (
    <main className="min-h-screen bg-[#f0f4f8] font-sans">

      {/* ══ TOP BAR ══════════════════════════════════════════════ */}
      <header className="bg-[#0f1f3d] border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <BarChart2 size={18} color="white"/>
          </div>
          <div>
            <h1 className="text-white font-black text-lg tracking-tight italic">Finance<span className="text-blue-400">AI</span></h1>
            <p className="text-white/30 text-[9px] uppercase tracking-widest font-bold">Analyseur Financier Intelligent</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {STEPS_LABELS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${i <= stepIdx ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/30'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${i < stepIdx ? 'bg-green-400 text-white' : i === stepIdx ? 'bg-white text-blue-600' : 'bg-white/10 text-white/30'}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </span>
                {s}
              </div>
              {i < 2 && <div className={`w-6 h-px ${i < stepIdx ? 'bg-blue-400' : 'bg-white/10'}`}/>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <Zap size={11} className="text-blue-400" fill="currentColor"/>
            <span className="text-xs font-black text-white/70">{credits}</span>
          </div>
          {analysis && (
            <button onClick={() => setChatOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all border ${
                chatOpen ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/15'
              }`}>
              <MessageSquare size={11}/>
              Consultant IA
              {chatMessages.filter(m => m.role === 'assistant' && !m.loading).length > 0 && !chatOpen && (
                <span className="w-4 h-4 bg-blue-400 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                  {chatMessages.filter(m => m.role === 'assistant' && !m.loading).length}
                </span>
              )}
            </button>
          )}
          {analysis && <>
            <button onClick={exportReport} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all">
              <FileText size={11}/> Word
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white/70 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all">
              <Printer size={11}/> PDF
            </button>
          </>}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">

        {/* ══ LEFT SIDEBAR ═════════════════════════════════════════ */}
        <aside className="lg:w-[340px] bg-white border-r border-slate-200 flex flex-col p-6 gap-5 shrink-0">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-black">1</div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Import des Données</label>
            </div>
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${file ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'}`}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden"/>
              {file ? (
                <div className="space-y-1">
                  <CheckCircle size={20} className="text-blue-500 mx-auto"/>
                  <p className="text-xs font-black text-blue-700 truncate">{file.name}</p>
                  <p className="text-[10px] text-blue-400">{(file.size/1024).toFixed(1)} KB</p>
                  {/* Show parsed summary if CSV */}
                  {csvData?.aggregates && (
                    <div className="mt-2 pt-2 border-t border-blue-100 text-left space-y-1">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Données parsées ✓</p>
                      <p className="text-[10px] text-blue-500">{csvData.aggregates.totalRows} lignes · {csvData.headers.length} colonnes</p>
                      {csvData.aggregates.totalAmount && (
                        <p className="text-[10px] text-blue-700 font-black">Total : {fmt(csvData.aggregates.totalAmount)}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload size={20} className="text-slate-300 mx-auto"/>
                  <p className="text-xs font-bold text-slate-400">Glissez votre Excel / CSV</p>
                  <p className="text-[10px] text-slate-300">.xlsx · .xls · .csv</p>
                </div>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"/></div>
              <div className="relative text-center"><span className="bg-white px-2 text-[10px] text-slate-300 font-bold uppercase">ou saisie manuelle</span></div>
            </div>
            <textarea
              value={manualData}
              onChange={e => { setManualData(e.target.value); if (e.target.value.trim()) setStep('variables') }}
              placeholder={"Ex:\nCA Annuel: 45 000 000 FCFA\nCharges: 32 000 000 FCFA\nMarge Brute: 29%\nEBITDA: 13 000 000 FCFA\nDettes: 8 000 000 FCFA"}
              rows={6}
              className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none outline-none focus:border-blue-300 transition-all font-mono leading-relaxed placeholder-slate-300"
            />
          </div>

          <div className={`space-y-4 transition-opacity duration-300 ${step !== 'upload' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${step !== 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>2</div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Variables & Hypothèses</label>
            </div>
            <div className="space-y-5 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <VariableSlider label="Croissance Attendue"  value={variables.growthRate}    min={-20} max={50} step={1}   unit="%" onChange={v => updateVar('growthRate', v)}    description="CA" />
              <VariableSlider label="Réduction des Coûts"  value={variables.costReduction} min={0}   max={30} step={0.5} unit="%" onChange={v => updateVar('costReduction', v)} description="Opex" />
              <VariableSlider label="Taux d'Imposition"    value={variables.taxRate}       min={0}   max={45} step={1}   unit="%" onChange={v => updateVar('taxRate', v)}       description="IS" />
              <VariableSlider label="Taux d'Actualisation" value={variables.discountRate}  min={1}   max={25} step={0.5} unit="%" onChange={v => updateVar('discountRate', v)}  description="WACC" />
              <VariableSlider label="Inflation Prévue"     value={variables.inflationRate} min={0}   max={20} step={0.5} unit="%" onChange={v => updateVar('inflationRate', v)} description="Annuelle" />
            </div>
          </div>

          {credits < 4 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-amber-700 text-xs font-bold">⚠️ 4 crédits requis</span>
              <button onClick={() => router.push('/pricing')} className="text-[10px] font-black uppercase bg-amber-500 text-white px-3 py-1 rounded-lg hover:bg-amber-400 transition-all">Recharger</button>
            </div>
          )}

          <button onClick={handleAnalyze}
            disabled={loading || !hasCredits(4) || step === 'upload'}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${
              loading || !hasCredits(4) || step === 'upload'
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-[#0f1f3d] text-white hover:bg-blue-700 hover:-translate-y-0.5 shadow-xl shadow-blue-900/20'
            }`}>
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> Analyse IA en cours...</>
              : <><BarChart2 size={13}/> Lancer l'Analyse · ⚡4</>}
          </button>

          {analysis && (
            <button onClick={handleRecalculate} disabled={loading}
              className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Recalculer · ⚡2
            </button>
          )}

          {analysis && !chatOpen && (
            <button onClick={() => { setChatOpen(true); setTimeout(() => chatInputRef.current?.focus(), 100) }}
              className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-blue-400 transition-all">
              <Sparkles size={12}/> Poser une question · ⚡1
            </button>
          )}
        </aside>

        {/* ══ MAIN PANEL ═══════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto relative">

          {!analysis && (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-6 p-12 text-center">
              <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center">
                <BarChart2 size={36} className="text-slate-200"/>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-300 uppercase tracking-wider">Aucune Analyse</h2>
                <p className="text-slate-400 text-sm mt-2 max-w-xs">Importez vos données et configurez vos hypothèses pour générer votre analyse IA.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-lg w-full">
                {[
                  { label: 'Import', icon: Upload, desc: 'Excel ou saisie manuelle' },
                  { label: 'Variables', icon: Target, desc: 'Ajustez les hypothèses' },
                  { label: 'Analyse IA', icon: TrendingUp, desc: 'Rapport instantané' },
                ].map(({ label, icon: I, desc }) => (
                  <div key={label} className="bg-white rounded-2xl p-4 border border-slate-100 flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><I size={18} className="text-blue-500"/></div>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-wide text-center">{label}</p>
                    <p className="text-[10px] text-slate-400 text-center">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis && (
            <div id="finance-report" className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-[#0f1f3d] to-[#1e3a6b] rounded-2xl p-6 text-white flex flex-wrap justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-1">Rapport FinanceAI</p>
                  <h2 className="text-2xl font-black tracking-tight">{analysis.companyName || 'Analyse Financière'}</h2>
                  <p className="text-blue-200 text-sm mt-1">{analysis.reportDate || new Date().toLocaleDateString('fr-FR', {year:'numeric',month:'long',day:'numeric'})}</p>
                </div>
                <div className="text-right space-y-2">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
                    analysis.healthScore >= 70 ? 'bg-green-400/20 text-green-300' :
                    analysis.healthScore >= 40 ? 'bg-amber-400/20 text-amber-300' : 'bg-red-400/20 text-red-300'
                  }`}>
                    <Activity size={11}/> Score Santé : {analysis.healthScore}/100
                  </div>
                  <p className="text-blue-300 text-[10px] font-bold block">
                    Croissance +{variables.growthRate}% · IS {variables.taxRate}% · WACC {variables.discountRate}%
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-2xl p-1 w-fit no-print">
                {[
                  { key: 'overview',    label: 'Vue Générale',  icon: PieChart      },
                  { key: 'performance', label: 'Performance',   icon: TrendingUp    },
                  { key: 'risks',       label: 'Risques',       icon: AlertTriangle },
                  { key: 'projections', label: 'Projections',   icon: Target        },
                ].map(({ key, label, icon: I }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${
                      activeTab === key ? 'bg-[#0f1f3d] text-white shadow-md' : 'text-slate-400 hover:text-slate-700'
                    }`}>
                    <I size={12}/> {label}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Chiffre d'Affaires" value={analysis.kpis?.revenue   || '—'} trend={analysis.kpis?.revenueTrend}   trendLabel="vs N-1" icon={DollarSign} color="blue"  />
                    <KpiCard label="Marge Nette"         value={analysis.kpis?.netMargin || '—'} trend={analysis.kpis?.netMarginTrend} trendLabel="pts"    icon={Percent}   color="green" />
                    <KpiCard label="EBITDA"              value={analysis.kpis?.ebitda    || '—'} trend={analysis.kpis?.ebitdaTrend}    trendLabel="croiss" icon={BarChart2}  color="indigo"/>
                    <KpiCard label="BFR"                 value={analysis.kpis?.bfr       || '—'} trend={analysis.kpis?.bfrTrend}       trendLabel="jours"  icon={Activity}  color={analysis.kpis?.bfrTrend > 0 ? 'red' : 'green'} />
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Synthèse Exécutive</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
                  </div>
                  <div className="grid lg:grid-cols-2 gap-4">
                    {analysis.revenueChart && <div className="bg-white rounded-2xl border border-slate-100 p-6"><MiniBarChart data={analysis.revenueChart} color="#3b82f6" label="Évolution du Chiffre d'Affaires"/></div>}
                    {analysis.marginChart  && <div className="bg-white rounded-2xl border border-slate-100 p-6"><MiniBarChart data={analysis.marginChart}  color="#10b981" label="Évolution des Marges (%)"/></div>}
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Indicateurs de Performance</h3>
                  {analysis.performance?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-black text-slate-800">{item.metric}</p>
                        <p className="text-xs text-slate-400">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900">{item.value}</p>
                        <p className={`text-[10px] font-bold ${item.status === 'good' ? 'text-green-500' : item.status === 'warning' ? 'text-amber-500' : 'text-red-500'}`}>
                          {item.status === 'good' ? '✓ Bon' : item.status === 'warning' ? '⚠ Attention' : '✗ Critique'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'risks' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Alertes & Risques</h3>
                    {analysis.alerts?.map((a, i) => <AlertBadge key={i} type={a.type} message={a.message}/>)}
                  </div>
                  {analysis.recommendations && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-1">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Recommandations Stratégiques</h3>
                      {analysis.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-3 py-3 border-b border-slate-50 last:border-0">
                          <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i+1}</span>
                          <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'projections' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                    <Activity size={16} className="text-blue-600 shrink-0"/>
                    <p className="text-xs text-blue-700 font-medium">
                      Projections : Croissance <strong>{variables.growthRate}%</strong> · Réduction coûts <strong>{variables.costReduction}%</strong> · IS <strong>{variables.taxRate}%</strong> · WACC <strong>{variables.discountRate}%</strong>
                    </p>
                  </div>
                  {analysis.projections && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Projections sur 3 Ans</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="text-left py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Indicateur</th>
                              {['Année 1','Année 2','Année 3'].map(y => <th key={y} className="text-right py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{y}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.projections.map((row, i) => (
                              <tr key={i} className="border-b border-slate-50 last:border-0">
                                <td className="py-3 font-bold text-slate-700">{row.label}</td>
                                {row.values.map((v, j) => (
                                  <td key={j} className={`py-3 text-right font-black ${String(v).startsWith('-') ? 'text-red-600' : 'text-slate-900'}`}>{v}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {analysis.projectionChart && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                      <MiniBarChart data={analysis.projectionChart} color="#6366f1" label="Projection Résultat Net"/>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ CONSULTANT CHAT PANEL ════════════════════════════ */}
          {analysis && chatOpen && (
            <div className="sticky bottom-0 left-0 right-0 bg-white border-t-2 border-blue-200 flex flex-col shadow-2xl shadow-blue-900/20 no-print"
              style={{ height: '420px' }}>
              <div className="flex items-center justify-between px-5 py-3 bg-[#0f1f3d] border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Bot size={14} color="white"/>
                  </div>
                  <div>
                    <p className="text-white text-xs font-black">Consultant Financier IA</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/>
                      <span className="text-[9px] text-white/40 font-bold">
                        Calculs sur données brutes · ⚡1 crédit/question
                        {csvData && <span className="text-green-400/70"> · {csvData.aggregates.totalRows} lignes chargées</span>}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {chatMessages.length > 0 && (
                    <button onClick={() => { setChatMessages([]); setShowSuggestions(true) }}
                      className="text-[9px] font-black uppercase tracking-wide text-white/30 hover:text-white/60 px-2 py-1">
                      Effacer
                    </button>
                  )}
                  <button onClick={() => setChatOpen(false)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
                    <ChevronDown size={14} color="white"/>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/80">
                {showSuggestions && chatMessages.length <= 1 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Questions suggérées</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button key={i} onClick={() => sendChatMessage(q.text)} disabled={chatLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-40">
                          <span>{q.icon}</span>{q.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => <ChatMessage key={i} msg={msg}/>)}
                <div ref={chatEndRef}/>
              </div>

              <div className="px-4 py-3 bg-white border-t border-slate-100">
                {credits < 1 && (
                  <div className="flex items-center justify-between mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <span className="text-xs text-amber-700 font-bold">⚠️ Crédits insuffisants</span>
                    <button onClick={() => router.push('/pricing')} className="text-[10px] font-black text-amber-600 underline">Recharger</button>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <textarea ref={chatInputRef} value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                    placeholder="Posez une question sur vos données... (Entrée pour envoyer)"
                    rows={2} disabled={chatLoading || credits < 1}
                    className="flex-1 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 resize-none outline-none focus:border-blue-300 transition-colors placeholder-slate-300 disabled:opacity-40"
                  />
                  <button onClick={() => sendChatMessage()}
                    disabled={chatLoading || !chatInput.trim() || credits < 1}
                    className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-md shadow-blue-500/20">
                    {chatLoading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      : <Send size={15}/>}
                  </button>
                </div>
                <p className="text-[9px] text-slate-300 mt-1.5 font-medium">Les chiffres sont calculés directement depuis vos données brutes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; width: 16px; height: 16px;
          border-radius: 50%; background: #2563eb; cursor: pointer;
          border: 2px solid white; box-shadow: 0 1px 4px rgba(37,99,235,.4);
        }
      `}</style>
    </main>
  )
}