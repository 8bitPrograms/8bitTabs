import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(root, "extension", "manifest.json"), "utf8"));

const table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = (value >>> 8) ^ table[(value ^ byte) & 255];
  return (value ^ 0xffffffff) >>> 0;
}
async function files(directory, prefix = "") {
  const result = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push({ name: relative, data: await readFile(path.join(directory, entry.name)) });
    else throw new Error(`Refusing to package a non-regular file: ${relative}`);
  }
  return result;
}

// Small ZIP32 writer: UTF-8 names, raw DEFLATE, CRC32 and a fixed DOS timestamp.
// Only explicitly listed project files are ever included; no development profiles or archives.
function zip(entries) {
  const local = [];
  const directory = [];
  let offset = 0;
  let directorySize = 0;
  for (const entry of entries) {
    if (entry.name.startsWith("/") || entry.name.split("/").includes("..")) throw new Error("Unsafe archive path");
    const name = Buffer.from(entry.name);
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const crc = crc32(entry.data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0x5c21, 12); // 2026-01-01, midnight: reproducible package bytes.
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(entry.data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0x5c21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    directory.push(central, name);
    offset += header.length + name.length + compressed.length;
    directorySize += central.length + name.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...directory, end]);
}

const extension = await files(path.join(root, "extension"));
const documents = await Promise.all(["LICENSE", "PRIVACY.md", "PRIVACY.tr.md", "KURULUM.md"].map(async (name) => ({ name, data: await readFile(path.join(root, name)) })));
const installable = [...extension, ...documents];
const source = [...extension.map((entry) => ({ ...entry, name: `extension/${entry.name}` })), ...documents];
for (const directory of ["assets", "scripts", "tests", "docs", "store"]) source.push(...(await files(path.join(root, directory))).map((entry) => ({ ...entry, name: `${directory}/${entry.name}` })));
for (const name of ["README.md", "README.tr.md", "package.json", ".gitignore"]) source.push({ name, data: await readFile(path.join(root, name)) });
const packages = [];
const storeAssets = await files(path.join(root, "store"));
for (const [kind, entries] of [["chromium", installable], ["source", source], ["store-assets", storeAssets]]) {
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  const data = zip(entries);
  const name = `8bitTabs-${manifest.version}-${kind}.zip`;
  await writeFile(path.join(output, name), data);
  packages.push({ name, bytes: data.length, sha256: createHash("sha256").update(data).digest("hex"), files: entries.map((entry) => ({ name: entry.name, bytes: entry.data.length, sha256: createHash("sha256").update(entry.data).digest("hex") })) });
  console.log(`${name}: ${data.length} bytes, ${entries.length} files`);
}
await writeFile(path.join(output, "SHA256SUMS.txt"), packages.map((item) => `${item.sha256}  ${item.name}`).join("\n") + "\n");
await writeFile(path.join(output, "package-report.json"), JSON.stringify({ version: manifest.version, packages }, null, 2) + "\n");
