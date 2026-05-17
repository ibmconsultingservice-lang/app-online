'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

const palettes = [
  {
    name: 'Aurora',
    from: '#0f0c29', via: '#302b63', to: '#24243e',
    orb1: '#a78bfa', orb2: '#38bdf8', orb3: '#f472b6',
    accent: '#c4b5fd', chip: 'rgba(167,139,250,0.18)', chipText: '#e0d9ff',
    strongText: 'rgba(255,255,255,0.88)', bodyText: 'rgba(255,255,255,0.68)',
    mutedText: 'rgba(255,255,255,0.4)', sidebarBg: 'rgba(255,255,255,0.045)',
    contentBg: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)',
    expBg: 'rgba(255,255,255,0.04)', gridLines: 'rgba(255,255,255,0.015)',
  },
  {
    name: 'Ocean',
    from: '#001220', via: '#003355', to: '#001a35',
    orb1: '#0ea5e9', orb2: '#06b6d4', orb3: '#6366f1',
    accent: '#7dd3fc', chip: 'rgba(14,165,233,0.15)', chipText: '#bae6fd',
    strongText: 'rgba(255,255,255,0.88)', bodyText: 'rgba(255,255,255,0.68)',
    mutedText: 'rgba(255,255,255,0.4)', sidebarBg: 'rgba(255,255,255,0.045)',
    contentBg: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)',
    expBg: 'rgba(255,255,255,0.04)', gridLines: 'rgba(255,255,255,0.015)',
  },
  {
    name: 'Ember',
    from: '#1a0800', via: '#3d1200', to: '#1a0500',
    orb1: '#f97316', orb2: '#fbbf24', orb3: '#ef4444',
    accent: '#fed7aa', chip: 'rgba(249,115,22,0.18)', chipText: '#ffedd5',
    strongText: 'rgba(255,255,255,0.88)', bodyText: 'rgba(255,255,255,0.68)',
    mutedText: 'rgba(255,255,255,0.4)', sidebarBg: 'rgba(255,255,255,0.045)',
    contentBg: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)',
    expBg: 'rgba(255,255,255,0.04)', gridLines: 'rgba(255,255,255,0.015)',
  },
  {
    name: 'Verdant',
    from: '#021407', via: '#063318', to: '#010d04',
    orb1: '#22c55e', orb2: '#84cc16', orb3: '#14b8a6',
    accent: '#86efac', chip: 'rgba(34,197,94,0.15)', chipText: '#dcfce7',
    strongText: 'rgba(255,255,255,0.88)', bodyText: 'rgba(255,255,255,0.68)',
    mutedText: 'rgba(255,255,255,0.4)', sidebarBg: 'rgba(255,255,255,0.045)',
    contentBg: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)',
    expBg: 'rgba(255,255,255,0.04)', gridLines: 'rgba(255,255,255,0.015)',
  },
  {
    name: 'Sakura',
    from: '#1a0010', via: '#3d0028', to: '#150010',
    orb1: '#ec4899', orb2: '#f43f5e', orb3: '#a855f7',
    accent: '#fbcfe8', chip: 'rgba(236,72,153,0.18)', chipText: '#fce7f3',
    strongText: 'rgba(255,255,255,0.88)', bodyText: 'rgba(255,255,255,0.68)',
    mutedText: 'rgba(255,255,255,0.4)', sidebarBg: 'rgba(255,255,255,0.045)',
    contentBg: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)',
    expBg: 'rgba(255,255,255,0.04)', gridLines: 'rgba(255,255,255,0.015)',
  },
  {
    name: 'Slate',
    from: '#0a0f1a', via: '#111827', to: '#060a12',
    orb1: '#64748b', orb2: '#818cf8', orb3: '#38bdf8',
    accent: '#cbd5e1', chip: 'rgba(100,116,139,0.2)', chipText: '#e2e8f0',
    strongText: 'rgba(255,255,255,0.88)', bodyText: 'rgba(255,255,255,0.68)',
    mutedText: 'rgba(255,255,255,0.4)', sidebarBg: 'rgba(255,255,255,0.045)',
    contentBg: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)',
    expBg: 'rgba(255,255,255,0.04)', gridLines: 'rgba(255,255,255,0.015)',
  },
  {
    name: 'White',
    from: '#f0f4ff', via: '#e8eeff', to: '#f5f7ff',
    orb1: '#a5b4fc', orb2: '#93c5fd', orb3: '#c4b5fd',
    accent: '#4f46e5', chip: 'rgba(99,102,241,0.1)', chipText: '#3730a3',
    strongText: 'rgba(20,20,50,0.9)', bodyText: 'rgba(30,30,60,0.7)',
    mutedText: 'rgba(60,60,100,0.55)', sidebarBg: 'rgba(255,255,255,0.55)',
    contentBg: 'rgba(255,255,255,0.35)', borderColor: 'rgba(100,100,180,0.12)',
    expBg: 'rgba(255,255,255,0.6)', gridLines: 'rgba(100,100,200,0.04)',
    isLight: true,
  },
]

