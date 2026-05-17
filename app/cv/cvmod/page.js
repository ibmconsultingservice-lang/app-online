'use client'

import { useState, useRef, useCallback } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function ProBuildPage() {
  const allowed = usePlanGuard('free')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [mode, setMode] = useState('formulaire')
  const [formData, setFormData] = useState({
    nom: '', poste: '', localisation: '', email: '', tel: '',
    education: '', experience: '', competences: '', loisirs: '',
  })

  // Color palettes: each has a name + 3 coordinated tones
  const palettes = [
    { name: 'Obsidian',  bg: '#0f0f0f', panel: '#1a1a1a', accent: '#e8d5b0', text: '#f5f0e8', muted: '#888',   light: '#f9f5ef' },
    { name: 'Ivory',     bg: '#faf8f4', panel: '#f0ece3', accent: '#2c2c2c', text: '#1a1a1a', muted: '#888',   light: '#fff'    },
    { name: 'Forest',    bg: '#0d1f17', panel: '#132a1e', accent: '#a8c5a0', text: '#e8f0e4', muted: '#6a9e70', light: '#edf5ea' },
    { name: 'Cobalt',    bg: '#0a1628', panel: '#0e1e38', accent: '#7eb8f7', text: '#dceeff', muted: '#4a7db5', light: '#e8f2ff' },
    { name: 'Burgundy',  bg: '#1a0810', panel: '#280f1a', accent: '#e8a0b4', text: '#fce8ef', muted: '#a05070', light: '#fceef3' },
    { name: 'Slate',     bg: '#f0f2f5', panel: '#e4e8ed', accent: '#2d3f55', text: '#1a2535', muted: '#7a8fa8', light: '#fff'    },
    { name: 'Amber',     bg: '#1c1200', panel: '#2a1c00', accent: '#f5c842', text: '#fff8e0', muted: '#b08a20', light: '#fffaed' },
    { name: 'Rose',      bg: '#fdf4f4', panel: '#f9eaea', accent: '#c0392b', text: '#1a0a0a', muted: '#a07070', light: '#fff'    },
  ]

  const currentThemeRef = useRef(palettes[0])
  const [selectedPalette, setSelectedPalette] = useState(palettes[0].name)
  const [prompt, setPrompt] = useState('')
  const [cvGenere, setCvGenere] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModel, setShowModel] = useState(false)
  const iframeRef = useRef(null)
  const srcDocRef = useRef('')

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async () => {
    if (!hasCredits(5)) { router.push('/pricing'); return }
    setLoading(true); setCvGenere(''); setShowModel(false); srcDocRef.current = ''
    try {
      const userPrompt = mode === 'formulaire'
        ? `Génère un CV complet et professionnel :
          Nom : ${formData.nom}, Poste visé : ${formData.poste},
          Localisation : ${formData.localisation}, Email : ${formData.email}, Tél : ${formData.tel},
          Formation : ${formData.education}, Expériences : ${formData.experience},
          Compétences : ${formData.competences}, Loisirs : ${formData.loisirs}.
          Structure : PROFIL, EXPÉRIENCES, FORMATION, COMPÉTENCES, LOISIRS (titres en majuscules).`
        : `Génère un CV complet à partir de : ${prompt}. N'utilise pas de gras, juste du texte avec les titres en majuscules.`

      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: "Tu es un expert en rédaction de CV professionnels.", prompt: userPrompt, maxTokens: 1500 })
      })
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Erreur serveur') }
      const data = await response.json()
      await deductCredits(5)
      setCvGenere(data.result)
    } catch (err) {
      console.error(err)
      setCvGenere('Erreur : ' + err.message)
    } finally { setLoading(false) }
  }

  const applyThemeToIframe = useCallback((p) => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const r = doc.documentElement
    r.style.setProperty('--bg', p.bg)
    r.style.setProperty('--panel', p.panel)
    r.style.setProperty('--accent', p.accent)
    r.style.setProperty('--text', p.text)
    r.style.setProperty('--muted', p.muted)
    r.style.setProperty('--light', p.light)
  }, [])

  const handlePaletteChange = (p) => {
    currentThemeRef.current = p
    setSelectedPalette(p.name)
    applyThemeToIframe(p)
  }

  const downloadPDF = () => iframeRef.current?.contentWindow?.print()

  const getOrBuildSrcDoc = useCallback((cvText, fv) => {
    if (srcDocRef.current) return srcDocRef.current
    const p = currentThemeRef.current

    const extract = (keys, text) => {
      const all = "PROFIL|EXPÉRIENCE|EXPERIENCE|FORMATION|ÉTUDES|COMPÉTENCES|COMPETENCES|ATOUTS|LOISIRS|CENTRES"
      const pat = new RegExp(`(?:##?\\s*|^|\\n)(?:${keys})[:\\s]*([\\s\\S]*?)(?=\\n(?:##?|\\s)*(?:${all})|$)`, 'i')
      const m = text.match(pat)
      return m ? m[1].trim().replace(/\n[-•*]\s*/g, '\n• ').replace(/\n/g, '<br>') : ''
    }

    const profil  = extract("PROFIL PROFESSIONNEL|PROFIL", cvText)
    const exps    = extract("EXPÉRIENCES PROFESSIONNELLES|EXPÉRIENCE PROFESSIONNELLE|EXPÉRIENCES|EXPÉRIENCE|EXPERIENCE", cvText)
    const form    = extract("FORMATION|ÉTUDES|ETUDES|PARCOURS", cvText)
    const comp    = extract("COMPÉTENCES TECHNIQUES|COMPETENCES TECHNIQUES|COMPÉTENCES|COMPETENCES", cvText)
    const loisirs = extract("LOISIRS|CENTRES D'INTÉRÊT|HOBBIES", cvText)

    const topText = cvText.split(/PROFIL|EXP/i)[0]
    const emailVal = fv.email || (topText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) || [])[0] || 'email@domaine.com'
    const telVal   = fv.tel   || (topText.match(/(?:\+?\d[\d\s-]{7,})/) || [])[0] || '+221 -- --- -- --'
    const nom      = fv.nom   || topText.split('\n')[0].trim() || 'Prénom NOM'
    const poste    = fv.poste || 'Profil Professionnel'
    const loc      = fv.localisation || 'Sénégal'

    // Build skill tags
    const tags = comp
      ? comp.split(/<br>|•|-|,/).map(s => s.trim()).filter(s => s.length > 1)
        .map(s => `<div class="skill-chip" contenteditable="true">${s}</div>`).join('')
      : '<div class="skill-chip">À préciser</div>'

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500&display=swap');
:root {
  --bg:     ${p.bg};
  --panel:  ${p.panel};
  --accent: ${p.accent};
  --text:   ${p.text};
  --muted:  ${p.muted};
  --light:  ${p.light};
}
@page { size: A4; margin: 0; }
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
body {
  background: #d0d0d0;
  display: flex; justify-content: center;
  font-family: 'Inter', sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── PAGE ── */
.page {
  width: 210mm; min-height: 297mm;
  background: var(--bg);
  display: grid;
  grid-template-columns: 82mm 1fr;
  position: relative;
  overflow: hidden;
}

/* ── LEFT PHOTO COLUMN ── */
.col-photo {
  position: relative;
  background: var(--panel);
  display: flex;
  flex-direction: column;
  min-height: 297mm;
}

/* Photo container — top 55% of left col */
.photo-zone {
  position: relative;
  width: 100%;
  padding-top: 125%; /* tall portrait aspect */
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}
.photo-zone img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}
/* Gradient fade from photo into panel */
.photo-zone::after {
  content: '';
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 80px;
  background: linear-gradient(to bottom, transparent, var(--panel));
  pointer-events: none;
}
.photo-zone:hover .photo-overlay { opacity: 1; }
.photo-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.45);
  opacity: 0;
  transition: opacity 0.2s;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  z-index: 2;
}

