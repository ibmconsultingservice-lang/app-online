'use client'

/**
 * StoryComposition.jsx — ULTRA CINEMATIC MOTION SYSTEM
 *
 * Inspired by:
 *  After Effects · Mostory · VSCO · Apple Keynote · Nike Motion
 *  Spotify Wrapped · Behance Motion Design · Luxury Brand Cinema
 *
 * Architecture:
 *  Each scene is rendered as its own visual "chapter" using Remotion <Sequence>.
 *  The motionModel drives the complete visual language per-scene:
 *    cinematic | editorial | neon | organic | luxury | kinetic
 *
 * Effects inventory:
 *  → Photo: float, parallax, depth-blur, glitch-split, ink-reveal, whip-pan,
 *            mosaic-build, diagonal-slice, masked-circle, film-burn
 *  → Shapes: orbiting rings, SVG line-draws, particle fields, morphing blobs,
 *             grid overlays, diagonal slabs, liquid blobs, radar pulse
 *  → Typography: word-cascade, char-reveal, split-slide, stamp, glitch-type
 *  → Transitions: wipe-blade, radial-iris, pixel-dissolve, flash-cut, ink-bleed
 *  → Overlays: scan-lines, film-grain, chromatic-aberration, halftone, vignette
 */

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion'

// ─────────────────────────────────────────────────────────────
// EASING LIBRARY
// ─────────────────────────────────────────────────────────────
const E = {
  outExpo:    t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outQuart:   t => 1 - Math.pow(1 - t, 4),
  outQuint:   t => 1 - Math.pow(1 - t, 5),
  outElastic: t => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  inQuart:    t => t * t * t * t,
  inExpo:     t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  inOutSine:  t => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  linear:     t => t,
  outBack:    t => { const c = 1.70158 + 1; return 1 + c * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2) },
  outBounce:  t => {
    const n = 7.5625, d = 2.75
    if (t < 1 / d) return n * t * t
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
    return n * (t -= 2.625 / d) * t + 0.984375
  },
}

const lerp = (frame, [f0, f1], [v0, v1], easing = E.outQuart) =>
  interpolate(frame, [f0, f1], [v0, v1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing,
  })

const lerpK = (frame, frames, values, easing = E.outQuart) =>
  interpolate(frame, frames, values, {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing,
  })

// ─────────────────────────────────────────────────────────────
// MOTION MODEL CONFIGS
// ─────────────────────────────────────────────────────────────
const MODELS = {
  cinematic: {
    bg: '#05030A', accent: '#C9A84C', secondary: '#8B6914', tertiary: '#F5E6C8',
    titleFont: '"Georgia",serif', titleWeight: 400, titleSize: 72,
    tracking: '0.04em', textCase: 'none', titleColor: '#FFFFFF',
    photoEffect: 'parallax-zoom', transitionStyle: 'crossfade', shapeSet: 'film',
    overlays: ['grain', 'vignette', 'letterbox'],
  },
  editorial: {
    bg: '#0A0A0A', accent: '#F0EBE0', secondary: '#888', tertiary: '#555',
    titleFont: '"Arial Black","Impact",sans-serif', titleWeight: 900, titleSize: 88,
    tracking: '-0.05em', textCase: 'uppercase', titleColor: '#FFFFFF',
    photoEffect: 'diagonal-slice', transitionStyle: 'blade-wipe', shapeSet: 'editorial',
    overlays: ['grain'],
  },
  neon: {
    bg: '#000510', accent: '#00F5FF', secondary: '#FF2D8A', tertiary: '#7C3AED',
    titleFont: '"Courier New","Lucida Console",monospace', titleWeight: 700, titleSize: 68,
    tracking: '0.12em', textCase: 'uppercase', titleColor: '#FFFFFF',
    photoEffect: 'glitch-split', transitionStyle: 'scan-flash', shapeSet: 'neon',
    overlays: ['scanlines', 'chromaShift', 'vignette'],
  },
  organic: {
    bg: '#080C04', accent: '#8FBA47', secondary: '#C9E47A', tertiary: '#4A6E1A',
    titleFont: '"Georgia","Palatino",serif', titleWeight: 300, titleSize: 64,
    tracking: '0.1em', textCase: 'none', titleColor: '#F5F2EC',
    photoEffect: 'breathe-float', transitionStyle: 'ink-bleed', shapeSet: 'organic',
    overlays: ['grain', 'vignette'],
  },
  luxury: {
    bg: '#050309', accent: '#B8972E', secondary: '#E8D07A', tertiary: '#6B5520',
    titleFont: '"Georgia","Times New Roman",serif', titleWeight: 200, titleSize: 60,
    tracking: '0.3em', textCase: 'uppercase', titleColor: '#FFFFFF',
    photoEffect: 'reveal-mask', transitionStyle: 'gold-shimmer', shapeSet: 'luxury',
    overlays: ['grain', 'vignette'],
  },
  kinetic: {
    bg: '#020202', accent: '#FF2D55', secondary: '#FF9500', tertiary: '#FFFFFF',
    titleFont: '"Arial Black","Impact",sans-serif', titleWeight: 900, titleSize: 96,
    tracking: '-0.04em', textCase: 'uppercase', titleColor: '#FFFFFF',
    photoEffect: 'punch-shake', transitionStyle: 'flash-cut', shapeSet: 'kinetic',
    overlays: ['grain'],
  },
}

// ─────────────────────────────────────────────────────────────
// SVG PRIMITIVE COMPONENTS
// ─────────────────────────────────────────────────────────────

function OrbitRing({ cx, cy, r, color, speed = 0.3, frame, opacity = 0.4, dashes = '8 12' }) {
  const rot = frame * speed
  return (
    <circle cx={cx} cy={cy} r={r}
      fill="none" stroke={color} strokeWidth={1.5}
      strokeDasharray={dashes} opacity={opacity}
      transform={`rotate(${rot} ${cx} ${cy})`}
    />
  )
}

