'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import {
  Zap, Upload, FileSpreadsheet, Brain, Download,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  AlertCircle, Lightbulb, X, Plus, Trash2,
  ChevronRight, Calculator, BarChart3, CheckCircle,
  Hash, Filter, Sigma, ChevronDown, Layers,
  Play, Loader2, Sparkles, ArrowRight
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// FORMULA ENGINE
// ─────────────────────────────────────────────────────────────────
function evalFormula(formula, grid) {
  if (!formula.startsWith('=')) return formula
  let expr = formula.slice(1).toUpperCase()
  const colIdx = (letter) => letter.charCodeAt(0) - 65

  const resolveRange = (range) => {
    const m = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (!m) return []
    const c1 = colIdx(m[1]), r1 = parseInt(m[2]) - 2
    const c2 = colIdx(m[3]), r2 = parseInt(m[4]) - 2
    const vals = []
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++) {
        const n = parseFloat(String(grid[r]?.[c] || '').replace(/[\s\u202f,]/g, ''))
        if (!isNaN(n)) vals.push(n)
      }
    return vals
  }

  const resolveCell = (ref) => {
    const m = ref.match(/^([A-Z]+)(\d+)$/)
    if (!m) return 0
    const c = colIdx(m[1]), r = parseInt(m[2]) - 2
    return parseFloat(String(grid[r]?.[c] || '').replace(/[\s\u202f,]/g, '')) || 0
  }

  try {
    if (/^SUM\((.+)\)$/i.test(expr)) {
      return resolveRange(expr.match(/^SUM\((.+)\)$/i)[1]).reduce((a, b) => a + b, 0)
    }
    if (/^AVERAGE\((.+)\)$/i.test(expr)) {
      const v = resolveRange(expr.match(/^AVERAGE\((.+)\)$/i)[1])
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
    }
    if (/^COUNT\((.+)\)$/i.test(expr)) {
      return resolveRange(expr.match(/^COUNT\((.+)\)$/i)[1]).length
    }
    if (/^MAX\((.+)\)$/i.test(expr)) {
      const v = resolveRange(expr.match(/^MAX\((.+)\)$/i)[1])
      return v.length ? Math.max(...v) : 0
    }
    if (/^MIN\((.+)\)$/i.test(expr)) {
      const v = resolveRange(expr.match(/^MIN\((.+)\)$/i)[1])
      return v.length ? Math.min(...v) : 0
    }
    if (/^COUNTIF\((.+),(.+)\)$/i.test(expr)) {
      const [, range, crit] = expr.match(/^COUNTIF\((.+),(.+)\)$/i)
      const criterion = crit.trim().replace(/"/g, '')
      const m2 = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
      if (!m2) return 0
      const c1 = colIdx(m2[1]), r1 = parseInt(m2[2]) - 2
      const r2 = parseInt(m2[4]) - 2
      let count = 0
      for (let r = r1; r <= r2; r++)
        if (String(grid[r]?.[c1] || '').trim().toUpperCase() === criterion.toUpperCase()) count++
      return count
    }
    if (/^SUMIF\((.+),(.+),(.+)\)$/i.test(expr)) {
      const [, rangeRef, crit, sumRef] = expr.match(/^SUMIF\((.+),(.+),(.+)\)$/i)
      const criterion = crit.trim().replace(/"/g, '')
      const m1 = rangeRef.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
      const m2 = sumRef.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
      if (!m1 || !m2) return 0
      const c1 = colIdx(m1[1]), r1 = parseInt(m1[2]) - 2
      const r2 = parseInt(m1[4]) - 2, sc = colIdx(m2[1])
      let sum = 0
      for (let r = r1; r <= r2; r++)
        if (String(grid[r]?.[c1] || '').trim().toUpperCase() === criterion.toUpperCase())
          sum += parseFloat(String(grid[r]?.[sc] || '').replace(/[\s\u202f,]/g, '')) || 0
      return sum
    }
    // Arithmetic with cell refs
    const withCells = expr.replace(/([A-Z]+\d+)/g, (ref) => resolveCell(ref))
    // eslint-disable-next-line no-new-func
    return Function('"use strict"; return (' + withCells + ')')()
  } catch {
    return '#ERR'
  }
}

function fmt(n, short = false) {
  if (n == null || isNaN(n)) return '—'
  if (short) {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (Math.abs(n) >= 1_000)    return (n / 1_000).toFixed(0) + 'K'
  }
  return Math.round(n).toLocaleString('fr-FR')
}

const colLetter = (i) => {
  let s = ''; i++
  while (i > 0) { i--; s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26) }
  return s
}

