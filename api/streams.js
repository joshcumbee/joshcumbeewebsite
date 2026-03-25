// api/streams.js
// Proxies MUSO analytics API and caches result for 1 hour
// Env var required: MUSO_TOKEN (Bearer JWT from MUSO devtools, exp ~Sept 2026)

const UUID = 'd7a5eac7-d47e-43a7-8b80-c69ec64167aa';
const BASE = `https://api.muso.ai/api/w/v2/analytics/${UUID}`;

const SUMMARY_URL = `${BASE}/summary?period=all&limit=5`;
const CREDITS_URL = `${BASE}/profile/credits?period=all&limit=4&statsProperty=streams`;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cache = { value: null, ts: 0 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (cache.value && Date.now() - cache.ts < CACHE_TTL_MS) {
    return res.status(200).json(cache.value);
  }

  const token = process.env.MUSO_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'MUSO_TOKEN env var not set' });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0',
  };

  try {
    // Fetch both endpoints in parallel
    const [summaryRes, creditsRes] = await Promise.all([
      fetch(SUMMARY_URL, { headers }),
      fetch(CREDITS_URL, { headers }),
    ]);

    if (!summaryRes.ok) {
      if (cache.value) return res.status(200).json({ ...cache.value, stale: true });
      return res.status(summaryRes.status).json({ error: 'MUSO upstream error' });
    }

    const summaryBody = await summaryRes.json();
    const summary = summaryBody?.data?.summary ?? [];
    const get = (source) => summary.find((s) => s.source === source)?.value ?? 0;

    // Role breakdown from credits endpoint
    let producerStreams = 0, songwriterStreams = 0;
    if (creditsRes.ok) {
      const creditsBody = await creditsRes.json();
      const list = creditsBody?.data?.list ?? [];
      const find = (id) => list.find((r) => r.id === id)?.currentValue ?? 0;
      producerStreams   = find('Producer');
      songwriterStreams = find('Composer'); // Composer = songwriter in MUSO
    }

    const result = {
      streams:         get('streams'),
      producerStreams,
      songwriterStreams,
      creditCount:     summaryBody?.data?.creditCount ?? 0,
      updatedAt:       new Date().toISOString(),
    };

    cache = { value: result, ts: Date.now() };
    return res.status(200).json(result);

  } catch (err) {
    if (cache.value) return res.status(200).json({ ...cache.value, stale: true });
    return res.status(500).json({ error: err.message });
  }
}
