import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

// Middleware handles only i18n locale routing.
// Auth protection is handled per-page/layout via auth() + redirect().
export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
