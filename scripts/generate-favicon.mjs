import sharp from "sharp";
import fs from "fs";
import path from "path";

const input = path.resolve("public/logo.png");
const outputDir = path.resolve("public");

// Generate PNG favicons in various sizes
const sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512];

for (const size of sizes) {
  await sharp(input)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, `favicon-${size}.png`));
  console.log(`✅ favicon-${size}.png gerado!`);
}

// Copy specific ones for standard names
fs.copyFileSync(path.join(outputDir, "favicon-32.png"), path.join(outputDir, "favicon.png"));
fs.copyFileSync(path.join(outputDir, "favicon-180.png"), path.join(outputDir, "apple-touch-icon.png"));
fs.copyFileSync(path.join(outputDir, "favicon-192.png"), path.join(outputDir, "icon-192.png"));
fs.copyFileSync(path.join(outputDir, "favicon-512.png"), path.join(outputDir, "icon-512.png"));

console.log("✅ favicon.png, apple-touch-icon.png, icon-192.png, icon-512.png copiados!");

// Create a minimal ICO file manually (16x16 + 32x32)
const icoHeader = Buffer.from([
  0x00, 0x00, // Reserved
  0x01, 0x00, // Type: ICO
  0x02, 0x00, // Number of images
]);

// Image 1: 16x16
const img16 = await sharp(input)
  .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// Image 2: 32x32
const img32 = await sharp(input)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const dirEntry = (width, height, size, offset) => Buffer.from([
  width === 256 ? 0 : width, // Width (0 = 256)
  height === 256 ? 0 : height, // Height (0 = 256)
  0x00, // Color count (0 = no palette)
  0x00, // Reserved
  0x01, 0x00, // Color planes
  0x20, 0x00, // Bits per pixel (32)
  ...Buffer.alloc(4).map((_, i) => (size >> (8 * i)) & 0xff), // Size in bytes (little endian)
  ...Buffer.alloc(4).map((_, i) => (offset >> (8 * i)) & 0xff), // Offset (little endian)
]);

const offset1 = 6 + 16 * 2; // Header + 2 directory entries
const offset2 = offset1 + img16.length;

const dir1 = dirEntry(16, 16, img16.length, offset1);
const dir2 = dirEntry(32, 32, img32.length, offset2);

const ico = Buffer.concat([icoHeader, dir1, dir2, img16, img32]);
fs.writeFileSync(path.join(outputDir, "favicon.ico"), ico);

console.log("✅ favicon.ico gerado manualmente com 16x16 e 32x32!");
console.log("🎉 Todos os favicons gerados com sucesso!");