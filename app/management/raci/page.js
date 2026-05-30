'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const ROLES = ['R', 'A', 'C', 'I']
const ROLE_META = {
  R: { label: 'Responsible', fr: 'Responsable', desc: 'Réalise la tâche',      color: '#6366f1', bg: 'rgba(99,102,241,.13)',  border: 'rgba(99,102,241,.35)' },
  A: { label: 'Accountable', fr: 'Valide',       desc: 'Valide et rend compte', color: '#f59e0b', bg: 'rgba(245,158,11,.13)',  border: 'rgba(245,158,11,.35)' },
  C: { label: 'Consulted',   fr: 'Consulté',     desc: 'Consulté avant/pendant',color: '#34d399', bg: 'rgba(52,211,153,.13)',  border: 'rgba(52,211,153,.35)' },
  I: { label: 'Informed',    fr: 'Informé',      desc: 'Informé du résultat',   color: '#94a3b8', bg: 'rgba(148,163,184,.13)', border: 'rgba(148,163,184,.35)' },
}

const PHASE_OPTIONS = ['Initiation', 'Planification', 'Exécution', 'Contrôle', 'Clôture', 'Général']
const ALERT_COLORS = { surcharge: '#f87171', 'sous-utilisation': '#f59e0b', confusion_roles: '#a78bfa', ok: '#34d399' }
const SEVERITE_COLORS = { haute: '#f87171', moyenne: '#f59e0b', faible: '#94a3b8' }
const PRIORITE_COLORS = { haute: '#f87171', moyenne: '#f59e0b', faible: '#34d399' }

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  ocean: {
    label: 'Océan', icon: '◈',
    vars: {
      '--bg': '#050c1a', '--s1': '#081428', '--s2': '#0c1e3a', '--s3': '#10274d',
      '--b1': 'rgba(6,182,212,.12)', '--b2': 'rgba(6,182,212,.22)', '--b3': 'rgba(6,182,212,.32)',
      '--tx': '#e0f2fe', '--mu': '#4a7fa0', '--mu2': '#7fb8d4',
      '--acc': '#06b6d4', '--acc2': '#22d3ee',
      '--acc-bg': 'rgba(6,182,212,.1)', '--acc-b': 'rgba(6,182,212,.28)'
    },
  },
  midnight: {
    label: 'Minuit', icon: '⬡',
    vars: {
      '--bg': '#0a0a0f', '--s1': '#111118', '--s2': '#18181f', '--s3': '#1e1e28',
      '--b1': 'rgba(255,255,255,.07)', '--b2': 'rgba(255,255,255,.12)', '--b3': 'rgba(255,255,255,.18)',
      '--tx': '#f0eff5', '--mu': '#6b6a7a', '--mu2': '#9896aa',
      '--acc': '#6366f1', '--acc2': '#818cf8',
      '--acc-bg': 'rgba(99,102,241,.1)', '--acc-b': 'rgba(99,102,241,.3)'
    },
  },
  forest: {
    label: 'Forêt', icon: '◆',
    vars: {
      '--bg': '#060d0a', '--s1': '#0a1410', '--s2': '#0f1d17', '--s3': '#14271f',
      '--b1': 'rgba(52,211,153,.1)', '--b2': 'rgba(52,211,153,.2)', '--b3': 'rgba(52,211,153,.3)',
      '--tx': '#ecfdf5', '--mu': '#3d7055', '--mu2': '#6db38e',
      '--acc': '#34d399', '--acc2': '#6ee7b7',
      '--acc-bg': 'rgba(52,211,153,.1)', '--acc-b': 'rgba(52,211,153,.28)'
    },
  },
  sunset: {
    label: 'Coucher de soleil', icon: '◉',
    vars: {
      '--bg': '#0f0806', '--s1': '#1a0f0a', '--s2': '#261710', '--s3': '#321f15',
      '--b1': 'rgba(251,146,60,.1)', '--b2': 'rgba(251,146,60,.2)', '--b3': 'rgba(251,146,60,.3)',
      '--tx': '#fff7ed', '--mu': '#7a4a2d', '--mu2': '#c4895a',
      '--acc': '#fb923c', '--acc2': '#fdba74',
      '--acc-bg': 'rgba(251,146,60,.1)', '--acc-b': 'rgba(251,146,60,.28)'
    },
  },
  aurora: {
    label: 'Aurore', icon: '✦',
    vars: {
      '--bg': '#08060f', '--s1': '#100e1a', '--s2': '#181526', '--s3': '#201c32',
      '--b1': 'rgba(167,139,250,.1)', '--b2': 'rgba(167,139,250,.2)', '--b3': 'rgba(167,139,250,.3)',
      '--tx': '#f5f3ff', '--mu': '#5b5478', '--mu2': '#9d8fc4',
      '--acc': '#a78bfa', '--acc2': '#c4b5fd',
      '--acc-bg': 'rgba(167,139,250,.1)', '--acc-b': 'rgba(167,139,250,.28)'
    },
  },
}


