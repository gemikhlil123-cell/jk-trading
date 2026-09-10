/**
 * Step 1 of the Tradovate OAuth link: send the trader to Tradovate to sign in.
 *
 * We never see their Tradovate password — they enter it on Tradovate's own
 * domain and we only receive a single-use code on the way back.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getOAuthConfig, buildAuthorizeUrl, generateState } from '@/lib/tradovate/oauth'

/** The state cookie lives just long enough to complete the round trip. */
const STATE_COOKIE = 'tv_oauth_state'
const STATE_TTL_SECONDS = 10 * 60

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = getOAuthConfig()
  if (!config) {
    // Not an error the trader caused: the app has no Tradovate client
    // credentials yet, so there is nothing to redirect to.
    return NextResponse.json(
      { error: 'tradovate_oauth_not_configured' },
      { status: 503 },
    )
  }

  const url = new URL(req.url)
  const env = url.searchParams.get('env') === 'DEMO' ? 'DEMO' : 'LIVE'

  const state = generateState()
  const res = NextResponse.redirect(buildAuthorizeUrl(config, state))

  // Bind the callback to this browser and this user. Without it, an attacker
  // could hand a victim a code and link the attacker's brokerage account to
  // the victim's journal.
  res.cookies.set(STATE_COOKIE, `${state}.${env}.${session.user.id}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_SECONDS,
  })

  return res
}