function LineDraw({ x1, y1, x2, y2, color, frame, startF = 0, endF = 40, width = 1, opacity = 0.6 }) {
  const progress = lerp(frame, [startF, endF], [0, 1], E.outExpo)
  const dx = x2 - x1, dy = y2 - y1
  return (
    <line
      x1={x1} y1={y1}
      x2={x1 + dx * progress} y2={y1 + dy * progress}
      stroke={color} strokeWidth={width} opacity={opacity} strokeLinecap="round"
    />
  )
}

function ParticleField({ count = 40, accent, frame, w = 1080, h = 1920, seed = 7 }) {
  return Array.from({ length: count }, (_, i) => {
    const r  = ((seed * 9301 + i * 49297 + 233) % 1000) / 1000
    const r2 = ((seed * 4321 + i * 1234  + 99)  % 1000) / 1000
    const r3 = ((seed * 7777 + i * 777   + 11)  % 1000) / 1000
    const r4 = ((seed * 1111 + i * 333   + 55)  % 1000) / 1000
    const delay = Math.floor(r4 * 30)
    const fade = lerp(frame, [delay, delay + 20], [0, 1], E.outQuart)
    const drift = Math.sin(frame * (0.004 + r4 * 0.014) + r * Math.PI * 2) * 18
    return (
      <circle key={i}
        cx={r * w} cy={r2 * h + drift}
        r={1.2 + r3 * 3} fill={accent}
        opacity={(0.3 + r3 * 0.5) * fade}
      />
    )
  })
}

function RadarPulse({ cx, cy, color, frame, maxR = 280 }) {
  return [0, 25, 50].map(offset => {
    const f  = (frame + offset) % 75
    const r  = lerp(f, [0, 75], [0, maxR])
    const op = lerp(f, [0, 30, 75], [0.6, 0.4, 0])
    return <circle key={offset} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.5} opacity={op} />
  })
}

function MorphBlob({ frame, x, y, color, size = 200, opacity = 0.15 }) {
  const t = frame * 0.012
  const rx = size * (0.45 + Math.sin(t) * 0.05)
  const ry = size * (0.42 + Math.cos(t * 1.3) * 0.07)
  return (
    <ellipse cx={x} cy={y} rx={rx} ry={ry}
      fill={color} opacity={opacity}
      transform={`rotate(${frame * 0.15} ${x} ${y})`}
      filter="url(#softBlur)"
    />
  )
}

function GridLines({ w, h, cols = 8, rows = 14, color, opacity = 0.06, frame, startF = 0 }) {
  const reveal = lerp(frame, [startF, startF + 30], [0, 1], E.outQuart)
  const lines = []
  for (let i = 1; i < cols; i++) {
    const x = (w / cols) * i
    lines.push(<line key={`v${i}`} x1={x} y1={0} x2={x} y2={h * reveal} stroke={color} strokeWidth={0.5} opacity={opacity} />)
  }
  for (let i = 1; i < rows; i++) {
    const y = (h / rows) * i
    lines.push(<line key={`h${i}`} x1={0} y1={y} x2={w * reveal} y2={y} stroke={color} strokeWidth={0.5} opacity={opacity} />)
  }
  return lines
}

