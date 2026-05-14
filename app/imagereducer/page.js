'use client'

import { useState, useRef, useCallback } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import {
  Zap, Upload, Download, RefreshCw, AlertCircle,
  CheckCircle, ImageIcon, Layers, ArrowRight, X
} from 'lucide-react'

// ── Pure JS image compression — no library needed ──────────────
function compressImage(file, { quality, maxWidth, maxHeight, format }) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.src = url

    img.onload = () => {
      URL.revokeObjectURL(url)

      // ── Calculate new dimensions keeping aspect ratio ──
      let { width, height } = img
      const ratio = width / height

      if (width > maxWidth) {
        width  = maxWidth
        height = Math.round(maxWidth / ratio)
      }
      if (height > maxHeight) {
        height = maxHeight
        width  = Math.round(maxHeight * ratio)
      }

      const canvas  = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx     = canvas.getContext('2d')

      // ── Smooth rendering for best quality ──
      ctx.imageSmoothingEnabled  = true
      ctx.imageSmoothingQuality  = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      const mimeType = format === 'jpg' ? 'image/jpeg'
                     : format === 'png' ? 'image/png'
                     : format === 'webp' ? 'image/webp'
                     : file.type || 'image/jpeg'

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Compression échouée')); return }
          resolve({ blob, width, height })
        },
        mimeType,
        quality / 100
      )
    }
    img.onerror = () => reject(new Error('Image illisible'))
  })
}

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024)        return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function pct(original, compressed) {
  if (!original || !compressed) return 0
  return Math.round((1 - compressed / original) * 100)
}

const PRESETS = [
  { label: 'Web',       quality: 75, maxWidth: 1920, maxHeight: 1080, desc: 'Idéal pour sites web'        },
  { label: 'Email',     quality: 60, maxWidth: 1280, maxHeight:  720, desc: 'Léger pour les emails'       },
  { label: 'WhatsApp',  quality: 65, maxWidth:  800, maxHeight:  800, desc: 'Optimisé mobile'             },
  { label: 'Max',       quality: 40, maxWidth: 1280, maxHeight:  720, desc: 'Réduction maximale ~90%'     },
  { label: 'Personnalisé', quality: 80, maxWidth: 1920, maxHeight: 1080, desc: 'Configurez manuellement' },
]

