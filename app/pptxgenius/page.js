'use client'

import React, { useState } from 'react';
import { saveAs } from 'file-saver';

export default function PptxGenius() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  const getPreview = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/generer-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, getStructure: true }),
      });
      const data = await res.json();
      setSlides(data);
    } catch (err) { alert("Erreur : " + err.message); }
    finally { setLoading(false); }
  };

  const updateSlide = (index, field, value, subIndex = null) => {
    const newSlides = [...slides];
    if (subIndex !== null) {
      newSlides[index].content[subIndex] = value;
    } else {
      newSlides[index][field] = value;
    }
    setSlides(newSlides);
  };

  const exportFinal = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/generer-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // TRÈS IMPORTANT : On envoie l'objet slides qui contient les modifs
        body: JSON.stringify({ slides: slides }), 
      });

      if (!res.ok) throw new Error("Le serveur a échoué à générer le fichier.");

      const blob = await res.blob();
      saveAs(blob, `Presentation_Pro.pptx`);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f1f5f9] p-4 md:p-12 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Navigation / Actions Sticky */}
        <nav className="sticky top-4 z-50 flex justify-between items-center bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-white/50">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase">
              PPTX<span className="text-blue-600">Genius</span> <span className="text-slate-300">Editor</span>
            </h1>
          </div>
          <div className="flex gap-3">
            {!slides.length ? (
              <button onClick={getPreview} disabled={loading || !prompt}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-20">
                {loading ? "Génération en cours..." : "Générer la structure"}
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

        {/* Zone de saisie initiale */}
        {!slides.length && (
          <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl shadow-slate-200">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez votre présentation (ex: Le futur de l'IA au Sénégal)..."
              className="w-full h-64 p-10 border-none focus:ring-0 text-2xl font-light text-slate-600 placeholder:text-slate-200 resize-none"
            />
          </div>
        )}

        {/* Liste des Diapositives (Mode Document) */}
        <div className="space-y-12 pb-20">
          {slides.map((slide, idx) => (
            <div key={idx} className="relative group">
              {/* Numéro de slide flottant */}
              <div className="absolute -left-16 top-0 hidden lg:block">
                <span className="text-4xl font-black text-slate-200 italic">0{idx + 1}</span>
              </div>

              {/* Conteneur de la Diapositive (Format 16:9 approx) */}
              <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                
                {/* Partie Gauche : Image & Keyword */}
                <div className="w-full md:w-1/2 bg-slate-100 relative overflow-hidden group/img">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt="preview" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-300 italic">Aucune image trouvée</div>
                  )}
                  {/* Overlay pour éditer le mot-clé d'image */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <input 
                      value={slide.imageKeyword} 
                      onChange={(e) => updateSlide(idx, 'imageKeyword', e.target.value)}
                      className="w-full bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg border-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mot-clé image (Anglais)"
                    />
                  </div>
                </div>

                {/* Partie Droite : Texte Éditable */}
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
  );
}