function DiagonalSlab({ x, y, w, h, color, angle = -14, opacity = 0.25, frame, startF = 0 }) {
  const scaleX = lerp(frame, [startF, startF + 22], [0, 1], E.outExpo)
  return (
    <rect x={x} y={y} width={w * scaleX} height={h}
      fill={color} opacity={opacity}
      transform={`skewX(${angle})`} rx={4}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// SHAPE SETS — one per motion model
// ─────────────────────────────────────────────────────────────
function ShapeSet({ model, frame, accent, secondary, tertiary, w, h }) {
  if (model === 'film') return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <filter id="softBlur"><feGaussianBlur stdDeviation="50" /></filter>
        <filter id="glow"><feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <ParticleField count={30} accent={accent} frame={frame} w={w} h={h} seed={3} />
      <ellipse cx={w * 0.8} cy={h * 0.15} rx={340} ry={340} fill={accent} opacity={0.07} filter="url(#softBlur)" />
      <ellipse cx={w * 0.2} cy={h * 0.85} rx={260} ry={260} fill={secondary} opacity={0.09} filter="url(#softBlur)" />
      <OrbitRing cx={w * 0.82} cy={h * 0.14} r={120} color={accent} speed={0.22} frame={frame} opacity={0.25} />
      <OrbitRing cx={w * 0.82} cy={h * 0.14} r={180} color={accent} speed={-0.15} frame={frame} opacity={0.12} dashes="4 20" />
      <LineDraw x1={0} y1={h * 0.06} x2={w} y2={h * 0.06} color={accent} frame={frame} startF={4} endF={28} opacity={0.4} />
      <LineDraw x1={0} y1={h * 0.94} x2={w} y2={h * 0.94} color={accent} frame={frame} startF={6} endF={30} opacity={0.4} />
      <GridLines w={w} h={h} color={accent} opacity={0.04} frame={frame} />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={`sl${i}`} cx={22} cy={80 + i * (h - 160) / 11} r={7} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.18} />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={`sr${i}`} cx={w - 22} cy={80 + i * (h - 160) / 11} r={7} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.18} />
      ))}
    </svg>
  )

  if (model === 'editorial') return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${w} ${h}`}>
      <defs><filter id="softBlur"><feGaussianBlur stdDeviation="40" /></filter></defs>
      <DiagonalSlab x={-80} y={h * 0.3} w={w * 0.6} h={h * 0.38} color={accent} angle={-8} opacity={0.04} frame={frame} startF={0} />
      <DiagonalSlab x={w * 0.55} y={h * 0.55} w={w * 0.65} h={h * 0.36} color={secondary} angle={-8} opacity={0.03} frame={frame} startF={4} />
      {[[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]].map(([x, y, sx, sy], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x + sx * 48} y2={y} stroke={accent} strokeWidth={2} opacity={0.55} />
          <line x1={x} y1={y} x2={x} y2={y + sy * 48} stroke={accent} strokeWidth={2} opacity={0.55} />
        </g>
      ))}
      <LineDraw x1={60} y1={h * 0.1} x2={60} y2={h * 0.9} color={accent} frame={frame} startF={2} endF={24} width={3} opacity={0.3} />
      <LineDraw x1={w - 60} y1={h * 0.1} x2={w - 60} y2={h * 0.9} color={secondary} frame={frame} startF={4} endF={26} width={1} opacity={0.2} />
      <LineDraw x1={0} y1={h * 0.5} x2={w} y2={h * 0.5} color={accent} frame={frame} startF={6} endF={30} opacity={0.08} />
      <GridLines w={w} h={h} cols={6} rows={10} color={accent} opacity={0.06} frame={frame} startF={0} />
    </svg>
  )

  if (model === 'neon') return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <filter id="neonGlow">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softBlur"><feGaussianBlur stdDeviation="50" /></filter>
      </defs>
      <ellipse cx={w * 0.15} cy={h * 0.2} rx={300} ry={300} fill={accent} opacity={0.08} filter="url(#softBlur)" />
      <ellipse cx={w * 0.85} cy={h * 0.75} rx={280} ry={280} fill={secondary} opacity={0.10} filter="url(#softBlur)" />
      <ellipse cx={w * 0.5} cy={h * 0.5} rx={200} ry={200} fill={tertiary} opacity={0.06} filter="url(#softBlur)" />
      <GridLines w={w} h={h} cols={10} rows={18} color={accent} opacity={0.07} frame={frame} />
      <g filter="url(#neonGlow)">
        <RadarPulse cx={w * 0.12} cy={h * 0.22} color={accent} frame={frame} maxR={200} />
        <RadarPulse cx={w * 0.88} cy={h * 0.78} color={secondary} frame={frame + 12} maxR={180} />
      </g>
      <g filter="url(#neonGlow)">
        <OrbitRing cx={w * 0.85} cy={h * 0.15} r={80} color={accent} speed={0.5} frame={frame} opacity={0.6} />
        <OrbitRing cx={w * 0.85} cy={h * 0.15} r={140} color={secondary} speed={-0.35} frame={frame} opacity={0.4} />
        <OrbitRing cx={w * 0.15} cy={h * 0.8} r={60} color={tertiary} speed={0.4} frame={frame} opacity={0.5} />
      </g>
      <LineDraw x1={0} y1={h * 0.33} x2={w} y2={h * 0.33} color={accent} frame={frame} startF={8} endF={22} opacity={0.15} />
      <LineDraw x1={0} y1={h * 0.66} x2={w} y2={h * 0.66} color={secondary} frame={frame} startF={12} endF={26} opacity={0.12} />
      {[[20, 20, 1, 1], [w - 20, 20, -1, 1], [20, h - 20, 1, -1], [w - 20, h - 20, -1, -1]].map(([x, y, sx, sy], i) => (
        <g key={i} opacity={lerp(frame, [i * 3, i * 3 + 16], [0, 0.7], E.outExpo)}>
          <line x1={x} y1={y} x2={x + sx * 36} y2={y} stroke={accent} strokeWidth={2} />
          <line x1={x} y1={y} x2={x} y2={y + sy * 36} stroke={accent} strokeWidth={2} />
        </g>
      ))}
      <ParticleField count={50} accent={accent} frame={frame} w={w} h={h} seed={13} />
    </svg>
  )

  if (model === 'organic') return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <filter id="softBlur"><feGaussianBlur stdDeviation="60" /></filter>
        <filter id="medBlur"><feGaussianBlur stdDeviation="20" /></filter>
      </defs>
      <MorphBlob frame={frame} x={w * 0.8} y={h * 0.15} color={accent} size={420} opacity={0.12} />
      <MorphBlob frame={frame + 40} x={w * 0.2} y={h * 0.8} color={secondary} size={360} opacity={0.10} />
      <MorphBlob frame={frame + 20} x={w * 0.5} y={h * 0.5} color={tertiary} size={280} opacity={0.06} />
      <OrbitRing cx={w * 0.75} cy={h * 0.12} r={90} color={accent} speed={0.08} frame={frame} opacity={0.2} dashes="3 15" />
      <OrbitRing cx={w * 0.75} cy={h * 0.12} r={150} color={secondary} speed={-0.06} frame={frame} opacity={0.12} dashes="2 22" />
      <OrbitRing cx={w * 0.25} cy={h * 0.88} r={70} color={accent} speed={0.1} frame={frame} opacity={0.18} />
      <LineDraw x1={w * 0.05} y1={h * 0.45} x2={w * 0.18} y2={h * 0.55} color={accent} frame={frame} startF={10} endF={35} opacity={0.3} />
      <LineDraw x1={w * 0.82} y1={h * 0.42} x2={w * 0.95} y2={h * 0.58} color={secondary} frame={frame} startF={14} endF={38} opacity={0.25} />
      <ParticleField count={35} accent={accent} frame={frame} w={w} h={h} seed={17} />
    </svg>
  )

  if (model === 'luxury') return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <filter id="softBlur"><feGaussianBlur stdDeviation="50" /></filter>
        <filter id="goldGlow"><feGaussianBlur stdDeviation="10" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="40%" stopColor={accent} />
          <stop offset="60%" stopColor={secondary} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <ellipse cx={w * 0.5} cy={h * 0.2} rx={400} ry={300} fill={accent} opacity={0.06} filter="url(#softBlur)" />
      <ellipse cx={w * 0.5} cy={h * 0.8} rx={350} ry={250} fill={secondary} opacity={0.05} filter="url(#softBlur)" />
      <rect x={28} y={28} width={w - 56} height={h - 56}
        fill="none" stroke="url(#goldLine)" strokeWidth={0.8}
        opacity={lerp(frame, [6, 30], [0, 0.5], E.outQuart)}
      />
      <rect x={48} y={48} width={w - 96} height={h - 96}
        fill="none" stroke={accent} strokeWidth={0.4}
        opacity={lerp(frame, [10, 34], [0, 0.25], E.outQuart)}
      />
      {[[38, 38, 1, 1], [w - 38, 38, -1, 1], [38, h - 38, 1, -1], [w - 38, h - 38, -1, -1]].map(([x, y, sx, sy], i) => {
        const prog = lerp(frame, [i * 4, i * 4 + 20], [0, 1], E.outExpo)
        return (
          <g key={i} filter="url(#goldGlow)">
            <line x1={x} y1={y} x2={x + sx * 60 * prog} y2={y} stroke={accent} strokeWidth={1.5} opacity={0.7} />
            <line x1={x} y1={y} x2={x} y2={y + sy * 60 * prog} stroke={accent} strokeWidth={1.5} opacity={0.7} />
            <circle cx={x} cy={y} r={3 * prog} fill={accent} opacity={0.8} />
          </g>
        )
      })}
      <g filter="url(#goldGlow)">
        <OrbitRing cx={w * 0.5} cy={h * 0.5} r={280} color={accent} speed={0.04} frame={frame} opacity={0.07} dashes="1 30" />
        <OrbitRing cx={w * 0.5} cy={h * 0.5} r={380} color={secondary} speed={-0.03} frame={frame} opacity={0.05} dashes="1 40" />
      </g>
      <line x1={w * 0.18} y1={h * 0.5} x2={w * 0.82} y2={h * 0.5}
        stroke="url(#goldLine)" strokeWidth={0.6}
        opacity={lerp(frame, [20, 40], [0, 0.3], E.outQuart)}
      />
      <ParticleField count={25} accent={accent} frame={frame} w={w} h={h} seed={5} />
    </svg>
  )

  if (model === 'kinetic') return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${w} ${h}`}>
      <defs><filter id="softBlur"><feGaussianBlur stdDeviation="40" /></filter></defs>
      <ellipse cx={w * 0.5} cy={h * 0.5} rx={400} ry={400} fill={accent} opacity={0.05} filter="url(#softBlur)" />
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2
        const len = 200 + (i % 3) * 80
        const startR = 120
        const x1 = w / 2 + Math.cos(angle) * startR
        const y1 = h / 2 + Math.sin(angle) * startR
        const x2 = w / 2 + Math.cos(angle) * (startR + len)
        const y2 = h / 2 + Math.sin(angle) * (startR + len)
        const burst = lerp(frame % 60, [0, 8, 30], [0, 0.8, 0], E.outQuart)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth={1 + (i % 2)} opacity={burst * 0.4} />
      })}
      <DiagonalSlab x={-60} y={h * 0.15} w={w * 0.4} h={60} color={accent} angle={-10} opacity={0.12} frame={frame} startF={0} />
      <DiagonalSlab x={w * 0.6} y={h * 0.72} w={w * 0.5} h={50} color={secondary} angle={-10} opacity={0.10} frame={frame} startF={3} />
      <LineDraw x1={0} y1={0} x2={w * 0.35} y2={0} color={accent} frame={frame} startF={0} endF={10} width={4} opacity={0.9} />
      <LineDraw x1={0} y1={0} x2={0} y2={h * 0.25} color={accent} frame={frame} startF={2} endF={12} width={4} opacity={0.9} />
      <LineDraw x1={w} y1={h} x2={w * 0.65} y2={h} color={secondary} frame={frame} startF={1} endF={11} width={4} opacity={0.9} />
      <LineDraw x1={w} y1={h} x2={w} y2={h * 0.75} color={secondary} frame={frame} startF={3} endF={13} width={4} opacity={0.9} />
    </svg>
  )

  return null
}

