'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import VisualEditor from './VisualEditor'  // ← import from same folder
import {
  Zap, Sparkles, RefreshCw, Copy, Check,
  ChevronRight, ChevronLeft, Edit3,
  Clock, Hash, Target,
} from 'lucide-react'

const PLATFORMS = [
  { id: 'linkedin',  label: 'LinkedIn',   icon: '💼', color: '#0077b5' },
  { id: 'instagram', label: 'Instagram',  icon: '📸', color: '#e1306c' },
  { id: 'tiktok',    label: 'TikTok',     icon: '🎵', color: '#010101' },
  { id: 'twitter',   label: 'Twitter/X',  icon: '𝕏',  color: '#1da1f2' },
  { id: 'facebook',  label: 'Facebook',   icon: '👥', color: '#1877f2' },
]

const TONES = [
  { id: 'professionnel', label: 'Professionnel', icon: '🎯' },
  { id: 'inspirant',     label: 'Inspirant',     icon: '✨' },
  { id: 'humoristique',  label: 'Humoristique',  icon: '😄' },
  { id: 'educatif',      label: 'Éducatif',      icon: '📚' },
  { id: 'storytelling',  label: 'Storytelling',  icon: '📖' },
]

const ELEMENT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
]

const defaultElement = (type, x, y) => ({
  id: `el_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  type, x, y,
  width:  type === 'text' ? 200 : type === 'circle' ? 80 : 160,
  height: type === 'text' ? 60  : type === 'circle' ? 80 : 60,
  text:   type === 'text' ? 'Votre texte ici' : type === 'rect' ? 'Titre' : type === 'circle' ? '●' : '',
  color:  ELEMENT_COLORS[Math.floor(Math.random() * ELEMENT_COLORS.length)],
  fontSize: 14, bold: false,
  bgOpacity: type === 'text' ? 0 : 0.85,
  rotation: 0,
})

export default function PostGenerator() {
  const allowed = usePlanGuard('starter')
  const { credits } = useCredits()

  const [step, setStep]           = useState(0)
  const [form, setForm]           = useState({ theme: '', audience: '', platform: 'linkedin', tone: 'professionnel', link: '', extra: '' })
  const [strategy, setStrategy]   = useState(null)
  const [script, setScript]       = useState(null)
  const [finalPost, setFinalPost] = useState(null)
  const [schedule, setSchedule]   = useState([])
  const [hashtags, setHashtags]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [loadingStep, setLoadingStep] = useState(null)
  const [error, setError]         = useState(null)
  const [copied, setCopied]       = useState(false)
  const [editingScript, setEditingScript] = useState(false)
  const [editingPost, setEditingPost]     = useState(false)

  // Visual editor state
  const [elements, setElements]   = useState([])
  const [bgImage, setBgImage]     = useState(null)
  const [bgColor, setBgColor]     = useState('#0f172a')
  const [selected, setSelected]   = useState(null)
  const [dragging, setDragging]   = useState(null)
  const [resizing, setResizing]   = useState(null)
  const [editingElId, setEditingElId]     = useState(null)
  const [editingElText, setEditingElText] = useState('')
  const canvasRef = useRef(null)
  const fileRef   = useRef(null)
  const bgFileRef = useRef(null)

  const callAI = async (action) => {
    setLoading(true)
    setLoadingStep(action)
    setError(null)
    try {
      const res = await fetch('/api/generer-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, form, script, finalPost }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
      setLoadingStep(null)
    }
  }

  const handleAnalyse  = async () => { const d = await callAI('analyse');   if (d) { setStrategy(d.strategy); setStep(1) } }
  const handleScript   = async () => { const d = await callAI('script');    if (d) { setScript(d.script);     setStep(2) } }
  const handleFinalise = async () => {
    const d = await callAI('finalise')
    if (d) {
      setFinalPost(d.post)
      setSchedule(d.schedule || [])
      setHashtags(d.hashtags || [])
      setStep(3)
      if (d.post) {
        setElements([{
          ...defaultElement('text', 40, 40),
          text: d.post.slice(0, 120) + (d.post.length > 120 ? '…' : ''),
          width: 340, height: 120, fontSize: 13,
        }])
      }
    }
  }

  const copyPost = () => {
    if (!finalPost) return
    navigator.clipboard.writeText(finalPost + '\n\n' + hashtags.join(' '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getCanvasPoint = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === canvasRef.current || e.target.tagName === 'DIV') setSelected(null)
  }, [])

  const startElDrag = useCallback((e, el) => {
    e.stopPropagation()
    if (editingElId === el.id) return
    const pt = getCanvasPoint(e)
    setDragging({ id: el.id, ox: pt.x - el.x, oy: pt.y - el.y })
    setSelected(el.id)
  }, [editingElId, getCanvasPoint])

  const startElResize = useCallback((e, el) => {
    e.stopPropagation()
    const pt = getCanvasPoint(e)
    setResizing({ id: el.id, startW: el.width, startH: el.height, startPx: pt.x, startPy: pt.y })
  }, [getCanvasPoint])

  const handleCanvasMouseMove = useCallback((e) => {
    if (dragging) {
      const pt = getCanvasPoint(e)
      setElements(prev => prev.map(el =>
        el.id === dragging.id ? { ...el, x: pt.x - dragging.ox, y: pt.y - dragging.oy } : el
      ))
    }
    if (resizing) {
      const pt = getCanvasPoint(e)
      setElements(prev => prev.map(el =>
        el.id === resizing.id ? {
          ...el,
          width:  Math.max(40, resizing.startW + pt.x - resizing.startPx),
          height: Math.max(24, resizing.startH + pt.y - resizing.startPy),
        } : el
      ))
    }
  }, [dragging, resizing, getCanvasPoint])

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null)
    setResizing(null)
  }, [])

  const startElEdit = useCallback((e, el) => {
    e.stopPropagation()
    setEditingElId(el.id)
    setEditingElText(el.text)
  }, [])

  const commitElEdit = useCallback(() => {
    setElements(prev => prev.map(el => el.id === editingElId ? { ...el, text: editingElText } : el))
    setEditingElId(null)
  }, [editingElId, editingElText])

  const addElement = (type) => setElements(prev => [...prev, defaultElement(type, 60 + Math.random() * 100, 60 + Math.random() * 80)])
  const deleteEl   = () => { if (!selected) return; setElements(prev => prev.filter(el => el.id !== selected)); setSelected(null) }
  const updateEl   = (prop, val) => setElements(prev => prev.map(el => el.id === selected ? { ...el, [prop]: val } : el))

  const handleBgImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setBgImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleImageInsert = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setElements(prev => [...prev, { ...defaultElement('image', 80, 80), src: ev.target.result, width: 180, height: 180 }])
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const handler = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !editingElId) deleteEl()
      if (e.key === 'Escape' && editingElId) commitElEdit()
      if (e.key === 'Enter' && editingElId) commitElEdit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, editingElId, commitElEdit])

  const platform = PLATFORMS.find(p => p.id === form.platform)

  if (!allowed) return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white" />
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-pink-500 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#09090f] text-white" style={{ fontFamily: "'DM Sans', system-ui" }}>

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 bg-[#09090f]/95 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center">
            <Sparkles size={15} />
          </div>
          <span className="font-black tracking-tight">PostGen</span>
          <span className="text-[9px] bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">AI Studio</span>
        </div>
        <div className="flex items-center gap-1">
          {['Brief', 'Analyse', 'Script', 'Visuel'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  i === step ? 'bg-pink-600 text-white' :
                  i < step ? 'bg-white/10 text-slate-300 hover:bg-white/15' :
                  'text-slate-600 cursor-not-allowed'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${i <= step ? 'bg-white/20' : 'bg-white/5'}`}>{i + 1}</span>
                {s}
              </button>
              {i < 3 && <ChevronRight size={12} className="text-slate-700" />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-500/20 rounded-full px-3 py-1.5">
          <Zap size={11} className="text-indigo-400" fill="currentColor" />
          <span className="text-xs font-black text-indigo-300">{credits}</span>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 text-xs text-red-400 font-bold">
          ⚠️ {error}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* STEP 0: BRIEF */}
        {step === 0 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black tracking-tight">Créez votre post parfait</h1>
              <p className="text-slate-500">Remplissez le brief, l'IA fait le reste</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Thème du post *</label>
                <textarea value={form.theme} onChange={e => setForm(p => ({ ...p, theme: e.target.value }))}
                  placeholder="Ex: Lancement de notre nouveau produit SaaS..." rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-pink-500/50" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Audience cible *</label>
                <input value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}
                  placeholder="Ex: Entrepreneurs B2B, Freelances..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/50" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Plateforme</label>
                <div className="grid grid-cols-5 gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => setForm(prev => ({ ...prev, platform: p.id }))}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all ${form.platform === p.id ? 'border-pink-500/60 bg-pink-500/15 text-pink-200' : 'border-white/10 text-slate-500 hover:border-white/20'}`}>
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-[10px]">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Ton</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => setForm(p => ({ ...p, tone: t.id }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${form.tone === t.id ? 'border-pink-500/60 bg-pink-500/15 text-pink-200' : 'border-white/10 text-slate-500 hover:border-white/20'}`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Lien (optionnel)</label>
                <input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/50" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Instructions supplémentaires</label>
                <input value={form.extra} onChange={e => setForm(p => ({ ...p, extra: e.target.value }))}
                  placeholder="Ex: Mentionner notre offre Black Friday..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/50" />
              </div>
            </div>
            <button onClick={handleAnalyse} disabled={loading || !form.theme.trim() || !form.audience.trim()}
              className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
              {loading && loadingStep === 'analyse' ? (
                <><RefreshCw size={16} className="animate-spin" /> Analyse en cours...</>
              ) : (
                <><Target size={16} /> Analyser avec l'IA <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {/* STEP 1: STRATEGY */}
        {step === 1 && strategy && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black">Stratégie de contenu</h2>
              <p className="text-slate-500 text-sm">Analysé pour <span style={{ color: platform?.color }}>{platform?.icon} {platform?.label}</span></p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              {strategy.method && (
                <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                  <p className="text-xs font-black text-pink-400 uppercase tracking-widest mb-1">Méthode recommandée</p>
                  <p className="text-sm font-bold text-white">{strategy.method}</p>
                </div>
              )}
              {strategy.keywords?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Hash size={10} /> Mots-clés</p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.keywords.map((k, i) => (
                      <span key={i} className="bg-white/8 border border-white/10 rounded-full px-3 py-1 text-xs font-bold text-slate-300">{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {strategy.painPoints?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Points de douleur</p>
                  <ul className="space-y-1">
                    {strategy.painPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-orange-400 mt-0.5">→</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {strategy.hookAngle && (
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Angle d'accroche</p>
                  <p className="text-sm text-slate-200 italic">"{strategy.hookAngle}"</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-shrink-0 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm flex items-center gap-2">
                <ChevronLeft size={14} /> Modifier
              </button>
              <button onClick={handleScript} disabled={loading}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 flex items-center justify-center gap-2">
                {loading && loadingStep === 'script' ? (
                  <><RefreshCw size={14} className="animate-spin" /> Génération...</>
                ) : (
                  <><Edit3 size={14} /> Générer le script <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SCRIPT */}
        {step === 2 && script && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black">Script généré</h2>
              <p className="text-slate-500 text-sm">Modifiez librement avant finalisation</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              {script.sections?.map((section, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                    <p className="text-xs font-black text-pink-400 uppercase tracking-wider">{section.title}</p>
                  </div>
                  {editingScript ? (
                    <textarea value={section.content}
                      onChange={e => setScript(prev => ({ ...prev, sections: prev.sections.map((s, j) => j === i ? { ...s, content: e.target.value } : s) }))}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-pink-500/50" />
                  ) : (
                    <p className="text-sm text-slate-300 bg-white/3 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                  )}
                </div>
              ))}
              {script.music && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-lg">🎵</span>
                  <div>
                    <p className="text-xs font-black text-orange-400">Musique suggérée</p>
                    <p className="text-sm text-slate-300">{script.music}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-shrink-0 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm"><ChevronLeft size={14} /></button>
              <button onClick={() => setEditingScript(e => !e)}
                className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 border transition-all ${editingScript ? 'border-pink-500/50 bg-pink-500/15 text-pink-300' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <Edit3 size={14} /> {editingScript ? 'Terminer' : 'Éditer'}
              </button>
              <button onClick={handleFinalise} disabled={loading}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 flex items-center justify-center gap-2">
                {loading && loadingStep === 'finalise' ? (
                  <><RefreshCw size={14} className="animate-spin" /> Finalisation...</>
                ) : (
                  <><Sparkles size={14} /> Finaliser le post <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FINAL POST + VISUAL */}
        {step === 3 && finalPost && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black">Post final</h2>
                <p className="text-slate-500 text-sm mt-1">Prêt à publier sur {platform?.label}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{platform?.icon}</span>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{platform?.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingPost(e => !e)}
                      className={`p-2 rounded-lg border text-xs transition-all ${editingPost ? 'border-pink-500/50 bg-pink-500/15 text-pink-300' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <Edit3 size={12} />
                    </button>
                    <button onClick={copyPost} className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 rounded-lg text-xs font-black">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copié!' : 'Copier'}
                    </button>
                  </div>
                </div>
                {editingPost ? (
                  <textarea value={finalPost} onChange={e => setFinalPost(e.target.value)} rows={10}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-pink-500/50" />
                ) : (
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{finalPost}</p>
                )}
                {hashtags.length > 0 && (
                  <div className="pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                    {hashtags.map((h, i) => <span key={i} className="text-xs text-blue-400 font-bold">{h}</span>)}
                  </div>
                )}
              </div>
              {schedule.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={11} /> Créneaux recommandés</p>
                  {schedule.map((slot, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <span className="w-8 h-8 bg-orange-500/20 text-orange-400 text-xs font-black rounded-lg flex items-center justify-center">{i + 1}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{slot.day} · {slot.time}</p>
                        <p className="text-xs text-slate-500">{slot.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { setStep(0); setStrategy(null); setScript(null); setFinalPost(null) }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm text-slate-400">
                Nouveau post
              </button>
            </div>

            <VisualEditor
              elements={elements} setElements={setElements}
              bgImage={bgImage} setBgImage={setBgImage}
              bgColor={bgColor} setBgColor={setBgColor}
              selected={selected} setSelected={setSelected}
              dragging={dragging} setDragging={setDragging}
              resizing={resizing} setResizing={setResizing}
              editingElId={editingElId} setEditingElId={setEditingElId}
              editingElText={editingElText} setEditingElText={setEditingElText}
              canvasRef={canvasRef} fileRef={fileRef} bgFileRef={bgFileRef}
              addElement={addElement} deleteEl={deleteEl} updateEl={updateEl}
              handleBgImage={handleBgImage} handleImageInsert={handleImageInsert}
              startElDrag={startElDrag} startElResize={startElResize}
              startElEdit={startElEdit} commitElEdit={commitElEdit}
              handleCanvasMouseDown={handleCanvasMouseDown}
              handleCanvasMouseMove={handleCanvasMouseMove}
              handleCanvasMouseUp={handleCanvasMouseUp}
            />
          </div>
        )}
      </div>
    </main>
  )
}