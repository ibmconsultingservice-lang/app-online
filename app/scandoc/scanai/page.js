'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// ─── Inline SVG icons ─────────────────────────────────────────────
const Ic = ({ p, size = 20, sw = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(p) ? p : [p]).map((d, i) => <path key={i} d={d}/>)}
  </svg>
)

// ─── Canvas helpers ───────────────────────────────────────────────
const loadImg = src => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src
})

const fileToBase64 = file => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload  = e => { const [, b64] = e.target.result.split(','); res(b64) }
  r.onerror = rej
  r.readAsDataURL(file)
})

const fileToDataURL = file => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload  = e => res(e.target.result)
  r.onerror = rej
  r.readAsDataURL(file)
})

// Apply brightness/contrast filter via CSS filter string
const buildFilter = (brightness, contrast) => {
  const b = 1 + (brightness || 0)
  const c = 1 + (contrast || 0)
  return `brightness(${b}) contrast(${c})`
}

// Draw the analysis overlay on a canvas (corners + crop rect)
const drawOverlay = (canvas, imgEl, analysis) => {
  if (!canvas || !imgEl || !analysis) return
  const { cropRect, corners, rotation } = analysis

  const scale = Math.min(canvas.width / imgEl.naturalWidth, canvas.height / imgEl.naturalHeight)
  const offX  = (canvas.width  - imgEl.naturalWidth  * scale) / 2
  const offY  = (canvas.height - imgEl.naturalHeight * scale) / 2

  const tx = x => offX + x * scale
  const ty = y => offY + y * scale

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw original image dimmed
  ctx.save()
  ctx.globalAlpha = 0.45
  ctx.drawImage(imgEl, offX, offY, imgEl.naturalWidth * scale, imgEl.naturalHeight * scale)
  ctx.restore()

  // Draw document highlight (corners polygon)
  if (corners) {
    const pts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(tx(pts[0].x), ty(pts[0].y))
    for (const pt of pts.slice(1)) ctx.lineTo(tx(pt.x), ty(pt.y))
    ctx.closePath()

    // Bright document area
    ctx.save()
    ctx.clip()
    ctx.globalAlpha = 1
    ctx.drawImage(imgEl, offX, offY, imgEl.naturalWidth * scale, imgEl.naturalHeight * scale)
    ctx.restore()

    // Border
    ctx.strokeStyle = '#00e5c8'
    ctx.lineWidth   = 2
    ctx.setLineDash([])
    ctx.stroke()

    // Corner dots
    for (const pt of pts) {
      ctx.beginPath()
      ctx.arc(tx(pt.x), ty(pt.y), 6, 0, Math.PI * 2)
      ctx.fillStyle   = '#00e5c8'
      ctx.fill()
      ctx.strokeStyle = '#003d36'
      ctx.lineWidth   = 1.5
      ctx.stroke()
    }
    ctx.restore()
  }

  // Crop rect dashed outline
  if (cropRect) {
    ctx.save()
    ctx.strokeStyle = '#ffd166'
    ctx.lineWidth   = 1.5
    ctx.setLineDash([6, 4])
    ctx.strokeRect(tx(cropRect.x), ty(cropRect.y), cropRect.width * scale, cropRect.height * scale)
    ctx.restore()
  }
}

// Generate the final cropped + corrected canvas → dataURL
const applyCrop = async (dataUrl, analysis) => {
  const img      = await loadImg(dataUrl)
  const { cropRect, rotation, corrections } = analysis
  const { brightness = 0, contrast = 0, sharpen = false, grayscale = false } = corrections || {}

  const angle = (rotation || 0) * Math.PI / 180

  // Source crop area
  const sx = cropRect?.x      ?? 0
  const sy = cropRect?.y      ?? 0
  const sw = cropRect?.width  ?? img.naturalWidth
  const sh = cropRect?.height ?? img.naturalHeight

  // Output canvas
  const outW = Math.round(sw * Math.abs(Math.cos(angle)) + sh * Math.abs(Math.sin(angle)))
  const outH = Math.round(sw * Math.abs(Math.sin(angle)) + sh * Math.abs(Math.cos(angle)))

  const canvas = document.createElement('canvas')
  canvas.width  = outW || sw
  canvas.height = outH || sh
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Apply corrections as CSS filter
  ctx.filter = buildFilter(brightness, contrast)
  if (grayscale) ctx.filter += ' grayscale(1)'

  // Rotate + draw cropped region
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(angle)
  ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh)
  ctx.restore()

  // Optional: very basic unsharp mask via convolution for sharpen
  if (sharpen) {
    const id   = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = id.data
    const kern = [0,-1,0,-1,5,-1,0,-1,0]
    const kw   = 3
    const tmp  = new Uint8ClampedArray(data)
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let s = 0
          for (let ky = 0; ky < kw; ky++) {
            for (let kx = 0; kx < kw; kx++) {
              const px = ((y + ky - 1) * canvas.width + (x + kx - 1)) * 4 + c
              s += tmp[px] * kern[ky * kw + kx]
            }
          }
          data[(y * canvas.width + x) * 4 + c] = Math.max(0, Math.min(255, s))
        }
      }
    }
    ctx.putImageData(id, 0, 0)
  }

  return canvas.toDataURL('image/jpeg', 0.94)
}

