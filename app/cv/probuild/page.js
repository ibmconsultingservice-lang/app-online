'use client'

import { useState, useRef, useCallback } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function CVPage() {
  const allowed = usePlanGuard('free')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [mode, setMode] = useState('formulaire')
  const [formData, setFormData] = useState({
    nom: '', localisation: '', education: '', experience: '', competences: '', loisirs: '',
  })

  // Swiss editorial color themes — accent bar + link color only; layout stays ink/paper
  const themes = [
    { name: 'Nuit',     accent: '#0f172a', accentHex: '0f172a', rule: '#0f172a',  tag: '#e2e8f0', tagText: '#0f172a' },
    { name: 'Émeraude', accent: '#065f46', accentHex: '065f46', rule: '#065f46',  tag: '#d1fae5', tagText: '#064e3b' },
    { name: 'Royal',    accent: '#1e3a8a', accentHex: '1e3a8a', rule: '#1e3a8a',  tag: '#dbeafe', tagText: '#1e3a8a' },
    { name: 'Bordeaux', accent: '#881337', accentHex: '881337', rule: '#881337',  tag: '#ffe4e6', tagText: '#4c0519' },
    { name: 'Ardoise',  accent: '#334155', accentHex: '334155', rule: '#334155',  tag: '#e0f2fe', tagText: '#0c4a6e' },
    { name: 'Violet',   accent: '#4c1d95', accentHex: '4c1d95', rule: '#4c1d95',  tag: '#ede9fe', tagText: '#2e1065' },
    { name: 'Cèdre',    accent: '#44403c', accentHex: '44403c', rule: '#44403c',  tag: '#fef3c7', tagText: '#292524' },
    { name: 'Océan',    accent: '#075985', accentHex: '075985', rule: '#075985',  tag: '#cffafe', tagText: '#0c4a6e' },
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

  const handleSubmit = async () => {
    if (!hasCredits(5)) { router.push('/pricing'); return }
    setLoading(true); setCvGenere(''); setShowModel(false); srcDocRef.current = ''
    try {
      let userPrompt = mode === 'formulaire'
        ? `Génère un CV complet, structuré et professionnel :
          Nom : ${formData.nom}, Localisation : ${formData.localisation},
          Formation : ${formData.education}, Expériences : ${formData.experience},
          Compétences : ${formData.competences}, Loisirs : ${formData.loisirs}.
          Formate avec des sections claires (titres en majuscules).`
        : `Génère un CV complet à partir de : ${prompt}. Titres en majuscules, pas de gras.`

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
      console.error("Erreur :", err)
      setCvGenere('Erreur : ' + err.message)
    } finally { setLoading(false) }
  }

  const applyThemeToIframe = useCallback((theme) => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const root = doc.documentElement
    root.style.setProperty('--accent', theme.accent)
    root.style.setProperty('--tag-bg', theme.tag)
    root.style.setProperty('--tag-text', theme.tagText)
  }, [])

  const handleThemeChange = (theme) => {
    currentThemeRef.current = theme
    setSelectedThemeName(theme.name)
    applyThemeToIframe(theme)
  }

  const downloadPDF = () => iframeRef.current?.contentWindow?.print()

  const getOrBuildSrcDoc = useCallback((cvText, formValues) => {
    if (srcDocRef.current) return srcDocRef.current
    const theme = currentThemeRef.current

    const extract = (keywords, text) => {
      const all = "PROFIL|EXPÉRIENCE|EXPERIENCE|FORMATION|ÉTUDES|ETUDES|COMPÉTENCES|COMPETENCES|QUALITÉS|ATOUTS|LOISIRS|CENTRES"
      const pat = new RegExp(`(?:##\\s*|#\\s*|^|\\n)(?:${keywords})[:\\s]*([\\s\\S]*?)(?=\\n(?:##|#|\\s)*(?:${all})|$)`, 'i')
      const m = text.match(pat)
      return m ? m[1].trim().replace(/\n[-•*]\s*/g, '\n• ').replace(/\n/g, '<br>') : ''
    }

    const profil      = extract("PROFIL PROFESSIONNEL|PROFIL", cvText)
    const experiences = extract("EXPÉRIENCES PROFESSIONNELLES|EXPÉRIENCE PROFESSIONNELLE|EXPÉRIENCES|EXPÉRIENCE|EXPERIENCE", cvText)
    const formation   = extract("FORMATION|ÉTUDES|ETUDES|PARCOURS", cvText)
    const compTech    = extract("COMPÉTENCES TECHNIQUES|COMPETENCES TECHNIQUES|COMPÉTENCES|COMPETENCES", cvText)
    const compTrans   = extract("COMPÉTENCES TRANSVERSALES|QUALITÉS PROFESSIONNELLES|ATOUTS|SAVOIR-ÊTRE", cvText)
    const loisirs     = extract("LOISIRS|CENTRES D'INTÉRÊT|HOBBIES", cvText)

    const topText    = cvText.split(/PROFIL|EXP/i)[0]
    const emailMatch = topText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const telMatch   = topText.match(/(?:\+?\d[\d\s-]{7,})/)
    const nom        = formValues.nom || topText.split('\n')[0].trim()

    // Build skill tags from compTech
    const skillTags = compTech
      ? compTech.split(/<br>|•|-|,/).map(s => s.trim()).filter(s => s.length > 1)
        .map(s => `<span class="tag" contenteditable="true">${s}</span>`).join('')
      : '<span class="tag">À préciser</span>'

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap');
:root {
  --accent: ${theme.accent};
  --tag-bg: ${theme.tag};
  --tag-text: ${theme.tagText};
  --ink: #18181b;
  --muted: #71717a;
  --paper: #fafaf9;
  --rule: #d4d4d8;
}
@page { size: A4; margin: 0; }
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: 'DM Sans', sans-serif;
  background: #e4e4e7;
  display: flex; justify-content: center;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.page {
  width: 210mm; min-height: 297mm;
  background: var(--paper);
  display: flex; flex-direction: column;
}

/* ── TOP ACCENT BAR ── */
.bar { height: 6px; background: var(--accent); }

/* ── HEADER ── */
.header {
  padding: 36px 44px 28px;
  border-bottom: 2px solid var(--ink);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 20px;
}
.name-block {}
.name {
  font-family: 'DM Serif Display', serif;
  font-size: 3rem;
  color: var(--ink);
  line-height: 1;
  letter-spacing: -1px;
}
.name-underline {
  height: 3px; width: 60px;
  background: var(--accent);
  margin-top: 10px;
}
.titre-poste {
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--accent);
  margin-top: 10px;
}
.contact-grid {
  display: flex; flex-direction: column; gap: 4px; text-align: right;
}
.contact-item {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 400;
  letter-spacing: 0.3px;
}
.contact-item span { color: var(--ink); font-weight: 500; }
.photo-wrap {
  position: relative; width: 80px; height: 80px;
  border-radius: 4px; overflow: hidden;
  border: 1.5px solid var(--rule);
  cursor: pointer; flex-shrink: 0;
}
.photo-wrap img { width:100%; height:100%; object-fit:cover; }
.photo-wrap:hover::after {
  content: '📷';
  position: absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  background: rgba(0,0,0,0.35);
  font-size:22px;
}
.header-right { display:flex; flex-direction:column; align-items:flex-end; gap:12px; }

/* ── BODY ── */
.body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 2px 2fr;
  gap: 0;
  padding: 0;
}
.divider-v { background: var(--rule); }
.col { padding: 28px 36px; }
.col-left { padding-right: 28px; padding-left: 44px; }
.col-right { padding-left: 28px; padding-right: 44px; }

/* ── SECTION ── */
.section { margin-bottom: 28px; }
.section-label {
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--rule);
  display: block;
}
.text {
  font-size: 0.78rem;
  line-height: 1.75;
  color: var(--ink);
  font-weight: 300;
}

