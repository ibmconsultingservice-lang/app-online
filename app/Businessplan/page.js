'use client'

import { useState } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function BusinessPlanPage() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [sections, setSections] = useState([])
  const [docTitle, setDocTitle] = useState('MON BUSINESS PLAN')

  const handleGenerate = async () => {
    if (!prompt) return alert("Veuillez entrer une description.")

    if (!hasCredits(5)) {
      router.push('/pricing')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/generer-business-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) throw new Error(`Erreur : ${response.status}`)

      const data = await response.json()
      if (data.sections) {
        await deductCredits(5)
        setSections(data.sections)
      }
    } catch (err) {
      alert("Erreur de génération. Vérifie ta console.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addSection = () => {
    setSections([...sections, {
      id: Date.now(),
      title: "Nouvelle Section",
      blocks: [{ id: Date.now() + 1, type: 'text', content: 'Contenu...' }]
    }])
  }

  const deleteSection = (id) => setSections(sections.filter(s => s.id !== id))

  const addBlock = (sectionId, type) => {
    let content = 'Nouveau texte...'
    if (type === 'table') content = { headers: ['Titre 1', 'Titre 2'], rows: [['-', '-']] }
    if (type === 'image') content = null
    const newBlock = { id: Date.now(), type, content }
    setSections(sections.map(s => s.id === sectionId ? { ...s, blocks: [...s.blocks, newBlock] } : s))
  }

  const deleteBlock = (sectionId, blockId) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) } : s))
  }

  const addRow = (sectionId, blockId) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      blocks: s.blocks.map(b => b.id === blockId ? {
        ...b,
        content: { ...b.content, rows: [...b.content.rows, new Array(b.content.headers.length).fill('-')] }
      } : b)
    } : s))
  }

  const addColumn = (sectionId, blockId) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      blocks: s.blocks.map(b => b.id === blockId ? {
        ...b,
        content: {
          headers: [...b.content.headers, 'Nouveau'],
          rows: b.content.rows.map(r => [...r, '-'])
        }
      } : b)
    } : s))
  }

  const handleImageUpload = (e, sectionId, blockId) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSections(sections.map(s => s.id === sectionId ? {
          ...s,
          blocks: s.blocks.map(b => b.id === blockId ? { ...b, content: reader.result } : b)
        } : s))
      }
      reader.readAsDataURL(file)
    }
  }

  const exportToWord = () => {
    const originalElement = document.getElementById('business-plan-document')
    const tempClone = originalElement.cloneNode(true)
    const elementsToRemove = tempClone.querySelectorAll('.no-print')
    elementsToRemove.forEach(el => el.remove())
    const cleanContent = tempClone.innerHTML
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        h1 { color: #2c3e50; text-align: center; border-bottom: 2px solid #e67e22; }
        h2 { color: #e67e22; margin-top: 20px; border-bottom: 1px solid #eee; }
        img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
        .block-wrapper { margin-bottom: 15px; }
      </style></head><body>`
    const footer = "</body></html>"
    const source = header + cleanContent + footer
    const blob = new Blob(['\ufeff', source], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${docTitle.replace(/\s+/g, '_')}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ── Loading screen while plan is verified ──
  if (!allowed) return (
    <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center flex-col gap-4">
      <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
        <Zap size={20} color="white" fill="white"/>
      </div>
      <div className="w-6 h-6 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin"/>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vérification du plan...</p>
    </div>
  )

  return (
    <main style={{ background: '#f4f7f6', minHeight: '100vh', padding: '20px' }}>

      {/* HEADER IA */}
      <div className="no-print" style={{ maxWidth: '1000px', margin: '0 auto 30px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>

        {/* Credits badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '18px', color: '#2c3e50', margin: 0 }}>Générateur IA & Éditeur Premium</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 20, padding: '6px 14px' }}>
            <Zap size={13} color="#4f46e5" fill="#4f46e5"/>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>{credits} crédits</span>
          </div>
        </div>

        {/* Low credits warning */}
        {credits < 5 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#92400e' }}>
            ⚠️ Crédits insuffisants (5 requis) —{' '}
            <button onClick={() => router.push('/pricing')} style={{ background: 'none', border: 'none', color: '#d97706', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              Recharger
            </button>
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: Business plan pour un salon de coiffure moderne aux Almadies..."
          style={{ width: '100%', height: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleGenerate}
            disabled={loading || !hasCredits(5)}
            style={{ flex: 2, background: loading || !hasCredits(5) ? '#94a3b8' : '#2c3e50', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: loading || !hasCredits(5) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Rédaction en cours...' : '🚀 Générer avec Claude · ⚡5'}
          </button>
          <button
            onClick={exportToWord}
            style={{ flex: 1, background: '#2980b9', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            📝 Export Word
          </button>
          <button
            onClick={() => window.print()}
            style={{ flex: 1, background: '#e67e22', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            📥 Télécharger PDF
          </button>
        </div>
      </div>

      {/* DOCUMENT — structure completely unchanged */}
      <div id="business-plan-document" className="container" style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '60px', borderRadius: '4px', boxShadow: '0 0 20px rgba(0,0,0,0.1)' }}>

        <h1 contentEditable suppressContentEditableWarning style={{ color: '#2c3e50', borderBottom: '3px solid #e67e22', textAlign: 'center', marginBottom: '40px' }}>
          {docTitle}
        </h1>

        {sections.map((section) => (
          <div key={section.id} style={{ marginBottom: '40px', padding: '20px', border: '1px solid #eee', position: 'relative' }}>

            <div className="no-print" style={{ background: '#f8f9fa', padding: '10px', marginBottom: '20px', borderRadius: '6px', display: 'flex', gap: '10px' }}>
              <button onClick={() => addBlock(section.id, 'text')} className="btn-tool">📝 + Texte</button>
              <button onClick={() => addBlock(section.id, 'table')} className="btn-tool">📊 + Tableau</button>
              <button onClick={() => addBlock(section.id, 'image')} className="btn-tool">🖼️ + Image</button>
              <button onClick={() => deleteSection(section.id)} className="btn-tool btn-danger" style={{ marginLeft: 'auto' }}>🗑️</button>
            </div>

            <h2 contentEditable suppressContentEditableWarning style={{ color: '#e67e22' }}>{section.title}</h2>

            {section.blocks.map((block) => (
              <div key={block.id} className="block-wrapper" style={{ position: 'relative', margin: '20px 0' }}>
                <span className="delete-block no-print" onClick={() => deleteBlock(section.id, block.id)}>×</span>

                {block.type === 'text' && (
                  <div contentEditable suppressContentEditableWarning style={{ minHeight: '30px', color: '#334155', lineHeight: '1.7', outline: 'none' }}>
                    {block.content}
                  </div>
                )}

                {block.type === 'image' && (
                  <div style={{ textAlign: 'center', padding: '20px', border: block.content ? 'none' : '2px dashed #ccc' }}>
                    {block.content ? (
                      <img src={block.content} style={{ maxWidth: '100%', borderRadius: '8px' }} alt="Upload" />
                    ) : (
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, section.id, block.id)} className="no-print" />
                    )}
                  </div>
                )}

                {block.type === 'table' && (
                  <div>
                    <div className="no-print" style={{ marginBottom: '5px' }}>
                      <button onClick={() => addRow(section.id, block.id)} className="btn-mini">+ Ligne</button>
                      <button onClick={() => addColumn(section.id, block.id)} className="btn-mini">+ Colonne</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {block.content.headers.map((h, i) => (
                            <th key={i} contentEditable suppressContentEditableWarning style={{ border: '1px solid #ddd', padding: '12px', background: '#f1f5f9' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.content.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j} contentEditable suppressContentEditableWarning style={{ border: '1px solid #ddd', padding: '12px' }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="no-print" style={{ textAlign: 'center' }}>
          <button onClick={addSection} style={{ background: '#27ae60', color: 'white', padding: '12px 25px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ➕ Ajouter une Section
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .container { box-shadow: none !important; padding: 0 !important; }
        }
        .btn-tool { background: white; border: 1px solid #cbd5e1; cursor: pointer; padding: 6px 12px; font-size: 13px; border-radius: 4px; transition: all 0.2s; }
        .btn-tool:hover { background: #e2e8f0; border-color: #94a3b8; }
        .btn-mini { background: #f1f5f9; border: 1px solid #ddd; cursor: pointer; padding: 2px 8px; font-size: 11px; margin-right: 5px; border-radius: 3px; }
        .btn-mini:hover { background: #e67e22; color: white; }
        .block-wrapper { transition: background 0.2s; padding: 10px; border-radius: 6px; border: 1px solid transparent; }
        .block-wrapper:hover { background: #f8fafc; border-color: #e2e8f0; }
        .delete-block { position: absolute; right: 5px; top: 5px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: #fee2e2; color: #ef4444; border-radius: 50%; cursor: pointer; font-size: 16px; opacity: 0; transition: opacity 0.2s, transform 0.2s; z-index: 10; }
        .block-wrapper:hover .delete-block { opacity: 1; }
        .delete-block:hover { background: #ef4444; color: white; transform: scale(1.1); }
        .container { font-family: 'Segoe UI', system-ui, sans-serif; }
      `}</style>
    </main>
  )
}