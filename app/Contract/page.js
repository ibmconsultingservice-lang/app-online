'use client'

import { useState, useRef, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap, FileText, Printer, GripVertical, ChevronUp, ChevronDown, Scale } from 'lucide-react'

// ── Contract types ──────────────────────────────────────────────
const CONTRACT_TYPES = [
  { value: 'cdi',         label: 'CDI',              sublabel: 'Contrat de Travail',        icon: '👔' },
  { value: 'cdd',         label: 'CDD',              sublabel: 'Contrat Temporaire',         icon: '📅' },
  { value: 'bail_hab',    label: 'Bail Habitation',  sublabel: 'Location Résidentielle',     icon: '🏠' },
  { value: 'bail_com',    label: 'Bail Commercial',  sublabel: 'Local Professionnel',        icon: '🏢' },
  { value: 'vente',       label: 'Vente',            sublabel: 'Transfert de Propriété',     icon: '🤝' },
  { value: 'prestation',  label: 'Prestation',       sublabel: 'Services & Consulting',      icon: '⚙️' },
  { value: 'stage',       label: 'Stage',            sublabel: 'Convention de Stage',        icon: '🎓' },
  { value: 'nda',         label: 'NDA',              sublabel: 'Accord de Confidentialité',  icon: '🔒' },
  { value: 'pret',        label: 'Prêt / Dette',     sublabel: 'Reconnaissance de Dette',    icon: '💰' },
  { value: 'decharge',    label: 'Décharge',         sublabel: 'Responsabilité & Risques',   icon: '📋' },
  { value: 'partenariat', label: 'Partenariat',      sublabel: 'Accord de Collaboration',    icon: '🔗' },
  { value: 'mandat',      label: 'Mandat',           sublabel: 'Procuration',                icon: '✍️' },
]

// ── Default clause sections ──────────────────────────────────────
const DEFAULT_SECTIONS = [
  { id: 'header',    label: 'En-tête',         draggable: false },
  { id: 'parties',   label: 'Les Parties',      draggable: true  },
  { id: 'objet',     label: 'Objet du Contrat', draggable: true  },
  { id: 'duree',     label: 'Durée',            draggable: true  },
  { id: 'clauses',   label: 'Clauses Générales',draggable: true  },
  { id: 'specifics', label: 'Dispositions Spécifiques', draggable: true },
  { id: 'resiliation',label: 'Résiliation',     draggable: true  },
  { id: 'litiges',   label: 'Règlement des Litiges', draggable: true },
  { id: 'signatures',label: 'Signatures',       draggable: false },
]

const EMPTY_CONTRACT = {
  title: '',
  city: '',
  date: '',
  partyAName: '', partyATitle: '', partyAAddress: '',
  partyBName: '', partyBTitle: '', partyBAddress: '',
  objet: '',
  duree: '',
  clauses: '',
  specifics: '',
  resiliation: '',
  litiges: '',
  signatureA: '',
  signatureB: '',
  signatureCity: '',
  signatureDate: '',
}

// ── Auto-resize textarea ─────────────────────────────────────────
function AutoTextarea({ value, onChange, placeholder, className = '' }) {
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
      className={`contract-editable ${className}`}
      style={{ overflow: 'hidden', minHeight: '26px' }}
    />
  )
}

function AutoInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`contract-editable ${className}`}
    />
  )
}

