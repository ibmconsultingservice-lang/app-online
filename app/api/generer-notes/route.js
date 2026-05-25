// app/api/generer-notes/route.js
// Handles all AI interactions for Vanta Notes:
//   - 'chat'   : general conversation with optional active note context
//   - 'ask'    : question answering based on all notes content
//   - 'resume' : full summarization of all notes

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req) {
  try {
    const body = await req.json()
    const { mode } = body

    if (mode === 'chat')   return await handleChat(body)
    if (mode === 'ask')    return await handleAsk(body)
    if (mode === 'resume') return await handleResume(body)

    return NextResponse.json({ error: 'Mode inconnu. Utilisez: chat | ask | resume' }, { status: 400 })
  } catch (err) {
    console.error('[Vanta Notes API]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Build a compact text representation of a note for context injection.
 * Strips HTML, truncates content, includes tasks and calendar events.
 */
function noteToText(note, maxContentLength = 400) {
  const content = (note.content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxContentLength)

  const pendingTasks = (note.tasks || []).filter(t => !t.done)
  const doneTasks    = (note.tasks || []).filter(t => t.done)
  const events       = note.calendarEvents || []

  let text = `## Note: "${note.title}"`
  if (note.tags?.length)  text += `\nTags: ${note.tags.join(', ')}`
  if (note.pinned)        text += ' [EPINGLEE]'
  if (note.starred)       text += ' [ETOILEE]'
  text += `\nModifiee: ${new Date(note.updatedAt).toLocaleDateString('fr-FR')}`
  if (content)            text += `\n\nContenu:\n${content}${content.length >= maxContentLength ? '...' : ''}`
  if (pendingTasks.length) text += `\n\nTaches en attente (${pendingTasks.length}):\n${pendingTasks.map(t => `- [ ] ${t.text}`).join('\n')}`
  if (doneTasks.length)   text += `\n\nTaches completees (${doneTasks.length}):\n${doneTasks.map(t => `- [x] ${t.text}`).join('\n')}`
  if (events.length)      text += `\n\nEvenements calendrier:\n${events.map(e => `- ${e.date}${e.time ? ' a ' + e.time : ''}: ${e.title}`).join('\n')}`

  return text
}

/**
 * Convert frontend message history to Anthropic messages format.
 * Filters only user/assistant roles, keeps last N turns.
 */
function buildHistory(messages = [], maxTurns = 8) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-maxTurns * 2)
    .map(m => ({ role: m.role, content: m.content }))
}

// ─── Mode: Chat ───────────────────────────────────────────────────
async function handleChat(body) {
  const { messages = [], userMessage, activeNote } = body

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 })
  }

  const activeNoteContext = activeNote
    ? `\nNote actuellement ouverte par l'utilisateur:\n${noteToText(activeNote, 300)}`
    : "\nAucune note active."

  const system = `Tu es un assistant IA integre a Vanta Notes, une application de prise de notes moderne.
Tu es intelligent, concis et utile. Tu reponds toujours en francais sauf si l'utilisateur ecrit dans une autre langue.
Tu peux aider avec: redaction, organisation, brainstorming, resumes, analyses, questions generales.
${activeNoteContext}

Directives:
- Reponds de facon concise mais complete
- Si on te demande d'ameliorer ou de continuer une note, base-toi sur le contenu affiche
- Tu peux suggerer des taches, des tags ou des connexions entre notes si pertinent
- N'invente pas de contenu qui n'existe pas dans les notes`

  const history = buildHistory(messages)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system,
    messages: [
      ...history,
      { role: 'user', content: userMessage }
    ]
  })

  return NextResponse.json({
    reply: message.content[0]?.text || '',
    mode: 'chat'
  })
}

