import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  Video,
  staticFile,
} from 'remotion'

// ─── Easing helpers ───────────────────────────────────────────
const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// ─── Cinematic letter-by-letter text ─────────────────────────
function AnimatedText({ text, frame, startFrame, color = 'white', fontSize = 80, fontWeight = 900, letterSpacing = -2, style = {} }) {
  const words = (text || '').split(' ')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25em', ...style }}>
      {words.map((word, wi) => {
        const delay = startFrame + wi * 5
        const progress = Math.max(0, Math.min(1, (frame - delay) / 18))
        const eased = easeOutExpo(progress)
        return (
          <span key={wi} style={{
            display: 'inline-block',
            fontSize, fontWeight, letterSpacing,
            color,
            opacity: eased,
            transform: `translateY(${(1 - eased) * 40}px) skewY(${(1 - eased) * 3}deg)`,
            fontFamily: "'Playfair Display', 'Georgia', serif",
            lineHeight: 1.05,
          }}>
            {word}
          </span>
        )
      })}
    </div>
  )
}

// ─── Subtitle slide-up ────────────────────────────────────────
function AnimatedSubtitle({ text, frame, startFrame, color = 'rgba(255,255,255,0.75)', fontSize = 22 }) {
  const progress = Math.max(0, Math.min(1, (frame - startFrame) / 20))
  const eased = easeOutExpo(progress)
  return (
    <div style={{
      fontSize, fontWeight: 400,
      color,
      opacity: eased,
      transform: `translateY(${(1 - eased) * 24}px)`,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      letterSpacing: '0.04em',
      lineHeight: 1.6,
    }}>
      {text}
    </div>
  )
}

// ─── Pexels background with Ken Burns ────────────────────────
function PexelsBg({ mediaUrl, mediaType = 'photo', frame, totalFrames, kenBurnsScale = 1.08, kenBurnsDir = 'in', overlay = 'dark' }) {
  const progress = totalFrames > 1 ? frame / (totalFrames - 1) : 0
  const scale = kenBurnsDir === 'in'
    ? interpolate(progress, [0, 1], [1, kenBurnsScale])
    : interpolate(progress, [0, 1], [kenBurnsScale, 1])

  const overlayStyles = {
    dark:   'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.65) 100%)',
    luxury: 'linear-gradient(135deg, rgba(10,5,20,0.7) 0%, rgba(40,15,60,0.5) 50%, rgba(10,5,20,0.7) 100%)',
    warm:   'linear-gradient(to bottom, rgba(20,8,0,0.5) 0%, rgba(60,20,5,0.6) 100%)',
    vignette: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)',
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* Media */}
      <div style={{
        position: 'absolute', inset: '-5%',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}>
        {mediaUrl ? (
          mediaType === 'video' ? (
            <Video src={mediaUrl} style={{ width: '110%', height: '110%', objectFit: 'cover' }} muted playbackRate={0.85} />
          ) : (
            <Img src={mediaUrl} style={{ width: '110%', height: '110%', objectFit: 'cover' }} />
          )
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#0a0514' }} />
        )}
      </div>
      {/* Cinematic overlay */}
      <AbsoluteFill style={{ background: overlayStyles[overlay] || overlayStyles.dark }} />
      {/* Grain */}
      <AbsoluteFill style={{
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }} />
      {/* Letterbox bars */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28, background: 'rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: 'rgba(0,0,0,0.6)' }} />
    </AbsoluteFill>
  )
}

// ─── Accent line ─────────────────────────────────────────────
function AccentLine({ frame, startFrame, color, width = 80 }) {
  const progress = Math.max(0, Math.min(1, (frame - startFrame) / 25))
  const eased = easeOutExpo(progress)
  return (
    <div style={{
      width: width * eased,
      height: 3,
      background: color,
      borderRadius: 2,
      marginBottom: 28,
      boxShadow: `0 0 16px ${color}80`,
    }} />
  )
}

