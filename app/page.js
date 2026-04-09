'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  FileText, Briefcase, Mail, BarChart, Settings, 
  Layers, Zap, ImageIcon, Mic, Search, ShieldCheck, 
  FileUp, CreditCard, PenTool, Layout, RefreshCw, ArrowUpRight, 
  ChevronDown, Shield, Star, Users, Rocket, Cpu, LogOut
} from 'lucide-react';

const services = [
  { id: 'business-ia', cat: 'Business', name: 'Business IA', desc: 'Expertise stratégique et négociation par intelligence artificielle.', icon: Zap, path: '/business-ia', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop' },
  { id: 'Businessplan', cat: 'Business', name: 'Business Plan', desc: 'Génération de structures de projet et projections financières.', icon: Briefcase, path: '/Businessplan', img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop' },
  { id: 'Marketingplan', cat: 'Business', name: 'Marketing Plan', desc: 'Stratégies de croissance et analyse de marché automatisées.', icon: BarChart, path: '/Marketingplan', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop' },
  { id: 'ProjectDeepWork', cat: 'Business', name: 'Deep Work', desc: 'Optimisation de la concentration et gestion de projets complexes.', icon: Layout, path: '/ProjectDeepWork', img: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=800&auto=format&fit=crop' },
  { id: 'Curriculum', cat: 'Documents', name: 'CV Builder', desc: 'Créez des Curriculum Vitae haute performance en quelques clics.', icon: FileText, path: '/Curriculum', img: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=800&auto=format&fit=crop' },
  { id: 'CVisite', cat: 'Documents', name: 'Carte de Visite', desc: 'Design et génération de cartes professionnelles modernes.', icon: CreditCard, path: '/CVisite', img: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=800&auto=format&fit=crop' },
  { id: 'email-manager', cat: 'Documents', name: 'Email Manager', desc: 'Gestion et rédaction intelligente de vos correspondances pro.', icon: Mail, path: '/email-manager', img: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?q=80&w=800&auto=format&fit=crop' },
  { id: 'docanalyser', cat: 'Analyse', name: 'Doc Analyser', desc: 'Analyse critique et extraction de données.', icon: ShieldCheck, path: '/docanalyser', img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format&fit=crop' },
  { id: 'docrepairer', cat: 'Analyse', name: 'Doc Repairer', desc: 'Correction et restauration de documents.', icon: Settings, path: '/docrepairer', img: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800&auto=format&fit=crop' },
  { id: 'pdfconvert', cat: 'Outils', name: 'PDF Convert', desc: 'Convertisseur universel haute fidélité.', icon: RefreshCw, path: '/pdfconvert', img: 'https://images.unsplash.com/photo-1568667256549-094345857637?q=80&w=800&auto=format&fit=crop' },
  { id: 'pdfmerger', cat: 'Outils', name: 'PDF Merger', desc: 'Fusionnez et organisez vos fichiers PDF.', icon: Layers, path: '/pdfmerger', img: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=800&auto=format&fit=crop' },
  { id: 'office2pdf', cat: 'Outils', name: 'Office to PDF', desc: 'Conversion instantanée Word/Excel/PPT.', icon: FileUp, path: '/office2pdf', img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop' },
  { id: 'pptxgenius', cat: 'Outils', name: 'PPTX Genius', desc: 'Optimisation de vos présentations.', icon: PenTool, path: '/pptxgenius', img: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop' },
  { id: 'ocr-vision', cat: 'Média', name: 'OCR Vision', desc: 'Extraction de texte depuis image.', icon: Search, path: '/ocr-vision', img: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?q=80&w=800&auto=format&fit=crop' },
  { id: 'AudioTrans', cat: 'Média', name: 'Audio Trans', desc: 'Transcription audio haute précision.', icon: Mic, path: '/AudioTrans', img: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800&auto=format&fit=crop' },
  { id: 'Removebg', cat: 'Média', name: 'Remove BG', desc: 'Détourage instantané de visuels.', icon: ImageIcon, path: '/Removebg', img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800&auto=format&fit=crop' },
];

// ✅ Guard : redirige vers /login si non connecté
function ToolLink({ item }) {
  const { user } = useAuth();
  const router = useRouter();

  const handleClick = (e) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
    } else {
      router.push(item.path);
    }
  };

  return (
    <div
      onClick={handleClick}
      key={item.id}
      className="group relative h-[400px] overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 cursor-pointer"
    >
      <img src={item.img} alt={item.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out" />
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
      
      {/* Badge "Connexion requise" si non connecté */}
      {!user && (
        <div className="absolute top-3 right-3 bg-slate-900/80 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full backdrop-blur-sm">
          🔒 Connexion requise
        </div>
      )}

      <div className="relative h-full p-8 flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center border border-white shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <item.icon size={22} strokeWidth={2} />
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-900/5 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <ArrowUpRight size={16} />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-2">{item.name}</h3>
          <p className="text-slate-600 text-xs font-medium leading-relaxed">{item.desc}</p>
          <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {user ? 'Ouvrir l\'outil' : 'Se connecter'} <span>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const categories = ['Business', 'Documents', 'Analyse', 'Outils', 'Média'];

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-indigo-100 overflow-x-hidden font-sans">
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-100/50 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/50 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      </div>

      {/* ✅ Navbar mise à jour */}
      <nav className="relative z-[100] flex justify-between items-center px-6 md:px-12 py-8 max-w-7xl mx-auto border-b border-slate-200/60 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
            <Zap size={20} fill="currentColor" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">IA<span className="text-indigo-600">.BUSINESS</span></span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 items-center">
            
            {/* Menu Fonctionnalités */}
            <div className="relative group/menu">
              <button 
                onMouseEnter={() => setIsMenuOpen(true)} 
                className="flex items-center gap-1 hover:text-indigo-600 transition-colors py-2"
              >
                Fonctionnalités <ChevronDown size={12} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <div 
                onMouseLeave={() => setIsMenuOpen(false)} 
                className={`absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 grid grid-cols-3 gap-8 transition-all duration-300 ${isMenuOpen ? 'opacity-100 translate-y-2 visible' : 'opacity-0 translate-y-4 invisible'}`}
              >
                {categories.slice(0, 3).map(cat => (
                  <div key={cat}>
                    <h4 className="text-indigo-600 mb-4 border-b border-slate-100 pb-2">{cat}</h4>
                    <div className="flex flex-col gap-3">
                      {services.filter(s => s.cat === cat).map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setIsMenuOpen(false);
                            if (!user) router.push('/login');
                            else router.push(item.path);
                          }}
                          className="normal-case tracking-normal text-slate-600 hover:text-indigo-600 text-sm font-medium flex items-center gap-2 text-left"
                        >
                          <item.icon size={14} /> {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ Tarifs lié */}
            <Link href="/pricing" className="hover:text-indigo-600 transition-colors">
              Tarifs
            </Link>

          </div>

          {/* ✅ Bouton Connexion / Profil */}
          {user ? (
            /* Utilisateur connecté */
            <div className="flex items-center gap-3">
              {/* Crédits */}
              <div className="hidden md:flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
                <span className="text-indigo-600 text-xs">⚡</span>
                <span className="text-xs font-bold text-indigo-700">{profile?.credits ?? 0} crédits</span>
              </div>

              {/* Dashboard */}
              <Link
                href="/dashboard"
                className="h-10 px-5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
              >
                Dashboard
              </Link>

              {/* Déconnexion */}
              <button
                onClick={handleLogout}
                className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all"
                title="Se déconnecter"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            /* Utilisateur non connecté */
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="h-10 px-5 border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hidden md:flex items-center"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="h-10 px-6 bg-slate-900 text-white hover:bg-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center"
              >
                Commencer →
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-24 pb-20 text-center md:text-left">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-10 shadow-sm">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Systèmes Connectés v2.0
          </div>
          <h1 className="text-6xl md:text-8xl font-[900] tracking-tight text-slate-900 leading-[0.9] mb-10">
            L'intelligence qui <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">travaille pour vous.</span>
          </h1>
          <p className="max-w-xl text-slate-500 text-lg md:text-xl font-medium leading-relaxed mb-10">
            Simplifiez vos processus métier avec nos outils d'automatisation documentaire propulsés par les derniers modèles d'IA.
          </p>

          {/* ✅ CTA Buttons */}
          {!user && (
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
              >
                Créer un compte gratuit → 
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all"
              >
                Se connecter
              </Link>
            </div>
          )}

          {/* Message si connecté */}
          {user && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
            >
              ⚡ Accéder à mes outils →
            </Link>
          )}
        </div>

        {/* ✅ Grille de Cartes avec protection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24">
          {services.map((item) => (
            <ToolLink key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* SECTION : GARANTIES */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-24 border-t border-slate-200/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Shield size={24} />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest">Sécurité Militaire</h4>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Vos documents sont cryptés de bout en bout. Nous ne conservons aucune donnée après traitement.</p>
          </div>
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users size={24} />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest">+50,000 Utilisateurs</h4>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Rejoignez une communauté de professionnels qui automatisent leurs tâches avec précision.</p>
          </div>
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Star size={24} />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest">Qualité Premium</h4>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Utilisation exclusive des modèles GPT-4o et Claude 3.5 pour des résultats inégalés.</p>
          </div>
        </div>
      </section>

      {/* SECTION : L'ÉQUIPE */}
      <section className="relative z-10 bg-slate-900 text-white py-24 overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-[0.3em] mb-6">
              Lab Innovation
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6">
              Une équipe dédiée à votre <br/>
              <span className="text-indigo-400 italic">succès digital.</span>
            </h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
              Notre équipe d'ingénieurs et d'experts travaille 24/7 pour intégrer chaque mois les derniers outils du marché.
            </p>
            <div className="flex gap-8">
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-black text-white">3+</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nouveaux Outils / Mois</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-black text-white">99.9%</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uptime Garanti</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="aspect-square bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 p-8 flex flex-col justify-between group hover:border-indigo-500/50 transition-colors relative">
              <img src="https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=400&auto=format&fit=crop" alt="Déploiement" className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-luminosity group-hover:scale-110 transition-transform duration-700"/>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <Rocket className="text-indigo-500 group-hover:scale-110 transition-transform" size={32} />
                <span className="text-[10px] font-black uppercase tracking-tighter text-white">Déploiement Continu</span>
              </div>
            </div>
            <div className="aspect-square bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 p-8 flex flex-col justify-between group hover:border-indigo-500/50 transition-colors mt-8 relative">
              <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop" alt="Infrastructure" className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-luminosity group-hover:scale-110 transition-transform duration-700"/>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <Cpu className="text-blue-500 group-hover:scale-110 transition-transform" size={32} />
                <span className="text-[10px] font-black uppercase tracking-tighter text-white">Infrastructure IA Core</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-slate-100 text-center relative z-10">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-4">© 2026 IA Business Ecosystem</p>
          <div className="flex justify-center gap-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-slate-900 transition-colors">Support Technique</a>
            <a href="#" className="hover:text-slate-900 transition-colors">API Open Source</a>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Tarifs</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}