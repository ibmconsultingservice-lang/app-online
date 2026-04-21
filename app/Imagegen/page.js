'use client'

import { useState } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap, Sparkles, Download, RefreshCw, ImageIcon, Wand2 } from 'lucide-react'

const STYLES = [
  { id: 'photorealistic', label: 'Photo', icon: '📷' },
  { id: 'digital art', label: 'Digital Art', icon: '🎨' },
  { id: 'oil painting', label: 'Peinture', icon: '🖼️' },
  { id: 'cinematic', label: 'Cinéma', icon: '🎬' },
  { id: 'anime', label: 'Anime', icon: '✨' },
  { id: 'watercolor', label: 'Aquarelle', icon: '💧' },
]

const SIZES = [
  { id: '512x512', label: '1:1', w: 512, h: 512 },
  { id: '768x512', label: '3:2', w: 768, h: 512 },
  { id: '512x768', label: '2:3', w: 512, h: 768 },
]

const SUGGESTIONS = [
  "Portrait professionnel d'un entrepreneur en costume, lumière cinématique dorée",
  "Logo minimaliste moderne pour startup tech, fond blanc, bleu et noir",
  "Bannière LinkedIn pour consultant en management, style corporate élégant",
  "Illustration vectorielle d'une ville africaine futuriste au coucher du soleil",
  "Photo produit d'un smartphone premium sur marbre blanc avec reflets",
]

export default function ImageGen() {
  const allowed = usePlanGuard('premium')
  const { credits } = useCredits()
  const router = useRouter()

  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('photorealistic')
  const [size, setSize] = useState('512x512')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState([])
  const [error, setError] = useState(null)
  const [count, setCount] = useState(1)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/generer-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, size, count }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setImages(prev => [...data.images, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (url, index) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `imagegen-${Date.now()}-${index}.png`
    a.click()
  }

  // ── Loading screen ──
  if (!allowed) return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white" />
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white font-sans">

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0f]/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <span className="font-black tracking-tight text-lg">ImageGen</span>
          <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">AI</span>
        </div>
        {/* Credits badge */}
        <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-500/20 rounded-full px-3 py-1.5">
          <Zap size={12} className="text-indigo-400" fill="currentColor" />
          <span className="text-xs font-black text-indigo-300">{credits}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col xl:flex-row gap-8">

        {/* ── Left Panel ── */}
        <div className="w-full xl:w-[380px] flex-shrink-0 space-y-5">

          {/* Prompt */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Wand2 size={12} /> Décrivez votre image
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Un portrait professionnel élégant, lumière dorée, style cinématique..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
            />
            {/* Suggestions */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Suggestions</p>
              {SUGGESTIONS.slice(0, 3).map((s, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(s)}
                  className="w-full text-left text-xs text-slate-500 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg px-3 py-2 transition-all border border-transparent hover:border-violet-500/20 truncate"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Style</label>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-bold transition-all ${
                    style === s.id
                      ? 'bg-violet-600/30 border-violet-500/60 text-violet-200'
                      : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                  }`}
                >
                  <span className="text-lg">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size + Count */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Format</label>
              <div className="flex gap-2">
                {SIZES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSize(s.id)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      size === s.id
                        ? 'bg-violet-600/30 border-violet-500/60 text-violet-200'
                        : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                Nombre d'images : <span className="text-violet-400">{count}</span>
              </label>
              <input
                type="range" min={1} max={4} step={1} value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Générer {count > 1 ? `${count} images` : "l'image"}
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-bold">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* ── Right Panel — Gallery ── */}
        <div className="flex-1 min-h-[600px]">
          {images.length === 0 && !loading ? (
            <div className="h-full min-h-[500px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-700">
              <ImageIcon size={48} strokeWidth={1} />
              <p className="font-bold text-sm">Vos images générées apparaîtront ici</p>
              <p className="text-xs">Entrez un prompt et cliquez sur Générer</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {loading && Array.from({ length: count }).map((_, i) => (
                <div key={`skeleton-${i}`} className="break-inside-avoid rounded-2xl overflow-hidden bg-white/5 border border-white/10 animate-pulse aspect-square" />
              ))}
              {images.map((img, i) => (
                <div key={i} className="break-inside-avoid group relative rounded-2xl overflow-hidden border border-white/10 hover:border-violet-500/40 transition-all">
                  <img src={img.url} alt={`Generated ${i}`} className="w-full h-auto block" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-between p-4">
                    <p className="text-xs text-white/70 line-clamp-2 flex-1 mr-2">{img.prompt}</p>
                    <button
                      onClick={() => handleDownload(img.url, i)}
                      className="flex-shrink-0 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-violet-600 transition-all"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}