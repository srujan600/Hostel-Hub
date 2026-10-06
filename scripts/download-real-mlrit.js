const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'images', 'mlrit');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const images = [
  {
    name: 'real-mlrit-main-building.jpg',
    url: 'https://college360.co.in/uploads/college/MLR-Institute-of-Technology-MLRIT-Hyderabad.jpg',
  },
  {
    name: 'real-mlrit-academic-block.jpg',
    url: 'https://images.collegedunia.com/public/college_data/images/campus/image/14352220492.jpg',
  },
  {
    name: 'real-mlrit-entrance-gate.jpg',
    url: 'https://images.collegedunia.com/public/college_data/images/campus/image/14352220491.jpg',
  },
  {
    name: 'real-mlrit-hostel.jpg',
    url: 'https://images.collegedunia.com/public/college_data/images/campus/image/14352220493.jpg',
  },
  {
    name: 'real-mlrit-sports.jpg',
    url: 'https://images.shiksha.com/mediadata/images/1587640428phpU8eZJg.jpeg',
  },
];

function download(item) {
  return new Promise((resolve) => {
    const filePath = path.join(targetDir, item.name);
    console.log(`Downloading ${item.name} from ${item.url}...`);

    const client = item.url.startsWith('https') ? https : http;
    const req = client.get(
      item.url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Referer: 'https://www.google.com/',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`Redirecting ${item.name} -> ${res.headers.location}`);
          return download({ name: item.name, url: res.headers.location }).then(resolve);
        }

        if (res.statusCode !== 200) {
          console.error(`Failed ${item.name}: Status ${res.statusCode}`);
          return resolve(false);
        }

        const file = fs.createWriteStream(filePath);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          const stats = fs.statSync(filePath);
          console.log(`Successfully saved ${item.name} (${stats.size} bytes)`);
          resolve(true);
        });
      }
    );

    req.on('error', (err) => {
      console.error(`Error downloading ${item.name}:`, err.message);
      resolve(false);
    });
  });
}

async function run() {
  for (const item of images) {
    await download(item);
  }
}

run();
