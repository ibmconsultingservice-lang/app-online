/**
 * app/videogen/powerpoint/remotion/SlideCompositions.jsx
 *
 * Every slide type is a self-contained Remotion composition:
 *   • Ken-Burns / parallax background (Pexels photo)
 *   • Frame-perfect text reveals (stagger, spring, skew)
 *   • Per-type geometric animations (bars, counters, particles…)
 *   • Cinematic fade/wipe transitions at head & tail
 *
 * SLIDE TYPES
 *   cover | agenda | section | bullets | stats
 *   quote | comparison | timeline | content | cta
 */

import {
  AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig,
  interpolate, spring, Img, interpolateString,
} from 'remotion'

// ─── Math helpers ─────────────────────────────────────────────
const easeOutExpo  = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
const easeOutQuart = t => 1 - Math.pow(1 - t, 4)
const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const prog  = (frame, start, dur) => easeOutExpo(clamp((frame - start) / dur, 0, 1))

// ─── Theme palette ────────────────────────────────────────────
const THEMES = {
  obsidian:  { bg: '#0a0a12', accent: '#c9a84c', text: '#ffffff', sub: 'rgba(255,255,255,0.55)', dark: true },
  aurora:    { bg: '#060d1a', accent: '#7c3aed', text: '#ffffff', sub: 'rgba(255,255,255,0.5)',  dark: true },
  editorial: { bg: '#fafaf8', accent: '#1a1a2e', text: '#1a1a2e', sub: 'rgba(26,26,46,0.5)',    dark: false },
  crimson:   { bg: '#0d0507', accent: '#dc2626', text: '#ffffff', sub: 'rgba(255,255,255,0.5)',  dark: true },
  arctic:    { bg: '#020b18', accent: '#0ea5e9', text: '#ffffff', sub: 'rgba(255,255,255,0.5)',  dark: true },
  forest:    { bg: '#030c06', accent: '#16a34a', text: '#ffffff', sub: 'rgba(255,255,255,0.5)',  dark: true },
}

// ─── Shared: cinematic Pexels BG ─────────────────────────────
function PexelsBg({ url, frame, total, dir = 'in', scale = 1.10, overlay = 'dark', themeBg }) {
  const p   = total > 1 ? frame / (total - 1) : 0
  const scl = dir === 'in'
    ? interpolate(p, [0, 1], [1, scale])
    : interpolate(p, [0, 1], [scale, 1])

  const overlays = {
    dark:    'linear-gradient(160deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.52) 100%)',
    luxury:  'linear-gradient(135deg,rgba(5,2,10,.80) 0%,rgba(30,10,50,.55) 50%,rgba(5,2,10,.78) 100%)',
    warm:    'linear-gradient(180deg,rgba(15,5,0,.60) 0%,rgba(50,15,5,.70) 100%)',
    side:    'linear-gradient(90deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.60) 45%,rgba(0,0,0,.10) 100%)',
    center:  'radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.0) 25%,rgba(0,0,0,.80) 100%)',
    light:   'linear-gradient(160deg,rgba(250,250,248,.88) 0%,rgba(250,250,248,.70) 100%)',
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: themeBg || '#000' }}>
      {url && (
        <div style={{
          position: 'absolute', inset: '-6%',
          transform: `scale(${scl})`,
          transformOrigin: 'center center',
        }}>
          <Img src={url} style={{ width: '112%', height: '112%', objectFit: 'cover' }} />
        </div>
      )}
      <AbsoluteFill style={{ background: overlays[overlay] || overlays.dark }} />
      {/* grain */}
      <AbsoluteFill style={{
        opacity: .028,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }} />
      {/* letterbox */}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:22,background:'rgba(0,0,0,.55)' }} />
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:22,background:'rgba(0,0,0,.55)' }} />
    </AbsoluteFill>
  )
}

// ─── Shared: fade-in/out wipe ─────────────────────────────────
function Wipe({ frame, total }) {
  const fadeIn  = interpolate(frame, [0, 14], [1, 0], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [total - 14, total], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{
      background: '#000',
      opacity: Math.max(fadeIn, fadeOut),
      pointerEvents: 'none',
    }} />
  )
}

// ─── Shared: animated accent line ────────────────────────────
function AccentLine({ frame, start, color, width = 72 }) {
  const p = prog(frame, start, 28)
  return (
    <div style={{
      width: width * p, height: 3,
      background: color, borderRadius: 2,
      boxShadow: `0 0 18px ${color}90`,
      marginBottom: 24,
    }} />
  )
}

