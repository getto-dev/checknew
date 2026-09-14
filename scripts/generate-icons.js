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
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#123bcf"/>
  <g transform="translate(51.2 51.2) scale(0.8)">
    ${svgContent.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
  </g>
</svg>`;

  await sharp(Buffer.from(svgContent)).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(Buffer.from(svgContent)).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  await sharp(Buffer.from(svgContent)).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(Buffer.from(svgContent)).resize(64, 64).png().toFile(path.join(publicDir, 'favicon.png'));

  console.log('Generated PWA/app icons from public/icon.svg');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
