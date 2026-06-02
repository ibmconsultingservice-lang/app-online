import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const client = new Anthropic();

// ─── Load Plan Comptable OHADA ─────────────────────────────────────────────────
// File must be at: public/plancomptable.txt (Next.js public folder)
// Falls back to a compact embedded reference if file not found
function loadPlanComptable() {
  try {
    const filePath = path.join(process.cwd(), "public", "plancomptable.txt");
    const content = fs.readFileSync(filePath, "utf-8");
    // Return full content (trimmed)
    return content.trim();
  } catch {
    console.warn("[analyser] plancomptable.txt not found in public/. Using embedded fallback.");
    return PLAN_COMPTABLE_FALLBACK;
  }
}

// ─── Compact OHADA fallback (classes 1-8) ─────────────────────────────────────
const PLAN_COMPTABLE_FALLBACK = `
PLAN COMPTABLE SYSCOHADA RÉVISÉ — COMPTES PRINCIPAUX

CLASSE 1 — COMPTES DE RESSOURCES DURABLES
101 Capital social
111 Réserve légale
12  Résultat net de l'exercice
16  Emprunts et dettes assimilées
162 Emprunts auprès des établissements de crédit
164 Dettes de location-financement
17  Dettes liées à des participations
18  Dettes rattachées à des sociétés du groupe

CLASSE 2 — COMPTES D'ACTIF IMMOBILISÉ
211 Terrains
212 Aménagements, agencements et installations
213 Bâtiments
221 Matériel et outillage industriel
2215 Matériel informatique
222 Matériel automobile
228 Autres matériels et outillages
231 Matériel de bureau
232 Mobilier de bureau
241 Brevets, licences, concessions
242 Logiciels
245 Fonds commercial
271 Prêts et créances non commerciales à long terme
272 Participations et créances rattachées

CLASSE 3 — COMPTES DE STOCKS
301 Marchandises
321 Matières premières
332 Emballages récupérables
361 Produits finis
37  Stocks en cours de route

CLASSE 4 — COMPTES DE TIERS
401 Fournisseurs d'exploitation
408 Fournisseurs, factures non parvenues
409 Fournisseurs débiteurs, avances et acomptes versés
411 Clients
412 Clients, effets à recevoir
415 Clients, produits non encore facturés
419 Clients créditeurs, avances et acomptes reçus
421 Personnel, avances et acomptes
422 Personnel, rémunérations dues
431 Sécurité sociale
433 Autres organismes sociaux
441 État, impôts et taxes à payer
442 État, TVA récupérable sur achats
443 État, TVA facturée sur ventes
444 État, TVA due ou crédit de TVA
445 État, autres impôts et taxes
447 État, impôts retenus à la source
452 Associés, comptes courants
471 Débiteurs divers
472 Créditeurs divers

CLASSE 5 — COMPTES DE TRÉSORERIE
511 Banques, établissements financiers et assimilés — soldes créditeurs
512 Chèques à encaisser
521 Banque (solde débiteur)
531 Caisse siège social
532 Caisses établissements
541 Régies d'avances et accréditifs

CLASSE 6 — COMPTES DE CHARGES
601 Achats de marchandises
602 Achats de matières premières
604 Achats de matières consommables
605 Autres achats
606 Achats non stockés de matières et fournitures
611 Transports sur achats
614 Locations
615 Entretiens, réparations et maintenance
616 Primes d'assurance
618 Documentation
621 Personnel extérieur à l'entreprise
622 Rémunérations d'intermédiaires et honoraires
623 Publicité, publications, relations publiques
624 Transport de biens et transports collectifs du personnel
625 Déplacements, missions et réceptions
626 Frais postaux et de télécommunications
627 Services bancaires
628 Autres frais généraux
631 Rémunérations du personnel
633 Cotisations sociales employeur
641 Impôts et taxes locaux
645 Taxes sur les salaires
651 Pertes sur créances irrécouvrables
654 Charges d'escompte
661 Intérêts des emprunts et dettes
681 Dotations aux amortissements — immobilisations incorporelles
682 Dotations aux amortissements — immobilisations corporelles
691 Dotations aux provisions pour risques et charges

CLASSE 7 — COMPTES DE PRODUITS
701 Ventes de marchandises
702 Ventes de produits finis
704 Travaux facturés
705 Services vendus
706 Produits des activités annexes
721 Production immobilisée
731 Variations de stocks de produits finis
752 Revenus des participations
755 Intérêts de prêts
759 Autres produits financiers
771 Subventions d'exploitation reçues
781 Reprises de provisions

CLASSE 8 — COMPTES DE RÉSULTATS
81  Valeurs comptables des cessions d'immobilisations
82  Produits de cessions d'immobilisations
83  Charges hors activités ordinaires
84  Produits hors activités ordinaires
85  Dotations hors activités ordinaires
86  Reprises hors activités ordinaires
87  Participation des travailleurs
88  Subventions d'équilibre
89  Impôts sur le résultat
`.trim();