// ─── Shared: stagger word reveal ─────────────────────────────
function AnimWords({ text = '', frame, start, size = 72, weight = 900, color = '#fff', spacing = -2, serif = true, style = {} }) {
  const words = text.split(' ')
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:'0.22em', ...style }}>
      {words.map((w, i) => {
        const p = prog(frame, start + i * 6, 20)
        return (
          <span key={i} style={{
            display: 'inline-block',
            fontSize: size, fontWeight: weight,
            letterSpacing: spacing,
            color,
            opacity: p,
            transform: `translateY(${(1 - p) * 42}px) skewY(${(1 - p) * 4}deg)`,
            fontFamily: serif ? "'Playfair Display','Georgia',serif" : "'DM Sans',system-ui,sans-serif",
            lineHeight: 1.05,
          }}>{w}</span>
        )
      })}
    </div>
  )
}

// ─── Shared: slide-up subtitle ────────────────────────────────
function AnimSub({ text = '', frame, start, size = 20, color, style = {} }) {
  const p = prog(frame, start, 22)
  return (
    <div style={{
      fontSize: size, fontWeight: 400,
      color: color || 'rgba(255,255,255,.65)',
      opacity: p,
      transform: `translateY(${(1 - p) * 28}px)`,
      fontFamily: "'DM Sans',system-ui,sans-serif",
      letterSpacing: '.03em', lineHeight: 1.65,
      ...style,
    }}>{text}</div>
  )
}

// ─── Shared: badge pill ───────────────────────────────────────
function Badge({ text, frame, start, color }) {
  const p = prog(frame, start, 16)
  return (
    <div style={{
      display:'inline-flex', alignItems:'center',
      marginBottom: 22, opacity: p,
      transform: `translateY(${(1-p)*20}px)`,
      background: `${color}22`,
      border: `1px solid ${color}66`,
      borderRadius: 100, padding: '7px 22px',
      fontSize: 12, fontWeight: 700,
      color, letterSpacing: '.2em', textTransform: 'uppercase',
      fontFamily: "'DM Sans',system-ui,sans-serif",
    }}>{text}</div>
  )
}

// ─── Shared: floating particles ──────────────────────────────
function Particles({ frame, accent, n = 14 }) {
  return (
    <AbsoluteFill style={{ pointerEvents:'none' }}>
      {Array.from({ length: n }, (_, i) => {
        const seed = i * 137.508
        const x    = seed % 100
        const y    = (seed * 1.618) % 100
        const sz   = 2 + (i % 3) * 2
        const spd  = .3 + (i % 5) * .14
        const ph   = i * .9
        const opa  = .12 + (Math.sin(frame * spd * .05 + ph) + 1) * .18
        const dy   = Math.sin(frame * spd * .03 + ph) * 16
        return (
          <div key={i} style={{
            position:'absolute',
            left:`${x}%`, top:`${y}%`,
            width: sz, height: sz,
            borderRadius:'50%',
            background: accent,
            opacity: opa,
            transform:`translateY(${dy}px)`,
            boxShadow:`0 0 ${sz*3}px ${accent}`,
          }} />
        )
      })}
    </AbsoluteFill>
  )
}

