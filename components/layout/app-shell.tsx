'use client'

/**
 * JK TRADING — the app frame: a TradeZella-style navigation sidebar on the right,
 * a slim top bar, and the page content.
 *
 * The sidebar is pinned to the physical right in every language — that is where
 * the owner wants the buttons. On screens narrower than 1024px it becomes a
 * drawer that slides in from the right. On desktop it can collapse to icons,
 * and that choice is remembered per browser.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import {
  LayoutDashboard, ListOrdered, Upload, BarChart3, Brain, Sparkles, HeartPulse,
  BookOpen, Flag, Sunrise, ClipboardCheck, Target, CalendarRange,
  FlaskConical, CalendarDays, Calculator, GraduationCap, Users,
  Settings, LogOut, Plus, Menu, X, ChevronsRight, ChevronsLeft,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavGroup {
  title?: string
  items: NavItem[]
}

const COLLAPSE_KEY = 'jk.sidebar.collapsed'
const WIDTH_OPEN = '248px'
const WIDTH_COLLAPSED = '76px'

function buildGroups(locale: string, role?: string): NavGroup[] {
  const p = (path: string) => `/${locale}${path}`
  const groups: NavGroup[] = [
    {
      items: [
        { href: p('/dashboard'), label: 'لوحة التحكم', icon: LayoutDashboard },
        { href: p('/trades'), label: 'الصفقات', icon: ListOrdered },
        { href: p('/trades/import'), label: 'استيراد الصفقات', icon: Upload },
      ],
    },
    {
      title: 'التحليل',
      items: [
        { href: p('/analytics'), label: 'التحليل الشامل', icon: BarChart3 },
        { href: p('/deep-analysis'), label: 'التحليل العميق', icon: Brain },
        // "المدرّب" and "المدرب" were two different features with near-identical
        // names; the AI coach is labelled explicitly so the two cannot be confused.
        { href: p('/coach'), label: 'المدرّب الذكي', icon: Sparkles },
        { href: p('/mindset'), label: 'العقلية والمخاطرة', icon: HeartPulse },
      ],
    },
    {
      title: 'الخطة والانضباط',
      items: [
        { href: p('/strategy'), label: 'استراتيجيتك', icon: BookOpen },
        { href: p('/plan'), label: 'خطة التداول', icon: Flag },
        { href: p('/prep'), label: 'التحضير اليومي', icon: Sunrise },
        { href: p('/checklist'), label: 'الشيكلست', icon: ClipboardCheck },
        { href: p('/goals'), label: 'الأهداف', icon: Target },
        { href: p('/weekly-review'), label: 'المراجعة الأسبوعية', icon: CalendarRange },
      ],
    },
    {
      title: 'الأدوات',
      items: [
        { href: p('/backtest'), label: 'الباكتيست', icon: FlaskConical },
        { href: p('/calendar'), label: 'التقويم الاقتصادي', icon: CalendarDays },
        { href: p('/tools'), label: 'حاسبة المخاطرة', icon: Calculator },
        { href: p('/jk-trading'), label: 'أكاديمية JK', icon: GraduationCap },
      ],
    },
  ]

  if (role === 'MENTOR') {
    groups.push({
      title: 'المدرب',
      items: [{ href: p('/mentor'), label: 'لوحة المدرب', icon: Users }],
    })
  }

  return groups
}

/**
 * The item whose href is the longest prefix of the current path is active, so
 * /trades/abc lights up "الصفقات" while /trades/import lights up only the import item.
 */
function pickActive(pathname: string, hrefs: string[]): string | undefined {
  return hrefs
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0]
}

function itemClass(active: boolean, showLabels: boolean): string {
  return [
    'relative flex items-center gap-3 h-9 rounded-[10px] text-[13px] font-semibold transition-colors',
    showLabels ? 'px-3' : 'justify-center',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C29B4A]',
    active ? 'text-[#E4CE9B]' : 'text-[#8899BB] hover:text-[#DEDAD0] hover:bg-[rgba(194,155,74,0.06)]',
  ].join(' ')
}

function NavLink({ item, active, showLabels }: { item: NavItem; active: boolean; showLabels: boolean }) {
  const Icon = item.icon
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        title={showLabels ? undefined : item.label}
        className={itemClass(active, showLabels)}
        style={
          active
            ? {
                background: 'linear-gradient(90deg, rgba(194,155,74,0.05) 0%, rgba(194,155,74,0.16) 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(194,155,74,0.18)',
              }
            : undefined
        }
      >
        <Icon size={17} strokeWidth={active ? 2.1 : 1.7} className="shrink-0" style={active ? { color: '#C29B4A' } : undefined} />
        {showLabels && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  )
}

