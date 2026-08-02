// Generates public/content/glyphs.json and public/content/activities.json.
// Content is data (BLUEPRINT §7/§11) — this script is the authoring tool.
// Glyphs: uppercase A–Z + 0–9, multi-stroke polylines in a 100×140 box,
// resampled ~4 units apart, then scaled/centered into logical 1024×768 space.

import { writeFileSync, mkdirSync } from 'node:fs';

// ---------- geometry helpers ----------
const line = (...pts) => ({ kind: 'poly', pts });
// ellipse arc: center, rx, ry, degrees from..to (90 = top, 0 = right, CCW positive)
const arc = (cx, cy, rx, ry, a0, a1) => ({ kind: 'arc', cx, cy, rx, ry, a0, a1 });

function samplePart(part) {
  if (part.kind === 'poly') return part.pts;
  const { cx, cy, rx, ry, a0, a1 } = part;
  const steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 6));
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(a), cy - ry * Math.sin(a)]);
  }
  return out;
}

function resample(points, spacing = 4) {
  const out = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    let [x0, y0] = out[out.length - 1] ?? points[i - 1];
    const [x1, y1] = points[i];
    let d = Math.hypot(x1 - x0, y1 - y0);
    while (acc + d >= spacing) {
      const t = (spacing - acc) / d;
      const nx = x0 + (x1 - x0) * t;
      const ny = y0 + (y1 - y0) * t;
      out.push([nx, ny]);
      x0 = nx; y0 = ny;
      d = Math.hypot(x1 - x0, y1 - y0);
      acc = 0;
    }
    acc += d;
  }
  const last = points[points.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > 1) out.push(last);
  return out.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}

function stroke(hint, ...parts) {
  const pts = parts.flatMap(samplePart);
  return { hint, raw: pts };
}

