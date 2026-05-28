'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── Tool Catalog ────────────────────────────────────────────────────────────
const TOOLS = [
  {
    id: 'BCG',
    name: 'BCG Matrix',
    category: 'Stratégie',
    description: 'Analysez votre portefeuille produits selon la part de marché et la croissance. Identifiez Stars, Cash Cows, Question Marks et Dogs.',
    icon: '◉',
    color: '#0f4c81',
    bg: '#e8f1fa',
    path: '/management/bcg',
    ready: true,
  },
  {
    id: 'SWOT',
    name: 'SWOT Analysis',
    category: 'Analyse',
    description: 'Cartographiez les Forces, Faiblesses, Opportunités et Menaces de votre projet pour une vision stratégique complète.',
    icon: '⊞',
    color: '#1a6b4a',
    bg: '#e6f5ee',
    path: '/management/swot',
    ready: true,
  },
  {
    id: 'OKR',
    name: 'OKR Framework',
    category: 'Objectifs',
    description: 'Définissez vos Objectives & Key Results. Alignez l\'équipe sur des ambitions mesurables et inspirantes.',
    icon: '◎',
    color: '#7c3aed',
    bg: '#f0ebfe',
    path: '/management/okr',
    ready: true,
  },
  {
    id: 'PESTEL',
    name: 'PESTEL Analysis',
    category: 'Macro-environnement',
    description: 'Analysez les facteurs Politiques, Économiques, Sociaux, Technologiques, Environnementaux et Légaux.',
    icon: '⬡',
    color: '#b45309',
    bg: '#fef3e2',
    path: '/management/pestel',
    ready: true,
  },
  {
    id: 'BMC',
    name: 'Business Model Canvas',
    category: 'Modèle d\'affaires',
    description: 'Visualisez et construisez votre modèle d\'affaires sur les 9 blocs fondamentaux de Osterwalder.',
    icon: '⊟',
    color: '#0e7490',
    bg: '#e0f5f9',
    path: '/management/bmc',
    ready: true,
  },
  {
    id: 'PORTER',
    name: 'Porter\'s 5 Forces',
    category: 'Concurrence',
    description: 'Évaluez l\'attractivité concurrentielle de votre marché via les 5 forces de Michael Porter.',
    icon: '⬠',
    color: '#be123c',
    bg: '#fde8ee',
    path: '/management/porterforces',
    ready: true,
  },
  {
    id: 'GANTT',
    name: 'Gantt Chart',
    category: 'Planification',
    description: 'Planifiez et suivez vos tâches dans le temps. Visualisez les dépendances et jalons clés.',
    icon: '≡',
    color: '#065f46',
    bg: '#d1fae5',
    path: '/management/gantt',
    ready: true,
  },
  {
    id: 'BALANCED',
    name: 'Balanced Scorecard',
    category: 'Performance',
    description: 'Mesurez la performance selon 4 perspectives : Finance, Clients, Processus internes, Apprentissage.',
    icon: '◈',
    color: '#6b21a8',
    bg: '#f5e8fe',
    path: '/management/bc',
    ready: true,
  },
  {
    id: 'ANSOFF',
    name: 'Ansoff Matrix',
    category: 'Croissance',
    description: 'Choisissez votre stratégie de croissance : Pénétration, Développement, Diversification ou Extension.',
    icon: '⊕',
    color: '#9a3412',
    bg: '#feede8',
    path: '/management/ansoff',
    ready: true,
  },
]

// ─── ID Generator ────────────────────────────────────────────────────────────
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// ─── LocalStorage key ────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