export default function AuroraCV() {
  const allowed = usePlanGuard('free')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [mode, setMode] = useState('formulaire')
  const [formData, setFormData] = useState({
    nom: '', prenom: '', poste: '', localisation: '', email: '', tel: '',
    education: '', experience: '', competences: '', loisirs: '',
  })
  const [prompt, setPrompt] = useState('')
  const [cvGenere, setCvGenere] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModel, setShowModel] = useState(false)
  const [palette, setPalette] = useState(palettes[0])
  const iframeRef = useRef(null)
  const srcDocRef = useRef('')
  const currentPaletteRef = useRef(palettes[0])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async () => {
    if (!hasCredits(5)) { router.push('/pricing'); return }
    setLoading(true); setCvGenere(''); setShowModel(false); srcDocRef.current = ''
    try {
      const userPrompt = mode === 'formulaire'
        ? `Génère un CV complet et professionnel :
          Prénom : ${formData.prenom}, Nom : ${formData.nom},
          Poste visé : ${formData.poste}, Localisation : ${formData.localisation},
          Email : ${formData.email}, Tél : ${formData.tel},
          Formation : ${formData.education}, Expériences : ${formData.experience},
          Compétences : ${formData.competences}, Loisirs : ${formData.loisirs}.
          Structure avec sections : PROFIL, EXPÉRIENCES, FORMATION, COMPÉTENCES, LOISIRS (titres en majuscules).`
        : `Génère un CV complet à partir de : ${prompt}. Titres en majuscules, texte professionnel et structuré.`

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

  const applyPaletteToIframe = useCallback((pal) => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const r = doc.documentElement
    r.style.setProperty('--orb1', pal.orb1)
    r.style.setProperty('--orb2', pal.orb2)
    r.style.setProperty('--orb3', pal.orb3)
    r.style.setProperty('--accent', pal.accent)
    r.style.setProperty('--chip', pal.chip)
    r.style.setProperty('--chip-text', pal.chipText)
    r.style.setProperty('--bg-from', pal.from)
    r.style.setProperty('--bg-via', pal.via)
    r.style.setProperty('--bg-to', pal.to)
    r.style.setProperty('--strong-text', pal.strongText)
    r.style.setProperty('--body-text', pal.bodyText)
    r.style.setProperty('--muted-text', pal.mutedText)
    r.style.setProperty('--sidebar-bg', pal.sidebarBg)
    r.style.setProperty('--content-bg', pal.contentBg)
    r.style.setProperty('--border-color', pal.borderColor)
    r.style.setProperty('--exp-bg', pal.expBg)
    r.style.setProperty('--grid-lines', pal.gridLines)
  }, [])

  const handlePaletteChange = (pal) => {
    currentPaletteRef.current = pal
    setPalette(pal)
    applyPaletteToIframe(pal)
  }

  const downloadPDF = () => iframeRef.current?.contentWindow?.print()

  const getOrBuildSrcDoc = useCallback((cvText, fv) => {
    if (srcDocRef.current) return srcDocRef.current
    const pal = currentPaletteRef.current

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

    const topText  = cvText.split(/PROFIL|EXP/i)[0]
    const emailVal = fv.email || (topText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) || [])[0] || 'email@domaine.com'
    const telVal   = fv.tel   || (topText.match(/(?:\+?\d[\d\s-]{7,})/) || [])[0] || '+221 -- --- -- --'
    const prenom   = fv.prenom || topText.split(' ')[0] || 'Prénom'
    const nom      = fv.nom    || topText.split(' ').slice(1).join(' ') || 'NOM'
    const poste    = fv.poste  || 'Profil Professionnel'
    const loc      = fv.localisation || 'Sénégal'
    const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()

    const skillTags = comp
      ? comp.split(/<br>|•|-|,/).map(s => s.trim()).filter(s => s.length > 1)
          .map(s => `<span class="chip" contenteditable="true">${s}</span>`).join('')
      : '<span class="chip">À préciser</span>'

    const loisirTags = loisirs
      ? loisirs.split(/<br>|•|-|,/).map(s => s.trim()).filter(s => s.length > 1)
          .map(s => `<span class="loisir-tag" contenteditable="true">${s}</span>`).join('')
      : '<span class="loisir-tag">À préciser</span>'

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
:root {
  --orb1: ${pal.orb1};
  --orb2: ${pal.orb2};
  --orb3: ${pal.orb3};
  --accent: ${pal.accent};
  --chip: ${pal.chip};
  --chip-text: ${pal.chipText};
  --bg-from: ${pal.from};
  --bg-via: ${pal.via};
  --bg-to: ${pal.to};
  --strong-text: ${pal.strongText};
  --body-text: ${pal.bodyText};
  --muted-text: ${pal.mutedText};
  --sidebar-bg: ${pal.sidebarBg};
  --content-bg: ${pal.contentBg};
  --border-color: ${pal.borderColor};
  --exp-bg: ${pal.expBg};
  --grid-lines: ${pal.gridLines};
}
@page { size: A4; margin: 0; }
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: 'DM Sans', sans-serif;
  background: linear-gradient(135deg, var(--bg-from) 0%, var(--bg-via) 50%, var(--bg-to) 100%);
  display: flex; justify-content: center;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  min-height: 100vh;
}

/* ── AMBIENT ORBS ── */
.orb { position: fixed; border-radius: 50%; filter: blur(90px); opacity: 0.28; pointer-events: none; }
.orb1 { top: -100px; left: -100px; width: 420px; height: 420px; background: var(--orb1); }
.orb2 { bottom: 40px; right: -80px; width: 360px; height: 360px; background: var(--orb2); }
.orb3 { top: 42%; left: 32%; width: 280px; height: 280px; background: var(--orb3); }

/* ── PAGE ── */
.page {
  position: relative; z-index: 1;
  width: 210mm; min-height: 297mm;
  display: grid; grid-template-columns: 285px 1fr;
  border-radius: 24px; overflow: hidden;
  box-shadow: 0 0 0 0.5px rgba(255,255,255,0.1), 0 60px 120px rgba(0,0,0,0.8),
              inset 0 0 0 0.5px rgba(255,255,255,0.06);
  margin: 40px 0;
}

/* ── SIDEBAR ── */
.sidebar {
  background: var(--sidebar-bg);
  backdrop-filter: blur(24px) saturate(1.4);
  border-right: 0.5px solid var(--border-color);
  display: flex; flex-direction: column;
  padding: 0 0 40px; position: relative; overflow: hidden;
}

/* Avatar zone */
.avatar-zone {
  width: 100%; padding: 44px 28px 28px;
  display: flex; flex-direction: column; align-items: center;
  position: relative;
}
.avatar-glow {
  position: absolute; top: 28px;
  width: 140px; height: 140px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--orb1) 40%, transparent) 0%, transparent 70%);
  filter: blur(28px); opacity: 0.5;
}
.avatar-ring-wrap {
  position: relative; width: 110px; height: 110px; border-radius: 50%; z-index: 1;
  cursor: pointer;
}
@keyframes spin { to { transform: rotate(360deg); } }
.avatar-ring {
  position: absolute; inset: -2.5px; border-radius: 50%;
  background: conic-gradient(var(--orb1), var(--orb2), var(--orb3), var(--orb1));
  animation: spin 6s linear infinite;
  z-index: -1;
}
.avatar-img {
  width: 110px; height: 110px; border-radius: 50%;
  object-fit: cover; object-position: center top;
  background: rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255,255,255,0.12);
  overflow: hidden;
}
.avatar-img img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.avatar-initials {
  width: 110px; height: 110px; border-radius: 50%;
  background: rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255,255,255,0.12);
  font-family: 'Syne', sans-serif;
  font-size: 2rem; font-weight: 800;
  color: var(--accent);
}
.avatar-zone:hover .upload-hint { opacity: 1; }
.upload-hint {
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; opacity: 0;
  transition: opacity 0.2s; z-index: 2;
}

