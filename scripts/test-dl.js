const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://i.ytimg.com/vi/6MIp0V7eERI/maxresdefault.jpg';
const dest = path.join(__dirname, '..', 'public', 'images', 'mlrit', 'test-yt.jpg');

https.get(url, (res) => {
  console.log('Status:', res.statusCode, 'Content-Type:', res.headers['content-type']);
  const file = fs.createWriteStream(dest);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Saved bytes:', fs.statSync(dest).size);
  });
});
