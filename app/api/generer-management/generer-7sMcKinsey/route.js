import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ── 7S Framework metadata ─────────────────────────────────────────────────────
export const SEVEN_S = {
  strategy: {
    key: "strategy", label: "Stratégie", fr: "Strategy", icon: "🧭",
    type: "hard", color: "#60a5fa", desc: "Plan d'action pour atteindre les objectifs face à la concurrence",
  },
  structure: {
    key: "structure", label: "Structure", fr: "Structure", icon: "🏗",
    type: "hard", color: "#818cf8", desc: "Organigramme, hiérarchie et répartition des responsabilités",
  },
  systems: {
    key: "systems", label: "Systèmes", fr: "Systems", icon: "⚙",
    type: "hard", color: "#a78bfa", desc: "Processus, procédures et flux d'information quotidiens",
  },
  style: {
    key: "style", label: "Style", fr: "Style", icon: "🎭",
    type: "soft", color: "#f472b6", desc: "Style de management et culture comportementale des leaders",
  },
  staff: {
    key: "staff", label: "Personnel", fr: "Staff", icon: "👥",
    type: "soft", color: "#fb923c", desc: "Profils des employés, recrutement, fidélisation et développement RH",
  },
  skills: {
    key: "skills", label: "Compétences", fr: "Skills", icon: "🛠",
    type: "soft", color: "#34d399", desc: "Capacités distinctives et savoir-faire qui différencient l'entreprise",
  },
  sharedValues: {
    key: "sharedValues", label: "Valeurs partagées", fr: "Shared Values", icon: "💎",
    type: "center", color: "#facc15", desc: "Valeurs fondamentales, culture d'entreprise et raison d'être",
  },
};

const ALIGNMENT_PAIRS = [
  ["strategy", "structure"], ["strategy", "systems"], ["structure", "systems"],
  ["style", "staff"], ["staff", "skills"], ["style", "sharedValues"],
  ["sharedValues", "strategy"], ["sharedValues", "staff"],
];

// ── SYSTEM PROMPTS ─────────────────────────────────────────────────────────────
const SYSTEM_GENERATE = `Tu es un consultant senior McKinsey expert du modèle 7S.
À partir d'une description générale d'un projet ou d'une organisation, tu génères une évaluation initiale complète des 7 facteurs 7S.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans texte avant ou après.
- Génère des scores réalistes entre 1 et 5 basés sur le contexte décrit.
- Les descriptions, forces, faiblesses doivent être spécifiques au contexte fourni.
- Les Valeurs Partagées (centre) qui sont faibles contaminent tous les autres S.

FORMAT DE RÉPONSE (JSON strict) :
{
  "projectTitle": "string",
  "summary": "string (2-3 phrases résumant la situation organisationnelle)",
  "changeType": "transformation | restructuring | growth | turnaround | merger | digital",
  "elements": {
    "strategy":     { "score": 3, "description": "string", "strengths": "string", "weaknesses": "string", "notes": "string" },
    "structure":    { "score": 3, "description": "string", "strengths": "string", "weaknesses": "string", "notes": "string" },
    "systems":      { "score": 3, "description": "string", "strengths": "string", "weaknesses": "string", "notes": "string" },
    "style":        { "score": 3, "description": "string", "strengths": "string", "weaknesses": "string", "notes": "string" },
    "staff":        { "score": 3, "description": "string", "strengths": "string", "weaknesses": "string", "notes": "string" },
    "skills":       { "score": 3, "description": "string", "strengths": "string", "weaknesses": "string", "notes": "string" },
    "sharedValues": { "score": 3, "description": "string", "strengths": "string", "weaknesses": "string", "notes": "string" }
  },
  "initialRecommendations": ["string", "string", "string"]
}`;

