"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { usePlanGuard } from '@/hooks/usePlanGuard';
import { useRouter } from 'next/navigation';
import { Zap, Save, Download, Upload, FileText, Image as ImageIcon, FileJson } from 'lucide-react';

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
  const [saveStatus, setSaveStatus] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const importRef = useRef(null)

  const [formData, setFormData] = useState({
    title: '', assignee: '', status: 'todo', priority: 'medium',
    start: 1, duration: 3, progress: 0, colorIdx: 0
  });

  const dragRef = useRef({ type: null, id: null, startX: 0, startVal: 0, startDur: 0 });

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

  // ── Save manually ──
  const handleSave = () => {
    setSaveStatus('saving')
    try {
      localStorage.setItem('nexus-tasks', JSON.stringify(tasks))
      localStorage.setItem('nexus-total-days', totalDays.toString())
      localStorage.setItem('nexus-last-saved', new Date().toLocaleString())
      setTimeout(() => setSaveStatus('saved'), 400)
      setTimeout(() => setSaveStatus(null), 2400)
    } catch (e) {
      console.error('Save error:', e)
      setSaveStatus(null)
    }
  }

  // ── Export CSV ──
  const exportCSV = () => {
    setShowExportMenu(false)
    const headers = [
      'Titre', 'Responsable', 'Statut', 'Priorité',
      'Jour début', 'Durée (jours)', 'Progression (%)', 'Couleur'
    ]
    const rows = tasks.map(t => [
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.assignee  || '',
      t.status    || 'todo',
      t.priority  || 'medium',
      t.start     || 1,
      t.duration  || 1,
      t.progress  || 0,
      t.colorIdx  ?? 0,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexus-project-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Export HTML (printable) ──
  const exportHTML = () => {
    setShowExportMenu(false)
    const totalWeeks = Math.ceil(totalDays / 7)

    // Build Gantt rows as SVG-like table
    const ganttRows = tasks.map(t => {
      const barLeft = (t.start - 1) / totalDays * 100
      const barWidth = t.duration / totalDays * 100
      const progressWidth = barWidth * t.progress / 100
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;width:180px;white-space:nowrap;color:${COLORS[t.colorIdx]}">${t.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;width:100px">${t.assignee || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;width:80px">
            <span style="background:${t.status==='done'?'#dcfce7':t.status==='in-progress'?'#dbeafe':'#f1f5f9'};color:${t.status==='done'?'#16a34a':t.status==='in-progress'?'#2563eb':'#64748b'};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">${t.status}</span>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">
            <div style="position:relative;height:24px;background:#f1f5f9;border-radius:4px;overflow:hidden">
              <div style="position:absolute;left:${barLeft}%;width:${barWidth}%;height:100%;background:${COLORS[t.colorIdx]};opacity:0.3;border-radius:4px"></div>
              <div style="position:absolute;left:${barLeft}%;width:${progressWidth}%;height:100%;background:${COLORS[t.colorIdx]};border-radius:4px"></div>
              <span style="position:absolute;left:${barLeft + barWidth / 2}%;transform:translateX(-50%);font-size:10px;font-weight:700;color:white;line-height:24px">${t.progress}%</span>
            </div>
          </td>
        </tr>`
    }).join('')

    const weekHeaders = Array.from({ length: totalWeeks }, (_, i) =>
      `<th style="padding:6px;font-size:10px;color:#94a3b8;text-align:center;border-right:1px solid #e2e8f0">S${i+1}</th>`
    ).join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>NEXUS — Export Projet</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #0f172a; background: #fff; }
    h1 { color: #534AB7; margin: 0 0 4px; font-size: 24px; }
    .meta { color: #94a3b8; font-size: 12px; margin-bottom: 32px; }
    .stats { display: flex; gap: 20px; margin-bottom: 32px; }
    .stat { background: #f8fafc; border-radius: 10px; padding: 12px 20px; }
    .stat-val { font-size: 22px; font-weight: 800; color: #534AB7; }
    .stat-lbl { font-size: 11px; color: #94a3b8; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
    th { padding: 10px 12px; text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase; }
    @media print {
      body { padding: 15px; }
      .no-print { display: none; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>NEXUS — Plan de projet</h1>
  <p class="meta">Exporté le ${new Date().toLocaleString()} · ${tasks.length} tâches · ${totalWeeks} semaines</p>

  <div class="stats">
    <div class="stat"><div class="stat-val">${tasks.length}</div><div class="stat-lbl">Tâches</div></div>
    <div class="stat"><div class="stat-val">${tasks.filter(t=>t.status==='done').length}</div><div class="stat-lbl">Terminées</div></div>
    <div class="stat"><div class="stat-val">${tasks.filter(t=>t.status==='in-progress').length}</div><div class="stat-lbl">En cours</div></div>
    <div class="stat"><div class="stat-val">${Math.round(tasks.reduce((s,t)=>s+Number(t.progress),0)/(tasks.length||1))}%</div><div class="stat-lbl">Progression moy.</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Tâche</th><th>Responsable</th><th>Statut</th><th>Timeline (${totalDays} jours)</th>
      </tr>
    </thead>
    <tbody>${ganttRows}</tbody>
  </table>

  <div style="margin-top:20px;text-align:right" class="no-print">
    <button onclick="window.print()" style="padding:10px 20px;background:#534AB7;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">🖨️ Imprimer / Sauvegarder en PDF</button>
  </div>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexus-project-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Export PDF (via print dialog on the HTML export) ──
  const exportPDF = () => {
    setShowExportMenu(false)
    const totalWeeks = Math.ceil(totalDays / 7)

    const ganttRows = tasks.map(t => {
      const barLeft = (t.start - 1) / totalDays * 100
      const barWidth = t.duration / totalDays * 100
      const progressWidth = barWidth * t.progress / 100
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:${COLORS[t.colorIdx]}">${t.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">${t.assignee || '—'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${t.status}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">Jour ${t.start} → ${t.start + t.duration - 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">
            <div style="background:#e2e8f0;border-radius:4px;height:8px;width:120px;display:inline-block">
              <div style="background:${COLORS[t.colorIdx]};width:${t.progress}%;height:8px;border-radius:4px"></div>
            </div>
            <span style="font-size:11px;color:#64748b;margin-left:6px">${t.progress}%</span>
          </td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>NEXUS — PDF Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #0f172a; background: #fff; }
    h1 { color: #534AB7; font-size: 20px; margin-bottom: 4px; }
    .meta { color: #94a3b8; font-size: 11px; margin-bottom: 24px; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat { background: #f8fafc; border-radius: 8px; padding: 10px 16px; border-left: 3px solid #534AB7; }
    .stat-val { font-size: 18px; font-weight: 800; color: #534AB7; }
    .stat-lbl { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead { background: #f8fafc; }
    th { padding: 8px 12px; text-align: left; font-size: 10px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
    @media print {
      body { padding: 15px; }
      @page { margin: 15mm; size: A4 landscape; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>NEXUS — Plan de projet</h1>
  <p class="meta">Généré le ${new Date().toLocaleString()} · ${tasks.length} tâches · ${totalWeeks} semaines · ${totalDays} jours</p>
  <div class="stats">
    <div class="stat"><div class="stat-val">${tasks.length}</div><div class="stat-lbl">Total tâches</div></div>
    <div class="stat"><div class="stat-val">${tasks.filter(t=>t.status==='done').length}</div><div class="stat-lbl">Terminées</div></div>
    <div class="stat"><div class="stat-val">${tasks.filter(t=>t.status==='in-progress').length}</div><div class="stat-lbl">En cours</div></div>
    <div class="stat"><div class="stat-val">${tasks.filter(t=>t.status==='todo').length}</div><div class="stat-lbl">À faire</div></div>
    <div class="stat"><div class="stat-val">${Math.round(tasks.reduce((s,t)=>s+Number(t.progress),0)/(tasks.length||1))}%</div><div class="stat-lbl">Progression moy.</div></div>
  </div>
  <table>
    <thead>
      <tr><th>Tâche</th><th>Responsable</th><th>Statut</th><th>Période</th><th>Progression</th></tr>
    </thead>
    <tbody>${ganttRows}</tbody>
  </table>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  // ── Export as Image (PNG via html2canvas) ──
  const exportImage = async () => {
    setShowExportMenu(false)

    // Build an offscreen Gantt snapshot div
    const container = document.createElement('div')
    container.style.cssText = `
      position:fixed; left:-9999px; top:0;
      background:#fff; padding:32px; width:${200 + totalDays * ZOOM}px;
      font-family:'Segoe UI',sans-serif; color:#0f172a;
    `

    // Header
    const header = document.createElement('div')
    header.style.cssText = 'margin-bottom:20px;'
    header.innerHTML = `
      <div style="font-size:22px;font-weight:800;color:#534AB7;margin-bottom:4px">NEXUS</div>
      <div style="font-size:12px;color:#94a3b8">Exporté le ${new Date().toLocaleString()} · ${tasks.length} tâches · ${Math.ceil(totalDays/7)} semaines</div>
    `
    container.appendChild(header)

    // Week headers row
    const headerRow = document.createElement('div')
    headerRow.style.cssText = 'display:flex;margin-left:200px;background:#f8fafc;border-bottom:1px solid #e2e8f0;'
    for (let i = 0; i < Math.ceil(totalDays / 7); i++) {
      const wh = document.createElement('div')
      wh.style.cssText = `width:${ZOOM * 7}px;padding:6px 10px;font-size:10px;font-weight:700;color:#94a3b8;border-right:1px solid #e2e8f0;`
      wh.textContent = `SEMAINE ${i + 1}`
      headerRow.appendChild(wh)
    }
    container.appendChild(headerRow)

    // Task rows
    tasks.forEach(t => {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;align-items:center;height:44px;border-bottom:1px solid #f1f5f9;position:relative;'

      const label = document.createElement('div')
      label.style.cssText = `width:200px;padding:0 15px;font-size:13px;font-weight:600;color:${COLORS[t.colorIdx]};background:#fff;border-right:1px solid #e2e8f0;height:100%;display:flex;align-items:center;flex-shrink:0;`
      label.textContent = t.title

      const timeline = document.createElement('div')
      timeline.style.cssText = 'flex:1;position:relative;height:100%;'

      const bar = document.createElement('div')
      bar.style.cssText = `position:absolute;top:6px;left:${(t.start-1)*ZOOM+2}px;width:${t.duration*ZOOM-4}px;height:32px;background:${COLORS[t.colorIdx]};border-radius:6px;display:flex;align-items:center;padding:0 10px;color:white;font-size:11px;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,0.12);overflow:hidden;`

      const prog = document.createElement('div')
      prog.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:${t.progress}%;background:rgba(0,0,0,0.2);border-radius:4px 0 0 4px;`

      const label2 = document.createElement('span')
      label2.style.cssText = 'position:relative;z-index:1;white-space:nowrap;'
      label2.textContent = `${t.progress}% - ${t.assignee}`

      bar.appendChild(prog)
      bar.appendChild(label2)
      timeline.appendChild(bar)
      row.appendChild(label)
      row.appendChild(timeline)
      container.appendChild(row)
    })

    document.body.appendChild(container)

    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: container.offsetWidth,
      })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `nexus-gantt-${Date.now()}.png`
      a.click()
    } catch (err) {
      console.error('Image export error:', err)
      alert('Installez html2canvas: npm install html2canvas')
    } finally {
      document.body.removeChild(container)
    }
  }

  // ── Import CSV ──
  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target.result
        const lines = text.split('\n').map(l => l.trim()).filter(l => l)
        if (lines.length < 2) { alert('CSV vide ou invalide.'); return }

        // Parse a CSV line handling quoted fields without lookbehind
        const parseCSVLine = (line) => {
          const result = []
          let current = ''
          let inQuotes = false
          for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') {
              inQuotes = !inQuotes
            } else if (ch === ',' && !inQuotes) {
              result.push(current.trim())
              current = ''
            } else {
              current += ch
            }
          }
          result.push(current.trim())
          return result
        }

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
        const idx = (name) => headers.findIndex(h => h.includes(name))

        const titleIdx    = idx('titre')        !== -1 ? idx('titre')        : 0
        const assigneeIdx = idx('responsable')  !== -1 ? idx('responsable')  : 1
        const statusIdx   = idx('statut')       !== -1 ? idx('statut')       : 2
        const priorityIdx = idx('priorit')      !== -1 ? idx('priorit')      : 3
        const startIdx    = idx('début')        !== -1 ? idx('début')
                          : idx('debut')        !== -1 ? idx('debut')        : 4
        const durationIdx = idx('dur')          !== -1 ? idx('dur')          : 5
        const progressIdx = idx('progress')     !== -1 ? idx('progress')     : 6
        const colorIdx_   = idx('couleur')      !== -1 ? idx('couleur')      : -1

        const validStatuses = ['todo', 'in-progress', 'done']

        const imported = lines.slice(1).map((line, i) => {
          const cols = parseCSVLine(line)
          const get = (idx) => (cols[idx] || '').trim()

          const status = get(statusIdx)
          const colorRaw = colorIdx_ !== -1 ? parseInt(get(colorIdx_)) : NaN

          return {
            id: `imported_${Date.now()}_${i}`,
            title:    get(titleIdx)    || `Tâche ${i + 1}`,
            assignee: get(assigneeIdx) || '',
            status:   validStatuses.includes(status) ? status : 'todo',
            priority: get(priorityIdx) || 'medium',
            start:    Math.max(1, parseInt(get(startIdx))    || 1),
            duration: Math.max(1, parseInt(get(durationIdx)) || 3),
            progress: Math.min(100, Math.max(0, parseInt(get(progressIdx)) || 0)),
            colorIdx: !isNaN(colorRaw) && colorRaw >= 0 && colorRaw < COLORS.length
                      ? colorRaw
                      : i % COLORS.length,
          }
        }).filter(t => t.title)

        if (imported.length === 0) { alert('Aucune tâche trouvée dans le CSV.'); return }

        if (window.confirm(`${imported.length} tâche(s) trouvée(s). Remplacer le projet actuel ?`)) {
          setTasks(imported)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus(null), 2000)
        }
      } catch (err) {
        console.error('CSV import error:', err)
        alert('Erreur de lecture du CSV. Vérifiez le format du fichier.')
      }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

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
        .header { height: 60px; background: #fff; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 300; overflow: visible; }
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
        .save-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border); background: #fff; cursor: pointer; font-size: 12px; font-weight: 600; color: #334155; transition: 0.2s; white-space: nowrap; }
        .save-btn:hover { background: #f1f5f9; }
        .save-btn.saved { border-color: #22c55e; color: #16a34a; background: #f0fdf4; }
        .export-menu { position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 6px; min-width: 190px; box-shadow: 0 8px 16px rgba(0,0,0,0.08); z-index: 200; }
        .export-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; border: none; background: none; width: 100%; cursor: pointer; font-size: 12px; color: #334155; font-weight: 600; transition: 0.15s; text-align: left; }
        .export-item:hover { background: #f1f5f9; color: var(--primary); }
        .export-divider { height: 1px; background: var(--border); margin: 4px 0; }
      `}</style>

      <aside className="sidebar">
        <div style={{ padding: '10px 0 20px', fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>NEXUS</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 20, padding: '6px 12px', marginBottom: 20 }}>
          <Zap size={12} color="#4f46e5" fill="#4f46e5"/>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca' }}>{credits} crédits</span>
        </div>

        <button className={`nav-item ${view === 'gantt' ? 'active' : ''}`} onClick={() => setView('gantt')}>Gantt Timeline</button>
        <button className={`nav-item ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>Kanban Board</button>
        <button className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Task List</button>

        {/* Save + Import in sidebar */}
        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, paddingLeft: 4 }}>Projet</p>

          <button className={`save-btn ${saveStatus === 'saved' ? 'saved' : ''}`} onClick={handleSave}>
            <Save size={13} />
            {saveStatus === 'saving' ? 'Sauvegarde...' : saveStatus === 'saved' ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>

          <button className="save-btn" onClick={() => importRef.current?.click()}>
            <Upload size={13} /> Importer CSV
          </button>
          <input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={handleImport} />
        </div>

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

            {/* Export dropdown */}
            <div style={{ position: 'relative' }}>
              <button className="save-btn" onClick={() => setShowExportMenu(v => !v)}>
                <Download size={13} /> Exporter ▾
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button className="export-item" onClick={exportCSV}>
                    <FileText size={14} color="#1D9E75" /> CSV (tableur)
                  </button>
                  <button className="export-item" onClick={exportHTML}>
                    <FileText size={14} color="#378ADD" /> HTML (web)
                  </button>
                  <div className="export-divider" />
                  <button className="export-item" onClick={exportPDF}>
                    <FileText size={14} color="#D85A30" /> PDF (impression)
                  </button>
                  <button className="export-item" onClick={exportImage}>
                    <ImageIcon size={14} color="#7C3AED" /> Image PNG (Gantt)
                  </button>
                </div>
              )}
            </div>

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