/**
 * Strava OAuth router — Firebase Cloud Function stub
 *
 * In production this runs as a Firebase HTTPS Function that:
 *   1. Receives the OAuth authorization code from the web client
 *   2. Exchanges it with Strava for access_token + refresh_token
 *   3. Stores the refresh_token in Firestore keyed by uid
 *   4. Returns a short-lived access_token to the client
 *
 * Environment variables required (set via firebase functions:config:set):
 *   STRAVA_CLIENT_ID     — from https://www.strava.com/settings/api
 *   STRAVA_CLIENT_SECRET — from the same page
 *
 * The web client calls:
 *   POST /api/strava/exchange   { code: string }
 *     → { access_token, refresh_token, expires_at }
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

export const stravaRouter = router({
  /**
   * Exchange a Strava authorization code for tokens.
   * Stub: returns a mock response when env vars are absent (local dev).
   */
  exchangeToken: publicProcedure
    .input(z.object({ code: z.string().min(1) }))
    .output(
      z.object({
        access_token: z.string(),
        refresh_token: z.string(),
        expires_at: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const clientId = process.env.STRAVA_CLIENT_ID
      const clientSecret = process.env.STRAVA_CLIENT_SECRET

      // Return deterministic mock when secrets are not configured (local stub)
      if (!clientId || !clientSecret) {
        console.warn('[strava] STRAVA_CLIENT_ID/SECRET not set — returning stub tokens')
        return {
          access_token: `stub_access_${input.code.slice(0, 8)}`,
          refresh_token: `stub_refresh_${input.code.slice(0, 8)}`,
          expires_at: Math.floor(Date.now() / 1000) + 21600,
        }
      }

      const res = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: input.code,
          grant_type: 'authorization_code',
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Strava token exchange failed: ${res.status} ${text}`)
      }

      const data = (await res.json()) as {
        access_token: string
        refresh_token: string
        expires_at: number
      }

      // TODO: persist data.refresh_token to Firestore under the authenticated uid
      // await admin.firestore().doc(`users/${uid}/integrations/strava`).set({ refresh_token: data.refresh_token, updated_at: Date.now() })

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      }
    }),

  /**
   * Refresh an expired access token using a stored refresh_token.
   * Stub: returns mock when env vars are absent.
   */
  refreshToken: publicProcedure
    .input(z.object({ refresh_token: z.string().min(1) }))
    .output(
      z.object({
        access_token: z.string(),
        expires_at: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const clientId = process.env.STRAVA_CLIENT_ID
      const clientSecret = process.env.STRAVA_CLIENT_SECRET

      if (!clientId || !clientSecret) {
        return {
          access_token: `stub_refreshed_${input.refresh_token.slice(0, 8)}`,
          expires_at: Math.floor(Date.now() / 1000) + 21600,
        }
      }

      const res = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: input.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`)

      const data = (await res.json()) as { access_token: string; expires_at: number }
      return { access_token: data.access_token, expires_at: data.expires_at }
    }),
})
