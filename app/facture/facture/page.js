'use client';
import React, { useState, useEffect, useRef } from 'react';
import { usePlanGuard } from '@/hooks/usePlanGuard';
import { useCredits } from '@/hooks/useCredits';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

export default function FactureModerne() {
  const allowed = usePlanGuard('starter')
  const { credits } = useCredits()
  const router = useRouter()

  const [items, setItems] = useState([
    { id: 1, desc: 'Création de site vitrine responsive', qty: 1, price: 1200 },
    { id: 2, desc: 'Hébergement Annuel (Serveur Cloud)', qty: 1, price: 150 },
  ]);

  const colors = [
    { name: 'Bleu Pro', hex: '#006684' },
    { name: 'Émeraude', hex: '#059669' },
    { name: 'Indigo', hex: '#4f46e5' },
    { name: 'Noir Chic', hex: '#1e293b' },
    { name: 'Bordeaux', hex: '#991b1b' },
  ];
  const [primaryColor, setPrimaryColor] = useState(colors[0].hex);
  const [logo, setLogo] = useState("https://via.placeholder.com/150x50?text=VOTRE+LOGO");
  const fileInputRef = useRef(null);
  const [tvaRate, setTvaRate] = useState(20);
  const [subTotal, setSubTotal] = useState(0);
  const [tvaAmount, setTvaAmount] = useState(0);
  const [total, setTotal] = useState(0);

  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const st = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const ta = (st * tvaRate) / 100;
    setSubTotal(st);
    setTvaAmount(ta);
    setTotal(st + ta);
  }, [items, tvaRate]);

  const addItem = () => setItems([...items, { id: Date.now(), desc: 'Nouvelle prestation', qty: 1, price: 0 }]);
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

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
    <div className="min-h-screen bg-[#e0e0e0] py-10 px-4 font-sans text-[#333]">

      {/* Barre d'outils */}
      <div className="max-w-[850px] mx-auto mb-6 flex flex-wrap gap-4 justify-between items-center no-print">
        <div className="flex gap-4">
          <button
            onClick={() => window.print()}
            className="bg-white text-slate-800 px-6 py-2 rounded-lg font-bold shadow-md hover:bg-gray-50 transition-all border border-gray-200">
            Exporter PDF 🖨️
          </button>
          <button
            onClick={addItem}
            className="bg-white text-emerald-600 px-6 py-2 rounded-lg font-bold shadow-md hover:bg-gray-50 transition-all border border-gray-200">
            + Ligne
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Credits badge */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
            <Zap size={12} className="text-indigo-600" fill="currentColor"/>
            <span className="text-xs font-bold text-indigo-700">{credits} crédits</span>
          </div>

          {/* Palette de couleurs */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
            <span className="text-[10px] font-black uppercase text-gray-400 ml-2">Thème :</span>
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => setPrimaryColor(c.hex)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  primaryColor === c.hex ? 'border-white ring-2 ring-gray-400' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white max-w-[850px] mx-auto shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-lg overflow-hidden border border-gray-200 invoice-card">

        {/* En-tête */}
        <div className="p-10 flex justify-between items-center transition-colors duration-500"
          style={{ backgroundColor: primaryColor, color: '#fff' }}>
          <div onClick={() => fileInputRef.current.click()}
            className="bg-white p-2 rounded cursor-pointer relative group no-print-logo-border">
            <img src={logo} alt="Logo" className="max-h-12 object-contain" />
            <input type="file" ref={fileInputRef} onChange={handleLogoChange} className="hidden" accept="image/*" />
          </div>
          <div className="text-right">
            <h1 className="m-0 text-4xl font-black tracking-widest uppercase">FACTURE</h1>
            <p className="opacity-80 outline-none" contentEditable suppressContentEditableWarning>
              N° INV-2026-001
            </p>
          </div>
        </div>

        {/* Détails Client */}
        <div className="flex justify-between p-10">
          <div className="space-y-1">
            <h3 className="border-b-2 border-[#f4f7f8] pb-1 mb-2 font-bold uppercase text-sm" style={{ color: primaryColor }}>
              Facturé à :
            </h3>
            <div className="font-bold outline-none" contentEditable suppressContentEditableWarning>Moustapha DIOP</div>
            <div className="text-gray-500 text-sm outline-none" contentEditable suppressContentEditableWarning>Dakar, Sénégal</div>
          </div>
          <div className="text-right space-y-1">
            <h3 className="border-b-2 border-[#f4f7f8] pb-1 mb-2 font-bold uppercase text-sm" style={{ color: primaryColor }}>
              Détails :
            </h3>
            <div className="text-gray-500 text-sm">
              Date : <span contentEditable suppressContentEditableWarning>30 Mars 2026</span>
            </div>
            <div className="text-gray-500 text-sm">
              Paiement : <span contentEditable suppressContentEditableWarning>Virement</span>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f4f7f8] text-left text-xs uppercase">
              <th className="p-4" style={{ color: primaryColor }}>Désignation</th>
              <th className="p-4 w-24 text-center" style={{ color: primaryColor }}>Qté</th>
              <th className="p-4 w-32 text-right" style={{ color: primaryColor }}>Prix Unit.</th>
              <th className="p-4 w-32 text-right" style={{ color: primaryColor }}>Total</th>
              <th className="p-4 w-10 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                <td className="p-4 outline-none text-sm" contentEditable suppressContentEditableWarning
                  onBlur={(e) => updateItem(item.id, 'desc', e.target.innerText)}>
                  {item.desc}
                </td>
                <td className="p-4 text-center">
                  <input type="number" className="w-16 text-center bg-transparent outline-none" value={item.qty}
                    onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)} />
                </td>
                <td className="p-4 text-right">
                  <input type="number" className="w-24 text-right bg-transparent outline-none" value={item.price}
                    onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} />
                </td>
                <td className="p-4 text-right font-medium">{(item.qty * item.price).toLocaleString()} CFA</td>
                <td className="p-4 no-print text-center">
                  <button onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-600 font-bold">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="p-10 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Sous-total :</span><span>{subTotal.toLocaleString()} CFA</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm items-center">
              <span>TVA (<span contentEditable suppressContentEditableWarning
                onBlur={(e) => setTvaRate(parseInt(e.target.innerText) || 0)}>{tvaRate}</span>%) :</span>
              <span>{tvaAmount.toLocaleString()} CFA</span>
            </div>
            <div className="flex justify-between text-white p-4 rounded mt-4 font-bold text-lg transition-colors duration-500"
              style={{ backgroundColor: primaryColor }}>
              <span>TOTAL :</span><span>{total.toLocaleString()} CFA</span>
            </div>
          </div>
        </div>

        <div className="bg-[#f4f7f8] p-6 text-center text-[10px] text-gray-400">
          <p contentEditable suppressContentEditableWarning>
            Merci de votre confiance ! Votre Entreprise SAS | SIRET: 123 456 789 | www.votre-site.com
          </p>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .invoice-card { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print-logo-border { ring: none !important; border: none !important; padding: 0 !important; background: transparent !important; }
        }
      `}</style>
    </div>
  );
}