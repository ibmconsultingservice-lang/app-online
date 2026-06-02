'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  obsidian: { label: 'Obsidian', icon: '◈', vars: { '--bg':'#08080e','--s1':'#0f0f18','--s2':'#161622','--s3':'#1c1c2e','--b1':'rgba(255,255,255,.055)','--b2':'rgba(255,255,255,.10)','--b3':'rgba(255,255,255,.16)','--tx':'#eeedf8','--mu':'#5e5c78','--mu2':'#9492b0','--acc':'#6366f1','--acc2':'#818cf8' } },
  slate:    { label: 'Slate',    icon: '◆', vars: { '--bg':'#0d1117','--s1':'#161b22','--s2':'#1c2330','--s3':'#21262d','--b1':'rgba(48,54,61,.8)','--b2':'rgba(99,110,123,.5)','--b3':'rgba(139,148,158,.5)','--tx':'#e6edf3','--mu':'#7d8590','--mu2':'#8b949e','--acc':'#58a6ff','--acc2':'#79c0ff' } },
  midnight: { label: 'Midnight', icon: '⬡', vars: { '--bg':'#06070d','--s1':'#0e1020','--s2':'#131528','--s3':'#181b30','--b1':'rgba(100,120,200,.1)','--b2':'rgba(100,120,200,.18)','--b3':'rgba(100,120,200,.28)','--tx':'#dde4ff','--mu':'#5a6080','--mu2':'#7a82aa','--acc':'#7c83ff','--acc2':'#a5aaff' } },
  graphite: { label: 'Graphite', icon: '◉', vars: { '--bg':'#111111','--s1':'#1a1a1a','--s2':'#222222','--s3':'#2a2a2a','--b1':'rgba(255,255,255,.06)','--b2':'rgba(255,255,255,.1)','--b3':'rgba(255,255,255,.16)','--tx':'#eeeeee','--mu':'#666666','--mu2':'#888888','--acc':'#e5e5e5','--acc2':'#cccccc' } },
  aurora:   { label: 'Aurora',   icon: '✦', vars: { '--bg':'#070b14','--s1':'#0d1421','--s2':'#121b2c','--s3':'#172135','--b1':'rgba(0,200,150,.07)','--b2':'rgba(0,200,150,.14)','--b3':'rgba(0,200,150,.24)','--tx':'#e0f5ef','--mu':'#4a7a6a','--mu2':'#6a9e8e','--acc':'#00c896','--acc2':'#30dba8' } },
}

// ── AIDA Stage config ─────────────────────────────────────────────────────────
const AIDA_DEFAULTS = [
  { id: uid(), name: 'Attention', label: 'ATTENTION', color: '#6366f1', description: 'Capter l\'attention des prospects', volume: 10000, conversionRate: 25, actions: [], kpis: [], channels: [] },
  { id: uid(), name: 'Intérêt',   label: 'INTÉRÊT',   color: '#818cf8', description: 'Susciter l\'intérêt pour la solution', volume: 2500,  conversionRate: 40, actions: [], kpis: [], channels: [] },
  { id: uid(), name: 'Désir',     label: 'DÉSIR',     color: '#f59e0b', description: 'Créer le désir d\'achat',         volume: 1000,  conversionRate: 30, actions: [], kpis: [], channels: [] },
  { id: uid(), name: 'Action',    label: 'ACTION',    color: '#34d399', description: 'Déclencher l\'achat',             volume: 300,   conversionRate: 100, actions: [], kpis: [], channels: [] },
]

// ── BANT criteria ─────────────────────────────────────────────────────────────
const BANT_CRITERIA = {
  budget:    { label: 'Budget',    icon: '💰', color: '#34d399', desc: 'Capacité financière du prospect' },
  authority: { label: 'Authority', icon: '👤', color: '#818cf8', desc: 'Pouvoir de décision' },
  need:      { label: 'Need',      icon: '🎯', color: '#f59e0b', desc: 'Besoin réel et urgent' },
  timeline:  { label: 'Timeline',  icon: '⏱',  color: '#f87171', desc: 'Calendrier d\'achat' },
}

// ── SPIN categories ───────────────────────────────────────────────────────────
const SPIN_CATS = {
  situation:   { label: 'Situation',   short: 'S', color: '#6366f1', desc: 'Comprendre le contexte actuel' },
  probleme:    { label: 'Problème',    short: 'P', color: '#f59e0b', desc: 'Identifier les problèmes et insatisfactions' },
  implication: { label: 'Implication', short: 'I', color: '#f87171', desc: 'Amplifier l\'impact des problèmes' },
  needPayoff:  { label: 'Need-Payoff', short: 'N', color: '#34d399', desc: 'Faire exprimer la valeur de la solution' },
}

// ── Prospect status ───────────────────────────────────────────────────────────
const PROSPECT_STATUS = {
  chaud:  { label: 'Chaud',  color: '#f87171', bg: 'rgba(248,113,113,.12)', icon: '🔥' },
  tiede:  { label: 'Tiède',  color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  icon: '⚡' },
  froid:  { label: 'Froid',  color: '#818cf8', bg: 'rgba(129,140,248,.12)', icon: '❄️' },
}

const SCORE_LABELS = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort']