// ---------- glyph definitions (100×140 box; y down; baseline 140) ----------
const G = {};
G.A = ['A', stroke('Slide down to the left', line([50, 0], [10, 140])), stroke('Slide down to the right', line([50, 0], [90, 140])), stroke('Across the middle', line([25, 92], [75, 92]))];
G.B = ['B', stroke('Big line down', line([22, 0], [22, 140])), stroke('Little curve to the middle', line([22, 0], [55, 0]), arc(55, 35, 32, 35, 90, -90), line([55, 70], [22, 70])), stroke('Little curve to the bottom', line([22, 70], [58, 70]), arc(58, 105, 34, 35, 90, -90), line([58, 140], [22, 140]))];
G.C = ['C', stroke('Curve around like a moon', arc(55, 70, 42, 68, 55, 305))];
G.D = ['D', stroke('Big line down', line([22, 0], [22, 140])), stroke('Big curve around', line([22, 0], [45, 0]), arc(45, 70, 45, 70, 90, -90), line([45, 140], [22, 140]))];
G.E = ['E', stroke('Big line down', line([22, 0], [22, 140])), stroke('Across the top', line([22, 2], [85, 2])), stroke('Across the middle', line([22, 70], [75, 70])), stroke('Across the bottom', line([22, 138], [85, 138]))];
G.F = ['F', stroke('Big line down', line([22, 0], [22, 140])), stroke('Across the top', line([22, 2], [85, 2])), stroke('Across the middle', line([22, 70], [72, 70]))];
G.G = ['G', stroke('Curve around like a C', arc(55, 70, 42, 68, 55, 300)), stroke('In to the middle', line([55, 82], [90, 82], [90, 108]))];
G.H = ['H', stroke('Big line down', line([15, 0], [15, 140])), stroke('Big line down', line([85, 0], [85, 140])), stroke('Across the middle', line([15, 70], [85, 70]))];
G.I = ['I', stroke('Big line down', line([50, 0], [50, 140])), stroke('Across the top', line([25, 2], [75, 2])), stroke('Across the bottom', line([25, 138], [75, 138]))];
G.J = ['J', stroke('Down and hook left', line([70, 0], [70, 100]), arc(45, 100, 25, 38, 0, -180)), stroke('Across the top', line([45, 2], [92, 2]))];
G.K = ['K', stroke('Big line down', line([20, 0], [20, 140])), stroke('Slide in to the middle', line([85, 0], [20, 75])), stroke('Slide out to the bottom', line([20, 75], [85, 140]))];
G.L = ['L', stroke('Big line down', line([25, 0], [25, 140])), stroke('Across the bottom', line([25, 138], [85, 138]))];
G.M = ['M', stroke('Big line down', line([10, 0], [10, 140])), stroke('Slide down and up', line([10, 0], [50, 95], [90, 0])), stroke('Big line down', line([90, 0], [90, 140]))];
G.N = ['N', stroke('Big line down', line([18, 0], [18, 140])), stroke('Slide down to the corner', line([18, 0], [82, 140])), stroke('Big line up', line([82, 140], [82, 0]))];
G.O = ['O', stroke('Curve all the way around', arc(50, 70, 40, 68, 90, 450))];
G.P = ['P', stroke('Big line down', line([22, 0], [22, 140])), stroke('Curve to the middle', line([22, 0], [55, 0]), arc(55, 38, 34, 38, 90, -90), line([55, 76], [22, 76]))];
G.Q = ['Q', stroke('Curve all the way around', arc(50, 66, 40, 64, 90, 450)), stroke('Little tail', line([60, 95], [92, 140]))];
G.R = ['R', stroke('Big line down', line([22, 0], [22, 140])), stroke('Curve to the middle', line([22, 0], [55, 0]), arc(55, 37, 34, 37, 90, -90), line([55, 74], [22, 74])), stroke('Slide down to the corner', line([40, 74], [88, 140]))];
G.S = ['S', stroke('Curve like a snake', line([80, 20], [66, 5], [42, 2], [22, 12], [16, 32], [26, 50], [50, 62], [74, 76], [84, 96], [78, 120], [56, 136], [30, 136], [14, 120]))];
G.T = ['T', stroke('Across the top', line([10, 2], [90, 2])), stroke('Big line down', line([50, 2], [50, 140]))];
G.U = ['U', stroke('Down, around, and up', line([16, 0], [16, 88]), arc(50, 88, 34, 50, 180, 360), line([84, 88], [84, 0]))];
G.V = ['V', stroke('Slide down to the point', line([12, 0], [50, 140])), stroke('Slide down to the point', line([88, 0], [50, 140]))];
G.W = ['W', stroke('Down, up, down, up', line([6, 0], [28, 140], [50, 25], [72, 140], [94, 0]))];
G.X = ['X', stroke('Slide down this way', line([16, 0], [84, 140])), stroke('Slide down that way', line([84, 0], [16, 140]))];
G.Y = ['Y', stroke('Slide in to the middle', line([14, 0], [50, 68])), stroke('Slide in to the middle', line([86, 0], [50, 68])), stroke('Little line down', line([50, 68], [50, 140]))];
G.Z = ['Z', stroke('Across, slide down, across', line([15, 2], [85, 2], [15, 138], [85, 138]))];

G['0'] = ['0', stroke('Curve all the way around', arc(50, 70, 38, 68, 90, 450))];
G['1'] = ['1', stroke('Little slide up, big line down', line([32, 22], [54, 0], [54, 140]))];
G['2'] = ['2', stroke('Curve, slide down, across', line([20, 32], [30, 10], [54, 2], [76, 12], [82, 36], [66, 68], [18, 138], [84, 138]))];
G['3'] = ['3', stroke('Curve and curve again', line([22, 14], [46, 2], [70, 10], [78, 32], [60, 60], [44, 66], [64, 74], [80, 98], [72, 126], [44, 140], [18, 126]))];
G['4'] = ['4', stroke('Slide down, across', line([62, 0], [14, 92], [86, 92])), stroke('Big line down', line([62, 0], [62, 140]))];
G['5'] = ['5', stroke('Across the top', line([80, 2], [26, 2])), stroke('Little line down', line([26, 2], [26, 58])), stroke('Big curve around', line([26, 58], [54, 50], [78, 64], [82, 94], [70, 124], [42, 140], [16, 126]))];
G['6'] = ['6', stroke('Slide down and curl around', line([70, 4], [46, 14], [28, 44], [20, 86], [28, 120], [52, 140], [72, 128], [80, 104], [70, 82], [46, 74], [28, 84], [22, 100]))];
G['7'] = ['7', stroke('Across the top', line([15, 2], [85, 2])), stroke('Slide down', line([85, 2], [35, 140]))];
G['8'] = ['8', stroke('Make an S and close it up', line([50, 2], [74, 12], [78, 34], [58, 58], [34, 72], [20, 94], [26, 124], [50, 140], [74, 126], [80, 96], [64, 74], [42, 58], [24, 34], [28, 12], [50, 2]))];
G['9'] = ['9', stroke('Little circle', arc(48, 38, 30, 36, 0, 360)), stroke('Big line down', line([78, 38], [72, 140]))];

