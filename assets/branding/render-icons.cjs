const { chromium } = require('playwright');
const emblem = require('./emblem.js');
const BG = '#1b1510';
const svg = (inner, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${bg ? `<rect width="1024" height="1024" fill="${bg}"/><circle cx="512" cy="512" r="470" fill="#2a231c"/>` : ''}${inner}</svg>`;
const out = {
  'icon.png': [svg(emblem({ scale: 0.92 }), BG), 1024],
  'android-icon-foreground.png': [svg(emblem({ scale: 0.62 })), 1024],
  'android-icon-background.png': [svg('', BG), 1024],
  'android-icon-monochrome.png': [svg(emblem({ scale: 0.62, mono: true })), 1024],
  'splash-icon.png': [svg(emblem({ scale: 0.95 })), 1024],
  'favicon.png': [svg(emblem({ scale: 0.95 }), BG), 48],
  'preview.png': [svg(emblem({ scale: 0.92 }), BG), 256],
};
(async () => {
  const b = await chromium.launch();
  for (const [name, [s, size]] of Object.entries(out)) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<html><body style="margin:0;background:transparent">${s.replace('width="1024" height="1024"', `width="${size}" height="${size}"`)}</body></html>`);
    await p.screenshot({ path: name, omitBackground: true });
    await p.close();
  }
  await b.close();
})();
