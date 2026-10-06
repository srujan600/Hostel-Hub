const https = require('https');
const fs = require('fs');

const url = 'https://www.google.com/search?q=mlr+institute+of+technology+hyderabad+campus+building&udm=2';

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }
}, (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    fs.writeFileSync('scripts/google-out.html', html.slice(0, 5000));
    console.log('Saved first 5000 chars of Google response');
  });
});
