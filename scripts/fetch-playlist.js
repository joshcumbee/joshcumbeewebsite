#!/usr/bin/env node
// scripts/fetch-playlist.js
// Run before deploying to regenerate public/playlist.json
// Usage:  node scripts/fetch-playlist.js
//
// Fetches SoundCloud playlist page, extracts __sc_hydration__ JSON,
// writes public/playlist.json with full track metadata.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PLAYLIST_URL = 'https://soundcloud.com/joshcumbee/sets/josh-cumbee-producer-writer';
const OUT_PATH     = path.join(__dirname, '../public/playlist.json');

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location, redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractHydration(html) {
  const match = html.match(/window\.__sc_hydration\s*=\s*(\[.+?\]);\s*<\/script>/s);
  if (!match) throw new Error('Could not find __sc_hydration. SC may have changed markup.');
  return JSON.parse(match[1]);
}

function findPlaylist(hydration) {
  for (const item of hydration) {
    if (item.hydratable === 'playlist' && item.data && Array.isArray(item.data.tracks)) {
      return item.data;
    }
  }
  for (const item of hydration) {
    if (item.data && Array.isArray(item.data.tracks) && item.data.tracks.length > 3) {
      return item.data;
    }
  }
  throw new Error('Could not find playlist in hydration data.');
}

async function run() {
  console.log('Fetching:', PLAYLIST_URL);
  const html = await get(PLAYLIST_URL);
  console.log('Got', (html.length / 1024).toFixed(0) + 'KB');

  const hydration = extractHydration(html);
  console.log('Hydration entries:', hydration.length);

  const playlist = findPlaylist(hydration);
  console.log('Playlist:', JSON.stringify(playlist.title), '—', playlist.tracks.length, 'tracks');

  const tracks = playlist.tracks.map((t, i) => ({
    id:       t.id,
    index:    i,
    title:    t.title || ('track ' + (i + 1)),
    artist:   (t.user && t.user.username) || 'josh cumbee',
    artwork:  t.artwork_url
                ? t.artwork_url.replace('-large', '-t500x500')
                : ((t.user && t.user.avatar_url) || ''),
    duration: t.duration || 0,
  }));

  const output = {
    generated: new Date().toISOString(),
    total: tracks.length,
    tracks,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

  console.log('\n✓ Written to', OUT_PATH);
  console.log(' ', tracks.length, 'tracks');
  console.log('  First:', JSON.stringify(tracks[0].title), 'by', tracks[0].artist);
  if (tracks.length > 1)
    console.log('  Last: ', JSON.stringify(tracks[tracks.length-1].title));

  const stubs = tracks.filter(t => t.title.startsWith('track '));
  if (stubs.length)
    console.warn('\n  ⚠', stubs.length, 'tracks returned as stubs — re-run or fill manually');
  else
    console.log('  All titles resolved ✓');
}

run().catch(err => {
  console.error('\n✗', err.message);
  process.exit(1);
});
