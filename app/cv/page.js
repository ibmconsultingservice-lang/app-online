import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8faff] bg-gradient-to-br from-[#f3f4ff] via-[#e0e7ff] to-[#d1d5ff] flex items-center justify-center px-6 relative overflow-hidden">
      
      {/* Bouton de fermeture (optionnel) */}
      <button className="absolute top-6 right-8 text-gray-400 hover:text-gray-600 transition">
        <span className="text-2xl">✕</span>
      </button>

      <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between gap-12 py-12">
        
        {/* Section Texte - Contexte CV */}
        <div className="flex-1 space-y-6 z-10">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
            Crée ton CV en <br />
            <span className="text-blue-600">quelques secondes</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-md">
            Décris ton profil en quelques mots, notre IA génère un CV professionnel et optimisé pour toi. Plus besoin de passer des heures sur la mise en page.
          </p>
          <div className="flex items-center gap-4">
            <a 
              href="/cv/build"
              className="bg-black text-white px-8 py-4 rounded-full text-md font-semibold hover:bg-gray-800 transition-all shadow-xl active:scale-95 text-center"
            >
              Commencer maintenant
            </a>
          </div>
        </div>

        {/* Section Visuelle - Simulation IA */}
        <div className="flex-1 relative flex justify-center">
          {/* Lueur d'arrière-plan violette */}
          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
          
          {/* Carte Principale (Le canevas) */}
          <div className="relative w-full max-w-md aspect-[4/3] bg-gradient-to-tr from-[#6366f1] to-[#a855f7] rounded-[3rem] p-8 shadow-2xl flex items-center justify-center">
            
            {/* Fenêtre de l'IA Génératrice */}
            <div className="w-full bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl space-y-6 transform hover:-rotate-1 transition-transform duration-500">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center shadow-inner">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">IA CV Builder</h3>
                  <p className="text-[10px] uppercase tracking-widest text-blue-500 font-bold mt-1">
                    Analyse du profil en cours...
                  </p>
                </div>
              </div>

              {/* Simulation de l'input utilisateur pour le CV */}
              <div className="relative group">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm text-gray-500 italic leading-relaxed">
                  "Je suis un développeur React avec 3 ans d'expérience, passionné par l'UX..."
                </div>
                
                {/* Petit bouton "Générer" flottant */}
                <div className="absolute -bottom-3 -right-2 bg-black text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span className="text-xs">🪄</span>
                </div>
              </div>

              {/* Barre de progression factice */}
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[70%] animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