/* Name block */
.name-block { text-align: center; margin-top: 20px; z-index: 1; }
.name-first {
  font-family: 'Syne', sans-serif; font-size: 0.85rem; font-weight: 400;
  color: var(--muted-text); letter-spacing: 4px; text-transform: uppercase;
  display: block;
}
.name-last {
  font-family: 'Syne', sans-serif; font-size: 1.6rem; font-weight: 800;
  color: var(--strong-text); letter-spacing: 1px; text-transform: uppercase;
  display: block; line-height: 1.1; margin: 2px 0 10px;
}
.poste-badge {
  display: inline-block; font-size: 0.58rem; font-weight: 500;
  letter-spacing: 3px; text-transform: uppercase;
  padding: 4px 14px; border-radius: 20px;
  border: 0.5px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: var(--accent);
}

/* Divider */
.divider {
  width: calc(100% - 56px); height: 0.5px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  margin: 16px 28px;
}

/* Section */
.s-section { padding: 0 28px 18px; }
.s-label {
  font-family: 'Syne', sans-serif; font-size: 0.5rem; font-weight: 700;
  letter-spacing: 4px; text-transform: uppercase;
  margin-bottom: 13px; color: var(--accent);
  display: flex; align-items: center; gap: 8px;
}
.s-label::after { content: ''; flex: 1; height: 0.5px; background: rgba(255,255,255,0.07); }

