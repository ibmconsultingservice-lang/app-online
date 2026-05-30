'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'mgmt_projects_v1'

const QUADRANTS = {
  Q1: { id:'Q1', label:'Urgent & Important',      shortLabel:'Q1 — FAIRE',     icon:'🔴', action:'FAIRE MAINTENANT',  color:'#f87171', bg:'rgba(248,113,113,.12)', border:'rgba(248,113,113,.3)',  desc:'Crises, deadlines critiques — exécuter immédiatement' },
  Q2: { id:'Q2', label:'Important, Non urgent',   shortLabel:'Q2 — PLANIFIER', icon:'🟢', action:'PLANIFIER',         color:'#34d399', bg:'rgba(52,211,153,.12)',  border:'rgba(52,211,153,.3)',   desc:'Stratégie, croissance — bloquer du temps en agenda' },
  Q3: { id:'Q3', label:'Urgent, Non important',   shortLabel:'Q3 — DÉLÉGUER',  icon:'🔵', action:'DÉLÉGUER',          color:'#60a5fa', bg:'rgba(96,165,250,.12)',  border:'rgba(96,165,250,.3)',   desc:'Interruptions, tâches périphériques — déléguer' },
  Q4: { id:'Q4', label:'Ni urgent ni important',  shortLabel:'Q4 — ÉLIMINER',  icon:'⚪', action:'ÉLIMINER',          color:'#9896aa', bg:'rgba(152,150,170,.09)', border:'rgba(152,150,170,.22)', desc:'Distractions, activités sans valeur — supprimer' },
}

const CATEGORIES = ['Client','Technique','RH','Stratégie','Admin','Communication','Finance','Marketing','Opérations','Général']
const STATUSES   = [{ v:'todo', label:'À faire', color:'#9896aa' },{ v:'doing', label:'En cours', color:'#facc15' },{ v:'done', label:'Terminé', color:'#34d399' }]

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    name:'Sombre', id:'dark',
    bg:'#0a0a0f', surface:'#111118', surface2:'#18181f', surface3:'#1e1e28',
    border:'rgba(255,255,255,.07)', border2:'rgba(255,255,255,.12)',
    text:'#f0eff5', muted:'#6b6a7a', muted2:'#9896aa',
    accent:'#6366f1', accent2:'#818cf8',
  },
  midnight: {
    name:'Minuit', id:'midnight',
    bg:'#060610', surface:'#0d0d1f', surface2:'#13132e', surface3:'#1a1a3a',
    border:'rgba(129,140,248,.1)', border2:'rgba(129,140,248,.18)',
    text:'#e8e8ff', muted:'#5a5a8a', muted2:'#8888bb',
    accent:'#7c3aed', accent2:'#a78bfa',
  },
  forest: {
    name:'Forêt', id:'forest',
    bg:'#060f0a', surface:'#0d1a12', surface2:'#12221a', surface3:'#172b21',
    border:'rgba(52,211,153,.08)', border2:'rgba(52,211,153,.16)',
    text:'#e8f5ee', muted:'#4a6a58', muted2:'#7aaa90',
    accent:'#059669', accent2:'#34d399',
  },
  slate: {
    name:'Ardoise', id:'slate',
    bg:'#0f1117', surface:'#171b26', surface2:'#1e2333', surface3:'#252c40',
    border:'rgba(255,255,255,.06)', border2:'rgba(255,255,255,.1)',
    text:'#e2e8f0', muted:'#64748b', muted2:'#94a3b8',
    accent:'#3b82f6', accent2:'#60a5fa',
  },
  amber: {
    name:'Ambre', id:'amber',
    bg:'#0f0900', surface:'#1a1200', surface2:'#221900', surface3:'#2a2000',
    border:'rgba(251,191,36,.08)', border2:'rgba(251,191,36,.15)',
    text:'#fef3c7', muted:'#78600a', muted2:'#b8960a',
    accent:'#d97706', accent2:'#fbbf24',
  },
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const EMPTY_TASK = () => ({
  id: uid(), title: '', description: '', quadrant: 'Q2',
  urgency: 5, importance: 7, estimatedTime: 60,
  deadline: '', assignee: '', category: 'Général',
  status: 'todo', priority: 1, createdAt: new Date().toISOString(),
})

// ── Health score color ─────────────────────────────────────────────────────────
const healthColor = (s) => s >= 80 ? '#34d399' : s >= 60 ? '#facc15' : s >= 40 ? '#fb923c' : '#f87171'