// ─── Badge pill ──────────────────────────────────────────────
function Badge({ text, frame, startFrame, color }) {
  const progress = Math.max(0, Math.min(1, (frame - startFrame) / 15))
  const eased = easeOutExpo(progress)
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      marginBottom: 24, opacity: eased,
      transform: `translateY(${(1 - eased) * 20}px)`,
    }}>
      <div style={{
        background: `${color}20`,
        border: `1px solid ${color}60`,
        borderRadius: 100, padding: '8px 22px',
        fontSize: 13, fontWeight: 700,
        color, letterSpacing: '0.2em',
        textTransform: 'uppercase',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        backdropFilter: 'blur(8px)',
      }}>
        {text}
      </div>
    </div>
  )
}

// ─── Product image overlay (with glow) ───────────────────────
function ProductOverlay({ src, frame, startFrame, side = 'right', accent }) {
  const progress = Math.max(0, Math.min(1, (frame - startFrame) / 30))
  const eased = easeOutExpo(progress)
  const floatY = Math.sin(frame * 0.04) * 8

  return (
    <div style={{
      position: 'absolute',
      [side]: 80,
      top: '50%',
      transform: `translateY(calc(-50% + ${floatY}px)) scale(${0.8 + eased * 0.2})`,
      opacity: eased,
      width: 340,
    }}>
      {/* Glow behind product */}
      <div style={{
        position: 'absolute', inset: -40,
        background: `radial-gradient(circle, ${accent}40 0%, transparent 70%)`,
        borderRadius: '50%',
      }} />
      <Img src={src} style={{
        width: '100%', height: 'auto',
        objectFit: 'contain',
        filter: `drop-shadow(0 20px 60px ${accent}60) drop-shadow(0 0 30px ${accent}30)`,
        position: 'relative', zIndex: 1,
      }} />
    </div>
  )
}

// ─── Particle dots ────────────────────────────────────────────
function Particles({ frame, accent, count = 12 }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const seed = i * 137.5
    const x = (seed % 100)
    const y = ((seed * 1.618) % 100)
    const size = 2 + (i % 3) * 2
    const speed = 0.3 + (i % 5) * 0.15
    const phase = i * 0.8
    const opacity = 0.15 + (Math.sin(frame * speed * 0.05 + phase) + 1) * 0.2
    const offsetY = Math.sin(frame * speed * 0.03 + phase) * 15
    return { x, y, size, opacity, offsetY }
  })

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: accent,
          opacity: p.opacity,
          transform: `translateY(${p.offsetY}px)`,
          boxShadow: `0 0 ${p.size * 3}px ${accent}`,
        }} />
      ))}
    </AbsoluteFill>
  )
}

// ─── Transition wipe (between scenes) ────────────────────────
function SceneWipe({ frame, totalFrames, color }) {
  const fadeIn = interpolate(frame, [0, 12], [1, 0], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [totalFrames - 12, totalFrames], [0, 1], { extrapolateRight: 'clamp' })
  const opacity = Math.max(fadeIn, fadeOut)
  return (
    <AbsoluteFill style={{
      background: '#000',
      opacity,
      pointerEvents: 'none',
    }} />
  )
}

// ═══════════════════════════════════════════════════════════════
// SCENE TYPES
// ═══════════════════════════════════════════════════════════════

