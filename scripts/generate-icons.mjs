import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { devRequire } from "./dev-dependencies.mjs";

const sharp = devRequire("sharp");
const svg = await readFile(new URL("../assets/logo.svg", import.meta.url));
const destination = new URL("../extension/icons/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  let image;
  if (size === 128) {
    // The store icon has a 96 px artwork area with 16 px transparent padding.
    const trimmed = await sharp(svg).resize(448, 448, { kernel: "nearest" }).trim().png().toBuffer();
    image = sharp(trimmed).resize(96, 96, { kernel: "nearest" }).extend({ top: 16, bottom: 16, left: 16, right: 16, background: "#00000000" });
  } else image = sharp(svg).resize(size, size, { kernel: "nearest" });
  await image.png().toFile(fileURLToPath(new URL(`icon${size}.png`, destination)));
}
await sharp(svg).resize(512, 512, { kernel: "nearest" }).png().toFile(fileURLToPath(new URL("../assets/8bittabs.png", import.meta.url)));
console.log("Generated 8bitTabs Pixel Core icons and brand artwork.");
