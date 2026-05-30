'use client'

import { useState, useRef, useCallback } from 'react'

// ── Google Fonts loader ───────────────────────────────────────────
const FONT_CACHE = new Set()
function loadGoogleFont(fontName) {
  if (!fontName || FONT_CACHE.has(fontName)) return
  FONT_CACHE.add(fontName)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;600;700&display=swap`
  document.head.appendChild(link)
}

// ── Styles visuels ────────────────────────────────────────────────
const VISUAL_STYLES = {
  auto:       { label: 'Auto', icon: '✦' },
  editorial:  { label: 'Éditorial', icon: '◈' },
  minimal:    { label: 'Minimaliste', icon: '○' },
  warm:       { label: 'Chaleureux', icon: '◉' },
  bold:       { label: 'Audacieux', icon: '◆' },
  nordic:     { label: 'Nordique', icon: '◇' },
  romantic:   { label: 'Romantique', icon: '❋' },
}

// ── Rendu d'une page selon son layout ────────────────────────────
function renderPage({ page, photos, design, isPreview = false }) {
  const { type, photoIndices = [], titre, caption, accent } = page
  const { livre } = design
  const { palette, typographie } = livre

  const pageStyle = {
    background: palette.fond,
    color: palette.texte,
    fontFamily: `'${typographie.corpsFont}', serif`,
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  const getPhoto = (idx) => {
    const photo = photos[idx]
    if (!photo) return null
    return `data:${photo.mediaType};base64,${photo.base64}`
  }

  const imgStyle = (fit = 'cover') => ({
    width: '100%',
    height: '100%',
    objectFit: fit,
    display: 'block',
  })

  const captionStyle = {
    fontFamily: `'${typographie.corpsFont}', sans-serif`,
    fontSize: isPreview ? '7px' : '12px',
    color: palette.texteSecondaire,
    lineHeight: 1.5,
    padding: isPreview ? '4px 6px' : '8px 12px',
    textAlign: 'center',
  }

  const accentStyle = {
    fontFamily: `'${typographie.titreFont}', serif`,
    fontSize: isPreview ? '6px' : '10px',
    color: palette.accent,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: isPreview ? '2px' : '4px',
  }

  const titleStyle = {
    fontFamily: `'${typographie.titreFont}', serif`,
    fontSize: isPreview ? '8px' : '14px',
    fontWeight: 600,
    color: palette.texte,
    textAlign: 'center',
    margin: isPreview ? '2px 0' : '4px 0',
  }

  // ── COVER ──────────────────────────────────────────────────────
  if (type === 'cover') {
    const src = getPhoto(photoIndices[0])
    return (
      <div style={{ ...pageStyle, background: palette.couvertureFond }}>
        {src && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <img src={src} alt="" style={{ ...imgStyle(), opacity: 0.45 }} />
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: isPreview ? '8px' : '32px',
          gap: isPreview ? '4px' : '12px',
        }}>
          {accent && <div style={{ ...accentStyle, color: palette.couvertureTexte, opacity: 0.7 }}>{accent}</div>}
          <div style={{
            fontFamily: `'${typographie.titreFont}', serif`,
            fontSize: isPreview ? '14px' : '36px',
            fontWeight: 700,
            color: palette.couvertureTexte,
            textAlign: 'center',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
          }}>{livre.titre}</div>
          <div style={{
            fontFamily: `'${typographie.corpsFont}', sans-serif`,
            fontSize: isPreview ? '7px' : '13px',
            color: palette.couvertureTexte,
            opacity: 0.75,
            textAlign: 'center',
            letterSpacing: '0.05em',
          }}>{livre.sousTitre}</div>
          <div style={{
            width: isPreview ? '20px' : '40px',
            height: '1px',
            background: palette.couvertureTexte,
            opacity: 0.5,
            margin: isPreview ? '2px 0' : '6px 0',
          }} />
        </div>
      </div>
    )
  }

  // ── BACK ───────────────────────────────────────────────────────
  if (type === 'back') {
    return (
      <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center', gap: isPreview ? '4px' : '16px' }}>
        <div style={{ ...accentStyle, color: palette.accent }}>fin</div>
        <div style={{
          fontFamily: `'${typographie.titreFont}', serif`,
          fontSize: isPreview ? '9px' : '16px',
          color: palette.texteSecondaire,
          textAlign: 'center',
          fontStyle: 'italic',
          maxWidth: '80%',
          lineHeight: 1.5,
        }}>{livre.dedicace}</div>
        <div style={{
          width: isPreview ? '16px' : '32px',
          height: '1px',
          background: palette.accent,
          opacity: 0.4,
        }} />
      </div>
    )
  }

  // ── TEXT_SPREAD ────────────────────────────────────────────────
  if (type === 'text_spread') {
    return (
      <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center', padding: isPreview ? '8px' : '40px' }}>
        <div style={{
          width: isPreview ? '12px' : '24px',
          height: isPreview ? '12px' : '24px',
          border: `${isPreview ? '1px' : '2px'} solid ${palette.accent}`,
          transform: 'rotate(45deg)',
          marginBottom: isPreview ? '6px' : '20px',
          opacity: 0.5,
        }} />
        {titre && <div style={{ ...titleStyle, fontSize: isPreview ? '9px' : '18px', marginBottom: isPreview ? '4px' : '12px' }}>{titre}</div>}
        <div style={{ ...captionStyle, maxWidth: '80%', fontSize: isPreview ? '7px' : '13px', fontStyle: 'italic', color: palette.texteSecondaire }}>
          {caption}
        </div>
      </div>
    )
  }

  // ── FULL ───────────────────────────────────────────────────────
  if (type === 'full') {
    const src = getPhoto(photoIndices[0])
    return (
      <div style={pageStyle}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {src && <img src={src} alt="" style={imgStyle()} />}
        </div>
        {(caption || titre) && (
          <div style={{ padding: isPreview ? '3px 6px' : '8px 16px', background: palette.fond }}>
            {titre && <div style={titleStyle}>{titre}</div>}
            {caption && <div style={captionStyle}>{caption}</div>}
          </div>
        )}
      </div>
    )
  }

  // ── DUO_H ──────────────────────────────────────────────────────
  if (type === 'duo_h') {
    return (
      <div style={pageStyle}>
        <div style={{ flex: 1, display: 'flex', gap: isPreview ? '1px' : '3px', overflow: 'hidden' }}>
          {[0, 1].map(i => {
            const src = getPhoto(photoIndices[i])
            return (
              <div key={i} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {src && <img src={src} alt="" style={imgStyle()} />}
              </div>
            )
          })}
        </div>
        {caption && <div style={captionStyle}>{caption}</div>}
      </div>
    )
  }

  // ── DUO_V ──────────────────────────────────────────────────────
  if (type === 'duo_v') {
    return (
      <div style={pageStyle}>
        {[0, 1].map(i => {
          const src = getPhoto(photoIndices[i])
          return (
            <div key={i} style={{ flex: 1, position: 'relative', overflow: 'hidden', marginBottom: i === 0 ? (isPreview ? '1px' : '3px') : 0 }}>
              {src && <img src={src} alt="" style={imgStyle()} />}
            </div>
          )
        })}
        {caption && <div style={{ ...captionStyle, position: 'absolute', bottom: 0, left: 0, right: 0 }}>{caption}</div>}
      </div>
    )
  }

  // ── TRIO_LEFT ──────────────────────────────────────────────────
  if (type === 'trio_left') {
    const gap = isPreview ? '1px' : '3px'
    return (
      <div style={{ ...pageStyle, flexDirection: 'row' }}>
        <div style={{ flex: 2, position: 'relative', overflow: 'hidden' }}>
          {getPhoto(photoIndices[0]) && <img src={getPhoto(photoIndices[0])} alt="" style={imgStyle()} />}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, marginLeft: gap }}>
          {[1, 2].map(i => (
            <div key={i} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {getPhoto(photoIndices[i]) && <img src={getPhoto(photoIndices[i])} alt="" style={imgStyle()} />}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── TRIO_RIGHT ─────────────────────────────────────────────────
  if (type === 'trio_right') {
    const gap = isPreview ? '1px' : '3px'
    return (
      <div style={{ ...pageStyle, flexDirection: 'row' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, marginRight: gap }}>
          {[0, 1].map(i => (
            <div key={i} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {getPhoto(photoIndices[i]) && <img src={getPhoto(photoIndices[i])} alt="" style={imgStyle()} />}
            </div>
          ))}
        </div>
        <div style={{ flex: 2, position: 'relative', overflow: 'hidden' }}>
          {getPhoto(photoIndices[2]) && <img src={getPhoto(photoIndices[2])} alt="" style={imgStyle()} />}
        </div>
      </div>
    )
  }

  // ── QUAD ───────────────────────────────────────────────────────
  if (type === 'quad') {
    const gap = isPreview ? '1px' : '3px'
    return (
      <div style={{ ...pageStyle }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
              {getPhoto(photoIndices[i]) && <img src={getPhoto(photoIndices[i])} alt="" style={imgStyle()} />}
            </div>
          ))}
        </div>
        {caption && <div style={captionStyle}>{caption}</div>}
      </div>
    )
  }

  // ── MOSAIC_5 ───────────────────────────────────────────────────
  if (type === 'mosaic_5') {
    const gap = isPreview ? '1px' : '3px'
    return (
      <div style={{ ...pageStyle }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap }}>
          <div style={{ gridRow: '1 / 3', position: 'relative', overflow: 'hidden' }}>
            {getPhoto(photoIndices[0]) && <img src={getPhoto(photoIndices[0])} alt="" style={imgStyle()} />}
          </div>
          {[1, 2].map(i => (
            <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
              {getPhoto(photoIndices[i]) && <img src={getPhoto(photoIndices[i])} alt="" style={imgStyle()} />}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap, height: isPreview ? '30%' : '35%' }}>
          {[3, 4].map(i => (
            <div key={i} style={{ position: 'relative', overflow: 'hidden' }}>
              {getPhoto(photoIndices[i]) && <img src={getPhoto(photoIndices[i])} alt="" style={imgStyle()} />}
            </div>
          ))}
        </div>
        {caption && <div style={captionStyle}>{caption}</div>}
      </div>
    )
  }

  return <div style={pageStyle} />
}

// ── Composant principal ───────────────────────────────────────────
export default function PhotoBookPage() {
  const [photos, setPhotos] = useState([])
  const [previews, setPreviews] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [form, setForm] = useState({ titre: '', evenement: '', date: '', ambiance: '', dedicace: '', style: 'auto' })
  const [step, setStep] = useState('upload') // upload | generating | preview
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [result, setResult] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [error, setError] = useState(null)
  const dropRef = useRef(null)
  const fileInputRef = useRef(null)

  // ── Gestion des fichiers ──────────────────────────────────────
  const addFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    const newPhotos = [...photos, ...imageFiles].slice(0, 20)
    setPhotos(newPhotos)

    Promise.all(newPhotos.map(f => new Promise(res => {
      const reader = new FileReader()
      reader.onload = e => res(e.target.result)
      reader.readAsDataURL(f)
    }))).then(setPreviews)
  }, [photos])

  const removePhoto = (idx) => {
    const np = photos.filter((_, i) => i !== idx)
    const nv = previews.filter((_, i) => i !== idx)
    setPhotos(np)
    setPreviews(nv)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  // ── Génération du PhotoBook ───────────────────────────────────
  const generate = async () => {
    if (photos.length === 0) return
    setStep('generating')
    setError(null)
    setProgress(10)
    setProgressMsg('Préparation des photos…')

    try {
      const fd = new FormData()
      fd.append('titre', form.titre)
      fd.append('evenement', form.evenement)
      fd.append('date', form.date)
      fd.append('ambiance', form.ambiance)
      fd.append('dedicace', form.dedicace)
      fd.append('style', form.style)
      photos.forEach((f, i) => fd.append(`photo_${i}`, f))

      setProgress(30)
      setProgressMsg('Claude analyse vos photos…')

      const res = await fetch('/api/generer-photobook', { method: 'POST', body: fd })

      setProgress(80)
      setProgressMsg('Composition des pages…')

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur serveur')
      }

      const data = await res.json()
      setProgress(95)
      setProgressMsg('Mise en page finale…')

      // Charger les polices
      if (data.design?.livre?.typographie) {
        loadGoogleFont(data.design.livre.typographie.titreFont)
        loadGoogleFont(data.design.livre.typographie.corpsFont)
      }

      await new Promise(r => setTimeout(r, 600))
      setResult(data)
      setCurrentPage(0)
      setProgress(100)
      setStep('preview')
    } catch (e) {
      setError(e.message)
      setStep('upload')
    }
  }

  // ── Export HTML simple ─────────────────────────────────────────
  const exportBook = () => {
    if (!result) return
    const { design, photos: bookPhotos } = result
    const { livre } = design

    const pagesHTML = design.pages.map((page, i) => {
      const photosData = (page.photoIndices || []).map(idx => bookPhotos[idx]).filter(Boolean)
      return `<div class="page" id="page-${i}" data-type="${page.type}">
  <!-- ${page.type} — ${page.caption || ''} -->
  <div class="page-inner"></div>
</div>`
    }).join('\n')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${livre.titre}</title>
<link href="https://fonts.googleapis.com/css2?family=${(livre.typographie.titreFont || 'Playfair Display').replace(/ /g, '+')}:wght@400;600;700&family=${(livre.typographie.corpsFont || 'Lato').replace(/ /g, '+')}:wght@400;600&display=swap" rel="stylesheet">
<style>
body { margin:0; background: #1a1a1a; display:flex; flex-direction:column; align-items:center; padding: 40px 20px; gap:24px; }
.page { width: 800px; height: 560px; background: ${livre.palette.fond}; position: relative; overflow:hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.4); }
h1 { color: #fff; font-family: '${livre.typographie.titreFont}', serif; font-size: 28px; font-weight: 400; text-align: center; margin: 0 0 8px; }
p { color: #999; font-size: 14px; text-align: center; margin: 0; }
</style>
</head>
<body>
<h1>${livre.titre}</h1>
<p>${livre.sousTitre}</p>
${pagesHTML}
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${livre.titre.replace(/\s+/g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Rendu ──────────────────────────────────────────────────────
  const totalPages = result?.design?.pages?.length || 0

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e0e0e',
      color: '#f0ede8',
      fontFamily: "'DM Sans', 'Inter', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize: '24px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#f0ede8',
          }}>PhotoBook</span>
          <span style={{ fontSize: '12px', color: '#666', letterSpacing: '0.08em' }}>par Claude Vision</span>
        </div>
        {step === 'preview' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setStep('upload'); setResult(null) }} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              color: '#aaa', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
            }}>← Recommencer</button>
            <button onClick={exportBook} style={{
              background: '#f0ede8', border: 'none', color: '#0e0e0e',
              padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}>↓ Exporter HTML</button>
          </div>
        )}
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

        {/* ── ÉTAPE 1 : UPLOAD ─────────────────────────────────── */}
        {(step === 'upload') && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(36px, 5vw, 58px)',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                margin: '0 0 12px',
                lineHeight: 1.1,
                background: 'linear-gradient(135deg, #f0ede8 0%, #a09080 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Créez votre livre photo
              </h1>
              <p style={{ color: '#666', fontSize: '15px', margin: 0, lineHeight: 1.6 }}>
                Déposez vos photos. Claude compose votre livre, choisit les layouts,<br />
                rédige les captions et crée la palette selon vos souvenirs.
              </p>
            </div>

            {/* Zone de dépôt */}
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1.5px dashed ${isDragging ? '#f0ede8' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '16px',
                padding: photos.length > 0 ? '24px' : '64px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isDragging ? 'rgba(255,255,255,0.03)' : 'transparent',
                marginBottom: '32px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file" accept="image/*" multiple
                style={{ display: 'none' }}
                onChange={e => addFiles(e.target.files)}
              />
              {photos.length === 0 ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>⊞</div>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                    Glissez vos photos ici, ou cliquez pour les sélectionner
                  </p>
                  <p style={{ color: '#444', fontSize: '12px', margin: '8px 0 0' }}>
                    JPG, PNG, WEBP — jusqu'à 20 photos
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    {previews.map((src, i) => (
                      <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden' }}>
                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button
                          onClick={e => { e.stopPropagation(); removePhoto(i) }}
                          style={{
                            position: 'absolute', top: '4px', right: '4px',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: 'rgba(0,0,0,0.7)', border: 'none',
                            color: '#fff', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1,
                          }}
                        >×</button>
                      </div>
                    ))}
                    {photos.length < 20 && (
                      <div style={{
                        aspectRatio: '1', borderRadius: '8px',
                        border: '1.5px dashed rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#444', fontSize: '24px',
                      }}>+</div>
                    )}
                  </div>
                  <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', margin: 0 }}>
                    {photos.length} photo{photos.length > 1 ? 's' : ''} sélectionnée{photos.length > 1 ? 's' : ''} · Cliquer pour en ajouter
                  </p>
                </div>
              )}
            </div>

            {/* Formulaire optionnel */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '28px',
              marginBottom: '32px',
            }}>
              <h2 style={{ fontSize: '13px', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px', fontWeight: 500 }}>
                Contexte (optionnel)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { key: 'titre', label: 'Titre du livre', placeholder: 'Laissez vide pour un titre généré' },
                  { key: 'evenement', label: 'Événement', placeholder: 'Mariage, voyage, naissance…' },
                  { key: 'date', label: 'Date / Période', placeholder: 'Été 2024, Décembre…' },
                  { key: 'dedicace', label: 'Dédicace', placeholder: 'À qui est dédié ce livre…' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>{label}</label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#f0ede8',
                        padding: '10px 14px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Ambiance souhaitée</label>
                  <input
                    type="text"
                    placeholder="Nostalgique, romantique, joyeux, aventureux…"
                    value={form.ambiance}
                    onChange={e => setForm(f => ({ ...f, ambiance: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#f0ede8',
                      padding: '10px 14px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Sélecteur de style */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '10px' }}>Style visuel</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {Object.entries(VISUAL_STYLES).map(([key, { label, icon }]) => (
                    <button
                      key={key}
                      onClick={() => setForm(f => ({ ...f, style: key }))}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${form.style === key ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        background: form.style === key ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: form.style === key ? '#f0ede8' : '#666',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >{icon} {label}</button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(180,50,50,0.15)', border: '1px solid rgba(180,50,50,0.3)',
                borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#ff8080', fontSize: '13px',
              }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={generate}
                disabled={photos.length === 0}
                style={{
                  background: photos.length > 0 ? '#f0ede8' : 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: photos.length > 0 ? '#0e0e0e' : '#444',
                  padding: '14px 40px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: photos.length > 0 ? 'pointer' : 'not-allowed',
                  letterSpacing: '-0.01em',
                  transition: 'all 0.2s',
                }}
              >
                Créer mon PhotoBook
                {photos.length > 0 && ` · ${photos.length} photo${photos.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : GÉNÉRATION ─────────────────────────────── */}
        {step === 'generating' && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 32px',
              border: '2px solid rgba(255,255,255,0.08)',
              borderTop: '2px solid #f0ede8',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <p style={{ color: '#f0ede8', fontSize: '16px', margin: '0 0 8px', fontWeight: 500 }}>{progressMsg}</p>
            <p style={{ color: '#444', fontSize: '13px', margin: '0 0 32px' }}>Claude Vision analyse vos souvenirs…</p>

            <div style={{
              maxWidth: '320px', margin: '0 auto',
              height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #f0ede8, #c0b8b0)',
                borderRadius: '2px',
                transition: 'width 0.6s ease',
              }} />
            </div>

            {/* Miniatures des photos */}
            <div style={{
              display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap',
              maxWidth: '400px', margin: '32px auto 0', opacity: 0.4,
            }}>
              {previews.slice(0, 8).map((src, i) => (
                <div key={i} style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : PRÉVISUALISATION ───────────────────────── */}
        {step === 'preview' && result && (() => {
          const { design, photos: bookPhotos } = result
          const { livre, pages, analyse } = design
          const page = pages[currentPage]
          const isFirstPage = currentPage === 0
          const isLastPage = currentPage === totalPages - 1

          return (
            <div>
              {/* Infos du livre */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '32px', flexWrap: 'wrap', gap: '16px',
              }}>
                <div>
                  <h2 style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '32px', fontWeight: 600, margin: '0 0 4px',
                    letterSpacing: '-0.02em', color: '#f0ede8',
                  }}>{livre.titre}</h2>
                  <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                    {livre.sousTitre} · {totalPages} pages · {analyse?.theme || ''} · Style {analyse?.style || ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Palette */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {Object.values(livre.palette).slice(0, 5).map((c, i) => (
                      <div key={i} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Visionneuse pleine page */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
              }}>
                {/* Page principale */}
                <div style={{
                  width: '100%', maxWidth: '720px',
                  aspectRatio: '4/3',
                  borderRadius: '12px', overflow: 'hidden',
                  boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
                  position: 'relative',
                }}>
                  {renderPage({ page, photos: bookPhotos, design, isPreview: false })}

                  {/* Indicateur de layout */}
                  <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    padding: '4px 10px', borderRadius: '20px',
                    fontSize: '11px', color: 'rgba(255,255,255,0.6)',
                    letterSpacing: '0.05em',
                  }}>{page.type}</div>
                </div>

                {/* Caption de la page */}
                {(page.caption || page.titre) && (
                  <div style={{ textAlign: 'center', maxWidth: '500px' }}>
                    {page.titre && <div style={{ fontSize: '13px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{page.titre}</div>}
                    {page.caption && <div style={{ fontSize: '15px', color: '#c0b8b0', fontStyle: 'italic', lineHeight: 1.6, fontFamily: "'Cormorant Garamond', serif" }}>{page.caption}</div>}
                  </div>
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={isFirstPage}
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent',
                      color: isFirstPage ? '#333' : '#f0ede8',
                      fontSize: '18px', cursor: isFirstPage ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >←</button>
                  <span style={{ color: '#555', fontSize: '13px', minWidth: '80px', textAlign: 'center' }}>
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={isLastPage}
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent',
                      color: isLastPage ? '#333' : '#f0ede8',
                      fontSize: '18px', cursor: isLastPage ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >→</button>
                </div>

                {/* Bande de miniatures */}
                <div style={{
                  display: 'flex', gap: '6px', overflowX: 'auto',
                  padding: '8px 0', maxWidth: '100%',
                  scrollbarWidth: 'thin',
                }}>
                  {pages.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      style={{
                        flexShrink: 0,
                        width: '80px', height: '60px',
                        borderRadius: '6px', overflow: 'hidden',
                        border: i === currentPage ? '2px solid #f0ede8' : '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer', padding: 0, background: 'transparent',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        {renderPage({ page: p, photos: bookPhotos, design, isPreview: true })}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Résumé de l'analyse */}
                <div style={{
                  width: '100%', maxWidth: '720px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', padding: '20px',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px',
                }}>
                  {[
                    { label: 'Thème', value: analyse?.theme },
                    { label: 'Ambiance', value: analyse?.ambiance },
                    { label: 'Saison', value: analyse?.saison },
                    { label: 'Style', value: analyse?.style },
                    { label: 'Photos', value: `${bookPhotos.length} photo${bookPhotos.length > 1 ? 's' : ''}` },
                    { label: 'Pages', value: `${totalPages} pages` },
                  ].filter(x => x.value).map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: '14px', color: '#c0b8b0' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </main>
    </div>
  )
}