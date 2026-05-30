'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, Trash2, Download, Upload, FileText,
  Image, Film, Music, File, Grid, List, Map,
  Bold, Italic, Underline, Link2, Code, AlignLeft,
  X, Check, ChevronDown, Pin, Star, Calendar,
  Clock, Hash, Paperclip, Layers, RefreshCw, Copy,
  ChevronRight, ArrowLeft, ZoomIn, ZoomOut, Move,
  CheckSquare, Square, Palette, MessageSquare, Send,
  Sparkles, Bot, PlusCircle, Type, Heading1, Heading2,
  Quote, RotateCcw, Loader2
} from 'lucide-react'

// ─── Utilities ────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 10)
const now   = () => new Date().toISOString()
const fmtDate = iso => {
  const d = new Date(iso), diff = (Date.now() - d) / 1000
  if (diff < 60)    return 'à l\'instant'
  if (diff < 3600)  return `${Math.floor(diff/60)}min`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  if (diff < 604800)return `${Math.floor(diff/86400)}j`
  return d.toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })
}
const fmtSize = b => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`
const LIGHT_COLORS = ['#ede9fe','#e0f2fe','#dcfce7','#fce7f3','#fefce8','#fff7ed','#f0fdf4','#fdf4ff']
const isLight = c => c && LIGHT_COLORS.includes(c)

const COLOR_TAGS = [
  { name:'personnel', color:'#e879f9' }, { name:'travail', color:'#38bdf8' },
  { name:'idées',     color:'#4ade80' }, { name:'urgent',  color:'#f87171' },
  { name:'référence', color:'#fbbf24' },
]

const EMPTY_NOTE = (parentId = null) => ({
  id: genId(), title: 'Sans titre', content: '',
  tags: [], pinned: false, starred: false,
  color: null, textColor: null, parentId,
  tasks: [], attachments: [],
  calendarEvents: [],
  createdAt: now(), updatedAt: now(),
})

// ─── File helpers ─────────────────────────────────────────────────
const fileIcon = m => {
  if (!m) return <File size={13}/>
  if (m.startsWith('image/')) return <Image size={13}/>
  if (m.startsWith('video/')) return <Film size={13}/>
  if (m.startsWith('audio/')) return <Music size={13}/>
  if (m.includes('pdf'))      return <FileText size={13}/>
  return <File size={13}/>
}

// ─── Export helpers ────────────────────────────────────────────────
const exportJSON = notes => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(notes,null,2)],{type:'application/json'}))
  a.download = `vanta-notes-${Date.now()}.json`; a.click()
}
const exportMD = note => {
  let md = `# ${note.title}\n\n> Créé: ${new Date(note.createdAt).toLocaleString('fr-FR')}\n`
  if (note.tags.length) md += `> Tags: ${note.tags.join(', ')}\n`
  md += `\n${note.content.replace(/<[^>]*>/g,'')}\n`
  if (note.tasks?.length) { md += `\n## Tâches\n`; note.tasks.forEach(t => { md += `- [${t.done?'x':' '}] ${t.text}\n` }) }
  if (note.calendarEvents?.length) { md += `\n## Événements\n`; note.calendarEvents.forEach(e => { md += `- ${e.date} ${e.time||''} — ${e.title}\n` }) }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([md],{type:'text/markdown'}))
  a.download = `${note.title.replace(/\s+/g,'-')}.md`; a.click()
}
const downloadAtt = att => { const a = document.createElement('a'); a.href = att.dataUrl; a.download = att.name; a.click() }

