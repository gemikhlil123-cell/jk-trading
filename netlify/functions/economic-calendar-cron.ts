/**
 * Netlify Scheduled Function — refreshes the economic calendar cache daily.
 *
 * Calls the internal /api/economic-calendar endpoint with CRON_SECRET header.
 * The URL is derived from process.env.URL (set automatically by Netlify).
 */
import type { Config } from '@netlify/functions'

export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL
  if (!siteUrl) {
    return new Response(JSON.stringify({ error: 'site URL not available' }), { status: 500 })
  }
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), { status: 500 })
  }

  const res = await fetch(`${siteUrl}/api/economic-calendar`, {
    method: 'POST',
    headers: { 'x-cron-secret': secret, 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config: Config = {
  schedule: '0 5 * * *', // daily at 05:00 UTC
}
