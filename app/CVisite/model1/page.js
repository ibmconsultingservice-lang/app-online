'use client'

import { useState, useRef, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function BusinessCardGenerator() {
  const allowed = usePlanGuard('free')
  const { credits } = useCredits()
  const router = useRouter()

  const [cardData, setCardData] = useState({
    companyName: 'MY COMPANY',
    slogan: 'Your Tag Slogan Here',
    website: 'www.yourwebsite.com',
    fullName: 'NAME SURNAME',
    jobPosition: 'JOB POSITION',
    phone: '+(123) 456 7890',
    email: 'yourname@email.com',
    address: 'Country, City, Area',
    street: 'Street, Building, Zip code',
    logo: null
  })

  const [primaryColor, setPrimaryColor] = useState('#00aeef')
  const iframeRef = useRef(null)

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_STYLE',
        color: primaryColor,
        logo: cardData.logo
      }, '*')
    }
  }, [primaryColor, cardData.logo])

  const handleInputChange = (e) => {
    setCardData({ ...cardData, [e.target.name]: e.target.value })
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setCardData({ ...cardData, logo: event.target.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const renderCardHTML = () => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      <style>
        :root { --primary: ${primaryColor}; --navy: #1d2631; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
        
        body { 
          background: #f0f2f5; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          gap: 40px; 
          padding: 40px; 
        }
        
        /* Card Base */
        .card { 
          width: 550px; 
          height: 310px; 
          background: white; 
          position: relative; 
          overflow: hidden; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
          border-radius: 4px; 
          flex-shrink: 0;
          /* Default border for cutting reference */
          border: 1px solid transparent; 
        }

        /* Edit Mode Styles */
        [contenteditable="true"] { outline: none; border-radius: 2px; }
        [contenteditable="true"]:hover { background: rgba(0,0,0,0.05); }
        
        /* Layout Components */
        .front .content { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding-right: 120px; }
        .logo-box { width: 60px; height: 60px; background: var(--primary); clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); margin-bottom: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; }
        .logo-box img { width: 100%; height: 100%; object-fit: cover; }
        .logo-box i { color: white; font-size: 24px; }
        .company-name { font-weight: 700; font-size: 22px; color: var(--navy); text-transform: uppercase; }
        .slogan { font-size: 10px; color: #58595b; text-transform: uppercase; letter-spacing: 1px; }
        .website-footer { position: absolute; bottom: 40px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #58595b; }
        
        /* Shapes */
        .front::after { content: ''; position: absolute; right: 0; top: 0; height: 100%; width: 200px; background: var(--primary); clip-path: polygon(100% 0, 100% 100%, 40% 100%, 0 0); z-index: 1; }
        .front::before { content: ''; position: absolute; right: 0; top: 0; height: 100%; width: 240px; background: var(--navy); clip-path: polygon(100% 0, 100% 100%, 75% 100%, 25% 0); z-index: 2; }
        
        .back { display: flex; }
        .back-left { width: 60%; padding: 40px; display: flex; flex-direction: column; justify-content: center; position: relative; }
        .user-info h2 { color: var(--primary); font-size: 24px; text-transform: uppercase; }
        .user-info p { color: var(--navy); font-weight: 600; font-size: 14px; }
        .blue-line { width: 50px; height: 4px; background: var(--primary); margin: 10px 0 20px; }
        .contact-row { display: flex; align-items: center; gap: 15px; margin-bottom: 12px; font-size: 12px; color: var(--navy); }
        .icon-circle { width: 26px; height: 26px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; flex-shrink: 0; }
        .address-bar { position: absolute; bottom: 30px; left: 0; width: 85%; background: #e1f5fe; padding: 8px 35px; display: flex; align-items: center; gap: 12px; font-size: 10px; clip-path: polygon(0 0, 95% 0, 100% 100%, 0 100%); }
        .back-right { width: 40%; background: var(--navy); position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; clip-path: polygon(25% 0, 100% 0, 100% 100%, 0 100%); z-index: 5; }
        .back-right .logo-box { background: white; }
        .back-right .logo-box i { color: var(--navy); }
        .back-right .company-name { color: white; font-size: 14px; }
        .back-accent { position: absolute; left: -40px; top: 0; height: 100%; width: 100px; background: var(--primary); clip-path: polygon(40% 0, 100% 0, 60% 100%, 0 100%); z-index: -1; }

        @media print {
          @page { margin: 10mm; size: auto; }
          body { 
            background: white !important; 
            padding: 0;
            display: block; /* Stack cards for easier cutting */
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .card { 
            box-shadow: none !important; 
            page-break-inside: avoid;
            margin: 0 auto 30px auto !important;
            /* This adds the cutting line */
            border: 1px dashed #e0e0e0 !important; 
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .logo-box, .blue-line, .icon-circle, .back-accent, .front::after { 
            background-color: ${primaryColor} !important; 
          }
          .back-right, .front::before { 
            background-color: #1d2631 !important; 
          }
          .address-bar { background-color: #e1f5fe !important; }
        }
      </style>
    </head>
    <body>
      <div class="card front">
        <div class="content">
          <div class="logo-box" onclick="window.parent.document.getElementById('logoInput').click()">
            ${cardData.logo ? `<img src="${cardData.logo}">` : `<i class="fas fa-cube"></i>`}
          </div>
          <h1 class="company-name" contenteditable="true" onblur="window.parent.postMessage({type:'SYNC', name:'companyName', value:this.innerText}, '*')">${cardData.companyName}</h1>
          <span class="slogan" contenteditable="true" onblur="window.parent.postMessage({type:'SYNC', name:'slogan', value:this.innerText}, '*')">${cardData.slogan}</span>
          <div class="website-footer">
            <i class="fas fa-globe" style="color: var(--primary);"></i>
            <span contenteditable="true" onblur="window.parent.postMessage({type:'SYNC', name:'website', value:this.innerText}, '*')">${cardData.website}</span>
          </div>
        </div>
      </div>

      <div class="card back">
        <div class="back-left">
          <div class="user-info">
            <h2 contenteditable="true" onblur="window.parent.postMessage({type:'SYNC', name:'fullName', value:this.innerText}, '*')">${cardData.fullName}</h2>
            <p contenteditable="true" onblur="window.parent.postMessage({type:'SYNC', name:'jobPosition', value:this.innerText}, '*')">${cardData.jobPosition}</p>
            <div class="blue-line"></div>
          </div>
          <div class="contact-row">
            <div class="icon-circle"><i class="fas fa-phone-alt"></i></div>
            <div contenteditable="true">${cardData.phone}</div>
          </div>
          <div class="contact-row">
            <div class="icon-circle"><i class="fas fa-envelope"></i></div>
            <div contenteditable="true">${cardData.email}</div>
          </div>
          <div class="address-bar">
            <div class="icon-circle" style="background: var(--navy);"><i class="fas fa-map-marker-alt"></i></div>
            <div>
              <strong contenteditable="true">${cardData.address}</strong><br>
              <span contenteditable="true">${cardData.street}</span>
            </div>
          </div>
        </div>
        <div class="back-right">
          <div class="back-accent"></div>
          <div class="logo-box">
            ${cardData.logo ? `<img src="${cardData.logo}">` : `<i class="fas fa-cube"></i>`}
          </div>
          <h1 class="company-name">${cardData.companyName}</h1>
        </div>
      </div>

      <script>
        window.addEventListener('message', function(e) {
          if(e.data.type === 'UPDATE_STYLE') {
            document.documentElement.style.setProperty('--primary', e.data.color);
          }
        });
      </script>
    </body>
    </html>`
  };


  // ── Loading screen ──
  if (!allowed) return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f1f5f9] p-8 flex flex-col md:flex-row gap-8">

      {/* Panneau de Contrôle */}
      <div className="w-full md:w-1/3 bg-white p-6 rounded-2xl shadow-xl space-y-4 h-fit">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-bold text-slate-800">Personnalisation</h2>
          {/* Credits badge */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
            <Zap size={12} className="text-indigo-600" fill="currentColor"/>
            <span className="text-xs font-black text-indigo-700">{credits}</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold">Couleur Principale</label>
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />

          <label className="block text-sm font-semibold pt-2">Logo de l'entreprise</label>
          <input id="logoInput" type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4">
          <input name="companyName" value={cardData.companyName} onChange={handleInputChange} placeholder="Nom Entreprise" className={inputClass} />
          <input name="fullName" value={cardData.fullName} onChange={handleInputChange} placeholder="Nom Prénom" className={inputClass} />
          <input name="jobPosition" value={cardData.jobPosition} onChange={handleInputChange} placeholder="Poste" className={inputClass} />
          <input name="phone" value={cardData.phone} onChange={handleInputChange} placeholder="Téléphone" className={inputClass} />
          <input name="email" value={cardData.email} onChange={handleInputChange} placeholder="Email" className={inputClass} />
          <input name="website" value={cardData.website} onChange={handleInputChange} placeholder="Site Web" className={inputClass} />
        </div>

        <button
          onClick={() => {
            const frame = iframeRef.current;
            frame.contentWindow.focus();
            frame.contentWindow.print();
          }}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-all mt-6 shadow-lg"
        >
          📥 Télécharger / Imprimer (PDF)
        </button>
      </div>

      {/* Zone de Visualisation */}
      <div className="flex-1 bg-slate-200 rounded-2xl p-4 flex items-center justify-center overflow-hidden min-h-[700px]">
        <iframe
          ref={iframeRef}
          srcDoc={renderCardHTML()}
          className="w-full h-full border-none"
          title="Business Card Preview"
        />
      </div>
    </main>
  )
}

const inputClass = "w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"