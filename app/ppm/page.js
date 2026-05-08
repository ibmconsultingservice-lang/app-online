'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useCredits }   from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter }    from 'next/navigation'
import { Zap }          from 'lucide-react'

const COLORS = {
  center: { bg: '#1a0533', border: '#7c3aed', text: '#e9d5ff' },
  goal: { bg: '#0c2340', border: '#3b82f6', text: '#bfdbfe' },
  action: { bg: '#0d2818', border: '#22c55e', text: '#bbf7d0' },
  problem: { bg: '#2d0a0a', border: '#ef4444', text: '#fecaca' },
  idea: { bg: '#1c1400', border: '#f59e0b', text: '#fde68a' },
  note: { bg: '#1a1a2e', border: '#8b5cf6', text: '#ddd6fe' },
  pin: { bg: '#0f172a', border: '#06b6d4', text: '#cffafe' },
};

const NODE_TYPES = [
  { type: 'center', label: 'Central', icon: '⬡' },
  { type: 'goal', label: 'Objectif', icon: '◎' },
  { type: 'action', label: 'Action', icon: '▶' },
  { type: 'problem', label: 'Problème', icon: '⚠' },
  { type: 'idea', label: 'Idée', icon: '◈' },
  { type: 'note', label: 'Note', icon: '◻' },
  { type: 'pin', label: 'Pin détail', icon: '⊕' },
];

// ── Background themes ──
const BG_THEMES = [
  { id: 'default',   label: 'Cosmos',    bg: '#050510',  dot: 'rgba(139,92,246,0.18)',  grad: 'radial-gradient(ellipse at 20% 20%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.06) 0%, transparent 60%)' },
  { id: 'midnight',  label: 'Minuit',    bg: '#0a0a0a',  dot: 'rgba(255,255,255,0.08)', grad: 'none' },
  { id: 'ocean',     label: 'Océan',     bg: '#020e1a',  dot: 'rgba(6,182,212,0.15)',   grad: 'radial-gradient(ellipse at 30% 70%, rgba(6,182,212,0.1) 0%, transparent 60%)' },
  { id: 'forest',    label: 'Forêt',     bg: '#040f08',  dot: 'rgba(34,197,94,0.15)',   grad: 'radial-gradient(ellipse at 70% 30%, rgba(34,197,94,0.08) 0%, transparent 60%)' },
  { id: 'ember',     label: 'Braise',    bg: '#120604',  dot: 'rgba(239,68,68,0.15)',   grad: 'radial-gradient(ellipse at 50% 50%, rgba(239,68,68,0.1) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.08) 0%, transparent 50%)' },
  { id: 'aurora',    label: 'Aurore',    bg: '#060a12',  dot: 'rgba(139,92,246,0.12)',  grad: 'radial-gradient(ellipse at 20% 80%, rgba(6,182,212,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(34,197,94,0.06) 0%, transparent 60%)' },
  { id: 'slate',     label: 'Ardoise',   bg: '#a8b5ca',  dot: 'rgba(99,102,241,0.12)',  grad: 'radial-gradient(ellipse at 60% 40%, rgba(99,102,241,0.07) 0%, transparent 60%)' },
  { id: 'rose',      label: 'Rose',      bg: '#e781db',  dot: 'rgba(236,72,153,0.15)',  grad: 'radial-gradient(ellipse at 40% 60%, rgba(236,72,153,0.1) 0%, transparent 55%)' },
];

let idCounter = 10;
const genId = () => `n${++idCounter}`;