// ── Styles string ─────────────────────────────────────────────────────────────
const buildCSS = (themeVars) => `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root { ${Object.entries(themeVars).map(([k,v]) => `${k}:${v}`).join(';')}; }
  body { background:var(--bg); color:var(--tx); font-family:'Syne',sans-serif; }
  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }

  .tb { height:52px; background:var(--s1); border-bottom:1px solid var(--b1); display:flex; align-items:center; padding:0 16px; gap:10px; position:sticky; top:0; z-index:200; }
  .back { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px; background:var(--s2); border:1px solid var(--b2); color:var(--mu2); font-family:'Geist Mono',monospace; font-size:10px; cursor:pointer; transition:all .15s; }
  .back:hover { color:var(--tx); border-color:var(--b3); }
  .tb-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
  .tb-proj { font-size:10px; color:var(--mu); font-family:'Geist Mono',monospace; }
  .tb-r { margin-left:auto; display:flex; gap:6px; align-items:center; }
  .btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:.04em; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; }
  .btn:hover { color:var(--tx); border-color:var(--b3); }
  .btn.p { background:var(--acc); border-color:var(--acc); color:var(--bg); }
  .btn.p:hover { opacity:.9; }
  .btn.ai { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.3); color:var(--acc2); }
  .btn.ai:hover { background:rgba(99,102,241,.18); }
  .btn.gen { background:rgba(52,211,153,.08); border-color:rgba(52,211,153,.3); color:#34d399; }
  .btn.gen:hover { background:rgba(52,211,153,.15); }
  .btn:disabled { opacity:.35; cursor:not-allowed; }

  .layout { display:grid; grid-template-columns:220px 1fr; height:calc(100vh - 52px); overflow:hidden; }
  .left { background:var(--s1); border-right:1px solid var(--b1); display:flex; flex-direction:column; overflow:hidden; }
  .ph { padding:13px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
  .pl { font-size:9px; color:var(--mu); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
  .plist { flex:1; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:2px; }
  .aitem { padding:8px 10px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
  .aitem:hover { background:var(--s2); }
  .aitem.on { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.22); }
  .aname { font-size:11px; font-weight:600; }
  .ameta { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; margin-top:2px; }
  .adel { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; float:right; }
  .aitem:hover .adel { opacity:1; }
  .ai-badge { font-size:8px; padding:1px 4px; border-radius:3px; margin-left:4px; background:rgba(52,211,153,.1); color:#34d399; font-family:'Geist Mono',monospace; }
  .nform { padding:11px; border-top:1px solid var(--b1); display:flex; flex-direction:column; gap:7px; }
  .inp { width:100%; background:var(--bg); border:1px solid var(--b2); border-radius:5px; padding:7px 9px; font-family:'Syne',sans-serif; font-size:11px; color:var(--tx); outline:none; transition:border-color .15s; }
  .inp:focus { border-color:var(--acc); }
  .inp::placeholder { color:var(--mu); }
  textarea.inp { resize:vertical; min-height:50px; }
  .flabel { font-size:9px; color:var(--mu); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:2px; display:block; }
  select.inp { appearance:none; cursor:pointer; }

  .center { display:flex; flex-direction:column; overflow:hidden; background:var(--bg); }
  .tabs { display:flex; gap:0; border-bottom:1px solid var(--b1); background:var(--s1); padding:0 16px; flex-shrink:0; }
  .tab { padding:12px 16px; font-size:11px; font-family:'Geist Mono',monospace; cursor:pointer; border:none; background:none; color:var(--mu2); border-bottom:2px solid transparent; transition:all .15s; display:flex; align-items:center; gap:6px; }
  .tab:hover { color:var(--tx); }
  .tab.on { color:var(--acc2); border-bottom-color:var(--acc); }
  .tab-badge { padding:1px 6px; border-radius:3px; font-size:9px; font-weight:700; }

  .matrix-area { flex:1; overflow:auto; padding:16px; }
  .matrix-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
  .phase-filter { display:flex; gap:4px; flex-wrap:wrap; }
  .phase-btn { padding:4px 10px; border-radius:4px; font-size:9px; font-family:'Geist Mono',monospace; cursor:pointer; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; }
  .phase-btn:hover { color:var(--tx); }
  .phase-btn.on { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.4); color:var(--acc2); }
  .legend { display:flex; gap:10px; flex-wrap:wrap; }
  .legend-item { display:flex; align-items:center; gap:5px; font-size:10px; font-family:'Geist Mono',monospace; }
  .legend-chip { width:22px; height:22px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; }
  .gen-notice { font-size:10px; color:#34d399; background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.2); border-radius:5px; padding:7px 10px; font-family:'Geist Mono',monospace; line-height:1.6; margin-bottom:12px; }

  .warn-banner { margin:0 0 12px; background:rgba(248,113,113,.07); border:1px solid rgba(248,113,113,.2); border-radius:8px; padding:10px 14px; display:flex; align-items:flex-start; gap:8px; }
  .warn-icon { color:#f87171; font-size:14px; flex-shrink:0; margin-top:1px; }
  .warn-text { font-size:11px; color:#f87171; line-height:1.6; }

  .mtable-wrap { overflow-x:auto; }
  .mtable { border-collapse:collapse; width:100%; }
  .mtable th, .mtable td { border:1px solid var(--b1); }
  .th-corner { background:var(--s2); padding:10px 14px; position:sticky; left:0; z-index:10; border-right:2px solid var(--b2) !important; }
  .th-actor { background:var(--s1); padding:0; min-width:110px; max-width:130px; }
  .actor-header { padding:10px 8px; display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer; transition:background .15s; }
  .actor-header:hover { background:var(--s2); }
  .actor-name { font-size:10px; font-weight:700; text-align:center; font-family:'Syne',sans-serif; }
  .actor-role-label { font-size:8px; color:var(--mu2); font-family:'Geist Mono',monospace; text-align:center; }
  .actor-mini-stats { display:flex; gap:3px; margin-top:3px; }
  .actor-ms { font-size:8px; font-family:'Geist Mono',monospace; padding:1px 4px; border-radius:3px; font-weight:700; }
  .td-task { background:var(--s1); padding:0; position:sticky; left:0; z-index:5; border-right:2px solid var(--b2) !important; min-width:180px; max-width:220px; }
  .task-cell { padding:10px 12px; display:flex; flex-direction:column; gap:3px; cursor:pointer; transition:background .15s; }
  .task-cell:hover { background:var(--s2); }
  .task-name { font-size:11px; font-weight:600; }
  .task-phase-chip { font-size:8px; padding:1px 6px; border-radius:3px; font-family:'Geist Mono',monospace; font-weight:600; background:rgba(99,102,241,.1); color:var(--acc2); border:1px solid rgba(99,102,241,.25); align-self:flex-start; }
  .task-warn { font-size:8px; color:#f87171; font-family:'Geist Mono',monospace; margin-top:1px; }
  .td-raci { padding:6px; text-align:center; vertical-align:middle; background:var(--bg); transition:background .12s; cursor:pointer; }
  .td-raci:hover { background:var(--s3); }
  .raci-chip { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; font-size:13px; font-weight:800; font-family:'Geist Mono',monospace; border:2px solid transparent; transition:all .15s; user-select:none; }
  .raci-chip.empty { width:32px; height:32px; border-radius:8px; border:2px dashed var(--b2); color:var(--mu); font-size:16px; display:inline-flex; align-items:center; justify-content:center; transition:all .15s; }
  .td-raci:hover .raci-chip.empty { border-color:var(--b3); color:var(--mu2); }
  .raci-chip.R { background:rgba(99,102,241,.15); color:#6366f1; border-color:rgba(99,102,241,.4); }
  .raci-chip.A { background:rgba(245,158,11,.15); color:#f59e0b; border-color:rgba(245,158,11,.4); }
  .raci-chip.C { background:rgba(52,211,153,.15); color:#34d399; border-color:rgba(52,211,153,.4); }
  .raci-chip.I { background:rgba(148,163,184,.15); color:#94a3b8; border-color:rgba(148,163,184,.35); }

  .ctx-menu { position:fixed; z-index:500; background:var(--s2); border:1px solid var(--b2); border-radius:8px; padding:4px; box-shadow:0 8px 32px rgba(0,0,0,.5); display:flex; flex-direction:column; gap:2px; min-width:120px; }
  .ctx-item { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:5px; cursor:pointer; font-size:11px; transition:background .12s; }
  .ctx-item:hover { background:var(--s3); }
  .ctx-chip { width:22px; height:22px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; font-family:'Geist Mono',monospace; }
  .ctx-clear { color:#f87171; padding:5px 10px; text-align:center; font-size:10px; font-family:'Geist Mono',monospace; border-top:1px solid var(--b1); cursor:pointer; border-radius:0 0 6px 6px; }
  .ctx-clear:hover { background:rgba(248,113,113,.08); }

  .actors-area { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; }
  .actors-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; }
  .actor-card { background:var(--s1); border:1px solid var(--b1); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; transition:border-color .15s; }
  .actor-card:hover { border-color:var(--b2); }
  .actor-card-top { display:flex; align-items:flex-start; gap:10px; }
  .actor-avatar { width:36px; height:36px; border-radius:9px; background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.25); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; color:var(--acc2); flex-shrink:0; font-family:'Syne',sans-serif; }
  .actor-card-name { font-size:13px; font-weight:700; }
  .actor-card-role { font-size:10px; color:var(--mu2); font-family:'Geist Mono',monospace; margin-top:2px; }
  .actor-card-actions { display:flex; gap:4px; margin-left:auto; }
  .icon-btn { width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:11px; transition:background .15s; }
  .icon-btn:hover { background:var(--s3); }
  .actor-stats-row { display:flex; gap:5px; }
  .actor-stat { flex:1; padding:6px 4px; border-radius:6px; text-align:center; display:flex; flex-direction:column; gap:2px; }
  .actor-stat-val { font-family:'Geist Mono',monospace; font-size:14px; font-weight:700; }
  .actor-stat-key { font-size:8px; font-family:'Geist Mono',monospace; opacity:.7; }
  .actor-form-card { background:var(--s2); border:1px solid var(--b2); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; }

  .tasks-area { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; }
  .tasks-list { display:flex; flex-direction:column; gap:6px; }
  .task-row { background:var(--s1); border:1px solid var(--b1); border-radius:8px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px; transition:border-color .15s; }
  .task-row:hover { border-color:var(--b2); }
  .task-num { font-family:'Geist Mono',monospace; font-size:10px; color:var(--mu); width:20px; padding-top:1px; flex-shrink:0; }
  .task-info { flex:1; min-width:0; }
  .task-row-name { font-size:12px; font-weight:600; }
  .task-row-desc { font-size:11px; color:var(--mu2); margin-top:2px; line-height:1.5; }
  .task-row-meta { display:flex; gap:6px; margin-top:5px; flex-wrap:wrap; align-items:center; }
  .task-form-card { background:var(--s2); border:1px solid var(--b2); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; }

  .ai-panel { position:fixed; right:0; top:52px; bottom:0; width:390px; background:var(--s1); border-left:1px solid var(--b1); z-index:150; display:flex; flex-direction:column; overflow:hidden; transform:translateX(100%); transition:transform .28s ease; }
  .ai-panel.open { transform:translateX(0); }
  .ai-ph { padding:14px 18px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
  .ai-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
  .ai-body { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; }
  .ai-st { font-size:9px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
  .ai-card { background:var(--s2); border:1px solid var(--b2); border-radius:8px; padding:13px; font-size:12px; color:var(--tx); line-height:1.7; }
  .score-big { font-family:'Instrument Serif',serif; font-size:48px; font-style:italic; line-height:1; }
  .score-bar { height:6px; background:var(--s3); border-radius:3px; overflow:hidden; margin-top:8px; }
  .score-fill { height:100%; border-radius:3px; transition:width .6s ease; }
  .anomaly-item { background:var(--s2); border-radius:7px; padding:10px 12px; border-left:3px solid; display:flex; flex-direction:column; gap:4px; }
  .anomaly-title { font-size:11px; font-weight:700; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .anomaly-desc { font-size:11px; color:var(--mu2); line-height:1.6; }
  .anomaly-reco { font-size:10px; margin-top:4px; font-family:'Geist Mono',monospace; color:var(--tx); }
  .actor-ai { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; }
  .actor-ai-top { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
  .actor-ai-name { font-size:11px; font-weight:700; }
  .actor-ai-text { font-size:11px; color:var(--mu2); line-height:1.6; }
  .actor-ai-sug { font-size:10px; color:var(--acc2); margin-top:4px; font-family:'Geist Mono',monospace; }
  .optim-item { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; }
  .optim-title { font-size:11px; font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:3px; flex-wrap:wrap; }
  .optim-desc { font-size:11px; color:var(--mu2); line-height:1.6; }
  .ai-list { display:flex; flex-direction:column; gap:5px; }
  .ai-li { display:flex; gap:8px; align-items:flex-start; padding:7px 10px; background:var(--s2); border-radius:5px; border:1px solid var(--b1); font-size:11px; line-height:1.6; }
  .ai-li-b { font-family:'Geist Mono',monospace; font-size:9px; color:var(--mu); padding-top:2px; flex-shrink:0; }

  .theme-picker { position:relative; }
  .theme-drop { position:absolute; right:0; top:calc(100% + 6px); background:var(--s1); border:1px solid var(--b2); border-radius:10px; padding:6px; min-width:150px; z-index:300; box-shadow:0 8px 24px rgba(0,0,0,.4); display:flex; flex-direction:column; gap:2px; }
  .theme-opt { display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:5px; cursor:pointer; font-size:10px; font-family:'Geist Mono',monospace; color:var(--mu2); transition:all .15s; }
  .theme-opt:hover { background:var(--s2); color:var(--tx); }
  .theme-opt.on { background:var(--s3); color:var(--tx); }
  .theme-swatch { width:9px; height:9px; border-radius:50%; }

  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.72); z-index:400; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
  .modal { background:var(--s1); border:1px solid var(--b2); border-radius:14px; padding:24px; width:100%; max-width:520px; display:flex; flex-direction:column; gap:16px; box-shadow:0 32px 80px rgba(0,0,0,.6); }
  .modal-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; }
  .modal-sub { font-size:11px; color:var(--mu2); line-height:1.6; margin-top:3px; }
  .gen-step { display:flex; align-items:center; gap:8px; font-size:11px; color:#34d399; font-family:'Geist Mono',monospace; padding:9px 13px; background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.2); border-radius:7px; }
  .gen-done { font-size:18px; text-align:center; padding:20px 0; color:#34d399; font-family:'Geist Mono',monospace; }

  .spinner { width:16px; height:16px; border:2px solid var(--b2); border-top-color:var(--acc2); border-radius:50%; animation:spin .7s linear infinite; }
  .spinner.green { border-top-color:#34d399; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .ai-loading { display:flex; align-items:center; gap:10px; padding:20px; color:var(--mu2); font-size:12px; }
  .empty { padding:50px 20px; text-align:center; }
  .empty-ico { font-size:36px; opacity:.2; margin-bottom:10px; }
  .empty-txt { font-size:12px; color:var(--mu); line-height:1.6; }
  .toast { position:fixed; bottom:20px; right:20px; z-index:999; background:var(--s2); border:1px solid var(--b2); border-radius:7px; padding:10px 16px; font-size:12px; display:flex; align-items:center; gap:7px; box-shadow:0 8px 28px rgba(0,0,0,.5); animation:su .2s ease; }
  .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
  .toast.info { border-color:rgba(99,102,241,.25); }
  @keyframes su { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @media(max-width:700px) { .layout { grid-template-columns:1fr; } .left { display:none; } }
`
// ─── Main Component ───────────────────────────────────────────────────────────
export default function RACIPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,       setProject]       = useState(null)
  const [analyses,      setAnalyses]      = useState([])
  const [activeId,      setActiveId]      = useState(null)
  const [showNewForm,   setShowNewForm]   = useState(false)
  const [newAnalysis,   setNewAnalysis]   = useState({ name: '', context: '' })
  const [tab,           setTab]           = useState('matrix')
  const [editActor,     setEditActor]     = useState(null)
  const [actorForm,     setActorForm]     = useState({ label: '', role: '' })
  const [editTask,      setEditTask]      = useState(null)
  const [taskForm,      setTaskForm]      = useState({ label: '', phase: 'Général', desc: '' })
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiResult,      setAiResult]      = useState(null)
  const [showAiPanel,   setShowAiPanel]   = useState(false)
  const [toast,         setToast]         = useState(null)
  const [hoveredCell,   setHoveredCell]   = useState(null)
  const [filterPhase,   setFilterPhase]   = useState('Tous')
  const [ctxMenu,       setCtxMenu]       = useState(null)
  const [currentTheme,  setCurrentTheme]  = useState('obsidian')
  const [showThemes,    setShowThemes]    = useState(false)

  // Gen modal
  const [showGenModal,    setShowGenModal]    = useState(false)
  const [genDescription,  setGenDescription]  = useState('')
  const [genAnalysisName, setGenAnalysisName] = useState('')
  const [genLoading,      setGenLoading]      = useState(false)
  const [genStep,         setGenStep]         = useState('idle')

  // ── Load ──
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.RACI || []
        setAnalyses(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          if (last.theme) setCurrentTheme(last.theme)
        }
      }
    } catch {}
  }, [projectId])

  // Close ctx on click outside
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), RACI: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200) }

  const active = analyses.find(a => a.id === activeId) || null

  // ── CRUD analyses ──
  const createAnalysis = (overrides = {}) => {
    const name = (overrides.name || newAnalysis.name).trim()
    if (!name) return
    const a = {
      id: uid(), name, context: overrides.context || newAnalysis.context.trim(),
      createdAt: new Date().toISOString(),
      actors: overrides.actors || [], tasks: overrides.tasks || [],
      matrix: overrides.matrix || {}, aiResult: null,
      theme: currentTheme,
      generatedSynthese: overrides.generatedSynthese || '',
    }
    const updated = [...analyses, a]
    setAnalyses(updated); setActiveId(a.id); persist(updated)
    setShowNewForm(false); setNewAnalysis({ name: '', context: '' })
    return a
  }

  const deleteAnalysis = (id) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated); persist(updated)
    if (activeId === id) {
      const last = updated[updated.length - 1]
      setActiveId(last?.id || null)
      if (last?.theme) setCurrentTheme(last.theme)
    }
    showToast('Analyse supprimée', 'info')
  }

  const updateAnalysis = useCallback((patch) => {
    setAnalyses(prev => {
      const updated = prev.map(a => a.id === activeId ? { ...a, ...patch } : a)
      setTimeout(() => {
        try {
          const raw  = localStorage.getItem(LS_KEY)
          if (!raw) return
          const data = JSON.parse(raw)
          data.projects = (data.projects || []).map(p =>
            p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), RACI: updated } }
          )
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        } catch {}
      }, 0)
      return updated
    })
  }, [activeId, projectId])

  // ── Actors CRUD ──
  const saveActor = () => {
    if (!actorForm.label.trim()) return
    const actor = { id: editActor?.id || uid(), label: actorForm.label.trim(), role: actorForm.role.trim() }
    const actors = editActor?.id
      ? (active.actors || []).map(a => a.id === editActor.id ? actor : a)
      : [...(active.actors || []), actor]
    updateAnalysis({ actors })
    setEditActor(null); setActorForm({ label: '', role: '' })
    showToast(editActor?.id ? 'Acteur mis à jour' : 'Acteur ajouté')
  }

  const deleteActor = (id) => {
    const actors = (active.actors || []).filter(a => a.id !== id)
    const matrix = { ...(active.matrix || {}) }
    for (const taskId of Object.keys(matrix)) {
      if (matrix[taskId]) { const m = { ...matrix[taskId] }; delete m[id]; matrix[taskId] = m }
    }
    updateAnalysis({ actors, matrix })
    showToast('Acteur supprimé', 'info')
  }

  // ── Tasks CRUD ──
  const saveTask = () => {
    if (!taskForm.label.trim()) return
    const task = { id: editTask?.id || uid(), label: taskForm.label.trim(), phase: taskForm.phase, desc: taskForm.desc.trim() }
    const tasks = editTask?.id
      ? (active.tasks || []).map(t => t.id === editTask.id ? task : t)
      : [...(active.tasks || []), task]
    updateAnalysis({ tasks })
    setEditTask(null); setTaskForm({ label: '', phase: 'Général', desc: '' })
    showToast(editTask?.id ? 'Tâche mise à jour' : 'Tâche ajoutée')
  }

  const deleteTask = (id) => {
    const tasks  = (active.tasks || []).filter(t => t.id !== id)
    const matrix = { ...(active.matrix || {}) }; delete matrix[id]
    updateAnalysis({ tasks, matrix })
    showToast('Tâche supprimée', 'info')
  }

  // ── Matrix ──
  const setRole = (taskId, actorId, role) => {
    const matrix = { ...(active.matrix || {}), [taskId]: { ...(active.matrix?.[taskId] || {}), [actorId]: role } }
    if (!role) delete matrix[taskId][actorId]
    updateAnalysis({ matrix })
  }

  // ── Stats ──
  const getActorStats = (actorId) => {
    if (!active) return { R:0,A:0,C:0,I:0,total:0 }
    const s = { R:0,A:0,C:0,I:0,total:0 }
    for (const t of (active.tasks || [])) {
      const role = active.matrix?.[t.id]?.[actorId]
      if (role) { s[role]++; s.total++ }
    }
    return s
  }

  const getTaskStats = (taskId) => {
    if (!active) return { R:0,A:0,C:0,I:0,hasA:false,hasR:false }
    const s = { R:0,A:0,C:0,I:0,hasA:false,hasR:false }
    for (const a of (active.actors || [])) {
      const role = active.matrix?.[taskId]?.[a.id]
      if (role) { s[role]++; if (role==='A') s.hasA=true; if (role==='R') s.hasR=true }
    }
    return s
  }

  const getWarnings = () => {
    if (!active) return []
    const w = []
    for (const t of (active.tasks || [])) {
      const s = getTaskStats(t.id)
      if (!s.hasA) w.push({ type:'missing_a', taskId:t.id, label:t.label })
      if (!s.hasR) w.push({ type:'missing_r', taskId:t.id, label:t.label })
      if (s.A > 1) w.push({ type:'multi_a',   taskId:t.id, label:t.label })
    }
    return w
  }

  const warnings       = getWarnings()
  const filteredTasks  = active?.tasks?.filter(t => filterPhase === 'Tous' || t.phase === filterPhase) || []
  const phases         = ['Tous', ...[...new Set((active?.tasks || []).map(t => t.phase).filter(Boolean))]]

  // ── AI Generation ──
  const handleGenerate = async () => {
    if (!genDescription.trim() || !genAnalysisName.trim()) { showToast('Nom et description requis', 'error'); return }
    setGenLoading(true); setGenStep('loading')
    try {
      const res  = await fetch('/api/generer-management/generer-raci', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action:'generate', description: genDescription, analysisName: genAnalysisName, projectName: project?.name || '', projectTag: project?.tag || '' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur serveur')

      const { result } = data
      const a = createAnalysis({
        name: genAnalysisName.trim(),
        context: result.context || '',
        actors: result.actors || [],
        tasks:  result.tasks  || [],
        matrix: result.matrix || {},
        generatedSynthese: result.synthese || '',
      })
      setTab('matrix')
      setGenStep('done')
      showToast(`"${genAnalysisName}" générée — ${result.tasks?.length || 0} tâches, ${result.actors?.length || 0} acteurs ✦`)
      setTimeout(() => { setShowGenModal(false); setGenStep('idle'); setGenDescription(''); setGenAnalysisName('') }, 1200)
    } catch (err) { showToast(err.message, 'error'); setGenStep('idle') }
    setGenLoading(false)
  }

  // ── AI Analysis ──
  const runAI = async () => {
    if (!active || !active.tasks?.length || !active.actors?.length) { showToast('Ajoutez des tâches et acteurs', 'error'); return }
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res = await fetch('/api/generer-management/generer-raci', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'analyse', analysisName: active.name, context: active.context, tasks: active.tasks, actors: active.actors, matrix: active.matrix, projectName: project?.name || '', projectTag: project?.tag || '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateAnalysis({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── Export CSV ──
  const exportCSV = () => {
    if (!active) return
    const header = ['Tâche', 'Phase', ...(active.actors || []).map(a => a.label)].join(';')
    const rows   = (active.tasks || []).map(t =>
      [t.label, t.phase || '', ...(active.actors || []).map(a => active.matrix?.[t.id]?.[a.id] || '')].join(';')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type:'text/csv' })
    const url  = URL.createObjectURL(blob); const el = document.createElement('a')
    el.href = url; el.download = `RACI_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`
    el.click(); URL.revokeObjectURL(url); showToast('CSV exporté')
  }

  // ── Export JSON ──
  const exportJSON = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ version:'2.0', exportedAt: new Date().toISOString(), analysis: active }, null, 2)], { type:'application/json' })
    const url  = URL.createObjectURL(blob); const el = document.createElement('a')
    el.href = url; el.download = `RACI_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    el.click(); URL.revokeObjectURL(url); showToast('JSON exporté')
  }

  // ── Import ──
  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const raw      = JSON.parse(evt.target.result)
        const card     = raw.analysis || raw
        const imported = { ...card, id: uid(), createdAt: card.createdAt || new Date().toISOString(), theme: card.theme || 'obsidian' }
        const updated  = [...analyses, imported]
        setAnalyses(updated); setActiveId(imported.id); persist(updated)
        if (imported.theme) setCurrentTheme(imported.theme)
        if (imported.aiResult) setAiResult(imported.aiResult)
        showToast(`"${imported.name}" importée (${imported.tasks?.length || 0} tâches, ${imported.actors?.length || 0} acteurs)`)
      } catch (err) { showToast('Fichier invalide : ' + err.message, 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  const changeTheme = (key) => {
    setCurrentTheme(key); setShowThemes(false)
    if (active) updateAnalysis({ theme: key })
  }

  const themeVars = THEMES[currentTheme]?.vars || THEMES.obsidian.vars

  return (
    <>
      <style>{buildCSS(themeVars)}</style>

      <div onClick={() => { ctxMenu && setCtxMenu(null); showThemes && setShowThemes(false) }}>
        <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport}/>

        {/* ── TOP BAR ── */}
        <header className="tb">
          <button className="back" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="tb-title">Matrice RACI</div>
            {project && <div className="tb-proj">{project.name}</div>}
          </div>
          <div className="tb-r">
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Importer</button>

            {/* Theme picker */}
            <div className="theme-picker" onClick={e => e.stopPropagation()}>
              <button className="btn" onClick={() => setShowThemes(v => !v)}>{THEMES[currentTheme]?.icon} Thème</button>
              {showThemes && (
                <div className="theme-drop">
                  {Object.entries(THEMES).map(([key, t]) => (
                    <div key={key} className={`theme-opt ${currentTheme === key ? 'on' : ''}`} onClick={() => changeTheme(key)}>
                      <div className="theme-swatch" style={{ background: t.vars['--acc'] }}/>
                      {t.label}
                      {currentTheme === key && <span style={{ marginLeft:'auto', fontSize:9 }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {active && (
              <>
                <button className="btn" onClick={exportCSV}>↓ CSV</button>
                <button className="btn" onClick={exportJSON}>↓ JSON</button>
                <button className="btn ai" onClick={runAI} disabled={aiLoading || !active?.tasks?.length || !active?.actors?.length}>
                  {aiLoading ? <><span className="spinner"/>Analyse…</> : '✦ Analyse IA'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="layout">
          {/* ── LEFT ── */}
          <aside className="left">
            <div className="ph"><span className="pl">Analyses ({analyses.length})</span></div>
            <div className="plist">
              {analyses.length === 0 && <div className="empty"><div className="empty-ico">⊞</div><div className="empty-txt">Générez ou créez votre première matrice RACI</div></div>}
              {analyses.map(a => (
                <div key={a.id} className={`aitem ${activeId === a.id ? 'on' : ''}`} onClick={() => { setActiveId(a.id); if (a.theme) setCurrentTheme(a.theme); if (a.aiResult) setAiResult(a.aiResult) }}>
                  <button className="adel" onClick={e => { e.stopPropagation(); deleteAnalysis(a.id) }}>✕</button>
                  <div className="aname">
                    {a.name}
                    {a.generatedSynthese && <span className="ai-badge">✦ IA</span>}
                  </div>
                  <div className="ameta">{a.tasks?.length || 0} tâches · {a.actors?.length || 0} acteurs{a.aiResult ? ' · ✓' : ''}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:10, borderTop:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:6 }}>
              <button className="btn gen" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowGenModal(true)}>
                ✦ Générer par IA
              </button>
              {showNewForm ? (
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  <label className="flabel">Nom de l'analyse</label>
                  <input className="inp" placeholder="Ex: Lancement produit" value={newAnalysis.name} onChange={e => setNewAnalysis(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && createAnalysis()} autoFocus/>
                  <label className="flabel">Contexte (optionnel)</label>
                  <textarea className="inp" rows={2} placeholder="Périmètre, équipe…" value={newAnalysis.context} onChange={e => setNewAnalysis(p => ({ ...p, context: e.target.value }))}/>
                  <div style={{ display:'flex', gap:5 }}>
                    <button className="btn p" style={{ flex:1 }} onClick={() => createAnalysis()}>Créer</button>
                    <button className="btn" onClick={() => setShowNewForm(false)}>✕</button>
                  </div>
                </div>
              ) : (
                <button className="btn" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowNewForm(true)}>+ Créer manuellement</button>
              )}
            </div>
          </aside>

          {/* ── CENTER ── */}
          <main className="center">
            {!active ? (
              <div className="empty" style={{ padding:'100px 40px' }}>
                <div className="empty-ico" style={{ fontSize:52, marginBottom:14 }}>⊞</div>
                <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic', marginBottom:8 }}>Matrice RACI</div>
                <div className="empty-txt" style={{ marginBottom:24 }}>Décrivez votre projet et laissez l'IA construire la matrice, ou configurez-la manuellement.</div>
                <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                  <button className="btn gen" style={{ padding:'9px 18px', fontSize:11 }} onClick={() => setShowGenModal(true)}>✦ Générer par IA</button>
                  <button className="btn" style={{ padding:'9px 18px', fontSize:11 }} onClick={() => importRef.current?.click()}>↑ Importer JSON</button>
                  <button className="btn" style={{ padding:'9px 18px', fontSize:11 }} onClick={() => setShowNewForm(true)}>+ Créer manuellement</button>
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="tabs">
                  {[
                    { key:'matrix', label:'Matrice',  badge: null },
                    { key:'actors', label:'Acteurs',  badge: active.actors?.length },
                    { key:'tasks',  label:'Tâches',   badge: active.tasks?.length },
                  ].map(t => (
                    <button key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
                      {t.label}
                      {t.badge > 0 && <span className="tab-badge" style={{ background:'var(--s3)', color:'var(--mu2)' }}>{t.badge}</span>}
                      {t.key === 'matrix' && warnings.length > 0 && <span className="tab-badge" style={{ background:'rgba(248,113,113,.15)', color:'#f87171' }}>⚠ {warnings.length}</span>}
                    </button>
                  ))}
                </div>

                {/* ── MATRIX TAB ── */}
                {tab === 'matrix' && (
                  <div className="matrix-area">
                    {active.generatedSynthese && (
                      <div className="gen-notice">✦ Générée par IA — {active.generatedSynthese}</div>
                    )}
                    <div className="matrix-toolbar">
                      <div className="legend">
                        {Object.entries(ROLE_META).map(([r, m]) => (
                          <div key={r} className="legend-item">
                            <div className="legend-chip" style={{ background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>{r}</div>
                            <span style={{ color:'var(--mu2)' }}>{m.fr}</span>
                          </div>
                        ))}
                      </div>
                      {phases.length > 1 && (
                        <div className="phase-filter" style={{ marginLeft:'auto' }}>
                          {phases.map(p => (
                            <button key={p} className={`phase-btn ${filterPhase === p ? 'on' : ''}`} onClick={() => setFilterPhase(p)}>{p}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {warnings.length > 0 && (
                      <div className="warn-banner">
                        <span className="warn-icon">⚠</span>
                        <div className="warn-text">
                          {warnings.map((w, i) => (
                            <div key={i}>
                              {w.type === 'missing_a' && `« ${w.label} » — aucun Accountable (A) défini`}
                              {w.type === 'missing_r' && `« ${w.label} » — aucun Responsible (R) défini`}
                              {w.type === 'multi_a'   && `« ${w.label} » — plusieurs Accountable (A) détectés`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {active.tasks?.length === 0 || active.actors?.length === 0 ? (
                      <div className="empty">
                        <div className="empty-ico">⊞</div>
                        <div className="empty-txt">
                          {active.actors?.length === 0 && active.tasks?.length === 0
                            ? 'Ajoutez des acteurs et tâches dans les onglets correspondants.'
                            : active.actors?.length === 0 ? 'Ajoutez des acteurs dans l\'onglet "Acteurs".'
                            : 'Ajoutez des tâches dans l\'onglet "Tâches".'}
                        </div>
                      </div>
                    ) : (
                      <div className="mtable-wrap">
                        <table className="mtable">
                          <thead>
                            <tr>
                              <th className="th-corner">
                                <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', letterSpacing:'.08em' }}>TÂCHE ↓ &nbsp; ACTEUR →</div>
                              </th>
                              {(active.actors || []).map(actor => {
                                const s = getActorStats(actor.id)
                                return (
                                  <th key={actor.id} className="th-actor">
                                    <div className="actor-header" onClick={() => { setEditActor(actor); setActorForm({ label:actor.label, role:actor.role||'' }); setTab('actors') }}>
                                      <div className="actor-name">{actor.label}</div>
                                      {actor.role && <div className="actor-role-label">{actor.role}</div>}
                                      <div className="actor-mini-stats">
                                        {s.R > 0 && <span className="actor-ms" style={{ background:'rgba(99,102,241,.12)', color:'#6366f1' }}>R:{s.R}</span>}
                                        {s.A > 0 && <span className="actor-ms" style={{ background:'rgba(245,158,11,.12)',  color:'#f59e0b' }}>A:{s.A}</span>}
                                        {s.C > 0 && <span className="actor-ms" style={{ background:'rgba(52,211,153,.12)',  color:'#34d399' }}>C:{s.C}</span>}
                                        {s.I > 0 && <span className="actor-ms" style={{ background:'rgba(148,163,184,.12)',color:'#94a3b8' }}>I:{s.I}</span>}
                                      </div>
                                    </div>
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTasks.map((task, rowIdx) => {
                              const ts        = getTaskStats(task.id)
                              const taskWarns = warnings.filter(w => w.taskId === task.id)
                              return (
                                <tr key={task.id} style={{ background: rowIdx % 2 === 0 ? 'var(--bg)' : 'rgba(255,255,255,.012)' }}>
                                  <td className="td-task">
                                    <div className="task-cell" onClick={() => { setEditTask(task); setTaskForm({ label:task.label, phase:task.phase||'Général', desc:task.desc||'' }); setTab('tasks') }}>
                                      <div className="task-name">{task.label}</div>
                                      {task.phase && task.phase !== 'Général' && <span className="task-phase-chip">{task.phase}</span>}
                                      {taskWarns.map((w, wi) => (
                                        <div key={wi} className="task-warn">
                                          {w.type === 'missing_a' && '⚠ Pas de Accountable'}
                                          {w.type === 'missing_r' && '⚠ Pas de Responsible'}
                                          {w.type === 'multi_a'   && '⚠ Plusieurs Accountable'}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  {(active.actors || []).map(actor => {
                                    const role      = active.matrix?.[task.id]?.[actor.id] || null
                                    const isHovered = hoveredCell?.taskId === task.id && hoveredCell?.actorId === actor.id
                                    return (
                                      <td key={actor.id} className="td-raci"
                                        onMouseEnter={() => setHoveredCell({ taskId:task.id, actorId:actor.id })}
                                        onMouseLeave={() => setHoveredCell(null)}
                                        onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setCtxMenu({ x:rect.left, y:rect.bottom+4, taskId:task.id, actorId:actor.id }) }}
                                      >
                                        {role
                                          ? <div className={`raci-chip ${role}`}>{role}</div>
                                          : <div className="raci-chip empty">{isHovered ? '+' : ''}</div>
                                        }
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Context menu */}
                    {ctxMenu && (
                      <div className="ctx-menu" style={{ left:ctxMenu.x, top:ctxMenu.y }} onClick={e => e.stopPropagation()}>
                        {ROLES.map(r => {
                          const m       = ROLE_META[r]
                          const current = active.matrix?.[ctxMenu.taskId]?.[ctxMenu.actorId]
                          return (
                            <div key={r} className="ctx-item" style={{ background: current === r ? m.bg : undefined }}
                              onClick={() => { setRole(ctxMenu.taskId, ctxMenu.actorId, r); setCtxMenu(null) }}>
                              <div className="ctx-chip" style={{ background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>{r}</div>
                              <div>
                                <div style={{ fontSize:11, fontWeight:600, color: current===r ? m.color : 'var(--tx)' }}>{m.fr}</div>
                                <div style={{ fontSize:9, color:'var(--mu2)', fontFamily:'Geist Mono,monospace' }}>{m.desc}</div>
                              </div>
                              {current === r && <span style={{ marginLeft:'auto', color:m.color, fontSize:10 }}>✓</span>}
                            </div>
                          )
                        })}
                        {active.matrix?.[ctxMenu.taskId]?.[ctxMenu.actorId] && (
                          <div className="ctx-clear" onClick={() => { setRole(ctxMenu.taskId, ctxMenu.actorId, null); setCtxMenu(null) }}>✕ Effacer</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── ACTORS TAB ── */}
                {tab === 'actors' && (
                  <div className="actors-area">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ fontFamily:'Instrument Serif,serif', fontSize:17, fontStyle:'italic' }}>{active.name}</div>
                      <button className="btn p" onClick={() => { setEditActor({}); setActorForm({ label:'', role:'' }) }}>+ Ajouter un acteur</button>
                    </div>
                    {editActor !== null && (
                      <div className="actor-form-card">
                        <div style={{ fontFamily:'Instrument Serif,serif', fontSize:14, fontStyle:'italic' }}>{editActor?.id ? `Modifier "${editActor.label}"` : 'Nouvel acteur'}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          <div><label className="flabel">Nom / Initiales *</label><input className="inp" placeholder="Ex: Alice M." value={actorForm.label} onChange={e => setActorForm(p => ({ ...p, label:e.target.value }))} autoFocus onKeyDown={e => e.key==='Enter' && saveActor()}/></div>
                          <div><label className="flabel">Rôle / Poste</label><input className="inp" placeholder="Ex: Chef de projet" value={actorForm.role} onChange={e => setActorForm(p => ({ ...p, role:e.target.value }))} onKeyDown={e => e.key==='Enter' && saveActor()}/></div>
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn p" style={{ flex:1 }} onClick={saveActor}>{editActor?.id ? 'Mettre à jour' : 'Ajouter'}</button>
                          <button className="btn" onClick={() => { setEditActor(null); setActorForm({ label:'', role:'' }) }}>Annuler</button>
                        </div>
                      </div>
                    )}
                    {(active.actors || []).length === 0 ? (
                      <div className="empty"><div className="empty-ico">👤</div><div className="empty-txt">Ajoutez les acteurs qui participent au projet.</div></div>
                    ) : (
                      <div className="actors-grid">
                        {(active.actors || []).map(actor => {
                          const s = getActorStats(actor.id)
                          return (
                            <div key={actor.id} className="actor-card">
                              <div className="actor-card-top">
                                <div className="actor-avatar">{actor.label.slice(0,2).toUpperCase()}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div className="actor-card-name">{actor.label}</div>
                                  {actor.role && <div className="actor-card-role">{actor.role}</div>}
                                </div>
                                <div className="actor-card-actions">
                                  <button className="icon-btn" style={{ color:'var(--mu2)' }} onClick={() => { setEditActor(actor); setActorForm({ label:actor.label, role:actor.role||'' }) }}>✎</button>
                                  <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteActor(actor.id)}>✕</button>
                                </div>
                              </div>
                              <div className="actor-stats-row">
                                {Object.entries(ROLE_META).map(([r, m]) => (
                                  <div key={r} className="actor-stat" style={{ background:m.bg, border:`1px solid ${m.border}` }}>
                                    <span className="actor-stat-val" style={{ color:m.color }}>{s[r]}</span>
                                    <span className="actor-stat-key" style={{ color:m.color }}>{r}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize:10, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>{s.total} assignation(s) sur {active.tasks?.length || 0} tâche(s)</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TASKS TAB ── */}
                {tab === 'tasks' && (
                  <div className="tasks-area">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ fontFamily:'Instrument Serif,serif', fontSize:17, fontStyle:'italic' }}>{active.name}</div>
                      <button className="btn p" onClick={() => { setEditTask({}); setTaskForm({ label:'', phase:'Général', desc:'' }) }}>+ Ajouter une tâche</button>
                    </div>
                    {editTask !== null && (
                      <div className="task-form-card">
                        <div style={{ fontFamily:'Instrument Serif,serif', fontSize:14, fontStyle:'italic' }}>{editTask?.id ? `Modifier "${editTask.label}"` : 'Nouvelle tâche'}</div>
                        <div><label className="flabel">Nom de la tâche *</label><input className="inp" placeholder="Ex: Rédiger le cahier des charges" value={taskForm.label} onChange={e => setTaskForm(p => ({ ...p, label:e.target.value }))} autoFocus/></div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          <div><label className="flabel">Phase</label><select className="inp" value={taskForm.phase} onChange={e => setTaskForm(p => ({ ...p, phase:e.target.value }))}>{PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                        </div>
                        <div><label className="flabel">Description (optionnel)</label><textarea className="inp" rows={2} placeholder="Détails…" value={taskForm.desc} onChange={e => setTaskForm(p => ({ ...p, desc:e.target.value }))}/></div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn p" style={{ flex:1 }} onClick={saveTask}>{editTask?.id ? 'Mettre à jour' : 'Ajouter'}</button>
                          <button className="btn" onClick={() => { setEditTask(null); setTaskForm({ label:'', phase:'Général', desc:'' }) }}>Annuler</button>
                        </div>
                      </div>
                    )}
                    {(active.tasks || []).length === 0 ? (
                      <div className="empty"><div className="empty-ico">☑</div><div className="empty-txt">Ajoutez les tâches ou livrables de votre projet.</div></div>
                    ) : (
                      <div>
                        {PHASE_OPTIONS.filter(ph => (active.tasks || []).some(t => t.phase === ph)).map(phase => {
                          const phaseTasks = (active.tasks || []).filter(t => t.phase === phase)
                          if (!phaseTasks.length) return null
                          return (
                            <div key={phase} style={{ marginBottom:16 }}>
                              <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>— {phase} —</div>
                              <div className="tasks-list">
                                {phaseTasks.map((task, i) => {
                                  const ts = getTaskStats(task.id)
                                  return (
                                    <div key={task.id} className="task-row">
                                      <span className="task-num">{i + 1}</span>
                                      <div className="task-info">
                                        <div className="task-row-name">{task.label}</div>
                                        {task.desc && <div className="task-row-desc">{task.desc}</div>}
                                        <div className="task-row-meta">
                                          {Object.entries(ROLE_META).map(([r, m]) => {
                                            if (!ts[r]) return null
                                            return <span key={r} style={{ fontSize:9, padding:'2px 6px', borderRadius:3, background:m.bg, color:m.color, border:`1px solid ${m.border}`, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{r}×{ts[r]}</span>
                                          })}
                                          {!ts.hasA && <span style={{ fontSize:9, color:'#f87171', fontFamily:'Geist Mono,monospace' }}>⚠ pas de A</span>}
                                          {!ts.hasR && <span style={{ fontSize:9, color:'#f87171', fontFamily:'Geist Mono,monospace' }}>⚠ pas de R</span>}
                                        </div>
                                      </div>
                                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                                        <button className="icon-btn" style={{ color:'var(--mu2)' }} onClick={() => { setEditTask(task); setTaskForm({ label:task.label, phase:task.phase||'Général', desc:task.desc||'' }) }}>✎</button>
                                        <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteTask(task.id)}>✕</button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {/* ── AI ANALYSIS PANEL ── */}
        <div className={`ai-panel ${showAiPanel ? 'open' : ''}`}>
          <div className="ai-ph">
            <span className="ai-title">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-body">
            {aiLoading && <div className="ai-loading"><div className="spinner"/>Analyse de la gouvernance…</div>}
            {!aiLoading && !aiResult && active?.aiResult && (() => { setAiResult(active.aiResult); return null })()}
            {aiResult && (
              <>
                {aiResult.score_gouvernance && (
                  <div style={{ background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:10, padding:14, display:'flex', gap:14, alignItems:'center' }}>
                    <div>
                      <div className="score-big" style={{ color: aiResult.score_gouvernance.note >= 7 ? '#34d399' : aiResult.score_gouvernance.note >= 5 ? '#f59e0b' : '#f87171' }}>{aiResult.score_gouvernance.note}</div>
                      <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', letterSpacing:'.08em' }}>/ {aiResult.score_gouvernance.sur}</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:9, color:'var(--mu2)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Score de gouvernance</div>
                      <div className="score-bar"><div className="score-fill" style={{ width:`${(aiResult.score_gouvernance.note / aiResult.score_gouvernance.sur)*100}%`, background: aiResult.score_gouvernance.note >= 7 ? '#34d399' : aiResult.score_gouvernance.note >= 5 ? '#f59e0b' : '#f87171' }}/></div>
                      <div style={{ fontSize:11, color:'var(--mu2)', marginTop:6, lineHeight:1.5 }}>{aiResult.score_gouvernance.commentaire}</div>
                    </div>
                  </div>
                )}
                {aiResult.synthese && <div><div className="ai-st">Synthèse</div><div className="ai-card">{aiResult.synthese}</div></div>}
                {aiResult.anomalies?.length > 0 && (
                  <div>
                    <div className="ai-st">Anomalies ({aiResult.anomalies.length})</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {aiResult.anomalies.map((an, i) => {
                        const sc = SEVERITE_COLORS[an.severite] || 'var(--mu2)'
                        return (
                          <div key={i} className="anomaly-item" style={{ borderLeftColor:sc }}>
                            <div className="anomaly-title">
                              <span style={{ fontSize:9, padding:'1px 7px', borderRadius:3, background:`${sc}18`, color:sc, fontFamily:'Geist Mono,monospace', fontWeight:700, border:`1px solid ${sc}40` }}>{an.severite}</span>
                              {an.description}
                            </div>
                            {(an.taches_concernees?.length > 0 || an.acteurs_concernes?.length > 0) && (
                              <div style={{ fontSize:10, color:'var(--mu2)', fontFamily:'Geist Mono,monospace' }}>{an.taches_concernees?.join(', ')}{an.acteurs_concernes?.length > 0 ? ` · ${an.acteurs_concernes.join(', ')}` : ''}</div>
                            )}
                            {an.recommandation && <div className="anomaly-reco">→ {an.recommandation}</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {aiResult.acteurs?.length > 0 && (
                  <div>
                    <div className="ai-st">Diagnostic par acteur</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {aiResult.acteurs.map((a, i) => {
                        const actor = active?.actors?.find(ac => ac.id === a.id)
                        if (!actor) return null
                        const ac = ALERT_COLORS[a.alerte] || '#94a3b8'
                        return (
                          <div key={i} className="actor-ai">
                            <div className="actor-ai-top">
                              <div style={{ width:28, height:28, borderRadius:7, background:`${ac}18`, color:ac, border:`1px solid ${ac}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{actor.label.slice(0,2).toUpperCase()}</div>
                              <div className="actor-ai-name">{actor.label}</div>
                              <span style={{ fontSize:9, padding:'1px 7px', borderRadius:3, background:`${ac}18`, color:ac, border:`1px solid ${ac}40`, fontFamily:'Geist Mono,monospace', fontWeight:600, marginLeft:'auto' }}>{a.alerte}</span>
                            </div>
                            <div className="actor-ai-text">{a.diagnostic}</div>
                            {a.suggestion && <div className="actor-ai-sug">→ {a.suggestion}</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {aiResult.bonnes_pratiques?.length > 0 && (
                  <div>
                    <div className="ai-st" style={{ color:'#34d399' }}>✓ Bonnes pratiques</div>
                    <div className="ai-list">{aiResult.bonnes_pratiques.map((b, i) => <div key={i} className="ai-li"><span className="ai-li-b" style={{ color:'#34d399' }}>+</span><span>{b}</span></div>)}</div>
                  </div>
                )}
                {aiResult.optimisations?.length > 0 && (
                  <div>
                    <div className="ai-st">Optimisations</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {aiResult.optimisations.map((o, i) => {
                        const pc = PRIORITE_COLORS[o.priorite] || 'var(--mu2)'
                        return (
                          <div key={i} className="optim-item">
                            <div className="optim-title">
                              <span style={{ fontSize:9, padding:'1px 7px', borderRadius:3, background:`${pc}18`, color:pc, border:`1px solid ${pc}40`, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{o.priorite}</span>
                              {o.titre}
                            </div>
                            <div className="optim-desc">{o.description}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {aiResult.conclusion && <div><div className="ai-st">Conclusion</div><div className="ai-card" style={{ fontStyle:'italic', color:'var(--mu2)' }}>{aiResult.conclusion}</div></div>}
              </>
            )}
            {!aiLoading && !aiResult && (
              <div className="empty" style={{ padding:'40px 16px' }}>
                <div className="empty-ico">✦</div>
                <div className="empty-txt">Remplissez la matrice puis cliquez sur "Analyse IA" pour auditer la gouvernance.</div>
              </div>
            )}
          </div>
        </div>

        {/* ── AI GENERATION MODAL ── */}
        {showGenModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !genLoading) setShowGenModal(false) }}>
            <div className="modal">
              <div>
                <div className="modal-title">✦ Générer une matrice RACI par IA</div>
                <div className="modal-sub">Décrivez votre projet, son équipe et ses grandes activités. Claude va identifier les acteurs, les tâches et assigner les rôles RACI automatiquement.</div>
              </div>
              {genStep === 'done' ? (
                <div className="gen-done">✓ Matrice RACI générée avec succès</div>
              ) : (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label className="flabel">Nom de l'analyse *</label>
                    <input className="inp" placeholder="Ex: Déploiement CRM — Équipe IT" value={genAnalysisName} onChange={e => setGenAnalysisName(e.target.value)} disabled={genLoading} autoFocus/>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label className="flabel">Description du projet *</label>
                    <textarea className="inp" style={{ minHeight:130, resize:'vertical' }}
                      placeholder={`Exemples :\n• "Refonte du site e-commerce avec une équipe de 6 : chef de projet, dev front, dev back, UX designer, product owner, testeur QA. Phases : analyse, design, dev, tests, mise en prod."\n• "Lancement d'une nouvelle ligne de produits cosmétiques : marketing, R&D, supply chain, commercial, finance, direction générale."`}
                      value={genDescription} onChange={e => setGenDescription(e.target.value)} disabled={genLoading}/>
                  </div>
                  {genLoading && <div className="gen-step"><span className="spinner green" style={{ width:13, height:13, borderWidth:2 }}/>Claude construit la matrice RACI…</div>}
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn gen" style={{ flex:1, padding:'9px 0', justifyContent:'center', fontSize:11 }}
                      onClick={handleGenerate} disabled={genLoading || !genDescription.trim() || !genAnalysisName.trim()}>
                      {genLoading ? 'Génération en cours…' : '✦ Générer la matrice'}
                    </button>
                    <button className="btn" style={{ padding:'9px 14px' }} onClick={() => { if (!genLoading) setShowGenModal(false) }} disabled={genLoading}>Annuler</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {toast && <div className={`toast ${toast.type || ''}`}>{toast.type === 'error' ? '✕' : '✓'} {toast.msg}</div>}
      </div>
    </>
  )
}