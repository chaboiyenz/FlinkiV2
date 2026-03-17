// Vercel Serverless Function
// GET /api/fitbit/** → proxies to https://api.fitbit.com/**
// e.g. /api/fitbit/1/user/-/activities/list.json → https://api.fitbit.com/1/user/-/activities/list.json

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method Not Allowed')
  }

  // req.query.path is an array of path segments from the [...path] catch-all
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path]
  const fitbitPath = '/' + segments.join('/')

  // Forward all query params except the internal 'path' key
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  const url = `https://api.fitbit.com${fitbitPath}${qs ? '?' + qs : ''}`

  const auth = req.headers['authorization'] ?? ''

  try {
    const response = await fetch(url, {
      headers: { Authorization: auth },
    })
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (err) {
    console.error('[fitbit-proxy]', err)
    return res.status(502).json({ error: 'Fitbit API proxy failed' })
  }
}
