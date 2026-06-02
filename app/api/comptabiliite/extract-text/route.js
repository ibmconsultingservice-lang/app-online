import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

// ─── Supported MIME types ─────────────────────────────────────────────────────
const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// ─── POST Handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { error: "Image base64 manquante ou invalide." },
        { status: 400 }
      );
    }

    const safeMime = SUPPORTED_TYPES.includes(mimeType)
      ? mimeType
      : "image/jpeg";

    // Rough size check: base64 ~4/3 of original bytes
    const estimatedBytes = (imageBase64.length * 3) / 4;
    const maxBytes = 20 * 1024 * 1024; // 20 MB
    if (estimatedBytes > maxBytes) {
      return NextResponse.json(
        { error: "Image trop volumineuse. Taille maximale : 20 Mo." },
        { status: 400 }
      );
    }

    // ── Claude Vision OCR ───────────────────────────────────────────────────
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: safeMime,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Tu es un moteur OCR de haute précision spécialisé dans les documents financiers et commerciaux en français et en anglais (factures, reçus, relevés bancaires, bons de commande, contrats, tickets de caisse, bordereaux de livraison).

Extrait TOUT le texte visible dans cette image, en respectant scrupuleusement ces règles :

1. FIDÉLITÉ ABSOLUE : Reproduis exactement le texte tel qu'il apparaît, sans correction, reformulation ni interprétation.
2. STRUCTURE : Préserve la mise en page et la hiérarchie du document (titres, colonnes, lignes de tableau, totaux).
3. CHIFFRES : Les montants, numéros, dates et références doivent être copiés avec une précision totale — aucune approximation.
4. TABLEAUX : Représente les colonnes avec des tabulations ou des espaces cohérents pour maintenir l'alignement.
5. SÉPARATION : Utilise des sauts de ligne pour séparer les sections logiques du document.
6. MENTIONS COMPLÈTES : Inclus tous les en-têtes, pieds de page, mentions légales, tampons et signatures visibles.
7. AMBIGUÏTÉS : Si un caractère est illisible, indique-le entre crochets : [illisible].
8. LANGUE : Ne traduis rien — garde la langue originale du document.

Réponds UNIQUEMENT avec le texte extrait. Pas de commentaire, pas d'introduction, pas de conclusion.`,
            },
          ],
        },
      ],
    });

    // Extract text from response
    const extractedText = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: "Aucun texte détecté dans l'image. Vérifiez la qualité et la lisibilité du document." },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        text: extractedText,
        charCount: extractedText.length,
        model: "claude-opus-4-5",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("[extract-text] Error:", error);
    return handleAnthropicError(error);
  }
}

// ─── Error handler ────────────────────────────────────────────────────────────
function handleAnthropicError(error) {
  if (error?.status === 400 && error?.message?.includes("image")) {
    return NextResponse.json(
      { error: "Format d'image non supporté ou image corrompue." },
      { status: 400 }
    );
  }
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
    { error: "Erreur lors de l'extraction du texte. Veuillez réessayer." },
    { status: 500 }
  );
}
