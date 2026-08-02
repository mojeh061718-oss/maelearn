// Generates PWA icons: warm cream background, sun + big rounded "M".
// Pure-pixel rendering via pngjs; no native canvas needed.

import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';

function render(size, maskable) {
  const png = new PNG({ width: size, height: size });
  const bg = [255, 107, 107];      // coral
  const sun = [255, 209, 102];     // warm yellow
  const letter = [255, 255, 255];
  const cx = size / 2, cy = size / 2;
  const sunR = size * (maskable ? 0.32 : 0.38);
  // M geometry, in unit coords relative to sun center
  const w = sunR * 1.1, h = sunR * 0.95;
  const strokeW = sunR * 0.22;
  const mPts = [
    [cx - w / 2, cy + h / 2], [cx - w / 2, cy - h / 2],
    [cx, cy + h * 0.1], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2],
  ];
  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) << 2;
      let c = bg;
      const d = Math.hypot(x - cx, y - cy);
      if (d < sunR) c = sun;
      // rays
      if (d >= sunR * 1.12 && d < sunR * 1.35) {
        const a = Math.atan2(y - cy, x - cx);
        if (Math.abs(Math.sin(a * 6)) > 0.85) c = sun;
      }
      for (let s = 0; s < 4; s++) {
        if (distSeg(x, y, mPts[s][0], mPts[s][1], mPts[s + 1][0], mPts[s + 1][1]) < strokeW / 2) c = letter;
      }
      png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-180.png', render(180, false));
writeFileSync('public/icons/icon-192.png', render(192, false));
writeFileSync('public/icons/icon-512.png', render(512, false));
writeFileSync('public/icons/icon-512-maskable.png', render(512, true));
console.log('icons written');
