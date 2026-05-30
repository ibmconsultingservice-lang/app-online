/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║      SlideCompositions.jsx  — LUMINA SYSTEM                     ║
 * ║                                                                  ║
 * ║  Aesthetic: "Luminous Glass Cosmos"                             ║
 * ║  A presentation where light itself is the designer.             ║
 * ║                                                                  ║
 * ║  Signature effects:                                             ║
 * ║  · Volumetric smoke clouds (layered SVG turbulence blur)        ║
 * ║  · Prismatic light beams (angled translucent shafts)            ║
 * ║  · Aurora glass panels (backdrop-filter + gradient mesh)        ║
 * ║  · Bioluminescent particle fields                               ║
 * ║  · Liquid light bloom halos                                     ║
 * ║  · Silk transition curtains (cubic easing morphs)               ║
 * ║  · Holographic shimmer surfaces                                 ║
 * ║                                                                  ║
 * ║  Motion language: silky smooth, elastic, energetic — NO hard   ║
 * ║  cuts, everything breathes and flows.                           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig,
  interpolate, spring, Img,
} from 'remotion'

// ─── Easing functions ────────────────────────────────────────────
const easeOutExpo  = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
const easeOutQuint = t => 1 - Math.pow(1 - t, 5)
const easeOutBack  = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
const easeInOutSine= t => -(Math.cos(Math.PI * t) - 1) / 2
const easeInOutCubic=t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2
const easeOutElastic=t => { const c4=(2*Math.PI)/3; return t===0?0:t===1?1:Math.pow(2,-10*t)*Math.sin((t*10-0.75)*c4)+1 }

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const prog  = (frame, start, dur, ease = easeOutExpo) =>
  ease(clamp((frame - start) / dur, 0, 1))

// ─── Themes ─────────────────────────────────────────────────────
const THEMES = {
  obsidian:  { bg:'#030510', glow:'#4F46E5', glow2:'#7C3AED', glow3:'#EC4899', accent:'#818CF8', text:'#F0F4FF', sub:'rgba(224,231,255,0.55)', glass:'rgba(255,255,255,0.04)', glassBorder:'rgba(255,255,255,0.1)' },
  aurora:    { bg:'#020C18', glow:'#0EA5E9', glow2:'#06B6D4', glow3:'#10B981', accent:'#38BDF8', text:'#E0F9FF', sub:'rgba(186,230,255,0.55)', glass:'rgba(14,165,233,0.06)', glassBorder:'rgba(56,189,248,0.15)' },
  ember:     { bg:'#0A0502', glow:'#F97316', glow2:'#EF4444', glow3:'#FBBF24', accent:'#FB923C', text:'#FFF7ED', sub:'rgba(255,237,213,0.55)', glass:'rgba(249,115,22,0.06)', glassBorder:'rgba(251,146,60,0.15)' },
  crimson:   { bg:'#080208', glow:'#EC4899', glow2:'#F43F5E', glow3:'#A855F7', accent:'#F472B6', text:'#FDF2F8', sub:'rgba(252,231,243,0.55)', glass:'rgba(236,72,153,0.06)', glassBorder:'rgba(244,114,182,0.15)' },
  arctic:    { bg:'#010A12', glow:'#22D3EE', glow2:'#0EA5E9', glow3:'#6366F1', accent:'#67E8F9', text:'#ECFEFF', sub:'rgba(207,250,254,0.55)', glass:'rgba(34,211,238,0.05)', glassBorder:'rgba(103,232,249,0.14)' },
  forest:    { bg:'#010A04', glow:'#22C55E', glow2:'#10B981', glow3:'#84CC16', accent:'#4ADE80', text:'#F0FFF4', sub:'rgba(220,252,231,0.55)', glass:'rgba(34,197,94,0.05)', glassBorder:'rgba(74,222,128,0.14)' },
}

// ─── Noise grain ────────────────────────────────────────────────
const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`

// ─── Oscillators ────────────────────────────────────────────────
const sin  = (frame, amp, freq, phase = 0) => Math.sin(frame * freq + phase) * amp
const cos  = (frame, amp, freq, phase = 0) => Math.cos(frame * freq + phase) * amp

// ═══════════════════════════════════════════════════════════════
//  SHARED VISUAL ATOMS
// ═══════════════════════════════════════════════════════════════

/** Film-smooth transition — silk curtain dissolve */
function SilkTransition({ frame, total, color = '#000' }) {
  const fadeIn  = frame < 18  ? interpolate(frame, [0, 18],  [1, 0], { extrapolateRight:'clamp', easing: easeOutQuint }) : 0
  const fadeOut = frame > total - 14 ? interpolate(frame, [total-14, total], [0, 0.88], { extrapolateLeft:'clamp', easing: easeInOutCubic }) : 0
  const op = Math.max(fadeIn, fadeOut)
  if (op <= 0.01) return null
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, ${color}00 0%, ${color} 100%)`,
      opacity: op, pointerEvents:'none', zIndex:200,
    }}/>
  )
}

/** Volumetric smoke — layered SVG blur clouds */
function Smoke({ frame, color1, color2, opacity = 0.12 }) {
  const drifts = [
    { x: sin(frame, 60, 0.004, 0),    y: cos(frame, 40, 0.005, 0),    scale: 1 + sin(frame, 0.08, 0.007, 0) },
    { x: sin(frame, 80, 0.003, 2.1),  y: cos(frame, 55, 0.004, 1.5),  scale: 1 + sin(frame, 0.1,  0.006, 1.2) },
    { x: sin(frame, 50, 0.006, 4.2),  y: cos(frame, 35, 0.005, 3.0),  scale: 1 + sin(frame, 0.07, 0.008, 2.5) },
    { x: sin(frame, 70, 0.0035,1.0),  y: cos(frame, 45, 0.0055,2.2),  scale: 1 + sin(frame, 0.09, 0.0065,0.7) },
  ]
  return (
    <AbsoluteFill style={{ pointerEvents:'none', overflow:'hidden' }}>
      {drifts.map((d,i) => (
        <div key={i} style={{
          position:'absolute',
          width: 900 + i*150, height: 900 + i*150,
          borderRadius:'50%',
          background: i % 2 === 0
            ? `radial-gradient(circle, ${color1}${Math.round(opacity*255).toString(16).padStart(2,'0')} 0%, transparent 70%)`
            : `radial-gradient(circle, ${color2}${Math.round(opacity*0.7*255).toString(16).padStart(2,'0')} 0%, transparent 65%)`,
          filter:`blur(${70 + i*20}px)`,
          left: `${20 + i*18}%`,
          top:  `${10 + i*14}%`,
          transform:`translate(${d.x}px, ${d.y}px) scale(${d.scale})`,
          opacity: 0.7 + i*0.08,
        }}/>
      ))}
    </AbsoluteFill>
  )
}

