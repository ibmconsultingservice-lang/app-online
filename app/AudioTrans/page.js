'use client'

import React, { useState } from 'react';
import { usePlanGuard } from '@/hooks/usePlanGuard';
import { useCredits } from '@/hooks/useCredits';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export default function AudioTransHome() {
  const allowed = usePlanGuard('free')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setTranscription("");
    setSummary("");
  };

  const handleStartTranscription = async () => {
    if (!selectedFile) return;
    if (!hasCredits(1)) { router.push('/pricing'); return; }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio', selectedFile);

    try {
      const res = await fetch('/api/generer-audiotrans/generate', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Erreur lors de la transcription");
      const data = await res.json();
      await deductCredits(1)
      setTranscription(data.text);
    } catch (err) {
      alert("Impossible de transcrire l'audio. Vérifiez votre connexion.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!transcription) return;
    if (!hasCredits(1)) { router.push('/pricing'); return; }

    setIsSummarizing(true);
    try {
      const res = await fetch('/api/generer-audiotrans/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcription }),
      });
      if (!res.ok) throw new Error("Erreur lors du résumé");
      const data = await res.json();
      await deductCredits(1)
      setSummary(data.summary);
    } catch (err) {
      alert("Erreur lors de la génération du résumé.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copié !");
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
    <main className="min-h-screen bg-[#f8fafc] bg-gradient-to-br from-[#f0f9ff] via-[#f1f5f9] to-[#faf5ff] flex items-center justify-center px-6 relative overflow-hidden font-sans">
      <a href="/" className="absolute top-6 right-8 text-gray-400 hover:text-blue-600 transition duration-300">
        <span className="text-2xl">✕</span>
      </a>

      {/* Credits badge */}
      <div className="absolute top-6 left-8 flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
        <Zap size={12} className="text-indigo-600" fill="currentColor"/>
        <span className="text-xs font-bold text-indigo-700">{credits} crédits</span>
      </div>

      <div className="max-w-7xl w-full flex flex-col md:flex-row items-start justify-between gap-12 py-12">

        <div className="flex-1 space-y-8 z-10 text-center md:text-left">
          <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-widest mb-2 shadow-sm">
            AI Audio Intelligence
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.05]">
            Convertissez vos audios <br />
            <span className="text-blue-600">en intelligence.</span>
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed max-w-md mx-auto md:mx-0">
            Transcrivez vos fichiers et générez des résumés structurés grâce à l'IA Claude.
          </p>

          {credits < 1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <span className="text-sm text-amber-700 font-medium">⚠️ Crédits insuffisants</span>
              <button onClick={() => router.push('/pricing')}
                className="bg-amber-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-amber-600 transition-all">
                Recharger
              </button>
            </div>
          )}

          <div className="flex flex-col gap-6 pt-4">
            <label className="cursor-pointer group">
              <div className="bg-white border-2 border-dashed border-slate-200 group-hover:border-blue-500 p-8 rounded-3xl shadow-xl transition-all flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🎙️</div>
                <div className="text-center">
                  <p className="font-bold text-slate-800">Sélectionner un audio</p>
                  <p className="text-xs text-slate-500 mt-1">MP3, WAV, M4A</p>
                </div>
                <input type="file" className="hidden" onChange={handleFileChange} accept="audio/*" />
              </div>
            </label>

            {audioUrl && (
              <div className="bg-white rounded-2xl shadow-md p-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-600 mb-2">🎧 Lecture de l'audio</p>
                <audio controls className="w-full rounded-lg">
                  <source src={audioUrl} />
                </audio>
                <p className="text-xs text-slate-400 mt-2 truncate">{selectedFile?.name}</p>
              </div>
            )}

            {selectedFile && !transcription && (
              <button
                onClick={handleStartTranscription}
                disabled={isProcessing || !hasCredits(1)}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 disabled:opacity-50">
                {isProcessing ? "Transcription..." : "✨ Lancer la transcription · ⚡1"}
              </button>
            )}

            {transcription && (
              <button
                onClick={handleGenerateSummary}
                disabled={isSummarizing || !hasCredits(1)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50">
                {isSummarizing ? "Génération du résumé..." : "📝 Résumer la réunion · ⚡1"}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 w-full lg:max-w-2xl relative">
          <div className="absolute inset-0 bg-blue-400/10 blur-[120px] rounded-full"/>
          <div className="relative w-full min-h-[600px] bg-white rounded-[3rem] p-8 shadow-xl border border-white flex flex-col gap-6">

            <div className="flex-1 flex flex-col min-h-[250px]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Transcription</h3>
                {transcription && (
                  <button onClick={() => copyText(transcription)} className="text-xs font-bold text-blue-600">Copier</button>
                )}
              </div>
              <div className="overflow-y-auto max-h-[200px] text-slate-700 text-sm leading-relaxed">
                {isProcessing ? <p className="animate-pulse">Analyse audio...</p> : transcription || "En attente d'audio..."}
              </div>
            </div>

            <div className={`flex-1 flex flex-col border-t pt-4 transition-all ${summary || isSummarizing ? 'opacity-100' : 'opacity-30'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider italic">Résumé Stratégique</h3>
                {summary && (
                  <button onClick={() => copyText(summary)} className="text-xs font-bold text-indigo-600">Copier le résumé</button>
                )}
              </div>
              <div className="overflow-y-auto text-slate-800 text-sm leading-relaxed bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100">
                {isSummarizing ? (
                  <div className="flex items-center gap-2 text-indigo-500">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"/>
                    <p className="font-medium">Claude analyse le texte...</p>
                  </div>
                ) : summary ? (
                  <div className="prose prose-sm prose-indigo whitespace-pre-line">{summary}</div>
                ) : (
                  <p className="italic text-slate-400">Le résumé structuré apparaîtra ici.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}