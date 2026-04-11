'use client'

import React, { useState, useRef, useEffect } from 'react';

export default function RemoveBGHome() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [bgColor, setBgColor] = useState('transparent');
  const [isRetouching, setIsRetouching] = useState(false);
  const [brushSize, setBrushSize] = useState(30);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const colors = [
    { name: 'Transp.', value: 'transparent', class: 'bg-slate-200' },
    { name: 'Blanc', value: '#ffffff', class: 'bg-white' },
    { name: 'Noir', value: '#000000', class: 'bg-black' },
    { name: 'Bleu', value: '#3b82f6', class: 'bg-blue-500' },
  ];

  // --- LOGIQUE DE RETOUCHE (CANVAS) ---

  const draw = (e) => {
    if (!isDrawing.current || !isRetouching) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Calcul précis de la position de la souris sur le canvas HD
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'destination-out'; // Mode gomme (effacer le masque IA)

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    // Mise à jour de l'image de résultat pour le téléchargement
    setResultImage(canvas.toDataURL());
  };

  // Fonction de fusion Image + Fond pour le téléchargement final
  const downloadFinalImage = () => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = resultImage; // L'image détourée (potentiellement retouchée)
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      const link = document.createElement('a');
      link.download = bgColor === 'transparent' ? 'détourage_ia_pro.png' : 'photo_profil_couleur.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedImage(URL.createObjectURL(file));
    setResultImage(null);
    setBgColor('transparent');
    setIsRetouching(false);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/generer-removebg', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Erreur serveur IA");
      const blob = await res.blob();
      const resultUrl = URL.createObjectURL(blob);
      setResultImage(resultUrl); 
      
      // Initialiser le canvas HD avec le résultat du détourage
      const img = new Image();
      img.src = resultUrl;
      img.onload = () => {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
      };
    } catch (err) {
      console.error(err);
      alert("Impossible de traiter l'image. Vérifiez le serveur Python.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] bg-gradient-to-br from-[#f0fdf4] via-[#f1f5f9] to-[#eff6ff] flex items-center justify-center px-6 relative overflow-hidden font-sans">
      
      {/* Bouton de fermeture / Retour (Restauré) */}
      <a href="/" className="absolute top-6 right-8 text-gray-400 hover:text-emerald-600 transition duration-300">
        <span className="text-2xl">✕</span>
      </a>

      <div className="max-w-7xl w-full flex flex-col md:flex-row items-center justify-between gap-12 py-12">
        
        {/* Section Texte (RESTAURÉE AVEC TEXTES ORIGINAUX) */}
        <div className="flex-1 space-y-8 z-10 text-center md:text-left">
          <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest mb-2 shadow-sm">
              AI Image Processor Pro
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.05]">
            Supprimez le fond <br />
            <span className="text-emerald-600">par magie.</span>
          </h1>
          
          <p className="text-lg text-slate-600 leading-relaxed max-w-md mx-auto md:mx-0">
            Téléchargez une photo et laissez notre IA détourer votre sujet instantanément. Idéal pour vos logos, catalogues et photos de profil.
          </p>

          <div className="flex flex-col gap-6 pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Zone d'Upload (Design Restauré) */}
              <label className="flex-1 cursor-pointer group">
                <div className="bg-white border-2 border-dashed border-slate-200 group-hover:border-emerald-500 p-8 rounded-3xl shadow-xl transition-all flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    📸
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-800">Sélectionner une image</p>
                    <p className="text-xs text-slate-500 mt-1">JPG, PNG ou WebP</p>
                  </div>
                  <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                </div>
              </label>

              {/* Petit aperçu rapide de l'original (Restauré) */}
              {selectedImage && (
                <div className="hidden lg:flex w-48 bg-white p-3 rounded-3xl shadow-lg border border-slate-100 flex-col gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Original</p>
                  <img src={selectedImage} alt="Preview" className="w-full h-32 object-cover rounded-2xl" />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-6 justify-center md:justify-start">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm text-slate-500 font-medium tracking-tight">IA locale (ISNet Pro) connectée</span>
          </div>
        </div>

        {/* Section Visuelle - Preview Dynamique (DESIGN RESTAURÉ AVEC OUTILS DE RETOUCHE) */}
        <div className="flex-1 relative flex flex-col items-center justify-center w-full lg:max-w-md gap-6">
          <div className="absolute inset-0 bg-emerald-400/20 blur-[120px] rounded-full"></div>
          
          <div className="relative w-full aspect-square bg-slate-900 rounded-[3rem] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center overflow-hidden border border-white/10 relative">
            
            {/* 1. Damier de transparence */}
            {bgColor === 'transparent' && (
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'conic-gradient(#fff 0.25turn, #000 0.25turn 0.5turn, #fff 0.5turn 0.75turn, #000 0.75turn)', backgroundSize: '20px 20px' }}></div>
            )}

            {/* 2. Fond de couleur sélectionné */}
            <div 
              className="absolute inset-0 transition-colors duration-500 z-0" 
              style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
            ></div>

            {isProcessing ? (
              <div className="z-10 flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-emerald-400 font-mono text-sm tracking-widest animate-pulse uppercase">Traitement IA Pro...</p>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {resultImage ? (
                  /* LE CANVAS DE RETOUCHE (Z-INDEX ÉLEVÉ) */
                  <canvas
                    ref={canvasRef}
                    onMouseDown={(e) => { isDrawing.current = true; draw(e); }}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className={`max-w-full max-h-full object-contain z-10 transition-shadow ${isRetouching ? 'cursor-crosshair shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'pointer-events-none'}`}
                  />
                ) : (
                  <div className="w-64 h-64 bg-white/5 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 relative overflow-hidden z-10">
                    <span className="text-8xl grayscale opacity-30 grayscale">👤</span>
                  </div>
                )}
                
                {/* Badge HD QUALITY (Restauré) */}
                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-lg transform rotate-12 z-20">
                  HD QUALITY
                </div>
              </div>
            )}
          </div>

          {/* PALETTE DE COULEURS ET OUTILS DE RETOUCHE */}
          {resultImage && !isProcessing && (
            <div className="z-20 w-full flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-xl">
              
              {/* Couleurs */}
              <div className="flex gap-2.5">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setBgColor(c.value); setIsRetouching(false); }}
                    className={`w-9 h-9 rounded-full border-2 transition ${c.class} ${bgColor === c.value && !isRetouching ? 'border-emerald-500 scale-105 shadow-md' : 'border-slate-100'}`}
                  />
                ))}
              </div>

              {/* Bouton Gomme Manuelle */}
              <button 
                onClick={() => setIsRetouching(!isRetouching)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition text-sm ${isRetouching ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {isRetouching ? '✅ Terminer' : '🧹 Gommer les détails'}
              </button>
            </div>
          )}

          {/* Bouton de téléchargement (Restauré & Amélioré) */}
          {resultImage && !isProcessing && (
            <button 
              onClick={downloadFinalImage}
              className="z-20 w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg hover:-translate-y-1 active:scale-95"
            >
              <span className="text-xl">💾</span> Télécharger le résultat (.png)
            </button>
          )}
        </div>

      </div>

    </main>
  );
}