/** Prismatic light beams — angled volumetric shafts */
function LightBeams({ frame, accent, count = 5 }) {
  return (
    <AbsoluteFill style={{ pointerEvents:'none', overflow:'hidden' }}>
      {Array.from({length: count}, (_,i) => {
        const angle    = -38 + i * 14
        const x        = -10 + i * 22
        const opacity  = (0.04 + i*0.012) * (0.6 + sin(frame, 0.4, 0.012, i*1.8))
        const w        = 60 + i*28
        const drift    = sin(frame, 18, 0.008, i*2.1)
        return (
          <div key={i} style={{
            position:'absolute',
            left:`${x + drift * 0.3}%`,
            top:'-20%', bottom:'-20%',
            width: w,
            background:`linear-gradient(to bottom, transparent 0%, ${accent}44 25%, ${accent}66 50%, ${accent}44 75%, transparent 100%)`,
            transform:`rotate(${angle}deg)`,
            filter:'blur(18px)',
            opacity,
            mixBlendMode:'screen',
          }}/>
        )
      })}
    </AbsoluteFill>
  )
}

/** Aurora glass panel — the signature UI surface */
function GlassPanel({ x, y, w, h, frame, startF, children, T, borderAccent, style = {} }) {
  const scale  = prog(frame, startF, 22, easeOutBack)
  const fadeIn = prog(frame, startF, 18, easeOutExpo)
  return (
    <div style={{
      position:'absolute', left:x, top:y, width:w, height:h,
      background:`linear-gradient(135deg, ${T.glass}, rgba(255,255,255,0.02))`,
      backdropFilter:'blur(24px) saturate(1.6)',
      WebkitBackdropFilter:'blur(24px) saturate(1.6)',
      border:`1px solid ${borderAccent || T.glassBorder}`,
      borderRadius: 20,
      boxShadow:`0 8px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)`,
      transform:`scale(${scale})`,
      opacity: fadeIn,
      overflow:'hidden',
      ...style,
    }}>
      {/* Inner shimmer highlight */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:1,
        background:`linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)`,
      }}/>
      {children}
    </div>
  )
}

/** Holographic shimmer strip — moves across a surface */
function HoloShimmer({ frame, color, speed = 0.8 }) {
  const x = ((frame * speed) % 130) - 30
  return (
    <div style={{
      position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', borderRadius:'inherit',
    }}>
      <div style={{
        position:'absolute', top:0, bottom:0,
        left:`${x}%`, width:'30%',
        background:`linear-gradient(105deg, transparent, ${color}14 45%, ${color}28 50%, ${color}14 55%, transparent)`,
        filter:'blur(2px)',
      }}/>
    </div>
  )
}

