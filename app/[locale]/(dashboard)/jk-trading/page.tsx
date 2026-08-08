import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LESSONS, SECTIONS_META, getLessonsBySection } from '@/lib/jk-trading-content'

export const dynamic = 'force-dynamic'

const BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  'فيديو': { bg: 'rgba(212,175,55,0.15)', fg: '#D4AF37' },
  'PDF':   { bg: 'rgba(239,68,68,0.15)',  fg: '#FF6B6B' },
  'دليل':  { bg: 'rgba(59,130,246,0.15)', fg: '#60A5FA' },
  'مهم':   { bg: 'rgba(255,193,7,0.18)',  fg: '#FFC857' },
  'جديد':  { bg: 'rgba(16,185,129,0.15)', fg: '#10B981' },
}

export default async function JKTradingEducationPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/login`)

  const totalLessons = LESSONS.length
  const totalReadingMin = LESSONS.reduce((s, l) => s + l.readingMinutes, 0)
  const hoursApprox = Math.ceil(totalReadingMin / 60)

  return (
    <div style={{ padding: '14px 14px 100px', direction: 'rtl' }}>
      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A192F 0%, #112240 60%, #1A2F4A 100%)',
          borderRadius: 16,
          padding: '28px 24px',
          marginBottom: 18,
          border: '1px solid rgba(212,175,55,0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.3)',
              fontSize: 10,
              color: '#D4AF37',
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            مركز JK TRADING التعليمي
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              background: 'linear-gradient(90deg, #D4AF37 0%, #FFC857 50%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            JK TRADING
          </h1>
          <p style={{ fontSize: 14, color: '#E6F0FF', lineHeight: 1.7, marginBottom: 14, maxWidth: 720 }}>
            منهج تداول كامل مبني على Quarterly Theory و SMC/ICT — مصمّم خصيصاً للمتداول العربي.
            كل درس مشروح بصياغة عربية أصلية مع إعدادات دخول وخروج محدّدة قابلة للتطبيق فوراً.
          </p>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12 }}>
            <Stat label="عدد الأقسام" value={`${SECTIONS_META.length}`} />
            <Stat label="عدد الدروس" value={`${totalLessons}`} />
            <Stat label="مدة المنهج" value={`+${hoursApprox} ساعة`} />
            <Stat label="المستوى" value="مبتدئ → متقدم" />
          </div>
        </div>
      </div>

      {/* Table of contents */}
      <div
        style={{
          background: '#0F1A2F',
          border: '1px solid #1F2D4A',
          borderRadius: 12,
          padding: 14,
          marginBottom: 22,
        }}
      >
        <div style={{ fontSize: 11, color: '#8899BB', marginBottom: 8, fontWeight: 600 }}>
          خريطة المنهج — انتقل لأي قسم
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SECTIONS_META.map((s, i) => {
            const count = getLessonsBySection(s.id).length
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  fontSize: 12,
                  color: '#A7B3CC',
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: '#0A192F',
                  border: '1px solid #1F2D4A',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color: s.accent, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                {s.title}
                {count > 0 && (
                  <span style={{ fontSize: 10, color: '#4A5A7A' }}>· {count}</span>
                )}
              </a>
            )
          })}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS_META.map((sec, idx) => {
        const lessons = getLessonsBySection(sec.id)
        return (
          <section key={sec.id} id={sec.id} style={{ marginBottom: 32, scrollMarginTop: 80 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${sec.accent}33 0%, ${sec.accent}11 100%)`,
                  border: `1px solid ${sec.accent}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: sec.accent,
                  fontSize: 22,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {sec.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: sec.accent, fontWeight: 700, letterSpacing: 1 }}>
                    القسم {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 10, color: '#4A5A7A' }}>
                    · {lessons.length} درس {lessons.length === 0 && '(قريباً)'}
                  </span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#E6F0FF', marginBottom: 4 }}>
                  {sec.title}
                </h2>
                <p style={{ fontSize: 12, color: '#8899BB', lineHeight: 1.6 }}>{sec.subtitle}</p>
              </div>
            </div>

            {/* Lessons grid (or placeholder) */}
            {lessons.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 12,
                }}
              >
                {lessons.map(lesson => (
                  <LessonCard
                    key={lesson.slug}
                    locale={locale}
                    slug={lesson.slug}
                    title={lesson.title}
                    subtitle={lesson.subtitle}
                    badge={lesson.badge}
                    readingMin={lesson.readingMinutes}
                    accent={sec.accent}
                    sectionIcon={sec.icon}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: 24,
                  background: '#0F1A2F',
                  border: `1px dashed ${sec.accent}55`,
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6, color: sec.accent }}>{sec.icon}</div>
                <div style={{ fontSize: 13, color: '#A7B3CC', fontWeight: 600, marginBottom: 4 }}>
                  دروس هذا القسم قيد التحضير
                </div>
                <div style={{ fontSize: 11, color: '#4A5A7A' }}>
                  سيتم نشرها قريباً. تابع التحديثات.
                </div>
              </div>
            )}
          </section>
        )
      })}

      {/* Footer CTA */}
      <div
        style={{
          marginTop: 32,
          background: 'linear-gradient(135deg, #0A192F 0%, #112240 100%)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: 14,
          padding: 22,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 14, color: '#D4AF37', fontWeight: 700, marginBottom: 6 }}>
          📚 المنهج يُحدّث باستمرار
        </div>
        <p style={{ fontSize: 12, color: '#8899BB', lineHeight: 1.7 }}>
          كل أسبوع يُضاف درس جديد بناءً على الإعدادات الحالية في السوق. تابع صفحة JK TRADING التعليمية للحصول على آخر التحديثات.
        </p>
      </div>
    </div>
  )
}

// ─── Components ────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(212,175,55,0.18)',
        borderRadius: 8,
        padding: '8px 14px',
        minWidth: 100,
      }}
    >
      <div style={{ fontSize: 9, color: '#8899BB', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37' }}>{value}</div>
    </div>
  )
}

function LessonCard({
  locale, slug, title, subtitle, badge, readingMin, accent, sectionIcon,
}: {
  locale: string; slug: string; title: string; subtitle: string
  badge?: string; readingMin: number; accent: string; sectionIcon: string
}) {
  const badgeColors = badge ? BADGE_COLORS[badge] : null

  return (
    <Link
      href={`/${locale}/jk-trading/${slug}`}
      style={{
        background: '#0F1A2F',
        border: '1px solid #1F2D4A',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        transition: 'transform 0.15s, border-color 0.15s',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: 110,
          background: `linear-gradient(135deg, ${accent}1A 0%, #112240 50%, ${accent}0F 100%)`,
          position: 'relative',
          overflow: 'hidden',
          borderBottom: `1px solid ${accent}33`,
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 64, color: `${accent}26`, fontWeight: 800,
          }}
        >
          {sectionIcon}
        </div>
        {badgeColors && badge && (
          <div
            style={{
              position: 'absolute', top: 8, insetInlineEnd: 10,
              fontSize: 9, color: badgeColors.fg, fontWeight: 700,
              background: badgeColors.bg, padding: '3px 9px',
              borderRadius: 6, border: `1px solid ${badgeColors.fg}33`,
            }}
          >
            {badge}
          </div>
        )}
        <div
          style={{
            position: 'absolute', bottom: 8, insetInlineEnd: 10,
            fontSize: 10, color: '#E6F0FF', fontWeight: 600,
            background: 'rgba(8,12,20,0.75)', padding: '3px 8px',
            borderRadius: 6, backdropFilter: 'blur(8px)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          ⏱ {readingMin} دقيقة
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#E6F0FF',
            lineHeight: 1.5,
            marginBottom: 8,
            minHeight: 38,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 11.5,
            color: '#8899BB',
            lineHeight: 1.7,
            flex: 1,
          }}
        >
          {subtitle}
        </p>
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid #1F2D4A',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
          }}
        >
          <span style={{ color: accent, fontWeight: 700 }}>
            اقرأ الدرس ←
          </span>
          <span style={{ color: '#4A5A7A', fontSize: 14 }}>›</span>
        </div>
      </div>
    </Link>
  )
}
