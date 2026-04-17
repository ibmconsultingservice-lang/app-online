import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
// 1. Import createRequire to handle the old pdf-parse library
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const format = formData.get('format');

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 2. pdfParse is now correctly loaded via require
    const parsed = await pdfParse(buffer);
    const rawText = parsed.text?.trim() || '';

    if (!rawText) return NextResponse.json({ error: 'Impossible d\'extraire le texte du PDF' }, { status: 422 });

    // ── WORD ──
    if (format === 'word') {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620', // Note: Updated to a valid model name
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Tu es un assistant expert en mise en forme de documents. 
Voici le contenu brut extrait d'un PDF. Restructure-le proprement en texte clair, 
bien organisé, avec des titres et paragraphes. 
Retourne UNIQUEMENT le texte restructuré, sans commentaire ni balise Markdown.

CONTENU PDF :
${rawText.slice(0, 12000)}`
        }]
      });

      const text = message.content.map(b => b.text || '').join('');
      return NextResponse.json({ text });
    }

    // ── EXCEL ──
    if (format === 'excel') {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Tu es un expert en extraction de données structurées.
Analyse ce texte extrait d'un PDF et extrais toutes les données sous forme de tableau JSON.
Retourne UNIQUEMENT un tableau JSON valide (array d'objets), sans commentaire, sans backticks, sans Markdown.
Chaque objet doit avoir des clés cohérentes représentant les colonnes.
Si le contenu n'est pas tabulaire, décompose-le en entrées logiques avec des champs pertinents.

CONTENU PDF :
${rawText.slice(0, 12000)}`
        }]
      });

      const raw = message.content.map(b => b.text || '').join('').trim();
      const clean = raw.replace(/```json|```/g, '').trim();

      let data;
      try {
        data = JSON.parse(clean);
        if (!Array.isArray(data)) data = [data];
      } catch {
        data = [{ contenu: raw }];
      }

      return NextResponse.json({ data });
    }

    // ── POWERPOINT ──
    if (format === 'powerpoint') {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Tu es un expert en création de présentations PowerPoint.
Analyse ce texte extrait d'un PDF et génère une structure de présentation professionnelle.
Retourne UNIQUEMENT un tableau JSON valide, sans commentaire, sans backticks, sans Markdown.
Format attendu : un array d'objets avec exactement ces deux clés :
- "title" : titre de la slide (string)
- "bullets" : array de strings (points clés de la slide, max 5 par slide)
Génère entre 5 et 12 slides selon la densité du contenu.

CONTENU PDF :
${rawText.slice(0, 12000)}`
        }]
      });

      const raw = message.content.map(b => b.text || '').join('').trim();
      const clean = raw.replace(/```json|```/g, '').trim();

      let slides;
      try {
        slides = JSON.parse(clean);
        if (!Array.isArray(slides)) slides = [{ title: 'Contenu', bullets: [clean] }];
      } catch {
        slides = [{ title: 'Contenu extrait', bullets: rawText.slice(0, 500).split('\n').filter(Boolean).slice(0, 5) }];
      }

      return NextResponse.json({ slides });
    }

    return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });

  } catch (err) {
    console.error('[pdfconvert]', err);
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 });
  }
}