// ── Article number helper ────────────────────────────────────────
function ArticleBlock({ number, title, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-2 mb-2 border-b border-slate-200 pb-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Art. {number}</span>
        <span className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function ContractPage() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [prompt, setPrompt]             = useState('')
  const [contractType, setContractType] = useState('cdi')
  const [loading, setLoading]           = useState(false)
  const [contract, setContract]         = useState(EMPTY_CONTRACT)
  const [generated, setGenerated]       = useState(false)
  const [sections, setSections]         = useState(DEFAULT_SECTIONS)

  const dragIndex = useRef(null)

  const updateField = (field, value) => setContract(prev => ({ ...prev, [field]: value }))

  // ── Generate ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return alert('Veuillez décrire votre contrat.')
    if (!hasCredits(3)) { router.push('/pricing'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/generer-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, contractType }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      if (data.contract) {
        setContract(data.contract)
        setGenerated(true)
        setSections(DEFAULT_SECTIONS)
        await deductCredits(3)
      }
    } catch (err) {
      alert('Erreur de génération. Vérifiez la console.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Drag & drop ─────────────────────────────────────────────────
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

  // ── Arrow move ───────────────────────────────────────────────────
  const moveSection = (index, dir) => {
    const s = sections[index]
    if (!s.draggable) return
    const next = [...sections]
    let target = index + dir
    while (target >= 0 && target < next.length && !next[target].draggable) target += dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setSections(next)
  }

  // ── Export Word ─────────────────────────────────────────────────
  const exportToWord = () => {
    const el = document.getElementById('contract-document')
    const clone = el.cloneNode(true)
    clone.querySelectorAll('.no-print').forEach(e => e.remove())
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        body { font-family: Georgia, serif; padding: 50px; color: #1a1a1a; line-height: 1.7; }
        h1 { text-align:center; font-size: 18px; text-transform: uppercase; letter-spacing: 3px; border-bottom: 2px solid #059669; padding-bottom: 12px; }
        .article-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #059669; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
      </style></head><body>${clone.innerHTML}</body></html>`
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Contrat_${Date.now()}.doc`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // ── Section renderer ────────────────────────────────────────────
  const renderSection = (section, index) => {
    const isFirst = index === 0
    const isLast  = index === sections.length - 1
    const draggable = section.draggable

    const wrapper = (content) => (
      <div
        key={section.id}
        draggable={draggable}
        onDragStart={e => draggable && onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={e => onDrop(e, index)}
        className={`group relative ${draggable ? 'hover:bg-emerald-50/30 -mx-4 px-4 py-2 rounded-xl transition-colors duration-150 cursor-grab active:cursor-grabbing' : 'py-2'}`}
      >
        {/* Side controls */}
        {draggable && (
          <div className="no-print absolute -left-7 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={14} className="text-slate-300 hover:text-emerald-500 transition-colors" />
            {!isFirst && (
              <button onClick={() => moveSection(index, -1)} className="text-slate-300 hover:text-emerald-500 transition-colors">
                <ChevronUp size={13} />
              </button>
            )}
            {!isLast && (
              <button onClick={() => moveSection(index, 1)} className="text-slate-300 hover:text-emerald-500 transition-colors">
                <ChevronDown size={13} />
              </button>
            )}
          </div>
        )}

        {/* Section badge */}
        {draggable && (
          <div className="no-print absolute right-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
              {section.label}
            </span>
          </div>
        )}

        {content}
      </div>
    )

    switch (section.id) {
      // ── HEADER ─────────────────────────────────────────────
      case 'header':
        return wrapper(
          <div className="text-center mb-8 space-y-3">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="h-px flex-1 bg-emerald-200" />
              <Scale size={18} className="text-emerald-600" />
              <div className="h-px flex-1 bg-emerald-200" />
            </div>
            <AutoInput
              value={contract.title}
              onChange={v => updateField('title', v)}
              placeholder="TITRE DU CONTRAT"
              className="text-center font-black text-xl uppercase tracking-[0.15em] text-slate-900"
            />
            <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
              <AutoInput
                value={contract.city}
                onChange={v => updateField('city', v)}
                placeholder="Ville"
                className="text-center text-sm text-slate-500 w-32"
              />
              <span className="text-slate-300">·</span>
              <AutoInput
                value={contract.date}
                onChange={v => updateField('date', v)}
                placeholder="Date"
                className="text-center text-sm text-slate-500 w-40"
              />
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent mt-4" />
          </div>
        )

      // ── PARTIES ────────────────────────────────────────────
      case 'parties':
        return wrapper(
          <ArticleBlock number="1" title="Les Parties au Contrat">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2">Partie A — Employeur / Bailleur / Vendeur</p>
                <AutoInput value={contract.partyAName}    onChange={v => updateField('partyAName', v)}    placeholder="Nom ou Raison Sociale"   className="text-sm font-bold text-slate-900" />
                <AutoInput value={contract.partyATitle}   onChange={v => updateField('partyATitle', v)}   placeholder="Qualité / Fonction"       className="text-xs text-slate-500" />
                <AutoTextarea value={contract.partyAAddress} onChange={v => updateField('partyAAddress', v)} placeholder="Adresse complète"      className="text-xs text-slate-500" />
              </div>
              <div className="space-y-1.5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Partie B — Employé / Locataire / Acheteur</p>
                <AutoInput value={contract.partyBName}    onChange={v => updateField('partyBName', v)}    placeholder="Nom ou Raison Sociale"   className="text-sm font-bold text-slate-900" />
                <AutoInput value={contract.partyBTitle}   onChange={v => updateField('partyBTitle', v)}   placeholder="Qualité / Fonction"       className="text-xs text-slate-500" />
                <AutoTextarea value={contract.partyBAddress} onChange={v => updateField('partyBAddress', v)} placeholder="Adresse complète"      className="text-xs text-slate-500" />
              </div>
            </div>
          </ArticleBlock>
        )

      // ── OBJET ──────────────────────────────────────────────
      case 'objet':
        return wrapper(
          <ArticleBlock number="2" title="Objet du Contrat">
            <AutoTextarea
              value={contract.objet}
              onChange={v => updateField('objet', v)}
              placeholder="Décrivez l'objet précis de ce contrat..."
              className="text-sm text-slate-700 leading-relaxed"
            />
          </ArticleBlock>
        )

      // ── DURÉE ──────────────────────────────────────────────
      case 'duree':
        return wrapper(
          <ArticleBlock number="3" title="Durée et Prise d'Effet">
            <AutoTextarea
              value={contract.duree}
              onChange={v => updateField('duree', v)}
              placeholder="Précisez la durée, la date de prise d'effet, les éventuelles périodes d'essai ou de préavis..."
              className="text-sm text-slate-700 leading-relaxed"
            />
          </ArticleBlock>
        )

      // ── CLAUSES ────────────────────────────────────────────
      case 'clauses':
        return wrapper(
          <ArticleBlock number="4" title="Clauses Générales et Obligations">
            <AutoTextarea
              value={contract.clauses}
              onChange={v => updateField('clauses', v)}
              placeholder="Listez les obligations, droits et devoirs de chaque partie..."
              className="text-sm text-slate-700 leading-relaxed"
            />
          </ArticleBlock>
        )

      // ── SPÉCIFIQUES ────────────────────────────────────────
      case 'specifics':
        return wrapper(
          <ArticleBlock number="5" title="Dispositions Spécifiques">
            <AutoTextarea
              value={contract.specifics}
              onChange={v => updateField('specifics', v)}
              placeholder="Conditions particulières propres au type de contrat (rémunération, loyer, prix, NDA, etc.)..."
              className="text-sm text-slate-700 leading-relaxed"
            />
          </ArticleBlock>
        )

      // ── RÉSILIATION ────────────────────────────────────────
      case 'resiliation':
        return wrapper(
          <ArticleBlock number="6" title="Conditions de Résiliation">
            <AutoTextarea
              value={contract.resiliation}
              onChange={v => updateField('resiliation', v)}
              placeholder="Motifs et modalités de rupture ou de résiliation du contrat..."
              className="text-sm text-slate-700 leading-relaxed"
            />
          </ArticleBlock>
        )

      // ── LITIGES ────────────────────────────────────────────
      case 'litiges':
        return wrapper(
          <ArticleBlock number="7" title="Règlement des Litiges et Droit Applicable">
            <AutoTextarea
              value={contract.litiges}
              onChange={v => updateField('litiges', v)}
              placeholder="Juridiction compétente, droit applicable, médiation ou arbitrage..."
              className="text-sm text-slate-700 leading-relaxed"
            />
          </ArticleBlock>
        )

      // ── SIGNATURES ─────────────────────────────────────────
      case 'signatures':
        return wrapper(
          <div className="mt-8">
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-6" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-6">
              Fait en double exemplaire à{' '}
              <AutoInput
                value={contract.signatureCity}
                onChange={v => updateField('signatureCity', v)}
                placeholder="[Ville]"
                className="inline text-xs text-slate-500 w-24"
              />
              , le{' '}
              <AutoInput
                value={contract.signatureDate}
                onChange={v => updateField('signatureDate', v)}
                placeholder="[Date]"
                className="inline text-xs text-slate-500 w-28"
              />
            </p>
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-2 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Signature Partie A</p>
                <div className="h-16 border-b border-slate-300 border-dashed" />
                <AutoInput
                  value={contract.signatureA}
                  onChange={v => updateField('signatureA', v)}
                  placeholder="Nom & Qualité"
                  className="text-xs text-slate-600 text-center"
                />
              </div>
              <div className="space-y-2 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Signature Partie B</p>
                <div className="h-16 border-b border-slate-300 border-dashed" />
                <AutoInput
                  value={contract.signatureB}
                  onChange={v => updateField('signatureB', v)}
                  placeholder="Nom & Qualité"
                  className="text-xs text-slate-600 text-center"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // ── Plan guard loading ──────────────────────────────────────────
  if (!allowed) return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center">
        <Scale size={20} color="white" />
      </div>
      <div className="w-6 h-6 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Vérification du plan...</p>
    </div>
  )

  const selectedType = CONTRACT_TYPES.find(t => t.value === contractType)

  return (
    <main className="min-h-screen bg-[#0a0f1e] font-sans flex flex-col lg:flex-row">

      {/* ══ LEFT PANEL ══════════════════════════════════════════════ */}
      <aside className="lg:w-[400px] lg:min-h-screen bg-[#0a0f1e] border-r border-white/5 flex flex-col p-8 gap-5 shrink-0">

        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-black tracking-tight italic flex items-center gap-2">
              <Scale size={20} className="text-emerald-400" />
              Contract<span className="text-emerald-400">AI</span>
            </h1>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-bold mt-0.5">Rédacteur Juridique Intelligent</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <Zap size={11} className="text-emerald-400" fill="currentColor" />
            <span className="text-xs font-black text-white/70">{credits}</span>
          </div>
        </div>

        {/* Low credits */}
        {credits < 3 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-emerald-300 text-xs font-bold">⚠️ 3 crédits requis</span>
            <button onClick={() => router.push('/pricing')}
              className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-black px-3 py-1 rounded-lg hover:bg-emerald-400 transition-all">
              Recharger
            </button>
          </div>
        )}

        {/* Contract type selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Type de Contrat</label>
          <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
            {CONTRACT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setContractType(t.value)}
                className={`py-2.5 px-3 rounded-xl text-left transition-all border flex flex-col gap-0.5 ${
                  contractType === t.value
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                    : 'bg-white/5 border-white/8 text-white/40 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span className="text-[11px] font-black uppercase tracking-wide leading-tight">{t.label}</span>
                <span className={`text-[9px] font-medium leading-tight ${contractType === t.value ? 'text-emerald-300' : 'text-white/25'}`}>{t.sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected type badge */}
        {selectedType && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
            <span className="text-lg">{selectedType.icon}</span>
            <div>
              <p className="text-emerald-300 text-xs font-black uppercase tracking-wide">{selectedType.label}</p>
              <p className="text-white/30 text-[10px]">{selectedType.sublabel}</p>
            </div>
          </div>
        )}

        {/* Prompt */}
        <div className="space-y-2 flex-1">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Description du Contrat</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`Ex: CDI entre la société ABC Dakar et M. Ibrahima Fall, poste de Développeur Web, salaire 450 000 FCFA, période d'essai 3 mois...`}
            className="w-full h-36 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/80 placeholder-white/20 resize-none outline-none focus:border-emerald-400/40 transition-all leading-relaxed"
          />
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={loading || !hasCredits(3)}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${
            loading || !hasCredits(3)
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-400 hover:-translate-y-0.5 shadow-xl shadow-emerald-500/20'
          }`}>
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Rédaction juridique en cours...</>
          ) : (
            <><Scale size={13} /> Générer le Contrat · ⚡3</>
          )}
        </button>

        {/* Export */}
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

        {generated && (
          <p className="text-[9px] text-white/20 text-center font-bold uppercase tracking-widest">
            ↕ Survolez une clause pour la réorganiser
          </p>
        )}
      </aside>

      {/* ══ RIGHT PANEL: Contract document ══════════════════════════ */}
      <div className="flex-1 bg-[#111827] flex items-start justify-center p-6 lg:p-12">
        <div
          id="contract-document"
          className="w-full max-w-[740px] bg-white rounded-sm shadow-2xl shadow-black/60 px-16 py-14"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {/* Watermark strip */}
          <div className="no-print absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-t-sm opacity-80" />

          <div className="relative ml-8">
            {sections.map((section, index) => renderSection(section, index))}
          </div>

          {/* Legal footer */}
          <div className="mt-10 pt-4 border-t border-slate-100 text-center">
            <p className="text-[9px] text-slate-300 uppercase tracking-widest font-bold">
              Document généré par ContractAI · IA.Business — À des fins indicatives uniquement
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          main { display: block !important; background: white !important; }
          #contract-document { box-shadow: none !important; margin: 0 !important; padding: 40px 60px !important; }
        }
        .contract-editable {
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
        .contract-editable:focus {
          background: rgba(16, 185, 129, 0.06);
          outline: 1px solid rgba(16, 185, 129, 0.25);
        }
        .contract-editable::placeholder { color: #d1d5db; font-style: italic; }
        [draggable="true"] { cursor: grab; }
        [draggable="true"]:active { cursor: grabbing; }
        .scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </main>
  )
}