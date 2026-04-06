const fs = require('fs');
const raw = fs.readFileSync('rsn-raw.txt', 'utf8');

const pageChunks = raw.split(/===== PAGE \d+ =====/).slice(1);
console.log(`Total pages: ${pageChunks.length}`);

// Extract audio URLs
const allAudioUrls = [];
for (const page of pageChunks) {
  const mp3s = page.match(/https?:\/\/[^\s"'<>]+\.mp3/gi) || [];
  mp3s.forEach(u => { if (!allAudioUrls.includes(u)) allAudioUrls.push(u); });
}
const sectionAudios = allAudioUrls.filter(u => !u.includes('mahima'));
console.log(`Audio URLs: ${sectionAudios.length} (section), ${allAudioUrls.length} (total)`);

const allVerses = [];
let globalVerseNum = 0;

for (let pageIdx = 0; pageIdx < pageChunks.length; pageIdx++) {
  const html = pageChunks[pageIdx];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  const paragraphs = [];
  
  while ((match = pRegex.exec(html)) !== null) {
    let text = match[1].trim();
    if (!text || text.length < 10) continue;
    text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
    text = text.replace(/&amp;/g, '&').replace(/&#8211;/g, '-');
    text = text.replace(/&#8216;/g, "'").replace(/&#8217;/g, "'");
    text = text.replace(/&#8220;/g, '"').replace(/&#8221;/g, '"');
    text = text.replace(/&nbsp;/g, ' ').replace(/\n\s+/g, '\n').trim();
    if (text.length < 10) continue;
    if (text.includes('हर दिन केवल')) continue;
    if (text.includes('हर रोज श्री राधा')) continue;
    if (text.includes('यह पाठ भी हर दिन')) continue;
    if (text.startsWith('पृष्ठ:')) continue;
    if (text.startsWith('Copyright')) continue;
    paragraphs.push(text);
  }
  
  // Strategy: Find vyakhya paragraphs and work backwards
  // Each verse = [hindi_shloka, english_translit, vyakhya]
  // We know there are always exactly 10 vyakhyas per page
  
  const vyakhyaIndices = [];
  paragraphs.forEach((p, idx) => {
    if (p.startsWith('व्याख्या') || p.includes('व्याख्या:')) {
      vyakhyaIndices.push(idx);
    }
  });
  
  for (const vyIdx of vyakhyaIndices) {
    globalVerseNum++;
    
    // Vyakhya text
    let vyakhya = paragraphs[vyIdx].replace(/^व्याख्या\s*[:：]?\s*/, '');
    
    // English is the paragraph before vyakhya
    let englishShloka = '';
    if (vyIdx >= 1) {
      const candidate = paragraphs[vyIdx - 1];
      if (!candidate.includes('व्याख्या')) {
        englishShloka = candidate;
      }
    }
    
    // Hindi shloka is the one before english
    let hindiShloka = '';
    if (vyIdx >= 2) {
      const candidate = paragraphs[vyIdx - 2];
      if (!candidate.includes('व्याख्या')) {
        hindiShloka = candidate;
      }
    }
    
    // Try to extract verse number from the hindi shloka
    const numMatch = hindiShloka.match(/॥\s*(\d+)\s*॥/);
    const verseNum = numMatch ? parseInt(numMatch[1], 10) : globalVerseNum;
    if (numMatch) globalVerseNum = verseNum; // sync
    
    allVerses.push({ number: verseNum, hindiShloka, englishShloka, vyakhya });
  }
}

// Handle special closing text on page 27
// The last items might include "जै जै श्री" closing
const cleanVerses = allVerses.filter(v => {
  if (v.hindiShloka.includes('॥ श्री ललिता')) return false;
  if (v.hindiShloka.includes('इस प्रकार')) return false;
  if (!v.hindiShloka && !v.englishShloka) return false;
  return true;
});

console.log(`Total: ${allVerses.length}, Clean: ${cleanVerses.length}`);
console.log(`Verse range: ${cleanVerses[0]?.number} - ${cleanVerses[cleanVerses.length-1]?.number}`);

// Samples
console.log('\n--- First 2 ---');
cleanVerses.slice(0, 2).forEach(v => {
  console.log(`V${v.number}: ${v.hindiShloka.substring(0,80)}`);
  console.log(`  En: ${v.englishShloka.substring(0,60)}`);
  console.log(`  Vy: ${v.vyakhya.substring(0,60)}`);
});
console.log('\n--- Last 2 ---');
cleanVerses.slice(-2).forEach(v => {
  console.log(`V${v.number}: ${v.hindiShloka.substring(0,80)}`);
  console.log(`  En: ${v.englishShloka.substring(0,60)}`);
  console.log(`  Vy: ${v.vyakhya.substring(0,60)}`);
});

// Build sections (10 verses per section)
const sections = [];
for (let i = 0; i < 27; i++) {
  const sectionVerses = cleanVerses.slice(i * 10, (i + 1) * 10);
  const start = i * 10 + 1;
  const end = (i + 1) * 10;
  sections.push({
    id: `rsn-${start}-${end}`,
    title: `Shlokas ${start}-${end}`,
    audioUrl: sectionAudios[i] || '',
    verses: sectionVerses.map((v, j) => ({ ...v, number: start + j }))
  });
}

const collection = {
  id: 'radha-sudha-nidhi',
  title: 'Shri Radha Sudha Nidhi',
  subtitle: 'Sanskrit stotram with Hindi meaning and English transliteration',
  description: 'Shri Radha Sudha Nidhi Stotram by Shri Hit Harivansh Mahaprabhu Ji - 270 divine shlokas.',
  totalVerses: cleanVerses.length,
  estimatedAudioParts: 27,
  audioHint: 'Audio is attached per section of 10 shlokas.',
  sections
};

// Read and merge with existing content
const existing = fs.readFileSync('app/content.js', 'utf8');
let parsed;
try {
  parsed = new Function('return ' + existing.replace('export const collections = ', '').replace(/;\s*$/, ''))();
} catch(e) { parsed = []; }

const filtered = Array.isArray(parsed) ? parsed.filter(c => c.id !== 'radha-sudha-nidhi') : [];
filtered.push(collection);
fs.writeFileSync('app/content.js', 'export const collections = ' + JSON.stringify(filtered, null, 2) + ';\n');

console.log(`\nDone! ${filtered.length} collections. RSN: ${cleanVerses.length} verses`);
sections.forEach(s => console.log(`  ${s.id}: ${s.verses.length}v, audio:${s.audioUrl?'Y':'N'}`));
