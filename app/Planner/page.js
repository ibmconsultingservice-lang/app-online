"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { usePlanGuard } from '@/hooks/usePlanGuard';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

const COLORS = ['#534AB7', '#1D9E75', '#378ADD', '#BA7517', '#D4537E', '#3B6D11', '#D85A30', '#0C447C', '#3C3489', '#0F766E', '#B45309', '#7C3AED'];
const TEAM = ['Alex', 'Sam', 'Jordan', 'Charlie', 'Taylor'];
const ZOOM = 40;

export default function ProjectDeepWork() {
  const allowed = usePlanGuard('pro')
  const { credits } = useCredits()
  const router = useRouter()

  const [tasks, setTasks] = useState([]);
  const [totalDays, setTotalDays] = useState(28);
  const [view, setView] = useState('gantt');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    title: '', assignee: '', status: 'todo', priority: 'medium',
    start: 1, duration: 3, progress: 0, colorIdx: 0
  });

  const dragRef = useRef({ type: null, id: null, startX: 0, startVal: 0, startDur: 0 });

  // ── Fix localStorage SSR — only runs client-side ──
  useEffect(() => {
    setMounted(true)
    try {
      const savedTasks = localStorage.getItem('nexus-tasks');
      const savedDays = localStorage.getItem('nexus-total-days');
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      else {
        setTasks([
          { id: '1', title: 'Brand Identity Design', start: 1, duration: 3, progress: 60, status: 'in-progress', priority: 'high', assignee: 'Alex', colorIdx: 0 },
          { id: '2', title: 'Market Research', start: 5, duration: 4, progress: 100, status: 'done', priority: 'medium', assignee: 'Sam', colorIdx: 1 },
        ]);
      }
      if (savedDays) setTotalDays(parseInt(savedDays));
    } catch (e) {
      console.error('localStorage not available:', e)
    }
  }, []);

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem('nexus-tasks', JSON.stringify(tasks));
      localStorage.setItem('nexus-total-days', totalDays.toString());
    } catch (e) {
      console.error('localStorage save error:', e)
    }
  }, [tasks, totalDays, mounted]);

  const addWeek = () => setTotalDays(prev => prev + 7);
  const removeWeek = () => setTotalDays(prev => Math.max(7, prev - 7));
  const totalWeeks = Math.ceil(totalDays / 7);

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.assignee && t.assignee.toLowerCase().includes(search.toLowerCase()))
  );

  const openModal = (task = null) => {
    if (task) {
      setEditingTask(task.id);
      setFormData({ ...task });
    } else {
      setEditingTask(null);
      setFormData({
        title: '', assignee: '', status: 'todo', priority: 'medium',
        start: 1, duration: 3, progress: 0, colorIdx: tasks.length % COLORS.length
      });
    }
    setIsModalOpen(true);
  };

  const saveTask = () => {
    if (!formData.title.trim()) return;
    if (editingTask) {
      setTasks(tasks.map(t => t.id === editingTask ? { ...formData } : t));
    } else {
      setTasks([...tasks, { ...formData, id: Date.now().toString() }]);
    }
    setIsModalOpen(false);
  };

  const deleteTask = () => {
    if (!editingTask) return;
    if (window.confirm("Voulez-vous vraiment supprimer ce projet ?")) {
      setTasks(tasks.filter(t => t.id !== editingTask));
      setIsModalOpen(false);
    }
  };

  const updateTaskField = (id, field, value) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const startDrag = (e, id, type) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === id);
    dragRef.current = { type, id, startX: e.clientX, startVal: task.start, startDur: task.duration, hasMoved: false };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
  };

  const onDrag = (e) => {
    dragRef.current.hasMoved = true;
    const { type, id, startX, startVal, startDur } = dragRef.current;
    const delta = Math.round((e.clientX - startX) / ZOOM);
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      return type === 'move'
        ? { ...t, start: Math.max(1, startVal + delta) }
        : { ...t, duration: Math.max(1, startDur + delta) };
    }));
  };

  const endDrag = () => {
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', endDrag);
  };

  // ── Loading screen ──
  if (!allowed) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, background: '#534AB7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Zap size={20} color="white" fill="white" />
      </div>
      <div style={{ width: 24, height: 24, border: '2px solid #e2e8f0', borderTop: '2px solid #534AB7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vérification du plan...</p>
    </div>
  )

  return (
    <div className="app-container">
      <style jsx global>{`
        :root { --primary: #534AB7; --bg: #f8fafc; --text: #0f172a; --border: #e2e8f0; --danger: #ef4444; }
        .app-container { display: flex; height: 100vh; background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; overflow: hidden; }
        .sidebar { width: 220px; background: #fff; border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 16px 12px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; border: none; background: none; width: 100%; cursor: pointer; color: #64748b; font-size: 13px; transition: 0.2s; text-align: left; }
        .nav-item.active { background: var(--primary); color: white; }
        .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .header { height: 60px; background: #fff; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 50; }
        .gantt-grid { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; pointer-events: none; }
        .grid-line { width: ${ZOOM}px; border-right: 1px solid rgba(226, 232, 240, 0.6); height: 100%; }
        .grid-line.week-end { background: rgba(241, 245, 249, 0.5); }
        .form-control { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; outline: none; font-size: 14px; background: #fff; }
        .gantt-bar { position: absolute; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; padding: 0 10px; color: white; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .color-dot { width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
        .color-dot.active { border-color: #000; transform: scale(1.1); }
        .color-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .week-btn { background: #fff; border: 1px solid var(--border); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .week-btn:hover { background: #f1f5f9; color: var(--primary); }
      `}</style>

      <aside className="sidebar">
        <div style={{ padding: '10px 0 20px', fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>NEXUS</div>

        {/* Credits badge in sidebar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 20, padding: '6px 12px', marginBottom: 20 }}>
          <Zap size={12} color="#4f46e5" fill="#4f46e5"/>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca' }}>{credits} crédits</span>
        </div>

        <button className={`nav-item ${view === 'gantt' ? 'active' : ''}`} onClick={() => setView('gantt')}>Gantt Timeline</button>
        <button className={`nav-item ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>Kanban Board</button>
        <button className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Task List</button>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'none', cursor: 'pointer', fontSize: 12, color: '#64748b', textAlign: 'left' }}>
            ← Dashboard
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div style={{ fontWeight: 600 }}>ProjectDeepWork <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ Sprint Tracking</span></div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f1f5f9', padding: '4px 8px', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', paddingLeft: 4 }}>DURÉE:</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button className="week-btn" onClick={removeWeek}>-</button>
                <div style={{ minWidth: 80, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
                  {totalWeeks} {totalWeeks > 1 ? 'Semaines' : 'Semaine'}
                </div>
                <button className="week-btn" onClick={addWeek}>+</button>
              </div>
            </div>

            <input className="form-control" placeholder="Rechercher..." style={{ width: 180, borderRadius: 20 }} value={search} onChange={(e) => setSearch(e.target.value)} />
            <button onClick={() => openModal()} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+ New Task</button>
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
          {view === 'gantt' && (
            <div style={{ minWidth: 200 + (totalDays * ZOOM), position: 'relative' }}>
              <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: '20px 15px', fontWeight: 700, fontSize: 12, color: '#64748b' }}>TÂCHES</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    {Array.from({ length: totalWeeks }).map((_, i) => (
                      <div key={i} style={{ width: ZOOM * 7, padding: '6px 10px', fontSize: 10, fontWeight: 700, color: '#94a3b8', borderRight: '1px solid var(--border)' }}>SEMAINE {i + 1}</div>
                    ))}
                  </div>
                  <div style={{ display: 'flex' }}>
                    {Array.from({ length: totalDays }).map((_, i) => (
                      <div key={i} style={{ width: ZOOM, height: 35, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: (i + 1) % 7 === 6 || (i + 1) % 7 === 0 ? '#ef4444' : '#64748b' }}>{i + 1}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <div className="gantt-grid" style={{ left: 200 }}>
                  {Array.from({ length: totalDays }).map((_, i) => (
                    <div key={i} className={`grid-line ${(i + 1) % 7 === 6 || (i + 1) % 7 === 0 ? 'week-end' : ''}`} />
                  ))}
                </div>

                {filteredTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', height: 48, borderBottom: '1px solid #f1f5f9', position: 'relative', paddingTop: '8px' }}>
                    <div style={{ width: 200, padding: '0 15px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: COLORS[t.colorIdx], zIndex: 10, background: '#fff', borderRight: '1px solid var(--border)', height: '100%', display: 'flex', alignItems: 'center' }} onClick={() => openModal(t)}>
                      {t.title}
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                      <div className="gantt-bar"
                        onMouseDown={(e) => startDrag(e, t.id, 'move')}
                        onClick={() => !dragRef.current.hasMoved && openModal(t)}
                        style={{ left: (t.start - 1) * ZOOM + 2, width: t.duration * ZOOM - 4, background: COLORS[t.colorIdx] }}
                      >
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', width: `${t.progress}%`, pointerEvents: 'none', borderRadius: '4px 0 0 4px' }} />
                        <span style={{ position: 'relative', zIndex: 1 }}>{t.progress}% - {t.assignee}</span>
                        <div style={{ position: 'absolute', right: 0, width: 8, height: '100%', cursor: 'ew-resize' }} onMouseDown={(e) => startDrag(e, t.id, 'resize')} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'kanban' && (
            <div style={{ display: 'flex', gap: 20, padding: 25 }}>
              {['todo', 'in-progress', 'done'].map(s => (
                <div key={s} style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ marginBottom: 15, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{s}</div>
                  {filteredTasks.filter(t => t.status === s).map(t => (
                    <div key={t.id} style={{ background: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, borderLeft: `4px solid ${COLORS[t.colorIdx]}`, boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                      <div onClick={() => openModal(t)} style={{ fontWeight: 600, cursor: 'pointer', marginBottom: 5 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>Resp: {t.assignee}</div>
                      <input type="range" style={{ width: '100%', accentColor: COLORS[t.colorIdx] }} value={t.progress} onChange={(e) => updateTaskField(t.id, 'progress', e.target.value)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {view === 'list' && (
            <div style={{ padding: 25 }}>
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: 12, textAlign: 'left' }}>Tâche</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>Responsable</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>Progression</th>
                      <th style={{ padding: 12, textAlign: 'left' }}>Couleur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => openModal(t)}>{t.title}</td>
                        <td style={{ padding: 12, color: '#64748b' }}>{t.assignee}</td>
                        <td style={{ padding: 12 }}>{t.progress}%</td>
                        <td style={{ padding: 12 }}><div style={{ width: 15, height: 15, borderRadius: '50%', background: COLORS[t.colorIdx] }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 20, width: 450, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{editingTask ? 'Détails de la tâche' : 'Nouvelle tâche'}</h2>

            <div style={{ marginBottom: 15 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Titre</label>
              <input className="form-control" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Responsable</label>
                <input list="team-list" className="form-control" placeholder="Nom..." value={formData.assignee} onChange={e => setFormData({ ...formData, assignee: e.target.value })} />
                <datalist id="team-list">{TEAM.map(person => <option key={person} value={person} />)}</datalist>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Statut</label>
                <select className="form-control" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="todo">À faire</option>
                  <option value="in-progress">En cours</option>
                  <option value="done">Terminé</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Jour Début</label>
                <input type="number" min="1" max={totalDays} className="form-control" value={formData.start}
                  onChange={e => setFormData({ ...formData, start: Math.max(1, parseInt(e.target.value) || 1) })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Durée (jours)</label>
                <input type="number" min="1" className="form-control" value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: Math.max(1, parseInt(e.target.value) || 1) })} />
              </div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Progression ({formData.progress}%)</label>
              <input type="range" style={{ width: '100%', accentColor: COLORS[formData.colorIdx] }} value={formData.progress} onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) })} />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Couleur</label>
              <div className="color-grid">
                {COLORS.map((c, i) => (
                  <div key={c} className={`color-dot ${formData.colorIdx === i ? 'active' : ''}`} style={{ background: c }} onClick={() => setFormData({ ...formData, colorIdx: i })} />
                ))}
              </div>
            </div>

            <div style={{ marginTop: 30, display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              {editingTask ? (
                <button onClick={deleteTask} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--danger)', color: 'var(--danger)', background: 'none', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
              ) : <div />}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'none', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                <button onClick={saveTask} style={{ padding: '10px 20px', borderRadius: 10, background: COLORS[formData.colorIdx], color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}