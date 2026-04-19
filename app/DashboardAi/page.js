'use client'

import { useState, useRef } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import {
  Zap, Upload, Download, RefreshCw, Sparkles,
  FileText, BarChart3, TrendingUp, Shield,
  ChevronRight, X, Eye, EyeOff, Palette
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
  const [loading, setLoading] = useState(false)
  const [generatedHtml, setGeneratedHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')

    // Read first lines for preview
    try {
      if (f.name.endsWith('.csv') || f.type === 'text/csv') {
        const text = await f.text()
        const lines = text.split('\n').slice(0, 15).join('\n')
        setDataPreview(lines)
      } else if (f.name.endsWith('.json')) {
        const text = await f.text()
        const data = JSON.parse(text)
        setDataPreview(JSON.stringify(Array.isArray(data) ? data.slice(0, 5) : data, null, 2))
      } else if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
        // For Excel, just note the file — Claude will handle it with demo data context
        setDataPreview(`Fichier Excel détecté: ${f.name} (${(f.size / 1024).toFixed(1)} Ko)\nLes colonnes seront analysées automatiquement.`)
      } else {
        const text = await f.text()
        setDataPreview(text.slice(0, 500))
      }
    } catch (err) {
      setDataPreview(`Fichier chargé: ${f.name}`)
    }
  }

  const handleGenerate = async () => {
    if (!hasCredits(5)) {
      router.push('/pricing')
      return
    }
    if (!description.trim() && !file) {
      setError('Veuillez ajouter une description ou uploader un fichier de données.')
      return
    }

    setLoading(true)
    setError('')
    setGeneratedHtml('')

    try {
      const selectedType = DASHBOARD_TYPES.find(t => t.id === dashboardType)

      const res = await fetch('/api/generer-dashboardai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description || `Dashboard ${selectedType?.label}`,
          dataPreview,
          fileName: file?.name || null,
          dashboardType: selectedType?.label,
          colorTheme,
          language,
        })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      await deductCredits(5)
      setGeneratedHtml(data.html)
      setShowPreview(true)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!generatedHtml) return
    const blob = new Blob([generatedHtml], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `dashboard-ai-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const removeFile = () => {
    setFile(null)
    setDataPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Loading screen ──
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

        {/* ── LEFT: Config Panel ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Intro */}
          <div>
            <h1 className="text-2xl font-black tracking-tight mb-1">
              Générez votre<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                dashboard en 1 clic
              </span>
            </h1>
            <p className="text-slate-500 text-sm">
              Uploadez vos données → Claude génère un fichier HTML autonome prêt à utiliser.
            </p>
          </div>

          {/* Dashboard Type */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Type de dashboard
            </label>
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
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Langue de l'interface
            </label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
              <option value="Français">🇫🇷 Français</option>
              <option value="English">🇬🇧 English</option>
              <option value="Español">🇪🇸 Español</option>
              <option value="Wolof">🇸🇳 Wolof</option>
            </select>
          </div>

          {/* Credits info */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-indigo-400"/>
              <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">Coût de génération</span>
            </div>
            <p className="text-2xl font-black text-white">⚡ 5 crédits</p>
            <p className="text-xs text-slate-500 mt-1">par dashboard généré · {credits} disponibles</p>
            {credits < 5 && (
              <button onClick={() => router.push('/pricing')}
                className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black text-white transition-all">
                Recharger les crédits →
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Input + Output ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Description de votre dashboard *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={`Ex: Dashboard financier pour une PME avec analyse des revenus vs dépenses mensuels, graphique de trésorerie sur 12 mois, top 5 des catégories de dépenses et prévisions du trimestre suivant...`}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/40 transition-all leading-relaxed"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Fichier de données (optionnel)
            </label>

            {!file ? (
              <label className="block cursor-pointer group">
                <div className="border-2 border-dashed border-white/10 group-hover:border-indigo-500/40 rounded-2xl p-8 text-center transition-all">
                  <Upload size={28} className="mx-auto mb-3 text-slate-600 group-hover:text-indigo-400 transition-colors"/>
                  <p className="text-sm font-bold text-slate-400 group-hover:text-slate-300">
                    Glissez ou cliquez pour uploader
                  </p>
                  <p className="text-xs text-slate-600 mt-1">CSV · Excel (.xlsx) · JSON</p>
                  <p className="text-[10px] text-slate-700 mt-2">Sans fichier → données de démonstration générées</p>
                </div>
                <input ref={fileRef} type="file" hidden accept=".csv,.xlsx,.xls,.json,.txt"
                  onChange={handleFile}/>
              </label>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-400"/>
                    <span className="text-sm font-bold text-emerald-300">{file.name}</span>
                    <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} Ko)</span>
                  </div>
                  <button onClick={removeFile} className="p-1 hover:bg-white/10 rounded-lg transition-all">
                    <X size={14} className="text-slate-400"/>
                  </button>
                </div>
                {dataPreview && (
                  <div className="bg-black/30 rounded-xl p-3 font-mono text-[11px] text-slate-400 max-h-28 overflow-y-auto">
                    {dataPreview}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !hasCredits(5)}
            className="w-full py-5 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin"/>
                <span>Claude génère votre dashboard...</span>
                <span className="text-xs opacity-60">(30-60 sec)</span>
              </>
            ) : (
              <>
                <Sparkles size={18}/>
                Générer le Dashboard · ⚡5
                <ChevronRight size={16}/>
              </>
            )}
          </button>

          {/* Loading animation */}
          {loading && (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Claude travaille...</p>
              {[
                '🔍 Analyse du type de données...',
                '🎨 Conception de l\'interface...',
                '📊 Génération des graphiques...',
                '🧠 Calcul des insights IA...',
                '⚡ Finalisation du fichier HTML...',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}/>
                  <span className="text-xs text-slate-500">{step}</span>
                </div>
              ))}
            </div>
          )}

          {/* Result */}
          {generatedHtml && !loading && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <BarChart3 size={16} className="text-emerald-400"/>
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-300">Dashboard généré avec succès !</p>
                  <p className="text-xs text-slate-500">{(generatedHtml.length / 1024).toFixed(1)} Ko · HTML autonome</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Download */}
                <button onClick={handleDownload}
                  className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-sm transition-all">
                  <Download size={16}/> Télécharger HTML
                </button>

                {/* Preview toggle */}
                <button onClick={() => setShowPreview(v => !v)}
                  className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black text-sm transition-all">
                  {showPreview ? <EyeOff size={16}/> : <Eye size={16}/>}
                  {showPreview ? 'Masquer' : 'Aperçu'}
                </button>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <Shield size={12} className="flex-shrink-0 mt-0.5 text-emerald-600"/>
                <span>Fichier HTML autonome — ouvrez-le directement dans votre navigateur. Vos données ne quittent jamais votre appareil.</span>
              </div>

              {/* Regenerate */}
              <button onClick={handleGenerate} disabled={loading || !hasCredits(5)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-slate-400 transition-all flex items-center justify-center gap-2">
                <RefreshCw size={12}/> Régénérer (⚡5)
              </button>
            </div>
          )}

          {/* Preview iframe */}
          {showPreview && generatedHtml && (
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aperçu du dashboard</span>
                <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X size={12} className="text-slate-400"/>
                </button>
              </div>
              <iframe
                srcDoc={generatedHtml}
                className="w-full border-none"
                style={{ height: 600 }}
                title="Dashboard Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      {!generatedHtml && !loading && (
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <div className="border-t border-white/5 pt-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center mb-8">Comment ça marche</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '01', icon: <Upload size={20}/>, title: 'Uploadez vos données', desc: 'CSV, Excel ou JSON — ou décrivez simplement ce que vous voulez' },
                { step: '02', icon: <Sparkles size={20}/>, title: 'Claude analyse', desc: 'Le modèle détecte vos colonnes, votre secteur et génère le code optimal' },
                { step: '03', icon: <BarChart3 size={20}/>, title: 'Dashboard généré', desc: 'Fichier HTML unique avec graphiques, KPIs et analyse prédictive' },
                { step: '04', icon: <Download size={20}/>, title: 'Double-cliquez', desc: 'Ouvrez le fichier localement — zéro serveur, confidentialité totale' },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{item.step}</p>
                    <p className="text-sm font-black text-white mb-1">{item.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}