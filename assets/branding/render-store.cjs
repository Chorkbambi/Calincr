// Renders the Google Play store images into docs/store/: 512 × 512 icon and 1024 × 500 feature graphic.
// Run from assets/branding: node render-store.cjs (needs Playwright, like render-icons.cjs).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const emblem = require('./emblem.js');

const BG = '#1b1510';
const OUT = path.resolve(__dirname, '../../docs/store');
const font = fs
  .readFileSync(require.resolve('@expo-google-fonts/cinzel/700Bold/Cinzel_700Bold.ttf', { paths: [path.resolve(__dirname, '../..')] }))
  .toString('base64');

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${BG}"/><circle cx="512" cy="512" r="470" fill="#2a231c"/>${emblem({ scale: 0.92 })}</svg>`;

const feature = `<div style="width:1024px;height:500px;display:flex;align-items:center;gap:24px;padding:0 64px;box-sizing:border-box;
  background:radial-gradient(circle at 25% 50%, #3a2e22 0%, ${BG} 70%);font-family:Cinzel">
  <svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 1024 1024">${emblem({ scale: 0.95 })}</svg>
  <div style="display:flex;flex-direction:column;gap:18px">
    <div style="color:#f3e2b8;font-size:92px;letter-spacing:4px;line-height:1">Calincr</div>
    <div style="color:#e3b545;font-size:34px;line-height:1.25">Every rep is<br/>a sword strike</div>
  </div>
</div>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const shots = [
    ['play-icon-512.png', icon, 512, 512],
    ['feature-graphic-1024x500.png', feature, 1024, 500],
  ];
  for (const [name, html, width, height] of shots) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(
      `<html><head><style>@font-face{font-family:Cinzel;src:url(data:font/ttf;base64,${font})}</style></head>` +
        `<body style="margin:0;background:${BG}">${html}</body></html>`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, name) });
    await page.close();
  }
  await browser.close();
})();