/* Name banner overlapping photo bottom */
.name-banner {
  padding: 10px 22px 20px;
  margin-top: -2px;
}
.name-banner .first { 
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.1rem;
  font-weight: 300;
  color: var(--text);
  letter-spacing: 2px;
  line-height: 1;
  display: block;
}
.name-banner .last {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.1rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 2px;
  line-height: 1.1;
  display: block;
}
.name-banner .poste {
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 8px;
  display: block;
}

/* Decorative accent rule */
.accent-rule {
  width: 36px; height: 2px;
  background: var(--accent);
  margin: 12px 22px;
  border-radius: 1px;
}

/* Left section */
.left-section { padding: 0 22px 18px; }
.left-label {
  font-size: 0.55rem;
  font-weight: 500;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 10px;
  opacity: 0.85;
}
.contact-list { display: flex; flex-direction: column; gap: 8px; }
.contact-row {
  display: flex; align-items: flex-start; gap: 8px;
}
.c-icon { font-size: 10px; color: var(--accent); margin-top: 2px; flex-shrink: 0; }
.c-val { font-size: 0.7rem; color: var(--text); font-weight: 300; line-height: 1.4; opacity: 0.9; }

/* Skill chips */
.skill-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
.skill-chip {
  font-size: 0.58rem;
  font-weight: 500;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--bg);
  background: var(--accent);
  padding: 3px 8px;
  border-radius: 2px;
  opacity: 0.9;
}