// scale into logical space: glyph area ~ centered, height 480
function toGlyph(id, def) {
  const [label, ...strokes] = def;
  const S = 480 / 140; // scale
  const ox = (1024 - 100 * S) / 2;
  const oy = (768 - 480) / 2 - 20;
  return {
    id, label,
    strokes: strokes.map((st) => ({
      hint: st.hint,
      points: resample(st.raw.map(([x, y]) => [x * S + ox, y * S + oy]), 14),
    })),
  };
}

const glyphs = {};
for (const [k, def] of Object.entries(G)) glyphs[`U${k}`] = toGlyph(`U${k}`, def);

// ---------- activities ----------
const acts = [];
const lit = (sub, goal) => ({ domain: 'literacy', subDomain: sub, goal });
const math = (sub, goal) => ({ domain: 'mathematics', subDomain: sub, goal });

// PK4 teaching order for uppercase (S22: uppercase first; frequency-informed order)
const LETTER_ORDER = 'MAELISTOPCNBDFGHJKQRUVWXYZ'.split(''); // her name's letters first
LETTER_ORDER.forEach((L, i) => {
  acts.push({
    id: `trace-U${L}`, title: L, icon: L, sceneType: 'trace',
    elofTags: lit('writing', 'trace-letters'),
    difficulty: i < 8 ? 1 : i < 16 ? 2 : 3,
    params: { glyphIds: [`U${L}`], speakEach: true },
  });
});
for (let n = 0; n <= 9; n++) {
  acts.push({
    id: `trace-N${n}`, title: String(n), icon: String(n), sceneType: 'trace',
    elofTags: math('counting', 'write-numerals'),
    difficulty: n < 5 ? 1 : 2,
    params: { glyphIds: [`U${n}`], speakEach: true },
  });
}
// Her own name — explicit PK4 outcome (BLUEPRINT §11)
acts.push({
  id: 'trace-name', title: 'My Name', icon: '💛', sceneType: 'trace',
  elofTags: lit('writing', 'write-own-name'),
  difficulty: 2,
  params: { glyphIds: ['UM', 'UA', 'UE', 'UL', 'UI', 'UE'], speakEach: true, celebrateWord: 'Maelie' },
});

// match: letter→sound, upper↔lower, numeral→quantity
const soundGroups = [['M', 'A', 'S', 'T'], ['E', 'L', 'I', 'P'], ['C', 'N', 'B', 'D'], ['F', 'G', 'H', 'K']];
soundGroups.forEach((g, i) => acts.push({
  id: `match-sound-${i + 1}`, title: 'Sounds', icon: '🔊', sceneType: 'match',
  elofTags: lit('print-alphabet', 'letter-sound'),
  difficulty: i + 1 <= 2 ? 2 : 3,
  params: { mode: 'letter-sound', letters: g },
}));
const caseGroups = [['A', 'B', 'D', 'E'], ['G', 'H', 'M', 'N'], ['Q', 'R', 'T', 'L']];
caseGroups.forEach((g, i) => acts.push({
  id: `match-case-${i + 1}`, title: 'Big+Small', icon: '🅰️', sceneType: 'match',
  elofTags: lit('print-alphabet', 'upper-lower'),
  difficulty: 2 + (i > 0 ? 1 : 0),
  params: { mode: 'case', letters: g },
}));
[[1, 2, 3, 4], [3, 4, 5, 6], [5, 6, 7, 8], [7, 8, 9, 10]].forEach((g, i) => acts.push({
  id: `match-qty-${i + 1}`, title: 'How Many', icon: '🎯', sceneType: 'match',
  elofTags: math('counting', 'numeral-quantity'),
  difficulty: i < 2 ? 1 : 2,
  params: { mode: 'numeral-quantity', numbers: g },
}));

