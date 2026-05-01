'use client'

import { useState, useRef, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function IBMCardGenerator() {
  const allowed = usePlanGuard('free')
  const { credits } = useCredits()
  const router = useRouter()

  const [cardData, setCardData] = useState({
    bannerTitle: "ACCÉLÉRER L'INNOVATION\nTRANSFORMER VOS\nAMBITIONS",
    bannerSub: "Sublimez vos talents, propulsez votre croissance",
    fullName: "Marc-Antoine DUVAL",
    position: "Directeur Associé\nConsultant en Stratégie Digitale",
    location: "Paris, France",
    address: "8 Rue de la Paix",
    phone: "+33 1 45 20 80 00",
    email: "ma.duval@lyra-consulting.fr",
    tagline: "Votre partenaire de confiance pour une transformation numérique d'excellence",
    backEmail: "contact@lyra-consulting.fr",
    logo: null,
    bannerImg: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop"
  })


  const [primaryColor, setPrimaryColor] = useState('#0043ce')
  const iframeRef = useRef(null)

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setCardData({ ...cardData, logo: ev.target.result })
      reader.readAsDataURL(file)
    }
  }

  const handleBannerUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setCardData({ ...cardData, bannerImg: ev.target.result })
      reader.readAsDataURL(file)
    }
  }

  const renderHTML = () => `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <style>
              :root { --ibm-blue: ${primaryColor}; }
              * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Montserrat', sans-serif; }
              
              body { 
                  background: #f4f4f4; 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  gap: 30px; 
                  padding: 40px; 
              }
              
              .card { 
                  width: 600px; 
                  height: 350px; 
                  background: #ffffff; 
                  box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
                  position: relative; 
                  overflow: hidden; 
                  border-radius: 4px; 
                  flex-shrink: 0;
                  border: 1px solid transparent; /* Placeholder for print border */
              }
              
              [contenteditable="true"]:hover { background: rgba(0,0,0,0.05); cursor: text; }

              /* Header Banner with forced background properties */
              .header-banner { 
                  height: 40%; 
                  background: linear-gradient(${hexToRgba(primaryColor, 0.85)}, ${hexToRgba(primaryColor, 0.85)}), url('${cardData.bannerImg}');
                  background-size: cover; 
                  background-position: center; 
                  padding: 20px 30px; 
                  color: white; 
                  cursor: pointer;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
              }

              .header-banner h1 { font-size: 18px; font-weight: 700; text-transform: uppercase; white-space: pre-line; line-height: 1.2; color: #ffffff !important; }
              .header-banner p { font-size: 11px; font-weight: 300; margin-top: 5px; color: #ffffff !important; }

              .logo-circle {
                  position: absolute; top: 25%; right: 30px; width: 100px; height: 100px;
                  background: white !important; border-radius: 50%; border: 4px solid var(--ibm-blue);
                  display: flex; align-items: center; justify-content: center; z-index: 10; cursor: pointer; overflow: hidden;
                  -webkit-print-color-adjust: exact !important;
              }
              .logo-circle img { width: 100%; height: 100%; object-fit: contain; padding: 10px; }

              .main-content { display: flex; padding: 25px 30px; justify-content: space-between; }
              .profile-section { width: 45%; text-align: center; }
              .profile-section h2 { font-size: 20px; color: #000; margin-bottom: 5px; }
              
              .divider { 
                  height: 3px; 
                  background-color: var(--ibm-blue) !important; 
                  width: 60%; 
                  margin: 8px auto; 
                  -webkit-print-color-adjust: exact !important;
              }
              
              .position { font-size: 11px; color: #333; line-height: 1.4; white-space: pre-line; }
              
              .contact-info { width: 50%; font-size: 12px; font-weight: 600; padding-top: 5px; }
              .contact-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
              .contact-item i { font-size: 16px; color: var(--ibm-blue) !important; width: 20px; -webkit-print-color-adjust: exact !important; }
              
              /* Corner Accents */
              .corner-accent { 
                  position: absolute; bottom: 0; left: 0; width: 80px; height: 80px; 
                  background-color: ${primaryColor} !important; 
                  clip-path: polygon(0 0, 0 100%, 100% 100%); 
                  -webkit-print-color-adjust: exact !important;
              }

              .card.back { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: white; }
              .tagline { margin-top: 15px; font-size: 14px; color: #333; padding: 0 50px; line-height: 1.5; }
              .bottom-email { position: absolute; bottom: 15px; font-size: 10px; color: #888; }
              
              .corner-accent-back { 
                  position: absolute; bottom: 0; right: 0; width: 120px; height: 120px; 
                  background-color: ${primaryColor} !important; 
                  clip-path: polygon(100% 0, 100% 100%, 0 100%); 
                  -webkit-print-color-adjust: exact !important;
              }
              
              @media print { 
                  @page { margin: 10mm; size: auto; }
                  body { background: white !important; padding: 0; display: block; } 
                  .card { 
                      box-shadow: none !important; 
                      page-break-inside: avoid; 
                      margin: 0 auto 40px auto !important; 
                      border: 1px dashed #cccccc !important; /* Cut line */
                  } 
                  /* Force background image and gradients */
                  .header-banner {
                      background: linear-gradient(${hexToRgba(primaryColor, 0.85)}, ${hexToRgba(primaryColor, 0.85)}), url('${cardData.bannerImg}') !important;
                      background-size: cover !important;
                      -webkit-print-color-adjust: exact !important;
                  }
              }
          </style>
      </head>
      <body>
          <div class="card">
              <div class="header-banner">
                  <h1 contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'bannerTitle', v:this.innerText}, '*')">${cardData.bannerTitle}</h1>
                  <p contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'bannerSub', v:this.innerText}, '*')">${cardData.bannerSub}</p>
              </div>
              <div class="logo-circle" onclick="window.parent.document.getElementById('logoInput').click()">
                  ${cardData.logo ? `<img src="${cardData.logo}">` : `<div style="text-align:center"><b style="color:var(--ibm-blue)">LOGO</b></div>`}
              </div>
              <div class="main-content">
                  <div class="profile-section">
                      <i class="fas fa-user-circle" style="font-size: 30px; color: var(--ibm-blue)"></i>
                      <h2 contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'fullName', v:this.innerText}, '*')">${cardData.fullName}</h2>
                      <div class="divider"></div>
                      <div class="position" contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'position', v:this.innerText}, '*')">${cardData.position}</div>
                      <p style="font-size: 12px; font-weight: 700; margin-top: 10px;" contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'location', v:this.innerText}, '*')">${cardData.location}</p>
                  </div>
                  <div class="contact-info">
                      <div class="contact-item"><i class="fas fa-location-dot"></i><span contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'address', v:this.innerText}, '*')">${cardData.address}</span></div>
                      <div class="contact-item"><i class="fas fa-phone"></i><span contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'phone', v:this.innerText}, '*')">${cardData.phone}</span></div>
                      <div class="contact-item"><i class="fas fa-envelope"></i><span contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'email', v:this.innerText}, '*')">${cardData.email}</span></div>
                  </div>
              </div>
              <div class="corner-accent"></div>
          </div>

          <div class="card back">
              <div class="logo-circle" style="position:static; width:110px; height:110px" onclick="window.parent.document.getElementById('logoInput').click()">
                  ${cardData.logo ? `<img src="${cardData.logo}">` : `<b style="color:var(--ibm-blue)">LOGO</b>`}
              </div>
              <p class="tagline" contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'tagline', v:this.innerText}, '*')">${cardData.tagline}</p>
              <i class="fas fa-handshake" style="color: var(--ibm-blue); font-size: 24px; margin-top: 10px;"></i>
              <div class="bottom-email" contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'backEmail', v:this.innerText}, '*')">${cardData.backEmail}</div>
              <div class="corner-accent-back"></div>
          </div>
      </body>
      </html>
    `

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
    <main className="min-h-screen bg-slate-100 p-6 flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-80 bg-white p-5 rounded-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-slate-800">Paramètres</h3>
          {/* Credits badge */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
            <Zap size={12} className="text-indigo-600" fill="currentColor"/>
            <span className="text-xs font-black text-indigo-700">{credits}</span>
          </div>
        </div>
        
        <div>
          <label className="text-xs font-bold uppercase text-gray-500">Couleur Marque</label>
          <input 
            type="color" 
            value={primaryColor} 
            onChange={(e) => setPrimaryColor(e.target.value)} 
            className="w-full h-10 rounded mt-1 cursor-pointer border-none shadow-sm" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-gray-500">Médias</label>
          <button onClick={() => document.getElementById('logoInput').click()} className="w-full text-sm bg-blue-50 text-blue-600 p-2 rounded border border-blue-100 hover:bg-blue-100 transition flex items-center justify-center gap-2">
              📷 Changer Logo
          </button>
          <button onClick={() => document.getElementById('bannerInput').click()} className="w-full text-sm bg-slate-50 text-slate-600 p-2 rounded border border-slate-200 hover:bg-slate-100 transition flex items-center justify-center gap-2">
              🖼️ Image de fond
          </button>
          <input id="logoInput" type="file" hidden onChange={handleLogoUpload} />
          <input id="bannerInput" type="file" hidden onChange={handleBannerUpload} />
        </div>

        <div className="pt-4 border-t">
            <button onClick={() => iframeRef.current.contentWindow.print()} className="w-full bg-blue-700 text-white p-3 rounded-lg font-bold shadow-md hover:bg-blue-800 transition flex items-center justify-center gap-2">
                🖨️ Imprimer la carte
            </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-300 rounded-xl overflow-hidden shadow-inner min-h-[800px]">
        <iframe
          ref={iframeRef}
          srcDoc={renderHTML()}
          className="w-full h-full border-none"
          onLoad={() => {
            window.addEventListener('message', (e) => {
              if (e.data.n) {
                setCardData(prev => ({ ...prev, [e.data.n]: e.data.v }))
              }
            })
          }}
        />
      </div>
    </main>
  )
}