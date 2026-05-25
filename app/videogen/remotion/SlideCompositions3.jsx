/**
 * remotion/SlideCompositions.jsx  — NOVA SYSTEM
 *
 * Aesthetic direction: "Architectural Brutalism meets Swiss Editorial"
 *   — Razor-sharp grid lines, oversized counter-weights, disciplined type
 *   — Unexpected negative space punctured by geometric ink marks
 *   — Motion language: hard cuts + elastic overshoots, NO soft fades
 *   — Accent colours are weapons, not decoration
 *
 * SLIDE TYPES
 *   cover | agenda | section | bullets | stats
 *   quote | comparison | timeline | content | cta | team | title
 */

import {
  AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig,
  interpolate, spring, Img,
} from 'remotion'

// ─── Easing arsenal ──────────────────────────────────────────
const expo   = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
const back   = (t, s = 1.8) => { const c3 = s + 1; return c3 * t * t * t - s * t * t }
const backOut = t => { const c1 = 1.8, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
const clamp  = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const p      = (frame, start, dur, ease = expo) => ease(clamp((frame - start) / dur, 0, 1))

// ─── Themes ─────────────────────────────────────────────────
const THEMES = {
  obsidian:  { bg: '#0a0a12', paper: '#0f0f1a', accent: '#c9a84c', text: '#f5f0e8', sub: 'rgba(245,240,232,0.45)', ink: '#c9a84c', dark: true  },
  aurora:    { bg: '#070412', paper: '#0d0920', accent: '#a78bfa', text: '#f0ebff', sub: 'rgba(240,235,255,0.40)', ink: '#a78bfa', dark: true  },
  editorial: { bg: '#f2efe8', paper: '#fafaf8', accent: '#e8321a', text: '#0f0f0f', sub: 'rgba(15,15,15,0.42)',   ink: '#0f0f0f', dark: false },
  crimson:   { bg: '#0a0305', paper: '#130308', accent: '#ff3347', text: '#fff0f0', sub: 'rgba(255,240,240,0.42)', ink: '#ff3347', dark: true  },
  arctic:    { bg: '#010d1c', paper: '#031428', accent: '#22d3ee', text: '#e0f8ff', sub: 'rgba(224,248,255,0.40)', ink: '#22d3ee', dark: true  },
  forest:    { bg: '#02100a', paper: '#041a0e', accent: '#4ade80', text: '#edfff4', sub: 'rgba(237,255,244,0.40)', ink: '#4ade80', dark: true  },
}

// ─── Grain overlay ───────────────────────────────────────────
const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`

// ─── Hard cut transition (no fades — only frame 0 & last 4) ──
function HardCut({ frame, total }) {
  const opacity = frame < 2 ? 1 - frame / 2 : frame > total - 3 ? (frame - (total - 3)) / 3 : 0
  if (opacity <= 0) return null
  return <AbsoluteFill style={{ background: '#000', opacity, pointerEvents: 'none' }} />
}

// ─── Noise texture ───────────────────────────────────────────
function Grain({ opacity = 0.035 }) {
  return <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat', opacity, pointerEvents: 'none', mixBlendMode: 'overlay' }} />
}

// ─── Pexels background — STILL (no ken-burns, brutalism is still) ─
function StillBg({ url, themeBg, overlay = 'dark' }) {
  const overlays = {
    dark:    'rgba(0,0,0,0.70)',
    deeper:  'rgba(0,0,0,0.84)',
    split:   'linear-gradient(105deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.92) 48%,rgba(0,0,0,.45) 48%)',
    tinted:  null, // handled per-slide
    light:   'rgba(242,239,232,0.88)',
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: themeBg }}>
      {url && <Img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <AbsoluteFill style={{ background: overlays[overlay] || overlays.dark }} />
      <Grain />
    </AbsoluteFill>
  )
}

// ─── Grid scaffold — the "architectural" base ────────────────
function GridLines({ frame, accent, horizontal = 1, vertical = 1, opacity = 0.07 }) {
  const show = p(frame, 0, 12)
  return (
    <AbsoluteFill style={{ opacity: show * opacity, pointerEvents: 'none' }}>
      {/* Rule of thirds */}
      {[33.3, 66.6].map(pct => (
        <div key={pct} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, width: 1, background: accent }} />
      ))}
      {[33.3, 66.6].map(pct => (
        <div key={pct} style={{ position: 'absolute', top: `${pct}%`, left: 0, right: 0, height: 1, background: accent }} />
      ))}
    </AbsoluteFill>
  )
}

// ─── Slide number — top-right, monospace small ───────────────
function Index({ n, total, accent, dark }) {
  return (
    <div style={{
      position: 'absolute', top: 36, right: 52,
      display: 'flex', alignItems: 'center', gap: 8, zIndex: 20,
      fontFamily: "'Courier New',monospace",
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '.18em' }}>
        {String(n).padStart(2,'0')}
      </span>
      <div style={{ width: 28, height: 1, background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} />
      <span style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', letterSpacing: '.1em' }}>
        {String(total).padStart(2,'0')}
      </span>
    </div>
  )
}

// ─── Category tag ────────────────────────────────────────────
function Tag({ text, frame, start, accent, dark }) {
  const progress = p(frame, start, 14)
  if (!text) return null
  return (
    <div style={{
      display: 'inline-block', marginBottom: 18,
      fontSize: 9, fontWeight: 700, letterSpacing: '.32em',
      textTransform: 'uppercase', color: accent,
      fontFamily: "'Courier New',monospace",
      opacity: progress,
      transform: `translateX(${(1 - progress) * -20}px)`,
      borderLeft: `2px solid ${accent}`,
      paddingLeft: 10,
    }}>{text}</div>
  )
}

// ─── Headline — characters animate via clip ──────────────────
function Headline({
  text = '', frame, start, size = 80,
  color = '#fff', weight = 900,
  serif = true, spacing = -3,
  maxWidth = '100%', lineH = .96,
}) {
  const words = text.split(' ')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '0.18em', rowGap: 0, maxWidth }}>
      {words.map((w, i) => {
        const progress = p(frame, start + i * 5, 18, backOut)
        return (
          <span key={i} style={{
            display: 'inline-block', overflow: 'hidden',
            fontSize: size, fontWeight: weight,
            color, letterSpacing: spacing,
            lineHeight: lineH,
            fontFamily: serif
              ? "'Cormorant Garamond','Playfair Display','Georgia',serif"
              : "'DM Sans',system-ui,sans-serif",
            transform: `translateY(${(1 - progress) * 110}%)`,
            opacity: progress > 0 ? 1 : 0,
          }}>{w}</span>
        )
      })}
    </div>
  )
}

// ─── Body text ───────────────────────────────────────────────
function Body({ text = '', frame, start, size = 18, color, style = {} }) {
  const progress = p(frame, start, 22)
  return (
    <div style={{
      fontSize: size, color: color || 'rgba(255,255,255,.55)',
      opacity: progress, transform: `translateY(${(1 - progress) * 22}px)`,
      fontFamily: "'DM Sans',system-ui,sans-serif",
      fontWeight: 400, lineHeight: 1.7, letterSpacing: '.01em',
      ...style,
    }}>{text}</div>
  )
}

// ─── Ruled line (animated) ───────────────────────────────────
function Rule({ frame, start, accent, width = 80, vertical = false }) {
  const progress = p(frame, start, 22)
  if (vertical) {
    return (
      <div style={{
        width: 2, height: width * progress,
        background: `linear-gradient(to bottom, ${accent}, ${accent}44)`,
        marginBottom: 28, flexShrink: 0,
        boxShadow: `0 0 12px ${accent}60`,
      }} />
    )
  }
  return (
    <div style={{
      width: width * progress, height: 2,
      background: `linear-gradient(to right, ${accent}, ${accent}44)`,
      marginBottom: 28,
      boxShadow: `0 0 12px ${accent}60`,
    }} />
  )
}

// ─── Ink mark — decorative geometric ─────────────────────────
function InkMark({ frame, accent, x, y, size = 120, type = 'cross', opacity = 0.1 }) {
  const progress = p(frame, 0, 30)
  if (type === 'cross') {
    return (
      <div style={{ position: 'absolute', left: x, top: y, opacity: opacity * progress, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: size/2 - 1, top: 0, width: 2, height: size, background: accent }} />
        <div style={{ position: 'absolute', left: 0, top: size/2 - 1, width: size, height: 2, background: accent }} />
      </div>
    )
  }
  if (type === 'corner') {
    return (
      <div style={{ position: 'absolute', left: x, top: y, opacity: opacity * progress, pointerEvents: 'none', width: size, height: size }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: size * 0.35, height: 2, background: accent }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: 2, height: size * 0.35, background: accent }} />
      </div>
    )
  }
  if (type === 'circle') {
    return (
      <div style={{
        position: 'absolute', left: x, top: y, opacity: opacity * progress, pointerEvents: 'none',
        width: size, height: size, borderRadius: '50%',
        border: `1.5px solid ${accent}`,
      }} />
    )
  }
  return null
}

// ─── Logo watermark ───────────────────────────────────────────
function Logo({ url, dark }) {
  if (!url) return null
  return (
    <img src={url} alt="logo" style={{
      position: 'absolute', bottom: 38, left: 56,
      height: 22, objectFit: 'contain',
      filter: dark ? 'brightness(0) invert(1)' : 'brightness(0)',
      opacity: 0.35, zIndex: 20,
    }} />
  )
}

// ─── Float oscillator ────────────────────────────────────────
const osc = (frame, amp, freq, phase = 0) => Math.sin(frame * freq + phase) * amp


// ═══════════════════════════════════════════════════════════════
//  1 — COVER  "The Manifesto"
//  Full bleed image, massive counter-rotated number, diagonal split
// ═══════════════════════════════════════════════════════════════
export function CoverSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  // Giant decorative number slams in from right
  const numX = spring({ frame: Math.max(0, frame - 2), fps, config: { damping: 18, stiffness: 120 } })

  // Diagonal reveal panel (left side)
  const panelX = interpolate(frame, [0, 22], [-110, 0], { extrapolateRight: 'clamp' })

  // Floating horizontal rule
  const ruleW = interpolate(frame, [18, 42], [0, 340], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="split" />
      <GridLines frame={frame} accent={accent} />

      {/* Ink marks */}
      <InkMark frame={frame} accent={accent} x="6%" y="6%" size={70} type="corner" opacity={0.25} />
      <InkMark frame={frame} accent={accent} x="88%" y="8%" size={90} type="circle" opacity={0.12} />
      <InkMark frame={frame} accent={accent} x="85%" y="80%" size={55} type="cross" opacity={0.10} />

      {/* Giant oversized slide number — decorative, right side */}
      <div style={{
        position: 'absolute', right: -20, bottom: -30,
        fontSize: 420, fontWeight: 900, lineHeight: 0.85,
        fontFamily: "'Cormorant Garamond','Georgia',serif",
        color: accent, opacity: 0.055,
        transform: `translateX(${(1 - numX) * 200}px) rotate(-3deg)`,
        userSelect: 'none', pointerEvents: 'none',
        letterSpacing: -20,
      }}>{String(slideNum).padStart(2, '0')}</div>

      {/* Left text panel */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '52%',
        transform: `translateX(${panelX}%)`,
        background: T.dark
          ? 'linear-gradient(105deg,rgba(8,8,16,.97) 85%,rgba(8,8,16,0))'
          : 'linear-gradient(105deg,rgba(242,239,232,.98) 85%,rgba(242,239,232,0))',
      }} />

      {/* Accent vertical bar */}
      <div style={{
        position: 'absolute', left: 52, top: '12%', bottom: '12%', width: 3,
        background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
        opacity: p(frame, 16, 20),
      }} />

      {/* Text content */}
      <AbsoluteFill style={{ padding: '0 0 0 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '50%', zIndex: 10 }}>
        <Tag text={slide.badge || slide.sectionTag || 'Presentation'} frame={frame} start={8} accent={accent} dark={T.dark} />

        {/* Horizontal rule before headline */}
        <div style={{
          width: ruleW, height: 2,
          background: `linear-gradient(to right, ${accent}, transparent)`,
          marginBottom: 20,
          boxShadow: `0 0 14px ${accent}80`,
        }} />

        <Headline text={slide.title} frame={frame} start={22} size={68} color={T.text} serif spacing={-2.5} maxWidth="420px" />

        {slide.subtitle && (
          <Body text={slide.subtitle} frame={frame} start={42} size={16} color={T.sub} style={{ marginTop: 18, maxWidth: 340 }} />
        )}

        {/* Presenter row */}
        {slide.presenter && (
          <div style={{
            marginTop: 36, display: 'flex', alignItems: 'center', gap: 14,
            opacity: p(frame, 50, 18),
          }}>
            <div style={{
              width: 1, height: 36,
              background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: '.04em', fontFamily: "'Courier New',monospace" }}>{slide.presenter}</div>
              {slide.date && <div style={{ fontSize: 10, color: T.sub, letterSpacing: '.12em', marginTop: 2, fontFamily: "'Courier New',monospace" }}>{slide.date}</div>}
            </div>
          </div>
        )}
      </AbsoluteFill>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  2 — BULLETS  "The Ledger"
//  Left vertical rule, numbered rows, stagger-from-left
// ═══════════════════════════════════════════════════════════════
export function BulletsSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const bullets = (slide.bullets || []).slice(0, 5)

  return (
    <AbsoluteFill>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="deeper" />

      {/* Right decorative column */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '22%',
        background: `linear-gradient(to left, ${accent}10, transparent)`,
        borderLeft: `1px solid ${accent}18`,
      }}>
        {/* Stacked thin lines fill */}
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute', left: 0, right: 0,
            top: `${(i + 1) * 6.7}%`, height: 1,
            background: `${accent}14`,
            opacity: p(frame, i * 3, 16),
          }} />
        ))}
      </div>

      <InkMark frame={frame} accent={accent} x="78%" y="72%" size={100} type="circle" opacity={0.08} />

      {/* Left heavy border */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 5,
        background: accent,
        opacity: p(frame, 0, 10),
      }} />

      <AbsoluteFill style={{ padding: '58px 260px 58px 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10 }}>
        <Tag text={slide.sectionTag} frame={frame} start={6} accent={accent} dark={T.dark} />
        <Headline text={slide.title} frame={frame} start={10} size={46} color={T.text} serif spacing={-1.5} />
        <Rule frame={frame} start={24} accent={accent} width={60} />

        {slide.subtitle && <Body text={slide.subtitle} frame={frame} start={28} size={15} color={T.sub} style={{ marginBottom: 22 }} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {bullets.map((b, i) => {
            const progress = p(frame, 32 + i * 10, 20, backOut)
            const isLast = i === bullets.length - 1
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'stretch', gap: 0,
                opacity: progress,
                transform: `translateX(${(1 - progress) * -60}px)`,
                borderBottom: isLast ? 'none' : `1px solid ${T.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                paddingBottom: isLast ? 0 : 16,
                marginBottom: isLast ? 0 : 16,
              }}>
                {/* Row number */}
                <div style={{
                  width: 48, flexShrink: 0,
                  display: 'flex', alignItems: 'flex-start', paddingTop: 3,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: accent,
                    fontFamily: "'Courier New',monospace", letterSpacing: '.1em',
                  }}>{String(i + 1).padStart(2, '0')}</span>
                </div>
                {/* Vertical divider */}
                <div style={{ width: 1, background: `${accent}40`, marginRight: 20, flexShrink: 0 }} />
                {/* Text */}
                <span style={{
                  fontSize: 20, color: T.dark ? 'rgba(255,255,255,.80)' : 'rgba(0,0,0,.75)',
                  lineHeight: 1.5, fontWeight: 450,
                  fontFamily: "'DM Sans',system-ui,sans-serif",
                  flex: 1,
                }}>{b}</span>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  3 — STATS  "The Ticker"
