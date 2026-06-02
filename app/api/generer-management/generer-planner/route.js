import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const COLORS = [
  "#534AB7",
  "#1D9E75",
  "#378ADD",
  "#BA7517",
  "#D4537E",
  "#3B6D11",
  "#D85A30",
  "#0C447C",
  "#3C3489",
  "#0F766E",
  "#B45309",
  "#7C3AED",
];

// ── Système prompt partagé ──────────────────────────────────────────────────
const SYSTEM_GENERATE = `Tu es un expert en gestion de projet et planification Agile/Waterfall.
En recevant une description de projet, tu génères un plan de projet structuré en JSON strict.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans texte avant ou après.
- Génère entre 5 et 15 tâches réalistes selon la complexité du projet.
- Les jours de début (start) et durées (duration) doivent être cohérents entre eux.
- totalDays doit correspondre à la fin de la dernière tâche (avec une petite marge).
- colorIdx doit être un entier entre 0 et 11.
- status : "todo" | "in-progress" | "done"
- priority : "low" | "medium" | "high"
- progress : entier entre 0 et 100

FORMAT DE RÉPONSE (JSON strict) :
{
  "projectTitle": "string",
  "summary": "string (2-3 phrases résumant le plan)",
  "totalDays": number,
  "tasks": [
    {
      "id": "string",
      "title": "string",
      "assignee": "string",
      "status": "todo" | "in-progress" | "done",
      "priority": "low" | "medium" | "high",
      "start": number,
      "duration": number,
      "progress": number,
      "colorIdx": number,
      "phase": "string (nom de la phase)"
    }
  ],
  "recommendations": ["string", "string", "string"]
}`;

const SYSTEM_ANALYZE = `Tu es un consultant senior en gestion de projet avec 20 ans d'expérience.
En recevant un plan de projet existant en JSON, tu analyses la situation et fournis des recommandations actionnables.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans texte avant ou après.
- Sois précis, concret et bienveillant dans tes recommandations.
- Identifie les risques réels (chevauchements, tâches bloquantes, ressources surchargées, etc.).
- Propose des actions concrètes avec leur impact estimé.

FORMAT DE RÉPONSE (JSON strict) :
{
  "globalHealth": "good" | "warning" | "critical",
  "healthScore": number (0-100),
  "summary": "string (3-4 phrases d'analyse globale)",
  "kpis": {
    "completionRate": number,
    "averageProgress": number,
    "overdueRisk": "low" | "medium" | "high",
    "teamLoad": "balanced" | "overloaded" | "underloaded"
  },
  "risks": [
    {
      "level": "low" | "medium" | "high",
      "title": "string",
      "description": "string",
      "affectedTasks": ["string"]
    }
  ],
  "recommendations": [
    {
      "priority": "urgent" | "important" | "optional",
      "category": "planning" | "resources" | "execution" | "communication",
      "title": "string",
      "description": "string",
      "impact": "string"
    }
  ],
  "optimizedTasks": null
}`;

