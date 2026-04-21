'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { Zap, Sparkles, RefreshCw, Download, Trash2, ZoomIn, ZoomOut, Move } from 'lucide-react'

const SHAPE_COLORS = {
  start: { fill: '#22c55e', stroke: '#16a34a', text: '#fff' },
  end: { fill: '#ef4444', stroke: '#dc2626', text: '#fff' },
  process: { fill: '#3b82f6', stroke: '#2563eb', text: '#fff' },
  decision: { fill: '#f59e0b', stroke: '#d97706', text: '#fff' },
  data: { fill: '#8b5cf6', stroke: '#7c3aed', text: '#fff' },
  document: { fill: '#06b6d4', stroke: '#0891b2', text: '#fff' },
  connector: { fill: '#6b7280', stroke: '#4b5563', text: '#fff' },
}

export default function WorkflowDesigner() {
  const allowed = usePlanGuard('premium')
  const { credits } = useCredits()

  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selected, setSelected] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [resizing, setResizing] = useState(null)
  const canvasRef = useRef(null)
  const svgRef = useRef(null)

  // ── Generate workflow from Claude ──
  const handleGenerate = async () => {
    if (!description.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/generer-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setNodes(data.nodes)
      setEdges(data.edges)
      setSelected(null)
      setPan({ x: 0, y: 0 })
      setZoom(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Mouse events for drag/pan/resize ──
  const getCanvasPoint = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    }
  }, [pan, zoom])

  const handleMouseDown = useCallback((e) => {
    if (e.target === canvasRef.current || e.target === svgRef.current) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      setSelected(null)
    }
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
      return
    }
    if (dragging) {
      const pt = getCanvasPoint(e)
      setNodes(prev => prev.map(n =>
        n.id === dragging.id
          ? { ...n, x: pt.x - dragging.ox, y: pt.y - dragging.oy }
          : n
      ))
      return
    }
    if (resizing) {
      const pt = getCanvasPoint(e)
      setNodes(prev => prev.map(n => {
        if (n.id !== resizing.id) return n
        const minW = 80, minH = 40
        return {
          ...n,
          width: Math.max(minW, resizing.startW + (pt.x - resizing.startPx)),
          height: Math.max(minH, resizing.startH + (pt.y - resizing.startPy)),
        }
      }))
    }
  }, [isPanning, panStart, dragging, resizing, getCanvasPoint])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setPanStart(null)
    setDragging(null)
    setResizing(null)
  }, [])

  const startDrag = useCallback((e, node) => {
    e.stopPropagation()
    if (editingId) return
    const pt = getCanvasPoint(e)
    setDragging({ id: node.id, ox: pt.x - node.x, oy: pt.y - node.y })
    setSelected(node.id)
  }, [editingId, getCanvasPoint])

  const startResize = useCallback((e, node) => {
    e.stopPropagation()
    const pt = getCanvasPoint(e)
    setResizing({ id: node.id, startW: node.width, startH: node.height, startPx: pt.x, startPy: pt.y })
  }, [getCanvasPoint])

  const startEdit = useCallback((e, node) => {
    e.stopPropagation()
    setEditingId(node.id)
    setEditingText(node.label)
  }, [])

  const commitEdit = useCallback(() => {
    if (!editingId) return
    setNodes(prev => prev.map(n => n.id === editingId ? { ...n, label: editingText } : n))
    setEditingId(null)
    setEditingText('')
  }, [editingId, editingText])

  const deleteSelected = useCallback(() => {
    if (!selected) return
    setNodes(prev => prev.filter(n => n.id !== selected))
    setEdges(prev => prev.filter(e => e.from !== selected && e.to !== selected))
    setSelected(null)
  }, [selected])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!editingId) deleteSelected()
      }
      if (e.key === 'Escape') {
        if (editingId) commitEdit()
        else setSelected(null)
      }
      if (e.key === 'Enter' && editingId) commitEdit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingId, deleteSelected, commitEdit])

  // ── Render shape ──
  const renderShape = useCallback((node) => {
    const colors = SHAPE_COLORS[node.type] || SHAPE_COLORS.process
    const isSelected = selected === node.id
    const isEditing = editingId === node.id
    const { x, y, width: w, height: h } = node

    const shapeProps = {
      fill: colors.fill,
      stroke: isSelected ? '#fff' : colors.stroke,
      strokeWidth: isSelected ? 3 : 1.5,
      style: { cursor: 'move', filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,255,255,0.4))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' },
      onMouseDown: (e) => startDrag(e, node),
      onDoubleClick: (e) => startEdit(e, node),
      onClick: (e) => { e.stopPropagation(); setSelected(node.id) },
    }

    let shape = null
    if (node.type === 'start' || node.type === 'end') {
      shape = <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...shapeProps} />
    } else if (node.type === 'decision') {
      const cx = x + w / 2, cy = y + h / 2
      const pts = `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`
      shape = <polygon points={pts} {...shapeProps} />
    } else if (node.type === 'data') {
      const skew = 15
      const pts = `${x + skew},${y} ${x + w},${y} ${x + w - skew},${y + h} ${x},${y + h}`
      shape = <polygon points={pts} {...shapeProps} />
    } else if (node.type === 'document') {
      const wave = h * 0.15
      shape = (
        <path
          d={`M${x},${y} L${x + w},${y} L${x + w},${y + h - wave} Q${x + w * 0.75},${y + h} ${x + w / 2},${y + h - wave} Q${x + w * 0.25},${y + h - wave * 2} ${x},${y + h - wave} Z`}
          {...shapeProps}
        />
      )
    } else if (node.type === 'connector') {
      shape = <ellipse cx={x + w / 2} cy={y + h / 2} rx={Math.min(w, h) / 2} ry={Math.min(w, h) / 2} {...shapeProps} />
    } else {
      shape = <rect x={x} y={y} width={w} height={h} rx={6} {...shapeProps} />
    }

    return (
      <g key={node.id}>
        {shape}
        {/* Label */}
        {!isEditing && (
          <text
            x={x + w / 2} y={y + h / 2}
            textAnchor="middle" dominantBaseline="middle"
            fill={colors.text} fontSize={Math.min(13, w / (node.label.length * 0.7 + 1))}
            fontWeight="600" fontFamily="system-ui"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {node.label.length > 20 ? node.label.slice(0, 18) + '…' : node.label}
          </text>
        )}
        {/* Inline edit foreignObject */}
        {isEditing && (
          <foreignObject x={x + 4} y={y + h / 2 - 14} width={w - 8} height={28}>
            <input
              xmlns="http://www.w3.org/1999/xhtml"
              autoFocus
              value={editingText}
              onChange={e => setEditingText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditingId(null) } }}
              style={{
                width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)',
                color: '#fff', border: '1px solid #fff', borderRadius: 4,
                textAlign: 'center', fontSize: 12, fontWeight: 600,
                outline: 'none', padding: '2px 4px',
              }}
            />
          </foreignObject>
        )}
        {/* Resize handle */}
        {isSelected && (
          <rect
            x={x + w - 8} y={y + h - 8} width={10} height={10} rx={2}
            fill="#fff" stroke="#666" strokeWidth={1}
            style={{ cursor: 'nwse-resize' }}
            onMouseDown={(e) => { e.stopPropagation(); startResize(e, node) }}
          />
        )}
        {/* Type badge */}
        <text
          x={x + 4} y={y + 10} fill={colors.text} fontSize={8}
          fontFamily="system-ui" opacity={0.7}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {node.type.toUpperCase()}
        </text>
      </g>
    )
  }, [selected, editingId, editingText, startDrag, startEdit, startResize, commitEdit])

  // ── Render edge with arrow ──
  const renderEdge = useCallback((edge, idx) => {
    const from = nodes.find(n => n.id === edge.from)
    const to = nodes.find(n => n.id === edge.to)
    if (!from || !to) return null

    const fx = from.x + from.width / 2
    const fy = from.y + from.height / 2
    const tx = to.x + to.width / 2
    const ty = to.y + to.height / 2

    // Find edge attachment points on shape borders
    const dx = tx - fx, dy = ty - fy
    const angle = Math.atan2(dy, dx)
    const sx = fx + Math.cos(angle) * (from.width / 2 + 2)
    const sy = fy + Math.sin(angle) * (from.height / 2 + 2)
    const ex = tx - Math.cos(angle) * (to.width / 2 + 8)
    const ey = ty - Math.sin(angle) * (to.height / 2 + 8)

    // Bezier control points
    const mx = (sx + ex) / 2
    const my = (sy + ey) / 2
    const cp1x = mx + (ey - sy) * 0.15
    const cp1y = my - (ex - sx) * 0.15

    const midX = (sx + cp1x * 2 + ex) / 4
    const midY = (sy + cp1y * 2 + ey) / 4

    return (
      <g key={`edge-${idx}`}>
        <path
          d={`M${sx},${sy} Q${cp1x},${cp1y} ${ex},${ey}`}
          fill="none" stroke="#94a3b8" strokeWidth={1.5}
          strokeDasharray={edge.dashed ? '6,3' : 'none'}
          markerEnd="url(#arrow)"
        />
        {edge.label && (
          <text x={midX} y={midY - 6} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="system-ui">
            {edge.label}
          </text>
        )}
      </g>
    )
  }, [nodes])

  // ── Export as SVG ──
  const exportSVG = () => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const clone = svgEl.cloneNode(true)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'workflow.svg'; a.click()
    URL.revokeObjectURL(url)
  }

  if (!allowed) return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white" />
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="h-screen bg-[#0f1117] text-white flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui" }}>

      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 border-b border-white/5 px-5 py-3 flex items-center gap-4 bg-[#0f1117]/95 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
            <Sparkles size={15} />
          </div>
          <span className="font-black tracking-tight">WorkflowAI</span>
          <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">Designer</span>
        </div>

        {/* Description input */}
        <div className="flex-1 flex gap-2 max-w-2xl">
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder="Décrivez votre workflow... ex: Processus de validation d'une facture avec approbation manager"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 rounded-xl font-black text-sm disabled:opacity-40 flex items-center gap-2 transition-all active:scale-95"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Génération...' : 'Générer'}
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {selected && (
            <button onClick={deleteSelected} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-all" title="Supprimer (Del)">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"><ZoomIn size={14} /></button>
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"><ZoomOut size={14} /></button>
          <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"><Move size={14} /></button>
          {nodes.length > 0 && (
            <button onClick={exportSVG} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all" title="Exporter SVG"><Download size={14} /></button>
          )}
          <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-500/20 rounded-full px-3 py-1.5 ml-1">
            <Zap size={11} className="text-indigo-400" fill="currentColor" />
            <span className="text-xs font-black text-indigo-300">{credits}</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex-shrink-0 bg-red-500/10 border-b border-red-500/20 px-5 py-2 text-xs text-red-400 font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2 border-b border-white/5 overflow-x-auto">
        {Object.entries(SHAPE_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-sm" style={{ background: colors.fill }} />
            <span className="text-[10px] text-slate-500 capitalize">{type}</span>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-slate-600">
          {nodes.length > 0 && `Double-clic: éditer • Glisser: déplacer • Coin: redimensionner • Del: supprimer`}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isPanning ? 'grabbing' : 'grab', background: 'radial-gradient(circle at 50% 50%, #111827 0%, #0f1117 100%)' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={e => { e.preventDefault(); setZoom(z => Math.min(3, Math.max(0.2, z - e.deltaY * 0.001))) }}
      >
        {/* Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
          <defs>
            <pattern id="grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)}>
              <path d={`M ${20 * zoom} 0 L 0 0 0 ${20 * zoom}`} fill="none" stroke="#334155" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Empty state */}
        {nodes.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 pointer-events-none">
            <div className="w-20 h-20 border-2 border-dashed border-white/10 rounded-3xl flex items-center justify-center">
              <Sparkles size={32} className="text-white/10" />
            </div>
            <p className="text-slate-600 font-bold text-sm">Décrivez un workflow pour commencer</p>
            <p className="text-slate-700 text-xs">Ex: "Processus d'onboarding client avec vérification KYC"</p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 pointer-events-none">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-2 border-t-blue-500 border-r-violet-500 border-b-transparent border-l-transparent rounded-full animate-spin" />
              <div className="absolute inset-3 border-2 border-t-violet-500 border-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
            </div>
            <p className="text-slate-400 font-bold text-sm">Claude analyse et conçoit votre workflow...</p>
          </div>
        )}

        {/* SVG Workflow */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: isPanning ? 'grabbing' : 'default' }}
        >
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges first (below nodes) */}
            {edges.map((edge, idx) => renderEdge(edge, idx))}
            {/* Nodes */}
            {nodes.map(node => renderShape(node))}
          </g>
        </svg>
      </div>

      {/* ── Bottom info bar ── */}
      {selected && (() => {
        const node = nodes.find(n => n.id === selected)
        if (!node) return null
        return (
          <div className="flex-shrink-0 border-t border-white/5 px-5 py-2 flex items-center gap-4 text-xs text-slate-500 bg-[#0f1117]">
            <span className="font-bold text-slate-300">Sélectionné: <span className="text-blue-400">{node.label}</span></span>
            <span>Type: <span className="text-slate-300 capitalize">{node.type}</span></span>
            <span>Position: ({Math.round(node.x)}, {Math.round(node.y)})</span>
            <span>Taille: {Math.round(node.width)} × {Math.round(node.height)}</span>
            <span className="ml-auto text-slate-700">Double-clic pour éditer le texte</span>
          </div>
        )
      })()}
    </main>
  )
}