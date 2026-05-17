'use client'

import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Download, RefreshCw, Presentation,
  ChevronRight, AlertCircle, X, Sparkles, Zap,
  ImagePlus, Wand2, CheckCircle, Eye, Layers,
  Target, Camera, FileText, Play, Grid, Monitor,
  ChevronLeft, Maximize2, Minimize2, Edit3, Plus,
  Trash2, Save, Copy, Search, Video,
  ChevronUp, ChevronDown, Music, VolumeX, Volume2, Square,
} from 'lucide-react'

// ── Remotion dynamic imports ──────────────────────────────────
const RemotionPlayer = dynamic(
  () => import('@remotion/player').then(m => ({ default: m.Player })),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#0a0a12', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #c9a84c', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      </div>
    ),
  }
)

const DeckComposition = dynamic(
  () => import('../remotion/SlideCompositions').then(m => ({ default: m.default })),
  { ssr: false }
)

// ── Config ────────────────────────────────────────────────────
const THEMES = [
  { id: 'obsidian',  label: 'Obsidian',   desc: 'Dark luxury, gold accents',    bg: '#0a0a12', accent: '#c9a84c' },
  { id: 'aurora',    label: 'Aurora',     desc: 'Deep space, neon gradients',   bg: '#060d1a', accent: '#7c3aed' },
  { id: 'editorial', label: 'Editorial',  desc: 'Clean white, bold typography', bg: '#fafaf8', accent: '#1a1a2e' },
  { id: 'crimson',   label: 'Crimson',    desc: 'Dramatic red, cinematic',      bg: '#0d0507', accent: '#dc2626' },
  { id: 'arctic',    label: 'Arctic',     desc: 'Ice blue, corporate premium',  bg: '#020b18', accent: '#0ea5e9' },
  { id: 'forest',    label: 'Forest',     desc: 'Organic green, earthy luxury', bg: '#030c06', accent: '#16a34a' },
]

const SLIDE_COUNTS = [
  { value: 6,  label: '6 slides',  desc: 'Quick pitch'   },
  { value: 10, label: '10 slides', desc: 'Standard deck' },
  { value: 15, label: '15 slides', desc: 'Full deck'     },
]

const LAYOUTS = [
  { id: 'widescreen', label: '16:9', icon: Monitor, width: 1920, height: 1080 },
  { id: 'standard',   label: '4:3',  icon: Grid,    width: 1440, height: 1080 },
]

const LOADING_STEPS = [
  { label: 'Analysing your content...'  },
  { label: 'Structuring slide flow...'  },
  { label: 'Sourcing Pexels visuals...' },
  { label: 'Designing each slide...'    },
  { label: 'Polishing final deck...'    },
]

const SLIDE_TYPE_LABELS = {
  cover: 'Cover', agenda: 'Agenda', section: 'Section Break',
  content: 'Content', bullets: 'Key Points', stats: 'Numbers',
  quote: 'Quote', comparison: 'Comparison', timeline: 'Timeline',
  team: 'Team', cta: 'Call to Action', title: 'Title',
}

const SLIDE_TYPES = Object.entries(SLIDE_TYPE_LABELS).map(([id, label]) => ({ id, label }))

const MOTION_PRESETS = [
  { id: 'fade',      label: 'Fade',       desc: 'Smooth opacity reveal' },
  { id: 'slideUp',   label: 'Slide Up',   desc: 'Enters from below'     },
  { id: 'slideLeft', label: 'Slide Left', desc: 'Enters from right'     },
  { id: 'zoom',      label: 'Zoom In',    desc: 'Scale from center'     },
  { id: 'split',     label: 'Split',      desc: 'Splits from center'    },
  { id: 'wipe',      label: 'Wipe',       desc: 'Reveals left to right' },
]

