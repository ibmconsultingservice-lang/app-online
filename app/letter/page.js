'use client'

import { useState } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap, Download, FileText, Printer } from 'lucide-react'

const LETTER_TYPES = [
  { value: 'professional', label: 'Professionnelle' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'resignation', label: 'Démission' },
  { value: 'complaint', label: 'Réclamation' },
  { value: 'commercial', label: 'Commerciale' },
  { value: 'administrative', label: 'Administrative' },
]

const EMPTY_LETTER = {
  senderName: '',
  senderAddress: '',
  senderCityDate: '',
  recipientName: '',
  recipientAddress: '',
  subject: '',
  salutation: '',
  opening: '',
  body: '',
  closing: '',
  signature: '',
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
        await deductCredits(2)
      }
    } catch (err) {
      alert('Erreur de génération. Vérifiez la console.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const exportToWord = () => {
    const el = document.getElementById('letter-document')
    const clone = el.cloneNode(true)
    clone.querySelectorAll('.no-print').forEach(e => e.remove())

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        body { font-family: 'Georgia', serif; padding: 40px; color: #1a1a1a; }
        .letter-field { margin-bottom: 8px; }
        .letter-body { margin: 24px 0; line-height: 1.8; }
      </style></head><body>${clone.innerHTML}</body></html>`

    const blob = new Blob(['\ufeff', html], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Lettre_${Date.now()}.doc`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
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

      {/* ── LEFT PANEL: Controls ── */}
      <aside className="lg:w-[380px] lg:min-h-screen bg-[#0f1117] border-r border-white/5 flex flex-col p-8 gap-6 shrink-0">

        {/* Logo / Title */}
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

        {/* Low credits */}
        {credits < 2 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-amber-300 text-xs font-bold">⚠️ 2 crédits requis</span>
            <button onClick={() => router.push('/pricing')}
              className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black px-3 py-1 rounded-lg hover:bg-amber-400 transition-all">
              Recharger
            </button>
          </div>
        )}

        {/* Letter Type */}
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

        {/* Prompt */}
        <div className="space-y-2 flex-1">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Description</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ex: Lettre de démission adressée à mon directeur M. Diallo, après 3 ans de service, ton respectueux..."
            className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/80 placeholder-white/20 resize-none outline-none focus:border-amber-400/40 focus:bg-white/8 transition-all leading-relaxed"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !hasCredits(2)}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${
            loading || !hasCredits(2)
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-amber-400 text-black hover:bg-amber-300 hover:-translate-y-0.5 shadow-xl shadow-amber-500/20'
          }`}>
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Rédaction en cours...
            </>
          ) : (
            <>
              <Zap size={13} fill="currentColor" />
              Générer la lettre · ⚡2
            </>
          )}
        </button>

        {/* Export Buttons */}
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
      </aside>

      {/* ── RIGHT PANEL: Letter Preview ── */}
      <div className="flex-1 bg-[#1a1c23] lg:overflow-y-auto flex items-start justify-center p-6 lg:p-12">

        {/* A4 Letter */}
        <div
          id="letter-document"
          className="w-full max-w-[680px] bg-white rounded-sm shadow-2xl shadow-black/50 p-14 space-y-6"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif", minHeight: '900px' }}
        >

          {/* Sender */}
          <div className="space-y-1">
            <LetterField
              value={letter.senderName}
              onChange={v => updateField('senderName', v)}
              placeholder="Votre Nom & Prénom"
              className="font-bold text-base text-slate-900"
            />
            <LetterField
              value={letter.senderAddress}
              onChange={v => updateField('senderAddress', v)}
              placeholder="Votre adresse complète"
              className="text-sm text-slate-600"
              multiline
            />
            <LetterField
              value={letter.senderCityDate}
              onChange={v => updateField('senderCityDate', v)}
              placeholder="Dakar, le [date]"
              className="text-sm text-slate-600"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Recipient */}
          <div className="space-y-1 text-right">
            <LetterField
              value={letter.recipientName}
              onChange={v => updateField('recipientName', v)}
              placeholder="Nom du destinataire"
              className="font-bold text-base text-slate-900 text-right"
              align="right"
            />
            <LetterField
              value={letter.recipientAddress}
              onChange={v => updateField('recipientAddress', v)}
              placeholder="Adresse du destinataire"
              className="text-sm text-slate-600 text-right"
              multiline
              align="right"
            />
          </div>

          {/* Subject */}
          <div className="pt-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 no-print">Objet</span>
            <LetterField
              value={letter.subject}
              onChange={v => updateField('subject', v)}
              placeholder="Objet : ..."
              className="font-bold text-sm text-slate-800 mt-1 underline underline-offset-2"
            />
          </div>

          {/* Salutation */}
          <LetterField
            value={letter.salutation}
            onChange={v => updateField('salutation', v)}
            placeholder="Madame, Monsieur,"
            className="text-sm text-slate-800 font-medium"
          />

          {/* Opening */}
          <LetterField
            value={letter.opening}
            onChange={v => updateField('opening', v)}
            placeholder="Paragraphe d'introduction..."
            className="text-sm text-slate-700 leading-relaxed"
            multiline
          />

          {/* Body */}
          <LetterField
            value={letter.body}
            onChange={v => updateField('body', v)}
            placeholder="Corps de la lettre..."
            className="text-sm text-slate-700 leading-relaxed"
            multiline
            tall
          />

          {/* Closing */}
          <LetterField
            value={letter.closing}
            onChange={v => updateField('closing', v)}
            placeholder="Formule de politesse..."
            className="text-sm text-slate-700 leading-relaxed"
            multiline
          />

          {/* Signature */}
          <div className="pt-4">
            <LetterField
              value={letter.signature}
              onChange={v => updateField('signature', v)}
              placeholder="Signature / Nom"
              className="font-bold text-base text-slate-900 italic"
            />
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
          border-radius: 4px;
          padding: 2px 4px;
          margin: -2px -4px;
        }
        .letter-editable:hover { background: rgba(251, 191, 36, 0.06); }
        .letter-editable:focus { background: rgba(251, 191, 36, 0.1); outline: 1px solid rgba(251,191,36,0.3); }
        .letter-editable::placeholder { color: #cbd5e1; font-style: italic; }
      `}</style>
    </main>
  )
}

// ── Reusable editable field ──
function LetterField({ value, onChange, placeholder, className = '', multiline = false, tall = false, align = 'left' }) {
  const base = `letter-editable ${className}`
  const style = { textAlign: align }

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={tall ? 8 : 3}
        className={base}
        style={style}
      />
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={base}
      style={style}
    />
  )
}