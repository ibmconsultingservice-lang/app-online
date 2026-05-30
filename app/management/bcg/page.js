'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY   = 'mgmt_projects_v1'
const QUADRANTS = {
  star:     { label: 'Stars',          icon: '★', color: '#f59e0b', bg: 'rgba(245,158,11,.08)',  desc: 'Forte croissance, forte part de marché — investir' },
  cow:      { label: 'Cash Cows',      icon: '◉', color: '#22d3a5', bg: 'rgba(34,211,165,.08)', desc: 'Faible croissance, forte part de marché — exploiter' },
  question: { label: 'Question Marks', icon: '?', color: '#818cf8', bg: 'rgba(129,140,248,.08)', desc: 'Forte croissance, faible part de marché — décider' },
  dog:      { label: 'Dogs',           icon: '✕', color: '#f87171', bg: 'rgba(248,113,113,.08)', desc: 'Faible croissance, faible part de marché — abandonner' },
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const getQuadrant = (ms, gr) => {
  const highShare  = ms >= 50
  const highGrowth = gr >= 10
  if (highShare  && highGrowth)  return 'star'
  if (highShare  && !highGrowth) return 'cow'
  if (!highShare && highGrowth)  return 'question'
  return 'dog'
}

const EMPTY_PRODUCT = { name: '', marketShare: '', growthRate: '', revenue: '', description: '' }

// ─── BCG Page ─────────────────────────────────────────────────────────────────
export default function BCGPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,       setProject]       = useState(null)
  const [analyses,      setAnalyses]      = useState([])
  const [activeId,      setActiveId]      = useState(null)
  const [showNewForm,   setShowNewForm]   = useState(false)
  const [newMode,       setNewMode]       = useState('manual')   // 'manual' | 'ai'
  const [newAnalysis,   setNewAnalysis]   = useState({ name: '', context: '' })
  const [genDescription, setGenDescription] = useState('')       // AI generation description
  const [genLoading,    setGenLoading]    = useState(false)      // AI generation loading
  const [editProduct,   setEditProduct]   = useState(null)
  const [productForm,   setProductForm]   = useState(EMPTY_PRODUCT)
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiResult,      setAiResult]      = useState(null)
  const [toast,         setToast]         = useState(null)
  const [hovered,       setHovered]       = useState(null)
  const [showAiPanel,   setShowAiPanel]   = useState(false)
  const [dragging,      setDragging]      = useState(null)
  const matrixRef  = useRef(null)
  const importRef  = useRef(null)

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.BCG || []
        setAnalyses(list)
        if (list.length > 0) setActiveId(list[list.length - 1].id)
      }
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), BCG: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const active = analyses.find(a => a.id === activeId) || null

  // ── CRUD analyses ──
  const createAnalysis = () => {
    if (!newAnalysis.name.trim()) return
    const a = {
      id: uid(), name: newAnalysis.name.trim(), context: newAnalysis.context.trim(),
      createdAt: new Date().toISOString(), products: [], aiResult: null,
    }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowNewForm(false); setNewAnalysis({ name: '', context: '' })
    showToast(`Analyse "${a.name}" créée`)
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) setActiveId(updated[updated.length - 1]?.id || null)
    showToast('Analyse supprimée', 'info')
  }

  const updateAnalysis = (patch) => {
    const updated = analyses.map(a => a.id === activeId ? { ...a, ...patch } : a)
    setAnalyses(updated); persist(updated)
  }

  // ── AI GENERATION (Mode 1) ──
  const generateWithAI = async () => {
    if (!genDescription.trim()) return
    setGenLoading(true)
    try {
      const res = await fetch('/api/generer-management/generer-bcg-auto', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: genDescription,
          projectName: project?.name || '',
          projectTag:  project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      const { result } = data
      // Attach ids to products
      const products = (result.products || []).map(p => ({ ...p, id: uid() }))

      const a = {
        id:        uid(),
        name:      result.analysisName || 'Analyse générée par IA',
        context:   result.context      || genDescription.slice(0, 200),
        createdAt: new Date().toISOString(),
        products,
        aiResult: {
          synthese:        result.synthese,
          recommandations: result.recommandations || [],
          priorites:       result.priorites       || [],
          conclusion:      result.conclusion,
        },
        generatedByAI: true,
      }
      const updated = [...analyses, a]
      setAnalyses(updated); setActiveId(a.id); persist(updated)
      setShowNewForm(false); setGenDescription('')
      // Auto-open AI panel to show the generated analysis
      setAiResult(a.aiResult); setShowAiPanel(true)
      showToast(`✦ "${a.name}" générée avec ${products.length} produits`)
    } catch (err) {
      showToast(err.message, 'error')
    }
    setGenLoading(false)
  }

  // ── PRODUCTS CRUD ──
  const saveProduct = () => {
    if (!productForm.name.trim()) return
    const ms = parseFloat(productForm.marketShare) || 0
    const gr = parseFloat(productForm.growthRate)  || 0
    const product = {
      id:          editProduct?.id || uid(),
      name:        productForm.name.trim(),
      marketShare: Math.min(100, Math.max(0, ms)),
      growthRate:  Math.min(50,  Math.max(-20, gr)),
      revenue:     parseFloat(productForm.revenue) || 0,
      description: productForm.description.trim(),
      quadrant:    getQuadrant(ms, gr),
    }
    const products = editProduct
      ? (active.products || []).map(p => p.id === editProduct.id ? product : p)
      : [...(active.products || []), product]
    updateAnalysis({ products })
    setEditProduct(null); setProductForm(EMPTY_PRODUCT)
    showToast(editProduct ? 'Produit mis à jour' : 'Produit ajouté')
  }

  const deleteProduct = (id) => {
    const products = (active.products || []).filter(p => p.id !== id)
    updateAnalysis({ products })
    if (editProduct?.id === id) { setEditProduct(null); setProductForm(EMPTY_PRODUCT) }
  }

  const startEdit = (product) => {
    setEditProduct(product)
    setProductForm({ name: product.name, marketShare: product.marketShare, growthRate: product.growthRate, revenue: product.revenue, description: product.description })
  }

  // ── AI ANALYSIS (Mode 2 — existing) ──
  const runAI = async () => {
    if (!active || !active.products?.length) { showToast('Ajoutez au moins un produit', 'error'); return }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-bcg', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: active.name,
          context:      active.context,
          products:     active.products,
          projectName:  project?.name || '',
          projectTag:   project?.tag  || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateAnalysis({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── EXPORT (JSON) ──
  const exportAnalysis = () => {
    if (!active) return
    const exportData = { ...active, exportedAt: new Date().toISOString(), exportVersion: '1.0', tool: 'BCG' }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `BCG_${active.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('Analyse exportée')
  }

  // ── IMPORT (JSON) ──
  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        // Validate minimal shape
        if (!data.products || !data.name) throw new Error('Format invalide')
        // Remap ids to avoid collisions
        const imported = {
          ...data,
          id:        uid(),
          createdAt: data.createdAt || new Date().toISOString(),
          products:  (data.products || []).map(p => ({ ...p, id: uid() })),
          importedAt: new Date().toISOString(),
        }
        const updated = [...analyses, imported]
        setAnalyses(updated); setActiveId(imported.id); persist(updated)
        if (imported.aiResult) { setAiResult(imported.aiResult); setShowAiPanel(true) }
        showToast(`"${imported.name}" importée (${imported.products.length} produits)`)
      } catch (err) {
        showToast('Fichier JSON invalide ou corrompu', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''   // reset so same file can be re-imported
  }

  // ── DRAG on matrix ──
  const onMatrixMouseMove = useCallback((e) => {
    if (!dragging || !matrixRef.current) return
    const rect = matrixRef.current.getBoundingClientRect()
    const px   = ((e.clientX - rect.left) / rect.width)  * 100
    const py   = ((e.clientY - rect.top)  / rect.height) * 100
    const ms   = Math.min(100, Math.max(0, Math.round(px)))
    const gr   = Math.min(50,  Math.max(-20, Math.round(50 - (py / 100 * 70))))
    const products = (active?.products || []).map(p =>
      p.id === dragging ? { ...p, marketShare: ms, growthRate: gr, quadrant: getQuadrant(ms, gr) } : p
    )
    updateAnalysis({ products })
  }, [dragging, active])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMatrixMouseMove)
      window.addEventListener('mouseup', () => setDragging(null))
    }
    return () => {
      window.removeEventListener('mousemove', onMatrixMouseMove)
      window.removeEventListener('mouseup', () => setDragging(null))
    }
  }, [dragging, onMatrixMouseMove])

  const toMatrixPos = (ms, gr) => ({
    x: (ms / 100) * 100,
    y: 100 - ((gr + 20) / 70 * 100),
  })

  const byQuadrant = Object.fromEntries(
    Object.keys(QUADRANTS).map(q => [q, (active?.products || []).filter(p => p.quadrant === q)])
  )

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:       #0a0a0f;
          --surface:  #111118;
          --surface2: #18181f;
          --surface3: #1e1e28;
          --border:   rgba(255,255,255,.07);
          --border2:  rgba(255,255,255,.12);
          --text:     #f0eff5;
          --muted:    #6b6a7a;
          --muted2:   #9896aa;
          --accent:   #6366f1;
          --accent2:  #818cf8;
          --star:     #f59e0b;
          --cow:      #22d3a5;
          --qmark:    #818cf8;
          --dog:      #f87171;
          --gen:      #a78bfa;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        .bcg-root { min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Topbar ── */
        .topbar {
          height: 56px; background: var(--surface); border-bottom: 1px solid var(--border);
          display: flex; align-items: center; padding: 0 20px; gap: 12px;
          position: sticky; top: 0; z-index: 100;
        }
        .back-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px;
          background: var(--surface2); border: 1px solid var(--border2); color: var(--muted2);
          font-family: 'Geist Mono', monospace; font-size: 11px; cursor: pointer; transition: all .15s;
        }
        .back-btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .topbar-title { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .topbar-project { font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .topbar-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }

        .btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px;
          cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 11px; letter-spacing: .04em;
          border: 1px solid var(--border2); background: var(--surface2); color: var(--muted2); transition: all .15s;
        }
        .btn:hover { color: var(--text); border-color: rgba(255,255,255,.2); }
        .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .btn.primary:hover { background: #4f52d8; }
        .btn.ai     { background: rgba(245,158,11,.1); border-color: rgba(245,158,11,.3); color: var(--star); }
        .btn.ai:hover { background: rgba(245,158,11,.2); }
        .btn.gen    { background: rgba(167,139,250,.1); border-color: rgba(167,139,250,.3); color: var(--gen); }
        .btn.gen:hover { background: rgba(167,139,250,.18); }
        .btn.import-btn { background: var(--surface2); border-color: var(--border2); color: var(--muted2); }
        .btn:disabled { opacity: .4; cursor: not-allowed; }

        /* ── Layout ── */
        .bcg-body { flex: 1; display: grid; grid-template-columns: 260px 1fr 340px; height: calc(100vh - 56px); overflow: hidden; }

        /* ── Left sidebar ── */
        .analyses-panel {
          background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .panel-header {
          padding: 14px 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .panel-label { font-size: 10px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .panel-list  { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }

        .analysis-item {
          padding: 10px 12px; border-radius: 8px; cursor: pointer;
          border: 1px solid transparent; transition: all .15s; position: relative;
        }
        .analysis-item:hover { background: var(--surface2); }
        .analysis-item.active { background: rgba(99,102,241,.1); border-color: rgba(99,102,241,.25); }
        .analysis-name { font-size: 12px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 6px; }
        .analysis-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; margin-top: 2px; }
        .analysis-del { opacity: 0; position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--dog); cursor: pointer; font-size: 12px; padding: 2px 4px; border-radius: 4px; transition: all .15s; }
        .analysis-item:hover .analysis-del { opacity: 1; }
        .ai-badge { font-size: 8px; padding: 1px 5px; border-radius: 3px; background: rgba(167,139,250,.15); color: var(--gen); border: 1px solid rgba(167,139,250,.3); font-family: 'Geist Mono', monospace; font-weight: 700; }

        /* ── New form ── */
        .new-analysis-form { padding: 14px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }

        /* Mode toggle */
        .mode-toggle { display: flex; gap: 0; background: var(--surface3); border-radius: 7px; padding: 3px; }
        .mode-btn {
          flex: 1; padding: 6px 10px; border-radius: 5px; font-family: 'Geist Mono', monospace;
          font-size: 10px; cursor: pointer; border: none; background: none;
          color: var(--muted2); transition: all .15s; text-align: center;
        }
        .mode-btn.on { background: var(--surface2); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,.3); }
        .mode-btn.ai-mode.on { color: var(--gen); background: rgba(167,139,250,.12); }

        .input {
          width: 100%; background: var(--bg); border: 1px solid var(--border2);
          border-radius: 6px; padding: 8px 10px; font-family: 'Syne', sans-serif;
          font-size: 12px; color: var(--text); outline: none; transition: border-color .15s;
        }
        .input:focus { border-color: var(--accent); }
        .input::placeholder { color: var(--muted); }
        textarea.input { resize: vertical; min-height: 72px; }

        /* AI gen textarea */
        textarea.gen-input {
          width: 100%; background: rgba(167,139,250,.05); border: 1px solid rgba(167,139,250,.25);
          border-radius: 6px; padding: 10px; font-family: 'Syne', sans-serif;
          font-size: 12px; color: var(--text); outline: none; transition: border-color .15s; resize: vertical; min-height: 90px;
        }
        textarea.gen-input:focus { border-color: rgba(167,139,250,.5); }
        textarea.gen-input::placeholder { color: var(--muted); }
        .gen-hint { font-size: 10px; color: var(--muted); line-height: 1.5; font-family: 'Geist Mono', monospace; }

        /* Gen loading */
        .gen-loading-overlay {
          position: absolute; inset: 0; background: rgba(10,10,15,.85); border-radius: 6px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
          z-index: 20;
        }
        .gen-spinner { width: 24px; height: 24px; border: 2px solid rgba(167,139,250,.2); border-top-color: var(--gen); border-radius: 50%; animation: spin .7s linear infinite; }
        .gen-loading-text { font-size: 11px; color: var(--gen); font-family: 'Geist Mono', monospace; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Center: matrix ── */
        .matrix-panel { overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; background: var(--bg); }
        .matrix-title { font-family: 'Instrument Serif', serif; font-size: 22px; font-style: italic; }
        .matrix-context { font-size: 12px; color: var(--muted2); line-height: 1.6; }
        .ai-generated-badge {
          display: inline-flex; align-items: center; gap: 5px; font-size: 10px;
          padding: 3px 9px; border-radius: 4px; background: rgba(167,139,250,.1);
          color: var(--gen); border: 1px solid rgba(167,139,250,.25);
          font-family: 'Geist Mono', monospace; margin-top: 6px;
        }

        /* ── BCG Matrix canvas ── */
        .matrix-wrap { position: relative; user-select: none; }
        .matrix-grid {
          position: relative; width: 100%; aspect-ratio: 1/1; max-height: 480px;
          border: 1px solid var(--border2); border-radius: 10px; overflow: hidden;
          background: var(--surface);
        }
        .q-bg {
          position: absolute; width: 50%; height: 50%;
          display: flex; align-items: flex-start; justify-content: flex-start;
          padding: 10px; pointer-events: none;
        }
        .q-bg.star     { top: 0;   left: 50%; background: rgba(245,158,11,.04); }
        .q-bg.question { top: 0;   left: 0;   background: rgba(129,140,248,.04); }
        .q-bg.cow      { top: 50%; left: 50%; background: rgba(34,211,165,.04); }
        .q-bg.dog      { top: 50%; left: 0;   background: rgba(248,113,113,.04); }
        .q-label { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; font-family: 'Geist Mono', monospace; opacity: .5; }
        .axis-x { position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: var(--border2); pointer-events: none; }
        .axis-y { position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: var(--border2); pointer-events: none; }
        .axis-lbl { position: absolute; font-size: 9px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .product-bubble {
          position: absolute; transform: translate(-50%, -50%);
          border-radius: 50%; cursor: grab; transition: box-shadow .15s;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #fff;
          border: 2px solid rgba(255,255,255,.2); z-index: 10;
        }
        .product-bubble:hover, .product-bubble.dragging { box-shadow: 0 0 0 3px rgba(255,255,255,.15); cursor: grabbing; z-index: 20; }
        .bubble-tooltip {
          position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
          background: var(--surface3); border: 1px solid var(--border2);
          border-radius: 6px; padding: 8px 10px; white-space: nowrap; pointer-events: none;
          font-size: 11px; color: var(--text); z-index: 50;
        }
        .bubble-tooltip-name { font-weight: 700; margin-bottom: 3px; }
        .bubble-tooltip-row  { color: var(--muted2); font-family: 'Geist Mono', monospace; font-size: 10px; }
        .axis-title-x { text-align: center; font-size: 11px; color: var(--muted2); font-family: 'Geist Mono', monospace; margin-top: 8px; }

        /* ── Quadrant cards ── */
        .quadrant-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .q-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
        .q-card-header { display: flex; align-items: center; gap: 8px; }
        .q-icon  { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .q-name  { font-size: 13px; font-weight: 700; }
        .q-desc  { font-size: 11px; color: var(--muted2); line-height: 1.5; }
        .q-products { display: flex; flex-wrap: wrap; gap: 4px; }
        .q-product-chip { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-family: 'Geist Mono', monospace; font-weight: 500; cursor: pointer; }
        .q-empty { font-size: 10px; color: var(--muted); font-style: italic; }

        /* ── Right sidebar ── */
        .products-panel { background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
        .products-list  { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
        .product-row    { padding: 10px 12px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; transition: border-color .15s; }
        .product-row:hover { border-color: var(--border2); }
        .product-row-header { display: flex; align-items: center; gap: 8px; }
        .product-q-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .product-row-name { font-size: 12px; font-weight: 600; flex: 1; }
        .product-row-actions { display: flex; gap: 4px; }
        .icon-btn { width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; font-size: 12px; transition: background .15s; }
        .icon-btn:hover { background: var(--surface3); }
        .product-row-metrics { display: flex; gap: 6px; flex-wrap: wrap; }
        .metric-chip { font-size: 10px; font-family: 'Geist Mono', monospace; color: var(--muted2); background: var(--surface3); padding: 2px 6px; border-radius: 4px; }

        /* ── Product form ── */
        .product-form { padding: 14px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; background: var(--surface); }
        .form-label { font-size: 10px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 4px; display: block; font-family: 'Geist Mono', monospace; }
        .form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .form-group { display: flex; flex-direction: column; }
        .range-input { width: 100%; accent-color: var(--accent); }
        .range-val   { font-size: 11px; color: var(--accent2); font-family: 'Geist Mono', monospace; margin-left: 6px; }

        /* ── AI Panel ── */
        .ai-panel {
          position: fixed; right: 0; top: 56px; bottom: 0; width: 430px;
          background: var(--surface); border-left: 1px solid var(--border);
          z-index: 80; display: flex; flex-direction: column; overflow: hidden;
          transform: translateX(100%); transition: transform .3s ease;
        }
        .ai-panel.open { transform: translateX(0); }
        .ai-panel-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .ai-panel-title  { font-family: 'Instrument Serif', serif; font-size: 18px; font-style: italic; }
        .ai-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .ai-section-title { font-size: 10px; color: var(--muted2); letter-spacing: .08em; text-transform: uppercase; font-family: 'Geist Mono', monospace; margin-bottom: 8px; }
        .ai-summary { background: var(--surface2); border: 1px solid var(--border2); border-radius: 10px; padding: 16px; font-size: 13px; color: var(--text); line-height: 1.7; }
        .ai-reco    { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; gap: 10px; }
        .ai-reco-icon    { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .ai-reco-name    { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
        .ai-reco-text    { font-size: 12px; color: var(--muted2); line-height: 1.6; }
        .ai-reco-action  { font-size: 11px; margin-top: 6px; padding: 4px 10px; border-radius: 4px; display: inline-block; font-family: 'Geist Mono', monospace; }
        .ai-loading      { display: flex; align-items: center; gap: 12px; padding: 24px; color: var(--muted2); font-size: 13px; }
        .spinner { width: 18px; height: 18px; border: 2px solid var(--border2); border-top-color: var(--star); border-radius: 50%; animation: spin .7s linear infinite; }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 500;
          background: var(--surface2); border: 1px solid var(--border2);
          border-radius: 8px; padding: 12px 18px; font-size: 13px;
          box-shadow: 0 8px 32px rgba(0,0,0,.4); animation: slideUp .2s ease;
          display: flex; align-items: center; gap: 8px;
        }
        .toast.error { border-color: rgba(248,113,113,.3); color: var(--dog); }
        .toast.info  { border-color: rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        /* ── Empty ── */
        .empty-cta  { padding: 32px 16px; text-align: center; }
        .empty-icon { font-size: 32px; opacity: .3; margin-bottom: 12px; }
        .empty-txt  { font-size: 13px; color: var(--muted); line-height: 1.6; }

        @media (max-width: 1100px) { .bcg-body { grid-template-columns: 240px 1fr; } .products-panel { display: none; } }
        @media (max-width: 700px)  { .bcg-body { grid-template-columns: 1fr; } .analyses-panel { display: none; } }
      `}</style>

      {/* Hidden import input */}
      <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport}/>

      <div className="bcg-root">

        {/* ── TOPBAR ── */}
        <header className="topbar">
          <button className="back-btn" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>
            ← Retour
          </button>
          <div>
            <div className="topbar-title">BCG Matrix</div>
            {project && <div className="topbar-project">{project.name}</div>}
          </div>
          <div className="topbar-right">
            {/* Import */}
            <button className="btn import-btn" onClick={() => importRef.current?.click()} title="Importer un fichier JSON">
              ↑ Importer
            </button>
            {active && (
              <>
                <button className="btn" onClick={exportAnalysis} title="Exporter en JSON">↓ Exporter</button>
                <button className="btn ai" onClick={runAI} disabled={aiLoading || !active?.products?.length}>
                  {aiLoading ? <><span className="spinner" style={{ borderTopColor: 'var(--star)' }}/> Analyse…</> : '✦ Analyser'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="bcg-body">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="analyses-panel">
            <div className="panel-header">
              <span className="panel-label">Analyses ({analyses.length})</span>
            </div>

            <div className="panel-list">
              {analyses.length === 0 && (
                <div className="empty-cta">
                  <div className="empty-icon">◉</div>
                  <div className="empty-txt">Créez manuellement ou laissez l'IA générer votre première analyse BCG</div>
                </div>
              )}
              {analyses.map(a => (
                <div key={a.id} className={`analysis-item ${activeId === a.id ? 'active' : ''}`} onClick={() => { setActiveId(a.id); if (a.aiResult) setAiResult(a.aiResult) }}>
                  <div className="analysis-name">
                    {a.name}
                    {a.generatedByAI && <span className="ai-badge">IA</span>}
                  </div>
                  <div className="analysis-meta">
                    {a.products?.length || 0} produit(s) · {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    {a.importedAt && ' · importé'}
                  </div>
                  <button className="analysis-del" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                </div>
              ))}
            </div>

            {/* ── New analysis form ── */}
            {showNewForm ? (
              <div className="new-analysis-form" style={{ position: 'relative' }}>
                {/* Mode toggle */}
                <div className="mode-toggle">
                  <button className={`mode-btn ${newMode === 'manual' ? 'on' : ''}`} onClick={() => setNewMode('manual')}>
                    ✎ Manuel
                  </button>
                  <button className={`mode-btn ai-mode ${newMode === 'ai' ? 'on' : ''}`} onClick={() => setNewMode('ai')}>
                    ✦ Générer avec IA
                  </button>
                </div>

                {newMode === 'manual' ? (
                  <>
                    <input
                      className="input" placeholder="Nom de l'analyse"
                      value={newAnalysis.name}
                      onChange={e => setNewAnalysis(p => ({ ...p, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus
                    />
                    <textarea
                      className="input" rows={2} placeholder="Contexte (secteur, marché…)"
                      value={newAnalysis.context}
                      onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn primary" style={{ flex: 1 }} onClick={createAnalysis}>Créer</button>
                      <button className="btn" onClick={() => { setShowNewForm(false); setNewAnalysis({ name: '', context: '' }) }}>✕</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="gen-hint">Décrivez votre entreprise, secteur, produits ou stratégie — l'IA génère automatiquement la matrice BCG.</div>
                    <textarea
                      className="gen-input" rows={5}
                      placeholder="Ex: Startup SaaS B2B proposant 3 produits : une plateforme CRM (leader sur les PME), un module analytics en forte croissance mais à faible part de marché, et un outil legacy de reporting en déclin..."
                      value={genDescription}
                      onChange={e => setGenDescription(e.target.value)}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn gen" style={{ flex: 1 }}
                        onClick={generateWithAI}
                        disabled={genLoading || !genDescription.trim()}
                      >
                        {genLoading ? <><span className="gen-spinner"/> Génération…</> : '✦ Générer la matrice'}
                      </button>
                      <button className="btn" onClick={() => { setShowNewForm(false); setGenDescription('') }}>✕</button>
                    </div>
                    {genLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: 'var(--gen)', fontSize: 11, fontFamily: 'Geist Mono,monospace' }}>
                        <span className="gen-spinner"/>
                        L'IA analyse votre contexte et positionne les produits…
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setShowNewForm(true); setNewMode('manual') }}>
                  ✎ Nouvelle analyse
                </button>
                <button className="btn gen" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setShowNewForm(true); setNewMode('ai') }}>
                  ✦ Générer avec l'IA
                </button>
              </div>
            )}
          </aside>

          {/* ── CENTER: matrix ── */}
          <main className="matrix-panel">
            {!active ? (
              <div className="empty-cta" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div className="empty-icon" style={{ fontSize: 48, marginBottom: 16 }}>◉</div>
                <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 20, fontStyle: 'italic', marginBottom: 8 }}>Sélectionnez ou créez une analyse</div>
                <div className="empty-txt">Créez manuellement ou laissez l'IA construire votre matrice depuis une simple description.</div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="matrix-title">{active.name}</h2>
                  {active.context && <p className="matrix-context">{active.context}</p>}
                  {active.generatedByAI && <div className="ai-generated-badge">✦ Générée par IA · modifiable</div>}
                </div>

                {/* Matrix */}
                <div className="matrix-wrap">
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ position: 'relative', width: 20, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontSize: 10, color: 'var(--muted2)', fontFamily: 'Geist Mono,monospace', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                        Taux de croissance →
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="matrix-grid" ref={matrixRef} style={{ cursor: dragging ? 'grabbing' : 'default' }}>
                        <div className="q-bg question"><span className="q-label" style={{ color: 'var(--qmark)' }}>?</span></div>
                        <div className="q-bg star"><span className="q-label" style={{ color: 'var(--star)' }}>★</span></div>
                        <div className="q-bg dog"><span className="q-label" style={{ color: 'var(--dog)' }}>✕</span></div>
                        <div className="q-bg cow"><span className="q-label" style={{ color: 'var(--cow)' }}>◉</span></div>
                        <div className="axis-x"/>
                        <div className="axis-y"/>
                        <span className="axis-lbl" style={{ bottom: 6, left: 8 }}>Faible part</span>
                        <span className="axis-lbl" style={{ bottom: 6, right: 8 }}>Forte part</span>
                        <span className="axis-lbl" style={{ top: 6, left: '50%', transform: 'translateX(-50%)' }}>Forte croissance</span>
                        <span className="axis-lbl" style={{ bottom: 6, left: '50%', transform: 'translateX(-50%)' }}>Faible croissance</span>
                        {(active.products || []).map(p => {
                          const pos  = toMatrixPos(p.marketShare, p.growthRate)
                          const q    = QUADRANTS[p.quadrant]
                          const size = Math.max(28, Math.min(52, 28 + (p.revenue || 0) / 1000 * 4))
                          return (
                            <div
                              key={p.id}
                              className={`product-bubble ${dragging === p.id ? 'dragging' : ''}`}
                              style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: size, height: size, background: q.color, fontSize: size > 38 ? 11 : 9 }}
                              onMouseDown={e => { e.preventDefault(); setDragging(p.id) }}
                              onMouseEnter={() => setHovered(p.id)}
                              onMouseLeave={() => setHovered(null)}
                              onClick={() => startEdit(p)}
                            >
                              {p.name.slice(0, 2).toUpperCase()}
                              {hovered === p.id && (
                                <div className="bubble-tooltip">
                                  <div className="bubble-tooltip-name">{p.name}</div>
                                  <div className="bubble-tooltip-row">Part marché: {p.marketShare}%</div>
                                  <div className="bubble-tooltip-row">Croissance: {p.growthRate}%</div>
                                  {p.revenue > 0 && <div className="bubble-tooltip-row">CA: {p.revenue.toLocaleString('fr-FR')} k€</div>}
                                  {p.description && <div className="bubble-tooltip-row" style={{ maxWidth: 200, whiteSpace: 'normal', marginTop: 4 }}>{p.description}</div>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <div className="axis-title-x">Part de marché relative →</div>
                    </div>
                  </div>
                </div>

                {/* Quadrant summary */}
                <div className="quadrant-cards">
                  {Object.entries(QUADRANTS).map(([key, q]) => (
                    <div key={key} className="q-card" style={{ borderColor: `color-mix(in srgb, ${q.color} 20%, transparent)` }}>
                      <div className="q-card-header">
                        <div className="q-icon" style={{ background: q.bg, color: q.color }}>{q.icon}</div>
                        <div>
                          <div className="q-name" style={{ color: q.color }}>{q.label}</div>
                        </div>
                      </div>
                      <div className="q-desc">{q.desc}</div>
                      <div className="q-products">
                        {byQuadrant[key].length === 0
                          ? <span className="q-empty">Aucun produit</span>
                          : byQuadrant[key].map(p => (
                            <span key={p.id} className="q-product-chip"
                              style={{ background: q.bg, color: q.color, border: `1px solid color-mix(in srgb, ${q.color} 25%, transparent)` }}
                              onClick={() => startEdit(p)}
                            >{p.name}</span>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>

          {/* ── RIGHT: products panel ── */}
          <aside className="products-panel">
            <div className="panel-header">
              <span className="panel-label">Produits {active ? `(${active.products?.length || 0})` : ''}</span>
              {active && !editProduct && (
                <button className="btn" style={{ padding: '5px 10px', fontSize: 10 }} onClick={() => { setEditProduct(false); setProductForm(EMPTY_PRODUCT) }}>
                  + Ajouter
                </button>
              )}
            </div>

            {!active ? (
              <div className="empty-cta"><div className="empty-txt">Sélectionnez une analyse</div></div>
            ) : (
              <>
                <div className="products-list">
                  {(active.products || []).length === 0 && (
                    <div className="empty-cta">
                      <div className="empty-icon">◎</div>
                      <div className="empty-txt">Ajoutez des produits ou utilisez la génération IA</div>
                    </div>
                  )}
                  {(active.products || []).map(p => {
                    const q = QUADRANTS[p.quadrant]
                    return (
                      <div key={p.id} className="product-row">
                        <div className="product-row-header">
                          <div className="product-q-dot" style={{ background: q.color }}/>
                          <div className="product-row-name">{p.name}</div>
                          <div className="product-row-actions">
                            <button className="icon-btn" style={{ color: 'var(--muted2)' }} onClick={() => startEdit(p)}>✎</button>
                            <button className="icon-btn" style={{ color: 'var(--dog)' }} onClick={() => deleteProduct(p.id)}>✕</button>
                          </div>
                        </div>
                        <div className="product-row-metrics">
                          <span className="metric-chip">Part: {p.marketShare}%</span>
                          <span className="metric-chip">Croiss: {p.growthRate}%</span>
                          {p.revenue > 0 && <span className="metric-chip">{p.revenue.toLocaleString()}k€</span>}
                        </div>
                        {p.description && <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>{p.description}</div>}
                      </div>
                    )
                  })}
                </div>

                {(editProduct !== null) && (
                  <div className="product-form">
                    <div style={{ fontFamily: 'Instrument Serif,serif', fontSize: 15, fontStyle: 'italic' }}>
                      {editProduct ? `Modifier "${editProduct.name}"` : 'Nouveau produit'}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nom *</label>
                      <input className="input" placeholder="Ex: Produit A" value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}/>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Part de marché <span className="range-val">{productForm.marketShare || 0}%</span></label>
                        <input type="range" className="range-input" min="0" max="100" value={productForm.marketShare || 0}
                          onChange={e => setProductForm(p => ({ ...p, marketShare: e.target.value }))}/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Croissance <span className="range-val">{productForm.growthRate || 0}%</span></label>
                        <input type="range" className="range-input" min="-20" max="50" value={productForm.growthRate || 0}
                          onChange={e => setProductForm(p => ({ ...p, growthRate: e.target.value }))}/>
                      </div>
                    </div>

                    {/* Live quadrant preview */}
                    {productForm.marketShare !== '' && (() => {
                      const q = QUADRANTS[getQuadrant(parseFloat(productForm.marketShare), parseFloat(productForm.growthRate))]
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: q.bg, border: `1px solid color-mix(in srgb, ${q.color} 25%, transparent)` }}>
                          <span style={{ color: q.color, fontWeight: 700 }}>{q.icon}</span>
                          <span style={{ fontSize: 11, color: q.color, fontFamily: 'Geist Mono,monospace' }}>{q.label}</span>
                        </div>
                      )
                    })()}

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">CA (k€)</label>
                        <input className="input" type="number" placeholder="0" value={productForm.revenue}
                          onChange={e => setProductForm(p => ({ ...p, revenue: e.target.value }))}/>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="input" rows={2} placeholder="Notes…" value={productForm.description}
                        onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}/>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn primary" style={{ flex: 1 }} onClick={saveProduct}>{editProduct ? 'Mettre à jour' : 'Ajouter'}</button>
                      <button className="btn" onClick={() => { setEditProduct(null); setProductForm(EMPTY_PRODUCT) }}>Annuler</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>

        {/* ── AI SLIDING PANEL ── */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-panel-header">
            <div>
              <span className="ai-panel-title">Analyse IA ✦</span>
              {active?.generatedByAI && <div style={{ fontSize: 10, color: 'var(--gen)', fontFamily: 'Geist Mono,monospace', marginTop: 2 }}>Matrice générée automatiquement</div>}
            </div>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-content">
            {aiLoading && (
              <div className="ai-loading">
                <div className="spinner"/>
                Analyse en cours par Claude…
              </div>
            )}

            {!aiLoading && !aiResult && active?.aiResult && (() => { setAiResult(active.aiResult); return null })()}

            {aiResult && (
              <>
                {aiResult.synthese && (
                  <div>
                    <div className="ai-section-title">Synthèse stratégique</div>
                    <div className="ai-summary">{aiResult.synthese}</div>
                  </div>
                )}

                {aiResult.recommandations?.length > 0 && (
                  <div>
                    <div className="ai-section-title">Recommandations par produit</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {aiResult.recommandations.map((r, i) => {
                        const q = QUADRANTS[r.quadrant] || QUADRANTS.dog
                        return (
                          <div key={i} className="ai-reco">
                            <span className="ai-reco-icon" style={{ color: q.color }}>{q.icon}</span>
                            <div>
                              <div className="ai-reco-name">{r.produit}</div>
                              <div className="ai-reco-text">{r.analyse}</div>
                              <span className="ai-reco-action" style={{ background: q.bg, color: q.color, border: `1px solid color-mix(in srgb, ${q.color} 25%, transparent)` }}>
                                {r.action}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {aiResult.priorites?.length > 0 && (
                  <div>
                    <div className="ai-section-title">Priorités d'action</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiResult.priorites.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <span style={{ fontFamily: 'Geist Mono,monospace', fontSize: 10, color: 'var(--muted)', paddingTop: 1 }}>#{i + 1}</span>
                          <span style={{ fontSize: 12, lineHeight: 1.6 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.conclusion && (
                  <div>
                    <div className="ai-section-title">Conclusion</div>
                    <div className="ai-summary" style={{ fontStyle: 'italic', color: 'var(--muted2)' }}>{aiResult.conclusion}</div>
                  </div>
                )}

                {/* Re-analyze button */}
                {!aiLoading && active?.products?.length > 0 && (
                  <div style={{ paddingTop: 4 }}>
                    <button className="btn ai" style={{ width: '100%', justifyContent: 'center' }} onClick={runAI}>
                      ↺ Relancer l'analyse
                    </button>
                  </div>
                )}
              </>
            )}

            {!aiLoading && !aiResult && (
              <div className="empty-cta">
                <div className="empty-icon">✦</div>
                <div className="empty-txt">Cliquez sur "Analyser" pour obtenir des recommandations stratégiques basées sur votre matrice.</div>
              </div>
            )}
          </div>
        </div>

        {/* ── TOAST ── */}
        {toast && (
          <div className={`toast ${toast.type || ''}`}>
            {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}