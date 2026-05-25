'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import {
  Upload, Download, RefreshCw, X, Sparkles, Zap,
  ChevronRight, CheckCircle, Wand2, Play,
  Smartphone, Monitor, ImagePlus, Plus, Trash2,
  Film, Layers, Eye, Aperture,
} from 'lucide-react'

// ── Remotion Player (SSR off) ─────────────────────────────────
const Player = dynamic(
  () => import('@remotion/player').then(m => m.Player),
  {
    ssr: false,
    loading: () => (
      <div style={{ width:'100%', aspectRatio:'9/16', background:'#080010', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:28, height:28, border:'2px solid rgba(255,255,255,0.08)', borderTop:'2px solid #a78bfa', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      </div>
    )
  }
)

const StoryComposition = dynamic(() => import('../remotion/StoryComposition'), { ssr: false })

// ─────────────────────────────────────────────────────────────
// MOTION MODELS — each has a unique cinematic personality
// ─────────────────────────────────────────────────────────────
const MOTION_MODELS = [
  {
    id:      'cinematic',
    label:   'Cinematic',
    icon:    '🎬',
    desc:    'Film-grade zoom, depth of field blur, letterbox bars',
    palette: ['#0a0a0f', '#1a0a2e', '#c9a84c'],
    best:    'Products · Portraits · Travel',
  },
  {
    id:      'editorial',
    label:   'Editorial',
    icon:    '📐',
    desc:    'Magazine split, bold typography, ink-stroke transitions',
    palette: ['#0f0f0f', '#1a1a1a', '#e8e0d0'],
    best:    'Fashion · Brands · Lookbooks',
  },
  {
    id:      'neon',
    label:   'Neon Dream',
    icon:    '🌃',
    desc:    'Glitch, chromatic aberration, neon scan lines',
    palette: ['#000510', '#0d001a', '#00f5ff'],
    best:    'Tech · Music · Night life',
  },
  {
    id:      'organic',
    label:   'Organic',
    icon:    '🌿',
    desc:    'Soft particles, botanical overlay, warm golden hour',
    palette: ['#0a0c07', '#1a1f10', '#8fba47'],
    best:    'Nature · Wellness · Food',
  },
  {
    id:      'luxury',
    label:   'Luxury',
    icon:    '✦',
    desc:    'Gold foil reveal, marble texture, slow dissolve',
    palette: ['#05040a', '#0d0a18', '#b8972e'],
    best:    'Jewelry · Real estate · Premium',
  },
  {
    id:      'kinetic',
    label:   'Kinetic',
    icon:    '⚡',
    desc:    'Fast cuts, shake impact, bold color flash',
    palette: ['#020202', '#0a0012', '#ff2d55'],
    best:    'Sports · Energy · Events',
  },
]

const FORMATS = [
  { id: 'story', label: 'Story 9:16', icon: Smartphone, w: 1080, h: 1920, fps: 30, dur: 300, desc: 'Instagram · TikTok · Reels' },
  { id: 'wide',  label: 'Wide 16:9',  icon: Monitor,    w: 1920, h: 1080, fps: 30, dur: 300, desc: 'YouTube · Presentation · LinkedIn' },
]

const DURATIONS = [
  { s: 10, label: '10s', frames: 300 },
  { s: 15, label: '15s', frames: 450 },
  { s: 30, label: '30s', frames: 900 },
]

const LOADING_STEPS = [
  { label: 'Reading your photos...' },
  { label: 'Choosing motion model...' },
  { label: 'Writing scene narrative...' },
  { label: 'Sourcing Pexels ambience...' },
  { label: 'Composing the story...' },
]

// ─────────────────────────────────────────────────────────────
// Photo upload card
// ─────────────────────────────────────────────────────────────
function PhotoCard({ photo, index, onRemove }) {
  return (
    <div style={{ position:'relative', width:80, height:80, borderRadius:14, overflow:'hidden', flexShrink:0, border:'1px solid rgba(255,255,255,0.1)' }}>
      <img src={photo.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7))' }}/>
      <span style={{ position:'absolute', bottom:4, left:0, right:0, textAlign:'center', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.6)' }}>
        {index + 1}
      </span>
      <button onClick={() => onRemove(index)} style={{ position:'absolute', top:4, right:4, width:18, height:18, borderRadius:'50%', background:'rgba(0,0,0,0.7)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', padding:0 }}>
        <X size={10}/>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function StoryMotion() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router   = useRouter()
  const dropRef  = useRef(null)
  const fileRef  = useRef(null)
  const playerContainerRef = useRef(null)

  // Photos — up to 6
  const [photos, setPhotos]             = useState([])   // [{file, preview, base64}]
  const [dragging, setDragging]         = useState(false)

  // Config
  const [description, setDescription]  = useState('')
  const [motionModel, setMotionModel]   = useState('cinematic')
  const [format, setFormat]             = useState('story')
  const [duration, setDuration]         = useState(15)

  // Auto-detect toggle (Claude picks the motion model)
  const [autoModel, setAutoModel]       = useState(true)

  // Generation
  const [loading, setLoading]           = useState(false)
  const [loadingStep, setLoadingStep]   = useState(0)
  const [story, setStory]               = useState(null)
  const [error, setError]               = useState('')

  // Export
  const [exporting, setExporting]       = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const recorderRef    = useRef(null)
  const chunksRef      = useRef([])
  const rafRef         = useRef(null)

  const formatObj   = FORMATS.find(f => f.id === format) || FORMATS[0]
  const durationObj = DURATIONS.find(d => d.s === duration) || DURATIONS[1]
  const modelObj    = MOTION_MODELS.find(m => m.id === motionModel) || MOTION_MODELS[0]

  // ── Photo handling ────────────────────────────────────────
  const readFiles = useCallback((files) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 6 - photos.length)
    arr.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target.result
        setPhotos(prev => prev.length < 6 ? [...prev, {
          file,
          preview: result,
          base64: result.split(',')[1],
          mime: file.type,
        }] : prev)
      }
      reader.readAsDataURL(file)
    })
  }, [photos.length])

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    readFiles(e.dataTransfer.files)
  }, [readFiles])

  const removePhoto = i => setPhotos(p => p.filter((_, j) => j !== i))

  // ── Generate ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (photos.length === 0) return
    if (!hasCredits(12)) { router.push('/pricing'); return }
    setLoading(true); setError(''); setStory(null); setLoadingStep(0)

    let step = 0
    const iv = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1)
      setLoadingStep(step)
    }, 2800)

    try {
      const res = await fetch('/api/storymotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photos.map(p => ({ base64: p.base64, mime: p.mime })),
          description,
          motionModel: autoModel ? 'auto' : motionModel,
          format,
          duration,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await deductCredits(12)
      setStory(data)
    } catch (err) {
      setError(err.message)
    } finally {
      clearInterval(iv)
      setLoading(false)
      setLoadingStep(0)
    }
  }

  // ── Export WebM/MP4 ───────────────────────────────────────
  const handleExport = async () => {
    if (!story || exporting) return
    const mime = ['video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm'
    chunksRef.current = []; setExporting(true); setExportProgress(0)

    await new Promise(r => setTimeout(r, 200))
    const container = playerContainerRef.current
    const canvas    = container?.querySelector('canvas')
    if (!canvas) { setError('Canvas not found — make sure the player is loaded.'); setExporting(false); return }

    let stream
    try { stream = canvas.captureStream(formatObj.fps) }
    catch { setError('captureStream() not supported. Use Chrome/Edge.'); setExporting(false); return }

    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
    recorderRef.current = recorder
    recorder.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      cancelAnimationFrame(rafRef.current)
      const blob = new Blob(chunksRef.current, { type: mime })
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `storymotion_${story.motionModel}_${Date.now()}.webm`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(a.href), 15000)
      setExporting(false); setExportProgress(100)
      setTimeout(() => setExportProgress(0), 2000)
    }

    recorder.start(200)
    const startTime  = performance.now()
    const durationMs = duration * 1000

    try {
      const video = container?.querySelector('video')
      if (video) { video.currentTime = 0; video.play() }
    } catch {}

    const tick = () => {
      const elapsed = performance.now() - startTime
      setExportProgress(Math.min(99, Math.round((elapsed / durationMs) * 100)))
      if (elapsed < durationMs) rafRef.current = requestAnimationFrame(tick)
      else if (recorder.state === 'recording') recorder.stop()
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const handleDownloadJSON = () => {
    if (!story) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' }))
    a.download = `storymotion_${Date.now()}.json`; a.click()
  }

  const reset = () => { setStory(null); setPhotos([]); setDescription('') }

  const StoryComp = useCallback(() => {
    if (!story || !StoryComposition) return null
    return <StoryComposition {...story} photos={photos.map(p => p.preview)} />
  }, [story, photos])

  const aspectRatio = format === 'story' ? '9/16' : '16/9'

  if (!allowed) return (
    <div style={{ minHeight:'100vh', background:'#060010', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <Film size={22} color="#a78bfa"/>
      <div style={{ width:20, height:20, border:'2px solid rgba(255,255,255,0.08)', borderTop:'2px solid #a78bfa', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <main style={{ minHeight:'100vh', background:'#060010', color:'#fff', fontFamily:"'DM Sans',system-ui,sans-serif", position:'relative' }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
        @keyframes ping    { 75%,100%{transform:scale(2);opacity:0} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-thumb { background:rgba(167,139,250,0.2); border-radius:2px }
        textarea::placeholder, input::placeholder { color:rgba(255,255,255,0.18) }
      `}</style>

      {/* ── Cosmic ambient background ── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        {/* Deep purple nebula */}
        <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'70vw', height:'70vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(88,28,220,0.12) 0%, transparent 65%)' }}/>
        <div style={{ position:'absolute', bottom:'-15%', right:'-5%', width:'55vw', height:'55vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 65%)' }}/>
        {/* Star field */}
        {Array.from({length:40}).map((_,i)=>{
          const x=Math.random()*100, y=Math.random()*100, s=Math.random()*1.5+0.5
          return <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:s, height:s, borderRadius:'50%', background:'rgba(255,255,255,0.6)', animation:`pulse ${2+Math.random()*3}s ${Math.random()*2}s infinite` }}/>
        })}
        {/* Grain texture */}
        <div style={{ position:'absolute', inset:0, opacity:0.025, backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat:'repeat' }}/>
      </div>

      {/* ── Header ── */}
      <header style={{ position:'sticky', top:0, zIndex:50, borderBottom:'1px solid rgba(167,139,250,0.1)', backdropFilter:'blur(28px)', background:'rgba(6,0,16,0.85)', padding:'0 32px', height:68, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          {/* Logo mark */}
          <div style={{ position:'relative', width:40, height:40 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:12, background:'linear-gradient(135deg, #7c3aed, #ec4899)', opacity:0.9 }}/>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Aperture size={20} color="white"/>
            </div>
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontWeight:900, fontSize:18, letterSpacing:-0.5, background:'linear-gradient(90deg, #c4b5fd, #f9a8d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                StoryMotion
              </span>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', padding:'3px 8px', borderRadius:99, border:'1px solid rgba(167,139,250,0.3)', background:'rgba(167,139,250,0.08)', color:'#c4b5fd' }}>
                AI · Pro
              </span>
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.22)', letterSpacing:'0.05em' }}>
              Photos → Cinematic Story
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {story && (
            <>
              <button onClick={handleDownloadJSON} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:9, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                <Download size={11}/> JSON
              </button>
              <button onClick={reset} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:9, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                <RefreshCw size={10}/> New
              </button>
            </>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:99, border:'1px solid rgba(167,139,250,0.25)', background:'rgba(167,139,250,0.07)' }}>
            <Zap size={11} fill="currentColor" color="#a78bfa"/>
            <span style={{ fontSize:12, fontWeight:900, color:'#a78bfa' }}>{credits}</span>
          </div>
        </div>
      </header>

      {/* ── Loading overlay ── */}
      {loading && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(6,0,16,0.97)', backdropFilter:'blur(24px)' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:36, maxWidth:360, width:'100%', padding:'0 24px' }}>
            {/* Pulsing aperture */}
            <div style={{ position:'relative', width:88, height:88 }}>
              <div style={{ position:'absolute', inset:-12, borderRadius:'50%', border:'1.5px solid rgba(167,139,250,0.2)', animation:'ping 1.6s ease infinite' }}/>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(124,58,237,0.15)', border:'2px solid rgba(167,139,250,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Aperture size={34} color="#a78bfa" style={{ animation:'spin 3s linear infinite' }}/>
              </div>
            </div>

            <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:10 }}>
              {LOADING_STEPS.map((s, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderRadius:13, transition:'all .4s', background: i===loadingStep ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)', border: i===loadingStep ? '1px solid rgba(167,139,250,0.35)' : '1px solid transparent', opacity: i>loadingStep ? 0.25 : 1 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: i<loadingStep ? '#10b981' : i===loadingStep ? '#7c3aed' : 'rgba(255,255,255,0.05)' }}>
                    {i<loadingStep
                      ? <CheckCircle size={12} color="#fff"/>
                      : i===loadingStep
                        ? <div style={{ width:11, height:11, border:'2px solid rgba(255,255,255,0.25)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                        : <div style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.15)' }}/>
                    }
                  </div>
                  <span style={{ fontSize:13, fontWeight:500, color: i===loadingStep ? '#c4b5fd' : 'rgba(255,255,255,0.35)' }}>{s.label}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.18)', margin:0, letterSpacing:'0.08em' }}>Claude Vision · Pexels · Remotion</p>
          </div>
        </div>
      )}

      <div style={{ position:'relative', zIndex:1, maxWidth:1320, margin:'0 auto', padding:'40px 24px' }}>

        {/* Error */}
        {error && (
          <div style={{ marginBottom:24, display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderRadius:14, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ fontSize:13, color:'#f87171', flex:1 }}>{error}</span>
            <button onClick={()=>setError('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#f87171' }}><X size={14}/></button>
          </div>
        )}

        {!story ? (
          /* ══ INPUT VIEW ══════════════════════════════════════ */
          <div style={{ display:'grid', gridTemplateColumns:'1fr 400px', gap:40, alignItems:'start' }}>

            {/* LEFT — upload + description */}
            <div style={{ display:'flex', flexDirection:'column', gap:28 }}>

              {/* Hero title */}
              <div>
                <h1 style={{ fontSize:44, fontWeight:900, letterSpacing:-2, lineHeight:1.04, margin:'0 0 14px' }}>
                  Your photos.<br/>
                  <span style={{ background:'linear-gradient(110deg, #c4b5fd 0%, #f9a8d4 50%, #a78bfa 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                    A cinematic story.
                  </span>
                </h1>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.32)', margin:0, lineHeight:1.7, maxWidth:520 }}>
                  Upload 1–6 photos, describe the vibe — AI picks the perfect motion model, sources atmospheric backgrounds, and animates a stunning story ready for Instagram, TikTok or Reels.
                </p>
              </div>

              {/* Photo upload zone */}
              <div>
                <label style={{ display:'block', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.25)', marginBottom:10 }}>
                  Photos <span style={{ color:'rgba(255,255,255,0.15)', fontWeight:400 }}>({photos.length}/6)</span>
                </label>

                {/* Uploaded photos strip */}
                {photos.length > 0 && (
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
                    {photos.map((p, i) => <PhotoCard key={i} photo={p} index={i} onRemove={removePhoto}/>)}
                    {photos.length < 6 && (
                      <button onClick={() => fileRef.current?.click()}
                        style={{ width:80, height:80, borderRadius:14, border:'2px dashed rgba(167,139,250,0.25)', background:'rgba(167,139,250,0.04)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, color:'rgba(167,139,250,0.5)', flexShrink:0 }}>
                        <Plus size={18}/>
                        <span style={{ fontSize:9, fontWeight:700 }}>Add</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Drop zone (only shown when empty) */}
                {photos.length === 0 && (
                  <div
                    ref={dropRef}
                    onDrop={onDrop}
                    onDragOver={e=>{e.preventDefault();setDragging(true)}}
                    onDragLeave={()=>setDragging(false)}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      borderRadius:20, padding:'48px 32px',
                      border: dragging ? '2px solid rgba(167,139,250,0.8)' : '2px dashed rgba(167,139,250,0.15)',
                      background: dragging ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.015)',
                      cursor:'pointer', textAlign:'center', transition:'all .2s',
                    }}>
                    <div style={{ position:'relative', width:64, height:64, margin:'0 auto 20px', animation:'float 3s ease-in-out infinite' }}>
                      <div style={{ position:'absolute', inset:0, borderRadius:18, background:'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.2))', border:'1px solid rgba(167,139,250,0.2)' }}/>
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Upload size={26} color="rgba(167,139,250,0.6)"/>
                      </div>
                      <div style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Sparkles size={10} color="#fff"/>
                      </div>
                    </div>
                    <p style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.45)', margin:'0 0 6px' }}>Drop your photos here</p>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.18)', margin:0 }}>or click to browse · Up to 6 photos · JPG PNG WEBP</p>
                    <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20, flexWrap:'wrap' }}>
                      {['Portrait','Product','Travel','Event','Food','Fashion'].map(tag => (
                        <span key={tag} style={{ fontSize:10, padding:'4px 10px', borderRadius:99, background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.15)', color:'rgba(167,139,250,0.6)', fontWeight:600 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" style={{display:'none'}}
                  onChange={e => readFiles(e.target.files)}/>
              </div>

              {/* Description */}
              <div>
                <label style={{ display:'block', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.25)', marginBottom:10 }}>
                  Describe the story
                </label>
                <textarea
                  value={description}
                  onChange={e=>setDescription(e.target.value)}
                  placeholder="e.g. 'Summer rooftop event in Dakar, vibrant energy, golden hour mood — for Instagram story'"
                  rows={4}
                  style={{ width:'100%', padding:'16px 18px', borderRadius:16, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'#fff', fontSize:14, outline:'none', resize:'vertical', lineHeight:1.6, transition:'border-color .2s' }}
                  onFocus={e=>e.target.style.borderColor='rgba(167,139,250,0.4)'}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}
                />
              </div>
            </div>

            {/* RIGHT — config */}
            <div style={{ display:'flex', flexDirection:'column', gap:22, position:'sticky', top:90 }}>

              {/* Format */}
              <div>
                <label style={{ display:'block', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.25)', marginBottom:10 }}>Format</label>
                <div style={{ display:'flex', gap:8 }}>
                  {FORMATS.map(f => {
                    const Icon = f.icon
                    return (
                      <button key={f.id} onClick={()=>setFormat(f.id)}
                        style={{ flex:1, padding:'14px 10px', borderRadius:14, cursor:'pointer', textAlign:'center', background: format===f.id ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.025)', border: format===f.id ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.06)', transition:'all .15s' }}>
                        <Icon size={18} color={format===f.id ? '#a78bfa' : 'rgba(255,255,255,0.3)'} style={{margin:'0 auto 6px'}}/>
                        <div style={{ fontSize:11, fontWeight:800, color: format===f.id ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}>{f.label}</div>
                        <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)', marginTop:3 }}>{f.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label style={{ display:'block', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.25)', marginBottom:10 }}>Duration</label>
                <div style={{ display:'flex', gap:8 }}>
                  {DURATIONS.map(d => (
                    <button key={d.s} onClick={()=>setDuration(d.s)}
                      style={{ flex:1, padding:'11px 8px', borderRadius:12, cursor:'pointer', fontWeight:800, fontSize:12, textAlign:'center', background: duration===d.s ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.025)', border: duration===d.s ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.06)', color: duration===d.s ? '#a78bfa' : 'rgba(255,255,255,0.4)', transition:'all .15s' }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motion Model */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <label style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.25)' }}>Motion Model</label>
                  {/* Auto toggle */}
                  <button onClick={()=>setAutoModel(a=>!a)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:99, cursor:'pointer', fontSize:10, fontWeight:700, background: autoModel ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', border: autoModel ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.08)', color: autoModel ? '#a78bfa' : 'rgba(255,255,255,0.35)' }}>
                    <Sparkles size={9}/> {autoModel ? 'AI Auto' : 'Manual'}
                  </button>
                </div>

                {autoModel ? (
                  <div style={{ padding:'14px 16px', borderRadius:14, background:'rgba(124,58,237,0.07)', border:'1px solid rgba(167,139,250,0.2)', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Sparkles size={16} color="#fff"/>
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:800, color:'#c4b5fd' }}>Claude picks the model</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)', marginTop:2, lineHeight:1.5 }}>Analyses photos + description → selects the most fitting cinematic style</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {MOTION_MODELS.map(m => (
                      <button key={m.id} onClick={()=>setMotionModel(m.id)}
                        style={{ padding:'12px', borderRadius:13, cursor:'pointer', textAlign:'left', background: motionModel===m.id ? `${m.palette[2]}12` : 'rgba(255,255,255,0.025)', border: motionModel===m.id ? `1px solid ${m.palette[2]}50` : '1px solid rgba(255,255,255,0.06)', transition:'all .15s' }}>
                        <div style={{ fontSize:16, marginBottom:5 }}>{m.icon}</div>
                        <div style={{ fontSize:11, fontWeight:800, color: motionModel===m.id ? m.palette[2] : 'rgba(255,255,255,0.6)', marginBottom:3 }}>{m.label}</div>
                        <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)', lineHeight:1.4 }}>{m.desc}</div>
                        <div style={{ marginTop:5, display:'flex', gap:3 }}>
                          {m.palette.map((c,i) => <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c, border:'1px solid rgba(255,255,255,0.1)' }}/>)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}/>

              {/* Cost */}
              <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ padding:'8px 14px', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.2)', borderBottom:'1px solid rgba(255,255,255,0.04)', background:'rgba(255,255,255,0.02)' }}>Included</div>
                <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    ['Claude Vision (up to 6 photos)', '⚡ 12 credits', false],
                    ['AI motion model selection',      'Free', true],
                    ['Pexels ambient backgrounds',     'Free', true],
                    ['Remotion animated story',        'Free', true],
                    ['WebM/MP4 browser export',        'Free', true],
                  ].map(([label, val, green]) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                      <span style={{ color:'rgba(255,255,255,0.35)' }}>{label}</span>
                      <span style={{ fontWeight:700, color: green ? '#10b981' : 'rgba(255,255,255,0.55)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate CTA */}
              <button
                onClick={handleGenerate}
                disabled={loading || photos.length === 0 || !hasCredits(12)}
                style={{
                  width:'100%', padding:'18px', borderRadius:16, border:'none',
                  fontWeight:900, fontSize:14, cursor: photos.length===0 ? 'not-allowed' : 'pointer',
                  background: photos.length===0
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  color: photos.length===0 ? 'rgba(255,255,255,0.2)' : '#fff',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  boxShadow: photos.length>0 ? '0 10px 40px rgba(124,58,237,0.4)' : 'none',
                  transition:'all .2s',
                }}>
                {photos.length === 0
                  ? <><ImagePlus size={16}/> Upload photos first</>
                  : <><Wand2 size={17}/> Create Story · ⚡12 <ChevronRight size={14}/></>
                }
              </button>

              {credits < 12 && (
                <p style={{ textAlign:'center', fontSize:12, color:'#a78bfa', margin:0 }}>
                  ⚠ 12 credits needed —{' '}
                  <button onClick={()=>router.push('/pricing')} style={{ background:'none', border:'none', cursor:'pointer', color:'#a78bfa', fontWeight:800, textDecoration:'underline', padding:0, fontSize:12 }}>
                    Get more
                  </button>
                </p>
              )}
            </div>
          </div>

        ) : (
          /* ══ RESULT VIEW ═════════════════════════════════════ */
          <div style={{ display:'grid', gridTemplateColumns: format==='story' ? '380px 1fr' : '1fr 320px', gap:32, alignItems:'start' }}>

            {/* Player column */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Story meta */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <CheckCircle size={16} color="#10b981"/>
                <h2 style={{ fontSize:20, fontWeight:900, margin:0, letterSpacing:-0.5 }}>{story.title}</h2>
              </div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', margin:'0 0 8px', lineHeight:1.6 }}>{story.logline}</p>

              {/* Motion model badge */}
              {story.motionModel && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:99, background:`rgba(124,58,237,0.12)`, border:'1px solid rgba(167,139,250,0.3)', marginBottom:8, width:'fit-content' }}>
                  <span style={{ fontSize:14 }}>{MOTION_MODELS.find(m=>m.id===story.motionModel)?.icon || '🎬'}</span>
                  <span style={{ fontSize:11, fontWeight:800, color:'#c4b5fd' }}>
                    {MOTION_MODELS.find(m=>m.id===story.motionModel)?.label || story.motionModel} model
                  </span>
                  {autoModel && <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)' }}>· AI selected</span>}
                </div>
              )}

              {/* Remotion Player */}
              <div ref={playerContainerRef}
                style={{ borderRadius:20, overflow:'hidden', border:'1px solid rgba(167,139,250,0.15)', boxShadow:'0 32px 80px rgba(0,0,0,0.8)', background:'#000' }}>
                <Player
                  component={StoryComp}
                  durationInFrames={story.totalFrames || durationObj.frames}
                  compositionWidth={formatObj.w}
                  compositionHeight={formatObj.h}
                  fps={formatObj.fps}
                  style={{ width:'100%', aspectRatio }}
                  controls autoPlay
                />
              </div>

              {/* Pills */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {[
                  `${story.scenes?.length} scenes`,
                  `${duration}s`,
                  format === 'story' ? '9:16 Story' : '16:9 Wide',
                  `${formatObj.w}×${formatObj.h}`,
                  'Pexels BG',
                ].map(tag => (
                  <span key={tag} style={{ fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:99, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.32)' }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Export block */}
              <div style={{ padding:18, borderRadius:18, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Download size={13} color="#a78bfa"/>
                  <span style={{ fontSize:12, fontWeight:800, color:'rgba(255,255,255,0.6)' }}>Export story</span>
                </div>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', margin:0, lineHeight:1.6 }}>
                  Press Export — the player records itself in real time. Keep this tab in focus during the {duration}s capture.
                </p>

                <button onClick={handleExport} disabled={exporting}
                  style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', fontWeight:800, fontSize:13, cursor: exporting ? 'not-allowed' : 'pointer', background: exporting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#7c3aed,#ec4899)', color: exporting ? 'rgba(255,255,255,0.3)' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow: exporting ? 'none' : '0 6px 24px rgba(124,58,237,0.35)' }}>
                  {exporting
                    ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.2)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Recording... {exportProgress}%</>
                    : <><Download size={15}/> Export WebM</>
                  }
                </button>

                {exporting && (
                  <div style={{ height:3, borderRadius:99, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, width:`${exportProgress}%`, background:'linear-gradient(90deg,#7c3aed,#ec4899)', transition:'width .3s ease' }}/>
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Source photos */}
              <div style={{ borderRadius:16, overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ padding:'10px 14px', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.2)', borderBottom:'1px solid rgba(255,255,255,0.04)', background:'rgba(255,255,255,0.02)' }}>
                  Source photos
                </div>
                <div style={{ padding:12, display:'flex', gap:8, flexWrap:'wrap' }}>
                  {photos.map((p,i) => (
                    <img key={i} src={p.preview} alt="" style={{ width:60, height:60, objectFit:'cover', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)' }}/>
                  ))}
                </div>
              </div>

              {/* Scene breakdown */}
              <div style={{ borderRadius:16, overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ padding:'10px 14px', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.2)', borderBottom:'1px solid rgba(255,255,255,0.04)', background:'rgba(255,255,255,0.02)' }}>
                  Scene breakdown
                </div>
                {(story.scenes||[]).map((s,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom: i<story.scenes.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ width:28, height:28, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, background:`${s.accent||'#7c3aed'}18`, border:`1px solid ${s.accent||'#7c3aed'}30`, color:s.accent||'#a78bfa' }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.65)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.title}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                        <span style={{ fontSize:9, color:'rgba(255,255,255,0.22)', textTransform:'capitalize' }}>{s.motion}</span>
                        {s.pexelsUrl && <span style={{ fontSize:9, color:'rgba(6,182,212,0.6)' }}>· pexels ✓</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:9, fontFamily:'monospace', color:'rgba(255,255,255,0.18)', flexShrink:0 }}>{Math.round((s.durationFrames||90)/30)}s</span>
                  </div>
                ))}
              </div>

              {/* AI reasoning */}
              {story.modelReason && (
                <div style={{ padding:16, borderRadius:14, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(167,139,250,0.15)' }}>
                  <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(167,139,250,0.5)', marginBottom:8 }}>Why this model</div>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.38)', margin:0, lineHeight:1.7 }}>{story.modelReason}</p>
                </div>
              )}

              <p style={{ fontSize:9, color:'rgba(255,255,255,0.12)', textAlign:'center' }}>Backgrounds from Pexels · Pexels License</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
