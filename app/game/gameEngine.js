// app/game/gameEngine.js
// Pure data + helpers. No React. No require(). Safe for server + client import.

// ── World definitions ─────────────────────────────────────────
export const WORLDS = [
  {
    id: 'forest',
    slug: '/game/forest',
    name: 'Enchanted Forest',
    subtitle: 'The Whispering Woods',
    emoji: '🌲',
    unlockAt: 0,
    totalSteps: 6,
    theme: {
      bg:       '#0a1a0e',
      surface:  '#0f2414',
      accent:   '#4ade80',
      accent2:  '#86efac',
      glow:     'rgba(74,222,128,0.25)',
      text:     '#dcfce7',
      muted:    '#6b9e7a',
      gradient: 'linear-gradient(135deg,#0a1a0e 0%,#0f2a18 50%,#071409 100%)',
      orb1:     'rgba(34,197,94,0.12)',
      orb2:     'rgba(16,185,129,0.08)',
    },
    character: { name: 'Pip', emoji: '🐭', desc: 'A brave little mouse explorer' },
    quizTopic: 'nature, forests, animals, ecology and botany',
    steps: [
      { id: 0, type: 'story',  title: 'Arrival',         text: 'Pip steps into the Whispering Forest. Ancient trees tower above, their leaves shimmering with golden light. A path of glowing mushrooms leads deeper into the woods.' },
      { id: 1, type: 'quiz',   title: "The Owl's Test",  text: 'A wise old owl blocks the path. "Only the knowledgeable may pass!" she hoots.' },
      { id: 2, type: 'puzzle', title: 'Mushroom Bridge', text: 'A river blocks the way. Tap the symbols in the right sequence to build the bridge!', puzzle: 'sequence' },
      { id: 3, type: 'quiz',   title: "Fox's Riddle",    text: 'A clever fox appears with a challenge. Answer correctly to earn his respect.' },
      { id: 4, type: 'puzzle', title: 'The Lost Stars',  text: 'The fireflies have lost their glow. Match the symbol pairs to restore the forest light!', puzzle: 'match' },
      { id: 5, type: 'story',  title: 'Forest Heart',    text: '🌟 You found the Emerald of the Forest! The trees sing your name as golden light pours from the ancient trunk. A new path shimmers open ahead...' },
    ],
  },
  {
    id: 'palace',
    slug: '/game/palace',
    name: 'Crystal Palace',
    subtitle: 'The Realm of Mirrors',
    emoji: '🏰',
    unlockAt: 1,
    totalSteps: 6,
    theme: {
      bg:       '#0d0a1a',
      surface:  '#16103a',
      accent:   '#a78bfa',
      accent2:  '#c4b5fd',
      glow:     'rgba(167,139,250,0.25)',
      text:     '#ede9fe',
      muted:    '#8b7bc8',
      gradient: 'linear-gradient(135deg,#0d0a1a 0%,#1a1040 50%,#080614 100%)',
      orb1:     'rgba(139,92,246,0.15)',
      orb2:     'rgba(99,102,241,0.08)',
    },
    character: { name: 'Pip', emoji: '🐭', desc: 'Now wearing a silver cape' },
    quizTopic: 'history, royalty, architecture, art and world cultures',
    steps: [
      { id: 0, type: 'story',  title: 'Grand Gates',     text: "The Crystal Palace rises before Pip, its towers piercing the violet clouds. Every wall reflects a hundred versions of you. The Queen's mirror whispers secrets." },
      { id: 1, type: 'quiz',   title: 'Royal Archivist', text: 'The Palace Archivist adjusts his spectacles. "You must prove your knowledge of history to enter the Royal Library."' },
      { id: 2, type: 'puzzle', title: 'Mirror Maze',     text: 'The mirrors have scrambled! Rotate the arrows until all point UP to reveal the hidden portrait.', puzzle: 'rotate' },
      { id: 3, type: 'quiz',   title: 'Court Jester',    text: '"Answer one right and I\'ll show you the secret passage!" cartwheels the Jester.' },
      { id: 4, type: 'puzzle', title: 'Crystal Chimes',  text: 'Tap the crystal bells in the correct sequence to unlock the Royal Vault!', puzzle: 'sequence' },
      { id: 5, type: 'story',  title: 'The Throne Room', text: '💎 The Crystal Emerald floats down from the ceiling! The Queen bows as magic ripples through the palace. Two worlds down, one more awaits...' },
    ],
  },
  {
    id: 'jungle',
    slug: '/game/jungle',
    name: 'Ancient Jungle',
    subtitle: 'Ruins of the Lost City',
    emoji: '🌴',
    unlockAt: 2,
    totalSteps: 6,
    theme: {
      bg:       '#1a0e00',
      surface:  '#2a1800',
      accent:   '#fb923c',
      accent2:  '#fdba74',
      glow:     'rgba(251,146,60,0.25)',
      text:     '#ffedd5',
      muted:    '#b87a45',
      gradient: 'linear-gradient(135deg,#1a0e00 0%,#2d1500 50%,#0f0800 100%)',
      orb1:     'rgba(234,88,12,0.15)',
      orb2:     'rgba(251,146,60,0.08)',
    },
    character: { name: 'Pip', emoji: '🐭', desc: 'Explorer hat and adventure boots' },
    quizTopic: 'geography, ancient civilizations, nature, science and world wonders',
    steps: [
      { id: 0, type: 'story',  title: 'Into the Jungle',  text: 'Thick vines hang like curtains as Pip enters the Ancient Jungle. Parrots screech warnings overhead. Hidden among the roots — crumbling stone ruins etched with glowing symbols.' },
      { id: 1, type: 'quiz',   title: 'The Serpent God',  text: '"Prove your wisdom, tiny traveler, or become part of my collection of statues!" hisses the stone serpent.' },
      { id: 2, type: 'puzzle', title: 'Totem Towers',     text: 'Drag the totem symbols to sort them in order from smallest to largest!', puzzle: 'sort' },
      { id: 3, type: 'quiz',   title: 'Wise Shaman',      text: 'An ancient shaman emerges from the mist, testing your knowledge of the natural world.' },
      { id: 4, type: 'puzzle', title: 'Hidden Temple',    text: 'Memorise the glowing tiles, then tap them from memory before the temple seals shut!', puzzle: 'memory' },
      { id: 5, type: 'story',  title: 'Final Emerald!',   text: '🔥 The GOLDEN EMERALD blazes with ancient power! All three realms are free. Pip stands victorious — a true Champion of Fabula Quest! The legend will be told forever.' },
    ],
  },
]

