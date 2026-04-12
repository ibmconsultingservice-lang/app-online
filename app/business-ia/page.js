'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Send, Sparkles, RefreshCw, BarChart3, ShieldAlert, Target, Zap, Cpu } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { usePlanGuard } from '@/hooks/usePlanGuard';
import { useRouter } from 'next/navigation';

export default function BusinessIA() {
  usePlanGuard('pro');

  const { deductCredits, hasCredits, credits } = useCredits();
  const router = useRouter();

  const [context, setContext] = useState("");
  const [replyReceived, setReplyReceived] = useState("");
  const [tone, setTone] = useState("persuasive");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const generateResponse = async (isFollowUp = false) => {
    // ── Credit check ──────────────────────────────
    if (!hasCredits(3)) {
      router.push('/pricing')
      return
    }

    const userContent = isFollowUp 
      ? `RÉPONSE / MISE À JOUR : "${replyReceived}". Analyse cette étape et propose la suite.`
      : `DOSSIER BUSINESS : ${context}`;

    const newHistory = [...chatHistory, { role: "user", content: userContent }];
    
    setLoading(true);
    try {
      const response = await fetch('/api/generer-business-ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: newHistory, 
          platform: "Général Business",
          tone 
        }),
      });

      const data = await response.json();
      if (data.text) {
        // ── Deduct credits after success ──────────
        await deductCredits(3)
        setChatHistory([...newHistory, { role: "assistant", content: data.text }]);
        setReplyReceived("");
      }
    } catch (err) {
      console.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#e2e8f0] bg-gradient-to-br from-[#cbd5e1] via-[#f1f5f9] to-[#94a3b8] text-slate-800 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/40 border border-white/60 p-8 rounded-[2.5rem] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/20 rotate-45 blur-3xl pointer-events-none"></div>
            
            <header className="mb-10 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-900 rounded-2xl shadow-2xl shadow-indigo-500/20">
                    <Cpu className="text-indigo-400" size={22} />
                  </div>
                  <h1 className="text-2xl font-[1000] tracking-[-0.05em] uppercase italic text-slate-900">
                    CORE<span className="text-indigo-600">.AX</span>
                  </h1>
                </div>
                {/* ── Credits badge ── */}
                <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
                  <Zap size={11} className="text-indigo-600" fill="currentColor"/>
                  <span className="text-[10px] font-black text-indigo-700">{credits}</span>
                </div>
              </div>
              <div className="h-[2px] w-12 bg-indigo-600 rounded-full"></div>
              <p className="text-[9px] text-slate-500 font-black tracking-[0.4em] uppercase mt-4">High-End Business Logic</p>
            </header>

            <div className="space-y-6 relative">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Target size={12} className="text-indigo-600"/> Input Contextuel
                </label>
                <textarea 
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Paramétrez les variables du dossier ici..."
                  className="w-full h-48 p-5 rounded-3xl bg-white/50 border border-white/80 text-slate-800 text-sm resize-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all placeholder:text-slate-400 shadow-inner"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <BarChart3 size={12} className="text-indigo-600"/> Stratégie de ton
                </label>
                <select 
                  value={tone} 
                  onChange={(e) => setTone(e.target.value)} 
                  className="w-full p-4 bg-white/50 border border-white/80 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none cursor-pointer shadow-sm hover:bg-white transition-colors"
                >
                  <option value="persuasive">Impact / Vente</option>
                  <option value="assertive">Autorité / Fermeté</option>
                  <option value="diplomatic">Diplomatique / Nuancé</option>
                  <option value="analytical">Data-Driven / Froid</option>
                </select>
              </div>

              {/* ── Low credits warning ── */}
              {credits < 3 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-700 font-medium">
                  ⚠️ Crédits insuffisants (3 requis) —{' '}
                  <button
                    onClick={() => router.push('/pricing')}
                    className="font-black underline">
                    Recharger
                  </button>
                </div>
              )}

              <button 
                onClick={() => generateResponse(false)}
                disabled={loading || !context || !hasCredits(3)}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-indigo-600 hover:shadow-2xl active:scale-95 disabled:opacity-20 shadow-lg"
              >
                {loading ? "Calcul en cours..." : `Générer la Solution · ⚡3`}
              </button>
            </div>
          </div>

          {/* MODULE D'ITÉRATION */}
          {chatHistory.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-8 rounded-[2.5rem] shadow-2xl space-y-5 animate-in slide-in-from-left-4 duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldAlert size={60} />
              </div>
              <div className="flex items-center gap-2 text-indigo-100">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] italic">Mise à jour Dossier</h3>
              </div>
              <textarea 
                value={replyReceived}
                onChange={(e) => setReplyReceived(e.target.value)}
                placeholder="Nouvelle réponse ou obstacle ?"
                className="w-full h-24 p-4 rounded-2xl bg-black/20 border border-white/10 text-white text-sm placeholder:text-indigo-300/50 resize-none focus:ring-2 focus:ring-white/20 outline-none"
              />
              <button 
                onClick={() => generateResponse(true)}
                disabled={loading || !replyReceived || !hasCredits(3)}
                className="w-full bg-white text-indigo-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-30"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Recalculer · ⚡3
              </button>
            </div>
          )}
        </div>

        {/* TERMINAL DE SORTIE */}
        <div className="lg:col-span-8 bg-white/60 border border-white rounded-[3rem] flex flex-col h-[85vh] overflow-hidden backdrop-blur-md shadow-[0_30px_60px_rgba(0,0,0,0.05)]">
          <div className="p-6 border-b border-white/80 flex justify-between items-center bg-white/20">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300 border border-white"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300 border border-white"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300 border border-white"></div>
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.5em]">Titanium_Output_Node</span>
            </div>
            <div className="px-3 py-1 bg-white/50 rounded-full border border-white text-[8px] font-black text-indigo-600 uppercase tracking-widest">
              Live Analysis
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 md:p-14 space-y-16 scroll-smooth">
            {chatHistory.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-8">
                <div className="relative group">
                  <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                  <Sparkles size={64} className="relative opacity-20 text-slate-900" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 leading-loose">
                    Prêt pour l'initialisation stratégique
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Insérez vos données dans le panneau latéral
                  </p>
                </div>
              </div>
            )}

            {chatHistory.map((msg, i) => msg.role === "assistant" && (
              <div key={i} className="group animate-in fade-in slide-in-from-bottom-6 duration-1000 relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-xl">
                      <Zap size={12} className="text-indigo-400" />
                    </div>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">
                      Strategy_Module_0{Math.ceil((i+1)/2)}
                    </span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(msg.content)} 
                    className="p-3 bg-white hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm border border-white hover:border-slate-900 active:scale-90"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                
                <div className="bg-white/40 p-8 rounded-[2rem] border border-white/60 shadow-sm group-hover:shadow-md transition-shadow relative">
                  <div className="text-slate-800 leading-relaxed text-[17px] whitespace-pre-wrap font-medium">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-6 pl-4 font-black text-[10px] tracking-[0.4em] text-indigo-600 animate-pulse uppercase">
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                </div>
                Synchronizing_Intelligence
              </div>
            )}
          </div>

          <div className="p-6 bg-white/40 border-t border-white flex justify-center items-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-2">
              <span className="w-2 h-[1px] bg-slate-300"></span>
              Core.AX v4.0 Titanium • 2026
              <span className="w-2 h-[1px] bg-slate-300"></span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}