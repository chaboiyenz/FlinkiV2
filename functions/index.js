import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'

/**
 * POST /api/fitbit-token
 * Proxies the Fitbit OAuth 2.0 token exchange to avoid CORS in the browser.
 * Forwards the Authorization header and URL-encoded body unchanged.
 */
export const fitbitToken = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }
    const auth = req.headers['authorization'] ?? ''
    const body = req.rawBody?.toString() ?? ''
    try {
      const response = await fetch('https://api.fitbit.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: auth,
        },
        body,
      })
      const data = await response.json()
      res.status(response.status).json(data)
    } catch (err) {
      logger.error('fitbitToken proxy error', err)
      res.status(502).json({ error: 'Token exchange failed' })
    }
  }
)

/**
 * GET /api/fitbit/**
 * Proxies all Fitbit REST API calls to avoid CORS in the browser.
 * Forwards the Authorization header and all query parameters unchanged.
 */
export const fitbitProxy = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).send('Method Not Allowed')
      return
    }
    const auth = req.headers['authorization'] ?? ''

    // Strip /api/fitbit prefix — req.path is the original hosting path
    const fitbitPath = req.path.replace(/^\/api\/fitbit/, '') || '/'
    const url = new URL(`https://api.fitbit.com${fitbitPath}`)
    for (const [key, value] of Object.entries(req.query)) {
      url.searchParams.set(key, String(value))
    }

    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: auth },
      })
      const data = await response.json()
      res.status(response.status).json(data)
    } catch (err) {
      logger.error('fitbitProxy error', err)
      res.status(502).json({ error: 'Fitbit API proxy failed' })
    }
  }
)
