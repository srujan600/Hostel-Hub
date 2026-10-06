const https = require('https');
const fs = require('fs');
const path = require('path');

const videoIds = [
  'kIQ7lQBwMzY',
  '5R2A2j7YzBc',
  'Vg1XqeJ5OXU',
  '0GQTQFtEK2E',
  '6MIp0V7eERI',
  'AFgt3B29u2U',
  'ZxD1pVXyUY4',
];

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

function downloadImage(url, dest) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          const bytes = fs.statSync(dest).size;
          if (bytes > 1000) {
            resolve({ ok: true, bytes });
          } else {
            fs.unlinkSync(dest);
            resolve({ ok: false, bytes });
          }
        });
      } else {
        resolve({ ok: false, status: res.statusCode });
      }
    }).on('error', () => resolve({ ok: false }));
  });
}

async function run() {
  const dir = path.join(__dirname, '..', 'public', 'images', 'mlrit');
  for (const id of videoIds) {
    const html = await fetchPage(`https://www.youtube.com/watch?v=${id}`);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : id;
    console.log(`\n--- Video ${id}: ${title} ---`);

    // Try maxresdefault first
    const maxUrl = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    const maxDest = path.join(dir, `mlrit-real-${id}-max.jpg`);
    const maxRes = await downloadImage(maxUrl, maxDest);
    if (maxRes.ok) {
      console.log(`Downloaded maxres (${maxRes.bytes} bytes) -> mlrit-real-${id}-max.jpg`);
    } else {
      // Fallback to hqdefault
      const hqUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      const hqDest = path.join(dir, `mlrit-real-${id}-hq.jpg`);
      const hqRes = await downloadImage(hqUrl, hqDest);
      console.log(`Downloaded hq (${hqRes.bytes} bytes) -> mlrit-real-${id}-hq.jpg`);
    }
  }
}

run();
