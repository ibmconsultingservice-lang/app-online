'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Mail, Lock, ArrowRight, Loader2, Chrome } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, loginGoogle } = useAuth();
  const router = useRouter();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Email ou mot de passe incorrect.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginGoogle();
      router.push('/dashboard');
    } catch (err) {
      setError('Erreur lors de la connexion avec Google.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Design Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-100/50 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/50 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 group mb-8">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
              <Zap size={24} fill="currentColor" />
            </div>
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Bon retour.</h1>
          <p className="text-slate-500 font-medium text-sm">Accédez à votre espace IA Business.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                  placeholder="nom@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-indigo-600 transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>Se connecter <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-400">
              <span className="bg-white px-4">Ou continuer avec</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
          >
            <Chrome size={20} className="text-blue-500" />
            Google
          </button>

          <div className="mt-8 pt-8 border-t border-slate-50 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Pas de compte ?{' '}
              <Link href="/register" className="text-indigo-600 font-bold hover:underline">S'inscrire gratuitement</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}