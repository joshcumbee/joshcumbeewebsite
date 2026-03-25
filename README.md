# HEMISFEARS

Artist website with audio-reactive visualizer and live MUSO stream count.

## Stack
- **Vercel** — static hosting + serverless functions
- **`/api/streams`** — MUSO proxy, caches 1hr, returns live stream/credit counts
- **`/public/index.html`** — single-file frontend (visualizer, SC embed, contact form)

## Project Structure
```
hemisfears/
├── api/
│   └── streams.js        # MUSO proxy serverless function
├── public/
│   └── index.html        # Main site
├── .env.example          # Required env vars
├── .gitignore
├── package.json
└── vercel.json
```

## Deploy

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Link project
```bash
vercel link
```

### 3. Set environment variable
```bash
vercel env add MUSO_TOKEN
# Paste the Bearer token from MUSO DevTools when prompted
# Select: Production, Preview, Development
```

Or set it in the Vercel dashboard:
Project → Settings → Environment Variables → Add `MUSO_TOKEN`

### 4. Deploy
```bash
vercel --prod
```

## Refreshing the MUSO Token (~Sept 2026)
1. Log into credits.muso.ai
2. Open DevTools → Network tab → reload page
3. Click any `api.muso.ai` request → Headers → copy Authorization Bearer value
4. `vercel env rm MUSO_TOKEN` then `vercel env add MUSO_TOKEN`
5. `vercel --prod`

## Local Dev
```bash
cp .env.example .env.local
# Fill in MUSO_TOKEN
vercel dev
# Site at http://localhost:3000
```

## SoundCloud Playlist
Embed ID: `soundcloud%253Aplaylists%253A2211269933`
Full URL: https://soundcloud.com/joshcumbee/sets/josh-cumbee-producer-writer

## MUSO Profile
UUID: `d7a5eac7-d47e-43a7-8b80-c69ec64167aa`
Public profile: https://credits.muso.ai/profile/d7a5eac7-d47e-43a7-8b80-c69ec64167aa