// ── SCENE 1: Cinematic Title ──────────────────────────────────
function TitleScene({ scene, fps, productImageUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  return (
    <AbsoluteFill style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
      <PexelsBg
        mediaUrl={scene.pexelsUrl}
        mediaType={scene.pexelsType}
        frame={frame}
        totalFrames={durationInFrames}
        kenBurnsDir="in"
        kenBurnsScale={1.06}
        overlay="luxury"
      />
      <Particles frame={frame} accent={scene.accent || '#f59e0b'} count={16} />

      {/* Product image floating right */}
      {productImageUrl && (
        <ProductOverlay
          src={productImageUrl}
          frame={frame}
          startFrame={10}
          side="right"
          accent={scene.accent || '#f59e0b'}
        />
      )}

      {/* Left content */}
      <AbsoluteFill style={{ padding: '0 100px', justifyContent: 'center', display: 'flex', flexDirection: 'column', maxWidth: '55%' }}>
        {scene.badge && <Badge text={scene.badge} frame={frame} startFrame={5} color={scene.accent || '#f59e0b'} />}
        <AccentLine frame={frame} startFrame={8} color={scene.accent || '#f59e0b'} />
        <AnimatedText
          text={scene.title}
          frame={frame}
          startFrame={12}
          fontSize={scene.titleSize || 82}
          letterSpacing={-3}
        />
        {scene.subtitle && (
          <div style={{ marginTop: 24 }}>
            <AnimatedSubtitle
              text={scene.subtitle}
              frame={frame}
              startFrame={28}
              fontSize={22}
            />
          </div>
        )}
      </AbsoluteFill>

      {/* Bottom brand line */}
      <div style={{
        position: 'absolute', bottom: 48, left: 100, right: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' }),
          fontSize: 11, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontWeight: 600, textTransform: 'uppercase',
        }}>
          {scene.brandLine || 'Powered by VisualGen AI'}
        </div>
        <div style={{
          width: 40, height: 1,
          background: `linear-gradient(to right, transparent, ${scene.accent || '#f59e0b'})`,
          opacity: interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' }),
        }} />
      </div>

      <SceneWipe frame={frame} totalFrames={durationInFrames} />
    </AbsoluteFill>
  )
}

// ── SCENE 2: Cinematic Bullets ────────────────────────────────
function BulletsScene({ scene, fps, productImageUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  return (
    <AbsoluteFill>
      <PexelsBg
        mediaUrl={scene.pexelsUrl}
        mediaType={scene.pexelsType}
        frame={frame}
        totalFrames={durationInFrames}
        kenBurnsDir="out"
        kenBurnsScale={1.05}
        overlay="dark"
      />
      <Particles frame={frame} accent={scene.accent || '#f59e0b'} count={8} />

      {/* Left vertical accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: `linear-gradient(to bottom, transparent, ${scene.accent || '#f59e0b'}, transparent)`,
        opacity: interpolate(frame, [0, 20], [0, 0.8], { extrapolateRight: 'clamp' }),
      }} />

      <AbsoluteFill style={{ padding: '70px 100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Section number */}
        <div style={{
          fontSize: 11, letterSpacing: '0.35em', color: scene.accent || '#f59e0b',
          fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700,
          textTransform: 'uppercase', marginBottom: 16,
          opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          {scene.sectionNumber || '—'} &nbsp; {scene.sectionTag || 'Key Benefits'}
        </div>

        {/* Title */}
        <AnimatedText
          text={scene.title}
          frame={frame}
          startFrame={8}
          fontSize={52}
          letterSpacing={-2}
          style={{ marginBottom: 0 }}
        />
        <AccentLine frame={frame} startFrame={18} color={scene.accent || '#f59e0b'} width={60} />

        {/* Bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {(scene.bullets || []).map((b, i) => {
            const delay = 22 + i * 12
            const progress = Math.max(0, Math.min(1, (frame - delay) / 20))
            const eased = easeOutExpo(progress)
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 22,
                opacity: eased,
                transform: `translateX(${(1 - eased) * -40}px)`,
              }}>
                {/* Bullet icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${scene.accent || '#f59e0b'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${scene.accent || '#f59e0b'}15`,
                  marginTop: 4,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: scene.accent || '#f59e0b' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,0.92)',
                    fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.4,
                  }}>
                    {b}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <SceneWipe frame={frame} totalFrames={durationInFrames} />
    </AbsoluteFill>
  )
}

// ── SCENE 3: Stats / Numbers ──────────────────────────────────
function StatsScene({ scene, fps }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  return (
    <AbsoluteFill>
      <PexelsBg
        mediaUrl={scene.pexelsUrl}
        mediaType={scene.pexelsType}
        frame={frame}
        totalFrames={durationInFrames}
        kenBurnsDir="in"
        kenBurnsScale={1.07}
        overlay="vignette"
      />

      {/* Center grid */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 80px',
      }}>
        <AnimatedText
          text={scene.title}
          frame={frame}
          startFrame={5}
          fontSize={42}
          letterSpacing={-1}
          style={{ marginBottom: 0, justifyContent: 'center', textAlign: 'center' }}
        />
        <AccentLine frame={frame} startFrame={15} color={scene.accent || '#f59e0b'} width={50} />

        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          {(scene.stats || []).map((s, i) => {
            const delay = 18 + i * 12
            const sc = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 12, stiffness: 90 } })
            return (
              <div key={i} style={{
                textAlign: 'center',
                transform: `scale(${sc})`,
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${scene.accent || '#f59e0b'}30`,
                borderRadius: 28, padding: '44px 52px',
                minWidth: 200,
                boxShadow: `0 0 40px ${scene.accent || '#f59e0b'}15, inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}>
                <div style={{
                  fontSize: 78, fontWeight: 900, lineHeight: 1,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  background: `linear-gradient(135deg, #ffffff, ${scene.accent || '#f59e0b'})`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {s.value}
                </div>
                <div style={{
                  fontSize: 16, color: 'rgba(255,255,255,0.45)',
                  marginTop: 12, fontWeight: 500, letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>
                  {s.label}
                </div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      <SceneWipe frame={frame} totalFrames={durationInFrames} />
    </AbsoluteFill>
  )
}

// ── SCENE 4: Split — Product Hero ────────────────────────────
function ProductHeroScene({ scene, fps, productImageUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const floatY = Math.sin(frame * 0.045) * 10
  const floatX = Math.sin(frame * 0.03) * 5

  return (
    <AbsoluteFill>
      <PexelsBg
        mediaUrl={scene.pexelsUrl}
        mediaType={scene.pexelsType}
        frame={frame}
        totalFrames={durationInFrames}
        kenBurnsDir="out"
        kenBurnsScale={1.08}
        overlay="warm"
      />

      {/* Split layout */}
      <AbsoluteFill style={{ display: 'flex' }}>
        {/* Left text */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '60px 60px 60px 100px',
        }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.35em', color: scene.accent || '#f59e0b',
            fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700,
            textTransform: 'uppercase', marginBottom: 20,
            opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }),
          }}>
            {scene.sectionTag || 'Product Story'}
          </div>
          <AnimatedText text={scene.title} frame={frame} startFrame={10} fontSize={56} letterSpacing={-2} />
          <div style={{ marginTop: 20, marginBottom: 28 }}>
            <AnimatedSubtitle text={scene.subtitle} frame={frame} startFrame={24} fontSize={20} />
          </div>

          {/* Feature chips */}
          {(scene.chips || []).map((chip, i) => {
            const delay = 30 + i * 8
            const progress = Math.max(0, Math.min(1, (frame - delay) / 18))
            const eased = easeOutExpo(progress)
            return (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                marginBottom: 12, opacity: eased,
                transform: `translateX(${(1 - eased) * -30}px)`,
              }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${scene.accent || '#f59e0b'}25`, border: `1px solid ${scene.accent || '#f59e0b'}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: scene.accent || '#f59e0b' }} />
                </div>
                <span style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 500 }}>
                  {chip}
                </span>
              </div>
            )
          })}
        </div>

        {/* Right product image */}
        {productImageUrl && (
          <div style={{
            width: 440, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '60px 80px 60px 20px', position: 'relative',
          }}>
            {/* Big glow */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at center, ${scene.accent || '#f59e0b'}25 0%, transparent 70%)`,
            }} />
            <div style={{
              transform: `translateY(${floatY}px) translateX(${floatX}px)`,
              filter: `drop-shadow(0 30px 80px ${scene.accent || '#f59e0b'}50)`,
            }}>
              <Img src={productImageUrl} style={{ width: 300, height: 'auto', objectFit: 'contain' }} />
            </div>
          </div>
        )}
      </AbsoluteFill>

      <SceneWipe frame={frame} totalFrames={durationInFrames} />
    </AbsoluteFill>
  )
}

// ── SCENE 5: CTA / Outro ─────────────────────────────────────
function CTAScene({ scene, fps, productImageUrl }) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 70 } })

  const btnProgress = Math.max(0, Math.min(1, (frame - 35) / 25))
  const btnEased = easeOutExpo(btnProgress)
  const floatY = Math.sin(frame * 0.04) * 8

  return (
    <AbsoluteFill>
      <PexelsBg
        mediaUrl={scene.pexelsUrl}
        mediaType={scene.pexelsType}
        frame={frame}
        totalFrames={durationInFrames}
        kenBurnsDir="in"
        kenBurnsScale={1.05}
        overlay="luxury"
      />
      <Particles frame={frame} accent={scene.accent || '#f59e0b'} count={20} />

      {/* Centered content */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', padding: '0 120px', textAlign: 'center' }}>

        {/* Product floating above text */}
        {productImageUrl && (
          <div style={{
            marginBottom: 32,
            transform: `translateY(${floatY}px) scale(${0.7 + scale * 0.3})`,
            opacity: scale,
            filter: `drop-shadow(0 20px 50px ${scene.accent || '#f59e0b'}60)`,
          }}>
            <Img src={productImageUrl} style={{ width: 180, height: 'auto', objectFit: 'contain' }} />
          </div>
        )}

        <AnimatedText
          text={scene.title}
          frame={frame}
          startFrame={8}
          fontSize={72}
          letterSpacing={-3}
          style={{ justifyContent: 'center' }}
        />

        {scene.subtitle && (
          <div style={{ marginTop: 20, maxWidth: 600 }}>
            <AnimatedSubtitle text={scene.subtitle} frame={frame} startFrame={22} fontSize={22} />
          </div>
        )}

        {/* CTA button */}
        {scene.cta && (
          <div style={{
            marginTop: 44,
            opacity: btnEased,
            transform: `translateY(${(1 - btnEased) * 30}px) scale(${0.9 + btnEased * 0.1})`,
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${scene.accent || '#f59e0b'}, ${scene.accentAlt || '#ec4899'})`,
              color: 'white',
              borderRadius: 100, padding: '20px 64px',
              fontSize: 22, fontWeight: 800, letterSpacing: '0.05em',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              boxShadow: `0 8px 40px ${scene.accent || '#f59e0b'}60`,
            }}>
              {scene.cta}
            </div>
          </div>
        )}
      </AbsoluteFill>

      <SceneWipe frame={frame} totalFrames={durationInFrames} />
    </AbsoluteFill>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ═══════════════════════════════════════════════════════════════

export default function VideoComposition({ scenes = [], accentColor = '#f59e0b', productImageUrl = null }) {
  const { fps } = useVideoConfig()
  const SCENE_DURATION = 90  // 3s at 30fps

  const sceneComponents = {
    title:        TitleScene,
    bullets:      BulletsScene,
    stats:        StatsScene,
    producthero:  ProductHeroScene,
    cta:          CTAScene,
  }

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {scenes.map((scene, i) => {
        const from = i * SCENE_DURATION
        const sceneWithAccent = { ...scene, accent: scene.accent || accentColor }
        const SceneComponent = sceneComponents[scene.type] || TitleScene

        return (
          <Sequence key={i} from={from} durationInFrames={SCENE_DURATION}>
            <SceneComponent
              scene={sceneWithAccent}
              fps={fps}
              productImageUrl={productImageUrl}
            />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}