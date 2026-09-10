/**
 * Step 2 of the Tradovate OAuth link: Tradovate returns the trader here with a
 * single-use code, which we swap for an access token.
 *
 * Everything downstream is unchanged — sync already runs from an access token.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { getOAuthConfig, exchangeCodeForToken, safeCompare } from '@/lib/tradovate/oauth'

const STATE_COOKIE = 'tv_oauth_state'

/** Send the trader back to settings with a result they can read. */
function back(req: Request, status: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const url = new URL('/settings', base.replace(/\/+$/, ''))
  url.searchParams.set('tradovate', status)
  return NextResponse.redirect(url)
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return back(req, 'unauthorized')

  const config = getOAuthConfig()
  if (!config) return back(req, 'not_configured')

  const url = new URL(req.url)

  // Tradovate reports a refusal here rather than by failing the request.
  if (url.searchParams.get('error')) return back(req, 'denied')

  const code = url.searchParams.get('code')
  if (!code) return back(req, 'missing_code')

  // ─── Verify the round trip belongs to this browser and this user ───
  const cookie = req.headers.get('cookie') ?? ''
  const raw = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1)

  if (!raw) return back(req, 'state_expired')

  const [expectedState, env, userId] = decodeURIComponent(raw).split('.')
  if (userId !== session.user.id) return back(req, 'state_mismatch')

  // Tradovate's documented flow does not mention echoing `state`. If it comes
  // back it must match; if it is absent we fall back to the cookie's user
  // binding, which is what actually prevents another account being linked here.
  const returned = url.searchParams.get('state')
  if (returned && !safeCompare(returned, expectedState)) {
    return back(req, 'state_mismatch')
  }

  const environment = env === 'DEMO' ? 'DEMO' : 'LIVE'

  try {
    const token = await exchangeCodeForToken(config, code, environment)

    await prisma.tradovateAccount.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        env: environment,
        authMethod: 'OAUTH',
        accessToken: encrypt(token.accessToken),
        refreshTokenEnc: token.refreshToken ? encrypt(token.refreshToken) : null,
        tokenExpiresAt: token.expiresAt,
        isActive: true,
        lastSyncStatus: null,
        lastErrorAt: null,
        lastErrorMessage: null,
      },
      update: {
        env: environment,
        authMethod: 'OAUTH',
        accessToken: encrypt(token.accessToken),
        refreshTokenEnc: token.refreshToken ? encrypt(token.refreshToken) : null,
        tokenExpiresAt: token.expiresAt,
        isActive: true,
        // Linking again is how a trader recovers from a failure, so clear the
        // previous error rather than leaving a stale one on screen.
        lastSyncStatus: null,
        lastErrorAt: null,
        lastErrorMessage: null,
        // Switching to OAuth retires any stored password. Holding a trading
        // password we no longer need is the risk this whole flow removes.
        usernameEnc: null,
        passwordEnc: null,
        cidEnc: null,
        secretEnc: null,
      },
    })

    const res = back(req, 'connected')
    res.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 })
    return res
  } catch (err) {
    // The message can quote Tradovate; the code and secret never reach it.
    console.error('[tradovate.oauth.callback] exchange failed', err)
    const res = back(req, 'exchange_failed')
    res.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 })
    return res
  }
}
