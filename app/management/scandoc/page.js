'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// ── Icons (inline SVG to avoid extra imports) ─────────────────────
const Icon = ({ d, size = 20, stroke = 'currentColor', fill = 'none', strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p}/>) : <path d={d}/>}
  </svg>
)

const ICONS = {
  camera:   'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  gallery:  ['M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14','M3 15l5-5 4 4 3-3 5 5'],
  plus:     'M12 5v14M5 12h14',
  trash:    ['M3 6h18','M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6','M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M7 10l5 5 5-5','M12 15V3'],
  rotate:   'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15',
  check:    'M20 6L9 17l-5-5',
  x:        'M18 6L6 18M6 6l12 12',
  scan:     ['M4 7V4h3','M17 4h3v3','M4 17v3h3','M17 20h3v-3','M9 12h6','M12 9v6'],
  expand:   ['M15 3h6v6','M9 21H3v-6','M21 3l-7 7','M3 21l7-7'],
  reorder:  ['M3 12h18','M3 6h18','M3 18h18'],
}

// ── Helpers ────────────────────────────────────────────────────────
const fmtSize = b => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(0)}KB` : `${(b/1048576).toFixed(1)}MB`
const genId   = () => Math.random().toString(36).slice(2, 9)

// Load image as data URL → get natural W/H
const loadImage = src => new Promise((res, rej) => {
  const img = new Image()
  img.onload  = () => res(img)
  img.onerror = rej
  img.src = src
})

// Read File → dataURL
const fileToDataURL = file => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload  = e => res(e.target.result)
  r.onerror = rej
  r.readAsDataURL(file)
})

// ── Page document scanner ──────────────────────────────────────────
export default function ScandocPage() {
  const [pages,    setPages]    = useState([])      // [{id, dataUrl, name, size, rotation, w, h}]
  const [loading,  setLoading]  = useState(false)
  const [genPdf,   setGenPdf]   = useState(false)
  const [preview,  setPreview]  = useState(null)    // id of page in lightbox
  const [docName,  setDocName]  = useState('Document scanné')
  const [drag,     setDrag]     = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [quality,  setQuality]  = useState('high')  // 'draft' | 'medium' | 'high'
  const [pageSize, setPageSize] = useState('auto')  // 'auto' | 'a4' | 'letter'

  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)
  const dragItem   = useRef(null)
  const dragTarget = useRef(null)

  // ── Add pages from files ──
  const addFiles = useCallback(async (files) => {
    if (!files?.length) return
    setLoading(true)
    const newPages = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const dataUrl = await fileToDataURL(file)
        const img     = await loadImage(dataUrl)
        newPages.push({
          id:       genId(),
          dataUrl,
          name:     file.name,
          size:     file.size,
          rotation: 0,
          w:        img.naturalWidth,
          h:        img.naturalHeight,
        })
      } catch {}
    }
    setPages(prev => [...prev, ...newPages])
    setLoading(false)
  }, [])

  // ── Drop zone ──
  const onDrop = e => {
    e.preventDefault(); setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  // ── Rotate a page ──
  const rotatePage = id => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
  }

  // ── Delete a page ──
  const deletePage = id => {
    setPages(prev => prev.filter(p => p.id !== id))
    if (preview === id) setPreview(null)
  }

  // ── Drag-to-reorder ──
  const onDragStart = (e, id) => { dragItem.current = id }
  const onDragEnter = (e, id) => { dragTarget.current = id }
  const onDragEnd   = () => {
    const from = dragItem.current, to = dragTarget.current
    if (!from || !to || from === to) return
    setPages(prev => {
      const arr = [...prev]
      const fi  = arr.findIndex(p => p.id === from)
      const ti  = arr.findIndex(p => p.id === to)
      const [item] = arr.splice(fi, 1)
      arr.splice(ti, 0, item)
      return arr
    })
    dragItem.current = null; dragTarget.current = null
  }

  // ── Generate PDF (client-side via jsPDF dynamic import) ──
  // Mirrors the pattern used in Office2PDF which works reliably.
  const generatePDF = async () => {
    if (!pages.length) return
    setGenPdf(true)
    try {
      // ✅ Use dynamic import (same as Office2PDF) instead of fragile script-tag injection
      const { jsPDF } = await import('jspdf')

      const qMap = { draft: 0.5, medium: 0.75, high: 0.95 }
      const q    = qMap[quality]

      // ── Build first page to initialise the document ──
      const firstPage = pages[0]

      // Helper: compute rotated pixel dimensions for a page
      const getRotatedDims = (page) => {
        const rotated = page.rotation === 90 || page.rotation === 270
        return {
          pxW: rotated ? page.h : page.w,
          pxH: rotated ? page.w : page.h,
        }
      }

      // Helper: create jsPDF instance / add page with correct size
      const makeDocOrPage = (pdf, page, isFirst) => {
        const { pxW, pxH } = getRotatedDims(page)
        const isPortrait = pxH >= pxW

        if (pageSize === 'auto') {
          const mmW = pxW * 0.264583
          const mmH = pxH * 0.264583
          if (isFirst) {
            return new jsPDF({
              orientation: isPortrait ? 'portrait' : 'landscape',
              unit: 'mm',
              format: [mmW, mmH],
            })
          }
          pdf.addPage([mmW, mmH], isPortrait ? 'portrait' : 'landscape')
          return pdf
        } else {
          const orient = isPortrait ? 'portrait' : 'landscape'
          if (isFirst) {
            return new jsPDF({ orientation: orient, unit: 'mm', format: pageSize })
          }
          pdf.addPage(pageSize, orient)
          return pdf
        }
      }

      let pdf = makeDocOrPage(null, firstPage, true)

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        if (i > 0) makeDocOrPage(pdf, page, false)

        // ── Render image with rotation onto a canvas ──
        const imgEl  = await loadImage(page.dataUrl)
        const canvas = document.createElement('canvas')
        const rot    = page.rotation
        const rotated = rot === 90 || rot === 270
        canvas.width  = rotated ? imgEl.naturalHeight : imgEl.naturalWidth
        canvas.height = rotated ? imgEl.naturalWidth  : imgEl.naturalHeight

        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rot * Math.PI) / 180)
        ctx.drawImage(imgEl, -imgEl.naturalWidth / 2, -imgEl.naturalHeight / 2)
        ctx.restore()

        const rotatedDataUrl = canvas.toDataURL('image/jpeg', q)

        // ── Fit image centred inside the PDF page ──
        const pW = pdf.internal.pageSize.getWidth()
        const pH = pdf.internal.pageSize.getHeight()
        const imgW = canvas.width  * 0.264583   // px → mm
        const imgH = canvas.height * 0.264583
        const ratio = Math.min(pW / imgW, pH / imgH)
        const dW = imgW * ratio
        const dH = imgH * ratio
        const x  = (pW - dW) / 2
        const y  = (pH - dH) / 2

        pdf.addImage(rotatedDataUrl, 'JPEG', x, y, dW, dH)
      }

      const safeName = docName.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') || 'scan'
      pdf.save(`${safeName}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Erreur lors de la génération du PDF : ' + err.message)
    }
    setGenPdf(false)
  }

  // Preview page
  const previewPage = pages.find(p => p.id === preview)
  const previewIdx  = pages.findIndex(p => p.id === preview)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,800;1,9..144,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink:     #0e0e0f;
          --paper:   #f5f2ec;
          --cream:   #ede8df;
          --warm:    #d4cbbf;
          --accent:  #c8440a;
          --accent2: #1a6b4a;
          --blue:    #1a3a5c;
          --muted:   #7a7063;
          --border:  #c8c0b4;
          --shadow:  rgba(14,14,15,.12);
        }

        body { background: var(--paper); }

        .scan-root {
          min-height: 100vh;
          background: var(--paper);
          font-family: 'DM Mono', monospace;
          color: var(--ink);
        }

        /* Header */
        .scan-header {
          background: var(--ink);
          color: var(--paper);
          padding: 0 32px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .scan-logo {
          font-family: 'Fraunces', serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -.02em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .scan-logo-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--accent);
        }
        .scan-header-info {
          font-size: 11px;
          color: #7a7a7a;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        /* Main layout */
        .scan-body {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }

        /* Drop zone */
        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: 4px;
          padding: 56px 32px;
          text-align: center;
          cursor: pointer;
          transition: all .2s;
          background: var(--cream);
          position: relative;
          overflow: hidden;
        }
        .drop-zone::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 8px,
            rgba(200,68,10,.03) 8px,
            rgba(200,68,10,.03) 9px
          );
        }
        .drop-zone.over {
          border-color: var(--accent);
          background: #fdf5f0;
        }
        .drop-title {
          font-family: 'Fraunces', serif;
          font-size: 26px;
          font-weight: 300;
          font-style: italic;
          color: var(--ink);
          margin-bottom: 8px;
        }
        .drop-sub {
          font-size: 11px;
          color: var(--muted);
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-bottom: 28px;
        }
        .drop-btns {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 2px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .04em;
          cursor: pointer;
          border: none;
          transition: all .15s;
          text-transform: uppercase;
        }
        .btn-primary {
          background: var(--ink);
          color: var(--paper);
        }
        .btn-primary:hover { background: #2a2a2b; }
        .btn-secondary {
          background: transparent;
          color: var(--ink);
          border: 1.5px solid var(--border);
        }
        .btn-secondary:hover { border-color: var(--ink); background: var(--cream); }
        .btn-accent {
          background: var(--accent);
          color: #fff;
        }
        .btn-accent:hover { background: #b33a08; }
        .btn-danger {
          background: transparent;
          color: #c0392b;
          border: 1.5px solid #e8c5c1;
        }
        .btn-danger:hover { background: #fdf0ef; }
        .btn:disabled { opacity: .4; cursor: not-allowed; }

        /* Toolbar */
        .toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .toolbar-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .toolbar-sep {
          width: 1px;
          height: 24px;
          background: var(--border);
          margin: 0 4px;
        }
        .doc-name-input {
          font-family: 'Fraunces', serif;
          font-size: 18px;
          font-weight: 300;
          font-style: italic;
          border: none;
          background: transparent;
          color: var(--ink);
          outline: none;
          border-bottom: 1.5px solid transparent;
          padding-bottom: 2px;
          transition: border-color .15s;
          min-width: 180px;
        }
        .doc-name-input:focus { border-bottom-color: var(--accent); }
        .doc-name-input::placeholder { color: var(--muted); }

        select.scan-select {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: .04em;
          text-transform: uppercase;
          border: 1.5px solid var(--border);
          background: var(--cream);
          color: var(--ink);
          padding: 6px 10px;
          border-radius: 2px;
          cursor: pointer;
          outline: none;
        }
        select.scan-select:focus { border-color: var(--ink); }

        .page-count {
          font-size: 11px;
          color: var(--muted);
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-left: auto;
        }

        /* Page grid */
        .pages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
        }

        /* Page card */
        .page-card {
          background: white;
          border: 1.5px solid var(--border);
          border-radius: 2px;
          overflow: hidden;
          cursor: grab;
          transition: all .2s;
          position: relative;
          box-shadow: 2px 3px 12px var(--shadow);
        }
        .page-card:hover { border-color: var(--ink); box-shadow: 4px 6px 20px var(--shadow); transform: translateY(-2px); }
        .page-card.dragging { opacity: .4; cursor: grabbing; }
        .page-card.drag-over { border-color: var(--accent); border-style: dashed; }

        .page-thumb {
          width: 100%;
          aspect-ratio: 3/4;
          object-fit: cover;
          display: block;
          background: var(--cream);
          transition: transform .3s;
        }

        .page-overlay {
          position: absolute;
          inset: 0;
          background: rgba(14,14,15,0);
          transition: background .2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transition: opacity .2s;
        }
        .page-card:hover .page-overlay { opacity: 1; background: rgba(14,14,15,.5); }

        .page-action {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: rgba(245,242,236,.9);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          transition: background .15s, transform .15s;
        }
        .page-action:hover { background: white; transform: scale(1.1); }
        .page-action.danger { color: var(--accent); }

        .page-footer {
          padding: 8px 10px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .page-num {
          font-size: 10px;
          font-weight: 500;
          color: var(--muted);
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .page-size-label {
          font-size: 10px;
          color: var(--warm);
          letter-spacing: .04em;
        }

        /* Add card */
        .add-card {
          border: 2px dashed var(--border);
          border-radius: 2px;
          aspect-ratio: 3/4;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          cursor: pointer;
          transition: all .2s;
          background: var(--cream);
        }
        .add-card:hover { border-color: var(--accent); background: #fdf5f0; }
        .add-card-title {
          font-family: 'Fraunces', serif;
          font-size: 13px;
          font-weight: 300;
          font-style: italic;
          color: var(--muted);
        }
        .add-card-btns {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 80%;
        }
        .add-card-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border-radius: 2px;
          border: 1.5px solid var(--border);
          background: white;
          color: var(--ink);
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: .04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all .15s;
        }
        .add-card-btn:hover { border-color: var(--ink); background: var(--cream); }

        /* Bottom bar */
        .bottom-bar {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: var(--ink);
          padding: 14px 32px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 40;
        }
        .bottom-info {
          font-size: 11px;
          color: #7a7a7a;
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .bottom-info strong { color: var(--paper); }
        .progress-bar {
          height: 3px;
          background: var(--accent);
          border-radius: 99px;
          transition: width .3s;
          position: absolute;
          top: 0; left: 0;
        }

        /* Lightbox */
        .lightbox {
          position: fixed;
          inset: 0;
          background: rgba(14,14,15,.92);
          z-index: 200;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .lightbox-img {
          max-width: 90vw;
          max-height: 80vh;
          object-fit: contain;
          border: 2px solid #2a2a2b;
          box-shadow: 0 24px 60px rgba(0,0,0,.5);
        }
        .lightbox-nav {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 20px;
        }
        .lightbox-close {
          position: absolute;
          top: 20px; right: 20px;
          background: transparent;
          border: 1.5px solid #3a3a3b;
          color: #aaa;
          width: 40px; height: 40px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: all .15s;
        }
        .lightbox-close:hover { border-color: var(--paper); color: var(--paper); }
        .lightbox-counter {
          font-size: 11px;
          color: #6a6a6b;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        /* Loading */
        .scan-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: var(--cream);
          border: 1.5px solid var(--border);
          border-radius: 2px;
          font-size: 12px;
          color: var(--muted);
          letter-spacing: .04em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Empty state */
        .empty-hint {
          font-size: 11px;
          color: var(--muted);
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-top: 12px;
          line-height: 1.8;
        }

        /* Rotation badge */
        .rot-badge {
          position: absolute;
          top: 8px; left: 8px;
          background: rgba(14,14,15,.7);
          color: var(--paper);
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 2px;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        /* Responsive */
        @media (max-width: 600px) {
          .scan-body { padding: 24px 12px 80px; }
          .pages-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .bottom-bar { padding: 12px 16px; flex-wrap: wrap; }
          .scan-header { padding: 0 16px; }
        }
      `}</style>

      <div className="scan-root">
        {/* Header */}
        <header className="scan-header">
          <div className="scan-logo">
            <div className="scan-logo-dot"/>
            ScaDoc
          </div>
          <div className="scan-header-info">
            Scanner de documents → PDF
          </div>
        </header>

        <div className="scan-body">

          {/* Drop zone (shown when no pages) */}
          {pages.length === 0 && (
            <div
              className={`drop-zone ${dragOver ? 'over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => galleryRef.current?.click()}
            >
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⬚</div>
                <div className="drop-title">Déposez vos photos ici</div>
                <div className="drop-sub">ou choisissez une source</div>
                <div className="drop-btns" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-primary" onClick={() => cameraRef.current?.click()}>
                    <Icon d={ICONS.camera} size={16}/> Appareil photo
                  </button>
                  <button className="btn btn-secondary" onClick={() => galleryRef.current?.click()}>
                    <Icon d={ICONS.gallery} size={16}/> Galerie / dossier
                  </button>
                </div>
                <div className="empty-hint">
                  JPG · PNG · WEBP · HEIC acceptés<br/>
                  Plusieurs fichiers à la fois · Glisser-déposer supporté
                </div>
              </div>
            </div>
          )}

          {/* Toolbar (shown when pages exist) */}
          {pages.length > 0 && (
            <div className="toolbar">
              <input
                className="doc-name-input"
                value={docName}
                onChange={e => setDocName(e.target.value)}
                placeholder="Nom du document…"
              />
              <div className="toolbar-sep"/>
              <div className="toolbar-section">
                <span style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>Format</span>
                <select className="scan-select" value={pageSize} onChange={e => setPageSize(e.target.value)}>
                  <option value="auto">Auto (image)</option>
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </div>
              <div className="toolbar-section">
                <span style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>Qualité</span>
                <select className="scan-select" value={quality} onChange={e => setQuality(e.target.value)}>
                  <option value="draft">Brouillon</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
              <div className="page-count">
                {pages.length} page{pages.length > 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="scan-loading">
              <div className="spinner"/>
              Chargement des images…
            </div>
          )}

          {/* Pages grid */}
          {pages.length > 0 && (
            <div
              className="pages-grid"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault() }}
            >
              {pages.map((page, idx) => {
                const rotated = page.rotation === 90 || page.rotation === 270
                const thumbStyle = {
                  transform: `rotate(${page.rotation}deg)`,
                  transformOrigin: 'center',
                  ...(rotated ? { transform: `rotate(${page.rotation}deg) scale(${page.h/page.w > 1 ? page.w/page.h : 1})` } : {})
                }
                return (
                  <div key={page.id}
                    className={`page-card ${drag === page.id ? 'dragging' : ''} ${dragTarget.current === page.id && drag !== page.id ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={e => { setDrag(page.id); onDragStart(e, page.id) }}
                    onDragEnd={() => { setDrag(null); onDragEnd() }}
                    onDragEnter={e => onDragEnter(e, page.id)}>

                    {/* Thumb */}
                    <div style={{ position:'relative', overflow:'hidden', background:'var(--cream)', aspectRatio:'3/4' }}>
                      <img
                        src={page.dataUrl}
                        alt={page.name}
                        className="page-thumb"
                        style={{ ...thumbStyle, width:'100%', height:'100%', objectFit:'contain' }}
                      />
                      {page.rotation !== 0 && (
                        <div className="rot-badge">{page.rotation}°</div>
                      )}
                      {/* Hover overlay */}
                      <div className="page-overlay">
                        <button className="page-action" title="Agrandir" onClick={() => setPreview(page.id)}>
                          <Icon d={ICONS.expand} size={15}/>
                        </button>
                        <button className="page-action" title="Pivoter 90°" onClick={() => rotatePage(page.id)}>
                          <Icon d={ICONS.rotate} size={15}/>
                        </button>
                        <button className="page-action danger" title="Supprimer" onClick={() => deletePage(page.id)}>
                          <Icon d={ICONS.trash} size={15}/>
                        </button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="page-footer">
                      <span className="page-num">P.{idx + 1}</span>
                      <span className="page-size-label">{fmtSize(page.size)}</span>
                    </div>
                  </div>
                )
              })}

              {/* Add more card */}
              <div
                className="add-card"
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
              >
                <div className="add-card-title">Ajouter une page</div>
                <div className="add-card-btns">
                  <button className="add-card-btn" onClick={() => cameraRef.current?.click()}>
                    <Icon d={ICONS.camera} size={13}/> Appareil photo
                  </button>
                  <button className="add-card-btn" onClick={() => galleryRef.current?.click()}>
                    <Icon d={ICONS.gallery} size={13}/> Galerie
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden inputs */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value='' }}/>
        <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value='' }}/>

        {/* Bottom bar */}
        {pages.length > 0 && (
          <div className="bottom-bar">
            {genPdf && <div className="progress-bar" style={{ width:'60%' }}/>}
            <div className="bottom-info">
              <strong>{pages.length}</strong> page{pages.length>1?'s':''} ·{' '}
              <strong>{docName || 'Sans nom'}</strong> ·{' '}
              {pageSize === 'auto' ? 'Format auto' : pageSize.toUpperCase()} ·{' '}
              Qualité {quality}
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:10, flexWrap:'wrap' }}>
              <button className="btn btn-secondary" style={{ fontSize:11 }} onClick={() => { setPages([]); setDocName('Document scanné') }}>
                <Icon d={ICONS.x} size={14}/> Tout effacer
              </button>
              <button
                className="btn btn-accent"
                onClick={generatePDF}
                disabled={genPdf || pages.length === 0}
                style={{ fontSize:11 }}
              >
                {genPdf
                  ? <><div className="spinner" style={{ borderColor:'rgba(255,255,255,.3)', borderTopColor:'#fff' }}/> Génération…</>
                  : <><Icon d={ICONS.download} size={15}/> Télécharger le PDF</>
                }
              </button>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {preview && previewPage && (
          <div className="lightbox" onClick={() => setPreview(null)}>
            <button className="lightbox-close" onClick={() => setPreview(null)}>✕</button>
            <img
              src={previewPage.dataUrl}
              alt={previewPage.name}
              className="lightbox-img"
              style={{ transform: `rotate(${previewPage.rotation}deg)` }}
              onClick={e => e.stopPropagation()}
            />
            <div className="lightbox-nav" onClick={e => e.stopPropagation()}>
              <button className="btn btn-secondary" style={{ color: '#aaa', borderColor:'#3a3a3b', background:'transparent', fontSize:11 }}
                onClick={() => setPreview(pages[Math.max(0, previewIdx-1)]?.id)}
                disabled={previewIdx === 0}>
                ← Précédente
              </button>
              <div className="lightbox-counter">
                {previewIdx + 1} / {pages.length} · {fmtSize(previewPage.size)}
              </div>
              <button className="btn btn-secondary" style={{ color: '#aaa', borderColor:'#3a3a3b', background:'transparent', fontSize:11 }}
                onClick={() => setPreview(pages[Math.min(pages.length-1, previewIdx+1)]?.id)}
                disabled={previewIdx === pages.length-1}>
                Suivante →
              </button>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:14 }} onClick={e => e.stopPropagation()}>
              <button className="btn btn-secondary" style={{ color:'#aaa', borderColor:'#3a3a3b', background:'transparent', fontSize:11 }}
                onClick={() => rotatePage(preview)}>
                <Icon d={ICONS.rotate} size={14}/> Pivoter
              </button>
              <button className="btn btn-secondary" style={{ color:'#e87060', borderColor:'#5a3a3a', background:'transparent', fontSize:11 }}
                onClick={() => { deletePage(preview) }}>
                <Icon d={ICONS.trash} size={14}/> Supprimer
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}