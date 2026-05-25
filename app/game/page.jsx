'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WORLDS, loadProgress, resetProgress, GLOBAL_CSS } from './gameEngine'

// ── Particle background ───────────────────────────────────────
function Particle({ style }) {
  return <div style={{ position: 'absolute', borderRadius: '50%', pointerEvents: 'none', ...style }} />
}

function Stars() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2.5,
    delay: Math.random() * 4,
    dur: 2 + Math.random() * 3,
  }))
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          borderRadius: '50%',
          background: '#fff',
          opacity: 0.2,
          animation: `twinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

// ── World Card ───────────────────────────────────────────────
function WorldCard({ world, emeralds, stepsByWorld, onPlay, delay }) {
  const unlocked = emeralds >= world.unlockAt
  const stepsCompleted = stepsByWorld[world.id] || 0
  const completed = stepsCompleted >= world.totalSteps
  const progress = Math.min(100, Math.round((stepsCompleted / world.totalSteps) * 100))
  const t = world.theme

  return (
    <div
      onClick={() => unlocked && onPlay(world.slug)}
      className="slide-up"
      style={{
        animationDelay: `${delay}ms`,
        opacity: 0,
        background: unlocked ? t.surface : 'rgba(10,10,20,0.8)',
        border: `1.5px solid ${unlocked ? t.accent + '40' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 24,
        padding: '28px 24px',
        cursor: unlocked ? 'pointer' : 'not-allowed',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform .2s, box-shadow .2s',
        boxShadow: completed ? `0 0 40px ${t.glow}` : unlocked ? `0 8px 32px rgba(0,0,0,0.4)` : 'none',
        filter: unlocked ? 'none' : 'grayscale(0.7)',
      }}
      onMouseEnter={e => { if (unlocked) { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 20px 60px ${t.glow}` } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = completed ? `0 0 40px ${t.glow}` : unlocked ? '0 8px 32px rgba(0,0,0,0.4)' : 'none' }}
    >
      {/* Glow orb bg */}
      {unlocked && (
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 180, height: 180, borderRadius: '50%',
          background: t.orb1, filter: 'blur(40px)', pointerEvents: 'none',
        }} />
      )}

      {/* Lock overlay */}
      {!unlocked && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 24,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 10, backdropFilter: 'blur(2px)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: "'Crimson Pro', serif" }}>
            Need {world.unlockAt} emerald{world.unlockAt > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Completed badge */}
      {completed && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: `${t.accent}20`, border: `1px solid ${t.accent}60`,
          borderRadius: 8, padding: '3px 10px',
          fontSize: 11, fontWeight: 700,
          color: t.accent, fontFamily: "'JetBrains Mono', monospace",
        }}>✓ COMPLETE</div>
      )}

      {/* World icon */}
      <div style={{
        fontSize: 52,
        marginBottom: 14,
        display: 'block',
        filter: unlocked ? 'none' : 'brightness(0.4)',
        animation: unlocked && !completed ? 'float 3.5s ease-in-out infinite' : 'none',
      }}>
        {world.emoji}
      </div>

      {/* Name */}
      <h2 style={{
        fontFamily: "'Cinzel Decorative', serif",
        fontSize: 16,
        fontWeight: 700,
        color: unlocked ? t.text : 'rgba(255,255,255,0.25)',
        marginBottom: 4,
        letterSpacing: '0.03em',
      }}>{world.name}</h2>
      <p style={{
        fontSize: 12,
        color: unlocked ? t.muted : 'rgba(255,255,255,0.15)',
        fontFamily: "'Crimson Pro', serif",
        fontStyle: 'italic',
        marginBottom: 18,
      }}>{world.subtitle}</p>

      {/* Character */}
      {unlocked && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 18,
          padding: '8px 12px',
          background: `${t.accent}10`,
          border: `1px solid ${t.accent}20`,
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 20 }}>{world.character.emoji}</span>
          <span style={{ fontSize: 12, color: t.muted, fontFamily: "'Crimson Pro', serif" }}>
            {world.character.desc}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {unlocked && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: t.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
              PROGRESS
            </span>
            <span style={{ fontSize: 10, color: t.accent, fontFamily: "'JetBrains Mono', monospace" }}>
              {progress}%
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})`,
              borderRadius: 3,
              transition: 'width .6s ease',
            }} />
          </div>
          <div style={{ fontSize: 10, color: t.muted, marginTop: 5, fontFamily: "'Crimson Pro', serif" }}>
            {stepsCompleted} / {world.totalSteps} steps completed
          </div>
        </div>
      )}

      {/* Play button */}
      {unlocked && (
        <button style={{
          marginTop: 18,
          width: '100%',
          padding: '12px',
          borderRadius: 14,
          border: `1.5px solid ${t.accent}50`,
          background: completed
            ? `${t.accent}15`
            : `linear-gradient(135deg, ${t.accent}25, ${t.accent2}15)`,
          color: t.accent,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Cinzel Decorative', serif",
          cursor: 'pointer',
          letterSpacing: '0.05em',
          transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = `${t.accent}30` }}
          onMouseLeave={e => { e.currentTarget.style.background = completed ? `${t.accent}15` : `linear-gradient(135deg, ${t.accent}25, ${t.accent2}15)` }}
        >
          {completed ? '🔁 Play Again' : stepsCompleted > 0 ? '▶ Continue' : '⚔ Enter World'}
        </button>
      )}
    </div>
  )
}

