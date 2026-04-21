'use client'

import React, { useState, useRef } from 'react'
import { saveAs } from 'file-saver'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap, ChevronUp, ChevronDown, Plus, X, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react'

export default function PptxGenius() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [prompt, setPrompt]           = useState("")
  const [loading, setLoading]         = useState(false)
  const [slides, setSlides]           = useState([])
  const [isExporting, setIsExporting] = useState(false)

  // ── New slide AI addition ──
  const [addingSlide, setAddingSlide]       = useState(false)   // panel open
  const [newSlidePrompt, setNewSlidePrompt] = useState("")
  const [generatingSlide, setGeneratingSlide] = useState(false)
  const [insertAfterIdx, setInsertAfterIdx]   = useState(null)  // null = append

  // ── Image replacement ──
  const [replacingIdx, setReplacingIdx]   = useState(null)  // slide index being replaced
  const [newKeyword, setNewKeyword]       = useState("")
  const [searchingImg, setSearchingImg]   = useState(false)
  const fileInputRef = useRef(null)

  // ─────────────────────────────────────────────────────────────────────────
  // Generate full presentation
  // ─────────────────────────────────────────────────────────────────────────
  const getPreview = async () => {
    if (!prompt.trim()) return
    if (!hasCredits(3)) { router.push('/pricing'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/generer-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, getStructure: true }),
      })
      const data = await res.json()
      await deductCredits(3)
      setSlides(data)
    } catch (err) { alert("Erreur : " + err.message) }
    finally { setLoading(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Edit existing slide field
  // ─────────────────────────────────────────────────────────────────────────
  const updateSlide = (index, field, value, subIndex = null) => {
    const newSlides = [...slides]
    if (subIndex !== null) {
      newSlides[index].content[subIndex] = value
    } else {
      newSlides[index][field] = value
    }
    setSlides(newSlides)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Move slide up / down
  // ─────────────────────────────────────────────────────────────────────────
  const moveSlide = (index, direction) => {
    const newSlides = [...slides]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newSlides.length) return
    ;[newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]]
    setSlides(newSlides)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delete a slide
  // ─────────────────────────────────────────────────────────────────────────
  const deleteSlide = (index) => {
    setSlides(slides.filter((_, i) => i !== index))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AI: Generate ONE new slide and insert it
  // ─────────────────────────────────────────────────────────────────────────
  const generateNewSlide = async () => {
    if (!newSlidePrompt.trim()) return
    setGeneratingSlide(true)
    try {
      const res = await fetch('/api/generer-pptx/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: newSlidePrompt, existingSlides: slides }),
      })
      const newSlide = await res.json()
      const newSlides = [...slides]
      const insertAt = insertAfterIdx !== null ? insertAfterIdx + 1 : newSlides.length
      newSlides.splice(insertAt, 0, newSlide)
      setSlides(newSlides)
      setNewSlidePrompt("")
      setAddingSlide(false)
      setInsertAfterIdx(null)
    } catch (err) { alert("Erreur : " + err.message) }
    finally { setGeneratingSlide(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Image replacement — search by keyword (Pexels via existing infra)
  // ─────────────────────────────────────────────────────────────────────────
  const searchNewImage = async (index) => {
    if (!newKeyword.trim()) return
    setSearchingImg(true)
    try {
      const res = await fetch(`/api/pexels?query=${encodeURIComponent(newKeyword)}`)
      const data = await res.json()
      if (data.imageUrl) {
        updateSlide(index, 'imageUrl', data.imageUrl)
        updateSlide(index, 'imageKeyword', newKeyword)
      }
    } catch (err) { alert("Erreur image : " + err.message) }
    finally { setSearchingImg(false); setReplacingIdx(null); setNewKeyword("") }
  }

  // Upload local image
  const handleLocalImage = (index, e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    updateSlide(index, 'imageUrl', url)
    updateSlide(index, 'imageKeyword', file.name)
    setReplacingIdx(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Export
  // ─────────────────────────────────────────────────────────────────────────
  const exportFinal = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/generer-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides }),
      })
      if (!res.ok) throw new Error("Le serveur a échoué à générer le fichier.")
      const blob = await res.blob()
      saveAs(blob, `Presentation_Pro.pptx`)
    } catch (err) { alert(err.message) }
    finally { setIsExporting(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Guard
  // ─────────────────────────────────────────────────────────────────────────
  if (!allowed) return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#f1f5f9] p-4 md:p-12 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ── Nav ── */}
        <nav className="sticky top-4 z-50 flex justify-between items-center bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-white/50">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase">
              PPTX<span className="text-blue-600">Genius</span> <span className="text-slate-300">Editor</span>
            </h1>
            <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
              <Zap size={11} className="text-indigo-600" fill="currentColor"/>
              <span className="text-[10px] font-black text-indigo-700">{credits}</span>
            </div>
          </div>
          <div className="flex gap-3">
            {!slides.length ? (
              <button onClick={getPreview} disabled={loading || !prompt || !hasCredits(3)}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-20">
                {loading ? "Génération en cours..." : "Générer la structure · ⚡3"}
              </button>
            ) : (
              <>
                <button onClick={() => setSlides([])}
                  className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-red-500">
                  Recommencer
                </button>
                <button
                  onClick={() => { setInsertAfterIdx(null); setAddingSlide(true) }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all">
                  <Plus size={14}/> Ajouter une slide
                </button>
                <button onClick={exportFinal} disabled={isExporting}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                  {isExporting ? "Exportation..." : "Télécharger .PPTX"}
                </button>
              </>
            )}
          </div>
        </nav>

        {/* ── Low credits warning ── */}
        {credits < 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-xs text-amber-700 font-medium flex items-center justify-between">
            <span>⚠️ Crédits insuffisants (3 requis)</span>
            <button onClick={() => router.push('/pricing')} className="font-black underline">Recharger</button>
          </div>
        )}

        {/* ── Prompt input ── */}
        {!slides.length && (
          <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl shadow-slate-200">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez votre présentation (ex: Le futur de l'IA au Sénégal)..."
              className="w-full h-64 p-10 border-none focus:ring-0 text-2xl font-light text-slate-600 placeholder:text-slate-200 resize-none"
            />
          </div>
        )}

        {/* ── Global AI Add Slide Panel (append) ── */}
        {addingSlide && insertAfterIdx === null && (
          <AddSlidePanel
            prompt={newSlidePrompt}
            setPrompt={setNewSlidePrompt}
            onGenerate={generateNewSlide}
            onClose={() => { setAddingSlide(false); setNewSlidePrompt("") }}
            loading={generatingSlide}
            label="Ajouter une slide à la fin"
          />
        )}

        {/* ── Slides ── */}
        <div className="space-y-8 pb-20">
          {slides.map((slide, idx) => (
            <React.Fragment key={idx}>
              <div className="relative group">

                {/* Slide number */}
                <div className="absolute -left-16 top-0 hidden lg:block">
                  <span className="text-4xl font-black text-slate-200 italic">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* ── Slide card ── */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

                  {/* Image side */}
                  <div className="w-full md:w-1/2 bg-slate-100 relative overflow-hidden group/img">
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} alt="preview"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-300 italic">Aucune image trouvée</div>
                    )}

                    {/* Click overlay to replace image */}
                    <button
                      onClick={() => { setReplacingIdx(idx); setNewKeyword(slide.imageKeyword || "") }}
                      className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                      <div className="bg-white rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-xl">
                        <ImageIcon size={14} className="text-blue-600"/>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-800">Changer l'image</span>
                      </div>
                    </button>

                    {/* Keyword input */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <input
                        value={slide.imageKeyword}
                        onChange={(e) => updateSlide(idx, 'imageKeyword', e.target.value)}
                        className="w-full bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg border-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Mot-clé image (Anglais)"
                      />
                    </div>
                  </div>

                  {/* Text side */}
                  <div className="w-full md:w-1/2 p-10 flex flex-col gap-6 bg-white">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Titre de la slide</label>
                      <input
                        value={slide.title}
                        onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                        className="w-full text-3xl font-black text-slate-800 border-none p-0 focus:ring-0 leading-tight"
                      />
                    </div>
                    <div className="h-px bg-slate-100 w-20"/>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arguments clés</label>
                      <div className="space-y-3">
                        {slide.content.map((point, sIdx) => (
                          <div key={sIdx} className="flex gap-3 items-start group/item">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"/>
                            <textarea
                              value={point}
                              onChange={(e) => updateSlide(idx, 'content', e.target.value, sIdx)}
                              rows={2}
                              className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-600 focus:ring-0 resize-none hover:bg-slate-50 rounded-md transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Slide controls (right side) ── */}
                <div className="absolute -right-14 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveSlide(idx, 'up')}
                    disabled={idx === 0}
                    className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-20 transition-all shadow-sm">
                    <ChevronUp size={15}/>
                  </button>
                  <button
                    onClick={() => moveSlide(idx, 'down')}
                    disabled={idx === slides.length - 1}
                    className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-20 transition-all shadow-sm">
                    <ChevronDown size={15}/>
                  </button>
                  <button
                    onClick={() => deleteSlide(idx)}
                    className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all shadow-sm">
                    <X size={15}/>
                  </button>
                </div>

                {/* Mobile controls */}
                <div className="flex lg:hidden justify-end gap-2 mt-2">
                  <button onClick={() => moveSlide(idx, 'up')} disabled={idx === 0}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-20">↑</button>
                  <button onClick={() => moveSlide(idx, 'down')} disabled={idx === slides.length - 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-20">↓</button>
                  <button onClick={() => deleteSlide(idx)}
                    className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-500 rounded-lg text-xs font-bold">Supprimer</button>
                </div>
              </div>

              {/* ── Insert slide AFTER this one ── */}
              {slides.length > 0 && (
                <div className="flex items-center gap-3 group/insert">
                  <div className="flex-1 h-px bg-slate-200 group-hover/insert:bg-blue-200 transition-colors"/>
                  {insertAfterIdx === idx && addingSlide ? (
                    <AddSlidePanel
                      prompt={newSlidePrompt}
                      setPrompt={setNewSlidePrompt}
                      onGenerate={generateNewSlide}
                      onClose={() => { setAddingSlide(false); setInsertAfterIdx(null); setNewSlidePrompt("") }}
                      loading={generatingSlide}
                      label={`Insérer après slide ${idx + 1}`}
                      inline
                    />
                  ) : (
                    <button
                      onClick={() => { setInsertAfterIdx(idx); setAddingSlide(true); setNewSlidePrompt("") }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm opacity-0 group-hover/insert:opacity-100">
                      <Plus size={11}/> Insérer ici
                    </button>
                  )}
                  <div className="flex-1 h-px bg-slate-200 group-hover/insert:bg-blue-200 transition-colors"/>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Image Replace Modal ── */}
      {replacingIdx !== null && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setReplacingIdx(null)}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-black uppercase tracking-widest">Changer l'image</h3>
              <button onClick={() => setReplacingIdx(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                <X size={14}/>
              </button>
            </div>

            {/* Search by keyword */}
            <div className="space-y-3 mb-6">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Rechercher par mot-clé</label>
              <div className="flex gap-2">
                <input
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchNewImage(replacingIdx)}
                  placeholder="Ex: innovation, team, city..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => searchNewImage(replacingIdx)}
                  disabled={searchingImg || !newKeyword.trim()}
                  className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2">
                  {searchingImg ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>}
                  {searchingImg ? "..." : "Go"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-slate-100"/>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ou</span>
              <div className="flex-1 h-px bg-slate-100"/>
            </div>

            {/* Upload local image */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-6 flex flex-col items-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-all">
              <ImageIcon size={22} className="text-slate-300"/>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Importer depuis votre appareil</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleLocalImage(replacingIdx, e)}
            />
          </div>
        </div>
      )}
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AddSlidePanel — reusable inline or standalone
// ─────────────────────────────────────────────────────────────────────────────
function AddSlidePanel({ prompt, setPrompt, onGenerate, onClose, loading, label, inline }) {
  if (inline) {
    return (
      <div className="w-full bg-white border border-blue-200 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles size={11}/> {label}
          </span>
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
            <X size={11}/>
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onGenerate()}
            placeholder="Décrivez la slide à ajouter..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button onClick={onGenerate} disabled={loading || !prompt.trim()}
            className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>}
            {loading ? "..." : "Générer"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-blue-200 rounded-3xl p-7 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
          <Sparkles size={14}/> {label}
        </span>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
          <X size={14}/>
        </button>
      </div>
      <div className="flex gap-3">
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onGenerate()}
          placeholder="Décrivez la slide à ajouter (ex: Slide sur les résultats Q3)..."
          className="flex-1 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button onClick={onGenerate} disabled={loading || !prompt.trim()}
          className="bg-blue-600 text-white rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center gap-2 shadow-lg shadow-blue-100">
          {loading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
          {loading ? "Génération..." : "Générer"}
        </button>
      </div>
    </div>
  )
}