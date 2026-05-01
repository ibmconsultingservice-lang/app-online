'use client'

import { useState, useRef } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap, Upload, Wand2, RefreshCw, Download, ImageIcon, Trash2 } from 'lucide-react'

const MODES = [
  { id: 'art', label: 'Transformer en Art', icon: '🎨', desc: 'Style artistique, peinture, illustration' },
  { id: 'professional', label: 'Design Pro', icon: '💼', desc: 'Photo professionnelle, corporate' },
  { id: 'remove-bg', label: 'Supprimer Fond', icon: '✂️', desc: 'Fond transparent ou personnalisé' },
  { id: 'custom-bg', label: 'Fond Personnalisé', icon: '🖼️', desc: 'Remplacer le fond par un prompt' },
]

const ART_STYLES = [
  { id: 'oil painting, renaissance style', label: 'Renaissance' },
  { id: 'watercolor illustration, soft', label: 'Aquarelle' },
  { id: 'anime style, vibrant', label: 'Anime' },
  { id: 'pencil sketch, detailed', label: 'Croquis' },
  { id: 'neon cyberpunk art', label: 'Cyberpunk' },
  { id: 'minimalist flat design', label: 'Minimaliste' },
]

export default function CaptureGen() {
  const allowed = usePlanGuard('free')  // ← changed to pro
  const { credits } = useCredits()
  const router = useRouter()

  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [mode, setMode] = useState('art')
  const [artStyle, setArtStyle] = useState('oil painting, renaissance style')
  const [bgPrompt, setBgPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImage(file)
    setResult(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleTransform = async () => {
    if (!image) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('mode', mode)
      formData.append('artStyle', artStyle)
      formData.append('bgPrompt', bgPrompt)

      const res = await fetch('/api/generer-Capture', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setResult(data.imageUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result
    a.download = `capture-${mode}-${Date.now()}.png`
    a.click()
  }

  const reset = () => {
    setImage(null)
    setImagePreview(null)
    setResult(null)
    setError(null)
  }

  // ── Loading screen while plan is verified ──
  if (!allowed) return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white" />
      </div>
      <div className="w-6 h-6 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#080c14] text-white font-sans">

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#080c14]/90 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center">
            <Wand2 size={16} />
          </div>
          <span className="font-black tracking-tight text-lg">CaptureAI</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">Studio</span>
        </div>
        {/* ── Credits badge ── */}
        <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/20 rounded-full px-3 py-1.5">
          <Zap size={12} className="text-emerald-400" fill="currentColor" />
          <span className="text-xs font-black text-emerald-300">{credits}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col xl:flex-row gap-8">

        {/* ── Left Panel ── */}
        <div className="w-full xl:w-[400px] flex-shrink-0 space-y-5">

          {/* Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !imagePreview && fileRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
              ${dragging ? 'border-emerald-400 bg-emerald-500/10' : imagePreview ? 'border-white/10 cursor-default' : 'border-white/10 hover:border-emerald-500/50 hover:bg-white/5'}
            `}
          >
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={(e) => { e.stopPropagation(); reset() }}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-red-500/80 transition-all"
                >
                  <Trash2 size={14} />
                </button>
                <div className="absolute bottom-3 left-3 text-xs font-bold text-white/70">
                  {image?.name}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <Upload size={24} className="text-slate-500" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm text-slate-300">Glissez votre image ici</p>
                  <p className="text-xs text-slate-600 mt-1">ou cliquez pour parcourir</p>
                  <p className="text-[10px] text-slate-700 mt-2 uppercase tracking-widest">JPG, PNG, WEBP</p>
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => handleFile(e.target.files[0])} />

          {/* Mode Selection */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Mode de transformation</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                    mode === m.id
                      ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-200'
                      : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-xs font-black">{m.label}</span>
                  <span className="text-[10px] opacity-60 leading-tight">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Options */}
          {mode === 'art' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Style artistique</label>
              <div className="grid grid-cols-3 gap-2">
                {ART_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setArtStyle(s.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      artStyle === s.id
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-200'
                        : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'custom-bg' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Décrivez le fond souhaité</label>
              <textarea
                value={bgPrompt}
                onChange={e => setBgPrompt(e.target.value)}
                placeholder="Ex: plage tropicale au coucher du soleil, bureau moderne minimaliste, forêt enchantée..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          )}

          {mode === 'professional' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Description supplémentaire</label>
              <textarea
                value={bgPrompt}
                onChange={e => setBgPrompt(e.target.value)}
                placeholder="Ex: portrait LinkedIn professionnel, photo CV corporate, fond neutre gris..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          )}

          {/* Transform Button */}
          <button
            onClick={handleTransform}
            disabled={loading || !image}
            className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-900/40 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Transformation en cours...
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Transformer l'image
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-bold">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* ── Right Panel — Result ── */}
        <div className="flex-1 min-h-[600px]">
          {!result && !loading ? (
            <div className="h-full min-h-[500px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-700">
              <ImageIcon size={48} strokeWidth={1} />
              <p className="font-bold text-sm">Votre image transformée apparaîtra ici</p>
              <p className="text-xs">Importez une image et choisissez un mode</p>
            </div>
          ) : loading ? (
            <div className="h-full min-h-[500px] border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-2 border-white/5 rounded-full" />
                <div className="absolute inset-0 w-20 h-20 border-2 border-t-emerald-400 border-r-cyan-400 rounded-full animate-spin" />
                <div className="absolute inset-3 w-14 h-14 border-2 border-t-emerald-600/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div className="text-center">
                <p className="font-black text-sm text-slate-300">Transformation en cours...</p>
                <p className="text-xs text-slate-600 mt-1">L'IA analyse et transforme votre image</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-4">
              <div className="relative flex-1 bg-[#0d1117] rounded-3xl overflow-hidden border border-white/10 min-h-[400px]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '20px 20px' }}
              >
                <img
                  src={result}
                  alt="Résultat"
                  className="w-full h-full object-contain p-4"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">
                    Résultat
                  </span>
                </div>
              </div>

              {imagePreview && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img src={imagePreview} alt="Original" className="w-full h-32 object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-center text-[10px] font-black uppercase tracking-widest py-1.5 text-slate-400">
                      Original
                    </div>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-emerald-500/30">
                    <img src={result} alt="Transformé" className="w-full h-32 object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-emerald-900/60 text-center text-[10px] font-black uppercase tracking-widest py-1.5 text-emerald-300">
                      Transformé
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Télécharger
                </button>
                <button
                  onClick={() => { setResult(null); setError(null) }}
                  className="py-3 px-5 rounded-xl font-black text-sm border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}