const initialNodes = [
  { id: 'n1', type: 'center',  x: 520, y: 340, label: 'Être Milliardaire',     detail: "Objectif central : investissement entrepreneurial. Plan structuré de A à Z.", width: 180, height: 64 },
  { id: 'n2', type: 'goal',    x: 820, y: 200, label: 'Emploi 100K→500K F',    detail: "Sécurité financière. Via LinkedIn, recruteurs tech/IA, ONG, structures internationales.", width: 170, height: 56 },
  { id: 'n3', type: 'goal',    x: 820, y: 420, label: 'Formations IA',          detail: "Former sur Claude, ChatGPT, outils professionnels. Offre payante scalable.", width: 160, height: 56 },
  { id: 'n4', type: 'action',  x: 240, y: 200, label: 'Relations stratégiques', detail: "LinkedIn, associations IA Afrique, fondations. Construire un réseau de valeur.", width: 165, height: 56 },
  { id: 'n5', type: 'action',  x: 240, y: 420, label: 'Réseaux sociaux',        detail: "Crédibilité → audience → affiliation, publicités, promotion plateforme payante.", width: 160, height: 56 },
  { id: 'n6', type: 'problem', x: 820, y: 600, label: 'Projet Media',         detail: "Tester avec petit budget. Ne pas épuiser les économies. Observer les résultats réels.", width: 155, height: 56 },
  { id: 'n7', type: 'idea',    x: 240, y: 600, label: 'Partenariats IA',         detail: "Collaborer avec orgs IA/automatisation. Co-formation, nouveaux projets communs.", width: 155, height: 56 },
  { id: 'n8', type: 'pin',     x: 550, y: 560, label: 'Règle des 1/3',           detail: "1/3 Épargne · 1/3 Social/Projet · 1/3 Dépenses quotidiennes. Appliquer dès le 1er revenu.", width: 150, height: 56 },
  { id: 'n9', type: 'note',    x: 550, y: 120, label: 'Mariage + Construction',  detail: "Budget mariage à définir. Chambre : min 1 500 000 CFA. Comptes épargne dédiés séparés.", width: 165, height: 56 },
];