// sort
acts.push(
  { id: 'sort-color-1', title: 'Colors', icon: '🎨', sceneType: 'sort', elofTags: math('measurement', 'sort-attributes'), difficulty: 1,
    params: { criterion: 'color', bins: [{ id: 'red', label: 'Red', icon: '🟥' }, { id: 'blue', label: 'Blue', icon: '🟦' }], items: [{ icon: '🍎', bin: 'red' }, { icon: '🫐', bin: 'blue' }, { icon: '🍓', bin: 'red' }, { icon: '🐳', bin: 'blue' }, { icon: '🌹', bin: 'red' }, { icon: '🦋', bin: 'blue' }] } },
  { id: 'sort-color-2', title: 'Colors', icon: '🎨', sceneType: 'sort', elofTags: math('measurement', 'sort-attributes'), difficulty: 2,
    params: { criterion: 'color', bins: [{ id: 'yellow', label: 'Yellow', icon: '🟨' }, { id: 'green', label: 'Green', icon: '🟩' }, { id: 'purple', label: 'Purple', icon: '🟪' }], items: [{ icon: '🍌', bin: 'yellow' }, { icon: '🐸', bin: 'green' }, { icon: '🍇', bin: 'purple' }, { icon: '⭐', bin: 'yellow' }, { icon: '🥦', bin: 'green' }, { icon: '☂️', bin: 'purple' }, { icon: '🌻', bin: 'yellow' }, { icon: '🥝', bin: 'green' }] } },
  { id: 'sort-size-1', title: 'Sizes', icon: '🐘', sceneType: 'sort', elofTags: math('measurement', 'compare-size'), difficulty: 1,
    params: { criterion: 'size', bins: [{ id: 'big', label: 'Big', icon: '🐘' }, { id: 'small', label: 'Small', icon: '🐭' }], items: [{ icon: '🦕', bin: 'big' }, { icon: '🐜', bin: 'small' }, { icon: '🏔️', bin: 'big' }, { icon: '🐞', bin: 'small' }, { icon: '🐋', bin: 'big' }, { icon: '🌱', bin: 'small' }] } },
  { id: 'sort-shape-1', title: 'Shapes', icon: '🔺', sceneType: 'sort', elofTags: math('geometry', 'sort-shapes'), difficulty: 2,
    params: { criterion: 'shape', bins: [{ id: 'circle', label: 'Circle', icon: '⚪' }, { id: 'square', label: 'Square', icon: '⬜' }], items: [{ icon: '🍪', bin: 'circle' }, { icon: '🎁', bin: 'square' }, { icon: '⚽', bin: 'circle' }, { icon: '📦', bin: 'square' }, { icon: '🕐', bin: 'circle' }, { icon: '🧇', bin: 'square' }] } },
  { id: 'sort-sound-1', title: 'First Sound', icon: '👂', sceneType: 'sort', elofTags: lit('phonological', 'alliteration'), difficulty: 3,
    params: { criterion: 'initial-sound', bins: [{ id: 'm', label: 'M', icon: 'M' }, { id: 's', label: 'S', icon: 'S' }], items: [{ icon: '🌙', bin: 'm', say: 'moon' }, { icon: '☀️', bin: 's', say: 'sun' }, { icon: '🐵', bin: 'm', say: 'monkey' }, { icon: '🧦', bin: 's', say: 'sock' }, { icon: '🍄', bin: 'm', say: 'mushroom' }, { icon: '⭐', bin: 's', say: 'star' }] } },
);

