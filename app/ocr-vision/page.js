'use client'

import React, { useState, useRef } from 'react';
import { usePlanGuard } from '@/hooks/usePlanGuard';
import { useCredits } from '@/hooks/useCredits';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export default function OCRVision() {
  const allowed = usePlanGuard('starter')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [image, setImage] = useState(null);
  const [text, setText] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setText("");
      setProgress(0);
    }
  };

  const runOCR = async () => {
    if (!image) return;
    if (!hasCredits(1)) { router.push('/pricing'); return; }

    setLoading(true);
    try {
      const Tesseract = await import('tesseract.js');
      const { data: { text: extracted } } = await Tesseract.recognize(image, 'fra+eng', {
        logger: m => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        }
      });
      await deductCredits(1)
      setText(extracted);
    } catch (err) {
      console.error(err);
      alert("Erreur OCR : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportDoc = async (type) => {
    if (!text) return;
    const fileName = `OCR_Export_${Date.now()}`;

    if (type === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(text, 180);
      doc.text(lines, 15, 20);
      doc.save(`${fileName}.pdf`);
    } else {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const { saveAs } = await import('file-saver');
      const doc = new Document({
        sections: [{ children: text.split('\n').map(l => new Paragraph({ children: [new TextRun(l)] })) }]
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${fileName}.docx`);
    }
  };

  if (!allowed) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f8fafc] py-12 px-6 font-sans antialiased text-slate-900">
      <div className="max-w-6xl mx-auto space-y-10">

        <header className="bg-white/70 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-5xl font-[1000] tracking-tighter italic">
              OCR<span className="text-blue-600">Vision</span>
              <span className="ml-2 text-slate-300 not-italic font-light">Pro</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Extraction intelligente de texte à partir d'images.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
              <Zap size={12} className="text-indigo-600" fill="currentColor"/>
              <span className="text-xs font-bold text-indigo-700">{credits} crédits</span>
            </div>
            <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 italic">
              Privacy First
            </span>
          </div>
        </header>

        {credits < 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-sm text-amber-700 font-medium">⚠️ Crédits insuffisants (1 requis)</span>
            <button onClick={() => router.push('/pricing')}
              className="bg-amber-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-amber-600 transition-all">
              Recharger
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-10">

          <section className="bg-white/80 backdrop-blur-md p-8 rounded-[3.5rem] shadow-2xl border border-white flex flex-col gap-8">
            <div
              onClick={() => fileInputRef.current.click()}
              className={`relative h-80 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden ${
                image ? 'border-blue-200 bg-slate-50' : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
              }`}>
              {image ? (
                <img src={image} alt="Source" className="absolute inset-0 w-full h-full object-contain p-4" />
              ) : (
                <div className="text-center space-y-2 opacity-40">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-[10px] font-black uppercase tracking-widest">Cliquez pour importer un scan</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  <span>Analyse des caractères...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}/>
                </div>
              </div>
            )}

            <button
              onClick={runOCR}
              disabled={!image || loading || !hasCredits(1)}
              className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-20">
              {loading ? 'NUMÉRISATION...' : 'EXTRAIRE LE TEXTE · ⚡1'}
            </button>
          </section>

          <section className="bg-white p-2 rounded-[3.5rem] shadow-2xl border border-white flex flex-col min-h-[600px] overflow-hidden">
            <div className="bg-slate-900 m-2 p-8 rounded-[2.5rem] flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic">Texte Identifié</label>
                  <span className="text-white/40 text-[10px] font-medium tracking-tight italic">Moteur Tesseract.js</span>
                </div>
                {text && (
                  <div className="flex gap-3">
                    <button onClick={() => exportDoc('pdf')}
                      className="bg-white text-slate-900 text-[10px] font-black px-6 py-3 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-lg uppercase">
                      PDF
                    </button>
                    <button onClick={() => exportDoc('word')}
                      className="bg-blue-600 text-white text-[10px] font-black px-6 py-3 rounded-full hover:bg-white hover:text-slate-900 transition-all shadow-lg uppercase">
                      Word
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 px-10 py-8">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Le texte extrait apparaîtra ici..."
                className="w-full h-full text-sm text-slate-600 bg-transparent border-none focus:ring-0 resize-none font-medium leading-loose placeholder:text-slate-200"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}