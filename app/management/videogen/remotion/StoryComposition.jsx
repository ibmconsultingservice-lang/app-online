'use client'

/**
 * StoryComposition.jsx
 *
 * ULTRA PREMIUM MOTION SYSTEM
 * Inspired by:
 * - Modern Luxury Flyers
 * - Apple Event Motion
 * - Nike Campaign Motion
 * - Spotify Wrapped
 * - Mostory
 * - Figma UI Motion
 * - After Effects Posters
 * - Kinetic Graphic Design
 *
 * OBJECTIVE:
 * NO ticker
 * NO cheap banner
 * NO old school overlays
 *
 * ONLY:
 * - fluid graphic forms
 * - modern flyer motion
 * - floating composition
 * - dynamic side elements
 * - cinematic transitions
 * - luxury advertising presentation
 */

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

// ─────────────────────────────────────────────
// EASINGS
// ─────────────────────────────────────────────

const easeOutExpo = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t)

const easeOutQuart = (t) =>
  1 - Math.pow(1 - t, 4)

const lerp = (
  frame,
  [f0, f1],
  [v0, v1],
  easing = easeOutQuart
) =>
  interpolate(frame, [f0, f1], [v0, v1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  })

// ─────────────────────────────────────────────
// THEMES
// ─────────────────────────────────────────────

const THEMES = {
  hyper: {
    bg: '#05010A',
    accent: '#8B5CF6',
    secondary: '#06B6D4',
    tertiary: '#EC4899',
    text: '#ffffff',
  },

  chrome: {
    bg: '#050505',
    accent: '#ffffff',
    secondary: '#777777',
    tertiary: '#d4d4d4',
    text: '#ffffff',
  },

  toxic: {
    bg: '#020617',
    accent: '#00FFA3',
    secondary: '#00D9FF',
    tertiary: '#7C3AED',
    text: '#ffffff',
  },
}

// ─────────────────────────────────────────────
// PREMIUM FLYER SHAPES
// ─────────────────────────────────────────────

function FloatingShapes({
  frame,
  accent,
  secondary,
  tertiary,
}) {
  const rotate1 = frame * 0.25
  const rotate2 = -frame * 0.18

  const floatY1 = Math.sin(frame * 0.018) * 40
  const floatY2 = Math.cos(frame * 0.024) * 30

  return (
    <>
      {/* BIG TOP RIGHT GLOW */}
      <div
        style={{
          position: 'absolute',
          top: -220,
          right: -160,
          width: 620,
          height: 620,
          borderRadius: '50%',
          background: accent,
          opacity: 0.12,
          filter: 'blur(120px)',
          transform: `translateY(${floatY1}px)`,
        }}
      />

      {/* SIDE LIGHT */}
      <div
        style={{
          position: 'absolute',
          bottom: -200,
          left: -140,
          width: 540,
          height: 540,
          borderRadius: '50%',
          background: tertiary,
          opacity: 0.1,
          filter: 'blur(100px)',
          transform: `translateY(${floatY2}px)`,
        }}
      />

      {/* MODERN OUTLINE CIRCLE */}
      <div
        style={{
          position: 'absolute',
          top: '14%',
          right: '8%',
          width: 160,
          height: 160,
          borderRadius: '50%',
          border: `2px solid ${accent}55`,
          transform: `
            rotate(${rotate1}deg)
            translateY(${floatY1 * 0.4}px)
          `,
          boxShadow: `0 0 60px ${accent}22`,
        }}
      />

      {/* SMALL GEOMETRIC SHAPE */}
      <div
        style={{
          position: 'absolute',
          left: '6%',
          top: '18%',
          width: 70,
          height: 70,
          borderRadius: 24,
          border: `2px solid ${secondary}88`,
          transform: `
            rotate(${rotate2}deg)
            translateY(${floatY2 * 0.5}px)
          `,
          backdropFilter: 'blur(10px)',
        }}
      />

      {/* LONG FLYER BAR */}
      <div
        style={{
          position: 'absolute',
          right: -120,
          top: '46%',
          width: 320,
          height: 2,
          background: `
            linear-gradient(
              90deg,
              transparent,
              ${accent},
              transparent
            )
          `,
          transform: `rotate(-24deg)`,
          opacity: 0.5,
        }}
      />

      {/* FLOATING GLASS PANEL */}
      <div
        style={{
          position: 'absolute',
          bottom: 90,
          right: 40,
          width: 180,
          height: 120,
          borderRadius: 32,
          background: 'rgba(255,255,255,.04)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,.08)',
          transform: `
            translateY(${floatY1 * 0.25}px)
            rotate(-8deg)
          `,
          boxShadow:
            '0 20px 60px rgba(0,0,0,.35)',
        }}
      />
    </>
  )
}