// ─────────────────────────────────────────────────────────────
// PHOTO EFFECTS
// ─────────────────────────────────────────────────────────────

function PhotoParallaxZoom({ photo, frame, totalFrames, accent }) {
  const scale  = lerp(frame, [0, totalFrames], [1.0, 1.1], E.linear)
  const fadeIn = lerp(frame, [0, 18], [0, 1], E.outQuart)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <img src={photo} alt="" style={{
        width: '100%', height: '100%', objectFit: 'cover',
        transform: `scale(${scale})`, opacity: fadeIn,
        filter: 'brightness(0.75) contrast(1.05)', transformOrigin: 'center center',
      }} />
    </div>
  )
}

function PhotoBreatheFloat({ photo, frame, totalFrames, accent }) {
  const floatY = Math.sin(frame * 0.022) * 14
  const floatX = Math.cos(frame * 0.016) * 8
  const rot    = Math.sin(frame * 0.009) * 1.8
  const scale  = lerp(frame, [0, totalFrames], [1.0, 1.05], E.inOutSine)
  const fadeIn = lerp(frame, [0, 20], [0, 1], E.outQuart)
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <img src={photo} alt="" style={{
        width: '90%', height: '85%', objectFit: 'cover', borderRadius: 32,
        transform: `translateY(${floatY}px) translateX(${floatX}px) rotate(${rot}deg) scale(${scale})`,
        opacity: fadeIn, filter: 'brightness(0.82) saturate(1.1)',
        boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 60px ${accent}18`,
      }} />
    </div>
  )
}

function PhotoGlitchSplit({ photo, frame, totalFrames, accent, secondary }) {
  const glitch  = frame % 12 === 0 || frame % 19 === 0
  const rOffset = glitch ? (((frame * 7) % 10) - 5) : 0
  const gOffset = glitch ? (((frame * 3) % 6) - 3) : 0
  const scanY   = ((frame * 4.5) % 110)
  const fadeIn  = lerp(frame, [0, 14], [0, 1], E.outExpo)
  const scale   = lerp(frame, [0, 16], [1.06, 1.0], E.outQuart)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <img src={photo} alt="" style={{
        position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
        mixBlendMode: 'screen', opacity: 0.5 * fadeIn,
        transform: `translate(${rOffset}px, 0) scale(${scale})`,
        filter: 'saturate(0) brightness(1.4)',
      }} />
      <img src={photo} alt="" style={{
        position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
        mixBlendMode: 'screen', opacity: 0.5 * fadeIn,
        transform: `translate(${-rOffset}px, ${gOffset}px) scale(${scale})`,
        filter: 'saturate(0) brightness(1.4)',
      }} />
      <img src={photo} alt="" style={{
        position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
        opacity: fadeIn, transform: `scale(${scale})`,
        filter: 'brightness(0.65) saturate(0.6) contrast(1.1)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: `${scanY}%`, height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
        opacity: 0.7,
      }} />
    </div>
  )
}

function PhotoDiagonalSlice({ photo, frame, totalFrames, accent }) {
  const sliceReveal = lerp(frame, [0, 24], [0, 1], E.outExpo)
  const fadeIn      = lerp(frame, [0, 24], [0, 1], E.outQuart)
  const drift       = lerp(frame, [0, totalFrames], [-6, 6], E.linear)
  const cutX        = 42 + sliceReveal * 8
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, clipPath: `polygon(0 0, ${cutX}% 0, ${cutX - 8}% 100%, 0 100%)`, overflow: 'hidden' }}>
        <img src={photo} alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: fadeIn, filter: 'brightness(0.7) contrast(1.1) saturate(0.9)',
          transform: `translateX(${drift}px)`,
        }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, clipPath: `polygon(${cutX + 2}% 0, 100% 0, 100% 100%, ${cutX - 6}% 100%)`, overflow: 'hidden' }}>
        <img src={photo} alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: fadeIn * 0.85, filter: 'brightness(0.55) contrast(1.15) saturate(0.8)',
          transform: `translateX(${-drift}px)`,
        }} />
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: `polygon(${cutX}% 0, ${cutX + 1}% 0, ${cutX - 7}% 100%, ${cutX - 8}% 100%)`,
        background: accent, opacity: 0.8,
      }} />
    </div>
  )
}

function PhotoRevealMask({ photo, frame, totalFrames, accent }) {
  const revealH  = lerp(frame, [0, 36], [0, 100], E.outExpo)
  const scale    = lerp(frame, [0, totalFrames], [1.04, 1.0], E.linear)
  const shimmerX = lerp(frame, [20, totalFrames], [-100, 200], E.linear)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${100 - revealH}% 0 0 0)`, overflow: 'hidden' }}>
        <img src={photo} alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `scale(${scale})`, filter: 'brightness(0.8) contrast(1.05)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(105deg, transparent ${shimmerX - 20}%, rgba(255,220,100,0.12) ${shimmerX}%, rgba(255,220,100,0.22) ${shimmerX + 6}%, rgba(255,220,100,0.12) ${shimmerX + 12}%, transparent ${shimmerX + 32}%)`,
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  )
}

