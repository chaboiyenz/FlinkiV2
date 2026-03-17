// Vercel Serverless Function
// POST /api/fitbit-token → proxies to https://api.fitbit.com/oauth2/token
// Needed because Fitbit's token endpoint doesn't allow CORS from browsers.

export const config = {
  api: { bodyParser: false }, // read raw urlencoded body
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed')
  }

  // Read raw body
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks).toString('utf-8')

  const auth = req.headers['authorization'] ?? ''

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
    return res.status(response.status).json(data)
  } catch (err) {
    console.error('[fitbit-token]', err)
    return res.status(502).json({ error: 'Token exchange failed' })
  }
}