// ─── AI Generate Panel ────────────────────────────────────────────────────────
function AIGeneratePanel({ projectName, onGenerated, onClose, theme }) {
  const T = THEMES[theme] || THEMES.dark
  const [description, setDescription] = useState('')
  const [loading, setLoading]         = useState(false)
  const [result,  setResult]          = useState(null)
  const [error,   setError]           = useState(null)

  const generate = async () => {
    if (description.trim().length < 15) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res  = await fetch('/api/generer-management/generer-heisenhower-auto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, projectName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur API')
      setResult(json.data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const qCount = (q) => result?.tasks?.filter(t => t.quadrant === q).length || 0

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500 }}>
      <div style={{ background:T.surface, border:`1px solid ${T.accent}30`, borderRadius:20, width:680, maxHeight:'90vh', overflow:'auto', display:'flex', flexDirection:'column', boxShadow:'0 32px 64px rgba(0,0,0,.5)' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${T.border}`, background:`linear-gradient(135deg, ${T.accent}08, ${T.accent2}05)`, borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:22 }}>✦</span>
            <div>
              <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:17, color:T.accent2 }}>IA — Génération Eisenhower automatique</div>
              <div style={{ fontSize:11, color:T.muted, marginTop:2, fontFamily:'Geist Mono,monospace' }}>Décrivez votre projet, l'IA classe et priorise toutes les tâches</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:18 }}>✕</button>
        </div>

        <div style={{ padding:24, flex:1, display:'flex', flexDirection:'column', gap:18 }}>

          {/* Input */}
          {!result && (
            <div>
              <label style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', display:'block', marginBottom:8 }}>
                Description du projet / contexte
              </label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Lancement d'un nouveau produit SaaS dans 6 semaines. L'équipe de 8 personnes doit finaliser le développement backend, créer les supports marketing, former les commerciaux, gérer les retours beta-testeurs, préparer la démo investisseurs prévue dans 10 jours, corriger les bugs critiques remontés ce matin, et maintenir le support client courant..."
                style={{ width:'100%', minHeight:140, padding:'14px 16px', background:T.bg, border:`1.5px solid ${T.border2}`, borderRadius:10, color:T.text, fontSize:13, lineHeight:1.7, fontFamily:'Syne,sans-serif', resize:'vertical', outline:'none', boxSizing:'border-box' }}
              />
              <div style={{ fontSize:10, color:T.muted, textAlign:'right', marginTop:4, fontFamily:'Geist Mono,monospace' }}>{description.length} caractères</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding:12, background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)', borderRadius:8, fontSize:12, color:'#f87171', display:'flex', gap:8 }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:'center', padding:40, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
              <div style={{ width:36, height:36, border:`2px solid ${T.border2}`, borderTop:`2px solid ${T.accent}`, borderRadius:'50%', animation:'spin .8s linear infinite' }} />
              <p style={{ fontSize:13, color:T.muted2, fontFamily:'Geist Mono,monospace' }}>Classification Eisenhower en cours…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* Result preview */}
          {result && !loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ padding:16, background:`${T.accent}08`, border:`1px solid ${T.accent}25`, borderRadius:12 }}>
                <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:15, color:T.accent2, marginBottom:6 }}>✦ {result.projectTitle}</div>
                <p style={{ fontSize:12, color:T.muted2, lineHeight:1.7, margin:0 }}>{result.projectSummary}</p>
              </div>

              {/* Quadrant distribution */}
              <div>
                <div style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Répartition générée ({result.tasks.length} tâches)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {Object.entries(QUADRANTS).map(([qk, qv]) => (
                    <div key={qk} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:qv.bg, border:`1px solid ${qv.border}`, borderRadius:8 }}>
                      <span style={{ fontSize:18 }}>{qv.icon}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:qv.color }}>{qCount(qk)} tâches</div>
                        <div style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace' }}>{qv.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks preview */}
              <div>
                <div style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Aperçu des tâches</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:220, overflow:'auto' }}>
                  {result.tasks.slice(0, 12).map(t => {
                    const qv = QUADRANTS[t.quadrant]
                    return (
                      <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:T.surface2, borderRadius:6, borderLeft:`3px solid ${qv.color}` }}>
                        <span style={{ fontSize:12 }}>{qv.icon}</span>
                        <span style={{ flex:1, fontSize:12, fontWeight:600, color:T.text }}>{t.title}</span>
                        <span style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace' }}>{t.estimatedTime}min</span>
                        <span style={{ fontSize:10, color:qv.color, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{t.quadrant}</span>
                      </div>
                    )
                  })}
                  {result.tasks.length > 12 && <div style={{ fontSize:11, color:T.muted, textAlign:'center', padding:4 }}>+{result.tasks.length - 12} autres tâches…</div>}
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div>
                  <div style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Recommandations initiales</div>
                  {result.recommendations.map((r, i) => (
                    <div key={i} style={{ display:'flex', gap:8, padding:'7px 10px', marginBottom:5, background:'rgba(52,211,153,.05)', border:'1px solid rgba(52,211,153,.15)', borderRadius:7, fontSize:12, color:T.muted2 }}>
                      <span style={{ color:'#34d399', flexShrink:0 }}>→</span> {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:T.bg, borderRadius:'0 0 20px 20px' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${T.border2}`, background:'none', cursor:'pointer', fontSize:12, color:T.muted, fontFamily:'Geist Mono,monospace' }}>Annuler</button>
          <div style={{ display:'flex', gap:8 }}>
            {result && (
              <button onClick={() => { onGenerated(result); onClose() }} style={{ padding:'8px 18px', borderRadius:8, background:T.accent, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'#fff', fontFamily:'Geist Mono,monospace', display:'flex', alignItems:'center', gap:6 }}>
                ✦ Appliquer ({result.tasks.length} tâches)
              </button>
            )}
            {!result && !loading && (
              <button onClick={generate} disabled={description.trim().length < 15} style={{ padding:'8px 18px', borderRadius:8, background:description.trim().length >= 15 ? `${T.accent}20` : T.surface2, border:`1px solid ${description.trim().length >= 15 ? T.accent+'50' : T.border}`, cursor:description.trim().length >= 15 ? 'pointer' : 'not-allowed', fontSize:12, fontWeight:700, color:description.trim().length >= 15 ? T.accent2 : T.muted, fontFamily:'Geist Mono,monospace' }}>
                ✦ Générer la matrice
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Task Modal ───────────────────────────────────────────────────────────────
function TaskModal({ task, onSave, onDelete, onClose, theme }) {
  const T = THEMES[theme] || THEMES.dark
  const [form, setForm] = useState(task ? { ...task } : EMPTY_TASK())
  const isNew = !task

  // Auto-assign quadrant from scores
  useEffect(() => {
    const q = form.urgency >= 7 && form.importance >= 7 ? 'Q1'
            : form.importance >= 7 ? 'Q2'
            : form.urgency >= 7   ? 'Q3' : 'Q4'
    setForm(p => ({ ...p, quadrant: q }))
  }, [form.urgency, form.importance])

  const qv = QUADRANTS[form.quadrant]

  const inputStyle = { width:'100%', background:T.bg, border:`1px solid ${T.border2}`, borderRadius:8, padding:'9px 12px', fontFamily:'Syne,sans-serif', fontSize:13, color:T.text, outline:'none', boxSizing:'border-box', transition:'border-color .15s' }
  const labelStyle = { fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'Geist Mono,monospace', display:'block', marginBottom:5 }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:600 }}>
      <div style={{ background:T.surface, border:`1px solid ${qv.border}`, borderRadius:18, width:520, maxHeight:'92vh', overflow:'auto', boxShadow:'0 24px 48px rgba(0,0,0,.5)' }}>

        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:12, background:`${qv.bg}`, borderRadius:'18px 18px 0 0' }}>
          <span style={{ fontSize:24 }}>{qv.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:16, color:qv.color }}>{isNew ? 'Nouvelle tâche' : 'Modifier la tâche'}</div>
            <div style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace', marginTop:2 }}>{form.quadrant} — {qv.action}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:16 }}>✕</button>
        </div>

        <div style={{ padding:22, display:'flex', flexDirection:'column', gap:14 }}>

          <div>
            <label style={labelStyle}>Titre de la tâche *</label>
            <input style={inputStyle} placeholder="Verbe d'action + objet…" value={form.title} onChange={e => setForm(p => ({...p, title:e.target.value}))} />
          </div>

          <div>
            <label style={labelStyle}>Description / contexte</label>
            <textarea style={{...inputStyle, minHeight:72, resize:'vertical'}} placeholder="Pourquoi cette tâche ? Quel impact ?" value={form.description} onChange={e => setForm(p => ({...p, description:e.target.value}))} />
          </div>

          {/* Urgency / Importance sliders */}
          <div style={{ background:T.surface2, borderRadius:12, padding:16, border:`1px solid ${T.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:11, fontWeight:700, color:T.muted2, fontFamily:'Geist Mono,monospace' }}>SCORES DE CLASSIFICATION</span>
              <span style={{ fontSize:13, fontWeight:800, padding:'3px 12px', borderRadius:20, background:qv.bg, color:qv.color, border:`1px solid ${qv.border}`, fontFamily:'Geist Mono,monospace' }}>{form.quadrant} — {qv.action}</span>
            </div>
            {[
              { key:'urgency',    label:'Urgence',    desc:'Délai / Conséquences immédiates', color:'#fb923c' },
              { key:'importance', label:'Importance', desc:'Valeur ajoutée / Objectifs long terme', color:'#a78bfa' },
            ].map(({ key, label, desc, color }) => (
              <div key={key} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{label}</span>
                    <span style={{ fontSize:10, color:T.muted, marginLeft:8 }}>{desc}</span>
                  </div>
                  <span style={{ fontSize:18, fontWeight:800, fontFamily:'Geist Mono,monospace', color }}>{form[key]}</span>
                </div>
                <input type="range" min={1} max={10} value={form[key]}
                  onChange={e => setForm(p => ({...p, [key]: parseInt(e.target.value)}))}
                  style={{ width:'100%', accentColor:color, cursor:'pointer' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:T.muted, fontFamily:'Geist Mono,monospace', marginTop:2 }}>
                  <span>1 — Très faible</span><span>5 — Moyen</span><span>10 — Critique</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={labelStyle}>Temps estimé (minutes)</label>
              <input type="number" style={inputStyle} min={5} step={15} value={form.estimatedTime} onChange={e => setForm(p => ({...p, estimatedTime:parseInt(e.target.value)||60}))} />
            </div>
            <div>
              <label style={labelStyle}>Deadline</label>
              <input style={inputStyle} placeholder="J+2, 2025-06-15…" value={form.deadline} onChange={e => setForm(p => ({...p, deadline:e.target.value}))} />
            </div>
            <div>
              <label style={labelStyle}>Assigné à</label>
              <input style={inputStyle} placeholder="Nom ou rôle…" value={form.assignee} onChange={e => setForm(p => ({...p, assignee:e.target.value}))} />
            </div>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select style={inputStyle} value={form.category} onChange={e => setForm(p => ({...p, category:e.target.value}))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Statut</label>
            <div style={{ display:'flex', gap:6 }}>
              {STATUSES.map(s => (
                <button key={s.v} onClick={() => setForm(p => ({...p, status:s.v}))} style={{ flex:1, padding:'7px 0', borderRadius:8, border:`1px solid ${form.status === s.v ? s.color+'50' : T.border}`, background: form.status === s.v ? `${s.color}15` : T.surface2, color: form.status === s.v ? s.color : T.muted, fontFamily:'Geist Mono,monospace', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding:'14px 22px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {!isNew ? (
            <button onClick={() => { if (window.confirm('Supprimer cette tâche ?')) onDelete(form.id) }} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid rgba(248,113,113,.3)', color:'#f87171', background:'none', cursor:'pointer', fontSize:12, fontFamily:'Geist Mono,monospace', fontWeight:600 }}>Supprimer</button>
          ) : <div />}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${T.border2}`, background:'none', cursor:'pointer', fontSize:12, color:T.muted, fontFamily:'Geist Mono,monospace' }}>Annuler</button>
            <button onClick={() => { if (!form.title.trim()) return; onSave(form) }} style={{ padding:'8px 18px', borderRadius:8, background:qv.color, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'#fff', fontFamily:'Geist Mono,monospace' }}>
              {isNew ? 'Ajouter' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Eisenhower Matrix Visual ─────────────────────────────────────────────────
function MatrixView({ tasks, onTaskClick, onAddTask, theme, filterStatus }) {
  const T = THEMES[theme] || THEMES.dark
  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus)

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, flex:1, minHeight:0 }}>
      {['Q1','Q2','Q3','Q4'].map(qk => {
        const qv   = QUADRANTS[qk]
        const qtasks = filtered.filter(t => t.quadrant === qk).sort((a,b) => (b.urgency + b.importance) - (a.urgency + a.importance))
        return (
          <div key={qk} style={{ background:qv.bg, border:`1px solid ${qv.border}`, borderRadius:10, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            {/* Quadrant header */}
            <div style={{ padding:'10px 14px', borderBottom:`1px solid ${qv.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:`${qv.bg}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>{qv.icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:800, color:qv.color, fontFamily:'Geist Mono,monospace', letterSpacing:'.04em' }}>{qk} — {qv.action}</div>
                  <div style={{ fontSize:10, color:T.muted, marginTop:1 }}>{qv.label}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontFamily:'Geist Mono,monospace', fontWeight:700, color:qv.color, background:`${qv.color}15`, border:`1px solid ${qv.border}`, padding:'2px 8px', borderRadius:10 }}>{qtasks.length}</span>
                <button onClick={() => onAddTask(qk)} style={{ background:'none', border:`1px solid ${qv.border}`, borderRadius:6, width:24, height:24, cursor:'pointer', color:qv.color, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>+</button>
              </div>
            </div>

            {/* Tasks */}
            <div style={{ flex:1, overflow:'auto', padding:'8px', display:'flex', flexDirection:'column', gap:5 }}>
              {qtasks.length === 0 && (
                <div style={{ textAlign:'center', padding:'24px 16px', color:T.muted, fontSize:11, opacity:.5 }}>
                  Aucune tâche {filterStatus !== 'all' ? `(${filterStatus})` : ''}
                </div>
              )}
              {qtasks.map(t => {
                const st = STATUSES.find(s => s.v === t.status) || STATUSES[0]
                return (
                  <div key={t.id} onClick={() => onTaskClick(t)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:'9px 11px', cursor:'pointer', transition:'all .15s', display:'flex', flexDirection:'column', gap:5 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = qv.color+'50'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'none' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6 }}>
                      <span style={{ fontSize:12, fontWeight:700, color: t.status === 'done' ? T.muted : T.text, textDecoration: t.status === 'done' ? 'line-through' : 'none', lineHeight:1.4, flex:1 }}>{t.title}</span>
                      <span style={{ fontSize:10, color:st.color, fontFamily:'Geist Mono,monospace', fontWeight:700, padding:'1px 6px', borderRadius:4, background:`${st.color}12`, border:`1px solid ${st.color}25`, flexShrink:0 }}>{st.label}</span>
                    </div>
                    {t.description && <div style={{ fontSize:10, color:T.muted, lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{t.description}</div>}
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', color:T.muted, background:T.surface2, padding:'1px 6px', borderRadius:4, border:`1px solid ${T.border}` }}>{t.category}</span>
                      {t.estimatedTime && <span style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace' }}>⏱ {t.estimatedTime}min</span>}
                      {t.deadline && <span style={{ fontSize:10, color:'#fb923c', fontFamily:'Geist Mono,monospace' }}>📅 {t.deadline}</span>}
                      {t.assignee && <span style={{ fontSize:10, color:T.muted2 }}>👤 {t.assignee}</span>}
                    </div>
                    <div style={{ display:'flex', gap:4, marginTop:2 }}>
                      {[
                        { label:'U', val:t.urgency,    color:'#fb923c' },
                        { label:'I', val:t.importance, color:'#a78bfa' },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ display:'flex', alignItems:'center', gap:3 }}>
                          <span style={{ fontSize:9, color:T.muted, fontFamily:'Geist Mono,monospace' }}>{label}:</span>
                          <div style={{ width:40, height:3, background:T.surface2, borderRadius:2, overflow:'hidden' }}>
                            <div style={{ width:`${val * 10}%`, height:'100%', background:color, borderRadius:2 }} />
                          </div>
                          <span style={{ fontSize:9, color, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({ tasks, onTaskClick, theme, filterStatus }) {
  const T = THEMES[theme] || THEMES.dark
  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus)
  const sorted   = [...filtered].sort((a,b) => {
    const qOrder = { Q1:0, Q2:1, Q3:2, Q4:3 }
    if (qOrder[a.quadrant] !== qOrder[b.quadrant]) return qOrder[a.quadrant] - qOrder[b.quadrant]
    return (b.urgency + b.importance) - (a.urgency + a.importance)
  })

  return (
    <div style={{ flex:1, overflow:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead style={{ position:'sticky', top:0, zIndex:1 }}>
          <tr style={{ background:T.surface2, borderBottom:`1px solid ${T.border2}` }}>
            {['Quadrant','Tâche','Catégorie','U','I','Temps','Deadline','Assigné','Statut'].map(h => (
              <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'.07em', fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(t => {
            const qv = QUADRANTS[t.quadrant]
            const st = STATUSES.find(s => s.v === t.status) || STATUSES[0]
            return (
              <tr key={t.id} onClick={() => onTaskClick(t)} style={{ borderBottom:`1px solid ${T.border}`, cursor:'pointer', transition:'background .12s' }}
                onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:qv.color, fontFamily:'Geist Mono,monospace', padding:'2px 8px', borderRadius:5, background:qv.bg, border:`1px solid ${qv.border}` }}>{t.quadrant}</span>
                </td>
                <td style={{ padding:'10px 12px', maxWidth:200 }}>
                  <div style={{ fontWeight:600, color: t.status === 'done' ? T.muted : T.text, textDecoration: t.status === 'done' ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                </td>
                <td style={{ padding:'10px 12px', fontSize:11, color:T.muted }}>{t.category}</td>
                <td style={{ padding:'10px 12px', fontFamily:'Geist Mono,monospace', fontWeight:700, color:'#fb923c', fontSize:12 }}>{t.urgency}</td>
                <td style={{ padding:'10px 12px', fontFamily:'Geist Mono,monospace', fontWeight:700, color:'#a78bfa', fontSize:12 }}>{t.importance}</td>
                <td style={{ padding:'10px 12px', fontSize:11, color:T.muted, fontFamily:'Geist Mono,monospace' }}>{t.estimatedTime}min</td>
                <td style={{ padding:'10px 12px', fontSize:11, color:t.deadline ? '#fb923c' : T.muted }}>{t.deadline || '—'}</td>
                <td style={{ padding:'10px 12px', fontSize:11, color:T.muted2 }}>{t.assignee || '—'}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ fontSize:10, color:st.color, fontFamily:'Geist Mono,monospace', fontWeight:700, padding:'2px 7px', borderRadius:4, background:`${st.color}12` }}>{st.label}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {sorted.length === 0 && <div style={{ textAlign:'center', padding:48, color:T.muted, fontSize:13 }}>Aucune tâche à afficher</div>}
    </div>
  )
}

// ─── AI Analysis Panel ────────────────────────────────────────────────────────
function AnalysisPanel({ result, tasks, theme, onReclassify, onClose }) {
  const T    = THEMES[theme] || THEMES.dark
  const [tab, setTab] = useState('summary')

  const tabs = [
    { id:'summary',    label:'Synthèse'    },
    { id:'quadrants',  label:'Quadrants'   },
    { id:'actions',    label:'Plan action' },
    { id:'delegation', label:'Délégation'  },
    { id:'kpis',       label:'KPIs'        },
  ]

  const sevC = (s) => s === 'Élevé' ? '#f87171' : s === 'Modéré' ? '#facc15' : '#34d399'

  return (
    <div style={{ position:'fixed', right:0, top:0, bottom:0, width:500, background:T.surface, borderLeft:`1px solid ${T.border}`, zIndex:90, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'-8px 0 32px rgba(0,0,0,.3)' }}>

      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:18, color:T.accent2 }}>Analyse IA ✦</div>
        <button onClick={onClose} style={{ background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:11, color:T.muted, fontFamily:'Geist Mono,monospace' }}>✕ Fermer</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, padding:'10px 14px', borderBottom:`1px solid ${T.border}`, flexShrink:0, flexWrap:'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:'5px 10px', borderRadius:5, fontSize:10, fontFamily:'Geist Mono,monospace', fontWeight:600, border:`1px solid ${tab === t.id ? T.accent2+'50' : T.border}`, background: tab === t.id ? `${T.accent}15` : T.surface2, color: tab === t.id ? T.accent2 : T.muted2, cursor:'pointer', transition:'all .15s', letterSpacing:'.04em' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:18, display:'flex', flexDirection:'column', gap:14 }}>

        {/* ── SUMMARY ── */}
        {tab === 'summary' && (
          <>
            {/* Health score */}
            <div style={{ display:'flex', gap:14, alignItems:'center', padding:16, background:T.surface2, borderRadius:12, border:`1px solid ${T.border2}` }}>
              <div style={{ width:72, height:72, borderRadius:'50%', border:`4px solid ${healthColor(result.health_score)}`, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', flexShrink:0, background:`${healthColor(result.health_score)}10` }}>
                <div style={{ fontSize:22, fontWeight:900, fontFamily:'Geist Mono,monospace', color:healthColor(result.health_score) }}>{result.health_score}</div>
                <div style={{ fontSize:9, color:T.muted }}>/ 100</div>
              </div>
              <div>
                <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:15, color:healthColor(result.health_score), marginBottom:4 }}>{result.health_label}</div>
                <div style={{ fontSize:11, color:T.muted }}>Score de santé de priorisation</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:6 }}>Synthèse exécutive</div>
              <div style={{ background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:10, padding:14, fontSize:13, color:T.text, lineHeight:1.75 }}>{result.executive_summary}</div>
            </div>

            {/* Patterns */}
            {result.patterns?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Patterns identifiés</div>
                {result.patterns.map((p, i) => {
                  const ic = p.impact === 'Positif' ? '#34d399' : p.impact === 'Négatif' ? '#f87171' : '#facc15'
                  return (
                    <div key={i} style={{ padding:'10px 12px', marginBottom:6, background:T.surface2, border:`1px solid ${ic}25`, borderLeft:`3px solid ${ic}`, borderRadius:8 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:3 }}>
                        <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', fontWeight:700, color:ic, padding:'1px 6px', borderRadius:3, background:`${ic}12` }}>{p.impact}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{p.pattern}</span>
                      </div>
                      <div style={{ fontSize:11, color:T.muted2 }}>→ {p.action}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Reclassifications */}
            {result.reclassifications?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Reclassifications suggérées</div>
                {result.reclassifications.map((r, i) => {
                  const from = QUADRANTS[r.current_quadrant]
                  const to   = QUADRANTS[r.suggested_quadrant]
                  return (
                    <div key={i} style={{ padding:'10px 12px', marginBottom:6, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', fontWeight:700, color:from.color, padding:'2px 7px', borderRadius:4, background:from.bg }}>{r.current_quadrant}</span>
                        <span style={{ color:T.muted, fontSize:12 }}>→</span>
                        <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', fontWeight:700, color:to.color, padding:'2px 7px', borderRadius:4, background:to.bg }}>{r.suggested_quadrant}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:T.text, flex:1 }}>{r.task_title}</span>
                        <button onClick={() => onReclassify(r.task_id, r.suggested_quadrant)} style={{ fontSize:10, padding:'3px 8px', borderRadius:5, border:`1px solid ${T.accent}40`, background:`${T.accent}12`, color:T.accent2, cursor:'pointer', fontFamily:'Geist Mono,monospace', fontWeight:600 }}>Appliquer</button>
                      </div>
                      <div style={{ fontSize:11, color:T.muted2 }}>{r.justification}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {result.conclusion && (
              <div>
                <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:6 }}>Conclusion</div>
                <div style={{ background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:10, padding:14, fontSize:13, color:T.muted2, lineHeight:1.75, fontStyle:'italic' }}>{result.conclusion}</div>
              </div>
            )}
          </>
        )}

        {/* ── QUADRANTS ── */}
        {tab === 'quadrants' && result.quadrant_analysis && (
          <>
            {/* Time analysis */}
            {result.time_analysis && (
              <div style={{ background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:12, padding:14 }}>
                <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Analyse temporelle</div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:8 }}>
                  {[
                    { label:'Total', val:`${Math.floor((result.time_analysis.total_estimated_minutes||0)/60)}h${(result.time_analysis.total_estimated_minutes||0)%60}min`, color:T.accent2 },
                    { label:'Risque surcharge', val:result.time_analysis.overload_risk, color:sevC(result.time_analysis.overload_risk) },
                  ].map(s => (
                    <div key={s.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 14px', background:T.surface, borderRadius:8, border:`1px solid ${T.border}` }}>
                      <div style={{ fontSize:16, fontWeight:800, fontFamily:'Geist Mono,monospace', color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:9, color:T.muted, textTransform:'uppercase', letterSpacing:'.06em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {result.time_analysis.comment && <div style={{ fontSize:11, color:T.muted2 }}>{result.time_analysis.comment}</div>}
              </div>
            )}

            {Object.entries(QUADRANTS).map(([qk, qv]) => {
              const qa = result.quadrant_analysis?.[qk]
              if (!qa) return null
              return (
                <div key={qk} style={{ background:qv.bg, border:`1px solid ${qv.border}`, borderRadius:10, padding:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:18 }}>{qv.icon}</span>
                    <span style={{ fontWeight:700, color:qv.color, fontFamily:'Geist Mono,monospace', fontSize:12 }}>{qk} — {qv.action}</span>
                    <span style={{ fontSize:11, fontFamily:'Geist Mono,monospace', color:T.muted }}>{qa.count} tâches</span>
                    <span style={{ marginLeft:'auto', fontSize:10, fontFamily:'Geist Mono,monospace', fontWeight:700, color:sevC(qa.risk), padding:'2px 7px', borderRadius:4, background:`${sevC(qa.risk)}12` }}>Risque {qa.risk}</span>
                  </div>
                  <div style={{ fontSize:12, color:T.text, lineHeight:1.6, marginBottom:6 }}>{qa.assessment}</div>
                  <div style={{ fontSize:11, color:qv.color, fontStyle:'italic' }}>→ {qa.advice}</div>
                </div>
              )
            })}
          </>
        )}

        {/* ── ACTION PLAN ── */}
        {tab === 'actions' && result.action_plan && (
          <>
            {[
              { key:'today',        label:"Aujourd'hui",  color:'#f87171', icon:'🔴' },
              { key:'this_week',    label:'Cette semaine', color:'#facc15', icon:'📅' },
              { key:'this_month',   label:'Ce mois',      color:'#34d399', icon:'📋' },
              { key:'eliminate_now',label:'À éliminer',   color:'#9896aa', icon:'🗑' },
            ].map(({ key, label, color, icon }) => {
              const items = result.action_plan[key] || []
              if (items.length === 0) return null
              return (
                <div key={key}>
                  <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <span>{icon}</span> {label}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {items.map((a, i) => (
                      <div key={i} style={{ display:'flex', gap:8, padding:'8px 12px', background:T.surface2, border:`1px solid ${color}20`, borderLeft:`3px solid ${color}`, borderRadius:7, fontSize:12, color:T.text }}>
                        <span style={{ color, flexShrink:0, fontFamily:'Geist Mono,monospace', fontWeight:700 }}>{i+1}.</span>{a}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {result.productivity_tips?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>💡 Conseils productivité</div>
                {result.productivity_tips.map((tip, i) => (
                  <div key={i} style={{ display:'flex', gap:8, padding:'8px 12px', marginBottom:5, background:`${T.accent}08`, border:`1px solid ${T.accent}20`, borderRadius:7, fontSize:12, color:T.muted2 }}>
                    <span style={{ color:T.accent2, flexShrink:0 }}>✦</span>{tip}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── DELEGATION ── */}
        {tab === 'delegation' && (
          <>
            {result.delegation_map?.length > 0 ? (
              <div>
                <div style={{ fontSize:10, color:T.muted2, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>Carte de délégation</div>
                {result.delegation_map.map((d, i) => {
                  const qv = QUADRANTS['Q3']
                  return (
                    <div key={i} style={{ padding:'10px 14px', marginBottom:6, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:8 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:T.text, flex:1 }}>{d.task_title}</span>
                        <span style={{ fontSize:11, color:'#60a5fa', fontFamily:'Geist Mono,monospace', padding:'2px 8px', borderRadius:5, background:'rgba(96,165,250,.1)' }}>👤 {d.suggest_to}</span>
                      </div>
                      <div style={{ fontSize:11, color:T.muted2 }}>{d.rationale}</div>
                    </div>
                  )
                })}
              </div>
            ) : <div style={{ textAlign:'center', padding:32, color:T.muted, fontSize:13 }}>Aucune délégation suggérée</div>}
          </>
        )}

        {/* ── KPIs ── */}
        {tab === 'kpis' && (
          <>
            {result.kpis?.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {result.kpis.map((k, i) => (
                  <div key={i} style={{ padding:'12px 14px', background:T.surface2, border:`1px solid ${T.border2}`, borderRadius:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:5 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{k.metric}</div>
                      <span style={{ fontSize:10, fontFamily:'Geist Mono,monospace', color:T.accent2, whiteSpace:'nowrap' }}>{k.timeline}</span>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <div style={{ fontSize:11, color:T.muted2 }}>Actuel : <span style={{ color:'#f87171', fontWeight:700 }}>{k.current}</span></div>
                      <div style={{ fontSize:11, color:T.muted2 }}>→ Cible : <span style={{ color:'#34d399', fontWeight:700 }}>{k.target}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={{ textAlign:'center', padding:32, color:T.muted, fontSize:13 }}>Aucun KPI défini</div>}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EisenhowerPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const projectId    = searchParams.get('project')

  const [project,       setProject]       = useState(null)
  const [sessions,      setSessions]      = useState([])
  const [activeId,      setActiveId]      = useState(null)
  const [showNewForm,   setShowNewForm]   = useState(false)
  const [newForm,       setNewForm]       = useState({ name:'' })
  const [view,          setView]          = useState('matrix')    // matrix | list
  const [filterStatus,  setFilterStatus]  = useState('all')
  const [theme,         setTheme]         = useState('dark')
  const [showGenPanel,  setShowGenPanel]  = useState(false)
  const [showAnalysis,  setShowAnalysis]  = useState(false)
  const [aiResult,      setAiResult]      = useState(null)
  const [aiLoading,     setAiLoading]     = useState(false)
  const [taskModal,     setTaskModal]     = useState(null)   // null | 'new-QX' | task object
  const [defaultQuad,   setDefaultQuad]   = useState('Q2')
  const [toast,         setToast]         = useState(null)
  const [search,        setSearch]        = useState('')
  const importRef = useRef(null)

  const T = THEMES[theme] || THEMES.dark

  // ── Load ──
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      const proj = (data.projects || []).find(p => p.id === projectId)
      if (proj) {
        setProject(proj)
        const list = proj.tools?.Eisenhower || []
        setSessions(list)
        if (list.length > 0) {
          const last = list[list.length - 1]
          setActiveId(last.id)
          if (last.aiResult) setAiResult(last.aiResult)
          if (last.theme)    setTheme(last.theme)
        }
      }
    } catch {}
  }, [projectId])

  const persist = useCallback((updated) => {
    try {
      const raw  = localStorage.getItem(LS_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      data.projects = (data.projects || []).map(p =>
        p.id !== projectId ? p : { ...p, tools: { ...(p.tools || {}), Eisenhower: updated } }
      )
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } catch {}
  }, [projectId])

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const active = sessions.find(s => s.id === activeId) || null

  // ── CRUD sessions ──
  const createSession = () => {
    if (!newForm.name.trim()) return
    const s = { id:uid(), name:newForm.name.trim(), projectContext:'', tasks:[], theme:'dark', aiResult:null, createdAt:new Date().toISOString() }
    const updated = [...sessions, s]
    setSessions(updated); setActiveId(s.id); setAiResult(null)
    persist(updated); setShowNewForm(false); setNewForm({ name:'' })
    showToast(`Session "${s.name}" créée`)
  }

  const deleteSession = (id) => {
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated); persist(updated)
    if (activeId === id) { setActiveId(updated[updated.length-1]?.id || null); setAiResult(null) }
    showToast('Session supprimée', 'info')
  }

  const updateActive = useCallback((patch) => {
    setSessions(prev => {
      const updated = prev.map(s => s.id === activeId ? { ...s, ...patch } : s)
      // defer persist
      setTimeout(() => persist(updated), 0)
      return updated
    })
  }, [activeId, persist])

  // ── Tasks ──
  const allTasks   = active?.tasks || []
  const searchedTasks = search ? allTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())) : allTasks

  const saveTask = (form) => {
    const existing = allTasks.find(t => t.id === form.id)
    let updated
    if (existing) {
      updated = allTasks.map(t => t.id === form.id ? { ...form } : t)
    } else {
      updated = [...allTasks, form]
    }
    updateActive({ tasks: updated })
    setTaskModal(null)
    showToast(existing ? 'Tâche mise à jour' : 'Tâche ajoutée')
  }

  const deleteTask = (id) => {
    updateActive({ tasks: allTasks.filter(t => t.id !== id) })
    setTaskModal(null)
    showToast('Tâche supprimée', 'info')
  }

  const openNewTask = (qk) => {
    setDefaultQuad(qk || 'Q2')
    setTaskModal({ ...EMPTY_TASK(), quadrant: qk || 'Q2', urgency: qk==='Q1'?8:qk==='Q3'?8:qk==='Q4'?2:4, importance: qk==='Q1'?8:qk==='Q2'?8:qk==='Q4'?2:3 })
  }

  // ── AI: apply generated ──
  const handleGenerated = (data) => {
    if (!active) {
      const s = { id:uid(), name:data.projectTitle || 'Session IA', projectContext:data.projectSummary || '', tasks:data.tasks || [], theme, aiResult:null, generatedInsights:data.insights, initialRecs:data.recommendations, createdAt:new Date().toISOString() }
      const updated = [...sessions, s]
      setSessions(updated); setActiveId(s.id); setAiResult(null); persist(updated)
    } else {
      updateActive({ tasks:data.tasks, generatedInsights:data.insights, initialRecs:data.recommendations })
    }
    showToast(`${data.tasks.length} tâches générées et classifiées`)
  }

  // ── AI: reclassify ──
  const handleReclassify = (taskId, newQuadrant) => {
    const updated = allTasks.map(t => t.id === taskId ? { ...t, quadrant: newQuadrant } : t)
    updateActive({ tasks: updated })
    showToast(`Tâche reclassifiée → ${newQuadrant}`)
  }

  // ── AI: analyze ──
  const runAnalysis = async () => {
    if (!active || allTasks.length === 0) { showToast('Ajoutez des tâches d\'abord', 'error'); return }
    setAiLoading(true); setShowAnalysis(true); setAiResult(null)
    try {
      const res  = await fetch('/api/generer-management/generer-heisenhower', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tasks: allTasks, projectName: project?.name || active?.name, projectContext: active?.projectContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setAiResult(data.result)
      updateActive({ aiResult: data.result })
      showToast('Analyse IA complète')
    } catch (err) { showToast(err.message, 'error'); setShowAnalysis(false) }
    setAiLoading(false)
  }

  // ── Theme change ──
  const changeTheme = (tid) => { setTheme(tid); if (active) updateActive({ theme: tid }) }

  // ── Export JSON ──
  const exportJSON = () => {
    if (!active) return
    const blob = new Blob([JSON.stringify({ session:active, exportedAt:new Date().toISOString() }, null, 2)], { type:'application/json' })
    const url  = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download=`Eisenhower_${active.name.replace(/\s+/g,'_')}_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url)
    showToast('Export JSON téléchargé')
  }

  // ── Export CSV ──
  const exportCSV = () => {
    if (!active) return
    const headers = ['Quadrant','Titre','Description','Urgence','Importance','Temps (min)','Deadline','Assigné','Catégorie','Statut']
    const rows    = allTasks.map(t => [
      t.quadrant,
      `"${(t.title||'').replace(/"/g,'""')}"`,
      `"${(t.description||'').replace(/"/g,'""')}"`,
      t.urgency, t.importance, t.estimatedTime,
      t.deadline||'', t.assignee||'', t.category||'', t.status||'todo',
    ])
    const csv  = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download=`Eisenhower_${active.name.replace(/\s+/g,'_')}_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url)
    showToast('Export CSV téléchargé')
  }

  // ── Import JSON ──
  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const session = data.session || data
        if (!session.tasks || !session.name) { showToast('Fichier JSON invalide', 'error'); return }
        if (window.confirm(`Importer la session "${session.name}" (${session.tasks.length} tâches) ?`)) {
          const s = { ...session, id:uid(), createdAt:session.createdAt || new Date().toISOString() }
          const updated = [...sessions, s]
          setSessions(updated); setActiveId(s.id); setAiResult(s.aiResult || null)
          if (s.theme) setTheme(s.theme)
          persist(updated); showToast(`Session "${s.name}" importée`)
        }
      } catch { showToast('Erreur de lecture JSON', 'error') }
    }
    reader.readAsText(file, 'UTF-8'); e.target.value=''
  }

  // ── Stats ──
  const stats = {
    total: allTasks.length,
    byQ:   { Q1: allTasks.filter(t=>t.quadrant==='Q1').length, Q2: allTasks.filter(t=>t.quadrant==='Q2').length, Q3: allTasks.filter(t=>t.quadrant==='Q3').length, Q4: allTasks.filter(t=>t.quadrant==='Q4').length },
    done:  allTasks.filter(t=>t.status==='done').length,
    totalTime: allTasks.reduce((s,t)=>s+(t.estimatedTime||0),0),
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background:${T.bg}; color:${T.text}; font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:${T.border2}; border-radius:2px; }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        input, textarea, select { font-family:'Syne',sans-serif; }
        .topbar { height:56px; background:${T.surface}; border-bottom:1px solid ${T.border}; display:flex; align-items:center; padding:0 20px; gap:12px; position:sticky; top:0; z-index:80; }
        .body { display:grid; grid-template-columns:230px 1fr; height:calc(100vh - 56px); overflow:hidden; }
        .left-panel { background:${T.surface}; border-right:1px solid ${T.border}; display:flex; flex-direction:column; overflow:hidden; }
        .center-panel { display:flex; flex-direction:column; overflow:hidden; background:${T.bg}; }
        .btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:6px; cursor:pointer; font-family:'Geist Mono',monospace; font-size:11px; letter-spacing:.04em; border:1px solid ${T.border2}; background:${T.surface}; color:${T.muted2}; transition:all .15s; white-space:nowrap; }
        .btn:hover { color:${T.text}; border-color:${T.border2}; background:${T.surface2}; }
        .btn:disabled { opacity:.4; cursor:not-allowed; }
        .btn-primary { background:${T.accent}; border-color:${T.accent}; color:#fff; }
        .btn-primary:hover { opacity:.9; }
        .btn-ai { background:${T.accent}18; border-color:${T.accent}40; color:${T.accent2}; }
        .btn-ai:hover { background:${T.accent}28; }
        .inp { background:${T.bg}; border:1px solid ${T.border2}; border-radius:6px; padding:8px 10px; font-size:12px; color:${T.text}; outline:none; font-family:'Syne',sans-serif; width:100%; }
        .inp:focus { border-color:${T.accent}; }
        .litem { padding:10px 12px; border-radius:8px; cursor:pointer; border:1px solid transparent; transition:all .15s; }
        .litem:hover { background:${T.surface2}; }
        .litem.active { background:${T.accent}10; border-color:${T.accent}30; }
        .toast { position:fixed; bottom:24px; right:24px; z-index:900; background:${T.surface}; border:1px solid ${T.border2}; border-radius:8px; padding:12px 18px; font-size:13px; box-shadow:0 8px 32px rgba(0,0,0,.4); animation:slideUp .2s ease; display:flex; align-items:center; gap:8px; }
        .toast.error { border-color:rgba(248,113,113,.3); color:#f87171; }
        .toast.info  { border-color:${T.accent}30; }
      `}</style>

      <div style={{ minHeight:'100vh', background:T.bg, color:T.text }}>

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="btn" onClick={() => router.push(`/management${projectId?`?project=${projectId}`:''}`)}>← Retour</button>
          <div>
            <div style={{ fontFamily:'Instrument Serif,serif', fontSize:18, fontStyle:'italic', color:T.text }}>Matrice d'Eisenhower</div>
            {project && <div style={{ fontSize:11, color:T.muted, fontFamily:'Geist Mono,monospace' }}>{project.name}</div>}
          </div>

          <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {/* Search */}
            <input className="inp" placeholder="🔍 Rechercher…" style={{ width:160, borderRadius:20 }} value={search} onChange={e=>setSearch(e.target.value)} />

            {/* View toggle */}
            <div style={{ display:'flex', gap:2, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:8, padding:2 }}>
              {[['matrix','⊞ Matrice'],['list','≡ Liste']].map(([v,l]) => (
                <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontFamily:'Geist Mono,monospace', border:'none', background:view===v?T.surface3:'transparent', color:view===v?T.text:T.muted, cursor:'pointer', transition:'all .15s' }}>{l}</button>
              ))}
            </div>

            {/* Filter */}
            <select className="inp" style={{ width:120 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="all">Tous statuts</option>
              {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>

            {/* Theme */}
            <select className="inp" style={{ width:110 }} value={theme} onChange={e=>changeTheme(e.target.value)}>
              {Object.values(THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            {/* AI Generate */}
            <button className="btn btn-ai" onClick={()=>setShowGenPanel(true)}>✦ Générer</button>

            {/* AI Analyze */}
            {active && allTasks.length > 0 && (
              <button className="btn btn-ai" onClick={runAnalysis} disabled={aiLoading} style={{ borderColor:'rgba(52,211,153,.3)', color:'#34d399', background:'rgba(52,211,153,.08)' }}>
                {aiLoading ? '⏳ Analyse…' : '✦ Analyser'}
              </button>
            )}

            {/* Export */}
            {active && (
              <select className="inp" style={{ width:120 }} defaultValue="" onChange={e => { if(e.target.value==='json') exportJSON(); if(e.target.value==='csv') exportCSV(); e.target.value='' }}>
                <option value="" disabled>↓ Exporter</option>
                <option value="json">JSON (complet)</option>
                <option value="csv">CSV (tableur)</option>
              </select>
            )}

            {/* Import */}
            <label className="btn" style={{ cursor:'pointer' }}>
              ↑ Importer
              <input type="file" accept=".json" hidden onChange={handleImport} />
            </label>

            {/* New task */}
            {active && <button className="btn btn-primary" onClick={()=>openNewTask('Q2')}>+ Tâche</button>}
          </div>
        </header>

        <div className="body">

          {/* ── Left panel ── */}
          <aside className="left-panel">
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, color:T.muted, letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'Geist Mono,monospace' }}>Sessions ({sessions.length})</span>
            </div>

            <div style={{ flex:1, overflow:'auto', padding:8, display:'flex', flexDirection:'column', gap:2 }}>
              {sessions.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 16px' }}>
                  <div style={{ fontSize:36, opacity:.2, marginBottom:12 }}>⚡</div>
                  <div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>Créez ou générez votre première session Eisenhower</div>
                </div>
              )}
              {sessions.map(s => {
                const tc    = (s.tasks||[]).length
                const done  = (s.tasks||[]).filter(t=>t.status==='done').length
                const q1c   = (s.tasks||[]).filter(t=>t.quadrant==='Q1').length
                return (
                  <div key={s.id} className={`litem ${activeId===s.id?'active':''}`}
                    onClick={()=>{ setActiveId(s.id); setAiResult(s.aiResult||null); if(s.theme) setTheme(s.theme) }}>
                    <button onClick={e=>{e.stopPropagation();deleteSession(s.id)}} style={{ float:'right', background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:11, opacity:0, transition:'opacity .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}>✕</button>
                    <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:3 }}>{s.name}</div>
                    <div style={{ fontSize:10, color:T.muted, fontFamily:'Geist Mono,monospace' }}>
                      {tc} tâches · {done} terminées
                    </div>
                    {q1c > 0 && <div style={{ fontSize:10, color:'#f87171', fontFamily:'Geist Mono,monospace', marginTop:2 }}>🔴 {q1c} urgentes</div>}
                    {s.aiResult && <div style={{ fontSize:9, color:T.accent2, marginTop:2, fontFamily:'Geist Mono,monospace' }}>✦ Analysé par IA</div>}
                  </div>
                )
              })}
            </div>

            {/* New session form */}
            {showNewForm ? (
              <div style={{ padding:12, borderTop:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:8 }}>
                <input className="inp" placeholder="Nom de la session" value={newForm.name} onChange={e=>setNewForm({name:e.target.value})} onKeyDown={e=>e.key==='Enter'&&createSession()} autoFocus />
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={createSession}>Créer</button>
                  <button className="btn" onClick={()=>setShowNewForm(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ padding:12, borderTop:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:6 }}>
                <button className="btn" style={{ width:'100%', justifyContent:'center' }} onClick={()=>setShowNewForm(true)}>+ Manuel</button>
                <button className="btn btn-ai" style={{ width:'100%', justifyContent:'center' }} onClick={()=>setShowGenPanel(true)}>✦ Générer par IA</button>
              </div>
            )}
          </aside>

          {/* ── Main ── */}
          <main className="center-panel">
            {!active ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:40, textAlign:'center' }}>
                <div style={{ fontSize:56, opacity:.2 }}>⚡</div>
                <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:22, color:T.text }}>Matrice d'Eisenhower</div>
                <div style={{ fontSize:13, color:T.muted, maxWidth:420, lineHeight:1.7 }}>Classifiez vos tâches selon urgence et importance pour décider quoi faire, planifier, déléguer ou éliminer.</div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-ai" onClick={()=>setShowGenPanel(true)} style={{ padding:'10px 20px' }}>✦ Générer par IA</button>
                  <button className="btn" onClick={()=>setShowNewForm(true)} style={{ padding:'10px 20px' }}>+ Créer manuellement</button>
                </div>
              </div>
            ) : (
              <>
                {/* Stats bar */}
                <div style={{ padding:'10px 16px', borderBottom:`1px solid ${T.border}`, background:T.surface, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', flexShrink:0 }}>
                  <div style={{ fontFamily:'Instrument Serif,serif', fontStyle:'italic', fontSize:16, color:T.text, marginRight:8 }}>{active.name}</div>
                  {Object.entries(QUADRANTS).map(([qk, qv]) => (
                    <div key={qk} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:14 }}>{qv.icon}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:qv.color, fontFamily:'Geist Mono,monospace' }}>{stats.byQ[qk]}</span>
                    </div>
                  ))}
                  <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:11, color:T.muted, fontFamily:'Geist Mono,monospace' }}>⏱ {Math.floor(stats.totalTime/60)}h{stats.totalTime%60}min</span>
                    <span style={{ fontSize:11, color:'#34d399', fontFamily:'Geist Mono,monospace' }}>✓ {stats.done}/{stats.total}</span>
                    {aiResult && <span style={{ fontSize:10, color:T.accent2, fontFamily:'Geist Mono,monospace', padding:'2px 8px', borderRadius:10, background:`${T.accent}15`, border:`1px solid ${T.accent}30`, cursor:'pointer' }} onClick={()=>setShowAnalysis(true)}>✦ Score: {aiResult.health_score}/100</span>}
                  </div>
                </div>

                {/* Initial recommendations */}
                {active.initialRecs?.length > 0 && !showAnalysis && (
                  <div style={{ margin:'8px 12px 0', padding:'10px 14px', background:`${T.accent}08`, border:`1px solid ${T.accent}20`, borderRadius:8, display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ color:T.accent2, fontSize:14, flexShrink:0 }}>✦</span>
                    <div style={{ fontSize:12, color:T.muted2, lineHeight:1.6 }}>
                      <strong style={{ color:T.text }}>Recommandations IA : </strong>
                      {active.initialRecs.slice(0,2).join(' · ')}
                    </div>
                    <button onClick={()=>{ setAiResult(active.aiResult); if(active.aiResult) setShowAnalysis(true) }} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:11, flexShrink:0 }}>×</button>
                  </div>
                )}

                {/* Matrix / List */}
                <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', padding:view==='matrix'?10:0 }}>
                  {view === 'matrix' ? (
                    <MatrixView tasks={searchedTasks} onTaskClick={setTaskModal} onAddTask={openNewTask} theme={theme} filterStatus={filterStatus} />
                  ) : (
                    <ListView tasks={searchedTasks} onTaskClick={setTaskModal} theme={theme} filterStatus={filterStatus} />
                  )}
                </div>
              </>
            )}
          </main>
        </div>

        {/* ── AI Generate Panel ── */}
        {showGenPanel && (
          <AIGeneratePanel projectName={active?.name || project?.name || ''} onGenerated={handleGenerated} onClose={()=>setShowGenPanel(false)} theme={theme} />
        )}

        {/* ── Task Modal ── */}
        {taskModal && (
          <TaskModal task={taskModal.title ? taskModal : null} onSave={saveTask} onDelete={deleteTask} onClose={()=>setTaskModal(null)} theme={theme} />
        )}

        {/* ── AI Analysis Panel ── */}
        {showAnalysis && aiResult && (
          <AnalysisPanel result={aiResult} tasks={allTasks} theme={theme} onReclassify={handleReclassify} onClose={()=>setShowAnalysis(false)} />
        )}
        {aiLoading && !aiResult && (
          <div style={{ position:'fixed', right:0, top:56, bottom:0, width:500, background:T.surface, borderLeft:`1px solid ${T.border}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, zIndex:90 }}>
            <div style={{ width:32, height:32, border:`2px solid ${T.border2}`, borderTop:`2px solid ${T.accent}`, borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
            <div style={{ fontSize:13, color:T.muted2, fontFamily:'Geist Mono,monospace' }}>Analyse Eisenhower en cours…</div>
          </div>
        )}

        {/* ── Toast ── */}
        {toast && <div className={`toast ${toast.type||''}`}>{toast.type==='error'?'✕':'✓'} {toast.msg}</div>}
      </div>
    </>
  )
}