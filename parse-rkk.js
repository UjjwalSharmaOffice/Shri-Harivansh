// Fetcher + Parser for Shri Radha Kripa Kataksh Stotram
const https = require('https');
const fs = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching Radha Kripa Kataksh...');
  const html = await fetch('https://bhajanmarg.com/radha-kripa-kataksh-in-hindi/');
  fs.writeFileSync('rkk-raw.html', html, 'utf8');
  console.log(`Fetched: ${html.length} bytes`);

  // Extract audio URLs
  const audioUrls = [];
  const mp3s = html.match(/https?:\/\/[^\s"'<>]+\.mp3/gi) || [];
  mp3s.forEach(u => { if (!audioUrls.includes(u)) audioUrls.push(u); });
  console.log(`Audio URLs: ${audioUrls.length}`);
  audioUrls.forEach((u,i) => console.log(`  ${i}: ...${u.substring(u.lastIndexOf('/')+1)}`));

  // Extract YouTube video URLs/embeds
  const ytUrls = [];
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;
  let ytMatch;
  while ((ytMatch = ytRegex.exec(html)) !== null) {
    const id = ytMatch[1];
    if (!ytUrls.includes(id)) ytUrls.push(id);
  }
  console.log(`YouTube IDs: ${ytUrls.length}`);
  ytUrls.forEach((id,i) => console.log(`  ${i}: ${id}`));

  // Extract verses from <p> tags
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  const paragraphs = [];

  while ((match = pRegex.exec(html)) !== null) {
    let text = match[1].trim();
    if (!text || text.length < 10) continue;
    text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
    text = text.replace(/&amp;/g, '&').replace(/&#8211;/g, '–').replace(/&#8216;/g, "'").replace(/&#8217;/g, "'");
    text = text.replace(/&nbsp;/g, ' ').replace(/\n\s+/g, '\n').trim();
    if (text.length < 10) continue;
    if (text.includes('हर दिन') || text.includes('हर रोज')) continue;
    if (text.startsWith('पृष्ठ:') || text.startsWith('Copyright')) continue;
    if (text.startsWith('मार्गदर्शक')) continue;
    paragraphs.push(text);
  }

  console.log(`\nContent paragraphs: ${paragraphs.length}`);

  // The structure for RKK: each verse = shloka (with ॥N॥), then vyakhya starting with "व्याख्या"
  const verses = [];
  let i = 0;
  while (i < paragraphs.length) {
    const p = paragraphs[i];
    const numMatch = p.match(/॥\s*(\d+)\s*॥/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      let vyakhya = '';
      if (i + 1 < paragraphs.length && paragraphs[i + 1].includes('व्याख्या')) {
        vyakhya = paragraphs[i + 1].replace(/^व्याख्या\s*[–-]?\s*/, '');
        i++;
      }
      verses.push({ number: num, hindiShloka: p, vyakhya, englishShloka: '' });
    }
    i++;
  }

  console.log(`Verses found: ${verses.length}`);
  verses.forEach(v => console.log(`  V${v.number}: ${v.hindiShloka.substring(0,60)}...`));

  // Build collection
  const collection = {
    id: 'radha-kripa-kataksh',
    title: 'Shri Radha Kripa Kataksh',
    subtitle: 'Stotram with Hindi meaning — Audio & Video',
    description: 'Shri Radha Kripa Kataksh Stotram — 12 divine verses praising Shri Radha\'s compassionate glance.',
    totalVerses: verses.length,
    estimatedAudioParts: 1,
    audioHint: 'Audio and YouTube video included.',
    youtubeIds: ytUrls,
    sections: [{
      id: 'rkk-1-12',
      title: 'Shlokas 1-12',
      audioUrl: audioUrls[0] || '',
      verses: verses
    }]
  };

  // Read and merge with existing content.js
  const existing = fs.readFileSync('app/content.js', 'utf8');
  let parsed;
  try {
    parsed = new Function('return ' + existing.replace('export const collections = ', '').replace(/;\s*$/, ''))();
  } catch(e) { parsed = []; }

  const filtered = Array.isArray(parsed) ? parsed.filter(c => c.id !== 'radha-kripa-kataksh') : [];
  filtered.push(collection);
  fs.writeFileSync('app/content.js', 'export const collections = ' + JSON.stringify(filtered, null, 2) + ';\n');

  console.log(`\nDone! ${filtered.length} collections. RKK: ${verses.length} verses`);
}

main().catch(console.error);