export function AppShell({
  locale,
  role,
  children,
}: {
  locale: string
  role?: string
  children: ReactNode
}) {
  const pathname = usePathname() ?? ''
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Restore the desktop collapse choice. Storage can throw in private modes.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      /* keep the default */
    }
  }, [])

  // Navigating closes the mobile drawer.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // While the drawer is open: lock page scroll and let Escape close it.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* the choice just won't persist */
      }
      return next
    })
  }

  const groups = buildGroups(locale, role)
  const newTradeHref = `/${locale}/trades/new`
  const settingsHref = `/${locale}/settings`
  const activeHref = pickActive(pathname, [
    ...groups.flatMap((g) => g.items.map((i) => i.href)),
    newTradeHref,
    settingsHref,
  ])

  // The drawer always shows labels, whatever the desktop collapse state is.
  const showLabels = !collapsed || mobileOpen
  const shellStyle = { '--sb-w': collapsed ? WIDTH_COLLAPSED : WIDTH_OPEN } as CSSProperties
  const today = new Date().toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen bg-[#080C14] relative z-[1]" style={shellStyle}>
      {mobileOpen && <div className="app-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      <aside
        className="app-sidebar flex flex-col"
        data-open={mobileOpen}
        aria-label="التنقل الرئيسي"
        style={{
          background: 'linear-gradient(180deg, #0C1119 0%, #090D14 100%)',
          borderLeft: '1px solid rgba(194,155,74,0.12)',
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 h-[60px] px-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(194,155,74,0.10)', justifyContent: showLabels ? undefined : 'center' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={showLabels ? '' : 'JK Trading'}
            className="w-9 h-9 rounded-xl object-contain shrink-0"
            style={{ filter: 'drop-shadow(0 0 8px rgba(194,155,74,0.35))' }}
          />
          {showLabels && (
            <div className="min-w-0">
              <p className="font-black text-[#C29B4A] text-[13px] leading-none tracking-[0.18em] uppercase">JK Trading</p>
              <p className="text-[10px] mt-1 tracking-wider" style={{ color: 'rgba(194,155,74,0.45)' }}>Journal</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#8899BB] hover:text-[#DEDAD0]"
            style={{ marginInlineStart: 'auto' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Primary action */}
        <div className="px-3 pt-4 pb-2 shrink-0">
          <Link
            href={newTradeHref}
            aria-current={activeHref === newTradeHref ? 'page' : undefined}
            title={showLabels ? undefined : 'إضافة صفقة'}
            className="flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-extrabold transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4CE9B]"
            style={{
              background: 'linear-gradient(135deg, #D2AE62 0%, #C29B4A 45%, #9C7A34 100%)',
              color: '#0A0D12',
              boxShadow:
                activeHref === newTradeHref
                  ? '0 0 0 2px rgba(228,206,155,0.55)'
                  : '0 8px 20px -10px rgba(194,155,74,0.6)',
            }}
          >
            <Plus size={17} strokeWidth={2.4} />
            {showLabels && <span>إضافة صفقة</span>}
          </Link>
        </div>

        {/* Sections */}
        <nav className="app-sidebar-scroll flex-1 overflow-y-auto px-3 pb-3">
          {groups.map((g, gi) => (
            <div key={g.title ?? `group-${gi}`} className={gi === 0 ? 'mt-1' : 'mt-5'}>
              {g.title && showLabels && (
                <p className="px-3 mb-1.5 text-[10.5px] font-bold tracking-wide" style={{ color: 'rgba(194,155,74,0.42)' }}>
                  {g.title}
                </p>
              )}
              {g.title && !showLabels && <div className="mx-3 mb-2 h-px" style={{ background: 'rgba(194,155,74,0.10)' }} />}
              <ul className="flex flex-col gap-0.5">
                {g.items.map((item) => (
                  <NavLink key={item.href} item={item} active={activeHref === item.href} showLabels={showLabels} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-3 py-3 flex flex-col gap-0.5" style={{ borderTop: '1px solid rgba(194,155,74,0.10)' }}>
          <ul className="flex flex-col gap-0.5">
            <NavLink
              item={{ href: settingsHref, label: 'الإعدادات', icon: Settings }}
              active={activeHref === settingsHref}
              showLabels={showLabels}
            />
          </ul>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            title={showLabels ? undefined : 'خروج'}
            className={[
              'flex items-center gap-3 h-9 rounded-[10px] text-[13px] font-semibold text-[#8899BB] transition-colors',
              'hover:text-[#C87676] hover:bg-[rgba(187,91,91,0.07)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C29B4A]',
              showLabels ? 'px-3' : 'justify-center',
            ].join(' ')}
          >
            <LogOut size={17} strokeWidth={1.7} className="shrink-0" />
            {showLabels && <span>خروج</span>}
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            className={[
              'hidden lg:flex items-center gap-3 h-8 mt-1 rounded-[10px] text-[11px] font-semibold text-[#4A5A7A] transition-colors',
              'hover:text-[#8899BB] hover:bg-[rgba(194,155,74,0.05)]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C29B4A]',
              showLabels ? 'px-3' : 'justify-center',
            ].join(' ')}
          >
            {collapsed ? <ChevronsLeft size={15} /> : <ChevronsRight size={15} />}
            {showLabels && <span>طي القائمة</span>}
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header
        className="app-header flex items-center justify-between gap-3 px-4 lg:px-6"
        style={{
          background: 'linear-gradient(180deg, rgba(8,12,20,0.97) 0%, rgba(8,12,20,0.88) 100%)',
          borderBottom: '1px solid rgba(194,155,74,0.12)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div className="flex items-center gap-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            aria-expanded={mobileOpen}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ color: '#C29B4A', background: 'rgba(194,155,74,0.08)', border: '1px solid rgba(194,155,74,0.18)' }}
          >
            <Menu size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JK Trading" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-black text-[#C29B4A] text-[12px] tracking-[0.16em] uppercase">JK Trading</span>
        </div>
        <div className="hidden lg:block" />
        <span
          suppressHydrationWarning
          className="text-[10.5px] tracking-wider px-3 py-1.5 rounded-full"
          style={{ color: 'rgba(194,155,74,0.6)', background: 'rgba(194,155,74,0.06)', border: '1px solid rgba(194,155,74,0.12)' }}
        >
          {today}
        </span>
      </header>

      <main className="app-main pb-10">{children}</main>
    </div>
  )
}
