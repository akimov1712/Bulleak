/**
 * Production check without a browser (T-1605): pages, redirects, security headers, caching,
 * the API answering guests correctly, CORS and the certificate lifetime.
 * Usage: npx tsx scripts/check-prod.ts [https://bulleak.ru]
 * Read-only: it creates no accounts and changes nothing on the server.
 */
import { connect } from 'node:tls';

const site = (process.argv[2] ?? 'https://bulleak.ru').replace(/\/+$/, '');
const host = new URL(site).hostname;
const api = `${site}/api/v1`;

interface Result {
  name: string;
  ok: boolean;
  detail: string;
}
const results: Result[] = [];

async function check(name: string, run: () => Promise<string | true>) {
  try {
    const out = await run();
    results.push({ name, ok: out === true, detail: out === true ? '' : out });
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : 'error' });
  }
}

const get = (url: string, init: RequestInit = {}) =>
  fetch(url, { redirect: 'manual', ...init, signal: AbortSignal.timeout(15_000) });

const expectStatus = async (url: string, status: number, init?: RequestInit) => {
  const res = await get(url, init);
  return res.status === status || `${url}: ${res.status}, ожидался ${status}`;
};

const expectRedirect = async (from: string, to: string) => {
  const res = await get(from);
  const location = res.headers.get('location');
  return (res.status === 301 && location === to) || `${from}: ${res.status} → ${location}`;
};

function certDaysLeft(): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port: 443, servername: host }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve(Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000));
    });
    socket.on('error', reject);
  });
}

await check('главная отдаётся', async () => {
  const res = await get(`${site}/`);
  const html = await res.text();
  if (res.status !== 200) return `статус ${res.status}`;
  return html.includes('<div id="root">') || 'нет корня приложения';
});

await check('заголовки безопасности', async () => {
  const h = (await get(`${site}/`)).headers;
  const expected: [string, string][] = [
    ['strict-transport-security', 'max-age='],
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['referrer-policy', 'strict-origin-when-cross-origin'],
  ];
  const missing = expected.filter(([name, value]) => !(h.get(name) ?? '').includes(value));
  return missing.length === 0 || `нет: ${missing.map(([n]) => n).join(', ')}`;
});

await check('index.html и sw.js без кэша', async () => {
  const bad: string[] = [];
  for (const path of ['/index.html', '/sw.js']) {
    const cc = (await get(`${site}${path}`)).headers.get('cache-control') ?? '';
    if (!cc.includes('no-cache')) bad.push(`${path}: ${cc || 'нет'}`);
  }
  return bad.length === 0 || bad.join('; ');
});

await check('файлы сборки кэшируются на год', async () => {
  const html = await (await get(`${site}/`)).text();
  const asset = /\/assets\/[^"']+\.js/.exec(html)?.[0];
  if (!asset) return 'в index.html нет /assets/*.js';
  const res = await get(`${site}${asset}`);
  const cc = res.headers.get('cache-control') ?? '';
  return (res.status === 200 && cc.includes('immutable')) || `${asset}: ${res.status} ${cc}`;
});

await check('сборка с аккаунтами указывает на этот API', async () => {
  const html = await (await get(`${site}/`)).text();
  const scripts = [...html.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0]);
  for (const path of scripts) {
    if ((await (await get(`${site}${path}`)).text()).includes(api)) return true;
  }
  return `в скриптах главной нет ${api}`;
});

await check('HTTP → HTTPS', () => expectRedirect(`http://${host}/x`, `${site}/x`));
await check('www → без www', () => expectRedirect(`https://www.${host}/x`, `${site}/x`));
await check('http://www → https без www', () =>
  expectRedirect(`http://www.${host}/x`, `${site}/x`),
);

await check('API: health', async () => {
  const res = await get(`${api}/health`);
  const body = (await res.json()) as { status?: string };
  return (res.status === 200 && body.status === 'ok') || `статус ${res.status}`;
});

await check('API: /me без входа — 401', () => expectStatus(`${api}/me`, 401));
await check('API: экспорт без входа — 401', () => expectStatus(`${api}/me/export`, 401));
await check('API: удаление без входа — 401', () =>
  expectStatus(`${api}/me`, 401, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }),
);
await check('API: неизвестный адрес — 404', () => expectStatus(`${api}/nope`, 404));
await check('API: неверный вход — 401 с понятной ошибкой', async () => {
  const res = await get(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password-1' }),
  });
  const body = (await res.json()) as { error?: { code?: string } };
  return (
    (res.status === 401 && body.error?.code === 'invalid_credentials') ||
    `статус ${res.status}, код ${body.error?.code}`
  );
});

await check('API: CORS не пускает чужой сайт', async () => {
  const res = await get(`${api}/me`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://evil.example',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    },
  });
  const allowed = res.headers.get('access-control-allow-origin');
  return !allowed || allowed === site || `разрешён ${allowed}`;
});

await check('сертификат действует ещё ≥ 20 дней', async () => {
  const days = await certDaysLeft();
  return days >= 20 || `осталось ${days} дн.`;
});

for (const r of results) {
  console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} проверок пройдено`);
process.exitCode = failed ? 1 : 0;
