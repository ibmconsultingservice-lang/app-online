'use client'

import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';

export default function DocRepairer() {
  const [file, setFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ content: "", format: "" });

  const [deepPrompt, setDeepPrompt] = useState("");
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepResult, setDeepResult] = useState("");

  const handleProcess = async () => {
    setLoading(true);
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (manualText) formData.append('manualText', manualText);

    try {
      const res = await fetch('/docanalyser/generate', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult({ content: data.content, format: data.detectedFormat });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeepAnalyse = async () => {
      setDeepLoading(true);
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (manualText) formData.append('manualText', manualText);
      if (deepPrompt) formData.append('prompt', deepPrompt);

      try {
        const res = await fetch('/docanalyser/deepanalyse', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setDeepResult(data.content);
      } catch (err) {
        alert(err.message);
      } finally {
        setDeepLoading(false);
      }
    };


  const downloadFile = async (type) => {
    const cleanContent = result.content.replace(/\*\*/g, "");
    const fileName = `Analyse_${Date.now()}`;

    if (type === 'excel') {
      try {
        const jsonData = JSON.parse(cleanContent.substring(cleanContent.indexOf('['), cleanContent.lastIndexOf(']') + 1));
        const ws = XLSX.utils.json_to_sheet(jsonData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } catch (e) { alert("Erreur de formatage Excel"); }
    } 
    else if (type === 'word') {
      const doc = new Document({
        sections: [{ children: cleanContent.split('\n').map(l => new Paragraph({ children: [new TextRun(l)] })) }]
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${fileName}.docx`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] py-12 px-6 font-sans antialiased text-slate-900">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="relative bg-white/60 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-white/80 flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h1 className="text-5xl font-[900] tracking-tighter italic">
              Business Doc<span className="text-green-600">Analyser</span> 
              <span className="ml-2 text-slate-300 not-italic font-light">360°</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium tracking-tight">Intelligence artificielle au service de la cohérence documentaire.</p>
          </div>
          {file && (
            <div className="relative z-10 flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-inner border border-slate-100 animate-in fade-in zoom-in duration-300">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 italic">{file.name.split('.').pop()} detected</span>
            </div>
          )}
        </header>

        <div className="grid lg:grid-cols-2 gap-10 items-stretch">
          {/* Input Panel - Hauteur alignée sur le voisin via flex-1 sur le textarea */}
          <section className="bg-white/70 backdrop-blur-md p-8 rounded-[3rem] shadow-2xl shadow-slate-900/5 border border-white flex flex-col">
            <div className="space-y-4 mb-8">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Configuration Source</label>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-8 file:rounded-2xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-slate-900 file:text-white hover:file:bg-green-600 cursor-pointer" />
            </div>
            <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Collez votre texte ici..." className="w-full flex-1 min-h-[320px] p-6 rounded-[2rem] bg-slate-50/50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white transition-all text-sm text-slate-700 resize-none outline-none mb-8" />
            <button onClick={handleProcess} disabled={loading} className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 ${loading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-green-600'}`}>
              {loading ? "Analyse en cours..." : "Lancer l'analyse"}
            </button>
          </section>

          <section className="bg-white p-2 rounded-[3.5rem] shadow-2xl shadow-blue-900/10 border border-white flex flex-col min-h-[600px] overflow-hidden">
             <div className="bg-slate-900 m-2 p-8 rounded-[2.5rem] flex justify-between items-center">
                <span className="text-green-400 text-[10px] font-black uppercase tracking-widest italic">Rapport de Synthèse</span>
                {result.content && (
                  <button onClick={() => downloadFile('word')} className="bg-white text-slate-900 text-[10px] font-black px-6 py-3 rounded-full hover:bg-green-600 hover:text-white transition-all">EXPORTER WORD</button>
                )}
             </div>
             <div className="flex-1 px-10 py-8 text-sm text-slate-600 overflow-y-auto whitespace-pre-wrap leading-loose">
               {result.content || "En attente de données..."}
             </div>
          </section>
        </div>

        {/* --- SECTION DEEP ANALYSE --- */}
        <section className="mt-20 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-slate-900 text-3xl font-[900] italic tracking-tighter">Deep Analysis Mode</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Investigation ciblée sur les données sources</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-stretch">
            {/* Input Panel - Deep Prompt avec alignement vertical */}
            <section className="bg-white/70 backdrop-blur-md p-8 rounded-[3rem] shadow-xl border border-white flex flex-col">
              <div className="space-y-4 mb-8">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 italic">
                  Question Spécifique
                </label>
                <div className="h-px bg-slate-100 w-full"></div>
              </div>
              
              <textarea 
                value={deepPrompt} 
                onChange={(e) => setDeepPrompt(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleDeepAnalyse()}
                placeholder="Ex: Analysez les risques financiers mentionnés dans la section 4..." 
                className="w-full flex-1 min-h-[320px] p-6 rounded-[2rem] bg-slate-50/50 border-2 border-transparent focus:border-green-500/20 focus:bg-white transition-all text-sm outline-none resize-none shadow-inner mb-8" 
              />

              <button 
                onClick={handleDeepAnalyse} 
                disabled={deepLoading || !deepPrompt} 
                className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3
                  ${deepLoading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-green-600'}
                `}
              >
                {deepLoading ? "Investigation..." : "Lancer l'investigation"}
              </button>
            </section>

            {/* Result Panel - Deep Result */}
            <section className="bg-white p-2 rounded-[3.5rem] shadow-2xl border border-white flex flex-col min-h-[600px] overflow-hidden">
              <div className="bg-slate-900 m-2 p-8 rounded-[2.5rem] flex justify-between items-center">
                <span className="text-green-400 text-[10px] font-black uppercase tracking-widest italic">Résultat de l'investigation</span>
                {deepLoading && (
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 px-10 py-8 text-sm text-slate-600 overflow-y-auto whitespace-pre-wrap leading-loose font-medium">
                {deepResult ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {deepResult}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="font-black uppercase tracking-[0.2em] text-[10px]">Prêt pour l'analyse profonde</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}