function PhotoPunchShake({ photo, frame, totalFrames, accent }) {
  const punchScale = lerpK(frame, [0, 6, 14, totalFrames], [1.2, 1.0, 1.02, 1.06], E.outQuint)
  const shakeX     = frame < 10 ? Math.sin(frame * 3.2) * 16 * lerp(frame, [0, 10], [1, 0]) : 0
  const shakeY     = frame < 10 ? Math.cos(frame * 2.8) * 10 * lerp(frame, [0, 10], [1, 0]) : 0
  const flashOp    = lerp(frame, [0, 2, 6], [0.9, 0.4, 0], E.outQuart)
  const contrast   = lerpK(frame, [0, 6, 20], [1.4, 1.2, 1.05], E.outQuart)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <img src={photo} alt="" style={{
        width: '100%', height: '100%', objectFit: 'cover',
        transform: `scale(${punchScale}) translate(${shakeX}px, ${shakeY}px)`,
        filter: `brightness(0.8) contrast(${contrast}) saturate(1.1)`,
      }} />
      {flashOp > 0 && <div style={{ position: 'absolute', inset: 0, background: accent, opacity: flashOp }} />}
    </div>
  )
}

function PhotoEffect({ effect, photo, frame, totalFrames, accent, secondary }) {
  if (!photo) return null
  if (effect === 'parallax-zoom')  return <PhotoParallaxZoom  photo={photo} frame={frame} totalFrames={totalFrames} accent={accent} />
  if (effect === 'breathe-float')  return <PhotoBreatheFloat  photo={photo} frame={frame} totalFrames={totalFrames} accent={accent} />
  if (effect === 'glitch-split')   return <PhotoGlitchSplit   photo={photo} frame={frame} totalFrames={totalFrames} accent={accent} secondary={secondary} />
  if (effect === 'diagonal-slice') return <PhotoDiagonalSlice photo={photo} frame={frame} totalFrames={totalFrames} accent={accent} />
  if (effect === 'reveal-mask')    return <PhotoRevealMask    photo={photo} frame={frame} totalFrames={totalFrames} accent={accent} />
  if (effect === 'punch-shake')    return <PhotoPunchShake    photo={photo} frame={frame} totalFrames={totalFrames} accent={accent} />
  return <PhotoParallaxZoom photo={photo} frame={frame} totalFrames={totalFrames} accent={accent} />
}

