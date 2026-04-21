'use client'

import React, { useState } from 'react';
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { Zap } from 'lucide-react'

export default function OfficeToPdf() {
  const allowed = usePlanGuard('free')
  const { credits } = useCredits()

  const [files, setFiles] = useState([]);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);

  const addTextToDoc = (doc, text) => {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - (margin * 2);
    const lineHeight = 7;

    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, maxLineWidth);
    let cursorY = 20;

    lines.forEach((line) => {
      if (cursorY > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    });
  };

  const convertToPdf = async () => {
    if (files.length === 0 && !manualText.trim()) return;
    setLoading(true);

    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const mammoth = await import('mammoth');
      const XLSX = await import('xlsx');

      const doc = new jsPDF();

      if (manualText.trim() && files.length === 0) {
        addTextToDoc(doc, manualText);
        doc.save(`Note_${Date.now()}.pdf`);
      }
      else if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const currentFile = files[i];
          const fileName = currentFile.name.toLowerCase();

          if (i > 0) doc.addPage();

          const fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            if (currentFile.type.startsWith('image/')) {
              reader.readAsDataURL(currentFile);
            } else {
              reader.readAsArrayBuffer(currentFile);
            }
          });

          if (currentFile.type.startsWith('image/')) {
            await new Promise((resolve) => {
              const img = new Image();
              img.src = fileData;
              img.onload = () => {
                const pdfWidth = doc.internal.pageSize.getWidth();
                const imgProps = doc.getImageProperties(fileData);
                const ratio = imgProps.width / imgProps.height;
                const width = pdfWidth - 30;
                const height = width / ratio;
                doc.addImage(fileData, 'JPEG', 15, 20, width, height);
                resolve();
              };
            });
          }
          else if (fileName.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ arrayBuffer: fileData });
            addTextToDoc(doc, result.value);
          }
          else if (
            fileName.endsWith('.xlsx') ||
            fileName.endsWith('.xls') ||
            fileName.endsWith('.csv')
          ) {
            const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            autoTable(doc, {
              head: [data[0]],
              body: data.slice(1),
              styles: { fontSize: 8 },
              margin: { top: 20 },
              startY: i === 0 ? 20 : 15,
            });
          }
        }

        const outputName =
          files.length > 1 ? 'Combined_Documents' : files[0].name.split('.')[0];
        doc.save(`${outputName}.pdf`);
      }
    } catch (err) {
      alert('Erreur lors de la conversion : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading screen while plan is verified ──
  if (!allowed) return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-red-600 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-red-600 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-6 font-sans">
      <div className="max-w-3xl w-full bg-white/90 backdrop-blur-3xl p-10 md:p-14 rounded-[3.5rem] shadow-2xl border border-white text-center space-y-10">

        <header>
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-100/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-[950] tracking-tighter italic text-slate-900">
            Office<span className="text-red-600">2PDF</span>
          </h1>
          <p className="text-slate-400 text-xs font-black mt-2 uppercase tracking-[0.3em]">
            IBM Consulting Edition
          </p>
          {/* ── Credits badge ── */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <div className="flex items-center gap-1 bg-red-50 border border-red-100 rounded-full px-3 py-1">
              <Zap size={11} className="text-red-600" fill="currentColor"/>
              <span className="text-[10px] font-black text-red-700">{credits} crédits</span>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          <label className="group relative block cursor-pointer">
            <div className={`border-2 border-dashed rounded-[2.5rem] p-8 transition-all duration-500 hover:scale-[1.01] ${
              files.length > 0
                ? 'border-red-400 bg-red-50/30'
                : 'border-slate-200 hover:border-red-300 bg-slate-50/50'
            }`}>
              <span className="text-sm font-black text-slate-600 block truncate">
                {files.length > 0
                  ? `${files.length} fichier(s) sélectionné(s)`
                  : 'Word, Excel ou plusieurs Images'}
              </span>
              <input
                type="file"
                accept=".docx,.xlsx,.xls,.csv,image/*"
                multiple
                onChange={(e) => {
                  setFiles(Array.from(e.target.files));
                  setManualText('');
                }}
                className="hidden"
              />
            </div>
          </label>

          <div className="relative flex items-center justify-center">
            <span className="absolute bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Ou texte libre
            </span>
            <div className="w-full h-px bg-slate-100"></div>
          </div>

          <textarea
            value={manualText}
            onChange={(e) => { setManualText(e.target.value); setFiles([]); }}
            placeholder="Saisissez du texte ici..."
            className="w-full h-48 p-6 rounded-[2rem] bg-slate-50 border-none focus:ring-4 focus:ring-red-500/5 text-sm text-slate-700 resize-none transition-all placeholder:text-slate-300 font-medium"
          />

          <button
            onClick={convertToPdf}
            disabled={(files.length === 0 && !manualText.trim()) || loading}
            className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:bg-red-600 transition-all active:scale-95 disabled:opacity-30 hover:shadow-red-500/20">
            {loading ? 'Génération en cours...' : 'Générer le PDF combiné'}
          </button>
        </div>

        <footer className="pt-6 border-t border-slate-50">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60">
            Processing Local & Sécurisé • {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </main>
  );
}