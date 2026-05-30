"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */
type CaptureMode = "zone" | "blob";
type VideoStatus = "playing" | "paused" | "ended" | "detected";

interface DetectedVideo {
  id: string;
  title: string;
  src: string;
  srcType: "blob" | "mp4" | "webm" | "hls" | "dash" | "unknown";
  width: number;
  height: number;
  duration: number;
  currentTime: number;
  status: VideoStatus;
  pageUrl: string;
  pageTitle: string;
  thumbnail?: string;
}

interface CapturedFile {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  size: number;
  type: string;
  videoId: string;
  timestamp: Date;
  duration?: number;
}

interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

/* ── Helpers ────────────────────────────────────────────────────────── */
const fmt = (b: number) =>
  b < 1_048_576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1_048_576).toFixed(2)} MB`;

const dur = (s: number) => {
  if (!s || !isFinite(s)) return "—";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const classifyUrl = (url: string): DetectedVideo["srcType"] => {
  if (url.startsWith("blob:")) return "blob";
  if (url.includes(".m3u8")) return "hls";
  if (url.includes(".mpd")) return "dash";
  if (url.includes(".mp4")) return "mp4";
  if (url.includes(".webm")) return "webm";
  return "unknown";
};

/* ── Injector script ────────────────────────────────────────────────── */
const INJECTOR_SCRIPT = `
(function() {
  const RELAY = 'http://localhost:3000/api/deepcapture';
  const videos = Array.from(document.querySelectorAll('video'));
  if (!videos.length) {
    alert('DeepCapture: Aucune balise <video> trouvee sur cette page.');
    return;
  }
  const data = videos.map((v, i) => {
    let thumb = '';
    try {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 180;
      c.getContext('2d').drawImage(v, 0, 0, 320, 180);
      thumb = c.toDataURL('image/jpeg', 0.5);
    } catch(e) {}
    const src = v.currentSrc || v.src || '';
    return {
      id: 'v' + Date.now() + i,
      src,
      width: v.videoWidth || v.offsetWidth || 0,
      height: v.videoHeight || v.offsetHeight || 0,
      duration: isFinite(v.duration) ? v.duration : 0,
      currentTime: v.currentTime || 0,
      status: v.paused ? (v.currentTime === 0 ? 'detected' : 'paused') : v.ended ? 'ended' : 'playing',
      pageUrl: location.href,
      pageTitle: document.title,
      thumbnail: thumb
    };
  });
  fetch(RELAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videos: data })
  })
  .then(r => r.json())
  .then(res => {
    if (res.ok) {
      alert('DeepCapture: ' + res.count + ' video(s) envoyee(s) ! Cliquez Ecouter dans DeepCapture.');
    } else {
      alert('DeepCapture: Erreur lors de l envoi.');
    }
  })
  .catch(() => alert('DeepCapture: Impossible de contacter localhost:3000. Verifiez que npm run dev est lance.'));
})();
`.trim();

const BOOKMARKLET = `javascript:${encodeURIComponent(INJECTOR_SCRIPT)}`;

/* ── CSS-in-JS design tokens ────────────────────────────────────────── */
const C = {
  bg:       "#0a0a10",
  surface:  "#12121c",
  surface2: "#1a1a28",
  border:   "rgba(255,255,255,0.08)",
  text:     "#e2e8f0",
  muted:    "rgba(255,255,255,0.4)",
  accent:   "#ef4444",
  accent2:  "#ffcc00",
  success:  "#22c55e",
  warn:     "#f59e0b",
  mono:     "'DM Mono', 'Fira Mono', monospace",
  display:  "'Inter', sans-serif",
};

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════ */
export default function DeepCapture() {
  const [captureMode, setCaptureMode] = useState<CaptureMode>("zone");
  const [videos, setVideos] = useState<DetectedVideo[]>([]);
  const [selected, setSelected] = useState<DetectedVideo | null>(null);
  const [captures, setCaptures] = useState<CapturedFile[]>([]);
  const [preview, setPreview] = useState<CapturedFile | null>(null);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [polling, setPolling] = useState(false);
  const [step, setStep] = useState<"idle" | "waiting" | "found" | "capturing">("idle");
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showBookmarklet, setShowBookmarklet] = useState(false);

  /* ── Zone editor state ───────────────────────────────────────────── */
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [zone, setZone] = useState<Zone>({ x: 0, y: 0, w: 0, h: 0 });
  const [streamForZone, setStreamForZone] = useState<MediaStream | null>(null);

  /* ── Refs ────────────────────────────────────────────────────────── */
  const mrRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);

  /* ── Resize refs for all 4 corners ──────────────────────────────── */
  const resizeRef = useRef<{
    active: boolean;
    corner: "nw" | "ne" | "sw" | "se" | null;
    mx: number; my: number;
    ox: number; oy: number; ow: number; oh: number;
  }>({ active: false, corner: null, mx: 0, my: 0, ox: 0, oy: 0, ow: 0, oh: 0 });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mx: 0, my: 0, zx: 0, zy: 0 });

  const addLog = useCallback((msg: string, type: "info" | "ok" | "err" | "warn" = "info") => {
    const prefix = type === "ok" ? "✅" : type === "err" ? "❌" : type === "warn" ? "⚠️" : "›";
    setLog(p => [`[${new Date().toLocaleTimeString("fr-FR")}] ${prefix} ${msg}`, ...p.slice(0, 299)]);
  }, []);

  /* ── Handle incoming detected videos ───────────────────────────── */
  const handleDetectedVideos = useCallback((rawVideos: DetectedVideo[]) => {
    const processed: DetectedVideo[] = rawVideos.map(v => ({
      ...v,
      title: v.pageTitle || (() => {
        try { return new URL(v.pageUrl || location.href).hostname; } catch { return v.pageUrl; }
      })(),
      srcType: classifyUrl(v.src),
    }));
    setVideos(processed);
    setSelected(processed[0] || null);
    setStep("found");
    addLog(`${processed.length} vidéo(s) détectée(s) !`, "ok");
    processed.forEach(v => {
      addLog(`  • ${v.srcType.toUpperCase()} · ${v.width}×${v.height} · ${dur(v.duration)} · ${v.status}`, "info");
    });
  }, [addLog]);

  /* ── Poll relay API ─────────────────────────────────────────────── */
  const startPolling = useCallback(() => {
    setPolling(true);
    setStep("waiting");
    addLog("Écoute de l'API relay (localhost:3000/api/deepcapture)...", "info");
    addLog("Exécutez maintenant le script sur la page cible.", "info");
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries++;
      try {
        const res = await fetch("/api/deepcapture");
        const data = await res.json();
        if (data.ok && Array.isArray(data.videos) && data.videos.length > 0) {
          clearInterval(pollRef.current!);
          setPolling(false);
          handleDetectedVideos(data.videos);
          return;
        }
      } catch { /* local API always available */ }
      if (tries > 120) {
        clearInterval(pollRef.current!);
        setPolling(false);
        setStep("idle");
        addLog("Timeout (60s) — aucun résultat. Avez-vous exécuté le script sur la page cible ?", "err");
      }
    }, 500);
  }, [handleDetectedVideos, addLog]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPolling(false);
    setStep("idle");
  }, []);

  /* ── Cleanup ─────────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(INJECTOR_SCRIPT);
      setCopied(true);
      addLog("Script copié dans le presse-papiers !", "ok");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addLog("Échec de la copie.", "err");
    }
  };

  /* ════════════════════════════════════════════════════════════════
     ZONE CAPTURE — step 1 : get stream and open editor
  ════════════════════════════════════════════════════════════════ */
  const startZoneCapture = useCallback(async () => {
    setError(null);
    addLog("Demande du partage d'écran...", "info");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60 }, width: { ideal: 1920 }, height: { ideal: 1080 } } as MediaTrackConstraints,
        audio: true,
      });
      const hasAudio = stream.getAudioTracks().length > 0;
      addLog(`Flux obtenu — audio: ${hasAudio ? "✓" : "✗ (partagez un onglet)"}`, hasAudio ? "ok" : "warn");

      const vid = document.createElement("video");
      vid.srcObject = stream;
      vid.muted = true;
      await vid.play();
      sourceVideoRef.current = vid;

      const vw = vid.videoWidth || 1920;
      const vh = vid.videoHeight || 1080;
      setZone({
        x: Math.round(vw * 0.1),
        y: Math.round(vh * 0.1),
        w: Math.round(vw * 0.8),
        h: Math.round(vh * 0.8),
      });

      setStreamForZone(stream);
      setShowZoneEditor(true);
      addLog("Ajustez la zone (4 coins) puis cliquez Démarrer.", "ok");

      stream.getVideoTracks()[0].onended = () => {
        setShowZoneEditor(false);
        setStreamForZone(null);
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        addLog("Partage arrêté.", "warn");
      };
    } catch (e: unknown) {
      const msg = (e as Error).message || "";
      setError(msg.includes("Permission") || msg.includes("NotAllowed")
        ? "Permission refusée. Autorisez le partage d'écran."
        : "Erreur : " + msg);
      addLog("Erreur : " + msg, "err");
    }
  }, [addLog]);

  /* ════════════════════════════════════════════════════════════════
     ZONE CAPTURE — step 2 : record cropped canvas
  ════════════════════════════════════════════════════════════════ */
  const startCroppedRecording = useCallback(() => {
    if (!sourceVideoRef.current || !streamForZone) return;
    const vid = sourceVideoRef.current;
    const { x, y, w, h } = zone;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      ctx.drawImage(vid, x, y, w, h, 0, 0, w, h);
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    const canvasStream = (canvas as HTMLCanvasElement & {
      captureStream(fps?: number): MediaStream;
    }).captureStream(60);

    streamForZone.getAudioTracks().forEach(t => canvasStream.addTrack(t));
    streamRef.current = streamForZone;

    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
      .find(t => MediaRecorder.isTypeSupported(t)) || "";

    const mr = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 8_000_000 });
    chunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      cancelAnimationFrame(animFrameRef.current);
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      const cap: CapturedFile = {
        id: Date.now().toString(),
        name: `deepcapture-zone-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`,
        blob, url, size: blob.size, type: "video/webm",
        videoId: selected?.id || "zone",
        timestamp: new Date(), duration,
      };
      setCaptures(p => [cap, ...p]);
      setPreview(cap);
      setRecording(false);
      setShowZoneEditor(false);
      setStreamForZone(null);
      if (timerRef.current) clearInterval(timerRef.current);
      addLog(`Capture terminée — ${fmt(blob.size)} · ${dur(duration)}`, "ok");
    };

    mr.start(1000);
    mrRef.current = mr;
    startRef.current = Date.now();
    setElapsed(0);
    setRecording(true);
    setStep("capturing");
    setShowZoneEditor(false);
    timerRef.current = setInterval(() =>
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    addLog(`⏺ Enregistrement zone ${w}×${h} @ (${x}, ${y})`, "ok");
  }, [zone, streamForZone, selected, addLog]);

  const stopCapture = useCallback(() => {
    mrRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  /* ════════════════════════════════════════════════════════════════
     BLOB / DIRECT DOWNLOAD
  ════════════════════════════════════════════════════════════════ */
  const downloadBlob = useCallback(async (vid: DetectedVideo) => {
    setError(null);
    setDownloading(true);
    setDlProgress(0);
    addLog(`Téléchargement : ${vid.src.slice(0, 60)}...`, "info");
    try {
      if (vid.srcType === "blob") {
        throw new Error("URLs blob: inaccessibles cross-origin. Utilisez Capture Zone.");
      }
      const resp = await fetch(vid.src, { mode: "cors" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} — accès refusé.`);
      const total = Number(resp.headers.get("content-length") || 0);
      const reader = resp.body!.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) setDlProgress(Math.round((loaded / total) * 100));
      }
      const blob = new Blob(chunks as BlobPart[], { type: `video/${vid.srcType}` });
      const url = URL.createObjectURL(blob);
      const cap: CapturedFile = {
        id: Date.now().toString(),
        name: `deepcapture-${vid.srcType}-${Date.now()}.${vid.srcType}`,
        blob, url, size: blob.size, type: blob.type,
        videoId: vid.id, timestamp: new Date(),
      };
      setCaptures(p => [cap, ...p]);
      setPreview(cap);
      addLog(`Téléchargement terminé — ${fmt(blob.size)}`, "ok");
      const a = document.createElement("a");
      a.href = url; a.download = cap.name; a.click();
    } catch (e: unknown) {
      const msg = (e as Error).message;
      setError(msg);
      addLog("Erreur : " + msg, "err");
    } finally {
      setDownloading(false);
      setDlProgress(0);
    }
  }, [addLog]);

  const deleteCapture = (id: string) => {
    setCaptures(p => {
      const c = p.find(x => x.id === id);
      if (c) URL.revokeObjectURL(c.url);
      return p.filter(x => x.id !== id);
    });
    if (preview?.id === id) setPreview(null);
  };

  /* ════════════════════════════════════════════════════════════════
     ZONE EDITOR — fullscreen overlay with 4-corner resize
  ════════════════════════════════════════════════════════════════ */
  const ZoneEditor = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const vid = sourceVideoRef.current;

    useEffect(() => {
      if (!vid || !canvasRef.current) return;
      const c = canvasRef.current;
      const ctx = c.getContext("2d")!;
      let raf: number;
      const draw = () => { ctx.drawImage(vid, 0, 0, c.width, c.height); raf = requestAnimationFrame(draw); };
      draw();
      return () => cancelAnimationFrame(raf);
    }, [vid]);

    if (!vid) return null;

    const VW = vid.videoWidth || 1920;
    const VH = vid.videoHeight || 1080;
    const maxW = Math.min(typeof window !== "undefined" ? window.innerWidth - 80 : 880, 960);
    const maxH = Math.min(typeof window !== "undefined" ? window.innerHeight - 300 : 500, 540);
    const scale = Math.min(maxW / VW, maxH / VH);
    const dw = Math.round(VW * scale);
    const dh = Math.round(VH * scale);

    const dz = {
      x: Math.round(zone.x * scale),
      y: Math.round(zone.y * scale),
      w: Math.max(4, Math.round(zone.w * scale)),
      h: Math.max(4, Math.round(zone.h * scale)),
    };

    /* ── Drag to move zone ── */
    const onMouseDownMove = (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = containerRef.current!.getBoundingClientRect();
      isDraggingRef.current = true;
      dragStartRef.current = { mx: e.clientX - rect.left, my: e.clientY - rect.top, zx: zone.x, zy: zone.y };
      const onMove = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const dx = (ev.clientX - rect.left - dragStartRef.current.mx) / scale;
        const dy = (ev.clientY - rect.top - dragStartRef.current.my) / scale;
        setZone(z => ({
          ...z,
          x: Math.max(0, Math.min(VW - z.w, Math.round(dragStartRef.current.zx + dx))),
          y: Math.max(0, Math.min(VH - z.h, Math.round(dragStartRef.current.zy + dy))),
        }));
      };
      const onUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    /* ── 4-corner resize ── */
    const onMouseDownCorner = (e: React.MouseEvent, corner: "nw" | "ne" | "sw" | "se") => {
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current!.getBoundingClientRect();
      resizeRef.current = {
        active: true, corner,
        mx: e.clientX - rect.left, my: e.clientY - rect.top,
        ox: zone.x, oy: zone.y, ow: zone.w, oh: zone.h,
      };
      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current.active) return;
        const { corner: c, mx, my, ox, oy, ow, oh } = resizeRef.current;
        const ddx = (ev.clientX - rect.left - mx) / scale;
        const ddy = (ev.clientY - rect.top - my) / scale;

        setZone(z => {
          let nx = z.x, ny = z.y, nw = z.w, nh = z.h;

          if (c === "se") {
            // bottom-right: expand/shrink right & bottom
            nw = Math.max(100, Math.min(VW - ox, Math.round(ow + ddx)));
            nh = Math.max(60,  Math.min(VH - oy, Math.round(oh + ddy)));
          } else if (c === "sw") {
            // bottom-left: move left edge, expand bottom
            const newX = Math.max(0, Math.min(ox + ow - 100, Math.round(ox + ddx)));
            nw = Math.max(100, Math.round(ox + ow - newX));
            nx = newX;
            nh = Math.max(60, Math.min(VH - oy, Math.round(oh + ddy)));
          } else if (c === "ne") {
            // top-right: move top edge, expand right
            const newY = Math.max(0, Math.min(oy + oh - 60, Math.round(oy + ddy)));
            nh = Math.max(60, Math.round(oy + oh - newY));
            ny = newY;
            nw = Math.max(100, Math.min(VW - ox, Math.round(ow + ddx)));
          } else if (c === "nw") {
            // top-left: move both top & left edges
            const newX = Math.max(0, Math.min(ox + ow - 100, Math.round(ox + ddx)));
            const newY = Math.max(0, Math.min(oy + oh - 60, Math.round(oy + ddy)));
            nw = Math.max(100, Math.round(ox + ow - newX));
            nh = Math.max(60, Math.round(oy + oh - newY));
            nx = newX;
            ny = newY;
          }
          return { x: nx, y: ny, w: nw, h: nh };
        });
      };
      const onUp = () => {
        resizeRef.current.active = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    const presets = [
      { label: "Plein écran",   z: { x: 0, y: 0, w: VW, h: VH } },
      { label: "Centre 80%",    z: { x: Math.round(VW * 0.1), y: Math.round(VH * 0.1), w: Math.round(VW * 0.8), h: Math.round(VH * 0.8) } },
      { label: "Moitié gauche", z: { x: 0, y: 0, w: Math.round(VW / 2), h: VH } },
      { label: "Moitié droite", z: { x: Math.round(VW / 2), y: 0, w: Math.round(VW / 2), h: VH } },
      { label: "Quart centre",  z: { x: Math.round(VW * 0.25), y: Math.round(VH * 0.25), w: Math.round(VW * 0.5), h: Math.round(VH * 0.5) } },
    ];

    const btnBase: React.CSSProperties = {
      padding: "0.3rem 0.7rem",
      background: C.surface2,
      border: `1px solid ${C.border}`,
      borderRadius: 4, color: C.muted,
      fontFamily: C.mono, fontSize: "0.65rem", cursor: "pointer",
    };

    /* Corner handle positions */
    const corners: { id: "nw"|"ne"|"sw"|"se"; style: React.CSSProperties; label: string }[] = [
      { id: "nw", label: "↖", style: { left: -10, top: -10, cursor: "nw-resize" } },
      { id: "ne", label: "↗", style: { right: -10, top: -10, cursor: "ne-resize" } },
      { id: "sw", label: "↙", style: { left: -10, bottom: -10, cursor: "sw-resize" } },
      { id: "se", label: "↘", style: { right: -10, bottom: -10, cursor: "se-resize" } },
    ];

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.93)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: "0.85rem", padding: "1.5rem", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontFamily: C.display, fontSize: "1.3rem", letterSpacing: "0.1em", color: C.accent2 }}>
            ⬢ AJUSTER LA ZONE DE CAPTURE
          </span>
          <span style={{
            fontFamily: C.mono, fontSize: "0.65rem", color: C.muted,
            background: C.surface2, border: `1px solid ${C.border}`,
            padding: "0.2rem 0.5rem", borderRadius: 4,
          }}>
            source {VW}×{VH}
          </span>
        </div>
        <div style={{ fontFamily: C.mono, fontSize: "0.68rem", color: C.muted }}>
          Glissez la zone · 4 coins pour redimensionner librement · Ou saisissez les valeurs exactes
        </div>

        {/* Preview canvas with overlay */}
        <div ref={containerRef} style={{ position: "relative", width: dw, height: dh, flexShrink: 0 }}>
          <canvas ref={canvasRef} width={dw} height={dh}
            style={{ display: "block", borderRadius: 6, border: `1px solid ${C.border}` }} />

          {/* Dark mask around zone */}
          <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width={dw} height={dh}>
            <defs>
              <mask id="zm">
                <rect width={dw} height={dh} fill="white" />
                <rect x={dz.x} y={dz.y} width={dz.w} height={dz.h} fill="black" />
              </mask>
            </defs>
            <rect width={dw} height={dh} fill="rgba(0,0,0,0.6)" mask="url(#zm)" />
            {/* Rule of thirds */}
            {[1/3, 2/3].map((t, i) => (
              <g key={i}>
                <line x1={dz.x + dz.w * t} y1={dz.y} x2={dz.x + dz.w * t} y2={dz.y + dz.h} stroke="rgba(255,204,0,0.25)" strokeWidth="1" />
                <line x1={dz.x} y1={dz.y + dz.h * t} x2={dz.x + dz.w} y2={dz.y + dz.h * t} stroke="rgba(255,204,0,0.25)" strokeWidth="1" />
              </g>
            ))}
          </svg>

          {/* Draggable + resizable zone box */}
          <div
            onMouseDown={onMouseDownMove}
            style={{
              position: "absolute", left: dz.x, top: dz.y, width: dz.w, height: dz.h,
              border: `2px solid ${C.accent2}`, boxSizing: "border-box", cursor: "move",
              boxShadow: "0 0 0 1px rgba(255,204,0,0.2)",
            }}
          >
            {/* Dimensions label top-left */}
            <div style={{
              position: "absolute", top: -26, left: -2,
              fontFamily: C.mono, fontSize: "0.65rem",
              background: C.accent2, color: "#000",
              padding: "0.15rem 0.5rem", borderRadius: "3px 3px 0 0",
              whiteSpace: "nowrap", fontWeight: 700,
            }}>
              {zone.w} × {zone.h}
            </div>

            {/* Position label bottom-right */}
            <div style={{
              position: "absolute", bottom: -22, right: -2,
              fontFamily: C.mono, fontSize: "0.58rem", color: C.muted, whiteSpace: "nowrap",
            }}>
              ({zone.x}, {zone.y})
            </div>

            {/* ── 4 corner handles ── */}
            {corners.map(({ id, label, style }) => (
              <div
                key={id}
                onMouseDown={e => onMouseDownCorner(e, id)}
                style={{
                  position: "absolute",
                  width: 22, height: 22,
                  background: C.accent2,
                  borderRadius: 4,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "#000", fontWeight: 700,
                  userSelect: "none",
                  ...style,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Numeric inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", width: Math.min(dw, 640) }}>
          {([
            { k: "x" as const, label: "Position X", min: 0, max: VW - zone.w },
            { k: "y" as const, label: "Position Y", min: 0, max: VH - zone.h },
            { k: "w" as const, label: "Largeur",    min: 100, max: VW - zone.x },
            { k: "h" as const, label: "Hauteur",    min: 60,  max: VH - zone.y },
          ]).map(({ k, label, min, max }) => (
            <label key={k} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontFamily: C.mono, fontSize: "0.58rem", color: C.muted, textTransform: "uppercase" }}>
                {label}
              </span>
              <input
                type="number"
                value={zone[k]}
                min={min} max={max}
                onChange={e => {
                  const val = parseInt(e.target.value) || 0;
                  setZone(z => ({ ...z, [k]: Math.max(min, Math.min(max, val)) }));
                }}
                style={{
                  background: C.surface2, border: `1px solid ${C.border}`,
                  borderRadius: 4, padding: "0.45rem 0.5rem",
                  color: C.text, fontFamily: C.mono, fontSize: "0.82rem", width: "100%",
                }}
              />
            </label>
          ))}
        </div>

        {/* Presets */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontFamily: C.mono, fontSize: "0.6rem", color: C.muted, alignSelf: "center" }}>PRESETS :</span>
          {presets.map(p => (
            <button key={p.label} onClick={() => setZone(p.z)} style={btnBase}>{p.label}</button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
          <button
            onClick={() => {
              setShowZoneEditor(false);
              streamForZone?.getTracks().forEach(t => t.stop());
              setStreamForZone(null);
              if (sourceVideoRef.current) { sourceVideoRef.current.srcObject = null; sourceVideoRef.current = null; }
            }}
            style={{
              padding: "0.65rem 1.5rem", background: "transparent",
              border: `1px solid ${C.border}`, borderRadius: 4,
              color: C.muted, fontFamily: C.mono, fontSize: "0.8rem", cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={startCroppedRecording}
            style={{
              padding: "0.65rem 2.5rem", background: C.accent,
              border: "none", borderRadius: 4, color: "white",
              fontFamily: C.display, fontSize: "1rem",
              letterSpacing: "0.1em", cursor: "pointer",
            }}
          >
            ⏺ DÉMARRER L&apos;ENREGISTREMENT
          </button>
        </div>

        {/* Zone info */}
        <div style={{
          fontFamily: C.mono, fontSize: "0.62rem", color: C.muted,
          background: C.surface2, border: `1px solid ${C.border}`,
          padding: "0.4rem 1rem", borderRadius: 4,
        }}>
          Zone : {zone.w}×{zone.h}px · départ ({zone.x}, {zone.y}) · ratio {(zone.w / (zone.h || 1)).toFixed(2)}:1
        </div>
      </div>
    );
  };

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.display, display: "flex", flexDirection: "column" }}>

      {showZoneEditor && <ZoneEditor />}

      {/* TOP BAR */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1.5rem", background: C.surface,
        borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.2rem", color: C.accent2 }}>⬢</span>
          <span style={{ fontFamily: C.display, fontWeight: 800, fontSize: "1rem", letterSpacing: "0.12em", color: C.text }}>
            DEEPCAPTURE
          </span>
          <span style={{ fontFamily: C.mono, fontSize: "0.6rem", color: C.muted }}>
            Détection réelle · Zone 4 coins · Source directe
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {videos.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "0.25rem 0.75rem", fontFamily: C.mono, fontSize: "0.7rem", color: C.success }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, display: "inline-block" }} />
              {videos.length} vidéo{videos.length > 1 ? "s" : ""} détectée{videos.length > 1 ? "s" : ""}
            </div>
          )}
          {recording && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: C.surface2, border: `1px solid ${C.accent}`, borderRadius: 20, padding: "0.25rem 0.75rem", fontFamily: C.mono, fontSize: "0.7rem", color: C.accent }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, display: "inline-block", animation: "pulse 1s infinite" }} />
              REC {fmtTime(elapsed)}
            </div>
          )}
        </div>
      </div>

      {/* MAIN 3-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 280px", flex: 1, overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        <aside style={{ background: C.surface, borderRight: `1px solid ${C.border}`, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Step 01 */}
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ fontFamily: C.mono, fontSize: "1.8rem", fontWeight: 700, color: C.accent2, lineHeight: 1 }}>01</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.25rem" }}>Injecter le détecteur</div>
                <div style={{ fontFamily: C.mono, fontSize: "0.7rem", color: C.muted, lineHeight: 1.5 }}>
                  Ouvrez la page avec la vidéo, collez le script dans la console (F12) et appuyez sur Entrée.
                </div>
              </div>
            </div>
            <pre style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4,
              padding: "0.5rem", fontFamily: C.mono, fontSize: "0.58rem", color: C.muted,
              overflowX: "auto", maxHeight: 120, margin: "0 0 0.75rem",
            }}>{INJECTOR_SCRIPT}</pre>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={copyScript}
                style={{ flex: 1, padding: "0.5rem", background: copied ? C.success : C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: copied ? "#fff" : C.text, fontFamily: C.mono, fontSize: "0.72rem", cursor: "pointer" }}
              >
                {copied ? "✓ Copié !" : "📋 Copier le script"}
              </button>
              <button
                onClick={() => setShowBookmarklet(!showBookmarklet)}
                style={{ padding: "0.5rem 0.75rem", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: C.mono, fontSize: "0.72rem", cursor: "pointer" }}
              >
                🔖
              </button>
            </div>
            {showBookmarklet && (
              <div style={{ marginTop: "0.75rem", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: "0.75rem" }}>
                <p style={{ fontFamily: C.mono, fontSize: "0.62rem", color: C.muted, marginBottom: "0.5rem" }}>Glissez dans vos favoris :</p>
                <a href={BOOKMARKLET} style={{ fontFamily: C.mono, fontSize: "0.75rem", color: C.accent2, textDecoration: "none" }} onClick={e => e.preventDefault()} draggable>
                  ⬢ DeepCapture
                </a>
              </div>
            )}
          </div>

          {/* Step 02 */}
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ fontFamily: C.mono, fontSize: "1.8rem", fontWeight: 700, color: C.accent2, lineHeight: 1 }}>02</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.25rem" }}>Recevoir les résultats</div>
                <div style={{ fontFamily: C.mono, fontSize: "0.7rem", color: C.muted, lineHeight: 1.5 }}>
                  Après avoir exécuté le script, cliquez ci-dessous. DeepCapture écoute pendant 60s.
                </div>
              </div>
            </div>
            {!polling ? (
              <button
                onClick={startPolling}
                disabled={step === "capturing"}
                style={{ width: "100%", padding: "0.65rem", background: "#1e3a5f", border: `1px solid #3b82f6`, borderRadius: 4, color: "#93c5fd", fontFamily: C.mono, fontSize: "0.8rem", cursor: "pointer" }}
              >
                📡 Écouter les résultats
              </button>
            ) : (
              <button
                onClick={stopPolling}
                style={{ width: "100%", padding: "0.65rem", background: "rgba(239,68,68,0.1)", border: `1px solid ${C.accent}`, borderRadius: 4, color: C.accent, fontFamily: C.mono, fontSize: "0.8rem", cursor: "pointer" }}
              >
                ⏳ En attente... (Annuler)
              </button>
            )}
          </div>

          {/* Step 03 */}
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ fontFamily: C.mono, fontSize: "1.8rem", fontWeight: 700, color: C.accent2, lineHeight: 1 }}>03</div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Mode de capture</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { id: "zone" as CaptureMode, icon: "🎯", name: "Capture Zone", desc: "Zone 4 coins — fonctionne avec DRM, blob, HLS" },
                { id: "blob" as CaptureMode, icon: "⬇️", name: "Source directe", desc: "Télécharge le fichier brut (MP4, WebM sans DRM)" },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setCaptureMode(m.id)}
                  style={{
                    display: "flex", gap: "0.75rem", alignItems: "flex-start",
                    padding: "0.65rem", background: captureMode === m.id ? "rgba(255,204,0,0.08)" : "transparent",
                    border: `1px solid ${captureMode === m.id ? C.accent2 : C.border}`,
                    borderRadius: 6, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.8rem", color: captureMode === m.id ? C.accent2 : C.text }}>{m.name}</div>
                    <div style={{ fontFamily: C.mono, fontSize: "0.62rem", color: C.muted, marginTop: 2 }}>{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Compat */}
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "1rem" }}>
            <div style={{ fontFamily: C.mono, fontSize: "0.65rem", fontWeight: 700, color: C.muted, marginBottom: "0.5rem" }}>📊 COMPATIBILITÉ</div>
            {[
              ["🟢", "VEED.io (blob)", "Zone ✓"],
              ["🟢", "YouTube (HLS+DRM)", "Zone ✓"],
              ["🟢", "Vimeo, Dailymotion", "Zone ✓"],
              ["🟡", "MP4 direct (CORS ok)", "Source ✓"],
              ["🔴", "Netflix (Widevine DRM)", "Zone ✓*"],
            ].map(([icon, name, cap]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontFamily: C.mono, fontSize: "0.65rem", padding: "0.25rem 0", borderBottom: `1px solid ${C.border}` }}>
                <span>{icon} {name}</span><span style={{ color: C.muted }}>{cap}</span>
              </div>
            ))}
            <div style={{ fontFamily: C.mono, fontSize: "0.58rem", color: C.muted, marginTop: "0.4rem" }}>* Zone contourne le DRM visuellement</div>
          </div>
        </aside>

        {/* CENTER */}
        <div style={{ padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h3 style={{ fontFamily: C.mono, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: C.muted, margin: 0 }}>VIDÉOS DÉTECTÉES</h3>
              {step === "waiting" && (
                <span style={{ fontFamily: C.mono, fontSize: "0.7rem", color: C.accent2 }}>⏳ En écoute...</span>
              )}
            </div>

            {videos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: C.muted, fontFamily: C.mono, fontSize: "0.8rem" }}>
                {step === "idle" && <><div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⬡</div><p>Suivez les étapes à gauche</p><p style={{ fontSize: "0.65rem", marginTop: "0.25rem" }}>Le script détecte les vrais éléments &lt;video&gt;</p></>}
                {step === "waiting" && <><div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📡</div><p>Attente du script...</p><p style={{ fontSize: "0.65rem", marginTop: "0.25rem" }}>Exécutez le script dans la console de la page cible</p></>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {videos.map(v => (
                  <div
                    key={v.id}
                    onClick={() => setSelected(v)}
                    style={{
                      display: "flex", gap: "0.75rem",
                      background: selected?.id === v.id ? "rgba(255,204,0,0.06)" : C.surface2,
                      border: `1px solid ${selected?.id === v.id ? C.accent2 : C.border}`,
                      borderRadius: 8, padding: "0.75rem", cursor: "pointer",
                    }}
                  >
                    {v.thumbnail && <img src={v.thumbnail} style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} alt="" />}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                        <span style={{ fontFamily: C.mono, fontSize: "0.6rem", background: "#1e3a5f", color: "#93c5fd", padding: "0.1rem 0.4rem", borderRadius: 3 }}>{v.srcType.toUpperCase()}</span>
                        <span style={{ fontFamily: C.mono, fontSize: "0.6rem", background: v.status === "playing" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", color: v.status === "playing" ? C.success : C.muted, padding: "0.1rem 0.4rem", borderRadius: 3 }}>
                          {v.status === "playing" ? "▶ En lecture" : v.status === "paused" ? "⏸ Pause" : "⏹ Fin"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem" }}>{v.pageTitle || v.pageUrl}</div>
                      <div style={{ fontFamily: C.mono, fontSize: "0.62rem", color: C.muted }}>
                        {v.width > 0 && <span>{v.width}×{v.height} </span>}
                        {v.duration > 0 && <span>· {dur(v.duration)} </span>}
                        {v.currentTime > 0 && <span>· à {dur(v.currentTime)}</span>}
                      </div>
                      <div style={{ fontFamily: C.mono, fontSize: "0.58rem", color: C.muted, marginTop: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.src.slice(0, 70)}{v.src.length > 70 ? "…" : ""}
                      </div>
                      {selected?.id === v.id && (
                        <div style={{ marginTop: "0.75rem" }}>
                          {captureMode === "zone" ? (
                            !recording ? (
                              <button
                                onClick={startZoneCapture}
                                style={{ padding: "0.5rem 1rem", background: C.accent2, border: "none", borderRadius: 4, color: "#000", fontFamily: C.mono, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                              >
                                🎯 Choisir la zone (4 coins) et capturer
                              </button>
                            ) : (
                              <button
                                onClick={stopCapture}
                                style={{ padding: "0.5rem 1rem", background: C.accent, border: "none", borderRadius: 4, color: "#fff", fontFamily: C.mono, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                              >
                                ⬛ Arrêter ({fmtTime(elapsed)})
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => downloadBlob(v)}
                              disabled={downloading}
                              style={{ padding: "0.5rem 1rem", background: "#1e3a5f", border: `1px solid #3b82f6`, borderRadius: 4, color: "#93c5fd", fontFamily: C.mono, fontSize: "0.75rem", cursor: "pointer" }}
                            >
                              {downloading ? `⬇️ ${dlProgress}%` : "⬇️ Télécharger source directe"}
                            </button>
                          )}
                          {v.srcType === "blob" && captureMode === "blob" && (
                            <div style={{ marginTop: "0.5rem", fontFamily: C.mono, fontSize: "0.65rem", color: C.warn }}>
                              ⚠️ Blob URL — utilisez <strong>Capture Zone</strong>.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {downloading && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ flex: 1, height: 6, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${dlProgress}%`, height: "100%", background: C.accent2, transition: "width 0.3s" }} />
              </div>
              <span style={{ fontFamily: C.mono, fontSize: "0.7rem", color: C.muted, minWidth: 32 }}>{dlProgress}%</span>
            </div>
          )}

          {error && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(239,68,68,0.1)", border: `1px solid ${C.accent}`, borderRadius: 6, padding: "0.75rem 1rem" }}>
              <span style={{ fontFamily: C.mono, fontSize: "0.75rem", color: C.accent }}>⚠️ {error}</span>
              <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1rem" }}>✕</button>
            </div>
          )}

          {preview && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <h3 style={{ fontFamily: C.mono, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: C.muted, margin: 0 }}>APERÇU</h3>
                <span style={{ fontFamily: C.mono, fontSize: "0.65rem", color: C.muted }}>{preview.name} · {fmt(preview.size)}</span>
              </div>
              <video src={preview.url} controls autoPlay style={{ width: "100%", borderRadius: 6, background: "#000" }} />
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <aside style={{ background: C.surface, borderLeft: `1px solid ${C.border}`, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontFamily: C.mono, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: C.muted, margin: 0 }}>JOURNAL</h3>
            <button onClick={() => setLog([])} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 3, color: C.muted, fontFamily: C.mono, fontSize: "0.62rem", padding: "0.2rem 0.5rem", cursor: "pointer" }}>Effacer</button>
          </div>

          <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0.5rem", overflowY: "auto", maxHeight: 280, fontFamily: C.mono, fontSize: "0.62rem" }}>
            {log.length === 0
              ? <span style={{ color: C.muted }}>En attente...</span>
              : log.map((l, i) => (
                <div key={i} style={{ color: l.includes("❌") ? C.accent : l.includes("✅") ? C.success : l.includes("⚠️") ? C.warn : C.muted, lineHeight: 1.6 }}>{l}</div>
              ))
            }
          </div>

          {captures.length > 0 && (
            <>
              <h3 style={{ fontFamily: C.mono, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: C.muted, margin: "0.5rem 0 0" }}>
                CAPTURES ({captures.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {captures.map(c => (
                  <div
                    key={c.id}
                    onClick={() => setPreview(c)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      background: preview?.id === c.id ? "rgba(255,204,0,0.06)" : C.surface2,
                      border: `1px solid ${preview?.id === c.id ? C.accent2 : C.border}`,
                      borderRadius: 6, padding: "0.5rem 0.75rem", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>{c.type.includes("video") ? "🎬" : "📦"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: C.mono, fontSize: "0.65rem", color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name.slice(0, 22)}…
                      </div>
                      <div style={{ fontFamily: C.mono, fontSize: "0.58rem", color: C.muted }}>
                        {fmt(c.size)}{c.duration ? ` · ${dur(c.duration)}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        onClick={e => { e.stopPropagation(); const a = document.createElement("a"); a.href = c.url; a.download = c.name; a.click(); }}
                        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, color: C.text, fontFamily: C.mono, fontSize: "0.7rem", padding: "0.2rem 0.4rem", cursor: "pointer" }}
                      >↓</button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteCapture(c.id); }}
                        style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${C.accent}`, borderRadius: 3, color: C.accent, fontFamily: C.mono, fontSize: "0.7rem", padding: "0.2rem 0.4rem", cursor: "pointer" }}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Console shortcuts */}
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0.75rem", marginTop: "auto" }}>
            <div style={{ fontFamily: C.mono, fontSize: "0.65rem", fontWeight: 700, color: C.muted, marginBottom: "0.5rem" }}>💻 OUVRIR LA CONSOLE</div>
            {[
              ["F12", "Ouvrir DevTools"],
              ["Ctrl+Shift+J", "Console Chrome"],
              ["Ctrl+Shift+K", "Console Firefox"],
              ["Ctrl+V", "Coller le script"],
              ["Enter", "Exécuter"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", fontFamily: C.mono, fontSize: "0.62rem" }}>
                <kbd style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: "0.1rem 0.4rem", color: C.text }}>{k}</kbd>
                <span style={{ color: C.muted }}>{v}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}