// ─── AI Panel ─────────────────────────────────────────────────────
function AIPanel({ notes, activeNote, onAddNote, onClose }) {
  const [messages, setMessages] = useState([
    { role:'assistant', content:'Bonjour ! Je suis votre assistant IA. Je peux :\n• **Chatter** avec vous sur n\'importe quel sujet\n• **Résumer** vos notes (envoyez-moi le JSON exporté)\n• **Répondre** à des questions sur vos notes\n\nComment puis-je vous aider ?' }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState('chat') // 'chat' | 'resume' | 'ask'
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const notesContext = notes.map(n =>
    `[Note: "${n.title}" | Tags: ${n.tags.join(',')||'—'} | Tâches: ${n.tasks?.filter(t=>!t.done).length||0} en attente]\n${n.content.replace(/<[^>]*>/g,'').slice(0,300)}`
  ).join('\n\n---\n\n')

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim(); setInput('')
    setMessages(m => [...m, { role:'user', content: userMsg }])
    setLoading(true)

    let systemPrompt = ''
    if (context === 'resume') {
      systemPrompt = `Tu es un assistant qui résume des notes. L'utilisateur a ${notes.length} notes. Voici leur contenu:\n\n${notesContext}\n\nRésume ces notes de façon claire et structurée.`
    } else if (context === 'ask') {
      systemPrompt = `Tu es un assistant qui répond à des questions basées sur des notes. Voici toutes les notes de l'utilisateur:\n\n${notesContext}\n\nRéponds aux questions en te basant sur le contenu de ces notes. Si l'information n'est pas dans les notes, dis-le clairement.`
    } else {
      systemPrompt = `Tu es un assistant de notes intelligent, utile et concis. Tu réponds en français. Si l'utilisateur a des notes ouvertes, tu peux y faire référence. Note active: "${activeNote?.title||'aucune'}".`
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...messages.filter(m=>m.role==='user'||m.role==='assistant').slice(-6).map(m=>({ role:m.role, content:m.content })),
            { role:'user', content: userMsg }
          ]
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Désolé, une erreur est survenue.'
      setMessages(m => [...m, { role:'assistant', content: reply, addable: true }])
    } catch {
      setMessages(m => [...m, { role:'assistant', content: '⚠️ Erreur de connexion à l\'IA.', addable: false }])
    }
    setLoading(false)
  }

  const addAsNote = (content) => {
    onAddNote(content)
  }

  return (
    <div style={{ width:340, borderLeft:'1px solid #1e2130', background:'#0b0d14', display:'flex', flexDirection:'column', flexShrink:0 }}>
      {/* Header */}
      <div style={{ padding:'12px 14px', borderBottom:'1px solid #1e2130', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, background:'linear-gradient(135deg,#818cf8,#a78bfa)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bot size={14} color="#fff"/>
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>Assistant IA</p>
            <p style={{ fontSize:9, color:'#475569' }}>Powered by Claude</p>
          </div>
        </div>
        <button className="icon-btn" onClick={onClose}><X size={14}/></button>
      </div>

      {/* Mode selector */}
      <div style={{ padding:'8px 12px', borderBottom:'1px solid #1e2130', display:'flex', gap:4, flexShrink:0 }}>
        {[
          { key:'chat',   icon:<MessageSquare size={11}/>, label:'Chat' },
          { key:'ask',    icon:<Search size={11}/>,        label:'Mes notes' },
          { key:'resume', icon:<FileText size={11}/>,      label:'Résumer tout' },
        ].map(m => (
          <button key={m.key} onClick={() => setContext(m.key)}
            style={{ flex:1, padding:'5px 4px', border:`1px solid ${context===m.key?'#818cf8':'#1e2130'}`,
              background: context===m.key ? '#818cf820':'transparent',
              borderRadius:7, cursor:'pointer', fontSize:10, fontWeight:700,
              color: context===m.key?'#818cf8':'#475569', display:'flex', alignItems:'center', justifyContent:'center', gap:4,
              fontFamily:'Syne,sans-serif' }}>
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflow:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:10 }} className="scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: msg.role==='user'?'flex-end':'flex-start', gap:4 }}>
            <div style={{
              maxWidth:'88%', padding:'9px 12px', borderRadius: msg.role==='user'?'12px 12px 4px 12px':'12px 12px 12px 4px',
              background: msg.role==='user' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#161820',
              border: msg.role==='assistant' ? '1px solid #1e2130' : 'none',
              fontSize:12, color: msg.role==='user'?'#fff':'#cbd5e1', lineHeight:1.65,
              fontFamily:'Syne,sans-serif', whiteSpace:'pre-wrap', wordBreak:'break-word'
            }}>
              {msg.content}
            </div>
            {msg.addable && (
              <button onClick={() => addAsNote(msg.content)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', fontSize:10, fontWeight:700,
                  background:'#10b98118', border:'1px solid #10b98140', borderRadius:6,
                  color:'#34d399', cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
                <PlusCircle size={10}/> Ajouter comme note
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#161820', border:'1px solid #1e2130', borderRadius:12, width:'fit-content' }}>
            <Loader2 size={12} style={{ color:'#818cf8', animation:'spin 1s linear infinite' }}/>
            <span style={{ fontSize:11, color:'#475569' }}>Réflexion…</span>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid #1e2130', flexShrink:0 }}>
        {context === 'resume' && (
          <p style={{ fontSize:10, color:'#475569', marginBottom:8, lineHeight:1.5 }}>
            Mode résumé : je vais analyser toutes vos {notes.length} notes.
          </p>
        )}
        <div style={{ display:'flex', gap:6 }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={context==='resume'?'Demandez un résumé…':context==='ask'?'Posez une question sur vos notes…':'Écrivez un message…'}
            rows={2}
            style={{ flex:1, fontSize:12, padding:'8px 10px', resize:'none', lineHeight:1.5,
              background:'#0f1117', border:'1px solid #252840', borderRadius:8,
              color:'#e2e8f0', fontFamily:'Syne,sans-serif', outline:'none' }}/>
          <button onClick={send} disabled={loading || !input.trim()}
            style={{ width:36, background: input.trim()?'linear-gradient(135deg,#4f46e5,#7c3aed)':'#161820',
              border:'none', borderRadius:8, cursor: input.trim()?'pointer':'default',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Send size={14} color={input.trim()?'#fff':'#334155'}/>
          </button>
        </div>
        <p style={{ fontSize:9, color:'#334155', marginTop:5, textAlign:'center' }}>Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
      </div>
    </div>
  )
}

// ─── Calendar Modal ────────────────────────────────────────────────
function CalendarModal({ notes, onUpdateNote, onClose }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10))
  const [viewMonth, setViewMonth] = useState(new Date())
  const [addingTo, setAddingTo]   = useState(null) // noteId
  const [evtTitle, setEvtTitle]   = useState('')
  const [evtTime,  setEvtTime]    = useState('')

  const allEvents = notes.flatMap(n => (n.calendarEvents||[]).map(e => ({ ...e, noteId:n.id, noteTitle:n.title })))
  const eventsOnDay = d => allEvents.filter(e => e.date === d)

  const daysInMonth = () => {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth()
    const first = new Date(y,m,1).getDay()
    const days = new Date(y,m+1,0).getDate()
    return { first: (first+6)%7, days }
  }
  const { first, days } = daysInMonth()
  const monthStr = viewMonth.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})

  const addEvent = () => {
    if (!evtTitle.trim() || !addingTo) return
    const note = notes.find(n => n.id === addingTo)
    if (!note) return
    const evt = { id:genId(), title:evtTitle.trim(), date:selectedDate, time:evtTime, noteId:addingTo }
    onUpdateNote(addingTo, { calendarEvents: [...(note.calendarEvents||[]), evt] })
    setEvtTitle(''); setEvtTime(''); setAddingTo(null)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ width:720, maxHeight:'85vh', background:'#0f1117', border:'1px solid #252840', borderRadius:16, display:'flex', overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.8)' }}>
        {/* Calendar grid */}
        <div style={{ flex:1, padding:20, borderRight:'1px solid #1e2130', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <button className="icon-btn" onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth()-1,1))}><ArrowLeft size={14}/></button>
            <span style={{ fontWeight:700, fontSize:14, textTransform:'capitalize' }}>{monthStr}</span>
            <button className="icon-btn" onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth()+1,1))}><ChevronRight size={14}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
            {['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:9, color:'#475569', fontWeight:700, padding:'4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, flex:1 }}>
            {Array(first).fill(null).map((_,i) => <div key={`e${i}`}/>)}
            {Array(days).fill(null).map((_,i) => {
              const d = i+1
              const dateStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              const evts = eventsOnDay(dateStr)
              const isToday = dateStr === new Date().toISOString().slice(0,10)
              const isSel = dateStr === selectedDate
              return (
                <div key={d} onClick={() => setSelectedDate(dateStr)}
                  style={{ minHeight:44, padding:3, borderRadius:6, cursor:'pointer', border:`1px solid ${isSel?'#818cf8':isToday?'#252840':'transparent'}`,
                    background: isSel?'#818cf820': isToday?'#1e2130':'transparent' }}
                  onMouseEnter={e => { if(!isSel) e.currentTarget.style.background='#161820' }}
                  onMouseLeave={e => { if(!isSel) e.currentTarget.style.background='transparent' }}>
                  <div style={{ fontSize:11, fontWeight: isToday?700:400, color: isToday?'#818cf8':'#94a3b8', textAlign:'right', marginBottom:2 }}>{d}</div>
                  {evts.slice(0,2).map(e => (
                    <div key={e.id} style={{ fontSize:8, background:'#4f46e530', border:'1px solid #4f46e550', borderRadius:3, padding:'1px 4px', color:'#a5b4fc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:1 }}>
                      {e.time && <span style={{ opacity:.7 }}>{e.time} </span>}{e.title}
                    </div>
                  ))}
                  {evts.length > 2 && <div style={{ fontSize:8, color:'#475569' }}>+{evts.length-2}</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Day panel */}
        <div style={{ width:260, padding:16, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#e2e8f0' }}>
              {new Date(selectedDate+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
            </p>
            <button className="icon-btn" onClick={onClose}><X size={14}/></button>
          </div>

          {/* Events list */}
          <div style={{ flex:1, overflow:'auto' }} className="scrollbar-thin">
            {eventsOnDay(selectedDate).length === 0 && (
              <p style={{ fontSize:11, color:'#334155', textAlign:'center', marginTop:16 }}>Aucun événement</p>
            )}
            {eventsOnDay(selectedDate).map(e => {
              const note = notes.find(n => n.id === e.noteId)
              return (
                <div key={e.id} style={{ background:'#161820', border:'1px solid #252840', borderRadius:8, padding:'8px 10px', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'#e2e8f0' }}>{e.title}</p>
                    <button onClick={() => {
                      if (note) onUpdateNote(e.noteId, { calendarEvents: note.calendarEvents.filter(ev=>ev.id!==e.id) })
                    }} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#475569', display:'flex' }}>
                      <X size={10}/>
                    </button>
                  </div>
                  {e.time && <p style={{ fontSize:10, color:'#818cf8', marginTop:2 }}>🕐 {e.time}</p>}
                  <p style={{ fontSize:9, color:'#475569', marginTop:2 }}>📝 {e.noteTitle}</p>
                </div>
              )
            })}
          </div>

          {/* Add event */}
          <div style={{ borderTop:'1px solid #1e2130', paddingTop:12, marginTop:8 }}>
            <p style={{ fontSize:10, color:'#475569', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Ajouter un événement</p>
            <input value={evtTitle} onChange={e=>setEvtTitle(e.target.value)}
              placeholder="Titre de l'événement"
              style={{ width:'100%', padding:'6px 10px', fontSize:11, marginBottom:6, background:'#161820', border:'1px solid #252840', borderRadius:7, color:'#e2e8f0', fontFamily:'Syne,sans-serif', outline:'none' }}/>
            <input value={evtTime} onChange={e=>setEvtTime(e.target.value)}
              type="time"
              style={{ width:'100%', padding:'6px 10px', fontSize:11, marginBottom:8, background:'#161820', border:'1px solid #252840', borderRadius:7, color:'#94a3b8', fontFamily:'Syne,sans-serif', outline:'none' }}/>
            <select value={addingTo||''} onChange={e=>setAddingTo(e.target.value)}
              style={{ width:'100%', padding:'6px 10px', fontSize:11, marginBottom:8, background:'#161820', border:'1px solid #252840', borderRadius:7, color:'#94a3b8', fontFamily:'Syne,sans-serif', outline:'none' }}>
              <option value="">Lier à une note…</option>
              {notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
            <button onClick={addEvent} disabled={!evtTitle.trim()||!addingTo}
              style={{ width:'100%', padding:'7px 0', background: evtTitle.trim()&&addingTo?'linear-gradient(135deg,#4f46e5,#7c3aed)':'#1e2130',
                border:'none', borderRadius:8, color: evtTitle.trim()&&addingTo?'#fff':'#334155',
                fontSize:12, fontWeight:700, cursor: evtTitle.trim()&&addingTo?'pointer':'default',
                fontFamily:'Syne,sans-serif' }}>
              + Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Task List ─────────────────────────────────────────────────────
function TaskList({ tasks, noteId, onUpdate, isLight: light }) {
  const [newTask, setNewTask] = useState('')
  const toggle = id => onUpdate(tasks.map(t => t.id===id ? {...t, done: !t.done} : t))
  const remove = id => onUpdate(tasks.filter(t => t.id!==id))
  const add = () => {
    if (!newTask.trim()) return
    onUpdate([...tasks, { id:genId(), text:newTask.trim(), done:false, createdAt:now() }])
    setNewTask('')
  }
  const done   = tasks.filter(t => t.done)
  const undone = tasks.filter(t => !t.done)

  return (
    <div style={{ marginTop:24 }}>
      <p style={{ fontSize:11, color: light?'#374151':'#64748b', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
        <CheckSquare size={12}/> Tâches ({undone.length} restantes)
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {undone.map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background: light?'rgba(0,0,0,.06)':'#0f1117', border:`1px solid ${light?'rgba(0,0,0,.1)':'#1e2130'}`, borderRadius:8 }}>
            <button onClick={() => toggle(t.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#818cf8', display:'flex', flexShrink:0 }}>
              <Square size={15}/>
            </button>
            <span style={{ flex:1, fontSize:13, color: light?'#1e1b4b':'#cbd5e1' }}>{t.text}</span>
            <button onClick={() => remove(t.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#334155', display:'flex' }}
              onMouseEnter={e=>e.currentTarget.style.color='#f87171'} onMouseLeave={e=>e.currentTarget.style.color='#334155'}>
              <X size={11}/>
            </button>
          </div>
        ))}
        {done.length > 0 && (
          <>
            <p style={{ fontSize:9, color:'#334155', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', margin:'6px 0 4px', display:'flex', alignItems:'center', gap:5 }}>
              <Check size={9}/> Complétées ({done.length})
            </p>
            {done.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px', opacity:.5, borderRadius:7 }}>
                <button onClick={() => toggle(t.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#34d399', display:'flex', flexShrink:0 }}>
                  <Check size={15}/>
                </button>
                <span style={{ flex:1, fontSize:12, color:'#475569', textDecoration:'line-through' }}>{t.text}</span>
                <button onClick={() => remove(t.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#334155', display:'flex' }}>
                  <Trash2 size={10}/>
                </button>
              </div>
            ))}
          </>
        )}
      </div>
      {/* Add task */}
      <div style={{ display:'flex', gap:6, marginTop:8 }}>
        <input value={newTask} onChange={e=>setNewTask(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') add() }}
          placeholder="Ajouter une tâche…"
          style={{ flex:1, padding:'6px 10px', fontSize:12, background: light?'rgba(0,0,0,.08)':'#0f1117',
            border:`1px solid ${light?'rgba(0,0,0,.15)':'#252840'}`, borderRadius:8,
            color: light?'#1e1b4b':'#e2e8f0', fontFamily:'Syne,sans-serif', outline:'none' }}/>
        <button onClick={add} disabled={!newTask.trim()}
          style={{ padding:'6px 12px', background: newTask.trim()?'#4f46e5':'#161820', border:'none', borderRadius:8, color: newTask.trim()?'#fff':'#334155', fontSize:12, fontWeight:700, cursor: newTask.trim()?'pointer':'default', fontFamily:'Syne,sans-serif' }}>
          +
        </button>
      </div>
    </div>
  )
}

// ─── Mind Map ─────────────────────────────────────────────────────
const NODE_W = 164, NODE_H = 52
const COLORS_MAP = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#64748b']

function MindMapCanvas({ notes, activeId, onSelect, onUpdateNote, onCreateChild, onDeleteNote }) {
  const svgRef = useRef(null)
  const [positions, setPositions] = useState({})
  const [dragging,  setDragging]  = useState(null)
  const [panning,   setPanning]   = useState(false)
  const [panStart,  setPanStart]  = useState(null)
  const [offset,    setOffset]    = useState({ x:60, y:40 })
  const [scale,     setScale]     = useState(0.85)
  const [selected,  setSelected]  = useState(null)
  const [linking,   setLinking]   = useState(null)
  const [mousePos,  setMousePos]  = useState({ x:0, y:0 })
  const [ctxMenu,   setCtxMenu]   = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editVal,   setEditVal]   = useState('')
  const [linkPanel, setLinkPanel] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev }, placed = new Set(Object.keys(next))
      let changed = false
      const place = (id, x, y) => {
        if (placed.has(id)) return
        next[id]={x,y}; placed.add(id); changed=true
        notes.filter(n=>n.parentId===id).forEach((c,i,a)=>place(c.id,x+250,y+(i-(a.length-1)/2)*95))
      }
      notes.filter(n=>!n.parentId).forEach((r,i)=>place(r.id,80,80+i*140))
      notes.forEach(n=>{ if(!placed.has(n.id)){ next[n.id]={x:80+Math.random()*500,y:80+Math.random()*350}; changed=true } })
      return changed ? next : prev
    })
  }, [notes.length])

  useEffect(() => { if(editingId) setTimeout(()=>inputRef.current?.focus(),30) }, [editingId])

  const getPos  = id => positions[id]||{x:100,y:100}
  const toSVG   = (cx,cy) => { const r=svgRef.current?.getBoundingClientRect(); if(!r)return{x:0,y:0}; return{x:(cx-r.left-offset.x)/scale,y:(cy-r.top-offset.y)/scale} }
  const nodeCol = n => COLORS_MAP[notes.findIndex(x=>x.id===n.id)%COLORS_MAP.length]
  const bezier  = (x1,y1,x2,y2) => { const mx=(x1+x2)/2; return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` }

  const onNodeDown = (e, id) => {
    e.stopPropagation(); if(e.button===2)return
    if (linking) {
      if(linking!==id){ onUpdateNote(id,{parentId:linking}); const pp=getPos(linking); setPositions(p=>({...p,[id]:{x:pp.x+250,y:pp.y}})) }
      setLinking(null); return
    }
    const pos=getPos(id), sv=toSVG(e.clientX,e.clientY)
    setDragging({id,ox:sv.x-pos.x,oy:sv.y-pos.y,moved:false}); setCtxMenu(null); setLinkPanel(null)
  }
  const onMove = e => {
    const sv=toSVG(e.clientX,e.clientY); setMousePos(sv)
    if(dragging){ setPositions(p=>({...p,[dragging.id]:{x:sv.x-dragging.ox,y:sv.y-dragging.oy}})); setDragging(d=>d?{...d,moved:true}:d) }
    else if(panning&&panStart) setOffset({x:e.clientX-panStart.ox,y:e.clientY-panStart.oy})
  }
  const onUp = () => {
    if(dragging&&!dragging.moved){ setSelected(dragging.id); setLinkPanel(dragging.id) }
    setDragging(null); setPanning(false); setPanStart(null)
  }
  const onSVGDown = e => {
    if(e.button!==0)return
    setPanning(true); setPanStart({ox:e.clientX-offset.x,oy:e.clientY-offset.y})
    setCtxMenu(null); setSelected(null); setLinkPanel(null)
  }
  const onDblClick = (e, id) => { e.stopPropagation(); onSelect(id) }
  const commitEdit = () => { if(editingId&&editVal.trim()) onUpdateNote(editingId,{title:editVal.trim()}); setEditingId(null) }
  const onCtx = (e, id) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({noteId:id,x:e.clientX,y:e.clientY}); setSelected(id); setLinkPanel(id) }
  const onWheel = e => { e.preventDefault(); setScale(s=>Math.max(0.2,Math.min(2.5,s*(e.deltaY>0?0.9:1.1)))) }

  const lpNote = notes.find(n=>n.id===linkPanel)
  const children = lpNote ? notes.filter(n=>n.parentId===linkPanel) : []
  const connectable = lpNote ? notes.filter(n=>n.id!==linkPanel&&n.id!==lpNote.parentId&&!children.find(c=>c.id===n.id)) : []

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#07090f', position:'relative' }}
      onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        {/* Toolbar */}
        <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', zIndex:20,
          display:'flex', gap:4, background:'#0f1117cc', backdropFilter:'blur(12px)',
          border:'1px solid #1e2130', borderRadius:10, padding:'5px 8px', boxShadow:'0 4px 24px rgba(0,0,0,.6)' }}>
          <button className="icon-btn" onClick={()=>setScale(s=>Math.min(s+.15,2.5))}><ZoomIn size={14}/></button>
          <button className="icon-btn" onClick={()=>setScale(s=>Math.max(s-.15,0.2))}><ZoomOut size={14}/></button>
          <button className="icon-btn" onClick={()=>{setScale(0.85);setOffset({x:60,y:40})}}><Move size={14}/></button>
          <div style={{width:1,background:'#1e2130',margin:'2px 4px'}}/>
          <button className="icon-btn" onClick={()=>onCreateChild(null)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',fontSize:11,color:'#a78bfa',fontFamily:'Syne,sans-serif'}}>
            <Plus size={13}/> Note
          </button>
          {linking && <button className="icon-btn" onClick={()=>setLinking(null)} style={{color:'#f87171',fontSize:11,padding:'4px 10px',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',gap:5}}><X size={12}/> Annuler</button>}
          <span style={{fontSize:10,color:'#334155',display:'flex',alignItems:'center',padding:'0 4px'}}>{Math.round(scale*100)}%</span>
        </div>
        {linking && (
          <div style={{position:'absolute',top:58,left:'50%',transform:'translateX(-50%)',zIndex:30,
            background:'linear-gradient(135deg,#4f46e5,#7c3aed)',borderRadius:8,padding:'7px 18px',
            fontSize:12,color:'#fff',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#a5f3fc'}}/>
            Cliquez sur un nœud pour lier — ou <button onClick={()=>setLinking(null)} style={{background:'transparent',border:'none',color:'#fca5a5',cursor:'pointer',fontWeight:700,fontSize:12,fontFamily:'Syne,sans-serif'}}>annuler</button>
          </div>
        )}
        {/* Legend */}
        <div style={{position:'absolute',bottom:12,left:12,zIndex:10,background:'#0f111788',backdropFilter:'blur(8px)',border:'1px solid #1e2130',borderRadius:8,padding:'6px 12px',fontSize:10,color:'#334155',lineHeight:2}}>
          <div>Clic → panneau liens · Dbl-clic → éditeur</div>
          <div>Clic droit → menu · Glisser → déplacer</div>
        </div>

        <svg ref={svgRef} width="100%" height="100%"
          onMouseDown={onSVGDown} onWheel={onWheel}
          style={{cursor:linking?'crosshair':panning?'grabbing':'default',display:'block'}}
          onContextMenu={e=>e.preventDefault()}>
          <defs>
            <pattern id="dotgrid2" width="30" height="30" patternUnits="userSpaceOnUse"
              patternTransform={`translate(${((offset.x%30)+30)%30},${((offset.y%30)+30)%30})`}>
              <circle cx="15" cy="15" r=".8" fill="#1a1d2e"/>
            </pattern>
            <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0,8 3,0 6" fill="#334155"/>
            </marker>
            <marker id="arr-a" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0,8 3,0 6" fill="#a78bfa"/>
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotgrid2)"/>
          <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>
            {/* Edges */}
            {notes.map(n => {
              if(!n.parentId)return null
              const p=getPos(n.parentId),c=getPos(n.id)
              const pn=notes.find(x=>x.id===n.parentId)
              const col=nodeCol(pn||n)
              const hi=selected===n.id||selected===n.parentId
              return (
                <g key={`e-${n.id}`}>
                  {hi&&<path d={bezier(p.x+NODE_W,p.y+NODE_H/2,c.x,c.y+NODE_H/2)} fill="none" stroke={col} strokeWidth="6" strokeOpacity=".12"/>}
                  <path d={bezier(p.x+NODE_W,p.y+NODE_H/2,c.x,c.y+NODE_H/2)} fill="none" stroke={col} strokeWidth={hi?2:1.5} strokeOpacity={hi?.9:.4} markerEnd={hi?'url(#arr-a)':'url(#arr)'}/>
                </g>
              )
            })}
            {/* Live link */}
            {linking&&positions[linking]&&(
              <path d={bezier(getPos(linking).x+NODE_W,getPos(linking).y+NODE_H/2,mousePos.x,mousePos.y)}
                fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arr-a)" opacity=".9"/>
            )}
            {/* Nodes */}
            {notes.map(n => {
              const pos=getPos(n.id), isSel=n.id===selected, isLink=n.id===linking
              const col=nodeCol(n), light=isLight(n.color)
              const bg=n.color||(isSel?'#13112b':'#0d0f1a')
              const stroke=isLink?'#a78bfa':isSel?col:'#252840'
              const textC=light?'#1e1b4b':(n.textColor||'#e2e8f0')
              const hasCh=notes.some(x=>x.parentId===n.id)
              const prev=n.content.replace(/<[^>]*>/g,'').slice(0,36)
              const tasksDue=n.tasks?.filter(t=>!t.done).length||0
              return (
                <g key={n.id} transform={`translate(${pos.x},${pos.y})`}
                  onMouseDown={e=>onNodeDown(e,n.id)} onDoubleClick={e=>onDblClick(e,n.id)}
                  onContextMenu={e=>onCtx(e,n.id)} style={{cursor:dragging?.id===n.id?'grabbing':'grab',userSelect:'none'}}>
                  <rect x="3" y="4" width={NODE_W} height={NODE_H} rx="11" fill="black" opacity={dragging?.id===n.id?.5:.2}/>
                  {isSel&&<rect x="-3" y="-3" width={NODE_W+6} height={NODE_H+6} rx="14" fill="none" stroke={col} strokeWidth="1" opacity=".3"/>}
                  <rect width={NODE_W} height={NODE_H} rx="11" fill={bg} stroke={stroke} strokeWidth={isSel||isLink?2:1}/>
                  <rect y="0" width={NODE_W} height="3" rx="2" fill={col}/>
                  {hasCh&&<circle cx={NODE_W+7} cy={NODE_H/2} r="5" fill={col} opacity=".85"/>}
                  {tasksDue>0&&<circle cx={NODE_W-8} cy={8} r="7" fill="#f59e0b" opacity=".9"/>}
                  {tasksDue>0&&<text x={NODE_W-8} y={12} textAnchor="middle" fill="#000" fontSize="7" fontWeight="700">{tasksDue}</text>}
                  {n.pinned&&<circle cx={NODE_W-(tasksDue>0?22:8)} cy={8} r="3" fill="#f59e0b"/>}
                  {editingId===n.id?(
                    <foreignObject x="8" y="9" width={NODE_W-16} height={NODE_H-18}>
                      <input ref={inputRef} value={editVal} onChange={e=>setEditVal(e.target.value)}
                        onBlur={commitEdit} onKeyDown={e=>{if(e.key==='Enter')commitEdit();if(e.key==='Escape')setEditingId(null)}}
                        style={{width:'100%',background:'transparent',border:'none',outline:'none',color:textC,fontSize:12,fontFamily:'Syne,sans-serif',fontWeight:700}}/>
                    </foreignObject>
                  ):(
                    <>
                      <text x={8} y={prev?21:NODE_H/2+5} fill={textC} fontSize="12" fontWeight="700" fontFamily="'Instrument Serif',Georgia,serif" style={{pointerEvents:'none'}}>
                        {n.title.length>18?n.title.slice(0,18)+'…':n.title}
                      </text>
                      {prev&&<text x={8} y={37} fill="#3d4f6b" fontSize="9" fontFamily="Syne,sans-serif" style={{pointerEvents:'none'}}>{prev.length>24?prev.slice(0,24)+'…':prev}</text>}
                    </>
                  )}
                  <rect width={NODE_W} height={NODE_H} rx="11" fill="transparent"/>
                </g>
              )
            })}
          </g>
        </svg>

        {/* Context Menu */}
        {ctxMenu&&(()=>{
          const n=notes.find(x=>x.id===ctxMenu.noteId); if(!n)return null
          return (
            <div style={{position:'fixed',top:Math.min(ctxMenu.y,window.innerHeight-300),left:Math.min(ctxMenu.x,window.innerWidth-210),zIndex:200,background:'#0f1117',border:'1px solid #252840',borderRadius:12,padding:6,minWidth:196,boxShadow:'0 12px 40px rgba(0,0,0,.8)',fontFamily:'Syne,sans-serif'}}
              onMouseLeave={()=>setCtxMenu(null)}>
              <div style={{padding:'5px 10px 6px',fontSize:10,color:'#475569',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',borderBottom:'1px solid #1e2130',marginBottom:4}}>
                {n.title.slice(0,22)}{n.title.length>22?'…':''}
              </div>
              {[
                {icon:'✏️',label:'Renommer',action:()=>{setEditingId(n.id);setEditVal(n.title);setCtxMenu(null)}},
                {icon:'🔗',label:'Lier à…',color:'#818cf8',action:()=>{setLinking(n.id);setCtxMenu(null)}},
                {icon:'➕',label:'Ajouter enfant',action:()=>{onCreateChild(n.id);setCtxMenu(null)}},
                ...(n.parentId?[{icon:'✂️',label:'Détacher du parent',color:'#f59e0b',action:()=>{onUpdateNote(n.id,{parentId:null});setCtxMenu(null)}}]:[]),
                ...(notes.some(x=>x.parentId===n.id)?[{icon:'🌿',label:'Détacher tous enfants',color:'#f59e0b',action:()=>{notes.filter(x=>x.parentId===n.id).forEach(c=>onUpdateNote(c.id,{parentId:null}));setCtxMenu(null)}}]:[]),
                {icon:'📖',label:"Ouvrir l'éditeur",color:'#34d399',action:()=>{onSelect(n.id);setCtxMenu(null)}},
                {icon:'📌',label:n.pinned?'Désépingler':'Épingler',action:()=>{onUpdateNote(n.id,{pinned:!n.pinned});setCtxMenu(null)}},
                {icon:'🗑',label:'Supprimer',color:'#f87171',action:()=>{if(confirm('Supprimer ?')){onDeleteNote(n.id);setCtxMenu(null)}}},
              ].map((item,i)=>(
                <div key={i} onClick={item.action}
                  style={{padding:'7px 12px',borderRadius:7,cursor:'pointer',fontSize:12,color:item.color||'#94a3b8',display:'flex',alignItems:'center',gap:8}}
                  onMouseEnter={e=>e.currentTarget.style.background='#1e2130'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span>{item.icon}</span>{item.label}
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Link Panel */}
      {lpNote&&(
        <div style={{width:240,flexShrink:0,borderLeft:'1px solid #1e2130',background:'#0b0d14',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'12px 14px 10px',borderBottom:'1px solid #1e2130',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <p style={{fontSize:10,color:'#475569',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:3}}>Liens</p>
              <p style={{fontSize:13,color:'#e2e8f0',fontWeight:700,fontFamily:"'Instrument Serif',serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:170}}>{lpNote.title}</p>
            </div>
            <button className="icon-btn" onClick={()=>{setLinkPanel(null);setSelected(null)}}><X size={13}/></button>
          </div>
          <div style={{flex:1,overflow:'auto',padding:'10px 12px'}} className="scrollbar-thin">
            <div style={{display:'flex',gap:6,marginBottom:14}}>
              <button onClick={()=>setLinking(linkPanel)} style={{flex:1,padding:'7px 0',background:'#4f46e520',border:'1px solid #4f46e550',borderRadius:8,color:'#818cf8',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                <Link2 size={11}/> Lier à…
              </button>
              <button onClick={()=>onCreateChild(linkPanel)} style={{flex:1,padding:'7px 0',background:'#10b98120',border:'1px solid #10b98150',borderRadius:8,color:'#34d399',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                <Plus size={11}/> Enfant
              </button>
            </div>
            {lpNote.parentId&&(()=>{
              const par=notes.find(n=>n.id===lpNote.parentId); if(!par)return null
              const col=nodeCol(par)
              return (
                <div style={{marginBottom:12}}>
                  <p style={{fontSize:9,color:'#334155',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6,display:'flex',alignItems:'center',gap:5}}><ArrowLeft size={9}/> Parent</p>
                  <div style={{background:'#0f1117',border:`1px solid ${col}40`,borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}
                    onClick={()=>{setSelected(par.id);setLinkPanel(par.id)}}>
                    <span style={{fontSize:12,color:'#cbd5e1',fontWeight:600,fontFamily:"'Instrument Serif',serif"}}>{par.title.slice(0,20)}{par.title.length>20?'…':''}</span>
                    <button title="Détacher" onClick={e=>{e.stopPropagation();onUpdateNote(lpNote.id,{parentId:null})}} style={{background:'transparent',border:'none',cursor:'pointer',color:'#f59e0b',display:'flex',padding:3}}><X size={12}/></button>
                  </div>
                </div>
              )
            })()}
            {children.length>0&&(
              <div style={{marginBottom:12}}>
                <p style={{fontSize:9,color:'#334155',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6,display:'flex',alignItems:'center',gap:5}}><ChevronRight size={9}/> Enfants ({children.length})</p>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {children.map(ch=>{
                    const col=nodeCol(ch)
                    return (
                      <div key={ch.id} style={{background:'#0f1117',border:`1px solid ${col}30`,borderRadius:8,padding:'7px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}
                        onClick={()=>{setSelected(ch.id);setLinkPanel(ch.id)}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=col+'70'}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=col+'30'}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:0}}>
                          <div style={{width:3,height:16,borderRadius:2,background:col,flexShrink:0}}/>
                          <span style={{fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ch.title.slice(0,18)}{ch.title.length>18?'…':''}</span>
                        </div>
                        <button onClick={e=>{e.stopPropagation();onUpdateNote(ch.id,{parentId:null})}} style={{background:'transparent',border:'none',cursor:'pointer',color:'#334155',display:'flex',padding:3}}
                          onMouseEnter={e=>e.currentTarget.style.color='#f87171'} onMouseLeave={e=>e.currentTarget.style.color='#334155'}><X size={11}/></button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div>
              <p style={{fontSize:9,color:'#334155',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6,display:'flex',alignItems:'center',gap:5}}><Link2 size={9}/> Connecter à</p>
              <div style={{display:'flex',flexDirection:'column',gap:3}}>
                {connectable.slice(0,8).map(n=>{
                  return (
                    <div key={n.id} style={{background:'transparent',border:'1px solid #1e2130',borderRadius:7,padding:'6px 9px',display:'flex',alignItems:'center',justifyContent:'space-between'}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='#334155'} onMouseLeave={e=>e.currentTarget.style.borderColor='#1e2130'}>
                      <span style={{fontSize:11,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{n.title.slice(0,18)}{n.title.length>18?'…':''}</span>
                      <button onClick={()=>{onUpdateNote(n.id,{parentId:linkPanel});const pp=getPos(linkPanel);setPositions(prev=>({...prev,[n.id]:{x:pp.x+250,y:pp.y+children.length*90}}))}}
                        style={{background:'#1e2130',border:'none',borderRadius:5,padding:'3px 8px',fontSize:10,color:'#818cf8',cursor:'pointer',fontFamily:'Syne,sans-serif',fontWeight:700,flexShrink:0}}>
                        + Lier
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            <button onClick={()=>onSelect(linkPanel)} style={{width:'100%',marginTop:16,padding:'9px 0',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',border:'none',borderRadius:9,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <ChevronRight size={14}/> Ouvrir dans l'éditeur
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────
export default function NotesPage() {
  const [notes, setNotes]       = useState([])
  const [activeId, setActiveId] = useState(null)
  const [search,   setSearch]   = useState('')
  const [view,     setView]     = useState('list')
  const [filterTag,  setFilterTag]  = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showExport,  setShowExport]  = useState(false)
  const [showBgPicker, setShowBgPicker]  = useState(false)
  const [showTxtPicker, setShowTxtPicker] = useState(false)
  const [showAI,    setShowAI]    = useState(false)
  const [showCal,   setShowCal]   = useState(false)
  const [tagInput,  setTagInput]  = useState('')
  const [saved,     setSaved]     = useState(true)

  const editorRef  = useRef(null)
  const fileInput  = useRef(null)
  const importRef  = useRef(null)
  const saveTimer  = useRef(null)
  const activeIdRef= useRef(null)

  // Persist
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vanta_notes_v2')
      if (stored) { const p=JSON.parse(stored); setNotes(p); if(p.length)setActiveId(p[0].id) }
      else {
        const demo = EMPTY_NOTE()
        demo.title='Bienvenue dans Vanta Notes'
        demo.content='<p>Votre espace de notes moderne. Essayez les tâches ✓, le calendrier 📅, et l\'IA 🤖 !</p>'
        demo.tags=['bienvenue']; demo.pinned=true
        demo.tasks=[{id:genId(),text:'Explorer les fonctionnalités',done:false,createdAt:now()},{id:genId(),text:'Créer ma première note',done:false,createdAt:now()}]
        setNotes([demo]); setActiveId(demo.id)
      }
    } catch {}
  }, [])

  const persistNotes = useCallback(updated => {
    clearTimeout(saveTimer.current); setSaved(false)
    saveTimer.current = setTimeout(() => { try{localStorage.setItem('vanta_notes_v2',JSON.stringify(updated))}catch{} setSaved(true) }, 600)
  }, [])

  const updateNote = useCallback((id, changes) => {
    setNotes(prev => { const next=prev.map(n=>n.id===id?{...n,...changes,updatedAt:now()}:n); persistNotes(next); return next })
  }, [persistNotes])

  // Sync editor DOM only on note switch
  useEffect(() => {
    if (!editorRef.current) return
    const note = notes.find(n=>n.id===activeId)
    if (!note) return
    if (activeIdRef.current !== activeId) {
      editorRef.current.innerHTML = note.content || ''
      activeIdRef.current = activeId
    }
  }, [activeId, notes])

  const createNote = (parentId=null) => {
    const note=EMPTY_NOTE(parentId)
    setNotes(prev=>{const next=[note,...prev];persistNotes(next);return next})
    setActiveId(note.id)
  }
  const deleteNote = id => {
    setNotes(prev=>{const next=prev.filter(n=>n.id!==id&&n.parentId!==id);persistNotes(next);if(activeId===id)setActiveId(next[0]?.id||null);return next})
  }
  const duplicateNote = id => {
    const src=notes.find(n=>n.id===id); if(!src)return
    const dup={...src,id:genId(),title:src.title+' (copie)',createdAt:now(),updatedAt:now(),pinned:false}
    setNotes(prev=>{const next=[dup,...prev];persistNotes(next);return next}); setActiveId(dup.id)
  }

  const handleAttach = async e => {
    const files=Array.from(e.target.files), MAX=300*1024*1024
    for(const file of files){
      if(file.size>MAX){alert(`${file.name} dépasse 300MB`);continue}
      const reader=new FileReader()
      reader.onload=ev=>{
        const att={id:genId(),name:file.name,size:file.size,type:file.type,dataUrl:ev.target.result}
        const note=notes.find(n=>n.id===activeId); if(!note)return
        updateNote(activeId,{attachments:[...(note.attachments||[]),att]})
      }
      reader.readAsDataURL(file)
    }
    e.target.value=''
  }

  const handleImport = async e => {
    const file=e.target.files[0]; if(!file)return
    try{
      const arr=JSON.parse(await file.text())
      const a=Array.isArray(arr)?arr:[arr]
      setNotes(prev=>{const next=[...a,...prev];persistNotes(next);return next}); setActiveId(a[0]?.id||null)
    }catch{alert('JSON invalide')}
    e.target.value=''
  }

  const fmt = (cmd, val) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    setTimeout(()=>{ if(editorRef.current&&activeId) updateNote(activeId,{content:editorRef.current.innerHTML}) },50)
  }

  const fmtTextColor = color => {
    editorRef.current?.focus()
    document.execCommand('foreColor', false, color)
    setTimeout(()=>{ if(editorRef.current&&activeId) updateNote(activeId,{content:editorRef.current.innerHTML}) },50)
  }

  const filtered = notes
    .filter(n=>{
      if(filterType==='pinned'&&!n.pinned)return false
      if(filterType==='starred'&&!n.starred)return false
      if(filterTag&&!n.tags.includes(filterTag))return false
      if(search){const q=search.toLowerCase();return n.title.toLowerCase().includes(q)||n.content.toLowerCase().includes(q)||n.tags.some(t=>t.includes(q))}
      return true
    })
    .sort((a,b)=>{if(a.pinned&&!b.pinned)return -1;if(!a.pinned&&b.pinned)return 1;return new Date(b.updatedAt)-new Date(a.updatedAt)})

  const active   = notes.find(n=>n.id===activeId)
  const allTags  = [...new Set(notes.flatMap(n=>n.tags))]
  const totalSize= notes.reduce((s,n)=>s+(n.attachments||[]).reduce((a,f)=>a+f.size,0),0)
  const lightBg  = isLight(active?.color)

  const TEXT_COLORS = [
    '#e2e8f0','#94a3b8','#64748b','#f87171','#fb923c','#fbbf24',
    '#4ade80','#34d399','#38bdf8','#818cf8','#e879f9','#f472b6',
    '#1e293b','#0f172a','#7c3aed','#dc2626','#ea580c','#ca8a04',
  ]
  const NOTE_BG_COLORS = [
    {label:'Indigo',value:'#1e1b4b'},{label:'Navy',value:'#0c2340'},{label:'Forest',value:'#14291a'},
    {label:'Crimson',value:'#2d1515'},{label:'Midnight',value:'#1a1a2e'},{label:'Espresso',value:'#1c1917'},
    {label:'Violet',value:'#2e1065'},{label:'Ocean',value:'#0c4a6e'},{label:'Pine',value:'#14532d'},
    {label:'Rose',value:'#4c0519'},{label:'Amber',value:'#451a03'},{label:'Slate',value:'#1e293b'},
    {label:'Lavande',value:'#ede9fe'},{label:'Ciel',value:'#e0f2fe'},{label:'Menthe',value:'#dcfce7'},
    {label:'Blush',value:'#fce7f3'},{label:'Citron',value:'#fefce8'},{label:'Pêche',value:'#fff7ed'},
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Syne:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        :root { --bg:#08090d;--surface:#0f1117;--surface2:#161820;--border:#1e2130;--border2:#252840;--text:#e2e8f0;--muted:#64748b;--accent:#818cf8;--accent2:#a78bfa;--success:#34d399;--warn:#fbbf24; }
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg)}
        .notes-root{display:flex;height:100vh;background:var(--bg);font-family:'Syne',sans-serif;color:var(--text);overflow:hidden}
        .sidebar{width:280px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--surface);transition:width .2s;overflow:hidden}
        .sidebar.closed{width:0}
        .editor-pane{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .note-list{flex:1;overflow-y:auto}
        .note-list::-webkit-scrollbar{width:3px}
        .note-list::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}
        .note-item{padding:11px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
        .note-item:hover{background:var(--surface2)}
        .note-item.active{background:var(--surface2);border-left:2px solid var(--accent)}
        .note-title-input{background:transparent;border:none;outline:none;font-family:'Instrument Serif',Georgia,serif;font-size:26px;color:var(--text);width:100%;padding:0;line-height:1.3}
        .note-title-input::placeholder{color:var(--muted)}
        .editor-content{outline:none;font-size:15px;line-height:1.8;color:#cbd5e1;font-family:'Syne',sans-serif;word-break:break-word;direction:ltr;text-align:left;unicode-bidi:plaintext;min-height:200px}
        .editor-content:empty::before{content:attr(data-placeholder);color:var(--muted);pointer-events:none;display:block}
        .editor-content h1{font-family:'Instrument Serif',Georgia,serif;font-size:2em;color:var(--text);margin:.5em 0 .25em}
        .editor-content h2{font-family:'Instrument Serif',Georgia,serif;font-size:1.4em;color:#94a3b8;margin:.5em 0 .25em}
        .editor-content blockquote{border-left:3px solid var(--accent);margin:1em 0;padding-left:1em;color:#94a3b8;font-style:italic}
        .editor-content code{font-family:'JetBrains Mono',monospace;background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:1px 6px;font-size:.85em;color:var(--accent2)}
        .editor-content a{color:var(--accent);text-decoration:underline}
        .tag-pill{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600;letter-spacing:.03em;border:1px solid}
        .toolbar-btn{background:transparent;border:1px solid transparent;border-radius:6px;padding:5px 7px;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:4px;font-size:12px;font-family:'Syne',sans-serif;transition:all .15s;white-space:nowrap}
        .toolbar-btn:hover{color:var(--text);border-color:var(--border2);background:var(--surface2)}
        .icon-btn{background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:6px;padding:6px;transition:all .15s;color:var(--muted)}
        .icon-btn:hover{color:var(--text);background:var(--surface2)}
        .attachment-chip{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;font-size:12px;cursor:pointer;transition:border-color .15s}
        .attachment-chip:hover{border-color:var(--accent)}
        .grid-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:8px}
        .grid-card:hover{border-color:var(--border2);transform:translateY(-1px)}
        .grid-card.active{border-color:var(--accent)}
        .export-menu{position:absolute;top:36px;right:0;background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:6px;z-index:50;min-width:190px}
        .export-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:7px;cursor:pointer;font-size:13px;color:var(--muted);transition:all .15s}
        .export-item:hover{background:var(--border);color:var(--text)}
        input[type=text],input[type=search],textarea{background:var(--surface2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:'Syne',sans-serif;outline:none}
        input[type=text]:focus,input[type=search]:focus{border-color:var(--accent)}
        .scrollbar-thin::-webkit-scrollbar{width:3px;height:3px}
        .scrollbar-thin::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}
      `}</style>

      <div className="notes-root">
        {/* ── Sidebar ── */}
        <div className={`sidebar ${sidebarOpen?'':'closed'}`}>
          <div style={{padding:'16px 14px 12px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:28,height:28,background:'linear-gradient(135deg,#818cf8,#a78bfa)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Layers size={14} color="#fff"/>
                </div>
                <span style={{fontWeight:700,fontSize:15,letterSpacing:'-.01em'}}>Vanta</span>
              </div>
              <div style={{display:'flex',gap:2}}>
                <button className="icon-btn" title="Calendrier" onClick={()=>setShowCal(true)}><Calendar size={15}/></button>
                <button className="icon-btn" title="Assistant IA" onClick={()=>setShowAI(v=>!v)} style={showAI?{color:'#818cf8'}:{}}><Bot size={15}/></button>
                <button className="icon-btn" onClick={()=>createNote()} title="Nouvelle note"><Plus size={16}/></button>
                <button className="icon-btn" onClick={()=>importRef.current?.click()} title="Importer JSON"><Upload size={14}/></button>
                <input ref={importRef} type="file" accept=".json" hidden onChange={handleImport}/>
              </div>
            </div>
            <div style={{position:'relative'}}>
              <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
              <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…"
                style={{width:'100%',padding:'7px 10px 7px 30px',fontSize:13}}/>
            </div>
          </div>

          {/* Filters */}
          <div style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',flexShrink:0,display:'flex',gap:4,flexWrap:'wrap'}}>
            {[{key:'all',label:'Tout'},{key:'pinned',label:'Épinglées'},{key:'starred',label:'Étoilées'}].map(f=>(
              <button key={f.key} onClick={()=>setFilterType(f.key)} className="toolbar-btn"
                style={{fontSize:10,padding:'3px 8px',...(filterType===f.key?{color:'var(--accent)',borderColor:'var(--accent)',background:'#818cf810'}:{})}}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Tags */}
          {allTags.length>0&&(
            <div style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {allTags.map(tag=>{
                  const c=COLOR_TAGS.find(t=>t.name===tag)?.color||'#818cf8'
                  return <button key={tag} onClick={()=>setFilterTag(filterTag===tag?null:tag)}
                    style={{background:filterTag===tag?c+'22':'transparent',border:`1px solid ${filterTag===tag?c:'var(--border2)'}`,borderRadius:99,padding:'2px 9px',fontSize:10,color:filterTag===tag?c:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                    <Hash size={8}/>{tag}
                  </button>
                })}
              </div>
            </div>
          )}

          {/* View toggle */}
          <div style={{padding:'7px 14px',borderBottom:'1px solid var(--border)',display:'flex',gap:3,flexShrink:0}}>
            {[{key:'list',icon:<List size={13}/>},{key:'grid',icon:<Grid size={13}/>},{key:'map',icon:<Map size={13}/>}].map(v=>(
              <button key={v.key} onClick={()=>setView(v.key)} className="toolbar-btn"
                style={{flex:1,justifyContent:'center',...(view===v.key?{color:'var(--accent)',borderColor:'var(--accent)',background:'#818cf810'}:{})}}>
                {v.icon}
              </button>
            ))}
          </div>

          {/* Note list */}
          <div className="note-list">
            {filtered.length===0&&<div style={{padding:'40px 20px',textAlign:'center',color:'var(--muted)',fontSize:13}}>{search?'Aucun résultat':'Aucune note'}</div>}
            {filtered.map(note=>(
              <div key={note.id} className={`note-item ${activeId===note.id?'active':''}`}
                style={{background:note.color?note.color+'30':undefined}}
                onClick={()=>setActiveId(note.id)}>
                <div style={{display:'flex',alignItems:'flex-start',gap:6}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
                      {note.pinned&&<Pin size={9} style={{color:'var(--warn)',flexShrink:0}}/>}
                      {note.starred&&<Star size={9} style={{color:'#fbbf24',flexShrink:0}}/>}
                      {(note.tasks||[]).filter(t=>!t.done).length>0&&<span style={{fontSize:9,background:'#f59e0b30',color:'#f59e0b',borderRadius:99,padding:'0 5px',flexShrink:0}}>✓{(note.tasks||[]).filter(t=>!t.done).length}</span>}
                      <span style={{fontSize:12,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:"'Instrument Serif',serif"}}>
                        {note.title||'Sans titre'}
                      </span>
                    </div>
                    <p style={{fontSize:10,color:'var(--muted)',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',lineHeight:1.5}}>
                      {note.content.replace(/<[^>]*>/g,'').slice(0,80)||'Pas de contenu'}
                    </p>
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4,flexWrap:'wrap'}}>
                      <span style={{fontSize:9,color:'var(--muted)'}}>{fmtDate(note.updatedAt)}</span>
                      {note.attachments?.length>0&&<span style={{fontSize:9,color:'var(--muted)',display:'flex',alignItems:'center',gap:1}}><Paperclip size={8}/>{note.attachments.length}</span>}
                      {note.calendarEvents?.length>0&&<span style={{fontSize:9,color:'#818cf8',display:'flex',alignItems:'center',gap:1}}><Calendar size={8}/>{note.calendarEvents.length}</span>}
                      {note.tags.slice(0,2).map(t=>{const c=COLOR_TAGS.find(x=>x.name===t)?.color||'#818cf8';return<span key={t} style={{fontSize:8,color:c,background:c+'18',borderRadius:99,padding:'0 5px'}}>{t}</span>})}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{padding:'8px 14px',borderTop:'1px solid var(--border)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:10,color:'var(--muted)'}}>
              <span>{notes.length} notes · {fmtSize(totalSize)}</span>
              <div style={{display:'flex',alignItems:'center',gap:3}}>
                {saved?<><Check size={10} style={{color:'var(--success)'}}/> Sauvegardé</>:<><RefreshCw size={10}/> Sauvegarde…</>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Editor / Map / Grid pane ── */}
        <div className="editor-pane">
          {view==='map' ? (
            <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',height:'100%'}}>
              <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                <button className="icon-btn" onClick={()=>setSidebarOpen(v=>!v)}><AlignLeft size={16}/></button>
                <span style={{fontSize:13,fontWeight:600,color:'var(--muted)'}}>
                  Plan — <span style={{color:'var(--accent)'}}>{notes.length}</span> notes
                  <span style={{color:'#334155',fontSize:10,marginLeft:8}}>Dbl-clic = ouvrir · Clic = liens · Clic droit = menu</span>
                </span>
              </div>
              <MindMapCanvas notes={notes} activeId={activeId}
                onSelect={id=>{setActiveId(id);setView('list')}}
                onUpdateNote={updateNote} onCreateChild={createNote} onDeleteNote={deleteNote}/>
            </div>

          ) : view==='grid' && !activeId ? (
            <div style={{flex:1,overflow:'auto',padding:24}} className="scrollbar-thin">
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
                <div onClick={()=>createNote()} style={{background:'var(--surface)',border:'1px dashed var(--border2)',borderRadius:12,padding:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,color:'var(--muted)',fontSize:13,minHeight:100}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>
                  <Plus size={16}/> Nouvelle note
                </div>
                {filtered.map(note=>(
                  <div key={note.id} className={`grid-card ${activeId===note.id?'active':''}`}
                    style={{background:note.color||'var(--surface)',minHeight:100}} onClick={()=>setActiveId(note.id)}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      {note.pinned&&<Pin size={10} style={{color:'var(--warn)'}}/>}
                      <span style={{fontFamily:"'Instrument Serif',serif",fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{note.title||'Sans titre'}</span>
                    </div>
                    <p style={{fontSize:11,color:isLight(note.color)?'#374151':'#94a3b8',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden',lineHeight:1.6}}>
                      {note.content.replace(/<[^>]*>/g,'').slice(0,120)}
                    </p>
                    {(note.tasks||[]).filter(t=>!t.done).length>0&&(
                      <div style={{fontSize:10,color:'#f59e0b',display:'flex',alignItems:'center',gap:4}}>
                        <CheckSquare size={10}/> {(note.tasks||[]).filter(t=>!t.done).length} tâche(s)
                      </div>
                    )}
                    <span style={{fontSize:9,color:'var(--muted)',marginTop:'auto'}}>{fmtDate(note.updatedAt)}</span>
                  </div>
                ))}
              </div>
            </div>

          ) : active ? (
            <div style={{flex:1,display:'flex',overflow:'hidden'}}>
              {/* Editor column */}
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                {/* Toolbar */}
                <div style={{padding:'6px 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:4,flexShrink:0,flexWrap:'wrap',background:'var(--surface)'}}>
                  <button className="icon-btn" onClick={()=>setSidebarOpen(v=>!v)}><AlignLeft size={16}/></button>
                  <div style={{width:1,background:'var(--border)',height:20,margin:'0 2px'}}/>
                  {/* Text format */}
                  <button className="toolbar-btn" onClick={()=>fmt('bold')} title="Gras"><Bold size={13}/></button>
                  <button className="toolbar-btn" onClick={()=>fmt('italic')} title="Italique"><Italic size={13}/></button>
                  <button className="toolbar-btn" onClick={()=>fmt('underline')} title="Souligné"><Underline size={13}/></button>
                  <button className="toolbar-btn" onClick={()=>fmt('strikeThrough')} title="Barré" style={{fontSize:12,fontWeight:700,textDecoration:'line-through',color:'var(--muted)'}}>S</button>
                  <button className="toolbar-btn" onClick={()=>fmt('formatBlock','h1')}><Heading1 size={13}/></button>
                  <button className="toolbar-btn" onClick={()=>fmt('formatBlock','h2')}><Heading2 size={13}/></button>
                  <button className="toolbar-btn" onClick={()=>fmt('formatBlock','blockquote')}><Quote size={13}/></button>
                  <button className="toolbar-btn" onClick={()=>{const url=prompt('URL:');if(url)fmt('createLink',url)}}><Link2 size={13}/></button>
                  <div style={{width:1,background:'var(--border)',height:20,margin:'0 2px'}}/>

                  {/* Text color */}
                  <div style={{position:'relative'}}>
                    <button className="toolbar-btn" onClick={()=>{setShowTxtPicker(v=>!v);setShowBgPicker(false)}} title="Couleur du texte">
                      <Type size={13}/>
                      <div style={{width:12,height:3,background:active.textColor||'var(--text)',borderRadius:1,position:'absolute',bottom:4,left:'50%',transform:'translateX(-50%)'}}/>
                    </button>
                    {showTxtPicker&&(
                      <div style={{position:'absolute',top:38,left:0,background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:10,padding:10,zIndex:100,boxShadow:'0 8px 32px rgba(0,0,0,.5)',width:200}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                          <span style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>Couleur du texte</span>
                          <button onClick={()=>setShowTxtPicker(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--muted)',display:'flex'}}><X size={12}/></button>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5,marginBottom:8}}>
                          {TEXT_COLORS.map(c=>(
                            <div key={c} onClick={()=>{fmtTextColor(c);setShowTxtPicker(false)}}
                              style={{width:'100%',aspectRatio:'1',borderRadius:5,background:c,cursor:'pointer',border:'1px solid rgba(255,255,255,.1)',transition:'transform .1s'}}
                              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'}
                              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
                          ))}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6,borderTop:'1px solid var(--border)',paddingTop:8}}>
                          <span style={{fontSize:10,color:'var(--muted)'}}>Perso</span>
                          <input type="color" defaultValue="#e2e8f0" onChange={e=>{fmtTextColor(e.target.value)}}
                            style={{width:32,height:24,borderRadius:4,border:'1px solid var(--border2)',background:'transparent',cursor:'pointer',padding:0}}/>
                          <button onClick={()=>{fmt('removeFormat');setShowTxtPicker(false)}} style={{fontSize:10,background:'transparent',border:'1px solid var(--border2)',borderRadius:5,padding:'3px 7px',color:'var(--muted)',cursor:'pointer',fontFamily:'Syne,sans-serif'}}>
                            <RotateCcw size={9}/> Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Background color */}
                  <div style={{position:'relative'}}>
                    <button className="toolbar-btn" onClick={()=>{setShowBgPicker(v=>!v);setShowTxtPicker(false)}}
                      title="Fond" style={active.color?{borderColor:active.color}:{}}>
                      <Palette size={13}/>
                      <div style={{width:10,height:10,borderRadius:2,background:active.color||'transparent',border:active.color?`2px solid ${active.color}`:'2px dashed var(--muted)'}}/>
                    </button>
                    {showBgPicker&&(
                      <div style={{position:'absolute',top:38,left:0,background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:12,padding:12,zIndex:100,width:240,boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                          <span style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>Couleur de fond</span>
                          <button onClick={()=>setShowBgPicker(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--muted)',display:'flex'}}><X size={12}/></button>
                        </div>
                        <button onClick={()=>{updateNote(active.id,{color:null});setShowBgPicker(false)}}
                          style={{width:'100%',padding:'5px 10px',background:!active.color?'#818cf820':'transparent',border:`1px solid ${!active.color?'var(--accent)':'var(--border2)'}`,borderRadius:7,cursor:'pointer',color:'var(--muted)',fontSize:11,display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                          <div style={{width:14,height:14,borderRadius:3,border:'2px dashed var(--muted)'}}/> Aucune couleur
                        </button>
                        <p style={{fontSize:9,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',marginBottom:5}}>Sombres</p>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5,marginBottom:10}}>
                          {NOTE_BG_COLORS.slice(0,12).map(c=>(
                            <div key={c.value} onClick={()=>{updateNote(active.id,{color:c.value});setShowBgPicker(false)}} title={c.label}
                              style={{width:'100%',aspectRatio:'1',borderRadius:6,background:c.value,border:`2px solid ${active.color===c.value?'var(--accent)':'transparent'}`,cursor:'pointer'}}
                              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
                          ))}
                        </div>
                        <p style={{fontSize:9,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',marginBottom:5}}>Clairs</p>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:5,marginBottom:10}}>
                          {NOTE_BG_COLORS.slice(12).map(c=>(
                            <div key={c.value} onClick={()=>{updateNote(active.id,{color:c.value});setShowBgPicker(false)}} title={c.label}
                              style={{width:'100%',aspectRatio:'1',borderRadius:6,background:c.value,border:`2px solid ${active.color===c.value?'#6366f1':'#ccc3'}`,cursor:'pointer'}}
                              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
                          ))}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6,borderTop:'1px solid var(--border)',paddingTop:8}}>
                          <span style={{fontSize:10,color:'var(--muted)'}}>Perso</span>
                          <input type="color" value={active.color||'#1e1b4b'} onChange={e=>updateNote(active.id,{color:e.target.value})}
                            style={{width:32,height:24,borderRadius:4,border:'1px solid var(--border2)',background:'transparent',cursor:'pointer',padding:0}}/>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{width:1,background:'var(--border)',height:20,margin:'0 2px'}}/>
                  <button className="toolbar-btn" onClick={()=>updateNote(active.id,{pinned:!active.pinned})}
                    style={active.pinned?{color:'var(--warn)',borderColor:'var(--warn)'}:{}}>
                    <Pin size={13}/> {active.pinned?'Épinglée':'Épingler'}
                  </button>
                  <button className="toolbar-btn" onClick={()=>updateNote(active.id,{starred:!active.starred})}
                    style={active.starred?{color:'#fbbf24',borderColor:'#fbbf24'}:{}}>
                    <Star size={13}/>
                  </button>
                  <button className="toolbar-btn" onClick={()=>createNote(active.id)}>
                    <ChevronRight size={13}/> Sous-note
                  </button>
                  <button className="toolbar-btn" onClick={()=>fileInput.current?.click()}>
                    <Paperclip size={13}/> Joindre
                  </button>
                  <input ref={fileInput} type="file" multiple hidden onChange={handleAttach}/>
                  <button className="toolbar-btn" onClick={()=>setShowCal(true)}>
                    <Calendar size={13}/> Calendrier
                  </button>

                  <div style={{marginLeft:'auto',display:'flex',gap:4}}>
                    <button className="toolbar-btn" onClick={()=>setShowAI(v=>!v)} style={showAI?{color:'var(--accent)',borderColor:'var(--accent)'}:{}}>
                      <Sparkles size={13}/> IA
                    </button>
                    <div style={{position:'relative'}}>
                      <button className="toolbar-btn" onClick={()=>setShowExport(v=>!v)}>
                        <Download size={13}/> Export <ChevronDown size={11}/>
                      </button>
                      {showExport&&(
                        <div className="export-menu">
                          {[
                            {label:'Markdown',icon:<FileText size={12}/>,action:()=>exportMD(active)},
                            {label:'JSON (toutes les notes)',icon:<Layers size={12}/>,action:()=>exportJSON(notes)},
                          ].map(item=>(
                            <div key={item.label} className="export-item" onClick={()=>{item.action();setShowExport(false)}}>
                              {item.icon}{item.label}
                            </div>
                          ))}
                          {active.attachments?.length>0&&active.attachments.map(att=>(
                            <div key={att.id} className="export-item" onClick={()=>{downloadAtt(att);setShowExport(false)}}>
                              {fileIcon(att.type)}{att.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="icon-btn" onClick={()=>duplicateNote(active.id)}><Copy size={13}/></button>
                    <button className="icon-btn" onClick={()=>{if(confirm('Supprimer cette note ?'))deleteNote(active.id)}} style={{color:'#f87171'}}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>

                {/* Editor body */}
                <div style={{flex:1,overflow:'auto',padding:'28px 40px',background:active.color||undefined,transition:'background .2s'}} className="scrollbar-thin"
                  onClick={()=>{setShowExport(false);setShowBgPicker(false);setShowTxtPicker(false)}}>
                  <input className="note-title-input" value={active.title}
                    onChange={e=>updateNote(active.id,{title:e.target.value})}
                    placeholder="Sans titre"
                    style={{color:lightBg?'#1e1b4b':'var(--text)'}}/>

                  {/* Meta row */}
                  <div style={{display:'flex',alignItems:'center',gap:8,margin:'10px 0 20px',flexWrap:'wrap'}}>
                    <span style={{fontSize:10,color:lightBg?'#374151':'var(--muted)',display:'flex',alignItems:'center',gap:3}}>
                      <Clock size={9}/> {fmtDate(active.createdAt)}
                    </span>
                    {active.parentId&&(
                      <button onClick={()=>setActiveId(active.parentId)}
                        style={{fontSize:10,color:'var(--accent)',background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                        <ArrowLeft size={9}/> Note parente
                      </button>
                    )}
                    {active.calendarEvents?.length>0&&(
                      <span style={{fontSize:10,color:'#818cf8',display:'flex',alignItems:'center',gap:3,cursor:'pointer'}} onClick={()=>setShowCal(true)}>
                        <Calendar size={9}/> {active.calendarEvents.length} événement(s)
                      </span>
                    )}
                    {active.tags.map(tag=>{
                      const c=COLOR_TAGS.find(t=>t.name===tag)?.color||'#818cf8'
                      return (
                        <span key={tag} className="tag-pill" style={{color:c,borderColor:c+'40',background:c+'12'}}>
                          <Hash size={8}/>{tag}
                          <X size={8} style={{cursor:'pointer'}} onClick={()=>updateNote(active.id,{tags:active.tags.filter(t=>t!==tag)})}/>
                        </span>
                      )
                    })}
                    <form onSubmit={e=>{e.preventDefault();const t=tagInput.trim().toLowerCase().replace(/\s+/g,'-');if(t&&!active.tags.includes(t))updateNote(active.id,{tags:[...active.tags,t]});setTagInput('')}}>
                      <input value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="+ tag"
                        style={{width:tagInput?90:48,fontSize:10,padding:'2px 8px',transition:'width .2s',border:'1px solid var(--border2)',borderRadius:99,background:'transparent',color:lightBg?'#1e1b4b':'var(--text)'}}/>
                    </form>
                  </div>

                  {/* Rich editor */}
                  <div ref={editorRef} contentEditable suppressContentEditableWarning
                    className="editor-content" data-placeholder="Commencez à écrire…"
                    onInput={e=>updateNote(activeId,{content:e.currentTarget.innerHTML})}
                    style={{color:lightBg?'#1e1b4b':'#cbd5e1'}}/>

                  {/* Tasks */}
                  <TaskList
                    tasks={active.tasks||[]}
                    noteId={active.id}
                    onUpdate={tasks=>updateNote(active.id,{tasks})}
                    isLight={lightBg}/>

                  {/* Calendar events of this note */}
                  {active.calendarEvents?.length>0&&(
                    <div style={{marginTop:24}}>
                      <p style={{fontSize:11,color:lightBg?'#374151':'#64748b',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                        <Calendar size={12}/> Événements ({active.calendarEvents.length})
                      </p>
                      <div style={{display:'flex',flexDirection:'column',gap:4}}>
                        {active.calendarEvents.map(e=>(
                          <div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 10px',background:lightBg?'rgba(0,0,0,.06)':'#0f1117',border:`1px solid ${lightBg?'rgba(0,0,0,.1)':'#1e2130'}`,borderRadius:8}}>
                            <Calendar size={12} style={{color:'#818cf8',flexShrink:0}}/>
                            <div style={{flex:1}}>
                              <span style={{fontSize:12,color:lightBg?'#1e1b4b':'#e2e8f0',fontWeight:600}}>{e.title}</span>
                              <span style={{fontSize:10,color:lightBg?'#374151':'#475569',marginLeft:8}}>{e.date}{e.time?' — '+e.time:''}</span>
                            </div>
                            <button onClick={()=>updateNote(active.id,{calendarEvents:active.calendarEvents.filter(ev=>ev.id!==e.id)})}
                              style={{background:'transparent',border:'none',cursor:'pointer',color:'#334155',display:'flex'}}>
                              <X size={11}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-notes */}
                  {notes.filter(n=>n.parentId===active.id).length>0&&(
                    <div style={{marginTop:24}}>
                      <p style={{fontSize:11,color:lightBg?'#374151':'#64748b',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                        <ChevronRight size={12}/> Sous-notes ({notes.filter(n=>n.parentId===active.id).length})
                      </p>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
                        {notes.filter(n=>n.parentId===active.id).map(child=>(
                          <div key={child.id} onClick={()=>setActiveId(child.id)}
                            style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:10,padding:'10px 14px',cursor:'pointer'}}
                            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>
                            <p style={{fontSize:12,fontWeight:600,fontFamily:"'Instrument Serif',serif",marginBottom:3}}>{child.title||'Sans titre'}</p>
                            <p style={{fontSize:10,color:'var(--muted)',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{child.content.replace(/<[^>]*>/g,'').slice(0,80)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {active.attachments?.length>0&&(
                    <div style={{marginTop:24,paddingTop:18,borderTop:`1px solid ${lightBg?'rgba(0,0,0,.1)':'var(--border)'}`}}>
                      <p style={{fontSize:11,color:lightBg?'#374151':'#64748b',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                        <Paperclip size={12}/> Pièces jointes ({active.attachments.length})
                      </p>
                      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                        {active.attachments.map(att=>(
                          <div key={att.id} className="attachment-chip" onClick={()=>downloadAtt(att)}>
                            {fileIcon(att.type)}
                            <div style={{minWidth:0}}>
                              <p style={{fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:150}}>{att.name}</p>
                              <p style={{color:'var(--muted)',fontSize:10}}>{fmtSize(att.size)}</p>
                            </div>
                            <button onClick={e=>{e.stopPropagation();updateNote(active.id,{attachments:active.attachments.filter(a=>a.id!==att.id)})}}
                              style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--muted)',display:'flex',marginLeft:4}}>
                              <X size={11}/>
                            </button>
                          </div>
                        ))}
                      </div>
                      {active.attachments.filter(a=>a.type?.startsWith('image/')).length>0&&(
                        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10}}>
                          {active.attachments.filter(a=>a.type?.startsWith('image/')).map(att=>(
                            <img key={att.id} src={att.dataUrl} alt={att.name}
                              style={{maxWidth:180,maxHeight:130,borderRadius:8,border:'1px solid var(--border2)',objectFit:'cover',cursor:'pointer'}}
                              onClick={()=>window.open(att.dataUrl,'_blank')}/>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Panel */}
              {showAI&&(
                <AIPanel
                  notes={notes}
                  activeNote={active}
                  onAddNote={content=>{
                    const note=EMPTY_NOTE()
                    note.title='Réponse IA — '+new Date().toLocaleDateString('fr-FR')
                    note.content='<p>'+content.replace(/\n/g,'</p><p>')+'</p>'
                    setNotes(prev=>{const next=[note,...prev];persistNotes(next);return next})
                    setActiveId(note.id)
                  }}
                  onClose={()=>setShowAI(false)}/>
              )}
            </div>

          ) : (
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
              <div style={{width:56,height:56,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Layers size={24} style={{color:'var(--muted)'}}/>
              </div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:15,fontWeight:600,marginBottom:4}}>Aucune note sélectionnée</p>
                <p style={{fontSize:13,color:'var(--muted)'}}>Choisissez une note ou créez-en une nouvelle</p>
              </div>
              <button onClick={()=>createNote()} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',background:'var(--accent)',border:'none',borderRadius:8,color:'#fff',fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                <Plus size={15}/> Nouvelle note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Modal */}
      {showCal&&<CalendarModal notes={notes} onUpdateNote={updateNote} onClose={()=>setShowCal(false)}/>}
    </>
  )
}