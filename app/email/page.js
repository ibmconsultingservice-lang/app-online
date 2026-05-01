'use client'

import React, { useState } from 'react'
import { Copy, Check, Send, Sparkles, Zap } from 'lucide-react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'

export default function EmailManager() {
  const allowed = usePlanGuard('free')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [context, setContext]             = useState('')
  const [platform, setPlatform]           = useState('linkedin')
  const [tone, setTone]                   = useState('professional')
  const [generatedText, setGeneratedText] = useState('')
  const [loading, setLoading]             = useState(false)
  const [copied, setCopied]               = useState(false)
  const [error, setError]                 = useState('')

  const PLATFORMS = {
    linkedin:  'LinkedIn',
    email:     'Email professionnel',
    whatsapp:  'WhatsApp Business',
    sms:       'SMS / iMessage',
  }

  const TONES = {
    professional: 'strict et professionnel',
    friendly:     'amical et direct',
    persuasive:   'persuasif orienté vente',
    short:        'ultra-court et percutant',
  }

  const generateMessage = async () => {
    if (!context.trim()) return

    if (!hasCredits(1)) {
      router.push('/pricing')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/generer-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, platform, tone }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      await deductCredits(1)
      setGeneratedText(data.text)

    } catch (err) {
      console.error('Erreur:', err)
      setError('❌ Erreur : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading screen while plan is verified ──
  if (!allowed) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100 space-y-8">

        <header className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-[950] tracking-tighter text-slate-900 italic">
              Email<span className="text-indigo-600">Manager</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Business Outreach Engine
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Credits badge */}
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
              <Zap size={12} className="text-indigo-600" fill="currentColor"/>
              <span className="text-xs font-black text-indigo-700">{credits}</span>
            </div>
            <div className="bg-indigo-50 p-3 rounded-2xl">
              <Sparkles className="text-indigo-600 w-6 h-6" />
            </div>
          </div>
        </header>

        {/* Low credits warning */}
        {credits < 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-700 font-medium flex items-center justify-between">
            <span>⚠️ Crédits insuffisants (1 requis)</span>
            <button onClick={() => router.push('/pricing')} className="font-black underline">
              Recharger
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Configuration */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 ml-2">
                Contexte & Objectif
              </label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Ex: Contacter un RH pour un poste de dev, relancer un client après un devis..."
                className="w-full h-40 p-5 rounded-3xl bg-slate-50 border-none focus:ring-4 focus:ring-indigo-500/10 text-sm resize-none transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 ml-2">
                  Plateforme
                </label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none text-sm font-bold text-slate-700 outline-none"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="email">Email Pro</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS / iMessage</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 ml-2">
                  Ton
                </label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none text-sm font-bold text-slate-700 outline-none"
                >
                  <option value="professional">Strict & Pro</option>
                  <option value="friendly">Amical & Direct</option>
                  <option value="persuasive">Persuasif / Vente</option>
                  <option value="short">Ultra-Court</option>
                </select>
              </div>
            </div>

            <button
              onClick={generateMessage}
              disabled={loading || !context.trim() || !hasCredits(1)}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-30"
            >
              {loading ? 'Analyse stratégique...' : 'Générer le message · ⚡1'}
            </button>
          </div>

          {/* Résultat */}
          <div className="relative group">
            <label className="text-xs font-black uppercase text-slate-500 ml-2 block mb-2">
              Message Suggéré
            </label>
            <div className="w-full min-h-[300px] bg-slate-900 rounded-[2.5rem] p-8 text-indigo-100 text-sm leading-relaxed relative overflow-hidden">
              {generatedText ? (
                <>
                  <div className="whitespace-pre-wrap pr-10">{generatedText}</div>
                  <button
                    onClick={copyToClipboard}
                    className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                  >
                    {copied
                      ? <Check className="w-4 h-4 text-green-400" />
                      : <Copy className="w-4 h-4" />
                    }
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-500 space-y-4">
                  <Send className="w-8 h-8 opacity-20" />
                  <p className="italic text-center">
                    En attente de contexte pour rédiger votre approche...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="pt-8 border-t border-slate-50 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          <span>IA Strategy Advisor • 2026</span>
          <span className="text-indigo-300">Convertissez vos prospects en clients</span>
        </footer>
      </div>
    </main>
  )
}