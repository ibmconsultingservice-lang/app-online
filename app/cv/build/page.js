'use client'

import { useState, useRef, useCallback } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

// ─── Strip ALL markdown from a string ───────────────────────────────────────
function md(t = '') {
  return t
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

// ─── Extract section between heading and next heading ────────────────────────
function section(key, text) {
  // matches "KEY" or "KEY :" or "## KEY" at start of line
  const pat = new RegExp(
    `(?:^|\\n)\\s*(?:#{1,3}\\s*)?(?:${key})\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:#{1,3}\\s*)?(?:OBJECTIF|EXPERIENCES|EXPÉRIENCES|FORMATION|PROJETS|COMPÉTENCES|COMPETENCES|LANGUES|CONTACT|NOM|TITRE)\\s*:?\\s*\\n|$)`,
    'im'
  )
  const m = text.match(pat)
  return m ? md(m[1]) : ''
}

// ─── Parse experience lines into clean blocks ────────────────────────────────
// Strategy: group lines. A new block starts when we see a line that looks like
// a company name OR a period. Keep it minimal — just render lines cleanly.
function parseExp(raw) {
  if (!raw.trim()) return []

  const lines = raw
    .split('\n')
    .map(l => md(l.trim()))
    .filter(l => l.length > 0 && l !== '---' && l !== '—' && !/^-{3,}$/.test(l))

  const blocks = []
  let cur = null

  const looksLikePeriod = l => /\b(20\d{2}|19\d{2})\b/.test(l) && l.length < 40
  const looksLikeCompany = l => {
    const stripped = l.replace(/^[►▶•\-–—]\s*/, '')
    return (
      stripped.length > 3 &&
      stripped.length < 70 &&
      (
        stripped === stripped.toUpperCase() ||              // ALL CAPS
        /\b(SA|SARL|SNC|GROUP|CORP|INC|SAS)\b/.test(stripped) || // company suffix
        /^[►▶]/.test(l)                                    // starts with arrow
      )
    )
  }

  lines.forEach(line => {
    const stripped = line.replace(/^[►▶•\-–—]\s*/, '').trim()

    if (looksLikePeriod(line)) {
      // Period line: attach to current or start new
      if (!cur) cur = { period: line, company: '', role: '', tasks: [] }
      else if (!cur.period) cur.period = line
      else {
        // New block starting with period
        blocks.push(cur)
        cur = { period: line, company: '', role: '', tasks: [] }
      }
    } else if (looksLikeCompany(line)) {
      if (cur && (cur.company || cur.tasks.length > 0)) blocks.push(cur)
      cur = { period: cur?.period || '', company: stripped, role: '', tasks: [] }
    } else if (cur) {
      if (!cur.company) {
        cur.company = stripped
      } else if (!cur.role && stripped.length < 80 && !/^[-•]/.test(line)) {
        cur.role = stripped
      } else {
        cur.tasks.push(stripped.replace(/^[-•]\s*/, ''))
      }
    } else {
      // No current block yet — start one
      cur = { period: '', company: stripped, role: '', tasks: [] }
    }
  })
  if (cur && (cur.company || cur.role || cur.tasks.length)) blocks.push(cur)

  // Fallback: if parsing failed, show all lines as a single block
  if (!blocks.length) {
    return [{ period: '', company: '', role: '', tasks: lines }]
  }
  return blocks
}

// ─── Convert sidebar raw text to list items ──────────────────────────────────
function toItems(raw) {
  const lines = raw.split('\n').map(l => md(l.replace(/^[-•►▶*]\s*/, '').trim())).filter(l => l.length > 1)
  if (!lines.length) return '<div class="s-item" contenteditable="true">À compléter</div>'
  return lines.map(l => `<div class="s-item" contenteditable="true">${l}</div>`).join('')
}

// ─── Build full HTML srcDoc ───────────────────────────────────────────────────
function buildHTML(cvText, formValues, theme) {
  // 1. Extract structured fields from form (fallback to parsed text)
  const nomRaw   = formValues.nom   || cvText.match(/^NOM\s*:\s*(.+)/im)?.[1]   || ''
  const titreRaw = formValues.titre || cvText.match(/^TITRE\s*:\s*(.+)/im)?.[1] || ''
  const nom   = md(nomRaw)   || 'Prénom NOM'
  const titre = md(titreRaw) || 'Professionnel'

  // 2. Extract sections
  const expRaw    = section('EXPERIENCES?|EXPÉRIENCES?', cvText)
  const formRaw   = section('FORMATION|ÉTUDES|ETUDES', cvText)
  const compRaw   = section('COMP[EÉ]TENCES', cvText)
  const projRaw   = section('PROJETS', cvText)
  const langRaw   = section('LANGUES', cvText)
  const contRaw   = section('CONTACT', cvText)

  // 3. Contact info
  const loc   = md(contRaw.match(/Localisation\s*:\s*(.+)/i)?.[1] || formValues.localisation || 'Sénégal')
  const email = md(contRaw.match(/Email\s*:\s*(.+)/i)?.[1]
    || formValues.email
    || cvText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0]
    || 'contact@email.com')
  const tel = md(contRaw.match(/T[eé]l[eé]phone\s*:\s*(.+)/i)?.[1]
    || formValues.telephone
    || cvText.match(/(?:\+?\d[\d\s-]{7,})/)?.[0]
    || '+221 -- --- -- --')

  // 4. Build experience HTML
  const exps = parseExp(expRaw)
  const expHTML = exps.map(e => `
    <div class="exp-block">
      <div class="exp-meta">
        <div class="exp-period" contenteditable="true">${e.period || '—'}</div>
      </div>
      <div class="exp-body">
        ${e.company ? `<div class="exp-company" contenteditable="true">► ${e.company}</div>` : ''}
        ${e.role    ? `<div class="exp-role"    contenteditable="true">${e.role}</div>` : ''}
        ${e.tasks.length ? `<ul class="exp-tasks">${e.tasks.map(t =>
          `<li contenteditable="true">${t}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`).join('')

  // 5. Languages badges
  const langBadges = langRaw.split('\n')
    .map(l => md(l.replace(/^[-•►▶*]\s*/, '').trim())).filter(l => l.length > 1)
    .map(l => `<span class="lang-badge" contenteditable="true">${l.toUpperCase()}</span>`).join('')
    || '<span class="lang-badge" contenteditable="true">FRANÇAIS</span>'

  const accentHex = theme.accent.replace('#', '')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700;800&family=Barlow+Condensed:wght@400;600;700;800&display=swap');
:root {
  --dark:   ${theme.dark};
  --accent: ${theme.accent};
  --acc-lt: ${theme.accentLight};
  --ic-bg:  ${theme.iconBg};
  --t1: #1f2937; --t2: #4b5563; --t3: #6b7280;
  --bd: #e2e8f0;
}
@page { size:A4; margin:0; }
*  { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family:'Barlow',sans-serif;
  background:#cbd5e1;
  display:flex; justify-content:center; padding:20px 0;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
[contenteditable="true"] { outline:none; }
[contenteditable="true"]:hover { background:rgba(0,0,0,0.04); cursor:text; border-radius:2px; }

/* PAGE */
.cv {
  width:210mm; min-height:297mm; background:#fff;
  display:grid; grid-template-columns:128mm 82mm; grid-template-rows:auto 1fr;
  box-shadow:0 4px 32px rgba(0,0,0,0.18);
}

/* HEADER */
.cv-hd { grid-column:1/3; background:var(--dark); padding:16px 22px 13px 18px; }
.hd-row { display:flex; align-items:center; gap:8px; }
.hd-arr {
  width:0; height:0;
  border-top:15px solid transparent; border-bottom:15px solid transparent;
  border-left:15px solid var(--accent); flex-shrink:0;
}
.hd-hash { font-family:'Barlow Condensed',sans-serif; font-size:24px; font-weight:800; color:var(--accent); line-height:1; }
.hd-name { font-family:'Barlow Condensed',sans-serif; font-size:26px; font-weight:800; color:#fff; text-transform:uppercase; letter-spacing:2px; line-height:1; }
.hd-sub { margin-top:5px; padding-left:23px; font-size:9.5px; color:rgba(255,255,255,0.62); }
.hd-lbl { font-weight:700; text-transform:uppercase; font-size:8px; letter-spacing:1.5px; color:rgba(255,255,255,0.38); margin-right:5px; }

/* LEFT */
.cv-main { padding:14px 16px; display:flex; flex-direction:column; gap:0; overflow:hidden; }

.sec-hd {
  display:flex; align-items:center; gap:6px;
  background:#f1f5f9; border-left:4px solid var(--accent);
  padding:5px 9px; margin-bottom:10px;
  font-family:'Barlow Condensed',sans-serif;
  font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--t1);
}
.sec-ic {
  width:17px; height:17px; background:var(--dark); border-radius:3px;
  display:flex; align-items:center; justify-content:center; font-size:9px; color:var(--acc-lt); flex-shrink:0;
}

/* EXP */
.exp-block {
  display:grid; grid-template-columns:50px 1fr; gap:7px;
  padding-bottom:7px; border-bottom:1px solid var(--bd); margin-bottom:1px;
}
.exp-block:last-child { border-bottom:none; padding-bottom:0; }
.exp-meta { padding-top:2px; }
.exp-period {
  font-size:7.5px; font-weight:700; color:var(--accent);
  background:rgba(0,0,0,0.04); border:1px solid var(--bd);
  border-radius:3px; padding:2px 3px; text-align:center; line-height:1.4;
}
.exp-body { display:flex; flex-direction:column; gap:2px; }
.exp-company {
  font-family:'Barlow Condensed',sans-serif;
  font-size:10.5px; font-weight:700; color:var(--t1);
  text-transform:uppercase; letter-spacing:0.3px; line-height:1.3;
}
.exp-role { font-size:8.5px; font-style:italic; font-weight:500; color:var(--t2); line-height:1.3; }
.exp-tasks { margin-top:2px; padding-left:10px; list-style:none; }
.exp-tasks li { font-size:8px; color:var(--t2); line-height:1.55; position:relative; padding:0.5px 0; }
.exp-tasks li::before { content:'•'; color:var(--accent); position:absolute; left:-9px; font-size:9px; }

/* SIDEBAR */
.cv-sb { background:var(--dark); padding:13px 11px; display:flex; flex-direction:column; gap:9px; }

.photo-box {
  width:84px; height:84px; border-radius:50%;
  border:3px solid var(--accent); overflow:hidden;
  cursor:pointer; margin:0 auto; position:relative; flex-shrink:0;
}
.photo-box img { width:100%; height:100%; object-fit:cover; display:block; }
.photo-box:hover img { opacity:0.7; }
.photo-box::after { content:'📷'; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:16px; opacity:0; transition:opacity .2s; pointer-events:none; }
.photo-box:hover::after { opacity:1; }

.sb-bl { background:rgba(0,0,0,0.22); border-radius:5px; padding:8px 9px; }
.sb-hd { display:flex; align-items:center; gap:5px; font-family:'Barlow Condensed',sans-serif; font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#fff; margin-bottom:6px; }
.sb-ic { width:16px; height:16px; background:var(--ic-bg); border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:9px; flex-shrink:0; }

.c-row { display:flex; align-items:flex-start; gap:5px; margin-bottom:3px; }
.c-ic  { font-size:9px; flex-shrink:0; margin-top:2px; }
.c-val { font-size:8px; color:rgba(255,255,255,0.82); line-height:1.45; word-break:break-all; }

.s-item { font-size:8px; color:rgba(255,255,255,0.78); line-height:1.65; padding:1px 0; display:block; }
.s-item::before { content:'→ '; color:var(--acc-lt); }

.comp-txt { font-size:8px; color:rgba(255,255,255,0.78); line-height:1.75; }

.lang-row { display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; }
.lang-badge { background:var(--accent); color:var(--dark); font-size:7.5px; font-weight:800; padding:2px 7px; border-radius:2px; letter-spacing:0.8px; display:inline-block; }

@media print {
  body { background:none; padding:0; }
  .cv  { box-shadow:none; }
  .photo-box::after { display:none !important; }
}
</style>
</head>
<body>
<div class="cv">

  <div class="cv-hd">
    <div class="hd-row">
      <div class="hd-arr"></div>
      <div class="hd-hash">#</div>
      <div class="hd-name" contenteditable="true">${nom.toUpperCase()}</div>
    </div>
    <div class="hd-sub">
      <span class="hd-lbl">Objectif :</span>
      <span contenteditable="true">${titre}</span>
    </div>
  </div>

  <div class="cv-main">
    <div class="sec-hd"><div class="sec-ic">💼</div>EXPERIENCES</div>
    ${expHTML || '<div style="font-size:9px;color:#6b7280;padding:8px 0;">Aucune expérience extraite — double-cliquez pour modifier.</div>'}
  </div>

  <div class="cv-sb">

    <div class="photo-box" onclick="document.getElementById('fi').click()">
      <img id="pimg" src="https://ui-avatars.com/api/?name=${encodeURIComponent(nom)}&background=${accentHex}&color=fff&size=200" alt="Photo">
      <input type="file" id="fi" style="display:none" accept="image/*"
        onchange="(function(inp){if(!inp.files||!inp.files[0])return;var r=new FileReader();r.onload=function(ev){document.getElementById('pimg').src=ev.target.result};r.readAsDataURL(inp.files[0])})(this)">
    </div>

    <div class="sb-bl">
      <div class="sb-hd"><div class="sb-ic">📋</div>CONTACTS</div>
      <div class="c-row"><span class="c-ic">📍</span><span class="c-val" contenteditable="true">${loc}</span></div>
      <div class="c-row"><span class="c-ic">📞</span><span class="c-val" contenteditable="true">${tel}</span></div>
      <div class="c-row"><span class="c-ic">✉️</span><span class="c-val" contenteditable="true">${email}</span></div>
    </div>

    <div class="sb-bl">
      <div class="sb-hd"><div class="sb-ic">🎓</div>EDUCATION</div>
      ${toItems(formRaw)}
    </div>

    <div class="sb-bl">
      <div class="sb-hd"><div class="sb-ic">📁</div>PROJETS</div>
      ${toItems(projRaw)}
    </div>

    <div class="sb-bl">
      <div class="sb-hd"><div class="sb-ic">⚡</div>COMPETENCES</div>
      <div class="comp-txt" contenteditable="true">${compRaw.replace(/\n/g,'<br>') || 'À compléter'}</div>
    </div>

    <div class="sb-bl">
      <div class="sb-hd"><div class="sb-ic">🌐</div>LANGUES</div>
      <div class="lang-row">${langBadges}</div>
    </div>

  </div>
</div>
</body>
</html>`
}

// ════════════════════════════════════════════════════════════════════════════
export default function CVPage() {
  const allowed = usePlanGuard('free')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [mode, setMode] = useState('formulaire')
  const [formData, setFormData] = useState({
    nom: '', titre: '', localisation: '', email: '', telephone: '',
    education: '', experience: '', competences: '', projets: '', langues: '',
  })

  const themes = [
    { name: 'Forêt',    dark: '#1a3a2a', accent: '#e8820c', accentLight: '#f5a94e', iconBg: '#e8820c' },
    { name: 'Nuit',     dark: '#0f172a', accent: '#f97316', accentLight: '#fb923c', iconBg: '#f97316' },
    { name: 'Royal',    dark: '#1e3a8a', accent: '#fbbf24', accentLight: '#fcd34d', iconBg: '#fbbf24' },
    { name: 'Bordeaux', dark: '#4c0519', accent: '#fb7185', accentLight: '#fda4af', iconBg: '#fb7185' },
    { name: 'Ardoise',  dark: '#1e293b', accent: '#38bdf8', accentLight: '#7dd3fc', iconBg: '#38bdf8' },
    { name: 'Violet',   dark: '#2e1065', accent: '#a78bfa', accentLight: '#c4b5fd', iconBg: '#a78bfa' },
    { name: 'Océan',    dark: '#0c4a6e', accent: '#06b6d4', accentLight: '#67e8f9', iconBg: '#06b6d4' },
    { name: 'Cèdre',    dark: '#292524', accent: '#fb923c', accentLight: '#fdba74', iconBg: '#fb923c' },
  ]

  const currentThemeRef = useRef(themes[0])
  const [selectedThemeName, setSelectedThemeName] = useState(themes[0].name)
  const [prompt, setPrompt] = useState('')
  const [cvGenere, setCvGenere] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModel, setShowModel] = useState(false)
  const iframeRef = useRef(null)
  const srcDocRef = useRef('')

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  // ── Prompt that forces a very specific plain-text output ──────────────────
  const buildPrompt = () => {
    if (mode === 'prompt') {
      return `Tu es un expert CV. Génère un CV professionnel à partir de cette description :
${prompt}

RÈGLES ABSOLUES — ne les enfreins jamais :
1. N'utilise AUCUN markdown : pas de **, pas de *, pas de #, pas de ---, pas de backticks.
2. Utilise EXACTEMENT ces titres de sections sur leur propre ligne :
   NOM
   TITRE
   OBJECTIF
   EXPERIENCES
   FORMATION
   PROJETS
   COMPETENCES
   LANGUES
   CONTACT
3. Pour chaque expérience, écris dans cet ordre exact, chaque élément sur sa propre ligne :
   PERIODE: [dates]
   ENTREPRISE: [nom]
   POSTE: [intitulé]
   - [tâche 1]
   - [tâche 2]
   [ligne vide]
4. Texte uniquement. Aucun symbole décoratif sauf les tirets - pour les listes.`
    }

    return `Tu es un expert CV. Génère un CV professionnel avec les informations suivantes.

INFORMATIONS :
Nom : ${formData.nom}
Titre : ${formData.titre}
Localisation : ${formData.localisation}
Email : ${formData.email}
Téléphone : ${formData.telephone}
Langues : ${formData.langues}
Expériences : ${formData.experience}
Formation : ${formData.education}
Projets : ${formData.projets}
Compétences : ${formData.competences}

RÈGLES ABSOLUES — ne les enfreins jamais :
1. N'utilise AUCUN markdown : pas de **, pas de *, pas de #, pas de ---, pas de backticks.
2. Commence le texte EXACTEMENT par ces deux lignes :
   NOM: ${formData.nom || 'Prénom NOM'}
   TITRE: ${formData.titre || 'Professionnel'}
3. Ensuite utilise EXACTEMENT ces titres de sections, chacun sur sa propre ligne :
   OBJECTIF
   EXPERIENCES
   FORMATION
   PROJETS
   COMPETENCES
   LANGUES
   CONTACT
4. Pour chaque expérience, écris dans cet ordre exact, chaque élément sur sa propre ligne :
   PERIODE: [dates]
   ENTREPRISE: [nom en majuscules]
   POSTE: [intitulé]
   - [tâche 1]
   - [tâche 2]
   [ligne vide]
5. Pour CONTACT, écris :
   Localisation: ${formData.localisation || 'Sénégal'}
   Email: ${formData.email || ''}
   Téléphone: ${formData.telephone || ''}
6. Texte uniquement. Aucun symbole décoratif.`
  }

  const handleSubmit = async () => {
    if (!hasCredits(5)) { router.push('/pricing'); return }
    setLoading(true)
    setCvGenere('')
    setShowModel(false)
    srcDocRef.current = ''

    try {
      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'Tu es un expert en rédaction de CV. Tu suis les instructions de formatage à la lettre. Tu ne produis JAMAIS de markdown (pas de **, *, #, ---).',
          prompt: buildPrompt(),
          maxTokens: 2000,
        }),
      })
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Erreur') }
      const data = await response.json()
      await deductCredits(5)
      setCvGenere(data.result)
    } catch (err) {
      setCvGenere('Erreur : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyTheme = useCallback((theme) => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const r = doc.documentElement
    r.style.setProperty('--dark',   theme.dark)
    r.style.setProperty('--accent', theme.accent)
    r.style.setProperty('--acc-lt', theme.accentLight)
    r.style.setProperty('--ic-bg',  theme.iconBg)
  }, [])

  const handleThemeChange = (theme) => {
    currentThemeRef.current = theme
    setSelectedThemeName(theme.name)
    applyTheme(theme)
  }

  const getSrcDoc = useCallback((cvText, fv) => {
    if (srcDocRef.current) return srcDocRef.current
    const html = buildHTML(cvText, fv, currentThemeRef.current)
    srcDocRef.current = html
    return html
  }, [])

  const downloadPDF = () => iframeRef.current?.contentWindow?.print()

  // ── Styles ────────────────────────────────────────────────────────────────
  const activeTab   = { background:'#0f172a', color:'#fff', padding:'8px 20px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'13px' }
  const inactiveTab = { background:'#fff', color:'#6b7280', padding:'8px 20px', borderRadius:'8px', border:'1px solid #e5e7eb', cursor:'pointer', fontSize:'13px' }
  const inp         = { width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'8px 12px', marginBottom:'10px', fontSize:'13px', fontFamily:'inherit', outline:'none', background:'#fff' }

  if (!allowed) return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:44, height:44, background:'#0f172a', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Zap size={20} color="white" fill="white" />
      </div>
      <div style={{ width:24, height:24, border:'2px solid #e2e8f0', borderTop:'2px solid #2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <main style={{ minHeight:'100vh', background:'#f1f5f9', padding:'40px 16px' }}>
      <div style={{ maxWidth:'860px', margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
          <div>
            <h1 style={{ fontSize:'24px', fontWeight:'800', color:'#0f172a', letterSpacing:'-0.3px' }}>Générateur de CV</h1>
            <p style={{ fontSize:'13px', color:'#64748b', marginTop:'2px' }}>Design professionnel · Modifiable · Export PDF</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'#eef2ff', border:'1px solid #c7d2fe', borderRadius:20, padding:'6px 14px' }}>
            <Zap size={13} color="#4f46e5" fill="#4f46e5" />
            <span style={{ fontSize:13, fontWeight:700, color:'#4338ca' }}>{credits} crédits</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
          <button onClick={() => setMode('formulaire')} style={mode==='formulaire' ? activeTab : inactiveTab}>📋 Formulaire</button>
          <button onClick={() => setMode('prompt')}     style={mode==='prompt'      ? activeTab : inactiveTab}>✏️ Prompt libre</button>
        </div>

        {/* Form */}
        {mode === 'formulaire' ? (
          <div style={{ background:'#fff', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom:'16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <input name="nom"          placeholder="Nom complet *"                           onChange={handleChange} style={inp} />
              <input name="titre"        placeholder="Titre / Objectif professionnel *"        onChange={handleChange} style={inp} />
              <input name="localisation" placeholder="Localisation"                            onChange={handleChange} style={inp} />
              <input name="email"        placeholder="Email"                                   onChange={handleChange} style={inp} />
              <input name="telephone"    placeholder="Téléphone"                               onChange={handleChange} style={inp} />
              <input name="langues"      placeholder="Langues (ex: Français, Wolof, Anglais)" onChange={handleChange} style={inp} />
              <textarea name="experience"  placeholder="Expériences : pour chaque poste indiquez l'entreprise, le titre, les dates et les missions" onChange={handleChange} style={{ ...inp, gridColumn:'span 2', height:'120px', resize:'vertical', marginBottom:0 }} />
              <textarea name="education"   placeholder="Formation / Diplômes (un par ligne)"   onChange={handleChange} style={{ ...inp, height:'75px', resize:'vertical', marginBottom:0, marginTop:'10px' }} />
              <textarea name="projets"     placeholder="Projets marquants (un par ligne)"      onChange={handleChange} style={{ ...inp, height:'75px', resize:'vertical', marginBottom:0, marginTop:'10px' }} />
              <textarea name="competences" placeholder="Compétences (une par ligne)"           onChange={handleChange} style={{ ...inp, gridColumn:'span 2', height:'75px', resize:'vertical', marginBottom:0, marginTop:'10px' }} />
            </div>
          </div>
        ) : (
          <div style={{ background:'#fff', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom:'16px' }}>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              style={{ ...inp, height:'160px', resize:'vertical', marginBottom:0 }}
              placeholder="Décris ton parcours, tes compétences, tes expériences..." />
          </div>
        )}

        {/* Credit warning */}
        {credits < 6 && (
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#92400e' }}>
            ⚠️ Crédits faibles (5 requis) —{' '}
            <button onClick={() => router.push('/pricing')} style={{ background:'none', border:'none', color:'#d97706', fontWeight:700, cursor:'pointer', textDecoration:'underline' }}>
              Recharger
            </button>
          </div>
        )}

        {/* Generate */}
        <button onClick={handleSubmit}
          style={{ width:'100%', background: hasCredits(5) ? '#0f172a' : '#94a3b8', color:'#fff', padding:'13px', borderRadius:'12px', border:'none', cursor: hasCredits(5) ? 'pointer' : 'not-allowed', fontWeight:'700', fontSize:'14px' }}
          disabled={loading || !hasCredits(5)}>
          {loading ? '⏳ Génération en cours...' : '1. Générer le CV · ⚡ 5 crédits'}
        </button>

        {/* Result */}
        {cvGenere && (
          <div style={{ marginTop:'28px' }}>
            {!showModel ? (
              <button onClick={() => setShowModel(true)}
                style={{ width:'100%', background:'#059669', color:'#fff', padding:'13px', borderRadius:'12px', border:'none', fontWeight:'700', cursor:'pointer', fontSize:'14px' }}>
                2. Voir le Design & Modifier ►
              </button>
            ) : (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'14px', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>

                {/* Toolbar */}
                <div style={{ padding:'12px 18px', background:'#f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px', borderBottom:'1px solid #e2e8f0' }}>
                  <button onClick={() => setShowModel(false)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>← Retour</button>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center', background:'#fff', padding:'6px 12px', borderRadius:'20px', border:'1px solid #e5e7eb' }}>
                    <span style={{ fontSize:'10px', fontWeight:'700', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1px', marginRight:4 }}>Thème</span>
                    {themes.map(t => (
                      <button key={t.name} onClick={() => handleThemeChange(t)} title={t.name}
                        style={{ width:'24px', height:'24px', borderRadius:'50%', border: selectedThemeName===t.name ? '3px solid #2563eb' : '2px solid transparent', background:`linear-gradient(135deg,${t.dark} 50%,${t.accent} 50%)`, cursor:'pointer', padding:0, boxShadow: selectedThemeName===t.name ? '0 0 0 1px #bfdbfe' : 'none' }}
                      />
                    ))}
                  </div>
                  <button onClick={downloadPDF}
                    style={{ background:'#0f172a', color:'#fff', padding:'7px 18px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'13px' }}>
                    📥 PDF
                  </button>
                </div>

                <iframe key="cv-iframe-stable" ref={iframeRef}
                  srcDoc={getSrcDoc(cvGenere, formData)}
                  style={{ width:'100%', height:'1120px', border:'none' }}
                  title="CV Design"
                />
              </div>
            )}

            {/* Raw text */}
            {!showModel && (
              <div style={{ marginTop:'12px', background:'#fff', padding:'20px', borderRadius:'12px', border:'1px solid #e5e7eb', fontSize:'13px', lineHeight:1.7, color:'#374151', whiteSpace:'pre-wrap', fontFamily:'monospace' }}>
                {cvGenere}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}