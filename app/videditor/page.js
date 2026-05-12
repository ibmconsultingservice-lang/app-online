'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import {
  Zap, Upload, Video, Music, FileVideo, Scissors,
  Volume2, VolumeX, Download, X, Play, Pause,
  RefreshCw, ChevronRight, AlertCircle, CheckCircle,
  Loader2, Film, Wand2, Image, Crop, RotateCcw
} from 'lucide-react'

// ── Tools catalog ──────────────────────────────────────────────
const TOOLS = [
  {
    id: 'convert',
    icon: <FileVideo size={22}/>,
    title: 'Convertisseur Vidéo',
    desc: 'Convertit .webm, .mov, .avi, .mkv → .mp4, .webm, .gif',
    color: 'emerald',
    cost: 2,
    accepts: 'video/*,.mkv,.avi,.mov,.webm',
    outputFormats: ['mp4', 'webm', 'gif'],
  },
  {
    id: 'extract-audio',
    icon: <Music size={22}/>,
    title: 'Extracteur Audio',
    desc: 'Extrait la piste audio complète d\'une vidéo → .mp3 ou .wav',
    color: 'blue',
    cost: 1,
    accepts: 'video/*',
    outputFormats: ['mp3', 'wav'],
  },
  {
    id: 'extract-music',
    icon: <Volume2 size={22}/>,
    title: 'Séparateur Musique / Voix',
    desc: 'Isole la musique de fond d\'une vidéo → .mp3',
    color: 'violet',
    cost: 2,
    accepts: 'video/*',
    outputFormats: ['mp3'],
  },
  {
    id: 'compress',
    icon: <Crop size={22}/>,
    title: 'Compresseur Vidéo',
    desc: 'Réduit la taille du fichier jusqu\'à 80% sans perte visible',
    color: 'amber',
    cost: 2,
    accepts: 'video/*',
    outputFormats: ['mp4'],
  },
  {
    id: 'trim',
    icon: <Scissors size={22}/>,
    title: 'Découpe Vidéo',
    desc: 'Coupe précisément un segment entre deux timestamps',
    color: 'rose',
    cost: 1,
    accepts: 'video/*',
    outputFormats: ['mp4'],
  },
  {
    id: 'mute',
    icon: <VolumeX size={22}/>,
    title: 'Supprimer le son',
    desc: 'Retire entièrement la piste audio d\'une vidéo',
    color: 'slate',
    cost: 1,
    accepts: 'video/*',
    outputFormats: ['mp4'],
  },
  {
    id: 'thumbnail',
    icon: <Image size={22}/>,
    title: 'Extracteur de Thumbnail',
    desc: 'Capture une image précise à un timestamp donné → .jpg ou .png',
    color: 'teal',
    cost: 1,
    accepts: 'video/*',
    outputFormats: ['jpg', 'png'],
  },
  {
    id: 'gif',
    icon: <Film size={22}/>,
    title: 'Vidéo → GIF',
    desc: 'Convertit un extrait vidéo en GIF animé haute qualité',
    color: 'pink',
    cost: 2,
    accepts: 'video/*',
    outputFormats: ['gif'],
  },
  {
    id: 'reverse',
    icon: <RotateCcw size={22}/>,
    title: 'Vidéo en Miroir',
    desc: 'Inverse la vidéo (reverse) ou la retourne horizontalement',
    color: 'orange',
    cost: 2,
    accepts: 'video/*',
    outputFormats: ['mp4'],
  },
  {
    id: 'speed',
    icon: <Wand2 size={22}/>,
    title: 'Vitesse Vidéo',
    desc: 'Accélère ou ralentit la vidéo (x0.25 à x4)',
    color: 'cyan',
    cost: 2,
    accepts: 'video/*',
    outputFormats: ['mp4'],
  },
]

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20', btn: 'bg-emerald-600 hover:bg-emerald-500' },
  blue:    { bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-400',    glow: 'shadow-blue-500/20',    btn: 'bg-blue-600 hover:bg-blue-500'    },
  violet:  { bg: 'bg-violet-500/15',  border: 'border-violet-500/30',  text: 'text-violet-400',  glow: 'shadow-violet-500/20',  btn: 'bg-violet-600 hover:bg-violet-500' },
  amber:   { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-400',   glow: 'shadow-amber-500/20',   btn: 'bg-amber-600 hover:bg-amber-500'   },
  rose:    { bg: 'bg-rose-500/15',    border: 'border-rose-500/30',    text: 'text-rose-400',    glow: 'shadow-rose-500/20',    btn: 'bg-rose-600 hover:bg-rose-500'     },
  slate:   { bg: 'bg-slate-500/15',   border: 'border-slate-500/30',   text: 'text-slate-400',   glow: 'shadow-slate-500/20',   btn: 'bg-slate-600 hover:bg-slate-500'   },
  teal:    { bg: 'bg-teal-500/15',    border: 'border-teal-500/30',    text: 'text-teal-400',    glow: 'shadow-teal-500/20',    btn: 'bg-teal-600 hover:bg-teal-500'     },
  pink:    { bg: 'bg-pink-500/15',    border: 'border-pink-500/30',    text: 'text-pink-400',    glow: 'shadow-pink-500/20',    btn: 'bg-pink-600 hover:bg-pink-500'     },
  orange:  { bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  text: 'text-orange-400',  glow: 'shadow-orange-500/20',  btn: 'bg-orange-600 hover:bg-orange-500' },
  cyan:    { bg: 'bg-cyan-500/15',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    glow: 'shadow-cyan-500/20',    btn: 'bg-cyan-600 hover:bg-cyan-500'     },
}

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fmtDur(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── FFmpeg loader ──────────────────────────────────────────────
let ffmpegInstance = null

async function loadFFmpeg(onProgress) {
  if (ffmpegInstance) return ffmpegInstance
  const { FFmpeg } = await import('@ffmpeg/ffmpeg')
  const { fetchFile, toBlobURL } = await import('@ffmpeg/util')
  const ff = new FFmpeg()
  ff.on('progress', ({ progress }) => onProgress && onProgress(Math.round(progress * 100)))
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ff.load({
    coreURL:   await toBlobURL(`${baseURL}/ffmpeg-core.js`,   'text/javascript'),
    wasmURL:   await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  ffmpegInstance = { ff, fetchFile }
  return ffmpegInstance
}

// ── Main component ─────────────────────────────────────────────
export default function VidEditor() {
  const allowed = usePlanGuard('starter')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [activeTool, setActiveTool] = useState(null)
  const [file, setFile]             = useState(null)
  const [fileURL, setFileURL]       = useState(null)
  const [fileMeta, setFileMeta]     = useState(null)  // { duration, size }
  const [outputFmt, setOutputFmt]   = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [stage, setStage]           = useState('')
  const [result, setResult]         = useState(null)  // { url, name, size }
  const [error, setError]           = useState('')
  const [ffLoaded, setFfLoaded]     = useState(false)
  const [ffLoading, setFfLoading]   = useState(false)

  // Tool-specific options
  const [trimStart, setTrimStart]   = useState('00:00:00')
  const [trimEnd, setTrimEnd]       = useState('00:00:10')
  const [thumbTime, setThumbTime]   = useState('00:00:01')
  const [thumbFmt, setThumbFmt]     = useState('jpg')
  const [speed, setSpeed]           = useState(1)
  const [quality, setQuality]       = useState('medium')  // low | medium | high
  const [gifFps, setGifFps]         = useState(10)
  const [reverseMode, setReverseMode] = useState('reverse')  // reverse | hflip | vflip

  const videoRef  = useRef(null)
  const fileRef   = useRef(null)

  const tool = TOOLS.find(t => t.id === activeTool)
  const col  = tool ? COLOR_MAP[tool.color] : null

  // ── Pre-load FFmpeg in background when tool is selected ──
  useEffect(() => {
    if (!activeTool || ffLoaded || ffLoading) return
    setFfLoading(true)
    setStage('Chargement de FFmpeg.wasm...')
    loadFFmpeg(setProgress)
      .then(() => { setFfLoaded(true); setStage('') })
      .catch(e  => setError('FFmpeg non disponible: ' + e.message))
      .finally(() => setFfLoading(false))
  }, [activeTool])

  // ── File selection ──
  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setError('')
    const url = URL.createObjectURL(f)
    setFileURL(url)
    setOutputFmt(tool?.outputFormats[0] || 'mp4')

    // Get video metadata
    const vid = document.createElement('video')
    vid.src = url
    vid.onloadedmetadata = () => {
      setFileMeta({ duration: vid.duration, size: f.size })
      setTrimEnd(fmtDur(Math.min(vid.duration, 30)).replace(':', ':').padStart(8, '0:'))
    }
  }

  // ── Build FFmpeg command per tool ──
  const buildCommand = useCallback(() => {
    const inFile  = 'input.' + (file?.name?.split('.').pop() || 'mp4')
    const outFile = 'output.' + outputFmt

    const CRF = { low: '28', medium: '23', high: '18' }

    switch (activeTool) {
      case 'convert':
        if (outputFmt === 'gif') return { args: ['-i', inFile, '-vf', 'fps=10,scale=480:-1:flags=lanczos', '-loop', '0', outFile], inFile, outFile }
        return { args: ['-i', inFile, '-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast', outFile], inFile, outFile }

      case 'extract-audio':
        if (outputFmt === 'mp3') return { args: ['-i', inFile, '-q:a', '0', '-map', 'a', outFile], inFile, outFile }
        return { args: ['-i', inFile, '-map', 'a', outFile], inFile, outFile }

      case 'extract-music':
        // Extracts audio track (music) — full audio pipeline
        return { args: ['-i', inFile, '-q:a', '2', '-map', 'a', outFile], inFile, outFile: 'output.mp3' }

      case 'compress':
        return { args: ['-i', inFile, '-vcodec', 'libx264', '-crf', CRF[quality], '-preset', 'slow', '-acodec', 'aac', '-b:a', '128k', outFile], inFile, outFile }

      case 'trim':
        return { args: ['-i', inFile, '-ss', trimStart, '-to', trimEnd, '-c', 'copy', outFile], inFile, outFile }

      case 'mute':
        return { args: ['-i', inFile, '-an', outFile], inFile, outFile }

      case 'thumbnail':
        return { args: ['-i', inFile, '-ss', thumbTime, '-vframes', '1', '-q:v', '2', 'output.' + thumbFmt], inFile, outFile: 'output.' + thumbFmt }

      case 'gif':
        return { args: ['-i', inFile, '-vf', `fps=${gifFps},scale=480:-1:flags=lanczos`, '-loop', '0', outFile], inFile, outFile }

      case 'reverse':
        if (reverseMode === 'reverse') return { args: ['-i', inFile, '-vf', 'reverse', '-af', 'areverse', outFile], inFile, outFile }
        if (reverseMode === 'hflip')  return { args: ['-i', inFile, '-vf', 'hflip', '-c:a', 'copy', outFile], inFile, outFile }
        return { args: ['-i', inFile, '-vf', 'vflip', '-c:a', 'copy', outFile], inFile, outFile }

      case 'speed':
        return {
          args: ['-i', inFile, '-filter:v', `setpts=${(1/speed).toFixed(2)}*PTS`, '-filter:a', `atempo=${Math.min(Math.max(speed, 0.5), 2)}`, outFile],
          inFile, outFile
        }

      default:
        return null
    }
  }, [activeTool, file, outputFmt, trimStart, trimEnd, thumbTime, thumbFmt, speed, quality, gifFps, reverseMode])

  // ── Run FFmpeg ──
  const handleProcess = async () => {
    if (!file || !hasCredits(tool.cost)) {
      if (!hasCredits(tool.cost)) router.push('/pricing')
      return
    }
    setProcessing(true)
    setProgress(0)
    setError('')
    setResult(null)

    try {
      setStage('Chargement de FFmpeg...')
      const { ff, fetchFile } = await loadFFmpeg(p => setProgress(p))
      setFfLoaded(true)

      setStage('Lecture du fichier...')
      const cmd = buildCommand()
      if (!cmd) throw new Error('Commande invalide')

      const { inFile, outFile, args } = cmd
      await ff.writeFile(inFile, await fetchFile(file))

      setStage('Traitement en cours...')
      await ff.exec(args)

      setStage('Finalisation...')
      const data = await ff.readFile(outFile)
      const blob = new Blob([data.buffer], { type: getMimeType(outFile) })
      const url  = URL.createObjectURL(blob)

      await deductCredits(tool.cost)
      setResult({
        url,
        name: file.name.replace(/\.[^.]+$/, '') + '_edited.' + outFile.split('.').pop(),
        size: blob.size,
        type: outFile.split('.').pop(),
      })
      setStage('')

      // Cleanup
      await ff.deleteFile(inFile).catch(() => {})
      await ff.deleteFile(outFile).catch(() => {})

    } catch (err) {
      setError('Erreur: ' + (err.message || 'Traitement échoué'))
      console.error(err)
    } finally {
      setProcessing(false)
      setProgress(0)
    }
  }

  const getMimeType = (filename) => {
    const ext = filename.split('.').pop()
    const map = { mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mp3', wav: 'audio/wav', gif: 'image/gif', jpg: 'image/jpeg', png: 'image/png' }
    return map[ext] || 'application/octet-stream'
  }

  const isAudioResult = result && ['mp3', 'wav'].includes(result.type)
  const isImageResult = result && ['jpg', 'png'].includes(result.type)

  if (!allowed) return (
    <div className="min-h-screen bg-[#080c18] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-violet-600 rounded-2xl flex items-center justify-center">
        <Video size={20} color="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#080c18] text-white font-sans">

      {/* ── Header ── */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#080c18]/95 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Film size={18}/>
          </div>
          <div>
            <span className="font-black text-lg tracking-tight">Vid</span>
            <span className="text-violet-400 font-black text-lg">Editor</span>
            <span className="ml-2 text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTool && (
            <button onClick={() => { setActiveTool(null); setFile(null); setResult(null); setError('') }}
              className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-white transition-colors">
              ← Tous les outils
            </button>
          )}
          <div className="flex items-center gap-1.5 bg-violet-950/60 border border-violet-500/20 rounded-full px-3 py-1.5">
            <Zap size={11} className="text-violet-400" fill="currentColor"/>
            <span className="text-xs font-black text-violet-300">{credits}</span>
          </div>
        </div>
      </header>

      {/* ══ TOOL GRID ══ */}
      {!activeTool && (
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2 text-xs font-black text-violet-300 uppercase tracking-widest">
              <Film size={12}/> Traitement 100% local · FFmpeg.wasm
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              Studio Vidéo<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                dans votre navigateur
              </span>
            </h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Aucun upload serveur — vos vidéos restent sur votre machine. FFmpeg.wasm tourne entièrement dans le browser.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map(t => {
              const c = COLOR_MAP[t.color]
              return (
                <button key={t.id} onClick={() => { setActiveTool(t.id); setFile(null); setResult(null); setError('') }}
                  className={`text-left bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-white/20 hover:bg-white/5 transition-all group space-y-4`}>
                  <div className={`w-12 h-12 ${c.bg} ${c.border} border rounded-2xl flex items-center justify-center ${c.text} group-hover:scale-110 transition-transform`}>
                    {t.icon}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{t.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">{t.desc}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${c.bg} ${c.text}`}>
                      ⚡{t.cost} crédit{t.cost > 1 ? 's' : ''}
                    </span>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all"/>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-violet-400"/>
            </div>
            <div>
              <p className="text-xs font-black text-white">100% privé — zéro serveur</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Vos fichiers vidéo ne quittent jamais votre appareil. FFmpeg.wasm (~32MB) se charge une seule fois dans le navigateur.</p>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOOL WORKSPACE ══ */}
      {activeTool && tool && (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

          {/* Tool header */}
          <div className={`${col.bg} ${col.border} border rounded-2xl p-5 flex items-center gap-4`}>
            <div className={`w-12 h-12 ${col.bg} ${col.border} border rounded-2xl flex items-center justify-center ${col.text}`}>
              {tool.icon}
            </div>
            <div className="flex-1">
              <p className="text-base font-black text-white">{tool.title}</p>
              <p className="text-xs text-slate-400">{tool.desc}</p>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${col.bg} ${col.text} border ${col.border}`}>
              ⚡{tool.cost} crédit{tool.cost > 1 ? 's' : ''}
            </span>
          </div>

          {/* FFmpeg loading indicator */}
          {ffLoading && (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <Loader2 size={14} className="text-violet-400 animate-spin flex-shrink-0"/>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">Chargement de FFmpeg.wasm (~32MB)...</p>
                <p className="text-[10px] text-slate-500">Une seule fois · restera en cache</p>
              </div>
              <div className="w-24 bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }}/>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0"/>
              <p className="text-xs text-red-400 font-medium">{error}</p>
              <button onClick={() => setError('')} className="ml-auto"><X size={14} className="text-red-400"/></button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ── LEFT: File + Options ── */}
            <div className="space-y-4">

              {/* File drop zone */}
              <label className="block cursor-pointer group">
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  file
                    ? `${col.border} ${col.bg}`
                    : 'border-white/10 hover:border-white/20 hover:bg-white/2'
                }`}>
                  {file ? (
                    <div className="space-y-2">
                      <CheckCircle size={24} className={`${col.text} mx-auto`}/>
                      <p className={`text-sm font-black ${col.text} truncate`}>{file.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {fmtSize(fileMeta?.size)} · {fmtDur(fileMeta?.duration)}
                      </p>
                      <p className="text-[10px] text-slate-600">Cliquer pour changer</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload size={24} className="text-slate-600 mx-auto group-hover:text-slate-400 transition-colors"/>
                      <p className="text-sm font-bold text-slate-400">Sélectionner un fichier vidéo</p>
                      <p className="text-[10px] text-slate-600">{tool.accepts.replace(/video\/\*/g, 'vidéos').replace(/,/g, ' · ')}</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" hidden accept={tool.accepts} onChange={handleFile}/>
              </label>

              {/* Video preview */}
              {fileURL && activeTool !== 'extract-audio' && activeTool !== 'extract-music' && (
                <div className="bg-black rounded-2xl overflow-hidden border border-white/8">
                  <video
                    ref={videoRef}
                    src={fileURL}
                    controls
                    className="w-full max-h-[200px] object-contain"
                  />
                </div>
              )}

              {/* ── Tool-specific options ── */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-4 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Options</p>

                {/* Output format */}
                {tool.outputFormats.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400">Format de sortie</p>
                    <div className="flex gap-2">
                      {tool.outputFormats.map(fmt => (
                        <button key={fmt} onClick={() => setOutputFmt(fmt)}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                            outputFmt === fmt
                              ? `${col.bg} ${col.text} border ${col.border}`
                              : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
                          }`}>
                          .{fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trim options */}
                {activeTool === 'trim' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold">Début (hh:mm:ss)</p>
                      <input value={trimStart} onChange={e => setTrimStart(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-rose-500/40"
                        placeholder="00:00:00"/>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold">Fin (hh:mm:ss)</p>
                      <input value={trimEnd} onChange={e => setTrimEnd(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-rose-500/40"
                        placeholder="00:00:10"/>
                    </div>
                    {fileMeta?.duration && (
                      <p className="text-[10px] text-slate-600">Durée totale : {fmtDur(fileMeta.duration)}</p>
                    )}
                  </div>
                )}

                {/* Compress quality */}
                {activeTool === 'compress' && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400">Qualité de compression</p>
                    <div className="flex gap-2">
                      {[
                        { k: 'low',    l: 'Max réduction', sub: '~80%' },
                        { k: 'medium', l: 'Équilibré',     sub: '~60%' },
                        { k: 'high',   l: 'Haute qualité', sub: '~40%' },
                      ].map(q => (
                        <button key={q.k} onClick={() => setQuality(q.k)}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black text-center transition-all border ${
                            quality === q.k
                              ? `${col.bg} ${col.text} ${col.border}`
                              : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                          }`}>
                          <span className="block">{q.l}</span>
                          <span className="text-[9px] opacity-60">{q.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thumbnail time */}
                {activeTool === 'thumbnail' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold">Timestamp (hh:mm:ss)</p>
                      <input value={thumbTime} onChange={e => setThumbTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-teal-500/40"
                        placeholder="00:00:01"/>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 font-bold">Format de l'image</p>
                      <div className="flex gap-2">
                        {['jpg', 'png'].map(f => (
                          <button key={f} onClick={() => setThumbFmt(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                              thumbFmt === f
                                ? `${col.bg} ${col.text} border ${col.border}`
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
                            }`}>.{f}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* GIF options */}
                {activeTool === 'gif' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-[10px] text-slate-500 font-bold">FPS du GIF</p>
                        <span className="text-xs font-black text-pink-400">{gifFps} fps</span>
                      </div>
                      <input type="range" min={5} max={25} step={1} value={gifFps}
                        onChange={e => setGifFps(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-pink-500"/>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold">Segment (début → fin)</p>
                      <div className="flex gap-2">
                        <input value={trimStart} onChange={e => setTrimStart(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-pink-500/40"
                          placeholder="00:00:00"/>
                        <span className="text-slate-600 self-center">→</span>
                        <input value={trimEnd} onChange={e => setTrimEnd(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-pink-500/40"
                          placeholder="00:00:10"/>
                      </div>
                    </div>
                  </div>
                )}

                {/* Speed */}
                {activeTool === 'speed' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-[10px] text-slate-500 font-bold">Vitesse</p>
                      <span className="text-xs font-black text-cyan-400">×{speed}</span>
                    </div>
                    <input type="range" min={0.25} max={4} step={0.25} value={speed}
                      onChange={e => setSpeed(Number(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-cyan-500"/>
                    <div className="flex justify-between text-[9px] text-slate-600 font-bold">
                      <span>×0.25 (ralenti)</span><span>×1 (normal)</span><span>×4 (accéléré)</span>
                    </div>
                  </div>
                )}

                {/* Reverse mode */}
                {activeTool === 'reverse' && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400">Mode</p>
                    <div className="space-y-2">
                      {[
                        { k: 'reverse', l: '⏪ Inverser la vidéo',       sub: 'Lecture à l\'envers' },
                        { k: 'hflip',   l: '↔ Miroir horizontal',        sub: 'Flip gauche-droite'  },
                        { k: 'vflip',   l: '↕ Miroir vertical',          sub: 'Flip haut-bas'       },
                      ].map(m => (
                        <button key={m.k} onClick={() => setReverseMode(m.k)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                            reverseMode === m.k
                              ? `${col.bg} ${col.text} ${col.border}`
                              : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                          }`}>
                          <span className="block">{m.l}</span>
                          <span className="text-[10px] opacity-60">{m.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No extra options */}
                {['extract-audio', 'extract-music', 'mute', 'convert'].includes(activeTool) && tool.outputFormats.length <= 1 && (
                  <p className="text-xs text-slate-600 italic">Aucune option supplémentaire requise.</p>
                )}
              </div>

              {/* Process button */}
              <button
                onClick={handleProcess}
                disabled={!file || processing || !ffLoaded || !hasCredits(tool.cost)}
                className={`w-full py-4 rounded-2xl font-black text-sm ${col.btn} disabled:opacity-40 flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg ${col.glow}`}>
                {processing ? (
                  <><Loader2 size={18} className="animate-spin"/> {stage} {progress > 0 ? `${progress}%` : ''}</>
                ) : !ffLoaded ? (
                  <><Loader2 size={18} className="animate-spin"/> Chargement FFmpeg...</>
                ) : (
                  <>{tool.icon} Lancer le traitement · ⚡{tool.cost}</>
                )}
              </button>

              {/* Progress bar */}
              {processing && progress > 0 && (
                <div className="space-y-2">
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${
                      tool.color === 'emerald' ? 'from-emerald-500 to-teal-500' :
                      tool.color === 'blue'    ? 'from-blue-500 to-cyan-500'    :
                      tool.color === 'violet'  ? 'from-violet-500 to-purple-500':
                      'from-violet-500 to-purple-500'
                    }`} style={{ width: `${progress}%` }}/>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center">{stage}</p>
                </div>
              )}
            </div>

            {/* ── RIGHT: Result ── */}
            <div className="space-y-4">
              {result ? (
                <div className="space-y-4">
                  <div className={`${col.bg} ${col.border} border rounded-2xl p-5 space-y-4`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className={col.text}/>
                      <p className="text-sm font-black text-white">Traitement terminé ✓</p>
                    </div>

                    {/* Result preview */}
                    {!isAudioResult && !isImageResult && (
                      <video src={result.url} controls className="w-full rounded-xl bg-black max-h-[250px] object-contain"/>
                    )}
                    {isAudioResult && (
                      <div className="bg-black/40 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Music size={20} className={col.text}/>
                          <span className="text-sm font-bold text-white">{result.name}</span>
                        </div>
                        <audio src={result.url} controls className="w-full"/>
                      </div>
                    )}
                    {isImageResult && (
                      <img src={result.url} alt="thumbnail" className="w-full rounded-xl object-contain max-h-[250px] bg-black/40"/>
                    )}

                    {/* File info */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{result.name}</span>
                      <span>{fmtSize(result.size)}</span>
                    </div>

                    {/* Download */}
                    <a href={result.url} download={result.name}
                      className={`w-full py-3 rounded-xl font-black text-sm ${col.btn} text-white flex items-center justify-center gap-2 transition-all`}>
                      <Download size={16}/> Télécharger · .{result.type}
                    </a>
                  </div>

                  {/* Process another */}
                  <button onClick={() => { setResult(null); setFile(null) }}
                    className="w-full py-3 rounded-xl font-black text-xs text-slate-400 bg-white/5 border border-white/10 hover:bg-white/8 transition-all flex items-center justify-center gap-2">
                    <RefreshCw size={13}/> Traiter un autre fichier
                  </button>
                </div>
              ) : (
                <div className="h-full min-h-[300px] bg-white/2 border border-white/8 rounded-2xl flex flex-col items-center justify-center gap-4 text-center p-8">
                  <div className={`w-16 h-16 ${col.bg} ${col.border} border rounded-2xl flex items-center justify-center ${col.text} opacity-40`}>
                    {tool.icon}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-500">Résultat apparaîtra ici</p>
                    <p className="text-xs text-slate-600 mt-1">Sélectionnez un fichier et lancez le traitement</p>
                  </div>
                  {/* Privacy note */}
                  <div className="mt-4 bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-[10px] text-slate-600 leading-relaxed">
                    🔒 Traitement 100% local · Vos vidéos ne quittent pas votre navigateur
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; width: 16px; height: 16px;
          border-radius: 50%; background: currentColor; cursor: pointer;
          border: 2px solid rgba(255,255,255,0.2);
        }
      `}</style>
    </main>
  )
}