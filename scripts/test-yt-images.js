const https = require('https');

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function run() {
  const html = await fetchPage('https://www.youtube.com/@MLRInstituteofTechnology/videos');
  const videoIds = [...new Set([...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)].map(m => m[1]))];
  console.log('Found video IDs on MLRIT channel:', videoIds);

  for (const id of videoIds.slice(0, 10)) {
    const vHtml = await fetchPage(`https://www.youtube.com/watch?v=${id}`);
    const titleMatch = vHtml.match(/<title>([^<]+)<\/title>/);
    console.log(`Video ${id}: ${titleMatch ? titleMatch[1] : 'No title'}`);
  }
}
run();
