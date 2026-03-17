// Vercel Serverless Function
// GET /api/runsignup/** → proxies to https://runsignup.com/rest/**

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method Not Allowed')
  }

  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path]
  const apiPath = '/' + segments.join('/')

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  const url = `https://runsignup.com/rest${apiPath}${qs ? '?' + qs : ''}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (err) {
    console.error('[runsignup-proxy]', err)
    return res.status(502).json({ error: 'RunSignUp proxy failed' })
  }
}
