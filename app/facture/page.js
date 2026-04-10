import React from 'react';
import Link from 'next/link';

export default function FactureHome() {
  return (
    <main className="min-h-screen bg-[#fcfaff] bg-gradient-to-br from-[#f5f3ff] via-[#f8fafc] to-[#e0e7ff] flex items-center justify-center px-6 relative overflow-hidden font-sans">
      
      {/* Bouton Retour Accueil */}
      <Link href="/" className="absolute top-6 right-8 text-gray-400 hover:text-indigo-600 transition duration-300">
        <span className="text-2xl">✕</span>
      </Link>

      <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between gap-12 py-12">
        
        {/* Section Texte - Contexte Facturation */}
        <div className="flex-1 space-y-8 z-10 text-center md:text-left">
          <div className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest mb-2 shadow-sm">
             Finance & Business Tool
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.05]">
            Facturez vos clients <br />
            <span className="text-indigo-600">avec précision.</span>
          </h1>
          
          <p className="text-lg text-slate-600 leading-relaxed max-w-md mx-auto md:mx-0">
            Générez des factures professionnelles, calculez la TVA automatiquement et gérez vos prestations en un clic. L'outil indispensable pour votre entreprise.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5 pt-4">
            <Link 
              href="/facture/facture"
              className="group bg-indigo-600 text-white px-10 py-4 rounded-2xl text-md font-bold hover:bg-indigo-700 transition-all shadow-2xl hover:shadow-indigo-200 active:scale-95 text-center flex items-center gap-3"
            >
              Créer une facture
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500"></span>
              Conforme aux normes 2026
            </div>
          </div>
        </div>

        {/* Section Visuelle - Simulation Facture */}
        <div className="flex-1 relative flex justify-center w-full">
          {/* Lueur d'arrière-plan indigo */}
          <div className="absolute inset-0 bg-indigo-500/10 blur-[120px] rounded-full"></div>
          
          {/* Carte Principale (Le canevas) */}
          <div className="relative w-full max-w-md aspect-[4/3] bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center justify-center overflow-hidden">
            
            {/* Décoration de fond (Grille comptable) */}
            <div className="absolute inset-0 opacity-10 p-6 flex flex-col gap-4">
               <div className="h-full border-l border-r border-white flex justify-between px-4">
                 {[...Array(4)].map((_, i) => <div key={i} className="w-px h-full bg-white"></div>)}
               </div>
            </div>

            {/* Fenêtre de la Facture */}
            <div className="w-full bg-white rounded-3xl p-6 shadow-2xl space-y-4 transform -rotate-1 hover:rotate-0 transition-all duration-700">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="w-10 h-3 bg-indigo-600 rounded-full"></div>
                  <div className="w-16 h-2 bg-slate-200 rounded-full"></div>
                </div>
                <div className="text-[10px] font-bold text-indigo-600 uppercase">Facture #842</div>
              </div>

              {/* Simulation de lignes de produits */}
              <div className="space-y-3 py-2">
                <div className="flex justify-between items-center">
                   <div className="h-2 bg-slate-100 rounded-full w-24"></div>
                   <div className="h-2 bg-slate-200 rounded-full w-12"></div>
                </div>
                <div className="flex justify-between items-center">
                   <div className="h-2 bg-slate-100 rounded-full w-32"></div>
                   <div className="h-2 bg-slate-200 rounded-full w-12"></div>
                </div>
                <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                   <div className="h-3 bg-indigo-50 rounded-full w-16"></div>
                   <div className="h-3 bg-indigo-600 rounded-full w-20"></div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-tighter">
                  Paiement sécurisé
                </div>
              </div>
            </div>

            {/* Pastille flottante "Total" */}
            <div className="absolute bottom-6 right-4 bg-emerald-500 text-white p-4 rounded-2xl shadow-xl flex flex-col items-center gap-1 animate-pulse">
               <span className="text-[10px] uppercase font-bold opacity-80">Montant Total</span>
               <div className="text-xl font-black">2.500 €</div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}