/** Particle constellation — glowing floating dots */
function Particles({ frame, accent, count = 55, seed = 1 }) {
  return (
    <AbsoluteFill style={{ pointerEvents:'none' }}>
      {Array.from({length:count}, (_,i) => {
        const s    = (seed * 1000 + i * 419.7) % 1000 / 1000
        const s2   = (seed * 1000 + i * 731.3) % 1000 / 1000
        const s3   = (seed * 1000 + i * 227.1) % 1000 / 1000
        const s4   = (seed * 1000 + i * 583.9) % 1000 / 1000
        const px   = s  * 100
        const py   = s2 * 100
        const r    = 0.8 + s3 * 3.2
        const spd  = 0.008 + s4 * 0.018
        const ph   = s * Math.PI * 2
        const driftX = sin(frame, 22, spd, ph)
        const driftY = cos(frame, 16, spd * 1.3, ph + 1.2)
        const pulse  = 0.3 + s3 * 0.5 + sin(frame, 0.25, spd * 0.8, ph) * 0.25
        const delay  = Math.floor(s4 * 35)
        const fadeIn = prog(frame, delay, 25, easeOutExpo)
        const isLink = i % 7 === 0 && i > 0 // some particles have connecting lines
        const prevS  = (seed * 1000 + (i-7) * 419.7) % 1000 / 1000
        const prevS2 = (seed * 1000 + (i-7) * 731.3) % 1000 / 1000
        return (
          <div key={i}>
            {/* Glow halo */}
            <div style={{
              position:'absolute',
              left:`${px + driftX * 0.1}%`, top:`${py + driftY * 0.1}%`,
              width: r * 8, height: r * 8,
              borderRadius:'50%',
              background:`radial-gradient(circle, ${accent}55, transparent 70%)`,
              transform:'translate(-50%,-50%)',
              opacity: pulse * fadeIn * 0.5,
            }}/>
            {/* Core dot */}
            <div style={{
              position:'absolute',
              left:`${px + driftX * 0.1}%`, top:`${py + driftY * 0.1}%`,
              width: r * 2, height: r * 2,
              borderRadius:'50%',
              background: accent,
              transform:'translate(-50%,-50%)',
              opacity: pulse * fadeIn,
              boxShadow:`0 0 ${r * 4}px ${accent}`,
            }}/>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

/** Liquid bloom — large soft glow halo that breathes */
function Bloom({ cx, cy, radius, color, frame, phase = 0, opacity = 0.18 }) {
  const sc  = 1 + sin(frame, 0.12, 0.01, phase)
  const op  = opacity + sin(frame, opacity * 0.3, 0.008, phase + 1.5)
  return (
    <div style={{
      position:'absolute',
      left:`${cx}%`, top:`${cy}%`,
      width: radius * 2, height: radius * 2,
      borderRadius:'50%',
      background:`radial-gradient(circle, ${color} 0%, transparent 65%)`,
      filter:`blur(60px)`,
      transform:`translate(-50%,-50%) scale(${sc})`,
      opacity: op,
      pointerEvents:'none',
    }}/>
  )
}

/** Background — photo + luminous atmosphere */
function LuminousBg({ url, T, frame }) {
  return (
    <AbsoluteFill style={{ overflow:'hidden' }}>
      {/* Deep colour field */}
      <div style={{ position:'absolute', inset:0, background:T.bg }}/>
      {/* Photo layer */}
      {url && (
        <AbsoluteFill style={{ opacity:0.22, filter:'blur(8px) saturate(0.6)' }}>
          <Img src={url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        </AbsoluteFill>
      )}
      {/* Smoke atmosphere */}
      <Smoke frame={frame} color1={T.glow} color2={T.glow2} opacity={0.16}/>
      {/* Bloom halos */}
      <Bloom cx={80} cy={15} radius={500} color={T.glow}  frame={frame} phase={0}   opacity={0.14}/>
      <Bloom cx={10} cy={85} radius={440} color={T.glow2} frame={frame} phase={2.5} opacity={0.12}/>
      <Bloom cx={55} cy={50} radius={320} color={T.glow3} frame={frame} phase={5.0} opacity={0.07}/>
      {/* Light beams */}
      <LightBeams frame={frame} accent={T.glow} count={4}/>
      {/* Particles */}
      <Particles frame={frame} accent={T.accent} count={45} seed={3}/>
      {/* Noise grain */}
      <AbsoluteFill style={{
        backgroundImage: GRAIN, backgroundRepeat:'repeat', backgroundSize:'280px 280px',
        opacity:0.022, mixBlendMode:'overlay', pointerEvents:'none',
      }}/>
    </AbsoluteFill>
  )
}

/** Slide number — floating glass badge */
function SlideIndex({ n, total, accent, T }) {
  return (
    <div style={{
      position:'absolute', top:32, right:44, zIndex:50,
      display:'flex', alignItems:'center', gap:8,
      background:`linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
      backdropFilter:'blur(16px)',
      border:`1px solid rgba(255,255,255,0.08)`,
      borderRadius:99, padding:'5px 14px',
    }}>
      <div style={{width:6,height:6,borderRadius:'50%',background:accent,boxShadow:`0 0 8px ${accent}`}}/>
      <span style={{fontSize:10,fontWeight:700,color:accent,letterSpacing:'.2em',fontFamily:"'Courier New',monospace"}}>
        {String(n).padStart(2,'0')} / {String(total).padStart(2,'0')}
      </span>
    </div>
  )
}

/** Tag label — luminous pill */
function Tag({ text, frame, startF, accent }) {
  if (!text) return null
  const op = prog(frame, startF, 16, easeOutExpo)
  const tx = (1 - op) * -24
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:8, marginBottom:20,
      opacity: op, transform:`translateX(${tx}px)`,
    }}>
      <div style={{width:4,height:4,borderRadius:'50%',background:accent,boxShadow:`0 0 8px ${accent}`}}/>
      <span style={{
        fontSize:10, fontWeight:700, letterSpacing:'.32em', textTransform:'uppercase',
        color:accent, fontFamily:"'Courier New',monospace",
      }}>{text}</span>
      <div style={{width:24,height:1,background:`linear-gradient(to right,${accent},transparent)`}}/>
    </div>
  )
}

/** Headline — words bloom up with elastic spring */
function Headline({ text='', frame, startF, size=68, color='#fff', weight=700, serif=true, spacing=-2, lineH=0.94, maxW='100%' }) {
  const words = text.split(' ')
  const { fps } = useVideoConfig()
  return (
    <div style={{ display:'flex', flexWrap:'wrap', columnGap:'0.2em', rowGap:0, maxWidth:maxW }}>
      {words.map((w,i) => {
        const s = spring({ frame: Math.max(0, frame - startF - i*5), fps, config:{ damping:14, stiffness:100 } })
        return (
          <div key={i} style={{ overflow:'hidden', paddingBottom: size*0.15 }}>
            <div style={{
              display:'inline-block',
              transform:`translateY(${(1-s)*size*1.2}px)`,
              opacity: s > 0.02 ? 1 : 0,
              fontSize:size, fontWeight:weight, lineHeight:lineH, letterSpacing:spacing,
              color, fontFamily: serif
                ? "'Cormorant Garamond','Playfair Display','Georgia',serif"
                : "'DM Sans',system-ui,sans-serif",
            }}>{w}</div>
          </div>
        )
      })}
    </div>
  )
}

/** Sub text — smooth fade-up */
function Sub({ text='', frame, startF, size=17, color, maxW='100%', style={} }) {
  const op = prog(frame, startF, 24, easeOutExpo)
  const ty = (1 - op) * 18
  if (!text) return null
  return (
    <div style={{
      fontSize:size, color:color||'rgba(255,255,255,0.55)', lineHeight:1.65,
      fontFamily:"'DM Sans',system-ui,sans-serif", fontWeight:400, letterSpacing:'.01em',
      opacity:op, transform:`translateY(${ty}px)`, maxWidth:maxW, ...style,
    }}>{text}</div>
  )
}

/** Glowing ruled line */
function Rule({ frame, startF, accent, width=64, vertical=false }) {
  const op = prog(frame, startF, 20, easeOutExpo)
  if (vertical) return (
    <div style={{
      width:2, height:op*width, background:`linear-gradient(to bottom,${accent},${accent}44)`,
      boxShadow:`0 0 14px ${accent}88, 0 0 28px ${accent}44`, flexShrink:0,
    }}/>
  )
  return (
    <div style={{
      width:op*width, height:2, marginBottom:24,
      background:`linear-gradient(to right,${accent},${accent}44)`,
      boxShadow:`0 0 14px ${accent}88, 0 0 28px ${accent}44`,
    }}/>
  )
}

// ═══════════════════════════════════════════════════════════════
//  1 — COVER  "The Portal"
//  Central glass orb, headline orbiting it, smoke vortex
// ═══════════════════════════════════════════════════════════════
export function CoverSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  // Central orb
  const orbSc  = spring({ frame: Math.max(0,frame-4), fps, config:{damping:12,stiffness:60} })
  const orbPulse = 1 + sin(frame,0.04,0.015)

  // Rotating ring
  const ringRot = frame * 0.35

  // Headline slides up from below orb
  const headlineY = interpolate(frame,[28,52],[60,0],{extrapolateRight:'clamp',easing:easeOutBack})
  const headlineOp = prog(frame,28,22,easeOutExpo)

  return (
    <AbsoluteFill style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>

      {/* Extra strong central bloom for cover */}
      <Bloom cx={50} cy={42} radius={600} color={T.glow} frame={frame} opacity={0.22}/>

      {/* Central glass orb */}
      <div style={{
        position:'absolute', left:'50%', top:'38%',
        width:320, height:320, borderRadius:'50%',
        transform:`translate(-50%,-50%) scale(${orbSc * orbPulse})`,
        background:`radial-gradient(circle at 35% 35%, rgba(255,255,255,0.12), rgba(255,255,255,0.02) 60%, transparent)`,
        backdropFilter:'blur(32px)',
        border:`1px solid rgba(255,255,255,0.15)`,
        boxShadow:`0 0 80px ${T.glow}44, 0 0 160px ${T.glow}22, inset 0 1px 0 rgba(255,255,255,0.18)`,
      }}>
        {/* Inner ring detail */}
        <div style={{
          position:'absolute', inset:20, borderRadius:'50%',
          border:`1px solid rgba(255,255,255,0.06)`,
        }}/>
        <div style={{
          position:'absolute', inset:45, borderRadius:'50%',
          border:`1px dashed ${accent}30`,
          transform:`rotate(${ringRot}deg)`,
        }}/>
        {/* Centre glow dot */}
        <div style={{
          position:'absolute',top:'50%',left:'50%',
          width:40,height:40,borderRadius:'50%',
          background:`radial-gradient(circle,${accent},transparent 70%)`,
          transform:'translate(-50%,-50%)',
          filter:`blur(4px)`,
          opacity:0.8,
        }}/>
        <HoloShimmer frame={frame} color={accent} speed={0.4}/>
      </div>

      {/* Orbiting small orbs */}
      {[0,1,2].map(i => {
        const angle = (frame * (0.3 + i*0.1) + i * 120) * Math.PI / 180
        const rx = 185, ry = 185
        const ox = Math.cos(angle)*rx
        const oy = Math.sin(angle)*ry
        const r  = 8 + i*4
        return (
          <div key={i} style={{
            position:'absolute', left:'50%', top:'38%',
            width: r*2, height: r*2, borderRadius:'50%',
            background:`radial-gradient(circle,${T.glow2},transparent 70%)`,
            boxShadow:`0 0 ${r*3}px ${T.glow2}`,
            transform:`translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`,
            opacity: 0.6 + sin(frame,0.2,0.02,i*2),
          }}/>
        )
      })}

      {/* Text below orb */}
      <div style={{
        position:'absolute', left:0, right:0, top:'60%',
        display:'flex', flexDirection:'column', alignItems:'center',
        opacity:headlineOp, transform:`translateY(${headlineY}px)`,
      }}>
        <Tag text={slide.badge||'Presentation'} frame={frame} startF={28} accent={accent}/>
        <div style={{
          fontSize:56, fontWeight:800, letterSpacing:-2.5, lineHeight:0.94,
          fontFamily:"'Cormorant Garamond','Georgia',serif",
          color:T.text, textAlign:'center', maxWidth:'70%',
          textShadow:`0 0 80px ${accent}44`,
        }}>{slide.title}</div>
        {slide.subtitle && (
          <div style={{
            marginTop:14, fontSize:16, color:T.sub, textAlign:'center',
            maxWidth:'50%', lineHeight:1.65, letterSpacing:'.02em',
            opacity: prog(frame,42,20,easeOutExpo),
          }}>{slide.subtitle}</div>
        )}
        {slide.presenter && (
          <div style={{
            marginTop:28, display:'flex', alignItems:'center', gap:12,
            opacity: prog(frame,52,20,easeOutExpo),
          }}>
            <div style={{width:28,height:1,background:`linear-gradient(to right,transparent,${accent})`}}/>
            <span style={{fontSize:12,fontWeight:600,color:accent,letterSpacing:'.14em',fontFamily:"'Courier New',monospace"}}>
              {slide.presenter}{slide.date ? ` — ${slide.date}` : ''}
            </span>
            <div style={{width:28,height:1,background:`linear-gradient(to left,transparent,${accent})`}}/>
          </div>
        )}
      </div>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  2 — BULLETS  "The Manifold"
//  Vertical glass cards stagger in with glow rows
// ═══════════════════════════════════════════════════════════════
export function BulletsSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const bullets = (slide.bullets||[]).slice(0,5)

  return (
    <AbsoluteFill>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>
      <Bloom cx={88} cy={20} radius={480} color={T.glow3} frame={frame} opacity={0.18}/>

      <AbsoluteFill style={{ padding:'56px 64px', display:'flex', gap:52, alignItems:'stretch', zIndex:10 }}>
        {/* Left — heading */}
        <div style={{width:260, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center'}}>
          <GlassPanel x={0} y={0} w={240} h={'auto'} frame={frame} startF={4} T={T}
            style={{position:'relative',width:240,height:'auto',padding:'32px 28px'}}>
            <Tag text={slide.sectionTag} frame={frame} startF={8} accent={accent}/>
            <Headline text={slide.title} frame={frame} startF={12} size={38} color={T.text} serif spacing={-1}/>
            <div style={{height:24}}/>
            <Rule frame={frame} startF={28} accent={accent} width={50}/>
            <Sub text={slide.subtitle} frame={frame} startF={32} size={13} color={T.sub}/>
            <HoloShimmer frame={frame} color={accent} speed={0.35}/>
          </GlassPanel>
        </div>

        {/* Right — bullet rows */}
        <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:12}}>
          {bullets.map((b, i) => {
            const p2   = prog(frame, 20+i*10, 22, easeOutBack)
            const tx   = (1-p2)*60
            const isActive = i === 0
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:20,
                padding:'20px 28px',
                background: isActive
                  ? `linear-gradient(135deg, ${T.glow}18, ${T.glass})`
                  : `linear-gradient(135deg, ${T.glass}, rgba(255,255,255,0.01))`,
                backdropFilter:'blur(20px)',
                border:`1px solid ${isActive ? accent+'44' : T.glassBorder}`,
                borderRadius:16,
                boxShadow: isActive ? `0 4px 40px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.08)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                opacity:p2, transform:`translateX(${tx}px)`,
                overflow:'hidden', position:'relative',
              }}>
                {/* Glow left edge bar */}
                <div style={{
                  position:'absolute', left:0, top:0, bottom:0, width:3,
                  background: isActive ? accent : `${accent}50`,
                  boxShadow: isActive ? `0 0 16px ${accent}` : 'none',
                  borderRadius:'3px 0 0 3px',
                }}/>
                {/* Number */}
                <span style={{
                  fontSize:11, fontWeight:800, color: isActive?accent:`${accent}80`,
                  fontFamily:"'Courier New',monospace", letterSpacing:'.14em',
                  flexShrink:0, minWidth:28, paddingLeft:12,
                }}>{String(i+1).padStart(2,'0')}</span>
                {/* Divider */}
                <div style={{width:1,height:28,background:`${accent}30`,flexShrink:0}}/>
                {/* Text */}
                <span style={{
                  fontSize:19, color: T.text, fontWeight:500, lineHeight:1.45,
                  fontFamily:"'DM Sans',system-ui,sans-serif",
                }}>{b}</span>
                {/* Shimmer on active */}
                {isActive && <HoloShimmer frame={frame} color={accent} speed={0.5}/>}
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  3 — STATS  "The Constellation"
//  Floating glass metric cards with counting numbers + bloom
// ═══════════════════════════════════════════════════════════════
export function StatsSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const stats  = (slide.stats||[]).slice(0,4)

  return (
    <AbsoluteFill>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>

      {/* Extra centre bloom for energy */}
      <Bloom cx={50} cy={55} radius={520} color={T.glow2} frame={frame} opacity={0.2}/>

      <AbsoluteFill style={{ padding:'56px 64px', display:'flex', flexDirection:'column', zIndex:10 }}>
        <div style={{marginBottom:32}}>
          <Tag text={slide.sectionTag||'Metrics'} frame={frame} startF={6} accent={accent}/>
          <Headline text={slide.title} frame={frame} startF={10} size={42} color={T.text} serif spacing={-1.5}/>
          <div style={{height:8}}/>
          <Rule frame={frame} startF={24} accent={accent} width={55}/>
        </div>

        <div style={{display:'flex', gap:18, flex:1, alignItems:'stretch'}}>
          {stats.map((s,i) => {
            const sc  = spring({ frame:Math.max(0,frame-(22+i*12)), fps, config:{damping:11,stiffness:85} })
            const raw = parseFloat((s.value||'').replace(/[^0-9.]/g,'')) || 0
            const suffix = (s.value||'').replace(/[0-9.]/g,'')
            const counted = Math.round(raw * clamp((frame-22-i*12)/35, 0, 1))
            const floatY  = sin(frame, 5, 0.024, i*1.7)
            const isHero  = i === 0

            return (
              <div key={i} style={{
                flex:1,
                transform:`scale(${sc}) translateY(${floatY}px)`,
                position:'relative', display:'flex', flexDirection:'column',
              }}>
                {/* Bloom under the card */}
                <div style={{
                  position:'absolute', inset:-20, borderRadius:'50%',
                  background:`radial-gradient(circle, ${T.glow}22, transparent 70%)`,
                  filter:'blur(30px)',
                  opacity:0.6 + sin(frame,0.2,0.012,i*2),
                }}/>

                <div style={{
                  flex:1, padding:'32px 24px',
                  background: isHero
                    ? `linear-gradient(135deg, ${T.glow}20, ${T.glass})`
                    : `linear-gradient(135deg, ${T.glass}, rgba(255,255,255,0.015))`,
                  backdropFilter:'blur(28px)',
                  border:`1px solid ${isHero ? accent+'55' : T.glassBorder}`,
                  borderRadius:20,
                  boxShadow: isHero
                    ? `0 8px 60px ${accent}28, 0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)`
                    : `0 4px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
                  position:'relative', overflow:'hidden',
                }}>
                  {/* Large glowing number */}
                  <div style={{
                    fontSize:70, fontWeight:900, lineHeight:1, letterSpacing:-3,
                    fontFamily:"'Cormorant Garamond','Georgia',serif",
                    color: isHero ? accent : T.text,
                    textShadow: isHero ? `0 0 60px ${accent}66` : `0 0 40px ${T.glow}44`,
                  }}>
                    {raw ? `${counted}${suffix}` : s.value}
                  </div>
                  <div style={{
                    fontSize:10, fontWeight:700, marginTop:14, letterSpacing:'.24em',
                    textTransform:'uppercase', color:T.sub,
                    fontFamily:"'Courier New',monospace",
                  }}>{s.label}</div>
                  {s.desc && (
                    <div style={{fontSize:12,color:T.sub,marginTop:8,opacity:0.75,lineHeight:1.55}}>
                      {s.desc}
                    </div>
                  )}
                  {/* Bottom glow line */}
                  <div style={{
                    position:'absolute', bottom:0, left:0, right:0, height:2,
                    background: isHero ? accent : `${accent}50`,
                    boxShadow: isHero ? `0 0 18px ${accent}` : 'none',
                    borderRadius:'0 0 20px 20px',
                    opacity: prog(frame,22+i*12,20,easeOutExpo),
                  }}/>
                  <HoloShimmer frame={frame} color={accent} speed={0.3+i*0.1}/>
                </div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  4 — QUOTE  "The Epiphany"
//  Massive translucent quotation mark, glass text surface
// ═══════════════════════════════════════════════════════════════
export function QuoteSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const qText  = slide.quote || slide.title || ''

  const qMarkSc = spring({ frame:Math.max(0,frame), fps, config:{damping:12,stiffness:40} })
  const textOp  = prog(frame,22,28,easeOutExpo)
  const textY   = (1-prog(frame,22,28,easeOutBack))*35

  return (
    <AbsoluteFill>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>
      <Bloom cx={50} cy={40} radius={580} color={T.glow} frame={frame} opacity={0.25}/>

      {/* Immense translucent quotation mark */}
      <div style={{
        position:'absolute', left:-20, top:-60,
        fontSize:600, lineHeight:0.85,
        fontFamily:"'Cormorant Garamond','Georgia',serif",
        color:T.glow, opacity:0.055,
        transform:`scale(${qMarkSc}) rotate(-5deg)`,
        pointerEvents:'none', userSelect:'none',
        textShadow:`0 0 200px ${T.glow}`,
        filter:`blur(2px)`,
      }}>"</div>

      <AbsoluteFill style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'80px 90px',zIndex:10}}>
        {/* Glass quote surface */}
        <div style={{
          maxWidth:880, width:'100%',
          padding:'52px 60px',
          background:`linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)`,
          backdropFilter:'blur(28px)',
          border:`1px solid rgba(255,255,255,0.1)`,
          borderRadius:28,
          boxShadow:`0 16px 80px rgba(0,0,0,0.4), 0 0 120px ${T.glow}18, inset 0 1px 0 rgba(255,255,255,0.12)`,
          opacity:textOp, transform:`translateY(${textY}px)`,
          position:'relative', overflow:'hidden',
        }}>
          {/* Top luminous border */}
          <div style={{
            position:'absolute', top:0, left:0, right:0, height:2,
            background:`linear-gradient(90deg, transparent, ${accent}, transparent)`,
            boxShadow:`0 0 20px ${accent}88`,
          }}/>

          <div style={{
            fontSize: qText.length>100?26:qText.length>60?32:40,
            fontWeight:300, color:T.text, lineHeight:1.6,
            fontFamily:"'Cormorant Garamond','Playfair Display',serif",
            fontStyle:'italic', letterSpacing:'.015em',
            textShadow:`0 0 80px ${T.glow}33`,
          }}>{qText}</div>

          {slide.author && (
            <div style={{
              marginTop:36, display:'flex', alignItems:'center', gap:16,
              opacity: prog(frame,40,20,easeOutExpo),
            }}>
              <div style={{width:36,height:2,background:accent,boxShadow:`0 0 10px ${accent}`}}/>
              <span style={{
                fontSize:12, fontWeight:700, color:accent,
                fontFamily:"'Courier New',monospace", letterSpacing:'.18em', textTransform:'uppercase',
              }}>{slide.author}</span>
            </div>
          )}
          <HoloShimmer frame={frame} color={accent} speed={0.25}/>
        </div>
      </AbsoluteFill>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  5 — SECTION  "The Threshold"
//  Full-bleed atmosphere, massive number portal, minimal text
// ═══════════════════════════════════════════════════════════════
export function SectionSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur, fps } = useVideoConfig()
  const T = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  const numSc  = spring({ frame:Math.max(0,frame-2), fps, config:{damping:16,stiffness:55} })
  const numPulse = 1 + sin(frame,0.025,0.01)

  return (
    <AbsoluteFill>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>
      {/* Mega-bloom for the number */}
      <Bloom cx={72} cy={50} radius={700} color={T.glow}  frame={frame} opacity={0.28}/>
      <Bloom cx={20} cy={65} radius={500} color={T.glow3} frame={frame} opacity={0.16}/>

      {/* Giant number portal — right side architectural weight */}
      <div style={{
        position:'absolute', right:-60, top:'50%',
        fontSize:480, fontWeight:900, lineHeight:1,
        fontFamily:"'Cormorant Garamond','Georgia',serif",
        color:'transparent',
        WebkitTextStroke:`1px ${accent}28`,
        transform:`translateY(-50%) scale(${numSc * numPulse}) rotate(-2deg)`,
        pointerEvents:'none', userSelect:'none',
        filter:`blur(0.5px) drop-shadow(0 0 60px ${T.glow}66)`,
      }}>{slide.sectionNumber||String(slideNum).padStart(2,'0')}</div>

      {/* Glass vertical number badge */}
      <div style={{
        position:'absolute', right:64, top:'50%',
        transform:`translateY(-50%)`,
        opacity: prog(frame,16,20,easeOutExpo),
      }}>
        <div style={{
          padding:'14px 18px',
          background:`linear-gradient(135deg, ${accent}22, ${accent}08)`,
          border:`1px solid ${accent}44`, borderRadius:14,
          backdropFilter:'blur(20px)',
          textAlign:'center',
        }}>
          <div style={{fontSize:11,fontWeight:700,color:accent,letterSpacing:'.3em',fontFamily:"'Courier New',monospace"}}>
            SEC
          </div>
          <div style={{fontSize:40,fontWeight:900,color:accent,lineHeight:1,fontFamily:"'Cormorant Garamond',serif",
            textShadow:`0 0 30px ${accent}`}}>
            {slide.sectionNumber||String(slideNum).padStart(2,'0')}
          </div>
        </div>
      </div>

      <AbsoluteFill style={{padding:'0 80px',display:'flex',flexDirection:'column',justifyContent:'center',maxWidth:'62%',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:28,opacity:prog(frame,10,18,easeOutExpo)}}>
          <div style={{width:4,height:4,borderRadius:'50%',background:accent,boxShadow:`0 0 8px ${accent}`}}/>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:'.38em',textTransform:'uppercase',color:accent,fontFamily:"'Courier New',monospace"}}>
            {slide.sectionTag||'Section'}
          </span>
          <div style={{flex:1,maxWidth:80,height:1,background:`linear-gradient(to right,${accent},transparent)`}}/>
        </div>

        <Headline text={slide.title} frame={frame} startF={14} size={78} color={T.text} serif spacing={-4} lineH={0.91} maxW="90%"/>

        <Sub text={slide.subtitle} frame={frame} startF={36} size={17} color={T.sub} style={{marginTop:28,maxWidth:460}}/>
      </AbsoluteFill>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  6 — COMPARISON  "The Duality"
//  Two glass panels with luminous divide, aurora contrast
// ═══════════════════════════════════════════════════════════════
export function ComparisonSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur } = useVideoConfig()
  const T    = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const cols   = (slide.columns||[]).slice(0,2)

  const seamH = prog(frame,16,36,easeOutExpo)

  return (
    <AbsoluteFill>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>
      <Bloom cx={50} cy={0}   radius={400} color={T.glow}  frame={frame} opacity={0.22}/>
      <Bloom cx={50} cy={100} radius={400} color={T.glow3} frame={frame} opacity={0.18}/>

      {/* Header glass bar */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:60,
        background:`linear-gradient(to bottom, rgba(255,255,255,0.06), transparent)`,
        backdropFilter:'blur(20px)',
        borderBottom:`1px solid rgba(255,255,255,0.07)`,
        display:'flex', alignItems:'center', paddingLeft:64,
        opacity: prog(frame,4,16,easeOutExpo), zIndex:15,
      }}>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:'.28em',textTransform:'uppercase',color:accent,fontFamily:"'Courier New',monospace"}}>
          {slide.title}
        </span>
      </div>

      {/* Luminous centre seam */}
      <div style={{
        position:'absolute', left:'50%', top:60, bottom:0,
        width:2, height:`${seamH*100}%`,
        background:`linear-gradient(to bottom, ${accent}, ${T.glow3})`,
        transform:'translateX(-50%)',
        boxShadow:`0 0 28px ${accent}88, 0 0 60px ${accent}44`,
        zIndex:10,
      }}/>
      {/* Centre orb on seam */}
      <div style={{
        position:'absolute', left:'50%', top:'50%',
        transform:'translate(-50%,-50%)',
        width:32, height:32, borderRadius:'50%',
        background:`radial-gradient(circle,${accent},${T.glow3})`,
        boxShadow:`0 0 30px ${accent}, 0 0 60px ${accent}66`,
        zIndex:11,
        opacity: prog(frame,24,16,easeOutElastic),
      }}/>

      {/* Two glass panels */}
      <div style={{position:'absolute',top:60,left:0,right:0,bottom:0,display:'flex',zIndex:5}}>
        {[0,1].map(ci => {
          const col     = cols[ci] || {}
          const p2      = prog(frame, 20+ci*12, 24, easeOutBack)
          const isLeft  = ci === 0
          const glowCol = isLeft ? T.glow : T.glow3
          return (
            <div key={ci} style={{
              flex:1, padding:'36px 52px',
              opacity:p2,
              transform:`translateX(${(1-p2)*(isLeft?-60:60)}px)`,
              position:'relative', overflow:'hidden',
            }}>
              {/* Subtle column atmosphere */}
              <div style={{
                position:'absolute', inset:0,
                background:`radial-gradient(ellipse at ${isLeft?'80%':'20%'} 40%, ${glowCol}0A 0%, transparent 70%)`,
                pointerEvents:'none',
              }}/>

              <div style={{
                fontSize:10, fontWeight:700, letterSpacing:'.28em',
                textTransform:'uppercase', marginBottom:24,
                color: isLeft?accent:T.glow3,
                fontFamily:"'Courier New',monospace",
                display:'flex', alignItems:'center', gap:12,
              }}>
                <div style={{width:20,height:2,background:isLeft?accent:T.glow3,boxShadow:`0 0 8px ${isLeft?accent:T.glow3}`}}/>
                {col.label||(isLeft?'Before':'After')}
              </div>

              {(col.items||[]).map((item,j) => {
                const ip = prog(frame,32+ci*12+j*8,18,easeOutBack)
                return (
                  <div key={j} style={{
                    display:'flex', gap:14, marginBottom:16,
                    opacity:ip, transform:`translateY(${(1-ip)*14}px)`,
                    alignItems:'flex-start',
                  }}>
                    <div style={{
                      width:6,height:6,borderRadius:'50%',flexShrink:0,marginTop:7,
                      background:isLeft?accent:T.glow3,
                      boxShadow:`0 0 8px ${isLeft?accent:T.glow3}`,
                    }}/>
                    <span style={{
                      fontSize:17,color:T.text,lineHeight:1.55,
                      fontFamily:"'DM Sans',system-ui,sans-serif",fontWeight:440,
                    }}>{item}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  7 — TIMELINE  "The Chronicle"
//  Glowing vertical spine, floating glass event cards
// ═══════════════════════════════════════════════════════════════
export function TimelineSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur, fps } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const items  = (slide.timeline||[]).slice(0,4)

  const spineH = prog(frame,16,44,easeOutExpo)

  return (
    <AbsoluteFill>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>
      <Bloom cx={15} cy={50} radius={450} color={T.glow2} frame={frame} opacity={0.2}/>

      <AbsoluteFill style={{padding:'52px 64px',display:'flex',gap:48,alignItems:'stretch',zIndex:10}}>
        {/* Left — heading glass */}
        <div style={{width:250,flexShrink:0}}>
          <GlassPanel x={0} y={0} w={230} h={'auto'} frame={frame} startF={4} T={T}
            style={{position:'relative',width:230,height:'auto',padding:'28px 24px',top:0,left:0}}>
            <Tag text={slide.sectionTag||'Timeline'} frame={frame} startF={8} accent={accent}/>
            <Headline text={slide.title} frame={frame} startF={12} size={36} color={T.text} serif spacing={-1}/>
            <div style={{height:20}}/>
            <Rule frame={frame} startF={26} accent={accent} width={44}/>
            <Sub text={slide.subtitle} frame={frame} startF={30} size={13} color={T.sub}/>
            <HoloShimmer frame={frame} color={accent} speed={0.3}/>
          </GlassPanel>
        </div>

        {/* Timeline body */}
        <div style={{flex:1,display:'flex',gap:32,alignItems:'stretch'}}>
          {/* Glowing spine */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:24}}>
            <div style={{
              width:2, height:`${spineH * 100}%`,
              background:`linear-gradient(to bottom, ${accent}, ${T.glow3})`,
              boxShadow:`0 0 20px ${accent}88, 0 0 40px ${accent}44`,
              borderRadius:99,
              flexShrink:0,
            }}/>
          </div>

          {/* Events */}
          <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'space-around',paddingBottom:24}}>
            {items.map((item,i) => {
              const sc  = spring({ frame:Math.max(0,frame-(24+i*14)), fps, config:{damping:12,stiffness:80} })
              const floatY = sin(frame,3,0.022,i*1.6)
              const isActive = i===0
              return (
                <div key={i} style={{
                  display:'flex', gap:20, alignItems:'flex-start',
                  transform:`scale(${sc}) translateY(${floatY}px)`,
                }}>
                  {/* Node */}
                  <div style={{
                    width:isActive?16:10, height:isActive?16:10,
                    borderRadius:'50%',
                    background:isActive?accent:`${accent}60`,
                    boxShadow:isActive?`0 0 20px ${accent}, 0 0 40px ${accent}66`:`0 0 10px ${accent}44`,
                    flexShrink:0, marginTop:6,
                    border:isActive?`2px solid rgba(255,255,255,0.2)`:'none',
                  }}/>

                  {/* Content glass card */}
                  <div style={{
                    flex:1, padding:'20px 22px',
                    background:isActive
                      ? `linear-gradient(135deg, ${T.glow}18, ${T.glass})`
                      : `linear-gradient(135deg, ${T.glass}, transparent)`,
                    backdropFilter:'blur(20px)',
                    border:`1px solid ${isActive?accent+'44':T.glassBorder}`,
                    borderRadius:16,
                    boxShadow:isActive?`0 4px 40px ${accent}22`:'none',
                    overflow:'hidden', position:'relative',
                  }}>
                    <div style={{fontSize:10,fontWeight:700,color:accent,letterSpacing:'.22em',fontFamily:"'Courier New',monospace",marginBottom:6}}>
                      {item.date}
                    </div>
                    <div style={{fontSize:17,fontWeight:700,color:T.text,fontFamily:"'DM Sans',system-ui,sans-serif",marginBottom:4}}>
                      {item.label}
                    </div>
                    {item.desc && (
                      <div style={{fontSize:13,color:T.sub,lineHeight:1.55}}>
                        {item.desc}
                      </div>
                    )}
                    {isActive && <HoloShimmer frame={frame} color={accent} speed={0.4}/>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </AbsoluteFill>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  8 — CTA  "The Summons"
//  Energetic bloom pulse, glass CTA button, radiating rings
// ═══════════════════════════════════════════════════════════════
export function CTASlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur, fps } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent

  const btnSc  = spring({ frame:Math.max(0,frame-44), fps, config:{damping:9,stiffness:80} })
  const btnPulse = 1 + sin(frame,0.035,0.08)

  // Radiating rings
  const rings = [0,22,44].map(offset => {
    const f  = (frame + offset) % 66
    const r  = interpolate(f,[0,66],[0,280],{extrapolateRight:'clamp'})
    const op = interpolate(f,[0,18,66],[0,0.55,0],{extrapolateRight:'clamp'})
    return { r, op }
  })

  return (
    <AbsoluteFill>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>
      <Bloom cx={50} cy={50} radius={680} color={T.glow} frame={frame} opacity={0.32}/>

      {/* SVG radiating rings */}
      <AbsoluteFill style={{pointerEvents:'none',zIndex:5}}>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} viewBox="0 0 1920 1080">
          {rings.map((ring,i)=>(
            <circle key={i} cx={960} cy={540} r={ring.r} fill="none"
              stroke={accent} strokeWidth={1.5} opacity={ring.op}
              filter="url(#ringBlur)"/>
          ))}
          <defs>
            <filter id="ringBlur"><feGaussianBlur stdDeviation="3"/></filter>
          </defs>
        </svg>
      </AbsoluteFill>

      <AbsoluteFill style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 100px',zIndex:10,textAlign:'center'}}>
        <Tag text={slide.sectionTag||'Next Step'} frame={frame} startF={8} accent={accent}/>
        <Headline text={slide.title} frame={frame} startF={14} size={68} color={T.text} serif spacing={-3} lineH={0.92} maxW="780px"/>

        <Sub text={slide.subtitle} frame={frame} startF={32} size={18} color={T.sub} style={{marginTop:18,maxWidth:560}}/>

        {slide.cta && (
          <div style={{
            marginTop:52,
            transform:`scale(${btnSc*btnPulse})`,
          }}>
            {/* Glow halo behind button */}
            <div style={{
              position:'absolute', inset:-20,
              background:`radial-gradient(circle,${accent}44,transparent 70%)`,
              filter:'blur(20px)', borderRadius:99,
              pointerEvents:'none',
            }}/>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:16, position:'relative',
              padding:'18px 52px',
              background:`linear-gradient(135deg, ${accent}, ${T.glow2})`,
              borderRadius:99,
              fontSize:15, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase',
              color:'#fff',
              boxShadow:`0 8px 48px ${accent}66, 0 2px 16px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.2)`,
              fontFamily:"'DM Sans',system-ui,sans-serif",
            }}>
              {slide.cta}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        )}
      </AbsoluteFill>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  9 — AGENDA / CONTENT  "The Index"
//  Numbered list with glass rows and glow accents
// ═══════════════════════════════════════════════════════════════
export function AgendaSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur } = useVideoConfig()
  const T     = THEMES[themeId] || THEMES.obsidian
  const accent = slide.accent || T.accent
  const items  = (slide.bullets||slide.items||[]).slice(0,6)

  return (
    <AbsoluteFill>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>
      <Bloom cx={90} cy={80} radius={500} color={T.glow3} frame={frame} opacity={0.18}/>

      <AbsoluteFill style={{padding:'52px 64px',display:'flex',gap:52,alignItems:'stretch',zIndex:10}}>
        {/* Left heading */}
        <div style={{width:260,flexShrink:0,display:'flex',flexDirection:'column',justifyContent:'center'}}>
          <GlassPanel x={0} y={0} w={240} h={'auto'} frame={frame} startF={4} T={T}
            style={{position:'relative',width:240,height:'auto',padding:'28px 24px',top:0,left:0}}>
            <Tag text={slide.sectionTag} frame={frame} startF={8} accent={accent}/>
            <Headline text={slide.title} frame={frame} startF={12} size={36} color={T.text} serif spacing={-1}/>
            <div style={{height:20}}/>
            <Rule frame={frame} startF={26} accent={accent} width={44}/>
            <Sub text={slide.subtitle} frame={frame} startF={30} size={13} color={T.sub}/>
            <HoloShimmer frame={frame} color={accent} speed={0.28}/>
          </GlassPanel>
        </div>

        {/* Right items */}
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',gap:10}}>
          {items.map((item,i) => {
            const p2    = prog(frame,24+i*9,22,easeOutBack)
            const tx    = (1-p2)*50
            const label = typeof item==='string'?item:item.label||item.name||''
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:18,
                padding:'18px 24px',
                background:`linear-gradient(135deg, ${T.glass}, rgba(255,255,255,0.01))`,
                backdropFilter:'blur(20px)',
                border:`1px solid ${T.glassBorder}`,
                borderRadius:14,
                opacity:p2, transform:`translateX(${tx}px)`,
                position:'relative', overflow:'hidden',
              }}>
                <span style={{
                  fontSize:11,fontWeight:800,color:accent,
                  fontFamily:"'Courier New',monospace",letterSpacing:'.14em',
                  flexShrink:0,minWidth:30,
                }}>{String(i+1).padStart(2,'0')}</span>
                <div style={{width:1,height:24,background:`${accent}30`,flexShrink:0}}/>
                <span style={{
                  fontSize:18,color:T.text,fontWeight:470,lineHeight:1.4,
                  fontFamily:"'DM Sans',system-ui,sans-serif",
                }}>{label}</span>
                {/* Subtle right glow on hover-state-like first item */}
                {i===0 && (
                  <div style={{
                    position:'absolute',right:0,top:0,bottom:0,width:3,
                    background:accent,boxShadow:`0 0 12px ${accent}`,
                    borderRadius:'0 14px 14px 0',
                    opacity: prog(frame,24,20,easeOutExpo),
                  }}/>
                )}
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
//  10 — TEAM  "The Ensemble"
//  Floating glass avatar cards with glow portraits
// ═══════════════════════════════════════════════════════════════
export function TeamSlide({ slide, themeId, slideNum, totalSlides, logoUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames:dur, fps } = useVideoConfig()
  const T       = THEMES[themeId] || THEMES.obsidian
  const accent  = slide.accent || T.accent
  const members = (slide.team||slide.bullets||[]).slice(0,4)

  return (
    <AbsoluteFill>
      <LuminousBg url={slide.pexelsUrl} T={T} frame={frame}/>

      <AbsoluteFill style={{padding:'52px 64px',display:'flex',flexDirection:'column',zIndex:10}}>
        <div style={{marginBottom:36}}>
          <Tag text="Team" frame={frame} startF={6} accent={accent}/>
          <Headline text={slide.title} frame={frame} startF={10} size={44} color={T.text} serif spacing={-1.5}/>
          <div style={{height:8}}/>
          <Rule frame={frame} startF={22} accent={accent} width={52}/>
        </div>

        <div style={{display:'flex',gap:18,flex:1,alignItems:'stretch'}}>
          {members.map((member,i) => {
            const sc  = spring({ frame:Math.max(0,frame-(24+i*12)), fps, config:{damping:11,stiffness:75} })
            const floatY = sin(frame, 5, 0.022, i*1.8)
            const name   = typeof member==='string'?member:member.name||member
            const role   = typeof member==='object'?member.role||'':''

            return (
              <div key={i} style={{
                flex:1, display:'flex', flexDirection:'column',
                transform:`scale(${sc}) translateY(${floatY}px)`,
                padding:'28px 22px',
                background:`linear-gradient(135deg, ${T.glass}, rgba(255,255,255,0.01))`,
                backdropFilter:'blur(24px)',
                border:`1px solid ${T.glassBorder}`,
                borderRadius:20,
                boxShadow:`0 8px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)`,
                position:'relative', overflow:'hidden',
              }}>
                {/* Avatar orb */}
                <div style={{
                  width:60, height:60, borderRadius:'50%', marginBottom:18,
                  background:`radial-gradient(circle at 35% 35%, ${T.glow2}55, ${T.glow}22)`,
                  border:`1.5px solid ${accent}44`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:24, fontWeight:700, color:accent,
                  fontFamily:"'Cormorant Garamond','Georgia',serif",
                  boxShadow:`0 0 24px ${T.glow}44, inset 0 1px 0 rgba(255,255,255,0.15)`,
                }}>{name[0]}</div>

                <div style={{fontSize:16,fontWeight:700,color:T.text,fontFamily:"'DM Sans',system-ui,sans-serif",marginBottom:4}}>
                  {name}
                </div>
                {role && (
                  <div style={{fontSize:10,color:accent,fontWeight:600,letterSpacing:'.18em',textTransform:'uppercase',fontFamily:"'Courier New',monospace"}}>
                    {role}
                  </div>
                )}

                {/* Bottom glow */}
                <div style={{
                  position:'absolute', bottom:0, left:0, right:0, height:2,
                  background:`linear-gradient(90deg, transparent, ${accent}55, transparent)`,
                  opacity: prog(frame,24+i*12,20,easeOutExpo),
                }}/>
                <HoloShimmer frame={frame} color={accent} speed={0.2+i*0.08}/>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <SlideIndex n={slideNum} total={totalSlides} accent={accent} T={T}/>
      <SilkTransition frame={frame} total={dur}/>
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
    <AbsoluteFill style={{ background:'#000' }}>
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