// ─────────────────────────────────────────────────────────────
// TRANSITION OVERLAYS
// ─────────────────────────────────────────────────────────────
function TransitionOverlay({ style, sceneFrame, totalFrames }) {
  if (style === 'flash-cut') {
    const op = lerp(sceneFrame, [0, 4], [0.85, 0], E.outQuart)
    return op > 0 ? <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: op, zIndex: 90 }} /> : null
  }
  if (style === 'scan-flash') {
    const op = lerp(sceneFrame, [0, 3], [0.7, 0], E.outQuart)
    return op > 0 ? <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #00f5ff, transparent)', opacity: op, zIndex: 90 }} /> : null
  }
  if (style === 'blade-wipe') {
    const exitWipe = sceneFrame > totalFrames - 14 ? lerp(sceneFrame, [totalFrames - 14, totalFrames], [0, 100], E.inExpo) : 0
    return exitWipe > 0 ? <div style={{ position: 'absolute', inset: 0, background: '#000', clipPath: `inset(0 0 0 ${exitWipe}%)`, zIndex: 90 }} /> : null
  }
  if (style === 'ink-bleed') {
    const op = lerp(sceneFrame, [0, 22], [0.6, 0], E.outQuart)
    return op > 0 ? <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9), transparent)', opacity: op, zIndex: 90 }} /> : null
  }
  if (style === 'gold-shimmer') {
    const op = lerp(sceneFrame, [0, 20], [0.5, 0], E.outQuart)
    return op > 0 ? <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(184,151,46,0.4), rgba(232,208,122,0.2))', opacity: op, zIndex: 90 }} /> : null
  }
  // crossfade
  const op = lerp(sceneFrame, [0, 14], [0.6, 0], E.outQuart)
  return op > 0 ? <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: op, zIndex: 90 }} /> : null
}

// ─────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────────

