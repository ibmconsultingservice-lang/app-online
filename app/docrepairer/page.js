'use client'

import React, { useState } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { usePlanGuard } from '@/hooks/usePlanGuard';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export default function DocRepairer() {
  const allowed = usePlanGuard('free')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [file, setFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ content: "", format: "" });

  const handleProcess = async () => {
    if (!hasCredits(2)) {
      router.push('/pricing')
      return
    }

    setLoading(true);
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (manualText) formData.append('manualText', manualText);

    try {
      const res = await fetch('/api/generer-docrepairer', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await deductCredits(2)
      setResult({ content: data.content, format: data.detectedFormat });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (type) => {
    const cleanContent = result.content.replace(/\*\*/g, "");
    const fileName = `Repare_${Date.now()}`;

    if (type === 'excel') {
      try {
        const XLSX = await import('xlsx');
        const jsonData = JSON.parse(cleanContent.substring(cleanContent.indexOf('['), cleanContent.lastIndexOf(']') + 1));
        const ws = XLSX.utils.json_to_sheet(jsonData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } catch (e) { alert("Erreur de formatage Excel"); }
    } else if (type === 'word') {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const { saveAs } = await import('file-saver');
      const doc = new Document({
        sections: [{ children: cleanContent.split('\n').map(l => new Paragraph({ children: [new TextRun(l)] })) }]
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
    <main className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] py-12 px-6 font-sans antialiased text-slate-900">
      <div className="max-w-6xl mx-auto space-y-10">

        <header className="relative bg-white/60 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-white/80 flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"/>
          <div className="relative z-10">
            <h1 className="text-5xl font-[900] tracking-tighter italic">
              Doc<span className="text-blue-600">Repairer</span>
              <span className="ml-2 text-slate-300 not-italic font-light">360°</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium tracking-tight">Intelligence artificielle au service de la cohérence documentaire.</p>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-2">
            <Zap size={13} className="text-indigo-600" fill="currentColor"/>
            <span className="text-xs font-black text-indigo-700">{credits} crédits</span>
          </div>
        </header>

        {credits < 2 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-sm text-amber-700 font-medium">⚠️ Crédits insuffisants (2 requis)</span>
            <button onClick={() => router.push('/pricing')}
              className="bg-amber-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-amber-600 transition-all">
              Recharger
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-10">
          <section className="bg-white/70 backdrop-blur-md p-8 rounded-[3rem] shadow-2xl shadow-slate-900/5 border border-white flex flex-col gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Configuration Source</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-8 file:rounded-2xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-slate-900 file:text-white hover:file:bg-blue-600 file:transition-all cursor-pointer"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200"/>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Contenu Textuel</span>
                <div className="h-px flex-1 bg-slate-200"/>
              </div>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Collez votre texte ici pour une analyse instantanée..."
                className="w-full h-80 p-6 rounded-[2rem] bg-slate-50/50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white transition-all text-sm text-slate-700 resize-none shadow-inner leading-relaxed outline-none"
              />
            </div>

            <button
              onClick={handleProcess}
              disabled={loading || !hasCredits(2)}
              className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 shadow-xl flex items-center justify-center gap-3 ${
                loading || !hasCredits(2)
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-blue-600 hover:-translate-y-1 hover:shadow-blue-500/20 active:translate-y-0'
              }`}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"/>
                  Traitement IA en cours...
                </>
              ) : 'Lancer la Réparation · ⚡2'}
            </button>
          </section>

          <section className="bg-white p-2 rounded-[3.5rem] shadow-2xl shadow-blue-900/10 border border-white flex flex-col min-h-[600px] overflow-hidden">
            <div className="bg-slate-900 m-2 p-8 rounded-[2.5rem] flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic">Version Réparée</label>
                  <span className="text-white/40 text-[10px] font-medium tracking-tight">Prêt pour exportation</span>
                </div>
                {result.content && (
                  <div className="flex gap-3">
                    {(result.format === 'pdf' || result.format === 'docx' || result.format === 'txt' || !result.format) && (
                      <button onClick={() => downloadFile('word')}
                        className="bg-white text-slate-900 text-[10px] font-black px-6 py-3 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                        WORD
                      </button>
                    )}
                    {(result.format === 'xlsx' || result.format === 'xls' || result.format === 'csv') && (
                      <button onClick={() => downloadFile('excel')}
                        className="bg-green-500 text-white text-[10px] font-black px-6 py-3 rounded-full hover:bg-green-400 transition-all shadow-lg">
                        EXCEL
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 px-10 py-8 text-sm text-slate-600 overflow-y-auto whitespace-pre-wrap font-medium leading-loose">
              {result.content ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">{result.content}</div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l5 5v11a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <p className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400">Waiting for intelligence</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}