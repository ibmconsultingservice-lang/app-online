'use client'

import { useState, useCallback } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap, Plus, Trash2, Type, Table2, FileDown, Printer, Sparkles, ImagePlus } from 'lucide-react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy:   '#0F2540',
  blue:   '#1A5276',
  accent: '#D4790A',
  accentL:'#F0A030',
  silver: '#F2F4F7',
  border: '#DDE2EA',
  muted:  '#6B7A90',
  text:   '#1C2534',
  white:  '#FFFFFF',
  danger: '#EF4444',
  green:  '#059669',
  stripe: '#F7F9FC',
}

const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 6, border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', transition: 'opacity .15s',
}

// ─── Shared button components ─────────────────────────────────────────────────
function Btn({ onClick, style = {}, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...btnBase, background: C.navy, color: C.white,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer', ...style }}>
      {children}
    </button>
  )
}

function GhostBtn({ onClick, style = {}, children }) {
  return (
    <button onClick={onClick}
      style={{ ...btnBase, background: 'transparent', color: C.muted,
        border: `1px solid ${C.border}`, ...style }}>
      {children}
    </button>
  )
}

// ─── Block: Text ─────────────────────────────────────────────────────────────
function TextBlock({ block, sectionId, onUpdate }) {
  return (
    <div
      contentEditable suppressContentEditableWarning
      onBlur={e => onUpdate(sectionId, block.id, { content: e.currentTarget.innerText })}
      style={{
        minHeight: 40, color: C.text, lineHeight: 1.8, fontSize: 14,
        outline: 'none', padding: '6px 2px',
        borderBottom: `1px dashed ${C.border}`,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
      {block.content}
    </div>
  )
}

// ─── Block: Table ─────────────────────────────────────────────────────────────
function TableBlock({ block, sectionId, onUpdate, onAddRow, onAddCol }) {
  const { headers, rows } = block.content

  const updateHeader = (idx, value) => {
    const newHeaders = headers.map((h, i) => i === idx ? value : h)
    onUpdate(sectionId, block.id, { content: { headers: newHeaders, rows } })
  }

  const updateCell = (ri, ci, value) => {
    const newRows = rows.map((row, r) =>
      r === ri ? row.map((cell, c) => c === ci ? value : cell) : row
    )
    onUpdate(sectionId, block.id, { content: { headers, rows: newRows } })
  }

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <GhostBtn onClick={() => onAddRow(sectionId, block.id)} style={{ fontSize: 12 }}>
          <Plus size={12} /> Ligne
        </GhostBtn>
        <GhostBtn onClick={() => onAddCol(sectionId, block.id)} style={{ fontSize: 12 }}>
          <Plus size={12} /> Colonne
        </GhostBtn>
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.navy }}>
              {headers.map((h, i) => (
                <th key={i} contentEditable suppressContentEditableWarning
                  onBlur={e => updateHeader(i, e.currentTarget.innerText)}
                  style={{
                    padding: '10px 14px', color: C.white, fontWeight: 600,
                    textAlign: 'left', outline: 'none',
                    borderRight: i < headers.length - 1 ? '1px solid rgba(255,255,255,.12)' : 'none',
                  }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? C.white : C.stripe }}>
                {row.map((cell, ci) => (
                  <td key={ci} contentEditable suppressContentEditableWarning
                    onBlur={e => updateCell(ri, ci, e.currentTarget.innerText)}
                    style={{
                      padding: '9px 14px', color: C.text, outline: 'none',
                      borderTop: `1px solid ${C.border}`,
                      borderRight: ci < row.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Block: Image ─────────────────────────────────────────────────────────────
function ImageBlock({ block, sectionId, onUpload }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: block.content ? 0 : '32px 0',
      border: block.content ? 'none' : `2px dashed ${C.border}`,
      borderRadius: 8,
      background: block.content ? 'transparent' : C.silver,
    }}>
      {block.content ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.content} alt="Illustration"
          style={{ maxWidth: '100%', borderRadius: 8, display: 'block', margin: '0 auto' }} />
      ) : (
        <label style={{ cursor: 'pointer', color: C.muted, fontSize: 13, display: 'block' }}>
          <ImagePlus size={28} color={C.muted}
            style={{ display: 'block', margin: '0 auto 10px' }} />
          Cliquer pour ajouter une image
          <input type="file" accept="image/*" className="no-print"
            style={{ display: 'none' }}
            onChange={e => onUpload(e, sectionId, block.id)} />
        </label>
      )}
    </div>
  )
}

// ─── Block wrapper (label + delete) ──────────────────────────────────────────
const TYPE_LABELS = { text: 'Paragraphe', table: 'Tableau', image: 'Image' }

function BlockWrapper({ block, sectionId, onDelete, onUpdate, onAddRow, onAddCol, onUpload }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Meta bar */}
      <div className="no-print" style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 6,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
          color: C.muted, textTransform: 'uppercase',
        }}>
          {TYPE_LABELS[block.type] ?? block.type}
        </span>
        <button onClick={() => onDelete(sectionId, block.id)}
          style={{ ...btnBase, padding: '2px 8px', fontSize: 11,
            background: 'transparent', color: C.danger, border: '1px solid #FEE2E2' }}>
          <Trash2 size={10} /> Supprimer
        </button>
      </div>

      {block.type === 'text' && (
        <TextBlock block={block} sectionId={sectionId} onUpdate={onUpdate} />
      )}
      {block.type === 'table' && (
        <TableBlock block={block} sectionId={sectionId}
          onUpdate={onUpdate} onAddRow={onAddRow} onAddCol={onAddCol} />
      )}
      {block.type === 'image' && (
        <ImageBlock block={block} sectionId={sectionId} onUpload={onUpload} />
      )}
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ section, index, onDeleteSection, onAddBlock, onDeleteBlock,
  onUpdateBlock, onAddRow, onAddCol, onUpload }) {

  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginBottom: 28, borderRadius: 12,
        border: `1px solid ${hovered ? C.blue : C.border}`,
        overflow: 'hidden', transition: 'border-color .2s',
        background: C.white,
      }}>

      {/* Section header bar */}
      <div style={{ background: C.navy, padding: '13px 20px',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          background: C.accent, color: C.white, borderRadius: 6,
          width: 26, height: 26, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>
          {index + 1}
        </span>
        <h2 contentEditable suppressContentEditableWarning
          style={{ flex: 1, color: C.white, fontSize: 15, fontWeight: 700,
            margin: 0, outline: 'none', letterSpacing: 0.3 }}>
          {section.title}
        </h2>
        <button className="no-print" onClick={() => onDeleteSection(section.id)}
          style={{ ...btnBase, padding: '4px 8px',
            background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.65)',
            border: '1px solid rgba(255,255,255,.12)' }}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* Add-block toolbar */}
      <div className="no-print" style={{
        background: C.silver, padding: '9px 20px', display: 'flex', gap: 8,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <GhostBtn onClick={() => onAddBlock(section.id, 'text')} style={{ fontSize: 12 }}>
          <Type size={13} /> Texte
        </GhostBtn>
        <GhostBtn onClick={() => onAddBlock(section.id, 'table')} style={{ fontSize: 12 }}>
          <Table2 size={13} /> Tableau
        </GhostBtn>
        <GhostBtn onClick={() => onAddBlock(section.id, 'image')} style={{ fontSize: 12 }}>
          <ImagePlus size={13} /> Image
        </GhostBtn>
      </div>

      {/* Block list */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {section.blocks.length === 0 && (
          <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '12px 0', margin: 0 }}>
            Section vide — utilisez la barre ci-dessus pour ajouter du contenu.
          </p>
        )}
        {section.blocks.map(block => (
          <BlockWrapper key={block.id} block={block} sectionId={section.id}
            onDelete={onDeleteBlock} onUpdate={onUpdateBlock}
            onAddRow={onAddRow} onAddCol={onAddCol} onUpload={onUpload} />
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BusinessPlanPage() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [prompt, setPrompt]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [sections, setSections] = useState([])
  const [docTitle, setDocTitle] = useState('MON BUSINESS PLAN')

  // ── AI generation ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return alert('Veuillez entrer une description.')
    if (!hasCredits(5)) { router.push('/pricing'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/generer-businessplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) throw new Error(`Erreur serveur ${res.status}`)
      const data = await res.json()
      if (data.sections) {
        await deductCredits(5)
        setSections(data.sections)
        document.getElementById('bp-doc')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch (err) {
      alert('Erreur de génération. Vérifie la console.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Section ops ────────────────────────────────────────────────────────────
  const addSection = useCallback(() => {
    const now = Date.now()
    setSections(prev => [...prev, {
      id: now, title: 'Nouvelle Section',
      blocks: [{ id: now + 1, type: 'text', content: 'Contenu de la section...' }],
    }])
  }, [])

  const deleteSection = useCallback(id => {
    setSections(prev => prev.filter(s => s.id !== id))
  }, [])

  // ── Block ops ──────────────────────────────────────────────────────────────
  const addBlock = useCallback((sectionId, type) => {
    const content =
      type === 'table' ? { headers: ['Colonne A', 'Colonne B', 'Colonne C'], rows: [['-', '-', '-']] }
      : type === 'image' ? null
      : 'Saisissez votre texte ici...'
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? { ...s, blocks: [...s.blocks, { id: Date.now(), type, content }] }
        : s
    ))
  }, [])

  const deleteBlock = useCallback((sectionId, blockId) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) }
        : s
    ))
  }, [])

  // Generic updater — merges patch into block (handles both text content and table content)
  const updateBlock = useCallback((sectionId, blockId, patch) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? { ...s, blocks: s.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b) }
        : s
    ))
  }, [])

  const addRow = useCallback((sectionId, blockId) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? {
        ...s,
        blocks: s.blocks.map(b => b.id === blockId ? {
          ...b,
          content: {
            ...b.content,
            rows: [...b.content.rows, new Array(b.content.headers.length).fill('-')],
          },
        } : b),
      } : s
    ))
  }, [])

  const addCol = useCallback((sectionId, blockId) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? {
        ...s,
        blocks: s.blocks.map(b => b.id === blockId ? {
          ...b,
          content: {
            headers: [...b.content.headers, 'Nouveau'],
            rows: b.content.rows.map(r => [...r, '-']),
          },
        } : b),
      } : s
    ))
  }, [])

  const handleImageUpload = useCallback((e, sectionId, blockId) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => updateBlock(sectionId, blockId, { content: reader.result })
    reader.readAsDataURL(file)
  }, [updateBlock])

  // ── Export Word ────────────────────────────────────────────────────────────
  const exportToWord = () => {
    const el = document.getElementById('bp-doc')
    if (!el) return
    const clone = el.cloneNode(true)
    clone.querySelectorAll('.no-print').forEach(n => n.remove())
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        body  { font-family: Arial, sans-serif; padding: 24px; color: #1C2534; }
        h1    { color: #0F2540; text-align: center; border-bottom: 3px solid #D4790A; padding-bottom: 10px; }
        h2    { color: #D4790A; margin-top: 28px; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th    { background: #0F2540; color: #fff; padding: 9px 13px; text-align: left; font-weight: 700; }
        td    { border: 1px solid #DDE2EA; padding: 8px 13px; }
        tr:nth-child(even) td { background: #F7F9FC; }
        img   { max-width: 100%; border-radius: 6px; display: block; margin: 8px auto; }
      </style></head>
      <body>${clone.innerHTML}</body></html>`
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-word' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${docTitle.replace(/\s+/g, '_')}.doc`,
    })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  // ── Plan guard ─────────────────────────────────────────────────────────────
  if (!allowed) return (
    <div style={{ minHeight: '100vh', background: C.silver,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 18 }}>
      <div style={{ width: 44, height: 44, background: C.navy, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={20} color="white" fill="white" />
      </div>
      <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`,
        borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2px',
        color: C.muted, textTransform: 'uppercase', margin: 0 }}>
        Vérification du plan…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main style={{ background: C.silver, minHeight: '100vh', padding: '28px 20px',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Generator panel ── */}
      <div className="no-print" style={{
        maxWidth: 960, margin: '0 auto 24px',
        background: C.white, borderRadius: 14,
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
        {/* Panel header */}
        <div style={{ background: C.navy, padding: '15px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={17} color={C.accentL} />
            <span style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>
              Générateur IA · Business Plan
            </span>
          </div>
          {/* Credits badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 20, padding: '5px 13px' }}>
            <Zap size={13} color={C.accentL} fill={C.accentL} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{credits} crédits</span>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Low-credit warning */}
          {credits < 5 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: 8, padding: '10px 14px', marginBottom: 14,
              fontSize: 13, color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠️ Crédits insuffisants (5 requis) —
              <button onClick={() => router.push('/pricing')}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: '#D97706', fontWeight: 700, textDecoration: 'underline', padding: 0 }}>
                Recharger
              </button>
            </div>
          )}

          {/* Prompt input */}
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="Ex : Business plan pour une agence de marketing digital à Dakar ciblant les PME locales…"
            style={{ width: '100%', height: 82, padding: '11px 14px', resize: 'vertical',
              borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14,
              fontFamily: 'inherit', color: C.text, background: C.silver,
              lineHeight: 1.6, outline: 'none', boxSizing: 'border-box' }} />

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Btn onClick={handleGenerate} disabled={loading || !hasCredits(5)}
              style={{ flex: 3, justifyContent: 'center', padding: '12px 18px',
                fontSize: 14, borderRadius: 8,
                background: loading ? C.blue : !hasCredits(5) ? '#94A3B8' : C.navy }}>
              {loading ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)',
                    borderTopColor: 'white', borderRadius: '50%',
                    animation: 'spin 1s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                  Rédaction en cours…
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Générer avec sumuria
                  <span style={{ opacity: 0.55, fontSize: 12, marginLeft: 2 }}>· ⚡5</span>
                </>
              )}
            </Btn>
            <Btn onClick={exportToWord}
              style={{ flex: 1, justifyContent: 'center', borderRadius: 8, background: C.blue }}>
              <FileDown size={15} /> Word
            </Btn>
            <Btn onClick={() => window.print()}
              style={{ flex: 1, justifyContent: 'center', borderRadius: 8, background: C.accent }}>
              <Printer size={15} /> PDF
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Document ── */}
      <div id="bp-doc" style={{
        maxWidth: 960, margin: '0 auto',
        background: C.white, borderRadius: 14,
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
        {/* Document cover */}
        <div style={{ background: C.navy, padding: '44px 52px 36px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: C.accent,
            borderRadius: 6, padding: '3px 14px', fontSize: 11,
            fontWeight: 800, letterSpacing: 1.5, color: C.white,
            textTransform: 'uppercase', marginBottom: 18 }}>
            Business Plan
          </div>
          <h1 contentEditable suppressContentEditableWarning
            onBlur={e => setDocTitle(e.currentTarget.innerText)}
            style={{ color: C.white, fontSize: 30, fontWeight: 800,
              margin: '0 0 12px', outline: 'none', letterSpacing: 0.4, lineHeight: 1.2 }}>
            {docTitle}
          </h1>
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, margin: 0 }}>
            Cliquez sur les titres et contenus pour les modifier directement
          </p>
        </div>

        {/* Sections body */}
        <div style={{ padding: '36px 48px' }}>
          {sections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: C.muted }}>
              <Sparkles size={32} color={C.border}
                style={{ display: 'block', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: C.text }}>
                Aucune section pour le moment
              </p>
              <p style={{ fontSize: 13, margin: 0 }}>
                Utilisez le générateur IA ci-dessus ou ajoutez une section manuellement.
              </p>
            </div>
          )}

          {sections.map((section, i) => (
            <Section key={section.id} section={section} index={i}
              onDeleteSection={deleteSection}
              onAddBlock={addBlock}
              onDeleteBlock={deleteBlock}
              onUpdateBlock={updateBlock}
              onAddRow={addRow}
              onAddCol={addCol}
              onUpload={handleImageUpload}
            />
          ))}

          {/* Add section button */}
          <div className="no-print" style={{ textAlign: 'center', paddingTop: 8 }}>
            <Btn onClick={addSection}
              style={{ background: C.green, padding: '11px 28px',
                fontSize: 14, borderRadius: 8, justifyContent: 'center' }}>
              <Plus size={16} /> Ajouter une section
            </Btn>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media print {
          .no-print { display: none !important; }
          #bp-doc {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
        * { box-sizing: border-box; }
        [contenteditable]:focus {
          outline: 2px solid ${C.blue} !important;
          outline-offset: 2px;
          border-radius: 3px;
        }
      `}</style>
    </main>
  )
}