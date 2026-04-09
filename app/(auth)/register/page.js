'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'; // Utilise l'alias corrigé @/
import { User, Mail, Lock, Sparkles, Loader2, Chrome, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register, loginGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Appelle la fonction register de ton hook root/hooks/useAuth.js
      await register(formData.email, formData.password, formData.name);
      router.push('/dashboard');
    } catch (err) {
      console.error("Registration error", err);
      setError("Erreur lors de la création du compte. Vérifiez vos informations.");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      await loginGoogle();
      router.push('/dashboard');
    } catch (err) {
      setError("Erreur lors de l'inscription avec Google.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-100/50 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-50/50 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <Sparkles size={24} fill="currentColor" />
            </div>
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Inscription.</h1>
          <p className="text-slate-500 font-medium text-sm">Commencez avec 10 crédits offerts.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-indigo-100/50">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Nom complet</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium outline-none"
                  placeholder="Votre nom"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium outline-none"
                  placeholder="email@exemple.com"
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
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium outline-none"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Créer mon compte →"}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-400">
              <span className="bg-white px-4">Ou s'inscrire avec</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full py-4 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
          >
            <Chrome size={20} className="text-blue-500" />
            Google
          </button>

          <div className="mt-8 pt-8 border-t border-slate-50 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Déjà inscrit ?{' '}
              <Link href="/login" className="text-indigo-600 font-bold hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}