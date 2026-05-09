'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type RecordingMode  = 'tab' | 'window' | 'screen';
type RecordingState = 'idle' | 'recording' | 'paused' | 'preview';

interface Recording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  size: number;
  timestamp: Date;
  name: string;
  thumbnail?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RESOLUTION = {
  '720p':  { width: 1280,  height: 720  },
  '1080p': { width: 1920,  height: 1080 },
  '4K':    { width: 3840,  height: 2160 },
} as const;

const BITRATE: Record<string, number> = {
  '720p': 4_000_000, '1080p': 8_000_000, '4K': 20_000_000,
};

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getSupportedMime() {
  const types = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

async function generateThumbnail(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    video.src = url;
    video.currentTime = 1;
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 180;
      canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 180);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    video.onerror = () => resolve('');
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WebCapturePage() {
  const [mode,         setMode]         = useState<RecordingMode>('tab');
  const [recState,     setRecState]     = useState<RecordingState>('idle');
  const [recordings,   setRecordings]   = useState<Recording[]>([]);
  const [currentRec,   setCurrentRec]   = useState<Recording | null>(null);
  const [elapsed,      setElapsed]      = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [micEnabled,   setMicEnabled]   = useState(false);
  const [quality,      setQuality]      = useState<'720p'|'1080p'|'4K'>('1080p');
  const [fps,          setFps]          = useState<30|60>(60);
  const [error,        setError]        = useState<string|null>(null);
  const [previewUrl,   setPreviewUrl]   = useState<string|null>(null);

  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const streamRef        = useRef<MediaStream|null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval>|null>(null);
  const startTimeRef     = useRef<number>(0);
  const liveVideoRef     = useRef<HTMLVideoElement|null>(null);
  const previewVideoRef  = useRef<HTMLVideoElement|null>(null);

  const isActive = recState === 'recording' || recState === 'paused';

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const res = RESOLUTION[quality];
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { width: { ideal: res.width }, height: { ideal: res.height }, frameRate: { ideal: fps } },
        audio: audioEnabled,
      });

      let finalStream = displayStream;
      if (micEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const ctx  = new AudioContext();
          const dest = ctx.createMediaStreamDestination();
          if (displayStream.getAudioTracks().length > 0)
            ctx.createMediaStreamSource(displayStream).connect(dest);
          ctx.createMediaStreamSource(micStream).connect(dest);
          finalStream = new MediaStream([...displayStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
        } catch { /* mic denied — continue without */ }
      }

      streamRef.current = finalStream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = finalStream;
        liveVideoRef.current.play().catch(() => {});
      }

      const mimeType = getSupportedMime();
      const mr = new MediaRecorder(finalStream, { mimeType, videoBitsPerSecond: BITRATE[quality] });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const thumbnail = await generateThumbnail(blob);
        const rec: Recording = {
          id: Date.now().toString(), blob, url, duration,
          size: blob.size, timestamp: new Date(),
          name: `capture-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`,
          thumbnail,
        };
        setRecordings(prev => [rec, ...prev]);
        setCurrentRec(rec);
        setPreviewUrl(url);
        setRecState('preview');
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
        setElapsed(0);
      };

      finalStream.getVideoTracks()[0].onended = () => stopRecording();
      mr.start(1000);
      mediaRecorderRef.current = mr;
      startTimeRef.current = Date.now();
      setRecState('recording');
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
        1000
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('NotAllowed') || msg.includes('Permission')
        ? "Permission refusée. Autorisez le partage d'écran dans votre navigateur."
        : "Impossible de démarrer l'enregistrement. Vérifiez vos permissions.");
      setRecState('idle');
    }
  }, [mode, audioEnabled, micEnabled, quality, fps]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecState('paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
        1000
      );
      setRecState('recording');
    }
  }, [elapsed]);

  const downloadRecording = (rec: Recording) => {
    const a = document.createElement('a');
    a.href = rec.url; a.download = rec.name; a.click();
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => {
      const r = prev.find(x => x.id === id);
      if (r) URL.revokeObjectURL(r.url);
      return prev.filter(x => x.id !== id);
    });
    if (currentRec?.id === id) { setCurrentRec(null); setPreviewUrl(null); setRecState('idle'); }
  };

  const clearAll = () => {
    recordings.forEach(r => URL.revokeObjectURL(r.url));
    setRecordings([]); setCurrentRec(null); setPreviewUrl(null); setRecState('idle');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

        .wc {
          --bg:#0a0a0a; --surface:#111; --surface2:#1a1a1a; --border:#2a2a2a;
          --accent:#ff3c00; --accent2:#ffcc00; --text:#f0ede8; --muted:#666;
          --success:#00e676; --danger:#ff1744;
          --mono:'Space Mono',monospace; --display:'Bebas Neue',sans-serif; --body:'DM Sans',sans-serif;
          min-height:100vh; display:flex; flex-direction:column;
          background:var(--bg); color:var(--text); font-family:var(--body);
        }

        /* ── Header ── */
        .wc-header { display:flex; align-items:center; gap:1.5rem; padding:1rem 2rem; border-bottom:1px solid var(--border); background:var(--surface); position:sticky; top:0; z-index:100; }
        .wc-logo { display:flex; align-items:center; gap:.5rem; }
        .wc-logo-mark { color:var(--accent); font-size:1.2rem; animation:wc-pulse 2s infinite; }
        @keyframes wc-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .wc-logo-text { font-family:var(--display); font-size:1.6rem; letter-spacing:.1em; }
        .wc-tagline { font-family:var(--mono); font-size:.7rem; color:var(--muted); border-left:1px solid var(--border); padding-left:1.5rem; letter-spacing:.05em; }
        .wc-header-right { margin-left:auto; font-family:var(--mono); font-size:.7rem; color:var(--muted); background:var(--border); padding:.2rem .5rem; border-radius:2px; }
        .wc-version { color:var(--accent2); }

        /* ── Grid ── */
        .wc-main { flex:1; display:grid; grid-template-columns:260px 1fr 280px; overflow:hidden; }
        @media(max-width:1100px){ .wc-main{grid-template-columns:220px 1fr} .wc-library{display:none!important} }
        @media(max-width:720px){ .wc-main{grid-template-columns:1fr} .wc-sidebar{display:none!important} }

        /* ── Sidebar ── */
        .wc-sidebar { border-right:1px solid var(--border); padding:1.5rem; display:flex; flex-direction:column; gap:1.5rem; overflow-y:auto; background:var(--surface); }
        .wc-section { display:flex; flex-direction:column; gap:.75rem; }
        .wc-section-title { font-family:var(--mono); font-size:.65rem; letter-spacing:.12em; color:var(--muted); text-transform:uppercase; display:flex; align-items:center; gap:.5rem; }
        .wc-badge { background:var(--accent); color:#000; font-size:.6rem; padding:.1rem .4rem; border-radius:10px; font-weight:700; }
        .wc-mode-grid { display:flex; flex-direction:column; gap:.4rem; }
        .wc-mode-btn { display:flex; align-items:center; gap:.75rem; padding:.65rem .75rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--muted); font-family:var(--body); font-size:.85rem; cursor:pointer; transition:all .15s; text-align:left; width:100%; }
        .wc-mode-btn:hover:not(:disabled){ border-color:var(--accent); color:var(--text); }
        .wc-mode-btn:disabled{ opacity:.4; cursor:not-allowed; }
        .wc-mode-btn.active{ border-color:var(--accent)!important; color:var(--text)!important; background:rgba(255,60,0,.08)!important; }
        .wc-quality-grid { display:flex; gap:.4rem; }
        .wc-quality-btn { flex:1; padding:.5rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--muted); font-family:var(--mono); font-size:.75rem; cursor:pointer; transition:all .15s; }
        .wc-quality-btn:hover:not(:disabled){ border-color:var(--accent2); color:var(--text); }
        .wc-quality-btn:disabled{ opacity:.4; cursor:not-allowed; }
        .wc-quality-btn.active{ border-color:var(--accent2)!important; color:var(--accent2)!important; }
        .wc-fps-row { display:flex; align-items:center; justify-content:space-between; margin-top:.25rem; }
        .wc-label { font-family:var(--mono); font-size:.7rem; color:var(--muted); }
        .wc-fps-btns { display:flex; gap:.4rem; }
        .wc-fps-btn { padding:.35rem .6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--muted); font-family:var(--mono); font-size:.7rem; cursor:pointer; transition:all .15s; }
        .wc-fps-btn:hover:not(:disabled){ border-color:var(--accent2); color:var(--text); }
        .wc-fps-btn:disabled{ opacity:.4; cursor:not-allowed; }
        .wc-fps-btn.active{ border-color:var(--accent2)!important; color:var(--accent2)!important; }
        .wc-toggle-row { display:flex; align-items:center; justify-content:space-between; }
        .wc-toggle-label { font-size:.85rem; color:var(--text); }
        .wc-toggle { width:44px; height:24px; background:var(--border); border:none; border-radius:12px; cursor:pointer; position:relative; transition:background .2s; flex-shrink:0; }
        .wc-toggle:disabled{ opacity:.4; cursor:not-allowed; }
        .wc-toggle.on{ background:var(--accent)!important; }
        .wc-toggle-thumb { position:absolute; top:3px; left:3px; width:18px; height:18px; background:#fff; border-radius:50%; transition:transform .2s; display:block; pointer-events:none; }
        .wc-toggle.on .wc-toggle-thumb{ transform:translateX(20px); }
        .wc-info-box { background:var(--surface2); border:1px solid var(--border); border-radius:4px; padding:.75rem; display:flex; flex-direction:column; gap:.4rem; }
        .wc-info-line { display:flex; justify-content:space-between; align-items:center; }
        .wc-info-key { font-family:var(--mono); font-size:.65rem; color:var(--muted); }
        .wc-info-val { font-family:var(--mono); font-size:.7rem; color:var(--accent2); }

        /* ── Center ── */
        .wc-center { display:flex; flex-direction:column; padding:1.5rem; gap:1.25rem; overflow-y:auto; }
        .wc-preview-area { aspect-ratio:16/9; background:#050505; border:1px solid var(--border); border-radius:6px; overflow:hidden; position:relative; }
        .wc-live-video,.wc-preview-video { width:100%; height:100%; object-fit:contain; background:#000; display:block; }
        .wc-live-overlay { position:absolute; top:1rem; left:1rem; display:flex; align-items:center; gap:.5rem; background:rgba(0,0,0,.7); padding:.3rem .7rem; border-radius:4px; backdrop-filter:blur(8px); }
        .wc-rec-dot { width:8px; height:8px; background:var(--accent); border-radius:50%; animation:wc-blink 1s infinite; }
        @keyframes wc-blink{ 0%,100%{opacity:1}50%{opacity:0} }
        .wc-rec-label { font-family:var(--mono); font-size:.7rem; color:var(--accent); font-weight:700; }
        .wc-rec-time { font-family:var(--mono); font-size:.8rem; color:var(--text); letter-spacing:.05em; }
        .wc-preview-badge { position:absolute; top:1rem; right:1rem; background:var(--accent2); color:#000; font-family:var(--mono); font-size:.65rem; font-weight:700; padding:.2rem .5rem; border-radius:2px; }
        .wc-idle-screen { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.75rem; color:var(--muted); }
        .wc-idle-text { font-family:var(--display); font-size:1.4rem; letter-spacing:.05em; }
        .wc-idle-sub { font-size:.8rem; text-align:center; max-width:280px; line-height:1.5; }
        .wc-controls { display:flex; justify-content:center; }
        .wc-record-btn { display:flex; align-items:center; gap:.75rem; padding:.9rem 2.5rem; background:var(--accent); border:none; border-radius:4px; color:#fff; font-family:var(--display); font-size:1.1rem; letter-spacing:.1em; cursor:pointer; transition:all .15s; }
        .wc-record-btn:hover:not(:disabled){ background:#ff5520; transform:translateY(-1px); }
        .wc-record-btn:disabled{ opacity:.5; cursor:not-allowed; }
        .wc-record-dot { width:10px; height:10px; background:#fff; border-radius:50%; }
        .wc-active-controls { display:flex; gap:.75rem; }
        .wc-pause-btn { padding:.9rem 1.5rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; color:var(--text); font-family:var(--display); font-size:1rem; letter-spacing:.08em; cursor:pointer; transition:all .15s; }
        .wc-pause-btn:hover{ border-color:var(--accent2); color:var(--accent2); }
        .wc-stop-btn { padding:.9rem 1.5rem; background:var(--danger); border:none; border-radius:4px; color:#fff; font-family:var(--display); font-size:1rem; letter-spacing:.08em; cursor:pointer; transition:all .15s; }
        .wc-stop-btn:hover{ background:#ff4569; }
        .wc-error { display:flex; align-items:center; gap:.75rem; padding:.75rem 1rem; background:rgba(255,23,68,.1); border:1px solid rgba(255,23,68,.3); border-radius:4px; font-size:.85rem; color:var(--danger); }
        .wc-error-close { margin-left:auto; background:none; border:none; color:var(--danger); cursor:pointer; font-size:1rem; }
        .wc-how { background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:1.25rem; }
        .wc-how-title { font-family:var(--mono); font-size:.65rem; letter-spacing:.12em; color:var(--muted); margin-bottom:1rem; }
        .wc-steps { display:flex; flex-direction:column; gap:.75rem; }
        .wc-step { display:flex; align-items:flex-start; gap:1rem; }
        .wc-step-num { font-family:var(--display); font-size:1.4rem; color:var(--accent); line-height:1; min-width:32px; }
        .wc-step-title { font-size:.9rem; font-weight:500; margin-bottom:.15rem; }
        .wc-step-desc { font-size:.78rem; color:var(--muted); line-height:1.4; }

        /* ── Library ── */
        .wc-library { border-left:1px solid var(--border); padding:1.5rem; display:flex; flex-direction:column; gap:1rem; overflow-y:auto; background:var(--surface); }
        .wc-empty-lib { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.5rem; color:var(--muted); font-size:.8rem; }
        .wc-empty-icon { font-size:2rem; opacity:.4; }
        .wc-recordings-list { display:flex; flex-direction:column; gap:.5rem; }
        .wc-rec-item { display:flex; gap:.75rem; padding:.6rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; cursor:pointer; transition:all .15s; align-items:center; }
        .wc-rec-item:hover{ border-color:var(--accent); }
        .wc-rec-item.active{ border-color:var(--accent)!important; background:rgba(255,60,0,.06)!important; }
        .wc-rec-thumb { width:72px; height:40px; border-radius:3px; overflow:hidden; position:relative; flex-shrink:0; background:#000; }
        .wc-thumb-img { width:100%; height:100%; object-fit:cover; }
        .wc-thumb-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:.8rem; }
        .wc-rec-duration { position:absolute; bottom:2px; right:3px; font-family:var(--mono); font-size:.55rem; color:#fff; background:rgba(0,0,0,.7); padding:.1rem .25rem; border-radius:2px; }
        .wc-rec-meta { flex:1; min-width:0; }
        .wc-rec-name { font-size:.75rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:.2rem; }
        .wc-rec-details { display:flex; gap:.3rem; font-family:var(--mono); font-size:.6rem; color:var(--muted); }
        .wc-rec-actions { display:flex; flex-direction:column; gap:.25rem; }
        .wc-dl-btn,.wc-del-btn { padding:.2rem .5rem; border:1px solid var(--border); border-radius:3px; font-size:.75rem; cursor:pointer; transition:all .15s; background:transparent; }
        .wc-dl-btn { color:var(--success); border-color:rgba(0,230,118,.3); }
        .wc-dl-btn:hover{ background:rgba(0,230,118,.1); }
        .wc-del-btn { color:var(--muted); }
        .wc-del-btn:hover{ color:var(--danger); border-color:var(--danger); }
        .wc-lib-footer { border-top:1px solid var(--border); padding-top:.75rem; display:flex; justify-content:space-between; align-items:center; font-family:var(--mono); font-size:.65rem; color:var(--muted); }
        .wc-clear-all { background:none; border:none; color:var(--danger); font-family:var(--mono); font-size:.65rem; cursor:pointer; text-decoration:underline; }

        /* ── Footer ── */
        .wc-footer { display:flex; align-items:center; justify-content:center; gap:.75rem; padding:.75rem; border-top:1px solid var(--border); font-family:var(--mono); font-size:.65rem; color:var(--muted); background:var(--surface); flex-wrap:wrap; }
        .wc-footer-dot { color:var(--accent); font-size:.4rem; }

        /* Scrollbars */
        .wc-sidebar::-webkit-scrollbar,.wc-center::-webkit-scrollbar,.wc-library::-webkit-scrollbar{ width:4px; }
        .wc-sidebar::-webkit-scrollbar-track,.wc-center::-webkit-scrollbar-track,.wc-library::-webkit-scrollbar-track{ background:var(--bg); }
        .wc-sidebar::-webkit-scrollbar-thumb,.wc-center::-webkit-scrollbar-thumb,.wc-library::-webkit-scrollbar-thumb{ background:var(--accent); }
      `}</style>

      <div className="wc">

        {/* ── Header ── */}
        <header className="wc-header">
          <div className="wc-logo">
            <span className="wc-logo-mark">●</span>
            <span className="wc-logo-text">WEBCAPTURE</span>
          </div>
          <div className="wc-tagline">Enregistreur de vidéos navigateur</div>
          <div className="wc-header-right">
            <span className="wc-version">v2.0</span>
          </div>
        </header>

        <main className="wc-main">

          {/* ── Left sidebar ── */}
          <aside className="wc-sidebar">

            <section className="wc-section">
              <h3 className="wc-section-title">MODE DE CAPTURE</h3>
              <div className="wc-mode-grid">
                {(['tab','window','screen'] as RecordingMode[]).map(m => (
                  <button
                    key={m}
                    className={`wc-mode-btn${mode === m ? ' active' : ''}`}
                    onClick={() => setMode(m)}
                    disabled={isActive}
                  >
                    <span>{m === 'tab' ? '⬜' : m === 'window' ? '🗗' : '▣'}</span>
                    <span>{m === 'tab' ? 'Onglet' : m === 'window' ? 'Fenêtre' : 'Écran entier'}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="wc-section">
              <h3 className="wc-section-title">QUALITÉ</h3>
              <div className="wc-quality-grid">
                {(['720p','1080p','4K'] as const).map(q => (
                  <button key={q} className={`wc-quality-btn${quality === q ? ' active' : ''}`} onClick={() => setQuality(q)} disabled={isActive}>{q}</button>
                ))}
              </div>
              <div className="wc-fps-row">
                <span className="wc-label">Images/sec</span>
                <div className="wc-fps-btns">
                  {([30,60] as const).map(f => (
                    <button key={f} className={`wc-fps-btn${fps === f ? ' active' : ''}`} onClick={() => setFps(f)} disabled={isActive}>{f} FPS</button>
                  ))}
                </div>
              </div>
            </section>

            <section className="wc-section">
              <h3 className="wc-section-title">AUDIO</h3>
              <div className="wc-toggle-row">
                <span className="wc-toggle-label">Son système</span>
                <button className={`wc-toggle${audioEnabled ? ' on' : ''}`} onClick={() => setAudioEnabled(v => !v)} disabled={isActive}>
                  <span className="wc-toggle-thumb" />
                </button>
              </div>
              <div className="wc-toggle-row">
                <span className="wc-toggle-label">Microphone</span>
                <button className={`wc-toggle${micEnabled ? ' on' : ''}`} onClick={() => setMicEnabled(v => !v)} disabled={isActive}>
                  <span className="wc-toggle-thumb" />
                </button>
              </div>
            </section>

            <div className="wc-info-box">
              <div className="wc-info-line">
                <span className="wc-info-key">FORMAT</span>
                <span className="wc-info-val">WebM / VP9</span>
              </div>
              <div className="wc-info-line">
                <span className="wc-info-key">DÉBIT VIDÉO</span>
                <span className="wc-info-val">{(BITRATE[quality] / 1_000_000).toFixed(0)} Mbps</span>
              </div>
              <div className="wc-info-line">
                <span className="wc-info-key">RÉSOLUTION</span>
                <span className="wc-info-val">{RESOLUTION[quality].width}×{RESOLUTION[quality].height}</span>
              </div>
            </div>
          </aside>

          {/* ── Center ── */}
          <div className="wc-center">
            <div className="wc-preview-area">
              {isActive ? (
                <>
                  <video ref={liveVideoRef} className="wc-live-video" muted autoPlay playsInline />
                  <div className="wc-live-overlay">
                    <span className="wc-rec-dot" />
                    <span className="wc-rec-label">{recState === 'paused' ? 'PAUSE' : 'REC'}</span>
                    <span className="wc-rec-time">{fmtTime(elapsed)}</span>
                  </div>
                </>
              ) : recState === 'preview' && previewUrl ? (
                <>
                  <video ref={previewVideoRef} src={previewUrl} className="wc-preview-video" controls autoPlay />
                  <div className="wc-preview-badge">APERÇU</div>
                </>
              ) : (
                <div className="wc-idle-screen">
                  <div style={{ opacity: 0.4 }}>
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" opacity=".3" />
                      <circle cx="32" cy="32" r="12" fill="currentColor" opacity=".6" />
                    </svg>
                  </div>
                  <p className="wc-idle-text">Prêt à capturer</p>
                  <p className="wc-idle-sub">Configurez vos paramètres et appuyez sur Enregistrer</p>
                </div>
              )}
            </div>

            <div className="wc-controls">
              {!isActive ? (
                <button className="wc-record-btn" onClick={startRecording}>
                  <span className="wc-record-dot" />
                  {recState === 'preview' ? 'NOUVEL ENREGISTREMENT' : "DÉMARRER L'ENREGISTREMENT"}
                </button>
              ) : (
                <div className="wc-active-controls">
                  <button className="wc-pause-btn" onClick={recState === 'recording' ? pauseRecording : resumeRecording}>
                    {recState === 'recording' ? '⏸ PAUSE' : '▶ REPRENDRE'}
                  </button>
                  <button className="wc-stop-btn" onClick={stopRecording}>⬛ ARRÊTER</button>
                </div>
              )}
            </div>

            {error && (
              <div className="wc-error">
                <span>⚠</span>
                {error}
                <button className="wc-error-close" onClick={() => setError(null)}>✕</button>
              </div>
            )}

            {recState === 'idle' && (
              <div className="wc-how">
                <h4 className="wc-how-title">COMMENT ÇA MARCHE</h4>
                <div className="wc-steps">
                  {([
                    ['01','Choisissez le mode',    'Onglet actuel, fenêtre spécifique ou écran entier'],
                    ['02','Configurez la qualité', "Résolution et fréquence d'images souhaitées"],
                    ['03','Lancez la capture',     'Le navigateur vous demandera de sélectionner la source'],
                    ['04','Téléchargez',           'Votre vidéo est enregistrée en local, aucun serveur impliqué'],
                  ] as const).map(([num, title, desc]) => (
                    <div key={num} className="wc-step">
                      <span className="wc-step-num">{num}</span>
                      <div>
                        <div className="wc-step-title">{title}</div>
                        <div className="wc-step-desc">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Library ── */}
          <aside className="wc-library">
            <h3 className="wc-section-title">
              BIBLIOTHÈQUE
              {recordings.length > 0 && <span className="wc-badge">{recordings.length}</span>}
            </h3>

            {recordings.length === 0 ? (
              <div className="wc-empty-lib">
                <span className="wc-empty-icon">📂</span>
                <p>Aucun enregistrement</p>
              </div>
            ) : (
              <div className="wc-recordings-list">
                {recordings.map(rec => (
                  <div
                    key={rec.id}
                    className={`wc-rec-item${currentRec?.id === rec.id ? ' active' : ''}`}
                    onClick={() => { setCurrentRec(rec); setPreviewUrl(rec.url); setRecState('preview'); }}
                  >
                    <div className="wc-rec-thumb">
                      {rec.thumbnail
                        ? <img src={rec.thumbnail} alt="" className="wc-thumb-img" />
                        : <div className="wc-thumb-placeholder">▶</div>
                      }
                      <span className="wc-rec-duration">{fmtTime(rec.duration)}</span>
                    </div>
                    <div className="wc-rec-meta">
                      <div className="wc-rec-name">{rec.name.slice(0,28)}…</div>
                      <div className="wc-rec-details">
                        <span>{fmtSize(rec.size)}</span>
                        <span>·</span>
                        <span>{rec.timestamp.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    </div>
                    <div className="wc-rec-actions">
                      <button className="wc-dl-btn"  onClick={e => { e.stopPropagation(); downloadRecording(rec); }} title="Télécharger">↓</button>
                      <button className="wc-del-btn" onClick={e => { e.stopPropagation(); deleteRecording(rec.id); }} title="Supprimer">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recordings.length > 0 && (
              <div className="wc-lib-footer">
                <span>Total: {fmtSize(recordings.reduce((s,r) => s + r.size, 0))}</span>
                <button className="wc-clear-all" onClick={clearAll}>Tout effacer</button>
              </div>
            )}
          </aside>
        </main>

        <footer className="wc-footer">
          <span>100% local — aucune donnée envoyée sur un serveur</span>
          <span className="wc-footer-dot">●</span>
          <span>Fonctionne avec Chrome, Edge, Firefox</span>
          <span className="wc-footer-dot">●</span>
          <span>API Screen Capture</span>
        </footer>
      </div>
    </>
  );
}