// count
[3, 5, 7, 10].forEach((n, i) => acts.push({
  id: `count-tap-${n}`, title: `Count ${n}`, icon: '👆', sceneType: 'count',
  elofTags: math('counting', 'one-to-one'),
  difficulty: i < 2 ? 1 : 2,
  params: { mode: 'tap-count', target: n, icon: ['🐠', '🦆', '🍎', '⭐'][i], img: ['fish_blue.png', null, null, 'fish_orange.png'][i], theme: ['underwater', null, null, 'underwater'][i] },
}));
[3, 4, 5, 6].forEach((n, i) => acts.push({
  id: `count-subitize-${n}`, title: 'Quick Look', icon: '👀', sceneType: 'count',
  elofTags: math('counting', 'subitize'),
  difficulty: 2 + (i > 1 ? 1 : 0),
  params: { mode: 'subitize', target: n },
}));
acts.push({
  id: 'count-rote-30', title: 'To 30', icon: '🚀', sceneType: 'count',
  elofTags: math('counting', 'rote-30'),
  difficulty: 2,
  params: { mode: 'rote', target: 30 },
});

// pattern
acts.push(
  { id: 'pattern-ab-1', title: 'Pattern', icon: '🔴', sceneType: 'pattern', elofTags: math('algebraic', 'extend-pattern'), difficulty: 1,
    params: { mode: 'extend', unit: ['🔴', '🔵'], shown: 6, choices: ['🔴', '🔵'] } },
  { id: 'pattern-ab-2', title: 'Pattern', icon: '🐶', sceneType: 'pattern', elofTags: math('algebraic', 'extend-pattern'), difficulty: 2,
    params: { mode: 'extend', unit: ['🐶', '🐱'], shown: 6, choices: ['🐶', '🐱', '🐭'] } },
  { id: 'pattern-abc-1', title: 'Pattern', icon: '🍓', sceneType: 'pattern', elofTags: math('algebraic', 'extend-pattern'), difficulty: 3,
    params: { mode: 'extend', unit: ['🍓', '🍌', '🍇'], shown: 7, choices: ['🍓', '🍌', '🍇'] } },
  { id: 'pattern-dup-1', title: 'Copy It', icon: '🟡', sceneType: 'pattern', elofTags: math('algebraic', 'duplicate-pattern'), difficulty: 2,
    params: { mode: 'duplicate', unit: ['🟡', '🟢'], shown: 4, choices: ['🟡', '🟢'] } },
  { id: 'pattern-create-1', title: 'Make One', icon: '✨', sceneType: 'pattern', elofTags: math('algebraic', 'create-pattern'), difficulty: 4,
    params: { mode: 'create', unit: [], shown: 0, choices: ['🔴', '🔵', '🟡'] } },
);