// ── Emerald display ──────────────────────────────────────────
function EmeraldCounter({ count, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: '50%',
          background: i < count
            ? 'radial-gradient(circle at 35% 35%, #86efac, #16a34a)'
            : 'rgba(255,255,255,0.06)',
          border: i < count ? '1.5px solid rgba(74,222,128,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
          boxShadow: i < count ? '0 0 12px rgba(74,222,128,0.4)' : 'none',
          transition: 'all .4s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12,
        }}>
          {i < count ? '💎' : ''}
        </div>
      ))}
    </div>
  )
}

// ── Main Hub ─────────────────────────────────────────────────
export default function GameHub() {
  const router = useRouter()
  const [progress, setProgress] = useState({ emeralds: 0, stepsByWorld: {} })
  const [showReset, setShowReset] = useState(false)

  useEffect(() => {
    setProgress(loadProgress())
  }, [])

  function handlePlay(slug) {
    router.push(slug)
  }

  function handleReset() {
    resetProgress()
    setProgress({ emeralds: 0, stepsByWorld: {} })
    setShowReset(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 10%, rgba(74,222,128,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(167,139,250,0.06) 0%, transparent 50%), #060912',
      color: '#fff',
      fontFamily: "'Crimson Pro', Georgia, serif",
      overflowX: 'hidden',
    }}>
      <style>{GLOBAL_CSS}</style>
      <Stars />

      {/* ── HEADER ── */}
      <header style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center',
        padding: '56px 24px 32px',
      }}>
        {/* Logo */}
        <div style={{ fontSize: 48, marginBottom: 12 }} className="float">🗺️</div>
        <h1 style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: 'clamp(28px, 6vw, 52px)',
          fontWeight: 900,
          letterSpacing: '0.04em',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #fff 60%, #a78bfa 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'shimmer 4s linear infinite',
          marginBottom: 8,
        }}>
          Fabula Quest
        </h1>
        <p style={{
          fontFamily: "'Crimson Pro', serif",
          fontStyle: 'italic',
          fontSize: 18,
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 32,
        }}>
          Journey through magical worlds · Solve puzzles · Collect the Emeralds
        </p>

        {/* Emerald counter */}
        <div style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '16px 28px',
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.3)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Emeralds Collected
          </span>
          <EmeraldCounter count={progress.emeralds} total={WORLDS.length} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: "'Crimson Pro', serif" }}>
            {progress.emeralds} / {WORLDS.length} worlds conquered
          </span>
        </div>

        {/* Reset (small link) */}
        <div style={{ marginTop: 8 }}>
          {!showReset
            ? <button onClick={() => setShowReset(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace', letterSpacing: '0.1em" }}>reset progress</button>
            : (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,100,100,0.7)' }}>Are you sure?</span>
                <button onClick={handleReset} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '3px 10px', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>Yes, reset</button>
                <button onClick={() => setShowReset(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 10px', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              </div>
            )
          }
        </div>
      </header>

      {/* ── WORLD MAP ── */}
      <main style={{ position: 'relative', zIndex: 5, maxWidth: 960, margin: '0 auto', padding: '0 20px 60px' }}>

        {/* Connecting path decoration */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{
            position: 'absolute',
            top: '50%', left: '10%', right: '10%',
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), rgba(255,255,255,0.06), transparent)',
            zIndex: 0,
          }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {WORLDS.map((world, i) => (
            <WorldCard
              key={world.id}
              world={world}
              emeralds={progress.emeralds}
              stepsByWorld={progress.stepsByWorld}
              onPlay={handlePlay}
              delay={i * 120}
            />
          ))}
        </div>

        {/* Total completion message */}
        {progress.emeralds >= WORLDS.length && (
          <div style={{
            marginTop: 40,
            textAlign: 'center',
            padding: '32px',
            background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.12) 0%, transparent 70%)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 24,
          }} className="pop-in">
            <div style={{ fontSize: 56, marginBottom: 12 }}>👑</div>
            <h2 style={{
              fontFamily: "'Cinzel Decorative', serif",
              fontSize: 24,
              color: '#fbbf24',
              marginBottom: 8,
            }}>Champion of Fabula!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', fontSize: 16 }}>
              All three emeralds collected. The legend of Pip lives forever.
            </p>
          </div>
        )}

        {/* How to play */}
        <div style={{
          marginTop: 40,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20,
          padding: '24px 28px',
        }}>
          <h3 style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.15em',
            marginBottom: 16,
          }}>How To Play</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: '📖', title: 'Story scenes', text: 'Follow Pip through illustrated narrative moments' },
              { icon: '❓', title: 'AI Quizzes', text: 'Answer questions generated live by AI — every game is different!' },
              { icon: '🧩', title: 'Mini puzzles', text: 'Solve interactive puzzles: sequences, memory, sorting challenges' },
              { icon: '💎', title: 'Collect emeralds', text: 'Complete each world to earn a precious emerald and unlock the next' },
            ].map(h => (
              <div key={h.title} style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{h.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{h.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{h.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
