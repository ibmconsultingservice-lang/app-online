import { NextResponse } from 'next/server'

// ── PPTX Animation XML helpers ─────────────────────────────────
// These inject raw OOXML animation sequences into PptxGenJS slides

function makeEntranceAnim({ spId, effect = 'fade', delay = 0, dur = 500, start = 'afterPrev' }) {
  const startMap = {
    onClick:    '1',
    withPrev:   '0',
    afterPrev:  '0',
  }
  const effectMap = {
    fade:     { preset: 'p:fade',      dir: null },
    flyLeft:  { preset: 'p:fly',       dir: 'l'  },
    flyRight: { preset: 'p:fly',       dir: 'r'  },
    flyUp:    { preset: 'p:fly',       dir: 'u'  },
    flyDown:  { preset: 'p:fly',       dir: 'd'  },
    zoom:     { preset: 'p:zoom',      dir: null },
    wipe:     { preset: 'p:wipe',      dir: 'r'  },
    appear:   { preset: 'p:appear',    dir: null },
    float:    { preset: 'p:float',     dir: 'u'  },
    split:    { preset: 'p:split',     dir: 'h'  },
  }
  const fx   = effectMap[effect] || effectMap.fade
  const dirAttr = fx.dir ? ` dir="${fx.dir}"` : ''

  return `<p:par>
  <p:cTn id="${spId * 10 + 1}" grpId="0" nodeType="withGroup">
    <p:stCondLst>
      <p:cond delay="${delay}"/>
    </p:stCondLst>
    <p:childTnLst>
      <p:par>
        <p:cTn id="${spId * 10 + 2}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" nodeType="clickEffect">
          <p:stCondLst>
            <p:cond delay="0"/>
          </p:stCondLst>
          <p:childTnLst>
            <p:set>
              <p:cBhvr><p:cTn id="${spId * 10 + 3}" dur="1" fill="hold"/>
                <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
                <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
              </p:cBhvr>
              <p:to><p:strVal val="visible"/></p:to>
            </p:set>
            <p:animEffect transition="in" filter="${fx.preset.replace('p:', '')}">
              <p:cBhvr><p:cTn id="${spId * 10 + 4}" dur="${dur}" fill="hold"/>
                <p:tgtEl><p:spTgt spid="${spId}"/></p:tgtEl>
              </p:cBhvr>
            </p:animEffect>
          </p:childTnLst>
        </p:cTn>
      </p:par>
    </p:childTnLst>
  </p:cTn>
</p:par>`
}

// ── Slide transition XML ──────────────────────────────────────
function makeTransition(type = 'fade', dur = 600) {
  const transitions = {
    fade:   `<p:fade/>`,
    push:   `<p:push dir="l"/>`,
    wipe:   `<p:wipe dir="l"/>`,
    split:  `<p:split orient="horz" dir="in"/>`,
    cover:  `<p:cover dir="l"/>`,
    zoom:   `<p:zoom dir="in"/>`,
    morph:  `<p:morph/>`,
    reveal: `<p:cover dir="r"/>`,
  }
  return `<p:transition spd="fast" dur="${dur}" advClick="1">
  ${transitions[type] || transitions.fade}
</p:transition>`
}

// ── Theme → design config ─────────────────────────────────────
function getThemeConfig(themeId) {
  const themes = {
    obsidian:  { bg: '0a0a12', accent: 'c9a84c', text: 'FFFFFF', sub: 'rgba(255,255,255,0.6)', transition: 'fade'   },
    aurora:    { bg: '060d1a', accent: '7c3aed', text: 'FFFFFF', sub: 'B0B0C0',                transition: 'push'   },
    editorial: { bg: 'fafaf8', accent: '1a1a2e', text: '1a1a2e', sub: '555555',                transition: 'wipe'   },
    crimson:   { bg: '0d0507', accent: 'dc2626', text: 'FFFFFF', sub: 'E0A0A0',                transition: 'cover'  },
    arctic:    { bg: '020b18', accent: '0ea5e9', text: 'FFFFFF', sub: '80C0E0',                transition: 'split'  },
    forest:    { bg: '030c06', accent: '16a34a', text: 'FFFFFF', sub: '90C0A0',                transition: 'reveal' },
  }
  return themes[themeId] || themes.obsidian
}

// ── Slide builders ────────────────────────────────────────────

