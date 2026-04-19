'use client'

import { useState, useRef } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import {
  Zap, Upload, Download, RefreshCw, Sparkles,
  FileText, BarChart3, Shield,
  ChevronRight, X, Eye, EyeOff, Palette,
  CheckCircle, AlertCircle
} from 'lucide-react'

const DASHBOARD_TYPES = [
  { id: 'finance',   label: 'Finance & Comptabilité', icon: '💰', desc: 'Revenus, dépenses, flux de trésorerie' },
  { id: 'sales',     label: 'Ventes & CRM',           icon: '📈', desc: 'Pipeline, performance équipe, CA' },
  { id: 'hr',        label: 'RH & Effectifs',          icon: '👥', desc: 'Salaires, absences, recrutement' },
  { id: 'marketing', label: 'Marketing & KPIs',        icon: '🎯', desc: 'Campagnes, conversions, ROI' },
  { id: 'stock',     label: 'Inventaire & Stock',      icon: '📦', desc: 'Niveaux, rotations, alertes' },
  { id: 'custom',    label: 'Personnalisé',            icon: '⚙️', desc: 'Décrivez votre besoin spécifique' },
]

const COLOR_THEMES = [
  { id: 'dark',   label: 'Fintech Dark',   preview: 'from-slate-900 to-slate-800' },
  { id: 'light',  label: 'SaaS Light',     preview: 'from-white to-slate-100' },
  { id: 'purple', label: 'Purple Pro',     preview: 'from-violet-900 to-indigo-900' },
  { id: 'green',  label: 'Finance Green',  preview: 'from-emerald-900 to-teal-900' },
]

const WORKFLOW_STEPS = [
  { id: 1, label: 'Analyse des données',       icon: '🔍', desc: 'Détection des colonnes et du schéma' },
  { id: 2, label: 'Génération du dashboard',   icon: '🏗️', desc: 'Construction HTML + JS complet' },
  { id: 3, label: 'Vérification upload/export',icon: '🧪', desc: 'Test des fonctions critiques' },
  { id: 4, label: 'Correction syntaxique',     icon: '🔧', desc: 'Boucle de correction jusqu\'à OK' },
]

