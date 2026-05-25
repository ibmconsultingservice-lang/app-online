// app/api/generer-scanai/route.js
// Receives a base64 image from the client, sends it to Claude Vision,
// which analyzes document boundaries and returns precise crop + correction data.

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req) {
  try {
    const { imageBase64, mediaType, imageWidth, imageHeight } = await req.json()

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: 'Image manquante' }, { status: 400 })
    }

    // ── Prompt: ask Claude to detect document boundaries ──────────────
    const prompt = `You are an expert document scanner AI. Analyze this image carefully.

Your task is to detect a document (paper, card, receipt, form, book page, whiteboard, etc.) in the image and provide precise crop + correction data.

Image dimensions: ${imageWidth}px wide × ${imageHeight}px tall

ANALYSIS STEPS:
1. Identify if there is a document/paper/card in the image
2. Find the 4 corner points of the document (even if slightly tilted or perspective-distorted)
3. Determine the document's orientation (portrait/landscape) and type
4. Estimate background vs document area percentage
5. Suggest color corrections if needed (brightness, contrast)

RESPOND ONLY with a JSON object — no markdown, no explanation:
{
  "detected": true,
  "documentType": "paper | card | receipt | book | whiteboard | form | photo | unknown",
  "confidence": 0.0 to 1.0,
  "description": "Brief description of what you see (e.g. 'A4 white paper on dark desk, slightly tilted')",
  
  "corners": {
    "topLeft":     { "x": 0, "y": 0 },
    "topRight":    { "x": 0, "y": 0 },
    "bottomRight": { "x": 0, "y": 0 },
    "bottomLeft":  { "x": 0, "y": 0 }
  },
  
  "cropRect": {
    "x":      0,
    "y":      0,
    "width":  0,
    "height": 0
  },
  
  "rotation": 0,
  
  "outputDimensions": {
    "width":  0,
    "height": 0,
    "ratio":  "A4 | A5 | letter | card | square | free"
  },
  
  "corrections": {
    "brightness": 0,
    "contrast":   0,
    "sharpen":    false,
    "grayscale":  false
  },
  
  "warnings": []
}

All pixel values must be within the image bounds (0 to ${imageWidth} for x, 0 to ${imageHeight} for y).
cropRect is the axis-aligned bounding box of the document.
corners are the exact (possibly perspective-warped) corners.
rotation is the clockwise tilt angle in degrees (-45 to 45).
brightness is -1.0 to 1.0 (0 = no change).
contrast is -1.0 to 1.0 (0 = no change).
If no document is detected, set detected=false and fill cropRect with the full image.`

    const message = await client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'image',
            source: {
              type:       'base64',
              media_type: mediaType,
              data:       imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          }
        ]
      }]
    })

    // ── Parse Claude's response ────────────────────────────────────────
    const raw   = message.content[0]?.text?.trim() || '{}'
    const clean = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let analysis
    try {
      analysis = JSON.parse(clean)
    } catch {
      // Fallback: full-image crop if parsing fails
      analysis = {
        detected:      false,
        documentType:  'unknown',
        confidence:    0,
        description:   'Impossible d\'analyser l\'image',
        corners: {
          topLeft:     { x: 0,           y: 0            },
          topRight:    { x: imageWidth,  y: 0            },
          bottomRight: { x: imageWidth,  y: imageHeight  },
          bottomLeft:  { x: 0,           y: imageHeight  },
        },
        cropRect: { x: 0, y: 0, width: imageWidth, height: imageHeight },
        rotation: 0,
        outputDimensions: { width: imageWidth, height: imageHeight, ratio: 'free' },
        corrections: { brightness: 0, contrast: 0, sharpen: false, grayscale: false },
        warnings: ['Analyse échouée — recadrage complet appliqué'],
      }
    }

    // ── Safety clamp: ensure all coords are within image bounds ──────
    const clampX = v => Math.max(0, Math.min(imageWidth,  Math.round(v || 0)))
    const clampY = v => Math.max(0, Math.min(imageHeight, Math.round(v || 0)))

    if (analysis.corners) {
      for (const key of ['topLeft','topRight','bottomRight','bottomLeft']) {
        analysis.corners[key].x = clampX(analysis.corners[key].x)
        analysis.corners[key].y = clampY(analysis.corners[key].y)
      }
    }
    if (analysis.cropRect) {
      analysis.cropRect.x      = clampX(analysis.cropRect.x)
      analysis.cropRect.y      = clampY(analysis.cropRect.y)
      analysis.cropRect.width  = clampX(analysis.cropRect.x + analysis.cropRect.width)  - analysis.cropRect.x
      analysis.cropRect.height = clampY(analysis.cropRect.y + analysis.cropRect.height) - analysis.cropRect.y
    }

    return NextResponse.json({ analysis, rawResponse: raw })

  } catch (err) {
    console.error('[ScanAI]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}