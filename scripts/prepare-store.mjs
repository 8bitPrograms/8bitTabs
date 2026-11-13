import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { devRequire } from "./dev-dependencies.mjs";

const sharp = devRequire("sharp");
const destination = new URL("../store/", import.meta.url);
await mkdir(new URL("screenshots/", destination), { recursive: true });
await copyFile(new URL("../extension/icons/icon128.png", import.meta.url), new URL("icon128.png", destination));
for (const [input, name] of [["store-overview.png", "01-archive.png"], ["store-search.png", "02-search.png"], ["store-settings.png", "03-settings.png"]]) {
  const source = new URL(`../test-results/${input}`, import.meta.url);
  const metadata = await sharp(fileURLToPath(source)).metadata();
  if (metadata.width !== 1280 || metadata.height !== 800) throw new Error(`${input} must be a real 1280×800 browser screenshot. Run browser tests first.`);
  await sharp(fileURLToPath(source)).removeAlpha().png().toFile(fileURLToPath(new URL(`screenshots/${name}`, destination)));
}

// Code-native artwork shares the app's actual Pixel Core SVG; no remote assets or fonts.
const svg = await readFile(new URL("../assets/logo.svg", import.meta.url), "utf8");
const mark = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
function promo(width, height) {
  const small = width < 600;
  const markSize = small ? 68 : 112;
  const x = small ? 28 : 64;
  const y = small ? 28 : 74;
  const textY = small ? 139 : 252;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#101419"/>
    <rect x="${width - (small ? 100 : 340)}" width="${small ? 100 : 340}" height="${height}" fill="#141a21"/>
    <path d="M0 ${height - 5}H${width}" stroke="#F5B544" stroke-width="10"/>
    <svg x="${x}" y="${y}" width="${markSize}" height="${markSize}" viewBox="0 0 16 16" shape-rendering="crispEdges">${mark}</svg>
    <text x="${x + markSize + 14}" y="${y + markSize * .66}" fill="#EDF2F7" font-family="Segoe UI,Arial,sans-serif" font-size="${small ? 30 : 61}" font-weight="700">8bit<tspan fill="#F5B544">Tabs</tspan></text>
    <text x="${x}" y="${textY}" fill="#EDF2F7" font-family="Segoe UI,Arial,sans-serif" font-size="${small ? 25 : 59}" font-weight="650">Less clutter.</text>
    <text x="${x}" y="${textY + (small ? 33 : 71)}" fill="#F5B544" font-family="Segoe UI,Arial,sans-serif" font-size="${small ? 25 : 59}" font-weight="650">More headspace.</text>
    <text x="${x}" y="${height - (small ? 53 : 101)}" fill="#ABB7C5" font-family="Consolas,monospace" font-size="${small ? 10 : 17}" letter-spacing="1">SAVE. CLOSE. COME BACK.</text>
    <text x="${x}" y="${height - (small ? 29 : 65)}" fill="#ABB7C5" font-family="Segoe UI,Arial,sans-serif" font-size="${small ? 10 : 17}">Local. Open source. Your tabs stay yours.</text>
    ${small ? "" : '<g fill="none" stroke="#303c4a" stroke-width="2"><rect x="1007" y="130" width="275" height="164" rx="5"/><rect x="1040" y="174" width="275" height="164" rx="5"/><rect x="1073" y="218" width="275" height="164" rx="5"/><path d="M1095 253h230M1095 283h190M1095 313h210"/></g><path d="M1073 218h275" stroke="#F5B544" stroke-width="3"/>'}
  </svg>`;
}
for (const [width, height, name] of [[440, 280, "small-promo"], [1400, 560, "marquee-promo"]]) {
  const source = promo(width, height).replace(/[ \t]+$/gm, "");
  await writeFile(new URL(`${name}.svg`, destination), source + "\n");
  await sharp(Buffer.from(source)).removeAlpha().png().toFile(fileURLToPath(new URL(`${name}.png`, destination)));
}
console.log("Prepared store icon, three real screenshots, and optional promo artwork.");