/* Contact */
.contact-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.c-dot {
  width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
  background: var(--accent); box-shadow: 0 0 6px var(--accent);
}
.c-val { font-size: 0.7rem; color: var(--body-text); font-weight: 300; line-height: 1.45; }

/* Chips */
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip {
  font-size: 0.58rem; font-weight: 500; letter-spacing: 0.5px;
  padding: 3px 10px; border-radius: 20px;
  border: 0.5px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(8px);
  background: var(--chip); color: var(--chip-text);
}

/* Loisirs */
.loisir-tag {
  font-size: 0.65rem; color: var(--muted-text);
  border: 0.5px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  padding: 3px 10px; border-radius: 20px;
  display: inline-block; margin: 3px 2px;
}

/* ── CONTENT ── */
.content {
  background: var(--content-bg);
  backdrop-filter: blur(20px) saturate(1.3);
  padding: 44px 38px 44px 30px;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
  background-image: linear-gradient(var(--grid-lines) 1px, transparent 1px),
                    linear-gradient(90deg, var(--grid-lines) 1px, transparent 1px);
  background-size: 40px 40px;
}
.corner-orb {
  position: absolute; bottom: -70px; right: -70px;
  width: 220px; height: 220px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--orb3) 16%, transparent) 0%, transparent 70%);
}

/* Profil block */
.profil-block {
  margin-bottom: 28px; padding: 20px 22px;
  background: rgba(255,255,255,0.05);
  border-radius: 14px;
  border: 0.5px solid rgba(255,255,255,0.09);
  position: relative; overflow: hidden;
}
.profil-block::before {
  content: ''; position: absolute; top: -1px; left: 20%; right: 20%; height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 53%, transparent), transparent);
}
.r-label {
  font-family: 'Syne', sans-serif; font-size: 0.5rem; font-weight: 700;
  letter-spacing: 4px; text-transform: uppercase;
  margin-bottom: 10px; color: var(--accent);
  display: flex; align-items: center; gap: 10px;
}
.r-label::before { content: ''; width: 16px; height: 1px; opacity: 0.5; background: var(--accent); }
.r-label::after { content: ''; flex: 1; height: 0.5px; background: linear-gradient(90deg, rgba(255,255,255,0.08), transparent); }
.profil-text {
  font-size: 0.78rem; font-weight: 300; font-style: italic;
  color: var(--body-text); line-height: 1.85;
}

