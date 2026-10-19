const puppeteer = require('../backend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function createIco(images) {
  // images: array of { width, height, buffer }
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)]);
}

async function generateWhiteFavicon() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  const whiteBase64 = fs.readFileSync('frontend/public/logo-white.png').toString('base64');

  const rendered = await page.evaluate(async (b64) => {
    const img = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.src = 'data:image/png;base64,' + b64;
    });

    // Emblem bounds in logo-white.png: minX: 20, minY: 20, maxX: 273, maxY: 283
    const emblemW = 254;
    const emblemH = 264;
    const emblemCanvas = document.createElement('canvas');
    emblemCanvas.width = emblemW;
    emblemCanvas.height = emblemH;
    const emblemCtx = emblemCanvas.getContext('2d');
    emblemCtx.drawImage(img, 20, 20, emblemW, emblemH, 0, 0, emblemW, emblemH);

    // Filter out any overlap with the letter 'L' from "LEASIFY" text (x >= 250 && y < 235 on source)
    const imgData = emblemCtx.getImageData(0, 0, emblemW, emblemH);
    for (let x = 0; x < emblemW; x++) {
      for (let y = 0; y < emblemH; y++) {
        const origX = x + 20;
        const origY = y + 20;
        if (origX >= 250 && origY < 235) {
          imgData.data[(y * emblemW + x) * 4 + 3] = 0;
        }
      }
    }
    emblemCtx.putImageData(imgData, 0, 0);

    const renderToPng = (size, shadowBlur, shadowAlpha) => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Keep emblem ~88% of canvas height with correct aspect ratio
      const targetH = Math.round(size * 0.88);
      const targetW = Math.round(targetH * (emblemW / emblemH));
      const dx = Math.round((size - targetW) / 2);
      const dy = Math.round((size - targetH) / 2);

      if (shadowBlur > 0) {
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.max(1, Math.round(size * 0.02));
      }

      ctx.drawImage(emblemCanvas, dx, dy, targetW, targetH);
      return c.toDataURL('image/png');
    };

    return {
      size512: renderToPng(512, 12, 0.45),
      size192: renderToPng(192, 5, 0.45),
      size48: renderToPng(48, 2, 0.55),
      size32: renderToPng(32, 1.5, 0.6),
      size16: renderToPng(16, 1, 0.7),
    };
  }, whiteBase64);

  await browser.close();

  const toBuffer = (dataUrl) => Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

  const buf512 = toBuffer(rendered.size512);
  const buf192 = toBuffer(rendered.size192);
  const buf48 = toBuffer(rendered.size48);
  const buf32 = toBuffer(rendered.size32);
  const buf16 = toBuffer(rendered.size16);

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: buf16 },
    { width: 32, height: 32, buffer: buf32 },
    { width: 48, height: 48, buffer: buf48 },
  ]);

  // Target paths
  const targets = [
    { path: 'frontend/public/favicon.png', buffer: buf192 },
    { path: 'frontend/public/logo-icon.png', buffer: buf512 },
    { path: 'frontend/public/favicon.ico', buffer: icoBuffer },
    { path: 'frontend/src/assets/logo-icon.png', buffer: buf512 },
  ];

  if (fs.existsSync('frontend/dist')) {
    targets.push(
      { path: 'frontend/dist/favicon.png', buffer: buf192 },
      { path: 'frontend/dist/logo-icon.png', buffer: buf512 },
      { path: 'frontend/dist/favicon.ico', buffer: icoBuffer }
    );
  }

  for (const t of targets) {
    fs.writeFileSync(t.path, t.buffer);
    console.log(`Updated: ${t.path} (${t.buffer.length} bytes)`);
  }

  // Clean up temporary test files
  const tempFiles = [
    'frontend/public/test_favicon_shadow.png',
    'frontend/public/test_favicon_pure.png',
    'frontend/public/test_emblem_pure.png',
    'frontend/public/test_emblem_shadow.png',
    'frontend/public/test_s512.png',
    'frontend/public/test_s192.png',
    'frontend/public/test_s32.png',
    'frontend/public/test_s16.png',
    'frontend/public/test_favicon.ico',
  ];

  for (const file of tempFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Cleaned up temp file: ${file}`);
    }
  }

  console.log('White Leasify favicon generation completed successfully!');
}

generateWhiteFavicon().catch(console.error);