// phonics — ladder order enforced by rung index (§7)
acts.push(
  { id: 'phonics-compound-1', title: 'Word+Word', icon: '🧩', sceneType: 'phonics', elofTags: lit('phonological', 'compound-words'), difficulty: 1,
    params: { rung: 'compound', items: [{ say: 'Cup. Cake. What word do they make?', word: 'cupcake', icon: '🧁', wrong: ['🐶', '🌙'] }, { say: 'Rain. Bow. What word do they make?', word: 'rainbow', icon: '🌈', wrong: ['🍎', '🚗'] }, { say: 'Star. Fish. What word do they make?', word: 'starfish', icon: '⭐', wrong: ['🐸', '🎩'] }] } },
  { id: 'phonics-syllable-1', title: 'Clap It', icon: '👏', sceneType: 'phonics', elofTags: lit('phonological', 'syllables'), difficulty: 2,
    params: { rung: 'syllable', items: [{ say: 'Clap it with me. Ap. Ple. How many claps?', word: 'apple', syllables: 2, icon: '🍎' }, { say: 'Clap it with me. Ba. Na. Na. How many claps?', word: 'banana', syllables: 3, icon: '🍌' }, { say: 'Clap it with me. Dog. How many claps?', word: 'dog', syllables: 1, icon: '🐶' }, { say: 'Clap it with me. But. Ter. Fly. How many claps?', word: 'butterfly', syllables: 3, icon: '🦋' }] } },
  { id: 'phonics-rhyme-1', title: 'Rhymes', icon: '🎵', sceneType: 'phonics', elofTags: lit('phonological', 'rhyme'), difficulty: 2,
    params: { rung: 'rhyme', items: [{ say: 'What rhymes with cat?', word: 'cat', icon: '🐱', answer: { word: 'hat', icon: '🎩' }, wrong: [{ word: 'sun', icon: '☀️' }, { word: 'car', icon: '🚗' }] }, { say: 'What rhymes with dog?', word: 'dog', icon: '🐶', answer: { word: 'frog', icon: '🐸' }, wrong: [{ word: 'moon', icon: '🌙' }, { word: 'fish', icon: '🐟' }] }, { say: 'What rhymes with star?', word: 'star', icon: '⭐', answer: { word: 'car', icon: '🚗' }, wrong: [{ word: 'ball', icon: '⚽' }, { word: 'cake', icon: '🍰' }] }] } },
  { id: 'phonics-allit-1', title: 'Same Start', icon: '🅜', sceneType: 'phonics', elofTags: lit('phonological', 'alliteration'), difficulty: 3,
    params: { rung: 'alliteration', items: [{ say: 'Which one starts with mmm, like the letter M?', answer: { word: 'moon', icon: '🌙' }, wrong: [{ word: 'sun', icon: '☀️' }, { word: 'ball', icon: '⚽' }] }, { say: 'Which one starts with sss, like the letter S?', answer: { word: 'snake', icon: '🐍' }, wrong: [{ word: 'cat', icon: '🐱' }, { word: 'tree', icon: '🌳' }] }] } },
  { id: 'phonics-onset-1', title: 'Word Parts', icon: '🔗', sceneType: 'phonics', elofTags: lit('phonological', 'onset-rime'), difficulty: 4,
    params: { rung: 'onset-rime', items: [{ say: 'Kuh. At. What word?', scaffold: ['c', 'at'], word: 'cat', icon: '🐱', wrong: ['🐶', '☀️'] }, { say: 'Duh. Og. What word?', scaffold: ['d', 'og'], word: 'dog', icon: '🐶', wrong: ['🎩', '🌙'] }] } },
  { id: 'phonics-phoneme-1', title: 'Blend It', icon: '🎶', sceneType: 'phonics', elofTags: lit('phonological', 'phoneme-blend'), difficulty: 5,
    params: { rung: 'phoneme', items: [{ say: 'Sss. Uh. Nnn. What word?', scaffold: ['s', 'u', 'n'], word: 'sun', icon: '☀️', wrong: ['🌙', '🐟'] }, { say: 'Kuh. Ah. Tuh. What word?', scaffold: ['c', 'a', 't'], word: 'cat', icon: '🐱', wrong: ['🐸', '🚗'] }] } },
);

// shape
acts.push(
  { id: 'shape-2d-1', title: 'Shapes', icon: '🔵', sceneType: 'shape', elofTags: math('geometry', 'name-2d'), difficulty: 1,
    params: { rounds: [{ name: 'circle', kind: 'circle' }, { name: 'square', kind: 'square' }, { name: 'triangle', kind: 'triangle' }] } },
  { id: 'shape-2d-2', title: 'Shapes', icon: '⭐', sceneType: 'shape', elofTags: math('geometry', 'name-2d'), difficulty: 2,
    params: { rounds: [{ name: 'rectangle', kind: 'rectangle' }, { name: 'star', kind: 'star' }, { name: 'heart', kind: 'heart' }, { name: 'oval', kind: 'oval' }] } },
  { id: 'shape-3d-1', title: 'Solids', icon: '⚽', sceneType: 'shape', elofTags: math('geometry', 'name-3d'), difficulty: 3,
    params: { rounds: [{ name: 'sphere', kind: 'sphere' }, { name: 'cube', kind: 'cube' }] } },
);

