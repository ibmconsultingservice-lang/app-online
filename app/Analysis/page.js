'use client'

import { useState, useRef, useCallback } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { columns: [], rows: [] }
  const sep = lines[0].includes(';') ? ';' : ','
  const columns = lines[0].split(sep).map(c => c.replace(/^"|"$/g, '').trim())
  const rows = lines.slice(1, 11).map(line => {
    const vals = line.split(sep).map(v => v.replace(/^"|"$/g, '').trim())
    const obj = {}
    columns.forEach((col, i) => { obj[col] = vals[i] ?? '' })
    return obj
  })
  return { columns, rows }
}

// ── Parse AI result into structured blocks ────────────────────────────────────
function parseBlocks(text) {
  const blocks = []
  const guideMatch = text.match(/###\s*GUIDE\s+D[''`]INSTALLATION\s*:?([\s\S]*?)$/i)
  const guideContent = guideMatch ? guideMatch[1].trim() : ''
  const textWithoutGuide = guideMatch ? text.slice(0, guideMatch.index) : text

  const parts = textWithoutGuide.split(/(?=###\s*TITRE\s*:)/i)
  for (const part of parts) {
    if (!part.trim()) continue
    const titre     = (part.match(/###\s*TITRE\s*:\s*(.+)/i)?.[1] || '').trim()
    const objectif  = (part.match(/###\s*OBJECTIF\s*:\s*([\s\S]*?)(?=###|$)/i)?.[1] || '').trim()
    const demarche  = (part.match(/###\s*D[ÉE]MARCHE\s*:\s*([\s\S]*?)(?=###|$)/i)?.[1] || '').trim()
    const codeMatch = part.match(/```[\w]*\n([\s\S]*?)```/)
    const code      = codeMatch ? codeMatch[1].trim() : ''
    if (titre || code) blocks.push({ type: 'analysis', titre, objectif, demarche, code })
  }
  if (guideContent) blocks.push({ type: 'guide', content: guideContent })
  return blocks
}

// ── Language config ───────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python', label: 'Python', icon: '🐍', color: '#4ade80', dim: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.22)',  desc: 'pandas · numpy · matplotlib · seaborn', credits: 5 },
  { id: 'sql',    label: 'SQL',    icon: '🗄️', color: '#38bdf8', dim: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.22)',  desc: 'PostgreSQL · MySQL · SQLite',            credits: 5 },
  { id: 'dax',    label: 'DAX',    icon: '📊', color: '#f59e0b', dim: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)', desc: 'Power BI · Power Pivot · Excel',         credits: 5 },
]

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text, color }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800) }}
      style={{
        background: 'none', border: `1px solid ${color}44`,
        color: ok ? color : '#4b5563', borderRadius: 4,
        padding: '3px 10px', fontSize: 10, fontFamily: "'Courier Prime', monospace",
        cursor: 'pointer', letterSpacing: 1, transition: 'all .15s',
      }}
    >{ok ? '✓ COPIÉ' : 'COPIER'}</button>
  )
}

// ── Analysis card ─────────────────────────────────────────────────────────────
function AnalysisBlock({ block, index, langId }) {
  const [open, setOpen] = useState(true)
  const lang = LANGUAGES.find(l => l.id === langId) || LANGUAGES[0]

  if (block.type === 'guide') return (
    <div style={{ marginTop: 28, border: '1px solid #1f2937', borderRadius: 10, overflow: 'hidden', background: '#0a0d12' }}>
      <div style={{ padding: '13px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ fontSize: 10, letterSpacing: 2, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, fontFamily: "'Courier Prime', monospace" }}>
          Guide d&apos;installation &amp; configuration
        </span>
      </div>
      <div style={{ padding: '18px 20px', fontSize: 12.5, lineHeight: 1.85, color: '#6b7280', whiteSpace: 'pre-wrap', fontFamily: "'Courier Prime', monospace" }}>
        {block.content}
      </div>
    </div>
  )

  return (
    <div style={{
      border: `1px solid ${open ? lang.border : '#1f2937'}`,
      borderRadius: 10, overflow: 'hidden',
      background: open ? lang.dim : 'rgba(255,255,255,0.01)',
      marginBottom: 14, transition: 'border-color .2s, background .2s',
    }}>
      {/* Card header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: open ? `1px solid ${lang.border}` : 'none', background: 'rgba(0,0,0,0.25)' }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: lang.color + '18', border: `1px solid ${lang.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: lang.color, fontWeight: 700, flexShrink: 0,
          fontFamily: "'Courier Prime', monospace",
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <span style={{ flex: 1, fontSize: 13, color: '#f1f5f9', fontWeight: 700, letterSpacing: .4, fontFamily: "'Courier Prime', monospace" }}>
          {block.titre || `Analyse ${index + 1}`}
        </span>
        <span style={{ color: '#374151', fontSize: 12, display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▶</span>
      </div>

      {open && (
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {block.objectif && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: lang.color, textTransform: 'uppercase', marginBottom: 6, opacity: .75, fontFamily: "'Courier Prime', monospace" }}>↳ Objectif</div>
              <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.72, fontFamily: "'Courier Prime', monospace", margin: 0 }}>{block.objectif}</p>
            </div>
          )}
          {block.demarche && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: lang.color, textTransform: 'uppercase', marginBottom: 6, opacity: .75, fontFamily: "'Courier Prime', monospace" }}>↳ Démarche analytique</div>
              <p style={{ fontSize: 12.5, color: '#9ca3af', lineHeight: 1.72, fontFamily: "'Courier Prime', monospace", margin: 0 }}>{block.demarche}</p>
            </div>
          )}
          {block.code && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 9, letterSpacing: 3, color: lang.color, textTransform: 'uppercase', opacity: .75, fontFamily: "'Courier Prime', monospace" }}>↳ Code {langId.toUpperCase()}</div>
                <CopyBtn text={block.code} color={lang.color} />
              </div>
              <div style={{ background: '#060810', border: `1px solid ${lang.color}18`, borderRadius: 8, padding: '16px 18px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                  {['#ff5f56', '#ffbd2e', '#27c93f'].map(c => (
                    <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: .55 }} />
                  ))}
                </div>
                <pre style={{ margin: 0, fontFamily: "'Courier Prime', monospace", fontSize: 12, lineHeight: 1.72, color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {block.code}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DataAnalysisPage() {
  const allowed = usePlanGuard('starter')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [fileData,     setFileData]     = useState(null)
  const [dragOver,     setDragOver]     = useState(false)
  const [selectedLang, setSelectedLang] = useState('python')
  const [userPrompt,   setUserPrompt]   = useState('')
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState(null)

  const inputRef = useRef(null)
  const lang     = LANGUAGES.find(l => l.id === selectedLang)

  // ── File ingestion ──────────────────────────────────────────────────────────
  const ingestFile = useCallback(async (f) => {
    setError(null); setFileData(null); setResult(null)
    const ext = f.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      const text = await f.text()
      const { columns, rows } = parseCSV(text)
      if (!columns.length) { setError('Impossible de lire le fichier CSV.'); return }
      setFileData({ columns, rows, fileName: f.name })
      return
    }

    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const XLSX = await import('xlsx')
        const buf  = await f.arrayBuffer()
        const wb   = XLSX.read(buf, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const columns = json.length ? Object.keys(json[0]) : []
        const rows    = json.slice(0, 10)
        if (!columns.length) { setError('Feuille Excel vide.'); return }
        setFileData({ columns, rows, fileName: f.name })
      } catch {
        setError('Erreur lecture Excel. Installez : npm install xlsx')
      }
      return
    }
    setError('Format non supporté. Utilisez .csv ou .xlsx')
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]; if (f) ingestFile(f)
  }, [ingestFile])

  const handleFileInput = useCallback((e) => {
    const f = e.target.files[0]; if (f) ingestFile(f)
  }, [ingestFile])

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!fileData) { setError("Veuillez d'abord uploader un fichier."); return }
    if (!hasCredits(lang.credits)) { router.push('/pricing'); return }

    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/generer-dataanalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: fileData.rows, columns: fileData.columns,
          fileName: fileData.fileName, language: selectedLang,
          userPrompt: userPrompt.trim(),
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `Erreur ${res.status}`) }
      const data = await res.json()
      await deductCredits(lang.credits)
      setResult({ blocks: parseBlocks(data.result), rawText: data.result, lang: selectedLang })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadResult = () => {
    if (!result) return
    const blob = new Blob([result.rawText], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `analyse_${result.lang}_${(fileData?.fileName || 'data').replace(/\.[^.]+$/, '')}.md`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Plan guard ──────────────────────────────────────────────────────────────
  if (!allowed) return (
    <div style={{ minHeight: '100vh', background: '#080b0f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin-pg{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 44, height: 44, background: '#4ade80', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={20} color="#080b0f" fill="#080b0f" />
      </div>
      <div style={{ width: 24, height: 24, border: '2px solid #1f2937', borderTop: '2px solid #4ade80', borderRadius: '50%', animation: 'spin-pg .8s linear infinite' }} />
      <p style={{ fontFamily: "'Courier Prime', monospace", fontSize: 10, letterSpacing: 3, color: '#374151', textTransform: 'uppercase', margin: 0 }}>
        Vérification du plan...
      </p>
    </div>
  )

  // ── Shared inline style tokens ──────────────────────────────────────────────
  const S = {
    label: { fontSize: 9, letterSpacing: 3, color: '#374151', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontFamily: "'Courier Prime', monospace" },
    stepNum: { color: '#4ade80', fontWeight: 700, fontFamily: "'Courier Prime', monospace" },
    section: { marginBottom: 32 },
  }

  return (
    <main style={{ minHeight: '100vh', background: '#080b0f', color: '#e2e8f0', fontFamily: "'Courier Prime', monospace", position: 'relative' }}>

      {/* Keyframes injected via a real <style> tag — no @import here */}
      <style>{`
        @keyframes spin-da  { to { transform: rotate(360deg) } }
        @keyframes fadeUp-da { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes blink-da  { 0%,100% { opacity:1 } 50% { opacity:0 } }
      `}</style>

      {/* Scan-line overlay — pure inline, no className */}
      <div style={{
        pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)',
      }} />

      {/* Page content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '48px 20px' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 44, animation: 'fadeUp-da .5s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 4, color: '#374151', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'Courier Prime', monospace" }}>
                ▸ DATA ANALYSIS WORKSTATION
              </div>
              <h1 style={{ fontFamily: "'Bebas Neue', 'Courier Prime', monospace", fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', letterSpacing: 3, lineHeight: 1, color: '#f1f5f9', margin: 0 }}>
                DATA<span style={{ color: '#4ade80' }}>_</span>ANALYSIS
              </h1>
              <p style={{ fontSize: 11, color: '#374151', marginTop: 8, letterSpacing: 1, fontFamily: "'Courier Prime', monospace" }}>
                Upload · Choisir le langage · Générer l&apos;analyse IA
              </p>
            </div>
            {/* Credit counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 8, padding: '8px 16px', flexShrink: 0 }}>
              <Zap size={12} color="#4ade80" fill="#4ade80" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', fontFamily: "'Courier Prime', monospace" }}>{credits}</span>
              <span style={{ fontSize: 10, color: '#374151', letterSpacing: 1, fontFamily: "'Courier Prime', monospace" }}>CRÉDITS</span>
            </div>
          </div>
          <div style={{ marginTop: 24, height: 1, background: 'linear-gradient(to right, rgba(74,222,128,.18), rgba(56,189,248,.1), rgba(245,158,11,.05), transparent)' }} />
        </div>

        {/* ── STEP 01: UPLOAD ── */}
        <section style={{ ...S.section, animation: 'fadeUp-da .5s ease .1s both' }}>
          <div style={S.label}>
            <span style={S.stepNum}>01</span>/ Upload du fichier de données
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `1.5px dashed ${dragOver ? '#4ade80' : '#1f2937'}`,
              borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.01)',
              transition: 'all .2s',
            }}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileInput} />
            {fileData ? (
              <div>
                <div style={{ fontSize: 22, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 700, marginBottom: 4, fontFamily: "'Courier Prime', monospace" }}>{fileData.fileName}</div>
                <div style={{ fontSize: 11, color: '#374151', fontFamily: "'Courier Prime', monospace" }}>{fileData.columns.length} colonnes · {fileData.rows.length} lignes chargées</div>
                <div style={{ fontSize: 10, color: '#1f2937', marginTop: 8, letterSpacing: 1, fontFamily: "'Courier Prime', monospace" }}>Cliquer pour changer de fichier</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: .35 }}>📂</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6, fontFamily: "'Courier Prime', monospace" }}>Glisser-déposer ou cliquer pour sélectionner</div>
                <div style={{ fontSize: 10, color: '#374151', letterSpacing: 1, fontFamily: "'Courier Prime', monospace" }}>CSV · XLSX · XLS — 10 premières lignes utilisées</div>
              </div>
            )}
          </div>

          {/* Data preview table */}
          {fileData && fileData.rows.length > 0 && (
            <div style={{ marginTop: 16, border: '1px solid #1f2937', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid #1f2937', fontSize: 9, letterSpacing: 2, color: '#374151', display: 'flex', justifyContent: 'space-between', fontFamily: "'Courier Prime', monospace" }}>
                <span>APERÇU DES DONNÉES</span>
                <span style={{ color: '#4ade80' }}>{fileData.rows.length} LIGNES · {fileData.columns.length} COLONNES</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {fileData.columns.map(c => (
                        <th key={c} title={c} style={{ background: 'rgba(255,255,255,0.04)', color: '#9ca3af', padding: '7px 12px', textAlign: 'left', fontWeight: 700, letterSpacing: 1, borderBottom: '1px solid #1f2937', whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Courier Prime', monospace" }}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fileData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {fileData.columns.map(c => (
                          <td key={c} title={String(row[c] ?? '')} style={{ padding: '6px 12px', color: '#6b7280', borderBottom: '1px solid rgba(255,255,255,0.025)', whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Courier Prime', monospace" }}>
                            {String(row[c] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── STEP 02: LANGUAGE ── */}
        <section style={{ ...S.section, animation: 'fadeUp-da .5s ease .2s both' }}>
          <div style={S.label}>
            <span style={S.stepNum}>02</span>/ Langage d&apos;analyse
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {LANGUAGES.map(l => (
              <div
                key={l.id}
                onClick={() => setSelectedLang(l.id)}
                style={{
                  flex: 1, minWidth: 160, border: `1.5px solid ${selectedLang === l.id ? l.color : '#1f2937'}`,
                  borderRadius: 10, padding: 16, cursor: 'pointer',
                  background: selectedLang === l.id ? l.dim : 'rgba(255,255,255,0.02)',
                  boxShadow: selectedLang === l.id ? `0 0 20px ${l.color}12` : 'none',
                  transition: 'all .18s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{l.icon}</span>
                  <span style={{ fontFamily: "'Bebas Neue', 'Courier Prime', monospace", fontSize: 18, letterSpacing: 2, color: selectedLang === l.id ? l.color : '#6b7280' }}>{l.label}</span>
                  {selectedLang === l.id && (
                    <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: l.color, boxShadow: `0 0 8px ${l.color}`, animation: 'blink-da 1.5s infinite' }} />
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#374151', letterSpacing: .4, fontFamily: "'Courier Prime', monospace" }}>{l.desc}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={9} color={selectedLang === l.id ? l.color : '#374151'} fill={selectedLang === l.id ? l.color : '#374151'} />
                  <span style={{ fontSize: 10, color: selectedLang === l.id ? l.color : '#374151', fontWeight: 700, fontFamily: "'Courier Prime', monospace" }}>{l.credits} crédits</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STEP 03: PROMPT ── */}
        <section style={{ ...S.section, animation: 'fadeUp-da .5s ease .3s both' }}>
          <div style={S.label}>
            <span style={S.stepNum}>03</span>/ Prompt spécifique&nbsp;
            <span style={{ color: '#1f2937' }}>(optionnel)</span>
          </div>
          <textarea
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder={'Décrivez ce que vous souhaitez analyser...\nEx: "Analyse les tendances mensuelles des ventes"\n\nSi vide → l\'IA réalise une analyse complète automatique.'}
            style={{
              width: '100%', resize: 'vertical', minHeight: 90,
              background: 'rgba(255,255,255,0.03)', border: '1px solid #1f2937',
              borderRadius: 10, padding: '14px 16px', color: '#d1d5db',
              fontFamily: "'Courier Prime', monospace", fontSize: 13, lineHeight: 1.65,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </section>

        {/* Low credits warning */}
        {credits < lang.credits && (
          <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 8, padding: '11px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontFamily: "'Courier Prime', monospace" }}>
            <span style={{ color: '#d97706' }}>⚠ Crédits insuffisants ({lang.credits} requis)</span>
            <button onClick={() => router.push('/pricing')} style={{ background: 'none', border: 'none', color: '#f59e0b', fontWeight: 700, cursor: 'pointer', fontFamily: "'Courier Prime', monospace", fontSize: 11, letterSpacing: 1, textDecoration: 'underline' }}>
              RECHARGER →
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '11px 16px', marginBottom: 16, fontSize: 12, color: '#f87171', display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: "'Courier Prime', monospace" }}>
            <span>⚠</span>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* ── GENERATE BUTTON ── */}
        <button
          onClick={handleGenerate}
          disabled={loading || !fileData || !hasCredits(lang.credits)}
          style={{
            width: '100%', border: 'none', borderRadius: 10, padding: 15,
            fontFamily: "'Courier Prime', monospace", fontSize: 13, fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase', cursor: loading || !fileData || !hasCredits(lang.credits) ? 'not-allowed' : 'pointer',
            transition: 'all .18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            animation: 'fadeUp-da .5s ease .35s both', marginBottom: 44,
            background: loading || !fileData || !hasCredits(lang.credits) ? 'rgba(255,255,255,0.03)' : lang.dim,
            border: `1.5px solid ${loading || !fileData || !hasCredits(lang.credits) ? '#1f2937' : lang.color + '55'}`,
            color: loading || !fileData || !hasCredits(lang.credits) ? '#374151' : lang.color,
          }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: `2px solid ${lang.color}33`, borderTop: `2px solid ${lang.color}`, borderRadius: '50%', animation: 'spin-da .7s linear infinite' }} />
              Analyse en cours...
            </>
          ) : (
            <><Zap size={14} fill="currentColor" /> Générer l&apos;analyse {lang.label} · ⚡{lang.credits}</>
          )}
        </button>

        {/* ── RESULTS ── */}
        {result && (
          <div style={{ animation: 'fadeUp-da .5s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 3, color: '#374151', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'Courier Prime', monospace" }}>Résultats de l&apos;analyse</div>
                <div style={{ fontFamily: "'Bebas Neue', 'Courier Prime', monospace", fontSize: '1.4rem', letterSpacing: 2, color: lang.color }}>
                  {result.lang.toUpperCase()} ANALYSIS — {fileData?.fileName}
                </div>
              </div>
              <button
                onClick={downloadResult}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1f2937', color: '#9ca3af', borderRadius: 7, padding: '7px 14px', fontFamily: "'Courier Prime', monospace", fontSize: 10, letterSpacing: 1.5, cursor: 'pointer' }}
              >
                📥 EXPORTER .MD
              </button>
            </div>

            <div style={{ height: 1, background: `linear-gradient(to right, ${lang.color}44, transparent)`, marginBottom: 24 }} />

            {result.blocks.length > 0
              ? result.blocks.map((block, i) => <AnalysisBlock key={i} block={block} index={i} langId={result.lang} />)
              : (
                <div style={{ background: '#060810', border: '1px solid #1f2937', borderRadius: 10, padding: 24 }}>
                  <pre style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, color: '#9ca3af', whiteSpace: 'pre-wrap', lineHeight: 1.72, margin: 0 }}>
                    {result.rawText}
                  </pre>
                </div>
              )
            }
          </div>
        )}

      </div>
    </main>
  )
}