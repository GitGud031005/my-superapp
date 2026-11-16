// Usage: node scripts/check-page.mjs <url> [more urls] [--out <dir>] [--wait <ms>]
// Loads each page in headless Chrome at 1280, 375 and 320px wide and reports what breaks.
// Needs Node 22+ (built-in WebSocket) and Chrome or Edge installed (or CHROME_PATH). No packages.
// Pages must be served over http: Babel standalone cannot fetch _ds_bundle.jsx from file://.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const outDir = option('--out', join(tmpdir(), 'p5r-check'));
const settle = Number(option('--wait', 3000));
const urls = args;
if (!urls.length) {
  console.log('Usage: node scripts/check-page.mjs <url> [more urls] [--out <dir>] [--wait <ms>]');
  process.exit(2);
}
if (urls.some((u) => u.startsWith('file:'))) {
  console.error('Serve the page over http (for example `python -m http.server`): Babel standalone cannot load the bundle from file://');
  process.exit(2);
}

const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean).find(existsSync);
if (!chrome) {
  console.error('No Chrome or Edge found. Set CHROME_PATH to the browser executable.');
  process.exit(2);
}

const WIDTHS = [1280, 375, 320];
const NEEDS_NAME = new Set(['button', 'link', 'textbox', 'searchbox', 'checkbox', 'radio', 'switch', 'combobox', 'listbox', 'option', 'tab', 'slider', 'spinbutton', 'menuitem']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9300 + Math.floor(Math.random() * 600);
const profile = mkdtempSync(join(tmpdir(), 'p5r-check-profile-'));
const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {}
  await sleep(200);
}

async function openPage(width) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) events.push(d);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, (d) => (d.error ? reject(new Error(`${method}: ${d.error.message}`)) : resolve(d.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  for (const domain of ['Page', 'Runtime', 'Log', 'Network', 'DOM']) await send(`${domain}.enable`);
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return {
    send, events, evaluate,
    async load(url) {
      await send('Page.navigate', { url });
      for (let i = 0; i < 100 && (await evaluate('document.readyState').catch(() => '')) !== 'complete'; i++) await sleep(100);
      await sleep(settle);
      await evaluate('document.getAnimations().forEach((a) => a.finish())');
      await sleep(200);
    },
    async close() { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {}); },
  };
}

const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const outside = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.right <= vw + 1) continue;
    let clipped = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (['hidden', 'clip', 'auto', 'scroll'].includes(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= vw + 1) { clipped = true; break; }
    }
    if (!clipped) outside.push((el.className && String(el.className).split(' ')[0]) || el.tagName.toLowerCase());
  }
  const imgs = [...document.images];
  const targets = [...document.querySelectorAll('button, input, select, textarea, [role=tab], [role=option]')]
    .filter((el) => !el.closest('dialog:not([open])') && el.offsetParent)
    .filter((el) => el.offsetWidth < 24 || el.offsetHeight < 24)
    .map((el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 20) + ' ' + el.offsetWidth + 'x' + el.offsetHeight);
  const styleText = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\\n') + [...document.querySelectorAll('[style]')].map((e) => e.getAttribute('style')).join('\\n');
  const rawColors = [...new Set(styleText.match(/#[0-9a-fA-F]{3,8}\\b|\\b(?:rgb|rgba|hsl|hsla|oklch)\\([^)]*\\)/g) || [])];
  return {
    vw, scrollW: document.documentElement.scrollWidth,
    outside: [...new Set(outside)].slice(0, 6),
    broken: imgs.filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
    noAlt: imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src')),
    smallTargets: targets,
    rawColors,
  };
})()`;

async function unnamedControls(page) {
  const { nodes } = await page.send('Accessibility.getFullAXTree');
  const out = [];
  for (const n of nodes) {
    if (n.ignored || !NEEDS_NAME.has(n.role?.value) || String(n.name?.value || '').trim()) continue;
    let where = '';
    try {
      const { node } = await page.send('DOM.describeNode', { backendNodeId: n.backendDOMNodeId });
      const cls = node.attributes?.[node.attributes.indexOf('class') + 1];
      where = node.localName + (node.attributes?.includes('class') && cls ? `.${cls.split(' ')[0]}` : '');
    } catch {}
    out.push(`${n.role.value} ${where}`.trim());
  }
  return out;
}

const pageErrors = (events) => [
  ...events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => `exception: ${e.params.exceptionDetails.exception?.description?.split('\n')[0] || e.params.exceptionDetails.text}`),
  ...events.filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error').map((e) => `console.error: ${e.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200)}`),
  ...events.filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400).map((e) => `HTTP ${e.params.response.status}: ${e.params.response.url}`),
  ...events.filter((e) => e.method === 'Network.loadingFailed' && !e.params.canceled).map((e) => `request failed: ${e.params.errorText}`),
];

mkdirSync(outDir, { recursive: true });
let errorCount = 0;
let warnCount = 0;
const report = (level, msg) => { if (level === 'ERROR') errorCount++; else warnCount++; console.log(`  ${level}  ${msg}`); };

try {
  for (const url of urls) {
    console.log(`\n## ${url}`);
    const slug = url.replace(/^https?:\/\/[^/]+\//, '').replace(/\W+/g, '_') || 'index';
    for (const width of WIDTHS) {
      const page = await openPage(width);
      try {
        await page.load(url);
        const p = await page.evaluate(PROBE);
        if (p.scrollW > p.vw) report('ERROR', `${width}px: the page scrolls sideways by ${p.scrollW - p.vw}px. Sticking out: ${p.outside.join(', ') || 'unknown'}`);
        if (width === WIDTHS[0]) {
          for (const e of [...new Set(pageErrors(page.events))]) report('ERROR', e);
          for (const src of p.broken) report('ERROR', `image did not load: ${src}`);
          for (const src of p.noAlt) report('ERROR', `image without alt (use alt="" if decorative): ${src}`);
          for (const c of await unnamedControls(page)) report('ERROR', `control without an accessible name: ${c}`);
          if (p.rawColors.length) report('WARN', `raw colors in page styles, use a semantic token instead: ${p.rawColors.slice(0, 8).join(', ')}`);
        }
        if (width === 375 && p.smallTargets.length) report('WARN', `targets under 24px: ${p.smallTargets.slice(0, 6).join('; ')}`);
        const { cssContentSize } = await page.send('Page.getLayoutMetrics');
        await page.send('Emulation.setDeviceMetricsOverride', { width, height: Math.min(Math.ceil(cssContentSize.height), 4000), deviceScaleFactor: 1, mobile: false });
        await sleep(300);
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(outDir, `${slug}-${width}.png`), Buffer.from(shot.data, 'base64'));
      } finally {
        await page.close();
      }
    }
  }
} finally {
  browser.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log(`\n${errorCount} error(s), ${warnCount} warning(s). Screenshots: ${outDir}`);
process.exit(errorCount ? 1 : 0);