export default function ManagementPage() {
  const router = useRouter()
  const fileRef = useRef(null)

  const [projects, setProjects]       = useState([])
  const [activeProject, setActive]    = useState(null)   // project id
  const [showNewProj, setShowNewProj] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjDesc, setNewProjDesc] = useState('')
  const [newProjTag,  setNewProjTag]  = useState('')
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState('all')
  const [toast, setToast]             = useState(null)

  // ── Hydrate from localStorage ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        setProjects(data.projects || [])
        if (data.activeProject) setActive(data.activeProject)
      }
    } catch {}
  }, [])

  // ── Persist on change ──
  useEffect(() => {
    if (projects.length > 0 || activeProject) {
      localStorage.setItem(LS_KEY, JSON.stringify({ projects, activeProject }))
    }
  }, [projects, activeProject])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── CRUD Projects ──
  const createProject = () => {
    if (!newProjName.trim()) return
    const p = {
      id: uid(),
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      tag: newProjTag.trim(),
      createdAt: new Date().toISOString(),
      tools: {},   // toolId → [{ id, name, createdAt, data... }]
    }
    const updated = [...projects, p]
    setProjects(updated)
    setActive(p.id)
    setShowNewProj(false)
    setNewProjName(''); setNewProjDesc(''); setNewProjTag('')
    showToast(`Projet "${p.name}" créé`)
  }

  const deleteProject = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (activeProject === id) setActive(projects.find(p => p.id !== id)?.id || null)
    showToast('Projet supprimé', 'info')
  }

  const currentProject = projects.find(p => p.id === activeProject)

  // ── Export / Import ──
  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ projects, activeProject, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `management_export_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('Export réussi')
  }

  const importFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.projects) {
          setProjects(data.projects)
          if (data.activeProject) setActive(data.activeProject)
          showToast(`${data.projects.length} projet(s) importé(s)`)
        }
      } catch { showToast('Fichier invalide', 'error') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Navigate to tool ──
  const openTool = (tool) => {
    if (!tool.ready) { showToast('Bientôt disponible !', 'info'); return }
    if (!currentProject) { showToast('Sélectionnez ou créez un projet d\'abord', 'error'); return }
    router.push(`${tool.path}?project=${currentProject.id}`)
  }

  // ── Filter tools ──
  const categories = ['all', ...new Set(TOOLS.map(t => t.category))]
  const visibleTools = TOOLS.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || t.category === filter
    return matchSearch && matchFilter
  })

  // ── Tool usage count ──
  const toolCount = (toolId) => {
    if (!currentProject?.tools?.[toolId]) return 0
    return currentProject.tools[toolId].length
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:       #0a0a0f;
          --surface:  #111118;
          --surface2: #18181f;
          --border:   rgba(255,255,255,.07);
          --border2:  rgba(255,255,255,.12);
          --text:     #f0eff5;
          --muted:    #6b6a7a;
          --muted2:   #9896aa;
          --accent:   #6366f1;
          --accent2:  #818cf8;
          --green:    #22d3a5;
          --red:      #f87171;
          --gold:     #fbbf24;
        }

        body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }

        .mgmt-root {
          min-height: 100vh;
          background: var(--bg);
          display: grid;
          grid-template-columns: 280px 1fr;
          grid-template-rows: auto 1fr;
        }

        /* ── Topbar ── */
        .topbar {
          grid-column: 1 / -1;
          height: 60px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
          position: sticky; top: 0; z-index: 100;
        }
        .topbar-logo {
          font-family: 'Instrument Serif', serif;
          font-size: 20px;
          font-style: italic;
          color: var(--text);
          display: flex; align-items: center; gap: 8px;
        }
        .topbar-logo-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
        .topbar-tagline { font-size: 11px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; font-family: 'Geist Mono', monospace; }
        .topbar-right { margin-left: auto; display: flex; gap: 8px; }
        .btn-icon {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 6px;
          font-family: 'Geist Mono', monospace; font-size: 11px; letter-spacing: .04em;
          cursor: pointer; border: 1px solid var(--border2);
          background: var(--surface2); color: var(--muted2);
          transition: all .15s;
        }
        .btn-icon:hover { color: var(--text); border-color: rgba(255,255,255,.2); }

        /* ── Sidebar ── */
        .sidebar {
          background: var(--surface);
          border-right: 1px solid var(--border);
          padding: 20px 16px;
          display: flex; flex-direction: column; gap: 4px;
          overflow-y: auto; height: calc(100vh - 60px); position: sticky; top: 60px;
        }
        .sidebar-label {
          font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
          color: var(--muted); padding: 8px 8px 4px;
          font-family: 'Geist Mono', monospace;
        }
        .project-item {
          padding: 10px 12px; border-radius: 8px;
          cursor: pointer; transition: all .15s;
          display: flex; align-items: center; gap: 10px;
          border: 1px solid transparent;
        }
        .project-item:hover { background: var(--surface2); }
        .project-item.active { background: rgba(99,102,241,.12); border-color: rgba(99,102,241,.3); }
        .project-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
        .project-dot.inactive { background: var(--muted); }
        .project-name { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; truncate: ellipsis; white-space: nowrap; overflow: hidden; }
        .project-meta { font-size: 10px; color: var(--muted); font-family: 'Geist Mono', monospace; }
        .project-delete { opacity: 0; transition: opacity .15s; background: none; border: none; color: var(--red); cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: 4px; }
        .project-item:hover .project-delete { opacity: 1; }

        .btn-new-project {
          margin-top: 8px;
          width: 100%; padding: 10px 12px; border-radius: 8px;
          border: 1px dashed var(--border2); background: transparent;
          color: var(--muted2); font-family: 'Geist Mono', monospace; font-size: 12px;
          cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 8px;
        }
        .btn-new-project:hover { border-color: var(--accent); color: var(--accent); }

        .sidebar-bottom { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }

        /* ── Main ── */
        .main { padding: 32px; overflow-y: auto; }

        .main-header { margin-bottom: 28px; }
        .main-title {
          font-family: 'Instrument Serif', serif;
          font-size: 32px; font-style: italic;
          color: var(--text); margin-bottom: 4px;
        }
        .main-subtitle { font-size: 13px; color: var(--muted); }

        /* ── Project banner ── */
        .project-banner {
          background: linear-gradient(135deg, rgba(99,102,241,.15), rgba(129,140,248,.05));
          border: 1px solid rgba(99,102,241,.2);
          border-radius: 12px; padding: 16px 20px;
          margin-bottom: 28px;
          display: flex; align-items: center; gap: 16px;
        }
        .project-banner-icon { font-size: 28px; line-height: 1; }
        .project-banner-name { font-size: 18px; font-weight: 700; color: var(--text); }
        .project-banner-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .project-tag {
          margin-left: auto; padding: 4px 12px; border-radius: 99px;
          background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.3);
          font-size: 11px; color: var(--accent2); font-family: 'Geist Mono', monospace;
        }

        /* ── No project state ── */
        .empty-state {
          text-align: center; padding: 80px 40px;
          border: 1px dashed var(--border2); border-radius: 16px;
          margin-bottom: 32px;
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: .4; }
        .empty-title { font-family: 'Instrument Serif', serif; font-size: 22px; font-style: italic; color: var(--text); margin-bottom: 8px; }
        .empty-sub { font-size: 13px; color: var(--muted); }

        /* ── Search + filters ── */
        .toolbar { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
        .search-input {
          flex: 1; min-width: 200px;
          background: var(--surface); border: 1px solid var(--border2);
          border-radius: 8px; padding: 9px 14px;
          font-family: 'Geist Mono', monospace; font-size: 12px;
          color: var(--text); outline: none; transition: border-color .15s;
        }
        .search-input::placeholder { color: var(--muted); }
        .search-input:focus { border-color: var(--accent); }
        .filter-btn {
          padding: 8px 14px; border-radius: 6px; cursor: pointer;
          font-family: 'Geist Mono', monospace; font-size: 11px; letter-spacing: .04em;
          border: 1px solid var(--border2); background: var(--surface2);
          color: var(--muted2); transition: all .15s; white-space: nowrap;
        }
        .filter-btn.active { background: rgba(99,102,241,.2); border-color: rgba(99,102,241,.4); color: var(--accent2); }
        .filter-btn:hover:not(.active) { border-color: rgba(255,255,255,.2); color: var(--text); }

        /* ── Tools grid ── */
        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        /* ── Tool card ── */
        .tool-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px; padding: 20px;
          cursor: pointer; transition: all .2s;
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; gap: 12px;
        }
        .tool-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: var(--tool-color);
          opacity: 0; transition: opacity .2s;
        }
        .tool-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,.3); }
        .tool-card:hover::before { opacity: 1; }
        .tool-card.locked { cursor: default; opacity: .6; }
        .tool-card.locked:hover { transform: none; box-shadow: none; }

        .tool-card-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .tool-icon-wrap {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; line-height: 1;
          background: var(--tool-bg); color: var(--tool-color);
          border: 1px solid color-mix(in srgb, var(--tool-color) 20%, transparent);
        }
        .tool-badges { display: flex; gap: 6px; flex-wrap: wrap; }
        .tool-badge {
          padding: 3px 8px; border-radius: 4px; font-size: 10px;
          font-family: 'Geist Mono', monospace; letter-spacing: .04em;
        }
        .badge-category { background: var(--surface2); color: var(--muted2); border: 1px solid var(--border); }
        .badge-ready { background: rgba(34,211,165,.1); color: var(--green); border: 1px solid rgba(34,211,165,.2); }
        .badge-soon { background: var(--surface2); color: var(--muted); border: 1px solid var(--border); }
        .badge-count {
          background: rgba(99,102,241,.15); color: var(--accent2);
          border: 1px solid rgba(99,102,241,.3);
        }

        .tool-name { font-size: 16px; font-weight: 700; color: var(--text); }
        .tool-desc { font-size: 12px; color: var(--muted2); line-height: 1.6; flex: 1; }
        .tool-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 12px; border-top: 1px solid var(--border);
          font-size: 11px; color: var(--muted); font-family: 'Geist Mono', monospace;
        }
        .tool-open-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 5px 12px; border-radius: 6px;
          background: rgba(99,102,241,.15); border: 1px solid rgba(99,102,241,.3);
          color: var(--accent2); font-size: 11px; font-family: 'Geist Mono', monospace;
          transition: all .15s;
        }
        .tool-card:hover .tool-open-btn { background: rgba(99,102,241,.25); }

        /* ── Modal new project ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.7);
          z-index: 200; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .modal {
          background: var(--surface); border: 1px solid var(--border2);
          border-radius: 16px; padding: 28px; width: 100%; max-width: 440px;
          box-shadow: 0 24px 64px rgba(0,0,0,.5);
        }
        .modal-title {
          font-family: 'Instrument Serif', serif; font-size: 22px; font-style: italic;
          color: var(--text); margin-bottom: 20px;
        }
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 11px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 6px; font-family: 'Geist Mono', monospace; }
        .form-input {
          width: 100%; background: var(--bg); border: 1px solid var(--border2);
          border-radius: 8px; padding: 10px 14px; font-family: 'Syne', sans-serif;
          font-size: 14px; color: var(--text); outline: none; transition: border-color .15s;
        }
        .form-input:focus { border-color: var(--accent); }
        .form-input::placeholder { color: var(--muted); }
        .modal-actions { display: flex; gap: 10px; margin-top: 20px; }
        .btn-primary {
          flex: 1; padding: 11px; border-radius: 8px; cursor: pointer;
          background: var(--accent); border: none; color: #fff;
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 600;
          transition: all .15s;
        }
        .btn-primary:hover { background: #4f52d8; }
        .btn-secondary {
          padding: 11px 20px; border-radius: 8px; cursor: pointer;
          background: var(--surface2); border: 1px solid var(--border2); color: var(--muted2);
          font-family: 'Syne', sans-serif; font-size: 14px;
          transition: all .15s;
        }
        .btn-secondary:hover { color: var(--text); }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 500;
          background: var(--surface2); border: 1px solid var(--border2);
          border-radius: 8px; padding: 12px 18px;
          font-size: 13px; color: var(--text);
          box-shadow: 0 8px 32px rgba(0,0,0,.4);
          animation: slideUp .2s ease;
          display: flex; align-items: center; gap: 8px;
        }
        .toast.error { border-color: rgba(248,113,113,.3); }
        .toast.info { border-color: rgba(99,102,241,.3); }
        @keyframes slideUp { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .mgmt-root { grid-template-columns: 1fr; }
          .sidebar { display: none; }
          .main { padding: 20px 16px; }
        }
      `}</style>

      <div className="mgmt-root">

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-logo">
            <div className="topbar-logo-dot"/>
            StratOS
          </div>
          <span className="topbar-tagline">Management Suite</span>
          <div className="topbar-right">
            <button className="btn-icon" onClick={() => fileRef.current?.click()}>
              ↑ Importer
            </button>
            <button className="btn-icon" onClick={exportAll}>
              ↓ Exporter
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={importFile}/>
        </header>

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-label">Projets ({projects.length})</div>

          {projects.map(p => (
            <div
              key={p.id}
              className={`project-item ${activeProject === p.id ? 'active' : ''}`}
              onClick={() => setActive(p.id)}
            >
              <div className={`project-dot ${activeProject === p.id ? '' : 'inactive'}`}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="project-name">{p.name}</div>
                <div className="project-meta">
                  {Object.values(p.tools || {}).reduce((a, arr) => a + arr.length, 0)} outil(s)
                </div>
              </div>
              <button className="project-delete" onClick={e => { e.stopPropagation(); deleteProject(p.id) }}>✕</button>
            </div>
          ))}

          <button className="btn-new-project" onClick={() => setShowNewProj(true)}>
            + Nouveau projet
          </button>

          <div className="sidebar-bottom">
            <div className="sidebar-label">Navigation</div>
            {[
              { label: 'Dashboard', icon: '⊡' },
              { label: 'Analyses', icon: '◉' },
              { label: 'Rapports', icon: '≡' },
            ].map(item => (
              <div key={item.label} className="project-item">
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: 'var(--muted2)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="main">
          <div className="main-header">
            <h1 className="main-title">
              {currentProject ? `${currentProject.name}` : 'Boîte à outils stratégique'}
            </h1>
            <p className="main-subtitle">
              {currentProject
                ? currentProject.description || 'Sélectionnez un outil pour commencer votre analyse'
                : 'Créez un projet puis sélectionnez un outil pour démarrer'}
            </p>
          </div>

          {/* Project banner */}
          {currentProject && (
            <div className="project-banner">
              <div className="project-banner-icon">📁</div>
              <div>
                <div className="project-banner-name">{currentProject.name}</div>
                {currentProject.description && (
                  <div className="project-banner-desc">{currentProject.description}</div>
                )}
              </div>
              {currentProject.tag && (
                <div className="project-tag">{currentProject.tag}</div>
              )}
            </div>
          )}

          {!currentProject && projects.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">◎</div>
              <div className="empty-title">Aucun projet pour l'instant</div>
              <p className="empty-sub">Créez votre premier projet dans la barre latérale<br/>pour accéder aux outils stratégiques.</p>
            </div>
          )}

          {/* Toolbar */}
          <div className="toolbar">
            <input
              className="search-input"
              placeholder="Rechercher un outil…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${filter === cat ? 'active' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat === 'all' ? 'Tous' : cat}
              </button>
            ))}
          </div>

          {/* Tools grid */}
          <div className="tools-grid">
            {visibleTools.map(tool => {
              const count = toolCount(tool.id)
              return (
                <div
                  key={tool.id}
                  className={`tool-card ${!tool.ready ? 'locked' : ''}`}
                  style={{ '--tool-color': tool.color, '--tool-bg': tool.bg }}
                  onClick={() => openTool(tool)}
                >
                  <div className="tool-card-header">
                    <div className="tool-icon-wrap">{tool.icon}</div>
                    <div className="tool-badges">
                      <span className="tool-badge badge-category">{tool.category}</span>
                      {tool.ready
                        ? <span className="tool-badge badge-ready">Actif</span>
                        : <span className="tool-badge badge-soon">Bientôt</span>
                      }
                      {count > 0 && <span className="tool-badge badge-count">{count} analyse{count > 1 ? 's' : ''}</span>}
                    </div>
                  </div>

                  <div>
                    <div className="tool-name">{tool.name}</div>
                  </div>

                  <div className="tool-desc">{tool.description}</div>

                  <div className="tool-footer">
                    <span>{tool.ready ? 'Cliquer pour ouvrir' : 'En développement'}</span>
                    {tool.ready && (
                      <div className="tool-open-btn">Ouvrir →</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </main>

        {/* ── New project modal ── */}
        {showNewProj && (
          <div className="modal-overlay" onClick={() => setShowNewProj(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Nouveau projet</div>

              <div className="form-group">
                <label className="form-label">Nom du projet *</label>
                <input
                  className="form-input"
                  placeholder="Ex: Lancement produit 2025"
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  placeholder="Contexte, objectifs…"
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tag / Secteur</label>
                <input
                  className="form-input"
                  placeholder="Ex: SaaS, Retail, Healthcare…"
                  value={newProjTag}
                  onChange={e => setNewProjTag(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowNewProj(false)}>Annuler</button>
                <button className="btn-primary" onClick={createProject}>Créer le projet</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {toast && (
          <div className={`toast ${toast.type || ''}`}>
            {toast.type === 'error' ? '✕' : toast.type === 'info' ? 'ℹ' : '✓'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}