const SYSTEM_ANALYZE = `Tu es un consultant senior McKinsey spécialisé en transformation organisationnelle et dans le modèle des 7S.
Tu reçois une évaluation 7S complète et tu fournis une analyse approfondie avec recommandations actionnables.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans texte avant ou après.
- readiness_score entre 1.0 et 5.0 basé sur le score moyen et les désalignements.
- alignment_matrix doit couvrir au minimum 7 paires critiques.
- Les éléments à faible score (< 2.5) sont des risques critiques.
- Les facteurs durs (Strategy, Structure, Systems) changent plus vite que les facteurs mous.

FORMAT DE RÉPONSE (JSON strict) :
{
  "readiness_score": 3.4,
  "readiness_label": "Pas prêt | Fragile | En préparation | Prêt avec réserves | Prêt | Très prêt",
  "executive_summary": "string (3-5 phrases)",
  "alignment_matrix": [
    { "element_a": "strategy", "element_b": "structure", "alignment": "Alignés | Partiellement alignés | Désalignés | Conflit critique", "analysis": "string", "priority": "Haute | Moyenne | Faible" }
  ],
  "elements": {
    "strategy":     { "assessment": "string", "strengths": ["string"], "risks": ["string"], "actions": ["string"], "change_impact": "string" },
    "structure":    { "assessment": "string", "strengths": [], "risks": [], "actions": [], "change_impact": "string" },
    "systems":      { "assessment": "string", "strengths": [], "risks": [], "actions": [], "change_impact": "string" },
    "style":        { "assessment": "string", "strengths": [], "risks": [], "actions": [], "change_impact": "string" },
    "staff":        { "assessment": "string", "strengths": [], "risks": [], "actions": [], "change_impact": "string" },
    "skills":       { "assessment": "string", "strengths": [], "risks": [], "actions": [], "change_impact": "string" },
    "sharedValues": { "assessment": "string", "strengths": [], "risks": [], "actions": [], "change_impact": "string" }
  },
  "critical_misalignments": [
    { "pair": ["element_a_key", "element_b_key"], "severity": "Critique | Élevé | Modéré", "description": "string", "resolution": "string" }
  ],
  "change_risks": [
    { "risk": "string", "source": "string", "probability": "Faible | Modérée | Élevée", "severity": "Faible | Modérée | Élevée | Critique", "mitigation": "string" }
  ],
  "transformation_roadmap": [
    { "phase": "Phase 1 — Stabiliser (0-3 mois)", "focus_elements": ["strategy"], "actions": ["string"], "milestone": "string", "success_criteria": "string" },
    { "phase": "Phase 2 — Aligner (3-9 mois)", "focus_elements": [], "actions": [], "milestone": "string", "success_criteria": "string" },
    { "phase": "Phase 3 — Transformer (9-24 mois)", "focus_elements": [], "actions": [], "milestone": "string", "success_criteria": "string" }
  ],
  "quick_wins": [
    { "action": "string", "s_element": "structure", "impact": "string" }
  ],
  "kpis": [
    { "name": "string", "target": "string", "s_element": "strategy", "timeline": "string" }
  ],
  "conclusion": "string (2-3 phrases percutantes)"
}`;

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { mode, description, projectName, projectTag, companyName,
            changeInitiative, context, elements, changeType } = body;

    if (!mode || !["generate", "analyze"].includes(mode)) {
      return Response.json(
        { error: 'Le champ "mode" doit être "generate" ou "analyze".' },
        { status: 400 }
      );
    }

    // ── MODE GENERATE ─────────────────────────────────────────────────────────
    if (mode === "generate") {
      if (!description || description.trim().length < 15) {
        return Response.json(
          { error: "La description est trop courte (minimum 15 caractères)." },
          { status: 400 }
        );
      }

      const prompt = `Génère une évaluation 7S McKinsey initiale complète pour l'organisation ou projet suivant :

DESCRIPTION : ${description.trim()}
${projectName ? `Nom du projet : ${projectName}` : ""}
${companyName ? `Société : ${companyName}` : ""}
${changeInitiative ? `Initiative de changement : ${changeInitiative}` : ""}

Déduis le type de changement le plus probable, génère des scores réalistes (1-5) pour chacun des 7 facteurs,
et fournis des descriptions spécifiques et pertinentes basées sur le contexte décrit.
Sois concret et actionnable, pas générique.`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: SYSTEM_GENERATE,
        messages: [{ role: "user", content: prompt }],
      });

      const rawText = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      let parsed;
      try {
        const clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        return Response.json(
          { error: "Erreur de parsing de la réponse IA.", raw: rawText.slice(0, 400) },
          { status: 500 }
        );
      }

      // Validate & normalize elements
      const normalized = {};
      for (const key of Object.keys(SEVEN_S)) {
        const el = parsed.elements?.[key] || {};
        normalized[key] = {
          score: Math.min(5, Math.max(1, parseFloat(el.score) || 3)),
          description: el.description || "",
          strengths: el.strengths || "",
          weaknesses: el.weaknesses || "",
          notes: el.notes || "",
        };
      }

      return Response.json({
        success: true,
        mode: "generate",
        data: {
          projectTitle: parsed.projectTitle || projectName || "Nouvelle analyse",
          summary: parsed.summary || "",
          changeType: parsed.changeType || "transformation",
          elements: normalized,
          initialRecommendations: parsed.initialRecommendations || [],
        },
      });
    }

    // ── MODE ANALYZE ──────────────────────────────────────────────────────────
    if (mode === "analyze") {
      if (!elements || Object.keys(elements).length === 0) {
        return Response.json(
          { error: "Aucun élément 7S évalué à analyser." },
          { status: 400 }
        );
      }

      const scores = Object.fromEntries(
        Object.entries(elements).map(([k, v]) => [k, v.score ?? 3])
      );
      const avgScore =
        Object.values(scores).reduce((a, b) => a + b, 0) /
        Object.values(scores).length;

      const misalignedPairs = ALIGNMENT_PAIRS.map(([a, b]) => ({
        a, b, diff: Math.abs((scores[a] || 3) - (scores[b] || 3)),
      }))
        .filter((p) => p.diff >= 1.5)
        .sort((x, y) => y.diff - x.diff)
        .map((p) => `${SEVEN_S[p.a]?.label} vs ${SEVEN_S[p.b]?.label} (écart : ${p.diff.toFixed(1)})`);

      const contextLines = [
        projectName      && `Entreprise / Projet : ${projectName}`,
        projectTag       && `Secteur : ${projectTag}`,
        companyName      && `Société : ${companyName}`,
        changeInitiative && `Initiative de changement : ${changeInitiative}`,
        changeType       && `Type de changement : ${changeType}`,
        context          && `Contexte : ${context}`,
      ]
        .filter(Boolean)
        .join("\n");

      const elementsDetail = Object.entries(SEVEN_S).map(([key, meta]) => {
        const el = elements[key] || {};
        return `### ${meta.icon} ${meta.label} (${meta.fr}) — Score : ${el.score ?? 3}/5
${el.description ? `Évaluation : ${el.description}` : ""}
${el.strengths   ? `Points forts : ${el.strengths}` : ""}
${el.weaknesses  ? `Points faibles : ${el.weaknesses}` : ""}
${el.notes       ? `Notes : ${el.notes}` : ""}`.trim();
      }).join("\n\n");

      const prompt = `${contextLines ? `## CONTEXTE\n${contextLines}\n\n` : ""}## ÉVALUATION DES 7S
Score moyen global : ${avgScore.toFixed(2)}/5

${elementsDetail}

${misalignedPairs.length > 0 ? `## DÉSALIGNEMENTS DÉTECTÉS (écart ≥ 1.5)\n${misalignedPairs.join("\n")}` : ""}

Génère une analyse 7S complète, précise et transformative pour guider le changement.`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3500,
        system: SYSTEM_ANALYZE,
        messages: [{ role: "user", content: prompt }],
      });

      const rawText = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      let result;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON");
        result = JSON.parse(jsonMatch[0]);
      } catch {
        result = {
          readiness_score: avgScore,
          readiness_label:
            avgScore >= 4 ? "Prêt" : avgScore >= 3 ? "En préparation" : "Fragile",
          executive_summary: rawText.slice(0, 600),
          alignment_matrix: [],
          elements: Object.fromEntries(
            Object.keys(SEVEN_S).map((k) => [
              k,
              { assessment: `Analyse de ${SEVEN_S[k].label}.`, strengths: [], risks: [], actions: [], change_impact: "" },
            ])
          ),
          critical_misalignments: [],
          change_risks: [],
          transformation_roadmap: [],
          quick_wins: [],
          kpis: [],
          conclusion: "Une analyse approfondie est nécessaire.",
        };
      }

      return Response.json({ success: true, mode: "analyze", result });
    }
  } catch (err) {
    console.error("[generer-7sMcKinsey] Error:", err);
    if (err?.status === 401)
      return Response.json({ error: "Clé API Anthropic invalide." }, { status: 401 });
    if (err?.status === 429)
      return Response.json({ error: "Limite API atteinte. Réessayez." }, { status: 429 });
    return Response.json(
      { error: "Erreur serveur interne.", details: err?.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    status: "ok",
    endpoint: "generer-7sMcKinsey",
    modes: ["generate", "analyze"],
    model: "claude-sonnet-4-20250514",
    version: "2.0.0",
  });
}