async function buildCoverSlide(pres, slide, theme, logo, W, H) {
  const s   = pres.addSlide()
  const bg  = theme.bg
  const acc = theme.accent
  const isDark = theme.text === 'FFFFFF'

  // Background
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: bg } })

  // Accent gradient bar left
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.08, h: H,
    fill: { color: acc },
  })

  // Pexels bg image if available
  if (slide.pexelsUrl) {
    try {
      const imgRes = await fetch(slide.pexelsUrl)
      const imgBuf = await imgRes.arrayBuffer()
      const b64    = Buffer.from(imgBuf).toString('base64')
      const ext    = 'jpg'
      s.addImage({ data: `image/jpeg;base64,${b64}`, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } })
      // Dark overlay
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: bg, transparency: isDark ? 25 : 10 } })
    } catch {}
  }

  // Badge
  if (slide.badge) {
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: H * 0.28, w: 2.2, h: 0.32,
      fill: { color: acc }, line: { color: acc },
      rectRadius: 0.15,
    })
    s.addText(slide.badge.toUpperCase(), {
      x: 0.5, y: H * 0.28, w: 2.2, h: 0.32,
      fontSize: 9, fontFace: 'Arial', bold: true,
      color: isDark ? 'FFFFFF' : '000000', align: 'center', valign: 'middle',
    })
  }

  // Title
  s.addText(slide.title || '', {
    x: 0.5, y: H * 0.38, w: W - 1, h: H * 0.28,
    fontSize: 40, fontFace: 'Arial', bold: true,
    color: theme.text, align: 'left', valign: 'middle',
    charSpacing: -1,
  })

  // Subtitle
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.5, y: H * 0.67, w: W - 1, h: H * 0.15,
      fontSize: 18, fontFace: 'Arial', bold: false,
      color: theme.sub, align: 'left', valign: 'top',
    })
  }

  // Bottom accent line
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: H - 0.06, w: 1.2, h: 0.04,
    fill: { color: acc },
  })

  // Logo
  if (logo) {
    s.addImage({ data: logo, x: W - 1.4, y: 0.15, w: 1, h: 0.35, sizing: { type: 'contain', w: 1, h: 0.35 } })
  }

  return s
}

async function buildBulletsSlide(pres, slide, theme, logo, W, H) {
  const s   = pres.addSlide()
  const acc = theme.accent
  const isDark = theme.text === 'FFFFFF'

  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: theme.bg } })
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: H, fill: { color: acc } })

  // Pexels right panel
  if (slide.pexelsUrl) {
    try {
      const imgRes = await fetch(slide.pexelsUrl)
      const b64    = Buffer.from(await imgRes.arrayBuffer()).toString('base64')
      s.addImage({ data: `image/jpeg;base64,${b64}`, x: W * 0.55, y: 0, w: W * 0.45, h: H, sizing: { type: 'cover', w: W * 0.45, h: H } })
      s.addShape(pres.ShapeType.rect, { x: W * 0.55, y: 0, w: W * 0.45, h: H, fill: { color: theme.bg, transparency: isDark ? 45 : 15 } })
    } catch {}
  }

  // Title
  s.addText(slide.title || '', {
    x: 0.4, y: 0.3, w: W * 0.52, h: 0.8,
    fontSize: 26, fontFace: 'Arial', bold: true,
    color: theme.text, align: 'left', valign: 'middle',
  })

  // Accent underline
  s.addShape(pres.ShapeType.rect, { x: 0.4, y: 1.15, w: 0.5, h: 0.04, fill: { color: acc } })

  // Bullets
  const bullets = slide.bullets || []
  bullets.forEach((b, i) => {
    // Bullet dot
    s.addShape(pres.ShapeType.ellipse, {
      x: 0.4, y: 1.4 + i * 0.68 + 0.1, w: 0.1, h: 0.1,
      fill: { color: acc },
    })
    s.addText(b, {
      x: 0.65, y: 1.35 + i * 0.68, w: W * 0.48, h: 0.6,
      fontSize: 15, fontFace: 'Arial', bold: false,
      color: theme.sub, align: 'left', valign: 'middle',
    })
  })

  if (logo) s.addImage({ data: logo, x: W - 1.4, y: 0.15, w: 1, h: 0.35, sizing: { type: 'contain', w: 1, h: 0.35 } })
  return s
}

async function buildStatsSlide(pres, slide, theme, logo, W, H) {
  const s   = pres.addSlide()
  const acc = theme.accent

  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: theme.bg } })
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: H, fill: { color: acc } })

  // Title
  s.addText(slide.title || '', {
    x: 0.4, y: 0.2, w: W - 0.8, h: 0.7,
    fontSize: 28, fontFace: 'Arial', bold: true,
    color: theme.text, align: 'center', valign: 'middle',
  })

  // Stat cards
  const stats = slide.stats || []
  const cardW = (W - 0.8) / Math.max(stats.length, 1)
  stats.forEach((stat, i) => {
    const x = 0.4 + i * cardW

    // Card bg
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.1, y: 1.1, w: cardW - 0.2, h: H - 1.5,
      fill: { color: acc, transparency: 85 },
      line: { color: acc, transparency: 50, width: 1 },
      rectRadius: 0.1,
    })

    // Value
    s.addText(stat.value || '', {
      x: x + 0.1, y: 1.3, w: cardW - 0.2, h: 0.9,
      fontSize: 38, fontFace: 'Arial', bold: true,
      color: acc, align: 'center', valign: 'middle',
    })

    // Label
    s.addText(stat.label || '', {
      x: x + 0.1, y: 2.3, w: cardW - 0.2, h: 0.5,
      fontSize: 13, fontFace: 'Arial', bold: false,
      color: theme.sub, align: 'center', valign: 'middle',
    })
  })

  if (logo) s.addImage({ data: logo, x: W - 1.4, y: 0.15, w: 1, h: 0.35, sizing: { type: 'contain', w: 1, h: 0.35 } })
  return s
}

