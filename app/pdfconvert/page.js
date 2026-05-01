'use client'

import React, { useState, useEffect } from 'react';
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import PptxGenJS from 'pptxgenjs';

export default function PdfConverter() {
  const allowed = usePlanGuard('free')
  const { credits } = useCredits()
  const router = useRouter()

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFormat, setActiveFormat] = useState(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleConvert = async (format) => {
    if (!file) return;
    setLoading(true);
    setActiveFormat(format);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    try {
      const res = await fetch('/api/generer-pdfconvert', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur serveur");

      if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(result.data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Données");
        XLSX.writeFile(wb, `Export_${file.name.replace('.pdf', '')}.xlsx`);

      } else if (format === 'word') {
        const doc = new Document({
          sections: [{
            children: result.text.split('\n').map(line => new Paragraph({
              children: [new TextRun(line)],
            })),
          }],
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${file.name.replace('.pdf', '')}.docx`);

      } else if (format === 'powerpoint') {
        const pptx = new PptxGenJS();
        const slides = result.slides || [];
        slides.forEach(({ title, bullets }) => {
          const slide = pptx.addSlide();
          slide.addText(title || '', {
            x: 0.5, y: 0.3, w: '90%', fontSize: 24, bold: true, color: '003366'
          });
          if (bullets?.length) {
            slide.addText(
              bullets.map(b => ({ text: b, options: { bullet: true } })),
              { x: 0.5, y: 1.2, w: '90%', h: 4, fontSize: 14, color: '333333' }
            );
          }
        });
        await pptx.writeFile({ fileName: `${file.name.replace('.pdf', '')}.pptx` });
      }

    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
      setActiveFormat(null);
    }
  };

  // ── Loading screen ──
  if (!allowed) return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f0f4f8] py-12 px-4 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-start">

        {/* Panneau de Contrôle */}
        <div className="w-full lg:w-1/3 bg-white/80 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl shadow-blue-100 border border-white sticky top-12">
          <header className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {/* Credits badge */}
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
                <Zap size={12} className="text-indigo-600" fill="currentColor"/>
                <span className="text-xs font-black text-indigo-700">{credits}</span>
              </div>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Convertisseur IA</h1>
            <p className="text-slate-500 text-sm mt-1">PDF vers Word, Excel ou PowerPoint via IA.</p>
          </header>

          <div className="space-y-6">
            {/* Zone de Drop */}
            <label className="relative group block cursor-pointer">
              <div className={`
                border-2 border-dashed rounded-3xl p-6 transition-all duration-300
                ${file ? 'border-green-400 bg-green-50/50' : 'border-slate-200 bg-slate-50/50 group-hover:border-blue-400 group-hover:bg-blue-50/30'}
              `}>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-bold text-slate-700 truncate w-full text-center">
                    {file ? file.name : "Cliquez pour choisir un PDF"}
                  </span>
                  {!file && <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Max 25MB</span>}
                </div>
                <input type="file" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
              </div>
            </label>

            {file && (
              <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <button
                  onClick={() => handleConvert('word')}
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-slate-200"
                >
                  {loading && activeFormat === 'word' ? "Génération IA..." : "📄 Générer Word (.docx)"}
                </button>
                <button
                  onClick={() => handleConvert('excel')}
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-emerald-200"
                >
                  {loading && activeFormat === 'excel' ? "Analyse IA..." : "📊 Extraire Excel (.xlsx)"}
                </button>
                <button
                  onClick={() => handleConvert('powerpoint')}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-blue-200"
                >
                  {loading && activeFormat === 'powerpoint' ? "Création slides IA..." : "🎨 Créer PowerPoint (.pptx)"}
                </button>

                <button
                  onClick={() => setFile(null)}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider py-2 transition-colors"
                >
                  Supprimer le fichier
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panneau d'Aperçu */}
        <div className="w-full lg:w-2/3 h-[80vh] min-h-[500px]">
          {previewUrl ? (
            <div className="w-full h-full bg-white rounded-[2rem] shadow-2xl border border-white overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Aperçu du document</span>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold">PDF MODE</span>
              </div>
              <iframe src={previewUrl} className="w-full h-full" title="Aperçu PDF" />
            </div>
          ) : (
            <div className="w-full h-full border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-bold">Sélectionnez un document pour prévisualiser</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}