// ── Default workflow ──────────────────────────────────────────────────────────
const DEFAULT_WORKFLOW = () => ({
  id: uid(),
  name: '',
  context: '',
  objectifCommercial: '',
  createdAt: new Date().toISOString(),
  theme: 'obsidian',
  generatedSynthese: '',
  aiResult: null,
  aida: { description: '', stages: AIDA_DEFAULTS.map(s => ({ ...s, id: uid() })) },
  bant: {
    description: '',
    criteria: {
      budget:    { label: 'Budget',    description: '', questions: [], thresholds: { fort: '', moyen: '', faible: '' } },
      authority: { label: 'Authority', description: '', questions: [], thresholds: { fort: '', moyen: '', faible: '' } },
      need:      { label: 'Need',      description: '', questions: [], thresholds: { fort: '', moyen: '', faible: '' } },
      timeline:  { label: 'Timeline',  description: '', questions: [], thresholds: { fort: '', moyen: '', faible: '' } },
    },
    prospects: [],
  },
  spin: {
    description: '',
    situation:   { objectif: '', questions: [] },
    probleme:    { objectif: '', questions: [] },
    implication: { objectif: '', questions: [] },
    needPayoff:  { objectif: '', questions: [] },
  },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const getBANTAvg = (scores) => {
  if (!scores) return 0
  const vals = Object.values(scores).filter(v => typeof v === 'number')
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

const getProspectStatus = (scores) => {
  const avg = getBANTAvg(scores)
  if (avg >= 3.5) return 'chaud'
  if (avg >= 2.5) return 'tiede'
  return 'froid'
}

const scoreColor = (v) => v >= 4 ? '#34d399' : v >= 3 ? '#86efac' : v >= 2 ? '#facc15' : '#f87171'
// ── CSS builder ───────────────────────────────────────────────────────────────
const buildCSS = (vars) => `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root { ${Object.entries(vars).map(([k,v]) => `${k}:${v}`).join(';')}; }
  body { background:var(--bg); color:var(--tx); font-family:'Syne',sans-serif; }
  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }

  /* Topbar */
  .tb { height:52px; background:var(--s1); border-bottom:1px solid var(--b1); display:flex; align-items:center; padding:0 16px; gap:10px; position:sticky; top:0; z-index:200; }
  .back { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px; background:var(--s2); border:1px solid var(--b2); color:var(--mu2); font-family:'Geist Mono',monospace; font-size:10px; cursor:pointer; transition:all .15s; }
  .back:hover { color:var(--tx); }
  .tb-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
  .tb-sub { font-size:10px; color:var(--mu); font-family:'Geist Mono',monospace; }
  .tb-r { margin-left:auto; display:flex; gap:6px; align-items:center; flex-wrap:wrap; }

  /* Buttons */
  .btn { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:10px; letter-spacing:.04em; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); transition:all .15s; white-space:nowrap; }
  .btn:hover { color:var(--tx); border-color:var(--b3); }
  .btn.p { background:var(--acc); border-color:var(--acc); color:var(--bg); }
  .btn.p:hover { opacity:.9; }
  .btn.ai { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.3); color:#818cf8; }
  .btn.ai:hover { background:rgba(99,102,241,.18); }
  .btn.gen { background:rgba(52,211,153,.08); border-color:rgba(52,211,153,.3); color:#34d399; }
  .btn.gen:hover { background:rgba(52,211,153,.15); }
  .btn:disabled { opacity:.35; cursor:not-allowed; }
  .icon-btn { width:22px; height:22px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:11px; transition:background .15s; color:var(--mu2); }
  .icon-btn:hover { background:var(--s3); color:var(--tx); }

  /* Layout */
  .layout { display:grid; grid-template-columns:220px 1fr; height:calc(100vh - 52px); overflow:hidden; }
  .left { background:var(--s1); border-right:1px solid var(--b1); display:flex; flex-direction:column; overflow:hidden; }
  .ph { padding:13px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
  .pl { font-size:9px; color:var(--mu); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; }
  .plist { flex:1; overflow-y:auto; padding:6px; display:flex; flex-direction:column; gap:2px; }
  .witem { padding:8px 10px; border-radius:7px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
  .witem:hover { background:var(--s2); }
  .witem.on { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.22); }
  .wname { font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px; }
  .wmeta { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; margin-top:2px; }
  .wdel { opacity:0; background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; float:right; }
  .witem:hover .wdel { opacity:1; }
  .ai-badge { font-size:8px; padding:1px 4px; border-radius:3px; background:rgba(52,211,153,.1); color:#34d399; font-family:'Geist Mono',monospace; }

  /* Center */
  .center { display:flex; flex-direction:column; overflow:hidden; background:var(--bg); }
  .tabs { display:flex; gap:0; border-bottom:1px solid var(--b1); background:var(--s1); padding:0 16px; flex-shrink:0; overflow-x:auto; }
  .tab { padding:11px 14px; font-size:10px; font-family:'Geist Mono',monospace; cursor:pointer; border:none; background:none; color:var(--mu2); border-bottom:2px solid transparent; transition:all .15s; white-space:nowrap; display:flex; align-items:center; gap:5px; }
  .tab:hover { color:var(--tx); }
  .tab.on { color:var(--acc2); border-bottom-color:var(--acc); }

  /* Content area */
  .content { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:18px; }

  /* Cards */
  .card { background:var(--s1); border:1px solid var(--b1); border-radius:12px; padding:18px; display:flex; flex-direction:column; gap:14px; }
  .card-title { font-size:11px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; display:flex; align-items:center; gap:8px; }
  .card-dot { width:6px; height:6px; border-radius:50%; background:var(--acc2); }

  /* Form inputs */
  .inp { width:100%; background:var(--bg); border:1px solid var(--b2); border-radius:6px; padding:7px 10px; font-family:'Syne',sans-serif; font-size:11px; color:var(--tx); outline:none; transition:border-color .15s; }
  .inp:focus { border-color:var(--acc); }
  .inp::placeholder { color:var(--mu); }
  textarea.inp { resize:vertical; min-height:52px; }
  select.inp { appearance:none; cursor:pointer; }
  .flabel { font-size:9px; color:var(--mu); letter-spacing:.08em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:3px; display:block; }
  .fgroup { display:flex; flex-direction:column; gap:3px; }
  .frow { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .frow3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }

  /* AIDA Funnel */
  .funnel-wrap { display:flex; flex-direction:column; gap:6px; }
  .funnel-stage { border-radius:10px; border:1px solid; overflow:hidden; transition:all .2s; }
  .funnel-stage-header { padding:14px 16px; display:flex; align-items:center; gap:12px; cursor:pointer; }
  .funnel-stage-name { font-size:13px; font-weight:800; font-family:'Geist Mono',monospace; letter-spacing:.08em; }
  .funnel-stage-volume { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; }
  .funnel-stage-rate { font-size:10px; font-family:'Geist Mono',monospace; }
  .funnel-bar-wrap { height:6px; background:rgba(255,255,255,.06); overflow:hidden; }
  .funnel-bar-fill { height:100%; transition:width .6s ease; }
  .funnel-detail { padding:14px 16px; border-top:1px solid rgba(255,255,255,.06); display:flex; flex-direction:column; gap:10px; }
  .funnel-arrow { text-align:center; font-size:11px; color:var(--mu); font-family:'Geist Mono',monospace; padding:4px 0; }

  /* BANT */
  .bant-criteria-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; }
  .bant-crit-card { background:var(--s2); border:1px solid var(--b1); border-radius:10px; padding:14px; }
  .bant-crit-header { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .bant-crit-icon { font-size:18px; }
  .bant-crit-name { font-size:12px; font-weight:700; }
  .bant-prospects-list { display:flex; flex-direction:column; gap:8px; }
  .prospect-card { background:var(--s1); border:1px solid var(--b1); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; transition:border-color .15s; }
  .prospect-card:hover { border-color:var(--b2); }
  .prospect-header { display:flex; align-items:flex-start; gap:10px; }
  .prospect-avatar { width:36px; height:36px; border-radius:9px; background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.25); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:var(--acc2); flex-shrink:0; font-family:'Syne',sans-serif; }
  .prospect-name { font-size:13px; font-weight:700; }
  .prospect-company { font-size:10px; color:var(--mu2); font-family:'Geist Mono',monospace; margin-top:2px; }
  .prospect-scores { display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; }
  .pscore { text-align:center; padding:6px 4px; border-radius:6px; display:flex; flex-direction:column; gap:2px; }
  .pscore-val { font-family:'Geist Mono',monospace; font-size:14px; font-weight:700; }
  .pscore-key { font-size:8px; font-family:'Geist Mono',monospace; opacity:.7; }
  .status-chip { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:10px; font-family:'Geist Mono',monospace; font-weight:700; }
  input[type=range].sr { width:100%; appearance:none; height:4px; border-radius:2px; outline:none; cursor:pointer; }
  input[type=range].sr::-webkit-slider-thumb { appearance:none; width:14px; height:14px; border-radius:50%; cursor:pointer; border:2px solid rgba(255,255,255,.2); }

  /* SPIN */
  .spin-cats { display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; }
  .spin-cat { background:var(--s2); border:1px solid var(--b1); border-radius:10px; overflow:hidden; }
  .spin-cat-header { padding:12px 14px; display:flex; align-items:center; gap:8px; }
  .spin-cat-badge { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; font-family:'Geist Mono',monospace; }
  .spin-cat-name { font-size:12px; font-weight:700; }
  .spin-cat-desc { font-size:10px; color:var(--mu2); margin-top:1px; }
  .spin-questions { padding:0 14px 12px; display:flex; flex-direction:column; gap:6px; }
  .spin-q { background:var(--s1); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; display:flex; gap:8px; align-items:flex-start; transition:border-color .15s; }
  .spin-q:hover { border-color:var(--b2); }
  .spin-q-num { font-family:'Geist Mono',monospace; font-size:9px; color:var(--mu); padding-top:2px; flex-shrink:0; }
  .spin-q-body { flex:1; min-width:0; }
  .spin-q-text { font-size:12px; font-weight:600; line-height:1.5; }
  .spin-q-obj { font-size:10px; color:var(--mu2); margin-top:3px; font-family:'Geist Mono',monospace; }
  .spin-q-conseil { font-size:10px; color:var(--acc2); margin-top:3px; font-family:'Geist Mono',monospace; font-style:italic; }

  /* AI Analysis Panel */
  .ai-panel { position:fixed; right:0; top:52px; bottom:0; width:400px; background:var(--s1); border-left:1px solid var(--b1); z-index:150; display:flex; flex-direction:column; overflow:hidden; transform:translateX(100%); transition:transform .28s ease; }
  .ai-panel.open { transform:translateX(0); }
  .ai-ph { padding:14px 18px; border-bottom:1px solid var(--b1); display:flex; align-items:center; justify-content:space-between; }
  .ai-title { font-family:'Instrument Serif',serif; font-size:17px; font-style:italic; }
  .ai-body { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; }
  .ai-st { font-size:9px; color:var(--mu2); letter-spacing:.1em; text-transform:uppercase; font-family:'Geist Mono',monospace; margin-bottom:6px; }
  .ai-card { background:var(--s2); border:1px solid var(--b2); border-radius:8px; padding:13px; font-size:12px; color:var(--tx); line-height:1.7; }
  .score-big { font-family:'Instrument Serif',serif; font-size:48px; font-style:italic; line-height:1; }
  .score-bar { height:6px; background:var(--s3); border-radius:3px; overflow:hidden; margin-top:8px; }
  .score-fill { height:100%; border-radius:3px; transition:width .6s ease; }
  .ai-reco { background:var(--s2); border:1px solid var(--b1); border-radius:7px; padding:10px 12px; display:flex; flex-direction:column; gap:4px; }
  .ai-reco-title { font-size:11px; font-weight:700; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .ai-reco-desc { font-size:11px; color:var(--mu2); line-height:1.6; }
  .ai-qw { background:var(--s2); border-left:3px solid #34d399; border-radius:0 7px 7px 0; padding:10px 12px; }
  .ai-qw-title { font-size:11px; font-weight:700; margin-bottom:3px; }
  .ai-qw-desc { font-size:11px; color:var(--mu2); line-height:1.5; }
  .ai-kpi { display:flex; flex-direction:column; gap:5px; }
  .ai-kpi-row { background:var(--s2); border:1px solid var(--b1); border-radius:6px; padding:8px 12px; display:flex; gap:10px; align-items:center; font-size:11px; }
  .plan-item { background:var(--s2); border:1px solid var(--b1); border-radius:8px; overflow:hidden; }
  .plan-header { padding:8px 12px; background:var(--s3); border-bottom:1px solid var(--b1); font-size:10px; font-family:'Geist Mono',monospace; color:var(--acc2); font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
  .plan-body { padding:8px 12px; display:flex; flex-direction:column; gap:4px; }
  .plan-action { display:flex; gap:7px; align-items:flex-start; font-size:11px; color:var(--mu2); line-height:1.5; }
  .plan-dot { width:4px; height:4px; border-radius:50%; background:var(--acc); flex-shrink:0; margin-top:6px; }

  /* Theme picker */
  .theme-picker { position:relative; }
  .theme-drop { position:absolute; right:0; top:calc(100% + 6px); background:var(--s1); border:1px solid var(--b2); border-radius:10px; padding:6px; min-width:148px; z-index:300; box-shadow:0 8px 24px rgba(0,0,0,.4); display:flex; flex-direction:column; gap:2px; }
  .theme-opt { display:flex; align-items:center; gap:7px; padding:6px 9px; border-radius:5px; cursor:pointer; font-size:10px; font-family:'Geist Mono',monospace; color:var(--mu2); transition:all .15s; }
  .theme-opt:hover { background:var(--s2); color:var(--tx); }
  .theme-opt.on { background:var(--s3); color:var(--tx); }
  .theme-swatch { width:9px; height:9px; border-radius:50%; }

  /* Gen modal */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.72); z-index:400; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
  .modal { background:var(--s1); border:1px solid var(--b2); border-radius:14px; padding:24px; width:100%; max-width:540px; display:flex; flex-direction:column; gap:16px; box-shadow:0 32px 80px rgba(0,0,0,.6); max-height:90vh; overflow-y:auto; }
  .modal-title { font-family:'Instrument Serif',serif; font-size:20px; font-style:italic; }
  .modal-sub { font-size:11px; color:var(--mu2); line-height:1.6; margin-top:3px; }
  .gen-step { display:flex; align-items:center; gap:8px; font-size:11px; color:#34d399; font-family:'Geist Mono',monospace; padding:9px 13px; background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.2); border-radius:7px; }
  .gen-done { font-size:18px; text-align:center; padding:20px 0; color:#34d399; font-family:'Geist Mono',monospace; }

  /* Export modal */
  .export-btns { display:flex; gap:8px; flex-wrap:wrap; }
  .export-btn { flex:1; min-width:100px; padding:12px 8px; border-radius:8px; border:1px solid var(--b2); background:var(--s2); color:var(--mu2); cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; transition:all .15s; }
  .export-btn:hover { border-color:var(--b3); color:var(--tx); background:var(--s3); }
  .export-btn-icon { font-size:20px; }
  .export-btn-label { font-size:10px; font-family:'Geist Mono',monospace; font-weight:700; }

  /* Tags/chips */
  .tag { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:4px; font-size:9px; font-family:'Geist Mono',monospace; font-weight:600; }
  .pill-list { display:flex; gap:5px; flex-wrap:wrap; }
  .gen-notice { font-size:10px; color:#34d399; background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.2); border-radius:5px; padding:7px 10px; font-family:'Geist Mono',monospace; line-height:1.6; }

  /* Summary stats bar */
  .stats-bar { display:flex; gap:10px; flex-wrap:wrap; }
  .stat-chip { background:var(--s2); border:1px solid var(--b1); border-radius:8px; padding:10px 14px; display:flex; flex-direction:column; gap:2px; min-width:90px; }
  .stat-val { font-family:'Instrument Serif',serif; font-size:22px; font-style:italic; }
  .stat-lbl { font-size:9px; color:var(--mu); font-family:'Geist Mono',monospace; text-transform:uppercase; letter-spacing:.06em; }

  /* Spinner & misc */
  .spinner { width:15px; height:15px; border:2px solid var(--b2); border-top-color:var(--acc2); border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
  .spinner.g { border-top-color:#34d399; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .empty { padding:50px 20px; text-align:center; }
  .empty-ico { font-size:36px; opacity:.2; margin-bottom:10px; }
  .empty-txt { font-size:12px; color:var(--mu); line-height:1.6; }
  .toast { position:fixed; bottom:20px; right:20px; z-index:999; background:var(--s2); border:1px solid var(--b2); border-radius:7px; padding:10px 16px; font-size:12px; display:flex; align-items:center; gap:7px; box-shadow:0 8px 28px rgba(0,0,0,.5); animation:su .2s ease; }
  .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
  .toast.info  { border-color:rgba(99,102,241,.25); }
  @keyframes su { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .sep { height:1px; background:var(--b1); }
  @media(max-width:900px) { .layout { grid-template-columns:1fr; } .left { display:none; } .spin-cats { grid-template-columns:1fr; } .bant-criteria-grid { grid-template-columns:1fr; } }
`

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SalesPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')
  const importRef    = useRef(null)

  const [project,       setProject]       = useState(null)
  const [workflows,     setWorkflows]     = useState([])
  const [activeId,      setActiveId]      = useState(null)
  const [tab,           setTab]           = useState('aida')
  const [aiLoading,     setAiLoading]     = useState(false)
  const [aiResult,      setAiResult]      = useState(null)
  const [showAiPanel,   setShowAiPanel]   = useState(false)
  const [toast,         setToast]         = useState(null)
  const [currentTheme,  setCurrentTheme]  = useState('obsidian')
  const [showThemes,    setShowThemes]    = useState(false)
  const [showExport,    setShowExport]    = useState(false)
  const [showNewForm,   setShowNewForm]   = useState(false)
  const [newName,       setNewName]       = useState('')

  // AIDA edit
  const [editStageIdx,  setEditStageIdx]  = useState(null)

  // BANT
  const [editProspect,  setEditProspect]  = useState(null)
  const [prospectForm,  setProspectForm]  = useState({ name:'', company:'', sector:'', notes:'', nextAction:'', scores:{ budget:3, authority:3, need:3, timeline:3 } })

  // SPIN
  const [editQuestion,  setEditQuestion]  = useState(null) // { cat, idx, isNew }
  const [qForm,         setQForm]         = useState({ question:'', objectif:'', conseil:'' })

  // Generation
  const [showGenModal,  setShowGenModal]  = useState(false)
  const [genDesc,       setGenDesc]       = useState('')
  const [genName,       setGenName]       = useState('')
  const [genLoading,    setGenLoading]    = useState(false)
  const [genStep,       setGenStep]       = useState('idle')

  // Load
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.Sales || []
        setWorkflows(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          if (last.theme) setCurrentTheme(last.theme)
          if (last.aiResult) setAiResult(last.aiResult)
        }
      }
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), Sales: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200) }

  const active = workflows.find(w => w.id === activeId) || null

  const updateActive = useCallback((patch) => {
    setWorkflows(prev => {
      const updated = prev.map(w => w.id === activeId ? { ...w, ...patch } : w)
      setTimeout(() => {
        try {
          const raw  = localStorage.getItem(LS_KEY)
          if (!raw) return
          const data = JSON.parse(raw)
          data.projects = (data.projects || []).map(p =>
            p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), Sales: updated } }
          )
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        } catch {}
      }, 0)
      return updated
    })
  }, [activeId, projectId])

  // ── CRUD workflows ──
  const createWorkflow = (overrides = {}) => {
    const name = (overrides.name || newName).trim()
    if (!name) return
    const w = { ...DEFAULT_WORKFLOW(), name, theme: currentTheme, ...overrides }
    const updated = [...workflows, w]
    setWorkflows(updated); setActiveId(w.id); persist(updated)
    setShowNewForm(false); setNewName(''); setAiResult(null)
    return w
  }

  const deleteWorkflow = (id) => {
    const updated = workflows.filter(w => w.id !== id)
    setWorkflows(updated); persist(updated)
    if (activeId === id) { const last = updated[updated.length - 1]; setActiveId(last?.id || null); if (last?.theme) setCurrentTheme(last.theme); setAiResult(last?.aiResult || null) }
    showToast('Workflow supprimé', 'info')
  }

  const changeTheme = (key) => { setCurrentTheme(key); setShowThemes(false); if (active) updateActive({ theme: key }) }
  // ── AIDA operations ──
  const updateStage = (idx, patch) => {
    const stages = [...(active?.aida?.stages || [])]
    stages[idx] = { ...stages[idx], ...patch }
    updateActive({ aida: { ...active.aida, stages } })
  }

  // ── BANT prospect operations ──
  const saveProspect = () => {
    if (!prospectForm.name.trim()) return
    const status = getProspectStatus(prospectForm.scores)
    const p = { id: editProspect?.id || uid(), ...prospectForm, status, name: prospectForm.name.trim() }
    const prospects = editProspect?.id
      ? (active.bant?.prospects || []).map(x => x.id === editProspect.id ? p : x)
      : [...(active.bant?.prospects || []), p]
    updateActive({ bant: { ...active.bant, prospects } })
    setEditProspect(null); setProspectForm({ name:'', company:'', sector:'', notes:'', nextAction:'', scores:{ budget:3, authority:3, need:3, timeline:3 } })
    showToast(editProspect?.id ? 'Prospect mis à jour' : 'Prospect ajouté')
  }

  const deleteProspect = (id) => {
    const prospects = (active?.bant?.prospects || []).filter(p => p.id !== id)
    updateActive({ bant: { ...active.bant, prospects } })
    showToast('Prospect supprimé', 'info')
  }

  // ── SPIN question operations ──
  const saveQuestion = () => {
    if (!qForm.question.trim() || !editQuestion) return
    const { cat } = editQuestion
    const current  = active?.spin?.[cat] || { objectif: '', questions: [] }
    const qs = editQuestion.isNew
      ? [...(current.questions || []), { id: uid(), ...qForm }]
      : (current.questions || []).map((q, i) => i === editQuestion.idx ? { ...q, ...qForm } : q)
    updateActive({ spin: { ...active.spin, [cat]: { ...current, questions: qs } } })
    setEditQuestion(null); setQForm({ question:'', objectif:'', conseil:'' })
    showToast('Question sauvegardée')
  }

  const deleteQuestion = (cat, idx) => {
    const current = active?.spin?.[cat] || { questions: [] }
    const questions = (current.questions || []).filter((_, i) => i !== idx)
    updateActive({ spin: { ...active.spin, [cat]: { ...current, questions } } })
    showToast('Question supprimée', 'info')
  }

  // ── AI Generation ──
  const handleGenerate = async () => {
    if (!genDesc.trim() || !genName.trim()) { showToast('Nom et description requis', 'error'); return }
    setGenLoading(true); setGenStep('loading')
    try {
      const res  = await fetch('/api/generer-management/generer-sales', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ description: genDesc, workflowName: genName, projectName: project?.name || '', projectTag: project?.tag || '' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur serveur')
      const r = data.result
      const w = createWorkflow({
        name: genName.trim(),
        context: r.context || '',
        objectifCommercial: r.objectifCommercial || '',
        aida: r.aida || active?.aida,
        bant: r.bant || active?.bant,
        spin: r.spin || active?.spin,
        generatedSynthese: r.synthese || '',
      })
      setTab('aida')
      setGenStep('done')
      showToast(`"${genName}" généré ✦`)
      setTimeout(() => { setShowGenModal(false); setGenStep('idle'); setGenDesc(''); setGenName('') }, 1200)
    } catch (err) { showToast(err.message, 'error'); setGenStep('idle') }
    setGenLoading(false)
  }

  // ── AI Analysis ──
  const runAnalysis = async () => {
    if (!active) return
    setAiLoading(true); setShowAiPanel(true); setAiResult(null)
    try {
      const res  = await fetch('/api/generer-management/analyser-sales', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ workflowName: active.name, context: active.context, objectifCommercial: active.objectifCommercial, aida: active.aida, bant: active.bant, spin: active.spin, projectName: project?.name || '', projectTag: project?.tag || '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateActive({ aiResult: data.result })
      showToast('Analyse IA générée')
    } catch (err) { showToast(err.message, 'error') }
    setAiLoading(false)
  }

  // ── Export JSON ──
  const exportJSON = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ version:'2.0', exportedAt: new Date().toISOString(), workflow: active }, null, 2)], { type:'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `Sales_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url); showToast('Export JSON téléchargé'); setShowExport(false)
  }

  // ── Export CSV ──
  const exportCSV = () => {
    if (!active) return
    const rows = []
    // AIDA
    rows.push('=== FUNNEL AIDA ===')
    rows.push('Étape;Volume;Taux Conversion;Description')
    for (const s of (active.aida?.stages || [])) rows.push(`${s.name};${s.volume};${s.conversionRate}%;${s.description || ''}`)
    rows.push('')
    // BANT
    rows.push('=== PROSPECTS BANT ===')
    rows.push('Nom;Entreprise;Secteur;Budget;Authority;Need;Timeline;Statut;Notes;Prochaine Action')
    for (const p of (active.bant?.prospects || [])) rows.push(`${p.name};${p.company || ''};${p.sector || ''};${p.scores?.budget||''};${p.scores?.authority||''};${p.scores?.need||''};${p.scores?.timeline||''};${p.status || ''};${p.notes||''};${p.nextAction||''}`)
    rows.push('')
    // SPIN
    rows.push('=== QUESTIONS SPIN ===')
    rows.push('Catégorie;Question;Objectif;Conseil')
    for (const [cat, meta] of Object.entries(SPIN_CATS)) {
      for (const q of (active.spin?.[cat]?.questions || [])) rows.push(`${meta.label};${q.question};${q.objectif||''};${q.conseil||''}`)
    }
    const blob = new Blob([rows.join('\n')], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `Sales_${active.name.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url); showToast('Export CSV téléchargé'); setShowExport(false)
  }

  // ── Export Word (docx via Anthropic API in artifact) ──
  const exportWord = async () => {
    if (!active) return
    showToast('Génération Word en cours…', 'info')
    setShowExport(false)
    try {
      // Build a structured text payload and call Claude to get docx content instructions
      const res = await fetch('/api/generer-management/analyser-sales', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'export_word', workflowName: active.name, context: active.context, aida: active.aida, bant: active.bant, spin: active.spin, aiResult, projectName: project?.name || '' }),
      })
      const data = await res.json()
      if (data.wordContent) {
        const blob = new Blob([data.wordContent], { type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        const url = URL.createObjectURL(blob); const a = document.createElement('a')
        a.href = url; a.download = `Sales_${active.name.replace(/\s+/g,'_')}.docx`
        a.click(); URL.revokeObjectURL(url); showToast('Export Word téléchargé')
      } else {
        // Fallback: export enriched JSON with AI insights as .txt
        exportJSON()
      }
    } catch { exportJSON() }
  }

  // ── Import JSON ──
  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const raw      = JSON.parse(evt.target.result)
        const card     = raw.workflow || raw
        const imported = { ...card, id: uid(), createdAt: card.createdAt || new Date().toISOString(), theme: card.theme || 'obsidian' }
        const updated  = [...workflows, imported]
        setWorkflows(updated); setActiveId(imported.id); persist(updated)
        if (imported.theme) setCurrentTheme(imported.theme)
        if (imported.aiResult) setAiResult(imported.aiResult)
        showToast(`"${imported.name}" importé`)
      } catch (err) { showToast('Fichier invalide : ' + err.message, 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  const themeVars = THEMES[currentTheme]?.vars || THEMES.obsidian.vars

  // ── Computed stats ──
  const aidaStats = active ? (() => {
    const stages = active.aida?.stages || []
    const entry  = stages[0]?.volume || 0
    const final  = stages[stages.length - 1]?.volume || 0
    const rate   = entry > 0 ? ((final / entry) * 100).toFixed(1) : 0
    return { entry, final, rate }
  })() : null

  const bantStats = active ? (() => {
    const ps = active.bant?.prospects || []
    return { total: ps.length, chaud: ps.filter(p => p.status === 'chaud').length, tiede: ps.filter(p => p.status === 'tiede').length, froid: ps.filter(p => p.status === 'froid').length }
  })() : null

  const spinStats = active ? (() => {
    let total = 0
    for (const cat of Object.keys(SPIN_CATS)) total += (active.spin?.[cat]?.questions || []).length
    return total
  })() : null
  return (
    <>
      <style>{buildCSS(themeVars)}</style>
      <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport}/>

      <div onClick={() => showThemes && setShowThemes(false)}>
        {/* ── TOPBAR ── */}
        <header className="tb">
          <button className="back" onClick={() => router.push(`/management${projectId ? `?project=${projectId}` : ''}`)}>← Retour</button>
          <div>
            <div className="tb-title">Performance Commerciale</div>
            {project && <div className="tb-sub">{project.name}</div>}
          </div>
          <div className="tb-r">
            <button className="btn" onClick={() => importRef.current?.click()}>↑ Import</button>
            {active && <button className="btn" onClick={() => setShowExport(true)}>↓ Export</button>}
            <div className="theme-picker" onClick={e => e.stopPropagation()}>
              <button className="btn" onClick={() => setShowThemes(v => !v)}>{THEMES[currentTheme]?.icon} Thème</button>
              {showThemes && (
                <div className="theme-drop">
                  {Object.entries(THEMES).map(([key, t]) => (
                    <div key={key} className={`theme-opt ${currentTheme===key?'on':''}`} onClick={() => changeTheme(key)}>
                      <div className="theme-swatch" style={{ background: t.vars['--acc'] }}/>{t.label}
                      {currentTheme===key && <span style={{ marginLeft:'auto', fontSize:9 }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {active && (
              <button className="btn ai" onClick={runAnalysis} disabled={aiLoading}>
                {aiLoading ? <><span className="spinner"/>Analyse…</> : '✦ Analyser'}
              </button>
            )}
          </div>
        </header>

        <div className="layout">
          {/* ── LEFT ── */}
          <aside className="left">
            <div className="ph"><span className="pl">Workflows ({workflows.length})</span></div>
            <div className="plist">
              {workflows.length === 0 && <div className="empty"><div className="empty-ico">📊</div><div className="empty-txt">Générez ou créez votre premier workflow commercial</div></div>}
              {workflows.map(w => (
                <div key={w.id} className={`witem ${activeId===w.id?'on':''}`} onClick={() => { setActiveId(w.id); if (w.theme) setCurrentTheme(w.theme); setAiResult(w.aiResult || null) }}>
                  <button className="wdel" onClick={e => { e.stopPropagation(); deleteWorkflow(w.id) }}>✕</button>
                  <div className="wname">{w.name}{w.generatedSynthese && <span className="ai-badge">✦ IA</span>}</div>
                  <div className="wmeta">{new Date(w.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})} · {w.bant?.prospects?.length||0} prospects{w.aiResult ? ' · ✓' : ''}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:10, borderTop:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:6 }}>
              <button className="btn gen" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowGenModal(true)}>✦ Générer par IA</button>
              {showNewForm ? (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <input className="inp" placeholder="Nom du workflow" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key==='Enter' && createWorkflow()} autoFocus/>
                  <div style={{ display:'flex', gap:5 }}>
                    <button className="btn p" style={{ flex:1 }} onClick={() => createWorkflow()}>Créer</button>
                    <button className="btn" onClick={() => setShowNewForm(false)}>✕</button>
                  </div>
                </div>
              ) : (
                <button className="btn" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowNewForm(true)}>+ Créer manuellement</button>
              )}
            </div>
          </aside>

          {/* ── MAIN ── */}
          <main className="center">
            {!active ? (
              <div className="empty" style={{ padding:'80px 40px' }}>
                <div className="empty-ico" style={{ fontSize:52, marginBottom:14 }}>📊</div>
                <div style={{ fontFamily:'Instrument Serif,serif', fontSize:20, fontStyle:'italic', marginBottom:10 }}>Performance Commerciale</div>
                <div className="empty-txt" style={{ marginBottom:24 }}>AIDA · BANT · SPIN Selling — Décrivez votre activité et laissez l'IA construire votre workflow complet.</div>
                <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                  <button className="btn gen" style={{ padding:'9px 18px', fontSize:11 }} onClick={() => setShowGenModal(true)}>✦ Générer par IA</button>
                  <button className="btn" style={{ padding:'9px 18px', fontSize:11 }} onClick={() => importRef.current?.click()}>↑ Importer JSON</button>
                  <button className="btn" style={{ padding:'9px 18px', fontSize:11 }} onClick={() => setShowNewForm(true)}>+ Créer manuellement</button>
                </div>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                {aidaStats && (
                  <div style={{ padding:'14px 20px 0', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                    <div style={{ fontFamily:'Instrument Serif,serif', fontSize:18, fontStyle:'italic', flex:1 }}>{active.name}</div>
                    {active.generatedSynthese && <div className="ai-badge" style={{ fontSize:9 }}>✦ Généré par IA</div>}
                  </div>
                )}
                {aidaStats && (
                  <div style={{ padding:'8px 20px 0' }} className="stats-bar">
                    <div className="stat-chip"><span className="stat-val" style={{ color:'#6366f1' }}>{(aidaStats.entry||0).toLocaleString()}</span><span className="stat-lbl">Entrée funnel</span></div>
                    <div className="stat-chip"><span className="stat-val" style={{ color:'#34d399' }}>{(aidaStats.final||0).toLocaleString()}</span><span className="stat-lbl">Conversions</span></div>
                    <div className="stat-chip"><span className="stat-val" style={{ color:parseFloat(aidaStats.rate)>=5?'#34d399':'#f59e0b' }}>{aidaStats.rate}%</span><span className="stat-lbl">Taux global</span></div>
                    {bantStats && <><div className="stat-chip"><span className="stat-val" style={{ color:'#f87171' }}>{bantStats.chaud}</span><span className="stat-lbl">Prospects chauds</span></div><div className="stat-chip"><span className="stat-val" style={{ color:'var(--mu2)' }}>{bantStats.total}</span><span className="stat-lbl">Total prospects</span></div></>}
                    {spinStats !== null && <div className="stat-chip"><span className="stat-val" style={{ color:'var(--acc2)' }}>{spinStats}</span><span className="stat-lbl">Questions SPIN</span></div>}
                  </div>
                )}

                {/* Tabs */}
                <div className="tabs" style={{ marginTop:8 }}>
                  {[
                    { key:'aida',    label:'🎯 AIDA / Funnel'  },
                    { key:'bant',    label:'💼 BANT'            },
                    { key:'spin',    label:'💬 SPIN Selling'    },
                    { key:'context', label:'⚙ Contexte'         },
                  ].map(t => (
                    <button key={t.key} className={`tab ${tab===t.key?'on':''}`} onClick={() => setTab(t.key)}>{t.label}</button>
                  ))}
                </div>

                {/* ── AIDA TAB ── */}
                {tab === 'aida' && (
                  <div className="content">
                    {active.generatedSynthese && <div className="gen-notice">✦ {active.generatedSynthese}</div>}
                    <div className="card">
                      <div className="card-title"><div className="card-dot" style={{ background:'#6366f1' }}/>Funnel de Conversion AIDA</div>
                      {active.aida?.description && <div style={{ fontSize:12, color:'var(--mu2)', lineHeight:1.6 }}>{active.aida.description}</div>}
                      <div className="funnel-wrap">
                        {(active.aida?.stages || []).map((stage, idx) => {
                          const maxVol  = active.aida?.stages?.[0]?.volume || 1
                          const barW    = Math.max(10, (stage.volume / maxVol) * 100)
                          const isOpen  = editStageIdx === idx
                          return (
                            <div key={stage.id}>
                              {idx > 0 && <div className="funnel-arrow">▼ {(() => { const prev = active.aida?.stages?.[idx-1]; return prev?.volume > 0 ? `${(((prev.volume - stage.volume)/prev.volume)*100).toFixed(0)}% de perte` : '' })()}</div>}
                              <div className="funnel-stage" style={{ borderColor: stage.color+'40', background: stage.color+'08' }}>
                                <div className="funnel-stage-header" onClick={() => setEditStageIdx(isOpen ? null : idx)}>
                                  <div style={{ width:8, height:8, borderRadius:'50%', background: stage.color, flexShrink:0 }}/>
                                  <div style={{ flex:1 }}>
                                    <div className="funnel-stage-name" style={{ color: stage.color }}>{stage.label}</div>
                                    <div style={{ fontSize:10, color:'var(--mu2)', marginTop:2 }}>{stage.description}</div>
                                  </div>
                                  <div style={{ textAlign:'right' }}>
                                    <div className="funnel-stage-volume" style={{ color: stage.color }}>{(stage.volume||0).toLocaleString()}</div>
                                    <div className="funnel-stage-rate" style={{ color:'var(--mu2)' }}>→ {stage.conversionRate}% conversion</div>
                                  </div>
                                  <span style={{ fontSize:10, color:'var(--mu)', marginLeft:8 }}>{isOpen ? '▲' : '▼'}</span>
                                </div>
                                <div className="funnel-bar-wrap"><div className="funnel-bar-fill" style={{ width:`${barW}%`, background: stage.color }}/></div>
                                {isOpen && (
                                  <div className="funnel-detail">
                                    <div className="frow">
                                      <div className="fgroup"><label className="flabel">Volume</label><input className="inp" type="number" value={stage.volume} onChange={e => updateStage(idx, { volume: parseInt(e.target.value)||0 })}/></div>
                                      <div className="fgroup"><label className="flabel">Taux conversion (%)</label><input className="inp" type="number" min={0} max={100} value={stage.conversionRate} onChange={e => updateStage(idx, { conversionRate: parseInt(e.target.value)||0 })}/></div>
                                    </div>
                                    <div className="fgroup"><label className="flabel">Description</label><input className="inp" value={stage.description||''} onChange={e => updateStage(idx, { description: e.target.value })} placeholder="Description de l'étape…"/></div>
                                    <div className="fgroup">
                                      <label className="flabel">Actions clés</label>
                                      {(stage.actions||[]).map((a, ai) => (
                                        <div key={ai} style={{ display:'flex', gap:5, marginBottom:4 }}>
                                          <input className="inp" value={a} onChange={e => { const acts=[...(stage.actions||[])]; acts[ai]=e.target.value; updateStage(idx,{actions:acts}) }}/>
                                          <button className="icon-btn" style={{ color:'#f87171', flexShrink:0 }} onClick={() => { const acts=(stage.actions||[]).filter((_,i)=>i!==ai); updateStage(idx,{actions:acts}) }}>✕</button>
                                        </div>
                                      ))}
                                      <button className="btn" style={{ alignSelf:'flex-start', marginTop:2 }} onClick={() => updateStage(idx, { actions:[...(stage.actions||[]), ''] })}>+ Action</button>
                                    </div>
                                    <div className="fgroup">
                                      <label className="flabel">KPIs</label>
                                      {(stage.kpis||[]).map((k, ki) => (
                                        <div key={ki} style={{ display:'flex', gap:5, marginBottom:4 }}>
                                          <input className="inp" value={k} onChange={e => { const ks=[...(stage.kpis||[])]; ks[ki]=e.target.value; updateStage(idx,{kpis:ks}) }}/>
                                          <button className="icon-btn" style={{ color:'#f87171', flexShrink:0 }} onClick={() => { const ks=(stage.kpis||[]).filter((_,i)=>i!==ki); updateStage(idx,{kpis:ks}) }}>✕</button>
                                        </div>
                                      ))}
                                      <button className="btn" style={{ alignSelf:'flex-start', marginTop:2 }} onClick={() => updateStage(idx, { kpis:[...(stage.kpis||[]), ''] })}>+ KPI</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BANT TAB ── */}
                {tab === 'bant' && (
                  <div className="content">
                    <div className="card">
                      <div className="card-title" style={{ justifyContent:'space-between' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:8 }}><div className="card-dot" style={{ background:'#f59e0b' }}/>Critères BANT</span>
                      </div>
                      {active.bant?.description && <div style={{ fontSize:12, color:'var(--mu2)', lineHeight:1.6 }}>{active.bant.description}</div>}
                      <div className="bant-criteria-grid">
                        {Object.entries(BANT_CRITERIA).map(([key, meta]) => {
                          const crit = active.bant?.criteria?.[key] || {}
                          return (
                            <div key={key} className="bant-crit-card">
                              <div className="bant-crit-header">
                                <div className="bant-crit-icon">{meta.icon}</div>
                                <div><div className="bant-crit-name" style={{ color: meta.color }}>{meta.label}</div><div style={{ fontSize:10, color:'var(--mu2)' }}>{meta.desc}</div></div>
                              </div>
                              {crit.description && <div style={{ fontSize:11, color:'var(--mu2)', lineHeight:1.5, marginBottom:8 }}>{crit.description}</div>}
                              {(crit.questions||[]).length > 0 && (
                                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:2 }}>Questions</div>
                                  {(crit.questions||[]).map((q, qi) => (
                                    <div key={qi} style={{ fontSize:11, color:'var(--mu2)', lineHeight:1.5, paddingLeft:8, borderLeft:`2px solid ${meta.color}30` }}>{q}</div>
                                  ))}
                                </div>
                              )}
                              {(crit.thresholds?.fort || crit.thresholds?.moyen) && (
                                <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                                  {crit.thresholds.fort  && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:3, background:'rgba(52,211,153,.1)', color:'#34d399', border:'1px solid rgba(52,211,153,.2)', fontFamily:'Geist Mono,monospace' }}>★ {crit.thresholds.fort}</span>}
                                  {crit.thresholds.moyen && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:3, background:'rgba(245,158,11,.1)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.2)', fontFamily:'Geist Mono,monospace' }}>◑ {crit.thresholds.moyen}</span>}
                                  {crit.thresholds.faible && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:3, background:'rgba(148,163,184,.1)', color:'#94a3b8', border:'1px solid rgba(148,163,184,.2)', fontFamily:'Geist Mono,monospace' }}>○ {crit.thresholds.faible}</span>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Prospects */}
                    <div className="card">
                      <div className="card-title" style={{ justifyContent:'space-between' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:8 }}><div className="card-dot" style={{ background:'#818cf8' }}/>Prospects ({active.bant?.prospects?.length||0})</span>
                        <button className="btn p" style={{ padding:'4px 10px' }} onClick={() => { setEditProspect({}); setProspectForm({ name:'', company:'', sector:'', notes:'', nextAction:'', scores:{ budget:3, authority:3, need:3, timeline:3 } }) }}>+ Prospect</button>
                      </div>

                      {/* Form */}
                      {editProspect !== null && (
                        <div style={{ background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:10, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
                          <div style={{ fontFamily:'Instrument Serif,serif', fontSize:14, fontStyle:'italic' }}>{editProspect?.id ? `Modifier "${editProspect.name}"` : 'Nouveau prospect'}</div>
                          <div className="frow">
                            <div className="fgroup"><label className="flabel">Nom *</label><input className="inp" placeholder="Jean Dupont" value={prospectForm.name} onChange={e => setProspectForm(p => ({ ...p, name:e.target.value }))}/></div>
                            <div className="fgroup"><label className="flabel">Entreprise</label><input className="inp" placeholder="ACME Corp" value={prospectForm.company} onChange={e => setProspectForm(p => ({ ...p, company:e.target.value }))}/></div>
                          </div>
                          <div className="fgroup"><label className="flabel">Secteur</label><input className="inp" placeholder="SaaS B2B, Retail…" value={prospectForm.sector} onChange={e => setProspectForm(p => ({ ...p, sector:e.target.value }))}/></div>
                          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            <label className="flabel">Scores BANT (1-5)</label>
                            {Object.entries(BANT_CRITERIA).map(([key, meta]) => (
                              <div key={key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <div style={{ width:90, fontSize:11, fontWeight:600, color: meta.color }}>{meta.icon} {meta.label}</div>
                                <input type="range" className="sr" min={1} max={5} step={1} value={prospectForm.scores[key]||3}
                                  style={{ background:`linear-gradient(to right, ${meta.color} ${((prospectForm.scores[key]-1)/4)*100}%, var(--s3) 0%)` }}
                                  onChange={e => setProspectForm(p => ({ ...p, scores:{ ...p.scores, [key]:parseInt(e.target.value) } }))}/>
                                <span style={{ fontFamily:'Geist Mono,monospace', fontSize:12, fontWeight:700, color: scoreColor(prospectForm.scores[key]), width:20 }}>{prospectForm.scores[key]}</span>
                                <span style={{ fontSize:9, color:'var(--mu)', width:60 }}>{SCORE_LABELS[prospectForm.scores[key]]}</span>
                              </div>
                            ))}
                          </div>
                          <div className="fgroup"><label className="flabel">Notes</label><textarea className="inp" rows={2} value={prospectForm.notes} onChange={e => setProspectForm(p => ({ ...p, notes:e.target.value }))}/></div>
                          <div className="fgroup"><label className="flabel">Prochaine action</label><input className="inp" placeholder="Envoyer une démo…" value={prospectForm.nextAction} onChange={e => setProspectForm(p => ({ ...p, nextAction:e.target.value }))}/></div>
                          <div style={{ display:'flex', gap:6 }}>
                            <button className="btn p" style={{ flex:1 }} onClick={saveProspect}>{editProspect?.id ? 'Mettre à jour' : 'Ajouter'}</button>
                            <button className="btn" onClick={() => setEditProspect(null)}>Annuler</button>
                          </div>
                        </div>
                      )}

                      {(active.bant?.prospects||[]).length === 0 ? (
                        <div className="empty" style={{ padding:'30px 0' }}><div className="empty-ico">👤</div><div className="empty-txt">Ajoutez des prospects à qualifier.</div></div>
                      ) : (
                        <div className="bant-prospects-list">
                          {(active.bant?.prospects||[]).map(prospect => {
                            const avg = getBANTAvg(prospect.scores)
                            const sm  = PROSPECT_STATUS[prospect.status] || PROSPECT_STATUS.tiede
                            return (
                              <div key={prospect.id} className="prospect-card">
                                <div className="prospect-header">
                                  <div className="prospect-avatar">{(prospect.name||'?').slice(0,2).toUpperCase()}</div>
                                  <div style={{ flex:1 }}>
                                    <div className="prospect-name">{prospect.name}</div>
                                    {prospect.company && <div className="prospect-company">{prospect.company}{prospect.sector ? ` · ${prospect.sector}` : ''}</div>}
                                  </div>
                                  <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                                    <span className="status-chip" style={{ background:sm.bg, color:sm.color, border:`1px solid ${sm.color}30` }}>{sm.icon} {sm.label}</span>
                                    <span style={{ fontFamily:'Geist Mono,monospace', fontSize:11, fontWeight:700, color: scoreColor(avg) }}>{avg.toFixed(1)}</span>
                                    <button className="icon-btn" onClick={() => { setEditProspect(prospect); setProspectForm({ name:prospect.name||'', company:prospect.company||'', sector:prospect.sector||'', notes:prospect.notes||'', nextAction:prospect.nextAction||'', scores:prospect.scores||{budget:3,authority:3,need:3,timeline:3} }) }}>✎</button>
                                    <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteProspect(prospect.id)}>✕</button>
                                  </div>
                                </div>
                                <div className="prospect-scores">
                                  {Object.entries(BANT_CRITERIA).map(([key, meta]) => (
                                    <div key={key} className="pscore" style={{ background:`${meta.color}10`, border:`1px solid ${meta.color}25` }}>
                                      <span className="pscore-val" style={{ color: scoreColor(prospect.scores?.[key]||0) }}>{prospect.scores?.[key]||0}</span>
                                      <span className="pscore-key" style={{ color: meta.color }}>{meta.label.slice(0,4)}</span>
                                    </div>
                                  ))}
                                </div>
                                {prospect.notes && <div style={{ fontSize:11, color:'var(--mu2)', lineHeight:1.5 }}>{prospect.notes}</div>}
                                {prospect.nextAction && <div style={{ fontSize:10, color:'var(--acc2)', fontFamily:'Geist Mono,monospace' }}>→ {prospect.nextAction}</div>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── SPIN TAB ── */}
                {tab === 'spin' && (
                  <div className="content">
                    {active.spin?.description && (
                      <div className="gen-notice">{active.spin.description}</div>
                    )}
                    <div className="spin-cats">
                      {Object.entries(SPIN_CATS).map(([cat, meta]) => {
                        const catData = active?.spin?.[cat] || { objectif:'', questions:[] }
                        return (
                          <div key={cat} className="spin-cat" style={{ borderColor: meta.color+'30' }}>
                            <div className="spin-cat-header" style={{ background: meta.color+'0e' }}>
                              <div className="spin-cat-badge" style={{ background: meta.color+'18', color: meta.color, border:`1px solid ${meta.color}40` }}>{meta.short}</div>
                              <div style={{ flex:1 }}>
                                <div className="spin-cat-name" style={{ color: meta.color }}>{meta.label}</div>
                                <div className="spin-cat-desc">{catData.objectif || meta.desc}</div>
                              </div>
                              <span style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace', marginLeft:4 }}>{catData.questions?.length||0} questions</span>
                            </div>
                            <div className="spin-questions">
                              {(catData.questions||[]).map((q, qi) => (
                                <div key={q.id||qi} className="spin-q">
                                  {editQuestion?.cat === cat && editQuestion?.idx === qi ? (
                                    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                                      <textarea className="inp" rows={2} value={qForm.question} onChange={e => setQForm(p => ({ ...p, question:e.target.value }))} placeholder="Question…" autoFocus/>
                                      <input className="inp" value={qForm.objectif} onChange={e => setQForm(p => ({ ...p, objectif:e.target.value }))} placeholder="Objectif de la question…"/>
                                      <input className="inp" value={qForm.conseil} onChange={e => setQForm(p => ({ ...p, conseil:e.target.value }))} placeholder="Conseil d'utilisation…"/>
                                      <div style={{ display:'flex', gap:5 }}>
                                        <button className="btn p" style={{ flex:1, padding:'4px' }} onClick={saveQuestion}>✓</button>
                                        <button className="btn" style={{ padding:'4px 8px' }} onClick={() => setEditQuestion(null)}>✕</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="spin-q-num">#{qi+1}</span>
                                      <div className="spin-q-body">
                                        <div className="spin-q-text">{q.question}</div>
                                        {q.objectif && <div className="spin-q-obj">🎯 {q.objectif}</div>}
                                        {q.conseil  && <div className="spin-q-conseil">💡 {q.conseil}</div>}
                                      </div>
                                      <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                                        <button className="icon-btn" onClick={() => { setEditQuestion({ cat, idx:qi, isNew:false }); setQForm({ question:q.question||'', objectif:q.objectif||'', conseil:q.conseil||'' }) }}>✎</button>
                                        <button className="icon-btn" style={{ color:'#f87171' }} onClick={() => deleteQuestion(cat, qi)}>✕</button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                              {editQuestion?.cat === cat && editQuestion?.isNew ? (
                                <div className="spin-q">
                                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                                    <textarea className="inp" rows={2} value={qForm.question} onChange={e => setQForm(p => ({ ...p, question:e.target.value }))} placeholder="Nouvelle question…" autoFocus/>
                                    <input className="inp" value={qForm.objectif} onChange={e => setQForm(p => ({ ...p, objectif:e.target.value }))} placeholder="Objectif…"/>
                                    <input className="inp" value={qForm.conseil}  onChange={e => setQForm(p => ({ ...p, conseil:e.target.value }))}  placeholder="Conseil…"/>
                                    <div style={{ display:'flex', gap:5 }}>
                                      <button className="btn p" style={{ flex:1, padding:'4px' }} onClick={saveQuestion}>Ajouter</button>
                                      <button className="btn" style={{ padding:'4px 8px' }} onClick={() => setEditQuestion(null)}>✕</button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <button className="btn" style={{ fontSize:9, padding:'4px 8px', alignSelf:'flex-start', marginTop:4 }} onClick={() => { setEditQuestion({ cat, isNew:true }); setQForm({ question:'', objectif:'', conseil:'' }) }}>+ Question</button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── CONTEXT TAB ── */}
                {tab === 'context' && (
                  <div className="content">
                    <div className="card">
                      <div className="card-title"><div className="card-dot"/>Informations du workflow</div>
                      <div className="fgroup"><label className="flabel">Nom du workflow</label><input className="inp" value={active.name||''} onChange={e => updateActive({ name: e.target.value })}/></div>
                      <div className="fgroup"><label className="flabel">Objectif commercial</label><input className="inp" placeholder="Ex: Atteindre 100 clients en 6 mois" value={active.objectifCommercial||''} onChange={e => updateActive({ objectifCommercial: e.target.value })}/></div>
                      <div className="fgroup"><label className="flabel">Contexte et description</label><textarea className="inp" rows={4} placeholder="Décrivez votre activité, votre marché, votre cible…" value={active.context||''} onChange={e => updateActive({ context: e.target.value })}/></div>
                    </div>
                    <div className="card">
                      <div className="card-title"><div className="card-dot" style={{ background:'#f59e0b' }}/>Description AIDA</div>
                      <textarea className="inp" rows={2} placeholder="Description du funnel de vente…" value={active.aida?.description||''} onChange={e => updateActive({ aida:{ ...active.aida, description: e.target.value } })}/>
                    </div>
                    <div className="card">
                      <div className="card-title"><div className="card-dot" style={{ background:'#818cf8' }}/>Description BANT</div>
                      <textarea className="inp" rows={2} placeholder="Approche de qualification BANT…" value={active.bant?.description||''} onChange={e => updateActive({ bant:{ ...active.bant, description: e.target.value } })}/>
                    </div>
                    <div className="card">
                      <div className="card-title"><div className="card-dot" style={{ background:'#34d399' }}/>Description SPIN</div>
                      <textarea className="inp" rows={2} placeholder="Approche SPIN Selling…" value={active.spin?.description||''} onChange={e => updateActive({ spin:{ ...active.spin, description: e.target.value } })}/>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {/* ── AI ANALYSIS PANEL ── */}
        <div className={`ai-panel ${showAiPanel?'open':''}`}>
          <div className="ai-ph">
            <span className="ai-title">Analyse IA ✦</span>
            <button className="btn" onClick={() => setShowAiPanel(false)}>✕ Fermer</button>
          </div>
          <div className="ai-body">
            {aiLoading && <div style={{ display:'flex', alignItems:'center', gap:10, padding:'20px', color:'var(--mu2)', fontSize:12 }}><div className="spinner"/>Analyse commerciale en cours…</div>}
            {!aiLoading && !aiResult && active?.aiResult && (() => { setAiResult(active.aiResult); return null })()}
            {aiResult && (
              <>
                {/* Score */}
                {aiResult.score_performance && (
                  <div style={{ background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:10, padding:14, display:'flex', gap:14, alignItems:'center' }}>
                    <div>
                      <div className="score-big" style={{ color: aiResult.score_performance.note>=7?'#34d399':aiResult.score_performance.note>=5?'#f59e0b':'#f87171' }}>{aiResult.score_performance.note}</div>
                      <div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>/ {aiResult.score_performance.sur}</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:9, color:'var(--mu2)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Performance commerciale</div>
                      <div style={{ fontSize:11, color:'var(--acc2)', fontFamily:'Geist Mono,monospace', fontWeight:700, marginBottom:4 }}>{aiResult.score_performance.label}</div>
                      <div className="score-bar"><div className="score-fill" style={{ width:`${(aiResult.score_performance.note/aiResult.score_performance.sur)*100}%`, background: aiResult.score_performance.note>=7?'#34d399':aiResult.score_performance.note>=5?'#f59e0b':'#f87171' }}/></div>
                      <div style={{ fontSize:11, color:'var(--mu2)', marginTop:6, lineHeight:1.5 }}>{aiResult.score_performance.commentaire}</div>
                    </div>
                  </div>
                )}
                {aiResult.synthese && <div><div className="ai-st">Synthèse</div><div className="ai-card">{aiResult.synthese}</div></div>}

                {/* AIDA analysis */}
                {aiResult.aida_analyse && (
                  <div>
                    <div className="ai-st">Analyse AIDA</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {aiResult.aida_analyse.goulot && <div style={{ background:'rgba(248,113,113,.07)', border:'1px solid rgba(248,113,113,.2)', borderRadius:7, padding:'8px 12px', fontSize:11, color:'#f87171' }}>⚠ Goulot : {aiResult.aida_analyse.goulot} ({aiResult.aida_analyse.taux_conversion_global}% conversion globale)</div>}
                      {(aiResult.aida_analyse.recommandations||[]).map((r, i) => {
                        const uc = r.urgence==='haute'?'#f87171':r.urgence==='moyenne'?'#f59e0b':'#34d399'
                        return (
                          <div key={i} className="ai-reco">
                            <div className="ai-reco-title">
                              <span style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background:`${uc}18`, color:uc, border:`1px solid ${uc}40`, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{r.urgence}</span>
                              {r.stage && <span style={{ fontSize:9, color:'var(--mu2)', fontFamily:'Geist Mono,monospace' }}>{r.stage}</span>}
                              {r.action}
                            </div>
                            {r.impact && <div className="ai-reco-desc">{r.impact}</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* BANT analysis */}
                {aiResult.bant_analyse && (
                  <div>
                    <div className="ai-st">Analyse BANT</div>
                    {aiResult.bant_analyse.alerte && <div style={{ background:'rgba(248,113,113,.07)', border:'1px solid rgba(248,113,113,.2)', borderRadius:7, padding:'8px 12px', fontSize:11, color:'#f87171', marginBottom:6 }}>⚠ {aiResult.bant_analyse.alerte}</div>}
                    {aiResult.bant_analyse.repartition && (
                      <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                        {Object.entries(PROSPECT_STATUS).map(([k, s]) => (
                          <div key={k} style={{ flex:1, padding:'6px 8px', borderRadius:6, background:s.bg, border:`1px solid ${s.color}25`, textAlign:'center' }}>
                            <div style={{ fontFamily:'Geist Mono,monospace', fontSize:16, fontWeight:700, color:s.color }}>{aiResult.bant_analyse.repartition[k]||0}</div>
                            <div style={{ fontSize:9, color:s.color, fontFamily:'Geist Mono,monospace' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {(aiResult.bant_analyse.recommandations||[]).map((r, i) => (
                        <div key={i} className="ai-reco">
                          <div className="ai-reco-title">{r.prospect}</div>
                          <div className="ai-reco-desc">{r.action}</div>
                          {r.raison && <div style={{ fontSize:10, color:'var(--acc2)', fontFamily:'Geist Mono,monospace' }}>→ {r.raison}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SPIN analysis */}
                {aiResult.spin_analyse && (
                  <div>
                    <div className="ai-st">Analyse SPIN</div>
                    {aiResult.spin_analyse.equilibre && <div className="ai-card" style={{ marginBottom:6 }}>{aiResult.spin_analyse.equilibre}</div>}
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {(aiResult.spin_analyse.recommandations||[]).map((r, i) => {
                        const catColor = SPIN_CATS[r.categorie]?.color || 'var(--acc2)'
                        return (
                          <div key={i} className="ai-reco">
                            <div className="ai-reco-title"><span style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background:`${catColor}18`, color:catColor, fontFamily:'Geist Mono,monospace' }}>{SPIN_CATS[r.categorie]?.label||r.categorie}</span>{r.suggestion}</div>
                            {r.exemple && <div style={{ fontSize:10, color:'var(--mu2)', fontStyle:'italic' }}>Ex: "{r.exemple}"</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quick wins */}
                {aiResult.quick_wins?.length > 0 && (
                  <div>
                    <div className="ai-st" style={{ color:'#34d399' }}>⚡ Quick Wins</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {aiResult.quick_wins.map((q, i) => (
                        <div key={i} className="ai-qw">
                          <div className="ai-qw-title">{q.titre} <span style={{ fontSize:9, fontFamily:'Geist Mono,monospace', color:'var(--mu)', marginLeft:4 }}>{q.delai}</span></div>
                          <div className="ai-qw-desc">{q.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plan action */}
                {aiResult.plan_action?.length > 0 && (
                  <div>
                    <div className="ai-st">Plan d'Action</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {aiResult.plan_action.map((p, i) => (
                        <div key={i} className="plan-item">
                          <div className="plan-header">{p.horizon}</div>
                          <div className="plan-body">{(p.actions||[]).map((a, ai) => <div key={ai} className="plan-action"><div className="plan-dot"/>{a}</div>)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* KPIs */}
                {aiResult.kpis_cles?.length > 0 && (
                  <div>
                    <div className="ai-st">KPIs Prioritaires</div>
                    <div className="ai-kpi">
                      {aiResult.kpis_cles.map((k, i) => {
                        const pc = k.priorite==='haute'?'#f87171':'#f59e0b'
                        return (
                          <div key={i} className="ai-kpi-row">
                            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background:`${pc}18`, color:pc, border:`1px solid ${pc}40`, fontFamily:'Geist Mono,monospace', fontWeight:700, flexShrink:0 }}>{k.priorite}</span>
                            <div style={{ flex:1 }}><div style={{ fontWeight:600, marginBottom:1 }}>{k.kpi}</div>{k.valeur_actuelle && <span style={{ fontSize:10, color:'var(--mu2)', fontFamily:'Geist Mono,monospace' }}>{k.valeur_actuelle} →</span>} {k.cible && <span style={{ fontSize:10, color:'#34d399', fontFamily:'Geist Mono,monospace' }}>{k.cible}</span>}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {aiResult.conclusion && <div><div className="ai-st">Conclusion</div><div className="ai-card" style={{ fontStyle:'italic', color:'var(--mu2)' }}>{aiResult.conclusion}</div></div>}
              </>
            )}
            {!aiLoading && !aiResult && <div className="empty" style={{ padding:'40px 16px' }}><div className="empty-ico">✦</div><div className="empty-txt">Cliquez sur "Analyser" pour obtenir une analyse stratégique IA de votre performance commerciale.</div></div>}
          </div>
        </div>

        {/* ── GENERATION MODAL ── */}
        {showGenModal && (
          <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget && !genLoading) setShowGenModal(false) }}>
            <div className="modal">
              <div>
                <div className="modal-title">✦ Générer un Workflow Commercial par IA</div>
                <div className="modal-sub">Décrivez votre activité commerciale, votre marché et votre équipe. Claude construira automatiquement votre funnel AIDA, vos critères BANT avec des prospects types, et vos questions SPIN Selling.</div>
              </div>
              {genStep === 'done' ? (
                <div className="gen-done">✓ Workflow commercial généré avec succès</div>
              ) : (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label className="flabel">Nom du workflow *</label>
                    <input className="inp" placeholder="Ex: Performance Q1 2026 — Équipe Commerciale" value={genName} onChange={e => setGenName(e.target.value)} disabled={genLoading} autoFocus/>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label className="flabel">Description de l'activité commerciale *</label>
                    <textarea className="inp" style={{ minHeight:130, resize:'vertical' }}
                      placeholder={`Exemples :\n• "Startup SaaS B2B vendant un outil CRM à des PME. Équipe de 5 commerciaux, cycle de vente de 3 mois, ticket moyen 8K€/an. Nos prospects sont des DSI et DAF de boîtes de 50-200 personnes."\n• "Cabinet de conseil RH proposant des formations managériales aux ETI. Vente consultative, décision par DRH et Direction Générale, durée 2-6 mois. Objectif : doubler le CA en 18 mois."`}
                      value={genDesc} onChange={e => setGenDesc(e.target.value)} disabled={genLoading}/>
                  </div>
                  {genLoading && <div className="gen-step"><span className="spinner g" style={{ width:13, height:13, borderWidth:2 }}/>Claude construit votre workflow AIDA · BANT · SPIN…</div>}
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn gen" style={{ flex:1, padding:'9px 0', justifyContent:'center', fontSize:11 }} onClick={handleGenerate} disabled={genLoading || !genDesc.trim() || !genName.trim()}>
                      {genLoading ? 'Génération en cours…' : '✦ Générer le workflow'}
                    </button>
                    <button className="btn" style={{ padding:'9px 14px' }} onClick={() => { if (!genLoading) setShowGenModal(false) }} disabled={genLoading}>Annuler</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── EXPORT MODAL ── */}
        {showExport && (
          <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setShowExport(false) }}>
            <div className="modal" style={{ maxWidth:380 }}>
              <div className="modal-title">↓ Exporter</div>
              <div className="export-btns">
                <div className="export-btn" onClick={exportJSON}><div className="export-btn-icon">{ }</div><div className="export-btn-icon">📄</div><div className="export-btn-label">JSON</div><div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>Sauvegarde complète</div></div>
                <div className="export-btn" onClick={exportCSV}><div className="export-btn-icon">📊</div><div className="export-btn-label">CSV</div><div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>Tableau de données</div></div>
                <div className="export-btn" onClick={() => { setShowExport(false); exportWord() }}><div className="export-btn-icon">📝</div><div className="export-btn-label">Word</div><div style={{ fontSize:9, color:'var(--mu)', fontFamily:'Geist Mono,monospace' }}>Rapport complet</div></div>
              </div>
              <button className="btn" style={{ alignSelf:'flex-end' }} onClick={() => setShowExport(false)}>Fermer</button>
            </div>
          </div>
        )}

        {toast && <div className={`toast ${toast.type||''}`}>{toast.type==='error'?'✕':'✓'} {toast.msg}</div>}
      </div>
    </>
  )
}