'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import {
  Zap, Sparkles, RefreshCw, Download, Trash2, Copy, Check,
  ChevronRight, ChevronLeft, Edit3, Type, Square,
  Circle, Minus, Clock, Hash, Target,
  Maximize2, Minimize2, ZoomIn, ZoomOut,
  AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, ArrowUp, ArrowDown,
  RotateCcw, FlipHorizontal, Layers, Image
} from 'lucide-react'

// ── Constants ──
const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0077b5' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#e1306c' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: '#010101' },
  { id: 'twitter', label: 'Twitter/X', icon: '𝕏', color: '#1da1f2' },
  { id: 'facebook', label: 'Facebook', icon: '👥', color: '#1877f2' },
]

const TONES = [
  { id: 'professionnel', label: 'Professionnel', icon: '🎯' },
  { id: 'inspirant', label: 'Inspirant', icon: '✨' },
  { id: 'humoristique', label: 'Humoristique', icon: '😄' },
  { id: 'educatif', label: 'Éducatif', icon: '📚' },
  { id: 'storytelling', label: 'Storytelling', icon: '📖' },
]

const ELEMENT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
]

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

const defaultElement = (type, x, y) => ({
  id: `el_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  type,
  x, y,
  width: type === 'text' ? 200 : type === 'circle' ? 80 : 160,
  height: type === 'text' ? 60 : type === 'circle' ? 80 : 60,
  text: type === 'text' ? 'Votre texte ici' : type === 'rect' ? 'Titre' : type === 'circle' ? '●' : '',
  color: ELEMENT_COLORS[Math.floor(Math.random() * ELEMENT_COLORS.length)],
  fontSize: 14,
  bold: false,
  italic: false,
  textAlign: 'center',
  fontFamily: 'system-ui',
  bgOpacity: type === 'text' ? 0 : 0.85,
  rotation: 0,
  flipX: false,
})

const hexToRgba = (hex, alpha) => {
  if (!hex || hex.length < 7) return `rgba(0,0,0,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Visual Editor Component ──
function VisualEditor({
  elements, setElements, bgImage, setBgImage, bgColor, setBgColor,
  selected, setSelected, dragging, resizing,
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
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
  }

  const sendBackward = () => {
    if (!selected) return
    setElements(prev => {
      const idx = prev.findIndex(e => e.id === selected)
      if (idx <= 0) return prev
      const arr = [...prev];
      [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]
      return arr
    })
  }

  const transformText = (mode) => {
    if (!selected) return
    setElements(prev => prev.map(el => {
      if (el.id !== selected) return el
      return { ...el, text: mode === 'upper' ? el.text.toUpperCase() : el.text.toLowerCase() }
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
    const handler = (e) => { if (e.key === 'Escape' && fullscreen) setFullscreen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fullscreen])

  useEffect(() => {
    const size = EXPORT_SIZES.find(s => s.id === exportSize)
    if (size) setCanvasAspect(`${size.w}/${size.h}`)
  }, [exportSize])

  const renderHandles = (el) => (
    <>
      <div style={{ position: 'absolute', bottom: -5, right: -5, width: 14, height: 14, background: '#fff', borderRadius: 3, cursor: 'nwse-resize', border: '1px solid #888', zIndex: 10 }} onMouseDown={e => startElResize(e, el)} />
      <div style={{ position: 'absolute', bottom: -5, left: -5, width: 14, height: 14, background: '#fff', borderRadius: 3, cursor: 'nesw-resize', border: '1px solid #888', zIndex: 10 }} onMouseDown={e => startElResize(e, el)} />
      <div style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, background: '#fff', borderRadius: 3, cursor: 'nesw-resize', border: '1px solid #888', zIndex: 10 }} onMouseDown={e => startElResize(e, el)} />
      <div style={{ position: 'absolute', top: -5, left: -5, width: 14, height: 14, background: '#fff', borderRadius: 3, cursor: 'nwse-resize', border: '1px solid #888', zIndex: 10 }} onMouseDown={e => startElResize(e, el)} />
    </>
  )

  const renderElement = (el) => {
    const isSelected = selected === el.id
    const isEditing = editingElId === el.id

    const transformParts = []
    if (el.flipX) transformParts.push('scaleX(-1)')
    if (el.rotation) transformParts.push(`rotate(${el.rotation}deg)`)

    const baseStyle = {
      position: 'absolute',
      left: el.x, top: el.y,
      width: el.width, height: el.height,
      cursor: 'move',
      userSelect: 'none',
      transform: transformParts.length ? transformParts.join(' ') : undefined,
      transformOrigin: 'center center',
      boxSizing: 'border-box',
    }

    const textStyle = {
      color: '#fff',
      fontSize: el.fontSize || 14,
      fontWeight: el.bold ? 700 : 400,
      fontStyle: el.italic ? 'italic' : 'normal',
      fontFamily: el.fontFamily || 'system-ui',
      textAlign: el.textAlign || 'center',
      lineHeight: 1.4,
      wordBreak: 'break-word',
      width: '100%',
    }

    if (el.type === 'image') return (
      <div key={el.id}
        style={{ ...baseStyle, outline: isSelected ? '2px solid #ec4899' : 'none', outlineOffset: 1, borderRadius: 4 }}
        onMouseDown={e => startElDrag(e, el)}
        onClick={e => { e.stopPropagation(); setSelected(el.id) }}>
        <img src={el.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
        {isSelected && renderHandles(el)}
      </div>
    )

    if (el.type === 'circle') return (
      <div key={el.id}
        style={{
          ...baseStyle,
          borderRadius: '50%',
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
            style={{ ...textStyle, background: 'transparent', border: 'none', outline: 'none', width: '90%' }} />
        ) : (
          <span style={textStyle}>{el.text}</span>
        )}
        {isSelected && renderHandles(el)}
      </div>
    )

    // rect or text
    return (
      <div key={el.id}
        style={{
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
            style={{ ...textStyle, background: 'transparent', border: 'none', outline: 'none', height: '100%', resize: 'none' }} />
        ) : (
          <span style={{
            ...textStyle,
            color: el.type === 'text' && el.bgOpacity === 0 ? el.color : '#fff',
          }}>{el.text}</span>
        )}
        {isSelected && renderHandles(el)}
      </div>
    )
  }

  const editorContent = (
    <div className={`flex flex-col gap-3 ${fullscreen ? 'h-full' : ''}`}>

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black">Visuel du post</h2>
          <p className="text-slate-500 text-xs mt-0.5">Double-clic: éditer · Glisser: déplacer · Coins: redimensionner</p>
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
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
            title={fullscreen ? 'Quitter plein écran' : 'Plein écran'}>
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
          className="w-7 h-7 rounded cursor-pointer border-0" title="Couleur de fond" />

        <div className="w-px h-5 bg-white/10 mx-1" />
        <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg"><ZoomIn size={11} /></button>
        <span className="text-xs text-slate-500 w-9 text-center font-bold">{zoom}%</span>
        <button onClick={() => setZoom(z => Math.max(30, z - 10))} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg"><ZoomOut size={11} /></button>
        <button onClick={() => setZoom(100)} className="px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold">100%</button>

        <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleImageInsert} />
        <input ref={bgFileRef} type="file" hidden accept="image/*" onChange={handleBgImage} />
      </div>

      {/* Element properties toolbar */}
      {selected && selectedEl && (
        <div className="flex items-center gap-1.5 flex-wrap bg-pink-500/5 border border-pink-500/20 rounded-xl p-2">

          {/* Color */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-pink-400 uppercase font-black">Couleur</span>
            <input type="color" value={selectedEl.color || '#3b82f6'}
              onChange={e => updateEl('color', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0" />
          </div>

          {/* Opacity for shapes */}
          {selectedEl.type !== 'image' && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-pink-400 uppercase font-black">Opacité</span>
              <input type="range" min={0} max={1} step={0.05}
                value={selectedEl.bgOpacity ?? 0.85}
                onChange={e => updateEl('bgOpacity', Number(e.target.value))}
                className="w-16 accent-pink-500" />
              <span className="text-[9px] text-slate-500 w-6">{Math.round((selectedEl.bgOpacity ?? 0.85) * 100)}%</span>
            </div>
          )}

          <div className="w-px h-5 bg-white/10" />

          {/* Font controls */}
          {selectedEl.type !== 'image' && (
            <>
              <select value={selectedEl.fontFamily || 'system-ui'}
                onChange={e => updateEl('fontFamily', e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white max-w-[90px]">
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>

              <select value={selectedEl.fontSize || 14}
                onChange={e => updateEl('fontSize', Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white w-16">
                {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 60, 72].map(s =>
                  <option key={s} value={s}>{s}px</option>)}
              </select>

              <button onClick={() => updateEl('bold', !selectedEl.bold)}
                className={`p-1.5 rounded-lg border font-black transition-all ${selectedEl.bold ? 'bg-pink-500/30 border-pink-500/50 text-pink-300' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <Bold size={11} />
              </button>
              <button onClick={() => updateEl('italic', !selectedEl.italic)}
                className={`p-1.5 rounded-lg border transition-all ${selectedEl.italic ? 'bg-pink-500/30 border-pink-500/50 text-pink-300' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <Italic size={11} />
              </button>

              {['left', 'center', 'right'].map(align => (
                <button key={align} onClick={() => updateEl('textAlign', align)}
                  className={`p-1.5 rounded-lg border transition-all ${selectedEl.textAlign === align ? 'bg-pink-500/30 border-pink-500/50 text-pink-300' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  {align === 'left' ? <AlignLeft size={11} /> : align === 'center' ? <AlignCenter size={11} /> : <AlignRight size={11} />}
                </button>
              ))}

              <div className="w-px h-5 bg-white/10" />

              <button onClick={() => transformText('upper')}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black text-slate-300 transition-all"
                title="Majuscules">AA</button>
              <button onClick={() => transformText('lower')}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black text-slate-300 transition-all"
                title="Minuscules">aa</button>
            </>
          )}

          <div className="w-px h-5 bg-white/10" />

          {/* Layer controls */}
          <button onClick={bringForward} title="Premier plan"
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all">
            <ArrowUp size={11} />
          </button>
          <button onClick={sendBackward} title="Arrière plan"
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all">
            <ArrowDown size={11} />
          </button>

          {/* Rotation */}
          <div className="flex items-center gap-1">
            <RotateCcw size={10} className="text-slate-500 flex-shrink-0" />
            <input type="range" min={-180} max={180} step={1}
              value={selectedEl.rotation || 0}
              onChange={e => updateEl('rotation', Number(e.target.value))}
              className="w-14 accent-pink-500" />
            <span className="text-[9px] text-slate-500 w-7">{selectedEl.rotation || 0}°</span>
          </div>

          {/* Flip */}
          <button onClick={() => updateEl('flipX', !selectedEl.flipX)}
            className={`p-1.5 rounded-lg border transition-all ${selectedEl.flipX ? 'bg-pink-500/30 border-pink-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            title="Miroir horizontal">
            <FlipHorizontal size={11} />
          </button>

          <div className="w-px h-5 bg-white/10" />

          {/* Position & size */}
          {[
            { label: 'X', prop: 'x' },
            { label: 'Y', prop: 'y' },
            { label: 'W', prop: 'width' },
            { label: 'H', prop: 'height' },
          ].map(({ label, prop }) => (
            <div key={prop} className="flex items-center gap-0.5">
              <span className="text-[9px] text-slate-600 font-black">{label}</span>
              <input type="number"
                value={Math.round(selectedEl[prop])}
                onChange={e => updateEl(prop, Number(e.target.value))}
                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-white" />
            </div>
          ))}

          <div className="w-px h-5 bg-white/10" />

          <button onClick={duplicateEl}
            className="flex items-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all">
            <Layers size={11} /> Dupliquer
          </button>
          <button onClick={deleteEl}
            className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg border border-red-500/20 transition-all">
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* Canvas area */}
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
            {elements.map(renderElement)}

            {elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-white/15 text-sm font-bold text-center px-8">
                  Ajoutez des éléments<br />avec la barre d'outils ci-dessus
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-700 text-center">
        Double-clic: éditer · Glisser: déplacer · Coins ↘: redimensionner · Del: supprimer · Esc: quitter plein écran
      </p>
    </div>
  )

  if (fullscreen) return (
    <div className="fixed inset-0 bg-[#09090f] z-50 p-6 overflow-auto flex flex-col" ref={editorRef}>
      {editorContent}
    </div>
  )

  return <div ref={editorRef}>{editorContent}</div>
}

// ── Main Component ──
export default function PostGenerator() {
  const allowed = usePlanGuard('premium')
  const { credits } = useCredits()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    theme: '', audience: '', platform: 'linkedin',
    tone: 'professionnel', link: '', extra: '',
  })
  const [strategy, setStrategy] = useState(null)
  const [script, setScript] = useState(null)
  const [finalPost, setFinalPost] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [hashtags, setHashtags] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [editingScript, setEditingScript] = useState(false)
  const [editingPost, setEditingPost] = useState(false)

  // Visual editor state
  const [elements, setElements] = useState([])
  const [bgImage, setBgImage] = useState(null)
  const [bgColor, setBgColor] = useState('#0f172a')
  const [selected, setSelected] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [resizing, setResizing] = useState(null)
  const [editingElId, setEditingElId] = useState(null)
  const [editingElText, setEditingElText] = useState('')
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const bgFileRef = useRef(null)

  const callAI = async (action) => {
    setLoading(true)
    setLoadingStep(action)
    setError(null)
    try {
      const res = await fetch('/api/generer-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, form, script, finalPost }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
      setLoadingStep(null)
    }
  }

  const handleAnalyse = async () => {
    const data = await callAI('analyse')
    if (data) { setStrategy(data.strategy); setStep(1) }
  }

  const handleScript = async () => {
    const data = await callAI('script')
    if (data) { setScript(data.script); setStep(2) }
  }

  const handleFinalise = async () => {
    const data = await callAI('finalise')
    if (data) {
      setFinalPost(data.post)
      setSchedule(data.schedule || [])
      setHashtags(data.hashtags || [])
      setStep(3)
      if (data.post) {
        setElements([{
          ...defaultElement('text', 40, 40),
          text: data.post.slice(0, 120) + (data.post.length > 120 ? '…' : ''),
          width: 340, height: 120, fontSize: 13,
        }])
      }
    }
  }

  const copyPost = () => {
    if (!finalPost) return
    navigator.clipboard.writeText(finalPost + '\n\n' + hashtags.join(' '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getCanvasPoint = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === canvasRef.current) setSelected(null)
  }, [])

  const startElDrag = useCallback((e, el) => {
    e.stopPropagation()
    if (editingElId === el.id) return
    const pt = getCanvasPoint(e)
    setDragging({ id: el.id, ox: pt.x - el.x, oy: pt.y - el.y })
    setSelected(el.id)
  }, [editingElId, getCanvasPoint])

  const startElResize = useCallback((e, el) => {
    e.stopPropagation()
    const pt = getCanvasPoint(e)
    setResizing({ id: el.id, startW: el.width, startH: el.height, startPx: pt.x, startPy: pt.y })
  }, [getCanvasPoint])

  const handleCanvasMouseMove = useCallback((e) => {
    if (dragging) {
      const pt = getCanvasPoint(e)
      setElements(prev => prev.map(el =>
        el.id === dragging.id ? { ...el, x: pt.x - dragging.ox, y: pt.y - dragging.oy } : el
      ))
    }
    if (resizing) {
      const pt = getCanvasPoint(e)
      setElements(prev => prev.map(el =>
        el.id === resizing.id ? {
          ...el,
          width: Math.max(40, resizing.startW + pt.x - resizing.startPx),
          height: Math.max(24, resizing.startH + pt.y - resizing.startPy),
        } : el
      ))
    }
  }, [dragging, resizing, getCanvasPoint])

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null)
    setResizing(null)
  }, [])

  const startElEdit = useCallback((e, el) => {
    e.stopPropagation()
    setEditingElId(el.id)
    setEditingElText(el.text)
  }, [])

  const commitElEdit = useCallback(() => {
    setElements(prev => prev.map(el => el.id === editingElId ? { ...el, text: editingElText } : el))
    setEditingElId(null)
    setEditingElText('')
  }, [editingElId, editingElText])

  const addElement = (type) => {
    setElements(prev => [...prev, defaultElement(type, 60 + Math.random() * 100, 60 + Math.random() * 80)])
  }

  const deleteEl = useCallback(() => {
    if (!selected) return
    setElements(prev => prev.filter(el => el.id !== selected))
    setSelected(null)
  }, [selected])

  const updateEl = useCallback((prop, val) => {
    setElements(prev => prev.map(el => el.id === selected ? { ...el, [prop]: val } : el))
  }, [selected])

  const handleBgImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setBgImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleImageInsert = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setElements(prev => [...prev, {
        ...defaultElement('image', 80, 80),
        src: ev.target.result, width: 180, height: 180,
      }])
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const handler = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !editingElId) deleteEl()
      if (e.key === 'Escape' && editingElId) commitElEdit()
      if (e.key === 'Enter' && editingElId) commitElEdit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, editingElId, deleteEl, commitElEdit])

  const platform = PLATFORMS.find(p => p.id === form.platform)

  if (!allowed) return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white" />
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-pink-500 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#09090f] text-white" style={{ fontFamily: "'DM Sans', system-ui" }}>

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 bg-[#09090f]/95 backdrop-blur-xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center">
            <Sparkles size={15} />
          </div>
          <span className="font-black tracking-tight">PostGen</span>
          <span className="text-[9px] bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">AI Studio</span>
        </div>

        <div className="flex items-center gap-1">
          {['Brief', 'Analyse', 'Script', 'Visuel'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  i === step ? 'bg-pink-600 text-white' :
                  i < step ? 'bg-white/10 text-slate-300 hover:bg-white/15' :
                  'text-slate-600 cursor-not-allowed'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${i <= step ? 'bg-white/20' : 'bg-white/5'}`}>{i + 1}</span>
                {s}
              </button>
              {i < 3 && <ChevronRight size={12} className="text-slate-700" />}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-500/20 rounded-full px-3 py-1.5">
          <Zap size={11} className="text-indigo-400" fill="currentColor" />
          <span className="text-xs font-black text-indigo-300">{credits}</span>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 text-xs text-red-400 font-bold">
          ⚠️ {error}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── STEP 0: BRIEF ── */}
        {step === 0 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black tracking-tight">Créez votre post parfait</h1>
              <p className="text-slate-500">Remplissez le brief, l'IA fait le reste</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Thème du post *</label>
                <textarea value={form.theme} onChange={e => setForm(p => ({ ...p, theme: e.target.value }))}
                  placeholder="Ex: Lancement de notre nouveau produit SaaS..." rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-pink-500/50 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Audience cible *</label>
                <input value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}
                  placeholder="Ex: Entrepreneurs B2B, Freelances, Managers RH..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/50 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Plateforme</label>
                <div className="grid grid-cols-5 gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => setForm(prev => ({ ...prev, platform: p.id }))}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all ${
                        form.platform === p.id ? 'border-pink-500/60 bg-pink-500/15 text-pink-200' : 'border-white/10 text-slate-500 hover:border-white/20'
                      }`}>
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-[10px]">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Ton</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => setForm(p => ({ ...p, tone: t.id }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        form.tone === t.id ? 'border-pink-500/60 bg-pink-500/15 text-pink-200' : 'border-white/10 text-slate-500 hover:border-white/20'
                      }`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Lien ou URL (optionnel)</label>
                <input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/50 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Instructions supplémentaires</label>
                <input value={form.extra} onChange={e => setForm(p => ({ ...p, extra: e.target.value }))}
                  placeholder="Ex: Mentionner notre offre Black Friday..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/50 transition-all" />
              </div>
            </div>

            <button onClick={handleAnalyse} disabled={loading || !form.theme.trim() || !form.audience.trim()}
              className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
              {loading && loadingStep === 'analyse' ? (
                <><RefreshCw size={16} className="animate-spin" /> Analyse en cours...</>
              ) : (
                <><Target size={16} /> Analyser avec l'IA <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 1: STRATEGY ── */}
        {step === 1 && strategy && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black">Stratégie de contenu</h2>
              <p className="text-slate-500 text-sm">Analysé pour <span style={{ color: platform?.color }}>{platform?.icon} {platform?.label}</span></p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              {strategy.method && (
                <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                  <p className="text-xs font-black text-pink-400 uppercase tracking-widest mb-1">Méthode recommandée</p>
                  <p className="text-sm font-bold text-white">{strategy.method}</p>
                </div>
              )}
              {strategy.keywords?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Hash size={10} /> Mots-clés stratégiques</p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.keywords.map((k, i) => (
                      <span key={i} className="bg-white/8 border border-white/10 rounded-full px-3 py-1 text-xs font-bold text-slate-300">{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {strategy.painPoints?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Points de douleur identifiés</p>
                  <ul className="space-y-1">
                    {strategy.painPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-orange-400 mt-0.5">→</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {strategy.hookAngle && (
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Angle d'accroche</p>
                  <p className="text-sm text-slate-200 italic">"{strategy.hookAngle}"</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-shrink-0 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm flex items-center gap-2">
                <ChevronLeft size={14} /> Modifier
              </button>
              <button onClick={handleScript} disabled={loading}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                {loading && loadingStep === 'script' ? (
                  <><RefreshCw size={14} className="animate-spin" /> Génération du script...</>
                ) : (
                  <><Edit3 size={14} /> Générer le script <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: SCRIPT ── */}
        {step === 2 && script && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black">Script généré</h2>
              <p className="text-slate-500 text-sm">Modifiez librement avant finalisation</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              {script.sections?.map((section, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                    <p className="text-xs font-black text-pink-400 uppercase tracking-wider">{section.title}</p>
                  </div>
                  {editingScript ? (
                    <textarea value={section.content}
                      onChange={e => setScript(prev => ({
                        ...prev,
                        sections: prev.sections.map((s, j) => j === i ? { ...s, content: e.target.value } : s)
                      }))}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-pink-500/50 transition-all" />
                  ) : (
                    <p className="text-sm text-slate-300 bg-white/3 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                  )}
                </div>
              ))}
              {script.music && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-lg">🎵</span>
                  <div>
                    <p className="text-xs font-black text-orange-400">Musique suggérée</p>
                    <p className="text-sm text-slate-300">{script.music}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-shrink-0 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm flex items-center gap-2">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setEditingScript(e => !e)}
                className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 border transition-all ${editingScript ? 'border-pink-500/50 bg-pink-500/15 text-pink-300' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <Edit3 size={14} /> {editingScript ? 'Terminer' : 'Éditer'}
              </button>
              <button onClick={handleFinalise} disabled={loading}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                {loading && loadingStep === 'finalise' ? (
                  <><RefreshCw size={14} className="animate-spin" /> Finalisation...</>
                ) : (
                  <><Sparkles size={14} /> Finaliser le post <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: FINAL POST + VISUAL ── */}
        {step === 3 && finalPost && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

            {/* Left: Post + Schedule */}
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black">Post final</h2>
                <p className="text-slate-500 text-sm mt-1">Prêt à publier sur {platform?.label}</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{platform?.icon}</span>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{platform?.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingPost(e => !e)}
                      className={`p-2 rounded-lg border text-xs transition-all ${editingPost ? 'border-pink-500/50 bg-pink-500/15 text-pink-300' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <Edit3 size={12} />
                    </button>
                    <button onClick={copyPost} className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 rounded-lg text-xs font-black transition-all">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copié!' : 'Copier'}
                    </button>
                  </div>
                </div>
                {editingPost ? (
                  <textarea value={finalPost} onChange={e => setFinalPost(e.target.value)} rows={10}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-pink-500/50" />
                ) : (
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{finalPost}</p>
                )}
                {hashtags.length > 0 && (
                  <div className="pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                    {hashtags.map((h, i) => <span key={i} className="text-xs text-blue-400 font-bold">{h}</span>)}
                  </div>
                )}
              </div>

              {schedule.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={11} /> Créneaux recommandés</p>
                  {schedule.map((slot, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <span className="w-8 h-8 bg-orange-500/20 text-orange-400 text-xs font-black rounded-lg flex items-center justify-center">{i + 1}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{slot.day} · {slot.time}</p>
                        <p className="text-xs text-slate-500">{slot.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => { setStep(0); setStrategy(null); setScript(null); setFinalPost(null); setElements([]) }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm text-slate-400 transition-all">
                Nouveau post
              </button>
            </div>

            {/* Right: Visual Editor */}
            <VisualEditor
              elements={elements} setElements={setElements}
              bgImage={bgImage} setBgImage={setBgImage}
              bgColor={bgColor} setBgColor={setBgColor}
              selected={selected} setSelected={setSelected}
              dragging={dragging} resizing={resizing}
              editingElId={editingElId} setEditingElId={setEditingElId}
              editingElText={editingElText} setEditingElText={setEditingElText}
              canvasRef={canvasRef} fileRef={fileRef} bgFileRef={bgFileRef}
              addElement={addElement} deleteEl={deleteEl} updateEl={updateEl}
              handleBgImage={handleBgImage} handleImageInsert={handleImageInsert}
              startElDrag={startElDrag} startElResize={startElResize}
              startElEdit={startElEdit} commitElEdit={commitElEdit}
              handleCanvasMouseDown={handleCanvasMouseDown}
              handleCanvasMouseMove={handleCanvasMouseMove}
              handleCanvasMouseUp={handleCanvasMouseUp}
            />
          </div>
        )}
      </div>
    </main>
  )
}