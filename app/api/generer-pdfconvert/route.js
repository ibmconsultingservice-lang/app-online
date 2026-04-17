import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import PDFParser from 'pdf2json';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const format = formData.get('format');

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // --- PDF extraction logic using pdf2json ---
    const rawText = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1); // "1" means extract text only
      pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
      pdfParser.on("pdfParser_dataReady", pdfData => {
        resolve(pdfParser.getRawTextContent());
      });
      pdfParser.parseBuffer(buffer);
    });

    if (!rawText) return NextResponse.json({ error: 'Impossible d\'extraire le texte' }, { status: 422 });

    // ── AI Processing ──
    // (Note: Using the correct model name for Claude 3.5 Sonnet)
    const modelId = 'claude-sonnet-4-20250514';
    
    let aiPrompt = "";
    if (format === 'word') {
      aiPrompt = `Tu es un assistant expert en mise en forme. Restructure ce texte PDF proprement en texte clair avec titres et paragraphes. Retourne UNIQUEMENT le texte.\n\nCONTENU :\n${rawText.slice(0, 15000)}`;
    } else if (format === 'excel') {
      aiPrompt = `Extraits les données de ce texte sous forme de tableau JSON (array d'objets). Retourne UNIQUEMENT le JSON.\n\nCONTENU :\n${rawText.slice(0, 15000)}`;
    } else if (format === 'powerpoint') {
      aiPrompt = `Génère une structure de présentation (JSON array d'objets avec "title" et "bullets"). Retourne UNIQUEMENT le JSON.\n\nCONTENU :\n${rawText.slice(0, 15000)}`;
    }

    const message = await anthropic.messages.create({
      model: modelId,
      max_tokens: 4000,
      messages: [{ role: 'user', content: aiPrompt }]
    });

    const responseContent = message.content.map(b => b.text || '').join('').trim();

    // Handle JSON parsing for Excel/PPT
    if (format === 'excel' || format === 'powerpoint') {
      const cleanJson = responseContent.replace(/```json|```/g, '').trim();
      try {
        const data = JSON.parse(cleanJson);
        return NextResponse.json(format === 'excel' ? { data } : { slides: data });
      } catch (e) {
        return NextResponse.json({ text: responseContent }); // Fallback
      }
    }

    return NextResponse.json({ text: responseContent });

  } catch (err) {
    console.error('[pdfconvert]', err);
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 });
  }
}