const initialEdges = [
  { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n1', to: 'n3' },
  { id: 'e3', from: 'n1', to: 'n4' }, { id: 'e4', from: 'n1', to: 'n5' },
  { id: 'e5', from: 'n1', to: 'n6' }, { id: 'e6', from: 'n1', to: 'n7' },
  { id: 'e7', from: 'n1', to: 'n8' }, { id: 'e8', from: 'n1', to: 'n9' },
  { id: 'e9', from: 'n4', to: 'n2' }, { id: 'e10', from: 'n5', to: 'n3' },
];

// ── Wrap text into multiple SVG <tspan> lines (no foreignObject) ──
function wrapText(text, maxWidth, fontSize) {
  const approxCharWidth = fontSize * 0.55;
  const maxChars = Math.floor(maxWidth / approxCharWidth);
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function NodeBox({ node, selected, onMouseDown, onDoubleClick, isPinMode, isConnectMode, onConnectStart }) {
  const col = COLORS[node.type] || COLORS.note;
  const isPin = node.type === 'pin';
  const typeInfo = NODE_TYPES.find(t => t.type === node.type);

  // Wrap label into lines for SVG text
  const labelLines = wrapText(node.label, node.width - 16, 12);
  const lineH = 14;
  const labelBlockH = labelLines.length * lineH;
  // vertical center of label block in bottom half
  const labelY = node.height / 2 + (node.height / 2 - labelBlockH) / 2 + 2;

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      style={{ cursor: isPinMode || isConnectMode ? 'crosshair' : 'grab' }}
      onMouseDown={e => {
        if (isConnectMode) { onConnectStart(node.id); return; }
        onMouseDown(e, node.id);
      }}
      onDoubleClick={() => onDoubleClick(node)}
    >
      {isPin ? (
        <>
          <circle
            cx={node.width / 2} cy={node.height / 2} r={28}
            fill={col.bg}
            stroke={selected ? '#fff' : col.border}
            strokeWidth={selected ? 2.5 : 1.5}
            style={{ filter: selected ? `drop-shadow(0 0 8px ${col.border})` : 'none' }}
          />
          <text x={node.width / 2} y={node.height / 2 - 4} textAnchor="middle" fill={col.border} fontSize={18} fontWeight="bold">⊕</text>
          <text x={node.width / 2} y={node.height / 2 + 12} textAnchor="middle" fill={col.text} fontSize={9.5} fontFamily="monospace">
            {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
          </text>
        </>
      ) : (
        <>
          <rect
            x={0} y={0} width={node.width} height={node.height} rx={10}
            fill={col.bg}
            stroke={selected ? '#fff' : col.border}
            strokeWidth={selected ? 2.5 : 1.5}
            style={{ filter: selected ? `drop-shadow(0 0 10px ${col.border})` : 'none' }}
          />
          {/* Type badge — pure SVG text, no foreignObject */}
          <text
            x={node.width / 2} y={node.height / 2 - 6}
            textAnchor="middle"
            fill={col.border}
            fontSize={9}
            fontFamily="monospace"
            fontWeight="600"
            letterSpacing="1"
          >
            {typeInfo?.icon} {node.type.toUpperCase()}
          </text>
          {/* Label lines */}
          {labelLines.map((line, i) => (
            <text
              key={i}
              x={node.width / 2}
              y={labelY + i * lineH}
              textAnchor="middle"
              fill={col.text}
              fontSize={12}
              fontFamily="serif"
              fontWeight="500"
            >
              {line}
            </text>
          ))}
        </>
      )}
    </g>
  );
}

function EdgeLine({ edge, nodes }) {
  const from = nodes.find(n => n.id === edge.from);
  const to = nodes.find(n => n.id === edge.to);
  if (!from || !to) return null;
  const fx = from.x + from.width / 2, fy = from.y + from.height / 2;
  const tx = to.x + to.width / 2,   ty = to.y + to.height / 2;
  const mx = (fx + tx) / 2, my = (fy + ty) / 2;
  const d = `M ${fx} ${fy} Q ${mx + (fy - ty) * 0.15} ${my + (tx - fx) * 0.15} ${tx} ${ty}`;
  return (
    <path d={d} fill="none" stroke="rgba(139,92,246,0.4)" strokeWidth={1.5} strokeDasharray="6 3" markerEnd="url(#arrow)" />
  );
}

export default function MindMapPage() {
  const [nodes, setNodes]         = useState(initialNodes);
  const [edges, setEdges]         = useState(initialEdges);
  const [selected, setSelected]   = useState(null);
  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const [zoom, setZoom]           = useState(1);
  const [dragging, setDragging]   = useState(null);
  const [panning, setPanning]     = useState(false);
  const [panStart, setPanStart]   = useState(null);
  const [mode, setMode]           = useState('select');
  const [addType, setAddType]     = useState('goal');
  const [connectFrom, setConnectFrom] = useState(null);
  const [showPanel, setShowPanel] = useState(null);
  const [editNode, setEditNode]   = useState(null);
  const [toast, setToast]         = useState(null);
  const [bgTheme, setBgTheme]     = useState(BG_THEMES[0]);
  const [showBgMenu, setShowBgMenu] = useState(false);
  const [aiPrompt, setAiPrompt]   = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const svgRef   = useRef(null);
  const importRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const allowed = usePlanGuard('starter')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const generateFromAI = async () => {
    if (!aiPrompt.trim()) return showToast('❌ Entre un sujet pour générer')
    if (!hasCredits(2)) { router.push('/pricing'); return }  // ← added
    setAiLoading(true)
    try {
      const res = await fetch('/api/generer-ppm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setNodes(data.nodes)
      setEdges(data.edges)
      setPan({ x: 0, y: 0 })
      setZoom(1)
      setSelected(null)
      setShowPanel(null)
      await deductCredits(2)                                  // ← added
      showToast('✅ Mind map généré par IA')
    } catch (err) {
      showToast('❌ ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── Export JSON ──
  const exportJSON = () => {
    const data = { version: '1.0', exportedAt: new Date().toISOString(), pan, zoom, nodes, edges, bgThemeId: bgTheme.id };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mindmap_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Projet sauvegardé en JSON');
  };

  // ── Import JSON ──
  const importJSON = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.nodes || !data.edges) throw new Error('Format invalide');
        setNodes(data.nodes); setEdges(data.edges);
        if (data.pan) setPan(data.pan);
        if (data.zoom) setZoom(data.zoom);
        if (data.bgThemeId) { const th = BG_THEMES.find(t => t.id === data.bgThemeId); if (th) setBgTheme(th); }
        setSelected(null); setShowPanel(null);

        // ← FIX: recaler idCounter sur le max des IDs importés
        const maxId = data.nodes.reduce((max, n) => {
          const num = parseInt(String(n.id).replace(/\D/g, ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, idCounter);
        idCounter = maxId;

        showToast('✅ Projet importé avec succès');
      } catch { showToast('❌ Fichier JSON invalide'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Export PNG — FIXED: pure SVG text elements, no foreignObject ──
  const exportPNG = () => {
    const svgEl = svgRef.current; if (!svgEl) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
    });
    const padding = 60;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const scale = 2;

    // Build SVG string manually (no foreignObject — pure SVG elements)
    const edgePaths = edges.map(edge => {
      const from = nodes.find(n => n.id === edge.from);
      const to   = nodes.find(n => n.id === edge.to);
      if (!from || !to) return '';
      const fx = from.x + from.width / 2 - minX + padding;
      const fy = from.y + from.height / 2 - minY + padding;
      const tx = to.x + to.width / 2 - minX + padding;
      const ty = to.y + to.height / 2 - minY + padding;
      const mx = (fx + tx) / 2, my = (fy + ty) / 2;
      const d = `M ${fx} ${fy} Q ${mx + (fy - ty) * 0.15} ${my + (tx - fx) * 0.15} ${tx} ${ty}`;
      return `<path d="${d}" fill="none" stroke="rgba(139,92,246,0.4)" stroke-width="1.5" stroke-dasharray="6 3" marker-end="url(#arrow)"/>`;
    }).join('');

    const nodeElements = nodes.map(n => {
      const col = COLORS[n.type] || COLORS.note;
      const isPin = n.type === 'pin';
      const nx = n.x - minX + padding;
      const ny = n.y - minY + padding;
      const typeInfo = NODE_TYPES.find(t => t.type === n.type);

      if (isPin) {
        const cx = nx + n.width / 2, cy = ny + n.height / 2;
        const shortLabel = n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label;
        return `
          <circle cx="${cx}" cy="${cy}" r="28" fill="${col.bg}" stroke="${col.border}" stroke-width="1.5"/>
          <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="${col.border}" font-size="18" font-weight="bold">⊕</text>
          <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="${col.text}" font-size="9.5" font-family="monospace">${shortLabel}</text>
        `;
      }

      const labelLines = wrapText(n.label, n.width - 16, 12);
      const lineH = 14;
      const labelBlockH = labelLines.length * lineH;
      const labelY = ny + n.height / 2 + (n.height / 2 - labelBlockH) / 2 + 14;
      const labelSVG = labelLines.map((line, i) =>
        `<text x="${nx + n.width / 2}" y="${labelY + i * lineH}" text-anchor="middle" fill="${col.text}" font-size="12" font-family="serif">${escXML(line)}</text>`
      ).join('');

      return `
        <rect x="${nx}" y="${ny}" width="${n.width}" height="${n.height}" rx="10" fill="${col.bg}" stroke="${col.border}" stroke-width="1.5"/>
        <text x="${nx + n.width / 2}" y="${ny + n.height / 2 - 6}" text-anchor="middle" fill="${col.border}" font-size="9" font-family="monospace" font-weight="600">${escXML(typeInfo?.icon + ' ' + n.type.toUpperCase())}</text>
        ${labelSVG}
      `;
    }).join('');

    const svgStr = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${contentW}" height="${contentH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="rgba(139,92,246,0.5)"/>
    </marker>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="0" cy="0" r="0.8" fill="${bgTheme.dot}"/>
    </pattern>
  </defs>
  <rect width="${contentW}" height="${contentH}" fill="${bgTheme.bg}"/>
  <rect width="${contentW}" height="${contentH}" fill="url(#grid)"/>
  ${edgePaths}
  ${nodeElements}
</svg>`;

    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = contentW * scale; canvas.height = contentH * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob2 => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob2);
        a.download = `mindmap_${Date.now()}.png`;
        a.click();
        showToast('✅ Capture PNG exportée');
      }, 'image/png');
    };
    img.onerror = () => showToast('❌ Erreur export PNG');
    img.src = url;
  };

  // ── Helper: escape XML entities ──
  const escXML = str => (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const svgPoint = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  const handleSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'svg') {
      setShowBgMenu(false);
      if (mode === 'add') {
        const pt = svgPoint(e.clientX, e.clientY);
        const nt = NODE_TYPES.find(t => t.type === addType) || NODE_TYPES[1];
        const isPin = addType === 'pin';
        const newNode = {
          id: genId(), type: addType,
          x: pt.x - (isPin ? 40 : 80), y: pt.y - 28,
          label: nt.label, detail: '',
          width: isPin ? 80 : 160, height: 56,
        };
        setNodes(prev => [...prev, newNode]);
        setSelected(newNode.id); setShowPanel(newNode); setMode('select');
        return;
      }
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelected(null); setShowPanel(null);
    }
  }, [mode, addType, pan, svgPoint]);

  const handleMouseMove = useCallback((e) => {
    if (panning && panStart) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    if (dragging) {
      const pt = svgPoint(e.clientX, e.clientY);
      setNodes(prev => prev.map(n => n.id === dragging ? { ...n, x: pt.x - dragOffset.current.x, y: pt.y - dragOffset.current.y } : n));
    }
  }, [panning, panStart, dragging, svgPoint]);

  const handleMouseUp = useCallback(() => { setPanning(false); setPanStart(null); setDragging(null); }, []);

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (mode === 'connect') return;
    setSelected(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    const pt = svgPoint(e.clientX, e.clientY);
    dragOffset.current = { x: pt.x - node.x, y: pt.y - node.y };
    setDragging(nodeId);
  }, [mode, nodes, svgPoint]);

  const handleNodeDoubleClick = useCallback((node) => { setShowPanel(node); setEditNode({ ...node }); }, []);

  const handleConnectStart = useCallback((nodeId) => {
    if (!connectFrom) { setConnectFrom(nodeId); }
    else {
      if (connectFrom !== nodeId) {
        const exists = edges.find(e => (e.from === connectFrom && e.to === nodeId) || (e.from === nodeId && e.to === connectFrom));
        if (!exists) setEdges(prev => [...prev, { id: genId(), from: connectFrom, to: nodeId }]);
      }
      setConnectFrom(null); setMode('select');
    }
  }, [connectFrom, edges]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.2, Math.min(3, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, []);

  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const deleteSelected = () => {
    if (!selected) return;
    setNodes(prev => prev.filter(n => n.id !== selected));
    setEdges(prev => prev.filter(e => e.from !== selected && e.to !== selected));
    setSelected(null); setShowPanel(null);
  };

  const saveEdit = () => {
    if (!editNode) return;
    setNodes(prev => prev.map(n => n.id === editNode.id ? { ...editNode } : n));
    setShowPanel(editNode);
  };

  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  if (!allowed) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center
      justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-white rounded-2xl flex
        items-center justify-center">
        <Zap size={20} color="#0f1117" fill="#0f1117" />
      </div>
      <div className="w-6 h-6 border-2 border-white/10
        border-t-white rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest
        text-white/30">Vérification du plan...</p>
    </div>
  )  

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,300&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
        .canvas-wrap { width: 100vw; height: 100vh; position: relative; overflow: hidden; transition: background 0.4s; }
        .canvas-grid { position: absolute; inset: 0; pointer-events: none; transition: background-image 0.4s; }
        .toolbar { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; background: rgba(10,10,30,0.92); border: 1px solid rgba(139,92,246,0.3); border-radius: 14px; padding: 8px 14px; backdrop-filter: blur(12px); z-index: 100; flex-wrap: wrap; max-width: 90vw; }
        .tool-btn { background: transparent; border: 1px solid transparent; border-radius: 8px; color: #a78bfa; padding: 6px 12px; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .tool-btn:hover { border-color: rgba(139,92,246,0.5); background: rgba(139,92,246,0.1); color: #e9d5ff; }
        .tool-btn.active { background: rgba(139,92,246,0.25); border-color: #7c3aed; color: #e9d5ff; }
        .tool-btn.danger { color: #f87171; }
        .tool-btn.danger:hover { border-color: #ef4444; background: rgba(239,68,68,0.1); }
        .tool-btn.export { color: #34d399; }
        .tool-btn.export:hover { border-color: #10b981; background: rgba(16,185,129,0.1); }
        .tool-btn.import { color: #60a5fa; }
        .tool-btn.import:hover { border-color: #3b82f6; background: rgba(59,130,246,0.1); }
        .sep { width: 1px; height: 24px; background: rgba(139,92,246,0.2); flex-shrink: 0; }
        .type-menu { position: absolute; top: 70px; left: 50%; transform: translateX(-50%); background: rgba(10,10,30,0.97); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 10px; display: flex; gap: 6px; flex-wrap: wrap; max-width: 380px; z-index: 200; backdrop-filter: blur(12px); }
        .type-opt { padding: 6px 10px; border-radius: 7px; border: 1px solid rgba(139,92,246,0.2); font-family: 'DM Mono', monospace; font-size: 10px; cursor: pointer; color: #c4b5fd; background: transparent; transition: all 0.15s; }
        .type-opt:hover, .type-opt.selected { background: rgba(124,58,237,0.3); border-color: #7c3aed; color: #e9d5ff; }
        .bg-menu { position: absolute; top: 70px; right: 24px; background: rgba(10,10,30,0.97); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 12px; z-index: 200; backdrop-filter: blur(12px); min-width: 200px; }
        .bg-menu-title { font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(167,139,250,0.6); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .bg-option { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
        .bg-option:hover { background: rgba(139,92,246,0.15); }
        .bg-option.selected { background: rgba(139,92,246,0.25); }
        .bg-swatch { width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); flex-shrink: 0; }
        .bg-label { font-family: 'DM Mono', monospace; font-size: 11px; color: #c4b5fd; }
        .panel { position: absolute; right: 24px; top: 50%; transform: translateY(-50%); width: 300px; background: rgba(8,8,25,0.97); border: 1px solid rgba(139,92,246,0.35); border-radius: 16px; padding: 20px; z-index: 200; backdrop-filter: blur(16px); }
        .panel h3 { font-family: 'Fraunces', serif; font-size: 16px; color: #e9d5ff; margin-bottom: 12px; font-weight: 600; }
        .panel label { font-family: 'DM Mono', monospace; font-size: 10px; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px; margin-top: 12px; }
        .panel input, .panel textarea, .panel select { width: 100%; background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.25); border-radius: 8px; color: #e9d5ff; font-family: 'Fraunces', serif; font-size: 13px; padding: 8px 10px; outline: none; resize: vertical; }
        .panel input:focus, .panel textarea:focus { border-color: #7c3aed; }
        .panel-btns { display: flex; gap: 8px; margin-top: 16px; }
        .panel-btns button { flex: 1; padding: 8px; border-radius: 8px; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.15s; }
        .btn-save { background: #7c3aed; border: none; color: #fff; }
        .btn-save:hover { background: #6d28d9; }
        .btn-close { background: transparent; border: 1px solid rgba(139,92,246,0.3); color: #a78bfa; }
        .btn-close:hover { border-color: #7c3aed; color: #e9d5ff; }
        .hint { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(167,139,250,0.4); white-space: nowrap; z-index: 100; pointer-events: none; }
        .connect-hint { position: absolute; top: 76px; left: 50%; transform: translateX(-50%); background: rgba(6,182,212,0.15); border: 1px solid rgba(6,182,212,0.4); border-radius: 8px; padding: 6px 14px; font-family: 'DM Mono', monospace; font-size: 11px; color: #67e8f9; z-index: 150; }
        .toast { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); background: rgba(10,10,30,0.97); border: 1px solid rgba(139,92,246,0.4); border-radius: 10px; padding: 10px 20px; font-family: 'DM Mono', monospace; font-size: 12px; color: #e9d5ff; z-index: 300; white-space: nowrap; animation: fadeInUp 0.3s ease; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>

      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importJSON} />

      <div
        className="canvas-wrap"
        style={{
          background: bgTheme.bg,
          backgroundImage: bgTheme.grad !== 'none' ? bgTheme.grad : undefined,
        }}
      >
        {/* Dot grid overlay */}
        <div
          className="canvas-grid"
          style={{
            backgroundImage: `radial-gradient(circle, ${bgTheme.dot} 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Toolbar */}
        <div className="toolbar">
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 14, color: '#c4b5fd', marginRight: 4 }}>MindMap</span>
        {/* ⚡ Credit pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 999, padding: '4px 12px',
        }}>
          <Zap size={11} color="#fbbf24" fill="#fbbf24" />
          <span style={{ fontSize: 12, fontWeight: 800,
            color: 'rgba(255,255,255,0.7)' }}>
            {credits}
          </span>
        </div>

        {/* ⚠️ Low-credit warning */}
        {credits < 2 && (
          <div style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 12, padding: '4px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: '#fcd34d', fontSize: 12,
              fontWeight: 700 }}>
              ⚠️ 2 crédits requis
            </span>
            <button
              onClick={() => router.push('/pricing')}
              style={{
                fontSize: 10, fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                background: '#f59e0b', color: 'black',
                border: 'none', borderRadius: 8,
                padding: '4px 10px', cursor: 'pointer',
              }}>
              Recharger
            </button>
          </div>
        )}          
          <div className="sep" />
          <button className={`tool-btn ${mode === 'select' ? 'active' : ''}`} onClick={() => { setMode('select'); setConnectFrom(null); }}>⊹ Sélect</button>
          <button className={`tool-btn ${mode === 'add' ? 'active' : ''}`} onClick={() => setMode(m => m === 'add' ? 'select' : 'add')}>+ Ajouter</button>
          <button className={`tool-btn ${mode === 'connect' ? 'active' : ''}`} onClick={() => { setMode(m => m === 'connect' ? 'select' : 'connect'); setConnectFrom(null); }}>⟿ Relier</button>
          <div className="sep" />
          <button className="tool-btn" onClick={resetView}>⊡ Reset vue</button>
          {/* Background picker button */}
          <button
            className={`tool-btn ${showBgMenu ? 'active' : ''}`}
            onClick={() => setShowBgMenu(v => !v)}
            title="Changer le fond"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: bgTheme.bg, border: `1px solid ${bgTheme.dot}` }} />
            Fond
          </button>
          <div className="sep" />
          <button className="tool-btn export" onClick={exportJSON} title="Sauvegarder le projet en JSON">💾 JSON</button>
          <button className="tool-btn export" onClick={exportPNG} title="Exporter une capture PNG haute résolution">📸 PNG</button>
          <button className="tool-btn import" onClick={() => importRef.current?.click()} title="Importer un projet JSON">📂 Importer</button>
          {selected && (
            <>
              <div className="sep" />
              <button className="tool-btn danger" onClick={deleteSelected}>✕ Suppr</button>
            </>
          )}
        </div>

        {/* Background theme menu */}
        {showBgMenu && (
          <div className="bg-menu">
            <div className="bg-menu-title">Couleur d'arrière-plan</div>
            {BG_THEMES.map(theme => (
              <div
                key={theme.id}
                className={`bg-option ${bgTheme.id === theme.id ? 'selected' : ''}`}
                onClick={() => { setBgTheme(theme); setShowBgMenu(false); }}
              >
                <div
                  className="bg-swatch"
                  style={{
                    background: theme.bg,
                    boxShadow: `inset 0 0 0 8px ${theme.dot}`,
                  }}
                />
                <span className="bg-label">{theme.label}</span>
                {bgTheme.id === theme.id && <span style={{ marginLeft: 'auto', color: '#7c3aed', fontSize: 12 }}>✓</span>}
              </div>
            ))}
          </div>
        )}

        {/* Type chooser */}
        {mode === 'add' && (
          <div className="type-menu">
            {NODE_TYPES.map(t => (
              <button key={t.type} className={`type-opt ${addType === t.type ? 'selected' : ''}`} onClick={() => setAddType(t.type)}>
                {t.icon} {t.label}
              </button>
            ))}
            <div style={{ width: '100%', fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(167,139,250,0.5)', marginTop: 4 }}>
              Clique sur le canvas pour placer un nœud
            </div>
          </div>
        )}

        {/* Connect hint */}
        {mode === 'connect' && (
          <div className="connect-hint">
            {connectFrom ? '⟿ Clique sur le nœud de destination' : '⟿ Clique sur le nœud source'}
          </div>
        )}

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          width="100%" height="100%"
          style={{ cursor: panning ? 'grabbing' : mode === 'add' ? 'crosshair' : 'default' }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(139,92,246,0.5)" />
            </marker>
          </defs>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {edges.map(e => <EdgeLine key={e.id} edge={e} nodes={nodes} />)}
            {nodes.map(n => (
              <NodeBox
                key={n.id} node={n} selected={selected === n.id}
                onMouseDown={handleNodeMouseDown}
                onDoubleClick={handleNodeDoubleClick}
                isPinMode={mode === 'add' && addType === 'pin'}
                isConnectMode={mode === 'connect'}
                onConnectStart={handleConnectStart}
              />
            ))}
            {connectFrom && (() => {
              const fn = nodes.find(n => n.id === connectFrom);
              if (!fn) return null;
              return <circle cx={fn.x + fn.width / 2} cy={fn.y + fn.height / 2} r={6} fill="none" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 2" />;
            })()}
          </g>
        </svg>

        {/* Detail Panel */}
        {showPanel && (
          <div className="panel">
            <h3>{showPanel.type === 'pin' ? '⊕ Détail du pin' : '◈ Éditer le nœud'}</h3>
            <label>Titre</label>
            <input value={editNode?.label || ''} onChange={e => setEditNode(prev => ({ ...prev, label: e.target.value }))} placeholder="Titre du nœud" />
            <label>Type</label>
            <select
              value={editNode?.type || 'note'}
              onChange={e => setEditNode(prev => ({ ...prev, type: e.target.value }))}
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8, color: '#e9d5ff', fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '7px 10px', width: '100%', outline: 'none' }}
            >
              {NODE_TYPES.map(t => <option key={t.type} value={t.type}>{t.icon} {t.label}</option>)}
            </select>
            <label>Description / Détails</label>
            <textarea
              rows={5}
              value={editNode?.detail || ''}
              onChange={e => setEditNode(prev => ({ ...prev, detail: e.target.value }))}
              placeholder="Ajoute tes notes, détails, liens, chiffres…"
            />
            <div className="panel-btns">
              <button className="btn-save" onClick={saveEdit}>Sauvegarder</button>
              <button className="btn-close" onClick={() => { setShowPanel(null); setEditNode(null); }}>Fermer</button>
            </div>
          </div>
        )}
        {/* ── AI Generator Panel ── */}
        <div style={{
          position: 'absolute', bottom: 50, right: 24,
          background: 'rgba(8,8,25,0.97)',
          border: '1px solid rgba(139,92,246,0.35)',
          borderRadius: 16, padding: 16, zIndex: 200,
          backdropFilter: 'blur(16px)', width: 320,
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(167,139,250,0.4)', marginTop: 6 }}>
            Entrée = générer · Shift+Entrée = saut de ligne · Redimensionnable ↕
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), generateFromAI())}
              placeholder="Ex: Plan marketing startup…"
              rows={2}
              style={{
                flex: 1, background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: 8, color: '#e9d5ff',
                fontFamily: "'Fraunces', serif", fontSize: 13,
                padding: '8px 10px', outline: 'none',
                resize: 'vertical', minHeight: 38, maxHeight: 160,
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={generateFromAI}
              disabled={aiLoading}
              style={{
                background: aiLoading ? 'rgba(124,58,237,0.3)' : '#7c3aed',
                border: 'none', borderRadius: 8, color: '#fff',
                fontFamily: "'DM Mono', monospace", fontSize: 11,
                padding: '8px 14px', cursor: aiLoading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
            >
              {aiLoading ? '...' : '✦ Go'}
            </button>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(167,139,250,0.4)', marginTop: 6 }}>
            Entrée ou clic → génère et remplace le canvas
          </div>
        </div>
        {toast && <div className="toast">{toast}</div>}

        <div className="hint">
          Double-clic = éditer · Scroll = zoom · Drag canvas = naviguer · Fond = thème arrière-plan · 📸 PNG = export corrigé
        </div>
      </div>
    </>
  );
}