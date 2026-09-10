/**
 * Tests for the Tradovate OAuth link.
 *
 * The live exchange cannot be exercised without client credentials from
 * Tradovate, so these cover everything that does not need the network: the URL
 * we send people to, how the config is read, and the state check that stops
 * someone else's brokerage account being linked into a trader's journal.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTHORIZE_URL, OAUTH_HOSTS, buildAuthorizeUrl, generateState,
  safeCompare, getOAuthConfig, isOAuthConfigured,
} from '../lib/tradovate/oauth'

const CONFIG = {
  clientId: 'jk-client',
  clientSecret: 'shhh',
  redirectUri: 'https://jktrading369.netlify.app/api/tradovate/oauth/callback',
}

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const keys = ['TRADOVATE_CLIENT_ID', 'TRADOVATE_CLIENT_SECRET', 'TRADOVATE_REDIRECT_URI', 'NEXT_PUBLIC_APP_URL']
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]))
  try {
    for (const k of keys) delete process.env[k]
    for (const [k, v] of Object.entries(vars)) if (v !== undefined) process.env[k] = v
    fn()
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k] as string
    }
  }
}

test('the authorize URL carries exactly the parameters Tradovate expects', () => {
  const u = new URL(buildAuthorizeUrl(CONFIG, 'abc123'))
  assert.equal(`${u.origin}${u.pathname}`, AUTHORIZE_URL)
  assert.equal(u.searchParams.get('response_type'), 'code')
  assert.equal(u.searchParams.get('client_id'), 'jk-client')
  assert.equal(u.searchParams.get('redirect_uri'), CONFIG.redirectUri)
  assert.equal(u.searchParams.get('state'), 'abc123')
})

test('the client secret never appears in the authorize URL', () => {
  assert.ok(!buildAuthorizeUrl(CONFIG, 'abc').includes(CONFIG.clientSecret))
})

test('the redirect URI is encoded rather than pasted raw', () => {
  const raw = buildAuthorizeUrl(CONFIG, 's')
  assert.ok(raw.includes('redirect_uri=https%3A%2F%2F'), raw)
})

test('token hosts are separate for live and demo', () => {
  assert.equal(OAUTH_HOSTS.LIVE, 'https://live.tradovateapi.com')
  assert.equal(OAUTH_HOSTS.DEMO, 'https://demo.tradovateapi.com')
})

test('state is long and does not repeat', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 200; i++) {
    const s = generateState()
    assert.equal(s.length, 64)
    assert.match(s, /^[0-9a-f]{64}$/)
    assert.ok(!seen.has(s), 'state repeated')
    seen.add(s)
  }
})

test('state comparison accepts a match and rejects everything else', () => {
  const s = generateState()
  assert.equal(safeCompare(s, s), true)
  assert.equal(safeCompare(s, s.slice(0, -1) + '0'), false)
  assert.equal(safeCompare(s, s.slice(0, -1)), false)   // length differs
  assert.equal(safeCompare(s, ''), false)
  assert.equal(safeCompare('', ''), true)
})

test('config is read from explicit variables', () => {
  withEnv({
    TRADOVATE_CLIENT_ID: 'cid',
    TRADOVATE_CLIENT_SECRET: 'sec',
    TRADOVATE_REDIRECT_URI: 'https://x.test/cb',
  }, () => {
    assert.deepEqual(getOAuthConfig(), {
      clientId: 'cid', clientSecret: 'sec', redirectUri: 'https://x.test/cb',
    })
    assert.equal(isOAuthConfigured(), true)
  })
})

test('the redirect URI falls back to the app URL, with any trailing slash trimmed', () => {
  withEnv({
    TRADOVATE_CLIENT_ID: 'cid',
    TRADOVATE_CLIENT_SECRET: 'sec',
    NEXT_PUBLIC_APP_URL: 'https://jktrading369.netlify.app/',
  }, () => {
    assert.equal(
      getOAuthConfig()?.redirectUri,
      'https://jktrading369.netlify.app/api/tradovate/oauth/callback',
    )
  })
})

test('a partial configuration counts as not configured', () => {
  withEnv({ TRADOVATE_CLIENT_ID: 'cid' }, () => {
    assert.equal(getOAuthConfig(), null)
    assert.equal(isOAuthConfigured(), false)
  })
  withEnv({ TRADOVATE_CLIENT_ID: 'cid', TRADOVATE_CLIENT_SECRET: 'sec' }, () => {
    assert.equal(getOAuthConfig(), null)  // no redirect URI and no app URL
  })
  withEnv({}, () => assert.equal(isOAuthConfigured(), false))
})
