'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const Icon = ({ d, size = 16, color = 'currentColor', fill = 'none', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d={d} />
  </svg>
)
const UploadIcon   = (p) => <Icon {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
const DownloadIcon = (p) => <Icon {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
const EditIcon     = (p) => <Icon {...p} d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
const CheckIcon    = (p) => <Icon {...p} d="M20 6L9 17l-5-5" />
const AlertIcon    = (p) => <Icon {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
const ZoomInIcon   = (p) => <Icon {...p} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM10 7v6M7 10h6" />
const ZoomOutIcon  = (p) => <Icon {...p} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM7 10h6" />
const PageIcon     = (p) => <Icon {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
const ResetIcon    = (p) => <Icon {...p} d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5" />
const TextIcon     = (p) => <Icon {...p} d="M4 7V4h16v3M9 20h6M12 4v16" />
const RectIcon     = (p) => <Icon {...p} d="M3 3h18v18H3z" />
const CircleIcon   = (p) => <Icon {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
const CursorIcon   = (p) => <Icon {...p} d="M5 3l14 9-7 1-4 7z" />
const TrashIcon    = (p) => <Icon {...p} d="M3 6h18M19 6l-1 14H6L5 6M10 6V4h4v2" />
const PaletteIcon  = (p) => <Icon {...p} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.69 0 1.26-.56 1.26-1.25 0-.33-.13-.62-.33-.84-.2-.22-.32-.52-.32-.84 0-.69.56-1.26 1.25-1.26H16c3.31 0 6-2.69 6-6C22 6.04 17.52 2 12 2zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
const WordIcon     = (p) => <Icon {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13l1.5 4 1.5-4 1.5 4 1.5-4" />
const SparkleIcon  = (p) => <Icon {...p} d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />

const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
const PDFLIB_CDN   = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
const DOCXJS_CDN   = 'https://unpkg.com/docx@8.5.0/build/index.umd.js'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}

function hexToRgbArr(hex) {
  return [
    parseInt(hex.slice(1,3),16)/255,
    parseInt(hex.slice(3,5),16)/255,
    parseInt(hex.slice(5,7),16)/255
  ]
}

// ── Color Picker Popover ────────────────────────────────────
function ColorPicker({ value, onChange, label }) {
  const PRESETS = [
    '#000000','#ffffff','#ef4444','#f97316','#eab308',
    '#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280',
    '#1e3a5f','#7c1d1d','#14532d','#1e1b4b','#831843',
  ]
  return (
    <div style={s.cpWrap}>
      {label && <div style={s.cpLabel}>{label}</div>}
      <div style={s.cpRow}>
        <div style={{ ...s.cpSwatch, background: value }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)} style={s.cpNative} />
        <input
          type="text"
          value={value}
          onChange={e => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onChange(e.target.value)}
          style={s.cpText}
          maxLength={7}
        />
      </div>
      <div style={s.cpPresets}>
        {PRESETS.map(c => (
          <button key={c} style={{ ...s.cpPreset, background: c, outline: c===value ? '2px solid #6366f1' : 'none' }}
            onClick={() => onChange(c)} title={c} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
export default function PdfUpdater() {
  const fileInputRef     = useRef(null)
  const canvasRef        = useRef(null)
  const pdfDocRef        = useRef(null)
  const originalBytesRef = useRef(null)
  const textItemsRef     = useRef([])
  const drawStartRef     = useRef(null)
  const overlayRef       = useRef(null)

  const [libsReady,  setLibsReady]  = useState(false)
  const [pdfName,    setPdfName]    = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [pageIndex,  setPageIndex]  = useState(0)
  const [zoom,       setZoom]       = useState(1.4)
  const [viewport,   setViewport]   = useState(null)
  const [zones,      setZones]      = useState([])
  const [edits,      setEdits]      = useState({})
  const [activeZone, setActiveZone] = useState(null)
  const [status,     setStatus]     = useState({ type: '', msg: '' })
  const [exporting,  setExporting]  = useState(false)
  const [toWordState, setToWordState] = useState('idle') // idle | capturing | thinking | building | done | error
  const [wordProgress, setWordProgress] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  // Annotation tool state
  const [tool,       setTool]       = useState('select') // select | text | rect | ellipse
  const [annotations, setAnnotations] = useState([]) // {id, page, type, x, y, w, h, text, textColor, bgColor, fontSize, strokeColor, strokeWidth, filled}
  const [selAnn,     setSelAnn]     = useState(null)
  const [drawing,    setDrawing]    = useState(null)
  // Panel
  const [panel,      setPanel]      = useState('edits') // edits | annotations | style
  // Style for next annotation
  const [annStyle,   setAnnStyle]   = useState({
    textColor: '#000000',
    bgColor:   '#ffffff',
    strokeColor: '#6366f1',
    fontSize:  14,
    strokeWidth: 2,
    filled: false,
    text: 'Texte',
  })

  // ── Load libs ───────────────────────────────────────────
  useEffect(() => {
    Promise.all([loadScript(PDFJS_CDN), loadScript(PDFLIB_CDN)])
      .then(() => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
        setLibsReady(true)
      })
      .catch(() => setStatus({ type: 'error', msg: 'Échec du chargement des librairies PDF.' }))
  }, [])

  // ── Render page ─────────────────────────────────────────
  const renderPage = useCallback(async (pdfDoc, pageIdx, scale) => {
    if (!pdfDoc) return
    const page = await pdfDoc.getPage(pageIdx + 1)
    const vp   = page.getViewport({ scale })
    setViewport(vp)

    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = vp.width
    canvas.height = vp.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise

    const content = await page.getTextContent()
    const items = content.items
      .filter(it => it.str?.trim())
      .map((it, id) => {
        const tx = window.pdfjsLib.Util.transform(vp.transform, it.transform)
        const x  = tx[4]
        const y  = tx[5]
        const fs = Math.abs(tx[0]) || Math.abs(tx[1]) || 12
        const scale1 = vp.scale / page.getViewport({ scale: 1 }).scale
        const w  = it.width  ? it.width  * scale1 : fs * it.str.length * 0.6
        const h  = it.height ? it.height * scale1 : fs * 1.3
        return { id, str: it.str, origStr: it.str, x, y: y - h, w, h, fontSize: fs, fontName: it.fontName||'', pageIndex: pageIdx }
      })
    textItemsRef.current = items
    setZones(items)
    setActiveZone(null)
  }, [])

  useEffect(() => {
    if (pdfDocRef.current) renderPage(pdfDocRef.current, pageIndex, zoom)
  }, [pageIndex, zoom, renderPage])

  // ── Load PDF ────────────────────────────────────────────
  const loadPdf = useCallback(async (file) => {
    if (!libsReady || !file || file.type !== 'application/pdf') {
      setStatus({ type: 'error', msg: 'Fichier PDF invalide.' }); return
    }
    setStatus({ type: 'info', msg: 'Chargement…' })
    const buf = await file.arrayBuffer()
    originalBytesRef.current = new Uint8Array(buf)
    setPdfName(file.name)
    setEdits({})
    setAnnotations([])
    try {
      const pdfDoc = await window.pdfjsLib.getDocument({ data: originalBytesRef.current.slice() }).promise
      pdfDocRef.current = pdfDoc
      setTotalPages(pdfDoc.numPages)
      setPageIndex(0)
      await renderPage(pdfDoc, 0, zoom)
      setStatus({ type: 'ok', msg: `${file.name} — ${pdfDoc.numPages} page(s)` })
    } catch (e) {
      setStatus({ type: 'error', msg: 'Erreur PDF: ' + e.message })
    }
  }, [libsReady, zoom, renderPage])

  // ── Edit helpers ────────────────────────────────────────
  const editKey = z => `${z.pageIndex}__${z.id}`
  const getVal  = z => edits[editKey(z)] !== undefined ? edits[editKey(z)] : z.str
  const editedCount = Object.keys(edits).length

  // ── Annotation drawing ──────────────────────────────────
  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onMouseDown = (e) => {
    if (tool === 'select') return
    e.preventDefault()
    const pos = getCanvasPos(e)
    drawStartRef.current = pos
    setDrawing({ type: tool, x: pos.x, y: pos.y, w: 0, h: 0, ...annStyle, pageIndex })
  }

  const onMouseMove = (e) => {
    if (!drawStartRef.current || tool === 'select') return
    const pos = getCanvasPos(e)
    const dx = pos.x - drawStartRef.current.x
    const dy = pos.y - drawStartRef.current.y
    setDrawing(prev => ({
      ...prev,
      x: dx < 0 ? pos.x : drawStartRef.current.x,
      y: dy < 0 ? pos.y : drawStartRef.current.y,
      w: Math.abs(dx),
      h: Math.abs(dy),
    }))
  }

  const onMouseUp = (e) => {
    if (!drawStartRef.current || tool === 'select') return
    drawStartRef.current = null
    if (!drawing || (drawing.w < 5 && drawing.h < 5 && tool !== 'text')) { setDrawing(null); return }
    const newAnn = {
      ...drawing,
      id: Date.now(),
      w: drawing.type === 'text' ? Math.max(drawing.w, 120) : drawing.w,
      h: drawing.type === 'text' ? Math.max(drawing.h, 30)  : drawing.h,
    }
    setAnnotations(a => [...a, newAnn])
    setSelAnn(newAnn.id)
    setDrawing(null)
    setTool('select')
  }

  const deleteAnn = (id) => setAnnotations(a => a.filter(x => x.id !== id))
  const updateAnn = (id, patch) => setAnnotations(a => a.map(x => x.id === id ? { ...x, ...patch } : x))

  const pageAnnotations = annotations.filter(a => a.pageIndex === pageIndex)

  // ── Convert to Word via Claude API ─────────────────
  const handleConvertToWord = async () => {
    if (!canvasRef.current) return
    setToWordState('capturing')
    setWordProgress('Capture de la page en cours…')

    try {
      // 1. Capture canvas as base64 image (high res)
      await loadScript(DOCXJS_CDN)
      const imageData = canvasRef.current.toDataURL('image/png')
      const base64    = imageData.split(',')[1]

      // 2. Ask Claude to analyse and return docx.js code
      setToWordState('thinking')
      setWordProgress('Claude analyse la mise en page…')

      const systemPrompt = `You are an expert at converting document screenshots into docx.js JavaScript code.
The user will send you a screenshot of a document page.
You must return ONLY a raw JavaScript code block (no markdown, no explanation, no backticks) that:
1. Uses the global "docx" object (already loaded as window.docx) — destructure from it: const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel, UnderlineType } = docx;
2. Recreates the document as faithfully as possible: layout, fonts (use Arial), colors (as hex strings e.g. "7B1D3A"), bold, italic, font sizes (in half-points: 24 = 12pt), alignment, tables, columns, spacing
3. For two-column layout (sidebar + main): use a Table with 2 cells. Left cell gets sidebar bg color. Right cell gets white/light bg. No borders on outer table.
4. Ends with: Packer.toBuffer(doc).then(buf => self.postMessage({ ok: true, buf: Array.from(new Uint8Array(buf)) }))
5. On error: self.onerror catches and posts { ok: false, err: e.message }
CRITICAL: Return ONLY the raw JavaScript. No markdown fences. No text before or after. The code runs inside a Web Worker.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
              { type: 'text',  text: 'Convert this document page to a Word file using docx.js. Return only the JavaScript code.' }
            ]
          }]
        })
      })

      if (!response.ok) throw new Error('API error ' + response.status)
      const apiData = await response.json()
      let code = apiData.content?.find(b => b.type === 'text')?.text || ''
      // Strip any accidental markdown fences
    // ✅ APRÈS
      code = code.replace(new RegExp('\x60\x60\x60[a-z]*\\n?', 'gm'), '')
                .replace(new RegExp('\x60\x60\x60', 'gm'), '')
                .trim()

      if (!code) throw new Error("Claude n'a pas retourné de code")

      // 3. Run the code in a Web Worker with docx loaded
      setToWordState('building')
      setWordProgress('Construction du fichier Word…')

      const workerBlob = new Blob([`
        importScripts('${DOCXJS_CDN}');
        self.onmessage = async function() {
          try {
            ${code}
          } catch(e) {
            self.postMessage({ ok: false, err: e.message });
          }
        };
      `], { type: 'application/javascript' })

      const workerUrl = URL.createObjectURL(workerBlob)
      const worker    = new Worker(workerUrl)

      await new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
          worker.terminate()
          URL.revokeObjectURL(workerUrl)
          if (!e.data.ok) { reject(new Error(e.data.err)); return }
          const bytes = new Uint8Array(e.data.buf)
          const blob  = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
          const url   = URL.createObjectURL(blob)
          const a     = document.createElement('a')
          a.href      = url
          a.download  = pdfName.replace(/\.pdf$/i, '_claude.docx')
          document.body.appendChild(a); a.click(); document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(url), 15000)
          resolve()
        }
        worker.onerror = (e) => { worker.terminate(); URL.revokeObjectURL(workerUrl); reject(new Error(e.message)) }
        worker.postMessage('start')
      })

      setToWordState('done')
      setWordProgress('')
      setStatus({ type: 'ok', msg: 'Fichier Word généré par Claude !' })
      setTimeout(() => setToWordState('idle'), 3000)

    } catch (e) {
      setToWordState('error')
      setWordProgress('')
      setStatus({ type: 'error', msg: 'Conversion Word échouée: ' + e.message })
      setTimeout(() => setToWordState('idle'), 4000)
    }
  }

  // ── Export ──────────────────────────────────────────────────
  const handleExport = async () => {
    if (!originalBytesRef.current || !window.PDFLib) return
    setExporting(true)
    setStatus({ type: 'info', msg: 'Génération du PDF…' })

    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib
      const pdfDoc = await PDFDocument.load(originalBytesRef.current)
      const pages  = pdfDoc.getPages()
      const font   = await pdfDoc.embedFont(StandardFonts.Helvetica)

      // ── Apply text edits ───────────────────────────────
      const byPage = {}
      Object.entries(edits).forEach(([key, newStr]) => {
        const [pgStr, idStr] = key.split('__')
        const pg = parseInt(pgStr)
        if (!byPage[pg]) byPage[pg] = []
        byPage[pg].push({ id: parseInt(idStr), newStr })
      })

      // Helper: sample average bg color from canvas at a screen zone
      const sampleBgColor = (screenX, screenY, screenW, screenH) => {
        try {
          const canvas = canvasRef.current
          if (!canvas) return [1, 1, 1]
          const ctx = canvas.getContext('2d')
          const x = Math.max(0, Math.round(screenX))
          const y = Math.max(0, Math.round(screenY))
          const w = Math.max(1, Math.round(screenW))
          const h = Math.max(1, Math.round(screenH))
          const data = ctx.getImageData(x, y, w, h).data
          let r = 0, g = 0, b = 0
          const pixels = data.length / 4
          for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2] }
          return [r/pixels/255, g/pixels/255, b/pixels/255]
        } catch { return [1, 1, 1] }
      }

      for (const [pgIdxStr, changes] of Object.entries(byPage)) {
        const pgIdx   = parseInt(pgIdxStr)
        const pdfPage = pages[pgIdx]
        const { width, height } = pdfPage.getSize()

        const pjsPage = await pdfDocRef.current.getPage(pgIdx + 1)
        const vp1     = pjsPage.getViewport({ scale: 1 })
        const vpZoom  = pjsPage.getViewport({ scale: zoom })
        const content = await pjsPage.getTextContent()
        const items   = content.items.filter(it => it.str?.trim())

        changes.forEach(({ id, newStr }) => {
          const item = items[id]
          if (!item) return

          // PDF-space coords (scale=1)
          const tx    = window.pdfjsLib.Util.transform(vp1.transform, item.transform)
          const xPos  = tx[4]
          const yPdf  = height - tx[5]
          const fs    = Math.max(6, Math.abs(tx[0]) || Math.abs(tx[1]) || 11)
          const wOrig = item.width  || newStr.length * fs * 0.6
          const hOrig = item.height || fs * 1.2

          // Screen-space coords (zoomed) to sample background
          const txZ  = window.pdfjsLib.Util.transform(vpZoom.transform, item.transform)
          const sxZ  = txZ[4]
          const syZ  = txZ[5] - hOrig * zoom
          const [bgR, bgG, bgB] = sampleBgColor(sxZ, syZ, wOrig * zoom, hOrig * zoom)

          // Cover original text with sampled background color
          pdfPage.drawRectangle({
            x:      xPos - 1,
            y:      yPdf - fs - 2,
            width:  wOrig + 6,
            height: fs + 4,
            color:  rgb(bgR, bgG, bgB),
            opacity: 1,
          })

          // Redraw new text with same size and black color (standard)
          pdfPage.drawText(newStr, {
            x:    xPos,
            y:    yPdf - fs + 1,
            size: fs,
            font,
            color: rgb(0, 0, 0),
            opacity: 1,
          })
        })
      }

      // ── Apply annotations ─────────────────────────────
      for (const ann of annotations) {
        const pdfPage = pages[ann.pageIndex]
        const { width, height } = pdfPage.getSize()

        // Convert screen coords → pdf coords (scale back from zoom)
        const sx = ann.x / zoom
        const sy = ann.y / zoom
        const sw = ann.w / zoom
        const sh = ann.h / zoom

        // PDF y-axis is inverted (0 = bottom)
        const pdfY = height - sy - sh

        const [sr, sg, sb] = hexToRgbArr(ann.strokeColor)
        const [tr, tg, tb] = hexToRgbArr(ann.textColor)
        const [br, bg_, bb] = hexToRgbArr(ann.bgColor)

        if (ann.type === 'rect') {
          if (ann.filled) {
            pdfPage.drawRectangle({ x: sx, y: pdfY, width: sw, height: sh, color: rgb(br, bg_, bb), opacity: 1 })
          }
          pdfPage.drawRectangle({ x: sx, y: pdfY, width: sw, height: sh, borderColor: rgb(sr, sg, sb), borderWidth: ann.strokeWidth, opacity: 1 })
        }

        if (ann.type === 'ellipse') {
          const cx = sx + sw/2, cy = pdfY + sh/2
          if (ann.filled) {
            pdfPage.drawEllipse({ x: cx, y: cy, xScale: sw/2, yScale: sh/2, color: rgb(br, bg_, bb), opacity: 1 })
          }
          pdfPage.drawEllipse({ x: cx, y: cy, xScale: sw/2, yScale: sh/2, borderColor: rgb(sr, sg, sb), borderWidth: ann.strokeWidth, opacity: 1 })
        }

        if (ann.type === 'text') {
          const fs2 = ann.fontSize || 14
          // Background
          pdfPage.drawRectangle({ x: sx, y: pdfY, width: sw, height: sh, color: rgb(br, bg_, bb), opacity: 1 })
          // Border
          pdfPage.drawRectangle({ x: sx, y: pdfY, width: sw, height: sh, borderColor: rgb(sr, sg, sb), borderWidth: 1, opacity: 1 })
          // Text (multi-line basic)
          const lines = (ann.text||'').split('\n')
          lines.forEach((line, li) => {
            pdfPage.drawText(line, {
              x: sx + 4,
              y: pdfY + sh - fs2 * (li + 1) - 4,
              size: fs2,
              font,
              color: rgb(tr, tg, tb),
              maxWidth: sw - 8,
            })
          })
        }
      }

      const bytes = await pdfDoc.save()
      const blob  = new Blob([bytes], { type: 'application/pdf' })
      const url   = URL.createObjectURL(blob)
      const a     = document.createElement('a')
      a.href = url; a.download = pdfName.replace(/\.pdf$/i, '_édité.pdf')
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 15000)
      setStatus({ type: 'ok', msg: `PDF exporté avec succès !` })
    } catch (e) {
      setStatus({ type: 'error', msg: 'Export échoué: ' + e.message })
    } finally {
      setExporting(false)
    }
  }

  const hasPdf = !!pdfDocRef.current && totalPages > 0

  // ── Selected annotation for sidebar ─────────────────────
  const selectedAnn = annotations.find(a => a.id === selAnn)

  return (
    <main style={s.root}>
      <style>{css}</style>

      {/* Header */}
      <header style={s.header}>
        <div style={s.hLeft}>
          <div style={s.logoBox}><PageIcon size={18} color="#fff" /></div>
          <div>
            <div style={s.logoText}>PdfUpdater</div>
            <div style={s.logoSub}>Édition · Annotations · Export</div>
          </div>
        </div>
        <div style={s.hRight}>
          {hasPdf && (
            <>
              <div style={s.zoomRow}>
                <button style={s.iconBtn} onClick={() => setZoom(z => Math.max(0.5,+(z-.2).toFixed(1)))}><ZoomOutIcon size={13}/></button>
                <span style={s.zoomLbl}>{Math.round(zoom*100)}%</span>
                <button style={s.iconBtn} onClick={() => setZoom(z => Math.min(3,+(z+.2).toFixed(1)))}><ZoomInIcon size={13}/></button>
              </div>
              <div style={s.zoomRow}>
                <button style={s.iconBtn} disabled={pageIndex===0} onClick={()=>setPageIndex(p=>p-1)}>‹</button>
                <span style={s.zoomLbl}>{pageIndex+1}/{totalPages}</span>
                <button style={s.iconBtn} disabled={pageIndex===totalPages-1} onClick={()=>setPageIndex(p=>p+1)}>›</button>
              </div>
              {(editedCount > 0 || annotations.length > 0) && (
                <div style={s.editBadge}>{editedCount + annotations.length} modif.</div>
              )}
              <button style={s.exportBtn} onClick={handleExport} disabled={exporting || (editedCount===0 && annotations.length===0)}>
                {exporting ? <><span style={s.spinner}/> Génération…</> : <><DownloadIcon size={13}/> Exporter</>}
              </button>
              <button style={{...s.wordBtn,...(toWordState!=='idle'&&toWordState!=='done'?s.wordBtnActive:{})}}
                onClick={handleConvertToWord}
                disabled={toWordState!=='idle'&&toWordState!=='done'}
                title="Convertir en Word via Claude AI"
              >
                {toWordState==='idle'||toWordState==='done'
                  ? <><SparkleIcon size={13}/> → Word</>
                  : <><span style={s.spinner}/> {toWordState==='thinking'?'Analyse…':toWordState==='building'?'Building…':'Capture…'}</>
                }
              </button>
            </>
          )}
          <button style={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
            <UploadIcon size={13}/> {hasPdf ? 'Changer' : 'Ouvrir PDF'}
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" style={{display:'none'}}
            onChange={e=>loadPdf(e.target.files?.[0])} />
        </div>
      </header>

      {status.msg && (
        <div style={{...s.statusBar, ...(status.type==='error'?s.sErr:status.type==='ok'?s.sOk:s.sInfo)}}>
          {status.type==='error' ? <AlertIcon size={13}/> : <CheckIcon size={13}/>}
          {status.msg}
          <button style={s.sClose} onClick={()=>setStatus({type:'',msg:''})}>✕</button>
        </div>
      )}

      <div style={s.body}>
        {!hasPdf && (
          <div
            style={{...s.dropZone,...(isDragging?s.dropActive:{})}}
            onDragOver={e=>{e.preventDefault();setIsDragging(true)}}
            onDragLeave={()=>setIsDragging(false)}
            onDrop={e=>{e.preventDefault();setIsDragging(false);loadPdf(e.dataTransfer.files?.[0])}}
            onClick={()=>fileInputRef.current?.click()}
          >
            <div style={s.dropIcon}><UploadIcon size={32} color="#6366f1"/></div>
            <div style={s.dropTitle}>Déposez votre PDF ici</div>
            <div style={s.dropSub}>ou cliquez pour parcourir</div>
            <div style={s.dropNote}><EditIcon size={11} color="#6366f1"/> Cliquez sur n'importe quel texte pour le modifier</div>
          </div>
        )}

        {hasPdf && (
          <>
            {/* Toolbar */}
            <div style={s.toolbar}>
              <div style={s.toolGroup}>
                {[
                  { id:'select', icon:<CursorIcon size={16}/>, label:'Sélection' },
                  { id:'text',   icon:<TextIcon   size={16}/>, label:'Bloc texte' },
                  { id:'rect',   icon:<RectIcon   size={16}/>, label:'Rectangle' },
                  { id:'ellipse',icon:<CircleIcon size={16}/>, label:'Ellipse' },
                ].map(t => (
                  <button key={t.id}
                    style={{...s.toolBtn,...(tool===t.id?s.toolBtnActive:{})}}
                    onClick={()=>setTool(t.id)}
                    title={t.label}
                  >
                    {t.icon}
                    <span style={s.toolLbl}>{t.label}</span>
                  </button>
                ))}
              </div>
              {tool !== 'select' && (
                <div style={s.toolStyleRow}>
                  <div style={{...s.miniSwatch, background: annStyle.strokeColor}}
                    title="Couleur bordure"
                    onClick={()=>setPanel('annotations')}
                  />
                  {(tool==='text'||tool==='rect'||tool==='ellipse') && (
                    <div style={{...s.miniSwatch, background: annStyle.bgColor, border:'1px solid rgba(255,255,255,0.2)'}}
                      title="Couleur fond"
                      onClick={()=>setPanel('annotations')}
                    />
                  )}
                  {tool==='text' && (
                    <div style={{...s.miniSwatch, background: annStyle.textColor, border:'1px solid rgba(255,255,255,0.2)'}}
                      title="Couleur texte"
                      onClick={()=>setPanel('annotations')}
                    />
                  )}
                  <span style={s.toolHint}>Cliquer-glisser pour dessiner · <span style={{color:'#818cf8'}}>Styles dans le panneau →</span></span>
                </div>
              )}
            </div>

            <div style={s.canvasArea}>
              {/* Canvas + overlays */}
              <div style={s.canvasWrap}>
                <div style={{position:'relative',display:'inline-block',lineHeight:0,userSelect:'none'}}
                  onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
                >
                  <canvas ref={canvasRef} style={{...s.canvas, cursor: tool==='select'?'default':'crosshair'}} />

                  {/* Text zone overlays — fully invisible */}
                  <div ref={overlayRef} style={s.overlay}>
                    {tool === 'select' && zones.map(zone => {
                      const val      = getVal(zone)
                      const isActive = activeZone === zone.id
                      return (
                        <div key={zone.id}
                          style={{
                            position:'absolute',
                            left:zone.x, top:zone.y,
                            width:Math.max(zone.w,20),
                            height:Math.max(zone.h,zone.fontSize*1.2),
                            cursor:'text',
                            boxSizing:'border-box',
                            background:'transparent',
                            border:'none',
                            outline:'none',
                          }}
                        >
                          <div contentEditable suppressContentEditableWarning spellCheck={false}
                            onFocus={()=>setActiveZone(zone.id)}
                            onBlur={e=>{
                              const v=e.currentTarget.textContent||''
                              if(v!==zone.str) setEdits(ed=>({...ed,[editKey(zone)]:v}))
                              else if(edits[editKey(zone)]===zone.str) setEdits(ed=>{const n={...ed};delete n[editKey(zone)];return n})
                              setActiveZone(null)
                            }}
                            style={{
                              width:'100%', height:'100%',
                              outline:'none',
                              background:'transparent',
                              color:'transparent',
                              caretColor: isActive ? '#4f46e5' : 'transparent',
                              fontSize:zone.fontSize,
                              lineHeight:1,
                              fontFamily:'inherit',
                              whiteSpace:'pre',
                              overflow:'visible',
                              userSelect:'text',
                              WebkitUserSelect:'text',
                              padding:0, margin:0, border:'none',
                            }}
                          >{val}</div>
                        </div>
                      )
                    })}

                    {/* Drawn annotations */}
                    {pageAnnotations.map(ann => (
                      <AnnOverlay key={ann.id} ann={ann} selected={selAnn===ann.id}
                        onSelect={()=>{setSelAnn(ann.id);setPanel('annotations');setTool('select')}}
                        onDelete={()=>deleteAnn(ann.id)}
                        onUpdate={p=>updateAnn(ann.id,p)}
                      />
                    ))}

                    {/* Drawing preview */}
                    {drawing && <DrawPreview ann={drawing} />}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <aside style={s.sidebar}>
                {/* Tabs */}
                <div style={s.sideTabs}>
                  {[['edits','Textes'],['annotations','Annotations']].map(([id,lbl])=>(
                    <button key={id} style={{...s.sideTab,...(panel===id?s.sideTabActive:{})}} onClick={()=>setPanel(id)}>
                      {lbl}
                      {id==='edits' && editedCount>0 && <span style={s.tabBadge}>{editedCount}</span>}
                      {id==='annotations' && annotations.length>0 && <span style={s.tabBadge}>{annotations.length}</span>}
                    </button>
                  ))}
                </div>

                {/* Edits panel */}
                {panel==='edits' && (
                  <div style={s.sideContent}>
                    {editedCount===0 ? (
                      <div style={s.sideEmpty}>Aucune modification.<br/><span style={{opacity:.5,fontSize:11}}>Cliquez sur un texte pour l'éditer.</span></div>
                    ) : (
                      <div style={s.sideList}>
                        {Object.entries(edits).map(([key,newStr])=>{
                          const [pgStr,idStr]=key.split('__')
                          const orig=textItemsRef.current.find(z=>z.pageIndex===parseInt(pgStr)&&z.id===parseInt(idStr))
                          if(!orig) return null
                          return (
                            <div key={key} style={s.sideItem}>
                              <div style={s.sideItemPg}>p.{parseInt(pgStr)+1}</div>
                              <div style={s.sideItemContent}>
                                <div style={s.sideOrig}>"{orig.str}"</div>
                                <div style={s.sideArr}>→</div>
                                <div style={s.sideNew}>"{newStr}"</div>
                              </div>
                              <button style={s.sideReset} onClick={()=>setEdits(ed=>{const n={...ed};delete n[key];return n})} title="Annuler"><ResetIcon size={11}/></button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Annotations panel */}
                {panel==='annotations' && (
                  <div style={s.sideContent}>
                    {/* Style pour nouveau dessin */}
                    <div style={s.styleSection}>
                      <div style={s.styleSectionTitle}><PaletteIcon size={12} color="#818cf8"/> Style de l'outil</div>
                      <ColorPicker label="Bordure" value={annStyle.strokeColor} onChange={v=>setAnnStyle(a=>({...a,strokeColor:v}))} />
                      <ColorPicker label="Fond" value={annStyle.bgColor} onChange={v=>setAnnStyle(a=>({...a,bgColor:v}))} />
                      <ColorPicker label="Texte" value={annStyle.textColor} onChange={v=>setAnnStyle(a=>({...a,textColor:v}))} />
                      <div style={s.sliderRow}>
                        <span style={s.sliderLbl}>Épaisseur</span>
                        <input type="range" min="1" max="8" value={annStyle.strokeWidth} style={s.slider}
                          onChange={e=>setAnnStyle(a=>({...a,strokeWidth:+e.target.value}))} />
                        <span style={s.sliderVal}>{annStyle.strokeWidth}px</span>
                      </div>
                      <div style={s.sliderRow}>
                        <span style={s.sliderLbl}>Taille texte</span>
                        <input type="range" min="8" max="48" value={annStyle.fontSize} style={s.slider}
                          onChange={e=>setAnnStyle(a=>({...a,fontSize:+e.target.value}))} />
                        <span style={s.sliderVal}>{annStyle.fontSize}px</span>
                      </div>
                      <label style={s.checkRow}>
                        <input type="checkbox" checked={annStyle.filled} onChange={e=>setAnnStyle(a=>({...a,filled:e.target.checked}))} />
                        <span style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>Remplissage fond</span>
                      </label>
                    </div>

                    {/* Selected annotation editor */}
                    {selectedAnn && (
                      <div style={s.styleSection}>
                        <div style={{...s.styleSectionTitle,justifyContent:'space-between'}}>
                          <span><EditIcon size={12} color="#818cf8"/> Annotation sélectionnée</span>
                          <button style={{...s.sideReset,color:'#f87171'}} onClick={()=>{deleteAnn(selAnn);setSelAnn(null)}}><TrashIcon size={12}/></button>
                        </div>
                        {selectedAnn.type==='text' && (
                          <textarea
                            value={selectedAnn.text}
                            onChange={e=>updateAnn(selAnn,{text:e.target.value})}
                            style={s.annTextarea}
                            rows={3}
                            placeholder="Votre texte…"
                          />
                        )}
                        <ColorPicker label="Bordure" value={selectedAnn.strokeColor} onChange={v=>updateAnn(selAnn,{strokeColor:v})} />
                        <ColorPicker label="Fond" value={selectedAnn.bgColor} onChange={v=>updateAnn(selAnn,{bgColor:v})} />
                        {selectedAnn.type==='text' && <ColorPicker label="Texte" value={selectedAnn.textColor} onChange={v=>updateAnn(selAnn,{textColor:v})} />}
                        <div style={s.sliderRow}>
                          <span style={s.sliderLbl}>Épaisseur</span>
                          <input type="range" min="1" max="8" value={selectedAnn.strokeWidth} style={s.slider}
                            onChange={e=>updateAnn(selAnn,{strokeWidth:+e.target.value})} />
                          <span style={s.sliderVal}>{selectedAnn.strokeWidth}px</span>
                        </div>
                        {selectedAnn.type==='text' && (
                          <div style={s.sliderRow}>
                            <span style={s.sliderLbl}>Taille texte</span>
                            <input type="range" min="8" max="48" value={selectedAnn.fontSize} style={s.slider}
                              onChange={e=>updateAnn(selAnn,{fontSize:+e.target.value})} />
                            <span style={s.sliderVal}>{selectedAnn.fontSize}px</span>
                          </div>
                        )}
                        <label style={s.checkRow}>
                          <input type="checkbox" checked={selectedAnn.filled} onChange={e=>updateAnn(selAnn,{filled:e.target.checked})} />
                          <span style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>Remplissage fond</span>
                        </label>
                      </div>
                    )}

                    {/* List of annotations */}
                    {annotations.length>0 && (
                      <div style={s.sideList}>
                        {annotations.map(ann=>(
                          <div key={ann.id} style={{...s.annListItem,...(selAnn===ann.id?s.annListItemSel:{})}}
                            onClick={()=>setSelAnn(selAnn===ann.id?null:ann.id)}>
                            <div style={s.annListIcon}>
                              {ann.type==='rect'?<RectIcon size={12}/>:ann.type==='ellipse'?<CircleIcon size={12}/>:<TextIcon size={12}/>}
                            </div>
                            <div style={s.annListInfo}>
                              <span style={{fontSize:11,color:'rgba(255,255,255,.7)'}}>{ann.type==='text'?ann.text.slice(0,20)||'Texte':ann.type} · p.{ann.pageIndex+1}</span>
                            </div>
                            <div style={{display:'flex',gap:2,alignItems:'center'}}>
                              <div style={{width:10,height:10,borderRadius:2,background:ann.strokeColor,border:'1px solid rgba(255,255,255,.2)'}}/>
                              <div style={{width:10,height:10,borderRadius:2,background:ann.bgColor,border:'1px solid rgba(255,255,255,.2)'}}/>
                            </div>
                            <button style={s.sideReset} onClick={e=>{e.stopPropagation();deleteAnn(ann.id);if(selAnn===ann.id)setSelAnn(null)}}>
                              <TrashIcon size={10}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {annotations.length===0 && !selectedAnn && (
                      <div style={s.sideEmpty}>Aucune annotation.<br/><span style={{opacity:.5,fontSize:11}}>Choisissez un outil et dessinez sur le PDF.</span></div>
                    )}
                  </div>
                )}

                {(editedCount>0||annotations.length>0) && (
                  <button style={s.exportSide} onClick={handleExport} disabled={exporting}>
                    {exporting?'Génération…':<><DownloadIcon size={13}/> Exporter le PDF</>}
                  </button>
                )}

                <div style={s.sideInfo}>
                  <div style={s.sideInfoRow}><span>Fichier</span><span style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pdfName}</span></div>
                  <div style={s.sideInfoRow}><span>Pages</span><span>{totalPages}</span></div>
                  <div style={s.sideInfoRow}><span>Zones p.{pageIndex+1}</span><span>{zones.length}</span></div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

// ── Annotation overlay component ─────────────────────────────
function AnnOverlay({ ann, selected, onSelect, onDelete, onUpdate }) {
  return (
    <div
      onClick={e=>{e.stopPropagation();onSelect()}}
      style={{
        position:'absolute', left:ann.x, top:ann.y,
        width:Math.max(ann.w,10), height:Math.max(ann.h,10),
        cursor:'pointer', boxSizing:'border-box',
        outline: selected ? '2px solid #6366f1' : '1px dashed rgba(99,102,241,0.4)',
        pointerEvents:'auto',
        borderRadius: ann.type==='ellipse' ? '50%' : ann.type==='text' ? 4 : 2,
        background: ann.filled||ann.type==='text' ? ann.bgColor+'cc' : 'transparent',
        borderWidth: ann.strokeWidth,
        borderStyle: 'solid',
        borderColor: ann.strokeColor,
      }}
    >
      {ann.type==='text' && (
        <div style={{padding:'2px 4px',fontSize:ann.fontSize,color:ann.textColor,whiteSpace:'pre-wrap',wordBreak:'break-word',lineHeight:1.3,pointerEvents:'none'}}>
          {ann.text}
        </div>
      )}
      {selected && (
        <button
          onClick={e=>{e.stopPropagation();onDelete()}}
          style={{position:'absolute',top:-10,right:-10,width:18,height:18,borderRadius:'50%',background:'#ef4444',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',zIndex:20,pointerEvents:'auto'}}
        >
          <TrashIcon size={9}/>
        </button>
      )}
    </div>
  )
}

function DrawPreview({ ann }) {
  return (
    <div style={{
      position:'absolute', left:ann.x, top:ann.y,
      width:Math.max(ann.w,2), height:Math.max(ann.h,2),
      boxSizing:'border-box', pointerEvents:'none',
      border:`${ann.strokeWidth}px dashed ${ann.strokeColor}`,
      background: (ann.filled||ann.type==='text') ? ann.bgColor+'66' : 'transparent',
      borderRadius: ann.type==='ellipse' ? '50%' : ann.type==='text' ? 4 : 0,
    }}/>
  )
}

// ─────────────────────────────────────────────────────────────
const s = {
  root:     { minHeight:'100vh', background:'#0f1117', color:'#e2e8f0', fontFamily:"'IBM Plex Sans','Segoe UI',system-ui,sans-serif", display:'flex', flexDirection:'column' },
  header:   { height:56, background:'rgba(15,17,23,.97)', borderBottom:'1px solid rgba(255,255,255,.07)', backdropFilter:'blur(20px)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', gap:10, position:'sticky', top:0, zIndex:100, flexShrink:0 },
  hLeft:    { display:'flex', alignItems:'center', gap:10, flexShrink:0 },
  logoBox:  { width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center' },
  logoText: { fontSize:14, fontWeight:700, letterSpacing:'-0.3px', color:'#f1f5f9' },
  logoSub:  { fontSize:10, color:'rgba(255,255,255,.28)', marginTop:1 },
  hRight:   { display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' },
  zoomRow:  { display:'flex', alignItems:'center', gap:3, background:'rgba(255,255,255,.05)', borderRadius:7, padding:'3px 5px' },
  zoomLbl:  { fontSize:11, fontWeight:600, color:'rgba(255,255,255,.45)', minWidth:34, textAlign:'center' },
  iconBtn:  { width:22, height:22, borderRadius:5, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 },
  editBadge:{ fontSize:11, fontWeight:700, background:'rgba(99,102,241,.2)', color:'#818cf8', border:'1px solid rgba(99,102,241,.35)', borderRadius:99, padding:'2px 9px' },
  exportBtn:{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:8, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:12, fontWeight:700 },
  wordBtn:  { display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:8, border:'1px solid rgba(16,185,129,.35)', background:'rgba(16,185,129,.1)', color:'#6ee7b7', fontSize:12, fontWeight:700, cursor:'pointer' },
  wordBtnActive: { opacity:.7, cursor:'not-allowed' },
  uploadBtn:{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.6)', fontSize:12, fontWeight:600, cursor:'pointer' },
  spinner:  { display:'inline-block', width:11, height:11, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin .7s linear infinite' },
  statusBar:{ display:'flex', alignItems:'center', gap:7, padding:'8px 18px', fontSize:12, fontWeight:500, flexShrink:0, borderBottom:'1px solid transparent' },
  sOk:      { background:'rgba(16,185,129,.1)', color:'#6ee7b7', borderColor:'rgba(16,185,129,.2)' },
  sErr:     { background:'rgba(239,68,68,.1)', color:'#fca5a5', borderColor:'rgba(239,68,68,.2)' },
  sInfo:    { background:'rgba(99,102,241,.08)', color:'#a5b4fc', borderColor:'rgba(99,102,241,.15)' },
  sClose:   { marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'inherit', opacity:.5, fontSize:12 },
  body:     { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  // Toolbar
  toolbar:  { background:'#13151f', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'8px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0, flexWrap:'wrap' },
  toolGroup:{ display:'flex', gap:4 },
  toolBtn:  { display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.03)', color:'rgba(255,255,255,.55)', fontSize:11, fontWeight:600, cursor:'pointer' },
  toolBtnActive:{ background:'rgba(99,102,241,.2)', borderColor:'rgba(99,102,241,.5)', color:'#a5b4fc' },
  toolLbl:  { fontSize:11 },
  toolStyleRow:{ display:'flex', alignItems:'center', gap:8 },
  miniSwatch:{ width:16, height:16, borderRadius:4, cursor:'pointer', flexShrink:0 },
  toolHint: { fontSize:10, color:'rgba(255,255,255,.3)' },
  // Canvas area
  canvasArea:{ flex:1, display:'flex', overflow:'hidden' },
  canvasWrap:{ flex:1, overflow:'auto', padding:24, display:'flex', justifyContent:'flex-start', alignItems:'flex-start', background:'#191c27' },
  canvas:   { display:'block', boxShadow:'0 8px 40px rgba(0,0,0,.7)', borderRadius:3 },
  overlay:  { position:'absolute', inset:0, pointerEvents:'none' },
  // Sidebar
  sidebar:  { width:288, flexShrink:0, background:'#13151f', borderLeft:'1px solid rgba(255,255,255,.07)', display:'flex', flexDirection:'column', overflow:'hidden' },
  sideTabs: { display:'flex', borderBottom:'1px solid rgba(255,255,255,.07)', flexShrink:0 },
  sideTab:  { flex:1, padding:'10px 8px', fontSize:11, fontWeight:600, color:'rgba(255,255,255,.35)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 },
  sideTabActive:{ color:'#a5b4fc', borderBottom:'2px solid #6366f1' },
  tabBadge: { fontSize:9, fontWeight:800, background:'#6366f1', color:'#fff', borderRadius:99, padding:'1px 5px', minWidth:16, textAlign:'center' },
  sideContent:{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' },
  // Annotation styles section
  styleSection:{ borderBottom:'1px solid rgba(255,255,255,.06)', padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 },
  styleSectionTitle:{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', display:'flex', alignItems:'center', gap:5 },
  sliderRow:{ display:'flex', alignItems:'center', gap:6 },
  sliderLbl:{ fontSize:10, color:'rgba(255,255,255,.35)', width:72, flexShrink:0 },
  slider:   { flex:1, accentColor:'#6366f1' },
  sliderVal:{ fontSize:10, color:'rgba(255,255,255,.5)', width:28, textAlign:'right' },
  checkRow: { display:'flex', alignItems:'center', gap:6, cursor:'pointer' },
  annTextarea:{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:6, color:'#e2e8f0', fontSize:12, padding:'6px 8px', resize:'vertical', fontFamily:'inherit' },
  // Color picker
  cpWrap:   { display:'flex', flexDirection:'column', gap:4 },
  cpLabel:  { fontSize:10, color:'rgba(255,255,255,.35)' },
  cpRow:    { display:'flex', alignItems:'center', gap:6 },
  cpSwatch: { width:22, height:22, borderRadius:5, border:'1px solid rgba(255,255,255,.2)', flexShrink:0 },
  cpNative: { width:22, height:22, border:'none', borderRadius:5, cursor:'pointer', padding:0, background:'none', flexShrink:0 },
  cpText:   { flex:1, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:5, color:'#e2e8f0', fontSize:11, padding:'3px 6px', fontFamily:'monospace' },
  cpPresets:{ display:'flex', flexWrap:'wrap', gap:3 },
  cpPreset: { width:16, height:16, borderRadius:3, border:'none', cursor:'pointer', flexShrink:0, padding:0 },
  // Annotations list
  annListItem:{ display:'flex', alignItems:'center', gap:7, padding:'7px 12px', borderBottom:'1px solid rgba(255,255,255,.04)', cursor:'pointer' },
  annListItemSel:{ background:'rgba(99,102,241,.1)' },
  annListIcon:{ color:'rgba(255,255,255,.4)', flexShrink:0 },
  annListInfo:{ flex:1, minWidth:0 },
  sideList: { flex:1, overflowY:'auto' },
  sideEmpty:{ padding:20, fontSize:12, color:'rgba(255,255,255,.3)', lineHeight:1.7, textAlign:'center' },
  sideItem: { display:'flex', alignItems:'flex-start', gap:7, padding:'7px 13px', borderBottom:'1px solid rgba(255,255,255,.04)' },
  sideItemPg:{ fontSize:9, fontWeight:700, color:'#6366f1', background:'rgba(99,102,241,.15)', borderRadius:4, padding:'2px 5px', flexShrink:0, marginTop:2 },
  sideItemContent:{ flex:1, minWidth:0 },
  sideOrig: { fontSize:11, color:'rgba(255,255,255,.35)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  sideArr:  { fontSize:10, color:'rgba(255,255,255,.2)', margin:'2px 0' },
  sideNew:  { fontSize:11, color:'#a5b4fc', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  sideReset:{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.25)', flexShrink:0, padding:3, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:5 },
  exportSide:{ margin:'10px 14px', padding:10, borderRadius:9, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6, flexShrink:0 },
  sideInfo: { borderTop:'1px solid rgba(255,255,255,.06)', padding:'10px 14px', display:'flex', flexDirection:'column', gap:5, flexShrink:0 },
  sideInfoRow:{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.25)' },
  // Drop zone
  dropZone: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, cursor:'pointer', border:'2px dashed rgba(99,102,241,.25)', borderRadius:18, margin:28, background:'rgba(99,102,241,.03)', transition:'all .2s' },
  dropActive:{ borderColor:'rgba(99,102,241,.7)', background:'rgba(99,102,241,.08)' },
  dropIcon: { width:68, height:68, borderRadius:18, background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.25)', display:'flex', alignItems:'center', justifyContent:'center' },
  dropTitle:{ fontSize:20, fontWeight:700, color:'#e2e8f0', letterSpacing:'-0.3px' },
  dropSub:  { fontSize:13, color:'rgba(255,255,255,.3)' },
  dropNote: { display:'flex', alignItems:'center', gap:6, fontSize:11, color:'rgba(99,102,241,.7)', background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.2)', borderRadius:99, padding:'4px 12px' },
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
@keyframes spin { to { transform: rotate(360deg) } }
* { box-sizing: border-box; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 3px; }

/* text zones are fully transparent — no visual traces */
.pz-zone [contenteditable]:focus { outline: none; }
`