/* Exp entries */
.r-section { margin-bottom: 24px; position: relative; z-index: 1; }
.exp-card {
  background: var(--exp-bg);
  border: 0.5px solid rgba(255,255,255,0.07);
  border-radius: 10px; padding: 14px 18px;
  margin-bottom: 10px; position: relative; overflow: hidden;
}
.exp-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  border-radius: 2px 0 0 2px;
  background: linear-gradient(to bottom, var(--orb1), var(--orb2));
}
.exp-body { font-size: 0.75rem; font-weight: 300; color: var(--body-text); line-height: 1.78; }
.exp-strong { color: var(--strong-text); font-weight: 500; }
.exp-sub { color: var(--muted-text); font-size: 0.7rem; }

/* Formation */
.form-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.form-icon {
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: 0.5px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; flex-shrink: 0; margin-top: 2px;
}
.form-text { font-size: 0.75rem; font-weight: 300; color: var(--body-text); line-height: 1.78; }

/* Editable */
[contenteditable="true"] { outline: none; border-radius: 3px; }
[contenteditable="true"]:hover { background: rgba(255,255,255,0.05); cursor: text; }

@media print {
  body { background: linear-gradient(135deg, var(--bg-from), var(--bg-via), var(--bg-to)) !important; }
  .orb { display: none; }
  .page { box-shadow: none; margin: 0; border-radius: 0; min-height: 297mm; width: 210mm; }
  [contenteditable]:hover { background: transparent; }
}
</style>
</head>
<body>
<div class="orb orb1"></div>
<div class="orb orb2"></div>
<div class="orb orb3"></div>

<div class="page">
  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="avatar-zone">
      <div class="avatar-glow"></div>
      <div class="avatar-ring-wrap" onclick="document.getElementById('fi').click()" title="Changer la photo">
        <div class="avatar-ring"></div>
        <div class="avatar-img" id="avatarBox">
          <div class="avatar-initials" id="initialsEl">${initials}</div>
        </div>
        <div class="upload-hint">📷</div>
      </div>
      <input type="file" id="fi" style="display:none" accept="image/*">

      <div class="name-block" style="z-index:1;">
        <span class="name-first" contenteditable="true">${prenom}</span>
        <span class="name-last" contenteditable="true">${nom}</span>
        <span class="poste-badge" contenteditable="true">${poste}</span>
      </div>
    </div>

    <div class="divider"></div>

    <div class="s-section">
      <div class="s-label">Contact</div>
      <div class="contact-row"><div class="c-dot"></div><div class="c-val" contenteditable="true">${loc}</div></div>
      <div class="contact-row"><div class="c-dot"></div><div class="c-val" contenteditable="true">${emailVal}</div></div>
      <div class="contact-row"><div class="c-dot"></div><div class="c-val" contenteditable="true">${telVal}</div></div>
    </div>

    <div class="divider"></div>

    <div class="s-section">
      <div class="s-label">Compétences</div>
      <div class="chips">${skillTags}</div>
    </div>

    <div class="divider"></div>

    <div class="s-section">
      <div class="s-label">Loisirs</div>
      <div>${loisirTags}</div>
    </div>
  </div>

  <!-- CONTENT -->
  <div class="content">
    <div class="corner-orb"></div>

    <div class="profil-block">
      <div class="r-label">Profil Professionnel</div>
      <div class="profil-text" contenteditable="true">${profil || 'Décrivez ici votre profil professionnel, vos ambitions et ce qui vous distingue des autres candidats…'}</div>
    </div>

    <div class="r-section">
      <div class="r-label">Expériences</div>
      <div class="exp-card">
        <div class="exp-body" contenteditable="true">${exps || 'Décrivez vos expériences professionnelles, vos missions et vos résultats…'}</div>
      </div>
    </div>

    <div class="r-section">
      <div class="r-label">Formation</div>
      <div class="form-row">
        <div class="form-icon">🎓</div>
        <div class="form-text" contenteditable="true">${form || 'Décrivez votre parcours académique et vos diplômes…'}</div>
      </div>
    </div>
  </div>
</div>

<script>
  document.getElementById('fi').addEventListener('change', function() {
    if (!this.files || !this.files[0]) return
    const r = new FileReader()
    r.onload = function(e) {
      const box = document.getElementById('avatarBox')
      box.innerHTML = '<img src="' + e.target.result + '" alt="Photo">'
    }
    r.readAsDataURL(this.files[0])
  })