// ── Pixabay music library (royalty-free, commercial OK) ───────
// pixabay.com/music — Pixabay License, no attribution required
const MUSIC_LIBRARY = {
  obsidian: [
    { title: 'Luxury Corporate',   url: 'https://cdn.pixabay.com/audio/2024/03/13/audio_3b8e5e7b4f.mp3', bpm: 90  },
    { title: 'Dark Cinematic',     url: 'https://cdn.pixabay.com/audio/2022/10/16/audio_aac7279e16.mp3', bpm: 80  },
    { title: 'Elegant Piano',      url: 'https://cdn.pixabay.com/audio/2023/01/03/audio_5e2e17e7cc.mp3', bpm: 70  },
  ],
  aurora: [
    { title: 'Space Ambient',      url: 'https://cdn.pixabay.com/audio/2022/08/04/audio_2dde668d05.mp3', bpm: 85  },
    { title: 'Neon Dreams',        url: 'https://cdn.pixabay.com/audio/2023/06/07/audio_81b0e6a4ac.mp3', bpm: 95  },
    { title: 'Deep Electronic',    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_0625c1539c.mp3', bpm: 100 },
  ],
  editorial: [
    { title: 'Light Corporate',    url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_476f8e1db0.mp3', bpm: 110 },
    { title: 'Inspiring Acoustic', url: 'https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3', bpm: 95  },
    { title: 'Minimal Tech',       url: 'https://cdn.pixabay.com/audio/2023/03/23/audio_d55cfa1e0b.mp3', bpm: 105 },
  ],
  crimson: [
    { title: 'Epic Cinematic',     url: 'https://cdn.pixabay.com/audio/2022/10/25/audio_cce8e9a0c5.mp3', bpm: 120 },
    { title: 'Dramatic Orchestra', url: 'https://cdn.pixabay.com/audio/2023/02/28/audio_7299c85d12.mp3', bpm: 90  },
    { title: 'Tension Builder',    url: 'https://cdn.pixabay.com/audio/2022/09/08/audio_d0a0b44483.mp3', bpm: 100 },
  ],
  arctic: [
    { title: 'Corporate Tech',     url: 'https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3', bpm: 105 },
    { title: 'Innovation Pulse',   url: 'https://cdn.pixabay.com/audio/2023/04/18/audio_54a0f71d80.mp3', bpm: 115 },
    { title: 'Blue Horizon',       url: 'https://cdn.pixabay.com/audio/2022/12/09/audio_c8e0227413.mp3', bpm: 90  },
  ],
  forest: [
    { title: 'Organic Ambient',    url: 'https://cdn.pixabay.com/audio/2022/11/17/audio_59b9c10e57.mp3', bpm: 75  },
    { title: 'Nature Corporate',   url: 'https://cdn.pixabay.com/audio/2023/05/11/audio_1697fce89c.mp3', bpm: 88  },
    { title: 'Peaceful Growth',    url: 'https://cdn.pixabay.com/audio/2022/07/26/audio_124bda1fbc.mp3', bpm: 80  },
  ],
}

const SLIDE_FPS = 30
const SLIDE_DUR = 150  // 5s per slide at 30fps

// ─────────────────────────────────────────────────────────────
// ThumbnailSlide — static CSS snapshot for grid + filmstrip
// ─────────────────────────────────────────────────────────────
function ThumbnailSlide({ slide, theme, logoUrl, index, total, isEditing = false }) {
  const themeObj     = THEMES.find(t => t.id === theme) || THEMES[0]
  const isDark       = theme !== 'editorial'
  const textColor    = isDark ? '#ffffff' : '#1a1a2e'
  const subtextColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)'
  const accent       = slide.accent || themeObj.accent

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: slide.bgColor || themeObj.bg, fontFamily: "'DM Sans',system-ui,sans-serif", display: 'flex', flexDirection: 'column', outline: isEditing ? `2px solid ${accent}` : 'none' }}>
      {slide.pexelsUrl && (
        <>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${slide.pexelsUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div style={{ position: 'absolute', inset: 0, background: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(250,250,248,0.88)' }} />
        </>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right,${accent},transparent)` }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: `linear-gradient(to bottom,${accent},transparent)`, opacity: 0.6 }} />
      <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 8, color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', fontWeight: 600 }}>{index + 1} / {total}</div>
      {logoUrl && <img src={logoUrl} alt="Logo" style={{ position: 'absolute', top: 6, right: 8, height: 12, width: 'auto', objectFit: 'contain', filter: isDark ? 'brightness(0) invert(1)' : 'none', opacity: 0.6, zIndex: 10 }} />}
      <div style={{ position: 'relative', zIndex: 5, padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 7, fontWeight: 700, color: accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>{SLIDE_TYPE_LABELS[slide.type] || slide.type}</div>
        <div style={{ fontSize: slide.type === 'cover' ? 13 : 10, fontWeight: 900, color: textColor, lineHeight: 1.1, letterSpacing: -0.3, fontFamily: "'Playfair Display',Georgia,serif", marginBottom: 4 }}>
          {slide.title?.slice(0, 40)}{slide.title?.length > 40 ? '…' : ''}
        </div>
        {slide.subtitle && <div style={{ fontSize: 8, color: subtextColor, lineHeight: 1.4 }}>{slide.subtitle.slice(0, 60)}{slide.subtitle.length > 60 ? '…' : ''}</div>}
        {slide.bullets?.length > 0 && !slide.subtitle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            {slide.bullets.slice(0, 3).map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                <span style={{ fontSize: 7, color: subtextColor }}>{b.slice(0, 35)}{b.length > 35 ? '…' : ''}</span>
              </div>
            ))}
          </div>
        )}
        {slide.stats?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {slide.stats.slice(0, 3).map((s, i) => (
              <div key={i} style={{ background: `${accent}20`, border: `1px solid ${accent}40`, borderRadius: 4, padding: '2px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: accent }}>{s.value}</div>
                <div style={{ fontSize: 6, color: subtextColor }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SlideEditorPanel
// ─────────────────────────────────────────────────────────────
function SlideEditorPanel({ slide, index, total, theme, onUpdate, onClose, onDelete, onDuplicate, onMoveUp, onMoveDown }) {
  const themeObj = THEMES.find(t => t.id === theme) || THEMES[0]
  const acc = themeObj.accent
  const [local, setLocal] = useState({ ...slide })
  const [pexelsQuery, setPexelsQuery] = useState('')
  const [pexelsResults, setPexelsResults] = useState([])
  const [searchingPexels, setSearchingPexels] = useState(false)

  const update       = (k, v)    => setLocal(p => ({ ...p, [k]: v }))
  const updateBullet = (i, v)    => { const b = [...(local.bullets || [])]; b[i] = v; setLocal(p => ({ ...p, bullets: b })) }
  const addBullet    = ()        => setLocal(p => ({ ...p, bullets: [...(p.bullets || []), ''] }))
  const removeBullet = i         => setLocal(p => ({ ...p, bullets: p.bullets.filter((_, j) => j !== i) }))
  const updateStat   = (i, k, v) => { const s = [...(local.stats || [])]; s[i] = { ...s[i], [k]: v }; setLocal(p => ({ ...p, stats: s })) }
  const addStat      = ()        => setLocal(p => ({ ...p, stats: [...(p.stats || []), { value: '', label: '' }] }))
  const removeStat   = i         => setLocal(p => ({ ...p, stats: p.stats.filter((_, j) => j !== i) }))

  const searchPexels = async () => {
    if (!pexelsQuery.trim()) return
    setSearchingPexels(true)
    try {
      const res = await fetch(`/api/pexels-search?q=${encodeURIComponent(pexelsQuery)}&per_page=6`)
      const data = await res.json()
      setPexelsResults(data.photos || [])
    } catch { } finally { setSearchingPexels(false) }
  }

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, outline: 'none' }
  const lbl = { display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 5 }
  const sec = { display: 'flex', flexDirection: 'column', gap: 6 }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#0d1020', borderLeft: '1px solid rgba(255,255,255,0.06)', zIndex: 300, display: 'flex', flexDirection: 'column', boxShadow: '-24px 0 80px rgba(0,0,0,0.7)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Edit Slide {index + 1}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{SLIDE_TYPE_LABELS[local.type] || local.type}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { icon: <ChevronUp size={13} />,   fn: () => onMoveUp(index),    dis: index === 0,       tip: 'Move up'   },
            { icon: <ChevronDown size={13} />, fn: () => onMoveDown(index),  dis: index === total-1, tip: 'Move down' },
            { icon: <Copy size={12} />,        fn: () => onDuplicate(index), dis: false,             tip: 'Duplicate' },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} disabled={b.dis} title={b.tip}
              style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', cursor: b.dis ? 'not-allowed' : 'pointer', opacity: b.dis ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {b.icon}
            </button>
          ))}
          <button onClick={() => onDelete(index)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}><Trash2 size={12} /></button>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={sec}><label style={lbl}>Slide Type</label>
          <select value={local.type} onChange={e => update('type', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            {SLIDE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        <div style={sec}><label style={lbl}>Motion / Animation</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {MOTION_PRESETS.map(m => (
              <button key={m.id} onClick={() => update('motion', m.id)}
                style={{ padding: '8px 10px', borderRadius: 9, cursor: 'pointer', textAlign: 'left', background: local.motion === m.id ? `${acc}15` : 'rgba(255,255,255,0.03)', border: local.motion === m.id ? `1px solid ${acc}50` : '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: local.motion === m.id ? acc : 'rgba(255,255,255,0.6)' }}>{m.label}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={sec}><label style={lbl}>Title</label><input value={local.title || ''} onChange={e => update('title', e.target.value)} style={inp} placeholder="Slide title..." /></div>
        <div style={sec}><label style={lbl}>Subtitle</label><input value={local.subtitle || ''} onChange={e => update('subtitle', e.target.value)} style={inp} placeholder="Subtitle..." /></div>

        {(local.type === 'cover' || local.type === 'title') && (
          <div style={sec}><label style={lbl}>Badge Label</label><input value={local.badge || ''} onChange={e => update('badge', e.target.value)} style={inp} placeholder="e.g. CONFIDENTIAL" /></div>
        )}

        {(local.type === 'bullets' || local.type === 'content' || local.type === 'agenda') && (
          <div style={sec}><label style={lbl}>Bullet Points</label>
            {(local.bullets || []).map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input value={b} onChange={e => updateBullet(i, e.target.value)} style={{ ...inp, flex: 1 }} placeholder={`Point ${i + 1}...`} />
                <button onClick={() => removeBullet(i)} style={{ width: 30, flexShrink: 0, borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
              </div>
            ))}
            <button onClick={addBullet} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px dashed ${acc}40`, background: `${acc}08`, cursor: 'pointer', color: acc, fontSize: 11, fontWeight: 700 }}><Plus size={12} /> Add bullet</button>
          </div>
        )}

        {local.type === 'stats' && (
          <div style={sec}><label style={lbl}>Statistics</label>
            {(local.stats || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={s.value} onChange={e => updateStat(i, 'value', e.target.value)} style={{ ...inp, width: 80, flexShrink: 0 }} placeholder="95%" />
                <input value={s.label} onChange={e => updateStat(i, 'label', e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Label..." />
                <button onClick={() => removeStat(i)} style={{ width: 30, flexShrink: 0, borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
              </div>
            ))}
            <button onClick={addStat} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1px dashed ${acc}40`, background: `${acc}08`, cursor: 'pointer', color: acc, fontSize: 11, fontWeight: 700 }}><Plus size={12} /> Add stat</button>
          </div>
        )}

        {local.type === 'cta' && <div style={sec}><label style={lbl}>CTA Button Text</label><input value={local.cta || ''} onChange={e => update('cta', e.target.value)} style={inp} placeholder="Get Started →" /></div>}

        {local.type === 'quote' && (
          <div style={sec}><label style={lbl}>Quote</label>
            <textarea value={local.quote || ''} onChange={e => update('quote', e.target.value)} style={{ ...inp, minHeight: 80, resize: 'vertical' }} placeholder="The quote text..." />
            <input value={local.author || ''} onChange={e => update('author', e.target.value)} style={inp} placeholder="— Author" />
          </div>
        )}

        <div style={sec}><label style={lbl}>Accent Color</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={local.accent || themeObj.accent} onChange={e => update('accent', e.target.value)} style={{ width: 40, height: 32, borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', padding: 2 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{local.accent || themeObj.accent}</span>
            <button onClick={() => update('accent', themeObj.accent)} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Reset</button>
          </div>
        </div>

        <div style={sec}><label style={lbl}>Background Image (Pexels)</label>
          {local.pexelsUrl && (
            <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
              <img src={local.pexelsUrl} alt="" style={{ width: '100%', height: 80, objectFit: 'cover' }} />
              <button onClick={() => update('pexelsUrl', '')} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 5, background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><X size={11} /></button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={pexelsQuery} onChange={e => setPexelsQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchPexels()} style={{ ...inp, flex: 1 }} placeholder="Search Pexels..." />
            <button onClick={searchPexels} disabled={searchingPexels} style={{ width: 34, borderRadius: 8, border: `1px solid ${acc}40`, background: `${acc}12`, cursor: 'pointer', color: acc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {searchingPexels ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <Search size={13} />}
            </button>
          </div>
          {pexelsResults.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
              {pexelsResults.map(p => (
                <div key={p.id} onClick={() => { update('pexelsUrl', p.src.large); setPexelsResults([]) }}
                  style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9', border: local.pexelsUrl === p.src.large ? `2px solid ${acc}` : '2px solid transparent' }}>
                  <img src={p.src.medium} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={sec}><label style={lbl}>Speaker Notes</label>
          <textarea value={local.notes || ''} onChange={e => update('notes', e.target.value)} style={{ ...inp, minHeight: 60, resize: 'vertical' }} placeholder="Personal notes..." />
        </div>
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => onUpdate(index, local)}
          style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${acc},#ec4899)`, color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Save size={14} /> Apply changes
        </button>
        <button onClick={onClose} style={{ padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// AddSlideModal
// ─────────────────────────────────────────────────────────────
function AddSlideModal({ themeId, onAdd, onClose, existingSlides }) {
  const themeObj = THEMES.find(t => t.id === themeId) || THEMES[0]
  const acc = themeObj.accent
  const [mode, setMode]           = useState('prompt')
  const [prompt, setPrompt]       = useState('')
  const [position, setPosition]   = useState('end')
  const [slideType, setSlideType] = useState('bullets')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [manual, setManual]       = useState({ type: 'bullets', title: '', subtitle: '', bullets: ['', '', ''], stats: [], motion: 'fade' })

  const generateSlide = async () => {
    if (!prompt.trim()) return
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/generer-videogen/add-slide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, themeId, slideType, context: existingSlides.map(s => s.title).join(', ') }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const at = position === 'start' ? 0 : position === 'end' ? existingSlides.length : Number(position)
      onAdd(data.slide, at)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const addManual = () => {
    const at = position === 'start' ? 0 : position === 'end' ? existingSlides.length : Number(position)
    onAdd({ ...manual, motion: manual.motion || 'fade' }, at)
  }

  const inp = { width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, outline: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
      <div style={{ width: 520, background: '#0d1020', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>Add New Slide</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Generate via AI or build manually</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
            {[['prompt', <Sparkles size={12} />, 'AI Prompt'], ['manual', <Edit3 size={12} />, 'Manual']].map(([id, icon, label]) => (
              <button key={id} onClick={() => setMode(id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: mode === id ? `${acc}18` : 'transparent', color: mode === id ? acc : 'rgba(255,255,255,0.35)', boxShadow: mode === id ? `0 0 0 1px ${acc}40` : 'none' }}>
                {icon}{label}
              </button>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Insert Position</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['start', 'At beginning'], ['end', 'At end']].map(([val, lbl]) => (
                <button key={val} onClick={() => setPosition(val)}
                  style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: position === val ? `1px solid ${acc}50` : '1px solid rgba(255,255,255,0.06)', background: position === val ? `${acc}10` : 'rgba(255,255,255,0.025)', color: position === val ? acc : 'rgba(255,255,255,0.4)' }}>
                  {lbl}
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>After #</span>
                <input type="number" min={1} max={existingSlides.length} placeholder="#" onChange={e => setPosition(String(Number(e.target.value)))} style={{ ...inp, padding: '7px 10px', textAlign: 'center' }} />
              </div>
            </div>
          </div>

          {mode === 'prompt' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Slide Type</label>
                <select value={slideType} onChange={e => setSlideType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  {SLIDE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Describe this slide</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. 'Key metrics: 98% uptime, 50K users'" rows={3} style={{ ...inp, resize: 'vertical', minHeight: 80 }} />
              </div>
              {error && <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>{error}</div>}
              <button onClick={generateSlide} disabled={!prompt.trim() || loading}
                style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: !prompt.trim() || loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13, background: !prompt.trim() ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${acc},#ec4899)`, color: !prompt.trim() ? 'rgba(255,255,255,0.2)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {loading ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Generating...</> : <><Sparkles size={15} /> Generate slide</>}
              </button>
            </>
          )}

          {mode === 'manual' && (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Type</label>
                  <select value={manual.type} onChange={e => setManual(p => ({ ...p, type: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                    {SLIDE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Motion</label>
                  <select value={manual.motion} onChange={e => setManual(p => ({ ...p, motion: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                    {MOTION_PRESETS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <input value={manual.title} onChange={e => setManual(p => ({ ...p, title: e.target.value }))} style={inp} placeholder="Slide title..." />
              <input value={manual.subtitle} onChange={e => setManual(p => ({ ...p, subtitle: e.target.value }))} style={inp} placeholder="Subtitle..." />
              <button onClick={addManual} disabled={!manual.title.trim()}
                style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: !manual.title.trim() ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13, background: !manual.title.trim() ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${acc},#ec4899)`, color: !manual.title.trim() ? 'rgba(255,255,255,0.2)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Plus size={15} /> Add slide
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MusicPanel — floating dropdown with EQ bars + track selector
// ─────────────────────────────────────────────────────────────
function MusicPanel({ theme, themeObj, musicEnabled, setMusicEnabled, musicVolume, setMusicVolume, selectedMusic, setSelectedMusic, musicPlaying, audioRef, fadeInMusic, fadeOutMusic }) {
  const acc    = themeObj.accent
  const tracks = MUSIC_LIBRARY[theme] || MUSIC_LIBRARY.obsidian
  const [bars, setBars] = useState([8, 14, 6, 18, 10])

  // Animate EQ bars while playing
  useEffect(() => {
    if (!musicPlaying) return
    const iv = setInterval(() => setBars([
      4 + Math.random() * 16, 4 + Math.random() * 16,
      4 + Math.random() * 16, 4 + Math.random() * 16,
      4 + Math.random() * 16,
    ]), 140)
    return () => clearInterval(iv)
  }, [musicPlaying])

  const activeUrl = selectedMusic?.url || tracks[0]?.url

  const switchTrack = (track) => {
    setSelectedMusic(track)
    if (audioRef.current) {
      audioRef.current.src = track.url
      audioRef.current.load()
      if (musicEnabled) fadeInMusic()
    }
  }

  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 500, width: 296, background: '#0d1020', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.85)' }}>
      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Music size={13} color={acc} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Background Music</span>
        </div>
        <button
          onClick={() => { if (musicEnabled) fadeOutMusic(); else fadeInMusic(); setMusicEnabled(e => !e) }}
          style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', background: musicEnabled ? acc : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', left: musicEnabled ? 23 : 3, transition: 'left .2s' }} />
        </button>
      </div>

      {/* Volume */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {musicVolume === 0 ? <VolumeX size={11} color="rgba(255,255,255,0.4)" /> : <Volume2 size={11} color={acc} />}
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(255,255,255,0.35)' }}>Volume</span>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: acc, fontWeight: 800 }}>{Math.round(musicVolume * 100)}%</span>
        </div>
        <input type="range" min={0} max={0.6} step={0.01} value={musicVolume}
          onChange={e => setMusicVolume(Number(e.target.value))}
          style={{ width: '100%', accentColor: acc, cursor: 'pointer' }} />
      </div>

      {/* Tracks */}
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.15em', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>
        Tracks · {themeObj.label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tracks.map((track, i) => {
          const isActive = activeUrl === track.url
          return (
            <button key={i} onClick={() => switchTrack(track)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: isActive ? `${acc}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? acc + '50' : 'rgba(255,255,255,0.06)'}`, transition: 'all .15s' }}>
              {/* Icon / animated EQ */}
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${acc}20`, border: `1px solid ${acc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isActive && musicPlaying
                  ? <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
                      {bars.map((h, bi) => <div key={bi} style={{ width: 2, height: h, background: acc, borderRadius: 1, transition: 'height .14s' }} />)}
                    </div>
                  : <span style={{ fontSize: 13, color: isActive ? acc : 'rgba(255,255,255,0.28)' }}>♪</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? acc : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{track.bpm} BPM</div>
              </div>
              {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: acc, boxShadow: `0 0 8px ${acc}`, flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>

      {/* Preview button */}
      <button
        onClick={() => musicPlaying ? fadeOutMusic() : fadeInMusic()}
        style={{ width: '100%', marginTop: 12, padding: '9px', borderRadius: 10, border: `1px solid ${acc}40`, background: `${acc}10`, color: acc, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {musicPlaying ? <><Square size={11} fill="currentColor" /> Stop preview</> : <><Play size={11} fill="currentColor" /> Preview track</>}
      </button>

      <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.18)', lineHeight: 1.6, textAlign: 'center' }}>
        Pixabay License · Free commercial use · No attribution required
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Export progress toast (only visible during finalization)
// ─────────────────────────────────────────────────────────────
function ExportToast({ progress, stage, accent }) {
  if (progress < 98) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 600, width: 400, background: 'rgba(10,10,20,0.97)', border: `1px solid ${accent}50`, borderRadius: 14, padding: '14px 20px', backdropFilter: 'blur(20px)', boxShadow: `0 8px 40px rgba(0,0,0,0.7)`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{progress >= 100 ? '✅ Export complete!' : '⏳ Finalising...'}</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: accent, fontWeight: 800 }}>{progress}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${accent},#ec4899)`, width: `${progress}%`, transition: 'width .4s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{stage}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function PowerPointGen() {
  const allowed = usePlanGuard('pro')
  const { deductCredits, hasCredits, credits } = useCredits()
  const router = useRouter()

  // Refs
  const logoInputRef       = useRef(null)
  const playerRef          = useRef(null)
  const playerContainerRef = useRef(null)
  const audioRef           = useRef(null)
  const musicPanelRef      = useRef(null)
  const mediaRecorderRef   = useRef(null)
  const recordedChunksRef  = useRef([])
  const cancelExportRef    = useRef(false)

  // Form
  const [topic, setTopic]           = useState('')
  const [context, setContext]       = useState('')
  const [theme, setTheme]           = useState('obsidian')
  const [slideCount, setSlideCount] = useState(10)
  const [layout, setLayout]         = useState('widescreen')
  const [logoFile, setLogoFile]     = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  // Deck
  const [loading, setLoading]           = useState(false)
  const [loadingStep, setLoadingStep]   = useState(0)
  const [deck, setDeck]                 = useState(null)
  const [error, setError]               = useState('')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [viewMode, setViewMode]         = useState('grid')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [remotionReady, setRemotionReady] = useState(false)

  // Editor
  const [editingSlide, setEditingSlide]   = useState(null)
  const [showAddModal, setShowAddModal]   = useState(false)
  const [exportingPptx, setExportingPptx] = useState(false)

  // MP4
  const [exportingMp4, setExportingMp4] = useState(false)
  const [mp4Progress, setMp4Progress]   = useState(0)
  const [mp4Stage, setMp4Stage]         = useState('')

  // Music
  const [musicEnabled, setMusicEnabled]     = useState(true)
  const [musicVolume, setMusicVolume]       = useState(0.22)
  const [selectedMusic, setSelectedMusic]   = useState(null)
  const [musicPlaying, setMusicPlaying]     = useState(false)
  const [showMusicPanel, setShowMusicPanel] = useState(false)

  // Derived
  const themeObj        = THEMES.find(t => t.id === theme) || THEMES[0]
  const layoutObj       = LAYOUTS.find(l => l.id === layout) || LAYOUTS[0]
  const totalFrames     = deck ? deck.slides.length * SLIDE_DUR : SLIDE_DUR
  const totalDurationMs = deck ? (deck.slides.length * SLIDE_DUR / SLIDE_FPS) * 1000 : 0

  useEffect(() => { const t = setTimeout(() => setRemotionReady(true), 500); return () => clearTimeout(t) }, [])

  // Close music panel on outside click
  useEffect(() => {
    const fn = (e) => { if (musicPanelRef.current && !musicPanelRef.current.contains(e.target)) setShowMusicPanel(false) }
    if (showMusicPanel) document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [showMusicPanel])

  // ── Music ────────────────────────────────────────────────
  const getThemeTrack = useCallback(() => {
    const tracks = MUSIC_LIBRARY[theme] || MUSIC_LIBRARY.obsidian
    return selectedMusic || tracks[0]
  }, [theme, selectedMusic])

  const fadeInMusic = useCallback((targetVol) => {
    if (!audioRef.current) return
    const vol = targetVol ?? musicVolume
    audioRef.current.volume = 0
    audioRef.current.loop   = true
    audioRef.current.play().catch(() => { })
    setMusicPlaying(true)
    let cur = 0; const step = vol / 30
    const iv = setInterval(() => {
      if (!audioRef.current) { clearInterval(iv); return }
      cur = Math.min(cur + step, vol); audioRef.current.volume = cur
      if (cur >= vol) clearInterval(iv)
    }, 80)
  }, [musicVolume])

  const fadeOutMusic = useCallback(() => {
    if (!audioRef.current) return
    const start = audioRef.current.volume; let cur = start
    const step = Math.max(start / 20, 0.005)
    const iv = setInterval(() => {
      if (!audioRef.current) { clearInterval(iv); return }
      cur = Math.max(cur - step, 0); audioRef.current.volume = cur
      if (cur <= 0) { clearInterval(iv); audioRef.current.pause(); setMusicPlaying(false) }
    }, 60)
  }, [])

  // Volume sync
  useEffect(() => { if (audioRef.current && musicPlaying) audioRef.current.volume = musicVolume }, [musicVolume, musicPlaying])

  // Theme change → reset track
  useEffect(() => {
    setSelectedMusic(null)
    if (audioRef.current && musicPlaying) {
      const track = MUSIC_LIBRARY[theme]?.[0]
      if (track) { audioRef.current.src = track.url; audioRef.current.load(); fadeInMusic() }
    }
  }, [theme]) // eslint-disable-line

  // ── Logo ──
  const readLogo = (file) => {
    if (!file?.type.startsWith('image/')) return
    setLogoFile(file)
    const r = new FileReader(); r.onload = e => setLogoPreview(e.target.result); r.readAsDataURL(file)
  }

  // ── Reset ──
  const reset = () => { setDeck(null); setCurrentSlide(0); setViewMode('grid'); setError(''); setEditingSlide(null); setShowAddModal(false); fadeOutMusic() }

  // ── Slide CRUD ──
  const handleUpdateSlide    = useCallback((i, s) => { setDeck(p => ({ ...p, slides: p.slides.map((x, j) => j === i ? s : x) })); setEditingSlide(null) }, [])
  const handleDeleteSlide    = useCallback((i) => { setDeck(p => ({ ...p, slides: p.slides.filter((_, j) => j !== i) })); setEditingSlide(null); setCurrentSlide(c => Math.min(c, Math.max(0, (deck?.slides.length || 1) - 2))) }, [deck])
  const handleDuplicateSlide = useCallback((i) => { setDeck(p => { const s = [...p.slides]; s.splice(i + 1, 0, { ...s[i] }); return { ...p, slides: s } }) }, [])
  const handleMoveSlide      = useCallback((i, dir) => { setDeck(p => { const s = [...p.slides]; const t = i + dir; if (t < 0 || t >= s.length) return p; [s[i], s[t]] = [s[t], s[i]]; return { ...p, slides: s } }); setEditingSlide(x => x !== null ? x + dir : null) }, [])
  const handleAddSlide       = useCallback((slide, at) => { setDeck(p => { const s = [...p.slides]; s.splice(at, 0, slide); return { ...p, slides: s } }); setShowAddModal(false); setCurrentSlide(at) }, [])

  // ── Generate ──
  const handleGenerate = async () => {
    if (!topic.trim() || !hasCredits(10)) { if (!hasCredits(10)) router.push('/pricing'); return }
    setLoading(true); setError(''); setDeck(null); setLoadingStep(0)
    let step = 0; const iv = setInterval(() => { step = Math.min(step + 1, LOADING_STEPS.length - 1); setLoadingStep(step) }, 2800)
    try {
      const res  = await fetch('/api/generer-videogen/powerpoint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, context, theme, slideCount, layout }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      await deductCredits(10); setDeck(data); setCurrentSlide(0); setViewMode('grid')
    } catch (err) { setError(err.message) }
    finally { clearInterval(iv); setLoading(false); setLoadingStep(0) }
  }

  const handleDownloadJSON = () => {
    if (!deck) return
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' })); a.download = `deck_${Date.now()}.json`; a.click()
  }

  const handleExportPPTX = async () => {
    if (!deck) return; setExportingPptx(true)
    try {
      const res = await fetch('/api/generer-videogen/export-pptx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slides: deck.slides, themeId: theme, logoUrl: logoPreview, title: deck.title, width: layoutObj.width, height: layoutObj.height }) })
      if (!res.ok) throw new Error('Export PPTX failed')
      const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = `${deck.title || 'deck'}_${Date.now()}.pptx`; a.click()
    } catch (err) { setError(err.message) } finally { setExportingPptx(false) }
  }

  // ── Export MP4 (screen capture + music) ──────────────────
  const handleExportMp4 = async () => {
    if (!deck || exportingMp4) return
    if (typeof MediaRecorder === 'undefined') { setError('MediaRecorder not supported — use Chrome or Edge.'); return }

    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm'
    cancelExportRef.current = false; recordedChunksRef.current = []

    setViewMode('present'); setCurrentSlide(0)
    await new Promise(r => setTimeout(r, 600))

    // Fullscreen the player container
    const container = playerContainerRef.current
    if (container) {
      try { await (container.requestFullscreen || container.webkitRequestFullscreen || (() => { })).call(container); await new Promise(r => setTimeout(r, 500)) } catch { }
    }

    // Request screen share
    let displayStream
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor', frameRate: { ideal: SLIDE_FPS }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' })
    } catch (err) {
      if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => { })
      setError(err.name === 'NotAllowedError' ? 'Screen sharing refused — please allow and select the browser tab.' : 'Screen capture failed: ' + err.message)
      return
    }

    const recorder = new MediaRecorder(displayStream, { mimeType, videoBitsPerSecond: 10_000_000 })
    mediaRecorderRef.current = recorder
    recorder.ondataavailable = e => { if (e.data?.size > 0) recordedChunksRef.current.push(e.data) }

    recorder.onstop = async () => {
      displayStream.getTracks().forEach(t => t.stop())
      if (document.exitFullscreen && document.fullscreenElement) await document.exitFullscreen().catch(() => { })

      // Fade out music
      if (audioRef.current) {
        const sv = audioRef.current.volume; let v = sv; const step = Math.max(sv / 15, 0.005)
        await new Promise(res => {
          const iv = setInterval(() => {
            if (!audioRef.current) { clearInterval(iv); res(); return }
            v = Math.max(v - step, 0); audioRef.current.volume = v
            if (v <= 0) { clearInterval(iv); audioRef.current.pause(); setMusicPlaying(false); res() }
          }, 60)
        })
      }

      if (cancelExportRef.current) { setExportingMp4(false); setMp4Progress(0); return }

      setExportingMp4(true); setMp4Progress(98); setMp4Stage('Assembling video file...')
      await new Promise(r => setTimeout(r, 200))

      const blob = new Blob(recordedChunksRef.current, { type: mimeType })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = `${(deck?.title || 'deck').replace(/\s+/g, '_')}_${Date.now()}.webm`; a.click()
      URL.revokeObjectURL(a.href)

      setMp4Stage('Download started ✓'); setMp4Progress(100)
      setTimeout(() => { setExportingMp4(false); setMp4Progress(0) }, 2500)
    }

    if (playerRef.current) { playerRef.current.seekTo(0); await new Promise(r => setTimeout(r, 300)) }
    recorder.start(200)
    await new Promise(r => setTimeout(r, 200))

    // Start music with fade-in during recording
    if (musicEnabled && audioRef.current) {
      const track = getThemeTrack()
      audioRef.current.src = track.url; audioRef.current.volume = 0; audioRef.current.loop = true
      await audioRef.current.play().catch(() => { }); setMusicPlaying(true)
      let v = 0; const target = musicVolume; const step = target / 25
      const fi = setInterval(() => {
        if (!audioRef.current) { clearInterval(fi); return }
        v = Math.min(v + step, target); audioRef.current.volume = v
        if (v >= target) clearInterval(fi)
      }, 80)
    }

    if (playerRef.current) playerRef.current.play()

    // Wait silently for full duration (no UI updates = no re-renders during recording)
    try {
      await new Promise((res, rej) => {
        const t = setTimeout(res, totalDurationMs + 1500)
        const c = setInterval(() => { if (cancelExportRef.current) { clearInterval(c); clearTimeout(t); rej() } }, 500)
      })
    } catch { }

    if (playerRef.current) playerRef.current.pause()
    recorder.stop()
  }

  const handleCancelMp4 = () => {
    cancelExportRef.current = true; mediaRecorderRef.current?.stop(); playerRef.current?.pause(); fadeOutMusic(); setExportingMp4(false); setMp4Progress(0)
  }

  // ── Navigation ──
  const navigateSlide = useCallback((dir) => {
    if (!deck) return
    const next = Math.max(0, Math.min(deck.slides.length - 1, currentSlide + dir))
    setCurrentSlide(next); playerRef.current?.seekTo(next * SLIDE_DUR)
  }, [deck, currentSlide])

  const handleKeyDown = useCallback((e) => {
    if (editingSlide !== null || showAddModal) return
    if (!deck || viewMode !== 'present') return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navigateSlide(1) }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); navigateSlide(-1) }
    if (e.key === 'f' || e.key === 'F') setIsFullscreen(f => !f)
    if (e.key === 'Escape') setIsFullscreen(false)
  }, [deck, viewMode, navigateSlide, editingSlide, showAddModal])

  const handleFrameUpdate = useCallback((frame) => {
    const idx = Math.floor(frame / SLIDE_DUR)
    if (idx !== currentSlide && deck && idx < deck.slides.length) setCurrentSlide(idx)
  }, [currentSlide, deck])

  if (!allowed) return (
    <div style={{ minHeight: '100vh', background: '#06080f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <Presentation size={22} color="#c9a84c" />
      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #c9a84c', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const acc = themeObj.accent

  return (
    <main style={{ minHeight: '100vh', background: '#06080f', color: '#fff', fontFamily: "'DM Sans',system-ui,sans-serif" }} onKeyDown={handleKeyDown} tabIndex={0}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping    { 75%,100%{transform:scale(1.6);opacity:0} }
        @keyframes eq0 { from{height:3px}  to{height:9px}  }
        @keyframes eq1 { from{height:5px}  to{height:15px} }
        @keyframes eq2 { from{height:3px}  to{height:11px} }
        @keyframes eq3 { from{height:6px}  to{height:17px} }
        @keyframes eq4 { from{height:4px}  to{height:10px} }
        .slide-up { animation: slideUp .4s ease forwards; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.18) !important; }
        select option { background: #1a1a2e; color: #fff; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input[type=range] { -webkit-appearance:none; appearance:none; height:4px; border-radius:99px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; cursor:pointer; }
        .edit-btn{opacity:0!important}
        div:hover>.edit-btn{opacity:1!important}
      `}</style>

      {/* Invisible audio engine */}
      <audio ref={audioRef} src={getThemeTrack()?.url} loop preload="none" style={{ display: 'none' }} />

      {/* Modals */}
      {showAddModal && deck && <AddSlideModal themeId={theme} existingSlides={deck.slides} onAdd={handleAddSlide} onClose={() => setShowAddModal(false)} />}
      {editingSlide !== null && deck && (
        <SlideEditorPanel slide={deck.slides[editingSlide]} index={editingSlide} total={deck.slides.length} theme={theme}
          onUpdate={handleUpdateSlide} onClose={() => setEditingSlide(null)} onDelete={handleDeleteSlide}
          onDuplicate={handleDuplicateSlide} onMoveUp={i => handleMoveSlide(i, -1)} onMoveDown={i => handleMoveSlide(i, 1)} />
      )}
      <ExportToast progress={mp4Progress} stage={mp4Stage} accent={acc} />

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-5%', width: '55vw', height: '55vw', borderRadius: '50%', opacity: .03, background: `radial-gradient(circle,${acc},transparent 70%)` }} />
      </div>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', background: 'rgba(6,8,15,0.92)', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${acc},#ec4899)` }}>
            <Presentation size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-.3px' }}>VisualGen</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 99, border: `1px solid ${acc}40`, background: `${acc}10`, color: acc }}>Deck AI</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>Prompt → Animated Presentation</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {deck && (
            <>
              <button onClick={() => setShowAddModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, background: `${acc}15`, border: `1px solid ${acc}40`, color: acc, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                <Plus size={11} /> Add Slide
              </button>

              <button onClick={() => setViewMode(v => v === 'grid' ? 'present' : 'grid')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {viewMode === 'grid' ? <><Play size={10} /> Present</> : <><Grid size={10} /> Grid</>}
              </button>

              {/* ── Music button + panel ── */}
              <div style={{ position: 'relative' }} ref={musicPanelRef}>
                <button onClick={() => setShowMusicPanel(p => !p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, background: musicEnabled ? `${acc}15` : 'rgba(255,255,255,0.05)', border: `1px solid ${musicEnabled ? acc + '45' : 'rgba(255,255,255,0.08)'}`, color: musicEnabled ? acc : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all .2s' }}>
                  {musicEnabled ? <Music size={11} /> : <VolumeX size={11} />}
                  Music
                  {musicPlaying && (
                    <span style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 12, marginLeft: 2 }}>
                      {[0, 1, 2, 3, 4].map(i => (
                        <span key={i} style={{ display: 'block', width: 2, background: acc, borderRadius: 1, animation: `eq${i} .6s ease-in-out ${i * 0.1}s infinite alternate` }} />
                      ))}
                    </span>
                  )}
                </button>
                {showMusicPanel && (
                  <MusicPanel
                    theme={theme} themeObj={themeObj}
                    musicEnabled={musicEnabled} setMusicEnabled={setMusicEnabled}
                    musicVolume={musicVolume} setMusicVolume={setMusicVolume}
                    selectedMusic={selectedMusic} setSelectedMusic={setSelectedMusic}
                    musicPlaying={musicPlaying} audioRef={audioRef}
                    fadeInMusic={fadeInMusic} fadeOutMusic={fadeOutMusic}
                  />
                )}
              </div>

              {/* Export MP4 */}
              <button onClick={exportingMp4 ? handleCancelMp4 : handleExportMp4}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: exportingMp4 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#ef4444,#ec4899)', color: exportingMp4 ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: 11, fontWeight: 800, boxShadow: exportingMp4 ? 'none' : '0 4px 16px rgba(239,68,68,0.3)' }}>
                <Video size={11} />{exportingMp4 ? 'Cancel' : 'Export MP4'}
              </button>

              {/* Export PPTX */}
              <button onClick={handleExportPPTX} disabled={exportingPptx}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: 'none', cursor: exportingPptx ? 'wait' : 'pointer', background: exportingPptx ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${acc},#ec4899)`, color: '#fff', fontSize: 11, fontWeight: 800, boxShadow: exportingPptx ? 'none' : `0 4px 16px ${acc}30` }}>
                {exportingPptx ? <><div style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> PPTX...</> : <><Presentation size={11} /> PPTX</>}
              </button>

              <button onClick={handleDownloadJSON}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                <Download size={10} /> JSON
              </button>

              <button onClick={reset}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                <RefreshCw size={10} /> New
              </button>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99, border: `1px solid ${acc}30`, background: `${acc}08` }}>
            <Zap size={11} fill="currentColor" color={acc} />
            <span style={{ fontSize: 12, fontWeight: 900, color: acc }}>{credits}</span>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: editingSlide !== null ? 'none' : 1240, margin: '0 auto', padding: '36px 24px', paddingRight: editingSlide !== null ? 404 : 24, transition: 'padding-right .3s' }}>

        {error && (
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={15} color="#f87171" /><span style={{ fontSize: 13, color: '#f87171', flex: 1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex' }}><X size={14} /></button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,8,15,0.97)', backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, maxWidth: 380 }}>
              <div style={{ position: 'relative', width: 96, height: 96 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${acc}20`, animation: 'ping 1.4s ease infinite' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${acc}12`, border: `2px solid ${acc}40` }}>
                  <Presentation size={32} color={acc} />
                </div>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {LOADING_STEPS.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 12, background: i === loadingStep ? `${acc}12` : 'rgba(255,255,255,0.02)', border: i === loadingStep ? `1px solid ${acc}40` : '1px solid transparent', opacity: i > loadingStep ? 0.3 : 1 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: i < loadingStep ? '#10b981' : i === loadingStep ? acc : 'rgba(255,255,255,0.06)' }}>
                      {i < loadingStep ? <CheckCircle size={12} color="#fff" /> : i === loadingStep ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: i === loadingStep ? acc : 'rgba(255,255,255,0.4)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ INPUT VIEW ══ */}
        {!deck && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div>
                <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.06, margin: '0 0 12px' }}>
                  Describe your deck.<br />
                  <span style={{ background: `linear-gradient(90deg,${acc} 0%,#ec4899 60%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>We build the slides.</span>
                </h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>Claude structures → Pexels backgrounds → Remotion animates → Pixabay music.</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.18em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Presentation Topic *</label>
                <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. 'Q3 2025 Investor Update for a fintech startup'"
                  style={{ width: '100%', padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#fff', fontSize: 15, outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = `${acc}50`} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.18em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Additional Context</label>
                <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="audience, key messages, tone, industry..." rows={4}
                  style={{ width: '100%', padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 100 }}
                  onFocus={e => e.target.style.borderColor = `${acc}50`} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.18em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Logo <span style={{ color: 'rgba(255,255,255,0.18)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => readLogo(e.target.files[0])} />
                {logoPreview
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <img src={logoPreview} alt="Logo" style={{ height: 28, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flex: 1 }}>{logoFile?.name}</span>
                      <button onClick={() => { setLogoFile(null); setLogoPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}><X size={13} /></button>
                    </div>
                  : <button onClick={() => logoInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                      <ImagePlus size={14} /> Upload your logo · PNG, SVG
                    </button>
                }
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.18em', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Visual Theme</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => setTheme(t.id)}
                      style={{ textAlign: 'left', padding: '12px', borderRadius: 12, cursor: 'pointer', background: theme === t.id ? `${t.accent}12` : 'rgba(255,255,255,0.025)', border: theme === t.id ? `1px solid ${t.accent}50` : '1px solid rgba(255,255,255,0.06)', transition: 'all .15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1px solid ${t.accent}60`, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: theme === t.id ? t.accent : 'rgba(255,255,255,0.6)' }}>{t.label}</span>
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.18em', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Slide Count</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {SLIDE_COUNTS.map(sc => (
                    <button key={sc.value} onClick={() => setSlideCount(sc.value)}
                      style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', background: slideCount === sc.value ? `${acc}12` : 'rgba(255,255,255,0.025)', border: slideCount === sc.value ? `1px solid ${acc}45` : '1px solid rgba(255,255,255,0.06)', color: slideCount === sc.value ? acc : 'rgba(255,255,255,0.45)', transition: 'all .15s' }}>
                      <div style={{ fontWeight: 800, fontSize: 12 }}>{sc.label}</div>
                      <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{sc.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.18em', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Layout</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {LAYOUTS.map(l => { const Icon = l.icon; return (
                    <button key={l.id} onClick={() => setLayout(l.id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, cursor: 'pointer', background: layout === l.id ? `${acc}12` : 'rgba(255,255,255,0.025)', border: layout === l.id ? `1px solid ${acc}45` : '1px solid rgba(255,255,255,0.06)', color: layout === l.id ? acc : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 700, transition: 'all .15s' }}>
                      <Icon size={13} /> {l.label}
                    </button>
                  )})}
                </div>
              </div>

              {/* Included */}
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ padding: '8px 14px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.18em', color: 'rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>Included</div>
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['AI-structured slides',             '⚡ 10 credits', false],
                    ['Pexels cinematic backgrounds',     'Free',          true],
                    ['Remotion frame animations',        'Free',          true],
                    ['Pixabay background music (18 tracks)', 'Free',     true],
                    ['Logo overlay on every slide',      'Optional',      true],
                    ['JSON + PPTX + MP4 export',         'Free',          true],
                  ].map(([label, val, green]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'rgba(255,255,255,0.38)' }}>{label}</span>
                      <span style={{ fontWeight: 700, color: green ? '#10b981' : 'rgba(255,255,255,0.55)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleGenerate} disabled={loading || !topic.trim() || !hasCredits(10)}
                style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', fontWeight: 900, fontSize: 14, cursor: !topic.trim() || !hasCredits(10) ? 'not-allowed' : 'pointer', background: !topic.trim() ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${acc},#ec4899)`, color: !topic.trim() ? 'rgba(255,255,255,0.18)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: topic.trim() ? `0 8px 32px ${acc}30` : 'none' }}>
                {!topic.trim() ? <><FileText size={15} /> Enter a topic first</> : <><Wand2 size={16} /> Generate {slideCount} Slides · ⚡10 <ChevronRight size={13} /></>}
              </button>

              {credits < 10 && <p style={{ textAlign: 'center', fontSize: 12, color: acc, margin: 0 }}>⚠ 10 credits required — <button onClick={() => router.push('/pricing')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: acc, fontWeight: 800, textDecoration: 'underline', fontSize: 12, padding: 0 }}>Get more</button></p>}
            </div>
          </div>
        )}

        {/* ══ GRID VIEW ══ */}
        {deck && viewMode === 'grid' && (
          <div className="slide-up">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <CheckCircle size={16} color="#10b981" />
                  <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-.5px' }}>{deck.title}</h2>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 99 }}>{deck.slides.length} slides</span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{deck.description}</p>
              </div>
              <button onClick={() => setViewMode('present')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${acc},#ec4899)`, color: '#fff', fontWeight: 800, fontSize: 13, boxShadow: `0 6px 24px ${acc}35` }}>
                <Play size={13} /> Present
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
              {deck.slides.map((slide, i) => (
                <div key={i}
                  style={{ position: 'relative', cursor: 'pointer', borderRadius: 10, overflow: 'hidden', aspectRatio: layout === 'widescreen' ? '16/9' : '4/3', border: editingSlide === i ? `2px solid ${acc}` : '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', transition: 'all .2s' }}
                  onClick={() => { setCurrentSlide(i); setViewMode('present') }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.borderColor = acc + '60' }}
                  onMouseLeave={e => { if (editingSlide !== i) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' } }}>
                  <ThumbnailSlide slide={slide} theme={theme} logoUrl={logoPreview} index={i} total={deck.slides.length} isEditing={editingSlide === i} />
                  <button onClick={e => { e.stopPropagation(); setEditingSlide(i) }}
                    style={{ position: 'absolute', top: 5, left: 5, width: 24, height: 24, borderRadius: 6, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }} className="edit-btn">
                    <Edit3 size={11} />
                  </button>
                </div>
              ))}
              <button onClick={() => setShowAddModal(true)}
                style={{ borderRadius: 10, aspectRatio: layout === 'widescreen' ? '16/9' : '4/3', border: `2px dashed ${acc}30`, background: `${acc}05`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: acc, transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = acc + '70'; e.currentTarget.style.background = acc + '10' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = acc + '30'; e.currentTarget.style.background = acc + '05' }}>
                <Plus size={20} /><span style={{ fontSize: 11, fontWeight: 700 }}>Add slide</span>
              </button>
            </div>
          </div>
        )}

        {/* ══ PRESENT VIEW ══ */}
        {deck && viewMode === 'present' && (
          <div className="slide-up">
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <button onClick={() => setViewMode('grid')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                <Grid size={11} /> All slides
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => navigateSlide(-1)} disabled={currentSlide === 0}
                  style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentSlide === 0 ? 'not-allowed' : 'pointer', opacity: currentSlide === 0 ? 0.3 : 1 }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', minWidth: 60, textAlign: 'center' }}>{currentSlide + 1} / {deck.slides.length}</span>
                <button onClick={() => navigateSlide(1)} disabled={currentSlide === deck.slides.length - 1}
                  style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentSlide === deck.slides.length - 1 ? 'not-allowed' : 'pointer', opacity: currentSlide === deck.slides.length - 1 ? 0.3 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <button onClick={() => setEditingSlide(currentSlide)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: `1px solid ${acc}40`, background: `${acc}10`, color: acc, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                  <Edit3 size={11} /> Edit
                </button>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace' }}>{SLIDE_TYPE_LABELS[deck.slides[currentSlide]?.type]}</span>
                <button onClick={() => setIsFullscreen(f => !f)}
                  style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                </button>
              </div>
            </div>

            {/* Remotion Player */}
            <div ref={playerContainerRef}
              style={{ width: '100%', position: isFullscreen ? 'fixed' : 'relative', inset: isFullscreen ? 0 : 'auto', zIndex: isFullscreen ? 200 : 'auto', background: isFullscreen ? '#000' : 'transparent', padding: isFullscreen ? '40px' : 0, borderRadius: isFullscreen ? 0 : 20, overflow: 'hidden', boxShadow: isFullscreen ? 'none' : '0 40px 100px rgba(0,0,0,0.8)', border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
              {isFullscreen && (
                <button onClick={() => setIsFullscreen(false)}
                  style={{ position: 'absolute', top: 16, right: 16, zIndex: 210, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '7px 13px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Minimize2 size={11} /> Exit
                </button>
              )}
              {remotionReady && DeckComposition
                ? <Suspense fallback={<div style={{ width: '100%', aspectRatio: '16/9', background: '#0a0a12', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTop: `2px solid ${acc}`, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /></div>}>
                    <RemotionPlayer
                      ref={playerRef}
                      component={DeckComposition}
                      inputProps={{ slides: deck.slides, themeId: theme, logoUrl: logoPreview, slideDur: SLIDE_DUR }}
                      durationInFrames={totalFrames}
                      compositionWidth={layoutObj.width}
                      compositionHeight={layoutObj.height}
                      fps={SLIDE_FPS}
                      style={{ width: '100%', aspectRatio: layout === 'widescreen' ? '16/9' : '4/3', borderRadius: isFullscreen ? 0 : 16 }}
                      controls autoPlay={false} loop={false} showVolumeControls={false} clickToPlay={false}
                      initialFrame={currentSlide * SLIDE_DUR}
                      onFrameUpdate={handleFrameUpdate}
                    />
                  </Suspense>
                : <div style={{ width: '100%', aspectRatio: layout === 'widescreen' ? '16/9' : '4/3', borderRadius: 16, overflow: 'hidden' }}>
                    <ThumbnailSlide slide={deck.slides[currentSlide]} theme={theme} logoUrl={logoPreview} index={currentSlide} total={deck.slides.length} />
                  </div>
              }
            </div>

            {/* MP4 hint */}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 9, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)', fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>
              <Video size={11} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span><strong style={{ color: 'rgba(255,255,255,0.55)' }}>Export MP4</strong> — records this player with Pixabay music · Chrome/Edge · ~{Math.round(totalDurationMs / 1000)}s</span>
            </div>

            {/* Keyboard hints */}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
              {[['← →', 'Navigate'], ['F', 'Fullscreen'], ['E', 'Edit']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 6px', fontFamily: 'monospace', fontSize: 10 }}>{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>

            {/* Filmstrip */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 0 4px', scrollbarWidth: 'none' }}>
              {deck.slides.map((slide, i) => (
                <div key={i}
                  style={{ flexShrink: 0, position: 'relative', borderRadius: 7, overflow: 'hidden', width: 96, aspectRatio: '16/9', border: i === currentSlide ? `2px solid ${acc}` : '2px solid rgba(255,255,255,0.06)', opacity: i === currentSlide ? 1 : 0.5, transform: i === currentSlide ? 'scale(1.06)' : 'scale(1)', transition: 'all .2s', cursor: 'pointer' }}
                  onClick={() => { setCurrentSlide(i); playerRef.current?.seekTo(i * SLIDE_DUR) }}>
                  <ThumbnailSlide slide={slide} theme={theme} logoUrl={logoPreview} index={i} total={deck.slides.length} />
                  <button onClick={e => { e.stopPropagation(); setEditingSlide(i) }}
                    style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 4, background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 0.6 }}>
                    <Edit3 size={9} />
                  </button>
                </div>
              ))}
              <button onClick={() => setShowAddModal(true)}
                style={{ flexShrink: 0, width: 96, aspectRatio: '16/9', borderRadius: 7, border: `2px dashed ${acc}30`, background: `${acc}05`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: acc }}>
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}