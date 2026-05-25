'use client'

/**
 * ExcelAI — Combined Analysis + Live Canvas
 *
 * Flow:
 *  1. Upload CSV/XLSX
 *  2. Claude analyses structure (10 first rows + last row) → formulas + charts + anomalies
 *  3. Two modes:
 *     A. Download .xlsx with pre-wired formulas referencing "Données" sheet
 *     B. Live Canvas — full spreadsheet engine with formulas injected into the grid
 *
 * ExcelCanvas features:
 *  - Virtualized rendering, keyboard nav, formula engine (50+ functions FR+EN)
 *  - Multi-cell selection, copy/paste, column resize, undo/redo
 *  - Find & replace, context menu, auto-type detection
 *  - Formulas from Claude injected directly as real cells
 */

import { useState, useRef, useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  Upload, FileSpreadsheet, Brain, Download, AlertCircle, X,
  ChevronRight, Loader2, CheckCircle, ArrowRight, RotateCcw,
  Info, PackagePlus, BarChart2, PieChart, TrendingUp, ScatterChart,
  Copy, Check, MessageSquare, Send, Sparkles, BookOpen, ShieldCheck,
  ShieldAlert, Globe, History, ChevronDown, ChevronUp, AlertTriangle,
  Eye, RotateCw, Search, Trash2, Plus, Layers, Filter,
  Terminal, Table2, SlidersHorizontal
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────
const colLetter = (i) => {
  let s = ''; let n = i + 1
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) }
  return s
}

const MAX_HISTORY = 10