/* ── TAGS ── */
.tags { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
.tag {
  background: var(--tag-bg);
  color: var(--tag-text);
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  padding: 3px 9px;
  border-radius: 2px;
  text-transform: uppercase;
}

/* ── TIMELINE (experience) ── */
.timeline { position:relative; padding-left: 16px; }
.timeline::before {
  content:''; position:absolute;
  left:0; top:6px; bottom:0;
  width:1px; background:var(--rule);
}
.tl-item { position:relative; margin-bottom:16px; }
.tl-dot {
  position:absolute; left:-19px; top:5px;
  width:7px; height:7px;
  border-radius:50%;
  background:var(--accent);
  border: 1.5px solid var(--paper);
  box-shadow: 0 0 0 1px var(--accent);
}
.tl-content {}
.tl-title { font-size:0.78rem; font-weight:500; color:var(--ink); }
.tl-meta { font-size:0.68rem; color:var(--muted); margin:2px 0 4px; letter-spacing:0.5px; }
.tl-body { font-size:0.74rem; color:#52525b; line-height:1.65; font-weight:300; }

/* ── PROFIL BLOCK ── */
.profil-block {
  border-left: 2px solid var(--accent);
  padding-left: 12px;
  margin-bottom: 4px;
}

/* ── FOOTER ── */
.footer {
  border-top: 1px solid var(--rule);
  padding: 10px 44px;
  display:flex; justify-content:space-between; align-items:center;
}
.footer-name { font-size:0.65rem; color:var(--muted); letter-spacing:2px; text-transform:uppercase; }
.footer-page { font-size:0.65rem; color:var(--muted); }

[contenteditable="true"] { outline:none; border-radius:2px; }
[contenteditable="true"]:hover { background:rgba(0,0,0,0.04); cursor:text; }

@media print {
  body { background:none; }
  .page { box-shadow:none; }
}
</style>
</head>
<body>
<div class="page">
  <div class="bar"></div>

  <!-- HEADER -->
  <div class="header">
    <div class="name-block">
      <div class="name" contenteditable="true">${nom || 'Prénom NOM'}</div>
      <div class="name-underline"></div>
      <div class="titre-poste" contenteditable="true">Profil Professionnel</div>
    </div>
    <div class="header-right">
      <div class="photo-wrap" onclick="document.getElementById('fi').click()">
        <img id="profileImg" src="https://ui-avatars.com/api/?name=${encodeURIComponent(nom || 'CV')}&background=${theme.accentHex}&color=fff&size=120" alt="Photo">
        <input type="file" id="fi" style="display:none" accept="image/*" onchange="(r=>{r.onload=e=>document.getElementById('profileImg').src=e.target.result;r.readAsDataURL(this.files[0])})(new FileReader())">
      </div>
      <div class="contact-grid">
        <div class="contact-item">📍 <span contenteditable="true">${formValues.localisation || 'Sénégal'}</span></div>
        <div class="contact-item">📞 <span contenteditable="true">${telMatch ? telMatch[0] : '+221 -- --- -- --'}</span></div>
        <div class="contact-item">✉ <span contenteditable="true">${emailMatch ? emailMatch[0] : 'contact@email.com'}</span></div>
      </div>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">
    <!-- LEFT COL -->
    <div class="col col-left">

      <div class="section">
        <div class="section-label">Compétences</div>
        <div class="tags">${skillTags}</div>
      </div>

      <div class="section">
        <div class="section-label">Atouts</div>
        <div class="text" contenteditable="true">${compTrans || 'À compléter…'}</div>
      </div>

      <div class="section">
        <div class="section-label">Formation</div>
        <div class="text" contenteditable="true">${formation || 'Détails de votre formation…'}</div>
      </div>

      <div class="section">
        <div class="section-label">Loisirs</div>
        <div class="text" contenteditable="true">${loisirs || 'À compléter…'}</div>
      </div>

    </div>

    <div class="divider-v"></div>

    <!-- RIGHT COL -->
    <div class="col col-right">

      <div class="section">
        <div class="section-label">Profil</div>
        <div class="profil-block">
          <div class="text" contenteditable="true">${profil || 'Décrivez votre profil professionnel ici…'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-label">Expériences</div>
        <div class="timeline">
          <div class="tl-item">
            <div class="tl-dot"></div>
            <div class="tl-content">
              <div class="tl-body" contenteditable="true">${experiences || 'Décrivez vos expériences professionnelles…'}</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-name" contenteditable="true">${nom || 'Prénom NOM'}</div>
    <div class="footer-page">CV — 2025</div>
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

  // ── Styles ──
  const s = {
    activeTab:   { background:'#18181b', color:'#fff', padding:'8px 20px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:500 },
    inactiveTab: { background:'#fff', color:'#71717a', padding:'8px 20px', borderRadius:'6px', border:'1px solid #e4e4e7', cursor:'pointer', fontSize:'13px' },
    input:       { width:'100%', border:'1px solid #d4d4d8', borderRadius:'6px', padding:'9px 12px', marginBottom:'10px', fontSize:'14px', fontFamily:'inherit', background:'#fff' },
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
    <main style={{ minHeight:'100vh', background:'#fafafa', padding:'48px 16px', fontFamily:'system-ui, sans-serif' }}>
      <div style={{ maxWidth:'860px', margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'28px' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:600, color:'#18181b', letterSpacing:'-0.3px' }}>Générateur de CV</h1>
            <p style={{ fontSize:'13px', color:'#71717a', marginTop:'2px' }}>Design éditorial suisse — sobre &amp; mémorable</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f4f4f5', border:'1px solid #e4e4e7', borderRadius:20, padding:'6px 14px' }}>
            <Zap size={13} color="#18181b"/>
            <span style={{ fontSize:13, fontWeight:600, color:'#18181b' }}>{credits} crédits</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
          <button onClick={() => setMode('formulaire')} style={mode==='formulaire' ? s.activeTab : s.inactiveTab}>Formulaire</button>
          <button onClick={() => setMode('prompt')} style={mode==='prompt' ? s.activeTab : s.inactiveTab}>Prompt libre</button>
        </div>

        {/* Form / Prompt */}
        <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e4e4e7', padding:'20px', marginBottom:'16px' }}>
          {mode === 'formulaire' ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <input name="nom" placeholder="Nom complet" onChange={handleChange} style={s.input}/>
              <input name="localisation" placeholder="Localisation" onChange={handleChange} style={s.input}/>
              <input name="education" placeholder="Formation" onChange={handleChange} style={s.input}/>
              <input name="competences" placeholder="Compétences clés" onChange={handleChange} style={s.input}/>
              <textarea name="experience" placeholder="Expériences professionnelles" onChange={handleChange}
                style={{ ...s.input, gridColumn:'span 2', height:'90px', resize:'vertical' }}/>
              <input name="loisirs" placeholder="Loisirs & centres d'intérêt" onChange={handleChange}
                style={{ ...s.input, gridColumn:'span 2' }}/>
            </div>
          ) : (
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)}
              style={{ ...s.input, height:'150px', marginBottom:0, resize:'vertical' }}
              placeholder="Décris ton parcours en quelques lignes…"/>
          )}
        </div>

        {/* Low credits */}
        {credits < 2 && (
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#92400e' }}>
            ⚠️ Crédits insuffisants —{' '}
            <button onClick={() => router.push('/pricing')} style={{ background:'none', border:'none', color:'#d97706', fontWeight:600, cursor:'pointer', textDecoration:'underline' }}>
              Recharger
            </button>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleSubmit}
          style={{ width:'100%', background: hasCredits(2) ? '#18181b' : '#a1a1aa', color:'#fff', padding:'13px', borderRadius:'10px', border:'none', cursor: hasCredits(2) ? 'pointer' : 'not-allowed', fontWeight:500, fontSize:'15px', letterSpacing:'0.2px' }}
          disabled={loading || !hasCredits(2)}>
          {loading ? 'Génération en cours…' : '1. Générer le texte  ·  ⚡ 5 crédits'}
        </button>

        {/* CV result */}
        {cvGenere && (
          <div style={{ marginTop:'28px' }}>
            {!showModel ? (
              <>
                <button onClick={() => setShowModel(true)}
                  style={{ width:'100%', background:'#18181b', color:'#fff', padding:'13px', borderRadius:'10px', border:'2px solid #18181b', fontWeight:500, fontSize:'15px', cursor:'pointer', marginBottom:'14px' }}>
                  2. Voir le design &amp; modifier →
                </button>
                <div style={{ background:'#fff', padding:'20px', borderRadius:'12px', border:'1px solid #e4e4e7', fontSize:'13px', lineHeight:1.8, color:'#3f3f46', whiteSpace:'pre-wrap' }}>
                  {cvGenere}
                </div>
              </>
            ) : (
              <div style={{ background:'#fff', border:'1px solid #e4e4e7', borderRadius:'12px', overflow:'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding:'12px 16px', background:'#f4f4f5', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px', borderBottom:'1px solid #e4e4e7' }}>
                  <button onClick={() => setShowModel(false)}
                    style={{ background:'none', border:'none', color:'#71717a', cursor:'pointer', fontSize:'13px', fontWeight:500 }}>
                    ← Retour
                  </button>

                  {/* Theme picker */}
                  <div style={{ display:'flex', gap:'5px', alignItems:'center', background:'#fff', padding:'5px 10px', borderRadius:'20px', border:'1px solid #e4e4e7' }}>
                    <span style={{ fontSize:'10px', fontWeight:600, color:'#a1a1aa', textTransform:'uppercase', letterSpacing:'1px', marginRight:'4px' }}>Thème</span>
                    {themes.map(t => (
                      <button key={t.name} onClick={() => handleThemeChange(t)} title={t.name}
                        style={{
                          width:'22px', height:'22px', borderRadius:'50%',
                          background: t.accent,
                          border: selectedThemeName === t.name ? `3px solid ${t.accent}` : '2px solid transparent',
                          outline: selectedThemeName === t.name ? '2px solid #fff' : 'none',
                          boxShadow: selectedThemeName === t.name ? `0 0 0 3px ${t.accent}40` : 'none',
                          cursor:'pointer', padding:0,
                        }}/>
                    ))}
                  </div>

                  <button onClick={downloadPDF}
                    style={{ background:'#18181b', color:'#fff', padding:'6px 16px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:500, fontSize:'13px' }}>
                    ↓ Télécharger PDF
                  </button>
                </div>

                <iframe
                  key="cv-iframe-stable"
                  ref={iframeRef}
                  srcDoc={getOrBuildSrcDoc(cvGenere, formData)}
                  style={{ width:'100%', height:'1120px', border:'none' }}
                  title="CV Design"
                />
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}