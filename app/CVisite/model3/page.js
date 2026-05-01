'use client'

import { useState, useRef } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function AcademicCardGenerator() {
  const allowed = usePlanGuard('free')
  const { credits } = useCredits()
  const router = useRouter()

  const [cardData, setCardData] = useState({
      fullName: "Marc DUBOIS",
      title: "Directeur de l'Innovation",
      specialty: "Intelligence Artificielle",
      department: "Pôle Recherche & Développement",
      faculty: "Solutions Numériques Avancées", // Correspond à la branche d'activité
      university: "NovaTech Solutions France", // Le nom de l'entreprise
      address: "75008 Paris, France",
      phone: "+33 1 42 68 10 00",
      email: "m.dubois@novatech-solutions.fr",
      logo: null,
    })


  const [primaryColor, setPrimaryColor] = useState('#002d62')
  const iframeRef = useRef(null)

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setCardData({ ...cardData, logo: ev.target.result })
      reader.readAsDataURL(file)
    }
  }

  const renderHTML = () => `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            :root { --main-color: ${primaryColor}; }
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Open Sans', sans-serif; }
            body { background: #f0f0f0; display: flex; flex-direction: column; align-items: center; padding: 10px; }
            
            .card { 
                width: 650px; height: 380px; 
                background: white; 
                position: relative; 
                overflow: hidden; 
                box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                padding: 20px 50px;
            }

            .side-accent {
                position: absolute;
                left: 0;
                top: 34%;
                width: 35px;
                height: 45%;
                background: var(--main-color);
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 5px;
            }

            .identity h1 {
                color: var(--main-color);
                font-size: 32px;
                font-weight: 800;
                letter-spacing: -0.5px;
                line-height: 1.1;
            }

            .identity p { color: #333; font-size: 16px; font-weight: 600; }

            .logo-box {
                width: 140px;
                text-align: center;
                margin-top: -15px;
            }

            .logo-clickable {
                cursor: pointer;
                display: inline-block;
                transition: opacity 0.2s;
            }
            .logo-clickable:hover { opacity: 0.8; }

            .logo-box img {
                width: 85px;
                height: auto;
                margin-bottom: 2px;
            }

            .uni-name {
                font-size: 11px;
                font-weight: 700;
                color: #222;
                line-height: 1.1;
                margin-top: 5px;
                padding: 2px;
                cursor: text;
            }

            .content {
                margin-left: 15px;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .specialty {
                font-size: 21px;
                color: #1a1a1a;
                font-weight: 600;
                margin-bottom: 5px;
            }

            .info-line { font-size: 18px; color: #222; line-height: 1.2; }
            .contact-block { margin-top: 8px; font-size: 18px; }
            .contact-item { display: flex; gap: 8px; margin-bottom: 1px; }
            .label { font-weight: 700; }

            [contenteditable="true"]:focus { background: #f9f9f9; outline: 1px solid var(--main-color); }
            
            @media print {
                body { background: white !important; padding: 0; }
                .card { 
                    box-shadow: none !important; 
                    border: 1px solid #eee; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                }
                .side-accent {
                    background-color: var(--main-color) !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                header, button, .w-full.lg-w-80 { display: none !important; }
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="side-accent"></div>
            
            <div class="header">
                <div class="identity">
                    <h1 contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'fullName', v:this.innerText}, '*')">${cardData.fullName}</h1>
                    <p contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'title', v:this.innerText}, '*')">${cardData.title}</p>
                </div>
                
                <div class="logo-box">
                    <div class="logo-clickable" onclick="window.parent.document.getElementById('logoInput').click()">
                        ${cardData.logo ? `<img src="${cardData.logo}">` : `<div style="border:1px dashed #ccc; padding:5px; font-size:9px; border-radius:50%; width:50px; height:50px; margin: 0 auto; display:flex; align-items:center; justify-content:center;">LOGO</div>`}
                    </div>

                    <div class="uni-name" 
                         contenteditable="true" 
                         spellcheck="false" 
                         onclick="event.stopPropagation()"
                         onblur="window.parent.postMessage({n:'university', v:this.innerText}, '*')">
                         ${cardData.university}
                    </div>
                </div>
            </div>

            <div class="content">
                <div class="specialty" contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'specialty', v:this.innerText}, '*')">${cardData.specialty}</div>
                <div class="info-line" contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'department', v:this.innerText}, '*')">${cardData.department}</div>
                <div class="info-line" contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'faculty', v:this.innerText}, '*')">${cardData.faculty}</div>
                <div class="info-line" contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'address', v:this.innerText}, '*')">${cardData.address}</div>
                
                <div class="contact-block">
                    <div class="contact-item">
                        <span class="label">Tel:</span>
                        <span contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'phone', v:this.innerText}, '*')">${cardData.phone}</span>
                    </div>
                    <div class="contact-item">
                        <span class="label">E-mail :</span>
                        <span contenteditable="true" spellcheck="false" onblur="window.parent.postMessage({n:'email', v:this.innerText}, '*')">${cardData.email}</span>
                    </div>
                </div>
            </div>
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
    <main className="min-h-screen bg-slate-50 p-4 flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-80 bg-white p-6 rounded-2xl shadow-xl border border-slate-200 space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-bold text-slate-800">Modèle Académique</h2>
          {/* Credits badge */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
            <Zap size={12} className="text-indigo-600" fill="currentColor"/>
            <span className="text-xs font-black text-indigo-700">{credits}</span>
          </div>
        </div>
        <div className="space-y-4">
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
          <button onClick={() => document.getElementById('logoInput').click()} className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition">🏛️ Changer Logo</button>
          <input id="logoInput" type="file" hidden onChange={handleLogoUpload} />
          <button onClick={() => iframeRef.current.contentWindow.print()} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">🖨️ Imprimer la carte</button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200 rounded-2xl p-6 flex items-center justify-center">
        <iframe ref={iframeRef} srcDoc={renderHTML()} className="w-full h-[450px] border-none rounded-lg"
          onLoad={() => {
            window.addEventListener('message', (e) => {
              if (e.data.n) setCardData(prev => ({ ...prev, [e.data.n]: e.data.v }))
            })
          }}
        />
      </div>
    </main>
  )
}