export default function ImageReducer() {
  const allowed = usePlanGuard('free')
  const { credits } = useCredits()
  const router = useRouter()

  const [file, setFile]               = useState(null)
  const [preview, setPreview]         = useState(null)
  const [originalMeta, setOriginalMeta] = useState(null)
  const [preset, setPreset]           = useState(0)
  const [quality, setQuality]         = useState(75)
  const [maxWidth, setMaxWidth]       = useState(1920)
  const [maxHeight, setMaxHeight]     = useState(1080)
  const [format, setFormat]           = useState('same')
  const [processing, setProcessing]   = useState(false)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState('')
  const [dragOver, setDragOver]       = useState(false)
  const fileRef = useRef(null)

  const isCustom = preset === 4

  const applyPreset = (idx) => {
    setPreset(idx)
    if (idx !== 4) {
      setQuality(PRESETS[idx].quality)
      setMaxWidth(PRESETS[idx].maxWidth)
      setMaxHeight(PRESETS[idx].maxHeight)
    }
  }

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) {
      setError('Fichier non supporté — choisissez une image (JPG, PNG, WebP, GIF)')
      return
    }
    setFile(f)
    setResult(null)
    setError('')

    const url = URL.createObjectURL(f)
    setPreview(url)

    const img = new Image()
    img.src = url
    img.onload = () => {
      setOriginalMeta({ width: img.width, height: img.height, size: f.size })
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const handleCompress = async () => {
    if (!file) return
    setProcessing(true)
    setError('')
    setResult(null)

    try {
      const outputFormat = format === 'same'
        ? (file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg')
        : format

      const { blob, width, height } = await compressImage(file, {
        quality,
        maxWidth,
        maxHeight,
        format: outputFormat,
      })

      const reduction = pct(file.size, blob.size)
      const url       = URL.createObjectURL(blob)
      const ext       = outputFormat
      const name      = file.name.replace(/\.[^.]+$/, '') + '_compressed.' + ext

      setResult({ url, name, size: blob.size, width, height, reduction, ext, blob })

    } catch (err) {
      setError('Erreur : ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href     = result.url
    a.download = result.name
    a.click()
  }

  const reset = () => {
    setFile(null); setPreview(null); setOriginalMeta(null)
    setResult(null); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Estimated result size (live preview) ──
  const estimatedSize = originalMeta
    ? Math.round(originalMeta.size * (quality / 100) * 0.6)
    : null

  if (!allowed) return (
    <div className="min-h-screen bg-[#f0f4ff] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center">
        <ImageIcon size={20} color="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#f8fafc] to-[#f0fff4] font-sans">

      {/* ── Header ── */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers size={18} color="white"/>
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-slate-900">Image</span>
            <span className="text-indigo-600 font-black text-lg">Reducer</span>
            <span className="ml-2 text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">Gratuit</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
            <Zap size={11} className="text-indigo-600" fill="currentColor"/>
            <span className="text-xs font-black text-indigo-700">{credits}</span>
          </div>
          <a href="/" className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18}/>
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Réduisez vos images jusqu'à{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">
              90%
            </span>
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Compression intelligente dans le navigateur — aucun upload, aucun serveur. Vos images restent privées.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0"/>
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button onClick={() => setError('')} className="ml-auto"><X size={14} className="text-red-400"/></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── LEFT: Upload + Settings ── */}
          <div className="space-y-5">

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={`relative rounded-3xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                dragOver
                  ? 'border-indigo-400 bg-indigo-50'
                  : file
                    ? 'border-indigo-300 bg-indigo-50/50'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}>
              <input ref={fileRef} type="file" hidden accept="image/*" onChange={e => handleFile(e.target.files[0])}/>

              {preview ? (
                <div className="relative">
                  <img src={preview} alt="preview" className="w-full max-h-[220px] object-contain bg-slate-50 p-4"/>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 flex items-end justify-between">
                    <div>
                      <p className="text-white text-xs font-black truncate max-w-[200px]">{file?.name}</p>
                      <p className="text-white/70 text-[10px]">
                        {fmtSize(originalMeta?.size)} · {originalMeta?.width}×{originalMeta?.height}px
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); reset() }}
                      className="w-7 h-7 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-all">
                      <X size={12} color="white"/>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-14">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                    dragOver ? 'bg-indigo-100 scale-110' : 'bg-slate-100'
                  }`}>
                    <Upload size={28} className={dragOver ? 'text-indigo-500' : 'text-slate-400'}/>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-700">Glissez une image ou cliquez</p>
                    <p className="text-xs text-slate-400 mt-1">JPG · PNG · WebP · GIF · BMP</p>
                  </div>
                </div>
              )}
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Préréglage</p>
              <div className="grid grid-cols-5 gap-2">
                {PRESETS.map((p, i) => (
                  <button key={i} onClick={() => applyPreset(i)}
                    className={`py-2.5 rounded-xl text-[10px] font-black text-center transition-all border ${
                      preset === i
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 italic">{PRESETS[preset].desc}</p>
            </div>

            {/* Quality slider */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Qualité</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-black ${
                      quality >= 80 ? 'text-emerald-600' :
                      quality >= 60 ? 'text-amber-500'   : 'text-red-500'
                    }`}>{quality}%</span>
                    <span className="text-[10px] text-slate-400">
                      {quality >= 80 ? 'Haute' : quality >= 60 ? 'Bonne' : quality >= 40 ? 'Moyenne' : 'Faible'}
                    </span>
                  </div>
                </div>
                <input
                  type="range" min={10} max={100} step={5} value={quality}
                  onChange={e => { setQuality(Number(e.target.value)); setPreset(4) }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  style={{ background: `linear-gradient(to right, #4f46e5 ${quality}%, #e2e8f0 ${quality}%)` }}
                />
                <div className="flex justify-between text-[9px] text-slate-300 font-bold">
                  <span>10% (Max compression)</span>
                  <span>100% (Original)</span>
                </div>
              </div>

              {/* Dimensions */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Dimensions max</p>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold">Largeur (px)</p>
                    <input
                      type="number" value={maxWidth} min={100} max={7680}
                      onChange={e => { setMaxWidth(Number(e.target.value)); setPreset(4) }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 bg-slate-50"
                    />
                  </div>
                  <X size={14} className="text-slate-300 mt-5 flex-shrink-0"/>
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold">Hauteur (px)</p>
                    <input
                      type="number" value={maxHeight} min={100} max={7680}
                      onChange={e => { setMaxHeight(Number(e.target.value)); setPreset(4) }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* Output format */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Format de sortie</p>
                <div className="flex gap-2">
                  {[
                    { k: 'same',  l: 'Même format' },
                    { k: 'jpg',   l: 'JPG' },
                    { k: 'png',   l: 'PNG' },
                    { k: 'webp',  l: 'WebP ✨' },
                  ].map(f => (
                    <button key={f.k} onClick={() => setFormat(f.k)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all border ${
                        format === f.k
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300'
                      }`}>
                      {f.l}
                    </button>
                  ))}
                </div>
                {format === 'webp' && (
                  <p className="text-[10px] text-indigo-500 font-medium">
                    💡 WebP offre la meilleure compression (-30% vs JPG à qualité égale)
                  </p>
                )}
              </div>
            </div>

            {/* Live estimate */}
            {file && estimatedSize && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-indigo-500"/>
                  <span className="text-xs text-indigo-700 font-bold">Taille estimée</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 line-through">{fmtSize(file.size)}</span>
                  <ArrowRight size={12} className="text-slate-400"/>
                  <span className="text-sm font-black text-indigo-600">~{fmtSize(estimatedSize)}</span>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    -{pct(file.size, estimatedSize)}%
                  </span>
                </div>
              </div>
            )}

            {/* Compress button */}
            <button
              onClick={handleCompress}
              disabled={!file || processing}
              className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white disabled:opacity-40 flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20">
              {processing ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Compression en cours...</>
              ) : (
                <><Layers size={18}/> Compresser l'image — Gratuit</>
              )}
            </button>
          </div>

          {/* ── RIGHT: Result ── */}
          <div className="space-y-5">
            {result ? (
              <>
                {/* Stats banner */}
                <div className={`rounded-2xl p-5 border ${
                  result.reduction >= 70
                    ? 'bg-emerald-50 border-emerald-200'
                    : result.reduction >= 40
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={18} className="text-emerald-600"/>
                    <p className="text-sm font-black text-slate-900">Compression réussie ✓</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Avant',     val: fmtSize(file?.size),    sub: `${originalMeta?.width}×${originalMeta?.height}px` },
                      { label: 'Après',     val: fmtSize(result.size),   sub: `${result.width}×${result.height}px`               },
                      { label: 'Réduction', val: `-${result.reduction}%`, sub: fmtSize(file?.size - result.size) + ' économisé'    },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-xl p-3 text-center border border-white shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                        <p className={`text-lg font-black mt-1 ${s.label === 'Réduction' ? 'text-emerald-600' : 'text-slate-900'}`}>{s.val}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{s.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual comparison */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="flex border-b border-slate-100">
                    <div className="flex-1 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">
                      Original · {fmtSize(file?.size)}
                    </div>
                    <div className="flex-1 px-4 py-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">
                      Compressé · {fmtSize(result.size)}
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex-1 bg-slate-50 border-r border-slate-100 p-3">
                      <img src={preview} alt="original" className="w-full max-h-[220px] object-contain rounded-lg"/>
                    </div>
                    <div className="flex-1 bg-white p-3">
                      <img src={result.url} alt="compressed" className="w-full max-h-[220px] object-contain rounded-lg"/>
                    </div>
                  </div>
                </div>

                {/* Reduction bar */}
                <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">Taux de compression</span>
                    <span className="text-emerald-600">{result.reduction}% réduit</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
                      style={{ width: `${result.reduction}%` }}/>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>0%</span>
                    <span className={result.reduction >= 80 ? 'text-emerald-600 font-black' : ''}>
                      {result.reduction >= 80 ? '🎉 Excellent !' : result.reduction >= 60 ? '👍 Très bien' : '✓ Correct'}
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20">
                  <Download size={18}/> Télécharger · {result.name.split('.').pop().toUpperCase()} · {fmtSize(result.size)}
                </button>

                {/* Compress another */}
                <button
                  onClick={reset}
                  className="w-full py-3 rounded-xl font-black text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                  <RefreshCw size={13}/> Compresser une autre image
                </button>
              </>
            ) : (
              <div className="h-full min-h-[400px] bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center gap-6 text-center p-10 shadow-sm">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center border border-indigo-100">
                  <Layers size={32} className="text-indigo-300"/>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-black text-slate-400">Résultat apparaîtra ici</p>
                  <p className="text-xs text-slate-300">Choisissez une image et lancez la compression</p>
                </div>

                {/* Info cards */}
                <div className="w-full space-y-2 mt-4">
                  {[
                    { icon: '🔒', title: '100% privé',        desc: 'Traitement dans votre navigateur' },
                    { icon: '⚡', title: 'Instantané',         desc: 'Résultat en moins d\'1 seconde'  },
                    { icon: '🎨', title: 'Qualité préservée',  desc: 'Algorithme haute fidélité'        },
                  ].map(c => (
                    <div key={c.title} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                      <span className="text-lg">{c.icon}</span>
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-700">{c.title}</p>
                        <p className="text-[10px] text-slate-400">{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(79,70,229,0.4);
        }
      `}</style>
    </main>
  )
}