// ---- GAMES ----
// pop: balloons float up; pop the ones with the target letter/number
const popDefs = [
  ['M', ['S', 'O', 'T']], ['A', ['M', 'E', 'B']], ['E', ['F', 'L', 'A']], ['S', ['M', 'C', 'O']],
];
popDefs.forEach(([target, decoys], i) => acts.push({
  id: `pop-letter-${target}`, title: `Pop ${target}`, icon: '🎈', sceneType: 'pop',
  elofTags: lit('print-alphabet', 'letter-recognition'),
  difficulty: i < 2 ? 1 : 2,
  params: { kind: 'letter', target, decoys, need: 4, say: `Pop the balloons with the letter ${target}!` },
}));
[[3, [1, 5, 8]], [5, [2, 3, 9]]].forEach(([target, decoys], i) => acts.push({
  id: `pop-number-${target}`, title: `Pop ${target}`, icon: '🎈', sceneType: 'pop',
  elofTags: math('counting', 'numeral-recognition'),
  difficulty: 1 + i,
  params: { kind: 'number', target: String(target), decoys: decoys.map(String), need: 4, say: `Pop the balloons with the number ${target}!` },
}));
// feed: drag the right thing to a hungry animal
acts.push(
  { id: 'feed-monkey', title: 'Feed Momo', icon: '🐵', sceneType: 'feed',
    elofTags: { domain: 'language', subDomain: 'vocabulary', goal: 'word-picture' }, difficulty: 1,
    params: { animal: 'animal_monkey.png', name: 'Momo', rounds: [
      { say: 'Momo the monkey wants the banana!', answer: { icon: '🍌' }, wrong: [{ icon: '🚗' }, { icon: '🎩' }] },
      { say: 'Momo the monkey wants the ball!', answer: { icon: '⚽' }, wrong: [{ icon: '🍎' }, { icon: '🌙' }] },
      { say: 'Momo the monkey wants the strawberry!', answer: { icon: '🍓' }, wrong: [{ icon: '🧦' }, { icon: '🚂' }] },
    ] } },
  { id: 'feed-panda', title: 'Feed Pip', icon: '🐼', sceneType: 'feed',
    elofTags: lit('phonological', 'initial-sound'), difficulty: 2,
    params: { animal: 'animal_panda.png', name: 'Pip', rounds: [
      { say: 'Pip the panda wants something that starts with mmm!', answer: { icon: '🌙', word: 'moon' }, wrong: [{ icon: '☀️' }, { icon: '🚗' }] },
      { say: 'Pip the panda wants something that starts with sss!', answer: { icon: '🧦', word: 'sock' }, wrong: [{ icon: '🍌' }, { icon: '🎩' }] },
      { say: 'Pip the panda wants something that starts with buh!', answer: { icon: '⚽', word: 'ball' }, wrong: [{ icon: '🌙' }, { icon: '🍓' }] },
    ] } },
  { id: 'feed-elephant', title: 'Feed Ellie', icon: '🐘', sceneType: 'feed',
    elofTags: math('counting', 'quantity'), difficulty: 2,
    params: { animal: 'animal_elephant.png', name: 'Ellie', rounds: [
      { say: 'Ellie the elephant wants two apples!', answer: { icon: '🍎🍎' }, wrong: [{ icon: '🍎' }, { icon: '🍎🍎🍎' }] },
      { say: 'Ellie the elephant wants three cookies!', answer: { icon: '🍪🍪🍪' }, wrong: [{ icon: '🍪' }, { icon: '🍪🍪' }] },
      { say: 'Ellie the elephant wants one cake!', answer: { icon: '🍰' }, wrong: [{ icon: '🍰🍰' }, { icon: '🍰🍰🍰' }] },
    ] } },
  { id: 'feed-rabbit', title: 'Feed Rosie', icon: '🐰', sceneType: 'feed',
    elofTags: math('measurement', 'color-id'), difficulty: 1,
    params: { animal: 'animal_rabbit.png', name: 'Rosie', rounds: [
      { say: 'Rosie the rabbit wants something red!', answer: { icon: '🍓', word: 'red' }, wrong: [{ icon: '🫐' }, { icon: '🍌' }] },
      { say: 'Rosie the rabbit wants something yellow!', answer: { icon: '🍌', word: 'yellow' }, wrong: [{ icon: '🍎' }, { icon: '🥦' }] },
      { say: 'Rosie the rabbit wants something green!', answer: { icon: '🥦', word: 'green' }, wrong: [{ icon: '🍓' }, { icon: '🫐' }] },
    ] } },
);

