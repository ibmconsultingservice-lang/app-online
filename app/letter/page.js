'use client'

import { useState, useRef, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap, FileText, Printer, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'

const LETTER_TYPES = [
  { value: 'professional',   label: 'Professionnelle' },
  { value: 'motivation',     label: 'Motivation' },
  { value: 'resignation',    label: 'Démission' },
  { value: 'complaint',      label: 'Réclamation' },
  { value: 'commercial',     label: 'Commerciale' },
  { value: 'administrative', label: 'Administrative' },
]

const EMPTY_LETTER = {
  senderName: '', senderAddress: '', senderCityDate: '',
  recipientName: '', recipientAddress: '',
  subject: '', salutation: '', opening: '', body: '', closing: '', signature: '',
}

const DEFAULT_SECTIONS = [
  { id: 'sender',     label: 'Expéditeur',      fields: ['senderName', 'senderAddress', 'senderCityDate'] },
  { id: 'divider',    label: null,               fields: [] },
  { id: 'recipient',  label: 'Destinataire',     fields: ['recipientName', 'recipientAddress'] },
  { id: 'subject',    label: 'Objet',            fields: ['subject'] },
  { id: 'salutation', label: "Formule d'appel",  fields: ['salutation'] },
  { id: 'opening',    label: 'Introduction',     fields: ['opening'] },
  { id: 'body',       label: 'Corps',            fields: ['body'] },
  { id: 'closing',    label: 'Politesse',        fields: ['closing'] },
  { id: 'signature',  label: 'Signature',        fields: ['signature'] },
]

const FIELD_CONFIG = {
  senderName:       { placeholder: 'Votre Nom & Prénom',          cls: 'font-bold text-base text-slate-900',                              multi: false },
  senderAddress:    { placeholder: 'Votre adresse complète',       cls: 'text-sm text-slate-600',                                         multi: true  },
  senderCityDate:   { placeholder: 'Dakar, le [date]',             cls: 'text-sm text-slate-600',                                         multi: false },
  recipientName:    { placeholder: 'Nom du destinataire',          cls: 'font-bold text-base text-slate-900', align: 'right',              multi: false },
  recipientAddress: { placeholder: 'Adresse du destinataire',      cls: 'text-sm text-slate-600',             align: 'right',              multi: true  },
  subject:          { placeholder: 'Objet : ...',                  cls: 'font-bold text-sm text-slate-800 underline underline-offset-2',   multi: false },
  salutation:       { placeholder: 'Madame, Monsieur,',            cls: 'text-sm text-slate-800 font-medium',                             multi: false },
  opening:          { placeholder: "Paragraphe d'introduction...", cls: 'text-sm text-slate-700 leading-relaxed',                         multi: true  },
  body:             { placeholder: 'Corps de la lettre...',        cls: 'text-sm text-slate-700 leading-relaxed',                         multi: true  },
  closing:          { placeholder: 'Formule de politesse...',      cls: 'text-sm text-slate-700 leading-relaxed',                         multi: true  },
  signature:        { placeholder: 'Signature / Nom',              cls: 'font-bold text-base text-slate-900 italic pt-2',                  multi: false },
}

// Auto-resize textarea — grows to fit content, never scrolls
function AutoTextarea({ value, onChange, placeholder, className = '', align = 'left' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={`letter-editable ${className}`}
      style={{ textAlign: align, overflow: 'hidden', minHeight: '28px' }}
    />
  )
}

function AutoInput({ value, onChange, placeholder, className = '', align = 'left' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`letter-editable ${className}`}
      style={{ textAlign: align }}
    />
  )
}

