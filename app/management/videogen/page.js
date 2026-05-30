'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import {
  Upload, Play, Download, RefreshCw,
  Film, ChevronRight, AlertCircle, X,
  Sparkles, Zap, ImagePlus, Wand2,
  CheckCircle, Eye, Layers, Target,
  Camera, Palette, Clock,
} from 'lucide-react'

// ── Remotion dynamic imports ──────────────────────────────────
const Player = dynamic(
  () => import('@remotion/player').then(m => m.Player),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-video bg-black rounded-3xl flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-amber-400 rounded-full animate-spin" />
      </div>
    )
  }
)

const VideoComposition = dynamic(() => import('./remotion/VideoComposition'), { ssr: false })

// ── Config presets ────────────────────────────────────────────
const TONES = [
  { id: 'luxury',    label: 'Luxury',    emoji: '✦', desc: 'Premium, poetic, slow-burn' },
  { id: 'bold',      label: 'Bold',      emoji: '⚡', desc: 'Punchy, direct, high-energy' },
  { id: 'editorial', label: 'Editorial', emoji: '◈', desc: 'Magazine-style, refined' },
  { id: 'viral',     label: 'Viral',     emoji: '🔥', desc: 'Social-first, scroll-stopping' },
]

const ACCENT_COLORS = [
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#ec4899', name: 'Rose' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#f97316', name: 'Orange' },
]

const LOADING_STEPS = [
  { icon: Eye,      label: 'Analysing your product...' },
  { icon: Target,   label: 'Crafting marketing script...' },
  { icon: Camera,   label: 'Sourcing Pexels visuals...' },
  { icon: Layers,   label: 'Building cinematic scenes...' },
  { icon: Sparkles, label: 'Finalising your video...' },
]