// ─── System Prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(planComptable) {
  return `Tu es un expert-comptable certifié SYSCOHADA RÉVISÉ avec 20 ans d'expérience en comptabilité d'entreprise en Afrique de l'Ouest (Sénégal, Côte d'Ivoire, Cameroun, etc.).

Tu maîtrises parfaitement :
- Le SYSCOHADA Révisé (Acte Uniforme OHADA sur le droit comptable, version 2017)
- Les 10 principes comptables : Prudence, Permanence des méthodes, Coût historique, Spécialisation des exercices, Continuité d'exploitation, Transparence, Prééminence de la réalité sur l'apparence, Importance significative, Régularité, Sincérité
- La partie double : toute écriture doit être équilibrée (Σ Débits = Σ Crédits)
- La TVA en vigueur en zone OHADA (18% standard au Sénégal, variable selon le pays)
- La comptabilisation des opérations complexes (salaires, amortissements, provisions, déclarations fiscales)

PLAN COMPTABLE SYSCOHADA DE RÉFÉRENCE :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${planComptable}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÈGLE ABSOLUE : Réponds UNIQUEMENT avec un objet JSON valide. Zéro texte avant ou après. Zéro balise markdown.

Schéma JSON EXACT :

{
  "operation": "string — titre court et précis de l'opération (max 80 caractères)",
  "contexte": "string — description détaillée de l'opération, montants, parties, modalités (2-4 phrases)",
  "date": "string — date au format JJ/MM/AAAA extraite du document, ou date du jour si absente",
  "principe": "string — principe comptable OHADA appliqué (ex: 'Principe de spécialisation des exercices')",
  "lignes": [
    {
      "compte": "string — numéro de compte SYSCOHADA (ex: '601', '4011', '521')",
      "libelle_compte": "string — intitulé officiel du compte tiré du plan comptable",
      "libelle_operation": "string — libellé descriptif spécifique à cette ligne (ex: 'Achat marchandises — Diallo & Frères, fact. n°2024-001')",
      "debit": number | null — montant en débit (FCFA, entier ou décimal), null si ligne de crédit,
      "credit": number | null — montant en crédit (FCFA, entier ou décimal), null si ligne de débit
    }
  ],
  "equilibre": {
    "total_debit": number,
    "total_credit": number,
    "est_equilibre": boolean
  },
  "notes": "string — explications comptables complémentaires, justification du choix des comptes, traitement TVA, principes appliqués (optionnel)"
}

RÈGLES COMPTABLES OBLIGATOIRES :

1. ÉQUILIBRE PARFAIT : total_debit DOIT être STRICTEMENT ÉGAL à total_credit. C'est une règle inviolable.

2. CHOIX DES COMPTES : Utilise EXCLUSIVEMENT les comptes du plan comptable SYSCOHADA fourni. Choisis le compte le plus précis disponible (4 chiffres > 3 chiffres > 2 chiffres).

3. TRAITEMENT TVA :
   - Achat TTC → décomposer en HT + TVA : débit 601 (HT) + débit 4451 (TVA récupérable) = crédit 401 (TTC)
   - Vente TTC → décomposer : débit 411 (TTC) = crédit 701 (HT) + crédit 4431 (TVA collectée)
   - Si le texte mentionne "TTC" sans détailler, calculer HT = TTC / 1.18 (TVA 18%)

4. OPÉRATIONS MULTIPLES : Si le document contient plusieurs opérations distinctes, génère une seule écriture globale cohérente. Utilise autant de lignes que nécessaire.

5. MOYENS DE PAIEMENT :
   - Chèque → compte 521 (Banque) ou 512 (Chèques à encaisser)
   - Espèces → compte 531 (Caisse)
   - Virement → compte 521 (Banque)
   - Crédit fournisseur → compte 401 (Fournisseurs)
   - Crédit client → compte 411 (Clients)

6. LIBELLÉS PRÉCIS : Les libellés de chaque ligne doivent être spécifiques : inclure nom du tiers, numéro de pièce, date si disponibles.

7. MONTANTS : Exprime les montants en FCFA. Si une autre devise est indiquée, utilise le montant tel quel et précise-le dans les notes.

8. AMORTISSEMENTS : Pour les immobilisations, calcule l'amortissement annuel et crée l'écriture appropriée (681/682 → 281/282).

9. SALAIRES : Décompose en brut, charges patronales, charges salariales, net à payer.

10. INFORMATIONS MANQUANTES : Si un montant est illisible ou absent, utilise 0 et signale-le dans les notes.`;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { texte } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!texte || typeof texte !== "string" || texte.trim().length < 5) {
      return NextResponse.json(
        { error: "Texte de l'opération manquant ou trop court." },
        { status: 400 }
      );
    }

    if (texte.trim().length > 15000) {
      return NextResponse.json(
        { error: "Texte trop long. Maximum 15 000 caractères." },
        { status: 400 }
      );
    }

    // ── Load plan comptable ──────────────────────────────────────────────────
    const planComptable = loadPlanComptable();
    const systemPrompt  = buildSystemPrompt(planComptable);

    // ── Claude Analysis ──────────────────────────────────────────────────────
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: buildUserMessage(texte.trim()),
        },
      ],
    });

    // ── Extract JSON ─────────────────────────────────────────────────────────
    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const cleanJson = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("[analyser] JSON parse error:", parseErr, "\nRaw:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Réponse IA invalide. Veuillez réessayer." },
        { status: 500 }
      );
    }

    // ── Sanitize & validate ──────────────────────────────────────────────────
    const sanitized = sanitizeEntry(data);

    // Re-check balance (safety net)
    const td = sanitized.lignes.reduce((s, l) => s + (l.debit  || 0), 0);
    const tc = sanitized.lignes.reduce((s, l) => s + (l.credit || 0), 0);
    sanitized.equilibre = {
      total_debit:  Math.round(td * 100) / 100,
      total_credit: Math.round(tc * 100) / 100,
      est_equilibre: Math.abs(td - tc) < 0.01,
    };

    return NextResponse.json(sanitized, { status: 200 });

  } catch (error) {
    console.error("[analyser] Error:", error);
    return handleAnthropicError(error);
  }
}

