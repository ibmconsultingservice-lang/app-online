'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchQuizQuestion, loadProgress, saveProgress, GLOBAL_CSS } from './gameEngine'

// ── Floating particles for ambiance ──────────────────────────
function AmbientParticles({ theme }) {
  const orbs = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    size: 60 + Math.random() * 120,
    dur: 6 + Math.random() * 8,
    delay: Math.random() * 5,
  }))
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {orbs.map(o => (
        <div key={o.id} style={{
          position: 'absolute',
          left: `${o.x}%`, top: `${o.y}%`,
          width: o.size, height: o.size,
          borderRadius: '50%',
          background: theme.orb1,
          filter: 'blur(40px)',
          animation: `floatB ${o.dur}s ${o.delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

// ── Character avatar ──────────────────────────────────────────
function CharacterBubble({ character, theme, animating }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: `${theme.accent}18`,
        border: `2px solid ${theme.accent}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36,
        boxShadow: `0 0 24px ${theme.glow}`,
        animation: animating ? 'none' : 'float 3.5s ease-in-out infinite',
      }}>
        {character.emoji}
      </div>
      <span style={{ fontSize: 11, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>
        {character.name}
      </span>
    </div>
  )
}

// ── Step indicators ───────────────────────────────────────────
function StepDots({ steps, currentStep, theme }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
      {steps.map((s, i) => {
        const done = i < currentStep
        const active = i === currentStep
        const icons = { story: '📖', quiz: '❓', puzzle: '🧩' }
        return (
          <div key={i} style={{
            width: active ? 32 : 22,
            height: 22,
            borderRadius: 11,
            background: done
              ? `${theme.accent}35`
              : active
                ? `${theme.accent}20`
                : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${done ? theme.accent + '60' : active ? theme.accent + '80' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10,
            transition: 'all .3s',
            position: 'relative',
          }}>
            {done ? '✓' : active ? icons[s.type] || '·' : ''}
          </div>
        )
      })}
    </div>
  )
}

// ── STORY STEP ────────────────────────────────────────────────
function StoryStep({ step, theme, character, onNext }) {
  const [revealed, setRevealed] = useState(false)
  useEffect(() => { const t = setTimeout(() => setRevealed(true), 100); return () => clearTimeout(t) }, [])

  return (
    <div className={revealed ? 'slide-up' : ''} style={{ opacity: revealed ? 1 : 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{
          fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.25em',
          color: theme.muted,
          fontFamily: "'JetBrains Mono', monospace",
          display: 'block', marginBottom: 8,
        }}>Chapter Scene</span>
        <h2 style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: 22,
          color: theme.text,
          marginBottom: 0,
        }}>{step.title}</h2>
      </div>

      {/* Story text bubble */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'flex-start',
        background: `${theme.accent}08`,
        border: `1px solid ${theme.accent}20`,
        borderRadius: 20,
        padding: '24px 22px',
        marginBottom: 28,
        position: 'relative',
      }}>
        <CharacterBubble character={character} theme={theme} animating={false} />
        <div style={{
          flex: 1,
          fontSize: 17,
          lineHeight: 1.7,
          color: theme.text,
          fontFamily: "'Crimson Pro', serif",
          fontStyle: 'italic',
        }}>
          "{step.text}"
        </div>
      </div>

      <button onClick={onNext} style={{
        width: '100%',
        padding: '16px',
        borderRadius: 16,
        background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent2}15)`,
        border: `1.5px solid ${theme.accent}50`,
        color: theme.accent,
        fontSize: 15,
        fontWeight: 700,
        fontFamily: "'Cinzel Decorative', serif",
        cursor: 'pointer',
        letterSpacing: '0.05em',
        transition: 'all .15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = `${theme.accent}40` }}
        onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${theme.accent}30, ${theme.accent2}15)` }}
      >
        Continue the adventure →
      </button>
    </div>
  )
}

