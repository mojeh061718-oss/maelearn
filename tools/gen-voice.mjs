// Generates public/voice/*.mp3 + public/voice/map.json from every line the
// app can speak. Synthesis: Piper (en_US-amy-medium, neural, CC-friendly);
// encode: lameenc via the sibling python script. Re-run after content changes.
//
// Keep in sync with:
//   scenes/* speak() calls  ·  content say/hint fields  ·  App shell lines

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const acts = JSON.parse(readFileSync('public/content/activities.json', 'utf8'));
const glyphs = JSON.parse(readFileSync('public/content/glyphs.json', 'utf8'));

const LETTER_SOUNDS = {
  A: 'ah', B: 'buh', C: 'kuh', D: 'duh', E: 'eh', F: 'fff', G: 'guh',
  H: 'huh', I: 'ih', J: 'juh', K: 'kwuh', L: 'lll', M: 'mmm', N: 'nnn',
  O: 'oh', P: 'puh', Q: 'kwuh', R: 'rrr', S: 'sss', T: 'tuh', U: 'uh',
  V: 'vvv', W: 'wuh', X: 'ks', Y: 'yuh', Z: 'zzz',
};
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  'twenty one', 'twenty two', 'twenty three', 'twenty four', 'twenty five', 'twenty six', 'twenty seven', 'twenty eight', 'twenty nine', 'thirty'];

const lines = new Set();
const add = (t) => { if (t && typeof t === 'string') lines.add(t.trim().replace(/\s+/g, ' ')); };

// ---- static app + scene lines ----
[
  'Voice check! Hello Maelie!',
  'Finish the glowing one first!',
  'You popped them all!',
  'Yum yum yum! Thank you!',
  'No no, listen again!',
  'Hmm, try the other one!',
  'What a beautiful pattern you made!',
  'You found the pattern!',
  'Look at the pattern again!',
  'Listen again!',
  'How many did we count?',
  'Count again with me!',
  'Quick! Look how many!',
  'You saw it!',
  'Look again!',
  'Good trying! Watch the dot, and off we go!',
  'Almost! Start at the green dot.',
  'You wrote Maelie!',
  "That's right!",
].forEach(add);

// per-letter lines
for (const L of Object.keys(LETTER_SOUNDS)) {
  add(`${LETTER_SOUNDS[L]}. ${LETTER_SOUNDS[L]}.`);
  add(`Big ${L}`);
  add(`small ${L}`);
  add(`Find the letter ${L}!`);
}
// numbers
NUM_WORDS.forEach(add);
for (let n = 0; n <= 10; n++) add(`Find the number ${n}!`);
add(`${NUM_WORDS[3]}! That's right!`); // tap-count praise pattern below covers all
for (let n = 1; n <= 10; n++) add(`${NUM_WORDS[n]}! That's right!`);

// glyph lines
for (const g of Object.values(glyphs)) {
  add(g.label);
  add(`Trace ${g.label}! ${g.strokes[0].hint}`);
  add(`Now trace ${g.label}! ${g.strokes[0].hint}`);
  for (const s of g.strokes) add(s.hint);
}

// shapes
for (const kind of ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'sphere', 'cube']) {
  add(`Tap the ${kind}!`);
  add(`${kind}! Yes!`);
  add(`Hmm, find the ${kind}!`);
}

// content-embedded lines (instruction, say, scaffold, hints, praise words)
const praiseWord = (w) => add(`${w}! That's it!`);
function scan(v) {
  if (Array.isArray(v)) { v.forEach(scan); return; }
  if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) {
      if ((k === 'say' || k === 'instruction' || k === 'hint') && typeof val === 'string') add(val);
      if (k === 'scaffold' && Array.isArray(val)) val.forEach(add);
      if (k === 'word' && typeof val === 'string') praiseWord(val);
      scan(val);
    }
  }
}
scan(acts);

const list = [...lines].sort();
console.log(`voice lines: ${list.length}`);

mkdirSync('public/voice', { recursive: true });
const map = {};
const manifest = list.map((t) => {
  const h = createHash('sha1').update(t).digest('hex').slice(0, 12);
  map[t] = `${h}.mp3`;
  return { t, h };
});
writeFileSync('/tmp/voice-manifest.json', JSON.stringify(manifest));
execSync('python3 tools/synth_voice.py /tmp/voice-manifest.json public/voice', { stdio: 'inherit' });
writeFileSync('public/voice/map.json', JSON.stringify(map));
console.log('voice map written');
