/**
 * Dashboard panel: a flat surface with a title row. Deliberately no hover lift —
 * only things you can click should move.
 */
import Link from 'next/link'
import type { ReactNode } from 'react'

export function Panel({
  title,
  subtitle,
  aside,
  action,
  flush = false,
  className = '',
  children,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  aside?: ReactNode
  action?: { href: string; label: string }
  /** Drop the body padding, for lists that run edge to edge. */
  flush?: boolean
  className?: string
  children: ReactNode
}) {
  const hasHeader = title != null || subtitle != null || aside != null || action != null
  return (
    <section className={`dash-panel min-w-0 ${className}`}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title != null && <h2 className="text-[13.5px] font-bold leading-tight text-[#DEDAD0]">{title}</h2>}
            {subtitle != null && <p className="mt-1 text-[11px] text-[#6B7890]">{subtitle}</p>}
          </div>
          {(aside != null || action != null) && (
            <div className="flex shrink-0 items-center gap-3">
              {aside}
              {action && (
                <Link
                  href={action.href}
                  className="rounded text-[11px] font-semibold text-[#8899BB] transition-colors hover:text-[#C29B4A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C29B4A]"
                >
                  {action.label}
                </Link>
              )}
            </div>
          )}
        </header>
      )}
      <div className={flush ? 'py-2' : `px-5 pb-5 ${hasHeader ? 'pt-3' : 'pt-5'}`}>{children}</div>
    </section>
  )
}