export default function LetterPage() {
  const allowed = usePlanGuard('starter')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [prompt, setPrompt] = useState('')
  const [letterType, setLetterType] = useState('professional')
  const [loading, setLoading] = useState(false)
  const [letter, setLetter] = useState(EMPTY_LETTER)
  const [generated, setGenerated] = useState(false)
  const [sections, setSections] = useState(DEFAULT_SECTIONS)

  const dragIndex = useRef(null)

  const updateField = (field, value) => setLetter(prev => ({ ...prev, [field]: value }))

  const handleGenerate = async () => {
    if (!prompt.trim()) return alert('Veuillez décrire votre lettre.')
    if (!hasCredits(2)) { router.push('/pricing'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/generer-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, letterType }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      if (data.letter) {
        setLetter(data.letter)
        setGenerated(true)
        setSections(DEFAULT_SECTIONS)
        await deductCredits(2)
      }
    } catch (err) {
      alert('Erreur de génération. Vérifiez la console.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Arrow button reorder — skips the divider
  const moveSection = (index, dir) => {
    if (sections[index].id === 'divider') return
    const next = [...sections]
    let target = index + dir
    if (target < 0 || target >= next.length) return
    if (next[target].id === 'divider') target += dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setSections(next)
  }

  // Drag-and-drop reorder
  const onDragStart = (e, i) => { dragIndex.current = i; e.dataTransfer.effectAllowed = 'move' }
  const onDragOver  = (e)    => e.preventDefault()
  const onDrop      = (e, i) => {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === i) return
    const next = [...sections]
    const [moved] = next.splice(from, 1)
    next.splice(i, 0, moved)
    setSections(next)
    dragIndex.current = null
  }

  const exportToWord = () => {
    const el = document.getElementById('letter-document')
    const clone = el.cloneNode(true)
    clone.querySelectorAll('.no-print').forEach(e => e.remove())
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        body { font-family: Georgia, serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
      </style></head><body>${clone.innerHTML}</body></html>`
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Lettre_${Date.now()}.doc`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const renderSection = (section, index) => {
    if (section.id === 'divider') {
      return (
        <div key="divider" className="py-2">
          <div className="border-t border-slate-100" />
        </div>
      )
    }

    const isFirst = index === 0
    const isLast  = index === sections.length - 1
    const isRight = section.id === 'recipient'

    return (
      <div
        key={section.id}
        draggable
        onDragStart={e => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={e => onDrop(e, index)}
        className="group relative py-3 -mx-4 px-4 rounded-xl hover:bg-amber-50/40 transition-colors duration-150"
      >
        {/* Left controls: drag handle + arrows */}
        <div className="no-print absolute -left-7 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-amber-500 transition-colors">
            <GripVertical size={14} />
          </div>
          {!isFirst && (
            <button onClick={() => moveSection(index, -1)} className="text-slate-300 hover:text-amber-500 transition-colors">
              <ChevronUp size={13} />
            </button>
          )}
          {!isLast && (
            <button onClick={() => moveSection(index, 1)} className="text-slate-300 hover:text-amber-500 transition-colors">
              <ChevronDown size={13} />
            </button>
          )}
        </div>

        {/* Section label badge */}
        {section.label && (
          <div className="no-print absolute right-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/70 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
              {section.label}
            </span>
          </div>
        )}

        {/* Fields */}
        <div className={`space-y-1 ${isRight ? 'text-right' : ''}`}>
          {section.fields.map(field => {
            const cfg = FIELD_CONFIG[field]
            if (!cfg) return null
            return cfg.multi ? (
              <AutoTextarea
                key={field}
                value={letter[field]}
                onChange={v => updateField(field, v)}
                placeholder={cfg.placeholder}
                className={cfg.cls}
                align={cfg.align || 'left'}
              />
            ) : (
              <AutoInput
                key={field}
                value={letter[field]}
                onChange={v => updateField(field, v)}
                placeholder={cfg.placeholder}
                className={cfg.cls}
                align={cfg.align || 'left'}
              />
            )
          })}
        </div>
      </div>
    )
  }

  if (!allowed) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center">
        <Zap size={20} color="#0f1117" fill="#0f1117" />
      </div>
      <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#0f1117] font-sans flex flex-col lg:flex-row">

      {/* ── LEFT PANEL ── */}
      <aside className="lg:w-[380px] lg:min-h-screen bg-[#0f1117] border-r border-white/5 flex flex-col p-8 gap-6 shrink-0">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-black tracking-tight italic">
              Letter<span className="text-amber-400">AI</span>
            </h1>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-bold mt-0.5">Rédacteur intelligent</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <Zap size={11} className="text-amber-400" fill="currentColor" />
            <span className="text-xs font-black text-white/70">{credits}</span>
          </div>
        </div>

        {credits < 2 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-amber-300 text-xs font-bold">⚠️ 2 crédits requis</span>
            <button onClick={() => router.push('/pricing')}
              className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black px-3 py-1 rounded-lg hover:bg-amber-400 transition-all">
              Recharger
            </button>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Type de lettre</label>
          <div className="grid grid-cols-2 gap-2">
            {LETTER_TYPES.map(t => (
              <button key={t.value} onClick={() => setLetterType(t.value)}
                className={`py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all border ${
                  letterType === t.value
                    ? 'bg-amber-400 text-black border-amber-400'
                    : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/70'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 flex-1">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Description</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ex: Lettre de démission adressée à mon directeur M. Diallo, après 3 ans de service, ton respectueux..."
            className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/80 placeholder-white/20 resize-none outline-none focus:border-amber-400/40 transition-all leading-relaxed"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !hasCredits(2)}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${
            loading || !hasCredits(2)
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-amber-400 text-black hover:bg-amber-300 hover:-translate-y-0.5 shadow-xl shadow-amber-500/20'
          }`}>
          {loading ? (
            <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Rédaction en cours...</>
          ) : (
            <><Zap size={13} fill="currentColor" /> Générer la lettre · ⚡2</>
          )}
        </button>

        {generated && (
          <div className="flex gap-2">
            <button onClick={exportToWord}
              className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 hover:border-blue-500/30 hover:text-blue-300 transition-all flex items-center justify-center gap-1.5">
              <FileText size={12} /> Word
            </button>
            <button onClick={() => window.print()}
              className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white/80 transition-all flex items-center justify-center gap-1.5">
              <Printer size={12} /> PDF
            </button>
          </div>
        )}

        {/* Drag hint */}
        {generated && (
          <p className="text-[9px] text-white/20 text-center font-bold uppercase tracking-widest">
            ↕ Survolez une section pour la déplacer
          </p>
        )}
      </aside>

      {/* ── RIGHT PANEL: A4 Letter ── */}
      <div className="flex-1 bg-[#1a1c23] flex items-start justify-center p-6 lg:p-12">
        <div
          id="letter-document"
          className="w-full max-w-[680px] bg-white rounded-sm shadow-2xl shadow-black/50 px-14 py-12"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {/* Offset left controls outside the white card */}
          <div className="relative ml-8">
            {sections.map((section, index) => renderSection(section, index))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          main { display: block !important; background: white !important; }
          #letter-document { box-shadow: none !important; margin: 0 !important; padding: 40px !important; }
        }
        .letter-editable {
          outline: none;
          border: none;
          background: transparent;
          width: 100%;
          resize: none;
          font-family: inherit;
          transition: background 0.15s;
          border-radius: 3px;
          padding: 2px 4px;
          margin: -2px -4px;
          display: block;
          line-height: 1.7;
          overflow: hidden;
        }
        .letter-editable:focus {
          background: rgba(251,191,36,0.08);
          outline: 1px solid rgba(251,191,36,0.3);
        }
        .letter-editable::placeholder { color: #cbd5e1; font-style: italic; }
        [draggable="true"] { cursor: grab; }
        [draggable="true"]:active { cursor: grabbing; }
      `}</style>
    </main>
  )
}