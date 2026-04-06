// Fetcher for Shri Radha Sudha Nidhi - all 27 pages
// Fetches raw HTML from bhajanmarg.com and saves to rsn-raw.txt

const https = require('https');
const fs = require('fs');

const TOTAL_PAGES = 27;
const DELAY_MS = 1000; // 1 second between requests to be respectful

function fetchPage(pageNum) {
  return new Promise((resolve, reject) => {
    const url = pageNum === 1
      ? 'https://bhajanmarg.com/radhasudhanidhi/'
      : `https://bhajanmarg.com/radhasudhanidhi/${pageNum}/`;

    console.log(`Fetching page ${pageNum}/${TOTAL_PAGES}: ${url}`);

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => resolve(data));
          res2.on('error', reject);
        }).on('error', reject);
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAll() {
  let allContent = '';

  for (let i = 1; i <= TOTAL_PAGES; i++) {
    try {
      const html = await fetchPage(i);
      allContent += `\n\n===== PAGE ${i} =====\n\n` + html;
      console.log(`  Page ${i} fetched (${html.length} bytes)`);

      if (i < TOTAL_PAGES) {
        await sleep(DELAY_MS);
      }
    } catch (err) {
      console.error(`  ERROR on page ${i}:`, err.message);
    }
  }

  fs.writeFileSync('rsn-raw.txt', allContent, 'utf8');
  console.log(`\nDone! Saved to rsn-raw.txt (${allContent.length} bytes)`);
}

fetchAll();
