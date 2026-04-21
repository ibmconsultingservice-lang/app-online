'use client'

import React, { useState } from 'react'
import { saveAs } from 'file-saver'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function PptxGenius() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [prompt, setPrompt]         = useState("")
  const [loading, setLoading]       = useState(false)
  const [slides, setSlides]         = useState([])
  const [isExporting, setIsExporting] = useState(false)

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

  const updateSlide = (index, field, value, subIndex = null) => {
    const newSlides = [...slides]
    if (subIndex !== null) {
      newSlides[index].content[subIndex] = value
    } else {
      newSlides[index][field] = value
    }
    setSlides(newSlides)
  }

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
    } catch (err) {
      alert(err.message)
    } finally {
      setIsExporting(false)
    }
  }

  // ── Loading screen ──
  if (!allowed) return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f1f5f9] p-4 md:p-12 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Nav */}
        <nav className="sticky top-4 z-50 flex justify-between items-center bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-white/50">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase">
                PPTX<span className="text-blue-600">Genius</span> <span className="text-slate-300">Editor</span>
              </h1>
            </div>
            {/* Credits badge */}
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
                <button onClick={() => setSlides([])} className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-red-500">Recommencer</button>
                <button onClick={exportFinal} disabled={isExporting}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                  {isExporting ? "Exportation..." : "Télécharger .PPTX"}
                </button>
              </>
            )}
          </div>
        </nav>

        {/* Low credits warning */}
        {credits < 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-xs text-amber-700 font-medium flex items-center justify-between">
            <span>⚠️ Crédits insuffisants (3 requis)</span>
            <button onClick={() => router.push('/pricing')} className="font-black underline">Recharger</button>
          </div>
        )}

        {/* Prompt input */}
        {!slides.length && (
          <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl shadow-slate-200">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez votre présentation (ex: Le futur de l'IA au Sénégal)..."
              className="w-full h-64 p-10 border-none focus:ring-0 text-2xl font-light text-slate-600 placeholder:text-slate-200 resize-none"
            />
          </div>
        )}

        {/* Slides */}
        <div className="space-y-12 pb-20">
          {slides.map((slide, idx) => (
            <div key={idx} className="relative group">
              <div className="absolute -left-16 top-0 hidden lg:block">
                <span className="text-4xl font-black text-slate-200 italic">0{idx + 1}</span>
              </div>

              <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

                {/* Image side */}
                <div className="w-full md:w-1/2 bg-slate-100 relative overflow-hidden group/img">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt="preview" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-300 italic">Aucune image trouvée</div>
                  )}
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
                  <div className="h-px bg-slate-100 w-20"></div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arguments clés</label>
                    <div className="space-y-3">
                      {slide.content.map((point, sIdx) => (
                        <div key={sIdx} className="flex gap-3 items-start group/item">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
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
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}