// ─────────────────────────────────────────────────────────────
export default function VideoGen() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()
  const dropRef = useRef(null)
  const fileInputRef = useRef(null)

  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64]   = useState(null)
  const [dragging, setDragging]         = useState(false)

  const [tone, setTone]                 = useState('luxury')
  const [accentColor, setAccentColor]   = useState('#f59e0b')
  const [extraContext, setExtraContext]  = useState('')

  const [loading, setLoading]           = useState(false)
  const [loadingStep, setLoadingStep]   = useState(0)
  const [script, setScript]             = useState(null)
  const [error, setError]               = useState('')

  // ── File handling ─────────────────────────────────────────
  const readFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
      setImageBase64(e.target.result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    readFile(e.dataTransfer.files[0])
  }, [])

  const reset = () => {
    setScript(null); setImageFile(null)
    setImagePreview(null); setImageBase64(null); setExtraContext('')
  }

  // ── Generate ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!imageBase64) return
    if (!hasCredits(10)) { router.push('/pricing'); return }

    setLoading(true); setError(''); setScript(null); setLoadingStep(0)

    let step = 0
    const iv = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1)
      setLoadingStep(step)
    }, 2500)

    try {
      const res = await fetch('/api/generer-videogen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, imageMediaType: imageFile?.type || 'image/jpeg', tone, accentColor, extraContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await deductCredits(10)
      setScript(data)
    } catch (err) {
      setError(err.message)
    } finally {
      clearInterval(iv); setLoading(false); setLoadingStep(0)
    }
  }

  const handleDownloadJSON = () => {
    if (!script) return
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `visualgen_${Date.now()}.json`; a.click()
  }

  // Pass BOTH the script scenes AND the product image URL to Remotion
  const VideoComp = useCallback(() => {
    if (!script || !VideoComposition) return null
    return (
      <VideoComposition
        scenes={script.scenes}
        accentColor={script.accentColor}
        productImageUrl={imagePreview}  // ← real product photo floats in scenes
      />
    )
  }, [script, imagePreview])

  if (!allowed) return (
    <div className="min-h-screen bg-[#06080f] flex items-center justify-center flex-col gap-3">
      <Film size={20} className="text-amber-400" />
      <div className="w-5 h-5 border-2 border-white/10 border-t-amber-400 rounded-full animate-spin" />
    </div>
  )

  return (
    <main className="min-h-screen bg-[#06080f] text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[55vw] h-[55vw] rounded-full opacity-[0.035]"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[45vw] h-[45vw] rounded-full opacity-[0.025]"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.012]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
      </div>

      {/* Header */}
      <header className="relative z-30 px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', background: 'rgba(6,8,15,0.85)' }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}>
            <Film size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight">VisualGen</span>
              <span className="text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-full border"
                style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.07)' }}>
                Pro · AI + Pexels
              </span>
            </div>
            <p className="text-[10px] text-white/25 font-medium tracking-wide">Photo → Cinematic Marketing Video</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border"
          style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }}>
          <Zap size={12} fill="currentColor" style={{ color: '#f59e0b' }} />
          <span className="text-xs font-black" style={{ color: '#f59e0b' }}>{credits}</span>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* Error */}
        {error && (
          <div className="mb-8 flex items-center gap-3 px-5 py-4 rounded-2xl border"
            style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError('')} className="ml-auto"><X size={14} className="text-red-400" /></button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(6,8,15,0.95)', backdropFilter: 'blur(20px)' }}>
            <div className="flex flex-col items-center gap-8 text-center max-w-sm">
              {/* Animated rings */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-amber-400/10 animate-ping" style={{ animationDelay: '0.3s' }} />
                <div className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '2px solid rgba(245,158,11,0.3)' }}>
                  <Film size={32} style={{ color: '#f59e0b' }} />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3 w-full">
                {LOADING_STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500"
                    style={{
                      background: i === loadingStep ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
                      border: i === loadingStep ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                      opacity: i > loadingStep ? 0.3 : 1,
                    }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: i < loadingStep ? '#10b981' : i === loadingStep ? '#f59e0b' : 'rgba(255,255,255,0.05)' }}>
                      {i < loadingStep ? (
                        <CheckCircle size={12} className="text-white" />
                      ) : i === loadingStep ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                      )}
                    </div>
                    <span className="text-xs font-medium" style={{ color: i === loadingStep ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-white/25">Claude · Pexels · Remotion working together...</p>
            </div>
          </div>
        )}

        {!script ? (
          /* ── UPLOAD VIEW ── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

            {/* LEFT */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-black tracking-tight leading-[1.05]">
                  Your product photo.<br />
                  <span style={{ background: 'linear-gradient(90deg, #f59e0b 0%, #ec4899 60%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    A cinematic reel.
                  </span>
                </h1>
                <p className="text-white/35 text-sm font-medium mt-3">
                  AI reads your product → writes the script → pulls stunning Pexels backgrounds → Remotion animates everything.
                </p>
              </div>

              {/* Drop zone */}
              <div
                ref={dropRef}
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onClick={() => !imagePreview && fileInputRef.current?.click()}
                className="relative rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer"
                style={{
                  border: dragging ? '2px solid rgba(245,158,11,0.9)' : imagePreview ? '2px solid rgba(255,255,255,0.07)' : '2px dashed rgba(255,255,255,0.1)',
                  background: dragging ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)',
                  minHeight: imagePreview ? 'auto' : '300px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => readFile(e.target.files[0])} />

                {imagePreview ? (
                  <div className="relative w-full">
                    <img src={imagePreview} alt="Product"
                      className="w-full object-contain rounded-3xl"
                      style={{ maxHeight: '400px' }} />
                    <div className="absolute inset-0 rounded-3xl flex items-end p-5"
                      style={{ background: 'linear-gradient(to top, rgba(6,8,15,0.85) 0%, transparent 45%)' }}>
                      <div className="flex gap-3 w-full">
                        <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold"
                          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
                          <ImagePlus size={13} /> Change photo
                        </button>
                        <button onClick={e => { e.stopPropagation(); reset() }}
                          className="px-4 py-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981' }}>
                      <CheckCircle size={10} /> Ready · AI will analyze
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6 p-14 text-center">
                    <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Upload size={28} style={{ color: 'rgba(255,255,255,0.18)' }} />
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}>
                        <Sparkles size={11} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/55 mb-1">Drop your product photo</p>
                      <p className="text-xs text-white/22">or click to browse · JPG, PNG, WEBP</p>
                    </div>
                    {/* Tech stack chips */}
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                      {[
                        { c: '#f59e0b', t: 'Claude Vision' },
                        { c: '#06b6d4', t: 'Pexels Cinematic BG' },
                        { c: '#8b5cf6', t: 'Remotion Animations' },
                      ].map(({ c, t }) => (
                        <div key={t} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold"
                          style={{ background: `${c}12`, border: `1px solid ${c}30`, color: c }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Context input */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/28 mb-2">
                  Add context (optional)
                </label>
                <input
                  value={extraContext}
                  onChange={e => setExtraContext(e.target.value)}
                  placeholder="e.g. 'Luxury fragrance for confident African women 25–40, emphasize femininity and longevity'"
                  className="w-full px-5 py-3.5 rounded-2xl text-sm text-white placeholder-white/18 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.35)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                />
              </div>
            </div>

            {/* RIGHT — options */}
            <div className="space-y-6">

              {/* Tone */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/28 mb-3">
                  Video Tone
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => setTone(t.id)}
                      className="text-left p-4 rounded-2xl transition-all duration-200"
                      style={{
                        background: tone === t.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.025)',
                        border: tone === t.id ? '1px solid rgba(245,158,11,0.45)' : '1px solid rgba(255,255,255,0.06)',
                      }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{t.emoji}</span>
                        <span className="text-xs font-black" style={{ color: tone === t.id ? '#f59e0b' : 'rgba(255,255,255,0.65)' }}>
                          {t.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/25">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/28 mb-3">
                  Brand Accent
                </label>
                <div className="flex flex-wrap gap-2.5 mb-2">
                  {ACCENT_COLORS.map(c => (
                    <button key={c.hex} onClick={() => setAccentColor(c.hex)}
                      className="w-8 h-8 rounded-full transition-all duration-200"
                      style={{
                        background: c.hex,
                        border: c.hex === '#ffffff' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                        transform: accentColor === c.hex ? 'scale(1.3)' : 'scale(1)',
                        boxShadow: accentColor === c.hex ? `0 0 0 2px #06080f, 0 0 0 4px ${c.hex}` : 'none',
                      }} />
                  ))}
                  <label className="w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer relative overflow-hidden"
                    style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <Palette size={11} className="text-white/25" />
                  </label>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/20"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
                  What you get
                </div>
                <div className="p-4 space-y-2.5">
                  {[
                    { label: 'Claude Vision analysis', val: '⚡ 10 credits', accent: false },
                    { label: 'Pexels cinematic backgrounds', val: 'Free', accent: true },
                    { label: 'Remotion animated preview', val: 'Free', accent: true },
                    { label: 'JSON script export', val: 'Free', accent: true },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between text-xs">
                      <span className="text-white/38">{r.label}</span>
                      <span className="font-bold" style={{ color: r.accent ? '#10b981' : 'rgba(255,255,255,0.55)' }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !imageBase64 || !hasCredits(10)}
                className="w-full py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: !imageBase64 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                  color: !imageBase64 ? 'rgba(255,255,255,0.18)' : 'white',
                  cursor: !imageBase64 ? 'not-allowed' : 'pointer',
                  boxShadow: imageBase64 ? '0 8px 40px rgba(245,158,11,0.3)' : 'none',
                }}>
                {!imageBase64
                  ? <><Upload size={15} /> Upload a photo first</>
                  : <><Wand2 size={17} /> Generate Video · ⚡10 <ChevronRight size={14} /></>
                }
              </button>

              {credits < 10 && (
                <p className="text-center text-xs" style={{ color: '#f59e0b' }}>
                  ⚠ 10 credits required —{' '}
                  <button onClick={() => router.push('/pricing')} className="underline font-black">Get more</button>
                </p>
              )}
            </div>
          </div>

        ) : (
          /* ── RESULT VIEW ── */
          <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={15} style={{ color: '#10b981' }} />
                  <h2 className="text-xl font-black">{script.title}</h2>
                </div>
                <p className="text-sm text-white/35 pl-[23px]">{script.description}</p>
                {script.productAnalysis && (
                  <p className="text-xs text-white/22 pl-[23px] mt-1 max-w-xl">{script.productAnalysis}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={handleDownloadJSON}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Download size={12} /> JSON
                </button>
                <button onClick={reset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <RefreshCw size={12} /> New
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

              {/* Player */}
              <div className="space-y-4">
                <div className="rounded-3xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 32px 100px rgba(0,0,0,0.7)' }}>
                  <Player
                    component={VideoComp}
                    durationInFrames={script.totalFrames || 540}
                    compositionWidth={1280}
                    compositionHeight={720}
                    fps={script.fps || 30}
                    style={{ width: '100%' }}
                    controls
                    autoPlay
                  />
                </div>

                {/* Pills */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    `${script.scenes?.length} scenes`,
                    `${Math.round((script.totalFrames || 540) / (script.fps || 30))}s`,
                    `${script.fps || 30}fps`,
                    '1280×720',
                    'Pexels backgrounds',
                    'Product overlay',
                  ].map(tag => (
                    <span key={tag} className="text-[10px] font-bold px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Export note */}
                <div className="p-4 rounded-2xl text-xs"
                  style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', color: 'rgba(245,158,11,0.75)' }}>
                  <span className="font-black">Export to MP4:</span> Download JSON → Remotion Studio → <code className="font-mono text-[11px]">npx remotion render</code>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">

                {/* Source photo */}
                {imagePreview && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                    <img src={imagePreview} alt="Source" className="w-full object-cover" style={{ maxHeight: '160px' }} />
                    <div className="px-3 py-2 text-[10px] text-white/25"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      Source · floating in all scenes
                    </div>
                  </div>
                )}

                {/* Scene breakdown */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/22"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    Scenes
                  </div>
                  {script.scenes?.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < script.scenes.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                      <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-black"
                        style={{ background: `${s.accent || accentColor}18`, color: s.accent || accentColor, border: `1px solid ${s.accent || accentColor}30` }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white/65 truncate">{s.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] capitalize text-white/22">{s.type}</span>
                          {s.pexelsUrl && (
                            <span className="text-[9px] text-cyan-400/50">· pexels ✓</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-white/18 shrink-0">3s</span>
                    </div>
                  ))}
                </div>

                {/* Pexels credit */}
                <p className="text-[9px] text-white/15 text-center">
                  Backgrounds from Pexels · used under Pexels License
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}