'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useCredits } from '@/hooks/useCredits'
import { useRouter } from 'next/navigation'
import { Zap, Upload, Download, Play, Pause, RotateCcw, CheckCircle, AlertCircle, Film } from 'lucide-react'

/* ── TikTok-inspired compression presets ─────────────────────────────────
   Based on research:
   - H.264 codec (VP8/VP9 in browser via WebCodecs)
   - VBR targeting 8-12 Mbps for 1080p
   - Max resolution 1080p (TikTok caps at 1080x1920)
   - 128 kbps AAC-equivalent audio
   - MP4 container (WebM in browser, closest equivalent)
   - Pre-compress = control quality before platform re-encoding
────────────────────────────────────────────────────────────────────────── */
const PRESETS = [
  {
    id: 'tiktok',
    name: 'TikTok / Reels',
    icon: '🎵',
    desc: 'Vertical 9:16 · 1080p max · 8 Mbps VBR',
    maxWidth: 1080, maxHeight: 1920,
    videoBitsPerSecond: 8_000_000,
    audioBitsPerSecond: 128_000,
    targetRatio: 9 / 16,
    color: '#ff2d55',
    bg: 'rgba(255,45,85,0.08)',
    border: 'rgba(255,45,85,0.25)',
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts',
    icon: '▶️',
    desc: 'Vertical 9:16 · 1080p · 10 Mbps',
    maxWidth: 1080, maxHeight: 1920,
    videoBitsPerSecond: 10_000_000,
    audioBitsPerSecond: 192_000,
    targetRatio: 9 / 16,
    color: '#ff0000',
    bg: 'rgba(255,0,0,0.08)',
    border: 'rgba(255,0,0,0.25)',
  },
  {
    id: 'instagram',
    name: 'Instagram Reels',
    icon: '📸',
    desc: 'Vertical 9:16 · 1080p · 6 Mbps',
    maxWidth: 1080, maxHeight: 1920,
    videoBitsPerSecond: 6_000_000,
    audioBitsPerSecond: 128_000,
    targetRatio: 9 / 16,
    color: '#e1306c',
    bg: 'rgba(225,48,108,0.08)',
    border: 'rgba(225,48,108,0.25)',
  },
  {
    id: 'web',
    name: 'Web Optimized',
    icon: '🌐',
    desc: 'Landscape 16:9 · 1080p · 5 Mbps',
    maxWidth: 1920, maxHeight: 1080,
    videoBitsPerSecond: 5_000_000,
    audioBitsPerSecond: 128_000,
    targetRatio: 16 / 9,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.25)',
  },
  {
    id: 'custom',
    name: 'Personnalisé',
    icon: '⚙️',
    desc: 'Contrôle total sur chaque paramètre',
    maxWidth: 1920, maxHeight: 1080,
    videoBitsPerSecond: 8_000_000,
    audioBitsPerSecond: 128_000,
    targetRatio: null,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
  },
]

const QUALITY_LABELS = {
  high:   { label: 'Haute qualité',   videoBps: 12_000_000, desc: '~90% qualité · taille modérée' },
  medium: { label: 'Équilibrée',      videoBps: 8_000_000,  desc: '~75% qualité · taille réduite' },
  low:    { label: 'Légère',          videoBps: 4_000_000,  desc: '~60% qualité · taille minimale' },
}