// ─── Main page ────────────────────────────────────────────────────
export default function ScanAIPage() {
  const [stage,      setStage]      = useState('idle')  // idle|loading|overlay|result|error
  const [dataUrl,    setDataUrl]    = useState(null)
  const [analysis,   setAnalysis]   = useState(null)
  const [result,     setResult]     = useState(null)    // cropped dataUrl
  const [error,      setError]      = useState('')
  const [processing, setProcessing] = useState('')
  const [imgEl,      setImgEl]      = useState(null)

  // Manual crop adjustment
  const [manualCrop,  setManualCrop]  = useState(null)  // null = use AI result
  const [showRaw,     setShowRaw]     = useState(false)
  const [downloading, setDownloading] = useState(false)

  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)
  const overlayRef = useRef(null)

  // Draw overlay whenever analysis or image changes
  useEffect(() => {
    if (stage === 'overlay' && overlayRef.current && imgEl && analysis) {
      drawOverlay(overlayRef.current, imgEl, analysis)
    }
  }, [stage, imgEl, analysis])

  // ── Handle file input ──
  const handleFile = useCallback(async file => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Fichier non valide — image uniquement')
      return
    }
    try {
      setStage('loading')
      setError('')
      setAnalysis(null)
      setResult(null)

      setProcessing('Lecture de l\'image…')
      const [b64, dUrl] = await Promise.all([
        fileToBase64(file),
        fileToDataURL(file),
      ])

      // Get image dimensions
      const img = await loadImg(dUrl)
      setDataUrl(dUrl)
      setImgEl(img)

      setProcessing('Envoi à Claude Vision…')

      const res = await fetch('/api/generer-scanai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: b64,
          mediaType:   file.type,
          imageWidth:  img.naturalWidth,
          imageHeight: img.naturalHeight,
        })
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Erreur API')

      setAnalysis(data.analysis)
      setStage('overlay')
      setProcessing('')
    } catch (err) {
      setError(err.message)
      setStage('error')
      setProcessing('')
    }
  }, [])

  // ── Apply crop and generate result ──
  const applyAndGenerate = useCallback(async () => {
    if (!dataUrl || !analysis) return
    setProcessing('Application du recadrage…')
    setStage('loading')
    try {
      const effectiveAnalysis = manualCrop
        ? { ...analysis, cropRect: manualCrop }
        : analysis
      const out = await applyCrop(dataUrl, effectiveAnalysis)
      setResult(out)
      setStage('result')
    } catch (err) {
      setError('Erreur lors du recadrage : ' + err.message)
      setStage('error')
    }
    setProcessing('')
  }, [dataUrl, analysis, manualCrop])

  // ── Download result ──
  const download = () => {
    if (!result) return
    setDownloading(true)
    const a = document.createElement('a')
    a.href     = result
    a.download = `scanai_${Date.now()}.jpg`
    a.click()
    setTimeout(() => setDownloading(false), 800)
  }

  // ── Download as PDF ──
  const downloadPDF = async () => {
    if (!result) return
    setDownloading(true)
    try {
      if (!window.jspdf) {
        await new Promise((res, rej) => {
          const s = document.createElement('script')
          s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
          s.onload = res; s.onerror = rej
          document.head.appendChild(s)
        })
      }
      const { jsPDF } = window.jspdf
      const img      = await loadImg(result)
      const ratio    = img.naturalHeight / img.naturalWidth
      const mmW      = 210
      const mmH      = mmW * ratio
      const pdf      = new jsPDF({ orientation: ratio > 1 ? 'portrait' : 'landscape', unit: 'mm', format: [mmW, mmH] })
      pdf.addImage(result, 'JPEG', 0, 0, mmW, mmH)
      pdf.save(`scanai_${Date.now()}.pdf`)
    } catch (err) { setError('PDF : ' + err.message) }
    setDownloading(false)
  }

  const reset = () => {
    setStage('idle'); setDataUrl(null); setAnalysis(null); setResult(null)
    setError(''); setImgEl(null); setManualCrop(null)
    if (cameraRef.current)  cameraRef.current.value  = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  // Confidence color
  const confColor = c => c >= .8 ? '#00e5c8' : c >= .5 ? '#ffd166' : '#ff6b6b'
  const confLabel = c => c >= .8 ? 'Haute' : c >= .5 ? 'Moyenne' : 'Faible'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Bebas+Neue&display=swap');

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }
        :root {
          --void:    #050608;
          --deep:    #0a0c10;
          --panel:   #0f1219;
          --surface: #161b24;
          --edge:    #1e2535;
          --line:    #2a3347;
          --text:    #c8d4e8;
          --dim:     #5a6a84;
          --teal:    #00e5c8;
          --amber:   #ffd166;
          --red:     #ff6b6b;
          --blue:    #4d9fff;
          --white:   #f0f4fc;
        }
        body { background: var(--void); }

        .ai-root {
          min-height: 100vh;
          background: var(--void);
          font-family: 'IBM Plex Mono', monospace;
          color: var(--text);
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .ai-header {
          border-bottom: 1px solid var(--edge);
          padding: 0 28px;
          height: 56px;
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--deep);
          flex-shrink: 0;
        }
        .ai-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: .12em;
          color: var(--white);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ai-logo-badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .14em;
          background: var(--teal);
          color: var(--void);
          padding: 2px 7px;
          border-radius: 2px;
          text-transform: uppercase;
        }
        .ai-header-right {
          margin-left: auto;
          font-size: 10px;
          color: var(--dim);
          letter-spacing: .08em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ai-status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--teal);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.3 } }

        /* ── Body ── */
        .ai-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          gap: 24px;
        }

        /* ── Upload zone ── */
        .upload-zone {
          width: 100%;
          max-width: 560px;
          border: 1px solid var(--edge);
          border-radius: 4px;
          padding: 64px 32px;
          text-align: center;
          cursor: pointer;
          transition: border-color .2s, background .2s;
          background: var(--panel);
          position: relative;
          overflow: hidden;
        }
        .upload-zone::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(135deg, transparent 48%, var(--edge) 49%, transparent 50%),
            linear-gradient(45deg,  transparent 48%, var(--edge) 49%, transparent 50%);
          background-size: 32px 32px;
          opacity: .3;
        }
        .upload-zone:hover { border-color: var(--teal); background: #0a1018; }
        .upload-icon {
          font-size: 48px;
          margin-bottom: 20px;
          position: relative;
        }
        .upload-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: .1em;
          color: var(--white);
          margin-bottom: 6px;
          position: relative;
        }
        .upload-sub {
          font-size: 10px;
          color: var(--dim);
          letter-spacing: .1em;
          text-transform: uppercase;
          margin-bottom: 28px;
          position: relative;
        }
        .upload-btns {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative;
        }

        /* ── Buttons ── */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: .08em;
          text-transform: uppercase;
          border-radius: 2px;
          cursor: pointer;
          border: none;
          transition: all .15s;
          white-space: nowrap;
        }
        .btn-teal    { background: var(--teal);    color: var(--void); }
        .btn-teal:hover { background: #00c9b0; }
        .btn-outline { background: transparent; color: var(--text); border: 1px solid var(--line); }
        .btn-outline:hover { border-color: var(--teal); color: var(--teal); }
        .btn-amber   { background: var(--amber);   color: var(--void); }
        .btn-amber:hover { background: #f0c050; }
        .btn-ghost   { background: var(--surface); color: var(--dim); border: 1px solid var(--edge); }
        .btn-ghost:hover { color: var(--text); border-color: var(--line); }
        .btn-danger  { background: transparent; color: var(--red); border: 1px solid #3a1a1a; }
        .btn-danger:hover { background: #1a0a0a; }
        .btn:disabled { opacity: .35; cursor: not-allowed; }

        /* ── Loading state ── */
        .loading-card {
          width: 100%;
          max-width: 480px;
          background: var(--panel);
          border: 1px solid var(--edge);
          border-radius: 4px;
          padding: 48px 32px;
          text-align: center;
        }
        .scan-animation {
          width: 80px; height: 80px;
          margin: 0 auto 24px;
          position: relative;
        }
        .scan-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: var(--teal);
          animation: spin .8s linear infinite;
        }
        .scan-ring2 {
          position: absolute;
          inset: 12px;
          border-radius: 50%;
          border: 1.5px solid transparent;
          border-top-color: var(--amber);
          animation: spin 1.2s linear infinite reverse;
        }
        .scan-center {
          position: absolute;
          inset: 28px;
          border-radius: 50%;
          background: var(--teal);
          opacity: .15;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        .loading-step {
          font-size: 11px;
          color: var(--teal);
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        .loading-label {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: .1em;
          color: var(--white);
          margin-bottom: 8px;
        }

        /* ── Overlay stage (analysis result) ── */
        .overlay-layout {
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 720px) {
          .overlay-layout { grid-template-columns: 1fr; }
        }

        .overlay-canvas-wrap {
          background: var(--panel);
          border: 1px solid var(--edge);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        .overlay-canvas {
          width: 100%;
          display: block;
        }
        .overlay-label {
          position: absolute;
          top: 12px; left: 12px;
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          background: rgba(0,229,200,.12);
          border: 1px solid rgba(0,229,200,.3);
          color: var(--teal);
          padding: 3px 8px;
          border-radius: 2px;
        }

        /* ── Analysis panel ── */
        .analysis-panel {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .a-card {
          background: var(--panel);
          border: 1px solid var(--edge);
          border-radius: 4px;
          padding: 14px;
        }
        .a-card-title {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--dim);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .a-card-title::before {
          content: '';
          width: 3px; height: 3px;
          border-radius: 50%;
          background: var(--teal);
        }
        .a-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid var(--edge);
          font-size: 11px;
        }
        .a-row:last-child { border-bottom: none; }
        .a-label { color: var(--dim); }
        .a-val   { color: var(--white); font-weight: 500; }
        .a-val.teal   { color: var(--teal); }
        .a-val.amber  { color: var(--amber); }
        .a-val.red    { color: var(--red); }

        .conf-bar {
          height: 3px;
          background: var(--edge);
          border-radius: 99px;
          margin-top: 6px;
          overflow: hidden;
        }
        .conf-fill {
          height: 100%;
          border-radius: 99px;
          transition: width .6s ease;
        }

        .description-box {
          font-size: 11px;
          color: var(--text);
          line-height: 1.6;
          font-style: italic;
          background: var(--surface);
          border: 1px solid var(--edge);
          border-radius: 3px;
          padding: 10px 12px;
        }

        .warning-item {
          font-size: 10px;
          color: var(--amber);
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 4px 0;
        }

        .corrections-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .corr-item {
          background: var(--surface);
          border: 1px solid var(--edge);
          border-radius: 3px;
          padding: 8px;
          text-align: center;
        }
        .corr-label { font-size: 9px; color: var(--dim); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 4px; }
        .corr-val   { font-size: 13px; color: var(--white); font-weight: 500; }
        .corr-active { border-color: var(--teal); }
        .corr-val.active { color: var(--teal); }

        /* ── Result stage ── */
        .result-layout {
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 720px) {
          .result-layout { grid-template-columns: 1fr; }
        }

        .result-img-wrap {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        .result-img {
          width: 100%;
          display: block;
        }
        .result-badge {
          position: absolute;
          top: 12px; right: 12px;
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
          background: rgba(0,229,200,.15);
          border: 1px solid rgba(0,229,200,.4);
          color: var(--teal);
          padding: 3px 8px;
          border-radius: 2px;
        }

        .result-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ── Error ── */
        .error-card {
          width: 100%;
          max-width: 480px;
          background: #120808;
          border: 1px solid #3a1818;
          border-radius: 4px;
          padding: 32px;
          text-align: center;
        }
        .error-icon { font-size: 36px; margin-bottom: 14px; }
        .error-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: .1em;
          color: var(--red);
          margin-bottom: 8px;
        }
        .error-msg {
          font-size: 11px;
          color: #8a5050;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        /* ── Comparison toggle ── */
        .compare-wrap {
          display: flex;
          gap: 3px;
          background: var(--surface);
          border: 1px solid var(--edge);
          border-radius: 3px;
          padding: 3px;
        }
        .compare-btn {
          flex: 1;
          padding: 6px 10px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: .06em;
          text-transform: uppercase;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          transition: all .15s;
          background: transparent;
          color: var(--dim);
        }
        .compare-btn.active { background: var(--teal); color: var(--void); }

        /* Scrollbar */
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--deep); }
        ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 99px; }
      `}</style>

      <div className="ai-root">
        {/* Header */}
        <header className="ai-header">
          <div className="ai-logo">
            ScanAI
            <span className="ai-logo-badge">Claude Vision</span>
          </div>
          <div className="ai-header-right">
            <div className="ai-status-dot"/>
            Détection automatique des bords
          </div>
        </header>

        <div className="ai-body">

          {/* ── IDLE: upload zone ── */}
          {stage === 'idle' && (
            <div className="upload-zone" onClick={() => galleryRef.current?.click()}>
              <div className="upload-icon">⬚</div>
              <div className="upload-title">Scanner un document</div>
              <div className="upload-sub">Claude analyse et recadre automatiquement</div>
              <div className="upload-btns" onClick={e => e.stopPropagation()}>
                <button className="btn btn-teal" onClick={() => cameraRef.current?.click()}>
                  📷 Appareil photo
                </button>
                <button className="btn btn-outline" onClick={() => galleryRef.current?.click()}>
                  🖼 Galerie / fichier
                </button>
              </div>
            </div>
          )}

          {/* ── LOADING ── */}
          {stage === 'loading' && (
            <div className="loading-card">
              <div className="scan-animation">
                <div className="scan-ring"/>
                <div className="scan-ring2"/>
                <div className="scan-center"/>
              </div>
              <div className="loading-label">Analyse en cours</div>
              <div className="loading-step">{processing}</div>
            </div>
          )}

          {/* ── OVERLAY: show detection result ── */}
          {stage === 'overlay' && analysis && imgEl && (
            <div className="overlay-layout">
              {/* Left: annotated image */}
              <div className="overlay-canvas-wrap">
                <canvas
                  ref={el => {
                    overlayRef.current = el
                    if (el && imgEl) {
                      const scale = Math.min(800 / imgEl.naturalWidth, 600 / imgEl.naturalHeight, 1)
                      el.width  = imgEl.naturalWidth  * scale
                      el.height = imgEl.naturalHeight * scale
                    }
                  }}
                  className="overlay-canvas"
                />
                <div className="overlay-label">Détection IA</div>
              </div>

              {/* Right: analysis panel */}
              <div className="analysis-panel">

                {/* Document info */}
                <div className="a-card">
                  <div className="a-card-title">Document détecté</div>
                  <div className="a-row">
                    <span className="a-label">Type</span>
                    <span className="a-val" style={{ textTransform:'capitalize' }}>
                      {analysis.documentType || '—'}
                    </span>
                  </div>
                  <div className="a-row">
                    <span className="a-label">Confiance</span>
                    <span className="a-val" style={{ color: confColor(analysis.confidence) }}>
                      {confLabel(analysis.confidence)} ({Math.round((analysis.confidence||0)*100)}%)
                    </span>
                  </div>
                  <div className="conf-bar">
                    <div className="conf-fill" style={{
                      width: `${(analysis.confidence||0)*100}%`,
                      background: confColor(analysis.confidence)
                    }}/>
                  </div>
                  <div className="a-row" style={{ marginTop: 8 }}>
                    <span className="a-label">Recadrage</span>
                    <span className="a-val teal">
                      {analysis.cropRect?.width}×{analysis.cropRect?.height}px
                    </span>
                  </div>
                  <div className="a-row">
                    <span className="a-label">Rotation</span>
                    <span className="a-val" style={{ color: analysis.rotation ? 'var(--amber)' : 'var(--dim)' }}>
                      {analysis.rotation ? `${analysis.rotation}°` : 'Aucune'}
                    </span>
                  </div>
                  <div className="a-row">
                    <span className="a-label">Format</span>
                    <span className="a-val" style={{ textTransform:'uppercase' }}>
                      {analysis.outputDimensions?.ratio || '—'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {analysis.description && (
                  <div className="a-card">
                    <div className="a-card-title">Analyse</div>
                    <div className="description-box">{analysis.description}</div>
                  </div>
                )}

                {/* Corrections */}
                <div className="a-card">
                  <div className="a-card-title">Corrections auto</div>
                  <div className="corrections-grid">
                    {[
                      { label:'Luminosité', val: analysis.corrections?.brightness || 0, fmt: v => v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2) },
                      { label:'Contraste',  val: analysis.corrections?.contrast   || 0, fmt: v => v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2) },
                    ].map(c => (
                      <div key={c.label} className={`corr-item ${c.val !== 0 ? 'corr-active' : ''}`}>
                        <div className="corr-label">{c.label}</div>
                        <div className={`corr-val ${c.val !== 0 ? 'active' : ''}`}>{c.fmt(c.val)}</div>
                      </div>
                    ))}
                    {[
                      { label:'Netteté',  val: analysis.corrections?.sharpen   },
                      { label:'N&B',      val: analysis.corrections?.grayscale },
                    ].map(c => (
                      <div key={c.label} className={`corr-item ${c.val ? 'corr-active' : ''}`}>
                        <div className="corr-label">{c.label}</div>
                        <div className={`corr-val ${c.val ? 'active' : ''}`}>{c.val ? 'Oui' : 'Non'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {analysis.warnings?.length > 0 && (
                  <div className="a-card">
                    <div className="a-card-title">Avertissements</div>
                    {analysis.warnings.map((w, i) => (
                      <div key={i} className="warning-item">⚠ {w}</div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <button className="btn btn-teal" style={{ width:'100%', justifyContent:'center' }}
                  onClick={applyAndGenerate}>
                  ✓ Appliquer le recadrage
                </button>
                <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center' }}
                  onClick={reset}>
                  ↺ Recommencer
                </button>
              </div>
            </div>
          )}

          {/* ── RESULT ── */}
          {stage === 'result' && result && (
            <div className="result-layout">
              {/* Left: result image */}
              <div className="result-img-wrap">
                <img
                  src={showRaw ? dataUrl : result}
                  alt="Résultat"
                  className="result-img"
                />
                <div className="result-badge">{showRaw ? 'Original' : '✓ Traité'}</div>
              </div>

              {/* Right: actions panel */}
              <div className="result-panel">

                <div className="a-card">
                  <div className="a-card-title">Document traité</div>
                  <div className="a-row">
                    <span className="a-label">Type</span>
                    <span className="a-val" style={{ textTransform:'capitalize' }}>{analysis?.documentType}</span>
                  </div>
                  <div className="a-row">
                    <span className="a-label">Rotation</span>
                    <span className="a-val">{analysis?.rotation ? `${analysis.rotation}°` : '—'}</span>
                  </div>
                  <div className="a-row">
                    <span className="a-label">Format</span>
                    <span className="a-val" style={{ textTransform:'uppercase' }}>{analysis?.outputDimensions?.ratio}</span>
                  </div>
                </div>

                {/* Compare toggle */}
                <div className="compare-wrap">
                  <button className={`compare-btn ${!showRaw ? 'active' : ''}`} onClick={() => setShowRaw(false)}>
                    ✓ Traité
                  </button>
                  <button className={`compare-btn ${showRaw ? 'active' : ''}`} onClick={() => setShowRaw(true)}>
                    ⬚ Original
                  </button>
                </div>

                <button className="btn btn-teal" style={{ width:'100%', justifyContent:'center' }}
                  onClick={download} disabled={downloading}>
                  ↓ Télécharger JPG
                </button>
                <button className="btn btn-amber" style={{ width:'100%', justifyContent:'center' }}
                  onClick={downloadPDF} disabled={downloading}>
                  ↓ Télécharger PDF
                </button>
                <button className="btn btn-outline" style={{ width:'100%', justifyContent:'center' }}
                  onClick={() => { setStage('overlay'); setResult(null) }}>
                  ← Retour à l'analyse
                </button>
                <button className="btn btn-danger" style={{ width:'100%', justifyContent:'center' }}
                  onClick={reset}>
                  ↺ Nouveau scan
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {stage === 'error' && (
            <div className="error-card">
              <div className="error-icon">⚠</div>
              <div className="error-title">Analyse échouée</div>
              <div className="error-msg">{error}</div>
              <button className="btn btn-outline" onClick={reset}>↺ Réessayer</button>
            </div>
          )}

          {/* Error toast on other stages */}
          {error && stage !== 'error' && (
            <div style={{ background:'#120808', border:'1px solid #3a1818', borderRadius:3, padding:'10px 16px', fontSize:11, color:'var(--red)', maxWidth:480, width:'100%', textAlign:'center' }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Hidden inputs */}
        <input ref={cameraRef}  type="file" accept="image/*" capture="environment" hidden
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value='' }}/>
        <input ref={galleryRef} type="file" accept="image/*" hidden
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value='' }}/>
      </div>
    </>
  )
}