// ── QUIZ STEP ─────────────────────────────────────────────────
function QuizStep({ step, theme, character, quizTopic, onNext }) {
  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chosen, setChosen] = useState(null)
  const [timer, setTimer] = useState(20)
  const [timedOut, setTimedOut] = useState(false)
  const timerRef = useRef(null)
  const [shakingIdx, setShakingIdx] = useState(null)

  useEffect(() => {
    fetchQuizQuestion(quizTopic).then(q => {
      setQuestion(q); setLoading(false)
      let s = 20
      setTimer(s)
      timerRef.current = setInterval(() => {
        s--; setTimer(s)
        if (s <= 0) { clearInterval(timerRef.current); setTimedOut(true); setChosen(-1) }
      }, 1000)
    })
    return () => clearInterval(timerRef.current)
  }, [quizTopic])

  function answer(idx) {
    if (chosen !== null) return
    clearInterval(timerRef.current)
    if (idx !== question.ans) setShakingIdx(idx)
    setChosen(idx)
  }

  const correct = chosen === question?.ans
  const timerPct = (timer / 20) * 100
  const timerColor = timer <= 5 ? '#ef4444' : timer <= 10 ? '#f59e0b' : theme.accent

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: theme.muted, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 8 }}>Knowledge Challenge</span>
        <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 22, color: theme.text }}>{step.title}</h2>
      </div>

      {/* NPC intro */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: `${theme.accent}08`, border: `1px solid ${theme.accent}20`, borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
        <CharacterBubble character={character} theme={theme} animating={loading} />
        <p style={{ flex: 1, fontSize: 15, color: theme.text, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic', lineHeight: 1.6 }}>
          "{step.text}"
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${theme.accent}30`, borderTop: `3px solid ${theme.accent}`, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          <span style={{ fontSize: 14, color: theme.muted, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic' }}>
            Summoning the question…
          </span>
        </div>
      )}

      {question && !loading && (
        <div className="slide-up">
          {/* Timer */}
          {chosen === null && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: theme.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>TIME</span>
                <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: timerColor, fontWeight: 600, animation: timer <= 5 ? 'pulse .5s ease infinite' : 'none' }}>
                  {timer}s
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, borderRadius: 2, transition: 'width 1s linear, background .3s' }} />
              </div>
            </div>
          )}

          {/* Question */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: 16,
            padding: '20px 18px',
            marginBottom: 14,
          }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#fff', lineHeight: 1.55, fontFamily: "'Crimson Pro', serif" }}>
              {question.q}
            </p>
            {question.difficulty && (
              <span style={{
                display: 'inline-block', marginTop: 8,
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: question.difficulty === 'hard' ? '#f87171' : question.difficulty === 'medium' ? '#fbbf24' : '#4ade80',
                background: question.difficulty === 'hard' ? 'rgba(239,68,68,0.1)' : question.difficulty === 'medium' ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)',
                border: `1px solid ${question.difficulty === 'hard' ? 'rgba(239,68,68,0.2)' : question.difficulty === 'medium' ? 'rgba(251,191,36,0.2)' : 'rgba(74,222,128,0.2)'}`,
                borderRadius: 4, padding: '2px 8px',
              }}>{question.difficulty}</span>
            )}
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {question.opts.map((opt, i) => {
              let bg = 'rgba(255,255,255,0.04)'
              let border = '1.5px solid rgba(255,255,255,0.1)'
              let color = 'rgba(255,255,255,0.85)'
              if (chosen !== null) {
                if (i === question.ans) { bg = `${theme.accent}18`; border = `1.5px solid ${theme.accent}60`; color = theme.accent }
                else if (i === chosen && chosen !== question.ans) { bg = 'rgba(239,68,68,0.12)'; border = '1.5px solid rgba(239,68,68,0.4)'; color = '#f87171' }
              }
              return (
                <button key={i}
                  onClick={() => answer(i)}
                  disabled={chosen !== null}
                  className={shakingIdx === i ? 'shake' : ''}
                  style={{
                    background: bg, border, borderRadius: 12,
                    padding: '13px 16px',
                    textAlign: 'left', cursor: chosen !== null ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'all .12s',
                  }}
                  onMouseEnter={e => { if (chosen === null) e.currentTarget.style.border = `1.5px solid ${theme.accent}50` }}
                  onMouseLeave={e => { if (chosen === null) e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.1)' }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: chosen !== null && i === question.ans
                      ? `${theme.accent}25`
                      : chosen !== null && i === chosen
                        ? 'rgba(239,68,68,0.2)'
                        : 'rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    color, flexShrink: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {chosen !== null && i === question.ans ? '✓' : chosen !== null && i === chosen && chosen !== question.ans ? '✗' : String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: 14, color, fontFamily: "'Crimson Pro', serif" }}>{opt}</span>
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {chosen !== null && (
            <div className="pop-in">
              {timedOut ? (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#f87171', fontFamily: "'Crimson Pro', serif" }}>
                  ⏰ Time's up! The correct answer was: <strong>{question.opts[question.ans]}</strong>
                  <br /><span style={{ fontSize: 12, opacity: 0.8 }}>{question.exp}</span>
                </div>
              ) : (
                <div style={{
                  background: correct ? `${theme.accent}10` : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${correct ? theme.accent + '30' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                  fontSize: 13, lineHeight: 1.6,
                  color: correct ? theme.accent : '#fca5a5',
                  fontFamily: "'Crimson Pro', serif",
                }}>
                  {correct ? '✨ ' : '💬 '}{question.exp}
                </div>
              )}

              <button onClick={onNext} style={{
                width: '100%', padding: '14px',
                borderRadius: 14,
                background: correct
                  ? `linear-gradient(135deg, ${theme.accent}30, ${theme.accent2}15)`
                  : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${correct ? theme.accent + '50' : 'rgba(255,255,255,0.12)'}`,
                color: correct ? theme.accent : 'rgba(255,255,255,0.6)',
                fontSize: 14, fontWeight: 700,
                fontFamily: "'Cinzel Decorative', serif",
                cursor: 'pointer', letterSpacing: '0.04em',
              }}>
                {correct ? '⚡ Advance!' : 'Press on regardless →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── PUZZLE STEP ───────────────────────────────────────────────
function PuzzleStep({ step, theme, onNext }) {
  const type = step.puzzle

  // ── Sequence puzzle ──
  if (type === 'sequence') return <SequencePuzzle step={step} theme={theme} onNext={onNext} />
  if (type === 'match')    return <MatchPuzzle step={step} theme={theme} onNext={onNext} />
  if (type === 'rotate')   return <RotatePuzzle step={step} theme={theme} onNext={onNext} />
  if (type === 'sort')     return <SortPuzzle step={step} theme={theme} onNext={onNext} />
  if (type === 'memory')   return <MemoryPuzzle step={step} theme={theme} onNext={onNext} />
  return null
}

// Sequence puzzle: tap glowing items in the correct order
function SequencePuzzle({ step, theme, onNext }) {
  const items = ['🍄', '⭐', '🌙', '🔮', '🌺']
  const solution = [2, 0, 4, 1, 3]
  const [sequence, setSequence] = useState([])
  const [status, setStatus] = useState('idle') // idle | wrong | done

  function tap(i) {
    if (status !== 'idle') return
    const next = [...sequence, i]
    if (next[next.length - 1] !== solution[next.length - 1]) {
      setStatus('wrong')
      setTimeout(() => { setSequence([]); setStatus('idle') }, 900)
      return
    }
    setSequence(next)
    if (next.length === solution.length) setStatus('done')
  }

  return (
    <div>
      <PuzzleHeader step={step} theme={theme} />
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12, color: theme.muted, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic' }}>
        Tap in the correct order: Crystal → Mushroom → Flower → Star → Moon
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        {items.map((item, i) => {
          const selected = sequence.includes(i)
          const selectedIdx = sequence.indexOf(i)
          return (
            <button key={i} onClick={() => tap(i)} style={{
              width: 72, height: 72, borderRadius: 18,
              background: selected ? `${theme.accent}25` : 'rgba(255,255,255,0.04)',
              border: `2px solid ${selected ? theme.accent + '70' : 'rgba(255,255,255,0.1)'}`,
              fontSize: 32, cursor: status === 'done' ? 'default' : 'pointer',
              position: 'relative',
              animation: status === 'wrong' && selected ? 'shake .4s ease' : 'none',
              transition: 'all .15s',
              boxShadow: selected ? `0 0 20px ${theme.glow}` : 'none',
            }}>
              {item}
              {selected && (
                <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>
                  {selectedIdx + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${(sequence.length / solution.length) * 100}%`, background: status === 'wrong' ? '#ef4444' : theme.accent, transition: 'all .3s' }} />
      </div>
      {status === 'done' && (
        <button onClick={onNext} className="pop-in" style={{ width: '100%', padding: '14px', borderRadius: 14, background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent2}15)`, border: `1.5px solid ${theme.accent}50`, color: theme.accent, fontSize: 14, fontWeight: 700, fontFamily: "'Cinzel Decorative', serif", cursor: 'pointer' }}>
          ✨ Puzzle Solved! Continue →
        </button>
      )}
      {status === 'wrong' && <div style={{ textAlign: 'center', color: '#f87171', fontSize: 13, fontFamily: "'Crimson Pro', serif" }}>✗ Wrong order — try again!</div>}
    </div>
  )
}

// Match puzzle: pair symbols
function MatchPuzzle({ step, theme, onNext }) {
  const pairs = ['🌟', '🔥', '💧', '🌿', '💎', '🌙']
  const cards = [...pairs, ...pairs].map((v, i) => ({ id: i, val: v, flipped: false, matched: false }))
  const [deck, setDeck] = useState(() => cards.sort(() => Math.random() - 0.5))
  const [flipped, setFlipped] = useState([])
  const [solved, setSolved] = useState(0)
  const [locked, setLocked] = useState(false)

  function flip(id) {
    if (locked) return
    const card = deck.find(c => c.id === id)
    if (card.flipped || card.matched) return
    const newFlipped = [...flipped, id]
    setDeck(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c))
    if (newFlipped.length === 2) {
      setLocked(true)
      const [a, b] = newFlipped.map(fid => deck.find(c => c.id === fid))
      if (a.val === b.val) {
        setTimeout(() => {
          setDeck(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, matched: true } : c))
          setFlipped([]); setLocked(false)
          setSolved(s => s + 1)
        }, 500)
      } else {
        setTimeout(() => {
          setDeck(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, flipped: false } : c))
          setFlipped([]); setLocked(false)
        }, 900)
      }
    } else {
      setFlipped(newFlipped)
    }
  }

  return (
    <div>
      <PuzzleHeader step={step} theme={theme} />
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12, color: theme.muted, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic' }}>
        Find all matching pairs to restore the light!
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {deck.map(card => (
          <button key={card.id} onClick={() => flip(card.id)} style={{
            aspectRatio: '1',
            borderRadius: 12,
            border: `1.5px solid ${card.matched ? theme.accent + '60' : card.flipped ? theme.accent + '40' : 'rgba(255,255,255,0.1)'}`,
            background: card.matched ? `${theme.accent}18` : card.flipped ? 'rgba(255,255,255,0.08)' : `${theme.accent}05`,
            fontSize: 24, cursor: 'pointer',
            transition: 'all .2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {card.flipped || card.matched ? card.val : '?'}
          </button>
        ))}
      </div>
      {solved === pairs.length && (
        <button onClick={onNext} className="pop-in" style={{ width: '100%', padding: '14px', borderRadius: 14, background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent2}15)`, border: `1.5px solid ${theme.accent}50`, color: theme.accent, fontSize: 14, fontWeight: 700, fontFamily: "'Cinzel Decorative', serif", cursor: 'pointer' }}>
          ✨ All Pairs Found! Continue →
        </button>
      )}
    </div>
  )
}

// Rotate puzzle: click tiles to rotate, align all arrows up
function RotatePuzzle({ step, theme, onNext }) {
  const SIZE = 4
  const [tiles, setTiles] = useState(() =>
    Array.from({ length: SIZE * SIZE }, (_, i) => ({
      id: i,
      rot: Math.floor(Math.random() * 4) * 90,
    }))
  )
  const [moves, setMoves] = useState(0)

  function rotateTile(i) {
    setTiles(prev => prev.map((t, idx) => idx === i ? { ...t, rot: (t.rot + 90) % 360 } : t))
    setMoves(m => m + 1)
  }

  const allAligned = tiles.every(t => t.rot === 0)

  return (
    <div>
      <PuzzleHeader step={step} theme={theme} />
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12, color: theme.muted, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic' }}>
        Click tiles to rotate. Align all arrows pointing UP ↑ to reveal the portrait!
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 6, marginBottom: 20 }}>
        {tiles.map((tile, i) => (
          <button key={tile.id} onClick={() => rotateTile(i)} style={{
            aspectRatio: '1', borderRadius: 10,
            background: tile.rot === 0 ? `${theme.accent}20` : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${tile.rot === 0 ? theme.accent + '50' : 'rgba(255,255,255,0.1)'}`,
            fontSize: 20, cursor: 'pointer',
            transition: 'all .2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ display: 'inline-block', transform: `rotate(${tile.rot}deg)`, transition: 'transform .25s' }}>↑</span>
          </button>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: theme.muted, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
        Moves: {moves} · Aligned: {tiles.filter(t => t.rot === 0).length}/{tiles.length}
      </div>
      {allAligned && (
        <button onClick={onNext} className="pop-in" style={{ width: '100%', padding: '14px', borderRadius: 14, background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent2}15)`, border: `1.5px solid ${theme.accent}50`, color: theme.accent, fontSize: 14, fontWeight: 700, fontFamily: "'Cinzel Decorative', serif", cursor: 'pointer' }}>
          ✨ Portrait Revealed! Continue →
        </button>
      )}
    </div>
  )
}

// Sort puzzle: drag items into correct order
function SortPuzzle({ step, theme, onNext }) {
  const items = [
    { id: 0, emoji: '🌱', label: 'Seed' },
    { id: 1, emoji: '🌿', label: 'Sprout' },
    { id: 2, emoji: '🌲', label: 'Tree' },
    { id: 3, emoji: '🏔️', label: 'Mountain' },
    { id: 4, emoji: '🌍', label: 'World' },
  ]
  const solution = [0, 1, 2, 3, 4]
  const [order, setOrder] = useState(() => [...items].sort(() => Math.random() - 0.5))
  const [dragging, setDragging] = useState(null)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)

  function startDrag(i) { setDragging(i) }
  function dropOn(i) {
    if (dragging === null || dragging === i) return
    const next = [...order]
    const temp = next[dragging]; next[dragging] = next[i]; next[i] = temp
    setOrder(next); setDragging(null)
  }

  function check() {
    const isCorrect = order.every((item, i) => item.id === solution[i])
    setCorrect(isCorrect); setChecked(true)
  }

  return (
    <div>
      <PuzzleHeader step={step} theme={theme} />
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12, color: theme.muted, fontFamily: "'Crimson Pro', serif', fontStyle: 'italic" }}>
        Drag to sort from smallest to largest: Seed → Sprout → Tree → Mountain → World
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {order.map((item, i) => (
          <div key={item.id}
            draggable
            onDragStart={() => startDrag(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => dropOn(i)}
            style={{
              width: 80, height: 90, borderRadius: 14,
              background: dragging === i ? `${theme.accent}25` : 'rgba(255,255,255,0.04)',
              border: `2px solid ${dragging === i ? theme.accent : checked && correct ? theme.accent + '60' : checked && !correct ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, cursor: 'grab', userSelect: 'none',
              transition: 'all .15s',
            }}>
            <span style={{ fontSize: 28 }}>{item.emoji}</span>
            <span style={{ fontSize: 10, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>#{i + 1}</span>
          </div>
        ))}
      </div>
      {!checked && (
        <button onClick={check} style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: "'Cinzel Decorative', serif", cursor: 'pointer' }}>
          Check Order
        </button>
      )}
      {checked && !correct && (
        <div>
          <div style={{ textAlign: 'center', color: '#f87171', marginBottom: 12, fontFamily: "'Crimson Pro', serif" }}>✗ Not quite! Keep rearranging.</div>
          <button onClick={() => setChecked(false)} style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, cursor: 'pointer' }}>Try again</button>
        </div>
      )}
      {checked && correct && (
        <button onClick={onNext} className="pop-in" style={{ width: '100%', padding: '14px', borderRadius: 14, background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent2}15)`, border: `1.5px solid ${theme.accent}50`, color: theme.accent, fontSize: 14, fontWeight: 700, fontFamily: "'Cinzel Decorative', serif", cursor: 'pointer' }}>
          ✨ Correct Order! Continue →
        </button>
      )}
    </div>
  )
}

// Memory puzzle: memorise tile, then tap from memory
function MemoryPuzzle({ step, theme, onNext }) {
  const SIZE = 9 // 3x3
  const [phase, setPhase] = useState('show') // show | play | done | fail
  const [lit, setLit] = useState(() => {
    const s = new Set()
    while (s.size < 4) s.add(Math.floor(Math.random() * SIZE))
    return s
  })
  const [selected, setSelected] = useState(new Set())
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (phase !== 'show') return
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(iv); setPhase('play'); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [phase])

  function select(i) {
    if (phase !== 'play') return
    const next = new Set(selected)
    if (next.has(i)) next.delete(i); else next.add(i)
    setSelected(next)
    if (next.size === lit.size) {
      const correct = [...lit].every(v => next.has(v))
      setPhase(correct ? 'done' : 'fail')
    }
  }

  return (
    <div>
      <PuzzleHeader step={step} theme={theme} />
      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 12, color: theme.muted, fontFamily: "'Crimson Pro', serif', fontStyle: 'italic" }}>
        {phase === 'show' ? `Memorise the 4 glowing tiles! Hiding in ${countdown}…` : phase === 'play' ? 'Now tap the tiles you remember!' : phase === 'done' ? '✨ Perfect memory!' : '✗ Wrong tiles — try again!'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, maxWidth: 260, margin: '0 auto 20px' }}>
        {Array.from({ length: SIZE }, (_, i) => {
          const isLit = lit.has(i)
          const isSel = selected.has(i)
          const show = phase === 'show'
          return (
            <button key={i} onClick={() => select(i)} style={{
              aspectRatio: '1', borderRadius: 14,
              background: show && isLit
                ? `${theme.accent}30`
                : isSel
                  ? phase === 'done' ? `${theme.accent}25` : 'rgba(239,68,68,0.2)'
                  : 'rgba(255,255,255,0.04)',
              border: `2px solid ${show && isLit ? theme.accent + '70' : isSel ? theme.accent + '50' : 'rgba(255,255,255,0.1)'}`,
              cursor: phase === 'play' ? 'pointer' : 'default',
              fontSize: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .2s',
              boxShadow: show && isLit ? `0 0 16px ${theme.glow}` : 'none',
            }}>
              {show && isLit ? '✨' : ''}
            </button>
          )
        })}
      </div>
      {phase === 'fail' && (
        <button onClick={() => { setSelected(new Set()); setPhase('show'); setCountdown(3) }} style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif" }}>
          Try again
        </button>
      )}
      {phase === 'done' && (
        <button onClick={onNext} className="pop-in" style={{ width: '100%', padding: '14px', borderRadius: 14, background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent2}15)`, border: `1.5px solid ${theme.accent}50`, color: theme.accent, fontSize: 14, fontWeight: 700, fontFamily: "'Cinzel Decorative', serif", cursor: 'pointer' }}>
          ✨ Temple Unlocked! Continue →
        </button>
      )}
    </div>
  )
}