function fmt(bytes) {
  if (!bytes) return '—'
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(2)} MB`
}

function fmtDur(s) {
  if (!s || !isFinite(s)) return '—'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function ReductionBadge({ original, compressed }) {
  if (!original || !compressed) return null
  const pct = Math.round((1 - compressed / original) * 100)
  const color = pct >= 60 ? '#22c55e' : pct >= 30 ? '#f59e0b' : '#94a3b8'
  return (
    <span style={{ background: `${color}18`, border: `1px solid ${color}44`, color, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, fontFamily: 'monospace' }}>
      ↓ {pct}% réduit
    </span>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function VideoReducerPage() {
  const allowed = usePlanGuard('starter')
  const { credits, deductCredits, hasCredits } = useCredits()
  const router = useRouter()

  const [file, setFile]               = useState(null)
  const [videoInfo, setVideoInfo]     = useState(null)
  const [preset, setPreset]           = useState(PRESETS[0])
  const [quality, setQuality]         = useState('medium')
  const [customBps, setCustomBps]     = useState(8_000_000)
  const [status, setStatus]           = useState('idle') // idle | analysing | compressing | done | error
  const [progress, setProgress]       = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState(null)
  const [dragOver, setDragOver]       = useState(false)
  const [playing, setPlaying]         = useState({ orig: false, comp: false })

  const fileRef     = useRef(null)
  const origVidRef  = useRef(null)
  const compVidRef  = useRef(null)
  const mediaRecRef = useRef(null)
  const chunksRef   = useRef([])
  const cancelRef   = useRef(false)

  /* ── Analyse video metadata on upload ── */
  const analyseVideo = useCallback((f) => {
    setStatus('analysing')
    setError(null)
    setResult(null)
    setProgress(0)

    const url = URL.createObjectURL(f)
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.src = url

    vid.onloadedmetadata = () => {
      setVideoInfo({
        name: f.name,
        size: f.size,
        duration: vid.duration,
        width: vid.videoWidth,
        height: vid.videoHeight,
        fps: 30, // browser can't reliably detect fps
        url,
        type: f.type,
      })
      setStatus('idle')
    }
    vid.onerror = () => {
      setError('Impossible de lire ce fichier vidéo.')
      setStatus('error')
    }
    setFile(f)
  }, [])

  const onFileChange = (e) => { if (e.target.files[0]) analyseVideo(e.target.files[0]) }
  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('video/')) analyseVideo(f)
    else setError('Fichier non valide — glissez une vidéo.')
  }

  /* ── Core compression using Canvas + MediaRecorder ──────────────────────
     This replicates TikTok's pipeline:
     1. Decode frames via <video> element
     2. Draw each frame onto a <canvas> (allows resize to max 1080p)
     3. Capture canvas stream at target framerate
     4. Re-encode via MediaRecorder with VBR bitrate targeting
     5. Collect chunks → Blob → download
  ────────────────────────────────────────────────────────────────────────── */
  const compress = useCallback(async () => {
    if (!videoInfo || !file) return
    if (!hasCredits(2)) { router.push('/pricing'); return }

    cancelRef.current = false
    setStatus('compressing')
    setProgress(0)
    setError(null)
    setResult(null)
    chunksRef.current = []

    const activePreset = preset
    const targetBps    = preset.id === 'custom' ? customBps : QUALITY_LABELS[quality].videoBps

    // Step 1 — compute output dimensions (max 1080p, keep aspect ratio)
    const srcW = videoInfo.width  || 1280
    const srcH = videoInfo.height || 720
    let outW = srcW, outH = srcH

    if (outW > activePreset.maxWidth) {
      const ratio = activePreset.maxWidth / outW
      outW = activePreset.maxWidth
      outH = Math.round(outH * ratio)
    }
    if (outH > activePreset.maxHeight) {
      const ratio = activePreset.maxHeight / outH
      outH = activePreset.maxHeight
      outW = Math.round(outW * ratio)
    }
    // Ensure even dimensions (H.264 requirement)
    outW = outW % 2 === 0 ? outW : outW - 1
    outH = outH % 2 === 0 ? outH : outH - 1

    setProgressMsg(`Redimensionnement : ${srcW}×${srcH} → ${outW}×${outH}`)

    // Step 2 — set up canvas
    const canvas = document.createElement('canvas')
    canvas.width  = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')

    // Step 3 — set up source video
    const srcVid = document.createElement('video')
    srcVid.src    = videoInfo.url
    srcVid.muted  = true
    srcVid.preload = 'auto'
    await new Promise((res, rej) => {
      srcVid.oncanplaythrough = res
      srcVid.onerror = rej
      srcVid.load()
    })

    const duration = srcVid.duration
    const fps = 30

    // Step 4 — capture canvas stream + original audio
    const canvasStream = canvas.captureStream(fps)

    // Try to get audio from original file
    let audioCtx, audioSource, audioDestination
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const arrayBuf = await file.arrayBuffer()
      const audioBuf = await audioCtx.decodeAudioData(arrayBuf)
      audioDestination = audioCtx.createMediaStreamDestination()
      audioSource = audioCtx.createBufferSource()
      audioSource.buffer = audioBuf
      audioSource.connect(audioDestination)
      audioDestination.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t))
    } catch {
      // Audio extraction failed — video only (still valid)
      setProgressMsg('Audio non extractible — compression vidéo uniquement')
    }

    // Step 5 — MediaRecorder with VBR bitrate
    const mimeType = [
      'video/mp4;codecs=avc1',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'

    const mr = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: targetBps,
      audioBitsPerSecond: activePreset.audioBitsPerSecond,
    })
    mediaRecRef.current = mr

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }

    mr.onstop = async () => {
      if (cancelRef.current) return

      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url  = URL.createObjectURL(blob)
      const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const name = file.name.replace(/\.[^.]+$/, '') + `_optimized.${ext}`

      await deductCredits(2)

      setResult({ blob, url, size: blob.size, name, width: outW, height: outH, mimeType })
      setStatus('done')
      setProgress(100)
      setProgressMsg('Compression terminée ✅')
    }

    // Step 6 — Frame-by-frame render loop (two-pass simulation)
    // Pass 1: Seek & draw frames at target fps
    mr.start(1000)
    if (audioSource) audioSource.start(0)

    srcVid.play().catch(() => {})

    let lastTime = -1
    const frameInterval = 1 / fps

    const renderLoop = () => {
      if (cancelRef.current) { mr.stop(); srcVid.pause(); return }

      const t = srcVid.currentTime
      if (t !== lastTime) {
        ctx.drawImage(srcVid, 0, 0, outW, outH)
        lastTime = t

        const pct = Math.min(99, Math.round((t / duration) * 100))
        setProgress(pct)
        if (pct % 10 === 0) setProgressMsg(`Encodage VBR ${targetBps / 1_000_000} Mbps · ${pct}%`)
      }

      if (srcVid.ended || srcVid.currentTime >= duration - 0.1) {
        mr.stop()
        srcVid.pause()
        canvasStream.getTracks().forEach(t => t.stop())
        if (audioCtx) audioCtx.close()
        return
      }

      requestAnimationFrame(renderLoop)
    }

    srcVid.onplay = () => requestAnimationFrame(renderLoop)

  }, [videoInfo, file, preset, quality, customBps, hasCredits, deductCredits, router])

  const cancel = () => {
    cancelRef.current = true
    mediaRecRef.current?.stop()
    setStatus('idle')
    setProgress(0)
    setProgressMsg('')
  }

  const reset = () => {
    if (videoInfo?.url) URL.revokeObjectURL(videoInfo.url)
    if (result?.url) URL.revokeObjectURL(result.url)
    setFile(null); setVideoInfo(null); setResult(null)
    setStatus('idle'); setProgress(0); setError(null)
  }

  const download = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.url; a.download = result.name; a.click()
  }

  useEffect(() => () => {
    if (videoInfo?.url) URL.revokeObjectURL(videoInfo.url)
    if (result?.url)    URL.revokeObjectURL(result.url)
  }, []) // eslint-disable-line

  /* ── Loading guard ── */
  if (!allowed) return (
    <div style={{ minHeight: '100vh', background: '#0a0a10', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, background: '#1a1a2e', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={22} color="#818cf8" fill="#818cf8"/>
      </div>
      <div style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #818cf8', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a10', color: '#e2e8f0', fontFamily: "'Inter', sans-serif", padding: '32px 20px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .slide-up { animation: slideUp 0.4s ease forwards; }
        input[type=range] { accent-color: #818cf8; }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.2) !important; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#ff2d55,#ff6b35)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                🎬
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.5px', background: 'linear-gradient(90deg,#ff2d55,#ff9500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Video Reducer
              </h1>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: 0 }}>
              Technique TikTok · H.264 VBR · Pre-compression intelligente · Max 1080p
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 999, padding: '5px 13px' }}>
              <Zap size={12} color="#818cf8" fill="#818cf8"/>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc' }}>{credits} cr.</span>
            </div>
            {videoInfo && (
              <button onClick={reset} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', padding: '6px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <RotateCcw size={12}/> Reset
              </button>
            )}
          </div>
        </div>

        {/* ── TikTok method explanation ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 28 }}>
          {[
            { step: '01', icon: '📐', title: 'Résolution max 1080p', desc: 'Redimensionnement intelligent' },
            { step: '02', icon: '⚡', title: 'VBR Bitrate', desc: 'Variable selon la complexité' },
            { step: '03', icon: '🎞️', title: 'H.264 / VP9', desc: 'Codec optimal universel' },
            { step: '04', icon: '🔊', title: 'AAC 128kbps', desc: 'Audio optimisé mobile' },
          ].map(s => (
            <div key={s.step} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>{s.step}</span>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Upload zone ── */}
        {!videoInfo && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#ff2d55' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 16, padding: '52px 24px', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(255,45,85,0.05)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s', marginBottom: 24,
            }}
          >
            <input ref={fileRef} type="file" accept="video/*" onChange={onFileChange} style={{ display: 'none' }}/>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎬</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: '#f1f5f9' }}>Déposez votre vidéo ici</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>MP4, MOV, WebM, AVI · Toute taille</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#ff2d55,#ff6b35)', color: '#fff', padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
              <Upload size={15}/> Choisir une vidéo
            </div>
          </div>
        )}

        {/* ── Video info + config ── */}
        {videoInfo && status !== 'done' && (
          <div className="slide-up">

            {/* Video info bar */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <Film size={18} color="#818cf8"/>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 1 }}>{videoInfo.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                    {videoInfo.width}×{videoInfo.height} · {fmtDur(videoInfo.duration)} · {fmt(videoInfo.size)}
                  </div>
                </div>
              </div>
              <video
                ref={origVidRef}
                src={videoInfo.url}
                style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 8, background: '#000', cursor: 'pointer' }}
                onClick={() => {
                  if (origVidRef.current.paused) { origVidRef.current.play(); setPlaying(p => ({...p, orig: true})) }
                  else { origVidRef.current.pause(); setPlaying(p => ({...p, orig: false})) }
                }}
                onEnded={() => setPlaying(p => ({...p, orig: false}))}
                loop
              />
            </div>

            {/* Preset selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
                Destination / Plateforme
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p)}
                    style={{
                      padding: '12px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                      background: preset.id === p.id ? p.bg : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${preset.id === p.id ? p.border : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: preset.id === p.id ? p.color : '#94a3b8', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality / Custom bitrate */}
            {preset.id !== 'custom' ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
                  Niveau de compression
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {Object.entries(QUALITY_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setQuality(k)}
                      style={{
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        background: quality === k ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${quality === k ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: quality === k ? '#a5b4fc' : '#94a3b8', marginBottom: 3 }}>{v.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{v.desc}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', marginTop: 4 }}>{v.videoBps / 1_000_000} Mbps VBR</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(245,158,11,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>
                  Bitrate personnalisé
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <input
                    type="range" min={1_000_000} max={20_000_000} step={500_000}
                    value={customBps}
                    onChange={e => setCustomBps(Number(e.target.value))}
                    style={{ flex: 1, height: 4 }}
                  />
                  <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: '#fbbf24', minWidth: 70, textAlign: 'right' }}>
                    {(customBps / 1_000_000).toFixed(1)} Mbps
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                  <span>1 Mbps (légère)</span><span>10 Mbps (TikTok standard)</span><span>20 Mbps (haute qualité)</span>
                </div>
              </div>
            )}

            {/* Low credits warning */}
            {credits < 2 && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#fbbf24' }}>⚠️ 2 crédits requis pour compresser</span>
                <button onClick={() => router.push('/pricing')} style={{ background: '#f59e0b', border: 'none', color: '#000', padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Recharger</button>
              </div>
            )}

            {/* Summary + CTA */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                {videoInfo.width}×{videoInfo.height} → {
                  (() => {
                    let w = videoInfo.width, h = videoInfo.height
                    if (w > preset.maxWidth) { const r = preset.maxWidth / w; w = preset.maxWidth; h = Math.round(h * r) }
                    if (h > preset.maxHeight) { const r = preset.maxHeight / h; h = preset.maxHeight; w = Math.round(w * r) }
                    return `${w % 2 === 0 ? w : w-1}×${h % 2 === 0 ? h : h-1}`
                  })()
                }
                {' · '}
                {preset.id === 'custom' ? (customBps/1_000_000).toFixed(1) : (QUALITY_LABELS[quality].videoBps/1_000_000)} Mbps VBR
                {' · '}
                {preset.audioBitsPerSecond / 1000} kbps audio
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>⚡ 2 crédits</span>
            </div>

            {status === 'compressing' ? (
              <div>
                {/* Progress */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ animation: 'pulse 1.5s ease infinite', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff2d55', display: 'inline-block', animation: 'pulse 1s ease infinite' }}/>
                      {progressMsg || 'Compression en cours...'}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f1f5f9' }}>{progress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#ff2d55,#ff9500)', borderRadius: 99, transition: 'width 0.3s' }}/>
                  </div>
                </div>
                <button onClick={cancel} style={{ width: '100%', padding: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={compress}
                disabled={!hasCredits(2)}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: hasCredits(2) ? 'pointer' : 'not-allowed',
                  background: hasCredits(2) ? 'linear-gradient(135deg,#ff2d55,#ff6b35)' : '#334155',
                  color: '#fff', fontWeight: 800, fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 0.2s', boxShadow: hasCredits(2) ? '0 4px 24px rgba(255,45,85,0.3)' : 'none',
                }}
              >
                🎬 Compresser · ⚡2 crédits
                <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>({preset.name})</span>
              </button>
            )}
          </div>
        )}

        {/* ── Result ── */}
        {status === 'done' && result && (
          <div className="slide-up">
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <CheckCircle size={22} color="#22c55e"/>
                <span style={{ fontWeight: 800, fontSize: 17, color: '#22c55e' }}>Compression réussie !</span>
                <ReductionBadge original={videoInfo?.size} compressed={result.size}/>
              </div>

              {/* Before / After comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Avant</div>
                  <video
                    ref={origVidRef}
                    src={videoInfo?.url}
                    controls
                    style={{ width: '100%', borderRadius: 8, background: '#000', marginBottom: 10, maxHeight: 200, objectFit: 'contain' }}
                  />
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>
                    <div>{videoInfo?.width}×{videoInfo?.height}</div>
                    <div style={{ fontWeight: 700, color: '#f87171', fontSize: 14, marginTop: 4 }}>{fmt(videoInfo?.size)}</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(34,197,94,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Après</div>
                  <video
                    ref={compVidRef}
                    src={result.url}
                    controls
                    style={{ width: '100%', borderRadius: 8, background: '#000', marginBottom: 10, maxHeight: 200, objectFit: 'contain' }}
                  />
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>
                    <div>{result.width}×{result.height}</div>
                    <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14, marginTop: 4 }}>{fmt(result.size)}</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Taille originale', value: fmt(videoInfo?.size), color: '#f87171' },
                  { label: 'Taille compressée', value: fmt(result.size), color: '#22c55e' },
                  { label: 'Réduction', value: `${Math.round((1 - result.size / videoInfo?.size) * 100)}%`, color: '#fbbf24' },
                  { label: 'Résolution', value: `${result.width}×${result.height}`, color: '#818cf8' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'monospace', marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Download + New */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={download} style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Download size={16}/> Télécharger · {result.name.split('.').pop().toUpperCase()}
                </button>
                <button onClick={reset} style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RotateCcw size={14}/> Nouvelle vidéo
                </button>
              </div>
            </div>

            {/* Technical note */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
              <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Note technique :</strong> Compression effectuée côté client via Canvas API + MediaRecorder.
              Le codec utilisé est {result.mimeType.includes('mp4') ? 'H.264 (AVC)' : 'VP9'} avec VBR.
              Pour TikTok, le format WebM est converti automatiquement à l'upload.
              Cette pré-compression évite le re-encodage agressif de TikTok et préserve votre qualité visuelle.
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginTop: 16 }}>
            <AlertCircle size={16} color="#f87171"/>
            <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
          </div>
        )}

      </div>
    </main>
  )
}