// ── Fallback questions (used when API is unavailable) ─────────
export const FALLBACK_QUESTIONS = [
  { q: 'How many hearts does an octopus have?', opts: ['1','2','3','5'], ans: 2, exp: 'Octopuses have 3 hearts — two pump blood to the gills, one to the body!', difficulty: 'medium' },
  { q: 'Which is the tallest mountain on Earth?', opts: ['K2','Mont Blanc','Kilimanjaro','Mount Everest'], ans: 3, exp: 'Mount Everest stands at 8,849 m — the highest point on Earth.', difficulty: 'easy' },
  { q: 'What animal never sleeps?', opts: ['Shark','Dolphin','Bullfrog','Elephant'], ans: 2, exp: 'Bullfrogs never truly sleep — they rest with their eyes open!', difficulty: 'hard' },
  { q: 'What is the fastest bird in the world?', opts: ['Eagle','Ostrich','Peregrine Falcon','Albatross'], ans: 2, exp: 'The Peregrine Falcon dives at over 320 km/h — the fastest animal alive!', difficulty: 'medium' },
  { q: 'How many sides does a hexagon have?', opts: ['5','6','7','8'], ans: 1, exp: 'Hexa means 6 in Greek. Honeycombs are hexagonal!', difficulty: 'easy' },
  { q: 'What planet is known as the Red Planet?', opts: ['Venus','Jupiter','Saturn','Mars'], ans: 3, exp: 'Mars appears red because of iron oxide (rust) on its surface!', difficulty: 'easy' },
  { q: 'Which ancient wonder stood in Alexandria?', opts: ['Colossus of Rhodes','Lighthouse of Alexandria','Hanging Gardens','Temple of Artemis'], ans: 1, exp: 'The Lighthouse of Alexandria stood ~137m tall and guided sailors for centuries.', difficulty: 'medium' },
  { q: 'How long does sunlight take to reach Earth?', opts: ['8 seconds','8 minutes','8 hours','8 days'], ans: 1, exp: 'Sunlight takes about 8 minutes 20 seconds to reach us — 150 million km!', difficulty: 'medium' },
]

// ── Quiz fetcher ──────────────────────────────────────────────
export async function fetchQuizQuestion(topic) {
  try {
    const res = await fetch('/api/fabula-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    if (!data.q || !Array.isArray(data.opts) || data.opts.length !== 4) throw new Error('bad shape')
    return data
  } catch {
    return FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)]
  }
}

// ── Progress helpers ──────────────────────────────────────────
const SAVE_KEY = 'fabula-quest-v1'

export function loadProgress() {
  if (typeof window === 'undefined') return { emeralds: 0, stepsByWorld: {} }
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return { emeralds: 0, stepsByWorld: {} }
    return JSON.parse(raw)
  } catch {
    return { emeralds: 0, stepsByWorld: {} }
  }
}

export function saveProgress(data) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)) } catch {}
}

export function resetProgress() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(SAVE_KEY) } catch {}
}

// ── Shared CSS ────────────────────────────────────────────────
export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=JetBrains+Mono:wght@400;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
@keyframes float     { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-10px)} }
@keyframes floatB    { 0%,100%{transform:translateY(-6px)} 50%{transform:translateY(6px)}  }
@keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.45} }
@keyframes spin      { to{transform:rotate(360deg)} }
@keyframes popIn     { 0%{transform:scale(0.6) rotate(-4deg);opacity:0} 80%{transform:scale(1.06) rotate(1deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
@keyframes slideUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
@keyframes shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes shake     { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
@keyframes glow      { 0%,100%{box-shadow:0 0 20px rgba(255,200,0,0.3)} 50%{box-shadow:0 0 50px rgba(255,200,0,0.6)} }
@keyframes twinkle   { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
@keyframes emeraldFly{ 0%{transform:scale(0) rotate(0deg);opacity:0} 60%{transform:scale(1.3) rotate(360deg);opacity:1} 100%{transform:scale(1) rotate(380deg);opacity:1} }
.float     { animation: float 3.5s ease-in-out infinite; }
.floatB    { animation: floatB 4.5s ease-in-out infinite; }
.pop-in    { animation: popIn .4s cubic-bezier(.36,.07,.19,.97) forwards; }
.slide-up  { animation: slideUp .45s ease forwards; }
.shake     { animation: shake .4s ease; }
.emerald-fly { animation: emeraldFly .8s cubic-bezier(.36,.07,.19,.97) forwards; }
`
