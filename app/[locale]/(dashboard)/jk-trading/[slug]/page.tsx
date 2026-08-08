import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getLessonBySlug,
  getSectionMeta,
  type Lesson,
  type LessonBlock,
  type CalloutVariant,
} from '@/lib/jk-trading-content'
import { Diagram } from '@/components/jk-trading/diagrams'

export const dynamic = 'force-dynamic'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/login`)

  const lesson = getLessonBySlug(slug)
  if (!lesson) notFound()

  const section = getSectionMeta(lesson.sectionId)
  if (!section) notFound()

  const badge = lesson.badge ? BADGE_COLORS[lesson.badge] : null

  return (
    <article style={{ padding: '14px 14px 100px', direction: 'rtl', maxWidth: 780, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, color: '#8899BB', flexWrap: 'wrap' }}>
        <Link href={`/${locale}/jk-trading`} style={{ color: '#D4AF37', textDecoration: 'none' }}>
          مركز JK TRADING
        </Link>
        <span>›</span>
        <Link
          href={`/${locale}/jk-trading#${section.id}`}
          style={{ color: section.accent, textDecoration: 'none' }}
        >
          {section.title}
        </Link>
        <span>›</span>
        <span style={{ color: '#A7B3CC' }}>{lesson.title}</span>
      </nav>

      {/* Header card */}
      <header
        style={{
          background: `linear-gradient(135deg, #0A192F 0%, #112240 60%, ${section.accent}1A 100%)`,
          border: `1px solid ${section.accent}55`,
          borderRadius: 16,
          padding: '24px 22px',
          marginBottom: 22,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -32,
            insetInlineEnd: -32,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${section.accent}22 0%, transparent 70%)`,
          }}
        />
        <div style={{ position: 'relative' }}>
          {/* Section pill */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 10,
                color: section.accent,
                fontWeight: 700,
                letterSpacing: 1,
                padding: '4px 10px',
                background: `${section.accent}15`,
                border: `1px solid ${section.accent}33`,
                borderRadius: 999,
              }}
            >
              {section.icon} {section.title}
            </span>
            {badge && lesson.badge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '4px 10px',
                  background: badge.bg,
                  color: badge.fg,
                  border: `1px solid ${badge.fg}33`,
                  borderRadius: 999,
                }}
              >
                {lesson.badge}
              </span>
            )}
            <span
              style={{
                fontSize: 10,
                color: '#8899BB',
                fontWeight: 600,
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1F2D4A',
                borderRadius: 999,
              }}
            >
              ⏱ {lesson.readingMinutes} دقيقة قراءة
            </span>
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: '#E6F0FF',
              lineHeight: 1.3,
              marginBottom: 8,
            }}
          >
            {lesson.title}
          </h1>
          <p style={{ fontSize: 14, color: '#A7B3CC', lineHeight: 1.7 }}>
            {lesson.subtitle}
          </p>
        </div>
      </header>

      {/* Intro */}
      <div
        style={{
          fontSize: 15,
          color: '#D4DEEF',
          lineHeight: 1.95,
          marginBottom: 26,
          padding: '16px 18px',
          background: '#0F1A2F',
          borderRadius: 12,
          border: '1px solid #1F2D4A',
          borderInlineStart: `3px solid ${section.accent}`,
        }}
      >
        {lesson.intro}
      </div>

      {/* Blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {lesson.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} accent={section.accent} />
        ))}
      </div>

      {/* Key takeaways */}
      <div
        style={{
          marginTop: 30,
          background: 'linear-gradient(135deg, #0F1A2F 0%, #112240 100%)',
          border: '1px solid rgba(212,175,55,0.35)',
          borderRadius: 14,
          padding: '20px 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(212,175,55,0.15)',
              border: '1px solid rgba(212,175,55,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            ⚡
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#D4AF37' }}>
            النقاط المفتاحية
          </h3>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lesson.keyTakeaways.map((point, i) => (
            <li
              key={i}
              style={{
                fontSize: 13.5,
                color: '#D4DEEF',
                lineHeight: 1.7,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ color: '#D4AF37', fontWeight: 800, marginTop: 1 }}>✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Navigation */}
      <PrevNextNav locale={locale} lesson={lesson} />

      {/* Back to library */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link
          href={`/${locale}/jk-trading`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: '#8899BB',
            textDecoration: 'none',
            padding: '8px 16px',
            border: '1px solid #1F2D4A',
            borderRadius: 8,
            background: '#0F1A2F',
          }}
        >
          ← العودة لمركز JK TRADING
        </Link>
      </div>
    </article>
  )
}

// ─── Block renderer ──────────────────────────────────────────────────────

function BlockRenderer({ block, accent }: { block: LessonBlock; accent: string }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#E6F0FF',
            marginTop: 12,
            paddingBottom: 8,
            borderBottom: `2px solid ${accent}44`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ color: accent, fontSize: 14 }}>◆</span>
          {block.text}
        </h2>
      )

    case 'subheading':
      return (
        <h3 style={{ fontSize: 16, fontWeight: 700, color: accent, marginTop: 8 }}>
          {block.text}
        </h3>
      )

    case 'paragraph':
      return (
        <p style={{ fontSize: 14.5, color: '#C9D5EA', lineHeight: 2, textAlign: 'justify' }}>
          {block.text}
        </p>
      )

    case 'list':
      return (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {block.items?.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                color: '#C9D5EA',
                lineHeight: 1.85,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                paddingInlineStart: 4,
              }}
            >
              <span
                style={{
                  color: accent,
                  marginTop: 8,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: accent,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'numbered':
      return (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {block.items?.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                color: '#C9D5EA',
                lineHeight: 1.85,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: `${accent}22`,
                  border: `1px solid ${accent}66`,
                  color: accent,
                  fontWeight: 800,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1, paddingTop: 3 }}>{item}</span>
            </li>
          ))}
        </ol>
      )

    case 'callout': {
      const variant: CalloutVariant = block.variant || 'info'
      const palette = CALLOUT_PALETTE[variant]
      return (
        <aside
          style={{
            background: palette.bg,
            border: `1px solid ${palette.border}`,
            borderInlineStart: `4px solid ${palette.accent}`,
            borderRadius: 10,
            padding: '14px 16px',
          }}
        >
          {block.heading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{palette.icon}</span>
              <strong style={{ fontSize: 13, color: palette.accent, fontWeight: 800 }}>
                {block.heading}
              </strong>
            </div>
          )}
          <div style={{ fontSize: 13.5, color: '#D4DEEF', lineHeight: 1.85 }}>
            {block.text}
          </div>
        </aside>
      )
    }

    case 'quote':
      return (
        <blockquote
          style={{
            margin: 0,
            padding: '14px 18px',
            background: '#0A192F',
            border: '1px solid #1F2D4A',
            borderInlineStart: `4px solid ${accent}`,
            borderRadius: 10,
            fontSize: 14.5,
            color: '#A7B3CC',
            fontStyle: 'italic',
            lineHeight: 1.85,
          }}
        >
          " {block.text} "
        </blockquote>
      )

    case 'rule':
      return (
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent 0%, ${accent}44 50%, transparent 100%)`,
            margin: '8px 0',
          }}
        />
      )

    case 'diagram':
      if (!block.diagramId) return null
      return (
        <div style={{ margin: '8px 0' }}>
          <Diagram id={block.diagramId} caption={block.caption} />
        </div>
      )

    case 'chartImage':
      if (!block.src) return null
      return (
        <figure style={{ margin: '8px 0', padding: 0 }}>
          <div
            style={{
              borderRadius: 10,
              overflow: 'hidden',
              border: `1px solid ${accent}55`,
              background: '#0E1623',
              boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22 inset`,
              position: 'relative',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.src}
              alt={block.caption || 'Chart'}
              style={{ width: '100%', height: 'auto', display: 'block' }}
              loading="lazy"
            />
            {/* JK watermark overlay */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                insetInlineEnd: 12,
                padding: '4px 10px',
                background: 'rgba(8,12,20,0.85)',
                border: `1px solid ${accent}55`,
                borderRadius: 6,
                fontSize: 10,
                color: accent,
                fontWeight: 700,
                letterSpacing: 1,
                backdropFilter: 'blur(4px)',
              }}
            >
              ◈ JK Trading
            </div>
          </div>
          {block.highlight && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 14px',
                background: `${accent}10`,
                border: `1px solid ${accent}33`,
                borderInlineStart: `3px solid ${accent}`,
                borderRadius: 8,
                fontSize: 12.5,
                color: '#D4DEEF',
                fontWeight: 600,
                lineHeight: 1.7,
              }}
            >
              ✦ {block.highlight}
            </div>
          )}
          {block.caption && (
            <figcaption
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#8899BB',
                textAlign: 'center',
                fontStyle: 'italic',
                lineHeight: 1.6,
              }}
            >
              {block.caption}
            </figcaption>
          )}
        </figure>
      )

    default:
      return null
  }
}

// ─── Prev/Next ───────────────────────────────────────────────────────────

function PrevNextNav({ locale, lesson }: { locale: string; lesson: Lesson }) {
  if (!lesson.prevSlug && !lesson.nextSlug) return null
  return (
    <div
      style={{
        marginTop: 26,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}
    >
      {lesson.prevSlug ? (
        <Link
          href={`/${locale}/jk-trading/${lesson.prevSlug}`}
          style={{
            padding: '14px 16px',
            background: '#0F1A2F',
            border: '1px solid #1F2D4A',
            borderRadius: 10,
            textDecoration: 'none',
            color: '#A7B3CC',
            display: 'block',
          }}
        >
          <div style={{ fontSize: 10, color: '#4A5A7A', marginBottom: 4 }}>→ السابق</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#D4DEEF' }}>الدرس السابق</div>
        </Link>
      ) : <div />}
      {lesson.nextSlug ? (
        <Link
          href={`/${locale}/jk-trading/${lesson.nextSlug}`}
          style={{
            padding: '14px 16px',
            background: '#0F1A2F',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 10,
            textDecoration: 'none',
            color: '#D4AF37',
            display: 'block',
            textAlign: 'end',
          }}
        >
          <div style={{ fontSize: 10, color: '#8899BB', marginBottom: 4 }}>التالي ←</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37' }}>الدرس التالي</div>
        </Link>
      ) : <div />}
    </div>
  )
}

// ─── Palettes ────────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  'فيديو': { bg: 'rgba(212,175,55,0.15)', fg: '#D4AF37' },
  'PDF':   { bg: 'rgba(239,68,68,0.15)',  fg: '#FF6B6B' },
  'دليل':  { bg: 'rgba(59,130,246,0.15)', fg: '#60A5FA' },
  'مهم':   { bg: 'rgba(255,193,7,0.18)',  fg: '#FFC857' },
  'جديد':  { bg: 'rgba(16,185,129,0.15)', fg: '#10B981' },
}

const CALLOUT_PALETTE: Record<CalloutVariant, {
  bg: string; border: string; accent: string; icon: string
}> = {
  info:    { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.3)',  accent: '#60A5FA', icon: 'ℹ️' },
  warn:    { bg: 'rgba(255,193,7,0.10)',   border: 'rgba(255,193,7,0.35)',  accent: '#FFC857', icon: '⚠️' },
  success: { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.3)',  accent: '#10B981', icon: '✓' },
  gold:    { bg: 'rgba(212,175,55,0.10)',  border: 'rgba(212,175,55,0.4)',  accent: '#D4AF37', icon: '◆' },
  danger:  { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.35)',  accent: '#F87171', icon: '✕' },
}
