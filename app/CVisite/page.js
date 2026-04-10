import React from 'react';

export default function BusinessCardHome() {
  return (
    <main className="min-h-screen bg-[#f8fafc] bg-gradient-to-br from-[#fff7ed] via-[#f1f5f9] to-[#eff6ff] flex items-center justify-center px-6 relative overflow-hidden font-sans">
      
      {/* Bouton de fermeture / Retour */}
      <a href="/" className="absolute top-6 right-8 text-gray-400 hover:text-orange-600 transition duration-300">
        <span className="text-2xl">✕</span>
      </a>

      <div className="max-w-7xl w-full flex flex-col md:flex-row items-center justify-between gap-12 py-12">
        
        {/* Section Texte - Contexte Carte de Visite */}
        <div className="flex-1 space-y-8 z-10 text-center md:text-left">
          <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-widest mb-2 shadow-sm">
              Digital Brand Identity
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.05]">
            Ta carte de visite <br />
            <span className="text-orange-600">en un clic.</span>
          </h1>
          
          <p className="text-lg text-slate-600 leading-relaxed max-w-md mx-auto md:mx-0">
            Choisissez un design professionnel et personnalisez-le instantanément avec vos informations et votre logo.
          </p>

          {/* SÉLECTION DES MODÈLES */}
          <div className="flex flex-col gap-4 pt-4">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Choisir un modèle :</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* MODÈLE 1 : Modern Corporate */}
              <a 
                href="/CVisite/model1" 
                className="group relative bg-white border-2 border-transparent hover:border-blue-500 p-5 rounded-2xl shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-blue-600 uppercase">Modèle 1</span>
                  <span className="text-xl">🔷</span>
                </div>
                <h3 className="font-bold text-slate-800">Modern Blue</h3>
                <p className="text-xs text-slate-500 mt-1">Design épuré et géométrique</p>
                <div className="mt-4 flex items-center text-blue-600 font-bold text-sm">
                  Utiliser <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </a>

              {/* MODÈLE 2 : Premium Banner */}
              <a 
                href="/CVisite/model2" 
                className="group relative bg-slate-900 border-2 border-transparent hover:border-orange-500 p-5 rounded-2xl shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-orange-500 uppercase">Modèle 2</span>
                  <span className="text-xl">🏙️</span>
                </div>
                <h3 className="font-bold text-white">Premium Banner</h3>
                <p className="text-xs text-slate-400 mt-1">Style Consultant avec photo</p>
                <div className="mt-4 flex items-center text-orange-500 font-bold text-sm">
                  Utiliser <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </a>

              {/* MODÈLE 3 : Académique (NOUVEAU) */}
              <a 
                href="/CVisite/model3" 
                className="group relative bg-white border-2 border-transparent hover:border-emerald-600 p-5 rounded-2xl shadow-xl transition-all hover:-translate-y-1 border-slate-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-emerald-600 uppercase">Modèle 3</span>
                  <span className="text-xl">🎓</span>
                </div>
                <h3 className="font-bold text-slate-800">Classic Academic</h3>
                <p className="text-xs text-slate-500 mt-1">Sobre, institutionnel et clair</p>
                <div className="mt-4 flex items-center text-emerald-600 font-bold text-sm">
                  Utiliser <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </a>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-6">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold shadow-sm">
                  {i === 1 ? '📇' : i === 2 ? '🎨' : 'QR'}
                </div>
              ))}
            </div>
            <span className="text-sm text-slate-500 font-medium">Rejoint par +2000 pro</span>
          </div>
        </div>

        {/* Section Visuelle - Preview dynamique */}
        <div className="flex-1 relative flex justify-center w-full lg:max-w-md">
          <div className="absolute inset-0 bg-orange-400/20 blur-[120px] rounded-full"></div>
          
          <div className="relative w-full aspect-[1.58/1] bg-gradient-to-tr from-slate-800 to-slate-950 rounded-[2.5rem] p-1 shadow-[0_25px_60px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl"></div>
            
            <div className="w-[92%] h-[85%] bg-white rounded-3xl p-6 shadow-2xl flex flex-col justify-between transform rotate-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="h-4 bg-slate-900 rounded w-24 mb-2"></div>
                  <div className="h-2 bg-orange-500 rounded w-16"></div>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-lg border border-orange-100 flex items-center justify-center text-[8px] text-orange-600 font-bold">
                  LOGO
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <div className="h-1.5 bg-slate-100 rounded-full w-full"></div>
                <div className="h-1.5 bg-slate-100 rounded-full w-5/6"></div>
                <div className="h-1.5 bg-orange-100 rounded-full w-4/6"></div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-50 pt-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Prêt à l'envoi</p>
                </div>
                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold">PDF PRO</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}