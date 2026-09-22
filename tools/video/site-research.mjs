#!/usr/bin/env node
/**
 * Pesquisa do site do cliente: fatos da marca + telas em qualidade de video.
 *
 * E o primeiro passo da G5 ("URL primeiro"): antes de perguntar qualquer coisa
 * ao usuario, o video ja sabe o nome, as cores, as fontes, o logo, o WhatsApp,
 * o Instagram e se o site e obra da Angatu. Grava:
 *   out/site/<slug>.json            fatos, cada um com a origem
 *   public/screens/<slug>-*.png     celular 390x844 @3x, desktop 1440x900 @2x,
 *                                   e a pagina inteira de cada um (para rolagem)
 *
 * Emulacao real de aparelho pelo protocolo DevTools (CDP): o --screenshot do
 * Chrome headless tem largura minima de janela e corta o layout de celular.
 * Usa o Chrome Headless Shell que o Remotion ja baixou, ou o Chrome instalado
 * (CHROME_PATH sobrepoe). Nada e enviado a lugar nenhum; so se le a pagina.
 *
 * Paginas atras de login ou CAPTCHA: o script avisa e para. Nunca tentar logar.
 *
 * Uso: node tools/site-research.mjs https://site.com.br [--wait 2500] [--no-screens]
 *
 * @author Angatu Sistemas
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const url = args.find((a) => /^https?:\/\//.test(a));
if (!url) {
  console.error('uso: node tools/site-research.mjs https://site.com.br [--wait 2500] [--no-screens]');
  process.exit(1);
}
const waitMs = Number(args[args.indexOf('--wait') + 1]) || 2500;
const screens = !args.includes('--no-screens');
const slug = new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const VIEWPORTS = [
  { name: 'celular', width: 390, height: 844, scale: 3, mobile: true },
  { name: 'desktop', width: 1440, height: 900, scale: 2, mobile: false },
];
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36';
const MAX_FULL_PAGE_PX = 12000;

const chrome = [
  process.env.CHROME_PATH,
  join(ROOT, 'node_modules', '.remotion', 'chrome-headless-shell', 'win64', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => p && existsSync(p));
if (!chrome) throw new Error('nenhum Chrome encontrado: defina CHROME_PATH');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'pesquisa-site-'));
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--no-first-run', '--mute-audio', 'about:blank'], { stdio: 'ignore' });

let port;
for (let i = 0; i < 150 && !port; i++) {
  const f = join(profile, 'DevToolsActivePort');
  if (existsSync(f)) port = readFileSync(f, 'utf8').split('\n')[0].trim();
  else await sleep(100);
}
if (!port) throw new Error('o Chrome nao abriu a porta de depuracao');
const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method) {
    listeners.forEach((l) => l(msg));
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
const once = (method, sessionId, timeoutMs = 30000) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const l = (m) => {
      if (m.method === method && m.sessionId === sessionId) {
        clearTimeout(timer);
        listeners.splice(listeners.indexOf(l), 1);
        resolve(m.params);
      }
    };
    listeners.push(l);
  });

// Coleta feita DENTRO da pagina: cores computadas, fontes, variaveis CSS, links.
const COLLECT = `(() => {
  const css = (el, p) => el ? getComputedStyle(el).getPropertyValue(p).trim() : null;
  const pick = (sel) => document.querySelector(sel);
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
  const header = pick('header') || pick('nav') || document.body;
  const logos = [...document.querySelectorAll('header img, nav img, a[href="/"] img, img[alt*="logo" i], img[src*="logo" i], img[class*="logo" i]')]
    .map((i) => ({ src: abs(i.currentSrc || i.src), alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })).slice(0, 6);
  const inlineSvgLogo = !!(header && header.querySelector('svg'));
  const button = pick('a.btn, .btn, button, a[class*="button" i], a[class*="cta" i]');
  const rootVars = {};
  for (const sheet of [...document.styleSheets]) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules || []) if (r.selectorText === ':root') for (const p of r.style) if (p.startsWith('--')) rootVars[p] = r.style.getPropertyValue(p).trim();
  }
  const links = [...document.querySelectorAll('a[href]')].map((a) => a.href);
  const text = document.body ? document.body.innerText : '';
  return {
    title: document.title,
    description: pick('meta[name="description"]')?.content ?? null,
    ogImage: abs(pick('meta[property="og:image"]')?.content ?? ''),
    icons: [...document.querySelectorAll('link[rel*="icon"]')].map((l) => abs(l.href)),
    logos, inlineSvgLogo,
    colors: {
      body: { bg: css(document.body, 'background-color'), text: css(document.body, 'color') },
      header: { bg: css(header, 'background-color'), text: css(header, 'color') },
      button: button ? { bg: css(button, 'background-color'), text: css(button, 'color'), label: button.innerText.trim().slice(0, 40) } : null,
      link: css(pick('a'), 'color'),
    },
    fonts: { body: css(document.body, 'font-family'), heading: css(pick('h1, h2'), 'font-family') },
    rootVars,
    headings: [...document.querySelectorAll('h1, h2')].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 12),
    whatsapp: [...new Set(links.filter((h) => /wa\\.me|whatsapp\\.com/.test(h)))],
    phone: [...new Set(links.filter((h) => h.startsWith('tel:')))],
    instagram: [...new Set(links.filter((h) => /instagram\\.com/.test(h)))],
    email: [...new Set(links.filter((h) => h.startsWith('mailto:')))],
    builtByAngatu: /angatu/i.test(document.querySelector('footer')?.innerText ?? text.slice(-3000)),
    // Turnstile num formulario de contato e normal (R27); barreira e senha visivel ou pagina de desafio.
    loginWall: [...document.querySelectorAll('input[type="password"]')].some((i) => i.offsetParent !== null)
      || /just a moment|attention required|verify you are human|access denied/i.test(document.title)
      || (text.length < 400 && /captcha|verifica/i.test(text)),
  };
})()`;

const facts = { url, collectedAt: new Date().toISOString(), viewports: {} };
const saved = [];
mkdirSync(join(ROOT, 'out', 'site'), { recursive: true });
if (screens) mkdirSync(join(ROOT, 'public', 'screens'), { recursive: true });

try {
  for (const vp of VIEWPORTS) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride',
      { width: vp.width, height: vp.height, deviceScaleFactor: vp.scale, mobile: vp.mobile }, sessionId);
    if (vp.mobile) await send('Emulation.setUserAgentOverride', { userAgent: MOBILE_UA }, sessionId);
    const loaded = once('Page.loadEventFired', sessionId);
    await send('Page.navigate', { url }, sessionId);
    await loaded;
    await sleep(waitMs);
    // Rola ate o fim e volta: imagem com carregamento preguicoso so aparece assim.
    // scroll-behavior: smooth faria a foto sair no meio da animacao de volta ao topo.
    const jump = (y) => `document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo({ top: ${y}, behavior: 'instant' })`;
    await send('Runtime.evaluate', { expression: jump('document.documentElement.scrollHeight') }, sessionId);
    await sleep(900);
    await send('Runtime.evaluate', { expression: jump(0) }, sessionId);
    await sleep(700);
    const { result } = await send('Runtime.evaluate', { expression: COLLECT, returnByValue: true }, sessionId);
    facts.viewports[vp.name] = result.value;
    if (result.value?.loginWall) console.log(`aviso: ${vp.name} mostra senha ou CAPTCHA -- parar e pedir o material ao usuario`);

    if (screens) {
      const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      const file = join('public', 'screens', `${slug}-${vp.name}.png`);
      writeFileSync(join(ROOT, file), Buffer.from(shot.data, 'base64'));
      saved.push(file);
      const { cssContentSize } = await send('Page.getLayoutMetrics', {}, sessionId);
      const height = Math.min(Math.ceil(cssContentSize.height), Math.floor(MAX_FULL_PAGE_PX / vp.scale));
      const full = await send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: vp.width, height, scale: 1 },
      }, sessionId);
      const fullFile = join('public', 'screens', `${slug}-${vp.name}-inteira.png`);
      writeFileSync(join(ROOT, fullFile), Buffer.from(full.data, 'base64'));
      saved.push(fullFile);
    }
    await send('Target.closeTarget', { targetId });
  }
} finally {
  ws.close();
  proc.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* perfil em uso: o SO limpa depois */ }
}

const factsFile = join('out', 'site', `${slug}.json`);
writeFileSync(join(ROOT, factsFile), JSON.stringify(facts, null, 2));
const m = facts.viewports.celular ?? facts.viewports.desktop;
console.log(`site: ${m?.title}`);
console.log(`cores: fundo ${m?.colors.body.bg}, texto ${m?.colors.body.text}, botao ${m?.colors.button?.bg ?? '-'}`);
console.log(`fontes: ${m?.fonts.heading} | ${m?.fonts.body}`);
console.log(`logo: ${m?.logos.map((l) => l.src).join(', ') || (m?.inlineSvgLogo ? 'SVG embutido no cabecalho' : 'nao achado')}`);
console.log(`whatsapp: ${m?.whatsapp.join(', ') || '-'} | instagram: ${m?.instagram.join(', ') || '-'} | obra da Angatu: ${m?.builtByAngatu}`);
console.log(`-> ${factsFile}${saved.length ? `\n-> ${saved.join('\n-> ')}` : ''}`);
