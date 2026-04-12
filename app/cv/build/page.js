'use client'

import { useState, useRef, useCallback } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function CVPage() {
  const allowed = usePlanGuard('starter')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [mode, setMode] = useState('formulaire')
  const [formData, setFormData] = useState({
    nom: '', localisation: '', education: '', experience: '', competences: '', loisirs: '',
  })

  const themes = [
    { name: 'Nuit',     dark: '#0f172a', sidebar: '#1e293b', accent: '#f97316', textLight: '#e2e8f0', sectionBg: '#f8fafc', headingColor: '#0f172a' },
    { name: 'Émeraude', dark: '#064e3b', sidebar: '#065f46', accent: '#34d399', textLight: '#d1fae5', sectionBg: '#f0fdf4', headingColor: '#064e3b' },
    { name: 'Royal',    dark: '#1e3a8a', sidebar: '#1e40af', accent: '#fbbf24', textLight: '#dbeafe', sectionBg: '#eff6ff', headingColor: '#1e3a8a' },
    { name: 'Bordeaux', dark: '#4c0519', sidebar: '#881337', accent: '#fb7185', textLight: '#ffe4e6', sectionBg: '#fff1f2', headingColor: '#4c0519' },
    { name: 'Ardoise',  dark: '#1e293b', sidebar: '#334155', accent: '#38bdf8', textLight: '#e0f2fe', sectionBg: '#f0f9ff', headingColor: '#1e293b' },
    { name: 'Violet',   dark: '#2e1065', sidebar: '#4c1d95', accent: '#a78bfa', textLight: '#ede9fe', sectionBg: '#f5f3ff', headingColor: '#2e1065' },
    { name: 'Cèdre',    dark: '#292524', sidebar: '#44403c', accent: '#fb923c', textLight: '#fef3c7', sectionBg: '#fffbeb', headingColor: '#292524' },
    { name: 'Océan',    dark: '#0c4a6e', sidebar: '#075985', accent: '#06b6d4', textLight: '#cffafe', sectionBg: '#ecfeff', headingColor: '#0c4a6e' },
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
    // ── Credit check ──────────────────────────
    if (!hasCredits(5)) {
      router.push('/pricing')
      return
    }

    setLoading(true)
    setCvGenere('')
    setShowModel(false)
    srcDocRef.current = ''

    try {
      let userPrompt = ""

      if (mode === 'formulaire') {
        userPrompt = `Génère un CV complet, structuré et professionnel à partir des informations suivantes :
        Nom : ${formData.nom}
        Localisation : ${formData.localisation}
        Formation : ${formData.education}
        Expériences : ${formData.experience}
        Compétences : ${formData.competences}
        Loisirs : ${formData.loisirs}
        Formate le CV avec des sections claires (titres en majuscules).`
      } else {
        userPrompt = `Génère un CV complet à partir de cette description : ${prompt}. 
        N'utilise pas de gras, juste du texte avec les titres en majuscules.`
      }

      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: "Tu es un expert en rédaction de CV professionnels.",
          prompt: userPrompt,
          maxTokens: 1500
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Erreur serveur')
      }

      const data = await response.json()
      // ── Deduct after success ──────────────
      await deductCredits(5)
      setCvGenere(data.result)

    } catch (err) {
      console.error("Erreur lors de la génération :", err)
      setCvGenere('Erreur : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyThemeToIframe = useCallback((theme) => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const root = doc.documentElement
    root.style.setProperty('--dark-blue', theme.dark)
    root.style.setProperty('--sidebar-bg', theme.sidebar)
    root.style.setProperty('--accent-orange', theme.accent)
    root.style.setProperty('--text-light', theme.textLight)
    root.style.setProperty('--section-bg', theme.sectionBg)
    root.style.setProperty('--heading-color', theme.headingColor)
  }, [])

  const handleThemeChange = (theme) => {
    currentThemeRef.current = theme
    setSelectedThemeName(theme.name)
    applyThemeToIframe(theme)
  }

  const downloadPDF = () => {
    iframeRef.current?.contentWindow?.print()
  }

  const getOrBuildSrcDoc = useCallback((cvText, formValues) => {
    if (srcDocRef.current) return srcDocRef.current

    const theme = currentThemeRef.current

    const extractSection = (keywords, text) => {
      const allTitles = "PROFIL|EXPÉRIENCE|EXPERIENCE|FORMATION|ÉTUDES|ETUDES|PARCOURS|COMPÉTENCES|COMPETENCES|QUALITÉS|ATOUTS|LOISIRS|CENTRES"
      const pattern = new RegExp(
        `(?:##\\s*|#\\s*|^|\\n)(?:${keywords})[:\\s]*([\\s\\S]*?)(?=\\n(?:##|#|\\s)*(?:${allTitles})|$)`, 'i'
      )
      const match = text.match(pattern)
      if (!match) return ""
      return match[1].trim().replace(/\n[-•*]\s*/g, '<br>• ').replace(/\n/g, '<br>')
    }

    const profil      = extractSection("PROFIL PROFESSIONNEL|PROFIL", cvText)
    const experiences = extractSection("EXPÉRIENCES PROFESSIONNELLES|EXPÉRIENCE PROFESSIONNELLE|EXPÉRIENCES|EXPÉRIENCE|EXPERIENCES PROFESSIONNELLES|EXPERIENCE", cvText)
    const formation   = extractSection("FORMATION|ÉTUDES|ETUDES|PARCOURS", cvText)
    const compTech    = extractSection("COMPÉTENCES TECHNIQUES|COMPETENCES TECHNIQUES|COMPÉTENCES|COMPETENCES", cvText)
    const compTrans   = extractSection("COMPÉTENCES TRANSVERSALES|QUALITÉS PROFESSIONNELLES|ATOUTS|SAVOIR-ÊTRE", cvText)
    const loisirs     = extractSection("LOISIRS|CENTRES D'INTÉRÊT|HOBBIES", cvText)

    const topText    = cvText.split(/PROFIL|EXP/i)[0]
    const emailMatch = topText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const telMatch   = topText.match(/(?:\+?\d[\d\s-]{7,})/)
    const nomAffiche = formValues.nom || topText.split('\n')[0].trim()

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
    :root {
      --dark-blue: ${theme.dark};
      --sidebar-bg: ${theme.sidebar};
      --accent-orange: ${theme.accent};
      --text-light: ${theme.textLight};
      --section-bg: ${theme.sectionBg};
      --heading-color: ${theme.headingColor};
      --text-gray: #475569;
    }
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
    body { background: #e2e8f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; justify-content: center; }
    [contenteditable="true"] { outline: none; transition: background 0.2s; border-radius: 3px; padding: 2px; }
    [contenteditable="true"]:hover { background: rgba(0,0,0,0.06); cursor: text; }
    .container { width: 210mm; min-height: 297mm; background: #fff; display: grid; grid-template-columns: 72mm 138mm; }
    .left_side { background: var(--dark-blue); color: var(--text-light); padding: 36px 22px; display: flex; flex-direction: column; gap: 18px; }
    .imgBx { text-align: center; cursor: pointer; position: relative; }
    .imgBx img { width: 120px; height: 120px; border-radius: 50%; border: 3px solid var(--accent-orange); object-fit: cover; }
    .imgBx:hover img { opacity: 0.75; }
    .imgBx::after { content: '📷'; position: absolute; top: 40px; left: 50%; transform: translateX(-50%); font-size: 22px; opacity: 0; transition: opacity 0.2s; }
    .imgBx:hover::after { opacity: 1; }
    .identite h2 { font-size: 1.05rem; text-transform: uppercase; text-align: center; margin-top: 12px; color: #fff; letter-spacing: 1.5px; font-weight: 600; }
    .section_left { background: var(--sidebar-bg); border-radius: 8px; padding: 12px 14px; }
    .title_left { text-transform: uppercase; font-weight: 700; font-size: 0.7rem; margin-bottom: 8px; color: var(--accent-orange); letter-spacing: 2px; display: flex; align-items: center; gap: 6px; }
    .title_left::before { content: ''; display: inline-block; width: 3px; height: 12px; background: var(--accent-orange); border-radius: 2px; }
    .left_side p { font-size: 0.78rem; line-height: 1.7; color: var(--text-light); font-weight: 300; }
    .skills_container { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
    .skill_tag { background: rgba(255,255,255,0.12); color: var(--text-light); padding: 3px 9px; border-radius: 4px; font-size: 0.68rem; border: 1px solid rgba(255,255,255,0.2); }
    .right_side { padding: 36px 36px 36px 30px; background: #fff; display: flex; flex-direction: column; gap: 0; }
    .header_right { margin-bottom: 20px; }
    .header_right h1 { color: var(--heading-color); font-size: 1.75rem; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; line-height: 1.1; }
    .header_right .sous_titre { color: var(--accent-orange); font-size: 0.9rem; font-weight: 500; margin-top: 4px; }
    .header_divider { height: 3px; background: linear-gradient(to right, var(--accent-orange), transparent); margin-top: 10px; border-radius: 2px; }
    .section_block { margin-top: 18px; }
    .section_title { text-transform: uppercase; color: var(--heading-color); font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 8px; letter-spacing: 1px; margin-bottom: 8px; }
    .section_title::before { content: ''; width: 4px; height: 16px; background: var(--accent-orange); border-radius: 2px; }
    .section_bg { background: var(--section-bg); border-radius: 8px; padding: 12px 14px; }
    .content_text { font-size: 0.82rem; color: var(--text-gray); line-height: 1.7; }
    @media print {
      body { background: none; }
      .container { box-shadow: none; width: 210mm; min-height: 297mm; }
      .imgBx::after { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="left_side">
      <div class="imgBx" onclick="document.getElementById('fileInput').click()">
        <img id="profileImg" src="https://ui-avatars.com/api/?name=${encodeURIComponent(nomAffiche)}&background=${theme.accent.replace('#','')}&color=fff&size=150" alt="Profil">
        <input type="file" id="fileInput" style="display:none" accept="image/*" onchange="updateImage(this)">
        <div class="identite"><h2 contenteditable="true">${nomAffiche}</h2></div>
      </div>
      <div class="section_left">
        <div class="title_left">Coordonnées</div>
        <p>📍 <span contenteditable="true">${formValues.localisation || "Sénégal"}</span></p>
        <p>📞 <span contenteditable="true">${telMatch ? telMatch[0] : "+221 -- --- -- --"}</span></p>
        <p>✉️ <span contenteditable="true">${emailMatch ? emailMatch[0] : "contact@email.com"}</span></p>
      </div>
      <div class="section_left">
        <div class="title_left">Atouts</div>
        <p contenteditable="true">${compTrans || "À compléter..."}</p>
      </div>
      <div class="section_left">
        <div class="title_left">Compétences</div>
        <div class="skills_container" contenteditable="true">
          ${compTech ? compTech.split(/<br>|•|-/).map(s => {
            const c = s.trim()
            return c && c.length > 1 ? `<span class="skill_tag">${c}</span>` : ''
          }).join('') : '<span class="skill_tag">À préciser</span>'}
        </div>
      </div>
      <div class="section_left">
        <div class="title_left">Loisirs</div>
        <p contenteditable="true">${loisirs || "À compléter..."}</p>
      </div>
    </div>
    <div class="right_side">
      <div class="header_right">
        <h1 contenteditable="true">${nomAffiche || "Prénom NOM"}</h1>
        <div class="sous_titre" contenteditable="true">Profil Professionnel</div>
        <div class="header_divider"></div>
      </div>
      <div class="section_block">
        <div class="section_bg">
          <div class="content_text" contenteditable="true">${profil || "Décrivez votre profil ici..."}</div>
        </div>
      </div>
      <div class="section_block">
        <div class="section_title">Expériences</div>
        <div class="content_text" contenteditable="true">${experiences || "Détails de vos expériences..."}</div>
      </div>
      <div class="section_block">
        <div class="section_title">Formation</div>
        <div class="content_text" contenteditable="true">${formation || "Détails de votre formation..."}</div>
      </div>
    </div>
  </div>
  <script>
    function updateImage(input) {
      if (input.files && input.files[0]) {
        const r = new FileReader()
        r.onload = e => document.getElementById('profileImg').src = e.target.result
        r.readAsDataURL(input.files[0])
      }
    }
  </script>
</body>
</html>`

    srcDocRef.current = html
    return html
  }, [])

  const activeTab   = { backgroundColor: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }
  const inactiveTab = { backgroundColor: 'white', color: '#6b7280', padding: '8px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer' }
  const inputStyle  = { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }

  // ── Loading screen while plan is verified ──
  if (!allowed) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, background: '#0f172a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div style={{ width: 24, height: 24, border: '2px solid #e2e8f0', borderTop: '2px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#f9fafb', padding: '48px 16px' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>

        {/* Header with credits */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '700' }}>Mon Générateur de CV</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 20, padding: '6px 14px' }}>
            <Zap size={13} color="#4f46e5" fill="#4f46e5"/>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>{credits} crédits</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setMode('formulaire')} style={mode === 'formulaire' ? activeTab : inactiveTab}>Formulaire</button>
          <button onClick={() => setMode('prompt')} style={mode === 'prompt' ? activeTab : inactiveTab}>Prompt libre</button>
        </div>

        {mode === 'formulaire' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input name="nom" placeholder="Nom complet" onChange={handleChange} style={inputStyle} />
            <input name="localisation" placeholder="Localisation" onChange={handleChange} style={inputStyle} />
            <textarea name="experience" placeholder="Expériences" onChange={handleChange} style={{ ...inputStyle, gridColumn: 'span 2', height: '100px' }} />
            <textarea name="competences" placeholder="Compétences" onChange={handleChange} style={{ ...inputStyle, gridColumn: 'span 2', height: '100px' }} />
          </div>
        ) : (
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ ...inputStyle, height: '150px' }} placeholder="Décris ton parcours..." />
        )}

        {/* Low credits warning */}
        {credits < 2 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#92400e' }}>
            ⚠️ Crédits insuffisants (2 requis) —{' '}
            <button onClick={() => router.push('/pricing')} style={{ background: 'none', border: 'none', color: '#d97706', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              Recharger
            </button>
          </div>
        )}

        <button
          onClick={handleSubmit}
          style={{ width: '100%', background: hasCredits(2) ? '#2563eb' : '#94a3b8', color: 'white', padding: '12px', borderRadius: '12px', border: 'none', cursor: hasCredits(2) ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
          disabled={loading || !hasCredits(2)}>
          {loading ? 'Génération...' : '1. Générer le texte · ⚡2'}
        </button>

        {cvGenere && (
          <div style={{ marginTop: '30px' }}>
            {!showModel ? (
              <button onClick={() => setShowModel(true)} style={{ width: '100%', background: '#10b981', color: 'white', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                2. Voir le Design & Modifier
              </button>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '15px', background: '#f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <button onClick={() => setShowModel(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600' }}>← Retour</button>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'white', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Thème</span>
                    {themes.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => handleThemeChange(t)}
                        title={t.name}
                        style={{
                          width: '26px', height: '26px', borderRadius: '50%',
                          border: selectedThemeName === t.name ? '3px solid #2563eb' : '2px solid transparent',
                          background: `linear-gradient(135deg, ${t.dark} 50%, ${t.accent} 50%)`,
                          cursor: 'pointer', padding: 0,
                          boxShadow: selectedThemeName === t.name ? '0 0 0 1px #bfdbfe' : 'none',
                        }}
                      />
                    ))}
                  </div>
                  <button onClick={downloadPDF} style={{ background: '#0f172a', color: 'white', padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                    📥 PDF
                  </button>
                </div>
                <iframe
                  key="cv-iframe-stable"
                  ref={iframeRef}
                  srcDoc={getOrBuildSrcDoc(cvGenere, formData)}
                  style={{ width: '100%', height: '1100px', border: 'none' }}
                  title="CV Design"
                />
              </div>
            )}
            {!showModel && (
              <div style={{ marginTop: '10px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>{cvGenere}</div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}