// ─────────────────────────────────────────────
// DYNAMIC TYPOGRAPHY
// ─────────────────────────────────────────────

function PremiumTypography({
  title,
  subtitle,
  frame,
  accent,
}) {
  const { fps } = useVideoConfig()

  const words = title.split(' ')

  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        bottom: 80,
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0 18px',
          lineHeight: 0.92,
          maxWidth: 920,
        }}
      >
        {words.map((word, i) => {
          const s = spring({
            frame: frame - i * 2,
            fps,
            config: {
              damping: 16,
              stiffness: 120,
              mass: 0.8,
            },
          })

          const y = interpolate(s, [0, 1], [120, 0])

          const opacity = interpolate(
            s,
            [0, 0.2, 1],
            [0, 0, 1]
          )

          const scale = interpolate(
            s,
            [0, 1],
            [0.85, 1]
          )

          return (
            <div
              key={i}
              style={{
                overflow: 'hidden',
                paddingBottom: 20,
              }}
            >
              <div
                style={{
                  transform: `
                    translateY(${y}px)
                    scale(${scale})
                  `,
                  opacity,

                  fontFamily:
                    '"Clash Display","Satoshi","Inter",sans-serif',

                  fontWeight: 900,
                  fontSize: 86,
                  letterSpacing: '-0.06em',
                  textTransform: 'uppercase',

                  color:
                    i % 3 === 0
                      ? accent
                      : '#ffffff',

                  textShadow:
                    i % 3 === 0
                      ? `0 0 40px ${accent}33`
                      : 'none',
                }}
              >
                {word}
              </div>
            </div>
          )
        })}
      </div>

      {subtitle && (
        <div
          style={{
            marginTop: 24,

            fontFamily:
              '"Satoshi","Inter",sans-serif',

            fontSize: 22,
            lineHeight: 1.5,
            fontWeight: 500,

            color: 'rgba(255,255,255,.62)',

            maxWidth: 620,

            opacity: lerp(
              frame,
              [16, 34],
              [0, 1]
            ),

            transform: `
              translateY(
                ${lerp(frame, [16, 34], [20, 0])}px
              )
            `,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// DYNAMIC SIDE TRANSITIONS
// ─────────────────────────────────────────────

function SideTransitionShapes({
  frame,
  accent,
}) {
  const leftWipe = lerp(
    frame % 180,
    [0, 40],
    [-400, 0]
  )

  const rightWipe = lerp(
    frame % 220,
    [0, 40],
    [400, 0]
  )

  return (
    <>
      {/* LEFT SHAPE */}
      <div
        style={{
          position: 'absolute',
          left: leftWipe,
          top: '32%',
          width: 260,
          height: 500,

          background: `
            linear-gradient(
              180deg,
              ${accent}55,
              transparent
            )
          `,

          clipPath:
            'polygon(0 0,100% 8%,70% 100%,0 100%)',

          filter: 'blur(8px)',

          opacity: 0.4,
        }}
      />

      {/* RIGHT SHAPE */}
      <div
        style={{
          position: 'absolute',
          right: rightWipe,
          bottom: '10%',
          width: 240,
          height: 440,

          background: `
            linear-gradient(
              180deg,
              transparent,
              ${accent}66
            )
          `,

          clipPath:
            'polygon(20% 0,100% 0,100% 100%,0 88%)',

          filter: 'blur(8px)',

          opacity: 0.35,
        }}
      />
    </>
  )
}

// ─────────────────────────────────────────────
// MAIN VISUAL
// ─────────────────────────────────────────────

function FloatingVisual({
  photo,
  frame,
  accent,
}) {
  const floatY =
    Math.sin(frame * 0.022) * 14

  const floatX =
    Math.cos(frame * 0.017) * 8

  const rotate =
    Math.sin(frame * 0.008) * 2

  const scale = lerp(
    frame,
    [0, 240],
    [0.94, 1]
  )

  return (
    <div
      style={{
        position: 'absolute',
        top: '12%',
        left: '50%',

        width: '72%',
        height: '52%',

        transform: `
          translateX(-50%)
          translateY(${floatY}px)
          translateX(${floatX}px)
          rotate(${rotate}deg)
          scale(${scale})
        `,

        borderRadius: 42,

        overflow: 'hidden',

        boxShadow: `
          0 40px 120px rgba(0,0,0,.65),
          0 0 80px ${accent}22
        `,

        zIndex: 30,
      }}
    >
      {/* IMAGE */}
      <img
        src={photo}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',

          transform: `
            scale(1.08)
            translateY(${floatY * -0.2}px)
          `,

          filter: `
            brightness(.92)
            saturate(1.08)
            contrast(1.04)
          `,
        }}
      />

      {/* DEPTH OVERLAY */}
      <div
        style={{
          position: 'absolute',
          inset: 0,

          background: `
            linear-gradient(
              to top,
              rgba(0,0,0,.78),
              rgba(0,0,0,.08)
            )
          `,
        }}
      />

      {/* LIGHT REFLECTION */}
      <div
        style={{
          position: 'absolute',
          top: -140,
          right: -120,

          width: 420,
          height: 420,

          borderRadius: '50%',

          background:
            'rgba(255,255,255,.18)',

          filter: 'blur(80px)',

          opacity: 0.25,
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPOSITION
// ─────────────────────────────────────────────

export default function StoryComposition({
  motionModel = 'hyper',
  accentColor,
  scenes = [],
  photos = [],
  title = 'FUTURE DROP',
  logline = 'Luxury Motion Design',
}) {
  const frame = useCurrentFrame()

  const cfg =
    THEMES[motionModel] ||
    THEMES.hyper

  if (accentColor)
    cfg.accent = accentColor

  const currentScene =
    scenes[
      Math.floor(frame / 120)
    ] || scenes[0]

  const activeTitle =
    currentScene?.title || title

  const activeSubtitle =
    currentScene?.subtitle || logline

  const activePhoto =
    photos[
      currentScene?.photoIndex || 0
    ] || photos[0]

  // GLOBAL BACKGROUND MOTION
  const bgScale = lerp(
    frame,
    [0, 400],
    [1, 1.12]
  )

  return (
    <AbsoluteFill
      style={{
        background: cfg.bg,
        overflow: 'hidden',
      }}
    >
      {/* BACKGROUND IMAGE */}
      {activePhoto && (
        <AbsoluteFill
          style={{
            transform: `scale(${bgScale})`,
            opacity: 0.35,
            filter: 'blur(50px)',
          }}
        >
          <img
            src={activePhoto}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      )}

      {/* PREMIUM SHAPES */}
      <FloatingShapes
        frame={frame}
        accent={cfg.accent}
        secondary={cfg.secondary}
        tertiary={cfg.tertiary}
      />

      {/* SIDE TRANSITIONS */}
      <SideTransitionShapes
        frame={frame}
        accent={cfg.accent}
      />

      {/* MAIN VISUAL */}
      {activePhoto && (
        <FloatingVisual
          photo={activePhoto}
          frame={frame}
          accent={cfg.accent}
        />
      )}

      {/* TYPO */}
      <PremiumTypography
        title={activeTitle}
        subtitle={activeSubtitle}
        frame={frame}
        accent={cfg.accent}
      />

      {/* GRAIN */}
      <AbsoluteFill
        style={{
          opacity: 0.025,

          backgroundImage: `
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")
          `,

          pointerEvents: 'none',

          zIndex: 999,
        }}
      />
    </AbsoluteFill>
  )
}