// ─── Shared: slide-number badge ──────────────────────────────
function SlideNum({ n, total, accent, isDark }) {
  return (
    <div style={{
      position:'absolute', bottom:32, right:48,
      fontSize:11, fontWeight:600, letterSpacing:'.1em',
      color: isDark ? 'rgba(255,255,255,.22)' : 'rgba(26,26,46,.22)',
      fontFamily:"'DM Sans',system-ui,sans-serif",
    }}>{n} / {total}</div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE TYPE 1 — COVER  (cinematic split: text left / image right)
// ═══════════════════════════════════════════════════════════════
export function CoverSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  // horizontal reveal curtain (left panel slides in)
  //  Correct Approach 2: Use Remotion's 'interpolateString' if you must interpolate complex units
  const curtainValue = interpolate(frame, [0, 30], [-100, 0], { extrapolateRight: 'clamp' })
  const curtain = `${curtainValue}%`
  // right image
  const imgScale  = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 14, stiffness: 60 } })
  const floatY    = Math.sin(frame * .038) * 9

  return (
    <AbsoluteFill style={{ fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      {/* Full-width Pexels BG */}
      <PexelsBg url={slide.pexelsUrl} frame={frame} total={dur} dir="in" scale={1.08} overlay="luxury" themeBg={T.bg} />
      <Particles frame={frame} accent={accent} n={18} />

      {/* Left black panel slides in */}
      <div style={{
        position:'absolute', top:0, bottom:0, left:0, width:'54%',
        transform:`translateX(${curtain})`,
        background: T.dark
          ? 'linear-gradient(to right,rgba(0,0,0,.92) 80%,rgba(0,0,0,0))'
          : 'linear-gradient(to right,rgba(250,250,248,.95) 80%,rgba(250,250,248,0))',
      }} />

      {/* Right: floating product / key visual */}
      <div style={{
        position:'absolute', right:80, top:'50%',
        transform:`translateY(calc(-50% + ${floatY}px)) scale(${.8 + imgScale*.2})`,
        opacity: imgScale, width:380,
      }}>
        {slide.pexelsUrl && (
          <>
            <div style={{
              position:'absolute', inset:-60,
              background:`radial-gradient(circle,${accent}35 0%,transparent 70%)`,
              borderRadius:'50%',
            }} />
            <Img src={slide.pexelsUrl} style={{
              width:'100%', height:280, objectFit:'cover',
              borderRadius:24,
              filter:`drop-shadow(0 30px 80px ${accent}55)`,
              position:'relative', zIndex:1,
            }} />
          </>
        )}
      </div>

      {/* Left text block */}
      <AbsoluteFill style={{ padding:'0 100px', display:'flex', flexDirection:'column', justifyContent:'center', maxWidth:'56%', zIndex:5 }}>
        {slide.badge && <Badge text={slide.badge} frame={frame} start={18} color={accent} />}
        <AccentLine frame={frame} start={22} color={accent} />
        <AnimWords text={slide.title} frame={frame} start={26} size={64} color={T.text} spacing={-2.5} />
        {slide.subtitle && (
          <div style={{ marginTop:20 }}>
            <AnimSub text={slide.subtitle} frame={frame} start={44} size={19} color={T.sub} />
          </div>
        )}
        {slide.presenter && (
          <div style={{
            marginTop:36, display:'flex', alignItems:'center', gap:12,
            opacity: prog(frame, 52, 18),
          }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:`${accent}28`, border:`2px solid ${accent}70`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:15, color:accent, fontWeight:700 }}>{slide.presenter[0]}</span>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{slide.presenter}</div>
              {slide.date && <div style={{ fontSize:11, color:T.sub }}>{slide.date}</div>}
            </div>
          </div>
        )}
      </AbsoluteFill>

      {/* Bottom brand strip */}
      <div style={{
        position:'absolute', bottom:48, left:100, right:100,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        opacity: prog(frame, 40, 20), zIndex:5,
      }}>
        {logoUrl
          ? <img src={logoUrl} alt="logo" style={{ height:28, objectFit:'contain', filter: T.dark ? 'brightness(0) invert(1)' : 'none', opacity:.65 }} />
          : <div style={{ fontSize:10, letterSpacing:'.28em', color:T.dark?'rgba(255,255,255,.28)':'rgba(26,26,46,.28)', fontWeight:600, textTransform:'uppercase' }}>
              VisualGen AI
            </div>
        }
        <div style={{ width:44, height:1, background:`linear-gradient(to right,transparent,${accent})` }} />
      </div>

      <SlideNum n={slideNum} total={totalSlides} accent={accent} isDark={T.dark} />
      <Wipe frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE TYPE 2 — BULLETS  (staggered list with side BG strip)
// ═══════════════════════════════════════════════════════════════
export function BulletsSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const bullets = (slide.bullets || []).slice(0, 5)

  // right-column bg strip reveals from bottom
  const stripHValue = interpolate(frame, [8, 40], [0, 100], { extrapolateRight: 'clamp' })
  const stripH = `${stripHValue}%`

  return (
    <AbsoluteFill>
      <PexelsBg url={slide.pexelsUrl} frame={frame} total={dur} dir="out" scale={1.06} overlay="side" themeBg={T.bg} />

      {/* Right decorative strip */}
      <div style={{
        position:'absolute', right:0, top:0,
        width:'32%', height: stripH,
        background:`linear-gradient(180deg,${accent}18 0%,${accent}08 100%)`,
        borderLeft:`2px solid ${accent}30`,
        overflow:'hidden',
      }} />

      {/* Left accent vertical bar */}
      <div style={{
        position:'absolute', left:0, top:0, bottom:0, width:4,
        background:`linear-gradient(to bottom,transparent,${accent},transparent)`,
        opacity: interpolate(frame,[0,22],[0,.85],{extrapolateRight:'clamp'}),
      }} />

      <AbsoluteFill style={{ padding:'60px 420px 60px 90px', display:'flex', flexDirection:'column', justifyContent:'center', zIndex:5 }}>
        {/* Section tag */}
        <div style={{
          fontSize:10, fontWeight:700, color:accent,
          letterSpacing:'.3em', textTransform:'uppercase', marginBottom:10,
          opacity: prog(frame, 6, 16),
          fontFamily:"'DM Sans',system-ui,sans-serif",
        }}>{slide.sectionTag || ''}</div>

        <AnimWords text={slide.title} frame={frame} start={10} size={44} color={T.text} spacing={-1.5} />
        <AccentLine frame={frame} start={24} color={accent} width={56} />

        <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
          {bullets.map((b, i) => {
            const p = prog(frame, 30 + i * 11, 22)
            return (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:18, opacity:p, transform:`translateX(${(1-p)*-50}px)` }}>
                <div style={{
                  width:30, height:30, borderRadius:'50%', flexShrink:0, marginTop:3,
                  border:`2px solid ${accent}`,
                  background:`${accent}18`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:accent }} />
                </div>
                <span style={{ fontSize:22, color: T.dark?'rgba(255,255,255,.85)':'rgba(26,26,46,.85)', lineHeight:1.45, fontWeight:450, fontFamily:"'DM Sans',system-ui,sans-serif" }}>
                  {b}
                </span>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      {logoUrl && (
        <img src={logoUrl} alt="logo" style={{ position:'absolute', top:24, right:24, height:26, objectFit:'contain', filter: T.dark?'brightness(0) invert(1)':'none', opacity:.55, zIndex:10 }} />
      )}

      <SlideNum n={slideNum} total={totalSlides} accent={accent} isDark={T.dark} />
      <Wipe frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE TYPE 3 — STATS  (counting numbers + spring pop-in cards)
// ═══════════════════════════════════════════════════════════════
export function StatsSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const stats  = (slide.stats || []).slice(0, 4)

  return (
    <AbsoluteFill>
      <PexelsBg url={slide.pexelsUrl} frame={frame} total={dur} dir="in" scale={1.07} overlay="center" themeBg={T.bg} />
      <Particles frame={frame} accent={accent} n={10} />

      <AbsoluteFill style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 80px', zIndex:5 }}>
        <AnimWords text={slide.title} frame={frame} start={6} size={38} color={T.text} spacing={-1} style={{ justifyContent:'center', textAlign:'center' }} />
        <AccentLine frame={frame} start={18} color={accent} width={48} />

        <div style={{ display:'flex', gap:28, flexWrap:'wrap', justifyContent:'center', marginTop:12 }}>
          {stats.map((s, i) => {
            const sc = spring({ frame: Math.max(0, frame - (20 + i*14)), fps, config:{ damping:11, stiffness:85 } })
            // animated counter
            const maxVal = parseFloat(s.value.replace(/[^0-9.]/g,'')) || 0
            const suffix = s.value.replace(/[0-9.]/g,'')
            const counted = Math.round(maxVal * clamp((frame - 20 - i*14) / 35, 0, 1))

            return (
              <div key={i} style={{
                textAlign:'center',
                transform:`scale(${sc})`,
                background: T.dark?'rgba(255,255,255,.04)':'rgba(26,26,46,.04)',
                backdropFilter:'blur(20px)',
                border:`1px solid ${accent}35`,
                borderRadius:28, padding:'40px 48px', minWidth:180,
                boxShadow:`0 0 50px ${accent}18, inset 0 1px 0 rgba(255,255,255,.07)`,
              }}>
                <div style={{
                  fontSize:70, fontWeight:900, lineHeight:1,
                  fontFamily:"'Playfair Display','Georgia',serif",
                  background:`linear-gradient(135deg,#fff,${accent})`,
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                }}>
                  {maxVal ? `${counted}${suffix}` : s.value}
                </div>
                <div style={{
                  fontSize:13, color: T.sub, marginTop:10, fontWeight:600,
                  letterSpacing:'.12em', textTransform:'uppercase',
                  fontFamily:"'DM Sans',system-ui,sans-serif",
                }}>{s.label}</div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      {logoUrl && <img src={logoUrl} alt="logo" style={{ position:'absolute',top:24,right:24,height:26,objectFit:'contain',filter:T.dark?'brightness(0) invert(1)':'none',opacity:.55,zIndex:10 }} />}
      <SlideNum n={slideNum} total={totalSlides} accent={accent} isDark={T.dark} />
      <Wipe frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE TYPE 4 — QUOTE  (huge quote mark, centered reveal)
// ═══════════════════════════════════════════════════════════════
export function QuoteSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  const quoteScale = interpolate(frame, [0, 30], [2.4, 1], { extrapolateRight:'clamp' })
  const quoteFade  = interpolate(frame, [0, 30], [0, 0.18], { extrapolateRight:'clamp' })
  const lineW      = interpolate(frame, [20, 55], [0, 200], { extrapolateRight:'clamp' })

  return (
    <AbsoluteFill>
      <PexelsBg url={slide.pexelsUrl} frame={frame} total={dur} dir="out" scale={1.06} overlay="dark" themeBg={T.bg} />

      {/* Giant quotation mark */}
      <div style={{
        position:'absolute', top:60, left:80,
        fontSize:260, lineHeight:.8, fontFamily:"'Playfair Display','Georgia',serif",
        color:accent, opacity:quoteFade,
        transform:`scale(${quoteScale})`, transformOrigin:'top left',
        pointerEvents:'none', userSelect:'none',
      }}>"</div>

      <AbsoluteFill style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 160px', zIndex:5, textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:36 }}>
          <div style={{ width:lineW/2, height:1, background:`linear-gradient(to right,transparent,${accent})` }} />
          <div style={{ width:8, height:8, borderRadius:'50%', background:accent, margin:'0 10px', boxShadow:`0 0 16px ${accent}` }} />
          <div style={{ width:lineW/2, height:1, background:`linear-gradient(to left,transparent,${accent})` }} />
        </div>

        <AnimWords
          text={slide.quote || slide.title}
          frame={frame} start={22}
          size={32} color={T.text} spacing={-0.5}
          style={{ justifyContent:'center' }}
        />

        {slide.author && (
          <div style={{
            marginTop:30, fontSize:15, color:accent, fontWeight:700,
            opacity: prog(frame, 42, 18),
            fontFamily:"'DM Sans',system-ui,sans-serif",
            letterSpacing:'.08em',
          }}>— {slide.author}</div>
        )}
      </AbsoluteFill>

      {logoUrl && <img src={logoUrl} alt="logo" style={{ position:'absolute',top:24,right:24,height:26,objectFit:'contain',filter:T.dark?'brightness(0) invert(1)':'none',opacity:.55,zIndex:10 }} />}
      <SlideNum n={slideNum} total={totalSlides} accent={accent} isDark={T.dark} />
      <Wipe frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE TYPE 5 — SECTION BREAK  (full-screen text impact)
// ═══════════════════════════════════════════════════════════════
export function SectionSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  const numScale = spring({ frame: Math.max(0, frame - 4), fps, config:{ damping:10, stiffness:70 } })
  const bgShift  = interpolate(frame, [0, dur], [0, -40], { extrapolateRight:'clamp' })

  return (
    <AbsoluteFill>
      <PexelsBg url={slide.pexelsUrl} frame={frame} total={dur} dir="in" scale={1.12} overlay="luxury" themeBg={T.bg} />
      <Particles frame={frame} accent={accent} n={22} />

      {/* Horizontal animated lines */}
      {[0.25, 0.75].map((pct, i) => (
        <div key={i} style={{
          position:'absolute', top:`${pct * 100}%`, left:0, right:0, height:1,
          background:`linear-gradient(to right,transparent 0%,${accent}45 30%,${accent}45 70%,transparent 100%)`,
          opacity: interpolate(frame,[i*10+5,i*10+35],[0,1],{extrapolateRight:'clamp'}),
        }} />
      ))}

      {/* Section number — large decorative */}
      <div style={{
        position:'absolute', right:80, bottom:80,
        fontSize:220, fontWeight:900, lineHeight:1,
        fontFamily:"'Playfair Display','Georgia',serif",
        color:accent, opacity:.06,
        transform:`scale(${numScale}) translateY(${bgShift}px)`,
        userSelect:'none',
      }}>{slide.sectionNumber || '01'}</div>

      <AbsoluteFill style={{ padding:'0 110px', display:'flex', flexDirection:'column', justifyContent:'center', zIndex:5 }}>
        {/* Animated number badge */}
        <div style={{
          width:60, height:60, borderRadius:18,
          background:`${accent}22`, border:`2px solid ${accent}60`,
          display:'flex', alignItems:'center', justifyContent:'center',
          marginBottom:28,
          transform:`scale(${numScale})`,
        }}>
          <span style={{ fontSize:24, color:accent, fontWeight:900, fontFamily:"'Playfair Display','Georgia',serif" }}>
            {slide.sectionNumber || '01'}
          </span>
        </div>

        <AccentLine frame={frame} start={14} color={accent} width={68} />
        <AnimWords text={slide.title} frame={frame} start={18} size={72} color={T.text} spacing={-3} style={{ maxWidth:'65%' }} />
        {slide.subtitle && (
          <div style={{ marginTop:20, maxWidth:'50%' }}>
            <AnimSub text={slide.subtitle} frame={frame} start={38} size={18} color={T.sub} />
          </div>
        )}
      </AbsoluteFill>

      {logoUrl && <img src={logoUrl} alt="logo" style={{ position:'absolute',top:24,right:24,height:26,objectFit:'contain',filter:T.dark?'brightness(0) invert(1)':'none',opacity:.55,zIndex:10 }} />}
      <SlideNum n={slideNum} total={totalSlides} accent={accent} isDark={T.dark} />
      <Wipe frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE TYPE 6 — COMPARISON  (animated 2-column reveal)
// ═══════════════════════════════════════════════════════════════
export function ComparisonSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const cols   = (slide.columns || []).slice(0, 2)

  const dividerH = interpolate(frame, [20, 50], [0, 1], { extrapolateRight:'clamp' })

  return (
    <AbsoluteFill>
      <PexelsBg url={slide.pexelsUrl} frame={frame} total={dur} dir="out" scale={1.05} overlay="dark" themeBg={T.bg} />

      <AbsoluteFill style={{ padding:'50px 80px', display:'flex', flexDirection:'column', zIndex:5 }}>
        <AnimWords text={slide.title} frame={frame} start={6} size={38} color={T.text} spacing={-1} />
        <AccentLine frame={frame} start={18} color={accent} width={50} />

        <div style={{ display:'flex', flex:1, gap:0, position:'relative' }}>
          {/* Center divider */}
          <div style={{
            position:'absolute', left:'50%', top:0,
            width:2, height:`${dividerH*100}%`,
            background:`linear-gradient(to bottom,${accent},${accent}00)`,
            transform:'translateX(-50%)',
          }} />

          {cols.map((col, ci) => {
            const slideInValue = interpolate(frame, [24 + ci*8, 50 + ci*8], [ci===0?-60:60, 0], { extrapolateRight: 'clamp' })
            const slideIn = `${slideInValue}%`
            return (
              <div key={ci} style={{
                flex:1, padding:`20px ${ci===0?'32px 20px 20px':'20px 20px 20px 32px'}`,
                transform:`translateX(${slideIn})`,
                opacity: interpolate(frame,[24+ci*8,50+ci*8],[0,1],{extrapolateRight:'clamp'}),
              }}>
                <div style={{
                  fontSize:11, fontWeight:800, color: ci===0?accent:T.sub,
                  letterSpacing:'.22em', textTransform:'uppercase', marginBottom:20,
                  fontFamily:"'DM Sans',system-ui,sans-serif",
                }}>{col.label}</div>
                {(col.items || []).map((item, j) => {
                  const ip = prog(frame, 36 + ci*8 + j*9, 18)
                  return (
                    <div key={j} style={{
                      display:'flex', alignItems:'flex-start', gap:12,
                      marginBottom:14, opacity:ip,
                      transform:`translateX(${(1-ip)*(ci===0?-30:30)}px)`,
                    }}>
                      <div style={{
                        width:20, height:20, borderRadius:'50%',
                        background: ci===0?`${accent}25`:`${T.sub.replace(/[^,]+\)/, '.12)')}`,
                        border:`1.5px solid ${ci===0?accent:T.sub}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink:0, marginTop:2,
                      }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:ci===0?accent:T.sub }} />
                      </div>
                      <span style={{ fontSize:17, color: T.dark?'rgba(255,255,255,.78)':'rgba(26,26,46,.78)', lineHeight:1.45, fontFamily:"'DM Sans',system-ui,sans-serif", fontWeight:450 }}>
                        {item}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      {logoUrl && <img src={logoUrl} alt="logo" style={{ position:'absolute',top:24,right:24,height:26,objectFit:'contain',filter:T.dark?'brightness(0) invert(1)':'none',opacity:.55,zIndex:10 }} />}
      <SlideNum n={slideNum} total={totalSlides} accent={accent} isDark={T.dark} />
      <Wipe frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE TYPE 7 — TIMELINE  (animated horizontal timeline)
// ═══════════════════════════════════════════════════════════════
export function TimelineSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const items  = (slide.timeline || []).slice(0, 5)

  const lineW = interpolate(frame, [20, 65], [0, 1], { extrapolateRight:'clamp' })

  return (
    <AbsoluteFill>
      <PexelsBg url={slide.pexelsUrl} frame={frame} total={dur} dir="in" scale={1.07} overlay="dark" themeBg={T.bg} />

      <AbsoluteFill style={{ padding:'55px 90px', display:'flex', flexDirection:'column', zIndex:5 }}>
        <AnimWords text={slide.title} frame={frame} start={6} size={38} color={T.text} spacing={-1} />
        <AccentLine frame={frame} start={18} color={accent} width={52} />

        {/* Horizontal rule */}
        <div style={{ position:'relative', marginTop:20, marginBottom:0 }}>
          <div style={{
            height:2, width:`${lineW*100}%`,
            background:`linear-gradient(to right,${accent},${accent}44)`,
            borderRadius:2,
          }} />

          {/* Timeline dots + labels */}
          <div style={{ display:'flex', justifyContent:'space-between', position:'relative', marginTop:0 }}>
            {items.map((item, i) => {
              const delay = 28 + i * 14
              const sc = spring({ frame: Math.max(0, frame - delay), fps, config:{ damping:10, stiffness:80 } })
              const p  = prog(frame, delay + 6, 20)
              const isActive = i === 0
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>
                  {/* Dot on the line */}
                  <div style={{
                    width: isActive ? 18 : 12,
                    height: isActive ? 18 : 12,
                    borderRadius:'50%',
                    background: isActive ? accent : `${accent}55`,
                    border:`2px solid ${accent}`,
                    transform:`scale(${sc}) translateY(-8px)`,
                    boxShadow: isActive ? `0 0 20px ${accent}80` : 'none',
                    marginTop:-8,
                  }} />
                  {/* Label below */}
                  <div style={{ textAlign:'center', marginTop:16, opacity:p }}>
                    <div style={{ fontSize:11, fontWeight:700, color:accent, letterSpacing:'.12em', textTransform:'uppercase', fontFamily:"'DM Sans',system-ui,sans-serif", marginBottom:4 }}>
                      {item.date}
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, fontFamily:"'DM Sans',system-ui,sans-serif", lineHeight:1.35, maxWidth:120, textAlign:'center' }}>
                      {item.label}
                    </div>
                    {item.desc && (
                      <div style={{ fontSize:11, color:T.sub, marginTop:4, maxWidth:110, textAlign:'center', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
                        {item.desc}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Optional subtitle */}
        {slide.subtitle && (
          <div style={{ marginTop:32 }}>
            <AnimSub text={slide.subtitle} frame={frame} start={60} size={17} color={T.sub} />
          </div>
        )}
      </AbsoluteFill>

      {logoUrl && <img src={logoUrl} alt="logo" style={{ position:'absolute',top:24,right:24,height:26,objectFit:'contain',filter:T.dark?'brightness(0) invert(1)':'none',opacity:.55,zIndex:10 }} />}
      <SlideNum n={slideNum} total={totalSlides} accent={accent} isDark={T.dark} />
      <Wipe frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE TYPE 8 — CTA  (full-screen centered, pulsing ring)
// ═══════════════════════════════════════════════════════════════
export function CTASlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur, fps } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  const ringPulse = Math.sin(frame * .07) * 0.06 + 1
  const btnSc     = spring({ frame: Math.max(0, frame - 42), fps, config:{ damping:12, stiffness:75 } })

  return (
    <AbsoluteFill>
      <PexelsBg url={slide.pexelsUrl} frame={frame} total={dur} dir="in" scale={1.06} overlay="luxury" themeBg={T.bg} />
      <Particles frame={frame} accent={accent} n={24} />

      {/* Pulsing ring */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:`translate(-50%,-50%) scale(${ringPulse})`,
        width:480, height:480, borderRadius:'50%',
        border:`1px solid ${accent}25`,
        pointerEvents:'none',
      }} />
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:`translate(-50%,-50%) scale(${1/ringPulse})`,
        width:320, height:320, borderRadius:'50%',
        border:`1px solid ${accent}18`,
        pointerEvents:'none',
      }} />

      <AbsoluteFill style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 140px', textAlign:'center', zIndex:5 }}>
        <div style={{ fontSize:10, fontWeight:700, color:accent, letterSpacing:'.32em', textTransform:'uppercase', marginBottom:18, opacity: prog(frame,8,18), fontFamily:"'DM Sans',system-ui,sans-serif" }}>
          {slide.sectionTag || 'Next Step'}
        </div>

        <AnimWords text={slide.title} frame={frame} start={14} size={62} color={T.text} spacing={-2.5} style={{ justifyContent:'center' }} />

        {slide.subtitle && (
          <div style={{ marginTop:18, maxWidth:560 }}>
            <AnimSub text={slide.subtitle} frame={frame} start={30} size={18} color={T.sub} style={{ textAlign:'center' }} />
          </div>
        )}

        {slide.cta && (
          <div style={{
            marginTop:44,
            transform:`scale(${btnSc})`,
            background:`linear-gradient(135deg,${accent},${slide.accentAlt||accent}cc)`,
            color:'#fff', borderRadius:100, padding:'18px 58px',
            fontSize:18, fontWeight:800, letterSpacing:'.06em',
            fontFamily:"'DM Sans',system-ui,sans-serif",
            boxShadow:`0 10px 50px ${accent}60`,
          }}>{slide.cta}</div>
        )}
      </AbsoluteFill>

      {logoUrl && <img src={logoUrl} alt="logo" style={{ position:'absolute',top:24,right:24,height:26,objectFit:'contain',filter:T.dark?'brightness(0) invert(1)':'none',opacity:.55,zIndex:10 }} />}
      <SlideNum n={slideNum} total={totalSlides} accent={accent} isDark={T.dark} />
      <Wipe frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SLIDE TYPE 9 — AGENDA / CONTENT / GENERIC
// ═══════════════════════════════════════════════════════════════
export function AgendaSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames: dur } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const items  = (slide.bullets || slide.items || []).slice(0, 6)

  return (
    <AbsoluteFill>
      <PexelsBg url={slide.pexelsUrl} frame={frame} total={dur} dir="out" scale={1.06} overlay="side" themeBg={T.bg} />

      <AbsoluteFill style={{ padding:'55px 90px', display:'flex', flexDirection:'column', justifyContent:'center', zIndex:5 }}>
        <AnimWords text={slide.title} frame={frame} start={8} size={42} color={T.text} spacing={-1.5} />
        <AccentLine frame={frame} start={20} color={accent} width={56} />

        {slide.subtitle && (
          <div style={{ marginBottom:20 }}>
            <AnimSub text={slide.subtitle} frame={frame} start={28} size={17} color={T.sub} />
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {items.map((item, i) => {
            const p = prog(frame, 28 + i * 10, 20)
            const label = typeof item === 'string' ? item : item.label || item.name || ''
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:16, opacity:p, transform:`translateX(${(1-p)*-45}px)` }}>
                <div style={{
                  width:32, height:32, borderRadius:10, flexShrink:0,
                  background:`${accent}20`, border:`1px solid ${accent}55`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <span style={{ fontSize:12, color:accent, fontWeight:700, fontFamily:"'DM Sans',system-ui,sans-serif" }}>{String(i+1).padStart(2,'0')}</span>
                </div>
                <span style={{ fontSize:18, color: T.dark?'rgba(255,255,255,.82)':'rgba(26,26,46,.82)', fontWeight:500, fontFamily:"'DM Sans',system-ui,sans-serif", lineHeight:1.4 }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      {logoUrl && <img src={logoUrl} alt="logo" style={{ position:'absolute',top:24,right:24,height:26,objectFit:'contain',filter:T.dark?'brightness(0) invert(1)':'none',opacity:.55,zIndex:10 }} />}
      <SlideNum n={slideNum} total={totalSlides} accent={accent} isDark={T.dark} />
      <Wipe frame={frame} total={dur} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MASTER COMPOSITION — sequences all slides
// ═══════════════════════════════════════════════════════════════
const SLIDE_MAP = {
  cover:      CoverSlide,
  bullets:    BulletsSlide,
  content:    BulletsSlide,
  stats:      StatsSlide,
  quote:      QuoteSlide,
  section:    SectionSlide,
  comparison: ComparisonSlide,
  timeline:   TimelineSlide,
  cta:        CTASlide,
  agenda:     AgendaSlide,
  team:       AgendaSlide,
  default:    AgendaSlide,
}

export default function DeckComposition({
  slides      = [],
  themeId     = 'obsidian',
  logoUrl     = null,
  slideDur    = 150,   // 5 s @ 30 fps
}) {
  const { fps } = useVideoConfig()
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