const CATEGORY_COLORS = {
  total:       { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-500' },
  statut:      { bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-300',    dot: 'bg-blue-500'    },
  catégorie:   { bg: 'bg-violet-500/15',  border: 'border-violet-500/30',  text: 'text-violet-300',  dot: 'bg-violet-500'  },
  temporel:    { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-300',   dot: 'bg-amber-500'   },
  performance: { bg: 'bg-cyan-500/15',    border: 'border-cyan-500/30',    text: 'text-cyan-300',    dot: 'bg-cyan-500'    },
  ratio:       { bg: 'bg-rose-500/15',    border: 'border-rose-500/30',    text: 'text-rose-300',    dot: 'bg-rose-500'    },
}

const STEPS_NAV = [
  { id: 'upload',    label: 'Fichier',    icon: '📂' },
  { id: 'grid',      label: 'Tableur',    icon: '⊞'  },
  { id: 'planning',  label: 'Formules IA',icon: '🤖' },
  { id: 'computing', label: 'Calcul JS',  icon: '⚙️' },
  { id: 'result',    label: 'Rapport',    icon: '📊' },
]

export default function ExcelAI() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [step, setStep]               = useState('upload')
  const [file, setFile]               = useState(null)
  const [headers, setHeaders]         = useState([])
  const [grid, setGrid]               = useState([])
  const [selectedCell, setSelectedCell] = useState(null)
  const [editingCell, setEditingCell]   = useState(null)

  // ── Phase 1 outputs ──
  const [plan, setPlan]               = useState(null)   // { dataType, analysisGoal, formulas[] }
  const [manualFormulas, setManualFormulas] = useState([])  // user-added rows

  // ── Phase 2 outputs ──
  const [formulaResults, setFormulaResults] = useState([])  // [{label, formula, result}]
  const [computeProgress, setComputeProgress] = useState(0)

  // ── Phase 3 outputs ──
  const [analysis, setAnalysis]       = useState(null)
  const [activeSection, setActiveSection] = useState(0)
  const [analysisRequest, setAnalysisRequest] = useState('')

  const [loading, setLoading]         = useState(false)
  const [loadingMsg, setLoadingMsg]   = useState('')
  const [error, setError]             = useState('')
  const [visibleRows, setVisibleRows] = useState(50)

  const fileRef  = useRef(null)
  const inputRef = useRef(null)

  // ── Load file ──
  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f); setError(''); setPlan(null); setFormulaResults([]); setAnalysis(null)
    setLoadingMsg('Lecture du fichier...'); setLoading(true)
    try {
      let rows = [], hdrs = []
      if (f.name.endsWith('.csv')) {
        const text = await f.text()
        const lines = text.trim().split('\n').filter(l => l.trim())
        const parseRow = (line) => {
          const res = []; let cur = '', inQ = false
          for (const ch of line) {
            if (ch === '"') inQ = !inQ
            else if (ch === ',' && !inQ) { res.push(cur.trim()); cur = '' }
            else cur += ch
          }
          res.push(cur.trim())
          return res.map(v => v.replace(/^"|"$/g, ''))
        }
        hdrs = parseRow(lines[0])
        rows = lines.slice(1).map(l => {
          const cols = parseRow(l); const obj = {}
          hdrs.forEach((h, i) => { obj[h] = cols[i] || '' })
          return obj
        }).filter(r => Object.values(r).some(v => v))
      } else {
        const XLSX = await import('xlsx')
        const buf  = await f.arrayBuffer()
        const wb   = XLSX.read(buf, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        hdrs = rows.length ? Object.keys(rows[0]) : []
      }
      setHeaders(hdrs)
      setGrid(rows.map(r => hdrs.map(h => String(r[h] ?? ''))))
      setStep('grid')
    } catch (err) {
      setError('Erreur lecture: ' + err.message)
    } finally { setLoading(false); setLoadingMsg('') }
  }

  // ── Cell editing ──
  const startEdit = (row, col) => {
    setEditingCell({ row, col }); setSelectedCell({ row, col })
    setTimeout(() => inputRef.current?.focus(), 10)
  }
  const commitEdit = (row, col, value) => {
    const g = grid.map(r => [...r])
    g[row][col] = value; setGrid(g); setEditingCell(null)
  }

  // ── PHASE 1: Ask Claude to plan formulas from 5-row sample ──
  const handlePlanFormulas = async () => {
    if (!hasCredits(2)) { router.push('/pricing'); return }
    setLoading(true)
    setLoadingMsg('Claude analyse les 5 premières lignes...')
    setError('')
    try {
      const sampleRows = grid.slice(0, 5).map(r => [...r])
      const res = await fetch('/api/generer-excelai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step:       'plan',
          fileName:   file.name,
          headers,
          rowCount:   grid.length,
          sampleRows,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await deductCredits(2)
      setPlan(data)
      setManualFormulas([])
      setStep('planning')
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false); setLoadingMsg('') }
  }

  // ── PHASE 2: JS computes all formula results ──
  const handleComputeFormulas = async () => {
    const allFormulas = [
      ...(plan?.formulas || []),
      ...manualFormulas.filter(f => f.formula.trim()),
    ]
    if (!allFormulas.length) return

    setStep('computing')
    setComputeProgress(0)

    // Compute each formula in JS with progress
    const results = []
    for (let i = 0; i < allFormulas.length; i++) {
      const f = allFormulas[i]
      const raw = evalFormula(f.formula, grid)
      const result = typeof raw === 'number' && !isNaN(raw)
        ? Math.round(raw * 100) / 100
        : raw
      results.push({ ...f, result })
      setComputeProgress(Math.round(((i + 1) / allFormulas.length) * 100))
      // Small delay for visual effect
      if (allFormulas.length > 10) await new Promise(r => setTimeout(r, 20))
    }

    setFormulaResults(results)
    // Auto-proceed to interpretation after short pause
    setTimeout(() => setStep('interpret'), 600)
  }

  // ── PHASE 3: Claude interprets results ──
  const handleInterpret = async () => {
    if (!hasCredits(3)) { router.push('/pricing'); return }
    setLoading(true)
    setActiveSection(0)
    setError('')
    const msgs = ['Claude lit les résultats calculés...', 'Analyse des tendances...', 'Génération des insights...', 'Rédaction des recommandations...']
    let mi = 0; setLoadingMsg(msgs[0])
    const iv = setInterval(() => { mi = (mi + 1) % msgs.length; setLoadingMsg(msgs[mi]) }, 2000)
    try {
      const res = await fetch('/api/generer-excelai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step:           'interpret',
          fileName:       file.name,
          rowCount:       grid.length,
          dataType:       plan?.dataType || 'Données',
          analysisGoal:   plan?.analysisGoal || '',
          formulaResults: formulaResults.filter(r => r.result !== '#ERR'),
          analysisRequest,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await deductCredits(3)
      setAnalysis(data)
      setStep('result')
    } catch (err) {
      setError(err.message)
    } finally { clearInterval(iv); setLoading(false); setLoadingMsg('') }
  }

  // ── Export ──
  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx')
      const wb   = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...grid]), 'Données')
      const rows = [
        ['RAPPORT EXCELAI — ' + (analysis?.title || file?.name)],
        ['Généré le', new Date().toLocaleDateString('fr-FR')],
        ['Lignes analysées', grid.length],
        [],
        ['── FORMULES CALCULÉES PAR JAVASCRIPT ──'],
        ['Label', 'Formule', 'Résultat', 'Catégorie'],
        ...formulaResults.map(f => [f.label, f.formula, f.result, f.category || '']),
        [],
        ['── CONSTATS CLÉS ──'],
        ...(analysis?.summary?.keyFindings?.map((f, i) => [`${i+1}.`, f]) || []),
        [],
        ['── RECOMMANDATIONS ──'],
        ...(analysis?.recommendations?.map(r => [r.priority === 'high' ? '🔴' : r.priority === 'medium' ? '🟡' : '🟢', r.action, r.impact]) || []),
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [{ wch: 40 }, { wch: 30 }, { wch: 18 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, ws, 'ExcelAI')
      XLSX.writeFile(wb, `ExcelAI_${file?.name?.replace(/\.[^.]+$/, '')}_${Date.now()}.xlsx`)
    } catch (err) { setError('Export: ' + err.message) }
  }

  const reset = () => {
    setStep('upload'); setFile(null); setHeaders([]); setGrid([])
    setPlan(null); setManualFormulas([]); setFormulaResults([]); setAnalysis(null)
    setError(''); setAnalysisRequest('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const trendIcon = (t) => {
    if (t === 'up')   return <TrendingUp   size={13} className="text-emerald-500"/>
    if (t === 'down') return <TrendingDown size={13} className="text-red-400"/>
    return <Minus size={13} className="text-slate-400"/>
  }

  if (!allowed) return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vérification du plan...</p>
    </div>
  )

  const stepIdx = STEPS_NAV.findIndex(s => s.id === step)

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white font-sans flex flex-col">

      {/* ── Header ── */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0f1e]/95 backdrop-blur-xl z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <FileSpreadsheet size={18}/>
          </div>
          <div>
            <span className="font-black text-lg tracking-tight">Excel</span>
            <span className="text-emerald-400 font-black text-lg">AI</span>
            <span className="ml-2 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">Pro</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {STEPS_NAV.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                s.id === step
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : stepIdx > i ? 'text-emerald-500' : 'text-slate-600'
              }`}>
                <span>{s.icon}</span>{s.label}
              </div>
              {i < 4 && <ChevronRight size={11} className="text-slate-700"/>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/20 rounded-full px-3 py-1.5">
            <Zap size={11} className="text-emerald-400" fill="currentColor"/>
            <span className="text-xs font-black text-emerald-300">{credits}</span>
          </div>
          {step !== 'upload' && (
            <button onClick={reset} className="h-8 w-8 flex items-center justify-center rounded-xl border border-white/10 hover:border-red-500/40 hover:text-red-400 transition-all">
              <X size={14}/>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto">

        {error && (
          <div className="max-w-4xl mx-auto mx-6 mt-4 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 flex items-center gap-3 mx-6">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0"/>
            <p className="text-xs text-red-400 font-medium">{error}</p>
            <button onClick={() => setError('')} className="ml-auto"><X size={14} className="text-red-400"/></button>
          </div>
        )}

        {/* ══ UPLOAD ══ */}
        {step === 'upload' && (
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 text-xs font-black text-emerald-300 uppercase tracking-widest">
                <Sparkles size={12}/> Workflow intelligent en 3 phases
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                ExcelAI — Analyse rigoureuse<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  zéro hallucination
                </span>
              </h1>
              <p className="text-slate-500 text-sm max-w-lg mx-auto">
                Claude génère les formules pertinentes → JavaScript calcule les vrais résultats → Claude interprète uniquement ces chiffres exacts.
              </p>
            </div>

            {/* 3-phase explainer */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { phase: '01', icon: '🤖', title: 'Claude planifie', desc: 'Voit 5 lignes → génère toutes les formules Excel pertinentes', credit: '⚡2', color: 'blue' },
                { phase: '02', icon: '⚙️', title: 'JS calcule', desc: 'Applique chaque formule sur 100% des lignes → résultats exacts', credit: 'gratuit', color: 'emerald' },
                { phase: '03', icon: '📊', title: 'Claude interprète', desc: 'Reçoit uniquement les vrais résultats → rapport sans invention', credit: '⚡3', color: 'violet' },
              ].map(f => (
                <div key={f.phase} className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-[10px] font-black text-slate-600">{f.phase}</div>
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <p className="text-sm font-black text-slate-200">{f.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">{f.desc}</p>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 bg-white/5 px-2 py-1 rounded-full">{f.credit}</span>
                </div>
              ))}
            </div>

            <label className="block cursor-pointer group">
              <div className={`border-2 border-dashed rounded-3xl p-14 text-center transition-all ${
                loading ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-emerald-500/40 hover:bg-white/2'
              }`}>
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin"/>
                    <p className="text-sm text-emerald-400 font-bold">{loadingMsg}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                      <Upload size={28} className="text-emerald-400"/>
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">Glissez ou cliquez pour uploader</p>
                      <p className="text-xs text-slate-500 mt-1">Excel (.xlsx, .xls) · CSV</p>
                    </div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={loading}/>
            </label>
          </div>
        )}

        {/* ══ GRID ══ */}
        {step === 'grid' && grid.length > 0 && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 73px)' }}>

            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 bg-[#0d1424] border-b border-white/5 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <FileSpreadsheet size={12} className="text-emerald-400"/>
                <span className="text-[10px] font-black text-slate-300 truncate max-w-[150px]">{file?.name}</span>
                <span className="text-[9px] text-slate-500">{grid.length} lignes · {headers.length} col.</span>
              </div>
              {selectedCell && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                  <span className="text-[10px] font-black text-emerald-400">
                    {colLetter(selectedCell.col)}{selectedCell.row + 2}
                  </span>
                  <span className="text-[10px] text-slate-400 max-w-[200px] truncate">
                    {grid[selectedCell.row]?.[selectedCell.col] || ''}
                  </span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-slate-500 italic">Double-clic pour éditer une cellule</span>
                <button
                  onClick={handlePlanFormulas}
                  disabled={loading || !hasCredits(2)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white disabled:opacity-40 transition-all shadow-lg shadow-emerald-500/20">
                  {loading
                    ? <><Loader2 size={12} className="animate-spin"/> {loadingMsg}</>
                    : <><Brain size={12}/> Phase 1 — Claude planifie · ⚡2</>
                  }
                </button>
              </div>
            </div>

            {/* Spreadsheet */}
            <div className="flex-1 overflow-auto">
              <table className="border-collapse text-xs" style={{ minWidth: headers.length * 120 + 40 }}>
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="w-10 bg-[#0d1424] border-b border-r border-white/10 text-slate-600 text-[9px] font-black sticky left-0">#</th>
                    {headers.map((h, i) => (
                      <th key={i} className="bg-[#0d1424] border-b border-r border-white/10 px-3 py-2 text-left min-w-[110px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-emerald-500/50">{colLetter(i)}</span>
                          <span className="text-[10px] font-black text-slate-300 truncate max-w-[90px]">{h}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.slice(0, visibleRows).map((row, ri) => (
                    <tr key={ri} className={`${ri < 5 ? 'bg-emerald-500/5' : ri % 2 === 0 ? 'bg-white/2' : ''} hover:bg-white/5 group`}>
                      <td className="w-10 text-center text-[9px] font-bold bg-[#0d1424]/80 border-r border-white/5 select-none sticky left-0">
                        <span className={ri < 5 ? 'text-emerald-400' : 'text-slate-600'}>{ri + 2}</span>
                        {ri < 5 && <span className="ml-1 text-[7px] text-emerald-500/60">AI</span>}
                      </td>
                      {row.map((cell, ci) => {
                        const isSel = selectedCell?.row === ri && selectedCell?.col === ci
                        const isEdt = editingCell?.row  === ri && editingCell?.col  === ci
                        return (
                          <td key={ci}
                            onClick={() => setSelectedCell({ row: ri, col: ci })}
                            onDoubleClick={() => startEdit(ri, ci)}
                            className={`border-b border-r border-white/5 px-3 py-1.5 cursor-cell transition-colors ${
                              isSel ? 'outline outline-2 outline-emerald-500/60 bg-emerald-500/10' : ''
                            } ${ci === 0 ? 'font-bold text-slate-200' : 'text-slate-400'}`}
                            style={{ minWidth: 110, maxWidth: 200 }}>
                            {isEdt ? (
                              <input ref={inputRef} defaultValue={cell}
                                onBlur={e => commitEdit(ri, ci, e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') commitEdit(ri, ci, e.target.value); if (e.key === 'Escape') setEditingCell(null) }}
                                className="w-full bg-emerald-950/80 text-emerald-200 outline-none px-1 font-mono text-xs" autoFocus/>
                            ) : (
                              <span className="block truncate">{cell}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleRows < grid.length && (
                <div className="flex justify-center py-4 border-t border-white/5">
                  <button onClick={() => setVisibleRows(v => Math.min(v + 100, grid.length))}
                    className="text-xs text-slate-400 hover:text-emerald-400 font-bold transition-colors">
                    + 100 lignes ({grid.length - visibleRows} restantes)
                  </button>
                </div>
              )}
            </div>

            {/* Bottom hint */}
            <div className="flex-shrink-0 px-4 py-2 bg-[#0d1424] border-t border-white/5 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/60">
                <span className="w-2 h-2 rounded-sm bg-emerald-500/20 border border-emerald-500/30 inline-block"/>
                5 premières lignes envoyées à Claude pour générer les formules
              </div>
              <span className="text-slate-700 text-[10px]">·</span>
              <span className="text-[10px] text-slate-600">Les calculs couvriront toutes les {grid.length} lignes</span>
            </div>
          </div>
        )}

        {/* ══ PLANNING — Claude's formula plan ══ */}
        {step === 'planning' && plan && (
          <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

            {/* Plan header */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                  <Brain size={18} className="text-blue-400"/>
                </div>
                <div>
                  <p className="text-sm font-black text-white">Plan de formules généré par Claude</p>
                  <p className="text-xs text-blue-400">{plan.dataType} · {plan.formulas?.length} formules · {plan.analysisGoal}</p>
                </div>
                <div className="ml-auto text-[10px] text-slate-500 bg-white/5 px-3 py-1.5 rounded-full">
                  Basé sur 5 lignes d'exemple · couvrir {grid.length} lignes
                </div>
              </div>

              {/* Formulas by category */}
              {['total', 'statut', 'catégorie', 'temporel', 'performance', 'ratio'].map(cat => {
                const catFormulas = plan.formulas?.filter(f => f.category === cat) || []
                if (!catFormulas.length) return null
                const col = CATEGORY_COLORS[cat] || CATEGORY_COLORS.total
                return (
                  <div key={cat} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`}/>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${col.text}`}>{cat}</span>
                      <span className="text-[9px] text-slate-600">({catFormulas.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {catFormulas.map(f => (
                        <div key={f.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${col.bg} ${col.border}`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold ${col.text} truncate`}>{f.label}</p>
                            <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{f.formula}</p>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            f.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            f.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-500/20 text-slate-500'
                          }`}>{f.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add manual formulas */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ajouter des formules manuelles</p>
                <button
                  onClick={() => setManualFormulas(prev => [...prev, { id: Date.now(), label: '', formula: '', category: 'total', priority: 'medium' }])}
                  className="flex items-center gap-1 text-[10px] font-black text-emerald-400 hover:text-emerald-300 transition-colors">
                  <Plus size={11}/> Ajouter
                </button>
              </div>
              {manualFormulas.map(f => (
                <div key={f.id} className="flex items-center gap-2">
                  <input
                    value={f.label}
                    onChange={e => setManualFormulas(prev => prev.map(r => r.id === f.id ? { ...r, label: e.target.value } : r))}
                    placeholder="Label"
                    className="w-32 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-emerald-500/40"
                  />
                  <span className="text-emerald-400 font-mono text-xs">=</span>
                  <input
                    value={f.formula.startsWith('=') ? f.formula.slice(1) : f.formula}
                    onChange={e => setManualFormulas(prev => prev.map(r => r.id === f.id ? { ...r, formula: '=' + e.target.value } : r))}
                    placeholder={`SUM(B2:B${grid.length + 1})`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-emerald-300 outline-none focus:border-emerald-500/40 placeholder-slate-700"
                  />
                  <button onClick={() => setManualFormulas(prev => prev.filter(r => r.id !== f.id))}>
                    <Trash2 size={12} className="text-slate-600 hover:text-red-400 transition-colors"/>
                  </button>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleComputeFormulas}
              className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20">
              <Calculator size={18}/>
              Phase 2 — JavaScript calcule {(plan.formulas?.length || 0) + manualFormulas.length} formules sur {grid.length} lignes
              <ArrowRight size={16}/>
            </button>
          </div>
        )}

        {/* ══ COMPUTING — live progress ══ */}
        {step === 'computing' && (
          <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col items-center gap-8">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
              <Calculator size={28} className="text-emerald-400"/>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-white">JavaScript calcule les formules</h2>
              <p className="text-sm text-slate-500">Chaque formule est appliquée ligne par ligne sur les {grid.length} lignes réelles</p>
            </div>

            {/* Progress bar */}
            <div className="w-full space-y-3">
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>Progression</span>
                <span>{computeProgress}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-200"
                  style={{ width: `${computeProgress}%` }}/>
              </div>
              <p className="text-[10px] text-slate-600 text-center">
                {Math.round(((computeProgress / 100) * (plan?.formulas?.length || 1)))} / {plan?.formulas?.length || 0} formules calculées
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400/60">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>
              Aucun appel API — calcul local uniquement
            </div>
          </div>
        )}

        {/* ══ INTERPRET — Send to Claude ══ */}
        {step === 'interpret' && formulaResults.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

            {/* Results preview */}
            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400"/>
                  <span className="text-xs font-black text-slate-300 uppercase tracking-widest">
                    {formulaResults.filter(r => r.result !== '#ERR').length} formules calculées — prêtes pour Claude
                  </span>
                </div>
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full font-black">
                  100% JS — zéro hallucination
                </span>
              </div>

              {/* Group by category */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                {formulaResults.map((f, i) => {
                  const col = CATEGORY_COLORS[f.category] || CATEGORY_COLORS.total
                  const isErr = f.result === '#ERR'
                  return (
                    <div key={i} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${
                      isErr ? 'bg-red-500/10 border-red-500/20' : `${col.bg} ${col.border}`
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${isErr ? 'text-red-400' : col.text}`}>{f.label}</p>
                        <p className="text-[9px] font-mono text-slate-600 truncate">{f.formula}</p>
                      </div>
                      <span className={`text-sm font-black flex-shrink-0 ${isErr ? 'text-red-400' : 'text-white'}`}>
                        {typeof f.result === 'number' ? f.result.toLocaleString('fr-FR') : f.result}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Analysis request */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Votre demande spécifique (optionnel)
              </label>
              <textarea
                value={analysisRequest}
                onChange={e => setAnalysisRequest(e.target.value)}
                placeholder="Ex: Concentre-toi sur les écarts entre statuts et identifie les anomalies..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-emerald-500/40 transition-all"
              />
            </div>

            <button
              onClick={handleInterpret}
              disabled={loading || !hasCredits(3)}
              className="w-full py-5 rounded-2xl font-black text-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-violet-500/20">
              {loading
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> {loadingMsg}</>
                : <><Sparkles size={18}/> Phase 3 — Claude interprète les résultats · ⚡3</>
              }
            </button>

            {credits < 3 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400 font-medium text-center">
                ⚠️ 3 crédits requis —{' '}
                <button onClick={() => router.push('/pricing')} className="underline font-black">Recharger</button>
              </div>
            )}
          </div>
        )}

        {/* ══ RESULT ══ */}
        {step === 'result' && analysis && (
          <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

            <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 rounded-3xl p-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Rapport ExcelAI</p>
                  <h2 className="text-2xl font-black text-white">{analysis.title}</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {file?.name} · {grid.length} lignes · {formulaResults.length} formules calculées · {analysis.generatedAt}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep('interpret')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-black transition-all">
                    <RefreshCw size={13}/> Ré-interpréter
                  </button>
                  <button onClick={handleExport}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-500/20">
                    <Download size={16}/> Exporter Excel
                  </button>
                </div>
              </div>

              {/* Top formula results pinned */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {formulaResults
                  .filter(f => f.priority === 'high' && f.result !== '#ERR')
                  .slice(0, 4)
                  .map((f, i) => {
                    const col = CATEGORY_COLORS[f.category] || CATEGORY_COLORS.total
                    return (
                      <div key={i} className={`rounded-xl p-3 border ${col.bg} ${col.border}`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${col.text} truncate`}>∑ {f.label}</p>
                        <p className="text-lg font-black text-white mt-1">
                          {typeof f.result === 'number' ? f.result.toLocaleString('fr-FR') : f.result}
                        </p>
                        <p className="text-[9px] font-mono text-slate-600 truncate">{f.formula}</p>
                      </div>
                    )
                  })}
              </div>

              {/* Key findings */}
              <div className="mt-5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Constats clés</p>
                {analysis.summary?.keyFindings?.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 font-black flex-shrink-0">{i + 1}.</span> {f}
                  </div>
                ))}
              </div>
              {analysis.summary?.overallScore && (
                <div className="mt-4 bg-white/5 rounded-xl px-4 py-3 text-xs text-slate-400 italic">
                  💡 {analysis.summary.overallScore}
                </div>
              )}
            </div>

            {/* Sections */}
            {analysis.sections?.length > 0 && (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {analysis.sections.map((s, i) => (
                    <button key={i} onClick={() => setActiveSection(i)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeSection === i
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/8 hover:border-white/15'
                      }`}>
                      <span>{s.icon}</span>{s.title}
                    </button>
                  ))}
                </div>
                {(() => {
                  const section = analysis.sections[activeSection]
                  if (!section) return null
                  return (
                    <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{section.icon}</span>
                        <h3 className="text-base font-black text-white">{section.title}</h3>
                      </div>
                      {section.data?.map((d, i) => (
                        <div key={i} className="flex items-center justify-between gap-4 p-3 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {trendIcon(d.trend)}
                            <span className="text-sm text-slate-300 truncate">{d.label}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-sm font-black text-white">{d.value}</span>
                            {d.note && <span className="text-xs text-slate-500 max-w-[200px] truncate hidden md:block">{d.note}</span>}
                          </div>
                        </div>
                      ))}
                      {section.insight && (
                        <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                          <Lightbulb size={14} className="text-emerald-400 flex-shrink-0 mt-0.5"/>
                          <p className="text-xs text-emerald-300 leading-relaxed">{section.insight}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recommandations</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} className={`p-4 rounded-xl border space-y-2 ${
                      r.priority === 'high'   ? 'bg-red-500/10 border-red-500/20' :
                      r.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/20' :
                                                'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span>{r.priority === 'high' ? '🔴' : r.priority === 'medium' ? '🟡' : '🟢'}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {r.priority === 'high' ? 'Priorité haute' : r.priority === 'medium' ? 'Priorité moyenne' : 'Priorité faible'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white">{r.action}</p>
                      <p className="text-xs text-slate-400">{r.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <button onClick={handleExport}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-black transition-all">
                <Download size={16}/> Exporter avec feuille ExcelAI
              </button>
              <button onClick={() => { setStep('interpret'); setAnalysis(null) }}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-slate-400 transition-all">
                <RefreshCw size={14}/> Nouvelle analyse
              </button>
              <button onClick={reset}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-slate-400 transition-all">
                Nouveau fichier
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}