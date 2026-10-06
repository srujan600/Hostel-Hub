const https = require('https');

const redirectUrls = [
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEwwOiAJccwJ86sStgNrh1CapAch1zvdaB65e_s19uVFhgefkCo71omWX4Wa-Oe1-M8LtsuIXUgK8BlH0cLIxm0suFVp5wOrZyhuqJOiLeAs89S54yX3_KKAmtYSz_9zhVU',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF2gBz_23ANW5EiVG0tb7Dg1rxLjp8OQuSMLdwp8bQaDvWuIPCUXMsytygGxSJp-QuIteyKCoLks-0e8VBGHJ5CMy-KBP6mSlHVqa-xKoLSjXmwY91h3j8DrtgAXa0KfXI-',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE-bV3eZK-pENrJRJRhTjJYMDNCF9cfTqQe5ck8NyjYEm5sgnrw6J83vUgC5M_X4O4rSDNfKxkEskdJnpC7gyvQLk-lr5BmiCUf8h5V3oC6QySmG_YzkHqNAHG1oSCnqs5y',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHptz1_uE0Mky7K3XRUD0bsGYx9CafvNGvnWcomLbF2i7Hcu9J_NKVbluKABBtNTfM-r0JGS9pcMCKbE6FVXqO-eFANUSGoxEbdqztZW0x3DPX94GWsBtOPQnaqIoBUkLGN',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHLrGAuCrB3DcuZW9WdGw2b34wTyQl5lExbtuKEAJ8aBGR6vJYwklRJjwcgug415S5GbhL_kIXcR0ib-4HKmhNDxdjUqAOQ0tV8-dsim9DvRvmOSr-OMeZh3c9E0ZlMGt2y',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGXOEhDQrLotEeuKzuDJb7dugBb6FnJ4iGBL7X9vlurOxn2EFOzCl3ibvQcODX-OH2bI6PCU3QPG2Lsa3x8AMkOQR-Qh-sUk-Dz-Tbn6-9pykZpZOVjcRo6MvJfAa4TsUmP',
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFn6FIICtE7vnVawNFrrASf9t_ol3e00MXeghZpZsfgTSk1phIS98B6RFqN4MzZ0c0ncQtktYg4TvIkM-sZdA8VMww0BckZA4RoIokLA9Vl-SBmE5QCbQCuMhDHfzpzQ5x1',
];

function getRedirect(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.headers.location || url);
    }).on('error', () => resolve(url));
  });
}

async function run() {
  for (const u of redirectUrls) {
    const loc = await getRedirect(u);
    console.log('Redirect:', loc);
  }
}
run();
