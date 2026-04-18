'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Download, Trash2, Type, Image, Square, Circle,
  Maximize2, Minimize2, ZoomIn, ZoomOut,
  AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, ArrowUp, ArrowDown,
  RotateCcw, FlipHorizontal, Layers
} from 'lucide-react'

const FONTS = [
  { value: 'system-ui', label: 'Système' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Courier New', monospace", label: 'Courier' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: "'Arial Black', sans-serif", label: 'Arial Black' },
  { value: "'Times New Roman', serif", label: 'Times' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
]

const EXPORT_SIZES = [
  { id: '1x1', label: '1:1 (1080×1080)', w: 1080, h: 1080 },
  { id: '4x5', label: '4:5 (1080×1350)', w: 1080, h: 1350 },
  { id: '16x9', label: '16:9 (1920×1080)', w: 1920, h: 1080 },
  { id: '9x16', label: '9:16 Story (1080×1920)', w: 1080, h: 1920 },
]

export default function VisualEditor({
  elements, setElements, bgImage, setBgImage, bgColor, setBgColor,
  selected, setSelected, dragging, setDragging, resizing, setResizing,
  editingElId, setEditingElId, editingElText, setEditingElText,
  canvasRef, fileRef, bgFileRef,
  addElement, deleteEl, updateEl,
  handleBgImage, handleImageInsert,
  startElDrag, startElResize, startElEdit, commitElEdit,
  handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp,
}) {
  const [zoom, setZoom] = useState(100)
  const [fullscreen, setFullscreen] = useState(false)
  const [exportSize, setExportSize] = useState('1x1')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [canvasAspect, setCanvasAspect] = useState('1/1')
  const editorRef = useRef(null)

  const selectedEl = elements.find(e => e.id === selected)

  const bringForward = () => {
    if (!selected) return
    setElements(prev => {
      const idx = prev.findIndex(e => e.id === selected)
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
  }

  const sendBackward = () => {
    if (!selected) return
    setElements(prev => {
      const idx = prev.findIndex(e => e.id === selected)
      if (idx <= 0) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]
      return arr
    })
  }

  const transformText = (mode) => {
    if (!selected) return
    setElements(prev => prev.map(el => {
      if (el.id !== selected) return el
      const t = el.text
      return { ...el, text: mode === 'upper' ? t.toUpperCase() : t.toLowerCase() }
    }))
  }

  const duplicateEl = () => {
    if (!selected) return
    const el = elements.find(e => e.id === selected)
    if (!el) return
    const newEl = { ...el, id: `el_${Date.now()}`, x: el.x + 20, y: el.y + 20 }
    setElements(prev => [...prev, newEl])
    setSelected(newEl.id)
  }

  const handleExport = async (format = 'png') => {
    const el = canvasRef.current
    if (!el) return
    setShowExportMenu(false)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const size = EXPORT_SIZES.find(s => s.id === exportSize) || EXPORT_SIZES[0]
      const canvas = await html2canvas(el, {
        scale: size.w / el.offsetWidth,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      })
      if (format === 'png') {
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = `post-${Date.now()}.png`
        a.click()
      } else if (format === 'jpg') {
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/jpeg', 0.95)
        a.download = `post-${Date.now()}.jpg`
        a.click()
      } else if (format === 'copy') {
        canvas.toBlob(blob => {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        })
      }
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && fullscreen) setFullscreen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fullscreen])

  useEffect(() => {
    const size = EXPORT_SIZES.find(s => s.id === exportSize)
    if (size) setCanvasAspect(`${size.w}/${size.h}`)
  }, [exportSize])

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  const editorContent = (
    <div className={`flex flex-col gap-3 ${fullscreen ? 'h-full' : ''}`}>

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black">Visuel du post</h2>
          <p className="text-slate-500 text-xs mt-0.5">Double-clic: éditer · Glisser: déplacer · Coin ↘: redimensionner</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={exportSize} onChange={e => setExportSize(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white">
            {EXPORT_SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="relative">
            <button onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-xs font-black transition-all">
              <Download size={12} /> Exporter
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl p-1 z-50 min-w-[160px] shadow-2xl">
                {[
                  { label: '📥 PNG (haute qualité)', fn: () => handleExport('png') },
                  { label: '📷 JPG (compressé)', fn: () => handleExport('jpg') },
                  { label: '📋 Copier image', fn: () => handleExport('copy') },
                ].map((item, i) => (
                  <button key={i} onClick={item.fn}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/10 rounded-lg transition-all">
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setFullscreen(v => !v)}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all">
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Add elements toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap bg-white/3 border border-white/8 rounded-xl p-2">
        <span className="text-[9px] text-slate-600 uppercase tracking-widest mr-1 font-black">Ajouter</span>
        {[
          { type: 'text', icon: <Type size={11} />, label: 'Texte' },
          { type: 'rect', icon: <Square size={11} />, label: 'Rect' },
          { type: 'circle', icon: <Circle size={11} />, label: 'Cercle' },
        ].map(item => (
          <button key={item.type} onClick={() => addElement(item.type)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all">
            {item.icon} {item.label}
          </button>
        ))}
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all">
          <Image size={11} /> Image
        </button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <span className="text-[9px] text-slate-600 uppercase tracking-widest mr-1 font-black">Fond</span>
        <button onClick={() => bgFileRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all">
          <Image size={11} /> Image fond
        </button>
        {bgImage && (
          <button onClick={() => setBgImage(null)}
            className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-all">
            ✕ Fond
          </button>
        )}
        <input type="color" value={bgColor}
          onChange={e => { setBgColor(e.target.value); setBgImage(null) }}
          className="w-7 h-7 rounded cursor-pointer border-0" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg"><ZoomIn size={11} /></button>
        <span className="text-xs text-slate-500 w-9 text-center font-bold">{zoom}%</span>
        <button onClick={() => setZoom(z => Math.max(30, z - 10))} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg"><ZoomOut size={11} /></button>
        <button onClick={() => setZoom(100)} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold">Reset</button>
        <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleImageInsert} />
        <input ref={bgFileRef} type="file" hidden accept="image/*" onChange={handleBgImage} />
      </div>

      {/* Element properties toolbar */}
      {selected && selectedEl && (
        <div className="flex items-center gap-1.5 flex-wrap bg-pink-500/5 border border-pink-500/20 rounded-xl p-2">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-pink-400 uppercase font-black">Couleur</span>
            <input type="color" value={selectedEl.color || '#3b82f6'}
              onChange={e => updateEl('color', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0" />
          </div>
          {selectedEl.type !== 'image' && selectedEl.type !== 'text' && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-pink-400 uppercase font-black">Opacité</span>
              <input type="range" min={0} max={1} step={0.05}
                value={selectedEl.bgOpacity ?? 0.85}
                onChange={e => updateEl('bgOpacity', Number(e.target.value))}
                className="w-16 accent-pink-500" />
            </div>
          )}
          <div className="w-px h-5 bg-white/10" />
          {selectedEl.type !== 'image' && (
            <>
              <select value={selectedEl.fontFamily || 'system-ui'}
                onChange={e => updateEl('fontFamily', e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white max-w-[100px]">
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={selectedEl.fontSize || 14}
                onChange={e => updateEl('fontSize', Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white w-16">
                {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 60, 72].map(s =>
                  <option key={s} value={s}>{s}px</option>)}
              </select>
              <button onClick={() => updateEl('bold', !selectedEl.bold)}
                className={`p-1.5 rounded-lg border text-xs font-black transition-all ${selectedEl.bold ? 'bg-pink-500/30 border-pink-500/50 text-pink-300' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <Bold size={11} />
              </button>
              <button onClick={() => updateEl('italic', !selectedEl.italic)}
                className={`p-1.5 rounded-lg border text-xs transition-all ${selectedEl.italic ? 'bg-pink-500/30 border-pink-500/50 text-pink-300' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <Italic size={11} />
              </button>
              {['left', 'center', 'right'].map(align => (
                <button key={align} onClick={() => updateEl('textAlign', align)}
                  className={`p-1.5 rounded-lg border transition-all ${selectedEl.textAlign === align ? 'bg-pink-500/30 border-pink-500/50 text-pink-300' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  {align === 'left' ? <AlignLeft size={11} /> : align === 'center' ? <AlignCenter size={11} /> : <AlignRight size={11} />}
                </button>
              ))}
              <div className="w-px h-5 bg-white/10" />
              <button onClick={() => transformText('upper')} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black text-slate-400">AA</button>
              <button onClick={() => transformText('lower')} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black text-slate-400">aa</button>
            </>
          )}
          <div className="w-px h-5 bg-white/10" />
          <button onClick={bringForward} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg"><ArrowUp size={11} /></button>
          <button onClick={sendBackward} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg"><ArrowDown size={11} /></button>
          <div className="flex items-center gap-1">
            <RotateCcw size={11} className="text-slate-500" />
            <input type="range" min={-180} max={180} step={1}
              value={selectedEl.rotation || 0}
              onChange={e => updateEl('rotation', Number(e.target.value))}
              className="w-16 accent-pink-500" />
            <span className="text-[10px] text-slate-500 w-8">{selectedEl.rotation || 0}°</span>
          </div>
          <button onClick={() => updateEl('flipX', !selectedEl.flipX)}
            className={`p-1.5 rounded-lg border transition-all ${selectedEl.flipX ? 'bg-pink-500/30 border-pink-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <FlipHorizontal size={11} />
          </button>
          <div className="w-px h-5 bg-white/10" />
          {['x', 'y', 'width', 'height'].map(prop => (
            <div key={prop} className="flex items-center gap-1">
              <span className="text-[9px] text-slate-600 font-black">{prop === 'width' ? 'W' : prop === 'height' ? 'H' : prop.toUpperCase()}</span>
              <input type="number" value={Math.round(selectedEl[prop])}
                onChange={e => updateEl(prop, Number(e.target.value))}
                className="w-14 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white" />
            </div>
          ))}
          <div className="w-px h-5 bg-white/10" />
          <button onClick={duplicateEl} className="flex items-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold">
            <Layers size={11} /> Dupliquer
          </button>
          <button onClick={deleteEl} className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg border border-red-500/20">
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className={`overflow-auto rounded-2xl border border-white/10 bg-[#0a0a14] ${fullscreen ? 'flex-1' : ''}`}
        style={{ maxHeight: fullscreen ? 'calc(100vh - 240px)' : 520 }}>
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000 / zoom}%` }}>
          <div
            ref={canvasRef}
            className="relative select-none"
            style={{
              aspectRatio: canvasAspect,
              width: '100%',
              maxWidth: fullscreen ? '100%' : 500,
              background: bgImage ? `url(${bgImage}) center/cover no-repeat` : bgColor,
              cursor: dragging ? 'grabbing' : 'default',
              margin: '0 auto',
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {elements.map(el => {
              const isSelected = selected === el.id
              const isEditing = editingElId === el.id
              const transform = [
                el.flipX ? 'scaleX(-1)' : '',
                el.rotation ? `rotate(${el.rotation}deg)` : '',
              ].filter(Boolean).join(' ')
              const baseStyle = {
                position: 'absolute', left: el.x, top: el.y,
                width: el.width, height: el.height, cursor: 'move',
                userSelect: 'none', transform: transform || undefined,
                transformOrigin: 'center center', boxSizing: 'border-box',
              }
              const resizeHandles = isSelected && (
                <>
                  {[['bottom', 'right', 'nwse'], ['bottom', 'left', 'nesw'], ['top', 'right', 'nesw'], ['top', 'left', 'nwse']].map(([v, h, cur], i) => (
                    <div key={i} style={{ position: 'absolute', [v]: -5, [h]: -5, width: 14, height: 14, background: '#fff', borderRadius: 3, cursor: `${cur}-resize`, border: '1px solid #888', zIndex: 10 }}
                      onMouseDown={e => startElResize(e, el)} />
                  ))}
                </>
              )

              if (el.type === 'image') return (
                <div key={el.id} style={{ ...baseStyle, outline: isSelected ? '2px solid #ec4899' : 'none', outlineOffset: 1, borderRadius: 4 }}
                  onMouseDown={e => startElDrag(e, el)}
                  onClick={e => { e.stopPropagation(); setSelected(el.id) }}>
                  <img src={el.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                  {resizeHandles}
                </div>
              )

              if (el.type === 'circle') return (
                <div key={el.id} style={{
                  ...baseStyle, borderRadius: '50%',
                  background: hexToRgba(el.color, el.bgOpacity ?? 0.85),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  outline: isSelected ? '2px solid #ec4899' : 'none', outlineOffset: 1,
                }}
                  onMouseDown={e => startElDrag(e, el)}
                  onDoubleClick={e => startElEdit(e, el)}
                  onClick={e => { e.stopPropagation(); setSelected(el.id) }}>
                  {isEditing ? (
                    <input autoFocus value={editingElText} onChange={e => setEditingElText(e.target.value)}
                      onBlur={commitElEdit}
                      style={{ background: 'transparent', color: '#fff', textAlign: el.textAlign || 'center', fontSize: el.fontSize || 14, fontWeight: el.bold ? 700 : 400, fontStyle: el.italic ? 'italic' : 'normal', fontFamily: el.fontFamily || 'system-ui', border: 'none', outline: 'none', width: '90%' }} />
                  ) : (
                    <span style={{ color: '#fff', fontSize: el.fontSize || 14, fontWeight: el.bold ? 700 : 400, fontStyle: el.italic ? 'italic' : 'normal', fontFamily: el.fontFamily || 'system-ui', textAlign: el.textAlign || 'center' }}>{el.text}</span>
                  )}
                  {resizeHandles}
                </div>
              )

              return (
                <div key={el.id} style={{
                  ...baseStyle,
                  borderRadius: el.type === 'rect' ? 8 : 0,
                  background: el.type === 'text'
                    ? (el.bgOpacity > 0 ? hexToRgba(el.color, el.bgOpacity) : 'transparent')
                    : hexToRgba(el.color, el.bgOpacity ?? 0.85),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  outline: isSelected ? '2px solid #ec4899' : el.type === 'text' ? '1px dashed rgba(255,255,255,0.12)' : 'none',
                  outlineOffset: 1, padding: 8,
                }}
                  onMouseDown={e => startElDrag(e, el)}
                  onDoubleClick={e => startElEdit(e, el)}
                  onClick={e => { e.stopPropagation(); setSelected(el.id) }}>
                  {isEditing ? (
                    <textarea autoFocus value={editingElText} onChange={e => setEditingElText(e.target.value)}
                      onBlur={commitElEdit}
                      style={{ background: 'transparent', color: '#fff', fontSize: el.fontSize || 14, fontWeight: el.bold ? 700 : 400, fontStyle: el.italic ? 'italic' : 'normal', fontFamily: el.fontFamily || 'system-ui', textAlign: el.textAlign || 'center', border: 'none', outline: 'none', width: '100%', height: '100%', resize: 'none' }} />
                  ) : (
                    <span style={{ color: el.type === 'text' && el.bgOpacity === 0 ? el.color : '#fff', fontSize: el.fontSize || 14, fontWeight: el.bold ? 700 : 400, fontStyle: el.italic ? 'italic' : 'normal', fontFamily: el.fontFamily || 'system-ui', textAlign: el.textAlign || 'center', lineHeight: 1.4, wordBreak: 'break-word', width: '100%' }}>{el.text}</span>
                  )}
                  {resizeHandles}
                </div>
              )
            })}
            {elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-white/15 text-sm font-bold text-center px-8">Ajoutez des éléments<br />avec la barre d'outils ci-dessus</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (fullscreen) return (
    <div className="fixed inset-0 bg-[#09090f] z-50 p-6 overflow-auto flex flex-col" ref={editorRef}>
      {editorContent}
    </div>
  )

  return <div ref={editorRef}>{editorContent}</div>
}