// ─── Mode: Ask ────────────────────────────────────────────────────
async function handleAsk(body) {
  const { messages = [], userMessage, notes = [] } = body

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Question vide' }, { status: 400 })
  }

  if (notes.length === 0) {
    return NextResponse.json({
      reply: "Vous n'avez aucune note pour l'instant. Creez des notes et reessayez !",
      mode: 'ask'
    })
  }

  // Build compact notes context — prioritize pinned/starred, then most recent
  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    if (a.starred && !b.starred) return -1
    if (!a.starred && b.starred) return 1
    return new Date(b.updatedAt) - new Date(a.updatedAt)
  })

  // Fit as many notes as possible within ~6000 chars of context
  let notesContext = ''
  let charCount = 0
  const MAX_CHARS = 6000
  let includedCount = 0

  for (const note of sorted) {
    const text = noteToText(note, 500)
    if (charCount + text.length > MAX_CHARS) break
    notesContext += text + '\n\n---\n\n'
    charCount += text.length
    includedCount++
  }

  const skipped = notes.length - includedCount

  const system = `Tu es un assistant IA specialise dans la recherche et l'analyse de notes personnelles.
L'utilisateur te pose des questions sur ses notes. Reponds en francais de facon precise.

Voici les notes de l'utilisateur (${includedCount} sur ${notes.length}${skipped > 0 ? `, ${skipped} non incluses faute de place` : ''}):

${notesContext}

Directives strictes:
- Reponds UNIQUEMENT en te basant sur le contenu des notes ci-dessus
- Si l'information demandee n'est pas dans les notes, dis-le clairement: "Cette information n'est pas dans vos notes."
- Si tu trouves l'information, cite le titre de la note source
- Pour les questions sur les taches, liste-les de facon structuree
- Pour les questions sur les evenements, inclus les dates et heures
- Ne fabrique pas d'informations absentes des notes`

  const history = buildHistory(messages)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system,
    messages: [
      ...history,
      { role: 'user', content: userMessage }
    ]
  })

  return NextResponse.json({
    reply: message.content[0]?.text || '',
    mode: 'ask',
    notesScanned: includedCount
  })
}

// ─── Mode: Resume ─────────────────────────────────────────────────
async function handleResume(body) {
  const { userMessage, notes = [] } = body

  if (notes.length === 0) {
    return NextResponse.json({
      reply: 'Aucune note a resumer. Commencez par creer des notes !',
      mode: 'resume'
    })
  }

  // Aggregate stats across all notes
  const allTasksPending = notes.flatMap(n =>
    (n.tasks || []).filter(t => !t.done).map(t => `- [ ] ${t.text} (note: "${n.title}")`)
  )
  const allTasksDone = notes.flatMap(n =>
    (n.tasks || []).filter(t => t.done).map(t => `- [x] ${t.text} (note: "${n.title}")`)
  )
  const allEvents = notes.flatMap(n =>
    (n.calendarEvents || []).map(e => `- ${e.date}${e.time ? ' a ' + e.time : ''}: ${e.title} (note: "${n.title}")`)
  )
  const allTags = [...new Set(notes.flatMap(n => n.tags || []))]

  // Build notes text — shorter per note since we want all of them
  const maxPerNote = Math.max(150, Math.floor(5000 / notes.length))
  const notesText = notes
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(n => noteToText(n, maxPerNote))
    .join('\n\n---\n\n')

  const statsBlock = [
    'STATISTIQUES GLOBALES:',
    `- Total notes: ${notes.length}`,
    `- Notes epinglees: ${notes.filter(n => n.pinned).length}`,
    `- Notes etoilees: ${notes.filter(n => n.starred).length}`,
    `- Taches en attente: ${allTasksPending.length}`,
    `- Taches completees: ${allTasksDone.length}`,
    `- Evenements calendrier: ${allEvents.length}`,
    `- Tags utilises: ${allTags.length > 0 ? allTags.join(', ') : 'aucun'}`,
  ].join('\n')

  const tasksBlock = allTasksPending.length > 0
    ? `\nTOUTES LES TACHES EN ATTENTE:\n${allTasksPending.join('\n')}`
    : ''

  const eventsBlock = allEvents.length > 0
    ? `\nTOUS LES EVENEMENTS CALENDRIER:\n${allEvents.join('\n')}`
    : ''

  const system = `Tu es un assistant expert en synthese et organisation de notes personnelles.
L'utilisateur veut un resume complet de toutes ses notes. Reponds en francais.

${statsBlock}
${tasksBlock}
${eventsBlock}

CONTENU DETAILLE DES NOTES:
${notesText}

Format de reponse souhaite:
1. **Vue d'ensemble** - resume global en 2-3 phrases
2. **Themes principaux** - les grands sujets abordes dans les notes
3. **Taches prioritaires** - les taches en attente les plus importantes
4. **Evenements a venir** - s'il y en a
5. **Insights** - observations utiles, connexions entre notes, ou recommandations

Sois synthetique mais complet. Utilise des listes a puces pour la clarte.`

  const promptContent = userMessage?.trim()
    ? userMessage
    : `Fais-moi un resume complet et structure de toutes mes notes.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: promptContent }]
  })

  return NextResponse.json({
    reply: message.content[0]?.text || '',
    mode: 'resume',
    stats: {
      totalNotes: notes.length,
      pendingTasks: allTasksPending.length,
      events: allEvents.length,
      tags: allTags
    }
  })
}