</script>
</body>
</html>`

    srcDocRef.current = html
    return html
  }, [])

  // ── UI ──────────────────────────────────────────────────────────────────────
  const p = palette
  const light = p.isLight

  const inputSt = {
    width: '100%', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '9px 12px', fontSize: '14px',
    fontFamily: 'inherit', background: 'rgba(255,255,255,0.06)',
    color: '#e4e4e7', marginBottom: 0,
    WebkitTextFillColor: '#e4e4e7',
  }

  if (!allowed) return (
    <div style={{ minHeight: '100vh', background: '#0f0c29', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={20} color="#c4b5fd" fill="#c4b5fd" />
      </div>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #c4b5fd', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: rgba(255,255,255,0.3) !important; }
        textarea { resize: vertical; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .palette-btn:hover { opacity: 1 !important; transform: scale(1.08); }
        .tab-btn { transition: all 0.2s; }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      {/* ── Fixed background ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: `linear-gradient(135deg, ${p.from} 0%, ${p.via} 50%, ${p.to} 100%)`,
        transition: 'background 0.6s ease',
      }} />
      {[
        { bg: p.orb1, style: { top: '-150px', left: '-150px', width: '500px', height: '500px' } },
        { bg: p.orb2, style: { bottom: '50px', right: '-100px', width: '400px', height: '400px' } },
        { bg: p.orb3, style: { top: '45%', left: '35%', width: '320px', height: '320px' } },
      ].map((orb, i) => (
        <div key={i} style={{
          position: 'fixed', borderRadius: '50%', filter: 'blur(90px)',
          opacity: 0.3, pointerEvents: 'none', background: orb.bg,
          transition: 'background 0.6s ease', zIndex: 0, ...orb.style,
        }} />
      ))}

      {/* ── Sticky palette bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
          Palette
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {palettes.map((pal) => (
            <button key={pal.name} className="palette-btn" onClick={() => handlePaletteChange(pal)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
              border: `1px solid ${palette.name === pal.name ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              background: palette.name === pal.name ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              color: palette.name === pal.name ? '#fff' : 'rgba(255,255,255,0.55)',
              fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px',
              opacity: palette.name === pal.name ? 1 : 0.7,
              transition: 'all 0.2s',
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pal.orb1, boxShadow: `0 0 6px ${pal.orb1}66`, flexShrink: 0 }} />
              {pal.name}
            </button>
          ))}
        </div>
        {/* Credits */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '5px 12px' }}>
          <Zap size={12} color={p.accent} />
          <span style={{ fontSize: 12, fontWeight: 600, color: p.accent }}>{credits}</span>
        </div>
      </div>

      {/* ── Page body ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '40px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <a href="/cv" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Retour</a>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>/</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Aurora CV</span>
            </div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              Aurora <span style={{ color: p.accent }}>CV</span>
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Design glassmorphisme · Orbes ambient · 7 palettes dynamiques
            </p>
          </div>

          {/* ── Form card ── */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '24px', marginBottom: '16px',
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['formulaire', 'prompt'].map(m => (
                <button key={m} className="tab-btn" onClick={() => setMode(m)} style={{
                  padding: '7px 18px', borderRadius: '6px', border: 'none',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                  background: mode === m ? p.accent : 'rgba(255,255,255,0.07)',
                  color: mode === m ? (light ? '#fff' : '#0f0c29') : 'rgba(255,255,255,0.55)',
                }}>
                  {m === 'formulaire' ? 'Formulaire' : 'Prompt libre'}
                </button>
              ))}
            </div>

            {mode === 'formulaire' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { name: 'prenom',        placeholder: 'Prénom' },
                  { name: 'nom',           placeholder: 'Nom de famille' },
                  { name: 'poste',         placeholder: 'Poste visé' },
                  { name: 'localisation',  placeholder: 'Localisation' },
                  { name: 'email',         placeholder: 'Email' },
                  { name: 'tel',           placeholder: 'Téléphone' },
                ].map(f => (
                  <input key={f.name} name={f.name} placeholder={f.placeholder}
                    onChange={handleChange} style={inputSt} />
                ))}
                {[
                  { name: 'experience',   placeholder: 'Expériences professionnelles', col: 'span 2', h: '90px' },
                  { name: 'education',    placeholder: 'Formation académique',          col: 'span 2', h: '70px' },
                  { name: 'competences',  placeholder: 'Compétences clés (séparées par des virgules)', col: '1', h: '60px' },
                  { name: 'loisirs',      placeholder: "Loisirs & centres d'intérêt", col: '1', h: '60px' },
                ].map(f => (
                  <textarea key={f.name} name={f.name} placeholder={f.placeholder}
                    onChange={handleChange}
                    style={{ ...inputSt, gridColumn: f.col, height: f.h }} />
                ))}
              </div>
            ) : (
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="Décris ton parcours professionnel en quelques phrases…"
                style={{ ...inputSt, width: '100%', height: '160px' }} />
            )}
          </div>

          {/* Low credits warning */}
          {credits < 2 && (
            <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#fcd34d' }}>
              ⚠️ Crédits insuffisants —{' '}
              <button onClick={() => router.push('/pricing')} style={{ background: 'none', border: 'none', color: '#f59e0b', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                Recharger
              </button>
            </div>
          )}

          {/* Generate */}
          <button className="submit-btn" onClick={handleSubmit}
            disabled={loading || !hasCredits(2)}
            style={{
              width: '100%', padding: '14px',
              background: hasCredits(2)
                ? `linear-gradient(135deg, ${p.orb1}cc, ${p.orb2}cc)`
                : 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '12px', cursor: hasCredits(2) ? 'pointer' : 'not-allowed',
              fontWeight: 600, fontSize: '15px', color: '#fff',
              fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.2px',
              transition: 'all 0.2s',
            }}>
            {loading ? 'Génération en cours…' : '1. Générer le CV  ·  ⚡ 2 crédits'}
          </button>

          {/* Result */}
          {cvGenere && (
            <div style={{ marginTop: '28px' }}>
              {!showModel ? (
                <>
                  <button onClick={() => setShowModel(true)} style={{
                    width: '100%', padding: '14px', marginBottom: '14px',
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${p.accent}44`,
                    borderRadius: '12px', cursor: 'pointer',
                    fontWeight: 600, fontSize: '15px',
                    color: p.accent, fontFamily: 'DM Sans, sans-serif',
                  }}>
                    2. Ouvrir le design Aurora →
                  </button>
                  <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                    padding: '20px', borderRadius: '12px', fontSize: '13px',
                    lineHeight: 1.8, color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                    {cvGenere}
                  </div>
                </>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
                  {/* Toolbar */}
                  <div style={{
                    padding: '12px 20px',
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '10px',
                    borderBottom: '0.5px solid rgba(255,255,255,0.08)',
                  }}>
                    <button onClick={() => setShowModel(false)} style={{
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                    }}>← Retour</button>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginRight: 4 }}>Palette</span>
                      {palettes.map(pal => (
                        <button key={pal.name} onClick={() => handlePaletteChange(pal)} title={pal.name} style={{
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: `conic-gradient(${pal.orb1}, ${pal.orb2}, ${pal.orb3})`,
                          border: palette.name === pal.name ? `3px solid rgba(255,255,255,0.8)` : '2px solid rgba(255,255,255,0.15)',
                          cursor: 'pointer', padding: 0,
                          boxShadow: palette.name === pal.name ? `0 0 8px ${pal.orb1}88` : 'none',
                          transition: 'all 0.2s',
                        }} />
                      ))}
                    </div>

                    <button onClick={downloadPDF} style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '0.5px solid rgba(255,255,255,0.2)',
                      color: '#fff', padding: '6px 16px', borderRadius: '8px',
                      cursor: 'pointer', fontWeight: 500, fontSize: '13px',
                    }}>
                      ↓ Imprimer / PDF
                    </button>
                  </div>

                  <iframe
                    key="aurora-cv-stable"
                    ref={iframeRef}
                    srcDoc={getOrBuildSrcDoc(cvGenere, formData)}
                    style={{ width: '100%', height: '1180px', border: 'none', display: 'block' }}
                    title="Aurora CV"
                  />
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}