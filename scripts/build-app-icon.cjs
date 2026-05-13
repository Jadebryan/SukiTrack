/**
 * Builds a square true-PNG app icon for Expo (expo-doctor rejects JPEG-in-.png and non-square icons).
 */
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const input = path.join(root, 'assets', 'images', 'sukitrack-logo.png');
const output = path.join(root, 'assets', 'images', 'sukitrack-app-icon.png');
const BG = { r: 244, g: 241, b: 232, alpha: 1 };
const SIZE = 1024;

async function main() {
  await sharp(input)
    .resize(SIZE, SIZE, {
      fit: 'contain',
      background: BG,
    })
    .png()
    .toFile(output);
  // eslint-disable-next-line no-console
  console.log('Wrote', output);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
