"use client";

import { useState, useRef, useCallback } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function fmt(n) {
  if (n == null || n === "") return "—";
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── JOURNAL ENTRY TYPES ──────────────────────────────────────────────────────
const ENTRY_STATUS = {
  pending:   { label: "En attente",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  contested: { label: "Contestée",   color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  validated: { label: "Validée",     color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
};

// ─── DEBIT/CREDIT CELL ────────────────────────────────────────────────────────
function DCCell({ value, type }) {
  const color = type === "debit" ? "#60a5fa" : "#a78bfa";
  return (
    <td style={{
      padding: "8px 14px", textAlign: "right",
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 12, fontWeight: value ? 600 : 400,
      color: value ? color : "rgba(255,255,255,0.15)",
    }}>
      {value ? fmt(value) : "—"}
    </td>
  );
}

// ─── ACCOUNT LINE ─────────────────────────────────────────────────────────────
function AccountLine({ line, index }) {
  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <td style={{ padding: "8px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#60a5fa", fontWeight: 700 }}>
        {line.compte}
      </td>
      <td style={{ padding: "8px 14px", fontSize: 12, color: "rgba(255,255,255,0.75)", maxWidth: 300 }}>
        {line.libelle_compte}
      </td>
      <td style={{ padding: "8px 14px", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
        {line.libelle_operation}
      </td>
      <DCCell value={line.debit}  type="debit"  />
      <DCCell value={line.credit} type="credit" />
    </tr>
  );
}

// ─── ENTRY CARD ───────────────────────────────────────────────────────────────
function EntryCard({ entry, onContest, onValidate, onDelete, isProcessing }) {
  const [showContest, setShowContest] = useState(false);
  const [contestNote, setContestNote] = useState("");
  const status = ENTRY_STATUS[entry.status] || ENTRY_STATUS.pending;
  const totalDebit  = (entry.lignes || []).reduce((s, l) => s + (Number(l.debit)  || 0), 0);
  const totalCredit = (entry.lignes || []).reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${entry.status === "validated" ? "rgba(52,211,153,0.2)" : entry.status === "contested" ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 14,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "flex-start", gap: 16,
      }}>
        {/* Date + ref */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 2 }}>
            {entry.date || new Date().toLocaleDateString("fr-FR")}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
            #{entry.id.slice(-6).toUpperCase()}
          </div>
        </div>

        {/* Operation info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 4, lineHeight: 1.4 }}>
            {entry.operation}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            {entry.contexte}
          </div>
          {entry.principe && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "#818cf8", fontStyle: "italic" }}>{entry.principe}</span>
            </div>
          )}
        </div>

        {/* Status + balance */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{
            padding: "3px 10px", borderRadius: 20,
            background: status.bg, color: status.color,
            fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: "0.06em",
          }}>
            {status.label.toUpperCase()}
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            color: isBalanced ? "#34d399" : "#f87171",
          }}>
            {isBalanced ? "✓ Équilibrée" : "✗ Déséquilibrée"}
          </div>
        </div>
      </div>

      {/* Journal lines table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Compte", "Intitulé", "Libellé de l'opération", "Débit (FCFA)", "Crédit (FCFA)"].map((h, i) => (
                <th key={h} style={{
                  padding: "8px 14px", textAlign: i >= 3 ? "right" : "left",
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(entry.lignes || []).map((line, i) => (
              <AccountLine key={i} line={line} index={i} />
            ))}
            {/* Totals row */}
            <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
              <td colSpan={3} style={{ padding: "8px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                TOTAUX
              </td>
              <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: "#60a5fa" }}>
                {fmt(totalDebit)}
              </td>
              <td style={{ padding: "8px 14px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>
                {fmt(totalCredit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Contest note display */}
      {entry.status === "contested" && entry.contestNote && (
        <div style={{
          margin: "0 16px 12px",
          padding: "10px 14px",
          background: "rgba(248,113,113,0.06)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: 8,
          fontSize: 11, color: "#fca5a5", lineHeight: 1.6,
        }}>
          <span style={{ fontWeight: 700, marginRight: 6 }}>Motif de contestation :</span>
          {entry.contestNote}
        </div>
      )}

      {/* Contest input */}
      {showContest && (
        <div style={{ padding: "0 16px 14px" }}>
          <textarea
            value={contestNote}
            onChange={(e) => setContestNote(e.target.value)}
            placeholder="Décrivez le problème ou l'erreur constatée dans cette écriture…"
            rows={3}
            autoFocus
            style={{
              width: "100%", background: "rgba(248,113,113,0.05)",
              border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8,
              padding: "10px 14px", color: "#fca5a5",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              resize: "vertical", outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => { onContest(entry.id, contestNote); setShowContest(false); setContestNote(""); }}
              disabled={!contestNote.trim()}
              style={{
                padding: "7px 16px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                border: "1px solid rgba(248,113,113,0.3)",
                background: "rgba(248,113,113,0.1)", color: "#f87171",
                cursor: contestNote.trim() ? "pointer" : "not-allowed",
                fontFamily: "'IBM Plex Mono', monospace", opacity: contestNote.trim() ? 1 : 0.5,
              }}
            >
              Confirmer la contestation
            </button>
            <button
              onClick={() => { setShowContest(false); setContestNote(""); }}
              style={{
                padding: "7px 14px", borderRadius: 7, fontSize: 11,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent", color: "rgba(255,255,255,0.4)",
                cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {entry.status === "pending" && (
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center",
        }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginRight: 4 }}>
            Vérifiez l'écriture avant de valider
          </span>
          <button
            onClick={() => setShowContest(true)}
            style={{
              padding: "7px 16px", borderRadius: 7, fontSize: 11, fontWeight: 600,
              border: "1px solid rgba(248,113,113,0.25)",
              background: "rgba(248,113,113,0.06)", color: "#f87171",
              cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            ✕ Contester
          </button>
          <button
            onClick={() => onValidate(entry.id)}
            style={{
              padding: "7px 20px", borderRadius: 7, fontSize: 11, fontWeight: 700,
              border: "none", background: "#34d399", color: "#07120f",
              cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.04em",
            }}
          >
            ✓ Valider
          </button>
        </div>
      )}

      {/* Re-analyze button for contested */}
      {entry.status === "contested" && (
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button
            onClick={() => onDelete(entry.id)}
            style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 11,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent", color: "rgba(255,255,255,0.35)",
              cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PROCESSING STEP ──────────────────────────────────────────────────────────
function ProcessingStep({ step, label, active, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        border: done ? "none" : active ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.1)",
        background: done ? "#6366f1" : active ? "rgba(99,102,241,0.15)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        ...(active && { animation: "pulse 1.5s ease-in-out infinite" }),
      }}>
        {done
          ? <span style={{ fontSize: 11, color: "#fff" }}>✓</span>
          : active
          ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }} />
          : <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: "rgba(255,255,255,0.2)" }}>{step}</span>
        }
      </div>
      <span style={{
        fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
        color: done ? "#34d399" : active ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ComptaPage() {
  const [entries, setEntries]         = useState([]);
  const [isDragging, setIsDragging]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0); // 0=idle 1=ocr 2=analyse 3=done
  const [processingFile, setProcessingFile] = useState(null);
  const [error, setError]             = useState(null);
  const [tab, setTab]                 = useState("saisie"); // saisie | journal | stats
  const [toast, setToast]             = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [manualText, setManualText]   = useState("");
  const fileInputRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const validated = entries.filter((e) => e.status === "validated");
  const pending   = entries.filter((e) => e.status === "pending");
  const contested = entries.filter((e) => e.status === "contested");

  // ── Process image ────────────────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      setError("Format non supporté. Veuillez uploader une image (PNG, JPG, WEBP).");
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProcessingStep(1);
    setProcessingFile(file.name);
    setTab("saisie");

    // Preview
    const previewObjectUrl = URL.createObjectURL(file);
    setPreviewUrl(previewObjectUrl);

    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = (e) => resolve(e.target.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Step 1: OCR
      setProcessingStep(1);
      const ocrRes = await fetch("/api/comptabilite/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });
      if (!ocrRes.ok) {
        const err = await ocrRes.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'extraction du texte");
      }
      const { text } = await ocrRes.json();
      setExtractedText(text);

      // Step 2: Accounting analysis
      setProcessingStep(2);
      const analyseRes = await fetch("/api/comptabilite/analyser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte: text }),
      });
      if (!analyseRes.ok) {
        const err = await analyseRes.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'analyse comptable");
      }
      const data = await analyseRes.json();

      // Step 3: Done
      setProcessingStep(3);

      const newEntry = {
        id:        uid(),
        status:    "pending",
        createdAt: new Date().toISOString(),
        imageFile: file.name,
        ...data,
      };
      setEntries((prev) => [newEntry, ...prev]);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStep(0);
        setTab("saisie");
        showToast(`Écriture générée : ${data.operation}`);
      }, 800);

    } catch (err) {
      setIsProcessing(false);
      setProcessingStep(0);
      setError(err.message);
    }
  }, []);

  // ── Analyse manual text ──────────────────────────────────────────────────
  const processManualText = async () => {
    if (!manualText.trim()) return;
    setError(null);
    setIsProcessing(true);
    setProcessingStep(2);
    setTab("saisie");
    try {
      const analyseRes = await fetch("/api/comptabilite/analyser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte: manualText.trim() }),
      });
      if (!analyseRes.ok) {
        const err = await analyseRes.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'analyse comptable");
      }
      const data = await analyseRes.json();
      setProcessingStep(3);
      const newEntry = { id: uid(), status: "pending", createdAt: new Date().toISOString(), ...data };
      setEntries((prev) => [newEntry, ...prev]);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStep(0);
        setShowTextEditor(false);
        setManualText("");
        showToast(`Écriture générée : ${data.operation}`);
      }, 600);
    } catch (err) {
      setIsProcessing(false);
      setProcessingStep(0);
      setError(err.message);
    }
  };

  // ── Entry actions ────────────────────────────────────────────────────────
  const handleValidate = (id) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: "validated" } : e));
    showToast("Écriture validée et enregistrée au journal");
  };

  const handleContest = (id, note) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: "contested", contestNote: note } : e));
    showToast("Écriture contestée — à corriger", "info");
  };

  const handleDelete = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    showToast("Écriture supprimée", "info");
  };

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  // ── Export journal ───────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      "Date;Numéro;Compte;Intitulé;Libellé opération;Débit;Crédit;Statut",
      ...validated.flatMap((e) =>
        (e.lignes || []).map((l) =>
          [e.date || new Date(e.createdAt).toLocaleDateString("fr-FR"),
           `#${e.id.slice(-6).toUpperCase()}`,
           l.compte, l.libelle_compte, l.libelle_operation,
           l.debit || "", l.credit || "", "Validée"
          ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")
        )
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `journal_OHADA_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("Journal exporté en CSV");
  };

  const statsDebit  = validated.reduce((s, e) => s + (e.lignes || []).reduce((ss, l) => ss + (Number(l.debit)  || 0), 0), 0);
  const statsCredit = validated.reduce((s, e) => s + (e.lignes || []).reduce((ss, l) => ss + (Number(l.credit) || 0), 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#080c14;}
        ::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:2px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        input,textarea,select{font-family:inherit;}
        ::selection{background:rgba(99,102,241,0.25);}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,12,20,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 32px", height: 56,
        display: "flex", alignItems: "center", gap: 20,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15,
          }}>
            📒
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.02em" }}>
              Comptabilité <span style={{ color: "#6366f1" }}>OHADA</span>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em" }}>
              SYSCOHADA RÉVISÉ · SAISIE AUTOMATIQUE
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 2, marginLeft: 24 }}>
          {[
            { id: "saisie",  label: "Saisie"   },
            { id: "journal", label: `Journal (${validated.length})` },
            { id: "stats",   label: "Tableau de bord" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "5px 14px", borderRadius: 7, fontSize: 11, fontWeight: 500,
                border: "none", cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.04em",
                background: tab === t.id ? "rgba(99,102,241,0.15)" : "transparent",
                color: tab === t.id ? "#818cf8" : "rgba(255,255,255,0.35)",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Quick stats */}
        <div style={{ display: "flex", gap: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
          {[
            { v: pending.length,   l: "EN ATTENTE", c: "#f59e0b" },
            { v: validated.length, l: "VALIDÉES",   c: "#34d399" },
            { v: contested.length, l: "CONTESTÉES", c: "#f87171" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {validated.length > 0 && (
          <button
            onClick={exportCSV}
            style={{
              padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600,
              border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.07)",
              color: "#34d399", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            ↓ Exporter CSV
          </button>
        )}
      </header>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* ══ SAISIE TAB ══ */}
        {tab === "saisie" && (
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, animation: "fadeUp 0.2s ease" }}>

            {/* Left: Upload panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? "#6366f1" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 16,
                  padding: "36px 24px",
                  textAlign: "center",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  background: isDragging ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.01)",
                  transition: "all 0.2s",
                  opacity: isProcessing ? 0.6 : 1,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileInput}
                />
                <div style={{
                  width: 52, height: 52, margin: "0 auto 16px",
                  borderRadius: 14,
                  background: isDragging ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isDragging ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, transition: "all 0.2s",
                }}>
                  📸
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: isDragging ? "#818cf8" : "rgba(255,255,255,0.7)" }}>
                  {isDragging ? "Déposer l'image ici" : "Capture d'écran ou photo"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                  Facture, reçu, relevé, bon de commande…<br />
                  PNG · JPG · WEBP
                </div>
              </div>

              {/* Manual text entry */}
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'IBM Plex Mono', monospace" }}>
                  ─── ou ───
                </span>
              </div>

              <button
                onClick={() => setShowTextEditor((v) => !v)}
                disabled={isProcessing}
                style={{
                  padding: "11px 16px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                  border: "1px solid rgba(99,102,241,0.2)",
                  background: showTextEditor ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                  color: "#818cf8", cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.04em",
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                ✎ Saisir le texte manuellement
              </button>

              {showTextEditor && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Collez ou saisissez ici le texte décrivant l'opération comptable&#10;&#10;Ex: Achat de marchandises 500 000 FCFA TTC auprès du fournisseur Diallo & Frères, règlement par chèque n°1234..."
                    rows={8}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                      padding: "12px 14px", color: "rgba(255,255,255,0.8)",
                      fontSize: 12, lineHeight: 1.6, resize: "vertical",
                      outline: "none", fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                  <button
                    onClick={processManualText}
                    disabled={!manualText.trim() || isProcessing}
                    style={{
                      padding: "10px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                      border: "none",
                      background: !manualText.trim() || isProcessing ? "rgba(99,102,241,0.2)" : "#6366f1",
                      color: !manualText.trim() || isProcessing ? "rgba(255,255,255,0.3)" : "#fff",
                      cursor: !manualText.trim() || isProcessing ? "not-allowed" : "pointer",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Analyser l'opération →
                  </button>
                </div>
              )}

              {/* Processing state */}
              {isProcessing && (
                <div style={{
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 12, padding: "18px 20px",
                  display: "flex", flexDirection: "column", gap: 14,
                  animation: "fadeUp 0.2s ease",
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em", marginBottom: 4 }}>
                    TRAITEMENT EN COURS
                  </div>
                  {[
                    { step: 1, label: "Extraction du texte (OCR)" },
                    { step: 2, label: "Analyse comptable OHADA" },
                    { step: 3, label: "Génération des écritures" },
                  ].map(({ step, label }) => (
                    <ProcessingStep
                      key={step} step={step} label={label}
                      active={processingStep === step}
                      done={processingStep > step}
                    />
                  ))}
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
                    {processingFile}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(248,113,113,0.06)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  fontSize: 12, color: "#fca5a5", lineHeight: 1.6,
                  animation: "fadeUp 0.2s ease",
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Erreur</div>
                  {error}
                </div>
              )}

              {/* Image preview */}
              {previewUrl && !isProcessing && (
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <img src={previewUrl} alt="Preview" style={{ width: "100%", display: "block" }} />
                  {extractedText && (
                    <div style={{
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.02)",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em", marginBottom: 6 }}>
                        TEXTE EXTRAIT
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxHeight: 120, overflowY: "auto", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {extractedText}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Principes reminder */}
              <div style={{
                padding: "14px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em", marginBottom: 10 }}>
                  10 PRINCIPES COMPTABLES OHADA
                </div>
                {[
                  "Prudence", "Permanence des méthodes",
                  "Coût historique", "Spécialisation des exercices",
                  "Continuité d'exploitation", "Transparence",
                  "Prééminence de la réalité sur l'apparence",
                  "Importance significative", "Régularité", "Sincérité",
                ].map((p, i) => (
                  <div key={p} style={{
                    display: "flex", gap: 8, alignItems: "center",
                    padding: "3px 0",
                    borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.03)" : "none",
                  }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: "#6366f1", minWidth: 16 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Entries to validate */}
            <div>
              {pending.length === 0 && contested.length === 0 ? (
                <div style={{
                  height: "100%", minHeight: 300,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 16, textAlign: "center",
                }}>
                  <div style={{ fontSize: 48, opacity: 0.1 }}>📒</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.2)" }}>
                    Aucune écriture en attente
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", maxWidth: 300, lineHeight: 1.7 }}>
                    Uploadez une capture d'écran ou saisissez le texte d'une opération pour générer automatiquement les écritures comptables OHADA.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[...pending, ...contested].map((entry) => (
                    <div key={entry.id} style={{ animation: "fadeUp 0.25s ease" }}>
                      <EntryCard
                        entry={entry}
                        onContest={handleContest}
                        onValidate={handleValidate}
                        onDelete={handleDelete}
                        isProcessing={isProcessing}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ JOURNAL TAB ══ */}
        {tab === "journal" && (
          <div style={{ animation: "fadeUp 0.2s ease" }}>
            {validated.length === 0 ? (
              <div style={{
                padding: "80px 40px", textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
              }}>
                <div style={{ fontSize: 48, opacity: 0.1 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.2)" }}>
                  Journal vide
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>
                  Les écritures validées apparaîtront ici
                </div>
                <button
                  onClick={() => setTab("saisie")}
                  style={{
                    padding: "9px 20px", borderRadius: 8, fontSize: 12,
                    border: "1px solid rgba(99,102,241,0.25)",
                    background: "rgba(99,102,241,0.08)", color: "#818cf8",
                    cursor: "pointer",
                  }}
                >
                  ← Aller à la saisie
                </button>
              </div>
            ) : (
              <>
                {/* Journal header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Journal général</h2>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                      {validated.length} écriture{validated.length > 1 ? "s" : ""} validée{validated.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <button onClick={exportCSV} style={{
                    padding: "8px 18px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    border: "1px solid rgba(52,211,153,0.25)",
                    background: "rgba(52,211,153,0.07)", color: "#34d399",
                    cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    ↓ Exporter CSV
                  </button>
                </div>

                {/* Journal table */}
                <div style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12, overflow: "hidden",
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Date", "Réf.", "Compte", "Intitulé", "Libellé opération", "Débit", "Crédit"].map((h, i) => (
                          <th key={h} style={{
                            padding: "10px 16px", textAlign: i >= 5 ? "right" : "left",
                            fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                            color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validated.flatMap((entry) => [
                        // Entry separator row
                        <tr key={`sep-${entry.id}`} style={{ background: "rgba(99,102,241,0.04)" }}>
                          <td colSpan={7} style={{
                            padding: "5px 16px",
                            fontSize: 10, color: "#818cf8",
                            fontFamily: "'IBM Plex Mono', monospace",
                            borderTop: "1px solid rgba(99,102,241,0.1)",
                          }}>
                            {entry.operation}
                            {entry.principe && (
                              <span style={{ marginLeft: 10, color: "rgba(129,140,248,0.5)", fontStyle: "italic" }}>
                                — {entry.principe}
                              </span>
                            )}
                          </td>
                        </tr>,
                        // Lines
                        ...(entry.lignes || []).map((line, i) => (
                          <tr key={`${entry.id}-${i}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td style={{ padding: "7px 16px", fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace" }}>
                              {i === 0 ? (entry.date || new Date(entry.createdAt).toLocaleDateString("fr-FR")) : ""}
                            </td>
                            <td style={{ padding: "7px 16px", fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'IBM Plex Mono', monospace" }}>
                              {i === 0 ? `#${entry.id.slice(-6).toUpperCase()}` : ""}
                            </td>
                            <td style={{ padding: "7px 16px", fontSize: 11, color: "#60a5fa", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                              {line.compte}
                            </td>
                            <td style={{ padding: "7px 16px", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                              {line.libelle_compte}
                            </td>
                            <td style={{ padding: "7px 16px", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                              {line.libelle_operation}
                            </td>
                            <DCCell value={line.debit}  type="debit"  />
                            <DCCell value={line.credit} type="credit" />
                          </tr>
                        )),
                      ])}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ STATS TAB ══ */}
        {tab === "stats" && (
          <div style={{ animation: "fadeUp 0.2s ease", display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Tableau de bord</h2>

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {[
                { label: "Total écritures", value: entries.length, color: "#818cf8", icon: "📝" },
                { label: "Validées", value: validated.length, color: "#34d399", icon: "✓" },
                { label: "En attente", value: pending.length, color: "#f59e0b", icon: "⏳" },
                { label: "Contestées", value: contested.length, color: "#f87171", icon: "✕" },
                { label: "Total Débit", value: `${(statsDebit / 1000).toFixed(0)} K FCFA`, color: "#60a5fa", icon: "D" },
                { label: "Total Crédit", value: `${(statsCredit / 1000).toFixed(0)} K FCFA`, color: "#a78bfa", icon: "C" },
              ].map((kpi) => (
                <div key={kpi.label} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12, padding: "18px 16px",
                }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em", marginBottom: 8 }}>
                    {kpi.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent validated entries */}
            {validated.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                  ÉCRITURES VALIDÉES
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {validated.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onContest={handleContest}
                      onValidate={handleValidate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          padding: "11px 18px", borderRadius: 10, fontSize: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          background: toast.type === "error" ? "rgba(248,113,113,0.1)" : toast.type === "info" ? "rgba(99,102,241,0.1)" : "rgba(52,211,153,0.1)",
          border: `1px solid ${toast.type === "error" ? "rgba(248,113,113,0.25)" : toast.type === "info" ? "rgba(99,102,241,0.25)" : "rgba(52,211,153,0.25)"}`,
          color: toast.type === "error" ? "#f87171" : toast.type === "info" ? "#818cf8" : "#34d399",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "fadeUp 0.2s ease",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", gap: 8, maxWidth: 400,
        }}>
          <span>{toast.type === "error" ? "✕" : toast.type === "info" ? "◈" : "✓"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