// freedraw — no scoring, no completion (§7)
acts.push({
  id: 'freedraw', title: 'Draw', icon: '🖍️', sceneType: 'freedraw',
  elofTags: { domain: 'perceptual-motor', subDomain: 'fine-motor', goal: 'free-drawing' },
  difficulty: 1,
  params: { palette: ['#E4572E', '#F3A712', '#5BC0EB', '#9BC53D', '#9B5DE5', '#3D348B', '#212121'], stamps: ['⭐', '🌸', '🦋', '🌈', '💛'] },
});

// ---- per-activity spoken instruction (played by the pre-activity overlay) ----
const INSTRUCTIONS = {
  trace: 'Use your finger to trace! Start at the green dot and follow the little red dot.',
  match: 'Tap two cards that go together!',
  sort: 'Drag each one into its box!',
  count: 'Tap each one and count with me!',
  pattern: 'Look at the pattern. What comes next?',
  phonics: 'Listen with your ears, then tap the right picture!',
  shape: 'Find the shape I say!',
  freedraw: 'Draw anything you like! Tap a color to change your crayon.',
  pop: 'Pop the balloons I say! Ready?',
  feed: 'Oh no, someone is hungry! Drag the right food to their mouth!',
};
for (const a of acts) {
  if (a.sceneType === 'count') {
    const m = a.params.mode;
    a.instruction = m === 'subitize' ? 'Look quick, then tap how many you saw!'
      : m === 'rote' ? 'Tap the glowing numbers and count all the way to thirty!'
      : INSTRUCTIONS.count;
  } else if (a.sceneType === 'pattern') {
    const m = a.params.mode;
    a.instruction = m === 'duplicate' ? 'Copy the pattern!' : m === 'create' ? 'Make your very own pattern!' : INSTRUCTIONS.pattern;
  } else {
    a.instruction = INSTRUCTIONS[a.sceneType];
  }
}

// ---- structured learning path (ABCmouse-style ordered curriculum) ----
const path = [
  'trace-UM', 'pop-letter-M', 'count-tap-3', 'trace-UA', 'match-sound-1',
  'sort-color-1', 'trace-N1', 'feed-rabbit', 'pattern-ab-1', 'trace-UE',
  'count-tap-5', 'shape-2d-1', 'pop-letter-A', 'trace-UL', 'phonics-compound-1',
  'match-qty-1', 'trace-UI', 'feed-monkey', 'count-subitize-3', 'sort-size-1',
  'trace-US', 'phonics-syllable-1', 'pop-number-3', 'pattern-dup-1', 'match-case-1',
  'feed-elephant', 'trace-UT', 'count-rote-30', 'feed-panda', 'trace-name',
];
const ids = new Set(acts.map((a) => a.id));
const missing = path.filter((id) => !ids.has(id));
if (missing.length) throw new Error(`path references unknown activities: ${missing}`);

mkdirSync('public/content', { recursive: true });
writeFileSync('public/content/glyphs.json', JSON.stringify(glyphs));
writeFileSync('public/content/activities.json', JSON.stringify(acts, null, 1));
writeFileSync('public/content/path.json', JSON.stringify(path, null, 1));
console.log(`glyphs: ${Object.keys(glyphs).length}, activities: ${acts.length}, path: ${path.length}`);
