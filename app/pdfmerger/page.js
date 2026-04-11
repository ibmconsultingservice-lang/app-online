'use client'

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';

export default function PdfMerger() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    // On ne garde que les PDF
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    setFiles(pdfFiles);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      alert("Veuillez sélectionner au moins 2 fichiers PDF à fusionner.");
      return;
    }

    setLoading(true);
    try {
      // Créer un nouveau document PDF vide
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        
        // Copier toutes les pages du PDF actuel
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        
        // Ajouter chaque page au document final
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      // Générer le fichier final
      const mergedPdfBytes = await mergedPdf.save();
      
      // Créer un lien de téléchargement
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Merged_Document_${Date.now()}.pdf`;
      link.click();
      
      // Nettoyage
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la fusion : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="max-w-3xl w-full bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border border-slate-100 text-center space-y-10">
        
        <header>
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </div>
          <h1 className="text-4xl font-[950] tracking-tighter italic text-slate-900">PDF<span className="text-blue-600">Merge</span></h1>
          <p className="text-slate-400 text-xs font-black mt-2 uppercase tracking-[0.3em]">IBM Consulting Internal Tool</p>
        </header>

        <div className="space-y-6">
          {/* Zone Upload */}
          <label className="group relative block cursor-pointer">
            <div className={`border-2 border-dashed rounded-[2.5rem] p-12 transition-all duration-500 ${files.length > 0 ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300 bg-slate-50/50'}`}>
              <span className="text-sm font-black text-slate-600 block">
                {files.length > 0 
                  ? `${files.length} PDF prêts à la fusion` 
                  : "Sélectionnez vos fichiers PDF"}
              </span>
              <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">Cliquez pour parcourir</p>
              <input 
                type="file" 
                accept="application/pdf" 
                multiple 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </div>
          </label>

          {/* Liste des fichiers sélectionnés */}
          {files.length > 0 && (
            <div className="text-left bg-slate-50 rounded-3xl p-6 max-h-48 overflow-y-auto space-y-2 border border-slate-100">
              {files.map((f, i) => (
                <div key={i} className="flex items-center text-xs font-bold text-slate-500 truncate">
                  <span className="w-6 h-6 flex items-center justify-center bg-white rounded-lg mr-3 shadow-sm text-blue-600">{i + 1}</span>
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}

          <button 
            onClick={mergePdfs} 
            disabled={files.length < 2 || loading}
            className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-20"
          >
            {loading ? "Fusion en cours..." : "Fusionner les documents"}
          </button>
        </div>

        <footer className="pt-6 border-t border-slate-50">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60">
            Traitement 100% local • Confidentialité garantie
          </p>
        </footer>
      </div>
    </main>
  );
}