.left-text { font-size: 0.72rem; color: var(--text); font-weight: 300; line-height: 1.75; opacity: 0.85; }

/* ── RIGHT CONTENT COLUMN ── */
.col-content {
  background: var(--light);
  padding: 42px 34px 42px 30px;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 297mm;
}

/* Profil block */
.profil-intro {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.profil-tag {
  font-size: 0.55rem;
  font-weight: 500;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--bg);
  background: var(--bg);
  padding: 3px 10px;
  border-radius: 2px;
  display: inline-block;
  margin-bottom: 12px;
  opacity: 0.75;
}
.profil-text {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.0rem;
  font-weight: 400;
  font-style: italic;
  color: #333;
  line-height: 1.8;
  letter-spacing: 0.2px;
}

/* Right section block */
.r-section { margin-bottom: 22px; }
.r-label {
  font-size: 0.55rem;
  font-weight: 500;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.r-label::after { content: ''; flex: 1; height: 0.5px; background: rgba(0,0,0,0.12); }

/* Timeline */
.tl-entry { position: relative; padding-left: 16px; margin-bottom: 14px; }
.tl-entry::before {
  content: '';
  position: absolute; left: 0; top: 6px;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--bg);
  border: 1px solid var(--bg);
  opacity: 0.4;
}
.tl-entry::after {
  content: '';
  position: absolute; left: 2px; top: 14px; bottom: -14px;
  width: 1px; background: rgba(0,0,0,0.1);
}
.tl-entry:last-child::after { display: none; }
.tl-body { font-size: 0.77rem; color: #444; font-weight: 300; line-height: 1.7; }

/* Formation pills */
.form-row {
  display: flex; align-items: flex-start; gap: 10px;
  margin-bottom: 10px;
}
.form-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--bg);
  opacity: 0.4;
  margin-top: 6px;
  flex-shrink: 0;
}
.form-text { font-size: 0.77rem; color: #444; font-weight: 300; line-height: 1.7; }

/* Loisirs tags on right */
.loisirs-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.loisir-tag {
  font-size: 0.62rem;
  color: #555;
  border: 0.5px solid rgba(0,0,0,0.2);
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 400;
}

/* Geometric accent on right col */
.geo-accent {
  position: absolute;
  bottom: 60px; right: -30px;
  width: 120px; height: 120px;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 50%;
  pointer-events: none;
}
.geo-accent2 {
  position: absolute;
  bottom: 80px; right: -10px;
  width: 70px; height: 70px;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 50%;
  pointer-events: none;
}

[contenteditable="true"] { outline: none; border-radius: 2px; }
[contenteditable="true"]:hover { background: rgba(0,0,0,0.04); cursor: text; }

@media print {
  body { background: none; }
  .page { box-shadow: none; }
  [contenteditable]:hover { background: transparent; }
}
</style>
</head>
<body>
<div class="page">

  <!-- ── LEFT COLUMN ── -->
  <div class="col-photo">

    <!-- Photo -->
    <div class="photo-zone" onclick="document.getElementById('fi').click()">
      <img id="profileImg"
        src="https://ui-avatars.com/api/?name=${encodeURIComponent(nom)}&background=${p.accent.replace('#','')}&color=${p.bg.replace('#','')}&size=300&bold=true&format=svg"
        alt="Photo de profil">
      <div class="photo-overlay">📷</div>
      <input type="file" id="fi" style="display:none" accept="image/*">
    </div>

    <!-- Name -->
    <div class="name-banner">
      <span class="first" contenteditable="true">${nom.split(' ')[0] || 'Prénom'}</span>
      <span class="last" contenteditable="true">${nom.split(' ').slice(1).join(' ') || 'NOM'}</span>
      <span class="poste" contenteditable="true">${poste}</span>
    </div>

    <div class="accent-rule"></div>

    <!-- Contact -->
    <div class="left-section">
      <div class="left-label">Contact</div>
      <div class="contact-list">
        <div class="contact-row">
          <div class="c-icon">📍</div>
          <div class="c-val" contenteditable="true">${loc}</div>
        </div>
        <div class="contact-row">
          <div class="c-icon">✉</div>
          <div class="c-val" contenteditable="true">${emailVal}</div>
        </div>
        <div class="contact-row">
          <div class="c-icon">📞</div>
          <div class="c-val" contenteditable="true">${telVal}</div>
        </div>
      </div>
    </div>

    <div class="accent-rule"></div>

    <!-- Skills -->
    <div class="left-section">
      <div class="left-label">Compétences</div>
      <div class="skill-chips">${tags}</div>
    </div>

    <div class="accent-rule"></div>

    <!-- Loisirs (left) -->
    <div class="left-section">
      <div class="left-label">Loisirs</div>
      <div class="left-text" contenteditable="true">${loisirs || 'À compléter…'}</div>
    </div>

  </div>

  <!-- ── RIGHT COLUMN ── -->
  <div class="col-content" style="position:relative;">
    <div class="geo-accent"></div>
    <div class="geo-accent2"></div>

    <!-- Profil -->
    <div class="profil-intro">
      <div class="profil-tag" style="background:var(--bg);color:var(--light);">Profil</div>
      <div class="profil-text" contenteditable="true">${profil || 'Décrivez votre profil professionnel ici, mettez en avant vos ambitions et ce qui vous distingue…'}</div>
    </div>

    <!-- Expériences -->
    <div class="r-section">
      <div class="r-label">Expériences</div>
      <div class="tl-entry">
        <div class="tl-body" contenteditable="true">${exps || 'Décrivez vos expériences professionnelles…'}</div>
      </div>
    </div>

    <!-- Formation -->
    <div class="r-section">
      <div class="r-label">Formation</div>
      <div class="form-row">
        <div class="form-dot"></div>
        <div class="form-text" contenteditable="true">${form || 'Détails de votre parcours académique…'}</div>
      </div>
    </div>

  </div>
</div>

<script>
  document.getElementById('fi').addEventListener('change', function() {
    if (this.files && this.files[0]) {
      const r = new FileReader()
      r.onload = e => document.getElementById('profileImg').src = e.target.result
      r.readAsDataURL(this.files[0])
    }
  })
</script>
</body>
</html>`

    srcDocRef.current = html
    return html
  }, [])

  // UI styles
  const S = {
    card:     { background:'#fff', borderRadius:'12px', border:'1px solid #e4e4e7', padding:'20px' },
    input:    { width:'100%', border:'1px solid #d4d4d8', borderRadius:'8px', padding:'9px 12px', fontSize:'14px', fontFamily:'inherit', background:'#fff', marginBottom:'10px' },
    btnPri:   { width:'100%', background:'#18181b', color:'#fff', padding:'13px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:500, fontSize:'15px' },
    btnDis:   { width:'100%', background:'#a1a1aa', color:'#fff', padding:'13px', borderRadius:'10px', border:'none', cursor:'not-allowed', fontWeight:500, fontSize:'15px' },
    tabOn:    { background:'#18181b', color:'#fff', padding:'8px 20px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:500 },
    tabOff:   { background:'#fff', color:'#71717a', padding:'8px 20px', borderRadius:'6px', border:'1px solid #e4e4e7', cursor:'pointer', fontSize:'13px' },
  }

  if (!allowed) return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:44, height:44, background:'#18181b', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div style={{ width:24, height:24, border:'2px solid #e4e4e7', borderTop:'2px solid #18181b', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <main style={{ minHeight:'100vh', background:'#0f0f0f', padding:'48px 16px', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ maxWidth:'880px', margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'32px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <a href="/cv" style={{ fontSize:'12px', color:'#71717a', textDecoration:'none' }}>← Retour</a>
              <span style={{ fontSize:'12px', color:'#3f3f46' }}>/</span>
              <span style={{ fontSize:'12px', color:'#a1a1aa' }}>ProBuild</span>
            </div>
            <h1 style={{ fontSize:'24px', fontWeight:600, color:'#fafafa', letterSpacing:'-0.3px' }}>
              ProBuild CV
              <span style={{ marginLeft:8, fontSize:'11px', fontWeight:500, letterSpacing:'3px', textTransform:'uppercase', color:'#a78bfa', verticalAlign:'middle' }}>
                Studio
              </span>
            </h1>
            <p style={{ fontSize:'13px', color:'#71717a', marginTop:2 }}>Design éditorial · Grande photo · Palettes premium</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'#1c1c1c', border:'1px solid #2a2a2a', borderRadius:20, padding:'6px 14px' }}>
            <Zap size={13} color="#a78bfa"/>
            <span style={{ fontSize:13, fontWeight:600, color:'#e4e4e7' }}>{credits} crédits</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
          <button onClick={() => setMode('formulaire')} style={mode==='formulaire' ? S.tabOn : {...S.tabOff, background:'#1c1c1c', color:'#a1a1aa', borderColor:'#2a2a2a'}}>Formulaire</button>
          <button onClick={() => setMode('prompt')} style={mode==='prompt' ? S.tabOn : {...S.tabOff, background:'#1c1c1c', color:'#a1a1aa', borderColor:'#2a2a2a'}}>Prompt libre</button>
        </div>

        {/* Form */}
        <div style={{ ...S.card, background:'#141414', border:'1px solid #232323', marginBottom:'16px' }}>
          {mode === 'formulaire' ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              {[
                { name:'nom',          placeholder:'Nom complet' },
                { name:'poste',        placeholder:'Poste visé (ex : Ingénieur Data)' },
                { name:'localisation', placeholder:'Localisation' },
                { name:'email',        placeholder:'Email' },
                { name:'tel',          placeholder:'Téléphone' },
              ].map(f => (
                <input key={f.name} name={f.name} placeholder={f.placeholder} onChange={handleChange}
                  style={{ ...S.input, background:'#1c1c1c', border:'1px solid #2a2a2a', color:'#e4e4e7', marginBottom:0 }}/>
              ))}
              <textarea name="education" placeholder="Formation académique" onChange={handleChange}
                style={{ ...S.input, background:'#1c1c1c', border:'1px solid #2a2a2a', color:'#e4e4e7', height:'80px', resize:'vertical', marginBottom:0 }}/>
              <textarea name="experience" placeholder="Expériences professionnelles" onChange={handleChange}
                style={{ ...S.input, background:'#1c1c1c', border:'1px solid #2a2a2a', color:'#e4e4e7', gridColumn:'span 2', height:'90px', resize:'vertical', marginBottom:0 }}/>
              <textarea name="competences" placeholder="Compétences clés" onChange={handleChange}
                style={{ ...S.input, background:'#1c1c1c', border:'1px solid #2a2a2a', color:'#e4e4e7', height:'70px', resize:'vertical', marginBottom:0 }}/>
              <input name="loisirs" placeholder="Loisirs & centres d'intérêt" onChange={handleChange}
                style={{ ...S.input, background:'#1c1c1c', border:'1px solid #2a2a2a', color:'#e4e4e7', marginBottom:0 }}/>
            </div>
          ) : (
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Décris ton parcours en quelques lignes…"
              style={{ ...S.input, background:'#1c1c1c', border:'1px solid #2a2a2a', color:'#e4e4e7', height:'150px', resize:'vertical', marginBottom:0 }}/>
          )}
        </div>

        {credits < 2 && (
          <div style={{ background:'#1c1400', border:'1px solid #3d2e00', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#fcd34d' }}>
            ⚠️ Crédits insuffisants —{' '}
            <button onClick={() => router.push('/pricing')} style={{ background:'none', border:'none', color:'#f59e0b', fontWeight:600, cursor:'pointer', textDecoration:'underline' }}>
              Recharger
            </button>
          </div>
        )}

        <button onClick={handleSubmit} style={hasCredits(2) ? S.btnPri : S.btnDis} disabled={loading || !hasCredits(2)}>
          {loading ? 'Génération en cours…' : '1. Générer le CV  ·  ⚡ 2 crédits'}
        </button>

        {/* CV Result */}
        {cvGenere && (
          <div style={{ marginTop:'28px' }}>
            {!showModel ? (
              <>
                <button onClick={() => setShowModel(true)}
                  style={{ ...S.btnPri, background:'linear-gradient(135deg,#6366f1,#a855f7)', marginBottom:'14px', fontSize:'15px' }}>
                  2. Voir le design ProBuild →
                </button>
                <div style={{ background:'#141414', border:'1px solid #232323', padding:'20px', borderRadius:'12px', fontSize:'13px', lineHeight:1.8, color:'#a1a1aa', whiteSpace:'pre-wrap' }}>
                  {cvGenere}
                </div>
              </>
            ) : (
              <div style={{ background:'#141414', border:'1px solid #232323', borderRadius:'12px', overflow:'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding:'12px 16px', background:'#1c1c1c', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px', borderBottom:'1px solid #2a2a2a' }}>
                  <button onClick={() => setShowModel(false)}
                    style={{ background:'none', border:'none', color:'#71717a', cursor:'pointer', fontSize:'13px', fontWeight:500 }}>
                    ← Retour
                  </button>

                  {/* Palette selector */}
                  <div style={{ display:'flex', gap:'6px', alignItems:'center', background:'#141414', padding:'6px 12px', borderRadius:'20px', border:'1px solid #2a2a2a' }}>
                    <span style={{ fontSize:'10px', fontWeight:600, color:'#71717a', textTransform:'uppercase', letterSpacing:'1px', marginRight:'4px' }}>Palette</span>
                    {palettes.map(pal => (
                      <button key={pal.name} onClick={() => handlePaletteChange(pal)} title={pal.name}
                        style={{
                          width:'24px', height:'24px', borderRadius:'50%',
                          background: pal.bg,
                          border: selectedPalette === pal.name ? `3px solid ${pal.accent}` : '2px solid #3a3a3a',
                          boxShadow: selectedPalette === pal.name ? `0 0 0 1px ${pal.accent}60` : 'none',
                          cursor:'pointer', padding:0, position:'relative', overflow:'hidden',
                        }}>
                        <span style={{ position:'absolute', inset:0, background: pal.accent, clipPath:'polygon(100% 0,100% 100%,0 100%)' }}></span>
                      </button>
                    ))}
                  </div>

                  <button onClick={downloadPDF}
                    style={{ background:'#fafafa', color:'#0f0f0f', padding:'6px 16px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:500, fontSize:'13px' }}>
                    ↓ PDF
                  </button>
                </div>

                {/* CV iframe */}
                <iframe
                  key="cv-probuild-stable"
                  ref={iframeRef}
                  srcDoc={getOrBuildSrcDoc(cvGenere, formData)}
                  style={{ width:'100%', height:'1140px', border:'none', display:'block' }}
                  title="ProBuild CV"
                />
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
