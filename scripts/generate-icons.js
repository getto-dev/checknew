import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const iconPath = path.join(publicDir, 'icon.svg');

async function main() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  if (!fs.existsSync(iconPath)) {
    throw new Error(`Source icon not found: ${iconPath}`);
  }

  const svgContent = fs.readFileSync(iconPath, 'utf8');

  // Keep every app icon visually identical to the source icon from getto-dev/check.
  // Do not create a separate/modified maskable design.
  const outputs = [
    ['pwa-192x192.png', 192],
    ['pwa-512x512.png', 512],
    ['pwa-maskable-512x512.png', 512],
    ['apple-touch-icon.png', 180],
    ['favicon.png', 64],
  ];

  for (const [filename, size] of outputs) {
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, filename));
  }

  console.log('Generated all PWA/app icons from public/icon.svg');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