async function buildCTASlide(pres, slide, theme, logo, W, H) {
  const s   = pres.addSlide()
  const acc = theme.accent

  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: theme.bg } })

  // Large accent circle bg
  s.addShape(pres.ShapeType.ellipse, {
    x: W * 0.3, y: -H * 0.3, w: H * 1.4, h: H * 1.4,
    fill: { color: acc, transparency: 92 },
    line: { color: acc, transparency: 85, width: 1 },
  })

  // Title
  s.addText(slide.title || '', {
    x: 0.5, y: H * 0.22, w: W - 1, h: H * 0.32,
    fontSize: 34, fontFace: 'Arial', bold: true,
    color: theme.text, align: 'center', valign: 'middle',
    charSpacing: -0.5,
  })

  // Subtitle
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.5, y: H * 0.52, w: W - 1, h: H * 0.15,
      fontSize: 16, fontFace: 'Arial',
      color: theme.sub, align: 'center', valign: 'middle',
    })
  }

  // CTA button
  if (slide.cta) {
    s.addShape(pres.ShapeType.roundRect, {
      x: W / 2 - 1.5, y: H * 0.68, w: 3, h: 0.55,
      fill: { color: acc },
      line: { color: acc },
      rectRadius: 0.28,
    })
    s.addText(slide.cta, {
      x: W / 2 - 1.5, y: H * 0.68, w: 3, h: 0.55,
      fontSize: 16, fontFace: 'Arial', bold: true,
      color: theme.text === 'FFFFFF' ? 'FFFFFF' : theme.bg,
      align: 'center', valign: 'middle',
    })
  }

  if (logo) s.addImage({ data: logo, x: W / 2 - 0.6, y: 0.15, w: 1.2, h: 0.45, sizing: { type: 'contain', w: 1.2, h: 0.45 } })
  return s
}

// ── Map slide type → builder ──────────────────────────────────
async function buildSlide(pres, slide, themeConfig, logo, W, H) {
  switch (slide.type) {
    case 'title':   return buildCoverSlide(pres, slide, themeConfig, logo, W, H)
    case 'cover':   return buildCoverSlide(pres, slide, themeConfig, logo, W, H)
    case 'bullets': return buildBulletsSlide(pres, slide, themeConfig, logo, W, H)
    case 'content': return buildBulletsSlide(pres, slide, themeConfig, logo, W, H)
    case 'stats':   return buildStatsSlide(pres, slide, themeConfig, logo, W, H)
    case 'cta':     return buildCTASlide(pres, slide, themeConfig, logo, W, H)
    default:        return buildBulletsSlide(pres, slide, themeConfig, logo, W, H)
  }
}

// ── Main route ────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { slides, themeId, logoUrl, title, width, height } = await request.json()

    if (!slides?.length) {
      return NextResponse.json({ error: 'slides manquants' }, { status: 400 })
    }

    const PptxGenJS = (await import('pptxgenjs')).default
    const pres      = new PptxGenJS()

    // ── Presentation metadata ──
    pres.layout  = 'LAYOUT_16x9'
    pres.title   = title || 'Sumuria Presentation'
    pres.subject = 'Generated by Sumuria VideoGen'
    pres.author  = 'Sumuria IA'

    const W = 10     // inches (16:9 standard)
    const H = 5.625
    const themeConfig = getThemeConfig(themeId || 'obsidian')

    // ── Slide master ──
    pres.defineSlideMaster({
      title:      'MASTER',
      background: { color: themeConfig.bg },
    })

    // ── Build all slides ──
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      await buildSlide(pres, slide, themeConfig, logoUrl, W, H)
    }

    // ── Export as buffer ──
    const buffer = await pres.write({ outputType: 'nodebuffer' })

    const safeTitle = (title || 'presentation').replace(/[^a-z0-9]/gi, '_').slice(0, 40)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${safeTitle}_${Date.now()}.pptx"`,
      },
    })

  } catch (error) {
    console.error('PPTX export error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}