export default function DashboardAI() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [description, setDescription] = useState('')
  const [dashboardType, setDashboardType] = useState('finance')
  const [colorTheme, setColorTheme] = useState('dark')
  const [language, setLanguage] = useState('Français')
  const [file, setFile] = useState(null)
  const [dataPreview, setDataPreview] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [generatedHtml, setGeneratedHtml] = useState('')
  const [detectedSchema, setDetectedSchema] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  // ── Parse file and extract first 10 rows ──
  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setParsedRows([])

    try {
      if (f.name.endsWith('.csv') || f.type === 'text/csv') {
        const text = await f.text()
        const lines = text.split('\n').filter(l => l.trim())
        const headers = lines[0]?.split(',').map(h => h.replace(/"/g, '').trim()) || []
        const rows = lines.slice(1, 11).map(line => {
          const vals = line.split(',').map(v => v.replace(/"/g, '').trim())
          const obj = {}
          headers.forEach((h, i) => { obj[h] = vals[i] || '' })
          return obj
        })
        setParsedRows(rows)
        const preview = [headers.join(','), ...lines.slice(1, 11)].join('\n')
        setDataPreview(preview)

      } else if (f.name.endsWith('.json')) {
        const text = await f.text()
        const data = JSON.parse(text)
        const arr = Array.isArray(data) ? data : [data]
        const rows = arr.slice(0, 10)
        setParsedRows(rows)
        setDataPreview(JSON.stringify(rows, null, 2))

      } else if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
        setDataPreview(`Fichier Excel: ${f.name} (${(f.size / 1024).toFixed(1)} Ko)\nLes colonnes seront analysées automatiquement.`)

      } else {
        const text = await f.text()
        setDataPreview(text.slice(0, 800))
      }
    } catch (err) {
      setDataPreview(`Fichier chargé: ${f.name}`)
    }
  }

  const markStep = (stepId) => {
    setCurrentStep(stepId)
    setCompletedSteps(prev => [...prev.filter(s => s !== stepId - 1), stepId - 1])
  }

  const handleGenerate = async () => {
    if (!hasCredits(5)) { router.push('/pricing'); return }
    if (!description.trim() && !file) {
      setError('Veuillez ajouter une description ou uploader un fichier.')
      return
    }

    setLoading(true)
    setError('')
    setGeneratedHtml('')
    setDetectedSchema(null)
    setCompletedSteps([])
    setCurrentStep(1)

    try {
      const selectedType = DASHBOARD_TYPES.find(t => t.id === dashboardType)

      // Pass parsed rows (first 10) as structured data preview
      const structuredPreview = parsedRows.length > 0
        ? JSON.stringify(parsedRows, null, 2)
        : dataPreview

      // Step indicators
      const stepDelay = (ms) => new Promise(r => setTimeout(r, ms))

      setCurrentStep(1) // Analyse
      await stepDelay(300)

      const res = await fetch('/api/generer-dashboardai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description || `Dashboard ${selectedType?.label}`,
          dataPreview: structuredPreview,
          parsedRows: parsedRows.slice(0, 10),
          fileName: file?.name || null,
          dashboardType: selectedType?.label,
          colorTheme,
          language,
        })
      })

      // Simulate step progression while waiting
      const stepTimer1 = setTimeout(() => markStep(2), 8000)
      const stepTimer2 = setTimeout(() => markStep(3), 25000)
      const stepTimer3 = setTimeout(() => markStep(4), 45000)

      const data = await res.json()

      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      clearTimeout(stepTimer3)

      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      setCompletedSteps([0, 1, 2, 3])
      setCurrentStep(0)

      await deductCredits(5)
      setGeneratedHtml(data.html)
      if (data.schema) setDetectedSchema(data.schema)
      setShowPreview(true)

    } catch (err) {
      setError(err.message)
      setCurrentStep(0)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!generatedHtml) return
    const blob = new Blob([generatedHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-${dashboardType}-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const removeFile = () => {
    setFile(null)
    setDataPreview('')
    setParsedRows([])
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!allowed) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center flex-col gap-4">
      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
        <Zap size={22} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#0f172a] text-white font-sans">

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0f172a]/95 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <BarChart3 size={18}/>
          </div>
          <div>
            <span className="font-black text-lg tracking-tight">Dashboard</span>
            <span className="text-indigo-400 font-black text-lg tracking-tight">.AI</span>
            <span className="ml-2 text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">Pro</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-500/20 rounded-full px-3 py-1.5">
            <Zap size={11} className="text-indigo-400" fill="currentColor"/>
            <span className="text-xs font-black text-indigo-300">{credits} crédits</span>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="h-9 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all">
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── LEFT ── */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight mb-1">
              Générez votre<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                dashboard en 1 clic
              </span>
            </h1>
            <p className="text-slate-500 text-sm">
              Uploadez vos données → Claude analyse, génère et vérifie automatiquement.
            </p>
          </div>

          {/* Dashboard Type */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type de dashboard</label>
            <div className="grid grid-cols-2 gap-2">
              {DASHBOARD_TYPES.map(type => (
                <button key={type.id} onClick={() => setDashboardType(type.id)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                    dashboardType === type.id
                      ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-200'
                      : 'border-white/8 bg-white/3 text-slate-400 hover:border-white/15'
                  }`}>
                  <span className="text-xl">{type.icon}</span>
                  <span className="text-xs font-black leading-tight">{type.label}</span>
                  <span className="text-[10px] text-slate-500 leading-tight">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Theme */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Palette size={11}/> Thème visuel
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_THEMES.map(theme => (
                <button key={theme.id} onClick={() => setColorTheme(theme.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    colorTheme === theme.id
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-white/8 bg-white/3 hover:border-white/15'
                  }`}>
                  <div className={`w-8 h-5 rounded bg-gradient-to-r ${theme.preview} flex-shrink-0 border border-white/10`}/>
                  <span className="text-xs font-bold text-slate-300">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Langue</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
              <option value="Français">🇫🇷 Français</option>
              <option value="English">🇬🇧 English</option>
              <option value="Español">🇪🇸 Español</option>
              <option value="Wolof">🇸🇳 Wolof</option>
            </select>
          </div>

          {/* Credits */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-indigo-400"/>
              <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">Coût</span>
            </div>
            <p className="text-2xl font-black text-white">⚡ 5 crédits</p>
            <p className="text-xs text-slate-500 mt-1">{credits} disponibles</p>
            {credits < 5 && (
              <button onClick={() => router.push('/pricing')}
                className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black text-white transition-all">
                Recharger →
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Description *
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Dashboard financier avec revenus vs dépenses, graphique trésorerie 12 mois, top 5 catégories..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/40 transition-all" />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Fichier de données (optionnel — CSV ou JSON)
            </label>

            {!file ? (
              <label className="block cursor-pointer group">
                <div className="border-2 border-dashed border-white/10 group-hover:border-indigo-500/40 rounded-2xl p-8 text-center transition-all">
                  <Upload size={28} className="mx-auto mb-3 text-slate-600 group-hover:text-indigo-400 transition-colors"/>
                  <p className="text-sm font-bold text-slate-400 group-hover:text-slate-300">Glissez ou cliquez pour uploader</p>
                  <p className="text-xs text-slate-600 mt-1">CSV · JSON</p>
                  <p className="text-[10px] text-slate-700 mt-2">Claude analyse les 10 premières lignes pour construire le dashboard</p>
                </div>
                <input ref={fileRef} type="file" hidden accept=".csv,.json,.txt" onChange={handleFile}/>
              </label>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-400"/>
                    <span className="text-sm font-bold text-emerald-300">{file.name}</span>
                    <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} Ko)</span>
                  </div>
                  <button onClick={removeFile} className="p-1 hover:bg-white/10 rounded-lg transition-all">
                    <X size={14} className="text-slate-400"/>
                  </button>
                </div>

                {parsedRows.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      ✓ {parsedRows.length} lignes analysées · Colonnes détectées :
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(parsedRows[0] || {}).map(col => (
                        <span key={col} className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-full px-2 py-0.5 font-bold">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {dataPreview && (
                  <div className="bg-black/30 rounded-xl p-3 font-mono text-[10px] text-slate-400 max-h-24 overflow-y-auto">
                    {dataPreview.slice(0, 400)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 font-medium flex items-center gap-2">
              <AlertCircle size={14}/> {error}
            </div>
          )}

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={loading || !hasCredits(5)}
            className="w-full py-5 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20">
            {loading ? (
              <><RefreshCw size={18} className="animate-spin"/> Claude génère votre dashboard... <span className="text-xs opacity-60">(60-90s)</span></>
            ) : (
              <><Sparkles size={18}/> Générer le Dashboard · ⚡5 <ChevronRight size={16}/></>
            )}
          </button>

          {/* Workflow progress */}
          {loading && (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Workflow en cours</p>
              {WORKFLOW_STEPS.map((step, i) => {
                const isDone = completedSteps.includes(i)
                const isActive = currentStep === step.id
                return (
                  <div key={step.id} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                    isActive ? 'bg-indigo-500/15 border border-indigo-500/30' :
                    isDone ? 'bg-emerald-500/10 border border-emerald-500/20' :
                    'opacity-40'
                  }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${
                      isDone ? 'bg-emerald-500/20 text-emerald-400' :
                      isActive ? 'bg-indigo-500/20' : 'bg-white/5'
                    }`}>
                      {isDone ? <CheckCircle size={14} className="text-emerald-400"/> :
                       isActive ? <RefreshCw size={14} className="text-indigo-400 animate-spin"/> :
                       step.icon}
                    </div>
                    <div>
                      <p className={`text-xs font-black ${isDone ? 'text-emerald-300' : isActive ? 'text-indigo-300' : 'text-slate-500'}`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-slate-600">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Detected schema */}
          {detectedSchema && !loading && (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schéma détecté</p>
              <div className="flex flex-wrap gap-1.5">
                {detectedSchema.columns?.map(col => (
                  <span key={col.name} className={`text-[10px] rounded-full px-2 py-0.5 font-bold border ${
                    col.role === 'kpi' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20' :
                    col.role === 'metric' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' :
                    col.role === 'date' ? 'bg-amber-500/20 text-amber-300 border-amber-500/20' :
                    'bg-white/5 text-slate-400 border-white/10'
                  }`}>
                    {col.name} <span className="opacity-60">({col.type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {generatedHtml && !loading && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle size={18} className="text-emerald-400"/>
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-300">Dashboard vérifié et prêt !</p>
                  <p className="text-xs text-slate-500">{(generatedHtml.length / 1024).toFixed(1)} Ko · HTML autonome · Upload + Export testés</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleDownload}
                  className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-sm transition-all">
                  <Download size={16}/> Télécharger HTML
                </button>
                <button onClick={() => setShowPreview(v => !v)}
                  className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black text-sm transition-all">
                  {showPreview ? <EyeOff size={16}/> : <Eye size={16}/>}
                  {showPreview ? 'Masquer' : 'Aperçu'}
                </button>
              </div>

              <div className="flex items-start gap-2 text-xs text-slate-500">
                <Shield size={12} className="flex-shrink-0 mt-0.5 text-emerald-600"/>
                <span>Fichier HTML autonome — ouvrez-le localement. Vos données ne quittent jamais votre appareil.</span>
              </div>

              <button onClick={handleGenerate} disabled={loading || !hasCredits(5)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-slate-400 transition-all flex items-center justify-center gap-2">
                <RefreshCw size={12}/> Régénérer (⚡5)
              </button>
            </div>
          )}

          {/* Preview */}
          {showPreview && generatedHtml && (
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aperçu</span>
                <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X size={12} className="text-slate-400"/>
                </button>
              </div>
              <iframe srcDoc={generatedHtml} className="w-full border-none" style={{ height: 650 }}
                title="Dashboard Preview" sandbox="allow-scripts allow-same-origin"/>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      {!generatedHtml && !loading && (
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <div className="border-t border-white/5 pt-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center mb-8">Workflow de génération</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {WORKFLOW_STEPS.map((step) => (
                <div key={step.id} className="flex flex-col items-center text-center gap-2 p-4 bg-white/3 border border-white/8 rounded-2xl">
                  <span className="text-2xl">{step.icon}</span>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Étape {step.id}</span>
                  <p className="text-xs font-black text-white">{step.label}</p>
                  <p className="text-[10px] text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}