function PuzzleHeader({ step, theme }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: theme.muted, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 8 }}>Interactive Puzzle</span>
      <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 22, color: theme.text }}>{step.title}</h2>
      <p style={{ fontSize: 13, color: theme.muted, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic', marginTop: 6 }}>{step.text}</p>
    </div>
  )
}

// ── Emerald win screen ────────────────────────────────────────
function EmeraldWin({ world, onHome, onContinue, hasNext }) {
  const t = world.theme
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }} className="pop-in">
      <div style={{ fontSize: 80, marginBottom: 16 }} className="emerald-fly">💎</div>
      <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 26, color: t.accent, marginBottom: 8 }}>
        {world.name} Complete!
      </h2>
      <p style={{ fontSize: 16, color: t.muted, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic', marginBottom: 32, lineHeight: 1.7 }}>
        The Emerald of {world.name.split(' ')[0]} is yours!<br />
        Pip grows stronger with each victory.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onHome} style={{ padding: '13px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif" }}>
          ← World Map
        </button>
        {hasNext && (
          <button onClick={onContinue} style={{ padding: '13px 28px', borderRadius: 14, background: `linear-gradient(135deg, ${t.accent}35, ${t.accent2}20)`, border: `1.5px solid ${t.accent}50`, color: t.accent, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif" }}>
            Next World →
          </button>
        )}
      </div>
    </div>
  )
}

// ── MAIN LEVEL PAGE (exported and used by each world page) ────
export default function LevelPage({ worldId }) {
  const router = useRouter()
  const world = require('./gameEngine').WORLDS.find(w => w.id === worldId)
  if (!world) return null

  const { steps, theme, character, quizTopic } = world
  const [currentStep, setCurrentStep] = useState(0)
  const [won, setWon] = useState(false)
  const [progress, setProgress] = useState({ emeralds: 0, stepsByWorld: {} })

  useEffect(() => {
    const p = loadProgress()
    // Resume from saved step
    const savedStep = p.stepsByWorld[worldId] || 0
    setCurrentStep(Math.min(savedStep, steps.length - 1))
    setProgress(p)
  }, [worldId])

  function nextStep() {
    const next = currentStep + 1
    // Save progress
    const p = loadProgress()
    if (!p.stepsByWorld) p.stepsByWorld = {}
    p.stepsByWorld[worldId] = next
    if (next >= steps.length) {
      // Award emerald if not already earned
      const worldIdx = require('./gameEngine').WORLDS.findIndex(w => w.id === worldId)
      if (p.emeralds <= worldIdx) p.emeralds = worldIdx + 1
      p.stepsByWorld[worldId] = steps.length
      saveProgress(p)
      setProgress(p)
      setWon(true)
      return
    }
    saveProgress(p)
    setCurrentStep(next)
  }

  const WORLDS = require('./gameEngine').WORLDS
  const worldIdx = WORLDS.findIndex(w => w.id === worldId)
  const nextWorld = WORLDS[worldIdx + 1]

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.gradient,
      color: '#fff',
      fontFamily: "'Crimson Pro', Georgia, serif",
    }}>
      <style>{GLOBAL_CSS}</style>
      <AmbientParticles theme={theme} />

      {/* Top nav */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: `1px solid ${theme.accent}18`,
        background: `${theme.bg}cc`,
        backdropFilter: 'blur(12px)',
      }}>
        <button onClick={() => router.push('/game')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: theme.muted,
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          ← Map
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{world.emoji}</span>
          <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 13, color: theme.text }}>{world.name}</span>
        </div>

        <div style={{ fontSize: 11, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>
          {won ? '✓ Done' : `${currentStep + 1}/${steps.length}`}
        </div>
      </nav>

      {/* Step dots */}
      {!won && (
        <div style={{ padding: '12px 20px', position: 'relative', zIndex: 5 }}>
          <StepDots steps={steps} currentStep={currentStep} theme={theme} />
        </div>
      )}

      {/* Main content */}
      <main style={{ position: 'relative', zIndex: 5, maxWidth: 580, margin: '0 auto', padding: '12px 20px 60px' }}>
        <div style={{
          background: `${theme.surface}cc`,
          border: `1px solid ${theme.accent}20`,
          borderRadius: 24,
          padding: '28px 24px',
          backdropFilter: 'blur(16px)',
          boxShadow: `0 24px 80px rgba(0,0,0,0.4)`,
        }}>
          {won ? (
            <EmeraldWin
              world={world}
              onHome={() => router.push('/game')}
              onContinue={() => nextWorld && router.push(nextWorld.slug)}
              hasNext={!!nextWorld}
            />
          ) : (
            (() => {
              const step = steps[currentStep]
              if (step.type === 'story')  return <StoryStep  key={currentStep} step={step} theme={theme} character={character} onNext={nextStep} />
              if (step.type === 'quiz')   return <QuizStep   key={currentStep} step={step} theme={theme} character={character} quizTopic={quizTopic} onNext={nextStep} />
              if (step.type === 'puzzle') return <PuzzleStep key={currentStep} step={step} theme={theme} onNext={nextStep} />
              return null
            })()
          )}
        </div>
      </main>
    </div>
  )
}