// ── POST /api/generer-management/generer-planner ────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { mode, description, tasks, totalDays, projectTitle } = body;

    if (!mode || !["generate", "analyze"].includes(mode)) {
      return Response.json(
        { error: 'Le champ "mode" doit être "generate" ou "analyze".' },
        { status: 400 }
      );
    }

    // ── Mode GÉNÉRATION ────────────────────────────────────────────────────
    if (mode === "generate") {
      if (!description || description.trim().length < 10) {
        return Response.json(
          {
            error:
              "La description du projet est trop courte (minimum 10 caractères).",
          },
          { status: 400 }
        );
      }

      const userPrompt = `Génère un plan de projet complet pour le projet suivant :

DESCRIPTION : ${description.trim()}

Génère un planning réaliste avec des tâches concrètes, des assignations d'équipe (prénoms variés), 
des phases logiques (ex: Analyse, Design, Développement, Tests, Déploiement selon le contexte), 
et des durées cohérentes. Les tâches du début peuvent avoir un progress > 0 si elles sont en cours ou terminées.`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM_GENERATE,
        messages: [{ role: "user", content: userPrompt }],
      });

      const rawText = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      let parsed;
      try {
        const clean = rawText
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/gi, "")
          .trim();
        parsed = JSON.parse(clean);
      } catch {
        return Response.json(
          {
            error: "Erreur de parsing de la réponse IA.",
            raw: rawText.slice(0, 500),
          },
          { status: 500 }
        );
      }

      // Validation et normalisation des tâches
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        return Response.json(
          { error: "Format de réponse invalide : champ tasks manquant." },
          { status: 500 }
        );
      }

      parsed.tasks = parsed.tasks.map((t, i) => ({
        id: `ai_${Date.now()}_${i}`,
        title: t.title || `Tâche ${i + 1}`,
        assignee: t.assignee || "Équipe",
        status: ["todo", "in-progress", "done"].includes(t.status)
          ? t.status
          : "todo",
        priority: ["low", "medium", "high"].includes(t.priority)
          ? t.priority
          : "medium",
        start: Math.max(1, parseInt(t.start) || 1),
        duration: Math.max(1, parseInt(t.duration) || 3),
        progress: Math.min(100, Math.max(0, parseInt(t.progress) || 0)),
        colorIdx:
          typeof t.colorIdx === "number" &&
          t.colorIdx >= 0 &&
          t.colorIdx < COLORS.length
            ? t.colorIdx
            : i % COLORS.length,
        phase: t.phase || "Général",
      }));

      // Calcul automatique totalDays si non fourni ou incohérent
      const lastDay = Math.max(
        ...parsed.tasks.map((t) => t.start + t.duration - 1)
      );
      if (!parsed.totalDays || parsed.totalDays < lastDay) {
        parsed.totalDays = Math.ceil((lastDay + 7) / 7) * 7; // Arrondi à la semaine
      }

      return Response.json({
        success: true,
        mode: "generate",
        data: {
          projectTitle: parsed.projectTitle || "Nouveau Projet",
          summary: parsed.summary || "",
          totalDays: parsed.totalDays,
          tasks: parsed.tasks,
          recommendations: parsed.recommendations || [],
        },
      });
    }

    // ── Mode ANALYSE ───────────────────────────────────────────────────────
    if (mode === "analyze") {
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return Response.json(
          { error: "Aucune tâche à analyser." },
          { status: 400 }
        );
      }

      const projectData = {
        projectTitle: projectTitle || "Projet en cours",
        totalDays: totalDays || 28,
        taskCount: tasks.length,
        tasks: tasks.map((t) => ({
          title: t.title,
          assignee: t.assignee,
          status: t.status,
          priority: t.priority,
          start: t.start,
          duration: t.duration,
          progress: t.progress,
          phase: t.phase || "N/A",
        })),
      };

      const userPrompt = `Analyse ce plan de projet et fournis une évaluation complète avec recommandations actionnables :

${JSON.stringify(projectData, null, 2)}

Évalue : l'avancement global, les risques de planning, la charge des équipes, 
les dépendances implicites, et propose des améliorations concrètes.`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: SYSTEM_ANALYZE,
        messages: [{ role: "user", content: userPrompt }],
      });

      const rawText = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      let parsed;
      try {
        const clean = rawText
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/gi, "")
          .trim();
        parsed = JSON.parse(clean);
      } catch {
        return Response.json(
          {
            error: "Erreur de parsing de l'analyse IA.",
            raw: rawText.slice(0, 500),
          },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        mode: "analyze",
        data: parsed,
      });
    }
  } catch (err) {
    console.error("[generer-planner] Error:", err);

    if (err?.status === 401) {
      return Response.json(
        { error: "Clé API Anthropic invalide ou manquante." },
        { status: 401 }
      );
    }
    if (err?.status === 429) {
      return Response.json(
        { error: "Limite de requêtes API atteinte. Réessayez dans quelques secondes." },
        { status: 429 }
      );
    }

    return Response.json(
      { error: "Erreur serveur interne.", details: err?.message },
      { status: 500 }
    );
  }
}

// ── GET — health check ──────────────────────────────────────────────────────
export async function GET() {
  return Response.json({
    status: "ok",
    endpoint: "generer-planner",
    modes: ["generate", "analyze"],
    model: "claude-sonnet-4-6",
    version: "1.0.0",
  });
}