//  4-column card grid, animated score-counter, elastic pop-in
// ═══════════════════════════════════════════════════════════════
export function StatsSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const stats  = (slide.stats || []).slice(0, 4)

  return (
    <AbsoluteFill>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="deeper" />

      {/* Full-width top accent stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: accent,
        transform: `scaleX(${p(frame, 0, 18)})`,
        transformOrigin: 'left',
        boxShadow: `0 0 24px ${accent}`,
      }} />

      <InkMark frame={frame} accent={accent} x="5%" y="15%" size={80} type="cross" opacity={0.08} />
      <InkMark frame={frame} accent={accent} x="88%" y="75%" size={60} type="corner" opacity={0.12} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 72px', zIndex: 10 }}>
        <Tag text={slide.sectionTag || 'Metrics'} frame={frame} start={6} accent={accent} dark={T.dark} />
        <Headline text={slide.title} frame={frame} start={10} size={42} color={T.text} serif spacing={-1} />
        <Rule frame={frame} start={22} accent={accent} width={52} />

        <div style={{ display: 'flex', gap: 20, width: '100%', flexWrap: 'wrap' }}>
          {stats.map((s, i) => {
            const sc = spring({ frame: Math.max(0, frame - (22 + i * 12)), fps, config: { damping: 9, stiffness: 100 } })
            const raw = parseFloat((s.value || '').replace(/[^0-9.]/g, '')) || 0
            const suffix = (s.value || '').replace(/[0-9.]/g, '')
            const counted = Math.round(raw * clamp((frame - 22 - i * 12) / 32, 0, 1))
            const float = osc(frame, 3, 0.03, i * 1.2)

            return (
              <div key={i} style={{
                flex: '1 1 180px',
                transform: `scale(${sc}) translateY(${float}px)`,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Background card */}
                <div style={{
                  background: T.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${accent}28`,
                  borderTop: `3px solid ${accent}`,
                  borderRadius: 4,
                  padding: '34px 28px 28px',
                  position: 'relative',
                }} >
                  {/* Corner mark */}
                  <div style={{ position: 'absolute', bottom: 10, right: 14, width: 24, height: 24 }}>
                    <div style={{ position: 'absolute', right: 0, bottom: 0, width: 10, height: 1, background: `${accent}50` }} />
                    <div style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 10, background: `${accent}50` }} />
                  </div>

                  <div style={{
                    fontSize: 64, fontWeight: 900, lineHeight: 1, letterSpacing: -3,
                    fontFamily: "'Cormorant Garamond','Georgia',serif",
                    color: accent,
                  }}>
                    {raw ? `${counted}${suffix}` : s.value}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, marginTop: 12, letterSpacing: '.2em',
                    textTransform: 'uppercase', color: T.sub,
                    fontFamily: "'Courier New',monospace",
                  }}>{s.label}</div>
                  {s.desc && <div style={{ fontSize: 12, color: T.sub, marginTop: 6, opacity: 0.7, lineHeight: 1.5, fontFamily: "'DM Sans',system-ui,sans-serif" }}>{s.desc}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  4 — QUOTE  "The Monument"
//  Oversized serene quotation, editorial layout, side ruled gutter
// ═══════════════════════════════════════════════════════════════
export function QuoteSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  // Monumental quote mark drops in
  const qMarkY = spring({ frame: Math.max(0, frame), fps: 30, config: { damping: 14, stiffness: 50 } })
  const qText  = slide.quote || slide.title || ''

  return (
    <AbsoluteFill>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="deeper" />

      {/* Immense decorative quote mark */}
      <div style={{
        position: 'absolute', top: -40, left: 40,
        fontSize: 500, lineHeight: 0.85,
        fontFamily: "'Cormorant Garamond','Georgia',serif",
        color: accent, opacity: 0.06,
        transform: `translateY(${(1 - qMarkY) * -120}px)`,
        pointerEvents: 'none', userSelect: 'none',
        letterSpacing: -10,
      }}>"</div>

      {/* Vertical gutter lines */}
      <div style={{
        position: 'absolute', left: 64, top: 0, bottom: 0, width: 1,
        background: `${accent}35`,
        opacity: p(frame, 0, 14),
      }} />
      <div style={{
        position: 'absolute', left: 76, top: '20%', bottom: '20%', width: 2,
        background: accent,
        opacity: p(frame, 4, 14) * 0.7,
      }} />

      <AbsoluteFill style={{ padding: '0 110px 0 110px', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10 }}>
        <Tag text="Quote" frame={frame} start={6} accent={accent} dark={T.dark} />

        <div style={{
          fontSize: qText.length > 80 ? 28 : qText.length > 50 ? 34 : 42,
          fontWeight: 300,
          color: T.text,
          lineHeight: 1.55,
          fontFamily: "'Cormorant Garamond','Georgia',serif",
          fontStyle: 'italic',
          maxWidth: 820,
          opacity: p(frame, 16, 28),
          transform: `translateY(${(1 - p(frame, 16, 28)) * 30}px)`,
          letterSpacing: '0.01em',
        }}>{qText}</div>

        {slide.author && (
          <div style={{
            marginTop: 36, display: 'flex', alignItems: 'center', gap: 16,
            opacity: p(frame, 38, 20),
          }}>
            <div style={{ width: 40, height: 2, background: accent }} />
            <span style={{
              fontSize: 13, fontWeight: 700, color: accent,
              fontFamily: "'Courier New',monospace", letterSpacing: '.14em',
              textTransform: 'uppercase',
            }}>{slide.author}</span>
          </div>
        )}
      </AbsoluteFill>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  5 — SECTION  "The Interlude"
//  Full-bleed, huge italic number watermark, minimal text
// ═══════════════════════════════════════════════════════════════
export function SectionSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  const numSc = spring({ frame: Math.max(0, frame - 2), fps, config: { damping: 20, stiffness: 80 } })

  return (
    <AbsoluteFill>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="deeper" />

      {/* Full-width horizontal rules */}
      {[28, 72].map((pct, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: `${pct}%`, height: 1,
          background: `linear-gradient(to right, ${accent}60, transparent)`,
          opacity: p(frame, i * 8, 20),
        }} />
      ))}

      {/* Section number — architectural background element */}
      <div style={{
        position: 'absolute', right: -20, top: '50%',
        transform: `translateY(-50%) scale(${numSc}) rotate(-90deg)`,
        fontSize: 380, fontWeight: 900, lineHeight: 1,
        fontFamily: "'Cormorant Garamond','Georgia',serif",
        color: T.text, opacity: 0.04,
        pointerEvents: 'none', userSelect: 'none',
        letterSpacing: -20,
      }}>{slide.sectionNumber || String(slideNum).padStart(2, '0')}</div>

      <AbsoluteFill style={{ padding: '0 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10 }}>
        {/* Large section number badge */}
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.4em',
          color: accent, fontFamily: "'Courier New',monospace",
          textTransform: 'uppercase', marginBottom: 24,
          opacity: p(frame, 8, 18),
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span>{slide.sectionNumber || String(slideNum).padStart(2, '0')}</span>
          <div style={{ flex: 1, maxWidth: 80, height: 1, background: `${accent}60` }} />
          <span>{slide.sectionTag || 'Section'}</span>
        </div>

        <Headline text={slide.title} frame={frame} start={14} size={86} color={T.text} serif spacing={-4} maxWidth="72%" lineH={0.92} />

        {slide.subtitle && (
          <Body text={slide.subtitle} frame={frame} start={38} size={17} color={T.sub} style={{ marginTop: 28, maxWidth: 480 }} />
        )}
      </AbsoluteFill>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  6 — COMPARISON  "The Diptych"
//  True split screen, left vs right with ruled centre seam
// ═══════════════════════════════════════════════════════════════
export function ComparisonSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const cols   = (slide.columns || []).slice(0, 2)

  const seamH = interpolate(frame, [14, 42], [0, 100], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="deeper" />

      {/* Header strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 64,
        background: T.dark ? 'rgba(0,0,0,0.6)' : 'rgba(242,239,232,0.9)',
        borderBottom: `1px solid ${accent}25`,
        display: 'flex', alignItems: 'center', paddingLeft: 72,
        zIndex: 15,
        opacity: p(frame, 2, 14),
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.28em',
          color: accent, textTransform: 'uppercase',
          fontFamily: "'Courier New',monospace",
        }}>{slide.title}</span>
      </div>

      {/* Centre seam */}
      <div style={{
        position: 'absolute', left: '50%', top: 64, bottom: 0,
        width: 1, height: `${seamH}%`,
        background: `${accent}50`,
        transform: 'translateX(-50%)',
        zIndex: 10,
      }} />
      <div style={{
        position: 'absolute', left: '50%', top: '46%',
        transform: 'translate(-50%, -50%)',
        width: 28, height: 28, borderRadius: '50%',
        background: T.bg, border: `2px solid ${accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 11,
        opacity: p(frame, 20, 18),
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
      </div>

      {/* Two columns */}
      <div style={{ position: 'absolute', top: 64, left: 0, right: 0, bottom: 0, display: 'flex', zIndex: 5 }}>
        {[0, 1].map(ci => {
          const col = cols[ci] || {}
          const progress = p(frame, 20 + ci * 10, 24, backOut)
          return (
            <div key={ci} style={{
              flex: 1, padding: '36px 52px',
              opacity: progress,
              transform: `translateX(${(1 - progress) * (ci === 0 ? -50 : 50)}px)`,
            }}>
              {/* Column header */}
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '.28em',
                textTransform: 'uppercase', marginBottom: 22,
                color: ci === 0 ? accent : T.sub,
                fontFamily: "'Courier New',monospace",
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 20, height: 2, background: ci === 0 ? accent : T.sub }} />
                {col.label || (ci === 0 ? 'Before' : 'After')}
              </div>

              {(col.items || []).map((item, j) => {
                const ip = p(frame, 30 + ci * 10 + j * 8, 18)
                return (
                  <div key={j} style={{
                    display: 'flex', gap: 12, marginBottom: 14,
                    opacity: ip, transform: `translateY(${(1 - ip) * 16}px)`,
                    alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: ci === 0 ? accent : T.sub,
                      flexShrink: 0, marginTop: 7,
                    }} />
                    <span style={{
                      fontSize: 16, color: T.dark ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.72)',
                      lineHeight: 1.55, fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 440,
                    }}>{item}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  7 — TIMELINE  "The Chronicle"
//  Vertical stacked timeline with connecting dotted line
// ═══════════════════════════════════════════════════════════════
export function TimelineSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const items  = (slide.timeline || []).slice(0, 4)

  const lineH = interpolate(frame, [16, 60], [0, 100], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="deeper" />
      <InkMark frame={frame} accent={accent} x="82%" y="12%" size={90} type="cross" opacity={0.07} />

      <AbsoluteFill style={{ padding: '56px 72px', display: 'flex', flexDirection: 'row', gap: 0, zIndex: 10 }}>
        {/* Left column: title */}
        <div style={{ width: 280, flexShrink: 0, paddingRight: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Tag text={slide.sectionTag || 'Timeline'} frame={frame} start={6} accent={accent} dark={T.dark} />
          <Headline text={slide.title} frame={frame} start={10} size={42} color={T.text} serif spacing={-1.5} />
          <Rule frame={frame} start={24} accent={accent} width={50} />
          {slide.subtitle && <Body text={slide.subtitle} frame={frame} start={28} size={14} color={T.sub} />}
        </div>

        {/* Vertical line connecting dots */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginRight: 40 }}>
          <div style={{
            position: 'absolute', top: '10%', left: '50%',
            width: 1, height: `${lineH * 0.8}%`,
            background: `${accent}40`,
            transform: 'translateX(-50%)',
          }} />
          {items.map((_, i) => {
            const sc = spring({ frame: Math.max(0, frame - (24 + i * 14)), fps, config: { damping: 10, stiffness: 90 } })
            return (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%',
                border: `2px solid ${accent}`,
                background: i === 0 ? accent : T.bg,
                transform: `scale(${sc})`,
                margin: i < items.length - 1 ? '0 0 52px' : 0,
                boxShadow: i === 0 ? `0 0 16px ${accent}80` : 'none',
                position: 'relative', zIndex: 1,
              }} />
            )
          })}
        </div>

        {/* Right column: timeline items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
          {items.map((item, i) => {
            const progress = p(frame, 26 + i * 14, 20, backOut)
            const isLast = i === items.length - 1
            return (
              <div key={i} style={{
                opacity: progress,
                transform: `translateX(${(1 - progress) * 40}px)`,
                paddingBottom: isLast ? 0 : 28,
                marginBottom: isLast ? 0 : 24,
                borderBottom: isLast ? 'none' : `1px solid ${T.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: accent,
                  letterSpacing: '.22em', textTransform: 'uppercase',
                  fontFamily: "'Courier New',monospace", marginBottom: 6,
                }}>{item.date}</div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: T.text,
                  fontFamily: "'DM Sans',system-ui,sans-serif", marginBottom: 4,
                }}>{item.label}</div>
                {item.desc && (
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.55, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
                    {item.desc}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  8 — CTA  "The Directive"
//  Full-bleed, headline slices in diagonally, button scales in
// ═══════════════════════════════════════════════════════════════
export function CTASlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  const btnSc = spring({ frame: Math.max(0, frame - 44), fps, config: { damping: 10, stiffness: 90 } })
  const pulse = 1 + Math.sin(frame * 0.08) * 0.03

  // Full bleed accent diagonal
  const diagX = interpolate(frame, [0, 20], [110, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="deeper" />

      {/* Diagonal accent slash */}
      <div style={{
        position: 'absolute', bottom: -80, left: -80, right: -80,
        height: '60%',
        background: `${accent}0a`,
        transform: `skewY(-8deg) translateX(${diagX}%)`,
        transformOrigin: 'bottom left',
      }} />

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
        background: accent,
        transform: `scaleX(${p(frame, 0, 20)})`,
        transformOrigin: 'left',
        boxShadow: `0 0 28px ${accent}`,
      }} />

      <InkMark frame={frame} accent={accent} x="8%" y="8%" size={70} type="corner" opacity={0.18} />
      <InkMark frame={frame} accent={accent} x="85%" y="82%" size={70} type="corner" opacity={0.14} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '0 100px', zIndex: 10 }}>
        <Tag text={slide.sectionTag || 'Next Step'} frame={frame} start={8} accent={accent} dark={T.dark} />
        <Headline text={slide.title} frame={frame} start={14} size={76} color={T.text} serif spacing={-3.5} maxWidth="680px" />

        {slide.subtitle && (
          <Body text={slide.subtitle} frame={frame} start={32} size={17} color={T.sub} style={{ marginTop: 20, maxWidth: 500 }} />
        )}

        {slide.cta && (
          <div style={{
            marginTop: 48,
            transform: `scale(${btnSc * pulse})`,
            display: 'inline-flex', alignItems: 'center', gap: 16,
            background: accent,
            color: T.dark ? '#000' : '#fff',
            padding: '16px 44px',
            fontSize: 15, fontWeight: 800, letterSpacing: '.06em',
            fontFamily: "'DM Sans',system-ui,sans-serif",
            textTransform: 'uppercase',
            boxShadow: `0 12px 48px ${accent}60, 0 4px 16px ${accent}40`,
          }}>
            {slide.cta}
            {/* Arrow */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </AbsoluteFill>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  9 — AGENDA / CONTENT / GENERIC  "The Index"
//  Numbered list, editorial grid structure
// ═══════════════════════════════════════════════════════════════
export function AgendaSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const items  = (slide.bullets || slide.items || []).slice(0, 6)

  return (
    <AbsoluteFill>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="deeper" />

      {/* Right gutter with item count */}
      <div style={{
        position: 'absolute', right: 52, top: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 8, zIndex: 5,
        opacity: p(frame, 8, 20),
      }}>
        {Array.from({ length: items.length }, (_, i) => (
          <div key={i} style={{
            width: i === 0 ? 6 : 3, height: i === 0 ? 6 : 3,
            borderRadius: '50%',
            background: i === 0 ? accent : `${accent}40`,
          }} />
        ))}
      </div>

      {/* Top cap line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(to right, transparent, ${accent}60, transparent)`,
        opacity: p(frame, 0, 12),
      }} />

      <AbsoluteFill style={{ padding: '56px 110px 56px 72px', display: 'flex', zIndex: 10, gap: 60 }}>
        {/* Left: title */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Tag text={slide.sectionTag} frame={frame} start={6} accent={accent} dark={T.dark} />
          <Headline text={slide.title} frame={frame} start={10} size={38} color={T.text} serif spacing={-1} />
          <Rule frame={frame} start={24} accent={accent} width={44} />
          {slide.subtitle && <Body text={slide.subtitle} frame={frame} start={28} size={13} color={T.sub} />}
        </div>

        {/* Divider */}
        <div style={{
          width: 1, alignSelf: 'stretch',
          background: `${accent}22`,
          opacity: p(frame, 14, 18),
          flexShrink: 0,
        }} />

        {/* Right: items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
          {items.map((item, i) => {
            const progress = p(frame, 26 + i * 9, 20, backOut)
            const label = typeof item === 'string' ? item : item.label || item.name || ''
            const isLast = i === items.length - 1
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 20,
                opacity: progress,
                transform: `translateX(${(1 - progress) * 50}px)`,
                paddingBottom: isLast ? 0 : 16,
                marginBottom: isLast ? 0 : 16,
                borderBottom: isLast ? 'none' : `1px solid ${T.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: accent,
                  fontFamily: "'Courier New',monospace", letterSpacing: '.1em',
                  flexShrink: 0, minWidth: 28,
                }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ width: 1, height: 24, background: `${accent}30`, flexShrink: 0 }} />
                <span style={{
                  fontSize: 18, color: T.dark ? 'rgba(255,255,255,.80)' : 'rgba(0,0,0,.75)',
                  fontWeight: 450, fontFamily: "'DM Sans',system-ui,sans-serif", lineHeight: 1.4,
                }}>{label}</span>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  10 — TEAM  "The Roster"
// ═══════════════════════════════════════════════════════════════
export function TeamSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const members = (slide.team || slide.bullets || []).slice(0, 4)

  return (
    <AbsoluteFill>
      <StillBg url={slide.pexelsUrl} themeBg={T.bg} overlay="deeper" />
      <InkMark frame={frame} accent={accent} x="82%" y="15%" size={80} type="circle" opacity={0.08} />

      <AbsoluteFill style={{ padding: '56px 72px', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ marginBottom: 36 }}>
          <Tag text="Team" frame={frame} start={6} accent={accent} dark={T.dark} />
          <Headline text={slide.title} frame={frame} start={10} size={44} color={T.text} serif spacing={-1.5} />
          <Rule frame={frame} start={22} accent={accent} width={52} />
        </div>

        <div style={{ display: 'flex', gap: 20, flex: 1, alignItems: 'stretch' }}>
          {members.map((member, i) => {
            const sc = spring({ frame: Math.max(0, frame - (24 + i * 12)), fps, config: { damping: 12, stiffness: 80 } })
            const name  = typeof member === 'string' ? member : member.name || member
            const role  = typeof member === 'object' ? member.role || '' : ''
            const float = osc(frame, 4, 0.025, i * 1.4)

            return (
              <div key={i} style={{
                flex: 1,
                transform: `scale(${sc}) translateY(${float}px)`,
                background: T.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${accent}20`,
                borderTop: `2px solid ${accent}`,
                borderRadius: 4,
                padding: '28px 24px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {/* Avatar placeholder */}
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: `${accent}18`,
                  border: `1.5px solid ${accent}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cormorant Garamond','Georgia',serif",
                  fontSize: 22, fontWeight: 700, color: accent,
                }}>
                  {name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "'DM Sans',system-ui,sans-serif" }}>{name}</div>
                  {role && <div style={{ fontSize: 11, color: accent, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: "'Courier New',monospace", marginTop: 4 }}>{role}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <Logo url={logoUrl} dark={T.dark} />
      <Index n={slideNum} total={totalSlides} accent={accent} dark={T.dark} />
      <HardCut frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MASTER COMPOSITION
// ═══════════════════════════════════════════════════════════════
const SLIDE_MAP = {
  cover:      CoverSlide,
  title:      CoverSlide,
  bullets:    BulletsSlide,
  content:    BulletsSlide,
  stats:      StatsSlide,
  quote:      QuoteSlide,
  section:    SectionSlide,
  comparison: ComparisonSlide,
  timeline:   TimelineSlide,
  cta:        CTASlide,
  agenda:     AgendaSlide,
  team:       TeamSlide,
  default:    AgendaSlide,
}

export default function DeckComposition({
  slides   = [],
  themeId  = 'obsidian',
  logoUrl  = null,
  slideDur = 150,
}) {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {slides.map((slide, i) => {
        const Component = SLIDE_MAP[slide.type] || SLIDE_MAP.default
        return (
          <Sequence key={i} from={i * slideDur} durationInFrames={slideDur}>
            <Component
              slide={slide}
              themeId={themeId}
              logoUrl={logoUrl}
              slideNum={i + 1}
              totalSlides={slides.length}
            />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}