function WordCascade({ text, frame, font, weight, size, color, tracking, textCase, accent, startF = 8, wordDelay = 4 }) {
  if (!text) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: `0 ${Math.max(8, size * 0.18)}px`, lineHeight: 0.95 }}>
      {text.split(' ').map((word, i) => {
        const t  = Math.max(0, frame - startF - i * wordDelay)
        const y  = lerp(t, [0, 20], [size * 1.2, 0], E.outBack)
        const op = lerp(t, [0, 14], [0, 1], E.outQuart)
        const sc = lerp(t, [0, 16], [0.88, 1], E.outBack)
        return (
          <div key={i} style={{ overflow: 'hidden', paddingBottom: size * 0.18 }}>
            <div style={{
              transform: `translateY(${y}px) scale(${sc})`,
              opacity: op,
              fontFamily: font, fontWeight: weight, fontSize: size,
              letterSpacing: tracking, textTransform: textCase,
              color: i === 0 ? accent : color,
              lineHeight: 0.95, display: 'block',
            }}>
              {word}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CharReveal({ text, frame, font, size, color, tracking = '0.06em', startF = 16, charDelay = 1.8 }) {
  if (!text) return null
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
      {text.split('').map((ch, i) => {
        const op = lerp(frame, [startF + i * charDelay, startF + i * charDelay + 10], [0, 1], E.outQuart)
        const y  = lerp(frame, [startF + i * charDelay, startF + i * charDelay + 10], [10, 0], E.outQuart)
        return (
          <span key={i} style={{
            opacity: op, transform: `translateY(${y}px)`, display: 'inline-block',
            fontFamily: font, fontSize: size, color, letterSpacing: tracking,
            whiteSpace: ch === ' ' ? 'pre' : 'normal',
          }}>
            {ch}
          </span>
        )
      })}
    </div>
  )
}

function StampReveal({ text, frame, font, size, color, accent, tracking, textCase, startF = 0 }) {
  if (!text) return null
  const t     = Math.max(0, frame - startF)
  const scale = lerp(t, [0, 10, 16], [1.8, 0.96, 1.0], E.outBack)
  const op    = lerp(t, [0, 4], [0, 1], E.outQuart)
  const blur  = lerp(t, [0, 10], [8, 0], E.outQuart)
  return (
    <div style={{
      fontFamily: font, fontWeight: 900, fontSize: size,
      letterSpacing: tracking, textTransform: textCase,
      color, transform: `scale(${scale})`, opacity: op,
      filter: `blur(${blur}px)`,
      textShadow: `0 0 60px ${accent}44, 4px 4px 0 rgba(0,0,0,0.5)`,
      lineHeight: 0.88,
    }}>
      {text}
    </div>
  )
}

function GlitchType({ text, frame, font, size, color, accent, secondary, tracking, textCase, startF = 6 }) {
  if (!text) return null
  const t       = Math.max(0, frame - startF)
  const baseOp  = lerp(t, [0, 12], [0, 1], E.outExpo)
  const glitch  = frame % 14 === 0
  const rX      = glitch ? (((frame * 7) % 8) - 4) : 0
  const bX      = glitch ? (((frame * 3) % 6) - 3) : 0
  const s = { fontFamily: font, fontWeight: 700, fontSize: size, letterSpacing: tracking, textTransform: textCase, lineHeight: 0.92 }
  return (
    <div style={{ position: 'relative', display: 'inline-block', opacity: baseOp }}>
      <div style={{ ...s, position: 'absolute', color: accent, mixBlendMode: 'screen', opacity: 0.7, transform: `translate(${rX}px, 0)`, textShadow: `0 0 20px ${accent}` }}>{text}</div>
      <div style={{ ...s, position: 'absolute', color: secondary, mixBlendMode: 'screen', opacity: 0.7, transform: `translate(${bX}px, 2px)`, textShadow: `0 0 20px ${secondary}` }}>{text}</div>
      <div style={{ ...s, color, textShadow: `0 0 30px ${accent}66` }}>{text}</div>
    </div>
  )
}

function TitleText({ model, text, frame, cfg }) {
  if (!text) return null
  if (model === 'kinetic') return <StampReveal text={text} frame={frame} font={cfg.titleFont} size={cfg.titleSize} color={cfg.titleColor} accent={cfg.accent} tracking={cfg.tracking} textCase={cfg.textCase} startF={2} />
  if (model === 'neon')    return <GlitchType  text={text} frame={frame} font={cfg.titleFont} size={cfg.titleSize} color={cfg.titleColor} accent={cfg.accent} secondary={cfg.secondary} tracking={cfg.tracking} textCase={cfg.textCase} startF={6} />
  return (
    <WordCascade text={text} frame={frame} font={cfg.titleFont} weight={cfg.titleWeight}
      size={cfg.titleSize} color={cfg.titleColor} tracking={cfg.tracking}
      textCase={cfg.textCase} accent={cfg.accent} startF={8} wordDelay={model === 'luxury' ? 6 : 4}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// OVERLAYS
// ─────────────────────────────────────────────────────────────
function Overlays({ overlays, accent, frame }) {
  return (
    <>
      {overlays.includes('grain') && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none', opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '160px 160px',
        }} />
      )}
      {overlays.includes('vignette') && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 75, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.72) 100%)',
        }} />
      )}
      {overlays.includes('letterbox') && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 52, background: '#000', zIndex: 78, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 52, background: '#000', zIndex: 78, pointerEvents: 'none' }} />
        </>
      )}
      {overlays.includes('scanlines') && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 76, pointerEvents: 'none',
          opacity: 0.1 * (0.9 + Math.sin(frame * 0.4) * 0.1),
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)',
        }} />
      )}
      {overlays.includes('chromaShift') && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 77, pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, transparent 50%, ${accent}0A 80%, rgba(255,45,138,0.06) 100%)`,
        }} />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// MODEL-SPECIFIC CHROME ACCENTS
// ─────────────────────────────────────────────────────────────
function AccentChrome({ model, frame, cfg, sceneIndex, totalScenes }) {
  const accent = cfg.accent
  const lineW  = lerp(frame, [12, 30], [0, 56], E.outExpo)
  const badgeOp = lerp(frame, [14, 28], [0, 1], E.outQuart)

  if (model === 'luxury') return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 55, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: 58, left: 56, height: 1, width: lineW, background: `linear-gradient(90deg, ${accent}, transparent)`, opacity: 0.7 }} />
      <div style={{ position: 'absolute', top: 68, right: 56, fontFamily: cfg.titleFont, fontSize: 11, letterSpacing: '0.3em', color: accent, opacity: badgeOp, textTransform: 'uppercase' }}>
        {String(sceneIndex + 1).padStart(2, '0')} / {String(totalScenes).padStart(2, '0')}
      </div>
    </div>
  )
  if (model === 'editorial') return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 55, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: lerp(frame, [0, 12], [0, 6], E.outExpo), background: accent }} />
      <div style={{ position: 'absolute', top: 20, right: 56, fontFamily: cfg.titleFont, fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', opacity: badgeOp, textTransform: 'uppercase' }}>
        Vol. {String(sceneIndex + 1).padStart(2, '0')}
      </div>
    </div>
  )
  if (model === 'neon') return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 55, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: 68, left: 56, height: 2, width: lineW, background: accent, boxShadow: `0 0 10px ${accent}`, opacity: 0.9 }} />
      <div style={{ position: 'absolute', top: 28, left: 56, fontFamily: cfg.titleFont, fontSize: 10, letterSpacing: '0.22em', color: accent, opacity: badgeOp, textShadow: `0 0 8px ${accent}`, textTransform: 'uppercase' }}>
        SYS_{String(sceneIndex + 1).padStart(3, '0')}
      </div>
    </div>
  )
  if (model === 'cinematic') return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 55, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: 60, left: 56, height: 1, width: lineW, background: `linear-gradient(90deg, ${accent}, transparent)`, opacity: 0.6 }} />
      <div style={{ position: 'absolute', top: 68, left: 56, fontFamily: cfg.titleFont, fontSize: 10, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.28)', opacity: badgeOp, textTransform: 'uppercase' }}>
        Chapter {sceneIndex + 1}
      </div>
    </div>
  )
  if (model === 'organic') return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 55, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: 64, left: 56, height: 1.5, width: lineW, background: accent, borderRadius: 99, opacity: 0.5 }} />
    </div>
  )
  return null
}

// ─────────────────────────────────────────────────────────────
// CLOSING SCENE DOTS
// ─────────────────────────────────────────────────────────────
function ClosingDots({ frame, accent, totalScenes }) {
  const op  = lerp(frame, [18, 34], [0, 1], E.outQuart)
  const y   = lerp(frame, [18, 34], [16, 0], E.outBack)
  return (
    <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, zIndex: 60, display: 'flex', justifyContent: 'center', gap: 8, opacity: op, transform: `translateY(${y}px)`, pointerEvents: 'none' }}>
      {Array.from({ length: Math.min(totalScenes, 6) }, (_, i) => (
        <div key={i} style={{
          width: i === totalScenes - 1 ? 28 : 7, height: 7, borderRadius: 99,
          background: i === totalScenes - 1 ? accent : 'rgba(255,255,255,0.25)',
          boxShadow: i === totalScenes - 1 ? `0 0 10px ${accent}88` : 'none',
        }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// OVERLAY GRADIENT MAP
// ─────────────────────────────────────────────────────────────
const OVERLAY_MAP = {
  dark:    'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.12) 70%, transparent 100%)',
  luxury:  'linear-gradient(to top, rgba(5,3,9,0.97) 0%, rgba(13,10,24,0.55) 38%, transparent 75%)',
  warm:    'linear-gradient(to top, rgba(28,14,5,0.94) 0%, rgba(50,25,8,0.4) 45%, transparent 90%)',
  neon:    'linear-gradient(to top, rgba(0,5,16,0.97) 0%, rgba(13,0,26,0.65) 42%, transparent 90%)',
  none:    'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)',
}

// ─────────────────────────────────────────────────────────────
// SINGLE SCENE RENDERER
// ─────────────────────────────────────────────────────────────
function SceneRenderer({ scene, photos, cfg, model, sceneFrame, totalSceneFrames, sceneIndex, totalScenes }) {
  const photo       = photos[scene.photoIndex ?? 0] || photos[0] || null
  const accent      = scene.accent || cfg.accent
  const overlayGrad = OVERLAY_MAP[scene.overlay] || OVERLAY_MAP.dark
  const textPos     = scene.textPosition || 'bottom-left'
  const isClosing   = scene.type === 'closing'

  // Blurred BG drift
  const bgDriftX = Math.sin(sceneFrame * 0.014) * 12
  const bgDriftY = Math.cos(sceneFrame * 0.011) * 8

  const textPosStyle =
    textPos === 'center'
      ? { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 52px' }
      : textPos === 'top-center'
      ? { position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center', padding: '80px 52px 0' }
      : { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 56px 68px', zIndex: 50 }

  return (
    <AbsoluteFill>
      {/* Base BG */}
      <AbsoluteFill style={{ background: cfg.bg }} />

      {/* Ambient blurred photo */}
      {photo && (
        <AbsoluteFill style={{
          transform: `translate(${bgDriftX}px, ${bgDriftY}px) scale(1.12)`,
          opacity: 0.3, filter: 'blur(48px) saturate(0.7)',
        }}>
          <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}

      {/* Shape set */}
      <AbsoluteFill style={{ zIndex: 10 }}>
        <ShapeSet model={cfg.shapeSet} frame={sceneFrame} accent={accent} secondary={cfg.secondary} tertiary={cfg.tertiary} w={1080} h={1920} />
      </AbsoluteFill>

      {/* Photo effect */}
      <AbsoluteFill style={{ zIndex: 20 }}>
        <PhotoEffect effect={cfg.photoEffect} photo={photo} frame={sceneFrame} totalFrames={totalSceneFrames} accent={accent} secondary={cfg.secondary} />
      </AbsoluteFill>

      {/* Overlay gradient */}
      <AbsoluteFill style={{ zIndex: 30, background: overlayGrad, pointerEvents: 'none' }} />

      {/* Model chrome */}
      <AccentChrome model={model} frame={sceneFrame} cfg={{ ...cfg, accent }} sceneIndex={sceneIndex} totalScenes={totalScenes} />

      {/* Text */}
      <div style={{ ...textPosStyle, zIndex: 50 }}>
        <TitleText model={model} text={scene.title} frame={sceneFrame} cfg={{ ...cfg, accent }} />

        {scene.subtitle && (
          <div style={{ marginTop: 18, maxWidth: 560 }}>
            {model === 'neon' ? (
              <CharReveal text={scene.subtitle} frame={sceneFrame} font={cfg.titleFont} size={18} color={`${accent}CC`} tracking="0.14em" startF={18} />
            ) : model === 'luxury' ? (
              <CharReveal text={scene.subtitle} frame={sceneFrame} font={cfg.titleFont} size={19} color="rgba(255,255,255,0.55)" tracking="0.22em" startF={22} charDelay={2.2} />
            ) : (
              <div style={{
                opacity: lerp(sceneFrame, [16, 32], [0, 1], E.outQuart),
                transform: `translateY(${lerp(sceneFrame, [16, 32], [14, 0], E.outQuart)}px)`,
                fontFamily: cfg.titleFont,
                fontSize: model === 'kinetic' ? 22 : 18,
                fontWeight: model === 'luxury' ? 200 : model === 'editorial' ? 700 : 400,
                letterSpacing: model === 'cinematic' ? '0.08em' : '0.04em',
                color: 'rgba(255,255,255,0.58)', lineHeight: 1.5,
                textTransform: model === 'editorial' ? 'uppercase' : 'none',
              }}>
                {scene.subtitle}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Closing dots */}
      {isClosing && <ClosingDots frame={sceneFrame} accent={accent} totalScenes={totalScenes} />}

      {/* Transition overlay */}
      <AbsoluteFill style={{ zIndex: 88 }}>
        <TransitionOverlay style={cfg.transitionStyle} sceneFrame={sceneFrame} totalFrames={totalSceneFrames} />
      </AbsoluteFill>

      {/* Post-processing overlays */}
      <Overlays overlays={cfg.overlays} accent={accent} frame={sceneFrame} />
    </AbsoluteFill>
  )
}

// ─────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────
export default function StoryComposition({
  motionModel = 'cinematic',
  accentColor,
  scenes = [],
  photos = [],
  title = 'Your Story',
  logline = 'A cinematic moment',
  totalFrames,
  fps = 30,
  format = 'story',
}) {
  const frame = useCurrentFrame()
  const cfg   = { ...MODELS[motionModel] || MODELS.cinematic }
  if (accentColor) cfg.accent = accentColor

  // Cumulative scene offsets
  const offsets = []
  let off = 0
  for (const s of scenes) { offsets.push(off); off += s.durationFrames || 60 }

  const totalScenes = scenes.length

  // No-scenes fallback
  if (totalScenes === 0) {
    const photo = photos[0] || null
    return (
      <AbsoluteFill style={{ background: cfg.bg, overflow: 'hidden' }}>
        {photo && (
          <AbsoluteFill style={{ opacity: 0.6, filter: 'blur(30px)' }}>
            <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </AbsoluteFill>
        )}
        <AbsoluteFill style={{ background: OVERLAY_MAP.dark }} />
        <AbsoluteFill style={{ display: 'flex', alignItems: 'flex-end', padding: '0 56px 80px' }}>
          <div>
            <WordCascade text={title} frame={frame} font={cfg.titleFont} weight={cfg.titleWeight}
              size={cfg.titleSize} color={cfg.titleColor} tracking={cfg.tracking}
              textCase={cfg.textCase} accent={cfg.accent} startF={8} />
            {logline && (
              <div style={{
                marginTop: 16, fontFamily: cfg.titleFont, fontSize: 20,
                color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em',
                opacity: lerp(frame, [20, 38], [0, 1], E.outQuart),
              }}>{logline}</div>
            )}
          </div>
        </AbsoluteFill>
        <Overlays overlays={cfg.overlays} accent={cfg.accent} frame={frame} />
      </AbsoluteFill>
    )
  }

  return (
    <AbsoluteFill style={{ background: cfg.bg, overflow: 'hidden' }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={offsets[i]} durationInFrames={scene.durationFrames || 60} layout="none">
          <SceneRenderer
            scene={scene} photos={photos} cfg={cfg} model={motionModel}
            sceneFrame={Math.max(0, frame - offsets[i])}
            totalSceneFrames={scene.durationFrames || 60}
            sceneIndex={i} totalScenes={totalScenes}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}