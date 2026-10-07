/**
 * Generates DropDirect's SEO / PWA image assets into /public using Puppeteer.
 *
 *   node scripts/generate-seo-assets.mjs
 *
 * Outputs:
 *   favicon-48x48.png, apple-touch-icon.png (180), icon-192.png, icon-512.png,
 *   icon-maskable-512.png, og-image.png (1200x630 social share preview)
 */
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const FONT_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=block">';

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: transparent; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
`;

/** Round, glossy "DD" badge (matches the Navbar logo). */
const roundIcon = (size) => `
  <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
    <div style="
      width:${size * 0.96}px;height:${size * 0.96}px;border-radius:50%;
      background:linear-gradient(135deg,#00C6FF 0%,#0072FF 100%);
      border:${Math.max(1, size * 0.02)}px solid rgba(255,255,255,.45);
      box-shadow: inset 0 ${size * 0.04}px ${size * 0.08}px rgba(255,255,255,.45);
      position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;top:-18%;left:12%;width:76%;height:55%;border-radius:50%;
        background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0));"></div>
      <span style="position:relative;color:#fff;font-weight:800;font-size:${size * 0.42}px;
        letter-spacing:-0.04em;text-shadow:0 ${size * 0.015}px ${size * 0.03}px rgba(0,0,0,.25);">DD</span>
    </div>
  </div>`;

/** Full-bleed square icon (for iOS home screen + Android maskable). Logo kept inside the 80% safe zone. */
const squareIcon = (size, scale = 0.62) => `
  <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 30% 20%,#1a2a4a 0%,#05070d 70%);">
    ${roundIcon(size * scale)}
  </div>`;

const ogImage = () => `
  <div style="width:1200px;height:630px;position:relative;overflow:hidden;background:#05070d;color:#f5f5f7;
    display:flex;flex-direction:column;justify-content:center;padding:0 96px;">
    <div style="position:absolute;width:720px;height:720px;right:-180px;top:-260px;border-radius:50%;
      background:radial-gradient(circle,rgba(0,198,255,.45) 0%,rgba(0,114,255,0) 65%);"></div>
    <div style="position:absolute;width:640px;height:640px;left:-220px;bottom:-360px;border-radius:50%;
      background:radial-gradient(circle,rgba(0,114,255,.35) 0%,rgba(0,114,255,0) 65%);"></div>
    <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:48px 48px;"></div>

    <div style="position:relative;display:flex;align-items:center;gap:22px;margin-bottom:40px;">
      <div style="filter:drop-shadow(0 0 24px rgba(0,198,255,.6));">${roundIcon(84)}</div>
      <span style="font-size:40px;font-weight:700;letter-spacing:-0.03em;">DropDirect.</span>
    </div>

    <h1 style="position:relative;font-size:76px;line-height:1.04;font-weight:700;letter-spacing:-0.035em;max-width:900px;">
      Send files directly.<br>
      <span style="background:linear-gradient(90deg,#00C6FF,#4d9bff);-webkit-background-clip:text;background-clip:text;color:transparent;">
        No uploads. No limits.</span>
    </h1>

    <p style="position:relative;margin-top:28px;font-size:28px;color:#a1a1a6;font-weight:400;max-width:860px;">
      Free, private peer-to-peer file sharing in your browser.
    </p>

    <div style="position:relative;display:flex;gap:14px;margin-top:44px;">
      ${['End-to-end encrypted', 'No file size limit', 'No sign-up'].map((t) => `
        <span style="padding:12px 22px;border-radius:999px;font-size:22px;font-weight:500;
          background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);">${t}</span>`).join('')}
    </div>

    <span style="position:absolute;right:96px;bottom:48px;font-size:24px;color:#6e6e73;font-weight:500;">dropdirect.com</span>
  </div>`;

const ASSETS = [
  { file: 'favicon-48x48.png', w: 48, h: 48, html: roundIcon(48), transparent: true },
  { file: 'icon-192.png', w: 192, h: 192, html: roundIcon(192), transparent: true },
  { file: 'icon-512.png', w: 512, h: 512, html: roundIcon(512), transparent: true },
  { file: 'apple-touch-icon.png', w: 180, h: 180, html: squareIcon(180, 0.78) },
  { file: 'icon-maskable-512.png', w: 512, h: 512, html: squareIcon(512, 0.62) },
  { file: 'og-image.png', w: 1200, h: 630, html: ogImage() },
];

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const asset of ASSETS) {
    await page.setViewport({ width: asset.w, height: asset.h, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>${BASE_CSS}</style></head>
       <body>${asset.html}</body></html>`,
      { waitUntil: 'load', timeout: 60000 }
    );
    await page.evaluate(async () => {
      await Promise.all(['400', '500', '700', '800'].map((w) => document.fonts.load(`${w} 40px Inter`)));
      await document.fonts.ready;
    });
    await page.screenshot({
      path: path.join(PUBLIC_DIR, asset.file),
      omitBackground: !!asset.transparent,
      clip: { x: 0, y: 0, width: asset.w, height: asset.h },
    });
    console.log('✔ generated', asset.file);
  }
} finally {
  await browser.close();
}
