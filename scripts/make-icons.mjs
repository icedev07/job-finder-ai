// Draws the Job Finder logo (the sidebar's radar icon, white on a brand-blue
// square) and writes every icon the site and the Chrome extension use:
//   app/icon.svg                      favicon for browsers that take SVG
//   app/favicon.ico                   16, 32 and 48 px for the rest
//   app/apple-icon.png                180 px, edge to edge (iOS rounds the corners)
//   extension/icons/icon{16,32,48,128}.png
// Run it after changing the drawing: node scripts/make-icons.mjs
// (sharp comes with Next.js; nothing to install).
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const BRAND = "#0091d4"; // --brand in app/globals.css
const BRAND_DARK = "#006aaf"; // --primary
// lucide's "radar" (24 × 24 grid), the icon in the sidebar and on the login page.
const RADAR = [
  '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/>',
  '<path d="M4 6h.01"/>',
  '<path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/>',
  '<path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/>',
  '<path d="M12 18h.01"/>',
  '<path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/>',
  '<circle cx="12" cy="12" r="2"/>',
  '<path d="m13.41 10.59 5.66-5.66"/>',
].join("");

// Drawn on a 128-unit grid. inset: clear margin around the square; glyph: share
// of the square the radar fills; stroke: line width on the 24-unit radar grid
// (small icons get bolder lines so they survive 16 px).
function logo({ px, inset = 0, radius = 28, glyph = 0.66, stroke = 2 }) {
  const round = (v) => Math.round(v * 1000) / 1000;
  const side = 128 - 2 * inset;
  const g = side * glyph;
  const at = round(inset + (side - g) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND}"/>
      <stop offset="1" stop-color="${BRAND_DARK}"/>
    </linearGradient>
  </defs>
  <rect x="${inset}" y="${inset}" width="${side}" height="${side}" rx="${radius}" fill="url(#bg)"/>
  <g transform="translate(${at} ${at}) scale(${round(g / 24)})" fill="none" stroke="#fff" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${RADAR}</g>
</svg>
`;
}

// Bolder and larger in the small sizes, where thin lines blur together.
const PX16 = { glyph: 0.84, stroke: 2.8 };
const PX32 = { glyph: 0.8, stroke: 2.4 };

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

// An .ico holding PNG images (every browser since IE 9 reads them).
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ px, data }, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(px, at);
    head.writeUInt8(px, at + 1);
    head.writeUInt16LE(1, at + 4); // colour planes
    head.writeUInt16LE(32, at + 6); // bits per pixel
    head.writeUInt32LE(data.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.data)]);
}

const out = new URL("../", import.meta.url);
const write = (path, data) => writeFile(new URL(path, out), data);

await write("app/icon.svg", logo({ px: 128 }));
const favicon = [
  { px: 16, data: await png(logo({ px: 16, ...PX16 })) },
  { px: 32, data: await png(logo({ px: 32, ...PX32 })) },
  { px: 48, data: await png(logo({ px: 48 })) },
];
await write("app/favicon.ico", ico(favicon));
await write("app/apple-icon.png", await png(logo({ px: 180, radius: 0, glyph: 0.6 })));
await write("extension/icons/icon16.png", favicon[0].data);
await write("extension/icons/icon32.png", favicon[1].data);
await write("extension/icons/icon48.png", favicon[2].data);
// The Chrome Web Store's rule: a 96 px picture with 16 px clear on each side.
await write("extension/icons/icon128.png", await png(logo({ px: 128, inset: 16, radius: 21 })));
console.log("Wrote app/icon.svg, app/favicon.ico, app/apple-icon.png and extension/icons/icon{16,32,48,128}.png");