const CAT_STYLE = {
  total:       { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', text: 'text-emerald-300' },
  comptage:    { badge: 'bg-sky-500/15 text-sky-300 border-sky-500/25',             text: 'text-sky-300'     },
  statut:      { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',          text: 'text-blue-300'    },
  catégorie:   { badge: 'bg-violet-500/15 text-violet-300 border-violet-500/25',    text: 'text-violet-300'  },
  temporel:    { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25',       text: 'text-amber-300'   },
  performance: { badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',          text: 'text-cyan-300'    },
  ratio:       { badge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',          text: 'text-rose-300'    },
}

const CHART_META = {
  bar:       { icon: BarChart2,    label: 'Barres',      color: 'text-violet-300' },
  line:      { icon: TrendingUp,   label: 'Courbe',      color: 'text-amber-300'  },
  pie:       { icon: PieChart,     label: 'Camembert',   color: 'text-rose-300'   },
  scatter:   { icon: ScatterChart, label: 'Nuage pts',   color: 'text-cyan-300'   },
  histogram: { icon: BarChart2,    label: 'Histogramme', color: 'text-sky-300'    },
}

const SEV = {
  high:   { color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20',    Icon: ShieldAlert   },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20',Icon: AlertTriangle },
  low:    { color: 'text-slate-400', bg: 'bg-white/5 border-white/10',         Icon: Info          },
}

// ─────────────────────────────────────────────────────────────────
// ═══════════════  FORMULA ENGINE  ════════════════════════════════
// ─────────────────────────────────────────────────────────────────
const parseRef = (ref) => {
  const m = String(ref).trim().toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!m) return null
  let col = 0
  for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64
  return { r: parseInt(m[2]) - 1, c: col - 1 }
}

const parseRange = (range) => {
  const parts = String(range).split(':')
  if (parts.length !== 2) return null
  const a = parseRef(parts[0]); const b = parseRef(parts[1])
  if (!a || !b) return null
  return { r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) }
}

const autoType = (v) => {
  if (v === '' || v == null) return ''
  if (String(v).toUpperCase() === 'TRUE')  return true
  if (String(v).toUpperCase() === 'FALSE') return false
  const n = Number(v)
  if (!isNaN(n) && String(v).trim() !== '') return n
  return String(v)
}

class FormulaEngine {
  constructor(getData) { this.getData = getData; this._cache = new Map(); this._computing = new Set() }
  clearCache() { this._cache.clear() }

  getRangeValues(range) {
    const p = parseRange(range); if (!p) return []
    const vals = []
    for (let r = p.r1; r <= p.r2; r++)
      for (let c = p.c1; c <= p.c2; c++) vals.push(this.evaluate(r, c))
    return vals
  }

  evaluate(r, c) {
    const key = `${r},${c}`
    if (this._cache.has(key)) return this._cache.get(key)
    if (this._computing.has(key)) return '#CIRC!'
    this._computing.add(key)
    const raw = this.getData(r, c)
    let result
    try {
      result = (typeof raw === 'string' && raw.startsWith('='))
        ? this._parse(raw.slice(1).trim())
        : (raw === '' ? '' : raw)
    } catch { result = '#ERR!' }
    this._computing.delete(key)
    this._cache.set(key, result)
    return result
  }

  _parse(expr) {
    // String concatenation
    const catParts = this._splitByOp(expr, '&')
    if (catParts.length > 1) return catParts.map(p => String(this._parse(p.trim()) ?? '')).join('')
    // Comparison
    for (const op of ['>=', '<=', '<>', '>', '<', '=']) {
      const idx = this._findOp(expr, op); if (idx === -1) continue
      const l = this._parse(expr.slice(0, idx).trim())
      const r = this._parse(expr.slice(idx + op.length).trim())
      if (op === '>=') return l >= r; if (op === '<=') return l <= r; if (op === '<>') return l != r
      if (op === '>')  return l > r;  if (op === '<')  return l < r;  if (op === '=')  return l == r
    }
    // Add/subtract
    const ai = this._findLastAddSub(expr)
    if (ai !== -1) {
      const op = expr[ai]; const l = this._parse(expr.slice(0, ai).trim()); const r = this._parse(expr.slice(ai + 1).trim())
      return op === '+' ? Number(l) + Number(r) : Number(l) - Number(r)
    }
    // Mul/div
    const mi = this._findLastMulDiv(expr)
    if (mi !== -1) {
      const op = expr[mi]; const l = this._parse(expr.slice(0, mi).trim()); const r = this._parse(expr.slice(mi + 1).trim())
      if (op === '/') { const d = Number(r); return d === 0 ? '#DIV/0!' : Number(l) / d }
      return Number(l) * Number(r)
    }
    // Power
    const pi = expr.lastIndexOf('^')
    if (pi > 0 && !this._inStr(expr, pi) && !this._inPar(expr, pi))
      return Math.pow(Number(this._parse(expr.slice(0, pi).trim())), Number(this._parse(expr.slice(pi + 1).trim())))
    // Unary minus
    if (expr.startsWith('-')) return -Number(this._parse(expr.slice(1).trim()))
    // Parens
    if (expr.startsWith('(') && this._closeParen(expr, 0) === expr.length - 1) return this._parse(expr.slice(1, -1).trim())
    // String literal
    if (expr.startsWith('"') && expr.endsWith('"')) return expr.slice(1, -1)
    // Boolean
    if (expr.toUpperCase() === 'TRUE')  return true
    if (expr.toUpperCase() === 'FALSE') return false
    // Number
    if (!isNaN(Number(expr)) && expr !== '') return Number(expr)
    // Function
    const fn = expr.match(/^([A-Z][A-Z0-9_\u00C0-\u024F.]*)\s*\((.*)\)$/is)
    if (fn) return this._fn(fn[1].toUpperCase().replace(/\./g, '_'), fn[2])
    // Cell ref
    const ref = parseRef(expr); if (ref) { const v = this.evaluate(ref.r, ref.c); return v === '' ? 0 : v }
    // Range → first value
    const rng = parseRange(expr); if (rng) { const v = this.getRangeValues(expr); return v[0] ?? 0 }
    throw new Error('Unknown: ' + expr)
  }

  _fn(name, argsStr) {
    const args = this._splitArgs(argsStr)
    const v = (a) => { const p = parseRange(a?.trim()); return p ? this.getRangeValues(a.trim()) : [this._parse(a?.trim() || '')] }
    const nums = (a) => v(a).filter(x => typeof x === 'number')
    const allNums = (aa) => aa.flatMap(a => nums(a))

    // Aliases
    const N = { SOMME:'SUM', MOYENNE:'AVERAGE', NB:'COUNT', NBVAL:'COUNTA',
      'NB_SI':'COUNTIF', 'SOMME_SI':'SUMIF', 'MOYENNE_SI':'AVERAGEIF',
      'NB_SI_ENS':'COUNTIFS', SI:'IF', SIERREUR:'IFERROR', ESTVIDE:'ISBLANK',
      ESTNOMBRE:'ISNUMBER', ESTTEXTE:'ISTEXT', ARRONDI:'ROUND', RACINE:'SQRT',
      ENT:'INT', NBCAR:'LEN', MAJUSCULE:'UPPER', MINUSCULE:'LOWER', SUPPRESPACE:'TRIM',
      GAUCHE:'LEFT', DROITE:'RIGHT', STXT:'MID', CONCATENER:'CONCAT',
      ANNEE:'YEAR', MOIS:'MONTH', JOUR:'DAY', MAINTENANT:'NOW', RECHERCHEV:'VLOOKUP',
      'GRANDE_VALEUR':'LARGE', 'PETITE_VALEUR':'SMALL', RANG:'RANK', NON:'NOT', ET:'AND', OU:'OR',
      TEXTE:'TEXT', MOD:'MOD' }
    const n = N[name] || name

    switch (n) {
      case 'SUM':       return args.reduce((a, v2) => a + allNums([v2]).reduce((s, n2) => s + n2, 0), 0)
      case 'AVERAGE': { const all = args.flatMap(a2 => nums(a2)); return all.length ? all.reduce((a,b)=>a+b,0)/all.length : '#DIV/0!' }
      case 'COUNT':     return args.flatMap(a2 => nums(a2)).length
      case 'COUNTA':    return args.flatMap(a2 => v(a2)).filter(x => x !== '' && x != null).length
      case 'MAX':       return Math.max(...args.flatMap(a2 => nums(a2)))
      case 'MIN':       return Math.min(...args.flatMap(a2 => nums(a2)))
      case 'ROUND': { const n2=Number(this._parse(args[0]?.trim())),d=args[1]?Number(this._parse(args[1].trim())):0; return Math.round(n2*10**d)/10**d }
      case 'ABS':    return Math.abs(Number(this._parse(args[0]?.trim())))
      case 'SQRT':   return Math.sqrt(Number(this._parse(args[0]?.trim())))
      case 'INT':    return Math.floor(Number(this._parse(args[0]?.trim())))
      case 'MOD':    return Number(this._parse(args[0]?.trim())) % Number(this._parse(args[1]?.trim()))
      case 'LEN':    return String(this._parse(args[0]?.trim())).length
      case 'UPPER':  return String(this._parse(args[0]?.trim())).toUpperCase()
      case 'LOWER':  return String(this._parse(args[0]?.trim())).toLowerCase()
      case 'TRIM':   return String(this._parse(args[0]?.trim())).trim()
      case 'LEFT':   return String(this._parse(args[0]?.trim())).slice(0, Number(this._parse(args[1]?.trim())||1))
      case 'RIGHT': { const s=String(this._parse(args[0]?.trim())),n2=Number(this._parse(args[1]?.trim())||1); return s.slice(Math.max(0,s.length-n2)) }
      case 'MID': { const s=String(this._parse(args[0]?.trim())); return s.substr(Number(this._parse(args[1]?.trim()))-1, Number(this._parse(args[2]?.trim()))) }
      case 'CONCAT': case 'CONCATENATE': return args.map(a2=>String(this._parse(a2.trim()))).join('')
      case 'TEXT': return String(this._parse(args[0]?.trim()))
      case 'IF': { const cond=this._parse(args[0]?.trim()); return cond?this._parse(args[1]?.trim()??''):this._parse(args[2]?.trim()??'') }
      case 'IFS': { for(let i=0;i<args.length-1;i+=2){if(this._parse(args[i].trim()))return this._parse(args[i+1].trim())} return '#N/A' }
      case 'IFERROR': { try{const v2=this._parse(args[0]?.trim());return String(v2).startsWith('#')?this._parse(args[1]?.trim()??''):v2}catch{return this._parse(args[1]?.trim()??'')} }
      case 'ISBLANK':  return this._parse(args[0]?.trim())===''||this._parse(args[0]?.trim())==null
      case 'ISNUMBER': return typeof this._parse(args[0]?.trim())==='number'
      case 'ISTEXT':   return typeof this._parse(args[0]?.trim())==='string'
      case 'NOT': return !this._parse(args[0]?.trim())
      case 'AND': return args.every(a2=>!!this._parse(a2.trim()))
      case 'OR':  return args.some(a2=>!!this._parse(a2.trim()))
      case 'TODAY': case 'AUJOURDHUI': return new Date().toLocaleDateString('fr-FR')
      case 'NOW': return new Date().toLocaleString('fr-FR')
      case 'YEAR': return new Date(String(this._parse(args[0]?.trim()))).getFullYear()
      case 'MONTH': return new Date(String(this._parse(args[0]?.trim()))).getMonth()+1
      case 'DAY': return new Date(String(this._parse(args[0]?.trim()))).getDate()
      case 'COUNTIF': { const rv=v(args[0]?.trim()),crit=args[1]?.trim(); return rv.filter(x=>this._crit(x,crit)).length }
      case 'SUMIF': { const rv=v(args[0]?.trim()),crit=args[1]?.trim(),sv=args[2]?v(args[2].trim()):rv; return rv.reduce((a,x,i)=>this._crit(x,crit)?a+Number(sv[i]??0):a,0) }
      case 'AVERAGEIF': { const rv=v(args[0]?.trim()),crit=args[1]?.trim(),av=args[2]?v(args[2].trim()):rv; const m=rv.map((x,i)=>this._crit(x,crit)?Number(av[i]??0):null).filter(x=>x!==null); return m.length?m.reduce((a,b)=>a+b,0)/m.length:'#DIV/0!' }
      case 'COUNTIFS': { if(args.length<2)return 0; const ranges=[],criteria=[]; for(let i=0;i<args.length;i+=2){ranges.push(v(args[i]?.trim()));criteria.push(args[i+1]?.trim())} const len=ranges[0]?.length||0; let cnt=0; for(let i=0;i<len;i++){if(ranges.every((r,ri)=>this._crit(r[i],criteria[ri])))cnt++} return cnt }
      case 'VLOOKUP': { const lv=this._parse(args[0]?.trim()),tr=parseRange(args[1]?.trim()),ci=Number(this._parse(args[2]?.trim()))-1; if(!tr)return '#REF!'; for(let r=tr.r1;r<=tr.r2;r++){if(String(this.evaluate(r,tr.c1)).toUpperCase()===String(lv).toUpperCase())return this.evaluate(r,tr.c1+ci)} return '#N/A' }
      case 'LARGE': { const s=[...args.slice(0,-1).flatMap(a2=>{const p=parseRange(a2.trim());return p?this.getRangeValues(a2.trim()):[this._parse(a2.trim())]}).filter(x=>typeof x==='number')].sort((a,b)=>b-a); return s[Number(this._parse(args[args.length-1].trim()))-1]??'#N/A' }
      case 'SMALL': { const s=[...args.slice(0,-1).flatMap(a2=>{const p=parseRange(a2.trim());return p?this.getRangeValues(a2.trim()):[this._parse(a2.trim())]}).filter(x=>typeof x==='number')].sort((a,b)=>a-b); return s[Number(this._parse(args[args.length-1].trim()))-1]??'#N/A' }
      case 'RANK': { const val=Number(this._parse(args[0]?.trim())),arr=this.getRangeValues(args[1]?.trim()).filter(x=>typeof x==='number'),ord=args[2]?Number(this._parse(args[2].trim())):0; const sorted=ord===0?[...arr].sort((a,b)=>b-a):[...arr].sort((a,b)=>a-b); return sorted.indexOf(val)+1 }
      default: throw new Error(`Unknown fn: ${name}`)
    }
  }

  _crit(value, criterion) {
    if (!criterion) return false
    const c = String(criterion).trim().replace(/^"|"$/g, '')
    if (c.startsWith('>=')) return Number(value) >= Number(c.slice(2))
    if (c.startsWith('<=')) return Number(value) <= Number(c.slice(2))
    if (c.startsWith('<>')) return String(value) !== c.slice(2)
    if (c.startsWith('>'))  return Number(value) > Number(c.slice(1))
    if (c.startsWith('<'))  return Number(value) < Number(c.slice(1))
    if (c.includes('*')) { const re = new RegExp('^'+c.replace(/\*/g,'.*').replace(/\?/g,'.')+'$','i'); return re.test(String(value)) }
    return String(value).toUpperCase() === c.toUpperCase()
  }

  _splitArgs(str) {
    const a=[]; let d=0,cur='',inS=false
    for(const ch of str){
      if(ch==='"')inS=!inS
      else if(!inS&&ch==='(')d++
      else if(!inS&&ch===')')d--
      else if(!inS&&ch===','&&d===0){a.push(cur);cur='';continue}
      cur+=ch
    }
    if(cur.trim()!==''||a.length>0)a.push(cur)
    return a
  }

  _splitByOp(expr,op){const a=[];let d=0,cur='',inS=false;for(let i=0;i<expr.length;i++){const ch=expr[i];if(ch==='"')inS=!inS;if(!inS&&ch==='(')d++;else if(!inS&&ch===')')d--;else if(!inS&&d===0&&expr.slice(i,i+op.length)===op){a.push(cur);cur='';i+=op.length-1;continue}cur+=ch}a.push(cur);return a}
  _findOp(expr,op){let d=0,inS=false;for(let i=0;i<expr.length;i++){const ch=expr[i];if(ch==='"')inS=!inS;if(inS)continue;if(ch==='(')d++;else if(ch===')')d--;else if(d===0&&expr.slice(i,i+op.length)===op)return i}return -1}
  _findLastAddSub(expr){let d=0,inS=false,last=-1;for(let i=0;i<expr.length;i++){const ch=expr[i];if(ch==='"')inS=!inS;if(inS)continue;if(ch==='(')d++;else if(ch===')')d--;else if(d===0&&(ch==='+'||(ch==='-'&&i>0&&!/[(*+\-\/^,]/.test(expr[i-1]))))last=i}return last}
  _findLastMulDiv(expr){let d=0,inS=false,last=-1;for(let i=0;i<expr.length;i++){const ch=expr[i];if(ch==='"')inS=!inS;if(inS)continue;if(ch==='(')d++;else if(ch===')')d--;else if(d===0&&(ch==='*'||ch==='/'))last=i}return last}
  _closeParen(str,open){let d=0;for(let i=open;i<str.length;i++){if(str[i]==='(')d++;else if(str[i]===')'){{d--;if(d===0)return i}}}return -1}
  _inStr(expr,idx){let inS=false;for(let i=0;i<idx;i++){if(expr[i]==='"')inS=!inS}return inS}
  _inPar(expr,idx){let d=0,inS=false;for(let i=0;i<idx;i++){if(expr[i]==='"')inS=!inS;if(inS)continue;if(expr[i]==='(')d++;else if(expr[i]===')')d--}return d>0}
}

// ─────────────────────────────────────────────────────────────────
// ═══════════════  GRID STATE REDUCER  ════════════════════════════
// ─────────────────────────────────────────────────────────────────
const MAX_UNDO=50, INIT_ROWS=300, INIT_COLS=26, ROW_H=26, HDR_H=32, COL_NUM_W=46, DEF_COL=110, MIN_COL=40, MAX_COL=400, OVERSCAN=4

const DARK = {
  bg:'#080b12', surface:'#0d1117', border:'rgba(255,255,255,0.07)', headerBg:'#0f1520',
  headerText:'#4a5568', cellBg:'#080b12', cellText:'#c9d1d9',
  selectBg:'rgba(52,211,153,0.12)', selectBorder:'rgba(52,211,153,0.55)', activeCell:'rgba(52,211,153,0.18)',
  accent:'#34d399', accentDim:'rgba(52,211,153,0.35)',
  numColor:'#79c0ff', errColor:'#ff7b72', boolColor:'#d2a8ff', formulaColor:'#ffd700',
}

function gridReducer(state, action) {
  switch (action.type) {
    case 'SET_CELL': {
      const {r,c,value}=action
      const nd=state.data.map((row,ri)=>ri===r?row.map((cell,ci)=>ci===c?value:cell):row)
      while(nd.length<=r)nd.push(Array(state.colWidths.length).fill(''))
      nd[r]=nd[r].map((cell,ci)=>ci===c?value:cell)
      return pushU({...state,data:nd})
    }
    case 'SET_CELLS': {
      let nd=state.data.map(row=>[...row])
      const mR=Math.max(...action.cells.map(x=>x.r)),mC=Math.max(...action.cells.map(x=>x.c))
      while(nd.length<=mR)nd.push(Array(Math.max(state.colWidths.length,mC+1)).fill(''))
      for(const {r,c,value}of action.cells){while(nd[r].length<=c)nd[r].push('');nd[r][c]=value}
      return pushU({...state,data:nd})
    }
    case 'INSERT_ROW': { const nr=Array(state.colWidths.length).fill(''); const nd=[...state.data.slice(0,action.r+1),nr,...state.data.slice(action.r+1)]; return pushU({...state,data:nd}) }
    case 'DELETE_ROW': { if(state.data.length<=1)return state; return pushU({...state,data:state.data.filter((_,i)=>i!==action.r)}) }
    case 'CLEAR_ROW': return pushU({...state,data:state.data.map((row,ri)=>ri===action.r?row.map(()=>''):row)})
    case 'SET_COL_WIDTH': { const nw=[...state.colWidths]; nw[action.c]=Math.max(MIN_COL,Math.min(MAX_COL,action.width)); return {...state,colWidths:nw} }
    case 'UNDO': { if(!state.undoStack.length)return state; const p=state.undoStack[state.undoStack.length-1]; return{...state,data:p.data,colWidths:p.colWidths,undoStack:state.undoStack.slice(0,-1),redoStack:[{data:state.data,colWidths:state.colWidths},...state.redoStack].slice(0,MAX_UNDO)} }
    case 'REDO': { if(!state.redoStack.length)return state; const nx=state.redoStack[0]; return{...state,data:nx.data,colWidths:nx.colWidths,undoStack:[...state.undoStack,{data:state.data,colWidths:state.colWidths}].slice(-MAX_UNDO),redoStack:state.redoStack.slice(1)} }
    case 'LOAD': {
      const {headers,grid}=action
      const nc=Math.max(headers.length,INIT_COLS)
      const cw=Array(nc).fill(DEF_COL)
      headers.forEach((h,i)=>{cw[i]=Math.max(DEF_COL,Math.min(MAX_COL,h.length*9+24))})
      // Row 0 = headers, rows 1+ = data
      const headerRow=Array.from({length:nc},(_,i)=>i<headers.length?headers[i]:'')
      const dataRows=grid.map(row=>Array.from({length:nc},(_,i)=>i<row.length?autoType(row[i]):''))
      const rows=[headerRow,...dataRows]
      while(rows.length<INIT_ROWS)rows.push(Array(nc).fill(''))
      return{data:rows,colWidths:cw,undoStack:[],redoStack:[]}
    }
    case 'INJECT_FORMULAS': {
      // Inject Claude formulas starting at a specific block below data
      const {formulaRows}=action // [{label, formula}]
      const nd=state.data.map(r=>[...r])
      // Find first empty row after data
      let startRow=action.startRow||0
      for(const {label,formula}of formulaRows){
        while(nd.length<=startRow)nd.push(Array(state.colWidths.length).fill(''))
        nd[startRow][0]=label
        nd[startRow][1]=formula
        startRow++
      }
      return pushU({...state,data:nd})
    }
    default: return state
  }
}
function pushU(s){return{...s,undoStack:[...s.undoStack,{data:s.data,colWidths:s.colWidths}].slice(-MAX_UNDO),redoStack:[]}}
function initGrid(){return{data:Array.from({length:INIT_ROWS},()=>Array(INIT_COLS).fill('')),colWidths:Array(INIT_COLS).fill(DEF_COL),undoStack:[],redoStack:[]}}

const cellAddr=(r,c)=>`${colLetter(c)}${r+1}`

// ─────────────────────────────────────────────────────────────────
// ═══════════════  EXCEL CANVAS  ══════════════════════════════════
// ─────────────────────────────────────────────────────────────────
function ExcelCanvas({ gridState, dispatch, fileName = 'Classeur', dataRowCount = 0 }) {
  const [active, setActive]       = useState({ r: 0, c: 0 })
  const [selStart, setSelStart]   = useState(null)
  const [selEnd, setSelEnd]       = useState(null)
  const [isSelecting, setIsSel]   = useState(false)
  const [editCell, setEditCell]   = useState(null)
  const [editValue, setEditValue] = useState('')
  const [fbarValue, setFbarValue] = useState('')
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewW, setViewW]         = useState(900)
  const [viewH, setViewH]         = useState(560)
  const [ctxMenu, setCtxMenu]     = useState(null)
  const [findOpen, setFindOpen]   = useState(false)
  const [findVal, setFindVal]     = useState('')
  const [replaceVal, setReplaceVal] = useState('')
  const [findResults, setFindResults] = useState([])
  const containerRef = useRef(null)
  const resizeDrag   = useRef(null)
  const clipboard    = useRef(null)

  const engine = useMemo(()=>new FormulaEngine((r,c)=>gridState.data[r]?.[c]??''), [gridState.data])

  const colOffsets = useMemo(()=>{const o=[0];for(let i=0;i<gridState.colWidths.length;i++)o.push(o[i]+gridState.colWidths[i]);return o},[gridState.colWidths])
  const totalW=colOffsets[colOffsets.length-1], totalH=gridState.data.length*ROW_H

  useEffect(()=>{if(!containerRef.current)return;const ro=new ResizeObserver(entries=>{for(const e of entries){setViewW(e.contentRect.width);setViewH(e.contentRect.height)}});ro.observe(containerRef.current);return()=>ro.disconnect()},[])

  const visRows=useMemo(()=>{const s=Math.max(0,Math.floor(scrollTop/ROW_H)-OVERSCAN);const c=Math.ceil((viewH-HDR_H)/ROW_H)+OVERSCAN*2;return{start:s,end:Math.min(gridState.data.length-1,s+c)}},[scrollTop,viewH,gridState.data.length])
  const visCols=useMemo(()=>{let s=0;while(s<gridState.colWidths.length&&colOffsets[s+1]<scrollLeft-50)s++;let e=s;while(e<gridState.colWidths.length&&colOffsets[e]<scrollLeft+viewW+50)e++;return{start:Math.max(0,s-1),end:Math.min(gridState.colWidths.length-1,e+1)}},[scrollLeft,viewW,colOffsets,gridState.colWidths.length])

  const selRect=useMemo(()=>{if(!selStart||!selEnd)return null;return{r1:Math.min(selStart.r,selEnd.r),c1:Math.min(selStart.c,selEnd.c),r2:Math.max(selStart.r,selEnd.r),c2:Math.max(selStart.c,selEnd.c)}},[selStart,selEnd])
  const inSel=(r,c)=>{if(!selRect)return false;return r>=selRect.r1&&r<=selRect.r2&&c>=selRect.c1&&c<=selRect.c2}

  const getCellDisplay=useCallback((r,c)=>{engine.clearCache();const val=engine.evaluate(r,c);if(val===''||val==null)return '';if(typeof val==='boolean')return val?'TRUE':'FALSE';if(typeof val==='number'){if(isNaN(val))return '#NUM!';if(!isFinite(val))return '#DIV/0!';if(Number.isInteger(val))return val.toLocaleString('fr-FR');return parseFloat(val.toFixed(6)).toLocaleString('fr-FR')}return String(val)},[engine])

  const getCellColor=(val,raw)=>{
    if(typeof raw==='string'&&raw.startsWith('='))return DARK.formulaColor
    if(typeof val==='number'&&!isNaN(val))return DARK.numColor
    if(typeof val==='boolean')return DARK.boolColor
    if(typeof val==='string'&&val.startsWith('#'))return DARK.errColor
    return DARK.cellText
  }

  // Is this row a formula-injection row (below data)?
  const isFormulaRow = (r) => r > dataRowCount // row 0=headers, rows 1..dataRowCount=data

  const scrollToCell=useCallback((r,c)=>{
    const el=containerRef.current; if(!el)return
    const cellTop=r*ROW_H, cellLeft=colOffsets[c], cellW=gridState.colWidths[c]||DEF_COL
    const nT=scrollTop>cellTop?cellTop:scrollTop+viewH-HDR_H-ROW_H<cellTop?cellTop-viewH+HDR_H+ROW_H+4:scrollTop
    const nL=scrollLeft>cellLeft?cellLeft:scrollLeft+viewW-COL_NUM_W-cellW<cellLeft?cellLeft-viewW+COL_NUM_W+cellW+4:scrollLeft
    setScrollTop(nT); setScrollLeft(nL); el.scrollTop=nT; el.scrollLeft=nL
  },[scrollTop,scrollLeft,viewH,viewW,colOffsets,gridState.colWidths])

  useEffect(()=>{
    const el=containerRef.current; if(!el)return
    const onKey=(e)=>{
      if((e.ctrlKey||e.metaKey)&&e.key==='f'){e.preventDefault();setFindOpen(f=>!f);return}
      if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();dispatch({type:'UNDO'});return}
      if((e.ctrlKey||e.metaKey)&&e.key==='y'){e.preventDefault();dispatch({type:'REDO'});return}
      if((e.ctrlKey||e.metaKey)&&e.key==='c'){e.preventDefault();copySelection();return}
      if((e.ctrlKey||e.metaKey)&&e.key==='v'){e.preventDefault();pasteClip();return}
      if(editCell){
        if(e.key==='Escape'){setEditCell(null);setEditValue('');return}
        if(e.key==='Enter'){commitEdit(editCell.r,editCell.c,editValue);const nr=Math.min(gridState.data.length-1,editCell.r+1);setActive({r:nr,c:editCell.c});setSelStart({r:nr,c:editCell.c});setSelEnd({r:nr,c:editCell.c});scrollToCell(nr,editCell.c);setEditCell(null);return}
        if(e.key==='Tab'){e.preventDefault();commitEdit(editCell.r,editCell.c,editValue);const nc=Math.min(gridState.colWidths.length-1,editCell.c+1);setActive({r:editCell.r,c:nc});setSelStart({r:editCell.r,c:nc});setSelEnd({r:editCell.r,c:nc});scrollToCell(editCell.r,nc);setEditCell(null);return}
        return
      }
      const mv=(dr,dc,ext=false)=>{
        const nr=Math.max(0,Math.min(gridState.data.length-1,active.r+dr))
        const nc=Math.max(0,Math.min(gridState.colWidths.length-1,active.c+dc))
        setActive({r:nr,c:nc});if(ext&&selStart){setSelEnd({r:nr,c:nc})}else{setSelStart({r:nr,c:nc});setSelEnd({r:nr,c:nc})}
        scrollToCell(nr,nc)
      }
      const sh=e.shiftKey
      switch(e.key){
        case'ArrowUp':e.preventDefault();mv(-1,0,sh);break
        case'ArrowDown':e.preventDefault();mv(1,0,sh);break
        case'ArrowLeft':e.preventDefault();mv(0,-1,sh);break
        case'ArrowRight':e.preventDefault();mv(0,1,sh);break
        case'Tab':e.preventDefault();mv(0,sh?-1:1);break
        case'Enter':e.preventDefault();mv(1,0);break
        case'Home':e.preventDefault();mv(0,-active.c);break
        case'End':e.preventDefault();mv(0,gridState.colWidths.length-1-active.c);break
        case'Delete':case'Backspace':{
          if(selRect){const cells=[];for(let r=selRect.r1;r<=selRect.r2;r++)for(let c=selRect.c1;c<=selRect.c2;c++)cells.push({r,c,value:''});dispatch({type:'SET_CELLS',cells})}
          else dispatch({type:'SET_CELL',r:active.r,c:active.c,value:''})
          break
        }
        case'F2':{const raw=gridState.data[active.r]?.[active.c]??'';setEditCell({r:active.r,c:active.c});setEditValue(String(raw));break}
        default:if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){setEditCell({r:active.r,c:active.c});setEditValue(e.key)}
      }
    }
    el.addEventListener('keydown',onKey); return()=>el.removeEventListener('keydown',onKey)
  },[active,editCell,editValue,gridState,selRect,selStart,scrollToCell,viewH,dispatch])

  const commitEdit=useCallback((r,c,value)=>{
    const typed=typeof value==='string'&&value.startsWith('=')?value:autoType(value)
    dispatch({type:'SET_CELL',r,c,value:typed});engine.clearCache()
  },[engine,dispatch])

  const copySelection=()=>{
    const rect=selRect||{r1:active.r,c1:active.c,r2:active.r,c2:active.c}
    const cells=[];for(let r=rect.r1;r<=rect.r2;r++)for(let c=rect.c1;c<=rect.c2;c++)cells.push({r:r-rect.r1,c:c-rect.c1,v:gridState.data[r]?.[c]??''})
    clipboard.current={cells,w:rect.c2-rect.c1+1,h:rect.r2-rect.r1+1}
    const rows=[];for(let r=rect.r1;r<=rect.r2;r++){const row=[];for(let c=rect.c1;c<=rect.c2;c++)row.push(getCellDisplay(r,c));rows.push(row.join('\t'))}
    navigator.clipboard.writeText(rows.join('\n')).catch(()=>{})
  }

  const pasteClip=()=>{
    navigator.clipboard.readText().then(text=>{
      const rows=text.split('\n').filter(r=>r.length>0)
      const cells=[];rows.forEach((row,ri)=>{const cols=row.split('\t');cols.forEach((val,ci)=>{cells.push({r:active.r+ri,c:active.c+ci,value:autoType(val)})})})
      if(cells.length>0)dispatch({type:'SET_CELLS',cells})
    }).catch(()=>{if(!clipboard.current)return;const cells=clipboard.current.cells.map(({r,c,v})=>({r:active.r+r,c:active.c+c,value:v}));dispatch({type:'SET_CELLS',cells})})
  }

  const startResize=(e,c)=>{
    e.preventDefault();e.stopPropagation()
    resizeDrag.current={c,startX:e.clientX,startW:gridState.colWidths[c]}
    const onMove=(me)=>dispatch({type:'SET_COL_WIDTH',c,width:resizeDrag.current.startW+(me.clientX-resizeDrag.current.startX)})
    const onUp=()=>{resizeDrag.current=null;window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp)
  }

  const runFind=()=>{
    if(!findVal){setFindResults([]);return}
    const res=[];gridState.data.forEach((row,r)=>{row.forEach((cell,c)=>{if(String(cell).toLowerCase().includes(findVal.toLowerCase()))res.push({r,c})})})
    setFindResults(res);if(res[0]){setActive(res[0]);scrollToCell(res[0].r,res[0].c)}
  }
  const runReplace=()=>{
    const cells=findResults.map(({r,c})=>({r,c,value:String(gridState.data[r]?.[c]??'').replace(new RegExp(findVal,'gi'),replaceVal)}))
    if(cells.length>0)dispatch({type:'SET_CELLS',cells});runFind()
  }

  const exportXLSX=async()=>{
    const XLSX=await import('xlsx');const wb=XLSX.utils.book_new()
    let lastRow=gridState.data.length-1;while(lastRow>0&&gridState.data[lastRow].every(c=>c===''))lastRow--
    const rows=gridState.data.slice(0,lastRow+1).map(row=>row.map(cell=>cell===''?null:cell))
    const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=gridState.colWidths.map(w=>({wch:Math.round(w/7)}))
    XLSX.utils.book_append_sheet(wb,ws,'Données');XLSX.writeFile(wb,`${fileName.replace(/\.[^.]+$/,'')}_canvas.xlsx`)
  }

  useEffect(()=>{const raw=gridState.data[active.r]?.[active.c]??'';setFbarValue(String(raw))},[active,gridState.data])
  useEffect(()=>{if(!ctxMenu)return;const cl=()=>setCtxMenu(null);window.addEventListener('click',cl);return()=>window.removeEventListener('click',cl)},[ctxMenu])

  const numRows=gridState.data.length, numCols=gridState.colWidths.length

  // Status bar calculation
  const statusStats=useMemo(()=>{
    if(!selRect)return null
    const vals=[];for(let r=selRect.r1;r<=selRect.r2;r++)for(let c=selRect.c1;c<=selRect.c2;c++){const v=engine.evaluate(r,c);if(typeof v==='number')vals.push(v)}
    if(!vals.length)return null
    const sum=vals.reduce((a,b)=>a+b,0)
    return{sum,avg:sum/vals.length,count:vals.length}
  },[selRect,engine])

  return (
    <div style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',background:DARK.bg,fontFamily:"'IBM Plex Mono','Fira Code',monospace"}}>

      {/* Toolbar */}
      <div style={{background:DARK.headerBg,borderBottom:`1px solid ${DARK.border}`,display:'flex',alignItems:'center',gap:6,padding:'5px 10px',flexShrink:0,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,paddingRight:8,borderRight:`1px solid ${DARK.border}`}}>
          <FileSpreadsheet size={12} style={{color:DARK.accent}}/>
          <span style={{fontSize:11,color:DARK.accent,fontWeight:700,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fileName}</span>
        </div>
        <div style={{width:60,fontSize:10,color:DARK.headerText,background:DARK.surface,border:`1px solid ${DARK.border}`,borderRadius:4,padding:'2px 6px',fontWeight:700,textAlign:'center'}}>{cellAddr(active.r,active.c)}</div>
        <input value={editCell?editValue:fbarValue}
          onChange={e=>{if(editCell)setEditValue(e.target.value);else{setFbarValue(e.target.value);setEditCell({r:active.r,c:active.c});setEditValue(e.target.value)}}}
          onKeyDown={e=>{if(e.key==='Enter'){commitEdit(active.r,active.c,editCell?editValue:fbarValue);setEditCell(null);containerRef.current?.focus()}if(e.key==='Escape'){setEditCell(null);setEditValue('');containerRef.current?.focus()}}}
          placeholder="Valeur ou =formule()"
          style={{flex:1,minWidth:120,maxWidth:440,fontSize:11,background:DARK.surface,color:editCell&&editValue.startsWith('=')?DARK.formulaColor:DARK.cellText,border:`1px solid ${DARK.border}`,borderRadius:4,padding:'2px 8px',outline:'none',fontFamily:'inherit'}}
          onFocus={()=>{if(!editCell){setEditCell({r:active.r,c:active.c});setEditValue(fbarValue)}}}
        />
        <div style={{flex:1}}/>
        {[
          {icon:<RotateCcw size={12}/>,action:()=>dispatch({type:'UNDO'}),dis:!gridState.undoStack.length,title:'Annuler Ctrl+Z'},
          {icon:<RotateCw size={12}/>, action:()=>dispatch({type:'REDO'}),dis:!gridState.redoStack.length,title:'Rétablir Ctrl+Y'},
          {icon:<Search size={12}/>,   action:()=>setFindOpen(f=>!f),     dis:false,                      title:'Rechercher Ctrl+F'},
          {icon:<Copy size={12}/>,     action:copySelection,               dis:false,                      title:'Copier Ctrl+C'},
        ].map(({icon,action,dis,title},i)=>(
          <button key={i} onClick={action} disabled={dis} title={title}
            style={{color:dis?DARK.border:findOpen&&title.includes('Cherch')?DARK.accent:DARK.headerText,padding:4,borderRadius:4,cursor:dis?'default':'pointer',background:'transparent',border:'none'}}>
            {icon}
          </button>
        ))}
        <button onClick={exportXLSX}
          style={{display:'flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,background:DARK.accentDim,color:DARK.accent,border:`1px solid ${DARK.accentDim}`,borderRadius:5,padding:'3px 8px',cursor:'pointer'}}>
          <Download size={11}/> Export .xlsx
        </button>
      </div>

      {/* Find & Replace */}
      {findOpen&&(
        <div style={{background:DARK.surface,borderBottom:`1px solid ${DARK.border}`,padding:'7px 12px',display:'flex',alignItems:'center',gap:8,flexShrink:0,flexWrap:'wrap'}}>
          <Search size={11} style={{color:DARK.accent}}/>
          {[{v:findVal,setV:setFindVal,ph:'Rechercher…',w:150},{v:replaceVal,setV:setReplaceVal,ph:'Remplacer par…',w:150}].map(({v,setV,ph,w},i)=>(
            <input key={i} value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>i===0&&e.key==='Enter'&&runFind()} placeholder={ph}
              style={{width:w,fontSize:11,background:DARK.bg,color:DARK.cellText,border:`1px solid ${DARK.border}`,borderRadius:4,padding:'2px 6px',outline:'none',fontFamily:'inherit'}}/>
          ))}
          {[{label:'Trouver',action:runFind,dim:false},{label:'Remplacer tout',action:runReplace,dim:true}].map(({label,action,dim})=>(
            <button key={label} onClick={action} style={{fontSize:10,fontWeight:700,background:dim?DARK.accentDim:DARK.surface,color:dim?DARK.accent:DARK.headerText,border:`1px solid ${dim?DARK.accentDim:DARK.border}`,borderRadius:4,padding:'2px 8px',cursor:'pointer'}}>{label}</button>
          ))}
          {findResults.length>0&&<span style={{fontSize:10,color:DARK.headerText}}>{findResults.length} résultat{findResults.length>1?'s':''}</span>}
          <button onClick={()=>setFindOpen(false)} style={{marginLeft:'auto',color:DARK.headerText,cursor:'pointer',background:'transparent',border:'none'}}><X size={12}/></button>
        </div>
      )}

      {/* Grid */}
      <div ref={containerRef} tabIndex={0}
        onScroll={e=>{setScrollTop(e.target.scrollTop);setScrollLeft(e.target.scrollLeft)}}
        style={{flex:1,overflow:'auto',position:'relative',outline:'none',cursor:'default',background:DARK.cellBg}}>

        <div style={{width:totalW+COL_NUM_W,height:totalH+HDR_H,position:'relative'}}>

          {/* Column headers */}
          <div style={{position:'sticky',top:0,zIndex:20,display:'flex',height:HDR_H,background:DARK.headerBg,borderBottom:`2px solid ${DARK.accentDim}`}}>
            <div style={{width:COL_NUM_W,flexShrink:0,borderRight:`1px solid ${DARK.border}`,display:'flex',alignItems:'center',justifyContent:'center',position:'sticky',left:0,zIndex:30,background:DARK.headerBg}}>
              <Layers size={11} style={{color:DARK.headerText,opacity:0.5}}/>
            </div>
            {Array.from({length:visCols.end-visCols.start+1},(_,i)=>{
              const c=visCols.start+i
              const isA=selRect?(c>=selRect.c1&&c<=selRect.c2):c===active.c
              return(
                <div key={c} style={{position:'absolute',left:COL_NUM_W+colOffsets[c]-scrollLeft,width:gridState.colWidths[c],height:HDR_H,background:isA?'rgba(52,211,153,0.08)':DARK.headerBg,borderRight:`1px solid ${DARK.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:isA?DARK.accent:DARK.headerText,userSelect:'none'}}>
                  <span style={{pointerEvents:'none'}}>{colLetter(c)}</span>
                  <div onMouseDown={e=>startResize(e,c)} style={{position:'absolute',right:0,top:0,width:4,height:'100%',cursor:'col-resize',zIndex:5}}/>
                </div>
              )
            })}
          </div>

          {/* Row numbers */}
          <div style={{position:'absolute',left:0,top:HDR_H,zIndex:10,width:COL_NUM_W}}>
            {Array.from({length:visRows.end-visRows.start+1},(_,i)=>{
              const r=visRows.start+i
              const isA=selRect?(r>=selRect.r1&&r<=selRect.r2):r===active.r
              const isFRow=isFormulaRow(r)
              return(
                <div key={r} style={{position:'absolute',top:r*ROW_H,width:COL_NUM_W,height:ROW_H,background:isA?'rgba(52,211,153,0.06)':isFRow?'rgba(255,215,0,0.03)':DARK.headerBg,borderRight:`1px solid ${DARK.border}`,borderBottom:`1px solid ${DARK.border}`,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:8,fontSize:10,color:isFRow?DARK.formulaColor:isA?DARK.accent:DARK.headerText,userSelect:'none',cursor:'pointer'}}
                  onClick={()=>{setSelStart({r,c:0});setSelEnd({r,c:numCols-1});setActive({r,c:0})}}
                  onContextMenu={e=>{e.preventDefault();setCtxMenu({x:e.clientX,y:e.clientY,r,c:0})}}>
                  {isFRow?'ƒ':(r+1)}
                </div>
              )
            })}
          </div>

          {/* Cells */}
          <div style={{position:'absolute',left:COL_NUM_W,top:HDR_H}}>
            {Array.from({length:visRows.end-visRows.start+1},(_,ri)=>{
              const r=visRows.start+ri
              const rowData=gridState.data[r]||[]
              const isFRow=isFormulaRow(r)
              return Array.from({length:visCols.end-visCols.start+1},(_,ci)=>{
                const c=visCols.start+ci
                const isAct=r===active.r&&c===active.c
                const isSel=inSel(r,c)
                const isEdt=editCell?.r===r&&editCell?.c===c
                const raw=rowData[c]??''
                const display=isEdt?editValue:getCellDisplay(r,c)
                const evalVal=!isEdt?engine.evaluate(r,c):raw
                const isFormula=typeof raw==='string'&&raw.startsWith('=')

                return(
                  <div key={`${r}-${c}`}
                    onMouseDown={e=>{if(e.button!==0)return;setActive({r,c});setSelStart({r,c});setSelEnd({r,c});setIsSel(true);if(!isEdt){setEditCell(null);containerRef.current?.focus()}}}
                    onMouseEnter={e=>{if(isSelecting&&(e.buttons&1))setSelEnd({r,c})}}
                    onMouseUp={()=>setIsSel(false)}
                    onDoubleClick={()=>{const rw=gridState.data[r]?.[c]??'';setEditCell({r,c});setEditValue(String(rw))}}
                    onContextMenu={e=>{e.preventDefault();setCtxMenu({x:e.clientX,y:e.clientY,r,c})}}
                    style={{position:'absolute',left:colOffsets[c]-scrollLeft,top:r*ROW_H,width:gridState.colWidths[c],height:ROW_H,
                      background:isAct?DARK.activeCell:isSel?DARK.selectBg:isFRow?'rgba(255,215,0,0.025)':'transparent',
                      borderRight:`1px solid ${DARK.border}`,borderBottom:`1px solid ${DARK.border}`,
                      outline:isAct?`2px solid ${DARK.selectBorder}`:'none',outlineOffset:-1,
                      display:'flex',alignItems:'center',padding:'0 4px',overflow:'hidden',cursor:'default',boxSizing:'border-box',zIndex:isAct?2:1}}>
                    {isEdt?(
                      <input autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)}
                        onBlur={()=>{commitEdit(r,c,editValue);setEditCell(null)}}
                        onKeyDown={e=>{
                          if(e.key==='Enter'){commitEdit(r,c,editValue);const nr=Math.min(numRows-1,r+1);setActive({r:nr,c});setSelStart({r:nr,c});setSelEnd({r:nr,c});scrollToCell(nr,c);setEditCell(null);containerRef.current?.focus()}
                          if(e.key==='Escape'){setEditCell(null);setEditValue('');containerRef.current?.focus()}
                          if(e.key==='Tab'){e.preventDefault();commitEdit(r,c,editValue);const nc=Math.min(numCols-1,c+1);setActive({r,c:nc});setSelStart({r,c:nc});setSelEnd({r,c:nc});scrollToCell(r,nc);setEditCell(null);containerRef.current?.focus()}
                        }}
                        style={{width:'100%',height:'100%',background:'transparent',color:editValue.startsWith('=')?DARK.formulaColor:DARK.cellText,border:'none',outline:'none',fontSize:11,fontFamily:'inherit',padding:0}}/>
                    ):(
                      <span style={{fontSize:11,color:getCellColor(evalVal,raw),overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',userSelect:'none',width:'100%',textAlign:typeof evalVal==='number'?'right':'left'}}>
                        {display}
                      </span>
                    )}
                  </div>
                )
              })
            })}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu&&(
        <div onClick={e=>e.stopPropagation()} style={{position:'fixed',left:ctxMenu.x,top:ctxMenu.y,zIndex:100,background:DARK.surface,border:`1px solid ${DARK.border}`,borderRadius:8,padding:'4px 0',minWidth:180,boxShadow:'0 8px 32px rgba(0,0,0,0.6)',fontFamily:'inherit'}}>
          {[{icon:Copy,label:'Copier',action:()=>{copySelection();setCtxMenu(null)}},{icon:Plus,label:'Insérer une ligne',action:()=>{dispatch({type:'INSERT_ROW',r:ctxMenu.r});setCtxMenu(null)}},{icon:Trash2,label:'Supprimer la ligne',action:()=>{dispatch({type:'DELETE_ROW',r:ctxMenu.r});setCtxMenu(null)}},{icon:X,label:'Vider la ligne',action:()=>{dispatch({type:'CLEAR_ROW',r:ctxMenu.r});setCtxMenu(null)}}].map(({icon:Icon,label,action})=>(
            <button key={label} onClick={action} style={{display:'flex',alignItems:'center',gap:8,width:'100%',textAlign:'left',padding:'6px 12px',fontSize:11,color:DARK.cellText,background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit'}}
              onMouseEnter={e=>e.currentTarget.style.background=DARK.selectBg} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <Icon size={12} style={{color:DARK.headerText}}/> {label}
            </button>
          ))}
        </div>
      )}

      {/* Status bar */}
      <div style={{background:DARK.headerBg,borderTop:`1px solid ${DARK.border}`,display:'flex',alignItems:'center',gap:14,padding:'3px 12px',fontSize:10,color:DARK.headerText,flexShrink:0,flexWrap:'wrap'}}>
        <span>Cellule : <span style={{color:DARK.accent}}>{cellAddr(active.r,active.c)}</span></span>
        {selRect&&(selRect.r1!==selRect.r2||selRect.c1!==selRect.c2)&&<span>Sélection : {selRect.r2-selRect.r1+1}×{selRect.c2-selRect.c1+1}</span>}
        {statusStats&&<>
          <span>Σ <span style={{color:DARK.numColor}}>{statusStats.sum.toLocaleString('fr-FR')}</span></span>
          <span>Moy <span style={{color:DARK.numColor}}>{statusStats.avg.toLocaleString('fr-FR',{maximumFractionDigits:4})}</span></span>
          <span>N <span style={{color:DARK.numColor}}>{statusStats.count}</span></span>
        </>}
        <div style={{display:'flex',alignItems:'center',gap:4,marginLeft:'auto'}}>
          <span style={{color:DARK.formulaColor,fontSize:9}}>ƒ = ligne formule</span>
          <span style={{color:DARK.headerText}}>·</span>
          <span>{gridState.data.length.toLocaleString('fr-FR')} lignes · {gridState.colWidths.length} col</span>
          <span>· Undo:{gridState.undoStack.length}</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// ═══════════════  COPY HOOK  ══════════════════════════════════════
// ─────────────────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(null)
  const copy = useCallback((text, id) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000) })
  }, [])
  return { copied, copy }
}

// ─────────────────────────────────────────────────────────────────
// ═══════════════  MAIN EXCELAI PAGE  ══════════════════════════════
// ─────────────────────────────────────────────────────────────────
export default function ExcelAI() {
  // ── Core state ──
  const [step, setStep]               = useState('upload')   // upload | plan | results
  const [file, setFile]               = useState(null)
  const [headers, setHeaders]         = useState([])
  const [grid, setGrid]               = useState([])
  const [plan, setPlan]               = useState(null)
  const [loading, setLoading]         = useState(false)
  const [loadingMsg, setLoadingMsg]   = useState('')
  const [streamPct, setStreamPct]     = useState(0)
  const [error, setError]             = useState('')

  // ── View state ──
  const [viewMode, setViewMode]       = useState('analysis')  // analysis | canvas
  const [activeTab, setActiveTab]     = useState('formulas')  // formulas|charts|anomalies|chat
  const [locale, setLocale]           = useState('FR')
  const [showPreview, setShowPreview] = useState(false)
  const [history, setHistory]         = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [lastExport, setLastExport]   = useState(null)
  const [explainer, setExplainer]     = useState(null)

  // ── Canvas state ──
  const [canvasState, canvasDispatch] = useReducer(gridReducer, null, initGrid)
  const [formulasInjected, setFormulasInjected] = useState(false)

  // ── Chat state ──
  const [chatMsgs, setChatMsgs]       = useState([])
  const [chatInput, setChatInput]     = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const fileRef    = useRef(null)
  const { copied, copy } = useCopy()

  // Load history
  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem('excelai-history') || '[]')) } catch {}
  }, [])

  const saveHistory = (fileName, planData) => {
    try {
      const entry = { id: Date.now(), fileName, date: new Date().toISOString(), dataType: planData.dataType, formulaCount: planData.sections?.reduce((a, s) => a + (s.formulas?.length || 0), 0) || 0, plan: planData }
      const updated = [entry, ...history].slice(0, MAX_HISTORY)
      setHistory(updated); localStorage.setItem('excelai-history', JSON.stringify(updated))
    } catch {}
  }

  // ── Parse file ──
  const handleFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f); setError(''); setPlan(null); setLastExport(null); setChatMsgs([]); setFormulasInjected(false)
    setLoading(true); setLoadingMsg('Lecture du fichier…')
    try {
      let rows = [], hdrs = []
      if (f.name.endsWith('.csv')) {
        const text = await f.text()
        const lines = text.trim().split('\n').filter(l => l.trim())
        const parseRow = (line) => {
          const res = []; let cur = '', inQ = false
          for (const ch of line) { if (ch === '"') inQ = !inQ; else if (ch === ',' && !inQ) { res.push(cur.trim()); cur = '' } else cur += ch }
          res.push(cur.trim()); return res.map(v => v.replace(/^"|"$/g, ''))
        }
        hdrs = parseRow(lines[0]); rows = lines.slice(1).map(l => parseRow(l)).filter(r => r.some(v => v))
      } else {
        const XLSX = await import('xlsx'); const buf = await f.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 })
        hdrs = json[0]?.map(String) || []; rows = json.slice(1).map(r => hdrs.map((_, i) => String(r[i] ?? ''))).filter(r => r.some(v => v))
      }
      setHeaders(hdrs); setGrid(rows); setStep('plan')
    } catch (err) { setError('Erreur : ' + err.message) }
    finally { setLoading(false); setLoadingMsg('') }
  }

  // ── Analyse ──
  const handleAnalyse = async () => {
    setLoading(true); setError(''); setStreamPct(0)
    const phases = ['Examen de la structure…','Détection des colonnes…','Génération des formules KPI…','Tableaux graphiques…','Détection des anomalies…','Validation…']
    let pi = 0; setLoadingMsg(phases[0])
    const iv = setInterval(() => { pi = Math.min(pi + 1, phases.length - 1); setLoadingMsg(phases[pi]); setStreamPct(Math.round((pi / phases.length) * 85)) }, 2800)
    try {
      const firstRows = grid.slice(0, 10).map(r => [...r])
      const lastRow   = grid.length > 10 ? [...grid[grid.length - 1]] : []
      const res = await fetch('/api/generer-excelai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'plan', fileName: file.name, headers, totalRows: grid.length, firstRows, lastRow, locale }),
      })
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'complete') {
              setPlan(ev.plan); setActiveTab('formulas'); setStreamPct(100)
              saveHistory(file.name, ev.plan); setStep('results'); setViewMode('analysis')
            }
            if (ev.type === 'error') throw new Error(ev.message)
          } catch (pe) { if (pe.message && !pe.message.includes('JSON')) throw pe }
        }
      }
    } catch (err) { setError(err.message) }
    finally { clearInterval(iv); setLoading(false); setLoadingMsg(''); setStreamPct(0) }
  }

  // ── Inject formulas into canvas ──
  const injectToCanvas = useCallback(() => {
    if (!plan || !headers.length) return
    // Load data first
    canvasDispatch({ type: 'LOAD', headers, grid })
    // Then inject formulas below the data
    const formulaRows = []
    for (const section of plan.sections || []) {
      formulaRows.push({ label: `── ${section.title} ──`, formula: '' })
      for (const f of section.formulas || []) {
        formulaRows.push({ label: f.label, formula: f.formula })
      }
    }
    const startRow = grid.length + 2 // header row + data rows + 1 blank separator
    canvasDispatch({ type: 'INJECT_FORMULAS', formulaRows, startRow })
    setFormulasInjected(true)
    setViewMode('canvas')
  }, [plan, headers, grid])

  // ── Chat ──
  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const question = chatInput.trim(); setChatInput('')
    const uid = Date.now()
    setChatMsgs(prev => [...prev, { role: 'user', content: question, id: uid }])
    setChatLoading(true)
    const aid = uid + 1
    setChatMsgs(prev => [...prev, { role: 'assistant', content: '', id: aid, loading: true }])
    let text = ''
    try {
      const res = await fetch('/api/generer-excelai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'chat', question, headers, firstRows: grid.slice(0, 10), lastRow: grid[grid.length - 1] || [], totalRows: grid.length, plan, history: chatMsgs.slice(-8).map(m => ({ role: m.role, content: m.content })) }),
      })
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try { const ev = JSON.parse(line.slice(6)); if (ev.type === 'delta') { text += ev.text; setChatMsgs(prev => prev.map(m => m.id === aid ? { ...m, content: text, loading: false } : m)) } } catch {}
        }
      }
    } catch (err) { setChatMsgs(prev => prev.map(m => m.id === aid ? { ...m, content: `Erreur : ${err.message}`, loading: false } : m)) }
    finally { setChatLoading(false); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50) }
  }

  // ── Build & download .xlsx ──
  const buildWorkbook = async (includeData) => {
    const XLSX = await import('xlsx'); const wb = XLSX.utils.book_new()
    const wsDonnees = XLSX.utils.aoa_to_sheet(includeData ? [headers, ...grid] : [headers])
    wsDonnees['!cols'] = headers.map(() => ({ wch: 18 }))
    XLSX.utils.book_append_sheet(wb, wsDonnees, 'Données')
    const aRows = [[`${plan.dataType || 'Analyse'} — ExcelAI`], [plan.analysisGoal || ''], [`${file.name} · ${grid.length} lignes · ${new Date().toLocaleString('fr-FR')}`], []]
    if (plan.validationSummary) aRows.push([`Validation : ${plan.validationSummary.validFormulas}/${plan.validationSummary.totalFormulas} formules OK`], [])
    for (const section of plan.sections || []) {
      aRows.push([`── ${section.title || section.category} ──`])
      for (const f of section.formulas || []) aRows.push([f.label, f.formula, f.note || '', f.confidence ? `Confiance: ${Math.round(f.confidence * 100)}%` : '', f.valid === false ? `⚠ ${f.issues?.join('; ')}` : '✓'])
      aRows.push([])
    }
    const wsA = XLSX.utils.aoa_to_sheet(aRows); wsA['!cols'] = [{ wch: 38 }, { wch: 55 }, { wch: 42 }, { wch: 16 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsA, 'Analyse')
    const gRows = [[`Tableaux graphiques — ${plan.dataType || file.name}`], []]
    for (const table of plan.chartTables || []) {
      const ct = CHART_META[table.chartType] || CHART_META.bar
      gRows.push([table.title, `Graphique : ${ct.label}`, table.chartDescription || '']); gRows.push(table.columns || [])
      for (const row of table.rows || []) gRows.push([row.label, ...(row.formulas || [])])
      gRows.push([]); gRows.push([])
    }
    const wsG = XLSX.utils.aoa_to_sheet(gRows); wsG['!cols'] = [{ wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, wsG, 'Graphiques')
    if (plan.anomalies?.length > 0) {
      const anomRows = [['Anomalies ExcelAI'], ['Sévérité', 'Colonne', 'Type', 'Description', 'Formule']]
      for (const a of plan.anomalies) anomRows.push([a.severity.toUpperCase(), a.column || '', a.type, a.message, a.formula || ''])
      const wsAn = XLSX.utils.aoa_to_sheet(anomRows); wsAn['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 50 }, { wch: 50 }]
      XLSX.utils.book_append_sheet(wb, wsAn, 'Anomalies')
    }
    return { XLSX, wb }
  }

  const downloadFormulas = async () => {
    setLoading(true); setLastExport('formulas'); setLoadingMsg('Génération…')
    try { const { XLSX, wb } = await buildWorkbook(false); XLSX.writeFile(wb, `ExcelAI_${file.name.replace(/\.[^.]+$/, '')}.xlsx`) }
    catch (err) { setError('Export : ' + err.message) } finally { setLoading(false); setLoadingMsg('') }
  }

  const downloadWithData = async () => {
    setLoading(true); setLastExport('data'); setLoadingMsg(`Intégration des ${grid.length} lignes…`)
    try { const { XLSX, wb } = await buildWorkbook(true); XLSX.writeFile(wb, `ExcelAI_${file.name.replace(/\.[^.]+$/, '')}_données.xlsx`) }
    catch (err) { setError('Export : ' + err.message) } finally { setLoading(false); setLoadingMsg('') }
  }

  const reset = () => { setStep('upload'); setFile(null); setHeaders([]); setGrid([]); setPlan(null); setError(''); setLastExport(null); setChatMsgs([]); setChatInput(''); setStreamPct(0); setExplainer(null); setFormulasInjected(false); setViewMode('analysis'); if (fileRef.current) fileRef.current.value = '' }

  // ── Derived ──
  const totalFormulas  = plan?.sections?.reduce((a, s) => a + (s.formulas?.length || 0), 0) || 0
  const validFormulas  = plan?.validationSummary?.validFormulas || 0
  const totalAnomalies = plan?.anomalies?.length || 0
  const highAnomalies  = plan?.anomalies?.filter(a => a.severity === 'high').length || 0
  const totalCharts    = plan?.chartTables?.length || 0

  const TABS = [
    { id: 'formulas',  label: 'Formules',   Icon: Terminal,     count: totalFormulas,  color: 'text-emerald-400' },
    { id: 'charts',    label: 'Graphiques', Icon: BarChart2,    count: totalCharts,    color: 'text-violet-400'  },
    { id: 'anomalies', label: 'Anomalies',  Icon: ShieldAlert,  count: totalAnomalies, color: highAnomalies > 0 ? 'text-red-400' : 'text-slate-400' },
    { id: 'chat',      label: 'Chat IA',    Icon: MessageSquare,count: chatMsgs.filter(m => m.role === 'user').length, color: 'text-sky-400' },
  ]

  const stepIdx = ['upload', 'plan', 'results'].indexOf(step)

  return (
    <main className="min-h-screen bg-[#080b12] text-white flex flex-col" style={{ fontFamily: "'IBM Plex Mono','Fira Code',monospace" }}>

      {/* Explainer modal */}
      {explainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setExplainer(null)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2"><BookOpen size={14} className="text-violet-400"/><span className="text-xs font-bold text-slate-200">Décryptage formule</span></div>
              <button onClick={() => setExplainer(null)} className="text-slate-600 hover:text-slate-300"><X size={15}/></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest">{explainer.label}</p>
              <code className="block text-xs text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-lg px-3 py-2.5 font-mono break-all">{explainer.formula}</code>
              <p className="text-[9px] text-slate-500 italic">Ouvrez le chat IA pour une explication détaillée de cette formule.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/6 bg-[#080b12]/95 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-emerald-500/15 border border-emerald-500/30 rounded-lg flex items-center justify-center">
              <FileSpreadsheet size={13} className="text-emerald-400"/>
            </div>
            <span className="font-bold text-sm tracking-tight">Excel<span className="text-emerald-400">AI</span></span>
            <span className="text-[8px] border border-emerald-500/25 text-emerald-500/70 px-1.5 py-0.5 rounded uppercase tracking-widest">v4</span>
          </div>

          {/* Steps */}
          <div className="hidden sm:flex items-center gap-1 flex-1 justify-center">
            {['Fichier','Analyse IA','Résultats'].map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${stepIdx===i?'bg-emerald-500/12 text-emerald-300 border border-emerald-500/25':stepIdx>i?'text-emerald-500/60':'text-slate-700'}`}>
                  {s}
                </div>
                {i < 2 && <ChevronRight size={9} className={stepIdx>i?'text-emerald-500/40':'text-slate-800'}/>}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View mode toggle (only in results) */}
            {step === 'results' && plan && (
              <div className="flex items-center border border-white/8 rounded-lg overflow-hidden">
                {[{ id: 'analysis', icon: <SlidersHorizontal size={10}/>, label: 'Analyse' }, { id: 'canvas', icon: <Table2 size={10}/>, label: 'Canvas' }].map(v => (
                  <button key={v.id} onClick={() => { if (v.id === 'canvas' && !formulasInjected) injectToCanvas(); else setViewMode(v.id) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold transition-all ${viewMode===v.id?'bg-emerald-500/15 text-emerald-300':'text-slate-500 hover:text-slate-300'}`}>
                    {v.icon}{v.label}
                    {v.id === 'canvas' && !formulasInjected && <span className="text-[7px] text-amber-400/60 ml-0.5">NEW</span>}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setLocale(l => l === 'FR' ? 'EN' : 'FR')}
              className="flex items-center gap-1.5 text-[10px] font-bold border border-white/8 hover:border-white/15 rounded px-2.5 py-1.5 transition-all text-slate-400 hover:text-slate-200">
              <Globe size={10}/>{locale}
            </button>
            {history.length > 0 && (
              <div className="relative">
                <button onClick={() => setShowHistory(h => !h)} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 border border-white/8 hover:border-white/15 rounded px-2.5 py-1.5 transition-all">
                  <History size={10}/><span className="text-[9px] text-emerald-500/60">{history.length}</span>
                </button>
                {showHistory && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-40">
                    <div className="px-3 py-2.5 border-b border-white/8 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historique</span>
                      <button onClick={() => setShowHistory(false)}><X size={12} className="text-slate-600"/></button>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {history.map(h => (
                        <button key={h.id} onClick={() => { setPlan(h.plan); setShowHistory(false); setStep('results') }}
                          className="w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/4 transition-colors">
                          <p className="text-[10px] font-bold text-slate-300 truncate">{h.fileName}</p>
                          <p className="text-[9px] text-slate-600">{h.dataType} · {h.formulaCount} formules · {new Date(h.date).toLocaleDateString('fr-FR')}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {step !== 'upload' && <button onClick={reset} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 border border-white/8 hover:border-white/15 rounded px-2.5 py-1.5 transition-all"><RotateCcw size={10}/></button>}
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 mt-3 w-full">
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertCircle size={13} className="text-red-400 flex-shrink-0"/>
            <p className="text-xs text-red-400 flex-1">{error}</p>
            <button onClick={() => setError('')}><X size={12} className="text-red-500"/></button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ══ UPLOAD ══ */}
        {step === 'upload' && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6 w-full">
            <div className="text-center space-y-2 pb-2">
              <div className="inline-flex items-center gap-1.5 text-[9px] text-emerald-500/60 border border-emerald-500/15 rounded-full px-3 py-1 uppercase tracking-widest mb-3">
                <Sparkles size={9}/> Formules · Canvas · Graphiques · Anomalies · Chat IA
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Analysez vos données<br/><span className="text-emerald-400">sans jamais vous tromper</span></h1>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">Claude analyse 10 premières + dernière ligne → formules Excel précises → Canvas live ou .xlsx téléchargeable avec feuille Données vide à coller.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {n:'01',Icon:Upload,    t:'Upload',      d:'Excel · CSV'},
                {n:'02',Icon:Brain,     t:'Claude analyse',d:'10+1 lignes'},
                {n:'03',Icon:Table2,    t:'Canvas live', d:'Formules injectées'},
                {n:'04',Icon:Download,  t:'Export .xlsx', d:'4 feuilles prêtes'},
              ].map(({n,Icon,t,d})=>(
                <div key={n} className="border border-white/6 rounded-xl p-3 bg-white/[0.015] space-y-2">
                  <div className="flex items-center justify-between"><Icon size={13} className="text-emerald-500/50"/><span className="text-[8px] text-slate-800 font-bold">{n}</span></div>
                  <p className="text-[10px] font-bold text-slate-300">{t}</p>
                  <p className="text-[9px] text-slate-600">{d}</p>
                </div>
              ))}
            </div>

            {/* Locale */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-[10px] text-slate-600">Locale Excel :</span>
              {['FR','EN'].map(l=>(
                <button key={l} onClick={()=>setLocale(l)} className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded border transition-all ${locale===l?'bg-emerald-500/12 border-emerald-500/30 text-emerald-300':'border-white/8 text-slate-500 hover:border-white/15 hover:text-slate-300'}`}>
                  <Globe size={10}/>{l} <span className="text-[8px] opacity-60">{l==='FR'?'(SOMME…)':'(SUM…)'}</span>
                </button>
              ))}
            </div>

            <label className="block cursor-pointer group">
              <div className={`border-2 border-dashed rounded-2xl p-14 text-center transition-all ${loading?'border-emerald-500/40 bg-emerald-500/4':'border-white/8 hover:border-emerald-500/25 hover:bg-emerald-500/[0.02]'}`}>
                {loading?(
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={24} className="text-emerald-400 animate-spin"/>
                    <p className="text-xs text-emerald-400 font-bold">{loadingMsg}</p>
                  </div>
                ):(
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border border-emerald-500/20 bg-emerald-500/6 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/12 transition-all"><Upload size={20} className="text-emerald-400"/></div>
                    <div><p className="text-sm font-bold text-slate-300">Glissez votre fichier ou cliquez</p><p className="text-[10px] text-slate-600 mt-1">.xlsx · .xls · .csv acceptés</p></div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={loading}/>
            </label>
          </div>
        )}

        {/* ══ PLAN ══ */}
        {step === 'plan' && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5 w-full">
            {/* File card */}
            <div className="border border-white/8 rounded-xl p-4 bg-white/[0.015] flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet size={17} className="text-emerald-400"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-200 truncate">{file?.name}</p>
                <p className="text-[10px] text-slate-500">{grid.length.toLocaleString('fr-FR')} lignes · {headers.length} colonnes · Locale {locale}</p>
              </div>
              <CheckCircle size={14} className="text-emerald-400 flex-shrink-0"/>
            </div>

            {/* Column chips */}
            <div className="space-y-2">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Colonnes ({headers.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {headers.map((h, i) => (
                  <span key={i} className="flex items-center gap-1 bg-white/4 border border-white/8 rounded px-2 py-0.5 text-[10px]">
                    <span className="text-emerald-500/50 font-bold">{colLetter(i)}</span>
                    <span className="text-slate-300">{h}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Data preview */}
            <div className="border border-white/8 rounded-xl overflow-hidden">
              <button onClick={() => setShowPreview(s => !s)} className="w-full flex items-center justify-between px-4 py-3 text-[10px] text-slate-500 hover:bg-white/3 transition-colors">
                <span className="flex items-center gap-2 font-bold uppercase tracking-widest"><Eye size={11}/> Données envoyées à Claude (10 premières + dernière ligne)</span>
                {showPreview ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
              </button>
              {showPreview && (
                <div className="border-t border-white/6 overflow-x-auto">
                  <table className="w-full text-[9px]">
                    <thead><tr className="bg-white/3"><th className="px-3 py-2 text-left text-slate-700 w-8">#</th>{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left text-slate-500 font-bold min-w-[70px]">{h}</th>)}</tr></thead>
                    <tbody>
                      {grid.slice(0, 10).map((row, ri) => (
                        <tr key={ri} className="border-t border-white/4 hover:bg-white/2">
                          <td className="px-3 py-1.5 text-emerald-500/40 font-bold">{ri + 2}</td>
                          {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 text-slate-500 max-w-[100px]"><span className="block truncate">{cell}</span></td>)}
                        </tr>
                      ))}
                      {grid.length > 10 && <>
                        <tr className="border-t border-white/4"><td colSpan={headers.length+1} className="px-3 py-1.5 text-[8px] text-slate-700 text-center">… {(grid.length - 11).toLocaleString('fr-FR')} lignes …</td></tr>
                        <tr className="border-t border-white/4 bg-amber-500/[0.03]">
                          <td className="px-3 py-1.5 text-amber-400/40 font-bold">{grid.length + 1}</td>
                          {grid[grid.length - 1]?.map((cell, ci) => <td key={ci} className="px-3 py-1.5 text-amber-400/50 max-w-[100px]"><span className="block truncate">{cell}</span></td>)}
                        </tr>
                      </>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* CTA */}
            <button onClick={handleAnalyse} disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-emerald-500/10">
              {loading ? (
                <div className="w-full px-6 space-y-2">
                  <div className="flex items-center gap-2"><Loader2 size={11} className="text-emerald-300 animate-spin flex-shrink-0"/><p className="text-[10px] text-emerald-300">{loadingMsg}</p></div>
                  <div className="h-0.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300" style={{width:`${streamPct}%`}}/></div>
                </div>
              ) : <><Brain size={15}/> Analyser · Locale {locale}<ArrowRight size={13}/></>}
            </button>
          </div>
        )}

        {/* ══ RESULTS — CANVAS MODE ══ */}
        {step === 'results' && viewMode === 'canvas' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Canvas toolbar hint */}
            <div className="flex items-center gap-3 px-4 py-2 bg-[#0d1117] border-b border-white/6 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400"/>
                <span className="text-[10px] font-bold text-amber-300">Lignes ƒ = formules Claude injectées</span>
              </div>
              <span className="text-[9px] text-slate-600">·</span>
              <span className="text-[9px] text-slate-500">Ligne 1 = en-têtes · Lignes 2→{grid.length+1} = données · Lignes {grid.length+3}+ = formules</span>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setViewMode('analysis')} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 border border-white/8 hover:border-white/15 rounded px-2.5 py-1.5 transition-all">
                  <SlidersHorizontal size={10}/> Vue analyse
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ExcelCanvas gridState={canvasState} dispatch={canvasDispatch} fileName={file?.name || 'Classeur'} dataRowCount={grid.length + 1} />
            </div>
          </div>
        )}

        {/* ══ RESULTS — ANALYSIS MODE ══ */}
        {step === 'results' && viewMode === 'analysis' && plan && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 w-full overflow-y-auto flex-1">

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {label:'Formules',  value:totalFormulas, sub:`${validFormulas} validées`, color:'text-emerald-400', Icon:Terminal   },
                {label:'Graphiques',value:totalCharts,   sub:'tableaux prêts',            color:'text-violet-400', Icon:BarChart2   },
                {label:'Anomalies', value:totalAnomalies,sub:highAnomalies>0?`${highAnomalies} critiques`:'aucune critique', color:highAnomalies>0?'text-red-400':'text-slate-500', Icon:ShieldAlert },
                {label:'Validation',value:`${totalFormulas>0?Math.round(validFormulas/totalFormulas*100):100}%`,sub:'formules OK', color:'text-emerald-400', Icon:ShieldCheck  },
              ].map(({label,value,sub,color,Icon})=>(
                <div key={label} className="border border-white/6 rounded-xl p-3 bg-white/[0.015] space-y-1">
                  <div className="flex items-center justify-between"><span className="text-[9px] text-slate-600 uppercase tracking-widest">{label}</span><Icon size={11} className={color}/></div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-[9px] text-slate-600">{sub}</p>
                </div>
              ))}
            </div>

            {/* Plan header */}
            <div className="border border-emerald-500/15 bg-emerald-500/[0.03] rounded-xl px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1"><CheckCircle size={12} className="text-emerald-400"/><span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">Plan généré</span></div>
                <h2 className="text-sm font-bold text-white">{plan.dataType}</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">{plan.analysisGoal}</p>
              </div>
              <span className="text-[9px] border border-white/8 text-slate-500 px-2 py-0.5 rounded flex-shrink-0">Locale {plan.locale || locale}</span>
            </div>

            {/* Export options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Open Canvas */}
              <div className="border border-amber-500/25 bg-amber-500/[0.03] rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500/15 border border-amber-500/25 rounded-lg flex items-center justify-center flex-shrink-0"><Table2 size={13} className="text-amber-400"/></div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5"><p className="text-[10px] font-bold text-slate-200">Canvas live</p><span className="text-[7px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase">Nouveau</span></div>
                  <p className="text-[9px] text-slate-600 mt-0.5">Données + formules dans un tableur interactif</p>
                </div>
                <button onClick={()=>{if(!formulasInjected)injectToCanvas();else setViewMode('canvas')}}
                  className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 transition-all flex-shrink-0">
                  <Table2 size={10}/> Ouvrir
                </button>
              </div>

              {/* Download formulas only */}
              <div className={`border rounded-xl p-4 transition-all ${lastExport==='formulas'?'border-emerald-500/35 bg-emerald-500/6':'border-white/8 bg-white/[0.015] hover:border-white/12'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/5 border border-white/8 rounded-lg flex items-center justify-center flex-shrink-0"><Download size={13} className="text-slate-500"/></div>
                  <div className="flex-1"><p className="text-[10px] font-bold text-slate-300">Sans données</p><p className="text-[9px] text-slate-600 mt-0.5">Feuille Données vide → collez manuellement</p></div>
                  <button onClick={downloadFormulas} disabled={loading} className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1.5 rounded border border-white/10 hover:border-white/20 bg-white/4 hover:bg-white/8 text-slate-300 disabled:opacity-50 transition-all flex-shrink-0">
                    {loading&&lastExport==='formulas'?<Loader2 size={10} className="animate-spin"/>:<Download size={10}/>} Export
                  </button>
                </div>
              </div>

              {/* Download with data */}
              <div className={`border rounded-xl p-4 transition-all ${lastExport==='data'?'border-emerald-500/35 bg-emerald-500/6':'border-emerald-500/18 bg-emerald-500/[0.03] hover:border-emerald-500/30'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-500/12 border border-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0"><PackagePlus size={13} className="text-emerald-400"/></div>
                  <div className="flex-1"><div className="flex items-center gap-1.5"><p className="text-[10px] font-bold text-slate-200">Avec données</p><span className="text-[7px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">Recommandé</span></div><p className="text-[9px] text-slate-600 mt-0.5">{grid.length.toLocaleString('fr-FR')} lignes incluses</p></div>
                  <button onClick={downloadWithData} disabled={loading} className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-all flex-shrink-0 shadow-sm shadow-emerald-500/20">
                    {loading&&lastExport==='data'?<Loader2 size={10} className="animate-spin"/>:<PackagePlus size={10}/>} Export
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border border-white/6 rounded-2xl overflow-hidden">
              <div className="flex border-b border-white/6 bg-white/[0.012]">
                {TABS.map(({id,label,Icon,count,color})=>(
                  <button key={id} onClick={()=>setActiveTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-bold transition-all border-b-2 ${activeTab===id?`border-emerald-500/60 ${color} bg-white/3`:'border-transparent text-slate-600 hover:text-slate-400 hover:bg-white/2'}`}>
                    <Icon size={11}/><span className="hidden sm:inline">{label}</span>
                    {count>0&&<span className={`text-[8px] px-1 py-0.5 rounded ${activeTab===id?'bg-white/10':'bg-white/5'}`}>{count}</span>}
                  </button>
                ))}
              </div>

              {/* Formulas tab */}
              {activeTab==='formulas'&&(
                <div className="divide-y divide-white/5">
                  {plan.sections?.map((section,si)=>{
                    const col=CAT_STYLE[section.category]||CAT_STYLE.total
                    return(
                      <div key={si}>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.008]">
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${col.badge}`}>{section.category}</span>
                          <span className={`text-[10px] font-bold ${col.text}`}>{section.title}</span>
                          <span className="ml-auto text-[8px] text-slate-700">{section.formulas?.length} formule{section.formulas?.length>1?'s':''}</span>
                        </div>
                        {section.formulas?.map((f,fi)=>(
                          <div key={fi} className="flex items-start gap-3 px-4 py-2.5 border-t border-white/4 hover:bg-white/[0.015] group transition-colors">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${f.confidence>=0.85?'bg-emerald-400':f.confidence>=0.6?'bg-amber-400':'bg-red-400'}`}/>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[10px] font-bold text-slate-300">{f.label}</p>
                                {f.valid===false&&<span title={f.issues?.join('\n')} className="flex items-center gap-0.5 text-[8px] text-amber-400/80 cursor-help"><ShieldAlert size={9}/>{f.issues?.length} issue{f.issues?.length>1?'s':''}</span>}
                              </div>
                              {f.note&&<p className="text-[9px] text-slate-600 mt-0.5">{f.note}</p>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <code className="text-[8px] font-mono text-emerald-400/70 bg-emerald-500/6 border border-emerald-500/10 rounded px-2 py-1 max-w-[200px] sm:max-w-[280px] truncate block">{f.formula}</code>
                              <button onClick={()=>copy(f.formula,`f-${si}-${fi}`)} title="Copier" className={`p-1 rounded transition-colors ${copied===`f-${si}-${fi}`?'text-emerald-400 bg-emerald-500/15':'text-slate-700 hover:text-slate-300 hover:bg-white/8'}`}>{copied===`f-${si}-${fi}`?<Check size={10}/>:<Copy size={10}/>}</button>
                              <button onClick={()=>setExplainer({formula:f.formula,label:f.label})} title="Voir la formule" className="p-1 text-slate-700 hover:text-violet-400 transition-colors rounded hover:bg-violet-500/10"><BookOpen size={10}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Charts tab */}
              {activeTab==='charts'&&(
                <div className="divide-y divide-white/5">
                  {!plan.chartTables?.length&&<div className="px-5 py-8 text-center text-[10px] text-slate-600">Aucun tableau graphique généré.</div>}
                  {plan.chartTables?.map((table,ti)=>{
                    const ct=CHART_META[table.chartType]||CHART_META.bar; const CtIcon=ct.icon
                    return(
                      <div key={ti}>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.008] flex-wrap">
                          <span className={`flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-white/5 border-white/10 ${ct.color}`}><CtIcon size={8}/>{ct.label}</span>
                          <span className="text-[10px] font-bold text-slate-200">{table.title}</span>
                          <span className="ml-auto text-[8px] text-slate-700">{table.rows?.length} ligne{table.rows?.length>1?'s':''}</span>
                        </div>
                        {table.chartDescription&&<div className="px-4 py-2 border-t border-white/4"><p className="text-[9px] text-slate-500 italic">{table.chartDescription}</p></div>}
                        <div className="overflow-x-auto">
                          <table className="w-full text-[9px]">
                            <thead><tr className="border-t border-white/5">{(table.columns||[]).map((col,ci)=><th key={ci} className="px-3 py-2 text-left text-slate-600 font-bold">{col}</th>)}<th className="w-8"/></tr></thead>
                            <tbody>{(table.rows||[]).map((row,ri)=>(
                              <tr key={ri} className="border-t border-white/4 hover:bg-white/2">
                                <td className="px-3 py-1.5 text-slate-300 font-bold">{row.label}</td>
                                {(row.formulas||[]).map((formula,fi)=>(
                                  <td key={fi} className="px-3 py-1.5"><code className="text-[8px] text-emerald-400/65 bg-emerald-500/5 border border-emerald-500/8 rounded px-1.5 py-0.5 block max-w-[160px] truncate">{formula}</code></td>
                                ))}
                                <td className="px-2 py-1.5"><button onClick={()=>copy(row.formulas?.join('\t')||'',`ct-${ti}-${ri}`)} className={`p-1 rounded ${copied===`ct-${ti}-${ri}`?'text-emerald-400':'text-slate-700 hover:text-slate-300'}`}>{copied===`ct-${ti}-${ri}`?<Check size={9}/>:<Copy size={9}/>}</button></td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Anomalies tab */}
              {activeTab==='anomalies'&&(
                <div className="divide-y divide-white/5">
                  {!plan.anomalies?.length&&<div className="px-5 py-8 text-center space-y-2"><ShieldCheck size={20} className="text-emerald-500/40 mx-auto"/><p className="text-[10px] text-slate-600">Aucune anomalie détectée.</p></div>}
                  {plan.anomalies?.map((a,ai)=>{const sev=SEV[a.severity]||SEV.low; const SevIcon=sev.Icon; return(
                    <div key={ai} className={`border-l-2 ${a.severity==='high'?'border-l-red-500/60':a.severity==='medium'?'border-l-amber-500/60':'border-l-slate-700'} px-4 py-3`}>
                      <div className="flex items-start gap-3">
                        <SevIcon size={13} className={`${sev.color} flex-shrink-0 mt-0.5`}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${sev.bg} ${sev.color}`}>{a.severity}</span>
                            <span className="text-[9px] text-slate-400 font-bold">{a.type}</span>
                            {a.column&&<span className="text-[9px] text-slate-500 bg-white/5 border border-white/8 rounded px-1.5 py-0.5">{a.column}</span>}
                          </div>
                          <p className="text-[10px] text-slate-300 mt-1">{a.message}</p>
                          {a.formula&&(
                            <div className="flex items-center gap-2 mt-1.5">
                              <code className="text-[8px] text-emerald-400/65 bg-emerald-500/5 border border-emerald-500/8 rounded px-2 py-0.5 truncate max-w-[280px]">{a.formula}</code>
                              <button onClick={()=>copy(a.formula,`an-${ai}`)} className={`p-1 rounded ${copied===`an-${ai}`?'text-emerald-400':'text-slate-700 hover:text-slate-300'}`}>{copied===`an-${ai}`?<Check size={9}/>:<Copy size={9}/>}</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              )}

              {/* Chat tab */}
              {activeTab==='chat'&&(
                <div className="flex flex-col" style={{minHeight:380}}>
                  {chatMsgs.length===0&&(
                    <div className="px-5 py-5 space-y-3">
                      <div className="flex items-center gap-2"><Sparkles size={13} className="text-sky-400"/><p className="text-[10px] font-bold text-slate-300">Chat contextuel sur vos données</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {['Quel est le total de chaque colonne numérique ?','Y a-t-il des valeurs aberrantes ?','Quelle formule pour filtrer les lignes vides ?','Comment créer un tableau croisé dynamique ?'].map((q,i)=>(
                          <button key={i} onClick={()=>setChatInput(q)} className="text-left text-[9px] text-slate-500 hover:text-slate-300 border border-white/6 hover:border-white/12 rounded-lg px-3 py-2 transition-colors hover:bg-white/3">{q}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{maxHeight:320}}>
                    {chatMsgs.map(msg=>(
                      <div key={msg.id} className={`flex ${msg.role==='user'?'justify-end':'justify-start'}`}>
                        <div className={`max-w-[82%] rounded-xl px-3 py-2 text-[10px] leading-relaxed ${msg.role==='user'?'bg-emerald-600/20 border border-emerald-500/20 text-slate-200':'bg-white/5 border border-white/8 text-slate-300'}`}>
                          {msg.loading?<span className="flex items-center gap-2 text-slate-500"><Loader2 size={10} className="animate-spin"/>Réflexion…</span>:<span style={{whiteSpace:'pre-wrap'}}>{msg.content}</span>}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef}/>
                  </div>
                  <div className="border-t border-white/6 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleChat()} placeholder="Posez une question sur vos données…" disabled={chatLoading}
                        className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[10px] text-slate-200 placeholder-slate-700 outline-none focus:border-emerald-500/30 focus:bg-white/6 transition-all disabled:opacity-50"/>
                      <button onClick={handleChat} disabled={!chatInput.trim()||chatLoading} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0">
                        {chatLoading?<Loader2 size={12} className="animate-spin"/>:<Send size={12}/>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-1">
              <button onClick={reset} className="text-[9px] text-slate-700 hover:text-slate-500 flex items-center gap-1 transition-colors"><RotateCcw size={9}/> Analyser un autre fichier</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}