// ─── User message ─────────────────────────────────────────────────────────────
function buildUserMessage(texte) {
  return `Voici le texte extrait du document comptable à analyser :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${texte}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Instructions :
1. Identifie la nature exacte de l'opération comptable décrite
2. Détermine le(s) principe(s) comptable(s) OHADA applicable(s)
3. Sélectionne les comptes SYSCOHADA les plus appropriés dans le plan comptable fourni
4. Génère l'écriture comptable complète et équilibrée
5. Si la TVA est impliquée, décompose systématiquement HT / TVA / TTC
6. Si plusieurs opérations sont présentes, génère une écriture globale cohérente
7. Vérifie l'équilibre (Σ Débits = Σ Crédits) avant de répondre

Réponds UNIQUEMENT avec le JSON demandé.`;
}

// ─── Sanitizers ───────────────────────────────────────────────────────────────
function sanitizeEntry(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Structure JSON invalide");
  }

  return {
    operation: sanitizeStr(data.operation, "Opération comptable", 120),
    contexte:  sanitizeStr(data.contexte, "", 1000),
    date:      sanitizeDate(data.date),
    principe:  sanitizeStr(data.principe, "", 200),
    lignes:    sanitizeLignes(data.lignes),
    equilibre: data.equilibre || { total_debit: 0, total_credit: 0, est_equilibre: false },
    notes:     sanitizeStr(data.notes, "", 1000),
  };
}

function sanitizeLignes(lignes) {
  if (!Array.isArray(lignes) || lignes.length === 0) {
    throw new Error("Aucune ligne comptable générée");
  }

  return lignes.slice(0, 50).map((l, i) => {
    if (!l || typeof l !== "object") return null;

    const compte = sanitizeStr(l.compte, "", 10).replace(/[^0-9]/g, "");
    if (!compte) {
      console.warn(`[analyser] Ligne ${i}: numéro de compte vide`);
    }

    const debit  = parseAmount(l.debit);
    const credit = parseAmount(l.credit);

    // Each line must have either debit OR credit (not both, not neither)
    // But we keep as-is and let the UI flag imbalance
    return {
      compte:            compte || "?",
      libelle_compte:    sanitizeStr(l.libelle_compte,   "Compte", 150),
      libelle_operation: sanitizeStr(l.libelle_operation, "",      250),
      debit:             debit  ?? null,
      credit:            credit ?? null,
    };
  }).filter(Boolean);
}

function parseAmount(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (isNaN(n) || n < 0) return null;
  if (n === 0) return null; // treat 0 as null (empty cell)
  return Math.round(n * 100) / 100;
}

function sanitizeStr(val, fallback, maxLen) {
  if (!val || typeof val !== "string") return fallback;
  return val.trim().slice(0, maxLen);
}

function sanitizeDate(val) {
  if (!val || typeof val !== "string") return new Date().toLocaleDateString("fr-FR");
  // Accept DD/MM/YYYY or YYYY-MM-DD
  const frMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (frMatch) return val;
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
  // Fallback: today
  return new Date().toLocaleDateString("fr-FR");
}

// ─── Error handler ────────────────────────────────────────────────────────────
function handleAnthropicError(error) {
  if (error?.status === 401) {
    return NextResponse.json({ error: "Clé API Anthropic invalide." }, { status: 401 });
  }
  if (error?.status === 429) {
    return NextResponse.json(
      { error: "Limite de requêtes atteinte. Réessayez dans quelques instants." },
      { status: 429 }
    );
  }
  if (error?.status === 529) {
    return NextResponse.json(
      { error: "API surchargée. Réessayez dans quelques secondes." },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { error: "Erreur lors de l'analyse comptable. Veuillez réessayer." },
    { status: 500 }
  );
}
